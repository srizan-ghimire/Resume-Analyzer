"""Keep the matching engine's cached job corpus in step with the Job table."""

from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from .matching.scorer import invalidate_corpus_cache
from .models import Job


@receiver(post_save, sender=Job)
@receiver(post_delete, sender=Job)
def refresh_job_corpus(sender, **kwargs) -> None:
    invalidate_corpus_cache()
