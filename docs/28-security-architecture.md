# Closet by Chilli --- Security Architecture

## 1. Purpose

This document defines the security architecture for Closet by Chilli.

Security must be treated as a cross-cutting concern across:

``` text
Next.js storefront
Django API
PostgreSQL/Supabase
Supabase Storage
Authentication
Payments
Notifications
Background workers
Admin operations
Infrastructure
```

The objective is to protect:

``` text
Customer accounts
Personal data
Wholesale data
Orders
Payments
Inventory
Catalog
Media
Administrative operations
```

------------------------------------------------------------------------

# 2. Security Principles

The platform follows:

``` text
Defense in depth
Least privilege
Server-side authorization
Zero trust for client input
Secure defaults
Minimal data exposure
Explicit trust boundaries
Auditability
Fail securely
```

------------------------------------------------------------------------

# 3. Threat Model

Security design should consider:

``` text
Unauthenticated internet users
Authenticated malicious users
Compromised customer accounts
Malicious wholesale applicants
Compromised admin accounts
Automated bots
Abusive API clients
Malicious file uploads
Payment manipulation attempts
Webhook spoofing
Credential leakage
Third-party provider compromise
```

------------------------------------------------------------------------

# 4. Trust Boundaries

Important trust boundaries include:

``` text
Browser
   ↓
Next.js
   ↓
Django API
   ↓
PostgreSQL/Supabase

Django
   ↓
Payment provider

Django
   ↓
Email/SMS provider

Django
   ↓
Supabase Storage
```

Data crossing these boundaries must be validated and authenticated as
appropriate.

------------------------------------------------------------------------

# 5. Client Is Untrusted

The browser must be considered fully untrusted.

Never trust client-supplied:

``` text
Price
Total
Discount
Inventory
Customer ID
Wholesale status
Order status
Payment status
Permissions
Storage path
Admin role
```

------------------------------------------------------------------------

# 6. Server Authority

The backend is authoritative for:

``` text
Identity
Authorization
Pricing
Inventory
Promotions
Shipping
Tax
Order state
Payment state
Wholesale eligibility
```

The frontend is responsible for presentation and user interaction, not
commercial authority.

------------------------------------------------------------------------

# 7. Authentication

Authentication should use the approved authentication architecture.

The application must not invent a second parallel authentication system
unless a specific requirement demands it.

------------------------------------------------------------------------

# 8. Authorization

Authentication establishes identity.

Authorization determines what that identity can access.

Every protected resource must enforce authorization server-side.

------------------------------------------------------------------------

# 9. Object-Level Authorization

Every customer-owned object must be checked against the authenticated
customer.

Examples:

``` text
Cart
Order
Address
Wishlist
Profile
Wholesale application
```

This prevents insecure direct object reference (IDOR) vulnerabilities.

------------------------------------------------------------------------

# 10. IDOR Prevention

Never assume:

``` text
GET /orders/123
```

is safe merely because the user is authenticated.

The backend must verify:

``` text
order 123 belongs to current customer
```

or that the user has appropriate administrative permission.

------------------------------------------------------------------------

# 11. Role-Based Authorization

Administrative capabilities should be permission-based.

Potential roles may include:

``` text
Super Admin
Catalog Manager
Order Manager
Content Manager
Support
```

The final role model should follow the approved admin architecture.

------------------------------------------------------------------------

# 12. Least Privilege

A user should receive only the permissions required for their role.

For example:

``` text
Catalog manager
→ Manage catalog

Order manager
→ Manage orders

Support
→ Customer/order support capabilities
```

Do not grant broad database/service access merely to simplify
implementation.

------------------------------------------------------------------------

# 13. Wholesale Authorization

Wholesale approval is a business capability, not merely a frontend role.

A customer should gain wholesale capabilities only after server-side
verification of the approved wholesale state.

------------------------------------------------------------------------

# 14. Wholesale Privilege Escalation

Attackers must not be able to gain wholesale access by modifying:

``` text
Request body
Cookie
Local storage
Query parameter
Frontend state
```

------------------------------------------------------------------------

# 15. Authentication Secrets

Never expose:

``` text
Passwords
Session secrets
JWT signing secrets
API keys
Supabase service-role keys
Payment provider secrets
Webhook signing secrets
```

to the browser.

------------------------------------------------------------------------

# 16. Password Security

If password authentication is used:

``` text
Passwords must never be stored plaintext.
```

Use the approved authentication provider/system for:

``` text
Hashing
Credential verification
Password reset
Credential recovery
```

