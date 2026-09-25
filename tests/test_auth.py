import io
import unittest
from urllib.parse import parse_qs, urlparse
from unittest.mock import patch
from urllib.error import HTTPError

import server


APP_ID = server.APP_ID
LOCAL_USER = {
    "id": "local-test-user",
    "email": "athlete@example.test",
    "created_at": "2026-01-01T00:00:00+00:00",
    "user_metadata": {"full_name": "Test Athlete"},
    "_local": True,
}


class AuthRouteTests(unittest.TestCase):
    def setUp(self):
        self.client = server.app.test_client()

    def test_registration_falls_back_to_local_auth_when_provider_is_unavailable(self):
        with (
            patch.object(server, "SUPABASE_SERVICE_KEY", ""),
            patch.object(server, "supabase_auth", return_value=(503, {"error": "unavailable"})),
            patch.object(server, "local_register", return_value=(LOCAL_USER, None)),
            patch.object(server, "create_local_token", return_value="local.signed.token"),
        ):
            response = self.client.post(
                f"/api/apps/{APP_ID}/auth/register",
                json={
                    "full_name": "Test Athlete",
                    "email": "Athlete@Example.Test",
                    "password": "correct horse battery",
                },
            )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.get_json()["access_token"], "local.signed.token")
        self.assertEqual(response.get_json()["user"]["email"], "athlete@example.test")

    def test_confirmation_required_is_reported_as_success_not_failure(self):
        provider_user = {"id": "remote-user", "email": "athlete@example.test"}
        with (
            patch.object(server, "SUPABASE_SERVICE_KEY", ""),
            patch.object(
                server,
                "supabase_auth",
                return_value=(200, {"user": provider_user}),
            ) as auth_call,
            patch.object(server, "ensure_profile") as ensure_profile,
        ):
            response = self.client.post(
                f"/api/apps/{APP_ID}/auth/register",
                json={
                    "full_name": "Test Athlete",
                    "email": "athlete@example.test",
                    "password": "correct horse battery",
                },
            )

        self.assertEqual(response.status_code, 202)
        self.assertTrue(response.get_json()["confirmation_required"])
        auth_call.assert_called_once()
        signup_path = auth_call.call_args.args[1]
        signup_query = parse_qs(urlparse(signup_path).query)
        callback = urlparse(signup_query["redirect_to"][0])
        self.assertEqual(callback.path, "/auth/callback")
        self.assertEqual(parse_qs(callback.query)["from_url"], ["/Register.html"])
        ensure_profile.assert_called_once_with(
            "remote-user", "athlete@example.test", "Test Athlete"
        )

    def test_local_user_can_log_in_without_contacting_remote_provider(self):
        with (
            patch.object(server, "local_user_by_email", return_value=LOCAL_USER),
            patch.object(server, "local_login", return_value=LOCAL_USER),
            patch.object(server, "create_local_token", return_value="local.signed.token"),
            patch.object(server, "ensure_profile"),
            patch.object(server, "supabase_auth") as auth_call,
        ):
            response = self.client.post(
                f"/api/apps/{APP_ID}/auth/login",
                json={"email": "ATHLETE@example.test", "password": "correct horse battery"},
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["access_token"], "local.signed.token")
        auth_call.assert_not_called()

    def test_remote_outage_returns_retryable_status(self):
        with (
            patch.object(server, "local_user_by_email", return_value=None),
            patch.object(server, "local_login", return_value=None),
            patch.object(server, "supabase_auth", return_value=(503, {"error": "unavailable"})),
        ):
            response = self.client.post(
                f"/api/apps/{APP_ID}/auth/login",
                json={"email": "athlete@example.test", "password": "correct horse battery"},
            )

        self.assertEqual(response.status_code, 503)
        self.assertIn("try again", response.get_json()["error"].lower())

    def test_malformed_auth_payloads_are_rejected_cleanly(self):
        response = self.client.post(
            f"/api/apps/{APP_ID}/auth/login",
            json=["not", "an", "object"],
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("valid sign-in form", response.get_json()["error"].lower())

    def test_provider_key_errors_are_sanitized_and_allow_fallback(self):
        provider_error = HTTPError(
            "https://auth.example.test/auth/v1/signup",
            401,
            "Unauthorized",
            {},
            io.BytesIO(b'{"message":"Invalid API key"}'),
        )
        with (
            patch.object(server, "SUPABASE_URL", "https://auth.example.test"),
            patch.object(server, "SUPABASE_KEY", "test-key"),
            patch("server.urllib.request.urlopen", side_effect=provider_error),
        ):
            status, data = server.supabase_auth("POST", "/auth/v1/signup", {})

        self.assertEqual(status, 503)
        self.assertEqual(data, {"error": "Auth service unavailable."})

    def test_local_auth_table_setup_retries_after_temporary_database_failure(self):
        class FakeCursor:
            def execute(self, _sql):
                return None

        class FakeConnection:
            def cursor(self):
                return FakeCursor()

            def close(self):
                return None

        with (
            patch.object(server, "_LOCAL_AUTH_TABLE_READY", False),
            patch.object(server, "get_db", side_effect=[OSError("offline"), FakeConnection()]),
        ):
            self.assertFalse(server.ensure_local_auth_table())
            self.assertTrue(server.ensure_local_auth_table())


if __name__ == "__main__":
    unittest.main()