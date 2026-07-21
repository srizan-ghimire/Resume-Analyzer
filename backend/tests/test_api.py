"""Endpoint behaviour: jobs, resumes, applications and matching."""

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from django.utils import timezone

from api.models import Application, Job, Resume

from .conftest import FRONTEND_RESUME_TEXT, make_pdf

pytestmark = pytest.mark.django_db


class TestJobListing:
    def test_lists_only_open_jobs(self, seeker_client, ds_job, expired_job):
        response = seeker_client.get(reverse("job-list"))
        ids = {row["id"] for row in response.data["results"]}
        assert ds_job.id in ids
        assert expired_job.id not in ids

    def test_expired_jobs_are_not_deleted(self, seeker_client, expired_job):
        """Listing used to delete every expired job as a side effect."""
        seeker_client.get(reverse("job-list"))
        assert Job.objects.filter(pk=expired_job.pk).exists()

    def test_search(self, seeker_client, ds_job, frontend_job):
        response = seeker_client.get(reverse("job-list"), {"search": "Frontend"})
        assert [row["id"] for row in response.data["results"]] == [frontend_job.id]

    def test_filter_by_job_type(self, seeker_client, ds_job):
        assert seeker_client.get(
            reverse("job-list"), {"job_type": "FULL_TIME"}
        ).data["count"] == 1
        assert seeker_client.get(
            reverse("job-list"), {"job_type": "INTERN"}
        ).data["count"] == 0

    def test_filter_by_remote(self, seeker_client, ds_job, frontend_job):
        response = seeker_client.get(reverse("job-list"), {"is_remote": "true"})
        assert [row["id"] for row in response.data["results"]] == [ds_job.id]

    def test_salary_filter(self, seeker_client, ds_job):
        assert seeker_client.get(
            reverse("job-list"), {"salary_min": 100000}
        ).data["count"] == 1
        assert seeker_client.get(
            reverse("job-list"), {"salary_min": 200000}
        ).data["count"] == 0

    def test_pagination(self, seeker_client, ds_job, frontend_job):
        response = seeker_client.get(reverse("job-list"), {"page_size": 1})
        assert response.data["count"] == 2
        assert len(response.data["results"]) == 1

    def test_has_applied_flag(self, seeker_client, ds_job, application):
        row = next(
            r for r in seeker_client.get(reverse("job-list")).data["results"]
            if r["id"] == ds_job.id
        )
        assert row["has_applied"] is True

    def test_mine_filter_returns_recruiters_own_including_closed(
        self, recruiter_client, ds_job, expired_job
    ):
        response = recruiter_client.get(reverse("job-list"), {"mine": "true"})
        ids = {row["id"] for row in response.data["results"]}
        assert {ds_job.id, expired_job.id} <= ids

    def test_skills_are_extracted_on_save(self, ds_job):
        assert "Python" in ds_job.extracted_skills
        assert "Machine Learning" in ds_job.extracted_skills


class TestJobValidation:
    def _post(self, client, **overrides):
        payload = {
            "job_title": "Role",
            "company_name": "Co",
            "location": "Remote",
            "job_description": "A description of the role.",
        } | overrides
        return client.post(reverse("job-list"), payload, format="json")

    def test_expiry_must_be_in_the_future(self, recruiter_client):
        past = (timezone.now() - timezone.timedelta(days=1)).isoformat()
        assert self._post(recruiter_client, expiry_time=past).status_code == 400

    def test_salary_range_must_be_ordered(self, recruiter_client):
        response = self._post(recruiter_client, salary_min=200000, salary_max=100000)
        assert response.status_code == 400

    def test_valid_salary_range_accepted(self, recruiter_client):
        response = self._post(recruiter_client, salary_min=100000, salary_max=200000)
        assert response.status_code == 201


