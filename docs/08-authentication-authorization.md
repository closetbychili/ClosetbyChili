# Closet by Chilli — Authentication & Authorization

## 1. Purpose

This document defines the authentication and authorization architecture for Closet by Chilli.

The security model separates:

```text
Authentication
    ↓
Who is this user?

Authorization
    ↓
What is this user allowed to do?
```

The platform uses **Supabase Auth for identity/authentication** and **Django for application-level authorization and business security**.

---

# 2. Security Architecture

The target architecture is:

```text
                    User
                     |
                     v
               Supabase Auth
                     |
              Access Token
                     |
                     v
             Next.js Frontend
                     |
                HTTPS Request
                     |
                     v
              Django REST API
                     |
            Verify Supabase JWT
                     |
              Resolve App User
                     |
          ┌──────────┴──────────┐
          |                     |
     Authentication        Authorization
          |                     |
          └──────────┬──────────┘
                     |
              Application Service
                     |
                  Database
```

Supabase is responsible for authentication identity.

Django remains responsible for application permissions and business rules.

---

# 3. Authentication vs Authorization

## Authentication

Authentication establishes:

```text
This request belongs to User X.
```

It may involve:

- Supabase Auth.
- Access tokens.
- Token expiration.
- Refresh/session handling.
- Identity verification.

## Authorization

Authorization establishes:

```text
User X may perform Operation Y on Resource Z.
```

Examples:

```text
Customer → view own orders
Wholesale Customer → access wholesale pricing
Staff → manage operational resources
Admin → perform privileged administrative operations
```

---

# 4. Identity Provider

Supabase Auth is the identity provider for the application.

The system should not build a second independent password authentication system inside Django.

Django should consume the authenticated identity and map it to the application's user/domain model.

---

# 5. User Identity Mapping

The authentication identity and application user should have a stable relationship.

Conceptually:

```text
Supabase Auth User
       |
       | stable auth user ID
       v
Application User
       |
       ├── Profile
       ├── Addresses
       ├── Orders
       └── Wholesale Profile
```

The application must not identify customers solely through email addresses.

The stable identity identifier should be the authoritative link.

---

# 6. User Provisioning

When an authenticated user first interacts with the application, Django may need to ensure an application-level user exists.

Conceptually:

```text
Valid Supabase identity
        ↓
Find application user
        |
   ┌────┴────┐
   |         |
 Found     Missing
   |         |
 Continue   Create/link
```

Provisioning must be safe under concurrent requests.

---

# 7. Token Verification

Django must verify the Supabase access token before treating a request as authenticated.

Verification must include the appropriate token properties, such as:

- Signature.
- Expiration.
- Issuer.
- Audience where applicable.
- Required claims.
- Token validity.

The implementation must use a maintained, well-understood verification mechanism.

The API must never trust a user ID supplied in the request body as proof of identity.

---

# 8. Token Handling

The frontend must not send:

```json
{
  "user_id": "some-other-user"
}
```

as the mechanism for identifying the current authenticated user.

The backend obtains the authenticated identity from the verified token.

---

# 9. Current User

The API provides:

```http
GET /api/v1/me/
```

The response is based on the authenticated request identity.

The client does not choose which user `/me/` represents.

---

# 10. Session Architecture

Supabase manages authentication sessions.

The frontend should use the official Supabase client/session mechanisms rather than implementing custom token storage logic unnecessarily.

The architecture must minimize exposure of long-lived credentials to JavaScript.

Exact browser/server session handling should follow the selected Next.js application architecture.

---

# 11. Access Token Expiration

Access tokens expire.

The application must handle:

```text
Valid token
Expired token
Invalid token
Revoked/invalid session where applicable
```

An expired or invalid access token must result in an appropriate authentication failure rather than silently treating the request as anonymous when authentication is required.

---

# 12. Refresh Handling

Session refresh should be handled through the Supabase authentication flow.

The Django API should not implement its own refresh-token system.

Refresh tokens must never be accepted as API access tokens.

---

# 13. Logout

Logout should invalidate/end the user's Supabase session according to the authentication flow.

Application data such as orders must remain intact.

Logging out must not delete the customer's application account.

---

# 14. Password Handling

Django must not store customer passwords.

Password authentication, password reset and credential handling belong to Supabase Auth.

The application database should contain no customer plaintext passwords.

It should also avoid storing unnecessary password-derived information.

---

# 15. Email Verification

If email verification is enabled for the selected authentication flow, the application must distinguish:

```text
Authenticated
```

from:

```text
Verified/eligible for a particular operation
```

Any requirement for verified email must be enforced server-side.

---

# 16. Social Login

If social providers are introduced later, they remain part of the Supabase Auth identity layer.

The application domain remains provider-independent.

The application should still map the authenticated identity to the same application User.

---

# 17. Anonymous Users

