# Closet by Chilli --- Payment Architecture

## 1. Purpose

This document defines the payment architecture for Closet by Chilli.

Payments are a critical financial subsystem and must be designed around:

``` text
Correctness
Security
Idempotency
Reconciliation
Auditability
Provider independence
Failure recovery
```

The payment system must never rely on the browser as the source of truth
for financial state.

------------------------------------------------------------------------

# 2. Payment Principles

The payment architecture follows:

``` text
Django = authoritative business state
Payment provider = authoritative external payment event source
Database = authoritative internal record
Browser = untrusted payment client
Webhook = verified asynchronous provider signal
```

------------------------------------------------------------------------

# 3. Payment Provider

The exact production payment provider is a deployment/business decision
and must be selected before payment implementation.

The architecture must isolate provider-specific code behind a payment
integration boundary.

Conceptually:

``` text
Django
   |
Payment Service
   |
Provider Adapter
   |
Payment Provider
```

This prevents provider-specific logic from spreading throughout the
application.

------------------------------------------------------------------------

# 4. Provider Abstraction

The payment domain should expose internal operations such as:

``` text
Create payment
Get payment status
Capture payment where applicable
Cancel payment where applicable
Refund payment
Handle webhook
```

Provider-specific API formats should remain inside the provider
integration layer.

------------------------------------------------------------------------

# 5. Payment Entities

The payment architecture should distinguish between:

``` text
Order
Payment
Payment attempt
Provider event/webhook
Refund
```

The exact database entities and relationships follow the approved
database/domain architecture.

------------------------------------------------------------------------

# 6. Order vs Payment

An order and a payment are not the same thing.

Conceptually:

``` text
Order
  |
  +── Payment
        |
        +── Payment attempts
        +── Provider events
        +── Refunds
```

An order may have payment state that changes over time.

------------------------------------------------------------------------

# 7. Payment Lifecycle

A conceptual payment lifecycle is:

``` text
CREATED
   ↓
PENDING
   ↓
AUTHORIZED / SUCCEEDED
   ↓
CAPTURED / CONFIRMED where applicable
```

Failure paths may include:

``` text
FAILED
CANCELLED
EXPIRED
```

The exact states depend on the selected provider and payment model.

------------------------------------------------------------------------

# 8. Internal Payment State

The internal payment state must be normalized.

Do not expose provider-specific states directly as the application's
core business state.

For example:

``` text
Provider-specific status
        ↓
Provider adapter
        ↓
Internal payment state
```

------------------------------------------------------------------------

# 9. Payment State Machine

Payment transitions must be controlled.

Conceptually:

``` text
PENDING
  ├──> SUCCEEDED
  ├──> FAILED
  ├──> CANCELLED
  └──> EXPIRED
```

Invalid transitions must be rejected.

For example, an already-refunded payment should not silently become
successful again.

------------------------------------------------------------------------

# 10. Checkout Boundary

Checkout is the business operation that prepares an order/payment.

Conceptually:

``` text
Cart
 ↓
Checkout validation
 ↓
Order creation/reservation
 ↓
Payment creation
 ↓
Payment provider
 ↓
Verified result/webhook
 ↓
Final order/payment state
```

The exact transaction boundaries must be defined during implementation.

------------------------------------------------------------------------

# 11. Server-Side Checkout Validation

Before initiating payment, Django must validate:

``` text
Customer
Cart ownership
Product/variant availability
Prices
Discounts
Taxes where applicable
Shipping
Wholesale eligibility
Minimum order requirements
Order totals
```

Never trust totals supplied by the browser.

------------------------------------------------------------------------

# 12. Price Authority

The backend calculates authoritative:

``` text
Unit price
Quantity
Discount
Shipping
Tax where applicable
Subtotal
Total
```

The payment amount sent to the provider must come from the validated
server-side calculation.

------------------------------------------------------------------------

# 13. Client-Supplied Amounts

A client request must never be able to dictate:

``` text
payment amount
order total
discount amount
tax amount
shipping amount
```

The backend must derive these values from authoritative data.

