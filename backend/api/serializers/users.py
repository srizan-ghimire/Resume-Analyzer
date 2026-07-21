from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from ..models import RecruiterProfile, Role

User = get_user_model()


class RecruiterProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = RecruiterProfile
        fields = ["company_name", "company_website", "company_location", "about"]


class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(read_only=True)
    recruiter_profile = RecruiterProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "full_name",
            "role",
            "date_joined",
            "recruiter_profile",
        ]
        read_only_fields = ["id", "role", "date_joined"]


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, style={"input_type": "password"})
    password_confirm = serializers.CharField(
        write_only=True, style={"input_type": "password"}
    )
    role = serializers.ChoiceField(choices=Role.choices, default=Role.SEEKER)
    company_name = serializers.CharField(
        write_only=True,
        required=False,
        allow_blank=True,
        help_text="Required when registering as a recruiter.",
    )

    class Meta:
        model = User
        fields = [
            "username",
            "email",
            "password",
            "password_confirm",
            "first_name",
            "last_name",
            "role",
            "company_name",
        ]

    def validate_email(self, value: str) -> str:
        value = value.lower().strip()
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return value

    def validate_password(self, value: str) -> str:
        validate_password(value)
        return value

    def validate(self, attrs):
        if attrs["password"] != attrs.pop("password_confirm"):
            raise serializers.ValidationError({"password_confirm": "Passwords do not match."})
        if attrs.get("role") == Role.RECRUITER and not attrs.get("company_name", "").strip():
            raise serializers.ValidationError(
                {"company_name": "Company name is required for recruiter accounts."}
            )
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        company_name = validated_data.pop("company_name", "").strip()
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        if user.role == Role.RECRUITER:
            RecruiterProfile.objects.create(user=user, company_name=company_name)
        return user


class LoginSerializer(TokenObtainPairSerializer):
    """Adds the user object to the token response.

    Saves the client a round trip, and means the frontend never has to hold on
    to credentials to identify the current user.
    """

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["role"] = user.role
        token["username"] = user.username
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data["user"] = UserSerializer(self.user).data
        return data


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True)

    def validate_current_password(self, value: str) -> str:
        if not self.context["request"].user.check_password(value):
            raise serializers.ValidationError("Current password is incorrect.")
        return value

    def validate_new_password(self, value: str) -> str:
        validate_password(value, self.context["request"].user)
        return value

    def save(self, **kwargs):
        user = self.context["request"].user
        user.set_password(self.validated_data["new_password"])
        user.save(update_fields=["password"])
        return user


class UpdateProfileSerializer(serializers.ModelSerializer):
    recruiter_profile = RecruiterProfileSerializer(required=False)

    class Meta:
        model = User
        fields = ["first_name", "last_name", "email", "recruiter_profile"]

    def validate_email(self, value: str) -> str:
        value = value.lower().strip()
        if User.objects.filter(email__iexact=value).exclude(pk=self.instance.pk).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return value

    @transaction.atomic
    def update(self, instance, validated_data):
        profile_data = validated_data.pop("recruiter_profile", None)
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save()

        if profile_data and instance.is_recruiter:
            profile, _ = RecruiterProfile.objects.get_or_create(
                user=instance, defaults={"company_name": profile_data.get("company_name", "")}
            )
            for field, value in profile_data.items():
                setattr(profile, field, value)
            profile.save()
        return instance


class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField()


class AuthTokenResponseSerializer(serializers.Serializer):
    """Response shape shared by register and login.

    Declared explicitly so the generated OpenAPI schema -- and therefore the
    frontend's generated types -- match what these views actually return.
    """

    access = serializers.CharField(read_only=True)
    refresh = serializers.CharField(read_only=True)
    user = UserSerializer(read_only=True)
