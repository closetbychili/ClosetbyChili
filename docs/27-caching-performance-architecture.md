# Closet by Chilli --- Caching & Performance Architecture

## 1. Purpose

This document defines the caching and performance architecture for
Closet by Chilli.

The objective is to keep the storefront fast while preserving:

``` text
Correctness
Security
Personalization
Inventory accuracy
Pricing accuracy
Wholesale isolation
```

Performance optimizations must never weaken authorization or commercial
correctness.

------------------------------------------------------------------------

# 2. Performance Principles

The platform follows:

``` text
Measure first
Cache selectively
Keep authoritative data authoritative
Avoid unnecessary network requests
Avoid N+1 database queries
Optimize images
Use asynchronous processing
Protect personalized data
Design for graceful degradation
```

------------------------------------------------------------------------

# 3. Performance Layers

The platform can have multiple performance layers:

``` text
Browser
   ↓
Next.js
   ↓
CDN
   ↓
Django API
   ↓
Cache
   ↓
PostgreSQL
   ↓
Supabase Storage
```

Not every request needs every layer.

------------------------------------------------------------------------

# 4. Performance Budget

Production should define measurable budgets for:

``` text
Initial page load
Largest contentful image/content
API response latency
Database query time
JavaScript bundle size
Image weight
Checkout interaction latency
```

Exact numerical budgets should be established after baseline
measurements.

------------------------------------------------------------------------

# 5. Frontend Performance

The Next.js storefront should prioritize:

``` text
Server rendering where beneficial
Minimal client JavaScript
Code splitting
Optimized images
Lazy loading
Streaming where appropriate
Efficient data fetching
```

Avoid turning the entire storefront into a client-rendered application
unnecessarily.

------------------------------------------------------------------------

# 6. Server vs Client Components

Use server-side rendering/server components for content that does not
require browser interactivity.

Use client components for:

``` text
Cart interactions
Filters requiring local interaction
Checkout forms
Account interactions
Interactive UI
```

Keep client boundaries as small as practical.

------------------------------------------------------------------------

# 7. Catalog Rendering

Public catalog/category/collection pages are strong candidates for
caching/revalidation because their content is often shared.

However:

``` text
Personalized pricing
Wholesale visibility
Customer-specific data
```

must be isolated from public cached content.

------------------------------------------------------------------------

# 8. Product Detail Rendering

Product detail pages may use cached/revalidated public product data.

Dynamic information such as:

``` text
Customer-specific pricing
Real-time availability
Cart state
```

must be resolved using the appropriate authoritative context.

------------------------------------------------------------------------

# 9. Static Assets

Static frontend assets should be served through the CDN.

Examples:

``` text
JavaScript
CSS
Fonts
Public icons
Versioned assets
```

Use immutable/versioned asset names where possible.

------------------------------------------------------------------------

# 10. CDN Caching

Public assets should use long cache lifetimes when they are immutable.

Avoid changing content at the same URL without an appropriate
invalidation/versioning strategy.

------------------------------------------------------------------------

# 11. Product Image Caching

Product images should be CDN/cache friendly.

The media architecture should prefer:

``` text
Versioned object path
+
Long-lived cache
```

over frequently overwriting the same object URL.

------------------------------------------------------------------------

# 12. Browser Caching

The browser may cache:

``` text
Static assets
Public images
Other explicitly cacheable public resources
```

Private customer/account responses must not be treated as public
browser-cache content.

------------------------------------------------------------------------

# 13. Personalized Data

Personalized responses include:

``` text
Customer-specific price
Wholesale price
Cart
Wishlist
Account information
Order history
```

These must not enter a shared public cache.

------------------------------------------------------------------------

# 14. Retail vs Wholesale Cache Isolation

If caching responses that vary by customer/business type:

``` text
Retail cache
Wholesale cache
```

must be isolated.

A wholesale response must never become a retail response through cache
reuse.

------------------------------------------------------------------------

# 15. Customer-Specific Cache Keys

If customer-specific caching is required, cache keys must include the
correct authorization/context boundary.

However, avoid caching sensitive customer responses unless there is a
clear performance benefit and strong isolation.

------------------------------------------------------------------------

# 16. Django API Caching

Django API caching may be used for appropriate read-heavy data such as:

``` text
Public categories
Public collections
Public merchandising configuration
Safe catalog metadata
```

Do not cache mutable transactional operations such as:

``` text
Checkout
Payment
Order creation
Inventory mutation
```

as ordinary read-cache responses.

