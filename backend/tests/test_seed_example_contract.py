import unittest
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from Seed_Example import EXPECTED_COUNTS, build_seed_plan


class SeedExampleContractTest(unittest.TestCase):
    def test_seed_example_has_enterprise_sized_dataset(self):
        plan = build_seed_plan()

        self.assertEqual(EXPECTED_COUNTS["admins"], 2)
        self.assertEqual(EXPECTED_COUNTS["managers"], 5)
        self.assertGreaterEqual(EXPECTED_COUNTS["employees"], 20)
        self.assertLessEqual(EXPECTED_COUNTS["employees"], 25)
        self.assertEqual(EXPECTED_COUNTS["departments"], 5)
        self.assertEqual(EXPECTED_COUNTS["teams"], 5)
        self.assertEqual(EXPECTED_COUNTS["sprints"], 15)
        self.assertGreaterEqual(EXPECTED_COUNTS["tasks"], 60)
        self.assertGreaterEqual(
            EXPECTED_COUNTS["notifications"], EXPECTED_COUNTS["employees"] * 3
        )
        self.assertEqual(len(plan["employees"]), EXPECTED_COUNTS["employees"])
        self.assertEqual(len(plan["topics"]), EXPECTED_COUNTS["topics"])
        self.assertEqual(len(plan["sprints"]), EXPECTED_COUNTS["sprints"])
        self.assertEqual(len(plan["tasks"]), EXPECTED_COUNTS["tasks"])
        self.assertEqual(len(plan["backlog_items"]), EXPECTED_COUNTS["backlog_items"])
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

    def test_seed_example_connects_work_manager_entities(self):
        plan = build_seed_plan()
        projects = {project["project_code"]: project for project in plan["projects"]}
        topic_codes = {topic["topic_code"] for topic in plan["topics"]}
        sprint_codes = {sprint["sprint_code"] for sprint in plan["sprints"]}
        task_codes = {task["task_code"] for task in plan["tasks"]}

        for department_code in ("IT", "PRODUCT", "HR", "SALES", "OPS"):
            active_project = next(
                project
                for project in projects.values()
                if project["department_code"] == department_code
                and project["status"] == "Active"
            )
            department_sprints = [
                sprint
                for sprint in plan["sprints"]
                if sprint["project_code"] == active_project["project_code"]
            ]
            self.assertEqual(len(department_sprints), 3)
            self.assertEqual(
                {sprint["status"] for sprint in department_sprints},
                {"Completed", "Active", "Planned"},
            )

        self.assertTrue(
            all(task["topic_code"] in topic_codes for task in plan["tasks"])
        )
        self.assertTrue(
            all(
                task["sprint_code"] is None or task["sprint_code"] in sprint_codes
                for task in plan["tasks"]
            )
        )
        self.assertTrue(
            all(
                item["project_code"] in projects
                and item["topic_code"] in topic_codes
                and (item["sprint_code"] is None or item["sprint_code"] in sprint_codes)
                and (item["task_code"] is None or item["task_code"] in task_codes)
                for item in plan["backlog_items"]
            )
        )
        self.assertTrue(
            any(
                item["task_code"] is None
                and item["sprint_code"] is None
                and item["status"] == "Backlog"
                for item in plan["backlog_items"]
            )
        )


if __name__ == "__main__":
    unittest.main()
