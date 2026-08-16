# Closet by Chilli — Backend Architecture

## 1. Purpose

This document defines the implementation architecture and coding conventions for the Django backend of Closet by Chilli.

The backend is a production-grade modular monolith built with:

- Python
- Django
- Django REST Framework
- PostgreSQL
- Supabase infrastructure
- Redis
- Celery

The backend is responsible for all authoritative business logic.

---

# 2. Backend Responsibilities

The backend owns:

- Authentication integration.
- Authorization.
- Product data.
- Product variants.
- Categories.
- Collections.
- Inventory.
- Pricing.
- Promotions.
- Cart state.
- Checkout.
- Orders.
- Payments.
- Shipping.
- Wholesale rules.
- CMS data.
- Notifications.
- Audit records.
- Financial calculations.
- Data integrity.

The frontend is a consumer of these capabilities.

---

# 3. Architectural Style

The backend follows a **modular monolith** architecture.

```text
                    Django Backend
                          |
        ┌─────────────────┼─────────────────┐
        │                 │                 │
      Catalog           Commerce          Accounts
        │                 │                 │
        └─────────────────┼─────────────────┘
                          |
                     PostgreSQL
```

The application remains one deployable service while maintaining clear internal domain boundaries.

---

# 4. Recommended Project Structure

The backend should follow a structure similar to:

```text
backend/
├── manage.py
│
├── config/
│   ├── __init__.py
│   ├── urls.py
│   ├── asgi.py
│   ├── wsgi.py
│   ├── celery.py
│   │
│   └── settings/
│       ├── __init__.py
│       ├── base.py
│       ├── development.py
│       ├── testing.py
│       └── production.py
│
├── apps/
│   ├── accounts/
│   ├── catalog/
│   ├── categories/
│   ├── collections/
│   ├── inventory/
│   ├── pricing/
│   ├── promotions/
│   ├── cart/
│   ├── checkout/
│   ├── orders/
│   ├── payments/
│   ├── shipping/
│   ├── wholesale/
│   ├── cms/
│   ├── media/
│   ├── notifications/
│   └── audit/
│
├── common/
│   ├── exceptions/
│   ├── pagination/
│   ├── permissions/
│   ├── utilities/
│   └── types/
│
├── infrastructure/
│   ├── payments/
│   ├── shipping/
│   ├── storage/
│   ├── email/
│   └── authentication/
│
└── tests/
```

The exact structure can evolve, but domain boundaries must remain explicit.

---

# 5. Django App Boundaries

Each Django app should represent a meaningful business capability.

## Accounts

Owns:

- Application user representation.
- Customer profile.
- Addresses.
- Roles.
- Account-related operations.

## Catalog

Owns:

- Products.
- Product variants.
- SKUs.
- Product options.
- Product attributes.
- Product media relationships.

## Categories

Owns:

- Category hierarchy.
- Category metadata.
- Product/category relationships.

## Collections

Owns:

- Collections.
- Product/collection relationships.
- Merchandising ordering.

## Inventory

Owns:

- Stock.
- Reservations.
- Inventory movements.
- Adjustments.
- Availability.

## Pricing

Owns:

- Base prices.
- Retail prices.
- Wholesale prices.
- Price rules.
- Price resolution.

## Promotions

Owns:

- Coupons.
- Promotion rules.
- Eligibility.
- Discount calculation.

## Cart

Owns:

- Carts.
- Cart items.
- Cart lifecycle.
- Guest carts.
- Cart merging.

## Checkout

Owns:

- Checkout orchestration.
- Validation sequence.
- Coordination of commerce services.

Checkout should orchestrate other domains rather than duplicate their rules.

## Orders

Owns:

- Orders.
- Order items.
- Order state.
- Order history.
- Cancellation/return workflows where applicable.

## Payments

Owns:

- Payment attempts.
- Payment state.
- Provider interactions.
- Webhooks.
- Refunds.

