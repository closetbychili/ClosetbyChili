# Closet by Chilli --- SEO & Performance Architecture

## 1. Purpose

This document defines the SEO and performance architecture for Closet by
Chilli.

The storefront must be:

``` text
Search-engine friendly
Fast on mobile
Fast on desktop
Accessible
Stable under realistic traffic
Optimized for commerce
```

SEO and performance are treated as architectural concerns, not
post-launch polish.

------------------------------------------------------------------------

# 2. Core Principles

The storefront should follow:

``` text
Semantic HTML
Server-first rendering where appropriate
Minimal client JavaScript
Optimized images
Stable URLs
Structured metadata
Fast API responses
Efficient database queries
Controlled caching
Measured performance
```

------------------------------------------------------------------------

# 3. SEO Architecture

SEO must cover:

``` text
Homepage
Category pages
Collection pages
Product pages
Informational pages
Wholesale pages where appropriate
```

Private account and administrative pages must not be indexed.

------------------------------------------------------------------------

# 4. Search Engine Indexability

Indexable pages should be intentionally selected.

Typical public indexable pages:

``` text
/
 /categories/...
 /collections/...
 /products/...
 /about
 /contact
 /shipping
 /returns
```

The exact URL structure will follow the approved frontend architecture.

------------------------------------------------------------------------

# 5. Non-Indexable Pages

Pages that should generally not be indexed include:

``` text
/cart
/checkout
/account
/account/orders
/account/addresses
/admin
Authentication flows
Internal utility pages
```

The final policy should be implemented consistently using metadata and
robots rules.

------------------------------------------------------------------------

# 6. URL Strategy

URLs should be:

``` text
Stable
Readable
Lowercase
Descriptive
Canonical
```

Prefer:

``` text
/products/floral-embroidered-kurti
/categories/kurtis
/collections/festive-collection
```

Avoid:

``` text
/products?id=123
/category?x=abc
```

as the primary public URL representation.

------------------------------------------------------------------------

# 7. Product Slugs

Products should have stable SEO-friendly slugs.

Example:

``` text
floral-embroidered-kurti
```

A slug should not change merely because product metadata changes.

If a slug must change, the old URL should be redirected appropriately.

------------------------------------------------------------------------

# 8. Category Slugs

Categories should also use stable slugs.

Examples:

``` text
kurtis
kurta-sets
dresses
anarkali-sets
dupattas
bottom-wear
```

------------------------------------------------------------------------

# 9. Collection Slugs

Collections should use readable stable slugs.

Examples:

``` text
new-arrivals
bestsellers
festive-collection
2-piece-sets
3-piece-sets
co-ord-sets
```

------------------------------------------------------------------------

# 10. Canonical URLs

Every indexable page should have a canonical URL.

This is particularly important for:

``` text
Filtered product listings
Sorted listings
Search pages
Tracking parameters
Alternative URL paths
```

The canonical should point to the preferred public URL.

------------------------------------------------------------------------

# 11. Query Parameters

Query parameters used for:

``` text
Filters
Sorting
Tracking
Pagination
```

must not accidentally create thousands of duplicate indexable URLs.

The SEO strategy for each parameter type should be explicit.

------------------------------------------------------------------------

# 12. Pagination

Large catalog pages may require pagination.

Pagination should:

``` text
Remain crawlable where appropriate
Have stable URLs
Avoid duplicate canonical conflicts
```

The exact implementation should be aligned with the catalog UX and SEO
goals.

------------------------------------------------------------------------

# 13. Product Metadata

Each product page should provide appropriate:

``` text
Title
Meta description
Canonical URL
Open Graph metadata
Social preview metadata
Structured data
```

Metadata should be generated from product data rather than duplicated
manually in components.

------------------------------------------------------------------------

# 14. Category Metadata

Category pages should have metadata appropriate to their merchandising
purpose.

For example:

``` text
Kurtis
Kurta Sets
Dresses
Anarkali Sets
Dupattas
Bottom Wear
```

Metadata should remain human-readable and commercially relevant.

------------------------------------------------------------------------

# 15. Homepage Metadata