------------------------------------------------------------------------

# 14. Payment Initiation

A typical flow is:

``` text
POST /checkout/
        ↓
Validate cart/order
        ↓
Create payment record
        ↓
Create provider payment intent/order
        ↓
Return safe provider/client information
```

The browser then completes the provider-specific payment flow.

------------------------------------------------------------------------

# 15. Browser Trust Boundary

The browser may report:

``` text
Payment UI completed
Provider payment identifier
Client-side payment result
```

but these values do not by themselves make the order paid.

The backend must verify the payment through trusted provider mechanisms.

------------------------------------------------------------------------

# 16. Payment Confirmation

Payment confirmation should be based on an authoritative signal such as:

``` text
Verified provider API response
or
Verified provider webhook
```

The exact precedence must be defined for the selected provider.

------------------------------------------------------------------------

# 17. Webhooks

Provider webhooks are a critical part of the payment architecture.

Conceptually:

``` text
Payment Provider
      ↓
Webhook endpoint
      ↓
Signature verification
      ↓
Event validation
      ↓
Idempotent processing
      ↓
Payment/order state update
```

------------------------------------------------------------------------

# 18. Webhook Authentication

Every payment webhook must verify provider authenticity according to the
provider's documented mechanism.

Do not trust:

``` text
Source IP alone
Client-provided status
Unverified payloads
```

------------------------------------------------------------------------

# 19. Webhook Signature Verification

The webhook implementation should:

``` text
Read the raw provider payload as required
Verify the provider signature
Validate required headers
Reject invalid signatures
Only then process the event
```

The exact algorithm depends on the provider.

------------------------------------------------------------------------

# 20. Webhook Idempotency

Webhook events may be delivered more than once.

The system must process duplicate events safely.

Conceptually:

``` text
Provider event ID
      ↓
Already processed?
   /          \
 Yes           No
 ↓              ↓
Ignore       Process
```

------------------------------------------------------------------------

# 21. Provider Event Records

Where appropriate, persist provider event identifiers and processing
status.

Potential information:

``` text
Provider
Provider event ID
Event type
Received timestamp
Processing status
Processed timestamp
Failure information
```

Do not store unnecessary sensitive payload data.

------------------------------------------------------------------------

# 22. Duplicate Webhooks

A duplicate webhook must not:

``` text
Create another order
Charge the customer again
Create another refund
Increment inventory twice
Send duplicate critical notifications
```

------------------------------------------------------------------------

# 23. Out-of-Order Webhooks

Providers may deliver events in an unexpected order.

The implementation must not blindly apply every event.

For example:

``` text
Succeeded
   ↓
Pending
```

must not regress the internal state if the later event is stale.

------------------------------------------------------------------------

# 24. Event Ordering

Payment state transitions should consider:

``` text
Current internal state
Provider event type
Provider event timestamp where trustworthy
Provider event identifier
```

The final state machine should explicitly define allowed transitions.

------------------------------------------------------------------------

# 25. Payment Idempotency

Payment creation must support idempotency where the provider supports
it.

The client should use an idempotency strategy for retryable financial
operations.

Conceptually:

``` text
Checkout request
      ↓
Idempotency key
      ↓
One logical payment operation
```

------------------------------------------------------------------------

# 26. Idempotency Scope

An idempotency key should be scoped to the appropriate:

``` text
Customer
Operation
Order/checkout attempt
```

It must not allow one customer to replay another customer's operation.

------------------------------------------------------------------------

# 27. Idempotency Conflict

If the same idempotency key is reused with materially different request
data, the system should reject the request rather than silently changing
the original operation.

------------------------------------------------------------------------

# 28. Network Failure During Payment

A key failure scenario is:

``` text
Django creates payment
        ↓
Provider accepts request
        ↓
Network response is lost
        ↓
Django does not know immediate result
```

The system must not assume failure simply because the HTTP response was
lost.

Use:

``` text
Provider lookup
Webhook
Idempotency
Reconciliation
```

as appropriate.

------------------------------------------------------------------------

# 29. Payment Pending

A payment may remain pending.

