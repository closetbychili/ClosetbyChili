# Closet by Chilli — Security Architecture

## 1. Purpose

This document defines the production security architecture for Closet by Chilli.

The platform handles:

- Customer accounts.
- Personal information.
- Addresses.
- Product and inventory data.
- Wholesale customer information.
- Orders.
- Payments.
- Discounts and pricing.
- Administrative operations.

Security must therefore be treated as a core architectural requirement rather than a final-stage feature.

---

# 2. Security Principles

Closet by Chilli follows these principles:

```text
Least privilege
Defense in depth
Server-side authority
Zero trust for client input
Secure defaults
Explicit authorization
Data minimization
Fail securely
Audit important actions
```

---

# 3. Trust Boundaries

The major trust boundaries are:

```text
Customer Browser
       |
       | HTTPS
       v
Next.js Frontend
       |
       | Authenticated API
       v
Django Backend
       |
       +------> Supabase/PostgreSQL
       |
       +------> Supabase Storage
       |
       +------> Payment Provider
       |
       +------> Email/Shipping/Other Providers
```

The browser is untrusted.

---

# 4. Browser Is Never the Source of Truth

The frontend must never be trusted for:

```text
Price
Discount
Inventory
Order total
Wholesale eligibility
Permissions
Payment success
Order status
```

The backend must validate and calculate authoritative business state.

---

# 5. Authentication Architecture

Authentication is handled through the approved Supabase Auth architecture.

The application must:

```text
Authenticate user
Validate session/token
Resolve user identity
Apply backend authorization
```

Authentication answers:

```text
"Who is this user?"
```

Authorization answers:

```text
"What may this user do?"
```

They must remain separate concepts.

---

# 6. Session Security

Sessions must be handled using secure mechanisms supported by the selected Supabase/Next.js architecture.

Consider:

```text
Secure cookies where applicable
HttpOnly cookies where applicable
SameSite policy
Session expiration
Refresh behavior
Logout
Token rotation/refresh
```

Do not store sensitive long-lived credentials in insecure browser storage.

---

# 7. Authentication Failure

Authentication failures should not expose unnecessary information.

Avoid responses that reveal:

```text
Whether an account exists
Internal identity provider details
Sensitive session information
```

---

# 8. Authorization Model

Authorization should be enforced server-side.

Initial role model:

```text
CUSTOMER
WHOLESALE_CUSTOMER
STAFF
ADMIN
```

The exact role model remains governed by the approved authentication/authorization architecture.

---

# 9. Least Privilege

Every role should receive only the permissions required for its job.

Example:

```text
Customer
→ Browse
→ Manage own account
→ Manage own cart
→ Create orders
→ View own orders

Wholesale customer
→ Customer permissions
→ Approved wholesale capabilities

Staff
→ Explicit operational permissions

Admin
→ Administrative permissions
```

Do not assume:

```text
Staff = Admin
```

---

# 10. Object-Level Authorization

Authorization must be checked against the actual resource.

Example:

```text
GET /orders/123
```

must verify that the authenticated user is allowed to access order `123`.

Do not rely on:

```text
"the user is logged in"
```

alone.

---

# 11. Broken Object-Level Authorization Prevention

Every customer-owned resource should be tested for IDOR/BOLA vulnerabilities.

Examples:

```text
/orders/{id}
/addresses/{id}
/cart/{id}
/wholesale-applications/{id}
```

A user must not gain access merely by changing the identifier.

---

# 12. Wholesale Security

Wholesale access is sensitive because it can expose:

```text
Wholesale pricing
Wholesale-only products
Commercial information
Business account data
```

The backend must independently verify wholesale authorization.

Do not rely on:

```text
Frontend route visibility
Hidden buttons
Client-side role checks
```

---

# 13. Pricing Security

All important pricing decisions must happen server-side.

The backend should calculate:

```text
Base price
Variant price
Wholesale price
Discount
Promotion
Shipping
Tax if applicable
Final total
```

The client may display calculated values but must not control them.