## Shipping

Owns:

- Shipping methods.
- Shipments.
- Tracking.
- Provider integration.

## Wholesale

Owns:

- Wholesale applications.
- Wholesale customer status.
- Wholesale business information.
- Wholesale eligibility.

## CMS

Owns:

- Homepage configuration.
- Banners.
- Content blocks.
- Merchandising content.

## Media

Owns:

- Media metadata.
- Storage references.
- Media relationships.

## Notifications

Owns:

- Notification templates.
- Notification events.
- Delivery jobs.

## Audit

Owns:

- Audit events.
- Actor information.
- Resource information.
- Event metadata.

---

# 6. Model Layer

Django models represent persistent domain entities.

Models should contain:

- Fields.
- Relationships.
- Database constraints.
- Simple domain invariants.
- Model-level behavior that is naturally tied to the entity.

Models should not become massive containers for unrelated business workflows.

Avoid putting large checkout, payment or fulfillment workflows inside model methods.

---

# 7. Database Constraints

Whenever a rule can safely be enforced at the database level, it should be considered for a database constraint.

Examples:

- Unique SKU.
- Unique slug.
- Unique order number.
- Positive quantity.
- Valid numeric ranges.
- Valid foreign-key relationships.

Application validation remains necessary, but database constraints provide an additional integrity boundary.

---

# 8. Service Layer

Complex business operations should use explicit service/application functions.

Examples:

```text
CreateOrderService
ReserveInventoryService
CalculateCartService
ResolvePriceService
ApplyPromotionService
ProcessPaymentService
ApproveWholesaleApplicationService
```

Services should represent meaningful business operations.

Avoid creating generic services such as:

```text
DataService
CommonService
UtilityService
BusinessService
```

without a specific responsibility.

---

# 9. Service Design

A service should generally:

1. Accept validated inputs.
2. Load required domain data.
3. Apply business rules.
4. Perform required state changes.
5. Return a meaningful result.
6. Raise known domain/application errors when appropriate.

Example:

```text
CheckoutService
    |
    ├── Validate cart
    ├── Resolve prices
    ├── Apply promotions
    ├── Validate inventory
    ├── Calculate shipping
    ├── Create payment attempt
    └── Create/finalize order
```

The service should not blindly trust values submitted by the client.

---

# 10. Query Logic

Complex read operations should be kept separate from write workflows.

For example:

```text
ProductQueryService
OrderQueryService
InventoryQueryService
CustomerQueryService
```

or appropriately named query functions.

The goal is to prevent views and serializers from containing complicated database logic.

Do not create a repository abstraction solely because repositories are common in other architectures.

Django ORM querysets are already a strong data-access abstraction.

A repository should only be introduced when it provides a real architectural benefit.

---

# 11. Serializers

DRF serializers are responsible for:

- Input validation.
- Output representation.
- API field selection.
- Basic transformation.

Serializers should not become the primary location for complex business logic.

Bad pattern:

```text
Serializer
    ├── Create order
    ├── Reserve stock
    ├── Charge payment
    └── Send email
```

Preferred:

```text
Serializer
    |
Validate request
    |
Checkout Service
    |
Business operations
```

---

# 12. API Views

API views should remain relatively thin.

A typical flow:

```text
Request
   |
Authentication
   |
Permission
   |
Serializer validation
   |
Application Service
   |
Response Serializer
   |
Response
```

Views should coordinate rather than contain large blocks of business logic.

---

# 13. URL Architecture

API routes should use:

```text
/api/v1/
```

Domain-oriented routing should be used.

Examples:

```text
/api/v1/products/
/api/v1/products/{id}/
/api/v1/categories/
/api/v1/cart/
/api/v1/cart/items/
/api/v1/checkout/
/api/v1/orders/
/api/v1/orders/{id}/
```

Avoid deeply nested URLs when they do not improve clarity.

---

# 14. API Versioning

The initial API version is:

