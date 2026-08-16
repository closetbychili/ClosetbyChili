# Closet by Chilli --- Cart & Checkout Architecture

## 1. Purpose

This document defines the cart and checkout architecture for Closet by
Chilli.

The cart and checkout system connects:

``` text
Catalog
Products
Variants
Pricing
Inventory
Promotions
Customer
Wholesale eligibility
Shipping
Payment
Order creation
```

The system must make checkout reliable even when:

``` text
Prices change
Inventory changes
Sessions expire
Payment attempts fail
Customers retry requests
Multiple users compete for limited stock
```

------------------------------------------------------------------------

# 2. Core Principles

The cart/checkout architecture follows:

``` text
Server-authoritative state
Server-authoritative pricing
Server-authoritative inventory
Explicit cart ownership
Idempotent checkout
Atomic critical operations
Clear validation
Safe retries
```

The browser is never the source of truth for financial or inventory
state.

------------------------------------------------------------------------

# 3. Cart Types

The architecture should support:

``` text
Guest cart
Authenticated customer cart
```

Wholesale customers use the same cart foundation with wholesale-specific
pricing and eligibility rules.

------------------------------------------------------------------------

# 4. Guest Cart

Guests should be able to add products to a cart where the business
requirements allow guest shopping.

A guest cart may be associated with a secure client-side/cart
identifier.

The identifier must not itself grant access to another customer's cart.

------------------------------------------------------------------------

# 5. Authenticated Cart

Authenticated customers should have a persistent server-side cart.

Conceptually:

``` text
Customer
   |
   └── Active Cart
          |
          └── Cart Items
```

The backend owns the authoritative cart contents.

------------------------------------------------------------------------

# 6. Guest-to-Account Cart Merge

When a guest signs in, the system may merge:

``` text
Guest cart
+
Existing customer cart
```

The merge must have explicit rules.

------------------------------------------------------------------------

# 7. Cart Merge Rules

A merge operation should validate:

``` text
Product availability
Variant availability
Quantity limits
Current pricing
Customer eligibility
Wholesale status
```

If the same variant exists in both carts, the system must define whether
quantities are:

``` text
Combined
or
Resolved using a defined precedence
```

Do not allow a merge to bypass inventory or quantity rules.

------------------------------------------------------------------------

# 8. Cart Ownership

Every authenticated cart operation must verify that the cart belongs to
the current customer.

Never authorize a cart operation solely from a client-provided cart ID.

------------------------------------------------------------------------

# 9. Cart Item Identity

A cart item should represent a purchasable product variant where
variants exist.

Conceptually:

``` text
Cart
  |
  ├── Variant A × 2
  ├── Variant B × 1
  └── Variant C × 3
```

The exact database relationship follows the approved domain model.

------------------------------------------------------------------------

# 10. Product vs Variant

The cart should reference the actual purchasable variant/SKU rather than
relying only on a product ID.

This is important for products with:

``` text
Size
Color
Other variant attributes
```

------------------------------------------------------------------------

# 11. Quantity Validation

When adding/updating an item, validate:

``` text
Quantity > 0
Maximum allowed quantity
Inventory availability
Wholesale minimums where applicable
```

The backend must enforce these rules.

------------------------------------------------------------------------

# 12. Quantity Limits

If a maximum purchasable quantity exists, enforce it server-side.

Do not rely on:

``` text
HTML input max
Frontend validation
Disabled buttons
```

for security.

------------------------------------------------------------------------

# 13. Add-to-Cart Operation

Conceptually:

``` text
POST /api/v1/cart/items/
```

The backend should:

``` text
Authenticate/identify cart
Validate product/variant
Validate availability
Validate quantity
Resolve applicable rules
Create/update cart item
Return authoritative cart state
```

------------------------------------------------------------------------

# 14. Update Cart Item

Updating quantity should revalidate:

``` text
Variant status
Availability
Customer eligibility
Quantity constraints
```

The client cannot force an unavailable quantity.

------------------------------------------------------------------------

# 15. Remove Cart Item

Removing an item should be idempotent where practical.

Repeated removal requests should not produce an invalid cart state.

------------------------------------------------------------------------

# 16. Cart Read

A cart response should return the information needed by the UI without
exposing unnecessary internal fields.

Potential data:

``` text
Cart ID
Items
Product summary
Variant summary
Quantity
Applicable unit price
Line subtotal
Discounts
Estimated shipping
Estimated total
Warnings
```

The final response contract belongs to the API architecture.

------------------------------------------------------------------------

# 17. Cart Prices

Cart prices should be treated as calculated/authoritative values rather
than trusted client state.

The backend should be able to reprice a cart when necessary.

------------------------------------------------------------------------

# 18. Price Changes

If a product price changes after the item is added:

``` text
Old cart state
      ↓
Checkout/cart validation
      ↓
Current authoritative price
```

The system must follow the approved pricing policy.

It must not allow a customer to submit an obsolete price from the
browser.

------------------------------------------------------------------------

# 19. Wholesale Pricing

For an approved wholesale customer:

``` text
Customer identity
      ↓
Wholesale eligibility
      ↓
Wholesale pricing rules
      ↓
Cart price
```

A retail customer must never be able to request wholesale pricing by
changing a client-side flag.

------------------------------------------------------------------------

# 20. Suspended Wholesale Cart

If a wholesale customer becomes suspended while a wholesale cart exists,
checkout must revalidate eligibility.

A stale cart must not preserve unauthorized wholesale access.

------------------------------------------------------------------------

# 21. Inventory Validation

Inventory must be validated when:

``` text
Adding item
Updating quantity
Opening/repricing cart where necessary
Checkout
Order creation
```

The exact frequency should balance UX and database load.

------------------------------------------------------------------------

# 22. Inventory Is Not Reserved Forever

A normal cart should not automatically imply permanently reserved stock
unless the business explicitly chooses a reservation model.

Otherwise:

``` text
Cart
≠
Guaranteed inventory
```

Final availability must be verified at checkout/order creation.

------------------------------------------------------------------------

# 23. Inventory Reservation

If inventory reservation is implemented, it must have:

``` text
Reservation owner
Reserved quantity
Created time
Expiration time
Release behavior
```

Expired reservations must be released safely.

------------------------------------------------------------------------

# 24. Inventory Race Conditions

Two customers may attempt to purchase the final available unit.

The checkout/order boundary must use appropriate database/transaction
controls so that only valid inventory can be committed.

------------------------------------------------------------------------

# 25. Cart Expiration

Guest and/or inactive carts may expire according to business rules.

Expiration should not silently delete important customer order history
because carts are not orders.

------------------------------------------------------------------------

# 26. Abandoned Carts

Abandoned carts may later support:

``` text
Analytics
Recovery campaigns
Customer reminders
```

Do not automatically send marketing messages without the required
consent/compliance rules.

------------------------------------------------------------------------

# 27. Cart Cleanup

Expired/abandoned carts may be cleaned up asynchronously.

Cleanup must not affect:

``` text
Completed orders
Payments
Historical order data
```

------------------------------------------------------------------------

# 28. Promotions

Promotions should be evaluated by the backend.

Potential rules include:

``` text
Coupon/code
Percentage discount
Fixed discount
Product eligibility
Category eligibility
Minimum order value
Customer eligibility
Wholesale/retail eligibility
Start/end time
Usage limit
```

Only implement supported business rules.

------------------------------------------------------------------------

# 29. Coupon Codes

Coupon validation must be server-side.

The client may submit:

``` text
coupon_code
```

but the backend determines:

``` text
Valid?
Eligible?
Discount amount?
Applicable items?
```

------------------------------------------------------------------------

# 30. Coupon Application

Applying a coupon should return an authoritative cart result.

The frontend should not calculate the discount independently and submit
it as truth.

------------------------------------------------------------------------

# 31. Coupon Removal

Customers should be able to remove an applied promotion where the UX
requires it.

The backend should recalculate totals after removal.

------------------------------------------------------------------------

# 32. Promotion Changes

If a promotion expires while a customer has a cart:

``` text
Cart
   ↓
Revalidation
   ↓
Promotion no longer applicable
```

The checkout system must not allow the expired discount merely because
it was previously displayed.

------------------------------------------------------------------------

# 33. Multiple Promotions

If multiple promotions can apply, the combination rules must be
explicit.

Examples:

``` text
Stackable
Non-stackable
Highest discount
Specific priority
```

Do not invent stacking behavior during implementation.

------------------------------------------------------------------------

# 34. Cart Totals

The backend should calculate:

