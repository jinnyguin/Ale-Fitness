import unittest
from unittest.mock import patch

import server


class CoachRouteTests(unittest.TestCase):
    def setUp(self):
        self.client = server.app.test_client()

    def test_coach_is_puter_only_and_never_calls_owner_billed_providers(self):
        with (
            patch.object(server, "require_auth", return_value=({"id": "member-1"}, "token", None)),
            patch.object(server, "OPENAI_API_KEY", "configured-for-test"),
            patch.object(server, "OPENROUTER_API_KEY", "configured-for-test"),
            patch.object(server, "_coach_completion") as completion,
            patch.object(server, "get_db") as get_db,
            patch.object(server.urllib.request, "urlopen") as urlopen,
        ):
            response = self.client.post(
                f"/api/apps/{server.APP_ID}/coach",
                json={"question": "Should I push the pace today?"},
            )

        self.assertEqual(response.status_code, 410)
        self.assertIn("uses Puter only", response.get_json()["error"])
        completion.assert_not_called()
        get_db.assert_not_called()
        urlopen.assert_not_called()

    def test_coach_requires_authentication(self):
        with (
            patch.object(server, "require_auth", return_value=(None, None, ({"error": "Unauthorized"}, 401))),
            patch.object(server, "get_db") as get_db,
        ):
            response = self.client.post(
                f"/api/apps/{server.APP_ID}/coach",
                json={"question": "What should I do?"},
            )

        self.assertEqual(response.status_code, 401)
        get_db.assert_not_called()

    def test_coach_requires_puter_after_authentication_even_without_provider_keys(self):
        with (
            patch.object(server, "require_auth", return_value=({"id": "member-1"}, "token", None)),
            patch.object(server, "OPENAI_API_KEY", ""),
            patch.object(server, "OPENROUTER_API_KEY", ""),
            patch.object(server, "get_db") as get_db,
        ):
            response = self.client.post(
                f"/api/apps/{server.APP_ID}/coach",
                json={"question": "What should I do?"},
            )

        self.assertEqual(response.status_code, 410)
        self.assertIn("uses Puter only", response.get_json()["error"])
        get_db.assert_not_called()

    def test_legacy_coach_route_never_loads_plan_or_calls_a_provider(self):
        with (
            patch.object(server, "require_auth", return_value=({"id": "member-1"}, "token", None)),
            patch.object(server, "OPENAI_API_KEY", "configured-for-test"),
            patch.object(server, "OPENROUTER_API_KEY", ""),
            patch.object(server, "get_db") as get_db,
            patch.object(server, "_coach_completion") as completion,
            patch.object(server.urllib.request, "urlopen") as urlopen,
        ):
            response = self.client.post(
                f"/api/apps/{server.APP_ID}/coach",
                json={"question": "What should I do?"},
            )

        self.assertEqual(response.status_code, 410)
        self.assertIn("uses Puter only", response.get_json()["error"])
        get_db.assert_not_called()
        completion.assert_not_called()
        urlopen.assert_not_called()


if __name__ == "__main__":
    unittest.main()
