import io
import unittest
from unittest.mock import patch

import server


APP_ID = server.APP_ID
USER_ID = "123e4567-e89b-42d3-a456-426614174000"
TOKEN = "supabase-user-access-token"
USER = {
    "id": USER_ID,
    "email": "athlete@example.test",
    "user_metadata": {"full_name": "Test Athlete"},
}


class FakeCursor:
    def __init__(self):
        self.rowcount = 0
        self.result = None
        self.update_params = None

    def execute(self, query, params=None):
        if query.strip().startswith("SELECT avatar_url"):
            self.result = None
        elif query.strip().startswith("UPDATE profiles SET avatar_url"):
            self.rowcount = 1
            self.update_params = params

    def fetchone(self):
        return self.result


class FakeConnection:
    def __init__(self):
        self.current_cursor = FakeCursor()
        self.closed = False

    def cursor(self, *args, **kwargs):
        return self.current_cursor

    def close(self):
        self.closed = True


class AvatarRouteTests(unittest.TestCase):
    def setUp(self):
        self.client = server.app.test_client()
        self.connection = FakeConnection()

    def test_upload_saves_private_object_path_to_profile_and_returns_signed_url(self):
        def storage_request(method, path, token, body=None, content_type=None):
            if "/object/sign/" in path:
                return 200, {"signedURL": "/object/sign/alefit-profile-avatars/signed-photo?token=mock"}
            return 200, {}

        image = io.BytesIO(b"\xff\xd8\xffvalid-jpeg-payload")
        with (
            patch.object(server, "get_current_user", return_value=(USER, TOKEN)),
            patch.object(server, "SUPABASE_URL", "https://project.example"),
            patch.object(server, "SUPABASE_KEY", "public-test-key"),
            patch.object(server, "get_db", return_value=self.connection),
            patch.object(server, "supabase_storage_request", side_effect=storage_request) as storage,
        ):
            response = self.client.post(
                f"/api/apps/{APP_ID}/auth/avatar",
                headers={"Authorization": f"Bearer {TOKEN}"},
                data={"file": (image, "profile.jpg")},
                content_type="multipart/form-data",
            )
        image.close()

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.get_json()["avatar_url"],
            "https://project.example/storage/v1/object/sign/alefit-profile-avatars/signed-photo?token=mock",
        )
        self.assertTrue(self.connection.current_cursor.update_params[0].startswith("storage://"))
        self.assertIn(f"/object/{server.AVATAR_BUCKET}/{USER_ID}/", storage.call_args_list[0].args[1])
        self.assertEqual(storage.call_args_list[0].args[2], TOKEN)

    def test_upload_rejects_unknown_image_content(self):
        image = io.BytesIO(b"not an image")
        with (
            patch.object(server, "get_current_user", return_value=(USER, TOKEN)),
            patch.object(server, "supabase_storage_request") as storage,
        ):
            response = self.client.post(
                f"/api/apps/{APP_ID}/auth/avatar",
                data={"file": (image, "profile.jpg")},
                content_type="multipart/form-data",
            )
        image.close()

        self.assertEqual(response.status_code, 415)
        storage.assert_not_called()

    def test_upload_rejects_files_over_two_megabytes(self):
        image = io.BytesIO(b"\xff\xd8\xff" + b"x" * (server.MAX_AVATAR_BYTES + 1))
        with (
            patch.object(server, "get_current_user", return_value=(USER, TOKEN)),
            patch.object(server, "supabase_storage_request") as storage,
        ):
            response = self.client.post(
                f"/api/apps/{APP_ID}/auth/avatar",
                data={"file": (image, "large.jpg")},
                content_type="multipart/form-data",
            )
        image.close()

        self.assertEqual(response.status_code, 413)
        storage.assert_not_called()

    def test_upload_requires_an_authenticated_user(self):
        with (
            patch.object(server, "get_current_user", return_value=(None, None)),
            patch.object(server, "supabase_storage_request") as storage,
        ):
            response = self.client.post(f"/api/apps/{APP_ID}/auth/avatar")

        self.assertEqual(response.status_code, 401)
        storage.assert_not_called()

    def test_local_fallback_requires_server_storage_credentials(self):
        local_user = {**USER, "_local": True}
        image = io.BytesIO(b"\xff\xd8\xffvalid-jpeg-payload")
        with (
            patch.object(server, "get_current_user", return_value=(local_user, "local.signed.token")),
            patch.object(server, "SUPABASE_SERVICE_KEY", ""),
            patch.object(server, "supabase_storage_request") as storage,
        ):
            response = self.client.post(
                f"/api/apps/{APP_ID}/auth/avatar",
                data={"file": (image, "profile.jpg")},
                content_type="multipart/form-data",
            )
        image.close()

        self.assertEqual(response.status_code, 503)
        self.assertIn("not enabled", response.get_json()["error"])
        storage.assert_not_called()

    def test_private_avatar_path_is_signed_for_the_authenticated_user(self):
        object_name = f"{USER_ID}/123e4567-e89b-42d3-a456-426614174001.webp"

        class ProfileCursor:
            def execute(self, query, params=None):
                self.params = params

            def fetchone(self):
                return {
                    "bio": "Runner",
                    "avatar_url": f"storage://{object_name}",
                    "daily_calorie_goal": 2000,
                }

        class ProfileConnection:
            def cursor(self, *args, **kwargs):
                return ProfileCursor()

            def close(self):
                pass

        with (
            patch.object(server, "get_db", return_value=ProfileConnection()),
            patch.object(server, "SUPABASE_URL", "https://project.example"),
            patch.object(
                server,
                "supabase_storage_request",
                return_value=(200, {"signedURL": "/object/sign/avatar/photo?token=mock"}),
            ) as storage,
        ):
            profile = server.get_profile_extras(USER_ID, TOKEN)

        self.assertEqual(profile["bio"], "Runner")
        self.assertEqual(
            profile["avatar_url"],
            "https://project.example/storage/v1/object/sign/avatar/photo?token=mock",
        )
        self.assertIn(f"/object/sign/{server.AVATAR_BUCKET}/{object_name}", storage.call_args.args[1])
        self.assertEqual(storage.call_args.args[2], TOKEN)


if __name__ == "__main__":
    unittest.main()
