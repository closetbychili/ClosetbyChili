# Closet by Chilli --- Search & Catalog Architecture

## 1. Purpose

This document defines the catalog browsing and product discovery
architecture for Closet by Chilli.

The catalog system connects:

``` text
Categories
Collections
Products
Variants
Inventory
Pricing
Media
Search
Filters
Sorting
SEO
Retail/Wholesale visibility
```

The goal is to make products easy to discover while keeping catalog
visibility, pricing, availability, and search behavior authoritative on
the backend.

------------------------------------------------------------------------

# 2. Catalog Principles

The catalog architecture follows:

``` text
Canonical product data
Server-authoritative visibility
Stable URLs
Fast listing queries
Explicit filtering
Predictable sorting
Search relevance
Retail/wholesale isolation
SEO-friendly discovery
Scalable indexing
```

------------------------------------------------------------------------

# 3. Catalog Structure

The initial product taxonomy includes:

``` text
Kurtis
Kurta Sets
Dresses
Anarkali Sets
Dupattas
Bottom Wear
```

Shopping/set groupings include:

``` text
2-Piece Sets
3-Piece Sets
Co-ord Sets
```

The taxonomy should remain extensible as the catalog grows.

------------------------------------------------------------------------

# 4. Product vs Category

A product belongs to one or more appropriate catalog/category contexts
according to the approved data model.

Do not duplicate products merely because they appear in multiple
merchandising areas.

------------------------------------------------------------------------

# 5. Collections

Collections are merchandising groupings that may cut across categories.

Examples:

``` text
New Arrivals
Bestsellers
Festive Collection
Featured Collections
```

A collection should reference products rather than duplicate product
records.

------------------------------------------------------------------------

# 6. Homepage Catalog Sections

The approved homepage merchandising order includes:

``` text
New Arrivals
Shop by Category
Kurtis
2-Piece Sets
3-Piece Sets
Ethnic Dresses
Bestsellers
Festive Collection
About Closet by Chilli
```

The catalog architecture should support these merchandising views
without creating separate product systems.

------------------------------------------------------------------------

# 7. Product Visibility

A product may have lifecycle/visibility states such as:

``` text
Draft
Published
Archived
```

Only products meeting the appropriate publication and availability rules
should appear in the public catalog.

------------------------------------------------------------------------

# 8. Public Catalog Eligibility

A public product listing should consider:

``` text
Publication status
Catalog visibility
Category/collection visibility
Product availability
Retail/wholesale eligibility
```

The exact availability policy belongs to the approved product
architecture.

------------------------------------------------------------------------

# 9. Wholesale Visibility

The catalog must respect wholesale eligibility.

Possible models include:

``` text
Retail-visible
Wholesale-visible
Both
```

The backend must enforce the applicable visibility.

------------------------------------------------------------------------

# 10. Product Detail URLs

Product URLs should be stable and human-readable.

Conceptually:

``` text
/products/{slug}
```

The exact route should follow the frontend routing architecture.

------------------------------------------------------------------------

# 11. Category URLs

Category URLs should be stable.

Conceptually:

``` text
/categories/kurtis
/categories/kurta-sets
```

The final URL structure should be consistent across the catalog.

------------------------------------------------------------------------

# 12. Collection URLs

Collections may use:

``` text
/collections/new-arrivals
/collections/festive-collection
```

The exact public route should follow the approved SEO/routing
architecture.

------------------------------------------------------------------------

# 13. Slugs

Slugs should be:

``` text
Lowercase
Readable
Stable
URL-safe
Unique
```

Do not silently change a public slug without considering
redirects/canonical behavior.

------------------------------------------------------------------------

# 14. Slug Uniqueness

The database must enforce appropriate uniqueness.

A product/category/collection should not accidentally create conflicting
public URLs.

------------------------------------------------------------------------

# 15. Slug Changes

If a public slug changes:

``` text
Old URL
   ↓
Redirect
   ↓
New canonical URL
```

The exact redirect strategy belongs to the SEO architecture.

------------------------------------------------------------------------

# 16. Product Listing Page

A product listing page should provide:

``` text
Product grid
Filters
Sorting
Pagination
Result count where appropriate
```

The frontend should remain responsive while the backend handles the
authoritative query.

------------------------------------------------------------------------

# 17. Product Cards

A product card may display:

``` text
Primary image
Product name
Price
Compare-at/original price where applicable
Discount indicator where approved
Availability
Badge such as New/Bestseller where applicable
```

The final design follows the brand/UI architecture.

------------------------------------------------------------------------

# 18. Product Card Data

