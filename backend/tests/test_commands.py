from decimal import Decimal
from io import StringIO

import pytest
from django.core.management import call_command
from django.utils import timezone

from api.management.commands.seed_jobs import parse_salary_range
from api.models import Application, CustomUser, Job, Role

pytestmark = pytest.mark.django_db


class TestParseSalaryRange:
    @pytest.mark.parametrize(
        "raw,expected",
        [
            ("$80,000 - $100,000", (Decimal(80000), Decimal(100000), "USD")),
            ("$90,000 - $120,000", (Decimal(90000), Decimal(120000), "USD")),
            ("80k - 100k", (Decimal(80000), Decimal(100000), "USD")),
            ("$75,000", (Decimal(75000), None, "USD")),
            ("", (None, None, "USD")),
            ("Negotiable", (None, None, "USD")),
        ],
    )
    def test_parses(self, raw, expected):
        assert parse_salary_range(raw) == expected

    def test_detects_currency(self):
        assert parse_salary_range("£50,000 - £70,000")[2] == "GBP"
        assert parse_salary_range("NPR 500000")[2] == "NPR"

    def test_orders_the_range(self):
        low, high, _ = parse_salary_range("$100,000 - $80,000")
        assert low < high


class TestSeedJobs:
    def test_creates_real_job_rows(self):
        call_command("seed_jobs", stdout=StringIO())
        assert Job.objects.count() == 50

    def test_creates_a_demo_recruiter(self):
        call_command("seed_jobs", stdout=StringIO())
        recruiter = CustomUser.objects.get(username="demo_recruiter")
        assert recruiter.role == Role.RECRUITER
        assert not recruiter.has_usable_password()

    def test_is_idempotent(self):
        call_command("seed_jobs", stdout=StringIO())
        call_command("seed_jobs", stdout=StringIO())
        assert Job.objects.count() == 50

    def test_seeded_jobs_are_open_and_scoreable(self):
        call_command("seed_jobs", stdout=StringIO())
        assert Job.objects.open().count() == 50
        assert all(job.extracted_skills for job in Job.objects.all()[:10])

    def test_seeded_jobs_produce_recommendations(self):
        from api.matching.scorer import recommend_jobs

        from .conftest import SEEKER_RESUME_TEXT

        call_command("seed_jobs", stdout=StringIO())
        results = recommend_jobs(SEEKER_RESUME_TEXT, limit=5)
        assert len(results) == 5
        assert results[0].score > 0

    def test_clear_removes_previous(self):
        call_command("seed_jobs", stdout=StringIO())
        call_command("seed_jobs", "--clear", stdout=StringIO())
        assert Job.objects.count() == 50


class TestDeactivateExpiredJobs:
    def test_closes_expired_jobs(self, expired_job, ds_job):
        call_command("deactivate_expired_jobs", stdout=StringIO())
        expired_job.refresh_from_db()
        ds_job.refresh_from_db()
        assert not expired_job.is_active
        assert ds_job.is_active

    def test_preserves_applications(self, expired_job, seeker):
        application = Application.objects.create(user=seeker, job=expired_job)
        call_command("deactivate_expired_jobs", stdout=StringIO())
        assert Application.objects.filter(pk=application.pk).exists()

    def test_dry_run_changes_nothing(self, expired_job):
        call_command("deactivate_expired_jobs", "--dry-run", stdout=StringIO())
        expired_job.refresh_from_db()
        assert expired_job.is_active

    def test_ignores_jobs_without_an_expiry(self, recruiter):
        job = Job.objects.create(
            recruiter=recruiter,
            job_title="Evergreen",
            company_name="Co",
            location="Remote",
            job_description="No expiry set.",
        )
        call_command("deactivate_expired_jobs", stdout=StringIO())
        job.refresh_from_db()
        assert job.is_active


class TestJobModel:
    def test_is_open_respects_expiry(self, recruiter):
        job = Job.objects.create(
            recruiter=recruiter,
            job_title="Role",
            company_name="Co",
            location="Remote",
            job_description="Python work.",
            expiry_time=timezone.now() + timezone.timedelta(days=1),
        )
        assert job.is_open
        Job.objects.filter(pk=job.pk).update(
            expiry_time=timezone.now() - timezone.timedelta(days=1)
        )
        job.refresh_from_db()
        assert job.is_expired
        assert not job.is_open

    def test_searchable_text_refreshes_on_save(self, ds_job):
        ds_job.job_title = "Rust Engineer"
        ds_job.save()
        assert "Rust Engineer" in ds_job.searchable_text
