"""Close jobs whose expiry has passed.

Replaces the old behaviour where ``GET /job/`` permanently deleted every expired
job as a side effect of listing them -- which also destroyed the applications
attached to those jobs. Deactivating preserves applicant history.

Run from the platform scheduler (Render cron, Railway cron, or plain crontab).
"""

from django.core.management.base import BaseCommand
from django.utils import timezone

from api.models import Job


class Command(BaseCommand):
    help = "Mark expired jobs inactive."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Report what would change without writing.",
        )

    def handle(self, *args, **options):
        expired = Job.objects.filter(is_active=True, expiry_time__lte=timezone.now())
        count = expired.count()

        if options["dry_run"]:
            for job in expired[:50]:
                self.stdout.write(f"would close: {job.job_title} at {job.company_name}")
            self.stdout.write(f"{count} job(s) would be closed.")
            return

        expired.update(is_active=False)
        if count:
            # .update() bypasses signals, so nudge the matching cache directly.
            from api.matching.scorer import invalidate_corpus_cache

            invalidate_corpus_cache()
        self.stdout.write(self.style.SUCCESS(f"Closed {count} expired job(s)."))