```text
v1
```

Breaking changes should not silently alter existing API contracts.

When a future breaking change is required, introduce a new API version.

Example:

```text
/api/v1/
/api/v2/
```

API compatibility should be preserved for supported clients.

---

# 15. Authentication Flow

Authentication uses Supabase Auth.

Conceptually:

```text
Client
  |
  v
Supabase Auth
  |
  v
Access Token
  |
  v
Django API
  |
Token Verification
  |
Application User
```

The exact token validation implementation must use a trusted verification mechanism.

Never trust decoded client-provided token data without validating its authenticity.

---

# 16. User Mapping

The application should maintain an internal representation of the authenticated user.

Conceptually:

```text
Supabase Identity
        |
        v
Application User
        |
        ├── Profile
        ├── Addresses
        ├── Orders
        └── Wholesale Status
```

The Supabase identity is the authentication identity.

The Django application user is the commerce identity.

---

# 17. Authorization

Every protected endpoint must explicitly define authorization requirements.

Examples:

```text
Public
Customer
Wholesale Customer
Staff
Administrator
```

Object-level ownership must also be enforced.

For example:

A customer requesting:

```text
GET /api/v1/orders/123/
```

must only receive order 123 if that order belongs to the authenticated customer or the user has appropriate staff permission.

---

# 18. Permissions

Permissions should be explicit.

Examples:

```text
CanViewOwnOrder
CanManageCatalog
CanManageInventory
CanManageOrders
CanApproveWholesale
CanManagePromotions
CanManageCMS
CanProcessRefund
```

Avoid relying on frontend route hiding as authorization.

---

# 19. Error Handling

The API should return consistent errors.

A conceptual response:

```json
{
  "error": {
    "code": "INSUFFICIENT_INVENTORY",
    "message": "The selected quantity is no longer available.",
    "details": {}
  }
}
```

Error codes should be stable enough for the frontend to handle known conditions.

Do not expose internal stack traces or implementation details to clients.

---

# 20. Exception Strategy

Use categories such as:

```text
Validation Error
Authentication Error
Authorization Error
Not Found
Conflict
Business Rule Error
External Provider Error
Internal Server Error
```

Business errors should have meaningful machine-readable codes.

Unexpected exceptions should be logged and converted into safe API responses.

---

# 21. Transaction Management

Critical state changes should use database transactions.

Examples:

```text
Order creation
Inventory reservation
Inventory adjustment
Refund state changes
Wholesale approval
```

Example:

```python
transaction.atomic()
```

Transactions should remain appropriately scoped.

Do not hold database transactions open while performing slow external network calls unless there is a strong reason.

---

# 22. Concurrency

Commerce operations must account for concurrent requests.

Especially:

- Inventory.
- Cart checkout.
- Coupon usage.
- Order creation.
- Payment callbacks.

Use appropriate PostgreSQL transaction isolation, row locking or atomic update strategies where required.

The exact strategy will be defined in the inventory and commerce documents.

---

# 23. Idempotency

Critical operations should support idempotency where duplicate requests could cause harm.

Examples:

- Payment initiation.
- Payment webhook handling.
- Order finalization.
- Refund requests.
- Inventory operations.

A retry must not accidentally:

```text
Charge customer twice
Create two orders
Refund twice
Deduct inventory twice
```

---

# 24. Payment Webhooks

Payment provider webhooks are treated as external input.

Processing should follow:

```text
Webhook
   |
Verify signature
   |
Validate payload
   |
Check event identity
   |
Check idempotency
   |
Apply state transition
   |
Record event
```

Never update payment status solely because the frontend says payment succeeded.

---

# 25. External Integrations

External providers should be isolated under:

```text
infrastructure/
```

Potential integrations:

```text
infrastructure/
├── payments/
├── shipping/
├── storage/
├── email/
└── authentication/
```

Domain logic should depend on application interfaces rather than provider-specific implementation details where practical.

---

