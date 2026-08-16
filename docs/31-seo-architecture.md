# Closet by Chilli --- SEO Architecture

## 1. Purpose

This document defines the search-engine optimization architecture for
Closet by Chilli.

The SEO system should make the public storefront discoverable while
preserving:

``` text
Canonical URLs
Indexability control
Structured data
Performance
Catalog correctness
Privacy
```

------------------------------------------------------------------------

# 2. SEO Principles

The platform follows:

``` text
Stable URLs
Unique useful content
Canonicalization
Controlled indexability
Semantic metadata
Structured data
Fast rendering
Search-engine-friendly navigation
```

SEO must not override:

``` text
Authorization
Wholesale privacy
Product availability rules
Security
Commerce correctness
```

------------------------------------------------------------------------

# 3. SEO Architecture

Conceptually:

``` text
Catalog Data
    ↓
Next.js Page
    ↓
Metadata
    ↓
Structured Data
    ↓
Canonical URL
    ↓
Sitemap / Robots
    ↓
Search Engine
```

------------------------------------------------------------------------

# 4. SEO Scope

Primary public SEO surfaces include:

``` text
Homepage
Category pages
Collection pages
Product pages
```

The final indexability strategy should be explicitly defined for each
route type.

------------------------------------------------------------------------

# 5. Homepage SEO

The homepage should have:

``` text
Unique title
Unique meta description
Canonical URL
Relevant structured data where appropriate
Open Graph metadata
```

The homepage should represent the Closet by Chilli brand and primary
storefront offering.

------------------------------------------------------------------------

# 6. Product SEO

Each indexable product page should have:

``` text
Unique title
Unique description/meta description
Canonical URL
Product structured data
Open Graph metadata
Relevant product content
```

------------------------------------------------------------------------

# 7. Category SEO

Category pages such as:

``` text
Kurtis
Kurta Sets
Dresses
Anarkali Sets
Dupattas
Bottom Wear
```

should have unique SEO metadata and useful category content.

------------------------------------------------------------------------

# 8. Collection SEO

Merchandising collections such as:

``` text
New Arrivals
Bestsellers
Festive Collection
2-Piece Sets
3-Piece Sets
Co-ord Sets
```

may be indexable landing pages when they contain meaningful, stable
content.

------------------------------------------------------------------------

# 9. Public URL Structure

Use stable, human-readable URLs.

Conceptually:

``` text
/
 /products/{slug}
 /categories/{slug}
 /collections/{slug}
```

The exact route structure should remain consistent with the frontend
architecture.

------------------------------------------------------------------------

# 10. Slug Design

Slugs should be:

``` text
Readable
Lowercase
Stable
URL-safe
Unique
```

Avoid unnecessary identifiers in public URLs.

------------------------------------------------------------------------

# 11. Slug Changes

Public slug changes must account for the old URL.

Conceptually:

``` text
Old URL
   ↓
Permanent redirect
   ↓
New URL
```

Do not silently abandon previously indexed URLs.

------------------------------------------------------------------------

# 12. Canonical URLs

Every indexable page should have a clear canonical URL.

Canonicalization helps prevent duplicate URL representations from
competing in search engines.

------------------------------------------------------------------------

# 13. Filtered URLs

Catalog filters can create many URL combinations:

``` text
?size=M
?color=blue
?price=...
```

Not every combination should automatically be indexable.

The architecture should explicitly determine:

``` text
Indexable landing pages
Non-indexable filter states
Canonical behavior
```

------------------------------------------------------------------------

# 14. Filter SEO Strategy

For most dynamic filter combinations:

``` text
Useful for user navigation
≠
Automatically useful as SEO pages
```

Only intentionally curated/filter landing pages should become important
SEO targets.

------------------------------------------------------------------------

# 15. Search Result Pages

Internal search pages should generally not become the primary SEO
landing-page strategy.

Curated:

``` text
Category
Collection
Product
```

pages should provide the primary organic discovery surfaces.

------------------------------------------------------------------------

# 16. Pagination SEO

Large category/collection listings need consistent pagination behavior.

Pagination should not create conflicting canonical URLs.

The final strategy should be implemented consistently across the
storefront.

------------------------------------------------------------------------

# 17. Product Availability

Product pages should reflect actual product availability.

