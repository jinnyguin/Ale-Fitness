import json
import os
import unittest
from datetime import datetime, timezone
from unittest.mock import patch

import server


class DatabaseConfigTests(unittest.TestCase):
    def test_get_db_uses_legacy_database_variable_when_standard_url_is_missing(self):
        fake_connection = type("FakeConnection", (), {})()
        with (
            patch.dict(os.environ, {"DATABASE_URL": "", "Database": "postgresql://test"}),
            patch.object(server.psycopg2, "connect", return_value=fake_connection) as connect,
        ):
            self.assertIs(server.get_db(), fake_connection)

        connect.assert_called_once_with("postgresql://test", connect_timeout=10)

    def test_get_db_prefers_standard_database_url(self):
        fake_connection = type("FakeConnection", (), {})()
        with (
            patch.dict(os.environ, {
                "DATABASE_URL": "postgresql://primary",
                "Database": "postgresql://legacy",
            }),
            patch.object(server.psycopg2, "connect", return_value=fake_connection) as connect,
        ):
            self.assertIs(server.get_db(), fake_connection)

        connect.assert_called_once_with("postgresql://primary", connect_timeout=10)

    def test_get_db_fails_clearly_when_no_connection_is_configured(self):
        with (
            patch.dict(os.environ, {"DATABASE_URL": "", "Database": ""}),
            patch.object(server.psycopg2, "connect") as connect,
        ):
            with self.assertRaisesRegex(RuntimeError, "Database connection is not configured"):
                server.get_db()
        connect.assert_not_called()


class PlanSaveRouteTests(unittest.TestCase):
    def test_plan_save_persists_the_reviewed_plan_for_the_signed_in_user(self):
        created = datetime(2026, 10, 19, tzinfo=timezone.utc)
        updated = datetime(2026, 10, 19, tzinfo=timezone.utc)

        class Cursor:
            def __init__(self):
                self.query = None
                self.params = None

            def execute(self, query, params):
                self.query = query
                self.params = params

            def fetchone(self):
                return ("plan-record-1", created, updated)

        class Connection:
            def __init__(self):
                self.cursor_instance = Cursor()
                self.closed = False

            def cursor(self):
                return self.cursor_instance

            def close(self):
                self.closed = True

        connection = Connection()
        payload = {
            "onboarding_id": "test-onboarding-1",
            "preferences": {"sport": "running", "days": 3},
            "generated_plan": {"path": "/my-plan.html", "weeks": [{"sessions": []}]},
        }
        client = server.app.test_client()

        with (
            patch.object(
                server,
                "require_auth",
                return_value=({"id": "member-1"}, "verified-token", None),
            ),
            patch.object(server, "get_db", return_value=connection),
        ):
            response = client.post(
                f"/api/apps/{server.APP_ID}/onboarding-plan",
                json=payload,
            )

        self.assertEqual(response.status_code, 200)
        saved = response.get_json()
        self.assertEqual(saved["id"], "plan-record-1")
        self.assertEqual(saved["preferences"], payload["preferences"])
        self.assertEqual(saved["generated_plan"], payload["generated_plan"])
        self.assertTrue(connection.closed)
        self.assertIn("ON CONFLICT", connection.cursor_instance.query)
        self.assertEqual(connection.cursor_instance.params[1], "member-1")
        stored = json.loads(connection.cursor_instance.params[2])
        self.assertEqual(stored["onboarding_id"], payload["onboarding_id"])
        self.assertEqual(stored["generated_plan"], payload["generated_plan"])


if __name__ == "__main__":
    unittest.main()