Listing APIs should return only fields needed for the listing.

Avoid loading the full product detail object for every product card.

------------------------------------------------------------------------

# 19. Listing Query

Conceptually:

``` text
GET /api/v1/products/
```

with controlled query parameters for:

``` text
category
collection
search
filters
sort
page/cursor
```

The exact API contract belongs to the API architecture.

------------------------------------------------------------------------

# 20. Filtering

Potential filters include:

``` text
Category
Set type
Size
Color
Price range
Availability
Collection
```

Only filters supported by the actual catalog attributes should be
exposed.

------------------------------------------------------------------------

# 21. Faceted Navigation

For large catalogs, the API may return facet counts such as:

``` text
Size
   S (12)
   M (18)
   L (15)

Color
   Blue (9)
   Pink (14)
```

Facet computation must be efficient.

------------------------------------------------------------------------

# 22. Filter State

Filter selections should be representable in the URL where appropriate.

For example:

``` text
?category=kurtis&size=M&color=blue
```

The exact query-string format must be standardized.

------------------------------------------------------------------------

# 23. URL-Driven Catalog State

URL-driven filters provide:

``` text
Shareable results
Back/forward navigation
Reload persistence
SEO control where appropriate
```

Do not encode large or sensitive state into public URLs.

------------------------------------------------------------------------

# 24. Filter Validation

The backend must validate filter values.

Invalid values should not cause:

``` text
SQL errors
Unbounded queries
Unexpected data exposure
```

------------------------------------------------------------------------

# 25. Sorting

Potential sorting options:

``` text
Newest
Price low to high
Price high to low
Popularity/Bestsellers
Featured
```

Only expose sorting rules that are implemented and meaningful.

------------------------------------------------------------------------

# 26. Default Sorting

The default sort should be business-approved.

For merchandising-heavy fashion catalogs, a curated/featured ordering
may be appropriate.

Do not silently choose a business-critical ranking strategy without
approval.

------------------------------------------------------------------------

# 27. Stable Sorting

Sorting should be deterministic.

If two products have the same primary sort value, use a stable secondary
ordering.

This prevents products jumping between pages unnecessarily.

------------------------------------------------------------------------

# 28. Pagination

The catalog must paginate large result sets.

Two common approaches:

``` text
Offset pagination
Cursor/keyset pagination
```

The initial implementation should choose based on expected catalog size
and query complexity.

------------------------------------------------------------------------

# 29. Pagination Security

Do not allow arbitrary huge page sizes.

The backend should enforce:

``` text
Default page size
Maximum page size
```

------------------------------------------------------------------------

# 30. Cursor Pagination

If the catalog becomes large or highly dynamic, cursor/keyset pagination
may provide more stable performance.

This should be considered before catalog scale makes offset pagination
expensive.

------------------------------------------------------------------------

# 31. Search

Search should support discovery across relevant product information.

Potential searchable fields:

``` text
Product name
SKU where appropriate
Category
Collection
Description
Search keywords/tags
```

Do not automatically index sensitive/private fields.

------------------------------------------------------------------------

# 32. Search Endpoint

Conceptually:

``` text
GET /api/v1/search/?q=anarkali
```

or search may be integrated into the product-listing endpoint.

The final API choice should remain consistent.

------------------------------------------------------------------------

# 33. Search Normalization

Search should handle reasonable variations in user input.

Potential normalization:

``` text
Case normalization
Whitespace normalization
Basic punctuation handling
```

More advanced language processing should only be introduced when
justified.

------------------------------------------------------------------------

# 34. Search Relevance

Search results should prioritize useful product matches.

Potential relevance signals:

``` text
Exact product-name match
Token match
Category match
Keyword match
Popularity
Availability
```

The exact ranking model must be defined and measured rather than
assumed.

------------------------------------------------------------------------

# 35. Search Engine Strategy

For the initial catalog scale, PostgreSQL-backed search may be
sufficient.

The architecture should keep a migration path toward a dedicated search
engine if scale or relevance requirements justify it.

Potential future options include:

``` text
OpenSearch
Elasticsearch
Algolia
Meilisearch
Other approved search service
```

Do not introduce a dedicated search infrastructure before it is
operationally justified.

------------------------------------------------------------------------

# 36. Search Index Boundary

If a dedicated search engine is later introduced:

``` text
PostgreSQL
   ↓
Authoritative product data

Search index
   ↓
Derived discovery index
```

The search index must not become the authoritative source of product
pricing, inventory, or permissions.

------------------------------------------------------------------------

# 37. Search Index Synchronization

