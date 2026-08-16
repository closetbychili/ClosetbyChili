# Closet by Chilli --- Customer Account Architecture

## 1. Purpose

This document defines the customer account architecture for Closet by
Chilli.

The account system connects:

``` text
Authentication
Customer profile
Addresses
Orders
Cart
Wishlist where applicable
Retail/wholesale status
Notifications
Account security
Privacy
```

The architecture must provide a reliable customer experience while
protecting personal and business information.

------------------------------------------------------------------------

# 2. Account Principles

The customer account system follows:

``` text
Secure authentication
Server-side authorization
Least-privilege data access
Clear account lifecycle
Retail/wholesale separation
Minimal personal-data exposure
Secure recovery
Auditable administrative access
```

------------------------------------------------------------------------

# 3. Customer Identity

A customer account represents an authenticated customer identity.

The account may be associated with:

``` text
Profile
Addresses
Orders
Cart
Wholesale profile/application
Preferences
Notifications
```

The exact database relationships follow the approved data architecture.

------------------------------------------------------------------------

# 4. Authentication Boundary

Authentication should use the approved authentication architecture.

The frontend should not implement its own password/session system.

Conceptually:

``` text
Customer
   ↓
Authentication
   ↓
Authenticated identity
   ↓
Django API
```

------------------------------------------------------------------------

# 5. Customer Registration

If account registration is enabled, the flow should validate:

``` text
Email/phone as applicable
Password where password auth is used
Required profile information
Consent/terms where applicable
```

The exact registration fields depend on the approved Phase 1
requirements.

------------------------------------------------------------------------

# 6. Email Verification

If email-based authentication is used, email verification should be
implemented according to the approved authentication provider/workflow.

Unverified accounts should not automatically receive privileges that
require verified identity unless explicitly allowed.

------------------------------------------------------------------------

# 7. Password Authentication

If password authentication is enabled:

``` text
Passwords must be handled by the approved authentication system.
```

The application must never store plaintext passwords.

Password hashing, reset tokens, and credential security should remain
within the approved authentication architecture.

------------------------------------------------------------------------

# 8. Password Reset

A password-reset workflow should:

``` text
Use short-lived recovery credentials
Avoid revealing whether an email exists where appropriate
Invalidate/restrict reused recovery tokens
Avoid logging secrets
```

The exact implementation follows the authentication provider.

------------------------------------------------------------------------

# 9. Account Session Security

Authenticated sessions must use secure session/token mechanisms.

The frontend should not treat a user-controlled identifier as proof of
identity.

Every protected API request must establish the authenticated customer
context securely.

------------------------------------------------------------------------

# 10. Customer Authorization

Authentication answers:

``` text
Who is this user?
```

Authorization answers:

``` text
What may this user access?
```

Every customer-owned resource must enforce authorization server-side.

Examples:

``` text
Cart
Order
Address
Wishlist
Profile
Wholesale application
```

------------------------------------------------------------------------

# 11. Order Ownership

A customer can access only their own orders.

The backend must enforce:

``` text
authenticated user
+
order belongs to user
```

Do not authorize order access using an order number alone.

------------------------------------------------------------------------

# 12. Cart Ownership

A customer can modify only their own authenticated cart.

Cart IDs must not become authorization credentials.

------------------------------------------------------------------------

# 13. Address Ownership

A customer can:

``` text
View
Create
Update
Delete
```

only their own addresses, subject to business rules.

------------------------------------------------------------------------

# 14. Customer Profile

The customer profile may contain:

``` text
Name
Email
Phone
Business information where applicable
Preferences
```

Only fields approved by the business should be editable.

------------------------------------------------------------------------

# 15. Profile Editing

Profile updates must:

``` text
Validate input
Enforce authorization
Apply appropriate uniqueness rules
Protect sensitive fields
```

Do not expose unrestricted model editing through the API.

------------------------------------------------------------------------

# 16. Email Changes

Changing a verified email may require additional verification.

The exact flow should follow the authentication system.

A changed email must not silently bypass account-security controls.

------------------------------------------------------------------------

# 17. Phone Changes

If phone-based authentication or OTP is used, phone changes should
require appropriate verification.

Do not trust a client-side confirmation alone.

------------------------------------------------------------------------

# 18. Customer Addresses

The account may support saved addresses.

Conceptually:

``` text
Customer
  |
  ├── Address 1
  ├── Address 2
  └── Address 3
```

The exact address limit should be business-configurable if needed.

------------------------------------------------------------------------

# 19. Default Address

A customer may have a default shipping address.

The backend must ensure the default relationship is valid.

Do not allow multiple contradictory default records unless the data
model explicitly supports them.

