import logging

from django.http import FileResponse, Http404
from django.utils import timezone
from drf_spectacular.utils import OpenApiResponse, extend_schema, extend_schema_view
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response

from ..matching.parser import DocumentParseError, parse_document
from ..matching.skills import extract_education, extract_skills
from ..models import Application, Resume, Role
from ..serializers import ResumeSerializer, ResumeUploadSerializer

logger = logging.getLogger(__name__)


@extend_schema_view(
    list=extend_schema(tags=["resumes"]),
    retrieve=extend_schema(tags=["resumes"]),
    destroy=extend_schema(tags=["resumes"]),
)
class ResumeViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = ResumeSerializer
    parser_classes = [MultiPartParser, FormParser]

    queryset = Resume.objects.none()  # schema generation only

    def get_queryset(self):
        if not self.request.user.is_authenticated:
            return Resume.objects.none()
        return Resume.objects.filter(user=self.request.user)

    def get_throttles(self):
        # ScopedRateThrottle reads throttle_scope off the view, and @action
        # cannot set it as an initkwarg.
        self.throttle_scope = "upload" if self.action == "upload" else None
        return super().get_throttles()

    @extend_schema(
        tags=["resumes"],
        request={"multipart/form-data": ResumeUploadSerializer},
        responses={201: ResumeSerializer},
        description=(
            "Upload and parse a resume. Parsing happens once, here, so that "
            "scoring requests never re-read the file."
        ),
    )
    @action(detail=False, methods=["post"])
    def upload(self, request):
        serializer = ResumeUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        uploaded = serializer.validated_data["file"]

        data = uploaded.read()
        uploaded.seek(0)

        parsed_text = ""
        skills: list[str] = []
        education: list[str] = []
        parse_error = ""
        try:
            document = parse_document(data)
            parsed_text = document.text
            skills = extract_skills(parsed_text)
            education = extract_education(parsed_text)
        except DocumentParseError as exc:
            parse_error = str(exc)
        except Exception:
            logger.exception("Unexpected resume parse failure")
            parse_error = "The file could not be processed."

        resume = Resume.objects.create(
            user=request.user,
            file=uploaded,
            original_filename=uploaded.name[:255],
            content_type=getattr(uploaded, "content_type", "") or "",
            size_bytes=uploaded.size,
            parsed_text=parsed_text,
            extracted_skills=skills,
            extracted_education=education,
            parse_error=parse_error[:255],
            parsed_at=timezone.now() if parsed_text else None,
            is_primary=True,
        )

        # A resume we cannot read is not usable, and silently accepting it is
        # how the old upload flow left users with no recommendations and no
        # explanation.
        response_status = (
            status.HTTP_201_CREATED if parsed_text else status.HTTP_422_UNPROCESSABLE_ENTITY
        )
        return Response(
            ResumeSerializer(resume, context=self.get_serializer_context()).data,
            status=response_status,
        )

    @extend_schema(tags=["resumes"], responses={200: ResumeSerializer})
    @action(detail=True, methods=["post"], url_path="set-primary")
    def set_primary(self, request, pk=None):
        resume = self.get_object()
        resume.is_primary = True
        resume.save()
        return Response(ResumeSerializer(resume, context=self.get_serializer_context()).data)

    @extend_schema(
        tags=["resumes"],
        responses={200: OpenApiResponse(description="The resume file")},
        description=(
            "Download a resume. Permitted for its owner, and for recruiters who "
            "have received an application including it."
        ),
    )
    @action(detail=True, methods=["get"])
    def download(self, request, pk=None):
        # Not get_object(): recruiters need access to resumes they do not own.
        resume = Resume.objects.filter(pk=pk).select_related("user").first()
        if resume is None:
            raise Http404

        if resume.user_id != request.user.id:
            allowed = (
                request.user.role == Role.RECRUITER
                and Application.objects.filter(
                    resume=resume, job__recruiter=request.user
                ).exists()
            )
            if not allowed:
                raise PermissionDenied("You do not have access to this resume.")

        try:
            handle = resume.file.open("rb")
        except (FileNotFoundError, ValueError) as exc:
            raise Http404("The stored file is missing.") from exc

        return FileResponse(
            handle,
            as_attachment=True,
            filename=resume.original_filename or "resume.pdf",
        )
