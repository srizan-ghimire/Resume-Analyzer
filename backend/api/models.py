from __future__ import annotations

from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.core.validators import FileExtensionValidator, MinLengthValidator
from django.db import models
from django.utils import timezone


class Role(models.TextChoices):
    SEEKER = "SEEKER", "Job seeker"
    RECRUITER = "RECRUITER", "Recruiter"


class CustomUser(AbstractUser):
    """Single user model for both audiences, distinguished by ``role``.

    Replaces the previous split between ``CustomUser`` and a stand-alone
    ``Recruiter`` model that was not an auth user at all.
    """

    username = models.CharField(max_length=50, unique=True)
    email = models.EmailField(max_length=254, unique=True)
    first_name = models.CharField(max_length=150, blank=True)
    last_name = models.CharField(max_length=150, blank=True)
    role = models.CharField(max_length=16, choices=Role.choices, default=Role.SEEKER)

    REQUIRED_FIELDS = ["email"]

    class Meta:
        verbose_name = "user"
        verbose_name_plural = "users"
        indexes = [models.Index(fields=["role"])]

    def __str__(self) -> str:
        return self.username

    @property
    def is_recruiter(self) -> bool:
        return self.role == Role.RECRUITER

    @property
    def is_seeker(self) -> bool:
        return self.role == Role.SEEKER

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}".strip() or self.username


class RecruiterProfile(models.Model):
    """Company details for a recruiter account."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="recruiter_profile",
    )
    company_name = models.CharField(max_length=120)
    company_website = models.URLField(blank=True)
    company_location = models.CharField(max_length=120, blank=True)
    about = models.TextField(blank=True)

    def __str__(self) -> str:
        return self.company_name


class Resume(models.Model):
    """An uploaded resume plus everything extracted from it.

    Parsing happens once, on upload. The previous implementation re-read and
    re-parsed the PDF on every recommendation and ATS request.
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="resumes"
    )
    file = models.FileField(
        upload_to="resumes/%Y/%m/",
        validators=[FileExtensionValidator(settings.RESUME_ALLOWED_EXTENSIONS)],
    )
    original_filename = models.CharField(max_length=255, blank=True)
    content_type = models.CharField(max_length=100, blank=True)
    size_bytes = models.PositiveIntegerField(default=0)

    parsed_text = models.TextField(blank=True)
    extracted_skills = models.JSONField(default=list, blank=True)
    extracted_education = models.JSONField(default=list, blank=True)
    parse_error = models.CharField(max_length=255, blank=True)
    parsed_at = models.DateTimeField(null=True, blank=True)

    is_primary = models.BooleanField(default=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-uploaded_at"]
        indexes = [models.Index(fields=["user", "-uploaded_at"])]

    def __str__(self) -> str:
        return f"{self.user.username}: {self.original_filename or self.file.name}"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if self.is_primary:
            # Exactly one primary resume per user.
            Resume.objects.filter(user=self.user).exclude(pk=self.pk).update(is_primary=False)

    @property
    def is_parsed(self) -> bool:
        return bool(self.parsed_text)


class JobQuerySet(models.QuerySet):
    def open(self):
        """Jobs a seeker can actually apply to."""
        return self.filter(is_active=True).filter(
            models.Q(expiry_time__isnull=True) | models.Q(expiry_time__gt=timezone.now())
        )


class Job(models.Model):
    class JobType(models.TextChoices):
        INTERN = "INTERN", "Internship"
        FULL_TIME = "FULL_TIME", "Full-Time"
        PART_TIME = "PART_TIME", "Part-Time"
        TEMPORARY = "TEMPORARY", "Temporary"
        CONTRACT = "CONTRACT", "Contract"

    recruiter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="posted_jobs",
        limit_choices_to={"role": Role.RECRUITER},
    )
    job_title = models.CharField(max_length=150, validators=[MinLengthValidator(2)])
    company_name = models.CharField(max_length=120)
    location = models.CharField(max_length=120)
    is_remote = models.BooleanField(default=False)
    job_type = models.CharField(
        max_length=16, choices=JobType.choices, default=JobType.FULL_TIME
    )

    salary_min = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    salary_max = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    salary_currency = models.CharField(max_length=3, default="USD")

    job_description = models.TextField()
    job_requirements = models.TextField(blank=True)

    # Denormalised for the matching engine; refreshed on every save.
    searchable_text = models.TextField(blank=True, editable=False)
    extracted_skills = models.JSONField(default=list, blank=True, editable=False)

    posted_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    expiry_time = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    objects = JobQuerySet.as_manager()

    class Meta:
        ordering = ["-posted_at"]
        indexes = [
            models.Index(fields=["is_active", "expiry_time"]),
            models.Index(fields=["-posted_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.job_title} at {self.company_name}"

    def save(self, *args, **kwargs):
        # Imported lazily: models is loaded before app registry population
        # completes, and the matching package touches settings-backed data files.
        from api.matching.skills import extract_skills

        self.searchable_text = self.build_searchable_text()
        self.extracted_skills = extract_skills(self.searchable_text)
        super().save(*args, **kwargs)

    @property
    def is_expired(self) -> bool:
        return bool(self.expiry_time and timezone.now() > self.expiry_time)

    @property
    def is_open(self) -> bool:
        return self.is_active and not self.is_expired

    def build_searchable_text(self) -> str:
        return " ".join(
            part
            for part in (
                self.job_title,
                self.company_name,
                self.job_description,
                self.job_requirements,
            )
            if part
        )


class Application(models.Model):
    """A seeker's application to a job.

    Replaces ``SavedJob``. The uniqueness constraint is what stops the
    double-apply the old endpoint allowed.
    """

    class Status(models.TextChoices):
        SUBMITTED = "SUBMITTED", "Submitted"
        IN_REVIEW = "IN_REVIEW", "In review"
        SHORTLISTED = "SHORTLISTED", "Shortlisted"
        REJECTED = "REJECTED", "Rejected"
        ACCEPTED = "ACCEPTED", "Accepted"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="applications"
    )
    job = models.ForeignKey(Job, on_delete=models.CASCADE, related_name="applications")
    resume = models.ForeignKey(
        Resume, on_delete=models.SET_NULL, null=True, blank=True, related_name="applications"
    )
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.SUBMITTED)
    cover_note = models.TextField(blank=True)

    # Snapshot of the match score at apply time, so recruiters see a stable
    # number even after the job description is edited.
    match_score = models.FloatField(null=True, blank=True)

    applied_at = models.DateTimeField(auto_now_add=True)
    status_changed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-applied_at"]
        verbose_name = "Job application"
        constraints = [
            models.UniqueConstraint(fields=["user", "job"], name="unique_application_per_job")
        ]
        indexes = [models.Index(fields=["job", "status"])]

    def __str__(self) -> str:
        return f"{self.user.username} -> {self.job.job_title} ({self.get_status_display()})"