The customer-facing application should represent this explicitly rather
than incorrectly showing:

``` text
Paid
```

or:

``` text
Failed
```

before authoritative confirmation.

------------------------------------------------------------------------

# 30. Order State During Pending Payment

The order/payment relationship must define what happens while payment is
pending.

Potential model:

``` text
Order created
Payment pending
Order not yet fulfillment-ready
```

The exact state machine follows the approved order architecture.

------------------------------------------------------------------------

# 31. Successful Payment

When payment is authoritatively confirmed:

``` text
Payment → successful/confirmed
Order → appropriate paid state
Inventory → finalized according to inventory strategy
Fulfillment → eligible where applicable
```

These operations must be implemented with appropriate transaction and
consistency controls.

------------------------------------------------------------------------

# 32. Failed Payment

A failed payment should:

``` text
Record failure
Keep financial state accurate
Prevent fulfillment as appropriate
Allow safe retry where business rules permit
```

Do not create duplicate orders unnecessarily when retrying payment.

------------------------------------------------------------------------

# 33. Payment Retry

A customer may need to retry a failed/pending payment.

The architecture should distinguish:

``` text
Original payment attempt
New payment attempt
Same logical order
```

where the business workflow supports this.

------------------------------------------------------------------------

# 34. Payment Attempts

A payment record may have multiple attempts.

Conceptually:

``` text
Order
  |
  └── Payment
        |
        ├── Attempt 1 → FAILED
        ├── Attempt 2 → FAILED
        └── Attempt 3 → SUCCEEDED
```

The exact model should follow the approved domain design.

------------------------------------------------------------------------

# 35. Duplicate Successful Payments

The system must protect against accidental double payment.

Potential protections:

``` text
Idempotency
Order payment-state checks
Provider-side idempotency
Payment attempt uniqueness
Reconciliation
```

------------------------------------------------------------------------

# 36. Payment-to-Order Association

Every payment attempt must be associated with the correct internal
order/checkout context.

Never allow a client to attach a payment result to an arbitrary order ID
without server-side authorization and verification.

------------------------------------------------------------------------

# 37. Payment Amount Verification

When processing provider results, verify that the provider-side
amount/currency corresponds to the expected internal payment.

Conceptually:

``` text
Expected amount
      =
Provider-confirmed amount
```

If there is a mismatch:

``` text
Do not mark the order successfully paid.
Create an operational/reconciliation exception.
```

------------------------------------------------------------------------

# 38. Currency Verification

The payment currency must match the expected order currency.

Do not assume that a successful provider transaction is valid for the
order if:

``` text
Currency differs
```

------------------------------------------------------------------------

# 39. Currency

The initial storefront currency is expected to be:

``` text
INR
```

The implementation should still store currency explicitly with financial
records rather than assuming it globally forever.

------------------------------------------------------------------------

# 40. Monetary Precision

Money must not be represented using floating-point arithmetic for
authoritative financial calculations.

Use an appropriate decimal/integer minor-unit strategy consistently
across:

``` text
Prices
Discounts
Taxes
Shipping
Payment amounts
Refunds
Order totals
```

------------------------------------------------------------------------

# 41. Order Total Snapshot

At order creation, persist authoritative financial values.

Potential snapshots:

``` text
Unit price
Quantity
Discount
Tax
Shipping
Subtotal
Total
Currency
```

Historical orders must not change when product pricing later changes.

------------------------------------------------------------------------

# 42. Refunds

Refunds are separate financial operations.

Conceptually:

``` text
Payment
   |
   └── Refund(s)
```

The refund architecture must support the business's required refund
model.

------------------------------------------------------------------------

# 43. Full Refund

A full refund should validate:

``` text
Payment state
Already refunded amount
Requested refund amount
Authorization
Provider capability
```

------------------------------------------------------------------------

# 44. Partial Refund

If supported, partial refunds must ensure:

``` text
Total refunded ≤ Captured/paid amount
```

The same payment amount must never be refunded twice.

------------------------------------------------------------------------

# 45. Refund Idempotency

