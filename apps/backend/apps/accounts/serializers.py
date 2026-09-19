from rest_framework import serializers

from apps.accounts.models import CustomerProfile, User


class CustomerProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomerProfile
        fields = ["display_name", "phone"]


class CurrentUserSerializer(serializers.ModelSerializer):
    profile = CustomerProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "supabase_user_id",
            "email",
            "role",
            "profile",
            "created_at",
            "updated_at",
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