Public storefront browsing should be possible without authentication.

Anonymous users may be able to:

```text
Browse products
View categories
View collections
View public content
```

Operations requiring customer identity must require authentication.

---

# 18. Guest Cart

If guest carts are enabled:

```text
Anonymous Browser
      |
Secure Cart Identifier
      |
Guest Cart
```

The identifier must not expose:

- Customer identity.
- Internal database IDs unnecessarily.
- Sensitive information.

When the user authenticates, the system may merge the guest cart into the authenticated cart according to documented rules.

---

# 19. Authorization Roles

Initial application roles:

```text
CUSTOMER
WHOLESALE_CUSTOMER
STAFF
ADMIN
```

These roles represent application authorization states.

They must not be treated as frontend-only labels.

---

# 20. Customer

A normal retail customer may:

- Browse public products.
- Manage their own profile.
- Manage their own addresses.
- Manage their cart.
- Checkout.
- View their own orders.
- Perform allowed customer actions.

A customer must not access another customer's private data.

---

# 21. Wholesale Customer

A wholesale customer is an authorized customer with wholesale eligibility.

A wholesale customer may receive:

- Wholesale pricing.
- Wholesale-specific purchasing capabilities.
- Wholesale order rules.
- Other wholesale features approved by the business.

Wholesale access must be verified by the backend.

---

# 22. Staff

Staff users can perform selected operational tasks.

Examples:

```text
Catalog management
Inventory operations
Order operations
Wholesale application review
Customer support operations
```

Staff permissions should follow least privilege.

Not every staff member should automatically have administrator access.

---

# 23. Admin

Administrators have the highest application-level privileges.

They may manage:

```text
Users
Catalog
Inventory
Orders
Wholesale
Promotions
CMS
System configuration
```

Administrative access must be strongly protected.

---

# 24. Role vs Wholesale Status

Wholesale eligibility should not be represented only as a generic role.

Conceptually:

```text
User
 |
 +-- Base application permissions
 |
 +-- Wholesale Profile
       |
       +-- Status
       +-- Eligibility
```

This allows a customer to retain their account while their wholesale status changes.

---

# 25. Wholesale Status

Initial conceptual states:

```text
NOT_APPLIED
PENDING
UNDER_REVIEW
APPROVED
REJECTED
SUSPENDED
```

Only an appropriate backend operation may transition these states.

---

# 26. Wholesale Authorization Rule

A user should receive wholesale capabilities only when the server determines that the user's wholesale state permits them.

Do not use:

```javascript
if (user.isWholesale) {
   showWholesalePrice();
}
```

as the security boundary.

Frontend logic is presentation only.

The backend must enforce:

```text
Authenticated identity
        +
Wholesale eligibility
        ↓
Wholesale authorization
```

---

# 27. Object-Level Authorization

Authorization must be evaluated at the resource level.

Example:

```text
User A
  |
  └── Order A

User B
  |
  └── Order B
```

User A requesting:

```http
GET /api/v1/orders/B
```

must receive:

```text
403 Forbidden
```

or an appropriately designed not-found response where hiding resource existence is desirable.

---

# 28. Ownership Rules

Customer-owned resources include:

```text
Profile
Addresses
Cart
Orders
Wholesale applications
```

A customer may access only their own records.

Staff/admin access requires explicit elevated permissions.

---

# 29. Authorization Matrix

| Capability | Public | Customer | Wholesale | Staff | Admin |
|---|---:|---:|---:|---:|---:|
| Browse catalog | Yes | Yes | Yes | Yes | Yes |
| View public collections | Yes | Yes | Yes | Yes | Yes |
| Manage own profile | No | Yes | Yes | Depends | Yes |
| Manage own addresses | No | Yes | Yes | Depends | Yes |
| Use cart | Optional guest | Yes | Yes | Depends | Yes |
| Retail checkout | No | Yes | Yes | Depends | Yes |
| Wholesale pricing | No | No | Yes | Depends | Yes |
| View own orders | No | Yes | Yes | N/A | Yes |
| Manage catalog | No | No | No | Allowed staff | Yes |
| Manage inventory | No | No | No | Allowed staff | Yes |
| Review wholesale applications | No | No | No | Allowed staff | Yes |
| Manage CMS | No | No | No | Allowed staff | Yes |
| Manage system administration | No | No | No | No | Yes |

The exact staff permissions will be finalized during admin implementation.

---

# 30. Permission Design

Prefer explicit permissions for sensitive operations.

Examples:

```text
catalog.view
catalog.manage

inventory.view
inventory.adjust

orders.view
orders.manage
orders.refund

wholesale.view
wholesale.review
wholesale.approve

cms.view
cms.manage
```

The final permission list should be kept small and business-focused.

---

# 31. Least Privilege

Every role should have only the permissions it requires.