------------------------------------------------------------------------

# 17. Password Reset

Password reset flows must use:

``` text
Short-lived recovery credentials
Single-use or appropriately invalidated tokens
Rate limiting
Safe error messages
```

Never log recovery tokens.

------------------------------------------------------------------------

# 18. Session Security

Sessions/tokens should use secure mechanisms appropriate to the
authentication architecture.

Security-sensitive settings should include appropriate:

``` text
Secure
HttpOnly
SameSite
Expiration
Rotation/revocation
```

where applicable.

------------------------------------------------------------------------

# 19. Session Revocation

Security-sensitive events may require invalidating existing sessions.

Examples:

``` text
Password reset
Account compromise
Administrative security action
```

The exact mechanism depends on the authentication provider.

------------------------------------------------------------------------

# 20. CSRF Protection

If browser authentication uses cookies, state-changing requests must be
protected against CSRF according to the Django/authentication
configuration.

Do not disable CSRF protection simply to make API calls work.

------------------------------------------------------------------------

# 21. CORS

CORS should allow only approved frontend origins.

Avoid production policies equivalent to:

``` text
Allow all origins
Allow credentials from all origins
```

------------------------------------------------------------------------

# 22. Security Headers

Production should use appropriate security headers.

Consider:

``` text
Content-Security-Policy
Strict-Transport-Security
X-Content-Type-Options
Referrer-Policy
Permissions-Policy
```

The exact CSP should be tested against the actual
Next.js/payment/analytics requirements.

------------------------------------------------------------------------

# 23. HTTPS

Production traffic should use HTTPS.

Sensitive operations must never depend on plaintext HTTP transport.

------------------------------------------------------------------------

# 24. TLS

Use managed/modern TLS configuration at the infrastructure/edge layer.

Do not implement custom cryptographic protocols.

------------------------------------------------------------------------

# 25. Input Validation

All API input should be validated using explicit schemas.

Validate:

``` text
Type
Format
Length
Range
Allowed values
Relationships
Business rules
```

------------------------------------------------------------------------

# 26. Output Validation

API responses should use explicit serializers/schemas.

Do not automatically expose every database model field.

------------------------------------------------------------------------

# 27. SQL Injection

Django ORM/query parameterization should be preferred.

Never concatenate user input directly into SQL.

If raw SQL is required:

``` text
Use parameterized queries.
```

------------------------------------------------------------------------

# 28. XSS Prevention

User-controlled content must be escaped/sanitized before being rendered
as HTML.

This includes:

``` text
Product descriptions
Customer names
Reviews if added
CMS content
Search terms
Admin-entered content
```

------------------------------------------------------------------------

# 29. Dangerous HTML

Do not render arbitrary user HTML with unrestricted mechanisms such as
unsafe raw HTML rendering.

If rich HTML is required, sanitize it using a controlled allowlist.

------------------------------------------------------------------------

# 30. Template Injection

User-provided content must never be interpreted as executable
server-side template code.

Template variables should remain data.

------------------------------------------------------------------------

# 31. Command Injection

Never pass untrusted user input directly to shell commands.

External processes should use:

``` text
Fixed commands
Validated arguments
Restricted environment
```

------------------------------------------------------------------------

# 32. Path Traversal

File/media paths must never be directly controlled by untrusted input.

Generate controlled storage keys server-side.

Reject traversal attempts such as:

``` text
../
..\ 
```

and equivalent encoded forms where applicable.

------------------------------------------------------------------------

# 33. File Upload Security

Uploads must validate:

``` text
Authorization
File size
MIME type
Actual content
Extension
Dimensions
Destination
```

------------------------------------------------------------------------

# 34. Malicious Images

Image processing must protect against malicious or resource-exhausting
images.

Use safe libraries and resource limits.

------------------------------------------------------------------------

# 35. Active Content

Be careful with:

``` text
SVG
HTML
JavaScript files
```

Do not allow active-content uploads into publicly served catalog buckets
unless there are explicit sanitization/security controls.

------------------------------------------------------------------------

# 36. Supabase Storage Security

Storage access must follow least privilege.

Public buckets should contain only assets intended to be public.

Private buckets should require controlled access.

------------------------------------------------------------------------

# 37. Supabase Service Role

The Supabase service-role key must remain server-side.

It must never be:

``` text
Embedded in frontend code
Returned by an API
Stored in public environment variables
Committed to Git
```

------------------------------------------------------------------------

# 38. Supabase RLS

