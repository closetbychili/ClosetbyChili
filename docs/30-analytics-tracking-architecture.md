# Closet by Chilli --- Analytics & Tracking Architecture

## 1. Purpose

This document defines the analytics and tracking architecture for Closet
by Chilli.

The analytics system should help the business understand:

``` text
Traffic
Product discovery
Catalog engagement
Search behavior
Cart behavior
Checkout behavior
Purchases
Customer acquisition
Campaign attribution
Wholesale activity
```

Analytics must not compromise:

``` text
Customer privacy
Security
Checkout correctness
Performance
Retail/wholesale data isolation
```

------------------------------------------------------------------------

# 2. Analytics Principles

The platform follows:

``` text
Event-driven tracking
Consistent event names
Minimal data collection
No unnecessary PII
Server-authoritative commerce events
Consent-aware marketing tracking
Deduplication
Observable data quality
```

------------------------------------------------------------------------

# 3. Analytics Architecture

Conceptually:

``` text
Customer Interaction
        ↓
Next.js Tracking Layer
        ↓
Analytics Event
        ↓
Analytics Provider

Commerce Domain Event
        ↓
Django Backend
        ↓
Server-side Commerce Event
        ↓
Analytics/Reporting Pipeline
```

Client-side analytics can measure browsing behavior.

Server-side tracking should be authoritative for important commerce
events.

------------------------------------------------------------------------

# 4. Analytics Provider

The initial analytics provider may be Google Analytics 4 or another
approved analytics platform.

The provider should remain behind a tracking abstraction where
practical.

Do not spread provider-specific event calls throughout business logic.

------------------------------------------------------------------------

# 5. Tracking Abstraction

Frontend code should ideally use an internal analytics interface such
as:

``` text
track(event_name, payload)
```

rather than directly coupling every component to a specific provider.

This makes future provider changes easier.

------------------------------------------------------------------------

# 6. Event Naming

Use a consistent event naming convention.

Examples:

``` text
view_item
view_item_list
search
select_item
add_to_cart
remove_from_cart
view_cart
begin_checkout
add_shipping_info
add_payment_info
purchase
refund
```

The final event catalogue should be centrally documented.

------------------------------------------------------------------------

# 7. Event Naming Rules

Event names should be:

``` text
Stable
Lowercase where provider conventions require it
Meaningful
Consistent
Non-duplicative
```

Do not create slightly different names for the same business action.

------------------------------------------------------------------------

# 8. Ecommerce Events

The ecommerce funnel should track:

``` text
Product view
Product-list interaction
Add to cart
Cart view
Checkout start
Shipping information
Payment information
Purchase
```

------------------------------------------------------------------------

# 9. Product View

A product view event may contain safe catalog context such as:

``` text
Product ID
Product name
Category
Price where appropriate
Currency
```

Do not include unnecessary customer identity information.

------------------------------------------------------------------------

# 10. Product List View

Track meaningful product-list impressions where useful.

Potential context:

``` text
List/category
Product identifiers
Position
```

Avoid generating excessive events for every minor browser interaction.

------------------------------------------------------------------------

# 11. Product Selection

When a customer selects a product from a listing:

``` text
select_item
```

may capture:

``` text
Product
List
Position
```

This helps measure merchandising performance.

------------------------------------------------------------------------

# 12. Search Tracking

Search events should capture useful non-sensitive information such as:

``` text
Search term
Result context
```

Do not include sensitive customer information in search analytics.

------------------------------------------------------------------------

# 13. Search Privacy

Search terms can sometimes contain personal information.

The tracking layer should avoid collecting or retaining search content
when it is clearly sensitive or unnecessary.

------------------------------------------------------------------------

# 14. Category Tracking

Track useful category interactions such as:

``` text
Category view
Product selection
```

This helps measure category performance.

------------------------------------------------------------------------

# 15. Collection Tracking

Track interactions with merchandising collections such as:

``` text
New Arrivals
Bestsellers
Festive Collection
```

This helps determine which merchandising areas drive engagement.

------------------------------------------------------------------------

# 16. Homepage Tracking

The homepage may track:

``` text
Section impressions where meaningful
Product selection
Collection selection
Banner/CTA interaction
```

Do not create excessive tracking for every visual element.

------------------------------------------------------------------------

