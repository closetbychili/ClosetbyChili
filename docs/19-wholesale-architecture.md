# Closet by Chilli --- Wholesale Architecture

## 1. Purpose

This document defines the wholesale architecture for Closet by Chilli.

Closet by Chilli operates as both:

``` text
Retail business
+
Wholesale business
```

The platform must support both models without duplicating the entire
commerce system.

The preferred architecture is:

``` text
Shared commerce foundation
        +
Wholesale-specific eligibility, pricing, and workflows
```

------------------------------------------------------------------------

# 2. Wholesale Principles

The wholesale architecture follows:

``` text
Explicit eligibility
Server-side authorization
Pricing isolation
Shared catalog where appropriate
Separate wholesale business rules
Auditable approvals
Secure customer data
Reusable cart/order infrastructure
```

Wholesale behavior must never depend solely on frontend visibility.

------------------------------------------------------------------------

# 3. Shared vs Wholesale Commerce

Retail and wholesale should share core domain concepts:

``` text
Products
Variants
Inventory
Customers
Addresses
Carts
Orders
Payments
Shipping
```

Wholesale-specific capabilities should be layered on top:

``` text
Wholesale customer status
Wholesale pricing
Wholesale eligibility
Wholesale order rules
Wholesale minimums where required
Wholesale approval workflow
```

------------------------------------------------------------------------

# 4. Customer Classification

The customer domain should distinguish between:

``` text
Retail customer
Wholesale customer
```

The exact role/status implementation follows the approved authentication
and domain architecture.

Do not create completely separate customer systems unless the business
later requires it.

------------------------------------------------------------------------

# 5. Wholesale Application

Wholesale access should normally begin with an application.

Conceptually:

``` text
Visitor/customer
      ↓
Wholesale application
      ↓
Pending review
      ↓
Approved / Rejected
```

Only approved wholesale customers should receive wholesale privileges.

------------------------------------------------------------------------

# 6. Application Data

The application may capture business information required for approval.

Potential information:

``` text
Business name
Contact person
Business email
Phone
Business type
Business location
Website/social presence where applicable
Expected purchase volume
Additional business information
```

The final fields must follow the client's actual wholesale onboarding
requirements.

------------------------------------------------------------------------

# 7. Application Validation

Applications should validate:

``` text
Required fields
Email format
Phone format
Duplicate applications
Existing wholesale status
Business information requirements
```

Validation must happen server-side.

------------------------------------------------------------------------

# 8. Application Status

A practical lifecycle is:

``` text
PENDING
APPROVED
REJECTED
SUSPENDED
```

The exact state model should be kept consistent across backend, admin
UI, and customer account.

------------------------------------------------------------------------

# 9. Pending Wholesale Customers

A pending applicant should not automatically receive wholesale pricing.

They may continue using the normal retail experience if they are also a
retail customer.

------------------------------------------------------------------------

# 10. Approval

Approval should be an explicit staff/admin action.

Conceptually:

``` text
Staff reviews application
        ↓
Approve
        ↓
Customer becomes eligible
        ↓
Wholesale capabilities become available
```

The approval operation must be audited.

------------------------------------------------------------------------

# 11. Rejection

A rejected application should record:

``` text
Status
Decision timestamp
Decision actor
Reason where required
```

Do not expose internal administrative notes unnecessarily to the
customer.

------------------------------------------------------------------------

# 12. Suspension

An approved wholesale customer may later be suspended.

Suspension should immediately prevent new wholesale privileges according
to the business rules.

Historical wholesale orders must remain intact.

------------------------------------------------------------------------

# 13. Reactivation

If business policy permits, a suspended customer can be reactivated
through an authorized administrative action.

The action should be auditable.

------------------------------------------------------------------------

# 14. Wholesale Authorization

Every wholesale-only operation must verify:

``` text
Authenticated user
Wholesale status
Account eligibility
Resource access
```

Examples:

``` text
Wholesale pricing
Wholesale-only products
Wholesale checkout rules
Wholesale order features
```

------------------------------------------------------------------------

# 15. Pricing Isolation

Wholesale pricing is sensitive business information.

The backend must ensure that wholesale prices are not returned to
unauthorized retail users.

Do not rely on:

``` text
Hidden UI
CSS
Client-side checks
Frontend route protection
```

------------------------------------------------------------------------

# 16. Retail vs Wholesale Price

A product may conceptually have:

``` text
Retail price
Wholesale price
```

The exact pricing model should support future expansion without
embedding pricing logic throughout the application.

------------------------------------------------------------------------

# 17. Price Resolution

