import json
import os
import unittest
from datetime import datetime, timezone
from unittest.mock import patch

import server


class DatabaseConfigTests(unittest.TestCase):
    def test_get_db_uses_supabase_database_url(self):
        fake_connection = type("FakeConnection", (), {})()
        with (
            patch.dict(os.environ, {
                "SUPABASE_DATABASE_URL": "postgresql://supabase",
                "DATABASE_URL": "postgresql://legacy",
                "Database": "postgresql://older",
            }),
            patch.object(server.psycopg2, "connect", return_value=fake_connection) as connect,
        ):
            self.assertIs(server.get_db(), fake_connection)

        connect.assert_called_once_with("postgresql://supabase", connect_timeout=10)

    def test_get_db_requires_supabase_url_instead_of_falling_back(self):
        fake_connection = type("FakeConnection", (), {})()
        with (
            patch.dict(os.environ, {
                "SUPABASE_DATABASE_URL": "",
                "DATABASE_URL": "postgresql://legacy",
                "Database": "postgresql://older",
            }),
            patch.object(server.psycopg2, "connect", return_value=fake_connection) as connect,
        ):
            with self.assertRaisesRegex(RuntimeError, "Supabase database connection is not configured"):
                server.get_db()

        connect.assert_not_called()

    def test_local_auth_db_keeps_using_existing_database(self):
        fake_connection = type("FakeConnection", (), {})()
        with (
            patch.dict(os.environ, {
                "SUPABASE_DATABASE_URL": "postgresql://supabase",
                "DATABASE_URL": "postgresql://legacy-auth",
                "Database": "postgresql://older",
            }),
            patch.object(server.psycopg2, "connect", return_value=fake_connection) as connect,
        ):
            self.assertIs(server.get_local_auth_db(), fake_connection)

        connect.assert_called_once_with("postgresql://legacy-auth", connect_timeout=10)


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