Where Supabase/PostgreSQL Row Level Security is used, policies should
enforce appropriate data access.

RLS should be treated as an additional security layer, not as a
substitute for Django authorization design.

------------------------------------------------------------------------

# 39. Django vs Database Security

The application should clearly define the trust boundary.

A practical approach is:

``` text
Django
→ Business authorization/domain rules

Database/RLS
→ Additional data-access boundary where appropriate
```

Do not assume RLS automatically implements every application-level
business permission.

------------------------------------------------------------------------

# 40. Database Credentials

Database credentials must be stored in secure server-side secrets.

Never expose database connection credentials to the browser.

------------------------------------------------------------------------

# 41. Secrets Management

Production secrets should come from:

``` text
Deployment secret manager
Environment secrets
Approved infrastructure secret store
```

Do not commit secrets to source control.

------------------------------------------------------------------------

# 42. Environment Separation

Maintain clear separation between:

``` text
Development
Staging
Production
```

Never use production credentials in local development.

------------------------------------------------------------------------

# 43. Secret Rotation

Secrets should be rotatable.

Plan rotation for:

``` text
Database credentials
Supabase keys
Payment keys
Email/SMS keys
Webhook secrets
Application secrets
```

------------------------------------------------------------------------

# 44. Environment Variables

Only expose frontend-safe variables to Next.js client code.

Never expose server-only variables through public/client environment
configuration.

------------------------------------------------------------------------

# 45. Dependency Security

Dependencies should be regularly scanned for:

``` text
Known vulnerabilities
Unsupported versions
Malicious packages
License/compliance issues where applicable
```

------------------------------------------------------------------------

# 46. Lockfiles

Production builds should use committed lockfiles to improve dependency
reproducibility.

Do not casually update all dependencies during unrelated feature work.

------------------------------------------------------------------------

# 47. Supply Chain Security

Use:

``` text
Trusted package registries
Pinned/locked versions
Automated vulnerability scanning
Minimal dependencies
```

Avoid adding libraries for trivial functionality without justification.

------------------------------------------------------------------------

# 48. API Rate Limiting

Protect endpoints against abuse.

High-risk endpoints include:

``` text
Login
OTP
Password reset
Search
Coupon validation
Checkout
Payment initiation
Media upload
Admin APIs
```

------------------------------------------------------------------------

# 49. Brute Force Protection

Authentication/recovery flows should have controls against:

``` text
Credential brute force
OTP guessing
Password-reset abuse
Account enumeration
```

------------------------------------------------------------------------

# 50. Account Enumeration

Where appropriate, authentication/recovery APIs should avoid revealing
whether a specific customer account exists.

Use consistent responses for sensitive lookup operations.

------------------------------------------------------------------------

# 51. Coupon Abuse

Coupon validation should be rate-limited and protected against:

``` text
Code guessing
Automated enumeration
Excessive validation
```

------------------------------------------------------------------------

# 52. Search Abuse

Search should enforce:

``` text
Query length limits
Filter limits
Pagination limits
Rate limits
```

------------------------------------------------------------------------

# 53. Checkout Abuse

Checkout and payment initiation should use:

``` text
Authentication/guest controls
Rate limiting
Idempotency
Server-side validation
```

------------------------------------------------------------------------

# 54. Idempotency

Financially significant operations should support idempotency where
appropriate.

Examples:

``` text
Checkout
Order creation
Payment creation
Refund operations
```

A retry must not create duplicate financial outcomes.

------------------------------------------------------------------------

# 55. Payment Security Boundary

The application must not trust:

``` text
Frontend payment success
Client-provided payment amount
Client-provided payment status
```

Payment status must be verified through the approved payment
integration.

------------------------------------------------------------------------

# 56. Payment Credentials

Do not store or process sensitive payment credentials unless the
approved payment architecture explicitly requires it and appropriate
compliance/security controls exist.

Prefer provider-hosted/tokenized mechanisms.

------------------------------------------------------------------------

# 57. Webhook Verification

Payment, shipping, notification, and other provider webhooks must be
verified.

Verification may use:

``` text
Signature
Shared secret
Provider verification API
```

according to the provider.

------------------------------------------------------------------------

# 58. Webhook Replay Protection

Where applicable, webhook processing should protect against replay.

Use appropriate:

``` text
Event ID
Timestamp
Idempotency
Signature verification
```

------------------------------------------------------------------------

# 59. Webhook Input Validation

Do not assume a correctly signed request contains a valid business
state.

After authentication, validate:

``` text
Event type
Resource identity
Expected state transition
Amount/currency where applicable
```

------------------------------------------------------------------------

# 60. Order State Security

Customers must not directly set:

``` text
Order status
Payment status
Shipment status
Refund status
```

These are server-controlled domain states.

------------------------------------------------------------------------

# 61. Inventory Security

Inventory mutation must be restricted to authorized backend workflows.

Customers must not be able to directly modify stock quantities.

------------------------------------------------------------------------

# 62. Pricing Security

Prices and discounts must be calculated/validated server-side.

Do not accept:

``` text
unit_price
discount_amount
subtotal
total
```

from the customer as authoritative financial values.

------------------------------------------------------------------------

# 63. Wholesale Pricing Security

Wholesale prices must be returned only to authorized wholesale contexts.

Do not leak wholesale prices through:

``` text
Public APIs
Search
HTML
Shared cache
Client-side configuration
```

------------------------------------------------------------------------

# 64. Cache Security

Never put private/personalized responses into public shared caches.

Pay particular attention to:

``` text
Cart
Account
Orders
Wholesale pricing
Wishlist
```

------------------------------------------------------------------------

# 65. CDN Security

CDN configuration must prevent accidental caching of private API
responses.

Public media may be cacheable; private account/order responses must not
be.

------------------------------------------------------------------------

# 66. Logging Security

Logs must not contain:

``` text
Passwords
Tokens
API keys
Payment secrets
Recovery links containing secrets
Sensitive personal data unnecessarily
```

------------------------------------------------------------------------

# 67. Structured Logging

Use structured logs with safe operational fields such as:

``` text
Request ID
User ID where appropriate
Order ID
Event ID
Endpoint
Status
Latency
Error category
```

------------------------------------------------------------------------

# 68. Audit Logging

Security-sensitive administrative actions should be auditable.

Examples:

``` text
Admin login
Permission changes
Customer account actions
Wholesale approval
Wholesale suspension
Product price change
Order status override
Refund action
```

The exact audit catalogue follows the admin/security architecture.

------------------------------------------------------------------------

# 69. Audit Log Integrity

Audit records should be protected from ordinary users and unauthorized
modification.

Consider append-oriented semantics where appropriate.

------------------------------------------------------------------------

# 70. Admin Security

Administrative interfaces are high-value targets.

Require:

``` text
Strong authentication
Least privilege
Session security
Rate limiting
Audit logging
```

Additional MFA should be considered for privileged administrative
access.

------------------------------------------------------------------------

# 71. Admin API Separation

Admin APIs should be clearly separated from public/customer APIs.

Use explicit authorization checks rather than relying only on hidden
frontend routes.

------------------------------------------------------------------------

# 72. Admin IDOR

Admin users must still be authorized for sensitive resources.

Being an admin does not automatically mean every staff member can
perform every operation.

------------------------------------------------------------------------

# 73. Security Headers for Admin

Admin pages should receive appropriate security headers and should avoid
unnecessary third-party scripts.

------------------------------------------------------------------------

# 74. Customer Privacy

Personal data should be minimized and protected across:

``` text
Database
API
Admin UI
Logs
Notifications
Analytics
Backups
Exports
```

------------------------------------------------------------------------

# 75. Data Exposure

Do not expose internal fields such as:

``` text
Supplier cost
Internal margin
Fraud notes
Admin notes
Private wholesale documentation
Internal payment metadata
```

through customer/public APIs.

------------------------------------------------------------------------

# 76. PII in URLs

Avoid placing unnecessary personal information in URLs.

Prefer internal IDs/opaque identifiers over sensitive data.

------------------------------------------------------------------------

# 77. Error Messages

Production errors should be useful but not disclose internal details.

Do not return:

``` text
Database stack traces
Secret values
Internal filesystem paths
SQL statements
Provider credentials
```

------------------------------------------------------------------------

# 78. Error Correlation

Return a safe:

``` text
Request/correlation ID
```

where useful so support can investigate without exposing internal
diagnostics.

------------------------------------------------------------------------

# 79. Django Security

Django production configuration should include appropriate protections
for:

``` text
DEBUG
Allowed hosts
CSRF
Secure cookies
Security middleware
HTTPS
Host validation
```

Never run production with debugging enabled.

------------------------------------------------------------------------

# 80. Next.js Security

The frontend must separate:

``` text
Server-only secrets
Client-safe configuration
```

Do not accidentally import server-only modules/secrets into client
components.

------------------------------------------------------------------------

