"""
Closet by Chilli — Catalog REST API ViewSets.

Implements read-only ViewSets for:
- CategoryViewSet  → GET /api/v1/catalog/categories/
- CollectionViewSet → GET /api/v1/catalog/collections/
- ProductViewSet   → GET /api/v1/catalog/products/ (slug-based detail)

Visibility rules enforced:
- Products: status='active' AND is_active=True
- Categories: is_active=True
- Collections: is_active=True
- Variants: is_active=True (filtered in serializer, not queryset)

Query optimization:
- ProductViewSet list uses select_related(category) +
  prefetch_related(collections, variants, product_collections)
- CategoryViewSet list prefetches children
- CollectionViewSet list is simple (no nested objects in list output)

Wholesale pricing:
- wholesale_price is excluded from ALL public API responses via
  ProductVariantSummarySerializer. This is a deliberate server-side
  decision. Frontend cannot override it.
- Future sprint: A wholesale-authenticated serializer path will expose
  wholesale_price after Supabase Auth + wholesale role verification.
  See: docs/23-search-catalog-architecture.md §9.
"""

from rest_framework import filters, mixins, viewsets
from rest_framework.exceptions import NotFound
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.catalog.filters import CategorySlugFilter, CollectionSlugFilter
from apps.catalog.models import Category, Collection, Product
from apps.catalog.serializers import (
    CategorySerializer,
    CollectionSerializer,
    ProductDetailSerializer,
    ProductListSerializer,
)


class CategoryViewSet(
    mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet
):
    """
    Read-only Category API.

    list:   GET /api/v1/catalog/categories/
    detail: GET /api/v1/catalog/categories/{id}/
    """

    permission_classes = [AllowAny]
    serializer_class = CategorySerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name", "slug", "description"]
    ordering_fields = ["name", "created_at"]
    ordering = ["name"]

    def get_queryset(self):
        return (
            Category.objects.filter(is_active=True)
            .select_related("parent")
            .prefetch_related("children")
        )


class CollectionViewSet(
    mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet
):
    """
    Read-only Collection API.

    list:   GET /api/v1/catalog/collections/
    detail: GET /api/v1/catalog/collections/{id}/
    """

    permission_classes = [AllowAny]
    serializer_class = CollectionSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name", "slug", "description"]
    ordering_fields = ["name", "created_at"]
    ordering = ["name"]

    def get_queryset(self):
        return Collection.objects.filter(is_active=True)


class ProductViewSet(
    mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet
):
    """
    Read-only Product API.

    list:   GET /api/v1/catalog/products/
    detail: GET /api/v1/catalog/products/{slug}/

    Documented filters:
    - ?category=<slug>     Filter by category slug
    - ?collection=<slug>   Filter by collection slug
    - ?search=<term>       Search across name, description
    - ?ordering=<field>    Sort by: name, -name, created_at, -created_at
    """

    permission_classes = [AllowAny]
    lookup_field = "slug"
    filter_backends = [
        CategorySlugFilter,
        CollectionSlugFilter,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    search_fields = ["name", "description"]
    ordering_fields = ["name", "created_at"]
    ordering = ["-created_at"]

    def get_serializer_class(self):
        if self.action == "retrieve":
            return ProductDetailSerializer
        return ProductListSerializer

    def get_queryset(self):
        """
        Public products only: status=active AND is_active=True.

        Uses optimized prefetching to prevent N+1 queries from nested
        category, collections, and variants serializers.
        """
        return (
            Product.objects.filter(status=Product.Status.ACTIVE, is_active=True)
            .select_related("category")
            .prefetch_related(
                "collections",
                "variants",
                "product_collections",
            )
            .distinct()
        )

    def retrieve(self, request, *args, **kwargs):
        """
        Retrieve a product by slug. Returns 404 if not found or not public.
        """
        slug = kwargs.get(self.lookup_field)
        try:
            instance = self.get_queryset().get(slug=slug)
        except Product.DoesNotExist:
            raise NotFound(f"No product found with slug '{slug}'.") from None
        serializer = self.get_serializer(instance)
        return Response(serializer.data)
