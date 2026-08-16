# Closet by Chilli --- Promotions & Pricing Architecture

## 1. Purpose

This document defines the architecture for pricing, discounts,
promotions, coupons, and commercial price rules for Closet by Chilli.

The pricing system must guarantee:

``` text
Server-authoritative prices
Correct totals
Deterministic discount calculation
Retail/wholesale separation
Promotion eligibility enforcement
Safe coupon usage
Auditability
Idempotent order pricing
```

------------------------------------------------------------------------

# 2. Core Principle

The browser is never the authority for:

``` text
Product price
Discount
Coupon value
Shipping discount
Tax
Subtotal
Grand total
Wholesale price
```

The backend calculates and validates all commercially significant
values.

------------------------------------------------------------------------

# 3. Pricing Architecture

Conceptually:

``` text
Product / Variant
       ↓
Base Price
       ↓
Customer Context
       ↓
Promotion Engine
       ↓
Discounts
       ↓
Shipping / Tax
       ↓
Final Order Total
```

------------------------------------------------------------------------

# 4. Price Sources

Pricing may originate from:

``` text
Catalog price
Wholesale price
Promotion
Coupon
Campaign
```

Each source must have explicit precedence and eligibility rules.

------------------------------------------------------------------------

# 5. Money Representation

Money must use exact decimal-safe representations.

Do not use binary floating-point arithmetic for authoritative monetary
calculations.

Conceptually:

``` text
Decimal amount
+
Currency
```

------------------------------------------------------------------------

# 6. Currency

The system should have an explicitly configured store currency.

The customer must not be able to select an arbitrary currency and
thereby change the amount being charged.

------------------------------------------------------------------------

# 7. Base Product Price

Each sellable product/variant should have an authoritative public
selling price.

The exact storage model follows the database/domain architecture.

------------------------------------------------------------------------

# 8. Wholesale Pricing

Wholesale pricing must be separated from retail pricing.

A customer should receive wholesale pricing only when the backend
confirms the customer is eligible for wholesale access.

------------------------------------------------------------------------

# 9. Wholesale Price Leakage

Wholesale prices must never be exposed through:

``` text
Public product APIs
Public HTML
SEO metadata
Structured data
Shared caches
Unauthenticated search
```

unless explicitly intended.

------------------------------------------------------------------------

# 10. Price Resolution

A pricing service should determine the effective price for a customer
context.

Conceptually:

``` text
Product
+
Customer
+
Sales channel
+
Eligibility
+
Time
+
Promotion context
=
Effective price
```

------------------------------------------------------------------------

# 11. Customer Context

Pricing may depend on:

``` text
Retail / wholesale
Authenticated state
Eligible customer segment
Promotion eligibility
```

Do not allow the client to submit its own customer segment as
authoritative context.

------------------------------------------------------------------------

# 12. Price Calculation Location

Authoritative pricing belongs in the backend/domain layer.

Frontend pricing is for:

``` text
Display
Preview
UX
```

not financial authority.

------------------------------------------------------------------------

# 13. Price Snapshotting

When an order is created, the applicable commercial values should be
snapshotted into the order/order-line representation.

This protects historical orders from future catalog price changes.

------------------------------------------------------------------------

# 14. Historical Order Integrity

If a product price changes tomorrow, an existing completed order must
continue to display the price that was actually used for that order.

------------------------------------------------------------------------

# 15. Price Changes

Product price changes should be authorized and auditable.

Potential audit data:

``` text
Product/variant
Previous price
New price
Actor
Timestamp
Reason where required
```

------------------------------------------------------------------------

# 16. Effective Dates

Promotions and price rules may have:

``` text
Start time
End time
Timezone
```

The backend should evaluate these using a consistent server-side time
source.

------------------------------------------------------------------------

# 17. Timezone

Promotion validity must not depend on the customer's browser clock.

Use a clearly defined business timezone and server-side evaluation.

------------------------------------------------------------------------

# 18. Promotion Model

A promotion represents a business rule that can change the effective
selling price or provide a commercial benefit.

Potential promotion types:

``` text
Percentage discount
Fixed amount discount
Product-specific discount
Category discount
Collection discount
Buy-X-get-Y
Minimum-order discount
Free shipping
```

Only required Phase 1 promotion types should be implemented initially.

------------------------------------------------------------------------

# 19. Promotion Eligibility

A promotion may depend on:

``` text
Customer type
Products
Categories
Collections
Minimum quantity
Minimum order value
Date/time
Usage limits
Coupon code
```

The exact supported rule set should be explicitly defined before
implementation.

------------------------------------------------------------------------

# 20. Promotion Evaluation