---

# 14. Price Tampering Protection

If a client submits:

```json
{
  "unit_price": 100,
  "quantity": 2,
  "total": 200
}
```

the backend must not blindly trust those financial fields.

Instead:

```text
Product/variant
       ↓
Server-side price lookup
       ↓
Promotion evaluation
       ↓
Server-side total
```

---

# 15. Inventory Security

Inventory mutations must be protected.

Only authorized operations may:

```text
Increase stock
Decrease stock
Reserve stock
Release stock
Adjust stock
```

Customers must never directly modify inventory.

---

# 16. Inventory Concurrency

Inventory-changing operations should use appropriate database transaction/concurrency controls.

The objective is to prevent:

```text
Overselling
Duplicate reservations
Lost updates
Inconsistent stock
```

---

# 17. Checkout Security

At checkout the backend must revalidate:

```text
Customer
Cart
Products
Variants
Prices
Inventory
Discounts
Shipping
Order totals
```

Checkout should be treated as a security-sensitive transaction.

---

# 18. Payment Security

The application must not handle raw card information unless explicitly required and appropriately designed.

Prefer the payment provider's secure hosted/tokenized mechanisms.

Never store:

```text
Card number
CVV
Sensitive payment credentials
```

unless a formally approved architecture and applicable compliance requirements explicitly permit it.

---

# 19. Payment Success Authority

A browser redirect or client-side callback must not be considered authoritative proof of payment.

The system should rely on the payment provider's verified server-side result/webhook where applicable.

Conceptually:

```text
Payment Provider
       ↓
Verified Webhook
       ↓
Django
       ↓
Payment State
       ↓
Order State
```

---

# 20. Webhook Verification

Payment webhooks must verify:

```text
Signature
Event authenticity
Expected event structure
Event identity
Idempotency
```

Invalid signatures must be rejected.

---

# 21. Webhook Idempotency

A payment webhook may arrive more than once.

The system must safely handle:

```text
Event A
Event A again
Event A again
```

without creating duplicate:

```text
Payments
Orders
Refunds
Inventory changes
```

---

# 22. Idempotency Keys

Critical mutation endpoints should use idempotency where appropriate.

Candidates:

```text
Checkout
Payment initiation
Order creation
Refund
Inventory reservation
```

The exact endpoints should be defined in the API architecture.

---

# 23. API Security

All APIs must use HTTPS in production.

API endpoints should implement:

```text
Authentication where required
Authorization
Input validation
Output filtering
Rate limiting where required
Consistent error handling
Logging of important security events
```

---

# 24. HTTP Methods

Use appropriate HTTP methods.

Conceptually:

```text
GET    → Read
POST   → Create/action
PATCH  → Partial update
DELETE → Delete
```

Avoid using unsafe semantics such as:

```text
GET /delete-order
```

---

# 25. Input Validation

All untrusted input must be validated.

Sources include:

```text
JSON bodies
Query parameters
Path parameters
Headers
Cookies
Uploaded files
Webhook payloads
```

Never assume frontend validation is sufficient.

---

# 26. Mass Assignment Protection

APIs must explicitly define writable fields.

Do not blindly deserialize arbitrary client fields into domain objects.

For example, customers must not be able to submit:

```text
role=ADMIN
is_staff=true
wholesale_status=APPROVED
price=1
payment_status=PAID
```

and have those fields accepted.

---

# 27. Output Filtering

API serializers should expose only fields appropriate for the requesting user.

Do not expose internal fields merely because they exist on a database model.

---

# 28. Error Handling

Production errors should be safe and structured.

Do not expose:

```text
Stack traces
SQL queries
Internal file paths
Secrets
Environment variables
Provider credentials
Internal implementation details
```

---

# 29. Error Response Design

Use a consistent error structure.

Conceptually:

```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "The request could not be processed."
  }
}
```

Internal diagnostic details should go to secure logs rather than public responses.

---

# 30. CORS

CORS must be explicitly configured.