# 26. Payment Adapter

Conceptually:

```text
PaymentService
      |
PaymentProviderInterface
      |
      ├── Provider A
      └── Provider B
```

The domain should not contain provider-specific API calls.

---

# 27. Shipping Adapter

Conceptually:

```text
ShippingService
      |
ShippingProviderInterface
      |
      ├── Courier A
      └── Courier B
```

Provider-specific request/response mapping should remain inside adapters.

---

# 28. Background Tasks

Celery tasks should be thin orchestration wrappers around application services.

Preferred:

```text
Celery Task
    |
Application Service
```

Avoid placing large business workflows directly inside Celery task functions.

Tasks should support:

- Retries where appropriate.
- Idempotency.
- Logging.
- Failure handling.

---

# 29. Notifications

Notifications should generally be asynchronous.

Example:

```text
Order Created
     |
     v
Notification Event
     |
     v
Celery
     |
     v
Email Provider
```

Order creation should not fail simply because an email provider is temporarily unavailable.

---

# 30. Logging

Use structured logs.

Logs should contain useful context such as:

```text
timestamp
level
request_id
event
user_id where appropriate
resource_id where appropriate
```

Do not log:

- Passwords.
- Authentication secrets.
- Payment secrets.
- Full access tokens.
- Unnecessary personal information.

---

# 31. Audit Logging

Important business events should create audit records.

Examples:

```text
PRODUCT_UPDATED
PRICE_CHANGED
INVENTORY_ADJUSTED
WHOLESALE_APPROVED
ORDER_STATUS_CHANGED
REFUND_CREATED
PROMOTION_UPDATED
```

Audit records should include:

- Actor.
- Action.
- Resource.
- Timestamp.
- Relevant metadata.

---

# 32. Django Admin

Django Admin should be used as an internal operational tool.

It can support:

- Catalog administration.
- Inventory operations.
- Order review.
- Customer management.
- Wholesale approvals.
- CMS management.

Admin access must be protected and restricted.

Django Admin is not a replacement for the customer storefront.

---

# 33. Configuration

Configuration must be environment-driven.

Never hard-code:

- API keys.
- Database passwords.
- Provider secrets.
- Production credentials.

Use environment variables and secure secret management.

---

# 34. Settings Structure

Recommended structure:

```text
config/settings/
├── base.py
├── development.py
├── testing.py
└── production.py
```

Shared configuration belongs in `base.py`.

Environment-specific configuration belongs in its corresponding settings module.

---

# 35. Security Middleware

Production configuration should include appropriate Django security controls, including:

- Secure cookies.
- HTTPS enforcement.
- HSTS where appropriate.
- CSRF protection where applicable.
- Secure headers.
- Allowed host configuration.
- CORS restrictions.
- Appropriate session configuration.

Security configuration must be environment-specific where necessary.

---

# 36. CORS

The API should allow only approved frontend origins.

Development origins may differ from production.

Never use unrestricted CORS in production merely to make development easier.

---

# 37. Rate Limiting

Rate limiting should protect sensitive or abuse-prone endpoints.

Potential targets:

- Authentication-related endpoints.
- Password/account operations.
- Checkout.
- Coupon validation.
- Wholesale applications.
- Payment initiation.
- Public search endpoints if abuse occurs.

The exact implementation should be selected during security implementation.

---

# 38. Input Validation

Every API input must be validated server-side.

Validate:

- Types.
- Required fields.
- Length.
- Formats.
- Ranges.
- Relationships.
- Business rules.

Do not assume browser-side validation is sufficient.

---

# 39. Financial Data

Financial values must use precise decimal arithmetic.

Do not use floating-point arithmetic for:

- Prices.
- Discounts.
- Taxes.
- Payments.
- Refunds.

The database and backend should use appropriate decimal/numeric types.

---

# 40. Time and Dates

Use timezone-aware datetimes.

The backend should use a consistent canonical timezone strategy.

