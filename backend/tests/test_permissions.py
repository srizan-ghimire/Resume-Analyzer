"""Cross-account authorisation.

The old API defaulted to AllowAny and identified recruiters by username string
match, so most of these scenarios were wide open. They are the reason this
file exists.
"""

import pytest
from django.urls import reverse

from api.models import Application

pytestmark = pytest.mark.django_db


class TestAnonymousAccess:
    @pytest.mark.parametrize(
        "url_name",
        ["application-list", "resume-list", "recommendations", "me"],
    )
    def test_personal_endpoints_require_authentication(self, api, url_name):
        assert api.get(reverse(url_name)).status_code == 401

    def test_health_is_public(self, api):
        assert api.get(reverse("health")).status_code == 200

    def test_job_browsing_is_public(self, api, ds_job):
        """Visitors can see open roles before signing up."""
        response = api.get(reverse("job-list"))
        assert response.status_code == 200
        assert response.data["count"] == 1

    def test_anonymous_job_listing_leaks_nothing_personal(self, api, ds_job, application):
        job = api.get(reverse("job-list")).data["results"][0]
        assert job["has_applied"] is False
        assert "recruiter_email" not in job

    def test_anonymous_cannot_post_a_job(self, api):
        response = api.post(reverse("job-list"), {"job_title": "x"}, format="json")
        assert response.status_code in {401, 403}


class TestJobWritePermissions:
    def _payload(self):
        return {
            "job_title": "New Role",
            "company_name": "Some Co",
            "location": "Remote",
            "job_description": "We need someone who writes Python.",
        }

    def test_seeker_cannot_post_a_job(self, seeker_client):
        response = seeker_client.post(reverse("job-list"), self._payload(), format="json")
        assert response.status_code == 403

    def test_recruiter_can_post_a_job(self, recruiter_client):
        response = recruiter_client.post(reverse("job-list"), self._payload(), format="json")
        assert response.status_code == 201

    def test_job_is_attributed_to_the_poster(self, recruiter_client, recruiter):
        response = recruiter_client.post(reverse("job-list"), self._payload(), format="json")
        assert response.data["recruiter"] == recruiter.id

    def test_recruiter_cannot_spoof_the_owner(self, recruiter_client, recruiter, other_recruiter):
        payload = self._payload() | {"recruiter": other_recruiter.id}
        response = recruiter_client.post(reverse("job-list"), payload, format="json")
        assert response.data["recruiter"] == recruiter.id

    def test_recruiter_cannot_edit_another_recruiters_job(
        self, api, other_recruiter, ds_job
    ):
        from .conftest import authenticate

        client = authenticate(api, other_recruiter)
        response = client.patch(
            reverse("job-detail", kwargs={"pk": ds_job.pk}),
            {"job_title": "Hijacked"},
            format="json",
        )
        assert response.status_code == 403
        ds_job.refresh_from_db()
        assert ds_job.job_title != "Hijacked"

    def test_recruiter_can_edit_their_own_job(self, recruiter_client, ds_job):
        response = recruiter_client.patch(
            reverse("job-detail", kwargs={"pk": ds_job.pk}),
            {"job_title": "Staff Data Scientist"},
            format="json",
        )
        assert response.status_code == 200

    def test_delete_closes_rather_than_destroys(self, recruiter_client, ds_job, application):
        response = recruiter_client.delete(reverse("job-detail", kwargs={"pk": ds_job.pk}))
        assert response.status_code == 204
        ds_job.refresh_from_db()
        assert not ds_job.is_active
        # Applicant history survives; the old expiry sweep deleted it.
        assert Application.objects.filter(pk=application.pk).exists()


class TestApplicantVisibility:
    def test_recruiter_sees_applicants_for_their_job(
        self, recruiter_client, ds_job, application
    ):
        response = recruiter_client.get(
            reverse("job-applicants", kwargs={"pk": ds_job.pk})
        )
        assert response.status_code == 200
        assert response.data["count"] == 1

    def test_other_recruiter_is_denied(self, api, other_recruiter, ds_job, application):
        from .conftest import authenticate

        client = authenticate(api, other_recruiter)
        response = client.get(reverse("job-applicants", kwargs={"pk": ds_job.pk}))
        assert response.status_code == 403

    def test_seeker_cannot_list_applicants(self, seeker_client, ds_job, application):
        response = seeker_client.get(reverse("job-applicants", kwargs={"pk": ds_job.pk}))
        assert response.status_code == 403