# 81. Server Actions/API Boundaries

If Next.js server actions or server-side API routes are used, treat them
as backend entry points.

They require:

``` text
Input validation
Authorization
CSRF/security consideration
Rate limiting where appropriate
```

------------------------------------------------------------------------

# 82. Django API Security

Django API endpoints should enforce:

``` text
Authentication
Authorization
Input schemas
Rate limits
Output schemas
```

according to endpoint sensitivity.

------------------------------------------------------------------------

# 83. CORS/CSRF Architecture

The exact browser security model should be standardized before
implementation.

Avoid mixing incompatible authentication patterns without a clear
reason.

------------------------------------------------------------------------

# 84. Content Security Policy

CSP should be designed around the actual application.

Third-party services such as:

``` text
Payment provider
Analytics
Fonts
CDN
```

must be explicitly considered.

Avoid using an unnecessarily permissive policy such as unrestricted:

``` text
*
unsafe-inline
unsafe-eval
```

in production.

------------------------------------------------------------------------

# 85. Clickjacking Protection

Prevent unauthorized framing of sensitive pages where appropriate
through security headers.

------------------------------------------------------------------------

# 86. MIME Sniffing Protection

Use appropriate content-type and browser security headers to reduce
MIME-sniffing risks.

------------------------------------------------------------------------

# 87. Open Redirect Prevention

Redirect targets supplied by users must be validated.

Do not blindly redirect to arbitrary external URLs after:

``` text
Login
Logout
Checkout
Account actions
```

------------------------------------------------------------------------

# 88. SSRF Protection

Server-side code must not fetch arbitrary URLs supplied by untrusted
users.

If remote image/import functionality is introduced:

``` text
Allowlist domains
Validate URL schemes
Block private/internal addresses
Limit redirects
Limit response size
```

------------------------------------------------------------------------

# 89. Webhook SSRF

Webhook processing should not blindly fetch URLs included in third-party
payloads.

Treat webhook data as untrusted after signature verification.

------------------------------------------------------------------------

# 90. Denial-of-Service Protection

Protect expensive operations through:

``` text
Rate limiting
Payload limits
Pagination
Timeouts
Resource limits
Queue controls
```

------------------------------------------------------------------------

# 91. Request Size Limits

Set limits for:

``` text
JSON body
File uploads
Query parameters
Headers where appropriate
```

This prevents unnecessarily large malicious requests.

------------------------------------------------------------------------

# 92. Timeout Strategy

External calls should have explicit timeouts.

Never allow an unavailable third-party service to hold application
workers indefinitely.

------------------------------------------------------------------------

# 93. Retry Safety

Retries must be limited and idempotent where operations are
state-changing.

Avoid retry storms.

------------------------------------------------------------------------

# 94. Security Monitoring

Monitor for:

``` text
Authentication failures
Rate-limit violations
Authorization failures
Webhook verification failures
Unusual admin activity
Storage upload failures
Repeated 4xx/5xx patterns
```

------------------------------------------------------------------------

# 95. Security Alerts

Potential high-priority alerts:

``` text
Admin authentication anomalies
Spike in authorization failures
Payment webhook signature failures
Credential/configuration errors
Database/storage access anomalies
Unusual refund activity
```

------------------------------------------------------------------------

# 96. Incident Response

Production security incidents should follow a documented process:

``` text
Detect
 ↓
Contain
 ↓
Investigate
 ↓
Remediate
 ↓
Recover
 ↓
Review
```

------------------------------------------------------------------------

# 97. Incident Containment

Potential actions include:

``` text
Disable compromised credential
Rotate secrets
Revoke sessions
Disable vulnerable endpoint
Block abusive source
Disable affected integration
```

Actions should be authorized and auditable.

------------------------------------------------------------------------

# 98. Security Backup Strategy

Backups should be protected with:

``` text
Access control
Encryption where supported
Retention policy
Recovery testing
```

A backup that cannot be restored securely is not sufficient.

------------------------------------------------------------------------

# 99. Disaster Recovery

Security and availability planning should include recovery from:

``` text
Database failure
Storage failure
Credential compromise
Provider outage
Deployment rollback
Data corruption
```

------------------------------------------------------------------------

# 100. Security Testing

Security testing should include:

``` text
Authentication
Authorization
IDOR
Privilege escalation
CSRF
CORS
XSS
SQL injection
File upload
SSRF
Webhook verification
Rate limiting
Session security
Secret exposure
```

------------------------------------------------------------------------

# 101. Automated Security Checks

