from django.utils import timezone
from rest_framework import serializers

from ..models import Job


class JobSerializer(serializers.ModelSerializer):
    recruiter_name = serializers.CharField(source="recruiter.full_name", read_only=True)
    job_type_display = serializers.CharField(source="get_job_type_display", read_only=True)
    is_open = serializers.BooleanField(read_only=True)
    # child= is what makes the generated OpenAPI schema say string[] rather
    # than unknown[], so the frontend's generated types are usable.
    skills = serializers.ListField(
        source="extracted_skills", child=serializers.CharField(), read_only=True
    )
    application_count = serializers.SerializerMethodField()
    has_applied = serializers.SerializerMethodField()

    class Meta:
        model = Job
        fields = [
            "id",
            "job_title",
            "company_name",
            "location",
            "is_remote",
            "job_type",
            "job_type_display",
            "salary_min",
            "salary_max",
            "salary_currency",
            "job_description",
            "job_requirements",
            "skills",
            "posted_at",
            "updated_at",
            "expiry_time",
            "is_active",
            "is_open",
            "recruiter",
            "recruiter_name",
            "application_count",
            "has_applied",
        ]
        read_only_fields = ["id", "posted_at", "updated_at", "recruiter"]

    def get_application_count(self, obj) -> int:
        # The list queryset annotates this; create/update responses don't have
        # the annotation, and the field is non-optional in the API schema.
        annotated = getattr(obj, "application_count", None)
        return annotated if annotated is not None else obj.applications.count()

    def get_has_applied(self, obj) -> bool:
        applied_ids = self.context.get("applied_job_ids")
        if applied_ids is None:
            return False
        return obj.id in applied_ids

    def validate_expiry_time(self, value):
        if value and value <= timezone.now():
            raise serializers.ValidationError("Expiry must be in the future.")
        return value

    def validate(self, attrs):
        salary_min = attrs.get("salary_min", getattr(self.instance, "salary_min", None))
        salary_max = attrs.get("salary_max", getattr(self.instance, "salary_max", None))
        if salary_min is not None and salary_max is not None and salary_min > salary_max:
            raise serializers.ValidationError(
                {"salary_min": "Minimum salary cannot exceed the maximum."}
            )
        return attrs

    def create(self, validated_data):
        validated_data["recruiter"] = self.context["request"].user
        return super().create(validated_data)


class JobSummarySerializer(serializers.ModelSerializer):
    """Compact form used inside recommendations and application listings."""

    job_type_display = serializers.CharField(source="get_job_type_display", read_only=True)

    class Meta:
        model = Job
        fields = [
            "id",
            "job_title",
            "company_name",
            "location",
            "is_remote",
            "job_type",
            "job_type_display",
            "salary_min",
            "salary_max",
            "salary_currency",
            "posted_at",
            "expiry_time",
        ]