------------------------------------------------------------------------

# 17. PostgreSQL as Source of Truth

Caching must never replace PostgreSQL/domain data as the authoritative
source for:

``` text
Orders
Payments
Inventory state
Customer ownership
Product pricing
Wholesale authorization
```

------------------------------------------------------------------------

# 18. Query Optimization Before Caching

Do not use caching to hide inefficient database queries.

First address:

``` text
Missing indexes
N+1 queries
Over-fetching
Poor joins
Unbounded queries
Inefficient filtering
```

Then introduce caching where it provides measurable benefit.

------------------------------------------------------------------------

# 19. N+1 Prevention

Catalog/list APIs should use appropriate ORM loading strategies.

Avoid patterns such as:

``` text
1 query for products
+
1 query per product for category
+
1 query per product for media
```

Use efficient relation loading.

------------------------------------------------------------------------

# 20. Selective Field Loading

Do not load every database field for every endpoint.

For example:

``` text
Product listing
```

does not normally require the entire product detail model.

------------------------------------------------------------------------

# 21. Database Indexes

Indexes should be based on real query patterns.

Potential candidates include:

``` text
Product slug
Publication status
Category relationships
Collection relationships
SKU
Order customer
Order status
Created timestamps
```

The final index set should be verified using query plans and production
workload.

------------------------------------------------------------------------

# 22. Query Plans

Slow queries should be analyzed using PostgreSQL query planning tools.

Measure:

``` text
Execution time
Rows examined
Rows returned
Index usage
Join behavior
```

Do not add indexes blindly.

------------------------------------------------------------------------

# 23. Pagination

Large APIs should paginate.

Never return an unbounded:

``` text
SELECT all rows
```

through a production API.

------------------------------------------------------------------------

# 24. Maximum Page Size

APIs should enforce maximum page sizes.

This protects:

``` text
Database
Application memory
Network bandwidth
Response serialization
```

------------------------------------------------------------------------

# 25. Cursor Pagination

For large/highly dynamic datasets, cursor/keyset pagination should be
considered.

It can improve:

``` text
Consistency
Large-offset performance
Scrolling behavior
```

------------------------------------------------------------------------

# 26. Redis/Distributed Cache

If a distributed cache is required, use an appropriate cache service
such as Redis.

Potential use cases:

``` text
Frequently accessed public data
Rate-limit counters
Short-lived computed data
Background job coordination where appropriate
```

Do not use Redis as the permanent source of truth for commerce records.

------------------------------------------------------------------------

# 27. Cache Key Design

Cache keys should be:

``` text
Deterministic
Versionable
Context-aware
Collision-resistant
```

For example:

``` text
catalog:v1:category:kurtis:page:1
```

The exact production key convention should be standardized.

------------------------------------------------------------------------

# 28. Cache Namespaces

Use clear namespaces such as:

``` text
catalog:
collection:
category:
configuration:
rate_limit:
```

Avoid generic keys that are difficult to invalidate safely.

------------------------------------------------------------------------

# 29. Cache TTL

TTL should depend on data volatility.

Examples:

``` text
Static configuration → long
Category metadata → medium/long
Product merchandising → medium
Inventory → short/no cache
Customer cart → no shared cache
```

Exact TTLs should be validated with real traffic.

------------------------------------------------------------------------

# 30. Cache Invalidation

Invalidate or revalidate caches when authoritative data changes.

Potential triggers:

``` text
Product published
Product archived
Price changed
Category changed
Collection changed
Media changed
Merchandising order changed
```

------------------------------------------------------------------------

# 31. Event-Driven Invalidation

Where useful:

``` text
Domain event
   ↓
Cache invalidation/revalidation
```

This avoids requiring unrelated application code to know every cache
key.

------------------------------------------------------------------------

# 32. Cache Versioning

For major response/schema changes, use versioned cache namespaces.

Example:

``` text
catalog:v1:
catalog:v2:
```

This allows safe deployment without depending entirely on mass cache
deletion.

------------------------------------------------------------------------

# 33. Stale Data

Caching is acceptable only where stale data is acceptable.

Potentially stale:

``` text
Public merchandising
Category descriptions
Collection banners
```

Potentially dangerous to stale-cache:

``` text
Inventory availability at checkout
Payment status
Order status where the customer expects current state
Wholesale authorization
```

------------------------------------------------------------------------

# 34. Inventory Caching

Inventory may be cached for display optimization in limited contexts,
but final checkout/order creation must validate authoritative inventory.