The homepage should have:

``` text
Unique title
Unique description
Canonical URL
Open Graph metadata
Relevant brand information
```

Avoid keyword stuffing.

------------------------------------------------------------------------

# 16. Title Strategy

Titles should be:

``` text
Unique
Descriptive
Readable
Relevant to search intent
```

Do not generate titles by mechanically concatenating every available
attribute.

------------------------------------------------------------------------

# 17. Meta Description Strategy

Descriptions should:

``` text
Describe the page
Communicate relevant value
Remain readable
Avoid duplication
```

They should not be treated as a ranking-keyword dumping field.

------------------------------------------------------------------------

# 18. Open Graph

Public pages should provide appropriate Open Graph metadata.

Potential fields:

``` text
og:title
og:description
og:image
og:url
og:type
```

Product pages should use an appropriate product image.

------------------------------------------------------------------------

# 19. Social Sharing

Where appropriate, provide social metadata for:

``` text
Products
Collections
Campaign pages
Homepage
Editorial/content pages
```

The image strategy should use optimized media assets.

------------------------------------------------------------------------

# 20. Structured Data

Structured data should be implemented using appropriate Schema.org
vocabulary where applicable.

Potential types include:

``` text
Organization
WebSite
BreadcrumbList
Product
Offer
ItemList
```

Only use structured data that accurately represents visible/valid page
information.

------------------------------------------------------------------------

# 21. Product Structured Data

Product pages should expose appropriate product information where
supported.

Potential information:

``` text
Product name
Images
Description
SKU/identifier where appropriate
Brand
Offers
Price
Currency
Availability
```

Structured data must reflect authoritative backend values.

------------------------------------------------------------------------

# 22. Offer Data

Price and availability in structured data must not be hard-coded.

They should come from the same authoritative product/pricing data used
by the application.

------------------------------------------------------------------------

# 23. Breadcrumbs

Breadcrumb navigation should be considered for:

``` text
Category
Collection
Product
```

Breadcrumbs improve usability and can support structured data.

------------------------------------------------------------------------

# 24. XML Sitemap

The production storefront should expose an XML sitemap.

It should include appropriate public indexable URLs such as:

``` text
Homepage
Categories
Collections
Products
Public informational pages
```

Do not include:

``` text
Cart
Checkout
Account
Admin
Private utility URLs
```

------------------------------------------------------------------------

# 25. Sitemap Generation

The sitemap should be generated from authoritative application data.

It should not require manual editing every time a product is created.

------------------------------------------------------------------------

# 26. Sitemap Scale

If the catalog becomes large, sitemap indexes and multiple sitemap files
should be used according to search-engine limits.

The implementation should scale with catalog size.

------------------------------------------------------------------------

# 27. Robots.txt

The production site should provide a robots policy.

It should:

``` text
Permit intended public crawling
Discourage crawling of private/utility areas
Reference the sitemap where appropriate
```

Robots rules are not an authorization mechanism.

------------------------------------------------------------------------

# 28. Robots vs Security

Never rely on `robots.txt` to protect private information.

Security must be enforced through:

``` text
Authentication
Authorization
Server-side access controls
```

------------------------------------------------------------------------

# 29. 404 Pages

The storefront should provide a useful custom 404 page.

It should:

``` text
Clearly indicate the page was not found
Offer useful navigation
Avoid exposing internal errors
Return the correct HTTP status
```

------------------------------------------------------------------------

# 30. Redirect Strategy

Use redirects when public URLs change.

Common use case:

``` text
Old product slug
      ↓
301 redirect
      ↓
New product URL
```

Avoid redirect chains.

------------------------------------------------------------------------

# 31. Removed Products

When a product is discontinued, the SEO behavior should depend on the
business situation.

Possible outcomes:

``` text
Product remains available but out of stock
Product redirects to a relevant replacement
Product returns an appropriate not-found response
```

Do not automatically redirect every removed product to the homepage.

------------------------------------------------------------------------

# 32. Duplicate Content

Avoid duplicate indexable pages caused by:

``` text
Multiple URL forms
Filter combinations
Tracking parameters
Duplicate product paths
Trailing-slash inconsistencies
```

