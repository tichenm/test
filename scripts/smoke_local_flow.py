#!/usr/bin/env python3

import argparse
import html
import http.cookiejar
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
import uuid
from pathlib import Path
from urllib import error, parse, request

from local_dev import load_dotenv

BASE_URL = os.environ.get("SMOKE_BASE_URL", "http://127.0.0.1:3000")
SIGN_IN_EMAIL = os.environ.get("SMOKE_EMAIL", f"manager+{uuid.uuid4().hex[:8]}@store.com")
DATABASE_URL = os.environ.get("DATABASE_URL")
DEV_LOG_PATH = Path(".next/dev/logs/next-development.log")
DEFAULT_RAIL_KEY = "inventory-replenishment"
STEP_KEYS = (
    "problem-symptom",
    "frequency-pattern",
    "time-window",
    "affected-scope",
    "people-involved",
    "current-workaround",
    "operational-impact",
)
QUICK_CHOICE_STEP_KEYS = {"affected-scope", "people-involved"}
SMOKE_SCENARIOS = {
    "inventory-replenishment": {
        "label": "库存与补货",
        "storeName": "12号店",
        "roleName": "门店店长",
        "expectedPainType": "stockout",
        "answers": [
            "stockout",
            "weekly",
            "weekends",
            "fast-moving SKUs",
            "shift leads",
            "manual Slack reminders",
            "missed weekend sales and rushed transfers",
        ],
    },
    "warehouse-receiving": {
        "label": "仓库收货",
        "storeName": "华北仓",
        "roleName": "仓库主管",
        "expectedPainType": "overstock",
        "answers": [
            "overstock",
            "every morning receiving wave",
            "before the first putaway window",
            "dock 3 staging lanes and bulky inbound pallets",
            "receiving clerks and forklift operators",
            "manual reprioritization and overflow staging",
            "putaway misses its slot and inbound stock blocks the next unload",
        ],
    },
    "store-service-complaints": {
        "label": "门店服务体验与客诉",
        "storeName": "人民广场店",
        "roleName": "门店店长",
        "expectedPainType": "service-delay",
        "quickChoiceAnswers": {
            "affected-scope": "现场解释安抚",
            "people-involved": "出餐和值班店长",
        },
        "answers": [
            "等待太久",
            "每个周末晚高峰",
            "晚高峰和交接班前后",
            "点单到出餐之间的顾客解释和排队安抚",
            "收银、出餐伙伴和值班店长",
            "店长临时顶到前场统一解释并安抚顾客",
            "顾客等待更久，差评和投诉在高峰后集中出现",
        ],
    },
    "store-staffing-scheduling": {
        "label": "门店排班与人手配置",
        "storeName": "南京西路店",
        "roleName": "门店店长",
        "expectedPainType": "schedule-instability",
        "answers": [
            "排班总变",
            "每周都会临时改班两三次",
            "周末晚高峰和促销档期前",
            "收银、出餐和闭店整理班次",
            "店长、值班店长和兼职伙伴",
            "店长当天临时调班并压缩交接时间",
            "高峰准备动作总被打乱，现场只能不断救火",
        ],
    },
}


def require(condition: bool, message: str) -> None:
    if not condition:
        raise SystemExit(message)


def get_smoke_scenario(rail_key: str | None = None) -> dict[str, str | list[str]]:
    selected_rail_key = rail_key or os.environ.get("SMOKE_RAIL_KEY", DEFAULT_RAIL_KEY)
    scenario = SMOKE_SCENARIOS.get(selected_rail_key)
    require(
        scenario is not None,
        f"Unsupported SMOKE_RAIL_KEY: {selected_rail_key}",
    )
    return {"railKey": selected_rail_key, **scenario}


def build_post_run_markers(
    session_id: str,
    scenario: dict[str, str | list[str]],
) -> dict[str, list[str]]:
    return {
        "history": [
            f"/history/{session_id}",
            str(scenario["storeName"]),
            str(scenario["roleName"]),
        ],
        "insights": [
            f"/history/{session_id}",
            str(scenario["label"]),
        ],
    }


