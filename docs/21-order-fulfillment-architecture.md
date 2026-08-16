# Closet by Chilli --- Order & Fulfillment Architecture

## 1. Purpose

This document defines the order and fulfillment architecture for Closet
by Chilli.

Orders are the central business record connecting:

``` text
Customer
Cart
Products
Variants
Pricing
Inventory
Payment
Shipping
Fulfillment
Refunds/Returns
Notifications
```

The order system must preserve historical truth while allowing
operational state to evolve safely.

------------------------------------------------------------------------

# 2. Order Principles

The order architecture follows:

``` text
Server-authoritative totals
Immutable historical pricing
Explicit state transitions
Inventory consistency
Payment consistency
Auditability
Idempotent operations
Controlled fulfillment
```

------------------------------------------------------------------------

# 3. Order as Historical Record

Once an order is created, important commercial information must be
preserved.

This includes, where applicable:

``` text
Product information
Variant/SKU
Quantity
Unit price
Discount
Tax
Shipping
Order total
Currency
Customer information required for the order
Shipping address snapshot
```

Later product/catalog changes must not rewrite historical order meaning.

------------------------------------------------------------------------

# 4. Order Lifecycle

A conceptual lifecycle is:

``` text
Created
   ↓
Payment pending/confirmed
   ↓
Processing
   ↓
Packed
   ↓
Shipped
   ↓
Delivered
```

Alternative terminal/exception states may include:

``` text
Cancelled
Failed
Returned
Refunded
```

The exact state machine must be finalized with the business rules.

------------------------------------------------------------------------

# 5. Separate Business States

Do not collapse every aspect of an order into one status.

Where appropriate, keep separate concepts for:

``` text
Order status
Payment status
Fulfillment status
Return status
Refund status
```

This prevents impossible combinations and makes operational reporting
clearer.

------------------------------------------------------------------------

# 6. Order Creation

Order creation should happen through a controlled backend workflow.

Conceptually:

``` text
Cart
 ↓
Authenticate customer
 ↓
Validate cart
 ↓
Validate pricing
 ↓
Validate inventory
 ↓
Calculate totals
 ↓
Create order snapshot
 ↓
Create payment context
```

The browser must not directly create arbitrary orders through database
access.

------------------------------------------------------------------------

# 7. Checkout Validation

Before order creation, the backend should validate:

``` text
Customer/account
Cart ownership
Product availability
Variant availability
Current price
Promotions
Wholesale eligibility
Minimum order rules where applicable
Shipping address
Shipping method
Taxes where applicable
Final totals
```

------------------------------------------------------------------------

# 8. Price Snapshot

Each order line should preserve the authoritative price used for the
order.

Conceptually:

``` text
Product current price
        ↓
Checkout calculation
        ↓
Order line price snapshot
```

If the product price changes tomorrow, yesterday's order remains
unchanged.

------------------------------------------------------------------------

# 9. Product Snapshot

Where required, preserve sufficient product/variant information to make
historical orders understandable even if the catalog later changes.

Potential snapshot data:

``` text
Product name
SKU
Variant attributes
```

The exact snapshot strategy belongs to the approved data model.

------------------------------------------------------------------------

# 10. Address Snapshot

The shipping address used for an order should be preserved as an order
snapshot.

Customer address records may change later, but the historical order's
shipping destination must remain accurate.

------------------------------------------------------------------------

# 11. Billing Information

If billing information is stored separately, the order should preserve
the appropriate historical billing information according to business and
compliance requirements.

Do not expose unnecessary personal information through public APIs.

------------------------------------------------------------------------

# 12. Order Number

Customer-facing orders should have a human-readable order identifier.

It should be separate from the internal database primary key where
appropriate.

Conceptually:

``` text
Internal ID: UUID
Customer order number: CBCH-2026-000123
```

The exact format is a business decision.

------------------------------------------------------------------------

# 13. Order ID Security

Do not assume that knowing an order number grants access.