If a product becomes temporarily unavailable, determine whether the page
should:

``` text
Remain indexable
Show unavailable state
Redirect
Be removed
```

based on the expected lifecycle.

Do not automatically delete product URLs whenever stock reaches zero.

------------------------------------------------------------------------

# 18. Archived Products

Archived products require an explicit SEO policy.

Possible behavior:

``` text
Keep page
Redirect
Return not found
```

The correct choice depends on whether the product has continuing search
value and an appropriate replacement.

------------------------------------------------------------------------

# 19. Out-of-Stock Products

Out-of-stock does not automatically mean:

``` text
No page
No index
```

The SEO policy should distinguish:

``` text
Temporarily out of stock
Permanently discontinued
```

------------------------------------------------------------------------

# 20. Product Structured Data

Indexable product pages should support appropriate Product structured
data.

Potential information includes:

``` text
Name
Image
Description
SKU/identifier where appropriate
Brand
Offers
Availability
Price
Currency
```

Only output data that is accurate and publicly appropriate.

------------------------------------------------------------------------

# 21. Structured Data Accuracy

Structured data must match visible page content.

Do not publish structured data containing:

``` text
Incorrect price
Incorrect availability
Wholesale-only pricing
Hidden products
```

------------------------------------------------------------------------

# 22. Retail vs Wholesale SEO

Wholesale-only products/pricing should not leak through public
structured data or public metadata.

The public storefront should expose only information intended for public
search.

------------------------------------------------------------------------

# 23. Offer Data

If price/offer structured data is used, it must represent the public
customer-facing offer.

Do not expose internal or wholesale pricing through SEO metadata.

------------------------------------------------------------------------

# 24. Organization Structured Data

The brand/site may use appropriate organization/brand structured data
where useful.

Information should be accurate and publicly approved.

------------------------------------------------------------------------

# 25. Breadcrumb Structured Data

Product/category pages may expose breadcrumb structured data.

Conceptually:

``` text
Home
  >
Category
  >
Product
```

The breadcrumb hierarchy should match the visible navigation.

------------------------------------------------------------------------

# 26. Breadcrumb UI

Visible breadcrumbs should use the same canonical hierarchy represented
in structured data.

Do not create contradictory breadcrumb structures.

------------------------------------------------------------------------

# 27. Open Graph Metadata

Public pages should support appropriate Open Graph/social metadata.

Potential fields:

``` text
Title
Description
Image
URL
```

------------------------------------------------------------------------

# 28. Social Images

Product/category/collection pages may use appropriate social preview
images.

Images should come from the approved media architecture.

------------------------------------------------------------------------

# 29. Twitter/X Metadata

Where required, social metadata can support the relevant Twitter/X card
format.

Do not add unnecessary provider-specific metadata without a business
need.

------------------------------------------------------------------------

# 30. Metadata Generation

Metadata should be generated from authoritative catalog/content data.

Avoid hard-coding product titles/descriptions in frontend components.

------------------------------------------------------------------------

# 31. Metadata Fallbacks

Where optional metadata is missing, use controlled fallbacks.

For example:

``` text
Product title
→ Product-specific description
→ Category/site fallback
```

Avoid empty or duplicated metadata across large parts of the catalog.

------------------------------------------------------------------------

# 32. Duplicate Metadata

Avoid generating the same:

``` text
Title
Description
```

for hundreds of different products when unique content is available.

------------------------------------------------------------------------

# 33. Title Structure

A consistent title convention should be established.

For example:

``` text
{Product Name} | Closet by Chilli
```

The final brand/title convention should be standardized.

------------------------------------------------------------------------

# 34. Description Structure

Meta descriptions should summarize the actual page/product.

Do not keyword-stuff metadata.

------------------------------------------------------------------------

# 35. Image SEO

Product images should have:

``` text
Meaningful alt text
Appropriate filenames/storage identity where relevant
Optimized dimensions
Fast delivery
```

Image SEO must remain aligned with the media architecture.

------------------------------------------------------------------------

# 36. Image Alt Text

Alt text should describe the visual/product meaning.

Avoid:

``` text
image123.jpg
photo
product image
```

as the only alt text for meaningful product imagery.

------------------------------------------------------------------------

# 37. Sitemap

The application should generate a sitemap containing public indexable
URLs.