------------------------------------------------------------------------

# 20. Address Validation

Addresses should validate required fields according to the supported
shipping workflow.

Potential fields:

``` text
Name
Address line
City
State
Postal code
Country
Phone where required
```

The final fields depend on the shipping provider/business requirements.

------------------------------------------------------------------------

# 21. Address Snapshot

When an order is created, the order should preserve the address used for
that order.

Later customer edits must not rewrite historical order addresses.

------------------------------------------------------------------------

# 22. Account Deletion

If account deletion is supported, the workflow must consider:

``` text
Open orders
Historical orders
Payments
Refunds
Wholesale records
Audit records
Legal/business retention requirements
```

Deleting a user identity does not necessarily mean deleting every
historical business record.

------------------------------------------------------------------------

# 23. Account Deactivation

An alternative to deletion may be account deactivation.

Conceptually:

``` text
ACTIVE
DEACTIVATED
```

The exact lifecycle must follow business requirements.

------------------------------------------------------------------------

# 24. Open Orders During Deactivation

The business must define what happens when a customer deactivates an
account with:

``` text
Pending order
Pending payment
Return
Refund
```

Historical order processing must remain operational.

------------------------------------------------------------------------

# 25. Guest-to-Account Transition

A guest customer may later create/sign into an account.

Where supported, the system may associate eligible guest cart/order
context with the account.

This must be done securely and must not allow arbitrary order claiming.

------------------------------------------------------------------------

# 26. Guest Order Claiming

If guest order history can be linked to an account, use an appropriate
verification mechanism.

Do not allow:

``` text
Order number
+
email guessing
```

to claim another person's order.

------------------------------------------------------------------------

# 27. Retail Account State

A normal customer may have a state such as:

``` text
ACTIVE
DEACTIVATED
```

The exact state model should remain consistent with the
authentication/account architecture.

------------------------------------------------------------------------

# 28. Wholesale Account State

Wholesale eligibility is separate from basic authentication.

A customer may be:

``` text
Authenticated
+
Wholesale pending/rejected/approved/suspended
```

The wholesale architecture defines the business state.

------------------------------------------------------------------------

# 29. Retail vs Wholesale Account

Do not create two completely independent authentication systems for
retail and wholesale unless a future business requirement explicitly
demands it.

Prefer:

``` text
One customer identity
+
Wholesale business profile/status
```

------------------------------------------------------------------------

# 30. Wholesale Profile

An approved wholesale customer may have additional business information.

Potentially:

``` text
Business name
Business type
Business location
Application status
Approval information
```

Sensitive internal approval information should not automatically be
exposed to the customer.

------------------------------------------------------------------------

# 31. Wholesale Access

Wholesale access must be determined server-side.

The frontend should not be able to activate wholesale mode by setting:

``` text
isWholesale = true
```

------------------------------------------------------------------------

# 32. Wholesale Suspension

When wholesale access is suspended:

``` text
Wholesale pricing
Wholesale-only catalog access
Wholesale checkout capabilities
```

must be disabled according to business rules.

Historical wholesale orders remain intact.

------------------------------------------------------------------------

# 33. Customer Dashboard

A customer account dashboard may include:

``` text
Profile
Orders
Addresses
Wishlist where applicable
Wholesale status where applicable
Preferences
```

The exact navigation follows the approved UX architecture.

------------------------------------------------------------------------

# 34. Order History

Order history should provide:

``` text
Order number
Date
Status
Total
Primary items
```

The detail view can expose additional information.

------------------------------------------------------------------------

# 35. Order Detail

A customer may view:

``` text
Items
Quantities
Prices
Discounts
Shipping
Total
Payment state where appropriate
Fulfillment state
Tracking
Return/cancellation options
```

Only customer-safe information should be returned.

------------------------------------------------------------------------

# 36. Order Pagination

Customer order history should be paginated when the account contains
many orders.

Do not load the entire historical order set by default.

------------------------------------------------------------------------

# 37. Wishlist

If wishlist functionality is included in Phase 1, it should be
associated with the customer account.

Conceptually:

``` text
Customer
  |
  └── Wishlist
        |
        ├── Product/Variant
        └── Product/Variant
```

The exact scope must be confirmed by Phase 1 requirements.

------------------------------------------------------------------------

# 38. Wishlist Security

Wishlist operations must enforce customer ownership.

A customer must not be able to modify another customer's wishlist by
changing an ID.

------------------------------------------------------------------------

# 39. Saved Preferences

Potential preferences include:

``` text
Communication preferences
Marketing preferences
UI preferences where applicable
```

Only preferences actually required by the product should be stored.

------------------------------------------------------------------------

# 40. Marketing Consent