def build_persistence_expectations(
    scenario: dict[str, str | list[str]],
) -> dict[str, str]:
    expected_pain_type = str(scenario["expectedPainType"])
    return {
        "userMessageContent": expected_pain_type,
        "sessionPainType": expected_pain_type,
    }


def build_step_answer(
    scenario: dict[str, str | list[str]],
    step_index: int,
    first_step_mode: str,
) -> str:
    answers = scenario["answers"]
    require(isinstance(answers, list), "Smoke scenario answers must be a list")
    step_key = STEP_KEYS[step_index - 1]

    if step_index == 1 and first_step_mode == "quick-choice":
        return str(scenario["expectedPainType"])

    if first_step_mode == "quick-choice":
        quick_choice_answers = scenario.get("quickChoiceAnswers")
        require(
            quick_choice_answers is None or isinstance(quick_choice_answers, dict),
            "Smoke scenario quickChoiceAnswers must be a mapping",
        )
        if isinstance(quick_choice_answers, dict) and step_key in quick_choice_answers:
            return str(quick_choice_answers[step_key])

    return str(answers[step_index - 1])


def parse_quick_choice_steps(value: str | None) -> set[str]:
    if not value:
        return set()

    step_keys = {item.strip() for item in value.split(",") if item.strip()}
    unsupported_step_keys = sorted(step_keys - QUICK_CHOICE_STEP_KEYS)
    require(
        not unsupported_step_keys,
        "Unsupported quick-choice steps: "
        + ", ".join(unsupported_step_keys)
        + ". Supported values: "
        + ", ".join(sorted(QUICK_CHOICE_STEP_KEYS)),
    )
    return step_keys


def build_step_mode(
    step_index: int,
    step_key: str,
    first_step_mode: str,
    quick_choice_steps: set[str],
) -> str:
    if step_index == 1:
        return first_step_mode

    if step_key in quick_choice_steps:
        return "quick-choice"

    return "freeform"


def extract_forms(page: str) -> list[str]:
    return re.findall(r"<form\b.*?</form>", page, re.S)


def extract_action_fields_from_form(form: str) -> list[tuple[str, str]]:
    return [
        (name, html.unescape(value))
        for name, value in re.findall(
            r'name="(\$ACTION_\d+:\d+)" value="([^"]*)"',
            form,
        )
    ]


def build_answer_submission_fields(
    page: str,
    answer: str,
    first_step_mode: str,
) -> list[tuple[str, str]]:
    forms = extract_forms(page)
    selected_form = None

    if first_step_mode == "quick-choice":
        answer_pattern = f'name="answer" value="{re.escape(answer)}"'
        for form in forms:
            if re.search(answer_pattern, form):
                selected_form = form
                break
        if selected_form is None:
            for form in forms:
                if '<textarea' not in form and 'name="answer"' in form and '<button' in form:
                    selected_form = form
                    break
    else:
        for form in forms:
            if 'textarea' in form and 'name="answer"' in form:
                selected_form = form
                break

    require(selected_form is not None, f"Could not find the {first_step_mode} answer form")

    action_fields = extract_action_fields_from_form(selected_form)
    require(action_fields, f"Could not find action fields for the {first_step_mode} answer form")

    action_prefix = action_fields[0][0].split(":")[0]
    action_ref = action_prefix.replace("$ACTION_", "$ACTION_REF_")

    return [
        (action_ref, ""),
        *action_fields,
        ("answer", answer),
    ]


def find_psql() -> str:
    return shutil.which("psql") or "/opt/homebrew/opt/postgresql@16/bin/psql"


def query_scalar(sql: str) -> str:
    database_url = os.environ.get("DATABASE_URL") or DATABASE_URL
    require(database_url is not None, "DATABASE_URL is required")
    parsed = parse.urlsplit(database_url)
    database_url = parse.urlunsplit(
        (parsed.scheme, parsed.netloc, parsed.path, "", parsed.fragment)
    )
    result = subprocess.run(
        [find_psql(), database_url, "-tA", "-c", sql],
        check=True,
        capture_output=True,
        text=True,
    )
    return result.stdout.strip()


