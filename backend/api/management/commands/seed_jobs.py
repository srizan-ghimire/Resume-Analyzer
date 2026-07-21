"""Import the bundled sample jobs as real Job rows.

The recommendation engine used to score resumes against these CSV rows directly,
which meant recommendations could never include a job an actual recruiter had
posted. They are now seed data like any other.
"""

from __future__ import annotations

import csv
import re
from decimal import Decimal, InvalidOperation
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from api.models import CustomUser, Job, RecruiterProfile, Role

SEED_CSV = Path(settings.BASE_DIR) / "api" / "data" / "seed_jobs.csv"

JOB_TYPE_MAP = {
    "full-time": Job.JobType.FULL_TIME,
    "fulltime": Job.JobType.FULL_TIME,
    "part-time": Job.JobType.PART_TIME,
    "parttime": Job.JobType.PART_TIME,
    "intern": Job.JobType.INTERN,
    "internship": Job.JobType.INTERN,
    "contract": Job.JobType.CONTRACT,
    "temporary": Job.JobType.TEMPORARY,
}

_MONEY_RE = re.compile(r"([\d,]+(?:\.\d+)?)\s*([kK])?")


def parse_salary_range(raw: str) -> tuple[Decimal | None, Decimal | None, str]:
    """"$80,000 - $100,000" -> (80000, 100000, "USD")."""
    if not raw:
        return None, None, "USD"

    currency = "USD"
    for symbol, code in (("$", "USD"), ("£", "GBP"), ("€", "EUR"), ("₹", "INR")):
        if symbol in raw:
            currency = code
            break
    if "NPR" in raw.upper():
        currency = "NPR"

    values: list[Decimal] = []
    for match in _MONEY_RE.finditer(raw):
        try:
            amount = Decimal(match.group(1).replace(",", ""))
        except InvalidOperation:
            continue
        if match.group(2):  # "80k"
            amount *= 1000
        if amount > 0:
            values.append(amount)

    if not values:
        return None, None, currency
    if len(values) == 1:
        return values[0], None, currency
    return min(values), max(values), currency


class Command(BaseCommand):
    help = "Create demo job postings from api/data/seed_jobs.csv."

    def add_arguments(self, parser):
        parser.add_argument(
            "--recruiter",
            default="demo_recruiter",
            help="Username of the recruiter to attribute seeded jobs to.",
        )
        parser.add_argument(
            "--expires-in-days", type=int, default=90, help="Job expiry window."
        )
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Delete this recruiter's existing jobs before seeding.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        if not SEED_CSV.exists():
            raise CommandError(f"Seed file not found: {SEED_CSV}")

        recruiter, created = CustomUser.objects.get_or_create(
            username=options["recruiter"],
            defaults={
                "email": f"{options['recruiter']}@example.com",
                "role": Role.RECRUITER,
                "first_name": "Demo",
                "last_name": "Recruiter",
            },
        )
        if created:
            recruiter.set_unusable_password()
            recruiter.save(update_fields=["password"])
            RecruiterProfile.objects.get_or_create(
                user=recruiter, defaults={"company_name": "Resumatch Demo"}
            )
            self.stdout.write(f"Created recruiter '{recruiter.username}'.")

        if options["clear"]:
            deleted, _ = Job.objects.filter(recruiter=recruiter).delete()
            self.stdout.write(f"Removed {deleted} existing seeded object(s).")

        expiry = timezone.now() + timezone.timedelta(days=options["expires_in_days"])

        created_count = updated_count = 0
        with SEED_CSV.open(encoding="utf-8", newline="") as fh:
            for row in csv.DictReader(fh):
                title = (row.get("Job Title") or "").strip()
                company = (row.get("Company") or "").strip()
                if not title or not company:
                    continue

                salary_min, salary_max, currency = parse_salary_range(
                    row.get("Salary Range") or ""
                )
                work_type = (row.get("Work Type") or "").strip().lower()

                # The seed file splits the posting across a prose description
                # and structured skill/qualification columns; the matcher wants
                # all of it.
                description = (row.get("Job Description") or "").strip()
                requirements = " ".join(
                    part
                    for part in (
                        (row.get("skills") or "").strip(),
                        (row.get("qualifications") or "").strip(),
                    )
                    if part
                )

                _, was_created = Job.objects.update_or_create(
                    recruiter=recruiter,
                    job_title=title,
                    company_name=company,
                    defaults={
                        "location": (row.get("location") or "").strip(),
                        "job_type": JOB_TYPE_MAP.get(work_type, Job.JobType.FULL_TIME),
                        "salary_min": salary_min,
                        "salary_max": salary_max,
                        "salary_currency": currency,
                        "job_description": description,
                        "job_requirements": requirements,
                        "expiry_time": expiry,
                        "is_active": True,
                    },
                )
                created_count += was_created
                updated_count += not was_created

        self.stdout.write(
            self.style.SUCCESS(
                f"Seeded {created_count} new and refreshed {updated_count} existing job(s)."
            )
        )