Promotion evaluation should be deterministic.

Given the same:

``` text
Cart
Customer context
Time
Promotion configuration
```

the system should produce the same result.

------------------------------------------------------------------------

# 21. Promotion Engine

Promotion logic should be centralized rather than duplicated across:

``` text
Product page
Cart
Checkout
Admin
```

Use a shared domain/service layer.

------------------------------------------------------------------------

# 22. Promotion Preview

The cart may show:

``` text
Original price
Discount
Effective price
```

but the values must originate from the backend calculation.

------------------------------------------------------------------------

# 23. Coupon Codes

Coupon codes should be treated as untrusted user input.

Validate:

``` text
Format
Existence
Active state
Expiration
Eligibility
Usage limits
Order conditions
```

------------------------------------------------------------------------

# 24. Coupon Normalization

Coupon input should have a consistent normalization policy, such as:

``` text
Whitespace handling
Case normalization where business rules permit
Length limits
Allowed characters
```

Do not silently alter codes in ways that create ambiguous behavior.

------------------------------------------------------------------------

# 25. Coupon Enumeration Protection

Coupon validation endpoints should be rate-limited to reduce automated
guessing/enumeration.

------------------------------------------------------------------------

# 26. Coupon Usage Limits

Coupons may have:

``` text
Global usage limit
Per-customer usage limit
Time window
Product/category restrictions
```

Usage enforcement must happen server-side.

------------------------------------------------------------------------

# 27. Coupon Race Conditions

Two concurrent checkout attempts must not both consume the last
available coupon usage if only one use remains.

Use appropriate:

``` text
Database constraints
Transactions
Locks
Atomic counters
```

as appropriate.

------------------------------------------------------------------------

# 28. Coupon Consumption

A coupon should be considered consumed at the correct business point.

Do not mark a coupon permanently used merely because a customer typed it
into the cart.

The exact consumption point should align with order/payment semantics.

------------------------------------------------------------------------

# 29. Failed Checkout and Coupons

A failed or abandoned checkout should not incorrectly consume a one-time
coupon unless the business rules explicitly require
reservation/consumption.

------------------------------------------------------------------------

# 30. Coupon Cancellation

If an order is cancelled/refunded, define whether the coupon usage:

``` text
Remains consumed
Is restored
```

The rule should be explicit rather than inferred.

------------------------------------------------------------------------

# 31. Discount Stacking

The system must explicitly define whether multiple discounts may apply
together.

Possible policy:

``` text
No stacking
One coupon + automatic promotion
Multiple compatible promotions
```

Do not implement accidental stacking.

------------------------------------------------------------------------

# 32. Promotion Precedence

If multiple promotions are eligible, define a deterministic precedence
model.

For example:

``` text
Highest-priority promotion
OR
Best customer benefit
OR
Explicitly stackable rules
```

The exact business rule must be chosen before implementation.

------------------------------------------------------------------------

# 33. Promotion Priority

Promotions may have explicit priority values.

A priority should not by itself bypass eligibility rules.

------------------------------------------------------------------------

# 34. Maximum Discount

Where required, promotions may enforce a maximum discount amount.

Example:

``` text
20% off
maximum ₹500
```

The final calculation must enforce the cap server-side.

------------------------------------------------------------------------

# 35. Minimum Order Value

Promotions may require:

``` text
Subtotal >= threshold
```

The exact basis must be defined:

``` text
Before discounts
After discounts
Before shipping
After shipping
```

Do not leave this ambiguous.

------------------------------------------------------------------------

# 36. Quantity-Based Promotions

If quantity-based promotions are supported, define exactly how
quantities are evaluated.

Examples:

``` text
Buy 2 get 10% off
Buy 3 get 1 free
```

Rules must be deterministic and tested against edge cases.

------------------------------------------------------------------------

# 37. Product-Specific Promotions

A promotion may target selected products/variants.

The engine should determine eligibility from authoritative product
relationships.

------------------------------------------------------------------------

# 38. Category Promotions

Category-level promotions should resolve category membership through the
catalog/domain model.

Do not duplicate category membership into promotion logic unnecessarily.

------------------------------------------------------------------------

# 39. Collection Promotions

Collection-based promotions should use the authoritative
collection/product relationship.

------------------------------------------------------------------------

# 40. Free Shipping Promotions

Free shipping is a commercial benefit and should be represented
explicitly.

Do not simply overwrite shipping cost in the frontend.

------------------------------------------------------------------------

# 41. Shipping Discount Precedence

If both:

``` text
Free shipping promotion
+
Shipping coupon
```

are eligible, the system must follow the defined stacking/precedence
policy.

