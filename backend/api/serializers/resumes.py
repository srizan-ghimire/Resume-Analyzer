from django.conf import settings
from rest_framework import serializers

from ..matching.parser import DocumentParseError, sniff_format
from ..models import Resume


class ResumeSerializer(serializers.ModelSerializer):
    download_url = serializers.SerializerMethodField()
    skill_count = serializers.SerializerMethodField()
    # Declared explicitly: a bare JSONField schema-generates as `unknown`.
    extracted_skills = serializers.ListField(child=serializers.CharField(), read_only=True)
    extracted_education = serializers.ListField(
        child=serializers.CharField(), read_only=True
    )

    class Meta:
        model = Resume
        fields = [
            "id",
            "original_filename",
            "content_type",
            "size_bytes",
            "extracted_skills",
            "extracted_education",
            "skill_count",
            "is_primary",
            "is_parsed",
            "parse_error",
            "parsed_at",
            "uploaded_at",
            "download_url",
        ]
        read_only_fields = fields

    def get_skill_count(self, obj) -> int:
        return len(obj.extracted_skills or [])

    def get_download_url(self, obj) -> str:
        request = self.context.get("request")
        path = f"/api/v1/resumes/{obj.id}/download/"
        return request.build_absolute_uri(path) if request else path


class ResumeUploadSerializer(serializers.Serializer):
    file = serializers.FileField()

    def validate_file(self, uploaded):
        if uploaded.size > settings.RESUME_MAX_BYTES:
            limit_mb = settings.RESUME_MAX_BYTES / (1024 * 1024)
            raise serializers.ValidationError(
                f"File is {uploaded.size / (1024 * 1024):.1f} MB; the limit is "
                f"{limit_mb:.0f} MB."
            )
        if uploaded.size == 0:
            raise serializers.ValidationError("The file is empty.")

        extension = uploaded.name.rsplit(".", 1)[-1].lower() if "." in uploaded.name else ""
        if extension not in settings.RESUME_ALLOWED_EXTENSIONS:
            allowed = ", ".join(settings.RESUME_ALLOWED_EXTENSIONS).upper()
            raise serializers.ValidationError(f"Unsupported file type. Upload {allowed}.")

        # Magic-byte check: the extension is a claim, not evidence.
        head = uploaded.read(8)
        uploaded.seek(0)
        try:
            actual = sniff_format(head)
        except DocumentParseError as exc:
            raise serializers.ValidationError(str(exc)) from exc
        if actual != extension:
            raise serializers.ValidationError(
                f"File contents are {actual.upper()} but the name says "
                f"{extension.upper()}."
            )
        return uploaded
