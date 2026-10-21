import unittest
from datetime import datetime, timezone
from unittest.mock import patch

import server


class DashboardDataTests(unittest.TestCase):
    def test_initial_dashboard_data_uses_one_authenticated_query(self):
        created = datetime(2026, 10, 21, tzinfo=timezone.utc)
        rows = [
            {
                "id": "plan-1",
                "entity_type": "OnboardingPlan",
                "data": {"generated_plan": {"weeks": [{"sessions": []}]}},
                "created_at": created,
                "updated_at": created,
            },
            {
                "id": "log-1",
                "entity_type": "WorkoutLog",
                "data": {"feedback": {"status": "completed"}},
                "created_at": created,
                "updated_at": created,
            },
            {
                "id": "readiness-1",
                "entity_type": "ReadinessCheck",
                "data": {"energy": 4},
                "created_at": created,
                "updated_at": created,
            },
        ]

        class Cursor:
            def __init__(self):
                self.query = ""
                self.params = None

            def execute(self, query, params):
                self.query = query
                self.params = params

            def fetchall(self):
                return rows

        class Connection:
            def __init__(self):
                self.cursor_instance = Cursor()
                self.closed = False

            def cursor(self, **kwargs):
                return self.cursor_instance

            def close(self):
                self.closed = True

        connection = Connection()
        client = server.app.test_client()
        with (
            patch.object(
                server,
                "require_auth",
                return_value=(
                    {
                        "id": "member-1",
                        "email": "member@example.com",
                        "user_metadata": {"full_name": "Member"},
                        "created_at": "2026-01-01T00:00:00Z",
                    },
                    "verified-token",
                    None,
                ),
            ) as auth,
            patch.object(server, "get_db", return_value=connection) as get_db,
        ):
            response = client.get(f"/api/apps/{server.APP_ID}/dashboard-data")

        self.assertEqual(response.status_code, 200)
        body = response.get_json()
        self.assertEqual(body["user"]["id"], "member-1")
        self.assertEqual(body["plans"][0]["id"], "plan-1")
        self.assertEqual(body["logs"][0]["id"], "log-1")
        self.assertEqual(body["readiness"][0]["id"], "readiness-1")
        self.assertEqual(auth.call_count, 1)
        get_db.assert_called_once()
        self.assertEqual(connection.cursor_instance.params[0], "member-1")
        self.assertIn("ROW_NUMBER()", connection.cursor_instance.query)
        self.assertTrue(connection.closed)

    def test_unauthenticated_dashboard_data_does_not_query_database(self):
        client = server.app.test_client()
        with (
            patch.object(
                server,
                "require_auth",
                return_value=(None, None, ({"error": "Unauthorized"}, 401)),
            ),
            patch.object(server, "get_db") as get_db,
        ):
            response = client.get(f"/api/apps/{server.APP_ID}/dashboard-data")

        self.assertEqual(response.status_code, 401)
        get_db.assert_not_called()


if __name__ == "__main__":
    unittest.main()