The rule is:

``` text
Displayed availability
≠
Guaranteed availability
```

------------------------------------------------------------------------

# 35. Price Caching

Public product prices may be cached when pricing is uniform for the
relevant audience.

Customer-specific/wholesale prices require context-aware handling.

Final checkout pricing must always be authoritative.

------------------------------------------------------------------------

# 36. Search Caching

Popular public search queries may be cached.

Cache keys must include all relevant:

``` text
Query
Filters
Sort
Pagination
Catalog context
```

Do not cache personalized search results into a public namespace.

------------------------------------------------------------------------

# 37. Facet Caching

Frequently requested public facets may be cached if the catalog changes
relatively infrequently.

Invalidate when the underlying catalog attributes change.

------------------------------------------------------------------------

# 38. Homepage Caching

The homepage contains merchandising content and is a strong candidate
for caching/revalidation.

Potential sections:

``` text
New Arrivals
Categories
2-Piece Sets
3-Piece Sets
Ethnic Dresses
Bestsellers
Festive Collection
```

The homepage should not embed customer-specific account/cart data into a
shared cached response.

------------------------------------------------------------------------

# 39. Dynamic Header Data

A shared cached homepage may still need dynamic:

``` text
Cart count
Customer state
Wishlist state
```

These should be fetched separately or handled through appropriately
isolated client interactions.

------------------------------------------------------------------------

# 40. API Request Deduplication

The frontend should avoid issuing duplicate simultaneous requests for
the same resource unnecessarily.

Use appropriate data-fetching/cache libraries and server-side request
deduplication where available.

------------------------------------------------------------------------

# 41. Prefetching

Prefetch only likely next navigation.

Useful examples:

``` text
Product detail from product card
Category page
Checkout next step
```

Avoid aggressive prefetching that wastes bandwidth on mobile.

------------------------------------------------------------------------

# 42. Lazy Loading

Lazy load content that is not immediately needed.

Examples:

``` text
Below-the-fold images
Secondary gallery images
Non-critical components
```

Do not lazy-load the primary content needed for the initial viewport
unnecessarily.

------------------------------------------------------------------------

# 43. Image Performance

Follow the media architecture:

``` text
Responsive variants
Compression
Modern formats
CDN
Correct dimensions
```

Avoid sending a 2000px image to a 300px product card.

------------------------------------------------------------------------

# 44. Font Performance

Use a limited font set and optimize loading.

Avoid loading many font weights that are not used.

------------------------------------------------------------------------

# 45. JavaScript Bundle Performance

Keep client-side bundles small.

Avoid importing large libraries for functionality that can be
implemented with lightweight/native mechanisms.

------------------------------------------------------------------------

# 46. Third-Party Scripts

Third-party scripts should be treated as performance dependencies.

Examples:

``` text
Analytics
Chat
Marketing pixels
Payment widgets
```

Load them only where necessary and use deferred/appropriate loading.

------------------------------------------------------------------------

# 47. Analytics Performance

Analytics should not block:

``` text
Initial rendering
Checkout
Payment confirmation
```

Important business events should still be reliably recorded through the
appropriate backend architecture.

------------------------------------------------------------------------

# 48. Checkout Performance

Checkout should minimize unnecessary round trips.

Prefer:

``` text
Efficient cart retrieval
Efficient address retrieval
Efficient shipping calculation
Efficient final validation
```

Do not sacrifice correctness merely to reduce one API call.

------------------------------------------------------------------------

# 49. Payment Performance

Payment-provider operations should not be made unnecessarily synchronous
with unrelated frontend rendering.

Payment creation/confirmation must follow the payment architecture.

------------------------------------------------------------------------

# 50. Background Jobs

Use background workers for expensive/non-critical operations such as:

``` text
Image processing
Notifications
Search indexing
Cache revalidation
Reports
Cleanup
```

Do not move critical order/payment state changes into background jobs
merely for perceived performance.

------------------------------------------------------------------------

# 51. Queue Backpressure

Workers should support controlled concurrency.

If an external provider slows down:

``` text
Queue grows
Workers throttle
Retry policy applies
```

Avoid creating an uncontrolled request storm.

------------------------------------------------------------------------

# 52. Rate Limiting

Rate-limit sensitive/high-cost endpoints such as:

``` text
Search
Login
OTP
Coupon validation
Checkout
Media upload
Admin operations
```

Rate limits should be based on endpoint risk and workload.

------------------------------------------------------------------------

# 53. Rate-Limit Storage

