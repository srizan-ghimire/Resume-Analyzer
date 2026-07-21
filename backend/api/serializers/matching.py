"""Serializers for the matching endpoints.

These describe plain dataclass output rather than models, so they exist mainly
to give drf-spectacular an accurate schema for the frontend's generated types.
"""

from rest_framework import serializers

from .jobs import JobSummarySerializer


class RecommendationSerializer(serializers.Serializer):
    job = JobSummarySerializer(read_only=True)
    score = serializers.FloatField(read_only=True)
    match_percentage = serializers.IntegerField(read_only=True)
    matched_skills = serializers.ListField(child=serializers.CharField(), read_only=True)
    missing_skills = serializers.ListField(child=serializers.CharField(), read_only=True)
    has_applied = serializers.BooleanField(read_only=True)


class AtsRequestSerializer(serializers.Serializer):
    job_description = serializers.CharField(
        min_length=50,
        max_length=50_000,
        help_text="Paste the full job description, including requirements.",
    )
    resume_id = serializers.IntegerField(
        required=False,
        help_text="Defaults to your primary resume.",
    )


class SkillGapSerializer(serializers.Serializer):
    skill = serializers.CharField()
    importance = serializers.FloatField()


class CheckSerializer(serializers.Serializer):
    id = serializers.CharField()
    label = serializers.CharField()
    passed = serializers.BooleanField()
    severity = serializers.ChoiceField(choices=["critical", "warning", "info"])
    detail = serializers.CharField()


class AtsReportSerializer(serializers.Serializer):
    score = serializers.IntegerField()
    verdict = serializers.CharField()
    keyword_score = serializers.IntegerField()
    quality_score = serializers.IntegerField()
    matched_skills = serializers.ListField(child=serializers.CharField())
    missing_skills = SkillGapSerializer(many=True)
    matched_education = serializers.ListField(child=serializers.CharField())
    required_years = serializers.IntegerField(allow_null=True)
    keyword_density = serializers.FloatField()
    word_count = serializers.IntegerField()
    checks = CheckSerializer(many=True)
    suggestions = serializers.ListField(child=serializers.CharField())
