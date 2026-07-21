from rest_framework.permissions import SAFE_METHODS, BasePermission

from .models import Role


class IsSeeker(BasePermission):
    message = "Only job seeker accounts can do this."

    def has_permission(self, request, view) -> bool:
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == Role.SEEKER
        )


class IsRecruiter(BasePermission):
    message = "Only recruiter accounts can do this."

    def has_permission(self, request, view) -> bool:
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == Role.RECRUITER
        )


class IsRecruiterOrReadOnly(BasePermission):
    """Public read, recruiter-only write.

    Job listings are deliberately readable without an account: the landing page
    shows open roles to visitors before they sign up. Nothing user-specific is
    exposed to anonymous callers -- ``has_applied`` and the ``mine`` filter both
    require authentication.
    """

    message = "Only recruiter accounts can post or edit jobs."

    def has_permission(self, request, view) -> bool:
        if request.method in SAFE_METHODS:
            return True
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == Role.RECRUITER
        )


class IsOwner(BasePermission):
    """Object-level ownership via a ``user`` attribute."""

    message = "This does not belong to you."

    def has_object_permission(self, request, view, obj) -> bool:
        return getattr(obj, "user_id", None) == request.user.id


class IsJobOwner(BasePermission):
    """Object-level ownership of a Job, via its ``recruiter``."""

    message = "You can only manage jobs you posted."

    def has_object_permission(self, request, view, obj) -> bool:
        if request.method in SAFE_METHODS:
            return True
        return getattr(obj, "recruiter_id", None) == request.user.id