# 17. Add to Cart

Track:

``` text
add_to_cart
```

with safe product/variant context.

The event should reflect the actual successful cart mutation where
possible.

------------------------------------------------------------------------

# 18. Remove from Cart

Track:

``` text
remove_from_cart
```

with appropriate product context.

------------------------------------------------------------------------

# 19. Cart View

Track:

``` text
view_cart
```

when the customer meaningfully opens/views the cart.

------------------------------------------------------------------------

# 20. Checkout Start

Track:

``` text
begin_checkout
```

when the customer actually begins checkout.

Do not trigger this merely because the checkout page component rendered
if the business definition is different.

------------------------------------------------------------------------

# 21. Shipping Information

Where appropriate, track:

``` text
add_shipping_info
```

Do not send unnecessary address details to analytics.

Never send:

``` text
Full street address
Phone number
Email
```

unless there is an explicitly approved privacy-compliant requirement.

------------------------------------------------------------------------

# 22. Payment Information

If:

``` text
add_payment_info
```

is tracked, it must not contain payment credentials.

Only safe categorical information may be included where appropriate.

------------------------------------------------------------------------

# 23. Purchase Event

Purchase tracking is one of the most important analytics events.

Potential data:

``` text
Order ID
Currency
Total value
Items
Quantities
Applicable non-sensitive campaign context
```

The final purchase event should originate from an authoritative order
state.

------------------------------------------------------------------------

# 24. Purchase Deduplication

Purchase events must be idempotent.

The same order must not produce multiple purchase conversions simply
because:

``` text
Customer refreshes confirmation page
Browser retries
Payment callback repeats
Network request retries
```

------------------------------------------------------------------------

# 25. Server-Side Purchase Tracking

The backend should be capable of generating the authoritative purchase
analytics event after the order/payment state is valid.

This is more reliable than relying only on browser execution.

------------------------------------------------------------------------

# 26. Browser vs Server Events

Use:

``` text
Browser/client
→ Discovery and interaction events

Server/backend
→ Authoritative commerce events
```

This separation improves reliability and reduces dependence on browser
behavior.

------------------------------------------------------------------------

# 27. Analytics Event ID

Where supported, assign stable identifiers to important events.

For purchase:

``` text
event_id / transaction_id
```

should allow deduplication across client/server tracking.

------------------------------------------------------------------------

# 28. Refund Tracking

If refund analytics is required, track refunds from authoritative
backend events.

Do not let a customer-controlled browser create a refund analytics
event.

------------------------------------------------------------------------

# 29. Wholesale Analytics

Wholesale behavior should be handled carefully.

Potential business metrics:

``` text
Wholesale application
Wholesale approval
Wholesale order
```

However, wholesale-specific sensitive business information should not be
exposed to public analytics.

------------------------------------------------------------------------

# 30. Retail vs Wholesale Segmentation

Analytics may require a business-context dimension such as:

``` text
customer_type = retail
customer_type = wholesale
```

Only collect this if necessary and approved.

Do not send confidential wholesale attributes.

------------------------------------------------------------------------

# 31. Customer Identity

Avoid sending directly identifying customer information to analytics
providers unless explicitly required and legally/privacy approved.

Do not send:

``` text
Email
Phone
Full address
Authentication identifiers
```

as ordinary analytics parameters.

------------------------------------------------------------------------

# 32. User IDs

If an analytics platform supports user identifiers, use an appropriately
designed pseudonymous identifier only where justified.

Do not use raw sensitive customer information as the identifier.

------------------------------------------------------------------------

# 33. PII Protection

Analytics payloads must be reviewed for accidental PII.

Never send:

``` text
Password
Payment credentials
Authentication token
Full address
Private wholesale documents
Admin notes
```

------------------------------------------------------------------------

# 34. Consent

Marketing/analytics tracking must respect the approved consent model.

If consent management is required:

``` text
Before consent
→ Only permitted tracking

After consent
→ Additional approved tracking
```

The exact consent categories should be finalized with the
privacy/compliance requirements.

------------------------------------------------------------------------

# 35. Essential vs Marketing Tracking

Separate:

``` text
Operational/essential measurement
Marketing/advertising measurement
```

where the platform and applicable requirements require different consent
treatment.

------------------------------------------------------------------------