``` text
Subtotal
Discounts
Shipping
Tax where applicable
Grand total
Currency
```

The exact commercial formula follows the approved pricing/tax
architecture.

------------------------------------------------------------------------

# 35. Money Representation

Use the approved safe monetary representation.

Never use floating-point arithmetic for authoritative totals.

------------------------------------------------------------------------

# 36. Cart Total Invariants

The backend should enforce appropriate invariants such as:

``` text
line totals are valid
discounts do not exceed allowed values
total is calculated from authoritative inputs
currency is consistent
```

------------------------------------------------------------------------

# 37. Checkout Boundary

Checkout begins when the customer moves from shopping/cart state into
order/payment preparation.

Conceptually:

``` text
Cart
 ↓
Checkout session
 ↓
Validation
 ↓
Shipping/address
 ↓
Final pricing
 ↓
Order creation
 ↓
Payment
```

------------------------------------------------------------------------

# 38. Checkout Session

A checkout session may be used to hold temporary checkout state such as:

``` text
Cart reference
Shipping address
Shipping method
Selected payment method
Pricing snapshot/calculation context
Expiration
```

The exact model depends on implementation.

------------------------------------------------------------------------

# 39. Checkout Session Security

Checkout sessions must be scoped to the appropriate:

``` text
Customer
Guest cart/session
```

A customer must not be able to access another customer's checkout
session by changing an identifier.

------------------------------------------------------------------------

# 40. Checkout Expiration

Checkout sessions should expire after an appropriate period.

Expired checkout state should be revalidated rather than blindly reused.

------------------------------------------------------------------------

# 41. Checkout Address

Checkout should collect/select:

``` text
Shipping address
```

and any other information required by the shipping/tax/payment workflow.

------------------------------------------------------------------------

# 42. Address Ownership

When selecting a saved address, verify that the address belongs to the
authenticated customer.

Do not accept an arbitrary address ID from the browser.

------------------------------------------------------------------------

# 43. Guest Address

Guest checkout may collect an address directly if guest checkout is
enabled.

The address must be validated server-side.

------------------------------------------------------------------------

# 44. Shipping Method

Available shipping methods should be determined by backend business
rules.

Potential inputs:

``` text
Destination
Order value
Weight where available
Customer type
Product restrictions
```

The browser may select from returned options but cannot invent shipping
costs.

------------------------------------------------------------------------

# 45. Shipping Cost

Shipping cost must be authoritative.

The final order should use the backend-calculated/verified shipping
amount.

------------------------------------------------------------------------

# 46. Shipping Recalculation

Shipping may need recalculation if:

``` text
Address changes
Cart changes
Shipping method changes
Promotion changes
Wholesale status changes
```

------------------------------------------------------------------------

# 47. Tax Calculation

If taxes apply, tax calculation must be server-side and based on the
approved tax/business architecture.

Do not allow clients to submit arbitrary tax amounts.

------------------------------------------------------------------------

# 48. Checkout Validation

At final checkout, validate all important inputs again:

``` text
Cart ownership
Cart items
Product status
Variant status
Inventory
Price
Promotions
Wholesale eligibility
Minimum order rules
Address
Shipping method
Shipping cost
Tax
Final total
Currency
```

------------------------------------------------------------------------

# 49. Revalidation Principle

Anything that can change between:

``` text
Add to cart
```

and:

``` text
Place order
```

must be treated as potentially stale.

------------------------------------------------------------------------

# 50. Final Total Authority

The final payment amount must come from the backend's final checkout
calculation.

Conceptually:

``` text
Cart
 ↓
Final validation
 ↓
Authoritative total
 ↓
Payment creation
```

------------------------------------------------------------------------

# 51. Checkout Idempotency

The place-order/checkout operation must be idempotent.

A network retry must not create:

``` text
Two orders
Two payment attempts
Two charges
```

for the same logical checkout operation.

------------------------------------------------------------------------

# 52. Checkout Idempotency Key

The client may provide an idempotency key for a checkout operation.

The backend must:

``` text
Validate scope
Store/recognize the operation
Return the original result for safe retries
Reject conflicting reuse
```

------------------------------------------------------------------------

# 53. Idempotency Scope

The idempotency key should be scoped to the appropriate:

``` text
Customer/cart
Checkout operation
```

