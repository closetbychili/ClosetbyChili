# Closet by Chilli --- Notification Architecture

## 1. Purpose

This document defines the notification architecture for Closet by
Chilli.

The notification system is responsible for delivering customer and
operational messages across supported channels while keeping business
events separate from delivery-provider details.

The architecture should support:

``` text
Order notifications
Payment notifications
Shipping notifications
Return/refund notifications
Wholesale notifications
Account/security notifications
Marketing notifications
Admin/operational notifications
```

------------------------------------------------------------------------

# 2. Notification Principles

The notification architecture follows:

``` text
Event-driven
Provider-independent
Idempotent
Retryable
Observable
Privacy-aware
Preference-aware
```

The core application should generate business events.

Notification delivery should consume those events rather than embedding
provider calls throughout business logic.

------------------------------------------------------------------------

# 3. Notification Architecture

Conceptually:

``` text
Django Domain Event
        ↓
Notification Service
        ↓
Template Resolution
        ↓
Preference/Eligibility Check
        ↓
Delivery Queue
        ↓
Channel Provider
        ↓
Delivery Status
```

------------------------------------------------------------------------

# 4. Business Events vs Notifications

A business event is not the same as a notification.

Example:

``` text
Order shipped
```

is a business event.

It may result in:

``` text
Email
SMS
Push notification
```

depending on supported channels and customer preferences.

------------------------------------------------------------------------

# 5. Event-Driven Design

Business domains should publish meaningful events such as:

``` text
OrderCreated
PaymentConfirmed
PaymentFailed
OrderShipped
OrderDelivered
OrderCancelled
ReturnRequested
ReturnApproved
RefundCompleted
WholesaleApplicationSubmitted
WholesaleApplicationApproved
WholesaleApplicationRejected
```

The exact event catalogue should evolve with the domain architecture.

------------------------------------------------------------------------

# 6. Transactional Notifications

Transactional notifications communicate important actions or state
changes related to the customer's transaction/account.

Examples:

``` text
Order confirmation
Payment confirmation
Shipping update
Delivery update
Cancellation update
Refund update
Wholesale application update
Password/security notification
```

These should be distinguished from marketing communications.

------------------------------------------------------------------------

# 7. Marketing Notifications

Marketing notifications may include:

``` text
Promotions
New collection announcements
Campaigns
Product launches
```

Marketing communication must follow the approved consent/preference and
compliance requirements.

An account existing does not automatically imply consent for every
marketing channel.

------------------------------------------------------------------------

# 8. Transactional vs Marketing Separation

The system should represent notification purpose explicitly.

Conceptually:

``` text
TRANSACTIONAL
MARKETING
OPERATIONAL
SECURITY
```

Do not let a marketing campaign accidentally use a transactional
notification pathway without the appropriate rules.

------------------------------------------------------------------------

# 9. Supported Channels

The initial architecture should allow multiple channels:

``` text
Email
SMS
```

Future channels may include:

``` text
WhatsApp
Push notifications
```

The channel implementation should be replaceable without changing core
business logic.

------------------------------------------------------------------------

# 10. Channel Adapter

Provider-specific integrations should be isolated.

Conceptually:

``` text
Notification Service
       |
   Channel Adapter
       |
 ┌─────┴─────┐
 ↓           ↓
Email       SMS
Provider    Provider
```

Future providers should be addable without rewriting the order/payment
domains.

------------------------------------------------------------------------

# 11. Email Provider

The exact production email provider is a deployment/business decision.

The provider adapter should encapsulate:

``` text
Authentication
API calls
Template/provider IDs where used
Provider responses
Provider errors
```

Provider credentials must remain server-side.

------------------------------------------------------------------------

# 12. SMS Provider

The exact SMS provider is a deployment/business decision.

The SMS adapter should encapsulate provider-specific behavior.

Never place provider credentials in the frontend.

------------------------------------------------------------------------

# 13. WhatsApp Future Support