# 36. Consent State

The frontend tracking layer should know the current consent state before
enabling optional trackers.

Do not rely on individual components to make independent consent
decisions.

------------------------------------------------------------------------

# 37. Analytics Cookies

Analytics cookies/storage should follow the approved consent strategy
and regional requirements.

Do not assume analytics cookies are automatically permitted everywhere.

------------------------------------------------------------------------

# 38. Ad Attribution

If advertising platforms are introduced, attribution tracking should be
implemented through a centralized marketing/tracking layer.

Potential platforms may include:

``` text
Google Ads
Meta
Other approved advertising platforms
```

------------------------------------------------------------------------

# 39. UTM Parameters

Campaign URLs may use:

``` text
utm_source
utm_medium
utm_campaign
utm_term
utm_content
```

The application should preserve relevant attribution context through the
customer journey where appropriate.

------------------------------------------------------------------------

# 40. Attribution Persistence

If attribution is required through checkout, preserve only the necessary
campaign metadata.

Do not store arbitrary URL parameters indefinitely.

------------------------------------------------------------------------

# 41. Attribution Security

Do not trust campaign parameters for:

``` text
Price
Discount
Authorization
Wholesale eligibility
```

They are analytics/marketing context only.

------------------------------------------------------------------------

# 42. Referral Tracking

If referral programs are introduced, referral identifiers must be
validated separately from ordinary analytics attribution.

Analytics data must never grant financial benefits by itself.

------------------------------------------------------------------------

# 43. Conversion Funnel

The core funnel should be measurable:

``` text
Landing
  ↓
Product discovery
  ↓
Product view
  ↓
Add to cart
  ↓
Cart
  ↓
Checkout
  ↓
Payment
  ↓
Purchase
```

------------------------------------------------------------------------

# 44. Funnel Metrics

Potential metrics:

``` text
Product-view rate
Add-to-cart rate
Cart-to-checkout rate
Checkout completion rate
Purchase conversion rate
Average order value
```

The analytics platform should calculate these from consistent events.

------------------------------------------------------------------------

# 45. Product Performance

Track useful product metrics such as:

``` text
Views
Product selections
Add-to-cart count
Purchase count
Revenue
```

Avoid relying on only one metric to determine merchandising success.

------------------------------------------------------------------------

# 46. Category Performance

Potential metrics:

``` text
Category views
Product selections
Add-to-cart rate
Revenue
```

------------------------------------------------------------------------

# 47. Search Performance

Useful search analytics include:

``` text
Search frequency
No-result searches
Search-to-product selection
Search-to-add-to-cart
Search-to-purchase
```

------------------------------------------------------------------------

# 48. No-Result Search Analytics

No-result searches can reveal:

``` text
Missing products
Poor taxonomy
Search relevance problems
Demand opportunities
```

Search analytics should avoid storing sensitive search terms
unnecessarily.

------------------------------------------------------------------------

# 49. Merchandising Analytics

Track important merchandising surfaces such as:

``` text
New Arrivals
Bestsellers
Festive Collection
Homepage categories
Featured products
```

This allows the business to measure merchandising effectiveness.

------------------------------------------------------------------------

# 50. Cart Analytics

Potential cart metrics:

``` text
Cart creation
Add-to-cart rate
Cart abandonment
Average cart value
Items per cart
```

------------------------------------------------------------------------

# 51. Checkout Analytics

Potential metrics:

``` text
Checkout starts
Checkout failures
Payment failures
Checkout completion
Checkout abandonment
```

Failure reasons should come from safe categorical backend data rather
than sensitive error payloads.

------------------------------------------------------------------------

# 52. Payment Analytics

Track high-level payment outcomes:

``` text
Payment initiated
Payment succeeded
Payment failed
Payment cancelled
Refunded
```

Do not send payment credentials or sensitive provider payloads to
analytics.

------------------------------------------------------------------------

# 53. Error Analytics

Track useful application failures such as:

``` text
API errors
Checkout errors
Payment failures
Search errors
```

Use safe error categories.

Do not send stack traces containing sensitive information to analytics.

------------------------------------------------------------------------

# 54. Analytics Event Source

Where useful, identify:

``` text
client
server
admin
```

This can help diagnose duplicate/missing events.

------------------------------------------------------------------------