Canonicalization and routing must work together.

------------------------------------------------------------------------

# 33. Rendering Strategy

Next.js rendering should be selected according to page behavior.

For public catalog pages, prefer server-rendered or statically generated
content where practical.

For highly interactive private areas, client-side behavior may be
appropriate.

------------------------------------------------------------------------

# 34. Product Page Rendering

Product pages should prioritize:

``` text
Fast initial HTML
SEO metadata
Product content availability
Optimized images
Minimal client JavaScript
```

Interactive features can hydrate progressively.

------------------------------------------------------------------------

# 35. Category Page Rendering

Category pages should provide meaningful product content in the initial
rendered response where practical.

Avoid requiring a large client-side JavaScript application before search
engines or users can see the catalog.

------------------------------------------------------------------------

# 36. Homepage Rendering

The homepage should prioritize the most important visible content.

The approved homepage hierarchy includes:

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

The implementation should preserve the merchandising intent while
optimizing loading behavior.

------------------------------------------------------------------------

# 37. JavaScript Strategy

Do not ship client JavaScript for functionality that can be rendered on
the server.

Use client components when they provide actual interactivity such as:

``` text
Variant selection
Cart interaction
Filters
Search interaction
Image galleries
Account interactions
```

------------------------------------------------------------------------

# 38. Bundle Size

Frontend dependencies should be kept minimal.

Before adding a dependency, consider:

``` text
Bundle size
Runtime cost
Maintenance
Security
Whether native/Next.js functionality is sufficient
```

------------------------------------------------------------------------

# 39. Code Splitting

Interactive functionality should be loaded only where required.

Use appropriate code splitting/lazy loading for:

``` text
Large interactive widgets
Non-critical dialogs
Heavy third-party integrations
Administrative-only functionality
```

------------------------------------------------------------------------

# 40. Image Optimization

Fashion e-commerce is highly image-dependent.

Images must be optimized for:

``` text
File size
Dimensions
Format
Quality
Responsive delivery
Loading priority
```

------------------------------------------------------------------------

# 41. Image Formats

Use modern image formats where supported by the delivery stack.

The application should avoid serving unnecessarily large original images
to mobile users.

------------------------------------------------------------------------

# 42. Responsive Images

Images should adapt to the rendered dimensions.

Avoid:

``` text
Desktop-sized image
        ↓
Downloaded unchanged
        ↓
Displayed in tiny mobile card
```

------------------------------------------------------------------------

# 43. Product Image Variants

The media strategy should support appropriate variants such as:

``` text
Thumbnail
Product card
Product detail
Zoom/detail
Social/marketing
```

The exact image transformation pipeline belongs to the media
architecture.

------------------------------------------------------------------------

# 44. Image Dimensions

Image dimensions should be known wherever possible.

This helps reduce layout shifts.

Do not rely on unknown image dimensions for critical storefront content.

------------------------------------------------------------------------

# 45. Above-the-Fold Images

Critical above-the-fold imagery should be prioritized appropriately.

Do not lazy-load the primary visual if doing so significantly harms
perceived loading performance.

------------------------------------------------------------------------

# 46. Lazy Loading

Below-the-fold images should generally use lazy loading.

Examples:

``` text
Lower product cards
Secondary homepage sections
Below-fold editorial imagery
```

------------------------------------------------------------------------

# 47. Hero Images

Hero imagery requires special treatment because it often contributes
strongly to LCP.

The implementation should:

``` text
Use the correct responsive size
Avoid unnecessary client-side loading
Avoid excessive compression
Prioritize only the actual LCP asset
```

------------------------------------------------------------------------

# 48. Fonts

Font loading should be optimized.

Prefer:

``` text
Limited font families
Limited weights
Appropriate font-display behavior
Self-hosting or optimized framework delivery where appropriate
```

Avoid loading many unused weights.

------------------------------------------------------------------------

# 49. Layout Stability

The storefront should minimize Cumulative Layout Shift.

Common causes to prevent:

``` text
Images without dimensions
Late-loading banners
Font swaps
Dynamic content without reserved space
Unexpected product-card resizing
```

------------------------------------------------------------------------

# 50. Core Web Vitals

Performance monitoring should consider:

``` text
LCP
INP
CLS
```

These should be measured on realistic mobile and desktop conditions.

------------------------------------------------------------------------

# 51. Largest Contentful Paint

Improve LCP by focusing on:

``` text
Critical HTML
Critical hero/product image
Server response time
Font loading
CSS delivery
Client JavaScript
```

------------------------------------------------------------------------

# 52. Interaction to Next Paint

Improve INP by reducing:

``` text
Main-thread JavaScript
Large event handlers
Unnecessary hydration
Expensive filtering
Heavy client-side rendering
```

------------------------------------------------------------------------

# 53. Cumulative Layout Shift

Improve CLS through:

``` text
Known image dimensions
Reserved UI space
Stable fonts
Predictable dynamic content
```

------------------------------------------------------------------------

# 54. API Performance

The frontend depends heavily on the Django API.

API performance should prioritize:

``` text
Fast catalog reads
Efficient filtering
Efficient product detail queries
Fast cart operations
Reliable checkout operations
```

------------------------------------------------------------------------

# 55. Database Query Performance

Catalog queries should use:

``` text
Appropriate indexes
select_related
prefetch_related
Efficient filtering
Pagination
Bounded result sets
```

Avoid loading unnecessary columns/relationships.

------------------------------------------------------------------------

# 56. N+1 Prevention

Product listings must be reviewed for N+1 behavior.

Example:

``` text
Products
  + variants
  + images
  + categories
```

should use appropriate query planning rather than issuing one query per
related object.

------------------------------------------------------------------------

# 57. API Response Size

Do not return large payloads when the UI needs only a subset of fields.

For example:

``` text
Product card
```

should not necessarily receive every product description, audit field,
inventory record, and administrative attribute.

------------------------------------------------------------------------

# 58. Pagination and Infinite Scroll

Catalog UX may use:

``` text
Pagination
Load more
Infinite scroll
```

The implementation should preserve crawlability and reasonable
performance.

Do not load hundreds of products into the browser unnecessarily.

------------------------------------------------------------------------

# 59. Search Performance

Search should remain responsive under realistic catalog size.

Monitor:

``` text
Search latency
Result count
Database load
No-result rate
```

If search requirements become more advanced, a dedicated search solution
may be evaluated later.

------------------------------------------------------------------------

# 60. Caching Strategy

Appropriate public data may be cached.

Candidates:

``` text
Categories
Collections
Public CMS content
Public product data where safe
```

Do not allow stale cache to create incorrect:

``` text
Price
Inventory
Payment
Order
```

states.

------------------------------------------------------------------------

# 61. Cache Invalidation

Cache invalidation must be tied to content/catalog changes where
appropriate.

Examples:

``` text
Product updated
    ↓
Invalidate product cache

Category changed
    ↓
Invalidate category/listing cache
```

------------------------------------------------------------------------

# 62. Server Response Performance

Measure backend performance separately from frontend rendering.

Break down:

``` text
DNS/network
TLS
Server response
Database
External providers
Frontend rendering
JavaScript execution
Images
```

This prevents treating every performance problem as a frontend problem.

------------------------------------------------------------------------

# 63. Third-Party Scripts

Third-party scripts should be minimized.

Examples:

``` text
Analytics
Marketing
Chat
Reviews
Payment
```

Every third-party script should have a business reason.

------------------------------------------------------------------------

# 64. Third-Party Loading

Non-critical third-party scripts should not block the critical rendering
path.

Load them according to their actual necessity.

------------------------------------------------------------------------

# 65. Analytics Performance

Analytics must not materially degrade storefront performance.

Use:

``` text
Deferred loading where possible
Minimal scripts
Appropriate sampling
```

------------------------------------------------------------------------

# 66. Performance Budgets

The project should establish measurable budgets.

Potential categories:

``` text
JavaScript bundle size
Initial page weight
Image weight
API latency
Database query count
LCP
INP
CLS
```