Refund requests should be idempotent.

A retry caused by a network failure must not create two refunds.

------------------------------------------------------------------------

# 46. Refund Provider Verification

The internal refund state should be based on a verified provider result.

Do not mark a refund successful merely because an admin clicked:

``` text
Refund
```

------------------------------------------------------------------------

# 47. Refund Webhooks

If the provider sends refund events, those events must be verified and
processed idempotently.

------------------------------------------------------------------------

# 48. Refund and Order State

Order state and payment/refund state should remain related but distinct.

For example:

``` text
Order = Cancelled
Payment = Partially refunded
```

may be valid depending on business rules.

Do not collapse all financial and fulfillment states into one enum.

------------------------------------------------------------------------

# 49. Payment Reconciliation

The system should support reconciliation between:

``` text
Internal payment records
        ↕
Provider payment records
```

Reconciliation helps identify:

``` text
Missing webhook
Duplicate event
Amount mismatch
Unexpected payment
Unexpected refund
```

------------------------------------------------------------------------

# 50. Reconciliation Jobs

Where required, scheduled/background reconciliation may:

``` text
Fetch provider payment state
Compare internal state
Identify mismatches
Create exceptions
```

Do not automatically make dangerous financial changes without a
controlled policy.

------------------------------------------------------------------------

# 51. Reconciliation Exceptions

An exception should capture:

``` text
Internal payment
Provider payment
Mismatch type
Detected time
Status
Resolution
Actor where manually resolved
```

------------------------------------------------------------------------

# 52. Manual Reconciliation

Financial exceptions may require authorized staff review.

Manual reconciliation actions must be:

``` text
Permission-controlled
Audited
Explicit
```

------------------------------------------------------------------------

# 53. Admin Payment Operations

Admin users may need to:

``` text
View payment status
View provider identifiers
View payment attempts
View refund state
Review reconciliation issues
Initiate approved refunds
```

They must not be able to arbitrarily edit authoritative payment status.

------------------------------------------------------------------------

# 54. Payment Data Exposure

Admin/payment interfaces should avoid exposing:

``` text
Full card numbers
CVV
Payment secrets
Provider credentials
Authentication tokens
```

Only operational identifiers and safe provider metadata should be shown.

------------------------------------------------------------------------

# 55. PCI Considerations

The platform should minimize direct handling of sensitive cardholder
data.

Where possible, use the payment provider's hosted/tokenized/client-side
payment mechanisms.

The exact PCI obligations depend on the selected provider and
integration model and must be verified before production launch.

------------------------------------------------------------------------

# 56. Payment Secrets

Provider secrets must remain server-side.

Examples:

``` text
API secret
Webhook secret
Private signing key
```

Never expose them to:

``` text
Next.js browser bundle
Client-side environment variables
Logs
Database records unless specifically required and protected
```

------------------------------------------------------------------------

# 57. Webhook Secret Rotation

Webhook secrets should be rotatable according to provider capabilities.

The rotation procedure must avoid unnecessary payment interruption.

------------------------------------------------------------------------

# 58. Payment Timeouts

External payment requests should use appropriate timeouts.

Do not allow a provider outage to leave Django worker threads/processes
blocked indefinitely.

------------------------------------------------------------------------

# 59. Payment Retries

Retries must be carefully classified.

Potentially safe:

``` text
Idempotent provider lookup
```

Potentially dangerous without idempotency:

``` text
Payment creation
Refund creation
Capture
```

------------------------------------------------------------------------

# 60. Provider Failure

If the payment provider is unavailable:

``` text
Do not mark payments failed purely because the provider timed out.
Do not create duplicate charges.
Record the uncertainty.
Use provider reconciliation/status lookup.
```

------------------------------------------------------------------------

# 61. Checkout Failure Recovery

A failed checkout should leave the customer with a clear state.

The system should avoid:

``` text
Paid but no order
Order created but no payment record
Duplicate order
Duplicate charge
```

------------------------------------------------------------------------

# 62. Payment and Inventory

The relationship between payment and inventory must follow the approved
inventory strategy.