Product changes should update the search index through a reliable
mechanism.

Potential events:

``` text
Product published
Product updated
Product archived
Category changed
Collection changed
Availability changed
```

------------------------------------------------------------------------

# 38. Search Index Failure

If search indexing fails:

``` text
Record failure
Retry
Monitor
Allow reconciliation
```

Do not silently lose catalog updates.

------------------------------------------------------------------------

# 39. Search vs Database Truth

Search results may become briefly stale.

However:

``` text
Product visibility
Pricing
Inventory
Wholesale authorization
```

must still be enforced by the authoritative backend when necessary.

------------------------------------------------------------------------

# 40. Search Availability

Out-of-stock products may:

``` text
Remain searchable
Be demoted
Be hidden
```

depending on the business merchandising policy.

The policy must be explicit.

------------------------------------------------------------------------

# 41. Product Availability

Availability may depend on:

``` text
Publication
Variant inventory
Product status
Customer eligibility
```

A product with zero inventory is not automatically equivalent to an
unpublished product.

------------------------------------------------------------------------

# 42. Variant Availability

For products with variants, listing availability should be derived
appropriately.

Example:

``` text
Product
 ├── S → 0
 ├── M → 5
 └── L → 2

Product = available
```

The exact rule should follow the product/inventory architecture.

------------------------------------------------------------------------

# 43. Size Filter

Size filters should be derived from the catalog's supported variant
attributes.

Do not hard-code:

``` text
S, M, L, XL
```

if the business catalog may change.

------------------------------------------------------------------------

# 44. Color Filter

Colors should use controlled catalog attributes rather than arbitrary
free-text values wherever possible.

This improves:

``` text
Filtering
Search
Consistency
Analytics
```

------------------------------------------------------------------------

# 45. Price Filter

Price filtering must use authoritative product pricing for the
requesting customer context.

Wholesale and retail customers may require different price
interpretations.

------------------------------------------------------------------------

# 46. Wholesale Search Pricing

Search results for approved wholesale customers must return appropriate
wholesale pricing where applicable.

Retail users must not be able to obtain wholesale prices through:

``` text
Search
Filters
Query parameters
API manipulation
```

------------------------------------------------------------------------

# 47. Wholesale Product Visibility

Wholesale-only products should not appear in retail:

``` text
Listing
Search
Category pages
Collections
Recommendations
```

unless the business explicitly makes a preview/public representation
available.

------------------------------------------------------------------------

# 48. Search Suggestions

Autocomplete may be implemented later.

Potential suggestions:

``` text
Product names
Categories
Collections
Search terms
```

Autocomplete should be lightweight and rate-limited.

------------------------------------------------------------------------

# 49. No-Result Search

A no-result state should be useful.

Potential UX:

``` text
No products found
Try another search
Suggested categories
Popular products
```

Do not expose internal search errors.

------------------------------------------------------------------------

# 50. Empty Category

An empty category should have an intentional UX.

For example:

``` text
No products currently available
Explore related categories
```

------------------------------------------------------------------------

# 51. Search Query Limits

Protect search endpoints against abusive or pathological queries.

Consider:

``` text
Maximum query length
Maximum filter count
Maximum page size
Rate limiting
```

------------------------------------------------------------------------

# 52. Search Injection Safety

Search/filter parameters must be passed through safe ORM/query
construction.

Do not construct raw SQL from user-provided search strings.

If raw SQL is necessary for advanced search, use parameterized queries.

------------------------------------------------------------------------

# 53. Catalog Query Performance

Catalog queries should be designed around indexes.

Potential indexed fields include:

``` text
Slug
Publication/status
Category relationship
Collection relationship
SKU
Created/published timestamp
```

The final indexes should be driven by actual query patterns.

------------------------------------------------------------------------

# 54. Filter Query Performance

Avoid query patterns that:

``` text
Load all products
Filter in Python
```

for large datasets.

Filtering should happen in the database/search layer.

------------------------------------------------------------------------

# 55. N+1 Prevention

Listing APIs must avoid N+1 queries.

For example:

``` text
100 products
+
100 category queries
```

should not occur when the relationship can be efficiently fetched.

------------------------------------------------------------------------

# 56. Listing Caching

Public catalog results may be cached where appropriate.

Caching must consider:

``` text
Query
Filters
Sort
Pagination
Customer context
```

------------------------------------------------------------------------

# 57. Personalized Catalog Cache

If pricing or visibility differs by customer type, cache keys must
isolate:

``` text
Retail
Wholesale
```

and any other relevant personalization dimensions.

Never allow a wholesale response to become a retail cache response.