Order retrieval must verify:

``` text
Authenticated customer
+
Ownership/authorization
```

Admin access follows separate permissions.

------------------------------------------------------------------------

# 14. Order State Machine

State transitions should be explicit.

Conceptually:

``` text
CREATED
   |
   +--> CANCELLED
   |
   v
PAYMENT_CONFIRMED
   |
   v
PROCESSING
   |
   v
PACKED
   |
   v
SHIPPED
   |
   v
DELIVERED
```

Exception/return workflows may branch separately.

------------------------------------------------------------------------

# 15. Invalid State Transitions

The backend must reject invalid transitions.

Examples:

``` text
DELIVERED → PROCESSING
CANCELLED → SHIPPED
```

unless an explicit business workflow supports such a transition.

------------------------------------------------------------------------

# 16. Order State Authorization

Different transitions may require different permissions.

For example:

``` text
Customer
→ Request cancellation

Order staff
→ Process fulfillment

Admin
→ Exceptional administrative operation
```

Do not grant all state transitions to every user.

------------------------------------------------------------------------

# 17. Payment Interaction

Order fulfillment must respect payment state.

For normal prepaid orders:

``` text
Payment confirmed
      ↓
Order eligible for fulfillment
```

Do not ship an order merely because a payment page was completed in the
browser.

------------------------------------------------------------------------

# 18. Payment Pending Orders

If payment remains pending:

``` text
Order
   ↓
Payment pending
   ↓
Not fulfillment-ready
```

unless an explicit business rule permits another workflow.

------------------------------------------------------------------------

# 19. Payment Failure

If payment fails:

``` text
Payment = failed
Order = appropriate non-fulfillment state
```

The customer should be allowed to retry through the approved payment
workflow where appropriate.

------------------------------------------------------------------------

# 20. Inventory Interaction

Inventory behavior must follow the approved inventory strategy.

Possible strategy:

``` text
Checkout
   ↓
Reserve/validate stock
   ↓
Order creation
   ↓
Inventory finalized according to business rule
```

The exact reservation/deduction point must be explicit.

------------------------------------------------------------------------

# 21. Inventory Concurrency

Multiple customers may attempt to purchase the same limited inventory
simultaneously.

The backend/database must prevent overselling through appropriate:

``` text
Transactions
Locks
Atomic updates
Reservations
Constraints
```

according to the chosen inventory strategy.

------------------------------------------------------------------------

# 22. Order and Inventory Consistency

Every successful order must result in the intended inventory change
exactly once.

Retries and duplicate events must not:

``` text
Deduct stock twice
Restore stock twice
```

------------------------------------------------------------------------

# 23. Inventory Restoration

When an order is cancelled or a return is approved, inventory
restoration should occur only according to the business rule.

For example:

``` text
Cancelled before fulfillment
    ↓
Potentially restock

Returned item
    ↓
Restock only after approved return inspection/process
```

Do not automatically restock every cancelled/returned item.

------------------------------------------------------------------------

# 24. Order Fulfillment

Fulfillment represents the operational process of preparing and
delivering an order.

Typical stages:

``` text
Processing
   ↓
Picking
   ↓
Packing
   ↓
Shipped
   ↓
Delivered
```

The exact workflow may be simplified for Phase 1.

------------------------------------------------------------------------

# 25. Picking

Picking identifies the physical items required for an order.

The system should ensure:

``` text
Correct SKU
Correct variant
Correct quantity
```

------------------------------------------------------------------------

# 26. Packing

Packing may record:

``` text
Packed timestamp
Packed by
Package information
```

Only implement detailed package workflows if required.

------------------------------------------------------------------------

# 27. Shipment

A shipped order should record appropriate shipment information.

Potential fields:

``` text
Carrier
Tracking number
Shipped timestamp
Shipping method
```

------------------------------------------------------------------------

# 28. Tracking Number

Tracking identifiers must be associated with the correct order/shipment.

