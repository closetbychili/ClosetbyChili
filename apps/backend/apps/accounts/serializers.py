from rest_framework import serializers

from apps.accounts.models import CustomerProfile, User


class CustomerProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomerProfile
        fields = ["display_name", "phone"]


class CurrentUserSerializer(serializers.ModelSerializer):
    profile = CustomerProfileSerializer(read_only=True)
    avatar_url = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "supabase_user_id",
            "email",
            "role",
            "profile",
            "avatar_url",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    def get_avatar_url(self, obj: User) -> str:
        request = self.context.get("request")
        if request and isinstance(getattr(request, "auth", None), dict):
            claims = request.auth
            user_metadata = claims.get("user_metadata") or {}
            return (
                user_metadata.get("avatar_url")
                or user_metadata.get("picture")
                or claims.get("picture")
                or ""
            )
        return ""


class AdminUserSerializer(serializers.ModelSerializer):
    """Safe, minimal serialization of authenticated administrator details."""

    is_admin = serializers.BooleanField(read_only=True)
    is_staff = serializers.BooleanField(read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "role",
            "is_admin",
            "is_staff",
            "is_active",
            "created_at",
        ]
        read_only_fields = fields


class UpdateProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomerProfile
        fields = ["display_name", "phone"]

    def validate_display_name(self, value: str) -> str:
        return value.strip()

    def validate_phone(self, value: str) -> str:
        return value.strip()

    def validate(self, attrs):
        allowed = set(self.Meta.fields)
        provided = set(self.initial_data.keys())
        unknown = provided - allowed
        if unknown:
            raise serializers.ValidationError(
                {field: "This field is not allowed." for field in sorted(unknown)},
                code="invalid",
            )
        return attrs