Possible models include:

``` text
Reserve inventory during checkout
Deduct at order creation
Deduct after payment confirmation
```

The final choice must be explicit.

------------------------------------------------------------------------

# 63. Inventory Race Conditions

If multiple customers attempt to purchase the last units simultaneously,
the system must use appropriate database/transaction controls.

Payment confirmation alone does not solve inventory concurrency.

------------------------------------------------------------------------

# 64. Wholesale Payments

Wholesale payments should use the same payment foundation unless the
business requires a separate payment workflow.

Wholesale-specific rules may affect:

``` text
Eligibility
Payment terms
Minimum order value
Payment method
```

------------------------------------------------------------------------

# 65. Payment Methods

The platform should support only payment methods actually enabled with
the selected provider.

Potential methods may include:

``` text
UPI
Cards
Net banking
Wallets
Other provider-supported methods
```

The exact production list must be confirmed with the client/provider.

------------------------------------------------------------------------

# 66. Payment Method Security

The backend must not trust the payment method reported by the frontend
as proof of successful payment.

Provider confirmation remains authoritative.

------------------------------------------------------------------------

# 67. Customer Payment UX

The customer should see clear states:

``` text
Payment required
Payment processing
Payment successful
Payment failed
Payment pending
Payment needs attention
```

Avoid ambiguous messages such as:

``` text
Something went wrong
```

when a meaningful safe state can be shown.

------------------------------------------------------------------------

# 68. Payment Failure UX

Failure messages should be:

``` text
Clear
Non-sensitive
Actionable
```

Do not expose raw provider errors or internal exceptions.

------------------------------------------------------------------------

# 69. Payment Success UX

After successful confirmation, the customer should be directed to a
reliable order confirmation state.

The frontend should retrieve authoritative order status from the backend
rather than relying solely on client-side payment callbacks.

------------------------------------------------------------------------

# 70. Refresh Safety

Refreshing a payment/order confirmation page must not:

``` text
Create another payment
Create another order
Trigger another refund
```

The architecture must make confirmation views idempotent/read-only.

------------------------------------------------------------------------

# 71. Browser Navigation

Back/forward navigation during checkout must not create duplicate
financial operations.

Checkout actions should have explicit server-side idempotency.

------------------------------------------------------------------------

# 72. Payment Observability

Monitor:

``` text
Payment attempts
Success rate
Failure rate
Pending rate
Provider latency
Webhook failures
Webhook processing time
Refund failures
Reconciliation exceptions
Amount mismatches
```

------------------------------------------------------------------------

# 73. Payment Alerts

Potential critical alerts:

``` text
Payment success rate drops sharply
Provider unavailable
Webhook verification failures spike
Payment/webhook mismatch increases
Refund failures spike
Unexpected duplicate-payment signals
```

------------------------------------------------------------------------

# 74. Payment Audit Events

Audit important payment operations:

``` text
Payment created
Payment confirmed
Payment failed
Refund requested
Refund completed
Refund failed
Manual reconciliation
Payment exception resolved
```

------------------------------------------------------------------------

# 75. Payment Logging

Safe payment logs may include:

``` text
Internal payment ID
Order ID
Provider payment ID
Provider event ID
State transition
Amount/currency metadata where appropriate
Request/correlation ID
```

Never log sensitive payment credentials.

------------------------------------------------------------------------

# 76. Payment Database Constraints

The database should enforce important invariants where practical.

Potential constraints:

``` text
Valid currency
Non-negative amounts
Unique provider event ID
Unique provider payment identifier where appropriate
Valid refund amount
Valid state combinations
```

Exact constraints belong to the database implementation.

------------------------------------------------------------------------

# 77. Transaction Boundaries

Financial state changes should use appropriate database transactions.

For example:

``` text
Verify event
   ↓
Update payment
   ↓
Update related order state
   ↓
Record audit/event
```

The implementation must carefully determine which operations must be
atomic.

------------------------------------------------------------------------

# 78. Asynchronous Processing

Webhook follow-up work may be moved to background processing when
appropriate.