# 55. Event Metadata

Safe metadata may include:

``` text
Timestamp
Event name
Event ID
Source
Page/path where appropriate
Application version
```

Do not include unnecessary personal information.

------------------------------------------------------------------------

# 56. Application Version

Including an application/build version can help correlate analytics
anomalies with deployments.

------------------------------------------------------------------------

# 57. Event Schema

Every important event should have a documented schema.

Example:

``` text
add_to_cart
{
  item_id
  item_name
  quantity
  price
  currency
}
```

The exact schema should be centrally maintained.

------------------------------------------------------------------------

# 58. Event Schema Versioning

If an important event changes structure, consider:

``` text
Schema version
```

or a controlled migration.

Do not silently change the meaning of an event used in dashboards.

------------------------------------------------------------------------

# 59. Event Validation

Analytics events should be validated before dispatch where practical.

This prevents malformed payloads from spreading across the codebase.

------------------------------------------------------------------------

# 60. Duplicate Events

Common duplicate sources:

``` text
React re-render
Route change
Page refresh
Retry
Client + server tracking
Webhook retry
```

The tracking architecture should explicitly prevent or deduplicate these
cases.

------------------------------------------------------------------------

# 61. Purchase Confirmation Page

Do not rely solely on:

``` text
Purchase confirmation page loaded
```

to represent a completed purchase.

The authoritative order/payment state must determine whether the
purchase occurred.

------------------------------------------------------------------------

# 62. Offline/Failed Analytics

Analytics failure should generally not block commerce operations.

If the analytics provider is unavailable:

``` text
Customer can continue shopping/checkout
```

where possible.

------------------------------------------------------------------------

# 63. Analytics Queueing

Non-critical analytics events may be queued/batched to improve
performance.

Do not delay critical commerce operations waiting for analytics.

------------------------------------------------------------------------

# 64. Analytics Performance

Tracking must have minimal impact on:

``` text
Initial page load
Product browsing
Cart interactions
Checkout
Payment
```

------------------------------------------------------------------------

# 65. Third-Party Script Loading

Analytics scripts should be loaded according to:

``` text
Consent
Performance priority
Required functionality
```

Avoid blocking rendering with unnecessary third-party scripts.

------------------------------------------------------------------------

# 66. Server-Side Analytics

Server-side events may be sent through:

``` text
Background workers
Analytics API
Event pipeline
```

depending on provider capabilities.

------------------------------------------------------------------------

# 67. Analytics Reliability

Server-side analytics should use:

``` text
Retry
Idempotency
Error handling
Observability
```

where the provider supports these patterns.

------------------------------------------------------------------------

# 68. Analytics Failure Isolation

Analytics provider outages must not break:

``` text
Catalog
Cart
Checkout
Payment
Order creation
```

------------------------------------------------------------------------

# 69. Analytics Data Quality

Monitor:

``` text
Event volume
Missing events
Duplicate events
Invalid event parameters
Purchase/event mismatches
Sudden traffic anomalies
```

------------------------------------------------------------------------

# 70. Revenue Reconciliation

Analytics purchase revenue should be periodically compared with
authoritative order/revenue data.

Analytics should not be treated as the financial source of truth.

------------------------------------------------------------------------

# 71. Order-to-Analytics Reconciliation

A useful operational check is:

``` text
Completed orders
        ↕
Purchase analytics events
```

Investigate significant differences.

------------------------------------------------------------------------

# 72. Analytics Observability

Monitor:

``` text
Event delivery success
Provider errors
Event latency
Duplicate rate
Schema validation failures
Purchase tracking discrepancies
```

------------------------------------------------------------------------

# 73. Admin Analytics

The admin panel may expose business reporting based on authoritative
application data.

For financial reporting, prefer:

``` text
PostgreSQL/order data
```

over relying entirely on third-party analytics.

------------------------------------------------------------------------

# 74. Business Reporting

Potential internal reports:

``` text
Sales
Orders
Average order value
Top products
Top categories
Wholesale vs retail performance
Returns/refunds
```

The exact reporting scope should be business-defined.

------------------------------------------------------------------------

# 75. Analytics Data Retention

Analytics retention should follow:

``` text
Provider capabilities
Business requirements
Privacy requirements
```

Do not retain raw tracking data longer than necessary.