Avoid:

```text
STAFF = everything except one thing
```

Prefer:

```text
STAFF
 ├── catalog.view
 ├── orders.view
 └── wholesale.review
```

for a staff member whose responsibilities are limited to those capabilities.

---

# 32. Service-Role Credentials

Supabase service-role credentials are highly privileged.

They must:

- Never be sent to the browser.
- Never be committed to source control.
- Never appear in frontend environment variables.
- Never be logged.
- Exist only in trusted server-side environments.

If Django needs privileged Supabase operations, those operations must happen server-side.

---

# 33. Public Supabase Credentials

Any Supabase browser/client configuration that is intentionally public must be treated as public.

Security must come from:

```text
Supabase security configuration
+
Django authorization
+
Database policies where applicable
```

Never assume a public project identifier is itself a secret.

---

# 34. CORS

Production CORS must use an explicit allowlist.

Do not use unrestricted:

```text
*
```

for authenticated production API access.

Expected origins should include only approved application domains.

Development origins can be separately configured.

---

# 35. CSRF

The exact CSRF strategy depends on whether browser authentication is carried through authorization headers, cookies, or a hybrid architecture.

The implementation must document the chosen mechanism.

If cookies are used for authenticated browser requests, CSRF protection must be enabled appropriately.

If bearer tokens are used without authentication cookies, the CSRF threat model differs, but other security controls remain mandatory.

---

# 36. Cookie Security

If application cookies are introduced, sensitive cookies should use appropriate:

```text
Secure
HttpOnly
SameSite
```

settings.

Cookie configuration must be environment-specific where necessary.

---

# 37. Password Reset

Password reset flows are handled through Supabase Auth.

Django should not implement a parallel password reset mechanism.

After reset, application authorization remains associated with the same application identity.

---

# 38. Account Deactivation

An account may become unavailable without deleting historical commerce data.

Potential states may include:

```text
ACTIVE
SUSPENDED
DEACTIVATED
```

The final account lifecycle should be defined before implementation.

---

# 39. Suspended Users

A suspended account should be prevented from performing operations according to business policy.

Examples:

```text
Login may be blocked at auth layer
API operations may be denied
Wholesale access may be removed
```

The exact behavior must be explicitly implemented rather than inferred by the frontend.

---

# 40. Wholesale Suspension

Wholesale access can be suspended independently from the customer's account.

Example:

```text
Customer account: ACTIVE
Wholesale profile: SUSPENDED
```

The customer can remain a retail customer while wholesale functionality is disabled.

---

# 41. Authorization Failure

Unauthenticated access to a protected endpoint:

```text
401 Unauthorized
```

Authenticated but insufficient permission:

```text
403 Forbidden
```

The application should not reveal sensitive internal authorization details in error messages.

---

# 42. Resource Enumeration Protection

Private identifiers should not unnecessarily make it easy to enumerate customer data.

For sensitive resources, the system should consider:

- UUIDs/opaque identifiers.
- Ownership checks.
- Appropriate not-found behavior.
- Rate limiting.

The exact identifier strategy must be finalized during database implementation.

---

# 43. Sensitive Data

The API must minimize exposure of:

```text
Internal notes
Supplier costs
Margins
Payment secrets
Provider credentials
Service-role credentials
Private customer data
Administrative metadata
```

Only information necessary for the consuming client should be returned.

---

# 44. Logging

Security-sensitive logs should never contain:

```text
Passwords
Access tokens
Refresh tokens
Service-role keys
Payment secrets
Full sensitive personal information
```

Logs should contain enough metadata to investigate problems safely.

---

# 45. Auditability

Important authorization-sensitive operations should produce audit records where appropriate.

Examples:

```text
Wholesale approved
Wholesale suspended
Inventory adjusted
Order refunded
Admin permission changed
```

Audit records should identify:

```text
Actor
Action
Resource
Timestamp
Relevant context
```

without unnecessarily storing secrets.

---

# 46. Webhook Authentication

External webhooks are not authenticated through customer Supabase tokens.

Payment/shipping providers must be authenticated using their documented verification mechanism.

Typical flow:

```text
Provider
   ↓
Webhook
   ↓
Signature verification
   ↓
Event validation
   ↓
Idempotency check
   ↓
Business processing
```

---

# 47. Webhook Authorization

A webhook endpoint must not accept arbitrary client-submitted events merely because the JSON structure is valid.

The provider's cryptographic verification is part of the trust boundary.

---

# 48. Idempotency and Security

Security and reliability overlap.

Sensitive operations should safely handle retries.

Examples:

```text
Payment creation
Order finalization
Refund
Inventory adjustment where appropriate
Wholesale approval
```

Duplicate requests must not accidentally create duplicate financial or business effects.

---

# 49. Frontend Security Rules

The Next.js frontend must assume:

```text
Anything in browser code can be inspected or modified.
```

Therefore:

- Never put secrets in frontend code.
- Never trust client prices.
- Never trust client roles.
- Never trust client order status.
- Never trust hidden fields.
- Never rely on UI restrictions as authorization.

---

# 50. Backend Security Rules

Django is the authoritative application security boundary for business operations.

The backend must:

- Authenticate requests.
- Authorize operations.
- Validate input.
- Recalculate financial values.
- Validate inventory.
- Enforce wholesale eligibility.
- Verify external callbacks.
- Protect sensitive fields.

---

# 51. Database Security

Supabase/PostgreSQL security must be designed alongside Django authorization.

Where direct Supabase client access exists, database-level policies must prevent unauthorized access.

Django's service-side database access must also follow least-privilege principles where practical.

---

# 52. Direct Client Database Access

The architecture should avoid allowing the storefront to directly manipulate critical commerce records.

The client should not directly write:

```text
Orders
Payments
Inventory
Refunds
Wholesale approval state
```

through unrestricted database access.

These operations belong behind Django business services.

---

# 53. Authentication Architecture for Agents

AI coding agents must not:

- Generate custom password authentication.
- Create duplicate user identity systems.
- Expose service-role credentials.
- Put secrets into source code.
- Implement authorization only in React.
- Trust user IDs from request bodies.
- Bypass backend authorization for convenience.

---

# 54. Environment Variables

Secrets belong in environment/secret management.

Examples:

```text
SUPABASE_URL
SUPABASE_ANON_KEY / PUBLIC CLIENT CONFIG where appropriate
SUPABASE_SERVICE_ROLE_KEY
DATABASE_URL
PAYMENT_PROVIDER_SECRET
WEBHOOK_SECRET
```

Exact variable names will be finalized during implementation.

Secrets must never be committed.

---

# 55. Environment Separation

At minimum:

```text
Development
Staging
Production
```

must have separate credentials/resources where appropriate.

Production credentials must never be used for local development.

---

# 56. Security Testing

Authentication tests must cover:

```text
Valid token
Expired token
Invalid token
Missing token
Wrong issuer/audience where applicable
```

Authorization tests must cover:

```text
Customer → own resource
Customer → another customer's resource
Retail → wholesale resource
Wholesale → authorized resource
Staff → permitted resource
Staff → forbidden resource
Admin → privileged resource
```

---

# 57. Critical Security Tests

The following must be tested before production:

### Price manipulation

Client submits a fake price.

Expected:

```text
Backend ignores client price.
```

### Wholesale manipulation

Retail user attempts to request wholesale pricing.

Expected:

```text
Backend denies wholesale access.
```

### Order ownership

User A requests User B's order.

Expected:

```text
Access denied.
```

### Inventory manipulation

Client attempts to submit arbitrary stock values.

Expected:

```text
Backend rejects unauthorized inventory modification.
```

### Payment manipulation

Client claims payment succeeded.

Expected:

```text
Backend waits for/validates trusted payment confirmation.
```

---

# 58. Authentication & Authorization Definition of Done

Security architecture is ready for implementation when:

- Supabase Auth is the identity provider.
- Django verifies authenticated identity.
- Application User mapping is defined.
- Roles are defined.
- Wholesale eligibility is defined.
- Object-level authorization is defined.
- Staff/admin boundaries are defined.
- Service-role secret handling is defined.
- CORS strategy is defined.
- CSRF strategy is defined.
- Webhook verification is defined.
- Security-sensitive operations require idempotency where appropriate.
- Frontend trust boundaries are documented.
- Authentication and authorization tests are planned.

---

# 59. Final Security Model

```text
                 ┌──────────────────┐
                 │   Supabase Auth  │
                 │   Authentication │
                 └────────┬─────────┘
                          |
                     Access Token
                          |
                          v
                 ┌──────────────────┐
                 │      Next.js     │
                 │    Presentation  │
                 └────────┬─────────┘
                          |
                          | HTTPS
                          v
                 ┌──────────────────┐
                 │      Django      │
                 │ Authentication   │
                 │ Authorization    │
                 │ Business Rules   │
                 └────────┬─────────┘
                          |
              ┌───────────┴───────────┐
              |                       |
              v                       v
       Application Data        External Services
              |                       |
              v                       v
         PostgreSQL              Payments/Shipping
```

---

# 60. Next Document

The next document is:

```text
09-frontend-architecture.md
```

It will define the Next.js frontend architecture, including:

- App Router structure.
- Public storefront.
- Customer account area.
- Wholesale storefront behavior.
- Admin boundary.
- Components.
- Server vs client components.
- State management.
- Data fetching.
- API client.
- SEO.
- Responsive design.
- Theme implementation.
- Accessibility.
- Performance.
- Error/loading states.