Production should allow only approved origins.

Avoid:

```text
Access-Control-Allow-Origin: *
```

for authenticated/private APIs unless the architecture explicitly requires it and the security implications have been reviewed.

---

# 31. CSRF

CSRF protection must match the chosen authentication architecture.

If cookie-based authentication is used, appropriate CSRF protections must be implemented.

Do not disable CSRF globally merely to make frontend requests work.

---

# 32. Security Headers

Production should use appropriate security headers.

Potential headers include:

```text
Content-Security-Policy
Strict-Transport-Security
X-Content-Type-Options
Referrer-Policy
Permissions-Policy
```

The exact CSP must be compatible with Next.js, payment providers, analytics, images, and other required services.

---

# 33. Content Security Policy

CSP should be introduced carefully.

Avoid unnecessarily broad policies such as:

```text
script-src *
```

Third-party domains should be explicitly reviewed and allowed only where required.

---

# 34. Clickjacking Protection

The storefront and administrative surfaces should have appropriate framing protections.

Use modern security headers/configuration rather than custom JavaScript protection.

---

# 35. Transport Security

Production traffic must use:

```text
HTTPS
TLS
Secure cookies where applicable
```

HTTP should redirect to HTTPS where appropriate.

---

# 36. Secrets Management

Secrets must never be committed to Git.

Examples:

```text
Supabase service-role key
Payment provider secret
Webhook secret
Email provider key
Database credentials
JWT secrets
```

Use the deployment platform's secret/environment management.

---

# 37. Environment Separation

Maintain separate environments:

```text
Development
Staging
Production
```

Do not use production secrets in development.

Do not use production payment credentials for automated tests.

---

# 38. Public vs Secret Environment Variables

Only explicitly public values may be exposed to the frontend.

Examples of potentially public configuration:

```text
Public application URL
Supabase public/anonymous key where architecture requires it
Public analytics identifiers
```

Secrets must remain server-side.

---

# 39. Supabase Security

Supabase must be configured according to the approved architecture.

Security controls may include:

```text
Authentication
Row Level Security
Storage policies
Database roles
Restricted service credentials
```

The application must never expose privileged Supabase credentials to the browser.

---

# 40. Row Level Security

Where Supabase RLS is part of the approved architecture, policies must enforce least privilege.

Policies should be explicit about:

```text
Who can SELECT
Who can INSERT
Who can UPDATE
Who can DELETE
```

Do not enable RLS without defining correct policies.

Do not disable RLS simply because it causes an application error.

---

# 41. Service Role Credentials

Supabase service-role credentials bypass important database security controls.

Therefore:

```text
Service role → server only
Browser → never
Public JavaScript → never
Git → never
Logs → never
```

---

# 42. Storage Security

Product and user-uploaded media should use appropriate storage policies.

Do not make private customer data publicly accessible merely for convenience.

---

# 43. File Upload Security

If the platform supports uploads, validate:

```text
File size
MIME type
Extension
Content where necessary
Filename
Storage location
Authorization
```

Do not trust the filename or browser-provided MIME type alone.

---

# 44. Image Upload Security

For product/user images:

```text
Validate file
Limit size
Normalize/transform where appropriate
Generate safe object names
Store outside executable paths
```

Avoid accepting arbitrary executable content.

---

# 45. File Access

Uploaded files must follow the intended visibility model:

```text
Public product media → public access where appropriate

Private customer document → private access
```

Signed URLs should be used where appropriate for private objects.

---

# 46. Dependency Security

Dependencies must be reviewed regularly.

Use:

```text
Lockfiles
Automated vulnerability scanning
Controlled upgrades
```

Do not blindly upgrade major versions during unrelated feature work.

---

# 47. Supply Chain Security

Avoid unnecessary dependencies.

Before adding a package, consider:

```text
Maintenance
Popularity/adoption
Security history
License
Bundle impact
Transitive dependencies
```

---

# 48. SQL Injection

Use Django ORM/query parameterization.

Do not construct SQL from raw user input.

