import pytest
from django.urls import reverse

from api.models import CustomUser, RecruiterProfile, Role

pytestmark = pytest.mark.django_db

STRONG = "Str0ng-Passw0rd!"


class TestRegistration:
    def test_seeker_registration_returns_tokens(self, api):
        response = api.post(
            reverse("register"),
            {
                "username": "newseeker",
                "email": "new@example.com",
                "password": STRONG,
                "password_confirm": STRONG,
                "first_name": "New",
                "last_name": "Seeker",
            },
            format="json",
        )
        assert response.status_code == 201
        assert response.data["access"]
        assert response.data["refresh"]
        assert response.data["user"]["role"] == Role.SEEKER
        assert "password" not in response.data["user"]

    def test_recruiter_registration_creates_profile(self, api):
        response = api.post(
            reverse("register"),
            {
                "username": "newrecruiter",
                "email": "rec@example.com",
                "password": STRONG,
                "password_confirm": STRONG,
                "role": Role.RECRUITER,
                "company_name": "Widgets Inc",
            },
            format="json",
        )
        assert response.status_code == 201
        user = CustomUser.objects.get(username="newrecruiter")
        assert user.role == Role.RECRUITER
        assert RecruiterProfile.objects.get(user=user).company_name == "Widgets Inc"

    def test_recruiter_requires_company_name(self, api):
        response = api.post(
            reverse("register"),
            {
                "username": "nocompany",
                "email": "nc@example.com",
                "password": STRONG,
                "password_confirm": STRONG,
                "role": Role.RECRUITER,
            },
            format="json",
        )
        assert response.status_code == 400
        assert "company_name" in response.data["error"]["details"]

    def test_password_confirmation_must_match(self, api):
        response = api.post(
            reverse("register"),
            {
                "username": "mismatch",
                "email": "mm@example.com",
                "password": STRONG,
                "password_confirm": "something-else",
            },
            format="json",
        )
        assert response.status_code == 400

    def test_weak_password_rejected(self, api):
        response = api.post(
            reverse("register"),
            {
                "username": "weak",
                "email": "weak@example.com",
                "password": "12345",
                "password_confirm": "12345",
            },
            format="json",
        )
        assert response.status_code == 400
        assert "password" in response.data["error"]["details"]

    def test_duplicate_email_rejected(self, api, seeker):
        response = api.post(
            reverse("register"),
            {
                "username": "different",
                "email": seeker.email.upper(),
                "password": STRONG,
                "password_confirm": STRONG,
            },
            format="json",
        )
        assert response.status_code == 400

    def test_password_is_hashed(self, api):
        api.post(
            reverse("register"),
            {
                "username": "hashme",
                "email": "hash@example.com",
                "password": STRONG,
                "password_confirm": STRONG,
            },
            format="json",
        )
        user = CustomUser.objects.get(username="hashme")
        assert user.password != STRONG
        assert user.check_password(STRONG)


class TestLogin:
    def test_valid_credentials_return_tokens_and_user(self, api, seeker):
        response = api.post(
            reverse("login"), {"username": "seeker", "password": STRONG}, format="json"
        )
        assert response.status_code == 200
        assert response.data["access"]
        assert response.data["user"]["username"] == "seeker"
        assert response.data["user"]["role"] == Role.SEEKER

    def test_invalid_credentials_rejected(self, api, seeker):
        response = api.post(
            reverse("login"), {"username": "seeker", "password": "wrong"}, format="json"
        )
        assert response.status_code == 401

    def test_response_never_contains_a_password(self, api, seeker):
        """The old frontend stored the plaintext password because login leaked
        the password hash. Neither may ever appear again."""
        response = api.post(
            reverse("login"), {"username": "seeker", "password": STRONG}, format="json"
        )
        assert "password" not in str(response.data).lower().replace("password_", "")


class TestTokenLifecycle:
    def test_refresh_issues_a_new_access_token(self, api, seeker):
        login = api.post(
            reverse("login"), {"username": "seeker", "password": STRONG}, format="json"
        )
        response = api.post(
            reverse("token-refresh"), {"refresh": login.data["refresh"]}, format="json"
        )
        assert response.status_code == 200
        assert response.data["access"]

    def test_logout_blacklists_the_refresh_token(self, api, seeker):
        login = api.post(
            reverse("login"), {"username": "seeker", "password": STRONG}, format="json"
        )
        refresh = login.data["refresh"]
        api.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")

        assert api.post(reverse("logout"), {"refresh": refresh}, format="json").status_code == 205

        api.credentials()
        replay = api.post(reverse("token-refresh"), {"refresh": refresh}, format="json")
        assert replay.status_code == 401

    def test_garbage_token_is_rejected(self, api):
        api.credentials(HTTP_AUTHORIZATION="Bearer not-a-real-token")
        assert api.get(reverse("me")).status_code == 401


class TestMe:
    def test_requires_authentication(self, api):
        assert api.get(reverse("me")).status_code == 401

    def test_returns_current_user(self, seeker_client, seeker):
        response = seeker_client.get(reverse("me"))
        assert response.status_code == 200
        assert response.data["username"] == seeker.username

    def test_updates_profile(self, seeker_client):
        response = seeker_client.patch(
            reverse("me"), {"first_name": "Updated"}, format="json"
        )
        assert response.status_code == 200
        assert response.data["first_name"] == "Updated"

    def test_cannot_take_another_users_email(self, seeker_client, other_seeker):
        response = seeker_client.patch(
            reverse("me"), {"email": other_seeker.email}, format="json"
        )
        assert response.status_code == 400

    def test_role_cannot_be_escalated(self, seeker_client, seeker):
        seeker_client.patch(reverse("me"), {"role": Role.RECRUITER}, format="json")
        seeker.refresh_from_db()
        assert seeker.role == Role.SEEKER


class TestChangePassword:
    def test_changes_password(self, seeker_client, seeker):
        response = seeker_client.post(
            reverse("change-password"),
            {"current_password": STRONG, "new_password": "An0ther-Str0ng!"},
            format="json",
        )
        assert response.status_code == 204
        seeker.refresh_from_db()
        assert seeker.check_password("An0ther-Str0ng!")

    def test_wrong_current_password_rejected(self, seeker_client):
        response = seeker_client.post(
            reverse("change-password"),
            {"current_password": "nope", "new_password": "An0ther-Str0ng!"},
            format="json",
        )
        assert response.status_code == 400


class TestErrorEnvelope:
    def test_errors_share_one_shape(self, api):
        response = api.post(reverse("login"), {"username": "x"}, format="json")
        assert response.status_code == 400
        assert "error" in response.data
        assert {"code", "message"} <= set(response.data["error"])
