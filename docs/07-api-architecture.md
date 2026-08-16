# Closet by Chilli — API Architecture

## 1. Purpose

This document defines the REST API architecture for Closet by Chilli.

The API is the contract between:

```text
Next.js Frontend
       |
       v
Django REST API
       |
       v
Application Services
       |
       v
PostgreSQL
```

The API must expose business capabilities without exposing internal database implementation details.

---

# 2. API Principles

The API must be:

- Versioned.
- Consistent.
- Secure.
- Predictable.
- Explicit about permissions.
- Validated server-side.
- Safe against duplicate critical requests.
- Paginated for collections.
- Documented through OpenAPI.

Initial API version:

```text
/api/v1/
```

---

# 3. API Base URL

Production will use a dedicated API origin or route defined by deployment architecture.

Conceptually:

```text
https://api.<production-domain>/api/v1/
```

The exact production domain is not locked yet.

Local development may use:

```text
http://localhost:<port>/api/v1/
```

The frontend must obtain the API base URL from environment configuration.

---

# 4. API Versioning

The initial API version is:

```text
v1
```

Example:

```text
/api/v1/products/
/api/v1/cart/
/api/v1/orders/
```

Breaking API changes must not silently modify an existing contract.

---

# 5. HTTP Methods

Use conventional HTTP semantics.

```text
GET     Read
POST    Create / execute a non-idempotent operation
PUT     Full replacement where appropriate
PATCH   Partial update
DELETE  Delete/deactivate where appropriate
```

Commerce state transitions may use explicit action endpoints.

Example:

```text
POST /api/v1/orders/{id}/cancel/
```

rather than allowing arbitrary:

```text
PATCH /api/v1/orders/{id}/
{
  "status": "cancelled"
}
```

---

# 6. Authentication

Authentication is based on Supabase Auth.

Conceptually:

```text
User
  |
Supabase Auth
  |
Access Token
  |
Django API
  |
Token Verification
  |
Application User
```

Protected endpoints must verify authentication server-side.

The frontend must never be treated as an authority for identity.

---

# 7. Authorization

Every protected endpoint must define who can access it.

Initial conceptual roles:

```text
Public
Customer
Wholesale Customer
Staff
Administrator
```

Authorization must also enforce object ownership.

Example:

```text
GET /orders/{id}/
```

must verify that the authenticated customer owns the order unless the caller has appropriate staff permissions.

---

# 8. API Request Headers

Typical authenticated requests:

```http
Authorization: Bearer <access-token>
Content-Type: application/json
```

Additional headers may include:

```text
Idempotency-Key
X-Request-ID
```

for operations that require them.

The exact header policy will be finalized during implementation.

---

# 9. Content Type

JSON is the default API representation.

Example:

```http
Content-Type: application/json
```

File uploads may use:

```text
multipart/form-data
```

or direct Supabase Storage upload workflows where appropriate.

---

# 10. Response Convention

The project should use one consistent response structure.

Recommended:

```json
{
  "data": {},
  "meta": {}
}
```

For collection responses:

```json
{
  "data": [],
  "meta": {
    "pagination": {}
  }
}
```

The final pagination shape must be implemented consistently across endpoints.

---

# 11. Error Response

Errors should use a consistent structure.

Recommended:

```json
{
  "error": {
    "code": "INSUFFICIENT_INVENTORY",
    "message": "The selected quantity is no longer available.",
    "details": {}
  }
}
```

The frontend should rely on stable error codes for known business conditions.

---

# 12. HTTP Status Codes

Use standard status codes.

Common examples:

```text
200 OK
201 Created
204 No Content
400 Bad Request
401 Unauthorized
403 Forbidden
404 Not Found
409 Conflict
422 Unprocessable Entity where appropriate
429 Too Many Requests
500 Internal Server Error
502/503 External service failure where appropriate
```

The exact mapping must remain consistent across the API.

---

# 13. Validation Errors

Validation errors should identify relevant fields.