If WhatsApp is introduced later:

``` text
Business Event
      ↓
Notification Service
      ↓
WhatsApp Adapter
      ↓
Approved Provider
```

The core domain should not need to know the provider's API format.

------------------------------------------------------------------------

# 14. Notification Templates

Templates should be centrally managed.

Potential template identity:

``` text
ORDER_CONFIRMED
PAYMENT_CONFIRMED
ORDER_SHIPPED
ORDER_DELIVERED
ORDER_CANCELLED
REFUND_COMPLETED
WHOLESALE_APPROVED
WHOLESALE_REJECTED
```

The exact catalogue should be maintained centrally.

------------------------------------------------------------------------

# 15. Template Versioning

Templates should support controlled changes.

A template change should not require modifying business-domain code.

Where necessary, templates can have:

``` text
Version
Status
Locale
Channel
```

------------------------------------------------------------------------

# 16. Template Data

Notifications should receive only the data required by the template.

For example:

``` text
Order number
Customer name
Order total
Tracking information
```

Do not provide the template renderer with unrestricted database objects.

------------------------------------------------------------------------

# 17. Template Security

Template content must not expose:

``` text
Passwords
Authentication tokens
Payment secrets
Internal admin notes
Wholesale review information
Sensitive operational data
```

------------------------------------------------------------------------

# 18. Localization

The architecture should allow localization if required.

Potential structure:

``` text
Template
  |
  ├── English
  └── Other supported locale
```

The initial production locale can follow the approved Phase 1
requirements.

------------------------------------------------------------------------

# 19. Customer Locale

If customer locale is supported, it may be derived from:

``` text
Account preference
Browser/session context
Default storefront locale
```

The final precedence should be explicit.

------------------------------------------------------------------------

# 20. Notification Preferences

Customers may control applicable communication preferences.

Potential preferences:

``` text
Marketing email
Marketing SMS
Marketing WhatsApp
```

Transactional/security notifications should follow their own business
rules.

------------------------------------------------------------------------

# 21. Preference Enforcement

Before sending a notification, the notification service should
determine:

``` text
Notification type
Channel
Purpose
Customer eligibility
Consent/preference
```

The browser must not be able to bypass these rules.

------------------------------------------------------------------------

# 22. Transactional Notification Exceptions

Some operational/account messages may need to be sent regardless of
marketing preferences.

Examples may include:

``` text
Order confirmation
Payment status
Security/account recovery
```

The final classification must follow business and legal requirements.

------------------------------------------------------------------------

# 23. Notification Recipient

The recipient must be resolved from authoritative customer/account/order
data.

Do not trust a client-supplied recipient address for an order
notification.

------------------------------------------------------------------------

# 24. Email Address Verification

For notifications requiring verified email identity, the system should
use the authoritative verified email associated with the account/order
workflow.

------------------------------------------------------------------------

# 25. Phone Number Verification

Where SMS/OTP workflows are used, the system should distinguish:

``` text
Provided phone number
Verified phone number
```

Do not treat a merely supplied number as verified.

------------------------------------------------------------------------

# 26. Notification Queue

Delivery should generally be asynchronous.

Conceptually:

``` text
Business Event
      ↓
Create notification job
      ↓
Queue
      ↓
Worker
      ↓
Provider
```

This prevents slow external providers from blocking core order/payment
requests.

------------------------------------------------------------------------

# 27. Background Workers

The worker system should process:

``` text
Email delivery
SMS delivery
Retry attempts
Webhook/status synchronization
Cleanup
```

The exact worker infrastructure follows the deployment architecture.

------------------------------------------------------------------------

# 28. Delivery Idempotency

The same business event must not accidentally produce unlimited
duplicate notifications.

Use a suitable identifier such as:

``` text
Event ID
Notification ID
Recipient
Channel
Template
```

to define the idempotency boundary.

------------------------------------------------------------------------

# 29. Duplicate Event

If an event is delivered twice:

``` text
Event
 ↓
Already handled?
 ↓
Yes → Do not create duplicate delivery
```

The exact behavior depends on whether duplicate delivery is acceptable
for the notification type.

------------------------------------------------------------------------

# 30. Retry Strategy

Transient provider failures should be retried.

Potential retryable conditions:

``` text
Timeout
Temporary provider failure
Rate limit
Temporary network failure
```

Do not retry permanent validation failures indefinitely.

------------------------------------------------------------------------

# 31. Exponential Backoff

Retries should use controlled backoff rather than immediate unlimited
retries.

Conceptually:

``` text
Attempt 1
   ↓
Wait
   ↓
Attempt 2
   ↓
Longer wait
   ↓
Attempt 3
```

The exact retry schedule belongs to the infrastructure configuration.

------------------------------------------------------------------------

# 32. Maximum Attempts

Every notification job should have a bounded retry policy.

After the retry limit:

``` text
Mark failed
Record reason
Surface operational alert where appropriate
```

------------------------------------------------------------------------

# 33. Dead-Letter Handling

Persistently failed notification jobs may be moved to a
dead-letter/failure state.

This allows operations staff to investigate without blocking the main
queue.

------------------------------------------------------------------------

# 34. Provider Response

Store safe delivery metadata such as:

``` text
Provider message ID
Delivery status
Provider timestamp
Failure category
```

Do not store provider secrets.

------------------------------------------------------------------------

# 35. Delivery Status

A notification may have states such as:

``` text
QUEUED
PROCESSING
SENT
DELIVERED
FAILED
CANCELLED
```

The exact state model depends on provider capabilities.

------------------------------------------------------------------------

# 36. Delivery vs Sent

These are not necessarily equivalent.

``` text
SENT
```

may mean the provider accepted the message.

``` text
DELIVERED
```

may mean the provider/carrier confirmed delivery.

The system should not claim delivery when only submission is known.

------------------------------------------------------------------------

# 37. Provider Webhooks

Email/SMS providers may send delivery events.

The architecture should support verified provider callbacks where
required.

Conceptually:

``` text
Provider
   ↓
Webhook
   ↓
Verification
   ↓
Notification status update
```

------------------------------------------------------------------------

# 38. Webhook Security

Provider webhooks must be authenticated according to the provider's
supported mechanism.

Do not trust unverified delivery-status requests.

------------------------------------------------------------------------

# 39. Notification State Reconciliation

If delivery events are lost, the system may need provider
lookup/reconciliation where supported.

This is especially useful for operationally important messages.

------------------------------------------------------------------------

# 40. Order Notifications

Typical order notification flow:

``` text
Order created
    ↓
OrderCreated event
    ↓
Notification job
    ↓
Email/SMS
```

The notification must reflect the authoritative order state.

------------------------------------------------------------------------

# 41. Payment Notifications

Potential events:

``` text
Payment confirmed
Payment failed
Payment pending
Refund completed
```

Do not send a "payment successful" notification from a browser callback
before backend verification.

------------------------------------------------------------------------

# 42. Shipping Notifications

Potential events:

``` text
Order shipped
Tracking available
Delivery update
Order delivered
```

Shipping notifications should use authoritative shipment/tracking data.

------------------------------------------------------------------------

# 43. Cancellation Notifications

Cancellation notifications should be generated from the authoritative
cancellation event.

Do not notify the customer merely because the frontend submitted a
cancellation request.

------------------------------------------------------------------------

# 44. Return Notifications

Potential events:

``` text
Return requested
Return approved
Return rejected
Return received
Return completed
```

Only implement states supported by the return workflow.

------------------------------------------------------------------------

# 45. Refund Notifications

Potential events:

``` text
Refund initiated
Refund completed
Refund failed
```

The notification should reflect the actual refund state.

------------------------------------------------------------------------

# 46. Wholesale Notifications

Potential events:

``` text
Application received
Application approved
Application rejected
Account suspended
Account reactivated
```