CI should include appropriate checks such as:

``` text
Dependency vulnerability scanning
Secret scanning
Static analysis
Linting
Type checking
Security-focused tests
```

The exact toolchain can be selected during implementation.

------------------------------------------------------------------------

# 102. Dependency Updates

Security updates should be prioritized.

However, dependency upgrades should still be tested against:

``` text
Frontend
Django
Database integration
Payment integration
Supabase
Build pipeline
```

------------------------------------------------------------------------

# 103. Production Security Checklist

Before production:

``` text
DEBUG disabled
HTTPS enabled
Secure cookies configured
CSRF configured
CORS restricted
Security headers configured
Secrets externalized
Service-role credentials protected
Database access restricted
RLS reviewed where used
Admin authorization tested
Rate limits enabled
Webhook verification enabled
File upload controls enabled
Payment boundaries verified
Logs sanitized
Backups tested
Monitoring enabled
Dependency scans passing
```

------------------------------------------------------------------------

# 104. Security Definition of Done

Security architecture is complete when:

-   Authentication boundaries are defined.
-   Authorization is server-side.
-   IDOR protections exist.
-   Retail/wholesale privileges are separated.
-   Admin permissions are least-privilege.
-   CSRF/CORS strategy is defined.
-   Security headers are configured.
-   Secrets are protected.
-   Supabase service-role access is server-only.
-   RLS strategy is documented where applicable.
-   File uploads are validated.
-   Payment/webhook security is implemented.
-   Rate limiting exists.
-   Sensitive logs are sanitized.
-   Audit logging exists for critical admin actions.
-   Security testing is automated where possible.
-   Incident response expectations are documented.

------------------------------------------------------------------------

# 105. AI Agent Security Rules

Antigravity must not:

-   Trust client-side authorization.
-   Accept client-supplied customer ownership as proof.
-   Allow retail users to self-assign wholesale status.
-   Trust client-side price/discount/total.
-   Trust frontend payment success.
-   Expose service-role/database/payment secrets.
-   Disable CSRF/CORS protections merely to solve development errors.
-   Build SQL with string concatenation from user input.
-   Render unsanitized user HTML.
-   Allow unrestricted file uploads.
-   Allow arbitrary storage paths.
-   Make private storage public for convenience.
-   Skip webhook verification.
-   Retry financial operations without idempotency.
-   Put private responses into shared caches.
-   Log secrets.
-   Return stack traces or infrastructure details in production.
-   Give all admin users unrestricted permissions.
-   Introduce third-party dependencies without security review.

------------------------------------------------------------------------

# 106. Security Change Workflow

Security-sensitive changes should follow:

``` text
Requirement
   ↓
Threat-model review
   ↓
Trust-boundary analysis
   ↓
Authorization review
   ↓
Data/privacy review
   ↓
Implementation
   ↓
Security tests
   ↓
Dependency/secret scan
   ↓
Staging verification
   ↓
Production monitoring
```

------------------------------------------------------------------------

# 107. Security Architecture Summary

``` text
                         Internet
                            |
                         HTTPS/CDN
                            |
                         Next.js
                            |
                     Django API Layer
                            |
             ┌──────────────┼──────────────┐
             ↓              ↓              ↓
        Auth/AuthZ      Validation      Rate Limits
             |              |              |
             └──────────────┼──────────────┘
                            ↓
                 Domain/Business Logic
                            |
          ┌─────────────────┼─────────────────┐
          ↓                 ↓                 ↓
     PostgreSQL          Storage          Providers
       + RLS            + Policies       + Webhooks
          |                 |                 |
          └─────────────────┼─────────────────┘
                            ↓
                       Audit/Monitoring
```

The fundamental rule is:

``` text
Assume the client is hostile.
Authenticate identity.
Authorize every protected resource.
Validate every boundary.
Minimize data exposure.
Protect secrets.
Verify external events.
Audit sensitive operations.
Fail securely.
```

------------------------------------------------------------------------

# 108. Next Document

The next document should be:

``` text
29-admin-panel-architecture.md
```

It will define:

-   Admin architecture.
-   Admin authentication.
-   Role/permission model.
-   Product management.
-   Category/collection management.
-   Inventory operations.
-   Order management.
-   Customer management.
-   Wholesale management.
-   Promotions.
-   Media management.
-   Notifications.
-   Dashboards.
-   Audit logs.
-   Admin APIs.
-   Bulk operations.
-   Approval workflows.
-   Operational safeguards.
-   Admin security.