Customer-facing tracking data should not expose internal operational
credentials.

------------------------------------------------------------------------

# 29. Multiple Shipments

If partial shipments are required in the future, the architecture should
allow:

``` text
Order
  |
  +── Shipment 1
  +── Shipment 2
```

Do not force shipment state directly onto the order if multi-shipment
support becomes a requirement.

------------------------------------------------------------------------

# 30. Shipping Provider

The shipping/carrier integration should be isolated behind an
integration boundary.

Conceptually:

``` text
Django
   |
Shipping Service
   |
Carrier Adapter
   |
Carrier/Shipping Provider
```

This keeps provider-specific behavior out of the core order domain.

------------------------------------------------------------------------

# 31. Shipping Rate Calculation

If shipping rates are dynamic, the backend should calculate/verify the
selected rate.

The browser must not be able to modify shipping cost arbitrarily.

------------------------------------------------------------------------

# 32. Shipping Address Validation

Before fulfillment, validate the order's shipping information according
to the supported shipping workflow.

Do not silently change the customer's order address after order
creation.

------------------------------------------------------------------------

# 33. Address Changes After Order

Address changes after order creation should be restricted.

Possible policy:

``` text
Before fulfillment:
  permitted through controlled workflow

After shipment:
  generally not permitted
```

The exact business policy must be defined.

------------------------------------------------------------------------

# 34. Order Cancellation

Customers may request cancellation according to policy.

The backend should validate:

``` text
Order state
Payment state
Fulfillment state
Cancellation eligibility
```

------------------------------------------------------------------------

# 35. Admin Cancellation

Admin/staff cancellation should follow the same business rules unless an
explicitly authorized exception workflow exists.

Exceptional cancellations must be audited.

------------------------------------------------------------------------

# 36. Cancellation Effects

Cancellation may affect:

``` text
Order state
Payment/refund state
Inventory
Notifications
Fulfillment
```

These changes must be coordinated through the approved domain workflow.

------------------------------------------------------------------------

# 37. Returns

Returns should be modeled separately from cancellations.

Conceptually:

``` text
Delivered order
      ↓
Return requested
      ↓
Return approved/rejected
      ↓
Item received
      ↓
Return inspected
      ↓
Refund/restock decision
```

The exact workflow depends on the client's return policy.

------------------------------------------------------------------------

# 38. Return Eligibility

Return eligibility may depend on:

``` text
Order state
Delivery date
Product category
Return window
Item condition
Customer type
Wholesale/retail policy
```

These rules should be server-side.

------------------------------------------------------------------------

# 39. Return Items

If partial returns are supported, returns should operate at
item/quantity level.

Example:

``` text
Order
 ├── Item A × 2
 └── Item B × 1

Return:
 Item A × 1
```

The system must prevent returning more quantity than was
purchased/eligible.

------------------------------------------------------------------------

# 40. Return Status

Potential states:

``` text
REQUESTED
APPROVED
REJECTED
RECEIVED
INSPECTED
COMPLETED
CANCELLED
```

The final state machine should reflect actual business operations.

------------------------------------------------------------------------

# 41. Refund Relationship

Returns and refunds are related but not identical.

Conceptually:

``` text
Return decision
      ↓
Refund operation
      ↓
Payment provider
```

The refund system remains authoritative for financial state.

------------------------------------------------------------------------

# 42. Refund Validation

Before issuing a refund, verify:

``` text
Eligible order/return
Already refunded amount
Requested amount
Payment state
Authorization
```

------------------------------------------------------------------------

# 43. Order Notifications

Customers should receive appropriate order notifications.

Potential events:

``` text
Order confirmed
Payment confirmed
Order processing
Order shipped
Order delivered
Order cancelled
Return update
Refund update
```

The final notification list should be defined by the business.

------------------------------------------------------------------------

# 44. Notification Idempotency

Retrying an order event must not accidentally produce uncontrolled
duplicate critical notifications.

