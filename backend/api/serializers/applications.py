from django.utils import timezone
from rest_framework import serializers

from ..models import Application, Job, Resume
from .jobs import JobSummarySerializer


class ApplicationSerializer(serializers.ModelSerializer):
    """A seeker's view of their own application."""

    job = JobSummarySerializer(read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Application
        fields = [
            "id",
            "job",
            "status",
            "status_display",
            "cover_note",
            "match_score",
            "applied_at",
            "status_changed_at",
        ]
        read_only_fields = fields


class ApplicationCreateSerializer(serializers.ModelSerializer):
    job = serializers.PrimaryKeyRelatedField(queryset=Job.objects.all())

    class Meta:
        model = Application
        fields = ["job", "cover_note"]

    def validate_job(self, job: Job) -> Job:
        if not job.is_open:
            raise serializers.ValidationError("This job is no longer accepting applications.")
        user = self.context["request"].user
        if Application.objects.filter(user=user, job=job).exists():
            raise serializers.ValidationError("You have already applied to this job.")
        return job

    def create(self, validated_data):
        user = self.context["request"].user
        resume = Resume.objects.filter(user=user, is_primary=True).first()

        match_score = None
        if resume and resume.is_parsed:
            from ..matching.scorer import score_pair

            result = score_pair(
                resume.parsed_text,
                validated_data["job"].searchable_text,
                resume.extracted_skills or None,
            )
            match_score = round(result.score, 4)

        return Application.objects.create(
            user=user, resume=resume, match_score=match_score, **validated_data
        )


class ApplicantSerializer(serializers.ModelSerializer):
    """A recruiter's view of an application to one of their jobs."""

    applicant_name = serializers.CharField(source="user.full_name", read_only=True)
    applicant_username = serializers.CharField(source="user.username", read_only=True)
    applicant_email = serializers.EmailField(source="user.email", read_only=True)
    job_title = serializers.CharField(source="job.job_title", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    resume_url = serializers.SerializerMethodField()
    resume_skills = serializers.SerializerMethodField()

    class Meta:
        model = Application
        fields = [
            "id",
            "job",
            "job_title",
            "applicant_name",
            "applicant_username",
            "applicant_email",
            "status",
            "status_display",
            "cover_note",
            "match_score",
            "resume_url",
            "resume_skills",
            "applied_at",
            "status_changed_at",
        ]
        read_only_fields = [f for f in fields if f != "status"]

    def get_resume_url(self, obj) -> str | None:
        if not obj.resume_id:
            return None
        request = self.context.get("request")
        path = f"/api/v1/resumes/{obj.resume_id}/download/"
        return request.build_absolute_uri(path) if request else path

    def get_resume_skills(self, obj) -> list[str]:
        return (obj.resume.extracted_skills or []) if obj.resume_id else []

    def update(self, instance, validated_data):
        if "status" in validated_data and validated_data["status"] != instance.status:
            instance.status_changed_at = timezone.now()
        return super().update(instance, validated_data)
