"""
Closet by Chilli — Admin Analytics Serializers.

Validates query parameters and defines response structures for the
Admin Analytics & Business Intelligence module (Sprint A7).
"""

from __future__ import annotations

from rest_framework import serializers


class AdminAnalyticsParamsSerializer(serializers.Serializer):
    """Query parameter serializer for GET /api/v1/admin/analytics/."""

    period = serializers.ChoiceField(
        choices=["today", "7d", "30d", "90d", "this_month", "last_month", "custom"],
        default="30d",
        required=False,
    )
    start_date = serializers.CharField(
        required=False,
        allow_blank=True,
        help_text="Start date for custom date range (YYYY-MM-DD or ISO-8601).",
    )
    end_date = serializers.CharField(
        required=False,
        allow_blank=True,
        help_text="End date for custom date range (YYYY-MM-DD or ISO-8601).",
    )
    granularity = serializers.ChoiceField(
        choices=["auto", "day", "week", "month"],
        default="auto",
        required=False,
        help_text="Time series aggregation bucket granularity.",
    )
    refresh = serializers.BooleanField(
        default=False,
        required=False,
        help_text="Bypass short-lived cache if true.",
    )

