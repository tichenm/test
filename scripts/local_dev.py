#!/usr/bin/env python3

from __future__ import annotations

import os
import shutil
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from urllib import parse

ENV_FILE_PATH = Path(".env")
ENV_EXAMPLE_PATH = Path(".env.example")
POSTGRES_DATA_DIR = Path(".postgres-data")
REQUIRED_ENV_KEYS = ["DATABASE_URL", "NEXTAUTH_URL", "NEXTAUTH_SECRET", "EMAIL_FROM"]
POSTGRES_COMMANDS = ["psql", "initdb", "pg_ctl", "createdb"]
POSTGRES_HOMEBREW_DIR = Path("/opt/homebrew/opt/postgresql@16/bin")


@dataclass(frozen=True)
class DoctorSnapshot:
    env_file_exists: bool
    missing_env_keys: list[str]
    postgres_cli_available: bool
    postgres_data_exists: bool
    database_ready: bool
    prisma_ready: bool


def load_dotenv(path: Path = ENV_FILE_PATH) -> None:
    if not path.exists():
        return

    for line in path.read_text().splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue

        key, value = stripped.split("=", 1)
        os.environ.setdefault(key, value.strip().strip('"').strip("'"))


def find_postgres_command(name: str) -> str | None:
    brew_candidate = POSTGRES_HOMEBREW_DIR / name
    if brew_candidate.exists():
        return str(brew_candidate)
    return shutil.which(name)


def all_postgres_commands_available() -> bool:
    return all(find_postgres_command(name) for name in POSTGRES_COMMANDS)


def normalized_database_url(database_url: str | None) -> str | None:
    if not database_url:
        return None

    parsed = parse.urlsplit(database_url)
    return parse.urlunsplit(
        (parsed.scheme, parsed.netloc, parsed.path, "", parsed.fragment)
    )


def missing_required_env_keys(env: dict[str, str] | None = None) -> list[str]:
    resolved_env = env or os.environ
    return [key for key in REQUIRED_ENV_KEYS if not resolved_env.get(key)]


def is_database_ready(database_url: str | None = None) -> bool:
    resolved_database_url = normalized_database_url(database_url or os.environ.get("DATABASE_URL"))
    psql = find_postgres_command("psql")
    if not resolved_database_url or not psql:
        return False

    result = subprocess.run(
        [psql, resolved_database_url, "-tA", "-c", "select 1;"],
        capture_output=True,
        text=True,
    )
    return result.returncode == 0 and result.stdout.strip() == "1"


def is_prisma_ready() -> bool:
    result = subprocess.run(
        ["npx", "prisma", "migrate", "status"],
        capture_output=True,
        text=True,
    )
    return result.returncode == 0


def plan_setup_actions(
    *,
    env_file_exists: bool,
    postgres_data_exists: bool,
    database_ready: bool,
) -> list[str]:
    actions: list[str] = []

    if not env_file_exists:
        actions.append("copy-env")

    actions.append("prisma-generate")

    if not postgres_data_exists:
        actions.append("db-init")

    if not database_ready:
        actions.append("db-start")
        actions.append("db-createdb")

    actions.append("prisma-deploy")
    return actions


def evaluate_doctor_snapshot(snapshot: DoctorSnapshot) -> dict[str, str | list[str]]:
    issues: list[str] = []

    if not snapshot.env_file_exists:
        issues.append("Missing .env file")
    if snapshot.missing_env_keys:
        issues.append(f"Missing env keys: {', '.join(snapshot.missing_env_keys)}")
    if not snapshot.postgres_cli_available:
        issues.append("Postgres CLI not found")
    if not snapshot.postgres_data_exists:
        issues.append("Local Postgres data directory is not initialized")
    if not snapshot.database_ready:
        issues.append("Database is not reachable")
    if not snapshot.prisma_ready:
        issues.append("Prisma migrations are not ready")

    return {
        "status": "pass" if not issues else "fail",
        "issues": issues,
    }