Example:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "One or more fields are invalid.",
    "details": {
      "quantity": [
        "Quantity must be greater than zero."
      ]
    }
  }
}
```

---

# 14. Pagination

All potentially large collection endpoints must be paginated.

Examples:

```text
/products/
/categories/
/collections/
/orders/
/inventory/
/customers/
```

The API must never return an unbounded production collection.

---

# 15. Pagination Parameters

The initial convention may use:

```text
?page=1&page_size=24
```

The exact maximum page size must be enforced server-side.

Example:

```text
page_size=1000
```

must not be allowed simply because the client requested it.

---

# 16. Filtering

Filtering must use explicitly supported fields.

Example:

```text
/products/?category=kurti
/products/?collection=new-arrivals
/products/?min_price=1000&max_price=3000
```

The API must not expose arbitrary ORM field lookup through query parameters.

---

# 17. Sorting

Sorting must be restricted to approved fields.

Examples:

```text
?sort=-created_at
?sort=price
?sort=-price
```

The backend must validate requested sort fields.

---

# 18. Search

Catalog search should initially use PostgreSQL-backed search capabilities where sufficient.

Example:

```text
/products/?search=anarkali
```

Search behavior should remain consistent and documented.

A dedicated search engine can be introduced later if requirements justify it.

---

# 19. Catalog API

## 19.1 Product List

```http
GET /api/v1/products/
```

Purpose:

Return storefront-visible products.

Possible filters:

```text
category
collection
search
price range
availability
color
size
```

Only supported filters should be accepted.

---

# 20. Product Detail

```http
GET /api/v1/products/{id}/
```

Returns:

- Product information.
- Variants.
- Media.
- Category information.
- Collection information where appropriate.
- Retail price for eligible retail context.
- Wholesale pricing only for authorized wholesale users.
- Availability information appropriate for storefront display.

Sensitive internal information must not be exposed.

---

# 21. Category List

```http
GET /api/v1/categories/
```

Purpose:

Return active storefront categories.

---

# 22. Category Detail

```http
GET /api/v1/categories/{id}/
```

Purpose:

Return category metadata and relevant storefront information.

---

# 23. Collection List

```http
GET /api/v1/collections/
```

Purpose:

Return active merchandising collections.

Examples:

```text
New Arrivals
Bestsellers
Festive Collection
```

---

# 24. Collection Detail

```http
GET /api/v1/collections/{id}/
```

The response may include:

- Collection metadata.
- Ordered products.
- Pagination.

---

# 25. Media API

Media management is primarily an administrative capability.

Customer-facing product APIs should expose only safe media metadata and public URLs/references.

Storage credentials must never be exposed.

---

# 26. Account API

## 26.1 Current User

```http
GET /api/v1/me/
```

Returns the authenticated application's user/profile information.

---

# 27. Update Profile

```http
PATCH /api/v1/me/
```

Allows the authenticated customer to update permitted profile fields.

The API must use an allowlist of mutable fields.

---

# 28. Address List

```http
GET /api/v1/me/addresses/
```

Returns the authenticated customer's saved addresses.

---

# 29. Create Address

```http
POST /api/v1/me/addresses/
```

Creates a customer address.

The address must be validated server-side.

---

# 30. Update Address

```http
PATCH /api/v1/me/addresses/{id}/
```

The customer may modify only their own address.

---

# 31. Delete Address

```http
DELETE /api/v1/me/addresses/{id}/
```

Deletion must not modify historical order address snapshots.

---

# 32. Cart API

## 32.1 Get Current Cart

```http
GET /api/v1/cart/
```

Returns the current active cart.

---

# 33. Add Cart Item

```http
POST /api/v1/cart/items/
```

Example request:

```json
{
  "variant_id": "variant-id",
  "quantity": 2
}
```

The backend determines:

- Product validity.
- Variant availability.
- Price.
- Customer eligibility.
- Quantity rules.

---

# 34. Update Cart Item

```http
PATCH /api/v1/cart/items/{id}/
```

Example:

```json
{
  "quantity": 3
}
```

The backend revalidates inventory and business rules.

---

# 35. Remove Cart Item

```http
DELETE /api/v1/cart/items/{id}/
```

---

# 36. Cart Totals

Cart totals must be calculated by the backend.

The client must never submit:

```text
subtotal
discount
tax
shipping
grand_total
```

as authoritative values.

---

# 37. Cart Merge

If guest carts are supported:

```http
POST /api/v1/cart/merge/
```

The operation combines guest and authenticated cart state according to documented rules.

It must safely handle:

- Duplicate variants.
- Quantity limits.
- Out-of-stock items.
- Price changes.

---

# 38. Checkout API

Checkout should not expose a single uncontrolled endpoint that accepts the entire order state from the browser.

The backend should orchestrate:

```text
Cart
 ↓