------------------------------------------------------------------------

# 42. Promotion Scope

Every promotion should have an explicit scope such as:

``` text
Product
Variant
Category
Collection
Cart
Shipping
Customer segment
```

------------------------------------------------------------------------

# 43. Promotion Status

A promotion should have controlled lifecycle states.

For example:

``` text
DRAFT
ACTIVE
PAUSED
EXPIRED
ARCHIVED
```

------------------------------------------------------------------------

# 44. Promotion Publishing

Admins should validate a promotion before activating it.

Potential checks:

``` text
Valid dates
Valid discount
Valid targets
Valid usage limits
Valid eligibility
```

------------------------------------------------------------------------

# 45. Promotion Deactivation

Deactivating a promotion should affect new pricing evaluations without
corrupting already-created orders.

------------------------------------------------------------------------

# 46. Existing Orders

Once an order is created, its applied discount values should be
preserved.

Changing a promotion later must not retroactively change completed
orders.

------------------------------------------------------------------------

# 47. Cart Recalculation

The backend should recalculate pricing when important cart state
changes.

Examples:

``` text
Quantity changed
Product changed
Coupon added
Coupon removed
Shipping changed
Customer context changed
```

------------------------------------------------------------------------

# 48. Checkout Revalidation

At checkout, recalculate:

``` text
Items
Prices
Promotions
Coupons
Shipping
Tax where applicable
Final total
```

Do not charge a stale client-side total.

------------------------------------------------------------------------

# 49. Price Expiration

If a promotion expires while a customer is browsing, the checkout
calculation should use the current valid state.

------------------------------------------------------------------------

# 50. Concurrent Price Changes

If an admin changes a price while a customer is checking out, the
checkout flow must have an explicit revalidation policy.

The backend remains authoritative.

------------------------------------------------------------------------

# 51. Price Locking

If the business requires price locking for a limited period, implement
it explicitly.

Do not accidentally create price locks through cached frontend data.

------------------------------------------------------------------------

# 52. Cart Price Snapshot

The cart may display a calculated price, but the backend should be able
to recalculate it from authoritative data.

A client-provided cart total is never authoritative.

------------------------------------------------------------------------

# 53. Order Line Pricing

Each order line should preserve appropriate values such as:

``` text
Product/variant
Quantity
Unit price
Line discount
Effective unit price
Line total
```

The exact fields follow the domain/database architecture.

------------------------------------------------------------------------

# 54. Order Discount Snapshot

The order should preserve applied promotion/coupon information
sufficient to explain the final price.

------------------------------------------------------------------------

# 55. Discount Auditability

A support/admin user should be able to understand:

``` text
Original amount
Promotion
Coupon
Discount
Final amount
```

for an order.

------------------------------------------------------------------------

# 56. Rounding

Monetary rounding must be standardized.

The system should define:

``` text
Decimal precision
Rounding mode
Where rounding occurs
```

and use the same policy consistently.

------------------------------------------------------------------------

# 57. Rounding Consistency

Do not calculate:

``` text
Frontend rounded value
+
Backend rounded value
+
Provider rounded value
```

independently.

The backend should establish the authoritative amount sent to the
payment provider.

------------------------------------------------------------------------

# 58. Discount Calculation Order

The calculation pipeline should have a documented order.

For example:

``` text
Base item prices
→ Eligible item promotions
→ Coupon
→ Order-level discount
→ Shipping
→ Shipping promotion
→ Tax where applicable
→ Final total
```

The actual business order must be finalized before implementation.

------------------------------------------------------------------------

# 59. Tax Interaction

If tax is required, the pricing architecture must explicitly define
whether discounts are applied:

``` text
Before tax
After tax
```

and how taxable amounts are calculated.

------------------------------------------------------------------------

# 60. Shipping Interaction

Shipping calculation should be a separate domain/service responsibility,
while promotions may provide shipping discounts.

The final checkout service composes the results.

------------------------------------------------------------------------

# 61. Retail Pricing

Retail customers receive the public retail price subject to eligible
public promotions.

------------------------------------------------------------------------

# 62. Wholesale Pricing

Wholesale customers receive the approved wholesale pricing rules.

Retail coupons should not automatically apply to wholesale customers
unless explicitly allowed.

------------------------------------------------------------------------

# 63. Wholesale Promotion Rules

Wholesale promotions should be explicitly configured.

Never assume:

``` text
Retail promotion = Wholesale promotion
```

------------------------------------------------------------------------

# 64. Customer Segment Security

The customer segment used for pricing must come from trusted server-side
state.

Never accept:

``` text
customer_type=wholesale
```

