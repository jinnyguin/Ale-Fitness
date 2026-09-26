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

    def test_wrong_local_password_is_rejected_without_remote_fallback(self):
        with (
            patch.object(server, "local_user_by_email", return_value=LOCAL_USER),
            patch.object(server, "local_login", return_value=None),
            patch.object(server, "supabase_auth") as auth_call,
        ):
            response = self.client.post(
                f"/api/apps/{APP_ID}/auth/login",
                json={"email": "athlete@example.test", "password": "wrong-password"},
            )

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.get_json()["error"], "Invalid email or password.")
        auth_call.assert_not_called()

    def test_local_duplicate_signup_is_reported_as_conflict(self):
        with (
            patch.object(server, "SUPABASE_SERVICE_KEY", ""),
            patch.object(server, "LOCAL_AUTH_SECRET", "test-session-secret"),
            patch.object(server, "supabase_auth", return_value=(503, {"error": "unavailable"})),
            patch.object(server, "ensure_local_auth_table", return_value=True),
            patch.object(server, "local_user_by_email", return_value=LOCAL_USER),
        ):
            response = self.client.post(
                f"/api/apps/{APP_ID}/auth/register",
                json={
                    "full_name": "Test Athlete",
                    "email": "athlete@example.test",
                    "password": "correct horse battery",
                },
            )

        self.assertEqual(response.status_code, 409)
        self.assertIn("already exists", response.get_json()["error"].lower())

    def test_remote_duplicate_signup_is_reported_as_conflict(self):
        with (
            patch.object(server, "SUPABASE_SERVICE_KEY", ""),
            patch.object(
                server,
                "supabase_auth",
                return_value=(422, {"msg": "User already registered"}),
            ),
        ):
            response = self.client.post(
                f"/api/apps/{APP_ID}/auth/register",
                json={
                    "full_name": "Test Athlete",
                    "email": "athlete@example.test",
                    "password": "correct horse battery",
                },
            )

        self.assertEqual(response.status_code, 409)
        self.assertIn("already exists", response.get_json()["error"].lower())

    def test_weak_signup_password_is_rejected_before_provider_call(self):
        with patch.object(server, "supabase_auth") as auth_call:
            response = self.client.post(
                f"/api/apps/{APP_ID}/auth/register",
                json={
                    "full_name": "Test Athlete",
                    "email": "athlete@example.test",
                    "password": "short",
                },
            )

        self.assertEqual(response.status_code, 400)
        self.assertIn("8 characters", response.get_json()["error"])
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

    def test_non_json_provider_response_is_sanitized(self):
        class NonJsonResponse:
            status = 200
            headers = {"Content-Type": "text/html; charset=utf-8"}

            def __enter__(self):
                return self

            def __exit__(self, *_args):
                return None

            def read(self):
                return b"<html>upstream error</html>"

        with (
            patch.object(server, "SUPABASE_URL", "https://auth.example.test"),
            patch.object(server, "SUPABASE_KEY", "test-key"),
            patch("server.urllib.request.urlopen", return_value=NonJsonResponse()),
        ):
            status, data = server.supabase_auth("GET", "/auth/v1/settings")

        self.assertEqual(status, 503)
        self.assertEqual(data, {"error": "Auth service unavailable."})

    def test_admin_auth_does_not_fall_back_to_public_key(self):
        with (
            patch.object(server, "SUPABASE_URL", "https://auth.example.test"),
            patch.object(server, "SUPABASE_KEY", "public-test-key"),
            patch.object(server, "SUPABASE_SERVICE_KEY", ""),
            patch("server.urllib.request.urlopen") as urlopen,
        ):
            status, data = server.supabase_admin("POST", "/auth/v1/admin/users", {})

        self.assertEqual(status, 503)
        self.assertEqual(data, {"error": "Auth service unavailable."})
        urlopen.assert_not_called()

    def test_local_token_creation_fails_closed_without_session_secret(self):
        with patch.object(server, "LOCAL_AUTH_SECRET", ""):
            with self.assertRaises(RuntimeError):
                server.create_local_token(LOCAL_USER)

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