Pricing should be resolved server-side based on the authenticated
customer's eligibility.

Conceptually:

``` text
Request
  ↓
Customer identity
  ↓
Customer type/status
  ↓
Applicable pricing rules
  ↓
Authoritative price
```

------------------------------------------------------------------------

# 18. Price Response Security

The API should return only pricing applicable to the requesting customer
where appropriate.

A retail customer should not be able to manipulate a request such as:

``` text
?customer_type=wholesale
```

to receive wholesale pricing.

------------------------------------------------------------------------

# 19. Frontend Pricing

The frontend may display:

``` text
Retail price
or
Wholesale price
```

based on the authoritative API response.

The frontend must never calculate wholesale eligibility itself.

------------------------------------------------------------------------

# 20. Wholesale Catalog Visibility

The business must define whether wholesale customers:

``` text
See the same catalog
See additional products
See different collections
See different availability
```

The architecture should support these possibilities without duplicating
product records.

------------------------------------------------------------------------

# 21. Shared Catalog Model

Where retail and wholesale sell the same product:

``` text
One product
   |
   ├── Retail presentation
   └── Wholesale presentation/pricing
```

This avoids catalog duplication.

------------------------------------------------------------------------

# 22. Wholesale-Only Products

If wholesale-only products are required, the product/catalog model
should support an explicit visibility or eligibility rule.

For example:

``` text
RETAIL
WHOLESALE
BOTH
```

The exact enum/model should follow the approved domain design.

------------------------------------------------------------------------

# 23. Wholesale Collections

Wholesale customers may have access to specific collections.

Potential examples:

``` text
Wholesale Collection
Bulk Orders
Wholesale New Arrivals
```

The final merchandising model should remain consistent with the shared
collection architecture.

------------------------------------------------------------------------

# 24. Inventory Sharing

If retail and wholesale sell the same physical inventory, inventory
should normally be shared unless the business explicitly maintains
separate stock pools.

Conceptually:

``` text
Product Variant
      |
   Inventory
   /        \
Retail     Wholesale
```

This prevents two independent systems from claiming the same physical
stock.

------------------------------------------------------------------------

# 25. Separate Wholesale Inventory

If the business maintains dedicated wholesale stock, the inventory model
must explicitly represent the separate allocation.

Do not simulate separate stock pools through frontend rules.

------------------------------------------------------------------------

# 26. Minimum Order Quantity

Wholesale may require minimum quantities.

Potential rules:

``` text
Minimum units per SKU
Minimum quantity per product
Minimum order value
Minimum number of styles
```

Only implement rules that the business actually requires.

------------------------------------------------------------------------

# 27. Minimum Order Validation

Minimum-order rules must be validated server-side.

The customer must not be able to bypass them by:

``` text
Direct API request
Changing frontend state
Calling checkout directly
```

------------------------------------------------------------------------

# 28. Wholesale Cart

The same cart architecture may support wholesale carts.

The cart should retain enough context to determine:

``` text
Customer
Variant
Quantity
Applicable price
Eligibility
```

------------------------------------------------------------------------

# 29. Wholesale Cart Pricing

Cart pricing should be recalculated/validated by the backend.

Never trust a client-supplied:

``` text
unit_price
discount
subtotal
```

as authoritative.

------------------------------------------------------------------------

# 30. Cart-to-Checkout Validation

At checkout, revalidate:

``` text
Wholesale eligibility
Product availability
Inventory
Pricing
Minimum order requirements
Promotion eligibility
Shipping requirements
```

This protects against changes made after the cart was created.

------------------------------------------------------------------------

# 31. Wholesale Checkout

Wholesale checkout should reuse the core checkout infrastructure where
possible.

Conceptually:

``` text
Shared Checkout
      |
      +── Retail rules
      |
      +── Wholesale rules
```

This avoids two independent payment/order systems.

------------------------------------------------------------------------

# 32. Wholesale Payment

Wholesale orders should use the approved payment architecture unless the
business explicitly requires alternative payment terms.

Potential future capabilities:

``` text
Online payment
Bank transfer
Credit terms
Manual payment
```

Do not implement credit/payment terms without explicit business
requirements.

------------------------------------------------------------------------

# 33. Payment Terms

If wholesale customers receive payment terms in the future, this should
be represented as an explicit business capability.

Do not treat:

``` text
payment pending
```

as equivalent to:

``` text
approved credit terms
```

------------------------------------------------------------------------

# 34. Wholesale Orders

Wholesale orders should use the same authoritative order model where
practical.

An order should identify the customer and applicable commercial context.

Conceptually:

``` text
Order
 ├── Customer
 ├── Channel/type
 ├── Items
 ├── Pricing snapshot
 ├── Payment
 └── Fulfillment
```

------------------------------------------------------------------------

# 35. Order Pricing Snapshot

Historical orders must preserve the price actually agreed for the order.

Later changes to wholesale pricing must not rewrite historical order
values.

------------------------------------------------------------------------

# 36. Wholesale Order Identification

Admin users should be able to distinguish wholesale orders from retail
orders.

Potentially:

``` text
order_channel = RETAIL
order_channel = WHOLESALE
```

The exact implementation should follow the approved domain model.

------------------------------------------------------------------------

# 37. Wholesale Order History

Approved wholesale customers should be able to view their own wholesale
order history where applicable.

They must not access another customer's orders.

------------------------------------------------------------------------

# 38. Wholesale Addresses

Wholesale customers may have business/shipping addresses.

The address architecture should remain shared unless the business
requires additional wholesale-specific address fields.

------------------------------------------------------------------------

# 39. Multiple Wholesale Locations

If wholesale customers can operate multiple stores/locations, the
architecture should allow multiple addresses or business locations.

Do not hard-code a single wholesale location if the business model
expects expansion.

------------------------------------------------------------------------

# 40. Wholesale Customer Profile

The account may expose:

``` text
Wholesale status
Business name
Business information
Approved purchasing capabilities
Order history
Addresses
```

Only appropriate information should be visible to the customer.

------------------------------------------------------------------------

# 41. Wholesale Data Security

Wholesale business information may be sensitive.

Protect:

``` text
Business documents
Application information
Internal approval notes
Pricing configuration
Wholesale eligibility rules
```

------------------------------------------------------------------------

# 42. Wholesale Admin Workflow

A typical workflow:

``` text
Application
   ↓
Admin review
   ↓
Business verification
   ↓
Decision
   ↓
Audit event
   ↓
Customer notification
   ↓
Wholesale access
```

The exact verification process depends on the client's operational
policy.

------------------------------------------------------------------------

# 43. Wholesale Approval Permissions

Only authorized staff should be able to:

``` text
Approve
Reject
Suspend
Reactivate
```

These permissions should not automatically be granted to every staff
account.

------------------------------------------------------------------------

# 44. Wholesale Audit Trail

Important events should be auditable:

``` text
Application submitted
Application reviewed
Application approved
Application rejected
Customer suspended
Customer reactivated
Wholesale pricing changed
Wholesale order created
Wholesale order cancelled
```

------------------------------------------------------------------------

# 45. Wholesale Notifications

Customers may need notifications for:

``` text
Application received
Application approved
Application rejected
Account suspended
Account reactivated
Order updates
```

Notification behavior should use the centralized notification
architecture.

------------------------------------------------------------------------

# 46. Notification Security

Notifications must not expose sensitive internal review notes or pricing
configuration.

Use customer-appropriate messaging.

------------------------------------------------------------------------

# 47. Wholesale API

Conceptual endpoints:

``` text
POST /api/v1/wholesale/applications/
GET  /api/v1/wholesale/application/
GET  /api/v1/wholesale/catalog/
```

Where shared catalog endpoints are sufficient, a separate catalog
endpoint may not be necessary.

------------------------------------------------------------------------

# 48. Wholesale Admin API

Conceptual endpoints:

``` text
GET   /api/v1/admin/wholesale-applications/
GET   /api/v1/admin/wholesale-applications/{id}/
PATCH /api/v1/admin/wholesale-applications/{id}/
```

Exact actions should use controlled state transitions rather than
unrestricted field updates.

------------------------------------------------------------------------

# 49. Wholesale Pricing API

Pricing should be resolved as part of the authoritative
product/cart/checkout response.

Avoid creating a public endpoint that allows arbitrary customers to
query wholesale price tables.

------------------------------------------------------------------------

# 50. API Authorization Tests

Wholesale APIs must test:

``` text
Anonymous user
Retail customer
Pending applicant
Approved wholesale customer
Suspended wholesale customer
Staff
Admin
```

Each actor should receive only the capabilities intended for that state.

------------------------------------------------------------------------

# 51. Wholesale Cache Isolation

Caching must not leak wholesale responses to retail customers.

Cache keys must account for the relevant customer/pricing context when
personalized data is cached.

------------------------------------------------------------------------

# 52. Wholesale Search

If wholesale and retail catalogs differ, search must respect the
requesting customer's eligibility.

A retail user must not discover wholesale-only products through:

``` text
Search
Filters
Recommendations
Direct URLs
Structured data
```