def collect_doctor_snapshot() -> DoctorSnapshot:
    load_dotenv()
    return DoctorSnapshot(
        env_file_exists=ENV_FILE_PATH.exists(),
        missing_env_keys=missing_required_env_keys(),
        postgres_cli_available=all_postgres_commands_available(),
        postgres_data_exists=POSTGRES_DATA_DIR.exists(),
        database_ready=is_database_ready(),
        prisma_ready=is_prisma_ready(),
    )


def print_command(command: list[str]) -> None:
    print(f"$ {' '.join(command)}")


def run_named_action(action: str) -> None:
    if action == "copy-env":
        if ENV_FILE_PATH.exists():
            print("skip copy-env (.env already exists)")
            return
        if not ENV_EXAMPLE_PATH.exists():
            raise SystemExit("Missing .env.example; cannot create .env")
        shutil.copyfile(ENV_EXAMPLE_PATH, ENV_FILE_PATH)
        print("created .env from .env.example")
        load_dotenv()
        return

    commands = {
        "prisma-generate": ["npx", "prisma", "generate"],
        "db-init": ["npm", "run", "db:init"],
        "db-start": ["npm", "run", "db:start"],
        "db-createdb": ["npm", "run", "db:createdb"],
        "prisma-deploy": ["npx", "prisma", "migrate", "deploy"],
    }

    command = commands[action]
    print_command(command)
    result = subprocess.run(command, text=True, capture_output=True)
    if result.stdout:
        sys.stdout.write(result.stdout)
    if result.returncode != 0:
        stderr = result.stderr or ""
        if action == "db-start" and "server is running" in stderr:
            sys.stderr.write(stderr)
            print("continuing because postgres is already running")
            return
        if action == "db-createdb" and "already exists" in (result.stderr or ""):
            sys.stderr.write(stderr)
            print("continuing because database already exists")
            return
        if stderr:
            sys.stderr.write(stderr)
        raise SystemExit(result.returncode)


def run_setup() -> int:
    load_dotenv()
    initial_database_ready = is_database_ready()
    actions = plan_setup_actions(
        env_file_exists=ENV_FILE_PATH.exists(),
        postgres_data_exists=POSTGRES_DATA_DIR.exists(),
        database_ready=initial_database_ready,
    )

    print("setup plan:")
    for action in actions:
        print(f"- {action}")

    if not all_postgres_commands_available():
        raise SystemExit(
            "Postgres CLI not found. Install postgresql@16 first, then rerun npm run setup:local."
        )

    for action in actions:
        if action == "db-start" and is_database_ready():
            print("skip db-start (database already reachable)")
            continue
        if action == "db-createdb" and is_database_ready():
            print("skip db-createdb (database already exists and is reachable)")
            continue
        run_named_action(action)

    snapshot = collect_doctor_snapshot()
    report = evaluate_doctor_snapshot(snapshot)
    print()
    print("doctor summary:")
    print(f"status: {report['status']}")
    for issue in report["issues"]:
        print(f"- {issue}")

    if report["status"] != "pass":
        raise SystemExit(1)

    print("local setup complete")
    return 0


def run_doctor() -> int:
    snapshot = collect_doctor_snapshot()
    report = evaluate_doctor_snapshot(snapshot)

    checks = [
        ("env file", snapshot.env_file_exists, ".env exists"),
        ("required env", not snapshot.missing_env_keys, "required env keys configured"),
        ("postgres cli", snapshot.postgres_cli_available, "postgres toolchain available"),
        ("postgres data", snapshot.postgres_data_exists, ".postgres-data initialized"),
        ("database", snapshot.database_ready, "database responds to select 1"),
        ("prisma", snapshot.prisma_ready, "prisma migrations are ready"),
    ]

    for label, passed, detail in checks:
        prefix = "PASS" if passed else "FAIL"
        print(f"[{prefix}] {label}: {detail}")

    if report["issues"]:
        print()
        print("issues:")
        for issue in report["issues"]:
            print(f"- {issue}")

    if report["status"] == "pass":
        print()
        print("doctor passed")
        return 0

    print()
    print("next steps:")
    for action in plan_setup_actions(
        env_file_exists=snapshot.env_file_exists,
        postgres_data_exists=snapshot.postgres_data_exists,
        database_ready=snapshot.database_ready,
    ):
        print(f"- {action}")
    return 1
