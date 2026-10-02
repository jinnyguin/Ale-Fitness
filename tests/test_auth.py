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

    def test_public_auth_settings_only_advertise_google_when_enabled(self):
        with (
            patch.object(server, "SUPABASE_URL", "https://auth.example.test"),
            patch.object(server, "SUPABASE_KEY", "public-test-key"),
            patch.object(server, "supabase_auth", return_value=(200, {"external": {"google": False}})),
        ):
            disabled = self.client.get(f"/api/apps/public/prod/public-settings/by-id/{APP_ID}")
        self.assertEqual(disabled.get_json()["auth"]["providers"], ["email"])

        with (
            patch.object(server, "SUPABASE_URL", "https://auth.example.test"),
            patch.object(server, "SUPABASE_KEY", "public-test-key"),
            patch.object(server, "supabase_auth", return_value=(200, {"external": {"google": True}})),
        ):
            enabled = self.client.get(f"/api/apps/public/prod/public-settings/by-id/{APP_ID}")
        self.assertEqual(enabled.get_json()["auth"]["providers"], ["email", "google"])

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

    def test_remote_signup_returns_session_when_provider_is_available(self):
        provider_user = {
            "id": "remote-user",
            "email": "athlete@example.test",
            "user_metadata": {"full_name": "Test Athlete"},
        }
        with (
            patch.object(server, "SUPABASE_SERVICE_KEY", ""),
            patch.object(
                server,
                "supabase_auth",
                return_value=(201, {"access_token": "remote-access-token", "user": provider_user}),
            ),
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

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.get_json()["access_token"], "remote-access-token")
        self.assertEqual(response.get_json()["user"]["id"], "remote-user")
        ensure_profile.assert_called_once_with(
            "remote-user", "athlete@example.test", "Test Athlete"
        )

    def test_remote_user_can_log_in_when_provider_is_available(self):
        provider_user = {
            "id": "remote-user",
            "email": "athlete@example.test",
            "user_metadata": {"full_name": "Test Athlete"},
        }
        with (
            patch.object(server, "local_user_by_email", return_value=None),
            patch.object(server, "local_login", return_value=None),
            patch.object(
                server,
                "supabase_auth",
                return_value=(200, {"access_token": "remote-access-token", "user": provider_user}),
            ),
            patch.object(server, "ensure_profile") as ensure_profile,
        ):
            response = self.client.post(
                f"/api/apps/{APP_ID}/auth/login",
                json={"email": "ATHLETE@example.test", "password": "correct horse battery"},
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["access_token"], "remote-access-token")
        self.assertEqual(response.get_json()["user"]["id"], "remote-user")
        ensure_profile.assert_called_once_with("remote-user", "athlete@example.test")

    def test_lowercase_login_html_alias_serves_the_login_page(self):
        response = self.client.get("/login.html")

        self.assertEqual(response.status_code, 200)
        self.assertIn(b'id="loginForm"', response.data)
        response.close()

    def test_rate_limited_login_returns_a_retryable_message(self):
        with (
            patch.object(server, "local_user_by_email", return_value=None),
            patch.object(server, "local_login", return_value=None),
            patch.object(server, "supabase_auth", return_value=(429, {"error": "rate limit"})),
        ):
            response = self.client.post(
                f"/api/apps/{APP_ID}/auth/login",
                json={"email": "athlete@example.test", "password": "correct horse battery"},
            )

        self.assertEqual(response.status_code, 429)
        self.assertIn("wait", response.get_json()["error"].lower())
        self.assertNotIn("rate limit", response.get_json()["error"].lower())

    def test_auth_provider_server_error_is_not_reported_as_bad_credentials(self):
        with (
            patch.object(server, "local_user_by_email", return_value=None),
            patch.object(server, "local_login", return_value=None),
            patch.object(server, "supabase_auth", return_value=(500, {"error": "internal error"})),
        ):
            response = self.client.post(
                f"/api/apps/{APP_ID}/auth/login",
                json={"email": "athlete@example.test", "password": "correct horse battery"},
            )

        self.assertEqual(response.status_code, 503)
        self.assertIn("temporarily unavailable", response.get_json()["error"].lower())
        self.assertNotIn("internal error", response.get_json()["error"].lower())

    def test_incomplete_provider_login_response_is_treated_as_service_error(self):
        incomplete_responses = (
            {"access_token": "token"},
            {"access_token": 123, "user": {"id": "remote-user"}},
        )
        for provider_data in incomplete_responses:
            with (
                patch.object(server, "local_user_by_email", return_value=None),
                patch.object(server, "local_login", return_value=None),
                patch.object(server, "supabase_auth", return_value=(200, provider_data)),
            ):
                response = self.client.post(
                    f"/api/apps/{APP_ID}/auth/login",
                    json={"email": "athlete@example.test", "password": "correct horse battery"},
                )

            self.assertEqual(response.status_code, 503)
            self.assertIn("could not be completed", response.get_json()["error"].lower())

    def test_unconfirmed_remote_account_gets_email_confirmation_guidance(self):
        with (
            patch.object(server, "local_user_by_email", return_value=None),
            patch.object(server, "local_login", return_value=None),
            patch.object(
                server,
                "supabase_auth",
                return_value=(400, {"code": "email_not_confirmed"}),
            ),
        ):
            response = self.client.post(
                f"/api/apps/{APP_ID}/auth/login",
                json={"email": "athlete@example.test", "password": "correct horse battery"},
            )

        self.assertEqual(response.status_code, 403)
        self.assertIn("confirm your email", response.get_json()["error"].lower())

    def test_google_oauth_returns_url_for_same_site_callback(self):
        redirect_to = (
            "http://localhost/auth/callback"
            "?from_url=%2FRegister.html%3Fgoogle_signup%3D1"
        )
        with (
            patch.object(server, "SUPABASE_URL", "https://auth.example.test"),
            patch.object(server, "SUPABASE_KEY", "public-test-key"),
            patch.object(
                server,
                "supabase_auth",
                return_value=(200, {"external": {"google": True}}),
            ) as auth_call,
        ):
            response = self.client.get(
                "/api/oauth/authorize",
                query_string={"provider": "google", "redirect_to": redirect_to},
            )

        self.assertEqual(response.status_code, 200)
        oauth_url = urlparse(response.get_json()["url"])
        oauth_query = parse_qs(oauth_url.query)
        self.assertEqual(oauth_url.netloc, "auth.example.test")
        self.assertEqual(oauth_query["provider"], ["google"])
        self.assertEqual(oauth_query["redirect_to"], [redirect_to])
        auth_call.assert_called_once_with("GET", "/auth/v1/settings")

    def test_google_oauth_explains_when_provider_is_disabled(self):
        with (
            patch.object(server, "SUPABASE_URL", "https://auth.example.test"),
            patch.object(server, "SUPABASE_KEY", "public-test-key"),
            patch.object(
                server,
                "supabase_auth",
                return_value=(200, {"external": {"google": False}}),
            ),
        ):
            response = self.client.get(
                "/api/oauth/authorize",
                query_string={
                    "provider": "google",
                    "redirect_to": "http://localhost/auth/callback",
                },
            )

        self.assertEqual(response.status_code, 400)
        self.assertIn("not enabled", response.get_json()["error"].lower())

    def test_google_oauth_rejects_external_callback_before_provider_check(self):
        with patch.object(server, "supabase_auth") as auth_call:
            response = self.client.get(
                "/api/oauth/authorize",
                query_string={
                    "provider": "google",
                    "redirect_to": "https://attacker.example/auth/callback",
                },
            )

        self.assertEqual(response.status_code, 400)
        self.assertIn("this site's authentication callback", response.get_json()["error"].lower())
        auth_call.assert_not_called()

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

    def test_auth_me_creates_profile_for_oauth_user(self):
        oauth_user = {
            "id": "google-user",
            "email": "google@example.test",
            "created_at": "2026-01-01T00:00:00+00:00",
            "user_metadata": {"full_name": "Google Athlete"},
        }
        with (
            patch.object(
                server,
                "get_current_user_with_status",
                return_value=(oauth_user, "oauth-token", 200),
            ),
            patch.object(server, "ensure_profile") as ensure_profile,
            patch.object(server, "get_profile_extras", return_value={}),
        ):
            response = self.client.get(
                f"/api/apps/{APP_ID}/auth/me",
                headers={"Authorization": "Bearer oauth-token"},
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["full_name"], "Google Athlete")
        ensure_profile.assert_called_once_with(
            "google-user", "google@example.test", "Google Athlete"
        )

    def test_auth_me_reports_provider_outage_as_retryable(self):
        with patch.object(server, "supabase_auth", return_value=(503, {"error": "unavailable"})):
            response = self.client.get(
                f"/api/apps/{APP_ID}/auth/me",
                headers={"Authorization": "Bearer oauth-token"},
            )

        self.assertEqual(response.status_code, 503)
        self.assertIn("temporarily unavailable", response.get_json()["error"].lower())

    def test_auth_me_reports_provider_rate_limit_as_retryable(self):
        with patch.object(server, "supabase_auth", return_value=(429, {"error": "rate limit"})):
            response = self.client.get(
                f"/api/apps/{APP_ID}/auth/me",
                headers={"Authorization": "Bearer oauth-token"},
            )

        self.assertEqual(response.status_code, 429)
        self.assertIn("try again", response.get_json()["error"].lower())

    def test_auth_me_treats_incomplete_provider_success_as_service_error(self):
        with patch.object(server, "supabase_auth", return_value=(200, [])):
            response = self.client.get(
                f"/api/apps/{APP_ID}/auth/me",
                headers={"Authorization": "Bearer oauth-token"},
            )

        self.assertEqual(response.status_code, 503)
        self.assertIn("temporarily unavailable", response.get_json()["error"].lower())

    def test_auth_me_keeps_local_session_independent_of_provider(self):
        with (
            patch.object(server, "local_user_from_token", return_value=LOCAL_USER),
            patch.object(server, "ensure_profile"),
            patch.object(server, "get_profile_extras", return_value={}),
            patch.object(server, "supabase_auth") as auth_call,
        ):
            response = self.client.get(
                f"/api/apps/{APP_ID}/auth/me",
                headers={"Authorization": "Bearer local.signed.token"},
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["id"], LOCAL_USER["id"])
        auth_call.assert_not_called()

    def test_auth_me_rejects_invalid_remote_token_as_unauthorized(self):
        with (
            patch.object(server, "LOCAL_AUTH_SECRET", ""),
            patch.object(server, "supabase_auth", return_value=(401, {"error": "invalid token"})),
        ):
            response = self.client.get(
                f"/api/apps/{APP_ID}/auth/me",
                headers={"Authorization": "Bearer invalid-remote-token"},
            )

        self.assertEqual(response.status_code, 401)

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

    def test_signup_rejects_email_without_a_dot_in_domain_before_provider_call(self):
        with patch.object(server, "supabase_auth") as auth_call:
            response = self.client.post(
                f"/api/apps/{APP_ID}/auth/register",
                json={
                    "full_name": "Test Athlete",
                    "email": "jason@icloudcom",
                    "password": "correct horse battery",
                },
            )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.get_json()["error"], "Please enter a valid email address.")
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

    def test_password_reset_does_not_claim_success_during_provider_outage(self):
        with patch.object(server, "supabase_auth", return_value=(503, {"error": "unavailable"})):
            response = self.client.post(
                f"/api/apps/{APP_ID}/auth/reset-password-request",
                json={"email": "athlete@example.test"},
            )

        self.assertEqual(response.status_code, 503)
        self.assertIn("temporarily unavailable", response.get_json()["error"].lower())

    def test_password_reset_uses_the_site_callback_as_a_query_parameter(self):
        with patch.object(server, "supabase_auth", return_value=(200, {})) as auth_call:
            response = self.client.post(
                f"/api/apps/{APP_ID}/auth/reset-password-request",
                json={"email": "Athlete@Example.Test"},
                headers={"Origin": "https://attacker.example"},
            )

        self.assertEqual(response.status_code, 200)
        method, path, body = auth_call.call_args.args
        self.assertEqual(method, "POST")
        self.assertEqual(path.split("?", 1)[0], "/auth/v1/recover")
        query = parse_qs(urlparse(path).query)
        self.assertEqual(query["redirect_to"], ["http://localhost/ResetPassword.html"])
        self.assertEqual(body, {"email": "athlete@example.test"})

    def test_password_reset_request_rejects_malformed_provider_success(self):
        with patch.object(server, "supabase_auth", return_value=(200, ["unexpected"])):
            response = self.client.post(
                f"/api/apps/{APP_ID}/auth/reset-password-request",
                json={"email": "athlete@example.test"},
            )

        self.assertEqual(response.status_code, 503)
        self.assertIn("temporarily unavailable", response.get_json()["error"].lower())

    def test_password_reset_rejects_invalid_email_before_provider_call(self):
        with patch.object(server, "supabase_auth") as auth_call:
            response = self.client.post(
                f"/api/apps/{APP_ID}/auth/reset-password-request",
                json={"email": "not-an-email"},
            )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.get_json()["error"], "Please enter a valid email address.")
        auth_call.assert_not_called()

    def test_password_reset_completion_rejects_invalid_payload_and_password(self):
        with patch.object(server, "supabase_auth") as auth_call:
            malformed = self.client.post(
                f"/api/apps/{APP_ID}/auth/reset-password",
                json=["invalid", "payload"],
            )
            short_password = self.client.post(
                f"/api/apps/{APP_ID}/auth/reset-password",
                json={"reset_token": "recovery-token", "new_password": "short"},
            )
            long_password = self.client.post(
                f"/api/apps/{APP_ID}/auth/reset-password",
                json={"reset_token": "recovery-token", "new_password": "p" * 129},
            )
            missing_token = self.client.post(
                f"/api/apps/{APP_ID}/auth/reset-password",
                json={"reset_token": " ", "new_password": "correct horse battery"},
            )

        self.assertEqual(malformed.status_code, 400)
        self.assertEqual(short_password.status_code, 400)
        self.assertEqual(long_password.status_code, 400)
        self.assertEqual(missing_token.status_code, 400)
        auth_call.assert_not_called()

    def test_password_reset_completion_sends_valid_password_to_provider(self):
        with patch.object(server, "supabase_auth", return_value=(200, {})) as auth_call:
            response = self.client.post(
                f"/api/apps/{APP_ID}/auth/reset-password",
                json={
                    "reset_token": " recovery-token ",
                    "new_password": "correct horse battery",
                },
            )

        self.assertEqual(response.status_code, 200)
        auth_call.assert_called_once_with(
            "PUT",
            "/auth/v1/user",
            {"password": "correct horse battery"},
            token="recovery-token",
        )

    def test_password_reset_completion_rejects_malformed_provider_success(self):
        with patch.object(server, "supabase_auth", return_value=(200, ["unexpected"])):
            response = self.client.post(
                f"/api/apps/{APP_ID}/auth/reset-password",
                json={"reset_token": "recovery-token", "new_password": "correct horse battery"},
            )

        self.assertEqual(response.status_code, 503)
        self.assertIn("temporarily unavailable", response.get_json()["error"].lower())

    def test_password_reset_completion_keeps_provider_errors_distinct(self):
        with patch.object(server, "supabase_auth", return_value=(429, {"error": "rate limit"})):
            rate_limited = self.client.post(
                f"/api/apps/{APP_ID}/auth/reset-password",
                json={"reset_token": "recovery-token", "new_password": "correct horse battery"},
            )
        self.assertEqual(rate_limited.status_code, 429)
        self.assertIn("wait", rate_limited.get_json()["error"].lower())

        with patch.object(server, "supabase_auth", return_value=(503, {"error": "unavailable"})):
            unavailable = self.client.post(
                f"/api/apps/{APP_ID}/auth/reset-password",
                json={"reset_token": "recovery-token", "new_password": "correct horse battery"},
            )
        self.assertEqual(unavailable.status_code, 503)
        self.assertIn("temporarily unavailable", unavailable.get_json()["error"].lower())

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