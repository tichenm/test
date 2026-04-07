import unittest
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent))

from local_dev import DoctorSnapshot, evaluate_doctor_snapshot, plan_setup_actions


class SetupPlanningTests(unittest.TestCase):
    def test_plans_full_bootstrap_when_repo_is_unprepared(self) -> None:
        actions = plan_setup_actions(
            env_file_exists=False,
            postgres_data_exists=False,
            database_ready=False,
        )

        self.assertEqual(
            actions,
            [
                "copy-env",
                "prisma-generate",
                "db-init",
                "db-start",
                "db-createdb",
                "prisma-deploy",
            ],
        )

    def test_skips_one_time_steps_when_local_state_already_exists(self) -> None:
        actions = plan_setup_actions(
            env_file_exists=True,
            postgres_data_exists=True,
            database_ready=False,
        )

        self.assertEqual(actions, ["prisma-generate", "db-start", "db-createdb", "prisma-deploy"])

    def test_skips_database_creation_when_database_is_already_ready(self) -> None:
        actions = plan_setup_actions(
            env_file_exists=True,
            postgres_data_exists=True,
            database_ready=True,
        )

        self.assertEqual(actions, ["prisma-generate", "prisma-deploy"])


class DoctorSnapshotTests(unittest.TestCase):
    def test_reports_pass_when_required_local_dependencies_are_ready(self) -> None:
        snapshot = DoctorSnapshot(
            env_file_exists=True,
            missing_env_keys=[],
            postgres_cli_available=True,
            postgres_data_exists=True,
            database_ready=True,
            prisma_ready=True,
        )

        report = evaluate_doctor_snapshot(snapshot)

        self.assertEqual(report["status"], "pass")
        self.assertEqual(report["issues"], [])

    def test_reports_failing_checks_with_actionable_issue_list(self) -> None:
        snapshot = DoctorSnapshot(
            env_file_exists=False,
            missing_env_keys=["DATABASE_URL", "NEXTAUTH_SECRET"],
            postgres_cli_available=False,
            postgres_data_exists=False,
            database_ready=False,
            prisma_ready=False,
        )

        report = evaluate_doctor_snapshot(snapshot)

        self.assertEqual(report["status"], "fail")
        self.assertIn("Missing .env file", report["issues"])
        self.assertIn("Missing env keys: DATABASE_URL, NEXTAUTH_SECRET", report["issues"])
        self.assertIn("Postgres CLI not found", report["issues"])
        self.assertIn("Local Postgres data directory is not initialized", report["issues"])
        self.assertIn("Database is not reachable", report["issues"])
        self.assertIn("Prisma migrations are not ready", report["issues"])


if __name__ == "__main__":
    unittest.main()