class TestApplicationScoping:
    def test_seeker_sees_only_their_own(
        self, seeker_client, other_seeker, ds_job, application, seeker_resume
    ):
        Application.objects.create(user=other_seeker, job=ds_job)
        response = seeker_client.get(reverse("application-list"))
        assert response.data["count"] == 1
        assert response.data["results"][0]["id"] == application.id

    def test_recruiter_sees_applications_to_their_jobs(
        self, recruiter_client, application
    ):
        response = recruiter_client.get(reverse("application-list"))
        assert response.data["count"] == 1

    def test_recruiter_does_not_see_other_recruiters_applications(
        self, api, other_recruiter, application
    ):
        from .conftest import authenticate

        client = authenticate(api, other_recruiter)
        assert client.get(reverse("application-list")).data["count"] == 0

    def test_seeker_cannot_change_status(self, seeker_client, application):
        response = seeker_client.patch(
            reverse("application-detail", kwargs={"pk": application.pk}),
            {"status": "ACCEPTED"},
            format="json",
        )
        assert response.status_code == 403
        application.refresh_from_db()
        assert application.status == Application.Status.SUBMITTED

    def test_owning_recruiter_can_change_status(self, recruiter_client, application):
        response = recruiter_client.patch(
            reverse("application-detail", kwargs={"pk": application.pk}),
            {"status": "SHORTLISTED"},
            format="json",
        )
        assert response.status_code == 200
        application.refresh_from_db()
        assert application.status == Application.Status.SHORTLISTED

    def test_other_recruiter_cannot_change_status(self, api, other_recruiter, application):
        from .conftest import authenticate

        client = authenticate(api, other_recruiter)
        response = client.patch(
            reverse("application-detail", kwargs={"pk": application.pk}),
            {"status": "ACCEPTED"},
            format="json",
        )
        assert response.status_code in {403, 404}
        application.refresh_from_db()
        assert application.status == Application.Status.SUBMITTED


class TestResumePrivacy:
    def test_seeker_lists_only_their_own_resumes(
        self, seeker_client, other_seeker, seeker_resume
    ):
        from django.core.files.uploadedfile import SimpleUploadedFile

        from api.models import Resume

        Resume.objects.create(
            user=other_seeker,
            file=SimpleUploadedFile("other.pdf", b"%PDF-1.4 other"),
            parsed_text="unrelated",
        )
        response = seeker_client.get(reverse("resume-list"))
        assert response.data["count"] == 1

    def test_owner_can_download(self, seeker_client, seeker_resume):
        response = seeker_client.get(
            reverse("resume-download", kwargs={"pk": seeker_resume.pk})
        )
        assert response.status_code == 200

    def test_stranger_cannot_download(self, api, other_seeker, seeker_resume):
        from .conftest import authenticate

        client = authenticate(api, other_seeker)
        response = client.get(reverse("resume-download", kwargs={"pk": seeker_resume.pk}))
        assert response.status_code == 403

    def test_recruiter_with_an_application_can_download(
        self, recruiter_client, seeker_resume, application
    ):
        response = recruiter_client.get(
            reverse("resume-download", kwargs={"pk": seeker_resume.pk})
        )
        assert response.status_code == 200

    def test_recruiter_without_an_application_cannot_download(
        self, api, other_recruiter, seeker_resume
    ):
        from .conftest import authenticate

        client = authenticate(api, other_recruiter)
        response = client.get(reverse("resume-download", kwargs={"pk": seeker_resume.pk}))
        assert response.status_code == 403


class TestMatchingPermissions:
    def test_recruiter_cannot_request_recommendations(self, recruiter_client):
        assert recruiter_client.get(reverse("recommendations")).status_code == 403

    def test_recruiter_cannot_request_an_ats_report(self, recruiter_client):
        response = recruiter_client.post(
            reverse("ats-report"), {"job_description": "x" * 60}, format="json"
        )
        assert response.status_code == 403