If raw SQL is genuinely necessary:

```text
Parameterize values
Review query
Add tests
Document reason
```

---

# 49. XSS Prevention

Never render untrusted HTML without sanitization.

Potential sources:

```text
CMS content
Product descriptions
User-generated content
Review content
Query parameters
Uploaded metadata
```

The frontend must escape content by default.

---

# 50. Open Redirect Protection

Redirect destinations supplied by users must not be blindly trusted.

Avoid:

```text
/login?next=https://malicious-site.example
```

unless the destination is validated against an approved policy.

---

# 51. SSRF Protection

If the backend fetches user-provided URLs, implement SSRF protections.

Do not allow arbitrary server-side requests to internal infrastructure.

This is especially relevant to:

```text
Image import
External content ingestion
Webhook configuration
Admin integrations
```

---

# 52. Authentication Rate Limiting

Sensitive authentication-related operations should have appropriate protection against abuse.

Examples:

```text
Login
Password/reset flows if applicable
Verification flows
Sensitive account operations
```

The exact implementation depends on Supabase Auth capabilities and infrastructure.

---

# 53. API Rate Limiting

Rate limiting should be considered for:

```text
Search
Authentication-related endpoints
Expensive operations
Sensitive mutations
Public APIs
```

Limits should be based on expected traffic and abuse risk.

---

# 54. Brute Force Protection

The authentication system should provide appropriate protection against repeated credential attempts.

Do not build a parallel authentication system unless explicitly required.

---

# 55. Audit Logging

Security-sensitive actions should be auditable.

Potential events:

```text
Login/security events
Role changes
Wholesale approval
Wholesale suspension
Inventory adjustment
Order cancellation
Refund
Payment state changes
Admin changes
Sensitive configuration changes
```

---

# 56. Audit Log Requirements

Audit records should contain appropriate metadata such as:

```text
Actor
Action
Resource
Timestamp
Result
Request/correlation ID
```

Do not store unnecessary secrets or sensitive payloads.

---

# 57. Audit Log Immutability

Audit records should not be casually editable by normal application users.

Administrative access to audit records should itself be controlled.

---

# 58. Logging

Application logs should help diagnose failures without leaking sensitive information.

Never log:

```text
Passwords
Access tokens
Service-role keys
Payment secrets
Full card details
Sensitive personal data unnecessarily
```

---

# 59. Correlation IDs

Requests should have a way to correlate:

```text
Frontend request
API request
Database operation
Payment operation
Webhook event
```

where practical.

This makes production debugging significantly easier.

---

# 60. Monitoring Security Events

Monitor unusual events such as:

```text
Repeated authentication failures
Large numbers of denied requests
Unexpected admin actions
Webhook failures
Payment anomalies
Inventory anomalies
Large export/access patterns
```

The monitoring stack will be finalized during infrastructure planning.

---

# 61. Personal Data Minimization

Store only information required for the business process.

Avoid collecting data merely because it might be useful someday.

---

# 62. Personal Data Protection

Customer data should be protected through:

```text
Access controls
Encryption in transit
Provider/platform encryption at rest
Least privilege
Restricted API output
Secure logs
```

---

# 63. Data Retention

Retention policies should eventually be defined for:

```text
Orders
Payment records
Audit logs
Customer data
Wholesale applications
Operational logs
```

Retention must consider legal/business requirements applicable to the deployment.

---

# 64. Account Deletion

If account deletion is supported, define what happens to:

```text
Profile
Addresses
Orders
Invoices
Payment references
Audit records
Wholesale information
```

Financial/legal records may require retention even when an account is removed.

The final policy must be business-approved.

---

# 65. Backup and Recovery

Production data must have a recovery strategy.

At minimum define:

```text
Backup frequency
Retention
Recovery process
Recovery testing
Responsible owner
```

A backup that has never been restored should not be assumed reliable.

---

# 66. Incident Response

Security incidents should follow:

```text
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
Document
 ↓
Prevent recurrence
```