------------------------------------------------------------------------

# 58. Cache Invalidation

Catalog cache invalidation may be triggered by:

``` text
Product publication change
Price change
Availability change
Category change
Collection change
```

The exact strategy belongs to the performance/cache architecture.

------------------------------------------------------------------------

# 59. Product Detail vs Listing

The listing API should remain optimized for:

``` text
Discovery
```

while the product detail API/page can provide:

``` text
Full description
Gallery
Variants
Detailed pricing
Availability
SEO information
```

------------------------------------------------------------------------

# 60. Related Products

Related-product functionality may use:

``` text
Same category
Same collection
Curated relationships
Similar attributes
```

The ranking strategy should remain configurable/replaceable.

------------------------------------------------------------------------

# 61. Bestsellers

Bestsellers should not be inferred from a frontend sort.

If the business uses bestseller merchandising, define an authoritative
ranking source or curated assignment.

------------------------------------------------------------------------

# 62. New Arrivals

New Arrivals may use:

``` text
Published timestamp
Curated collection
```

depending on merchandising requirements.

The final rule should be explicit.

------------------------------------------------------------------------

# 63. Featured Products

Featured products should be controllable through the admin merchandising
system where required.

Do not hard-code product IDs into frontend code.

------------------------------------------------------------------------

# 64. Festive Collection

Festive Collection should be represented as a collection/merchandising
entity rather than a special hard-coded product type.

------------------------------------------------------------------------

# 65. Category Hierarchy

The architecture should allow category hierarchy if the catalog later
requires:

``` text
Women
  ├── Ethnic
  │    ├── Kurtis
  │    └── Sets
```

The Phase 1 hierarchy should remain as simple as the approved catalog
requires.

------------------------------------------------------------------------

# 66. Category Metadata

Categories may contain:

``` text
Name
Slug
Description
Image
SEO title
SEO description
Visibility
Sort/order
```

Only supported fields should be implemented.

------------------------------------------------------------------------

# 67. Collection Metadata

Collections may contain:

``` text
Name
Slug
Description
Image/banner
Visibility
Ordering
SEO metadata
```

------------------------------------------------------------------------

# 68. Merchandising Order

Category/collection product ordering may support:

``` text
Manual position
Featured priority
Default sort
```

The business should explicitly choose where manual merchandising is
required.

------------------------------------------------------------------------

# 69. Manual Product Ordering

If manual ordering is used, store the ordering server-side.

Do not rely on array order returned from arbitrary database queries.

------------------------------------------------------------------------

# 70. Product Badges

Potential badges:

``` text
New
Bestseller
Sale
Festive
```

Badges should come from authoritative product/merchandising data.

Do not infer a business badge purely from frontend display logic.

------------------------------------------------------------------------

# 71. SEO Interaction

Catalog pages should support the SEO architecture through:

``` text
Stable URLs
Canonical URLs
Metadata
Structured data where appropriate
Sitemap inclusion
Controlled indexing
```

------------------------------------------------------------------------

# 72. Filtered URL SEO

Not every filter combination should automatically become an indexable
page.

The SEO architecture should define which:

``` text
Category pages
Collection pages
Filter combinations
```

are indexable.

------------------------------------------------------------------------

# 73. Canonical URLs

Filtered/parameterized pages may need canonical handling to avoid
duplicate-content problems.

The exact rules belong to the SEO architecture.

------------------------------------------------------------------------

# 74. Sitemap

Public product/category/collection pages that should be indexed should
be eligible for sitemap generation.

Draft/private/wholesale-only pages should not be included unless
explicitly intended.

------------------------------------------------------------------------

# 75. Search Engine Indexing

Internal search-result pages generally should not become the primary SEO
landing-page strategy.

Use curated category/collection pages for important organic discovery
where appropriate.

------------------------------------------------------------------------

# 76. Catalog Security

Public catalog data may be readable.

However, the following must remain protected:

``` text
Wholesale pricing
Private catalog attributes
Internal costs
Supplier information
Admin notes
Inventory operational details not intended for public display
```

------------------------------------------------------------------------

# 77. Catalog API Authorization

Public endpoints should expose only public catalog fields.

Admin endpoints may expose operational information according to
permissions.

Wholesale endpoints/contexts must apply appropriate eligibility.

------------------------------------------------------------------------

# 78. Catalog Serialization

Use dedicated response schemas/serializers for:

``` text
Public product
Wholesale product
Admin product
```

Do not expose the entire database model by default.

------------------------------------------------------------------------

# 79. Catalog Testing

Tests should cover:

``` text
Product visibility
Category listing
Collection listing
Search
Filters
Sorting
Pagination
Wholesale visibility
Retail visibility
Out-of-stock behavior
Slug changes
SEO metadata
Cache isolation
```

------------------------------------------------------------------------

# 80. Search Testing

Search tests should cover:

``` text
Exact match
Partial match
Case differences
No results
Multiple terms
Invalid filters
Large result sets
Wholesale-only products
Retail-only visibility
```

------------------------------------------------------------------------

# 81. Performance Testing

Measure:

``` text
Listing latency
Search latency
Facet latency
Database query count
Cache hit rate
Large-catalog behavior
Concurrent browsing
```

Do not assume performance is acceptable because the development catalog
is small.

------------------------------------------------------------------------

# 82. Search Migration Strategy

If PostgreSQL search becomes insufficient:

``` text
Current:
PostgreSQL-backed discovery

Future:
PostgreSQL authoritative data
        ↓
Search indexing pipeline
        ↓
Dedicated search engine
```

The public API should ideally remain stable while the search
implementation changes behind it.

------------------------------------------------------------------------

# 83. Search Observability

Monitor:

``` text
Search latency
Search errors
No-result rate
Popular queries
Index synchronization failures
Index lag
Cache performance
```

Search analytics should respect privacy requirements.

------------------------------------------------------------------------

# 84. Catalog Definition of Done

Catalog/search functionality is complete when:

-   Taxonomy is defined.
-   Public visibility is enforced.
-   Product/category/collection URLs are stable.
-   Listing APIs are paginated.
-   Filters are validated.
-   Sorting is deterministic.
-   Search is implemented at an appropriate scale.
-   Wholesale visibility is isolated.
-   Pricing is customer-context aware.
-   Database queries are optimized.
-   N+1 behavior is prevented.
-   SEO interaction is defined.
-   Caching does not leak personalized data.
-   Search/index failures are observable.
-   Tests cover important discovery paths.

------------------------------------------------------------------------

# 85. AI Agent Catalog/Search Rules

Antigravity must not:

-   Duplicate products to represent merchandising collections.
-   Trust frontend visibility flags.
-   Return wholesale products to retail users.
-   Return wholesale prices to retail users.
-   Filter large datasets in application memory unnecessarily.
-   Build raw SQL from search input.
-   Allow arbitrary page sizes.
-   Create unstable pagination without a reason.
-   Hard-code bestseller/new-arrival product IDs into frontend code.
-   Treat search indexes as the authoritative source of
    pricing/inventory.
-   Cache wholesale responses for retail users.
-   Make every filter combination indexable by default.
-   Delete or change public slugs without considering
    redirects/canonical behavior.

------------------------------------------------------------------------

# 86. Catalog/Search Change Workflow

Changes should follow:

``` text
Catalog requirement
   ↓
Domain/taxonomy review
   ↓
API/query design
   ↓
Database/index review
   ↓
SEO review
   ↓
Implementation
   ↓
Query-performance testing
   ↓
Retail/wholesale security testing
   ↓
Staging verification
   ↓
Production monitoring
```

------------------------------------------------------------------------

# 87. Catalog/Search Architecture Summary

``` text
                       Product Data
                            |
              ┌─────────────┼─────────────┐
              ↓             ↓             ↓
           Category      Collection     Search
              |             |             |
              └─────────────┼─────────────┘
                            ↓
                     Catalog Query API
                            |
              ┌─────────────┼─────────────┐
              ↓             ↓             ↓
           Filters        Sort         Pagination
              \             |             /
               \            |            /
                     Product Listing
                            |
                    Customer Context
                     /             \
                  Retail         Wholesale
                     \             /
                      Pricing/Visibility
                            |
                        Frontend
```

The fundamental rule is:

``` text
PostgreSQL/domain data remains authoritative.
Catalog/search is a discovery layer.
Search indexes are derived.
Customer context controls visibility and pricing.
SEO uses stable curated catalog URLs.
```

------------------------------------------------------------------------

# 88. Next Document

The next document should be:

``` text
24-customer-account-architecture.md
```

It will define:

-   Customer registration.
-   Authentication/account lifecycle.
-   Guest-to-account transition.
-   Customer profiles.
-   Addresses.
-   Saved preferences.
-   Order history.
-   Wishlist if included.
-   Retail/wholesale account states.
-   Account security.
-   Password/reset flows where applicable.
-   Session/security boundaries.
-   Personal-data protection.
-   Customer APIs.
-   Account deletion/deactivation.
-   Admin customer operations.
-   Notifications and preferences.
