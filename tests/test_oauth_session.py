import unittest
from unittest.mock import patch
import server


class OAuthSessionTests(unittest.TestCase):
    def setUp(self):
        self.client = server.app.test_client()

    def test_pkce_exchange_preserves_provider_identity(self):
        data = {"access_token": "test-access", "refresh_token": "test-refresh",
                "user": {"id": "existing-provider-id", "email": "test@example.test"}}
        with patch.object(server, "supabase_auth", return_value=(200, data)) as auth, \
                patch.object(server, "ensure_profile") as profile:
            response = self.client.post("/api/oauth/session", json={
                "code": "one-time-code", "code_verifier": "a" * 64})
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.headers["Cache-Control"], "no-store")
            self.assertIn("grant_type=pkce", auth.call_args.args[1])
            profile.assert_called_once_with("existing-provider-id", "test@example.test", "")

    def test_refresh_preserves_identity(self):
        data = {"access_token": "new", "refresh_token": "rotated", "user": {"id": "same-id"}}
        with patch.object(server, "supabase_auth", return_value=(200, data)) as auth, \
                patch.object(server, "ensure_profile"):
            response = self.client.post("/api/oauth/session", json={"refresh_token": "old"})
            self.assertEqual(response.status_code, 200)
            self.assertIn("grant_type=refresh_token", auth.call_args.args[1])
            self.assertNotIn("refresh_token", response.get_json())
            cookie = response.headers["Set-Cookie"]
            self.assertIn("HttpOnly", cookie)
            self.assertIn("SameSite=Lax", cookie)

    def test_refresh_cookie_is_shared_by_alefit_domains_and_is_secure(self):
        data = {"access_token": "new", "refresh_token": "rotated", "user": {"id": "same-id"}}
        with patch.object(server, "supabase_auth", return_value=(200, data)), \
                patch.object(server, "ensure_profile"):
            response = self.client.post(
                "/api/oauth/session",
                json={"refresh_token": "old"},
                base_url="https://www.alefit.org",
            )
        cookie = response.headers["Set-Cookie"]
        self.assertIn("Domain=alefit.org", cookie)
        self.assertIn("Secure", cookie)
        self.assertIn("HttpOnly", cookie)

    def test_restore_endpoint_rotates_cookie_and_returns_verified_identity(self):
        data = {
            "access_token": "restored-access",
            "refresh_token": "rotated-refresh",
            "user": {"id": "same-id", "email": "member@example.test"},
        }
        with patch.object(server, "supabase_auth", return_value=(200, data)) as auth, \
                patch.object(server, "ensure_profile") as profile:
            self.client.set_cookie(
                domain="alefit.org",
                origin_only=False,
                key=server.AUTH_REFRESH_COOKIE,
                value="previous-refresh",
            )
            response = self.client.post(
                "/api/auth/session/restore",
                json={},
                base_url="https://www.alefit.org",
            )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["user"]["id"], "same-id")
        self.assertEqual(response.get_json()["access_token"], "restored-access")
        self.assertNotIn("refresh_token", response.get_json())
        self.assertIn("Domain=alefit.org", response.headers["Set-Cookie"])
        self.assertIn("grant_type=refresh_token", auth.call_args.args[1])
        profile.assert_called_once_with("same-id", "member@example.test", "")

    def test_restore_clears_revoked_refresh_cookie_without_claiming_login(self):
        with patch.object(server, "supabase_auth", return_value=(400, {})):
            response = self.client.post(
                "/api/auth/session/restore",
                json={"refresh_token": "revoked"},
                base_url="https://www.alefit.org",
            )
        self.assertEqual(response.status_code, 401)
        self.assertIn("Max-Age=0", response.headers["Set-Cookie"])

    def test_logout_clears_shared_cookie_and_revokes_provider_session(self):
        with patch.object(server, "supabase_auth", return_value=(204, {})) as auth:
            response = self.client.post(
                "/api/auth/session/logout",
                base_url="https://www.alefit.org",
                headers={"Authorization": "Bearer current-access"},
            )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.get_json()["ok"])
        self.assertIn("/auth/v1/logout", auth.call_args.args[1])
        self.assertIn("Domain=alefit.org", response.headers["Set-Cookie"])
        self.assertIn("Max-Age=0", response.headers["Set-Cookie"])

    def test_missing_verifier_never_calls_provider(self):
        with patch.object(server, "supabase_auth") as auth:
            self.assertEqual(self.client.post("/api/oauth/session", json={"code": "x"}).status_code, 400)
            auth.assert_not_called()

    def test_exact_preview_hostname_external_port_is_allowed(self):
        with patch.object(server, "SUPABASE_URL", "https://provider.example"), \
                patch.object(server, "SUPABASE_KEY", "test-key"), \
                patch.object(server, "supabase_auth", return_value=(200, {"external":{"google":True}})):
            response = self.client.get("/api/oauth/authorize", base_url="https://app.replit.dev",
                query_string={"provider":"google", "redirect_to":"https://app.replit.dev:5000/auth/callback",
                              "code_challenge":"a" * 43})
            self.assertEqual(response.status_code, 200)
            self.assertIn("code_challenge_method=s256", response.get_json()["url"])
            for invalid in ["https://other.replit.dev:5000/auth/callback",
                            "https://app.replit.dev:6000/auth/callback",
                            "https://user@app.replit.dev:5000/auth/callback"]:
                self.assertEqual(self.client.get("/api/oauth/authorize", base_url="https://app.replit.dev",
                    query_string={"provider":"google", "redirect_to":invalid}).status_code, 400)

    def test_outage_and_rejection_are_distinct(self):
        for provider_status, expected in [(503, 503), (400, 401), (429, 429)]:
            with patch.object(server, "supabase_auth", return_value=(provider_status, {})):
                self.assertEqual(self.client.post("/api/oauth/session",
                    json={"refresh_token": "old"}).status_code, expected)

    def test_incomplete_provider_session_is_rejected(self):
        with patch.object(server, "supabase_auth", return_value=(200, {"access_token": "x"})):
            self.assertEqual(self.client.post("/api/oauth/session",
                json={"refresh_token": "old"}).status_code, 503)