Customer-facing dates should be formatted appropriately for the user.

Business timestamps should remain unambiguous in stored records.

---

# 41. Money Representation

Money should be represented using:

```text
Decimal / PostgreSQL NUMERIC
```

where appropriate.

Never trust a client-submitted:

```text
total
subtotal
discount
tax
shipping cost
```

The backend recalculates authoritative values.

---

# 42. Pagination

List endpoints should use consistent pagination.

Examples:

```text
Products
Orders
Customers
Inventory movements
Wholesale applications
```

Pagination must be handled server-side.

Avoid returning unbounded collections.

---

# 43. Filtering and Sorting

Filtering and sorting must be:

- Validated.
- Explicit.
- Efficient.
- Indexed where needed.

Do not allow arbitrary database field access through unsanitized query parameters.

---

# 44. Search

The initial product search should use PostgreSQL capabilities where sufficient.

The system should avoid introducing a dedicated search engine until actual requirements justify it.

If search complexity grows substantially, a dedicated search service can be evaluated later.

---

# 45. API Response Design

Responses should be consistent.

For example:

```json
{
  "data": {},
  "meta": {}
}
```

or another documented project-wide convention.

The project must select one consistent response style rather than allowing every endpoint to invent its own format.

---

# 46. API Documentation

Every public API endpoint should be documented.

Documentation should describe:

- HTTP method.
- URL.
- Authentication requirement.
- Request schema.
- Response schema.
- Errors.
- Permissions.
- Pagination/filtering behavior.

---

# 47. Testing Architecture

Backend testing should occur at multiple levels.

```text
Unit
  ↓
Service / Domain
  ↓
API / Integration
  ↓
End-to-End
```

Tests should focus especially on business-critical behavior.

---

# 48. Test Database

Automated backend tests must run against an isolated test database.

Production data must never be modified by tests.

Tests should be deterministic and independently repeatable.

---

# 49. Factory/Test Data

Use controlled test factories/fixtures for:

- Users.
- Products.
- Variants.
- Inventory.
- Carts.
- Orders.
- Payments.
- Wholesale customers.

Test data should represent realistic business scenarios without using real customer information.

---

# 50. Performance

Backend performance priorities include:

- Query efficiency.
- Avoiding N+1 queries.
- Correct indexing.
- Pagination.
- Efficient serialization.
- Appropriate caching.
- Background processing.

Database query count should be tested for critical endpoints where appropriate.

---

# 51. N+1 Prevention

For related data, use appropriate ORM techniques such as:

```text
select_related()
prefetch_related()
```

where justified.

The agent should inspect query behavior for high-traffic catalog and order endpoints.

---

# 52. Database Access Rules

Application code should prefer:

```text
Django ORM
```

over:

```text
Raw SQL
```

Raw SQL requires explicit justification.

The project must not create multiple competing data-access patterns without reason.

---

# 53. Business Logic Ownership

A useful rule:

```text
Database
    → Data integrity

Model
    → Entity behavior

Service
    → Business operation

Serializer
    → API validation/representation

View
    → HTTP coordination

Task
    → Asynchronous execution

Adapter
    → External provider integration
```

This separation should guide implementation.

---

# 54. Dependency Direction

A simplified dependency direction:

```text
API
 ↓
Application Services
 ↓
Domain Models / ORM
 ↓
Database
```

External integrations should be isolated:

```text
Application Service
        ↓
Integration Interface
        ↓
Provider Adapter
        ↓
External Service
```

Avoid allowing provider SDKs to leak throughout the domain.

---

# 55. Circular Dependencies

Django apps should avoid circular imports.

When two domains need to interact:

- Use service boundaries.
- Use carefully designed relationships.
- Use late imports only where justified.
- Refactor shared concepts into appropriate modules.

Do not solve architectural coupling with uncontrolled imports.

---

# 56. Naming Conventions

Use clear domain language.

Examples:

```text
WholesaleApplication
WholesaleCustomer
InventoryReservation
InventoryMovement
PaymentAttempt
Shipment
OrderItem
ProductVariant
```

Avoid vague names such as:

```text
Thing
Data
ItemData
ManagerService
Helper
```

unless the meaning is genuinely generic.

---

# 57. API Naming

Use resource-oriented names.

Prefer:

```text
/orders/
/products/
/categories/
```

over action-heavy routes.

Actions that represent real state transitions may use explicit action endpoints when appropriate.

Example:

```text
/orders/{id}/cancel/
/orders/{id}/refund/
```

These should map to explicit business operations.

---

# 58. State Machines

Important lifecycle states should be explicit.

Examples:

```text
Order
Payment
Shipment
Wholesale Application
Product
Inventory Reservation
```

Transitions must be validated.

Do not allow arbitrary state mutation from generic update endpoints.

---

# 59. Critical State Transitions

Critical transitions should use explicit service methods.

For example:

```text
Order.cancel()
```

or an application service such as:

```text
CancelOrderService
```

rather than:

```text
PATCH /orders/123/
{
  "status": "cancelled"
}
```

unless the API explicitly validates that transition.

---

# 60. Caching Rules

Cache only data that is safe to cache.

Good candidates:

- Public catalog responses.
- CMS content.
- Collection listings.

Avoid blindly caching:

- Customer account data.
- Payment state.
- Inventory state.
- Order state.

Cache invalidation must be considered whenever mutable data is cached.

---

# 61. Celery Rules

A Celery task should not silently change critical state without appropriate transaction and idempotency controls.

For example:

```text
ProcessPaymentWebhookTask
```

must verify event identity and prevent duplicate processing.

---

# 62. API Security Rules

Every endpoint must answer:

1. Is it public?
2. Who can call it?
3. What objects can they access?
4. What fields can they modify?
5. What business rules apply?
6. Can the request be replayed safely?

These questions must be documented for sensitive endpoints.

---

# 63. Backend Development Workflow

A typical backend feature should follow:

```text
Requirement
    ↓
Domain design
    ↓
Database/model change
    ↓
Service logic
    ↓
API contract
    ↓
Permissions
    ↓
Tests
    ↓
Documentation
    ↓
Integration verification
```

AI agents should not jump directly from a vague requirement to implementation.

---

# 64. AI Agent Rules

Before modifying backend code, the agent should read:

```text
00-project-overview.md
01-product-requirements.md
02-architecture.md
03-tech-stack.md
04-backend-architecture.md
```

and any domain-specific documentation relevant to the task.

The agent must:

- Preserve existing architecture.
- Avoid unnecessary dependencies.
- Write tests.
- Avoid speculative features.
- Update documentation when architecture changes.
- Never expose secrets.
- Never bypass authorization.
- Never trust client financial values.

---

# 65. Backend Definition of Done

A backend feature is not complete until:

- Models are correct.
- Database constraints are correct.
- Business logic is implemented.
- API behavior is implemented.
- Permissions are enforced.
- Error handling is consistent.
- Tests pass.
- Important edge cases are tested.
- Documentation is updated.
- Linting passes.
- Type checks pass where applicable.
- No secrets are introduced.
- The feature works with the frontend contract.

---

# 66. Backend Architecture Summary

The final backend architecture is:

```text
                 Next.js Frontend
                        |
                    REST API
                        |
             Django REST Framework
                        |
                API / Permissions
                        |
             Application Services
                        |
          ┌─────────────┴─────────────┐
          │                           │
       Domain Apps              Infrastructure
          │                           │
          └─────────────┬─────────────┘
                        |
                   Django ORM
                        |
                PostgreSQL/Supabase
```

Asynchronous operations:

```text
Django
  |
Redis
  |
Celery
  |
External Providers / Background Work
```

This architecture is the foundation for the detailed database, domain, API, security and commerce specifications.