Use event/message identifiers where appropriate.

------------------------------------------------------------------------

# 45. Customer Order Experience

The customer account should provide:

``` text
Order list
Order detail
Order status
Items
Totals
Shipping information
Tracking where available
Return/cancellation actions where eligible
```

------------------------------------------------------------------------

# 46. Customer Order Access

Customers must only access their own orders.

Use backend authorization:

``` text
Authenticated user
+
Order ownership
```

Do not authorize by order number alone.

------------------------------------------------------------------------

# 47. Admin Order Experience

Admin/order staff should be able to:

``` text
Search orders
Filter orders
View order detail
Process fulfillment
Update allowed states
View payment state
View shipping state
Manage approved cancellations/returns
```

All sensitive operations require appropriate permissions.

------------------------------------------------------------------------

# 48. Order Search

Admin search may include:

``` text
Order number
Customer
Email where permitted
SKU
Tracking number
Payment reference
```

Sensitive search fields should be permission-controlled.

------------------------------------------------------------------------

# 49. Order Filtering

Useful filters include:

``` text
Order status
Payment status
Fulfillment status
Date range
Retail/wholesale
Shipping state
Return state
```

------------------------------------------------------------------------

# 50. Order Pagination

Order lists must be paginated.

Do not load the entire order history into the browser.

------------------------------------------------------------------------

# 51. Order Audit Trail

Important order events should be recorded.

Examples:

``` text
Order created
Payment confirmed
Order cancelled
Order packed
Order shipped
Order delivered
Return requested
Return approved
Refund initiated
```

------------------------------------------------------------------------

# 52. Audit Record

An order audit event should identify:

``` text
Actor/system
Action
Order
Previous state
New state
Timestamp
Request/correlation ID where applicable
Reason where required
```

------------------------------------------------------------------------

# 53. System vs Human Actor

Audit records should distinguish between:

``` text
Customer
Admin/staff
Background worker
Payment webhook
System process
```

This makes investigations easier.

------------------------------------------------------------------------

# 54. Idempotent Order Operations

Operations such as:

``` text
Create order
Process payment event
Apply inventory change
Create shipment
Process refund
```

must be designed for safe retries where applicable.

------------------------------------------------------------------------

# 55. Duplicate Order Prevention

Checkout must prevent a retry from creating two orders for one logical
checkout operation.

Use appropriate:

``` text
Idempotency
Unique business identifiers
Payment association
Database constraints
```

------------------------------------------------------------------------

# 56. Order Creation Failure

A failure during order creation must not leave an unusable financial
state.

The implementation must define what happens if:

``` text
Order creation succeeds
but payment setup fails
```

or:

``` text
Payment is initiated
but local persistence fails
```

These cases require explicit recovery/reconciliation logic.

------------------------------------------------------------------------

# 57. Order Number Generation

Customer-facing order numbers should be generated safely under
concurrency.

Do not use:

``` text
SELECT MAX(order_number) + 1
```

The database or application must use a concurrency-safe mechanism.

------------------------------------------------------------------------

# 58. Order Totals

Order totals should satisfy the appropriate invariant:

``` text
subtotal
+ shipping
+ tax
- discounts
=
total
```

The exact formula depends on the commercial/tax model.

The backend must be authoritative.

------------------------------------------------------------------------

# 59. Decimal/Money Handling

Financial values must use a safe monetary representation.

Never use floating-point arithmetic for authoritative order totals.

------------------------------------------------------------------------

# 60. Historical Pricing

Order line prices must remain immutable after order creation except
through explicitly modeled correction workflows.

Product price changes must not rewrite:

``` text
Historical order lines
Historical totals
Historical refunds
```

------------------------------------------------------------------------

# 61. Wholesale Orders

Wholesale orders should use the same order foundation while preserving
wholesale context.

The order should reflect:

``` text
Customer type/channel
Applicable pricing
Wholesale rules
Quantities
Minimum order requirements where applicable
```