Exact numerical thresholds should be established after baseline
measurement rather than arbitrarily imposed before implementation.

------------------------------------------------------------------------

# 67. Performance Testing

Performance testing should include:

``` text
Homepage
Category page
Product page
Search
Cart
Checkout
```

Test both:

``` text
Mobile
Desktop
```

------------------------------------------------------------------------

# 68. Realistic Catalog Testing

Performance must be tested with realistic product volumes.

Do not validate catalog performance using only:

``` text
5 products
2 categories
1 image each
```

Use representative:

``` text
Product count
Variant count
Images
Categories
Collections
Filters
```

------------------------------------------------------------------------

# 69. Load Testing

Before major production launch, perform controlled load testing where
appropriate.

Measure:

``` text
Requests per second
Latency
Error rate
Database utilization
Connection usage
```

Do not run aggressive load tests against production without explicit
authorization.

------------------------------------------------------------------------

# 70. Performance Regression Testing

Performance should be checked after major changes to:

``` text
Catalog queries
Product cards
Homepage
Images
API serializers
Database indexes
Search
Checkout
Third-party integrations
```

------------------------------------------------------------------------

# 71. Accessibility and Performance

Accessibility and performance should reinforce each other.

Examples:

``` text
Semantic HTML
Efficient DOM
Predictable layout
Keyboard-friendly controls
Proper image alt text
```

Do not sacrifice accessibility for superficial performance gains.

------------------------------------------------------------------------

# 72. SEO + Performance Definition of Done

A public storefront feature is complete when:

-   Correct indexability is defined.
-   Metadata is implemented.
-   Canonical behavior is correct.
-   URLs are stable.
-   Structured data is valid where applicable.
-   Images are optimized.
-   Client JavaScript is justified.
-   Performance is measured.
-   Mobile behavior is verified.
-   Accessibility is considered.
-   No significant SEO regression is introduced.

------------------------------------------------------------------------

# 73. AI Agent SEO/Performance Rules

Antigravity must not:

-   Add `noindex` to public pages without approval.
-   Expose private pages to search engines.
-   Create unstable product URLs.
-   Hard-code product prices into SEO metadata.
-   Generate misleading structured data.
-   Load huge original images unnecessarily.
-   Add large dependencies for trivial functionality.
-   Disable image optimization without documented justification.
-   Add third-party scripts without a documented business reason.
-   Ignore Core Web Vitals regressions.
-   Optimize a metric at the expense of actual user experience.

------------------------------------------------------------------------

# 74. SEO/Performance Review Workflow

For significant storefront changes:

``` text
Feature
  ↓
SEO impact review
  ↓
Performance impact review
  ↓
Implementation
  ↓
Automated tests
  ↓
Lighthouse/real performance checks where appropriate
  ↓
Mobile verification
  ↓
Production monitoring
```

------------------------------------------------------------------------

# 75. SEO & Performance Architecture Summary

``` text
                    Next.js Storefront
                           |
          ┌────────────────┼────────────────┐
          ↓                ↓                ↓
        SEO             Rendering       Performance
          |                |                |
     Metadata          Server-first      Images
     Canonicals        Hydration          Bundles
     Sitemap           Routing            Caching
     Structured data   Data fetching      API/DB
          |                |                |
          └────────────────┼────────────────┘
                           ↓
                    Fast, indexable,
                    accessible storefront
```

The goal is not merely to achieve a good synthetic score.

The goal is a storefront that:

``` text
Loads quickly
Works reliably
Ranks correctly
Converts customers
Scales with the catalog
```

------------------------------------------------------------------------

# 76. Next Document

The next document should be:

``` text
17-media-image-strategy.md
```

It will define the e-commerce media architecture, including:

-   Product image lifecycle.
-   Uploads.
-   Storage.
-   Image variants.
-   Naming.
-   Optimization.
-   CDN delivery.
-   Responsive images.
-   Product galleries.
-   Hero/banner media.
-   Admin media management.
-   Validation.
-   Image replacement/deletion.
-   Alt text.
-   Media permissions.
-   Storage lifecycle.
-   AI-agent rules for media handling.