Validation
 ↓
Pricing
 ↓
Promotion
 ↓
Inventory
 ↓
Shipping
 ↓
Payment
 ↓
Order
```

---

# 39. Checkout Preview

A preview endpoint may be provided:

```http
POST /api/v1/checkout/preview/
```

Purpose:

Calculate current expected checkout totals before final submission.

The response is informational and does not itself guarantee inventory or payment completion.

---

# 40. Checkout Create/Confirm

The exact endpoint contract will be finalized during payment architecture.

A conceptual operation may be:

```http
POST /api/v1/checkout/
```

It should:

1. Authenticate the customer where required.
2. Validate cart.
3. Recalculate prices.
4. Validate promotions.
5. Validate inventory.
6. Calculate shipping/tax where applicable.
7. Create the required payment attempt.
8. Create/finalize the order according to the payment workflow.
9. Return the next required client action.

The exact transaction boundaries depend on the selected payment provider.

---

# 41. Idempotency

Critical checkout/payment requests should support:

```http
Idempotency-Key: <unique-request-key>
```

The backend must prevent accidental duplicate business operations.

Examples:

```text
Double click
Network retry
Browser retry
Mobile reconnect
Agent/client retry
```

must not create duplicate orders or charges.

---

# 42. Order API

## 42.1 List Customer Orders

```http
GET /api/v1/orders/
```

Returns only orders the authenticated customer is authorized to view.

---

# 43. Order Detail

```http
GET /api/v1/orders/{id}/
```

Returns:

- Order number.
- Items.
- Historical pricing.
- Totals.
- Payment status appropriate for the customer.
- Shipment information.
- Order status.
- Relevant timestamps.

Sensitive internal information must remain hidden.

---

# 44. Cancel Order

If cancellation is allowed:

```http
POST /api/v1/orders/{id}/cancel/
```

The backend validates whether cancellation is allowed based on order state and business rules.

---

# 45. Payment API

Payment endpoints must be designed around the selected provider.

The API should never trust:

```text
payment_success=true
```

from the frontend.

Provider verification/webhooks determine authoritative payment state.

---

# 46. Payment Status

Customer-facing APIs may expose safe payment status such as:

```text
PENDING
PAID
FAILED
PARTIALLY_REFUNDED
REFUNDED
```

Internal provider data should not be exposed unnecessarily.

---

# 47. Payment Webhook

Webhook endpoint:

```http
POST /api/v1/webhooks/payments/{provider}/
```

This endpoint is called by the payment provider rather than the storefront.

Requirements:

- Verify provider signature.
- Validate payload.
- Check event identity.
- Enforce idempotency.
- Update payment state safely.
- Record event.
- Return appropriate provider response.

---

# 48. Shipping API

Customer-facing shipping information is generally returned through order endpoints.

Operational endpoints may include:

```text
Shipment list
Shipment detail
Tracking information
```

Provider callbacks/webhooks should be isolated from public customer endpoints.

---

# 49. Wholesale API

## 49.1 Wholesale Status

```http
GET /api/v1/wholesale/status/
```

Returns the authenticated customer's wholesale status.

Possible states:

```text
NOT_APPLIED
PENDING
UNDER_REVIEW
APPROVED
REJECTED
SUSPENDED
```

---

# 50. Wholesale Application

```http
POST /api/v1/wholesale/applications/
```

Creates a wholesale application.

The server validates all required business information.

---

# 51. Wholesale Application Detail

```http
GET /api/v1/wholesale/applications/{id}/
```

Customers may view only their own application unless staff permissions apply.

---

# 52. Wholesale Pricing

Wholesale pricing should not require a separate catalog API.

The same product API can return context-appropriate pricing after authorization.

Conceptually:

```text
GET /products/{id}/
       |
       ├── Retail user → Retail price
       └── Approved wholesale user → Wholesale price