Rate-limit counters can use a fast distributed store such as Redis where
appropriate.

They should not become a correctness dependency for financial
operations.

------------------------------------------------------------------------

# 54. Graceful Degradation

When non-critical infrastructure fails, the storefront should remain
usable where possible.

Examples:

``` text
Recommendation service unavailable
→ Show products without recommendations

Analytics unavailable
→ Commerce still works

Email provider unavailable
→ Queue notification

Search index temporarily stale
→ Continue using available catalog data where supported
```

------------------------------------------------------------------------

# 55. Critical Dependencies

Identify dependencies that must be healthy for:

``` text
Login
Catalog
Cart
Checkout
Payment
Order creation
```

These should have stronger monitoring and recovery mechanisms.

------------------------------------------------------------------------

# 56. Availability vs Freshness

Every cached resource should have an intentional trade-off:

``` text
Freshness
vs
Performance
vs
Availability
```

Document this for important resources.

------------------------------------------------------------------------

# 57. Cache Stampede Protection

When a popular cache entry expires, many requests may attempt to
regenerate it simultaneously.

Use appropriate strategies such as:

``` text
Request coalescing
Locking
Stale-while-revalidate
Jittered TTL
```

where needed.

------------------------------------------------------------------------

# 58. Stale-While-Revalidate

Public catalog content can use stale-while-revalidate strategies where
appropriate.

Conceptually:

``` text
Request
  ↓
Serve recent cached value
  ↓
Refresh in background
```

This can improve perceived latency without making every request wait for
regeneration.

------------------------------------------------------------------------

# 59. Cache Warming

Cache warming may be useful for:

``` text
Homepage
Popular categories
Popular collections
High-traffic product pages
```

Do not warm enormous amounts of low-demand data unnecessarily.

------------------------------------------------------------------------

# 60. Cold Start Performance

Production deployment should consider:

``` text
Application startup
Database connection setup
Cache connection
Worker startup
Next.js server startup
```

Avoid architecture that depends on expensive initialization for every
request.

------------------------------------------------------------------------

# 61. Connection Pooling

Django/PostgreSQL connection management should use appropriate
pooling/connection reuse.

The exact production settings depend on deployment infrastructure and
Supabase configuration.

------------------------------------------------------------------------

# 62. Database Connection Limits

Monitor:

``` text
Active connections
Pool utilization
Connection wait time
Database saturation
```

Do not scale application workers without considering database connection
capacity.

------------------------------------------------------------------------

# 63. API Payload Size

Keep API responses appropriately sized.

Avoid returning:

``` text
Unused fields
Large descriptions on listing pages
Full media metadata
Unnecessary nested relationships
```

------------------------------------------------------------------------

# 64. Compression

Use appropriate HTTP compression for text responses.

Static assets should use optimized production formats.

------------------------------------------------------------------------

# 65. Streaming

Streaming may be useful for large/server-rendered pages where it
improves perceived performance.

Do not use streaming simply because it is available.

------------------------------------------------------------------------

# 66. Performance Monitoring

Track:

``` text
Frontend page performance
API latency
Database latency
Cache hit/miss
Queue latency
Storage latency
Search latency
Error rates
```

------------------------------------------------------------------------

# 67. Percentiles

Do not rely only on average latency.

Monitor at least:

``` text
p50
p95
p99
```

for important API/checkout paths.

------------------------------------------------------------------------

# 68. Slow Request Thresholds

Define thresholds for:

``` text
Slow API request
Slow database query
Slow background job
Slow image processing
```

The exact thresholds should be based on measured production behavior.

------------------------------------------------------------------------

# 69. Distributed Tracing

For important workflows, tracing may connect:

``` text
Frontend request
 ↓
Django
 ↓
Database
 ↓
External provider
```

This helps diagnose production latency.

------------------------------------------------------------------------

# 70. Correlation IDs

Requests and background jobs should use correlation/request identifiers
where useful.

This allows operations to trace:

``` text
Customer action
→ API request
→ domain event
→ worker
→ provider
```

without logging sensitive information.

------------------------------------------------------------------------

# 71. Performance Dashboards

Production dashboards should include:

``` text
Homepage latency
Catalog latency
Search latency
Cart latency
Checkout latency
Order creation latency
Database performance
Cache performance
Worker queue depth
```

------------------------------------------------------------------------

# 72. Load Testing

Load tests should model realistic commerce traffic:

``` text
Homepage browsing
Category browsing
Product details
Search
Add to cart
Cart updates
Checkout
```