------------------------------------------------------------------------

# 53. Wholesale SEO

Wholesale-only/private content should not be unintentionally indexed.

If a wholesale page is public for acquisition purposes, its SEO behavior
should be explicitly designed.

------------------------------------------------------------------------

# 54. Wholesale Recommendations

Recommendations must respect customer eligibility.

Do not recommend:

``` text
Wholesale-only products
Wholesale-only prices
```

to retail users.

------------------------------------------------------------------------

# 55. Wholesale Promotions

Wholesale promotions should be explicitly separated from retail
promotions where their rules differ.

A retail coupon must not automatically become valid for wholesale orders
unless configured.

------------------------------------------------------------------------

# 56. Promotion Eligibility

Promotion calculation must consider:

``` text
Customer type
Wholesale status
Product eligibility
Order value
Quantity
Promotion validity
Usage limits
```

------------------------------------------------------------------------

# 57. Wholesale Tax/Compliance

Any tax, invoicing, or business-document requirements must be defined
according to the client's actual operating model and applicable
jurisdiction.

The architecture should keep such rules configurable rather than
hard-coding assumptions.

------------------------------------------------------------------------

# 58. Wholesale Invoicing

If wholesale invoices are required, they should be generated from
authoritative order data.

Invoices should preserve:

``` text
Customer/business information
Order items
Quantities
Agreed prices
Taxes where applicable
Totals
Invoice identifier
```

------------------------------------------------------------------------

# 59. Wholesale Fulfillment

Wholesale fulfillment may differ from retail fulfillment.

Potential differences:

``` text
Larger quantities
Different packaging
Different shipping arrangements
Different handling times
```

The fulfillment model should support these differences without
duplicating the order system.

------------------------------------------------------------------------

# 60. Wholesale Shipping

Shipping rules may differ by:

``` text
Order value
Weight
Destination
Quantity
Customer agreement
```

These rules must be authoritative on the backend.

------------------------------------------------------------------------

# 61. Wholesale Returns

Wholesale returns may have different policies from retail returns.

The return architecture should therefore support:

``` text
Return policy by channel/customer type
```

The exact policy must be business-approved.

------------------------------------------------------------------------

# 62. Wholesale Cancellation

Cancellation should use the shared order state machine with any
additional wholesale-specific rules applied server-side.

------------------------------------------------------------------------

# 63. Wholesale Analytics

Operational reporting should distinguish:

``` text
Retail sales
Wholesale sales
```

Potential metrics:

``` text
Wholesale order count
Wholesale revenue
Average wholesale order value
Wholesale customer count
Application conversion
```

Do not expose sensitive wholesale metrics to unauthorized users.

------------------------------------------------------------------------

# 64. Wholesale Data Model

Conceptually:

``` text
User/Customer
      |
      +── Wholesale Profile
      |
      +── Wholesale Application
      |
      +── Wholesale Eligibility
      |
      +── Orders
      |
      +── Addresses
```

The exact table structure belongs to the approved database/domain model.

------------------------------------------------------------------------

# 65. Shared Product Model

Conceptually:

``` text
Product
   |
   +── Variants
   |
   +── Media
   |
   +── Inventory
   |
   +── Retail pricing
   |
   +── Wholesale pricing/rules
```

Do not create separate retail and wholesale product records for
identical physical products without a clear reason.

------------------------------------------------------------------------

# 66. Wholesale State vs Role

Do not conflate:

``` text
Authentication role
```

with:

``` text
Business approval state
```

A customer may be authenticated but:

``` text
pending
rejected
suspended
```

Wholesale capability should depend on the approved business state.

------------------------------------------------------------------------

# 67. Wholesale Access Revocation

When a wholesale customer is suspended or otherwise loses eligibility:

``` text
New wholesale pricing
→ disabled

Wholesale-only catalog access
→ disabled where applicable

New wholesale checkout
→ disabled where applicable
```

Historical orders remain accessible according to normal account rules.

------------------------------------------------------------------------

# 68. Existing Cart on Suspension

If a wholesale customer becomes suspended while a wholesale cart exists,
checkout must revalidate eligibility.

The backend should not permit a stale cart to bypass the suspension.

------------------------------------------------------------------------

# 69. Existing Orders on Suspension

Suspension should not automatically alter historical orders.

Existing orders should continue through their approved operational
lifecycle unless the business explicitly requires otherwise.

------------------------------------------------------------------------

# 70. Price Changes During Cart Lifetime

If wholesale pricing changes while a customer has an existing cart:

``` text
Cart price
      ↓
Revalidated at checkout
```

The final behavior should follow the approved pricing policy.