Internal approval notes should not be included in customer-facing
messages.

------------------------------------------------------------------------

# 47. Account/Security Notifications

Potential events:

``` text
Email verification
Password reset
Security-sensitive account change
```

Security notifications should be handled carefully and should not leak
authentication secrets.

------------------------------------------------------------------------

# 48. Admin Notifications

Operational notifications may be sent to authorized staff for events
such as:

``` text
New wholesale application
Payment reconciliation exception
Failed critical notification
Operational order issue
```

The exact admin notification catalogue should be business-defined.

------------------------------------------------------------------------

# 49. Admin Recipient Security

Admin notifications must only go to authorized operational recipients.

Do not allow arbitrary users to subscribe themselves to sensitive
administrative events.

------------------------------------------------------------------------

# 50. Notification Preferences in Admin

Admin users may have operational preferences, but sensitive notification
types should remain permission-controlled.

------------------------------------------------------------------------

# 51. Notification Scheduling

Some notifications may be scheduled rather than immediate.

Examples:

``` text
Abandoned cart reminder
Marketing campaign
```

Scheduled notifications must still revalidate:

``` text
Eligibility
Consent
Customer status
```

at send time where appropriate.

------------------------------------------------------------------------

# 52. Abandoned Cart Notifications

If abandoned-cart recovery is implemented:

``` text
Cart abandoned
   ↓
Waiting period
   ↓
Eligibility/consent check
   ↓
Notification
```

Do not send marketing-style abandoned-cart messages without the required
business/compliance approval.

------------------------------------------------------------------------

# 53. Campaign Notifications

Marketing campaigns should be separated from transactional event
processing.

Conceptually:

``` text
Campaign
   ↓
Audience selection
   ↓
Consent filtering
   ↓
Message generation
   ↓
Queue
   ↓
Provider
```

------------------------------------------------------------------------

# 54. Campaign Safety

Marketing campaigns must have:

``` text
Audience rules
Consent rules
Unsubscribe handling
Rate controls
Scheduling
Auditability
```

------------------------------------------------------------------------

# 55. Unsubscribe

Marketing channels should support appropriate unsubscribe behavior.

The unsubscribe action must update the authoritative preference state.

------------------------------------------------------------------------

# 56. Unsubscribe Security

Unsubscribe mechanisms should not expose unrelated customer information.

Use secure, appropriately scoped identifiers/tokens where required.

------------------------------------------------------------------------

# 57. Notification API

Customer-facing notification preferences may conceptually use:

``` text
GET   /api/v1/account/notification-preferences/
PATCH /api/v1/account/notification-preferences/
```

The exact API follows the approved API architecture.

------------------------------------------------------------------------

# 58. Notification History

If the customer-facing product requires notification history, expose
only safe customer-owned notifications.

Do not expose internal provider metadata unnecessarily.

------------------------------------------------------------------------

# 59. Notification Admin API

Admin operations may conceptually include:

``` text
GET /api/v1/admin/notifications/
GET /api/v1/admin/notifications/{id}/
POST /api/v1/admin/notifications/{id}/retry/
```

Important actions must be permission-controlled.

------------------------------------------------------------------------

# 60. Manual Resend

A manual resend should be safe and auditable.

It should not:

``` text
Create a duplicate order
Create a duplicate refund
Change financial state
```

It only retries the communication operation.

------------------------------------------------------------------------

# 61. Manual Resend Authorization

Only authorized staff should be able to manually resend sensitive
operational messages.

------------------------------------------------------------------------

# 62. Notification Audit

Record important notification events:

``` text
Queued
Sent
Delivered where known
Failed
Retried
Manually resent
Cancelled
```

------------------------------------------------------------------------

# 63. Notification Logging

Safe operational logs may include:

``` text
Notification ID
Event ID
Customer ID where appropriate
Channel
Template
Provider message ID
Status
Failure category
Correlation/request ID
```

Avoid unnecessary personal-data logging.

