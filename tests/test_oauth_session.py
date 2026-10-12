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