class TestResumeUpload:
    def test_upload_parses_and_extracts(self, seeker_client, resume_upload):
        response = seeker_client.post(
            reverse("resume-upload"), {"file": resume_upload}, format="multipart"
        )
        assert response.status_code == 201
        assert response.data["is_parsed"]
        assert "Python" in response.data["extracted_skills"]
        assert response.data["skill_count"] > 5

    def test_parsing_happens_once_at_upload(self, seeker_client, resume_upload):
        seeker_client.post(
            reverse("resume-upload"), {"file": resume_upload}, format="multipart"
        )
        resume = Resume.objects.latest("uploaded_at")
        assert resume.parsed_text
        assert resume.parsed_at is not None

    def test_rejects_oversized_file(self, seeker_client, settings):
        settings.RESUME_MAX_BYTES = 1024
        # Incompressible bytes, so the file really is over the limit; a
        # generated PDF of repeated text compresses below it.
        big = SimpleUploadedFile("big.pdf", b"%PDF-1.4\n" + bytes(range(256)) * 20)
        response = seeker_client.post(
            reverse("resume-upload"), {"file": big}, format="multipart"
        )
        assert response.status_code == 400

    def test_rejects_unsupported_extension(self, seeker_client):
        bad = SimpleUploadedFile("resume.exe", b"MZ\x90\x00")
        response = seeker_client.post(
            reverse("resume-upload"), {"file": bad}, format="multipart"
        )
        assert response.status_code == 400

    def test_rejects_content_that_contradicts_the_extension(self, seeker_client):
        """A .pdf name does not make the bytes a PDF."""
        liar = SimpleUploadedFile("resume.pdf", b"PK\x03\x04 actually a zip")
        response = seeker_client.post(
            reverse("resume-upload"), {"file": liar}, format="multipart"
        )
        assert response.status_code == 400
        assert "docx" in str(response.data).lower()

    def test_rejects_empty_file(self, seeker_client):
        empty = SimpleUploadedFile("resume.pdf", b"")
        response = seeker_client.post(
            reverse("resume-upload"), {"file": empty}, format="multipart"
        )
        assert response.status_code == 400

    def test_unreadable_pdf_reports_422_not_silent_success(self, seeker_client):
        """The old flow accepted anything and left users with no explanation."""
        scanned = SimpleUploadedFile("scan.pdf", b"%PDF-1.4\nno text objects here\n")
        response = seeker_client.post(
            reverse("resume-upload"), {"file": scanned}, format="multipart"
        )
        assert response.status_code == 422
        assert response.data["parse_error"]

    def test_upload_supersedes_the_previous_primary(self, seeker_client, resume_pdf):
        for name in ("first.pdf", "second.pdf"):
            seeker_client.post(
                reverse("resume-upload"),
                {"file": SimpleUploadedFile(name, resume_pdf)},
                format="multipart",
            )
        primaries = Resume.objects.filter(is_primary=True)
        assert primaries.count() == 1
        assert primaries.first().original_filename == "second.pdf"

    def test_set_primary(self, seeker_client, resume_pdf):
        first = seeker_client.post(
            reverse("resume-upload"),
            {"file": SimpleUploadedFile("first.pdf", resume_pdf)},
            format="multipart",
        ).data
        seeker_client.post(
            reverse("resume-upload"),
            {"file": SimpleUploadedFile("second.pdf", resume_pdf)},
            format="multipart",
        )
        response = seeker_client.post(
            reverse("resume-set-primary", kwargs={"pk": first["id"]})
        )
        assert response.status_code == 200
        assert Resume.objects.get(pk=first["id"]).is_primary


class TestApplications:
    def test_apply(self, seeker_client, ds_job, seeker_resume):
        response = seeker_client.post(
            reverse("application-list"), {"job": ds_job.id}, format="json"
        )
        assert response.status_code == 201
        assert response.data["job"]["id"] == ds_job.id

    def test_apply_records_a_match_score(self, seeker_client, ds_job, seeker_resume):
        response = seeker_client.post(
            reverse("application-list"), {"job": ds_job.id}, format="json"
        )
        assert response.data["match_score"] is not None
        assert 0 <= response.data["match_score"] <= 1

    def test_duplicate_application_rejected(self, seeker_client, ds_job, application):
        response = seeker_client.post(
            reverse("application-list"), {"job": ds_job.id}, format="json"
        )
        assert response.status_code == 400
        assert Application.objects.filter(user=application.user, job=ds_job).count() == 1

    def test_cannot_apply_to_an_expired_job(self, seeker_client, expired_job, seeker_resume):
        response = seeker_client.post(
            reverse("application-list"), {"job": expired_job.id}, format="json"
        )
        assert response.status_code == 400

    def test_cannot_apply_to_an_inactive_job(self, seeker_client, ds_job, seeker_resume):
        ds_job.is_active = False
        ds_job.save()
        response = seeker_client.post(
            reverse("application-list"), {"job": ds_job.id}, format="json"
        )
        assert response.status_code == 400

    def test_apply_without_a_resume_still_works(self, seeker_client, ds_job):
        response = seeker_client.post(
            reverse("application-list"), {"job": ds_job.id}, format="json"
        )
        assert response.status_code == 201
        assert response.data["match_score"] is None

    def test_status_change_stamps_the_time(self, recruiter_client, application):
        before = application.status_changed_at
        recruiter_client.patch(
            reverse("application-detail", kwargs={"pk": application.pk}),
            {"status": "ACCEPTED"},
            format="json",
        )
        application.refresh_from_db()
        assert application.status_changed_at > before

    def test_recruiter_view_exposes_applicant_details(self, recruiter_client, application):
        row = recruiter_client.get(reverse("application-list")).data["results"][0]
        assert row["applicant_email"]
        assert row["resume_url"]
        assert "Python" in row["resume_skills"]