------------------------------------------------------------------------

# 64. Notification Observability

Monitor:

``` text
Queue depth
Delivery latency
Success rate
Failure rate
Provider latency
Retry count
Dead-letter count
Webhook failures
```

------------------------------------------------------------------------

# 65. Critical Alerts

Potential alerts:

``` text
Email provider unavailable
SMS provider unavailable
Notification queue backed up
Critical order notifications failing
Webhook verification failures spike
Delivery failures spike
```

------------------------------------------------------------------------

# 66. Provider Rate Limits

Provider rate limits must be respected.

The notification infrastructure should support:

``` text
Backpressure
Throttling
Retry-after handling
Queue control
```

------------------------------------------------------------------------

# 67. Provider Outage

If a provider becomes unavailable:

``` text
Queue notification
Retry safely
Avoid blocking order/payment transactions
Alert operations when appropriate
```

Do not repeatedly hammer an unavailable provider.

------------------------------------------------------------------------

# 68. Notification Data Privacy

Notification payloads should minimize personal information.

Email/SMS messages should contain only what is needed for the customer
to understand the event.

------------------------------------------------------------------------

# 69. Sensitive Information

Never include in ordinary notifications:

``` text
Passwords
OTP secrets beyond the intended OTP flow
Payment credentials
Admin notes
Internal fraud/security details
Wholesale approval documentation
```

------------------------------------------------------------------------

# 70. OTP Notifications

If OTP authentication is used, OTP delivery should be treated as a
security-sensitive flow.

Requirements include:

``` text
Short expiry
Rate limiting
Attempt limits
No plaintext logging
Secure generation
```

The exact OTP implementation belongs to the authentication architecture.

------------------------------------------------------------------------

# 71. Notification Content Security

Template rendering should prevent unintended template/code execution.

User-provided content must be escaped/sanitized according to the output
channel.

------------------------------------------------------------------------

# 72. HTML Email Security

HTML emails should avoid unsafe dynamic markup.

User-provided values should be safely escaped before insertion into
templates.

------------------------------------------------------------------------

# 73. Notification Testing

Tests should cover:

``` text
Correct event triggers
Correct recipient
Correct template
Correct channel
Preference enforcement
Transactional/marketing separation
Duplicate event
Retry
Provider failure
Webhook update
Manual resend
```

------------------------------------------------------------------------

# 74. Notification Security Testing

Verify:

``` text
No cross-customer notifications
No unauthorized admin notifications
No sensitive data leakage
No preference bypass
No webhook spoofing
No token/secret logging
```

------------------------------------------------------------------------

# 75. Notification Reliability Testing

Simulate:

``` text
Provider timeout
Provider 5xx
Rate limiting
Duplicate webhook
Out-of-order delivery events
Worker restart
Queue retry
Database failure
```

------------------------------------------------------------------------

# 76. Notification Performance

Test:

``` text
Single notification
Burst of order events
Campaign-scale messaging
Queue throughput
Provider throttling
```

The architecture should scale without blocking customer checkout/order
operations.

------------------------------------------------------------------------

# 77. Notification Transaction Boundary

Do not make external notification delivery part of the same synchronous
database transaction as an order/payment mutation.

Prefer:

``` text
Commit business state
      ↓
Publish/record event
      ↓
Process notification asynchronously
```

This prevents provider outages from breaking core commerce transactions.

------------------------------------------------------------------------

# 78. Event Reliability

If event delivery must be reliable, use an appropriate durable
event/outbox mechanism.

Conceptually:

``` text
Business transaction
       |
       +── Domain state change
       |
       +── Notification/event record
              ↓
            Worker
              ↓
           Provider
```

The exact implementation follows the system's asynchronous architecture.

------------------------------------------------------------------------

# 79. Notification Outbox

Where an outbox pattern is used, the outbox record should be committed
with the business transaction.

A worker then processes it independently.

This reduces the risk of:

``` text
Order committed
but notification event lost
```