def multipart(fields: list[tuple[str, str]]) -> tuple[bytes, str]:
    boundary = "----CodexSmokeBoundary" + uuid.uuid4().hex
    chunks: list[bytes] = []
    for name, value in fields:
        chunks.append(f"--{boundary}\r\n".encode())
        chunks.append(f'Content-Disposition: form-data; name="{name}"\r\n\r\n'.encode())
        chunks.append(value.encode())
        chunks.append(b"\r\n")
    chunks.append(f"--{boundary}--\r\n".encode())
    return b"".join(chunks), boundary


def post_form(
    opener: request.OpenerDirector,
    url: str,
    fields: list[tuple[str, str]],
) -> tuple[str, str]:
    body, boundary = multipart(fields)
    req = request.Request(
        url,
        data=body,
        headers={
            "Content-Type": f"multipart/form-data; boundary={boundary}",
            "Origin": BASE_URL,
        },
        method="POST",
    )
    with opener.open(req) as response:
        return response.geturl(), response.read().decode("utf-8", errors="replace")


def post_urlencoded(
    opener: request.OpenerDirector,
    url: str,
    fields: list[tuple[str, str]],
) -> tuple[str, str]:
    body = "&".join(
        f"{parse.quote_plus(name)}={parse.quote_plus(value)}" for name, value in fields
    ).encode()
    req = request.Request(
        url,
        data=body,
        headers={
            "Content-Type": "application/x-www-form-urlencoded",
            "Origin": BASE_URL,
        },
        method="POST",
    )
    with opener.open(req) as response:
        return response.geturl(), response.read().decode("utf-8", errors="replace")


def get(opener: request.OpenerDirector, url: str) -> str:
    with opener.open(request.Request(url)) as response:
        return response.read().decode("utf-8", errors="replace")


def extract(pattern: str, content: str, label: str) -> str:
    match = re.search(pattern, content, re.S)
    require(match is not None, f"Could not find {label}")
    return match.group(1)


def extract_magic_link(log_text: str, email: str, base_url: str) -> str | None:
    pattern = re.compile(
        rf"Magic link for {re.escape(email)}: (http://(?:localhost|127\.0\.0\.1):3000/api/auth/callback/email\?[^\"]+)"
    )
    matches = pattern.findall(log_text)
    if not matches:
        return None

    parsed_base_url = parse.urlsplit(base_url)
    parsed_link = parse.urlsplit(matches[-1])
    return parse.urlunsplit(
        (
            parsed_link.scheme,
            parsed_base_url.netloc or parsed_link.netloc,
            parsed_link.path,
            parsed_link.query,
            parsed_link.fragment,
        )
    )


def wait_for_magic_link(email: str, start_offset: int, timeout_seconds: int = 10) -> str:
    require(DEV_LOG_PATH.exists(), f"Missing dev log: {DEV_LOG_PATH}")
    deadline = time.time() + timeout_seconds

    while time.time() < deadline:
        with DEV_LOG_PATH.open() as handle:
            handle.seek(start_offset)
            log_text = handle.read()
        magic_link = extract_magic_link(log_text, email, BASE_URL)
        if magic_link:
            return magic_link
        time.sleep(0.2)

    raise SystemExit(f"Magic link for {email} was not written to {DEV_LOG_PATH}")


def extract_optional(pattern: str, content: str) -> str | None:
    match = re.search(pattern, content, re.S)
    if not match:
        return None
    return match.group(1)


def normalize_local_redirect(url: str) -> str:
    parsed_base_url = parse.urlsplit(BASE_URL)
    parsed_url = parse.urlsplit(parse.urljoin(BASE_URL, url))
    if parsed_url.netloc in {"localhost:3000", "127.0.0.1:3000"}:
        return parse.urlunsplit(
            (
                parsed_base_url.scheme,
                parsed_base_url.netloc,
                parsed_url.path,
                parsed_url.query,
                parsed_url.fragment,
            )
        )
    return parse.urlunsplit(parsed_url)