However, the system must not acknowledge a webhook before the provider
event has been safely accepted according to the chosen processing model.

------------------------------------------------------------------------

# 79. Webhook Failure Recovery

If webhook processing fails:

``` text
Retry where safe
Record failure
Alert when persistent
Allow reconciliation
```

Do not silently discard provider events.

------------------------------------------------------------------------

# 80. Provider API Versioning

The provider integration should pin/track the provider API version where
supported.

Provider changes must be tested before production rollout.

------------------------------------------------------------------------

# 81. Sandbox Environment

Development/staging should use provider sandbox/test capabilities.

Production credentials must never be used for ordinary local
development.

------------------------------------------------------------------------

# 82. Production Payment Verification

Before launch, verify:

``` text
Payment creation
Successful payment
Failed payment
Pending payment where testable
Webhook delivery
Webhook signature validation
Duplicate webhook
Refund
Provider timeout/retry behavior
Order/payment consistency
```

Use test/sandbox flows where possible.

------------------------------------------------------------------------

# 83. Payment Definition of Done

Payment functionality is complete when:

-   Provider integration is isolated.
-   Server-side totals are authoritative.
-   Payment lifecycle is defined.
-   Webhooks are authenticated.
-   Webhooks are idempotent.
-   Payment creation is idempotent where required.
-   Refunds are protected.
-   Reconciliation exists where required.
-   Payment secrets are secure.
-   Sensitive payment data is not logged.
-   Admin operations are permission-controlled.
-   Failure/recovery scenarios are tested.
-   Monitoring and alerts exist.
-   Sandbox and production configuration are separated.

------------------------------------------------------------------------

# 84. AI Agent Payment Rules

Antigravity must not:

-   Mark an order paid because the browser says payment succeeded.
-   Trust client-supplied order totals.
-   Expose payment secrets.
-   Log card/payment credentials.
-   Process webhooks without signature verification.
-   Process duplicate webhooks as new payments.
-   Retry financial mutations blindly.
-   Create a second payment after an uncertain provider response without
    idempotency.
-   Manually change authoritative payment state to hide an issue.
-   Mark refunds successful without provider confirmation.
-   Use production payment credentials in local development.
-   Disable reconciliation to avoid operational exceptions.
-   Treat a provider timeout as proof that a payment failed.

------------------------------------------------------------------------

# 85. Payment Change Workflow

Payment changes should follow:

``` text
Business/payment requirement
        ↓
Provider capability review
        ↓
Security review
        ↓
Payment state-machine review
        ↓
Implementation
        ↓
Sandbox testing
        ↓
Failure/idempotency testing
        ↓
Staging verification
        ↓
Production release
        ↓
Monitoring
```

------------------------------------------------------------------------

# 86. Payment Architecture Summary

``` text
                         Customer
                            |
                         Next.js
                            |
                       Django Checkout
                            |
                   Server-side validation
                            |
                     Payment Service
                            |
                    Provider Adapter
                            |
                     Payment Provider
                       /           \
                      /             \
               Client flow        Webhook
                                     |
                              Signature verify
                                     |
                              Idempotent event
                                     |
                           Payment state machine
                                     |
                          ┌──────────┴──────────┐
                          ↓                     ↓
                       Payment                Order
                          |                     |
                       Refunds              Fulfillment
                          |
                    Reconciliation
```

The fundamental rule is:

``` text
The browser initiates payment.
The provider processes payment.
Django determines business state from verified information.
The database records the authoritative internal state.
```

------------------------------------------------------------------------

# 87. Next Document

The next document should be:

``` text
21-order-fulfillment-architecture.md
```

It will define:

-   Order lifecycle.
-   Order state machine.
-   Order creation.
-   Inventory interaction.
-   Payment interaction.
-   Order snapshots.
-   Fulfillment.
-   Shipping.
-   Tracking.
-   Cancellation.
-   Returns.
-   Refund relationship.
-   Wholesale order handling.
-   Customer order experience.
-   Admin operations.
-   Notifications.
-   Operational reconciliation.
-   Order security and auditability.
