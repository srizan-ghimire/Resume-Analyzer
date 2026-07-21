from django.db.models import Count
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from ..filters import JobFilter
from ..models import Application, Job
from ..permissions import IsJobOwner, IsRecruiterOrReadOnly
from ..serializers import ApplicantSerializer, JobSerializer


@extend_schema_view(
    list=extend_schema(tags=["jobs"], description="Open jobs, newest first."),
    retrieve=extend_schema(tags=["jobs"]),
    create=extend_schema(tags=["jobs"]),
    update=extend_schema(tags=["jobs"]),
    partial_update=extend_schema(tags=["jobs"]),
    destroy=extend_schema(tags=["jobs"]),
)
class JobViewSet(viewsets.ModelViewSet):
    serializer_class = JobSerializer
    permission_classes = [IsRecruiterOrReadOnly, IsJobOwner]
    filterset_class = JobFilter
    search_fields = ["job_title", "company_name", "location", "job_description"]
    ordering_fields = ["posted_at", "salary_max", "job_title"]
    ordering = ["-posted_at"]

    queryset = Job.objects.none()  # schema generation only

    def get_queryset(self):
        queryset = Job.objects.select_related("recruiter").annotate(
            application_count=Count("applications", distinct=True)
        )
        user = self.request.user

        # Recruiters manage their own postings, including expired and inactive
        # ones. Everyone else sees only what they can actually apply to.
        if self.request.query_params.get("mine") == "true" and user.is_authenticated:
            return queryset.filter(recruiter=user)
        if self.action in {"update", "partial_update", "destroy", "applicants"}:
            return queryset
        return queryset.open()

    def get_serializer_context(self):
        context = super().get_serializer_context()
        user = self.request.user
        if user.is_authenticated and user.is_seeker:
            context["applied_job_ids"] = set(
                Application.objects.filter(user=user).values_list("job_id", flat=True)
            )
        return context

    def perform_destroy(self, instance):
        # Soft close: applicants keep their history and their status updates.
        instance.is_active = False
        instance.save(update_fields=["is_active", "updated_at"])

    @extend_schema(
        tags=["jobs"],
        responses=ApplicantSerializer(many=True),
        description="Applicants for this job. Recruiter-only, own jobs only.",
    )
    @action(detail=True, methods=["get"], permission_classes=[IsRecruiterOrReadOnly])
    def applicants(self, request, pk=None):
        job = self.get_object()
        if job.recruiter_id != request.user.id:
            self.permission_denied(request, message="You can only view your own jobs.")

        applications = (
            Application.objects.filter(job=job)
            .select_related("user", "resume", "job")
            .order_by("-match_score", "-applied_at")
        )
        page = self.paginate_queryset(applications)
        serializer = ApplicantSerializer(
            page if page is not None else applications,
            many=True,
            context=self.get_serializer_context(),
        )
        if page is not None:
            return self.get_paginated_response(serializer.data)
        return Response(serializer.data)