------------------------------------------------------------------------

# 62. Retail + Wholesale Inventory

If inventory is shared:

``` text
Retail order
    ↓
Shared inventory

Wholesale order
    ↓
Shared inventory
```

Both flows must use the same inventory authority.

------------------------------------------------------------------------

# 63. Fulfillment Priority

If the business introduces fulfillment priority, it must be represented
explicitly.

Do not infer priority from:

``` text
Wholesale customer
Order value
Admin assumptions
```

unless the business rule says so.

------------------------------------------------------------------------

# 64. Shipment Tracking

Customer-facing tracking should show only appropriate information.

Potential states:

``` text
Label created
In transit
Out for delivery
Delivered
Exception
```

Exact tracking states depend on the carrier.

------------------------------------------------------------------------

# 65. Shipping Exceptions

Potential exceptions include:

``` text
Delivery failed
Address issue
Carrier delay
Lost shipment
Damaged shipment
```

The operational workflow should define how these affect
order/fulfillment state.

------------------------------------------------------------------------

# 66. Delivery Confirmation

An order should only move to delivered through:

``` text
Verified carrier update
or
Authorized operational action
```

depending on the fulfillment integration.

------------------------------------------------------------------------

# 67. Fulfillment Reconciliation

Where external shipping providers are used, periodically reconcile:

``` text
Internal shipment state
Carrier shipment state
Tracking information
```

This is similar to payment reconciliation.

------------------------------------------------------------------------

# 68. Fulfillment Failure Recovery

If shipment creation fails:

``` text
Record failure
Do not falsely mark order shipped
Allow retry
Alert when persistent
```

------------------------------------------------------------------------

# 69. Background Jobs

Potential background tasks include:

``` text
Payment reconciliation
Shipment status synchronization
Notification delivery
Return processing
Operational reports
Cleanup
```

The worker architecture should follow the deployment/observability
design.

------------------------------------------------------------------------

# 70. Order Performance

Order APIs should remain efficient.

Avoid loading unnecessary:

``` text
Customer data
Product relations
Payment metadata
Audit history
Shipment records
```

unless required by the specific view.

------------------------------------------------------------------------

# 71. Order API

Conceptual customer endpoints:

``` text
GET /api/v1/orders/
GET /api/v1/orders/{id}/
POST /api/v1/orders/{id}/cancel/
```

The exact API structure follows the approved API architecture.

------------------------------------------------------------------------

# 72. Admin Order API

Conceptual endpoints:

``` text
GET /api/v1/admin/orders/
GET /api/v1/admin/orders/{id}/
POST /api/v1/admin/orders/{id}/cancel/
POST /api/v1/admin/orders/{id}/ship/
```

Exact actions should be explicit rather than unrestricted PATCH
operations.

------------------------------------------------------------------------

# 73. State Transition APIs

Prefer explicit business actions for important transitions.

For example:

``` text
POST /orders/{id}/cancel/
POST /orders/{id}/mark-packed/
POST /orders/{id}/ship/
```

rather than:

``` text
PATCH /orders/{id}/
{
  "status": "SHIPPED"
}
```

This keeps business rules inside the domain layer.

------------------------------------------------------------------------

# 74. Order Security Checklist

``` text
[ ] Server-side totals
[ ] Customer ownership checks
[ ] Admin permission checks
[ ] Controlled state transitions
[ ] Payment verification
[ ] Inventory consistency
[ ] Historical snapshots
[ ] Idempotent critical operations
[ ] Audit trail
[ ] No sensitive data leakage
```

------------------------------------------------------------------------

# 75. Order Testing

Tests should cover:

``` text
Order creation
Duplicate checkout
Price changes during checkout
Inventory race
Payment pending
Payment success
Payment failure
Cancellation
Refund
Return
Shipment creation
Tracking update
Delivery
Retail order
Wholesale order
Unauthorized access
Admin permissions
```

------------------------------------------------------------------------

