from django.contrib.auth import get_user_model
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from ..serializers import (
    AuthTokenResponseSerializer,
    ChangePasswordSerializer,
    LoginSerializer,
    LogoutSerializer,
    RegisterSerializer,
    UpdateProfileSerializer,
    UserSerializer,
)

User = get_user_model()


@extend_schema(
    tags=["auth"],
    request=RegisterSerializer,
    responses={201: AuthTokenResponseSerializer},
)
class RegisterView(generics.CreateAPIView):
    """Create a seeker or recruiter account and return tokens immediately."""

    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]
    throttle_scope = "auth"

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        refresh = RefreshToken.for_user(user)
        refresh["role"] = user.role
        refresh["username"] = user.username
        return Response(
            {
                "user": UserSerializer(user).data,
                "access": str(refresh.access_token),
                "refresh": str(refresh),
            },
            status=status.HTTP_201_CREATED,
        )


@extend_schema(
    tags=["auth"],
    request=LoginSerializer,
    responses={200: AuthTokenResponseSerializer},
)
class LoginView(TokenObtainPairView):
    """Exchange credentials for an access/refresh token pair."""

    serializer_class = LoginSerializer
    permission_classes = [AllowAny]
    throttle_scope = "auth"


@extend_schema(
    tags=["auth"],
    request=LogoutSerializer,
    responses={205: OpenApiResponse(description="Refresh token blacklisted")},
)
class LogoutView(APIView):
    """Blacklist a refresh token so it cannot be used again."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = LogoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            RefreshToken(serializer.validated_data["refresh"]).blacklist()
        except TokenError:
            # Already expired or blacklisted: the desired end state either way.
            pass
        return Response(status=status.HTTP_205_RESET_CONTENT)


@extend_schema(tags=["auth"])
class MeView(generics.RetrieveUpdateAPIView):
    """Read or update the authenticated user's own profile."""

    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user

    def get_serializer_class(self):
        return UserSerializer if self.request.method == "GET" else UpdateProfileSerializer

    def update(self, request, *args, **kwargs):
        super().update(request, *args, **kwargs)
        return Response(UserSerializer(self.get_object()).data)


@extend_schema(
    tags=["auth"],
    request=ChangePasswordSerializer,
    responses={204: OpenApiResponse(description="Password changed")},
)
class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_scope = "auth"

    def post(self, request):
        serializer = ChangePasswordSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(status=status.HTTP_204_NO_CONTENT)