------------------------------------------------------------------------

# 76. Data Access

Analytics dashboards should be access-controlled.

Wholesale-sensitive or operational reports should not be available to
ordinary users.

------------------------------------------------------------------------

# 77. Analytics Security

Analytics configuration must not expose:

``` text
Payment secrets
Database credentials
Authentication tokens
Private customer data
```

------------------------------------------------------------------------

# 78. Analytics Testing

Tests should cover:

``` text
Product view
Search
Add to cart
Cart
Checkout
Purchase
Refund
```

and verify correct payloads.

------------------------------------------------------------------------

# 79. Purchase Tracking Tests

Test:

``` text
Successful purchase
Payment retry
Confirmation refresh
Duplicate webhook
Duplicate browser event
Failed payment
Cancelled checkout
```

The expected result is exactly one authoritative purchase conversion for
a completed order.

------------------------------------------------------------------------

# 80. Consent Testing

Test:

``` text
No optional tracking before consent
Tracking after consent
Consent withdrawal
Regional behavior where applicable
```

------------------------------------------------------------------------

# 81. PII Testing

Automated checks should help detect accidental inclusion of:

``` text
Email
Phone
Address
Tokens
Passwords
Payment data
```

in analytics payloads.

------------------------------------------------------------------------

# 82. Analytics Definition of Done

Analytics architecture is complete when:

-   Event naming conventions are defined.
-   Ecommerce events are documented.
-   Client/server event responsibilities are clear.
-   Purchase events are server-authoritative.
-   Duplicate purchase events are prevented.
-   Consent boundaries are defined.
-   PII protection is implemented.
-   UTM attribution is supported where required.
-   Retail/wholesale analytics separation is defined.
-   Analytics failures cannot block commerce.
-   Event schemas are documented.
-   Data quality monitoring exists.
-   Revenue/order reconciliation is possible.
-   Analytics scripts do not materially harm performance.
-   Analytics tests cover critical commerce flows.

------------------------------------------------------------------------

# 83. AI Agent Analytics Rules

Antigravity must not:

-   Send passwords, tokens, payment credentials, or full addresses to
    analytics.
-   Treat analytics events as financial truth.
-   Treat a page refresh as a new purchase.
-   Generate purchase events solely from frontend rendering.
-   Allow analytics parameters to influence price or authorization.
-   Send wholesale-sensitive information to public analytics.
-   Block checkout because analytics failed.
-   Add provider-specific tracking calls throughout business logic
    without using the tracking abstraction.
-   Create inconsistent duplicate event names.
-   Collect arbitrary URL parameters indefinitely.
-   Store unnecessary PII in analytics payloads.

------------------------------------------------------------------------

# 84. Analytics Change Workflow

Changes should follow:

``` text
Business question
   ↓
Event definition
   ↓
Privacy/consent review
   ↓
Schema definition
   ↓
Client/server source decision
   ↓
Implementation
   ↓
Deduplication testing
   ↓
PII testing
   ↓
Provider validation
   ↓
Staging verification
   ↓
Data-quality monitoring
```

------------------------------------------------------------------------

# 85. Analytics Architecture Summary

``` text
                    Customer
                       |
                 Next.js Events
                       |
                Tracking Layer
                       |
              Analytics Provider
                       ^
                       |
             Server-side Events
                       |
                 Django Domain
                       |
               Authoritative Data
                       |
                PostgreSQL/Orders
```

The fundamental rule is:

``` text
Analytics measures the business.
It does not control the business.
Client-side tracking measures behavior.
Server-side events establish authoritative commerce conversions.
Privacy, consent, performance, and data quality are first-class concerns.
```

------------------------------------------------------------------------

# 86. Next Document

The next document should be:

``` text
31-seo-architecture.md
```

It will define:

-   SEO architecture.
-   Next.js metadata.
-   Product/category/collection SEO.
-   Canonical URLs.
-   Structured data.
-   Sitemap architecture.
-   Robots directives.
-   Breadcrumbs.
-   Open Graph/social metadata.
-   Indexability.
-   Pagination SEO.
-   Filtered URL strategy.
-   Product availability/indexing.
-   Redirects.
-   Slug changes.
-   Image SEO.
-   Performance/Core Web Vitals considerations.
-   SEO testing and monitoring.