Potential entries:

``` text
Homepage
Products
Categories
Collections
```

------------------------------------------------------------------------

# 38. Sitemap Exclusions

Do not include URLs that should not be indexed, such as:

``` text
Admin pages
Account pages
Cart
Checkout
Private wholesale pages
Internal search where policy excludes it
Non-indexable filter URLs
```

------------------------------------------------------------------------

# 39. Dynamic Sitemap

For a dynamic catalog, sitemap generation should be derived from
authoritative catalog data.

Avoid manually maintaining thousands of product URLs.

------------------------------------------------------------------------

# 40. Sitemap Updates

Catalog changes should eventually be reflected in sitemap output.

Potential triggers:

``` text
Product published
Product archived
Category published
Collection published
Slug changed
```

------------------------------------------------------------------------

# 41. Sitemap Scaling

If the catalog grows beyond a single sitemap's practical limits, support
sitemap indexes and multiple sitemap files.

The architecture should not assume a permanently tiny catalog.

------------------------------------------------------------------------

# 42. Robots.txt

The site should provide a controlled robots policy.

The robots configuration should prevent unnecessary crawling of internal
routes while allowing important public catalog pages.

------------------------------------------------------------------------

# 43. Robots vs Authorization

`robots.txt` is not a security mechanism.

Never use robots directives to protect:

``` text
Admin
Customer data
Wholesale private data
Internal APIs
```

Authorization must provide the real protection.

------------------------------------------------------------------------

# 44. Private Routes

Private routes should be protected by authentication/authorization
regardless of search-engine directives.

------------------------------------------------------------------------

# 45. Noindex

Use controlled `noindex` behavior for pages that should be accessible to
users but not indexed.

Potential examples:

``` text
Internal search
Certain filtered pages
Account pages
Checkout
```

The exact list must follow the SEO strategy.

------------------------------------------------------------------------

# 46. Canonical vs Noindex

These serve different purposes.

``` text
Canonical
→ Preferred representative URL

Noindex
→ Do not include this page in search results
```

Do not use them interchangeably without a reason.

------------------------------------------------------------------------

# 47. Redirect Strategy

Redirects should be used for meaningful URL changes such as:

``` text
Slug migration
Product replacement
Category migration
```

Avoid redirect chains.

------------------------------------------------------------------------

# 48. Redirect Chains

Prefer:

``` text
Old URL
   ↓
Current URL
```

instead of:

``` text
Old URL
 ↓
Intermediate URL
 ↓
Another URL
 ↓
Current URL
```

------------------------------------------------------------------------

# 49. Soft 404 Prevention

Pages that have no meaningful content should not remain as misleading
successful pages.

For permanently removed products/categories, use an appropriate
status/redirect strategy.

------------------------------------------------------------------------

# 50. 404 Page

The storefront should provide a useful 404 page.

It may offer:

``` text
Search
Popular categories
Homepage
Featured products
```

Do not return a successful HTTP status for genuinely missing pages
merely for SEO reasons.

------------------------------------------------------------------------

# 51. Error Pages

Error pages should not accidentally become indexable SEO pages.

------------------------------------------------------------------------

# 52. Internal Linking

The storefront should provide useful internal links between:

``` text
Homepage
Categories
Collections
Products
Related products
```

This improves navigation and discovery.

------------------------------------------------------------------------

# 53. Category-to-Product Linking

Category pages should link clearly to their products.

Avoid catalog pages where products are accessible only through
client-side interactions that search engines cannot reliably discover.

------------------------------------------------------------------------

# 54. Collection-to-Product Linking

Collections should provide crawlable product links.

------------------------------------------------------------------------

# 55. Product-to-Category Linking

Product pages should link back to relevant category/collection pages
where appropriate.

------------------------------------------------------------------------

# 56. Breadcrumb Navigation

Breadcrumbs improve:

``` text
User navigation
Site hierarchy
Search-engine understanding
```

They should remain consistent with catalog taxonomy.

------------------------------------------------------------------------

# 57. Crawl Efficiency

Avoid generating massive numbers of low-value URLs through:

``` text
Filters
Sort parameters
Pagination combinations
Tracking parameters
```

------------------------------------------------------------------------

# 58. Tracking Parameters

Campaign parameters such as:

``` text
utm_source
utm_medium
utm_campaign
```

should not create endless duplicate indexable pages.

Canonical/indexing strategy should handle these URLs appropriately.

------------------------------------------------------------------------

# 59. Faceted Navigation

Faceted navigation should balance:

``` text
User discovery
SEO value
Crawl efficiency
```

Not every facet combination needs a crawlable/indexable landing page.

------------------------------------------------------------------------

# 60. Search Engine Rendering

Important product/category content should be available through
server-rendered or search-engine-accessible HTML.

Do not depend entirely on client-only rendering for core catalog
content.

------------------------------------------------------------------------

# 61. Next.js Rendering

Use the Next.js rendering strategy appropriate to the page:

``` text
Server rendering
Static generation
Revalidation
Dynamic rendering
```

The exact choice should follow freshness and personalization
requirements.

------------------------------------------------------------------------

# 62. SEO and Caching

Public SEO pages are strong candidates for caching/revalidation.

However:

``` text
Customer-specific pricing
Wholesale visibility
Cart state
```

must remain isolated from shared public rendering.

------------------------------------------------------------------------

# 63. SEO and Personalization

Do not generate publicly cached SEO pages containing customer-specific
data.

Public SEO pages should represent the public storefront experience.

------------------------------------------------------------------------

# 64. Wholesale SEO

Wholesale-only content should not become publicly discoverable through:

``` text
Sitemap
Structured data
Public metadata
Public catalog APIs
```

unless explicitly intended.

------------------------------------------------------------------------

# 65. SEO and Pricing

Public SEO metadata must use public retail pricing where pricing is
shown.

Never expose:

``` text
Wholesale price
Internal cost
Margin
```

------------------------------------------------------------------------

# 66. SEO and Inventory

Availability metadata should be derived from authoritative
catalog/inventory state.

Do not claim:

``` text
In stock
```

when the public storefront does not actually offer the product.

------------------------------------------------------------------------

# 67. SEO and Promotions

Promotion messaging should not create misleading structured data.

A discount should be represented only when the public offer is actually
valid.

------------------------------------------------------------------------

# 68. Core Web Vitals

SEO/performance work should consider:

``` text
LCP
INP
CLS
```

Product imagery, fonts, JavaScript, and third-party scripts should be
optimized accordingly.

------------------------------------------------------------------------

# 69. LCP

The primary above-the-fold content, especially the homepage hero/product
imagery, should be optimized for fast loading.

Avoid unnecessarily delaying the primary visual.

------------------------------------------------------------------------

# 70. CLS

Reserve appropriate dimensions for:

``` text
Images
Banners
Fonts
Dynamic content
```

to reduce layout shifts.

------------------------------------------------------------------------

# 71. INP

Interactive catalog/filter/cart interfaces should remain responsive.

Avoid large client-side JavaScript tasks that block interaction.

------------------------------------------------------------------------

# 72. Mobile SEO

The storefront should provide a strong mobile experience.

The same core catalog content should remain available across supported
viewport sizes.

------------------------------------------------------------------------

# 73. Mobile Images

Responsive product images should avoid delivering unnecessarily large
assets to mobile devices.

------------------------------------------------------------------------

# 74. SEO Testing

Automated/manual tests should verify:

``` text
Title
Meta description
Canonical
Robots directives
Sitemap
Structured data
Open Graph
HTTP status
Internal links
```

------------------------------------------------------------------------

# 75. Structured Data Testing

Validate structured data for:

``` text
Product
Breadcrumb
Organization where used
```

and verify that values match visible page content.

------------------------------------------------------------------------

# 76. Sitemap Testing

Test that sitemap output contains:

``` text
Expected public URLs
No private/admin URLs
No malformed URLs
No duplicate URLs
```

------------------------------------------------------------------------

# 77. Canonical Testing

Test:

``` text
Product URL
Category URL
Collection URL
Filtered URL
Tracking URL
Redirected old URL
```

to ensure canonical behavior is predictable.

------------------------------------------------------------------------

# 78. Redirect Testing

Test:

``` text
Old slug
New slug
Archived product
Removed category
```

and verify no redirect loops/chains.

------------------------------------------------------------------------

# 79. SEO Monitoring

Monitor:

