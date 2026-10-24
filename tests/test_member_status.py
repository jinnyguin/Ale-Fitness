import unittest
from datetime import datetime, timezone
from unittest.mock import patch

import server


class MemberStatusTests(unittest.TestCase):
    def setUp(self):
        self.client = server.app.test_client()

    def test_returns_verified_member_profile_and_latest_plan(self):
        created = datetime(2026, 10, 24, tzinfo=timezone.utc)
        rows = [
            {
                "email": "member@example.test",
                "full_name": "Member",
                "bio": "Training for a 10K",
                "avatar_url": "",
                "daily_calorie_goal": 2000,
            },
            {
                "id": "plan-record",
                "data": {
                    "preferences": {"sport": "running"},
                    "generated_plan": {"name": "10K Base"},
                },
                "created_at": created,
                "updated_at": created,
            },
        ]

        class Cursor:
            def execute(self, query, params):
                self.query = query
                self.params = params

            def fetchone(self):
                return rows.pop(0)

        class Connection:
            def cursor(self, **kwargs):
                return Cursor()

            def close(self):
                pass

        with patch.object(
            server, "require_auth",
            return_value=({"id": "verified-user", "email": "member@example.test"}, "token", None),
        ), patch.object(server, "get_db", return_value=Connection()):
            response = self.client.get(f"/api/apps/{server.APP_ID}/member-status")

        self.assertEqual(response.status_code, 200)
        result = response.get_json()
        self.assertEqual(result["user"]["id"], "verified-user")
        self.assertEqual(result["profile"]["bio"], "Training for a 10K")
        self.assertEqual(result["plan"]["id"], "plan-record")
        self.assertEqual(result["plan"]["generated_plan"]["name"], "10K Base")
        self.assertTrue(result["setup_complete"])
        self.assertEqual(response.headers["Cache-Control"], "no-store")

    def test_no_saved_plan_is_an_explicit_incomplete_state(self):
        class Cursor:
            def execute(self, query, params):
                pass

            def fetchone(self):
                return None

        class Connection:
            def cursor(self, **kwargs):
                return Cursor()

            def close(self):
                pass

        with patch.object(
            server, "require_auth",
            return_value=({"id": "verified-user", "email": "member@example.test"}, "token", None),
        ), patch.object(server, "get_db", return_value=Connection()):
            response = self.client.get(f"/api/apps/{server.APP_ID}/member-status")

        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.get_json()["plan"])
        self.assertFalse(response.get_json()["setup_complete"])

    def test_database_failure_is_not_misreported_as_no_plan(self):
        with patch.object(
            server, "require_auth",
            return_value=({"id": "verified-user"}, "token", None),
        ), patch.object(server, "get_db", side_effect=RuntimeError("database unavailable")):
            response = self.client.get(f"/api/apps/{server.APP_ID}/member-status")
        self.assertEqual(response.status_code, 503)

    def test_member_status_requires_authentication(self):
        with patch.object(
            server, "require_auth",
            return_value=(None, None, ({"error": "Unauthorized"}, 401)),
        ):
            response = self.client.get(f"/api/apps/{server.APP_ID}/member-status")
        self.assertEqual(response.status_code, 401)


if __name__ == "__main__":
    unittest.main()