The production operations plan should define responsibilities and escalation procedures.

---

# 67. Security Incident Examples

Examples include:

```text
Credential leak
Unauthorized account access
Payment webhook compromise
Admin account compromise
Database exposure
Malicious file upload
Data leak
Unexpected privileged operation
```

---

# 68. Security Testing Before Production

Before launch, perform:

```text
Dependency scan
Authentication review
Authorization review
API security review
Database/RLS review
Storage policy review
Webhook verification review
Secret scan
Security-header review
Input validation review
```

A formal penetration test may be added based on business risk.

---

# 69. Security Checklist for Every Sprint

Before accepting security-relevant work:

```text
[ ] Authentication considered
[ ] Authorization considered
[ ] Input validated
[ ] Output minimized
[ ] Secrets protected
[ ] Error handling safe
[ ] Audit requirement considered
[ ] Tests added
```

---

# 70. AI Agent Security Rules

Antigravity must never:

- Disable authentication to make development easier.
- Disable authorization checks to make tests pass.
- Expose service-role credentials.
- Commit `.env` secrets.
- Log secrets.
- Make private storage public without approval.
- Disable RLS to resolve an application problem.
- Trust client-provided prices or totals.
- Mark payments successful from browser input.
- Remove security tests.
- Ignore a security failure.

---

# 71. AI Agent Security Escalation

If the agent encounters a security-sensitive architectural decision that is not documented:

```text
Stop
Explain the issue
Describe the options
Ask for approval
```

Do not silently choose a weaker security model.

---

# 72. Production Security Checklist

Before launch:

### Authentication

```text
[ ] Auth flow verified
[ ] Sessions secure
[ ] Logout verified
[ ] Protected routes tested
```

### Authorization

```text
[ ] Role permissions verified
[ ] Object ownership verified
[ ] Wholesale access verified
[ ] Admin boundaries verified
```

### Database

```text
[ ] RLS/policies verified where applicable
[ ] Service credentials protected
[ ] Constraints verified
[ ] Backups verified
```

### API

```text
[ ] Validation
[ ] Rate limiting
[ ] Error handling
[ ] CORS
[ ] CSRF where applicable
[ ] Security headers
```

### Payments

```text
[ ] Provider integration verified
[ ] Webhook signatures verified
[ ] Idempotency verified
[ ] No sensitive payment data stored
```

### Files

```text
[ ] Upload validation
[ ] Storage permissions
[ ] Private/public access verified
```

### Operations

```text
[ ] Logging
[ ] Monitoring
[ ] Audit logs
[ ] Incident process
[ ] Recovery process
```

---

# 73. Security Definition of Done

A security-sensitive feature is complete only when:

- Authentication requirements are implemented.
- Authorization is enforced server-side.
- Input is validated.
- Sensitive output is protected.
- Security tests exist.
- Secrets are not exposed.
- Relevant audit logging exists.
- Failure behavior is safe.
- Documentation reflects the security model.

---

# 74. Security Architecture Summary

The fundamental security model is:

```text
                   UNTRUSTED
                Customer Browser
                       |
                     HTTPS
                       |
                       v
                Next.js Frontend
                       |
             Authenticated Requests
                       |
                       v
                Django Backend
                       |
          ┌────────────┼────────────┐
          ↓            ↓            ↓
     PostgreSQL     Storage      Providers
       / RLS       Policies
          |
          v
     Authoritative
     Business State
```

The core rule is:

```text
The client requests.
The backend decides.
The database enforces.
The provider confirms payments.
The audit system records important actions.
```

---

# 75. Next Document

The next document is:

```text
14-api-architecture.md
```

It will define the production API conventions, including:

- REST API structure.
- Versioning.
- Endpoint organization.
- Request/response conventions.
- Pagination.
- Filtering and sorting.
- Error format.
- Authentication.
- Authorization.
- Idempotency.
- API validation.
- Webhooks.
- Rate limiting.
- API documentation.
- Frontend API-client rules.