It must not be globally reusable by unrelated customers.

------------------------------------------------------------------------

# 54. Checkout Retry

If the client times out after submitting checkout:

``` text
Do not blindly submit again.
```

Instead:

``` text
Retry using the same idempotency context
or
Query the existing checkout/order state
```

------------------------------------------------------------------------

# 55. Order Creation Boundary

The system must clearly define when the cart becomes an order.

Conceptually:

``` text
Cart
   ↓
Validated checkout
   ↓
Order created
   ↓
Cart no longer represents the active purchase
```

The exact cart-clearing behavior should be defined by the
implementation.

------------------------------------------------------------------------

# 56. Cart Clearing

After successful order creation, the purchased cart items should no
longer remain as an active purchasable cart.

Do not clear the cart prematurely if doing so could lose a valid retry
context.

------------------------------------------------------------------------

# 57. Payment Interaction

The checkout architecture should hand off to the payment architecture
after final validation.

``` text
Checkout
   ↓
Authoritative total
   ↓
Payment creation
   ↓
Provider
```

The payment system remains responsible for payment-specific state and
verification.

------------------------------------------------------------------------

# 58. Payment Callback

A browser payment callback does not by itself make the order paid.

The backend must use the approved payment confirmation mechanism.

------------------------------------------------------------------------

# 59. Checkout Failure

If checkout fails before order creation:

``` text
Cart remains available
```

where safe.

If order creation succeeds but payment setup fails, the system must use
the defined order/payment recovery workflow.

------------------------------------------------------------------------

# 60. Partial Checkout Failures

The implementation must explicitly handle:

``` text
Cart validation succeeds
Order creation fails

Order creation succeeds
Payment setup fails

Payment provider accepts request
Client loses connection

Payment succeeds
Webhook arrives later
```

These are normal distributed-system failure scenarios.

------------------------------------------------------------------------

# 61. Customer Checkout UX

The checkout UI should clearly communicate:

``` text
Current step
Selected address
Shipping method
Order summary
Discount
Final total
Payment state
Errors
```

------------------------------------------------------------------------

# 62. Checkout Steps

A possible flow:

``` text
Cart
  ↓
Address
  ↓
Shipping
  ↓
Review
  ↓
Payment
  ↓
Confirmation
```

The final UX may combine steps for simplicity.

------------------------------------------------------------------------

# 63. Mobile Checkout

Checkout should be optimized for mobile.

Prioritize:

``` text
Simple forms
Large touch targets
Clear totals
Minimal unnecessary navigation
Fast validation
```

------------------------------------------------------------------------

# 64. Checkout Error Handling

Errors should be associated with the relevant operation.

Examples:

``` text
Address invalid
Product out of stock
Promotion expired
Shipping unavailable
Payment pending
Payment failed
```

Avoid generic messages when a safe actionable message can be shown.

------------------------------------------------------------------------

# 65. Stale Cart Errors

If a product becomes unavailable during checkout, the customer should
receive a clear explanation and an opportunity to update the cart.

Do not silently change the customer's quantity without informing them.

------------------------------------------------------------------------

# 66. Price Change UX

If a price changes during checkout, the customer should be informed
before final payment.

The exact policy may be:

``` text
Show updated price
Require acknowledgement
Recalculate total
```

The business must approve the final UX.

------------------------------------------------------------------------

# 67. Inventory Change UX

If inventory changes during checkout:

``` text
Revalidate
 ↓
Explain unavailable quantity
 ↓
Allow cart update
```

Do not accept an impossible order.

------------------------------------------------------------------------

# 68. Wholesale Checkout

Wholesale checkout should reuse the shared checkout system.

Additional validation may include:

``` text
Wholesale approval
Minimum order quantity
Minimum order value
Wholesale pricing
Wholesale shipping rules
Wholesale payment rules
```

------------------------------------------------------------------------

# 69. Retail Checkout

Retail checkout uses the same core flow without wholesale-only
requirements.

The backend still validates:

``` text
Customer/cart
Pricing
Inventory
Shipping
Payment
```

------------------------------------------------------------------------

# 70. Guest Checkout

If enabled, guest checkout should define:

``` text
Required customer information
Order lookup method
Email/notification behavior
Account creation option
```

The exact policy should follow Phase 1 requirements.

------------------------------------------------------------------------

# 71. Guest Order Security