class TestRecommendations:
    def test_returns_ranked_real_jobs(
        self, seeker_client, seeker_resume, ds_job, frontend_job
    ):
        response = seeker_client.get(reverse("recommendations"))
        assert response.status_code == 200
        assert response.data["results"][0]["job"]["id"] == ds_job.id
        assert response.data["results"][0]["match_percentage"] > 0

    def test_includes_match_explanations(self, seeker_client, seeker_resume, ds_job):
        top = seeker_client.get(reverse("recommendations")).data["results"][0]
        assert top["matched_skills"]
        assert "matched_skills" in top and "missing_skills" in top

    def test_flags_jobs_already_applied_to(
        self, seeker_client, seeker_resume, ds_job, application
    ):
        top = next(
            r for r in seeker_client.get(reverse("recommendations")).data["results"]
            if r["job"]["id"] == ds_job.id
        )
        assert top["has_applied"] is True

    def test_requires_a_resume(self, seeker_client, ds_job):
        response = seeker_client.get(reverse("recommendations"))
        assert response.status_code == 400
        assert "resume" in str(response.data).lower()

    def test_respects_limit(self, seeker_client, seeker_resume, ds_job, frontend_job):
        response = seeker_client.get(reverse("recommendations"), {"limit": 1})
        assert len(response.data["results"]) == 1

    def test_no_jobs_returns_empty_not_error(self, seeker_client, seeker_resume):
        response = seeker_client.get(reverse("recommendations"))
        assert response.status_code == 200
        assert response.data["results"] == []

    def test_recommendations_come_from_the_database(
        self, seeker_client, seeker_resume, recruiter
    ):
        """Recommendations used to come from a static CSV that recruiters
        could never post to."""
        job = Job.objects.create(
            recruiter=recruiter,
            job_title="Brand New ML Role",
            company_name="Fresh Co",
            location="Remote",
            job_description="Python machine learning and SQL work.",
        )
        ids = {
            r["job"]["id"] for r in seeker_client.get(reverse("recommendations")).data["results"]
        }
        assert job.id in ids


class TestAtsReport:
    def test_returns_a_full_report(self, seeker_client, seeker_resume, ds_job):
        response = seeker_client.post(
            reverse("ats-report"),
            {"job_description": ds_job.job_description},
            format="json",
        )
        assert response.status_code == 200
        body = response.data
        assert 0 <= body["score"] <= 100
        assert body["verdict"]
        assert body["matched_skills"]
        assert body["checks"]
        assert body["suggestions"]

    def test_missing_skills_carry_importance(self, seeker_client, seeker, ds_job):
        Resume.objects.create(
            user=seeker,
            file=SimpleUploadedFile("fe.pdf", make_pdf(FRONTEND_RESUME_TEXT)),
            parsed_text=FRONTEND_RESUME_TEXT,
            is_primary=True,
        )
        response = seeker_client.post(
            reverse("ats-report"),
            {"job_description": ds_job.job_description},
            format="json",
        )
        gaps = response.data["missing_skills"]
        assert gaps
        assert all({"skill", "importance"} <= set(gap) for gap in gaps)

    def test_requires_a_resume(self, seeker_client):
        response = seeker_client.post(
            reverse("ats-report"), {"job_description": "x " * 60}, format="json"
        )
        assert response.status_code == 400

    def test_rejects_a_too_short_description(self, seeker_client, seeker_resume):
        response = seeker_client.post(
            reverse("ats-report"), {"job_description": "short"}, format="json"
        )
        assert response.status_code == 400

    def test_unparsed_resume_reports_why(self, seeker_client, seeker):
        Resume.objects.create(
            user=seeker,
            file=SimpleUploadedFile("bad.pdf", b"%PDF-1.4"),
            parsed_text="",
            parse_error="This PDF is password protected.",
            is_primary=True,
        )
        response = seeker_client.post(
            reverse("ats-report"), {"job_description": "x " * 60}, format="json"
        )
        assert response.status_code == 400
        assert "password protected" in str(response.data)


class TestHealth:
    def test_reports_ok(self, api):
        response = api.get(reverse("health"))
        assert response.status_code == 200
        assert response.data == {"status": "ok", "database": "ok"}
