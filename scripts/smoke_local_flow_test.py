import unittest
from pathlib import Path
import subprocess
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent))

from smoke_local_flow import (
    build_answer_submission_fields,
    build_step_mode,
    build_step_answer,
    build_persistence_expectations,
    build_post_run_markers,
    extract_magic_link,
    get_smoke_scenario,
    normalize_local_redirect,
    parse_quick_choice_steps,
)


class SmokeLocalFlowScenarioTests(unittest.TestCase):
    def test_uses_inventory_replenishment_by_default(self) -> None:
        scenario = get_smoke_scenario("inventory-replenishment")

        self.assertEqual(scenario["railKey"], "inventory-replenishment")
        self.assertEqual(scenario["label"], "库存与补货")
        self.assertEqual(scenario["storeName"], "12号店")
        self.assertEqual(scenario["roleName"], "门店店长")
        self.assertEqual(scenario["expectedPainType"], "stockout")
        self.assertEqual(scenario["answers"][0], "stockout")

    def test_supports_warehouse_receiving_scenario(self) -> None:
        scenario = get_smoke_scenario("warehouse-receiving")

        self.assertEqual(scenario["railKey"], "warehouse-receiving")
        self.assertEqual(scenario["label"], "仓库收货")
        self.assertEqual(scenario["storeName"], "华北仓")
        self.assertEqual(scenario["roleName"], "仓库主管")
        self.assertEqual(scenario["expectedPainType"], "overstock")
        self.assertEqual(scenario["answers"][0], "overstock")

    def test_supports_store_service_complaints_scenario(self) -> None:
        scenario = get_smoke_scenario("store-service-complaints")

        self.assertEqual(scenario["railKey"], "store-service-complaints")
        self.assertEqual(scenario["label"], "门店服务体验与客诉")
        self.assertEqual(scenario["storeName"], "人民广场店")
        self.assertEqual(scenario["roleName"], "门店店长")
        self.assertEqual(scenario["expectedPainType"], "service-delay")
        self.assertEqual(scenario["answers"][0], "等待太久")

    def test_supports_store_staffing_scheduling_scenario(self) -> None:
        scenario = get_smoke_scenario("store-staffing-scheduling")

        self.assertEqual(scenario["railKey"], "store-staffing-scheduling")
        self.assertEqual(scenario["label"], "门店排班与人手配置")
        self.assertEqual(scenario["storeName"], "南京西路店")
        self.assertEqual(scenario["roleName"], "门店店长")
        self.assertEqual(scenario["expectedPainType"], "schedule-instability")
        self.assertEqual(scenario["answers"][0], "排班总变")

    def test_supports_store_equipment_maintenance_scenario(self) -> None:
        scenario = get_smoke_scenario("store-equipment-maintenance")

        self.assertEqual(scenario["railKey"], "store-equipment-maintenance")
        self.assertEqual(scenario["label"], "门店设备故障与维修响应")
        self.assertEqual(scenario["storeName"], "徐家汇店")
        self.assertEqual(scenario["roleName"], "门店店长")
        self.assertEqual(scenario["expectedPainType"], "repair-delay")
        self.assertEqual(scenario["answers"][0], "维修太慢")

    def test_supports_store_shrinkage_waste_scenario(self) -> None:
        scenario = get_smoke_scenario("store-shrinkage-waste")

        self.assertEqual(scenario["railKey"], "store-shrinkage-waste")
        self.assertEqual(scenario["label"], "门店损耗与报废")
        self.assertEqual(scenario["storeName"], "五角场店")
        self.assertEqual(scenario["roleName"], "门店店长")
        self.assertEqual(scenario["expectedPainType"], "shrinkage-spike")
        self.assertEqual(scenario["answers"][0], "损耗偏高")

    def test_builds_post_run_markers_for_history_and_insights_checks(self) -> None:
        scenario = get_smoke_scenario("store-service-complaints")

        markers = build_post_run_markers("session-123", scenario)

        self.assertEqual(markers["history"], ["/history/session-123", "人民广场店", "门店店长"])
        self.assertEqual(markers["insights"], ["/history/session-123", "门店服务体验与客诉"])

    def test_builds_persistence_expectations_from_canonical_pain_type(self) -> None:
        scenario = get_smoke_scenario("store-service-complaints")

        expectations = build_persistence_expectations(scenario)

        self.assertEqual(expectations["userMessageContent"], "service-delay")
        self.assertEqual(expectations["sessionPainType"], "service-delay")

    def test_builds_quick_choice_submission_fields_from_the_matching_form(self) -> None:
        page = """
        <form>
          <input type="hidden" name="$ACTION_1:0" value="alpha"/>
          <input type="hidden" name="$ACTION_1:1" value="beta"/>
          <button type="submit" name="answer" value="service-delay">等待太久</button>
        </form>
        <form>
          <input type="hidden" name="$ACTION_2:0" value="gamma"/>
          <textarea name="answer"></textarea>
        </form>
        """

        fields = build_answer_submission_fields(page, "service-delay", "quick-choice")

        self.assertEqual(
            fields,
            [
                ("$ACTION_REF_1", ""),
                ("$ACTION_1:0", "alpha"),
                ("$ACTION_1:1", "beta"),
                ("answer", "service-delay"),
            ],
        )

    def test_builds_freeform_submission_fields_from_the_textarea_form(self) -> None:
        page = """
        <form>
          <input type="hidden" name="$ACTION_1:0" value="alpha"/>
          <button type="submit" name="answer" value="service-delay">等待太久</button>
        </form>
        <form>
          <input type="hidden" name="$ACTION_2:0" value="gamma"/>
          <input type="hidden" name="$ACTION_2:1" value="delta"/>
          <textarea name="answer"></textarea>
        </form>
        """

        fields = build_answer_submission_fields(page, "等待太久", "freeform")

        self.assertEqual(
            fields,
            [
                ("$ACTION_REF_2", ""),
                ("$ACTION_2:0", "gamma"),
                ("$ACTION_2:1", "delta"),
                ("answer", "等待太久"),
            ],
        )

    def test_uses_canonical_answer_value_for_quick_choice_first_step(self) -> None:
        scenario = get_smoke_scenario("store-service-complaints")

        self.assertEqual(build_step_answer(scenario, 1, "quick-choice"), "service-delay")
        self.assertEqual(build_step_answer(scenario, 1, "freeform"), "等待太久")
        self.assertEqual(build_step_answer(scenario, 2, "quick-choice"), "每个周末晚高峰")

    def test_uses_step_specific_quick_choice_values_for_later_service_steps(self) -> None:
        scenario = get_smoke_scenario("store-service-complaints")

        self.assertEqual(build_step_answer(scenario, 4, "quick-choice"), "现场解释安抚")
        self.assertEqual(build_step_answer(scenario, 5, "quick-choice"), "出餐和值班店长")

    def test_parses_quick_choice_steps_from_step_keys(self) -> None:
        self.assertEqual(
            parse_quick_choice_steps("affected-scope,people-involved"),
            {"affected-scope", "people-involved"},
        )
        self.assertEqual(parse_quick_choice_steps(""), set())
        self.assertEqual(parse_quick_choice_steps(None), set())

    def test_builds_step_mode_for_later_quick_choice_steps(self) -> None:
        quick_choice_steps = {"affected-scope", "people-involved"}

        self.assertEqual(
            build_step_mode(1, "problem-symptom", "quick-choice", quick_choice_steps),
            "quick-choice",
        )
        self.assertEqual(
            build_step_mode(4, "affected-scope", "freeform", quick_choice_steps),
            "quick-choice",
        )
        self.assertEqual(
            build_step_mode(5, "people-involved", "freeform", quick_choice_steps),
            "quick-choice",
        )
        self.assertEqual(
            build_step_mode(6, "current-workaround", "freeform", quick_choice_steps),
            "freeform",
        )

    def test_rejects_unknown_rail_key(self) -> None:
        with self.assertRaises(SystemExit):
            get_smoke_scenario("unknown-rail")

    def test_help_flag_prints_usage(self) -> None:
        result = subprocess.run(
            [sys.executable, str(Path(__file__).resolve().parent / "smoke_local_flow.py"), "--help"],
            capture_output=True,
            text=True,
        )

        self.assertEqual(result.returncode, 0)
        self.assertIn("usage:", result.stdout.lower())
        self.assertIn("--rail-key", result.stdout)

    def test_extract_magic_link_supports_localhost_and_loopback(self) -> None:
        localhost_log = (
            '[auth] Magic link for qa@store.com: '
            'http://localhost:3000/api/auth/callback/email?token=abc&email=qa%40store.com'
        )
        loopback_log = (
            '[auth] Magic link for qa@store.com: '
            'http://127.0.0.1:3000/api/auth/callback/email?token=def&email=qa%40store.com'
        )

        self.assertEqual(
            extract_magic_link(localhost_log, "qa@store.com", "http://127.0.0.1:3000"),
            "http://127.0.0.1:3000/api/auth/callback/email?token=abc&email=qa%40store.com",
        )
        self.assertEqual(
            extract_magic_link(loopback_log, "qa@store.com", "http://localhost:3000"),
            "http://localhost:3000/api/auth/callback/email?token=def&email=qa%40store.com",
        )

    def test_normalize_local_redirect_uses_current_base_origin(self) -> None:
        self.assertEqual(
            normalize_local_redirect("http://localhost:3000/"),
            "http://127.0.0.1:3000/",
        )
        self.assertEqual(
            normalize_local_redirect("/history/demo"),
            "http://127.0.0.1:3000/history/demo",
        )


if __name__ == "__main__":
    unittest.main()
