"""
Closet by Chilli — Catalog Domain URL Configuration.

Routes:
  /api/v1/catalog/categories/         → CategoryViewSet (list)
  /api/v1/catalog/categories/{id}/    → CategoryViewSet (detail by UUID)
  /api/v1/catalog/collections/        → CollectionViewSet (list)
  /api/v1/catalog/collections/{id}/   → CollectionViewSet (detail by UUID)
  /api/v1/catalog/products/           → ProductViewSet (list)
  /api/v1/catalog/products/{slug}/    → ProductViewSet (detail by slug)
"""

from rest_framework.routers import DefaultRouter

from apps.catalog.views import CategoryViewSet, CollectionViewSet, ProductViewSet

router = DefaultRouter()
router.register(r"categories", CategoryViewSet, basename="catalog-categories")
router.register(r"collections", CollectionViewSet, basename="catalog-collections")
router.register(r"products", ProductViewSet, basename="catalog-products")

urlpatterns = router.urls