def login(opener: request.OpenerDirector) -> str:
    login_page = get(opener, f"{BASE_URL}/login")
    require("aria-label=\"登录表单\"" in login_page, "Login page did not render")

    callback_path = extract_optional(
        r'name="callbackPath" value="([^"]+)"',
        login_page,
    ) or "/"

    if "/api/dev-login" in login_page:
        try:
            home_url, home_page = post_urlencoded(
                opener,
                f"{BASE_URL}/api/dev-login",
                [
                    ("email", SIGN_IN_EMAIL),
                    ("callbackPath", html.unescape(callback_path)),
                ],
            )
        except error.HTTPError as exc:
            require(exc.code in {302, 303, 307, 308}, f"Direct dev login failed: HTTP {exc.code}")
            location = exc.headers.get("Location")
            require(location is not None, "Direct dev login redirect did not include a Location header")
            home_url = normalize_local_redirect(location)
            home_page = get(opener, home_url)
        require(
            "工作台" in home_page and "开始诊断" in home_page,
            "Direct dev login did not reach the signed-in workbench",
        )
        require(
            home_url.rstrip("/") == BASE_URL.rstrip("/"),
            f"Direct dev login redirected to an unexpected location: {home_url}",
        )
        return home_page

    csrf_payload = get(opener, f"{BASE_URL}/api/auth/csrf")
    csrf_token = extract(r'"csrfToken":"([^"]+)"', csrf_payload, "csrf token")
    log_offset = DEV_LOG_PATH.stat().st_size if DEV_LOG_PATH.exists() else 0

    signin_url, signin_body = post_urlencoded(
        opener,
        f"{BASE_URL}/api/auth/signin/email",
        [
            ("csrfToken", csrf_token),
            ("email", SIGN_IN_EMAIL),
            ("callbackUrl", f"{BASE_URL}/"),
            ("json", "true"),
        ],
    )
    require(
        "verify-request" in signin_url or "verify-request" in signin_body,
        "Email sign-in did not reach verify-request page",
    )

    magic_link = wait_for_magic_link(SIGN_IN_EMAIL, log_offset)
    return get(opener, magic_link)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Run the local smoke flow against the Next.js dev server.",
    )
    parser.add_argument(
        "--base-url",
        default=None,
        help="Override the app base URL. Defaults to SMOKE_BASE_URL, NEXTAUTH_URL, or http://127.0.0.1:3000.",
    )
    parser.add_argument(
        "--email",
        default=None,
        help="Override the sign-in email used during the smoke flow.",
    )
    parser.add_argument(
        "--rail-key",
        default=None,
        choices=sorted(SMOKE_SCENARIOS.keys()),
        help="Pick which rail scenario to run.",
    )
    parser.add_argument(
        "--first-step-mode",
        default="freeform",
        choices=["freeform", "quick-choice"],
        help="Choose whether the first symptom answer is submitted through the textarea flow or the quick-choice buttons.",
    )
    parser.add_argument(
        "--quick-choice-steps",
        default="",
        help="Comma-separated later step keys to submit through quick-choice buttons. Supported values: affected-scope,people-involved.",
    )
    return parser