```

The backend determines the pricing context.

---

# 53. Admin/Staff API

Internal operations require separate authorization.

Potential domains:

```text
Catalog
Inventory
Orders
Customers
Wholesale
Promotions
CMS
Reports
```

Staff APIs must not rely on the storefront's customer permissions.

---

# 54. Admin Product APIs

Potential endpoints:

```http
GET    /api/v1/admin/products/
POST   /api/v1/admin/products/
GET    /api/v1/admin/products/{id}/
PATCH  /api/v1/admin/products/{id}/
```

The exact admin API surface may be reduced if Django Admin is sufficient.

Do not build custom admin endpoints unnecessarily.

---

# 55. Admin Inventory APIs

Potential capabilities:

```text
View inventory
Adjust inventory
View movements
View reservations
```

Inventory adjustment should be an explicit operation rather than a generic field update.

Conceptually:

```http
POST /api/v1/admin/inventory/{variant_id}/adjust/
```

---

# 56. Admin Order APIs

Potential operations:

```text
List orders
View order
Update allowed operational state
Cancel
Refund
Shipment management
```

Every state-changing action must enforce business rules.

---

# 57. Admin Wholesale APIs

Potential operations:

```text
List applications
View application
Approve
Reject
Suspend
```

Approval should be an explicit action.

Example:

```http
POST /api/v1/admin/wholesale/applications/{id}/approve/
```

---

# 58. CMS API

Customer-facing CMS data may use:

```http
GET /api/v1/cms/homepage/
```

Admin CMS management may use protected endpoints or Django Admin.

The implementation should choose the simplest maintainable approach.

---

# 59. Homepage API

The homepage API may return structured sections such as:

```json
{
  "data": {
    "sections": [
      {
        "type": "collection",
        "title": "New Arrivals",
        "items": []
      }
    ]
  }
}
```

The frontend should render supported section types rather than assuming a permanently fixed layout.

---

# 60. Health API

A minimal health endpoint should exist:

```http
GET /health/
```

It may be unauthenticated.

It should provide enough information for infrastructure health checks without exposing secrets or sensitive infrastructure details.

---

# 61. Readiness API

A separate readiness check may be used:

```http
GET /ready/
```

It may verify required dependencies such as database connectivity.

The response should not expose connection strings or credentials.

---

# 62. Request IDs

Requests should have traceable identifiers.

Conceptually:

```text
Request
  |
X-Request-ID
  |
Django
  |
Logs
  |
External operations
```

This helps investigate production problems.

---

# 63. API Rate Limiting

Rate limiting should protect:

- Authentication-adjacent operations.
- Checkout.
- Payment initiation.
- Coupon validation.
- Wholesale applications.
- Public search if abused.

Limits should be tuned based on real traffic.

---

# 64. API Security

The API must:

- Validate all input.
- Authenticate protected requests.
- Authorize every protected resource.
- Avoid leaking internal errors.
- Avoid exposing secrets.
- Validate webhook signatures.
- Enforce ownership.
- Use secure transport in production.
- Apply appropriate CORS policy.

---

# 65. Object-Level Security

A common rule:

```text
Authenticated ≠ Authorized
```

For every resource, ask:

```text
Who owns it?
Who can view it?
Who can modify it?
Who can delete it?
Who can transition its state?
```

---

# 66. API Business Rule Ownership

The API should delegate business logic to services.

Preferred:

```text
View
 ↓
Serializer
 ↓
Service
 ↓
Domain
```

Avoid:

```text
View
 ├── Pricing logic
 ├── Inventory logic
 ├── Payment logic
 └── Order logic