Guest order lookup must not expose orders based on a guessable order
number alone.

Use an appropriate secure verification mechanism.

------------------------------------------------------------------------

# 72. Cart Persistence

Authenticated carts should persist across sessions according to the
business UX.

Guest cart persistence may use:

``` text
Secure cookie/token
Server-side cart record
```

The chosen strategy must avoid storing sensitive financial information
in insecure client storage.

------------------------------------------------------------------------

# 73. Browser Storage

Do not store sensitive authoritative checkout/payment information in:

``` text
localStorage
sessionStorage
```

unless explicitly justified and safe.

------------------------------------------------------------------------

# 74. Cart API Security

Cart APIs must validate:

``` text
Authentication/cart ownership
Input schema
Product/variant existence
Quantity
Customer eligibility
```

------------------------------------------------------------------------

# 75. Checkout API Security

Checkout APIs must additionally validate:

``` text
Address ownership
Shipping method
Final pricing
Promotion eligibility
Inventory
Idempotency
```

------------------------------------------------------------------------

# 76. Rate Limiting

Cart and checkout endpoints should be protected against abusive request
volume.

Especially consider:

``` text
Add-to-cart spam
Coupon brute force
Checkout spam
Payment initiation abuse
```

Rate limits must not prevent legitimate high-frequency customer
interactions unnecessarily.

------------------------------------------------------------------------

# 77. Coupon Abuse Protection

Promotion endpoints should guard against:

``` text
Brute-force coupon guessing
Excessive validation attempts
Automated enumeration
```

------------------------------------------------------------------------

# 78. Checkout Logging

Safe logs may include:

``` text
Request ID
Cart ID
Order ID where available
Checkout event
Result
Failure category
```

Never log:

``` text
Payment secrets
Passwords
Full sensitive payment data
```

------------------------------------------------------------------------

# 79. Checkout Observability

Monitor:

``` text
Cart creation
Add-to-cart success/failure
Checkout starts
Checkout completion
Checkout abandonment
Out-of-stock failures
Price-change failures
Promotion failures
Payment initiation
```

------------------------------------------------------------------------

# 80. Checkout Funnel

A useful business funnel is:

``` text
Product view
   ↓
Add to cart
   ↓
Cart view
   ↓
Checkout started
   ↓
Address completed
   ↓
Payment initiated
   ↓
Order completed
```

This helps identify where customers are dropping out.

------------------------------------------------------------------------

# 81. Abandoned Checkout

An abandoned checkout should be distinguishable from:

``` text
Failed payment
Completed order
Cancelled order
```

Do not classify every incomplete checkout as payment failure.

------------------------------------------------------------------------

# 82. Checkout Notifications

Notifications should be triggered from authoritative events.

For example:

``` text
Order created
Payment confirmed
Order shipped
```

rather than from a frontend click alone.

------------------------------------------------------------------------

# 83. Checkout Performance

Checkout should minimize unnecessary API calls.

Prefer:

``` text
Efficient cart retrieval
Efficient address retrieval
Efficient shipping calculation
Efficient final validation
```

Avoid repeatedly recalculating expensive operations on every keystroke.

------------------------------------------------------------------------

# 84. Debounced Validation

Client-side validation may improve UX.

For expensive server validation, use controlled/debounced requests where
appropriate.

Client-side validation remains a UX optimization, not a security
boundary.

------------------------------------------------------------------------

# 85. Database Transactions

Critical checkout operations should use appropriate database
transactions.

Potentially coordinated operations include:

``` text
Validate inventory
Create order
Create order lines
Record financial snapshot
Update inventory/reservation
Create payment context
```

The exact atomic boundary must be designed carefully.

------------------------------------------------------------------------

# 86. Transaction vs External Provider

Do not assume a database transaction can atomically include an external
payment provider.

The architecture must handle distributed failure explicitly.

------------------------------------------------------------------------

# 87. Checkout State Recovery

If a distributed failure occurs, the system should be able to determine:

``` text
Was an order created?
Was payment created?
Was payment confirmed?
Was inventory committed?
```

This is why identifiers, idempotency, and reconciliation are essential.

------------------------------------------------------------------------

# 88. Checkout Reconciliation

Where required, background processes should detect inconsistent
checkout/payment states.

Examples:

``` text
Order exists + payment unknown
Payment exists + webhook missing
Payment succeeded + order not finalized
```

------------------------------------------------------------------------

# 89. Cart/Checkout Testing

Tests should cover:

``` text
Guest cart
Authenticated cart
Cart merge
Add item
Update quantity
Remove item
Out-of-stock
Price change
Wholesale pricing
Wholesale suspension
Coupon
Expired coupon
Shipping
Address ownership
Checkout idempotency
Duplicate checkout
Payment failure
Payment pending
Payment success
```

------------------------------------------------------------------------

# 90. Security Testing

Security tests should verify:

``` text
Cannot access another customer's cart
Cannot modify another customer's cart
Cannot force wholesale pricing
Cannot change totals
Cannot bypass inventory
Cannot reuse another customer's checkout
Cannot bypass coupon rules
Cannot create duplicate orders
```

------------------------------------------------------------------------

# 91. Performance Testing

Test with realistic:

``` text
Catalog size
Cart size
Promotion rules
Concurrent checkout attempts
Inventory contention
```

Do not validate only with a single local user.

------------------------------------------------------------------------

# 92. Cart & Checkout Definition of Done

The feature is complete when:

-   Guest/authenticated cart behavior is defined.
-   Cart ownership is enforced.
-   Product/variant validation exists.
-   Pricing is server-authoritative.
-   Inventory is validated.
-   Promotions are server-authoritative.
-   Wholesale eligibility is enforced.
-   Checkout state is protected.
-   Final totals are authoritative.
-   Checkout is idempotent.
-   Order creation boundaries are defined.
-   Payment integration is connected correctly.
-   Failure/recovery scenarios are handled.
-   Customer UX handles stale state.
-   Security tests exist.
-   Observability exists.

------------------------------------------------------------------------

# 93. AI Agent Cart/Checkout Rules

Antigravity must not:

-   Trust client-side prices.
-   Trust client-side totals.
-   Trust client-side inventory.
-   Allow cart access by ID without ownership validation.
-   Treat a cart as guaranteed inventory unless explicitly reserved.
-   Allow retail users to request wholesale prices.
-   Bypass minimum-order rules.
-   Accept arbitrary shipping costs.
-   Trust client-side payment success.
-   Create duplicate orders on retry.
-   Retry financial operations without idempotency.
-   Store sensitive payment information in browser storage.
-   Clear a cart before the system can safely recover the checkout.
-   Hide stale-price or stale-inventory changes from the customer.

------------------------------------------------------------------------

# 94. Cart/Checkout Change Workflow

Changes should follow:

``` text
Requirement
   ↓
Cart/pricing review
   ↓
Inventory review
   ↓
Payment/order boundary review
   ↓
Security review
   ↓
Implementation
   ↓
Unit/integration tests
   ↓
Concurrency/idempotency tests
   ↓
Staging checkout tests
   ↓
Production monitoring
```

------------------------------------------------------------------------

# 95. Cart & Checkout Architecture Summary

``` text
                       Customer
                          |
                     Product Page
                          |
                     Add to Cart
                          |
                    ┌─────┴─────┐
                    ↓           ↓
                 Guest      Authenticated
                    \           /
                     \         /
                       Cart
                        |
                 Cart validation
                        |
                    Checkout
                        |
          ┌─────────────┼─────────────┐
          ↓             ↓             ↓
       Address       Shipping      Promotions
          \             |             /
           \            |            /
              Final validation
                     |
              Authoritative total
                     |
                 Order creation
                     |
                  Payment
                     |
               Confirmation
                     |
                   Order
```

The fundamental rule is:

``` text
The cart is customer interaction state.
Checkout is a server-side validation boundary.
The order is the durable commercial record.
Payment is a separate verified financial subsystem.
```

------------------------------------------------------------------------

# 96. Next Document

The next document should be:

``` text
23-search-catalog-architecture.md
```

It will define:

-   Catalog browsing.
-   Category architecture.
-   Product listing pages.
-   Filters.
-   Sorting.
-   Search.
-   Search indexing.
-   Product discovery.
-   Faceted navigation.
-   Pagination.
-   URL/query-parameter strategy.
-   Retail vs wholesale visibility.
-   Search performance.
-   Empty states.
-   No-result behavior.
-   SEO interaction.
-   Caching.
-   Future dedicated search-engine migration strategy.