def main(argv: list[str] | None = None) -> None:
    global BASE_URL, SIGN_IN_EMAIL
    args = build_parser().parse_args(argv)
    load_dotenv()
    BASE_URL = (
        args.base_url
        or os.environ.get("SMOKE_BASE_URL")
        or os.environ.get("NEXTAUTH_URL")
        or BASE_URL
    )
    SIGN_IN_EMAIL = args.email or os.environ.get("SMOKE_EMAIL", SIGN_IN_EMAIL)
    scenario = get_smoke_scenario(args.rail_key)
    quick_choice_steps = parse_quick_choice_steps(args.quick_choice_steps)
    cookie_file = tempfile.NamedTemporaryFile(prefix="guided-pain-", suffix=".cookies", delete=False)
    cookie_file.close()

    jar = http.cookiejar.MozillaCookieJar(cookie_file.name)
    opener = request.build_opener(request.HTTPCookieProcessor(jar))

    home_after_login = login(opener)
    require("工作台" in home_after_login, "Signed-in home page did not render")
    require(
        scenario["label"] in home_after_login,
        f"Rail picker did not render label: {scenario['label']}",
    )

    home_action = extract(r'name="(\$ACTION_ID_[^"]+)"', home_after_login, "home action id")
    current_url, page = post_form(
        opener,
        f"{BASE_URL}/",
        [
            (home_action, ""),
            ("storeName", str(scenario["storeName"])),
            ("roleName", str(scenario["roleName"])),
            ("railKey", str(scenario["railKey"])),
        ],
    )

    session_id = extract(r"/interview/([^\"?/]+)", current_url, "session id")

    answers = scenario["answers"]
    require(isinstance(answers, list), "Smoke scenario answers must be a list")

    for index, step_key in enumerate(STEP_KEYS, start=1):
        prompt = html.unescape(
            extract(r'<h1 class="display-title[^>]*">(.*?)</h1>', page, f"step {index} prompt")
        )
        print(f"step {index}: {prompt}")

        step_mode = build_step_mode(
            index,
            step_key,
            args.first_step_mode,
            quick_choice_steps,
        )
        answer = build_step_answer(scenario, index, step_mode)
        submission_fields = build_answer_submission_fields(page, answer, step_mode)

        current_url, page = post_form(
            opener,
            current_url,
            submission_fields,
        )

    require(current_url.endswith(f"/history/{session_id}"), "Final redirect did not reach history detail")

    for needle in [
        "当前判断",
        "为什么这样判断",
        "优先做什么",
        "白话总结",
        "问答记录",
        str(scenario["label"]),
    ]:
        require(needle in page, f"Missing result marker: {needle}")

    diagnosis_status = query_scalar(
        "select status from \"InterviewSession\" "
        f"where id = '{session_id}' limit 1;"
    )
    require(diagnosis_status == "COMPLETED", "Interview session did not reach COMPLETED status")

    diagnosis_count = query_scalar(
        "select count(*) from \"DiagnosisRecord\" "
        f"where \"sessionId\" = '{session_id}';"
    )
    require(diagnosis_count == "1", "Diagnosis record was not persisted")

    expected_pain_type = str(scenario["expectedPainType"])
    stored_pain_type = query_scalar(
        "select coalesce(\"painType\", '') from \"DiagnosisRecord\" "
        f"where \"sessionId\" = '{session_id}' limit 1;"
    )
    require(
        stored_pain_type == expected_pain_type,
        f"Diagnosis record stored unexpected painType: {stored_pain_type}",
    )

    persistence_expectations = build_persistence_expectations(scenario)
    stored_user_pain_type_message = query_scalar(
        "select coalesce(content, '') from \"InterviewMessage\" "
        f"where \"sessionId\" = '{session_id}' and role = 'USER' and \"stepKey\" = 'problem-symptom' "
        "order by \"createdAt\" asc limit 1;"
    )
    require(
        stored_user_pain_type_message == persistence_expectations["userMessageContent"],
        "InterviewMessage stored an unexpected normalized symptom answer",
    )

    stored_session_pain_type = query_scalar(
        "select coalesce(state->'fields'->>'painType', '') from \"InterviewSession\" "
        f"where id = '{session_id}' limit 1;"
    )
    require(
        stored_session_pain_type == persistence_expectations["sessionPainType"],
        "InterviewSession state stored an unexpected painType value",
    )

    stored_store_name = query_scalar(
        "select coalesce(\"storeName\", '') from \"InterviewSession\" "
        f"where id = '{session_id}' limit 1;"
    )
    require(
        stored_store_name == str(scenario["storeName"]),
        "Interview session did not persist the smoke storeName context",
    )

    stored_role_name = query_scalar(
        "select coalesce(state->'context'->>'roleName', '') from \"InterviewSession\" "
        f"where id = '{session_id}' limit 1;"
    )
    require(
        stored_role_name == str(scenario["roleName"]),
        "Interview session did not persist the smoke roleName context",
    )

    post_run_markers = build_post_run_markers(session_id, scenario)
    history_page = get(opener, f"{BASE_URL}/history")
    for needle in post_run_markers["history"]:
        require(needle in history_page, f"History page is missing marker: {needle}")

    insights_page = get(opener, f"{BASE_URL}/insights")
    for needle in post_run_markers["insights"]:
        require(needle in insights_page, f"Insights page is missing marker: {needle}")

    print(f"completed session: {session_id}")
    print(f"rail: {scenario['railKey']}")
    print("local smoke flow passed")


if __name__ == "__main__":
    try:
        main(sys.argv[1:])
    except subprocess.CalledProcessError as error:
        sys.stderr.write(error.stderr or str(error))
        raise