Marketing consent must be represented separately from general account
existence.

A customer having an account does not automatically imply permission for
every marketing channel.

The exact consent model should follow applicable requirements and
business policy.

------------------------------------------------------------------------

# 41. Notification Preferences

Where supported, customers may control appropriate notification
preferences.

Examples:

``` text
Order notifications
Marketing email
Marketing SMS
```

Transactional notifications should not be treated as optional marketing
communications unless the business policy explicitly says otherwise.

------------------------------------------------------------------------

# 42. Personal Data Minimization

The account API should return only data required by the current
screen/use case.

Do not return:

``` text
Internal notes
Admin-only fields
Authentication secrets
Wholesale internal review information
Payment credentials
```

------------------------------------------------------------------------

# 43. API Response Separation

Use dedicated response schemas for:

``` text
Customer self-service
Admin customer management
Wholesale customer view
```

Do not serialize the complete customer model into every response.

------------------------------------------------------------------------

# 44. Customer API

Conceptual endpoints:

``` text
GET   /api/v1/account/
PATCH /api/v1/account/

GET   /api/v1/account/addresses/
POST  /api/v1/account/addresses/
PATCH /api/v1/account/addresses/{id}/
DELETE /api/v1/account/addresses/{id}/

GET   /api/v1/account/orders/
GET   /api/v1/account/orders/{id}/
```

The exact endpoint structure follows the approved API architecture.

------------------------------------------------------------------------

# 45. Account Authorization

Every account endpoint must derive the customer identity from the
authenticated session/token.

Do not accept:

``` text
customer_id
```

as the sole authorization mechanism from the browser.

------------------------------------------------------------------------

# 46. Admin Customer Access

Admins/staff may have access to customer information according to
explicit permissions.

The admin interface must not expose every field by default.

------------------------------------------------------------------------

# 47. Admin Customer Search

Customer search may support:

``` text
Name
Email
Phone where permitted
Order number
Wholesale status
```

Search should be permission-controlled and privacy-aware.

------------------------------------------------------------------------

# 48. Customer Data Export

If account data export is required, it should:

``` text
Verify customer identity
Export only permitted data
Avoid exposing internal secrets
Record the operation where appropriate
```

------------------------------------------------------------------------

# 49. Customer Data Correction

Customers should be able to correct editable personal information
through normal account workflows.

Sensitive identity changes may require re-verification.

------------------------------------------------------------------------

# 50. Customer Privacy

The application should protect personal data in:

``` text
Database
API responses
Logs
Analytics
Exports
Admin UI
Notifications
```

------------------------------------------------------------------------

# 51. Logging Rules

Never log:

``` text
Passwords
Authentication tokens
Recovery tokens
Payment secrets
Sensitive personal data unnecessarily
```

Safe operational identifiers may be logged where useful.

------------------------------------------------------------------------

# 52. Account Security Events

Important account events may include:

``` text
Registration
Login
Logout where relevant
Password reset
Email change
Phone change
Account deactivation
Wholesale approval
Wholesale suspension
```

The security architecture should determine which events require
persistent audit/security logs.

------------------------------------------------------------------------

# 53. Suspicious Activity

If the platform detects suspicious authentication/account behavior, the
security layer may apply:

``` text
Rate limiting
Temporary lockout
Additional verification
Session invalidation
```

The exact mechanisms depend on the authentication provider/security
architecture.

------------------------------------------------------------------------

# 54. Rate Limiting

Protect account endpoints against:

``` text
Login abuse
Password reset abuse
OTP abuse
Profile mutation abuse
Address creation spam
Wishlist spam
```

Rate limits must balance security and legitimate use.

------------------------------------------------------------------------

# 55. Session Revocation

If a security-sensitive account change occurs, the authentication system
should support appropriate session/token invalidation.

Examples:

``` text
Password reset
Account compromise
Administrative security action
```

------------------------------------------------------------------------

# 56. Customer Notifications

Account notifications may include:

``` text
Welcome/registration
Email verification
Password reset
Order updates
Shipping updates
Return/refund updates
Wholesale application status
```

These should use the centralized notification system.

------------------------------------------------------------------------

# 57. Notification Data Safety

Notifications should not include sensitive information unnecessarily.

For example, avoid placing:

``` text
Full payment credentials
Internal admin notes
Sensitive wholesale review information
```

in emails/SMS.

------------------------------------------------------------------------

# 58. Account UI States

The frontend should support:

``` text
Loading
Authenticated
Unauthenticated
Session expired
Unauthorized
Validation error
Server error
```

Do not assume an authenticated page remains authenticated forever.

------------------------------------------------------------------------

# 59. Session Expiration UX

If a session expires:

``` text
Preserve safe local UI context
Redirect/re-authenticate appropriately
Do not lose sensitive information
```

The exact behavior depends on the authentication mechanism.

------------------------------------------------------------------------

# 60. Account Security on Shared Devices

Sensitive account pages should avoid exposing information after
logout/session expiration.

Client-side caches should be cleared or invalidated appropriately.

------------------------------------------------------------------------

# 61. Account Caching

Personalized account responses should not be cached as public content.

Caching must respect:

``` text
Authenticated identity
```

and must prevent cross-user data leakage.

------------------------------------------------------------------------

# 62. Customer Data in CDN

Private customer/account data must never be publicly cacheable.

Do not put authenticated account responses into a shared public CDN
cache.

------------------------------------------------------------------------

# 63. Customer API Testing

Tests should cover:

``` text
Unauthenticated access
Authenticated access
Wrong customer/resource ID
Profile update
Address ownership
Order ownership
Wholesale status
Session expiration
Sensitive field exposure
```

------------------------------------------------------------------------

# 64. Account Security Testing

Test:

``` text
Unauthorized account access
IDOR attempts
Session misuse
Password reset abuse
OTP abuse where applicable
Email/phone change authorization
Wholesale privilege escalation
```

------------------------------------------------------------------------

# 65. Account Lifecycle Testing

Test:

``` text
Registration
Verification
Login
Profile editing
Address management
Order history
Account deactivation
Reactivation where supported
Guest-to-account transition
Wholesale application
Wholesale approval
Wholesale suspension
```

------------------------------------------------------------------------

# 66. Account Performance

Account pages should remain efficient.

Use:

``` text
Pagination
Selective serialization
Efficient queries
Appropriate indexes
```

Avoid loading the entire customer graph on every request.

------------------------------------------------------------------------

# 67. Customer Definition of Done

Customer account functionality is complete when:

-   Authentication integration is defined.
-   Authorization is server-side.
-   Profile access is protected.
-   Address ownership is enforced.
-   Order ownership is enforced.
-   Retail/wholesale states are separated.
-   Personal data is minimized.
-   Account recovery is secure.
-   Session handling is defined.
-   Notification preferences are represented appropriately.
-   Admin access is permission-controlled.
-   Sensitive data is protected in logs/responses/cache.
-   Account lifecycle is tested.
-   Security tests cover IDOR and privilege escalation.

------------------------------------------------------------------------

# 68. AI Agent Customer Rules

Antigravity must not:

-   Trust client-supplied customer IDs for authorization.
-   Allow customers to access another customer's orders.
-   Allow customers to access another customer's addresses.
-   Expose authentication secrets.
-   Store plaintext passwords.
-   Treat account ownership as proof of wholesale approval.
-   Allow frontend flags to grant wholesale access.
-   Put private account data into public caches.
-   Log passwords, tokens, or recovery secrets.
-   Allow guest users to claim arbitrary orders.
-   Delete historical business records merely because an account is
    deleted.
-   Serialize the complete customer model into public APIs.

------------------------------------------------------------------------

# 69. Account Change Workflow

Customer-account changes should follow:

``` text
Requirement
   ↓
Authentication/authorization review
   ↓
Privacy review
   ↓
Data-model review
   ↓
API implementation
   ↓
Frontend implementation
   ↓
Security testing
   ↓
Session/cache testing
   ↓
Staging verification
   ↓
Production monitoring
```

------------------------------------------------------------------------

# 70. Customer Account Architecture Summary

``` text
                         Customer
                            |
                     Authentication
                            |
                    Authenticated Identity
                            |
                        Django API
                            |
        ┌─────────────┬─────┼─────┬──────────────┐
        ↓             ↓     ↓     ↓              ↓
     Profile       Address Orders Cart        Wholesale
        |             |      |     |              |
        └─────────────┴──────┴─────┴──────────────┘
                            |
                    Authorization Layer
                            |
                     Customer-owned data
```

The fundamental rule is:

``` text
Authentication establishes identity.
Authorization protects customer-owned resources.
Wholesale status is a separate business capability.
Historical order data remains durable.
Private account data remains private.
```

------------------------------------------------------------------------

# 71. Next Document

The next document should be:

``` text
25-notification-architecture.md
```

It will define:

-   Email/SMS notification architecture.
-   Transactional vs marketing notifications.
-   Event-driven notifications.
-   Templates.
-   Notification preferences.
-   Delivery providers.
-   Queue/background processing.
-   Retry behavior.
-   Idempotency.
-   Delivery status.
-   Failure handling.
-   Admin notification operations.
-   Customer notification security.
-   Observability.
-   Future WhatsApp/other channel integration.
