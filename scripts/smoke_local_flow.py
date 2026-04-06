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
from urllib import parse, request

from local_dev import load_dotenv

BASE_URL = os.environ.get("SMOKE_BASE_URL", "http://127.0.0.1:3000")
SIGN_IN_EMAIL = os.environ.get("SMOKE_EMAIL", f"manager+{uuid.uuid4().hex[:8]}@store.com")
DATABASE_URL = os.environ.get("DATABASE_URL")
DEV_LOG_PATH = Path(".next/dev/logs/next-development.log")
DEFAULT_RAIL_KEY = "inventory-replenishment"
SMOKE_SCENARIOS = {
    "inventory-replenishment": {
        "label": "Inventory and replenishment",
        "storeName": "Store 12",
        "roleName": "Store manager",
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
        "label": "Warehouse receiving",
        "storeName": "North Hub",
        "roleName": "Warehouse supervisor",
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


def wait_for_magic_link(email: str, start_offset: int, timeout_seconds: int = 10) -> str:
    require(DEV_LOG_PATH.exists(), f"Missing dev log: {DEV_LOG_PATH}")
    deadline = time.time() + timeout_seconds
    pattern = re.compile(
        rf"Magic link for {re.escape(email)}: (http://localhost:3000/api/auth/callback/email\?[^\"]+)"
    )

    while time.time() < deadline:
        with DEV_LOG_PATH.open() as handle:
            handle.seek(start_offset)
            log_text = handle.read()
        matches = pattern.findall(log_text)
        if matches:
            return matches[-1].replace("http://localhost:3000", BASE_URL)
        time.sleep(0.2)

    raise SystemExit(f"Magic link for {email} was not written to {DEV_LOG_PATH}")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Run the local magic-link smoke flow against the Next.js dev server.",
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
    cookie_file = tempfile.NamedTemporaryFile(prefix="guided-pain-", suffix=".cookies", delete=False)
    cookie_file.close()

    jar = http.cookiejar.MozillaCookieJar(cookie_file.name)
    opener = request.build_opener(request.HTTPCookieProcessor(jar))

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
    home_after_login = get(opener, magic_link)
    require("Start Diagnosis" in home_after_login, "Signed-in home page did not render")
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

    for index, answer in enumerate(answers, start=1):
        prompt = html.unescape(
            extract(r'<h1 class="display-title[^>]*">(.*?)</h1>', page, f"step {index} prompt")
        )
        print(f"step {index}: {prompt}")

        a0 = html.unescape(extract(r'name="\$ACTION_1:0" value="([^"]+)"', page, "action field 0"))
        a1 = html.unescape(extract(r'name="\$ACTION_1:1" value="([^"]+)"', page, "action field 1"))
        a2 = html.unescape(extract(r'name="\$ACTION_1:2" value="([^"]+)"', page, "action field 2"))

        current_url, page = post_form(
            opener,
            current_url,
            [
                ("$ACTION_REF_1", ""),
                ("$ACTION_1:0", a0),
                ("$ACTION_1:1", a1),
                ("$ACTION_1:2", a2),
                ("answer", answer),
            ],
        )

    require(current_url.endswith(f"/history/{session_id}"), "Final redirect did not reach history detail")

    for needle in [
        "Core diagnosis",
        "Plain-language summary",
        "Conversation transcript",
        "Severity:",
        "Action:",
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

    print(f"completed session: {session_id}")
    print(f"rail: {scenario['railKey']}")
    print("local smoke flow passed")


if __name__ == "__main__":
    try:
        main(sys.argv[1:])
    except subprocess.CalledProcessError as error:
        sys.stderr.write(error.stderr or str(error))
        raise
