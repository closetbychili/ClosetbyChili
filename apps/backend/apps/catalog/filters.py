"""
Closet by Chilli — Catalog REST API Filters.

Provides custom filtering logic for Catalog ViewSets using
Django REST Framework's built-in filter backends.

Deliberately avoids django-filter dependency to keep requirements minimal.
"""

from rest_framework import filters
from rest_framework.request import Request


class CategorySlugFilter(filters.BaseFilterBackend):
    """
    Filter products by category slug via ?category=<slug>.

    Validates that the provided slug value is a non-empty string
    to prevent unbounded or invalid queries.
    """

    def filter_queryset(self, request: Request, queryset, view):
        category_slug = request.query_params.get("category", "").strip()
        if category_slug:
            queryset = queryset.filter(category__slug=category_slug)
        return queryset

    def get_schema_operation_parameters(self, view):
        return [
            {
                "name": "category",
                "required": False,
                "in": "query",
                "description": "Filter products by category slug.",
                "schema": {"type": "string"},
            }
        ]


class CollectionSlugFilter(filters.BaseFilterBackend):
    """
    Filter products by collection slug via ?collection=<slug>.
    """

    def filter_queryset(self, request: Request, queryset, view):
        collection_slug = request.query_params.get("collection", "").strip()
        if collection_slug:
            queryset = queryset.filter(
                collections__slug=collection_slug,
                product_collections__is_active=True,
            )
        return queryset

    def get_schema_operation_parameters(self, view):
        return [
            {
                "name": "collection",
                "required": False,
                "in": "query",
                "description": "Filter products by collection slug.",
                "schema": {"type": "string"},
            }
        ]
