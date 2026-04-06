import unittest
from pathlib import Path
import subprocess
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent))

from smoke_local_flow import get_smoke_scenario


class SmokeLocalFlowScenarioTests(unittest.TestCase):
    def test_uses_inventory_replenishment_by_default(self) -> None:
        scenario = get_smoke_scenario("inventory-replenishment")

        self.assertEqual(scenario["railKey"], "inventory-replenishment")
        self.assertEqual(scenario["label"], "Inventory and replenishment")
        self.assertEqual(scenario["storeName"], "Store 12")
        self.assertEqual(scenario["roleName"], "Store manager")
        self.assertEqual(scenario["answers"][0], "stockout")

    def test_supports_warehouse_receiving_scenario(self) -> None:
        scenario = get_smoke_scenario("warehouse-receiving")

        self.assertEqual(scenario["railKey"], "warehouse-receiving")
        self.assertEqual(scenario["label"], "Warehouse receiving")
        self.assertEqual(scenario["storeName"], "North Hub")
        self.assertEqual(scenario["roleName"], "Warehouse supervisor")
        self.assertEqual(scenario["answers"][0], "overstock")

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


if __name__ == "__main__":
    unittest.main()