Do not test only a single endpoint.

------------------------------------------------------------------------

# 73. Concurrency Testing

Test scenarios such as:

``` text
Many users viewing same product
Many users requesting same category
Multiple customers competing for final inventory
Concurrent checkout requests
Cache expiration under traffic
```

------------------------------------------------------------------------

# 74. Database Load Testing

Measure PostgreSQL behavior under realistic:

``` text
Read load
Write load
Checkout contention
Search/filter load
Admin operations
```

------------------------------------------------------------------------

# 75. Cache Failure Testing

Test what happens when the cache is unavailable.

The application should:

``` text
Fail open for safe reads where appropriate
Use authoritative database data
Avoid crashing unnecessarily
```

Do not make cache availability a hidden single point of failure for all
storefront requests.

------------------------------------------------------------------------

# 76. CDN Failure Testing

The platform should understand fallback behavior for CDN failures.

For critical operational functionality, business APIs should not depend
on public image delivery being available.

------------------------------------------------------------------------

# 77. Performance Regression Testing

Track performance across releases.

A feature should not be considered complete if it introduces a
significant unexplained regression in:

``` text
Bundle size
API latency
Database queries
Page load
Checkout latency
```

------------------------------------------------------------------------

# 78. Performance Definition of Done

Performance architecture is complete when:

-   Major performance budgets are defined.
-   Public assets are CDN optimized.
-   Personalized data is isolated from shared caches.
-   Database queries are optimized.
-   N+1 queries are prevented.
-   APIs are paginated.
-   Cache keys are standardized.
-   Cache invalidation is defined.
-   Critical commerce data is not incorrectly cached.
-   Background jobs are used appropriately.
-   Rate limits exist for high-risk/high-cost operations.
-   Monitoring captures p50/p95/p99 latency.
-   Load and concurrency tests exist.
-   Cache/CDN failure behavior is tested.
-   Performance regressions are monitored.

------------------------------------------------------------------------

# 79. AI Agent Performance Rules

Antigravity must not:

-   Add caching without defining invalidation behavior.
-   Cache personalized data in public/shared caches.
-   Cache wholesale responses for retail users.
-   Treat stale inventory as authoritative during checkout.
-   Cache payment/order mutation operations as ordinary reads.
-   Hide N+1 queries behind a cache instead of fixing them.
-   Return unbounded API collections.
-   Add arbitrary database indexes without checking query patterns.
-   Prefetch entire catalogs unnecessarily.
-   Load large images into small UI components.
-   Make external providers synchronous dependencies of critical
    commerce requests without justification.
-   Make Redis/cache the source of truth for orders, payments,
    inventory, or authorization.
-   Assume average latency represents production performance.
-   Optimize performance by weakening security or correctness.

------------------------------------------------------------------------

# 80. Performance Change Workflow

Changes should follow:

``` text
Requirement
   ↓
Baseline measurement
   ↓
Bottleneck identification
   ↓
Architecture/query review
   ↓
Optimization
   ↓
Correctness/security review
   ↓
Load/performance test
   ↓
Regression comparison
   ↓
Staging verification
   ↓
Production monitoring
```

------------------------------------------------------------------------

# 81. Performance Architecture Summary

``` text
                         User
                          |
                         CDN
                          |
                       Next.js
                          |
                    Django API
                    /    |    \
                   /     |     \
               Cache  PostgreSQL  Queue
                         |          |
                         |       Workers
                         |          |
                         |     External Providers
                         |
                    Source of Truth
```

The fundamental rule is:

``` text
Optimize measured bottlenecks.
Cache only data that is safe to cache.
Keep personalized and wholesale data isolated.
Keep PostgreSQL/domain services authoritative.
Never trade commerce correctness or security for speed.
```

------------------------------------------------------------------------

# 82. Next Document

The next document should be:

``` text
28-security-architecture.md
```

It will define:

-   Threat model.
-   Authentication and authorization security.
-   OWASP-oriented API security.
-   Django security controls.
-   Next.js security boundaries.
-   Supabase security.
-   RLS and service-role boundaries.
-   Secrets management.
-   CSRF/CORS.
-   XSS/SQL injection protections.
-   IDOR prevention.
-   Rate limiting.
-   Abuse prevention.
-   Payment security boundaries.
-   Webhook verification.
-   File-upload security.
-   Audit logging.
-   Security headers.
-   Dependency/security scanning.
-   Incident response.
-   Production security checklist.
