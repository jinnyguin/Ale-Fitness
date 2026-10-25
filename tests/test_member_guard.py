import unittest

import server


class MemberGuardTests(unittest.TestCase):
    def test_protected_page_restores_http_only_session_before_redirecting(self):
        response = server.app.test_client().get("/account")

        self.assertEqual(response.status_code, 200)
        page = response.get_data(as_text=True)
        self.assertIn("window.AlefitSession.restore()", page)
        self.assertIn("window.AlefitSession.restore()", server.AUTH_GUARD_SCRIPT)
        self.assertIn("Checking your ALEFIT sign-in", page)
        self.assertIn("member-auth-error", page)
        self.assertNotIn(
            "var token = localStorage.getItem('base44_access_token')",
            page,
        )
        self.assertIn("/api/auth/session/logout", page)

