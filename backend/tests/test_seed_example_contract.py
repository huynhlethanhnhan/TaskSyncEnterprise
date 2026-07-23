import unittest
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from Seed_Example import EXPECTED_COUNTS, build_seed_plan


class SeedExampleContractTest(unittest.TestCase):
    def test_seed_example_has_enterprise_sized_dataset(self):
        plan = build_seed_plan()

        self.assertEqual(EXPECTED_COUNTS["admins"], 2)
        self.assertLessEqual(5, EXPECTED_COUNTS["managers"])
        self.assertLessEqual(EXPECTED_COUNTS["managers"], 10)
        self.assertGreater(EXPECTED_COUNTS["employees"], 30)
        self.assertGreaterEqual(EXPECTED_COUNTS["departments"], 6)
        self.assertGreaterEqual(EXPECTED_COUNTS["tasks"], 60)
        self.assertGreaterEqual(
            EXPECTED_COUNTS["notifications"], EXPECTED_COUNTS["employees"] * 3
        )
        self.assertEqual(len(plan["employees"]), EXPECTED_COUNTS["employees"])
        self.assertEqual(len(plan["tasks"]), EXPECTED_COUNTS["tasks"])
        self.assertEqual(len(plan["notifications"]), EXPECTED_COUNTS["notifications"])

    def test_seed_example_contains_unicode_and_management_assignments(self):
        plan = build_seed_plan()
        names = [employee["full_name"] for employee in plan["employees"]]
        manager_codes = {
            employee["employee_code"]
            for employee in plan["employees"]
            if employee["role"] == "manager"
        }

        self.assertIn("Huỳnh Lê Thành Nhân", names)
        self.assertEqual(len(manager_codes), EXPECTED_COUNTS["managers"])
        self.assertTrue(
            all(
                employee.get("manager_code")
                for employee in plan["employees"]
                if employee["role"] == "employee"
            )
        )
        self.assertTrue(
            all(
                employee["email"].endswith("@tasksync.example.com")
                for employee in plan["employees"]
            )
        )
        self.assertFalse(
            any(employee["email"].endswith(".local") for employee in plan["employees"])
        )


if __name__ == "__main__":
    unittest.main()