# 76. End-to-End Order Flow

A representative retail flow:

``` text
Browse
  ↓
Product
  ↓
Cart
  ↓
Checkout validation
  ↓
Order creation
  ↓
Payment
  ↓
Payment confirmation
  ↓
Processing
  ↓
Packing
  ↓
Shipping
  ↓
Delivery
  ↓
Order history
```

------------------------------------------------------------------------

# 77. End-to-End Wholesale Flow

A representative wholesale flow:

``` text
Approved wholesale account
  ↓
Wholesale catalog/pricing
  ↓
Wholesale cart
  ↓
Minimum/order validation
  ↓
Checkout
  ↓
Payment/approved payment terms
  ↓
Order
  ↓
Fulfillment
  ↓
Delivery
```

------------------------------------------------------------------------

# 78. Order Definition of Done

Order/fulfillment functionality is complete when:

-   Order lifecycle is explicitly defined.
-   Financial snapshots are preserved.
-   Payment state is integrated.
-   Inventory interaction is defined.
-   State transitions are controlled.
-   Cancellation is safe.
-   Returns/refunds are separated appropriately.
-   Shipping/fulfillment is represented.
-   Customer access is protected.
-   Admin operations are permission-controlled.
-   Important events are audited.
-   Critical operations are idempotent.
-   Failure/reconciliation workflows exist.
-   Retail and wholesale flows are tested.

------------------------------------------------------------------------

# 79. AI Agent Order Rules

Antigravity must not:

-   Allow the client to set order totals.
-   Allow arbitrary order status changes.
-   Ship an order without required payment/business authorization.
-   Deduct inventory twice.
-   Restore inventory twice.
-   Rewrite historical order pricing.
-   Expose another customer's order.
-   Create duplicate orders on checkout retry.
-   Mark an order delivered without the approved workflow.
-   Issue refunds without payment verification.
-   Delete historical order information casually.
-   Treat payment and fulfillment status as the same state.
-   Use frontend-only checks for cancellation, return, or order access.

------------------------------------------------------------------------

# 80. Order Change Workflow

Order/fulfillment changes should follow:

``` text
Business requirement
       ↓
Order state-machine review
       ↓
Payment/inventory impact review
       ↓
Fulfillment impact review
       ↓
Implementation
       ↓
Unit/integration tests
       ↓
Failure/idempotency tests
       ↓
Staging verification
       ↓
Production monitoring
```

------------------------------------------------------------------------

# 81. Order Architecture Summary

``` text
                         Customer
                            |
                           Cart
                            |
                         Checkout
                            |
                  Server-side validation
                            |
                          Order
                     /      |       \
                    /       |        \
                   ↓        ↓         ↓
              Payment   Inventory  Fulfillment
                 |          |          |
                 ↓          ↓          ↓
             Provider    Stock      Shipment
                 |                     |
                 ↓                     ↓
             Webhooks              Tracking
                 \                     /
                  \                   /
                   └───────┬─────────┘
                           ↓
                     Order History
                           |
                    Customer / Admin
```

The order system is the central operational record of the commerce
platform.

Its primary responsibilities are:

``` text
Preserve historical truth
Coordinate payment and inventory
Control fulfillment
Support retail and wholesale
Provide reliable customer order history
```

------------------------------------------------------------------------

# 82. Next Document

The next document should be:

``` text
22-cart-checkout-architecture.md
```

It will define:

-   Guest vs authenticated carts.
-   Cart lifecycle.
-   Cart persistence.
-   Cart ownership.
-   Product/variant selection.
-   Quantity validation.
-   Pricing recalculation.
-   Wholesale cart behavior.
-   Promotions.
-   Inventory validation.
-   Cart expiration.
-   Checkout session.
-   Address/shipping selection.
-   Tax/shipping calculation.
-   Order creation boundary.
-   Idempotency.
-   Abandoned carts.
-   Checkout security.
-   Customer checkout UX.