``` text
Indexed pages
Coverage issues
404s
Redirect errors
Canonical issues
Structured-data errors
Organic traffic
Product visibility
```

------------------------------------------------------------------------

# 80. Search Console

The production site should be connected to the appropriate search-engine
webmaster tooling, such as Google Search Console, for monitoring and
indexing diagnostics.

------------------------------------------------------------------------

# 81. SEO Regression Monitoring

Catalog changes should not unexpectedly cause:

``` text
Mass deindexing
Canonical changes
Broken product URLs
Missing sitemap entries
Incorrect structured data
```

------------------------------------------------------------------------

# 82. SEO and Product Lifecycle

SEO behavior should be defined for:

``` text
Draft
Published
Out of stock
Archived
Discontinued
```

This should be consistent with the product lifecycle.

------------------------------------------------------------------------

# 83. SEO Definition of Done

SEO architecture is complete when:

-   Public URL structure is stable.
-   Product/category/collection metadata is defined.
-   Canonical URLs are generated.
-   Filtered URL behavior is defined.
-   Product structured data is implemented.
-   Breadcrumb structured data is consistent.
-   Open Graph metadata is implemented.
-   Sitemap generation is dynamic.
-   Robots policy is defined.
-   Private routes are protected independently of robots.
-   Redirect strategy is defined.
-   404/removed-product behavior is defined.
-   Wholesale/private information cannot leak through SEO.
-   Core catalog content is search-engine accessible.
-   Core Web Vitals are considered.
-   SEO tests cover metadata, sitemap, structured data, canonical URLs,
    and redirects.
-   Production SEO monitoring is configured.

------------------------------------------------------------------------

# 84. AI Agent SEO Rules

Antigravity must not:

-   Index admin/account/cart/checkout pages accidentally.
-   Expose wholesale-only products through public SEO metadata.
-   Expose wholesale pricing through structured data.
-   Generate every filter combination as an indexable page.
-   Change public slugs without redirect consideration.
-   Return successful status codes for genuinely missing pages.
-   Create redirect chains.
-   Generate structured data that disagrees with visible product data.
-   Treat robots.txt as an access-control mechanism.
-   Put customer-specific data into cached public SEO pages.
-   Hard-code thousands of sitemap URLs.
-   Depend entirely on client-side rendering for critical catalog
    content.
-   Send analytics/tracking parameters into canonical URLs
    unnecessarily.

------------------------------------------------------------------------

# 85. SEO Change Workflow

Changes should follow:

``` text
SEO/business requirement
   ↓
URL/indexability review
   ↓
Catalog/data review
   ↓
Metadata/schema design
   ↓
Implementation
   ↓
Structured-data validation
   ↓
Canonical/redirect tests
   ↓
Sitemap/robots tests
   ↓
Performance verification
   ↓
Staging verification
   ↓
Search monitoring
```

------------------------------------------------------------------------

# 86. SEO Architecture Summary

``` text
                       Public Catalog
                            |
                         Next.js
                            |
             ┌──────────────┼──────────────┐
             ↓              ↓              ↓
          Metadata      Structured Data  Content
             |              |              |
             └──────────────┼──────────────┘
                            ↓
                    Canonical URL Layer
                            |
                  ┌─────────┴─────────┐
                  ↓                   ↓
               Sitemap            Robots
                  |                   |
                  └─────────┬─────────┘
                            ↓
                       Search Engines
```

The fundamental rule is:

``` text
Make valuable public catalog content discoverable.
Keep URLs stable.
Keep canonical/indexing behavior intentional.
Never expose private or wholesale information for SEO.
Structured data must match reality.
Performance is part of SEO.
```

------------------------------------------------------------------------

# 87. Next Document

The next document should be:

``` text
32-payment-architecture.md
```

It will define:

-   Payment architecture.
-   Payment provider integration.
-   Payment intent/order relationship.
-   Checkout-to-payment lifecycle.
-   Server-side payment verification.
-   Webhook processing.
-   Idempotency.
-   Payment states.
-   Failed/pending payments.
-   Refunds.
-   Partial refunds.
-   Payment reconciliation.
-   Signature verification.
-   Amount/currency verification.
-   Payment security.
-   Guest vs authenticated checkout.
-   Payment timeout/retry handling.
-   Admin payment operations.
-   Financial auditability.
