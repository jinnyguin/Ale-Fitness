import json
import unittest
from datetime import datetime, timezone
from unittest.mock import patch

import server


class CoachRouteTests(unittest.TestCase):
    def setUp(self):
        self.client = server.app.test_client()
        self.created = datetime(2026, 10, 21, tzinfo=timezone.utc)
        self.plan_record = {
            "id": "plan-1",
            "entity_type": "OnboardingPlan",
            "data": {
                "preferences": {"sport": "running"},
                "generated_plan": {
                    "name": "Build to 10K",
                    "focus": "running",
                    "summary": "Build easy volume before introducing threshold work.",
                    "currentWeek": 2,
                    "progression": "Keep easy efforts conversational.",
                    "recovery": "Take recovery days easy.",
                    "schedule": [{"day": "Tuesday", "type": "run"}],
                    "profile": {
                        "sport": "running",
                        "runDistance": "10K",
                        "experience": "new",
                        "age": "adult",
                        "equipment": ["shoes"],
                    },
                    "weeks": [{
                        "week": 2,
                        "phaseLabel": "Foundation",
                        "rationale": "Build consistency with easy work.",
                        "sessions": [{
                            "id": "easy-run-2",
                            "day": "Tuesday",
                            "name": "Easy run",
                            "minutes": 25,
                            "reason": "Build an aerobic base.",
                            "exercises": [{"name": "Conversational run", "duration": "25 min"}],
                        }],
                    }],
                },
            },
            "created_at": self.created,
        }

    def _connection(self, rows):
        class Cursor:
            def __init__(self):
                self.query = ""
                self.params = None

            def execute(self, query, params):
                self.query = query
                self.params = params

            def fetchall(self):
                return rows

        class Connection:
            def __init__(self):
                self.cursor_instance = Cursor()
                self.closed = False

            def cursor(self, **kwargs):
                return self.cursor_instance

            def close(self):
                self.closed = True

        return Connection()

    def test_coach_uses_saved_plan_history_and_returns_live_model_answer(self):
        feedback = {
            "status": "completed",
            "difficulty": "too-hard",
            "completed_movements": 1,
            "notes": "Felt unusually tired.",
        }
        rows = [
            self.plan_record,
            {
                "id": "log-1",
                "entity_type": "WorkoutLog",
                "data": {
                    "feedback": feedback,
                    "session_snapshot": {"name": "Easy run"},
                },
                "created_at": self.created,
            },
            {
                "id": "readiness-1",
                "entity_type": "ReadinessCheck",
                "data": {"energy": "low", "soreness": "moderate", "pain": False},
                "created_at": self.created,
            },
        ]
        connection = self._connection(rows)
        provider_response = {
            "choices": [{"message": {"content": "Keep the run easy and conversational today."}}]
        }

        class FakeResponse:
            def __enter__(self):
                return self

            def __exit__(self, *args):
                return False

            def read(self):
                return json.dumps(provider_response).encode()

        with (
            patch.object(server, "require_auth", return_value=({"id": "member-1"}, "token", None)),
            patch.object(server, "get_db", return_value=connection),
            patch.object(server, "OPENAI_API_KEY", "configured-for-test"),
            patch.object(server, "OPENROUTER_API_KEY", ""),
            patch.object(server.urllib.request, "urlopen", return_value=FakeResponse()) as urlopen,
        ):
            response = self.client.post(
                f"/api/apps/{server.APP_ID}/coach",
                json={
                    "question": "Should I push the pace today?",
                    "session_id": "easy-run-2",
                    "local_day": "Tuesday",
                    "history": [{"role": "user", "content": "I felt tired yesterday."}],
                },
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["result"], "Keep the run easy and conversational today.")
        self.assertTrue(connection.closed)
        urlopen.assert_called_once()
        model_request = json.loads(urlopen.call_args.args[0].data)
        messages = model_request["messages"]
        self.assertEqual(model_request["model"], "gpt-4o-mini")
        self.assertIn('"sport": "running"', messages[0]["content"])
        self.assertIn("easy-run-2", messages[0]["content"])
        self.assertIn("Felt unusually tired.", messages[0]["content"])
        self.assertEqual(messages[1]["content"], "I felt tired yesterday.")
        self.assertEqual(messages[-1]["content"], "Should I push the pace today?")

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

    def test_coach_returns_clear_unavailable_error_instead_of_fake_advice(self):
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

        self.assertEqual(response.status_code, 503)
        self.assertIn("temporarily unavailable", response.get_json()["error"])
        get_db.assert_not_called()

    def test_coach_requires_a_saved_plan(self):
        connection = self._connection([])
        with (
            patch.object(server, "require_auth", return_value=({"id": "member-1"}, "token", None)),
            patch.object(server, "OPENAI_API_KEY", "configured-for-test"),
            patch.object(server, "OPENROUTER_API_KEY", ""),
            patch.object(server, "get_db", return_value=connection),
            patch.object(server.urllib.request, "urlopen") as urlopen,
        ):
            response = self.client.post(
                f"/api/apps/{server.APP_ID}/coach",
                json={"question": "What should I do?"},
            )

        self.assertEqual(response.status_code, 409)
        self.assertIn("Save your personalized plan", response.get_json()["error"])
        urlopen.assert_not_called()


if __name__ == "__main__":
    unittest.main()
