from dataclasses import asdict

from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from ..matching.ats import build_ats_report
from ..matching.scorer import recommend_jobs
from ..models import Application, Job, Resume
from ..permissions import IsSeeker
from ..serializers import (
    AtsReportSerializer,
    AtsRequestSerializer,
    JobSummarySerializer,
    RecommendationSerializer,
)

NO_RESUME = "Upload a resume before requesting a match."
UNPARSED_RESUME = (
    "Your resume could not be read, so it cannot be scored. Upload a "
    "text-based PDF or DOCX."
)


def _primary_resume(user, resume_id: int | None = None) -> Resume:
    queryset = Resume.objects.filter(user=user)
    resume = (
        queryset.filter(pk=resume_id).first()
        if resume_id
        else queryset.filter(is_primary=True).first() or queryset.first()
    )
    if resume is None:
        raise ValidationError({"resume": NO_RESUME})
    if not resume.is_parsed:
        raise ValidationError({"resume": resume.parse_error or UNPARSED_RESUME})
    return resume


@extend_schema(
    tags=["matching"],
    parameters=[
        OpenApiParameter("limit", int, description="Maximum results (1-50). Default 10."),
        OpenApiParameter("min_score", float, description="Score floor, 0-1. Default 0."),
    ],
    responses={200: RecommendationSerializer(many=True)},
    description=(
        "Rank open jobs against the caller's primary resume. Results are real "
        "job postings, scored with explanations of what matched."
    ),
)
class RecommendationView(APIView):
    permission_classes = [IsSeeker]
    throttle_scope = "scoring"

    def get(self, request):
        resume = _primary_resume(request.user)

        try:
            limit = min(max(int(request.query_params.get("limit", 10)), 1), 50)
        except (TypeError, ValueError):
            limit = 10
        try:
            min_score = float(request.query_params.get("min_score", 0))
        except (TypeError, ValueError):
            min_score = 0.0

        scored = recommend_jobs(
            resume.parsed_text,
            resume.extracted_skills or None,
            limit=limit,
            min_score=min_score,
        )
        if not scored:
            return Response({"count": 0, "results": []})

        jobs = Job.objects.in_bulk([s.job_id for s in scored])
        applied = set(
            Application.objects.filter(
                user=request.user, job_id__in=jobs.keys()
            ).values_list("job_id", flat=True)
        )

        results = [
            {
                "job": JobSummarySerializer(jobs[s.job_id]).data,
                "score": round(s.score, 4),
                "match_percentage": s.percentage,
                "matched_skills": list(s.matched_skills),
                "missing_skills": list(s.missing_skills)[:10],
                "has_applied": s.job_id in applied,
            }
            for s in scored
            if s.job_id in jobs
        ]
        return Response({"count": len(results), "results": results})


@extend_schema(
    tags=["matching"],
    request=AtsRequestSerializer,
    responses={200: AtsReportSerializer},
    description=(
        "Score the caller's resume against a pasted job description and return "
        "matched skills, weighted gaps, format checks and suggested fixes."
    ),
)
class AtsReportView(APIView):
    permission_classes = [IsSeeker]
    throttle_scope = "scoring"

    def post(self, request):
        serializer = AtsRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        resume = _primary_resume(request.user, serializer.validated_data.get("resume_id"))
        report = build_ats_report(
            resume.parsed_text, serializer.validated_data["job_description"]
        )
        return Response(asdict(report), status=status.HTTP_200_OK)