from the browser as proof of eligibility.

------------------------------------------------------------------------

# 65. Anonymous Customers

Anonymous users should receive only public pricing and promotions.

------------------------------------------------------------------------

# 66. Authenticated Retail Customers

Authenticated retail customers may receive:

``` text
Public promotions
Customer-specific promotions
```

where eligible.

------------------------------------------------------------------------

# 67. Promotion Eligibility Service

Eligibility checks should be centralized.

Conceptually:

``` text
Promotion
+
Customer
+
Cart
+
Time
=
Eligibility result
```

------------------------------------------------------------------------

# 68. Eligibility Result

The pricing engine should be able to explain why a promotion is:

``` text
Eligible
Ineligible
Expired
Already used
Minimum not met
Product not applicable
Customer not eligible
```

This helps admin/support diagnostics.

------------------------------------------------------------------------

# 69. Customer-Facing Error Messages

Coupon failures should use safe, understandable messages.

Examples:

``` text
Coupon is invalid.
Coupon has expired.
Coupon is not applicable to these items.
Minimum order value not reached.
```

Do not expose internal promotion configuration.

------------------------------------------------------------------------

# 70. Admin Promotion Management

Authorized admins should be able to:

``` text
Create promotion
Edit draft promotion
Activate
Pause
Archive
Configure eligibility
Configure usage limits
View usage
```

------------------------------------------------------------------------

# 71. Promotion Permissions

Promotion creation and activation should be permission-controlled.

High-impact discounts may require stronger permissions.

------------------------------------------------------------------------

# 72. Promotion Audit Log

Record important changes:

``` text
Promotion created
Promotion activated
Promotion paused
Discount changed
Eligibility changed
Usage limit changed
```

------------------------------------------------------------------------

# 73. Sensitive Promotion Changes

Changes to high-impact commercial rules may require:

``` text
Re-authentication
Approval
Audit record
```

according to business policy.

------------------------------------------------------------------------

# 74. Promotion Usage Reporting

Admin reporting may include:

``` text
Number of uses
Discount granted
Orders affected
Revenue
```

Financial reporting should reconcile against authoritative order data.

------------------------------------------------------------------------

# 75. Coupon Usage Records

Where usage limits exist, maintain an auditable relationship between:

``` text
Coupon
Customer where applicable
Order
Usage event
```

------------------------------------------------------------------------

# 76. Promotion Caching

Promotion configuration may be cached carefully.

However, cache invalidation must occur when promotions change.

Do not serve expired promotions indefinitely because of stale cache.

------------------------------------------------------------------------

# 77. Personalized Pricing Cache

Customer-specific prices must never be placed in a public shared cache.

------------------------------------------------------------------------

# 78. Pricing Cache Invalidation

Changes that should invalidate relevant pricing cache include:

``` text
Product price change
Promotion activation
Promotion pause
Promotion expiration
Wholesale status change
Relevant configuration change
```

------------------------------------------------------------------------

# 79. Promotion Performance

Pricing evaluation should remain efficient even when the catalog
contains many promotions.

Use appropriate:

``` text
Indexes
Targeting structures
Pre-filtering
Caching where safe
```

------------------------------------------------------------------------

# 80. Promotion Complexity

Avoid implementing an unrestricted rule engine in Phase 1.

Start with explicitly supported business rules.

This reduces:

``` text
Bugs
Security risk
Testing complexity
Admin confusion
Pricing ambiguity
```

------------------------------------------------------------------------

# 81. Promotion Versioning

For high-value promotions, consider retaining the effective
configuration/version associated with an order.

This improves historical auditability.

------------------------------------------------------------------------

# 82. Pricing Determinism

The same input should produce the same authoritative result.

This is essential for:

``` text
Cart
Checkout
Payment
Order history
Refund calculations
```

------------------------------------------------------------------------

# 83. Payment Amount Integration

The final amount sent to the payment provider must come from the same
authoritative pricing calculation used to create the order.

------------------------------------------------------------------------

# 84. Refund Integration

Refund calculations must reference the authoritative order/payment
records rather than recalculating historical prices from today's
catalog.

------------------------------------------------------------------------

# 85. Promotion Abuse Prevention

Controls may include:

``` text
Usage limits
Per-customer limits
Rate limiting
Eligibility checks
One-time-use records
Order-level validation
```

------------------------------------------------------------------------

# 86. Coupon Abuse

Monitor for:

``` text
Rapid code attempts
Repeated failed validation
Multiple accounts abusing one-per-customer rules
Unusual discount volume
```

------------------------------------------------------------------------

# 87. Promotion Race Conditions

