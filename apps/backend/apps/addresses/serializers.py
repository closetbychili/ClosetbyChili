from __future__ import annotations

import re

from rest_framework import serializers

from apps.addresses.models import Address


class AddressSerializer(serializers.ModelSerializer):
    user = serializers.UUIDField(source="user_id", read_only=True)

    class Meta:
        model = Address
        fields = [
            "id",
            "user",
            "full_name",
            "phone",
            "address_line1",
            "address_line2",
            "landmark",
            "city",
            "state",
            "postal_code",
            "country",
            "address_type",
            "is_default",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "user", "created_at", "updated_at"]

    def to_internal_value(self, data):
        data = data.copy()
        data.pop("user_id", None)
        data.pop("user", None)
        return super().to_internal_value(data)

    def validate(self, attrs):
        prohibited = {"created_at", "updated_at"}
        provided = set(self.initial_data.keys())
        if prohibited & provided:
            raise serializers.ValidationError(
                {field: "This field is not allowed." for field in sorted(prohibited & provided)}
            )
        return attrs

    def validate_full_name(self, value: str) -> str:
        sanitized = (value or "").strip()
        if not sanitized:
            raise serializers.ValidationError("Full name is required.")
        return sanitized

    def validate_phone(self, value: str) -> str:
        sanitized = (value or "").strip()
        normalized = re.sub(r"\D", "", sanitized)
        if not re.fullmatch(r"(?:\+91)?[6-9]\d{9}", sanitized.replace(" ", "").replace("-", "")):
            raise serializers.ValidationError("Enter a valid Indian phone number.")
        if len(normalized) != 10:
            raise serializers.ValidationError("Phone number must contain 10 digits.")
        return sanitized

    def validate_postal_code(self, value: str) -> str:
        sanitized = (value or "").strip()
        if not re.fullmatch(r"[1-9][0-9]{5}", sanitized):
            raise serializers.ValidationError("Enter a valid 6-digit Indian postal code.")
        return sanitized

    def validate_address_line1(self, value: str) -> str:
        sanitized = (value or "").strip()
        if not sanitized:
            raise serializers.ValidationError("Address line 1 is required.")
        return sanitized

    def validate_city(self, value: str) -> str:
        sanitized = (value or "").strip()
        if not sanitized:
            raise serializers.ValidationError("City is required.")
        return sanitized

    def validate_state(self, value: str) -> str:
        sanitized = (value or "").strip()
        if not sanitized:
            raise serializers.ValidationError("State is required.")
        return sanitized

    def validate_country(self, value: str) -> str:
        sanitized = (value or "").strip() or "India"
        if not sanitized:
            raise serializers.ValidationError("Country is required.")
        return sanitized

    def create(self, validated_data):
        request = self.context["request"]
        if not Address.objects.filter(user=request.user, is_default=True).exists():
            validated_data["is_default"] = True
        return Address.objects.create(user=request.user, **validated_data)

    def update(self, instance, validated_data):
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save()
        return instance