```

---

# 67. API and Database Separation

API response structures must not simply mirror database tables.

For example, an order response may combine:

```text
Order
OrderItems
Payment state
Shipment state
Product snapshots
```

into a customer-friendly representation.

Database implementation remains an internal concern.

---

# 68. API DTO/Serializer Design

Use serializers as API contracts.

A serializer should explicitly define what the client receives.

Never expose an entire model automatically simply because it is convenient.

Sensitive fields must be intentionally excluded.

---

# 69. Public vs Private Product Fields

Public product API may expose:

```text
Name
Description
Images
Variants
Available options
Retail price
Public availability
Category
Collection
```

It should not expose internal information such as:

```text
Supplier cost
Internal margin
Private notes
Internal inventory mechanisms
Administrative metadata
Wholesale price to retail users
```

---

# 70. Wholesale Product Fields

Approved wholesale users may receive wholesale-specific data where authorized.

The response must still exclude internal operational information that the wholesale customer does not need.

---

# 71. API Caching

Public read endpoints may be cacheable where safe.

Potential candidates:

```text
Categories
Collections
Homepage
Public product data
```

Do not cache personalized/private responses without carefully designed cache keys.

---

# 72. API Documentation

Every endpoint must eventually have OpenAPI documentation covering:

```text
Method
Path
Authentication
Permissions
Parameters
Request body
Response
Errors
Examples
```

---

# 73. API Testing

API tests should cover:

### Public access

```text
Can public user browse catalog?
```

### Authentication

```text
Does protected endpoint reject unauthenticated request?
```

### Authorization

```text
Can user A access user B's order?
```

### Business rules

```text
Can an unavailable variant be purchased?
```

### Financial integrity

```text
Can the client manipulate order totals?
```

### Idempotency

```text
Does retry create a duplicate order?
```

---

# 74. API Contract Testing

Critical frontend/backend contracts should be tested.

Changes to API response structures should be deliberate.

The frontend should not depend on undocumented fields.

---

# 75. Backward Compatibility

Non-breaking changes may include:

- Adding optional response fields.
- Adding new endpoints.
- Adding optional request fields.

Breaking changes include:

- Removing fields.
- Changing field meaning.
- Changing types.
- Changing required request fields.
- Changing semantics.

Breaking changes require versioning or a migration strategy.

---

# 76. API Development Workflow

A new endpoint should follow:

```text
Requirement
    ↓
Domain owner
    ↓
API contract
    ↓
Authentication/permission design
    ↓
Serializer
    ↓
Service
    ↓
View
    ↓
Tests
    ↓
OpenAPI documentation
```

---

# 77. AI Agent API Rules

The agent must not create an endpoint merely because a database table exists.

First determine:

1. What business capability is needed?
2. Who consumes it?
3. Is it public or private?
4. What permission is required?
5. What business service owns the operation?
6. What data is safe to expose?
7. Is the operation idempotent?
8. What errors can occur?

---

# 78. API Anti-Patterns

Avoid:

```text
/api/doEverything/
```

Avoid exposing:

```text
/models/<table-name>/
```

as the public API architecture.

Avoid allowing clients to submit authoritative:

```text
price
discount
tax
inventory
payment status
order status
```

Avoid generic unrestricted PATCH endpoints for critical entities.

---

# 79. API Definition of Done

An API feature is complete when:

- Endpoint path is documented.
- Authentication is defined.
- Permissions are defined.
- Request schema is defined.
- Response schema is defined.
- Validation is implemented.
- Business logic uses appropriate services.
- Errors are consistent.
- Tests pass.
- OpenAPI documentation is updated.
- Sensitive fields are excluded.
- Idempotency is implemented where required.

---

# 80. Initial API Surface

The initial API architecture is approximately:

```text
/api/v1/
│
├── me/
│   └── addresses/
│
├── products/
├── categories/
├── collections/
│
├── cart/
│   └── items/
│
├── checkout/
│
├── orders/
│
├── wholesale/
│   ├── status/
│   └── applications/
│
├── cms/
│   └── homepage/
│
└── webhooks/
    └── payments/
```

Administrative APIs are introduced only where required.

---

# 81. Final API Architecture

```text
                     Next.js
                        |
                 HTTPS / JSON
                        |
                  /api/v1/
                        |
             Django REST Framework
                        |
          ┌─────────────┴─────────────┐
          |                           |
      Authentication              Permissions
          |                           |
          └─────────────┬─────────────┘
                        |
                  API Serializers
                        |
                 Application Services
                        |
                 Domain Applications
                        |
                    Django ORM
                        |
                    PostgreSQL
```

This API architecture becomes the contract for the frontend implementation.

---

# 82. Next Document

The next document is:

```text
08-authentication-authorization.md
```

It will define the security model in detail:

- Supabase Auth integration.
- Token verification.
- User synchronization.
- Session handling.
- Retail customer authorization.
- Wholesale authorization.
- Staff/admin authorization.
- Object-level permissions.
- Service-role security.
- CORS/CSRF.
- Account lifecycle.
- Security failure handling.