Test scenarios such as:

``` text
Last coupon usage
Promotion expires during checkout
Admin disables promotion during checkout
Two concurrent checkouts
```

------------------------------------------------------------------------

# 88. Pricing Tests

Test:

``` text
Normal price
Percentage discount
Fixed discount
Minimum order
Maximum discount
Coupon
Expired coupon
Invalid coupon
Usage limit
Product restriction
Category restriction
Collection restriction
Wholesale pricing
Retail pricing
Promotion stacking
Rounding
```

------------------------------------------------------------------------

# 89. Checkout Pricing Tests

Test:

``` text
Cart total
Coupon application
Coupon removal
Quantity changes
Shipping changes
Checkout revalidation
Price changes during checkout
Promotion expiration
```

------------------------------------------------------------------------

# 90. Payment Pricing Tests

Verify:

``` text
Order total
=
Authoritative pricing result
=
Payment provider amount
```

for successful payment initiation.

------------------------------------------------------------------------

# 91. Security Tests

Verify that customers cannot:

``` text
Set price
Set discount
Set customer segment
Apply unauthorized wholesale pricing
Bypass coupon limits
Modify order totals
```

------------------------------------------------------------------------

# 92. Pricing Definition of Done

Pricing architecture is complete when:

-   Money calculations use exact decimal-safe values.
-   Server-side pricing is authoritative.
-   Retail and wholesale pricing are separated.
-   Product price snapshots exist for orders.
-   Promotion types are explicitly defined.
-   Eligibility is centralized.
-   Coupon validation is secure.
-   Usage limits are race-safe.
-   Stacking/precedence is deterministic.
-   Rounding rules are standardized.
-   Checkout revalidates pricing.
-   Payment uses authoritative totals.
-   Refunds use historical order values.
-   Promotion changes are audited.
-   Pricing cache behavior is safe.
-   Promotion abuse controls exist.
-   Pricing tests cover critical edge cases.

------------------------------------------------------------------------

# 93. AI Agent Pricing Rules

Antigravity must not:

-   Trust client-supplied price.
-   Trust client-supplied discount.
-   Trust client-supplied total.
-   Trust client-supplied retail/wholesale status.
-   Apply promotions directly in React and treat them as authoritative.
-   Use floating-point arithmetic for authoritative money calculations.
-   Recalculate historical order prices from current catalog data.
-   Allow accidental promotion stacking.
-   Consume coupons merely because they were typed into a cart.
-   Allow coupon usage races to exceed configured limits.
-   Put customer-specific prices into shared caches.
-   Let analytics or UTM parameters affect pricing.
-   Change a payment amount without revalidating the order.
-   Implement an unrestricted arbitrary rule engine without explicit
    requirements.

------------------------------------------------------------------------

# 94. Pricing Change Workflow

Changes should follow:

``` text
Business pricing requirement
   ↓
Rule definition
   ↓
Eligibility/precedence decision
   ↓
Domain design
   ↓
Database constraints
   ↓
Implementation
   ↓
Pricing unit tests
   ↓
Checkout integration tests
   ↓
Payment amount verification
   ↓
Concurrency/abuse tests
   ↓
Admin verification
   ↓
Production monitoring
```

------------------------------------------------------------------------

# 95. Pricing Architecture Summary

``` text
                    Customer Context
                           |
                       Cart Items
                           |
                    Pricing Service
                           |
              ┌────────────┼────────────┐
              ↓            ↓            ↓
          Base Price    Promotions    Coupons
              \            |            /
               └───────────┼───────────┘
                           ↓
                    Discount Result
                           |
                    Shipping / Tax
                           |
                     Final Total
                           |
                 ┌─────────┴─────────┐
                 ↓                   ↓
               Order              Payment
                 |
            Price Snapshot
                 |
             Audit/Reporting
```

The fundamental rule is:

``` text
Pricing is a backend domain responsibility.
The browser displays prices; it does not decide them.
Every discount must be explicitly eligible.
Every financial amount must be deterministic, auditable, and reproducible.
```

------------------------------------------------------------------------

# 96. Next Document

The next document should be:

``` text
33-background-jobs-async-architecture.md
```

It will define:

-   Celery/background worker architecture.
-   Redis/broker responsibilities.
-   Task categories.
-   Retry policies.
-   Idempotency.
-   Scheduled jobs.
-   Webhook processing.
-   Email/SMS jobs.
-   Image processing.
-   Reconciliation jobs.
-   Long-running admin operations.
-   Dead-letter/failure handling.
-   Monitoring.
-   Concurrency controls.
-   Graceful shutdown.
-   Operational safeguards.