------------------------------------------------------------------------

# 80. Notification Ordering

Some notifications may need logical ordering.

For example:

``` text
Order confirmed
before
Order shipped
```

The notification system should use authoritative event/state data rather
than assuming worker execution order.

------------------------------------------------------------------------

# 81. Stale Notification Protection

If a notification job is delayed, the system should avoid sending
misleading information when appropriate.

Example:

``` text
Order state changed again
```

The template should use authoritative current state or the correct event
snapshot according to notification semantics.

------------------------------------------------------------------------

# 82. Event Snapshot vs Current State

The architecture should explicitly decide whether a notification
represents:

``` text
State at event time
```

or:

``` text
Current state at send time
```

For important transactional messages, this decision must be intentional.

------------------------------------------------------------------------

# 83. Notification Definition of Done

Notification functionality is complete when:

-   Business events are separated from delivery providers.
-   Transactional and marketing notifications are distinct.
-   Providers are isolated behind adapters.
-   Templates are centrally managed.
-   Customer preferences are enforced.
-   Delivery is asynchronous where appropriate.
-   Retries are bounded.
-   Notification operations are idempotent.
-   Provider webhooks are verified.
-   Delivery status is observable.
-   Failed notifications can be investigated/retried.
-   Sensitive information is protected.
-   Admin operations are permission-controlled.
-   Notification tests cover failure and duplicate scenarios.

------------------------------------------------------------------------

# 84. AI Agent Notification Rules

Antigravity must not:

-   Send order notifications directly from arbitrary frontend code.
-   Trust client-provided recipient information for transactional
    messages.
-   Send marketing messages without the required consent/preference.
-   Expose admin notes in customer notifications.
-   Log passwords, OTP secrets, recovery tokens, or payment secrets.
-   Treat provider acceptance as guaranteed delivery.
-   Retry forever.
-   Block checkout/order transactions on email/SMS provider calls.
-   Process provider webhooks without verification.
-   Send duplicate notifications for the same event without an explicit
    reason.
-   Allow arbitrary users to trigger sensitive admin notifications.
-   Put provider credentials in the frontend.

------------------------------------------------------------------------

# 85. Notification Change Workflow

Changes should follow:

``` text
Business event requirement
   ↓
Notification classification
   ↓
Preference/consent review
   ↓
Template design
   ↓
Provider/channel review
   ↓
Implementation
   ↓
Idempotency/retry tests
   ↓
Privacy/security testing
   ↓
Provider sandbox testing
   ↓
Staging verification
   ↓
Production monitoring
```

------------------------------------------------------------------------

# 86. Notification Architecture Summary

``` text
                    Business Domain
                          |
                    Domain Event
                          |
                  Notification Service
                          |
          ┌───────────────┼────────────────┐
          ↓               ↓                ↓
       Template        Preferences      Eligibility
          \               |                /
           \              |               /
                    Notification Job
                          |
                        Queue
                          |
                  ┌───────┴────────┐
                  ↓                ↓
               Email              SMS
               Adapter           Adapter
                  |                |
               Provider         Provider
                  \                /
                   \              /
                    Delivery Status
                          |
                     Observability
```

The fundamental rule is:

``` text
Business domains create events.
Notification infrastructure decides how and when to communicate them.
Providers are replaceable.
Delivery is asynchronous and observable.
Customer preferences and privacy rules are enforced before sending.
```

------------------------------------------------------------------------

# 87. Next Document

The next document should be:

``` text
26-media-storage-architecture.md
```

It will define:

-   Product images and media.
-   Supabase Storage usage.
-   Bucket architecture.
-   Public vs private assets.
-   Upload flow.
-   Signed URLs.
-   Image transformations.
-   Image optimization.
-   File validation.
-   MIME/type security.
-   Upload size limits.
-   Admin media management.
-   Product-media relationships.
-   CDN/cache behavior.
-   Orphaned media cleanup.
-   Storage security.
-   Backup/retention considerations.
