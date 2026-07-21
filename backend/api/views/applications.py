from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import mixins, viewsets
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from ..models import Application, Role
from ..serializers import (
    ApplicantSerializer,
    ApplicationCreateSerializer,
    ApplicationSerializer,
)


@extend_schema_view(
    list=extend_schema(tags=["applications"]),
    retrieve=extend_schema(tags=["applications"]),
    create=extend_schema(tags=["applications"]),
    partial_update=extend_schema(tags=["applications"]),
)
class ApplicationViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    """Seekers see and create their own applications.

    Recruiters see applications to jobs they posted, and are the only ones who
    can change status. This is the endpoint the old ``recruiter_update_status``
    stub was meant to be.
    """

    filterset_fields = ["status", "job"]
    ordering_fields = ["applied_at", "match_score", "status"]
    ordering = ["-applied_at"]
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_queryset(self):
        base = Application.objects.select_related("job", "user", "resume")
        user = self.request.user
        if not user.is_authenticated:  # schema generation
            return base.none()
        if user.role == Role.RECRUITER:
            return base.filter(job__recruiter=user)
        return base.filter(user=user)

    def get_serializer_class(self):
        if self.action == "create":
            return ApplicationCreateSerializer
        user = self.request.user
        if user.is_authenticated and user.role == Role.RECRUITER:
            return ApplicantSerializer
        return ApplicationSerializer

    def create(self, request, *args, **kwargs):
        if request.user.role != Role.SEEKER:
            raise PermissionDenied("Only job seekers can apply to jobs.")
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        application = serializer.save()
        return Response(
            ApplicationSerializer(application, context=self.get_serializer_context()).data,
            status=201,
        )

    def partial_update(self, request, *args, **kwargs):
        # Only the recruiter who owns the job may move an application's status.
        if request.user.role != Role.RECRUITER:
            raise PermissionDenied("Only recruiters can change application status.")
        instance = self.get_object()
        if instance.job.recruiter_id != request.user.id:
            raise PermissionDenied("You can only manage applications to your own jobs.")
        return super().partial_update(request, *args, **kwargs)