The client must not be able to force an obsolete price.

------------------------------------------------------------------------

# 71. Inventory Competition

When retail and wholesale customers compete for shared inventory, the
inventory system must remain authoritative.

Checkout must validate availability close to order creation.

For high-concurrency scenarios, appropriate
transaction/locking/reservation mechanisms should be used.

------------------------------------------------------------------------

# 72. Wholesale Security Checklist

``` text
[ ] Application requires validation
[ ] Approval requires authorization
[ ] Wholesale pricing is server-side
[ ] Retail users cannot query wholesale prices
[ ] Wholesale-only products are protected
[ ] Cache isolation is correct
[ ] Suspension revokes access
[ ] Historical orders remain intact
[ ] Admin actions are audited
[ ] Sensitive business information is protected
```

------------------------------------------------------------------------

# 73. Wholesale Testing

Tests should cover:

``` text
Application submission
Duplicate application
Approval
Rejection
Suspension
Reactivation
Retail access
Pending access
Wholesale access
Pricing resolution
Catalog visibility
Cart validation
Checkout validation
Promotion eligibility
Order creation
Order history
Cache isolation
```

------------------------------------------------------------------------

# 74. End-to-End Wholesale Flow

A representative flow:

``` text
Customer
   ↓
Wholesale application
   ↓
Admin review
   ↓
Approval
   ↓
Wholesale account state
   ↓
Wholesale catalog/pricing
   ↓
Wholesale cart
   ↓
Server-side validation
   ↓
Checkout
   ↓
Payment
   ↓
Order
   ↓
Fulfillment
```

------------------------------------------------------------------------

# 75. Wholesale Definition of Done

Wholesale functionality is complete when:

-   Application lifecycle is defined.
-   Approval permissions are enforced.
-   Pricing is isolated securely.
-   Catalog visibility is correct.
-   Cart and checkout rules are validated server-side.
-   Inventory behavior is defined.
-   Orders preserve historical pricing.
-   Suspension/revocation works.
-   Notifications are integrated.
-   Audit events exist.
-   Retail users cannot access wholesale-only data.
-   Tests cover all important customer states.

------------------------------------------------------------------------

# 76. AI Agent Wholesale Rules

Antigravity must not:

-   Grant wholesale access by modifying frontend state.
-   Trust a client-supplied customer type.
-   Return wholesale prices to retail users.
-   Treat pending applicants as approved customers.
-   Allow suspended users to bypass eligibility.
-   Duplicate products merely to support different prices.
-   Modify historical order pricing.
-   Bypass minimum-order rules.
-   Allow wholesale-only products to leak into retail
    search/recommendations.
-   Cache personalized wholesale data without customer-aware isolation.
-   Approve wholesale applications without the required permission.
-   Delete wholesale application/audit history casually.

------------------------------------------------------------------------

# 77. Wholesale Change Workflow

Wholesale changes should follow:

``` text
Business rule
   ↓
Domain model review
   ↓
Authorization review
   ↓
Pricing/inventory impact review
   ↓
Implementation
   ↓
Retail + wholesale regression tests
   ↓
Security verification
   ↓
Staging verification
   ↓
Production release
```

------------------------------------------------------------------------

# 78. Wholesale Architecture Summary

``` text
                     Customer
                        |
              ┌─────────┴─────────┐
              ↓                   ↓
           Retail             Wholesale
                                  |
                           Application
                                  |
                            Admin Review
                                  |
                        Approved / Rejected
                                  |
                           Wholesale Access
                                  |
                 ┌────────────────┼────────────────┐
                 ↓                ↓                ↓
              Pricing          Catalog           Rules
                 |                |                |
                 └────────────────┼────────────────┘
                                  ↓
                            Shared Cart
                                  ↓
                         Shared Checkout
                                  ↓
                              Order
                                  ↓
                           Fulfillment
```

The central architectural decision is:

``` text
One commerce platform
+
Explicit wholesale business capabilities
```

rather than maintaining two disconnected commerce systems.

------------------------------------------------------------------------

# 79. Next Document

The next document should be:

``` text
20-payment-architecture.md
```

It will define:

-   Payment provider integration.
-   Payment lifecycle.
-   Checkout/payment boundaries.
-   Payment intents/orders.
-   Webhooks.
-   Signature verification.
-   Idempotency.
-   Payment state machine.
-   Refunds.
-   Partial refunds where required.
-   Failed/pending payments.
-   Reconciliation.
-   Security.
-   PCI considerations.
-   Admin payment operations.
-   Payment observability.
-   Failure/recovery scenarios.
