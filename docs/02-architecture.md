# Closet by Chilli — System Architecture

## 1. Purpose

This document defines the high-level technical architecture for the Closet by Chilli production e-commerce platform.

The architecture is designed for:

- Retail commerce.
- Wholesale commerce.
- Secure customer accounts.
- Catalog management.
- Inventory management.
- Pricing and promotions.
- Orders, payments and shipping.
- CMS-driven storefront content.
- Administrative operations.
- Future scalability.

The initial architecture is a **modular monolith**, not a microservices architecture.

---

## 2. Architecture Principles

The system must follow these principles:

1. Keep the architecture understandable.
2. Separate business domains clearly.
3. Keep business rules on the backend.
4. Treat the database as a critical source of data integrity.
5. Do not trust frontend calculations for financial or inventory decisions.
6. Prefer transactional correctness for commerce operations.
7. Use asynchronous processing where synchronous processing is unnecessary.
8. Keep external providers behind adapters/services.
9. Avoid premature microservices.
10. Make the architecture reproducible for both human developers and AI coding agents.

---

## 3. High-Level Architecture

```text
                         CLOSET BY CHILLI
                                |
                    ┌───────────┴───────────┐
                    │                       │
              Customer Storefront      Administration
                    │                       │
                    └───────────┬───────────┘
                                │
                           HTTPS / REST
                                │
                                ▼
                     ┌─────────────────────┐
                     │      Django        │
                     │   Django REST API  │
                     └──────────┬──────────┘
                                │
                    ┌───────────┴───────────┐
                    │                       │
              Domain/Application       Infrastructure
                  Services                 Services
                    │                       │
                    └───────────┬───────────┘
                                │
                         Django ORM
                                │
                                ▼
                     ┌─────────────────────┐
                     │ PostgreSQL /        │
                     │ Supabase Database   │
                     └─────────────────────┘

External infrastructure:

Supabase Auth
Supabase Storage
Redis
Celery Workers
Payment Provider
Shipping Provider
Email/Notification Provider
```

---

## 4. Frontend Architecture

The storefront frontend will use:

- Next.js
- React
- TypeScript
- Tailwind CSS

The frontend is responsible for:

- User interface.
- Navigation.
- Product presentation.
- Forms.
- Client-side interaction.
- Local UI state.
- User experience.
- Calling backend APIs.

The frontend is **not authoritative** for:

- Product availability.
- Pricing.
- Discounts.
- Inventory.
- Wholesale eligibility.
- Order status.
- Payment status.
- Authorization.

---

## 5. Backend Architecture

The backend will use:

- Python
- Django
- Django REST Framework

The backend will be implemented as a modular monolith.

Conceptually:

```text
Django Project
│
├── Accounts
├── Catalog
├── Categories
├── Collections
├── Inventory
├── Pricing
├── Promotions
├── Cart
├── Checkout
├── Orders
├── Payments
├── Shipping
├── Wholesale
├── CMS
├── Media
└── Notifications
```

Each domain should have clear ownership of its data and business rules.

---

## 6. Modular Monolith

A modular monolith means:

- One deployable backend application.
- One primary database.
- Clear internal domain boundaries.
- Independent modules.
- Explicit service boundaries.
- No unnecessary network calls between internal modules.

Example:

```text
                    Django
                      |
        ┌─────────────┼─────────────┐
        │             │             │
     Catalog       Orders       Wholesale
        │             │             │
        └─────────────┼─────────────┘
                      │
                 PostgreSQL
```

The system should not be split into microservices merely because the business may eventually scale.

---

## 7. Recommended Backend App Structure

A logical structure should resemble:

```text
backend/
├── manage.py
├── config/
│   ├── settings/
│   ├── urls.py
│   ├── asgi.py
│   └── celery.py
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
│   └── notifications/
│
├── common/
├── infrastructure/
└── tests/
```

The exact package structure may evolve as implementation progresses, but domain boundaries must remain clear.

---

## 8. Django App Responsibilities

### Accounts

Responsible for:

- Application users.
- Profiles.
- Addresses.
- Roles.
- Customer account behavior.

### Catalog

Responsible for:

- Products.
- Product variants.
- SKUs.
- Product attributes.
- Product options.
- Product media relationships.

### Categories

Responsible for:

- Product taxonomy.
- Category hierarchy.
- Category metadata.

### Collections

Responsible for:

- Merchandising collections.
- Product-to-collection relationships.
- Collection ordering.

### Inventory

Responsible for:

- Stock.
- Reservations.
- Inventory movements.
- Adjustments.
- Availability.

### Pricing

Responsible for:

- Base prices.
- Retail prices.
- Wholesale prices.
- Quantity-based pricing.
- Price resolution.

### Promotions

Responsible for:

- Promotions.
- Coupons.
- Eligibility.
- Discount calculation.

### Cart

Responsible for:

- Carts.
- Cart items.
- Cart lifecycle.
- Cart merging.

### Checkout

Responsible for:

- Checkout orchestration.
- Validation.
- Coordination between domains.
- Order creation initiation.

Checkout should not become the owner of every business rule.

### Orders

Responsible for:

- Orders.
- Order items.
- Order state.
- Historical order information.
- Cancellation/return workflows where applicable.

### Payments

Responsible for:

- Payment attempts.
- Payment state.
- Provider communication.
- Payment verification.
- Refunds.

### Shipping

Responsible for:

- Shipping methods.
- Shipments.
- Tracking.
- Shipping provider integrations.

### Wholesale

Responsible for:

- Wholesale applications.
- Wholesale businesses.
- Approval.
- Wholesale customer status.
- Wholesale-specific business rules.

### CMS

Responsible for:

- Homepage sections.
- Banners.
- Storefront content.
- Merchandising configuration.

### Media

Responsible for:

- Media metadata.
- Storage references.
- Media organization.

### Notifications

Responsible for:

- Transactional notifications.
- Email/SMS/push provider integrations where applicable.
- Notification jobs.

---

## 9. Domain Communication

Internal modules should communicate through explicit application/domain services rather than tightly coupling models together.

For example:

```text
Checkout Service
    |
    ├── Inventory Service
    ├── Pricing Service
    ├── Promotion Service
    ├── Shipping Service
    └── Payment Service
```

The exact service structure will be defined during detailed backend design.

Avoid creating generic services that have no clear business responsibility.

---

## 10. API Architecture

The frontend communicates with Django through REST APIs.

Initial API namespace:

```text
/api/v1/
```

Examples:

```text
/api/v1/products/
/api/v1/categories/
/api/v1/collections/
/api/v1/cart/
/api/v1/checkout/
/api/v1/orders/
/api/v1/customers/
/api/v1/wholesale/
```

The API must be:

- Versioned.
- Validated.
- Authenticated where required.
- Authorized.
- Documented.
- Consistent.
- Testable.

Detailed API contracts will be documented separately.

---

## 11. Authentication Architecture

Authentication will use Supabase Auth.

Conceptually:

```text
Customer
   |
   v
Supabase Auth
   |
Authentication Token
   |
   v
Django API
   |
Token Validation
   |
Application User / Permissions
```

Authentication identifies the user.

Django application authorization determines what the authenticated user may do.

---

## 12. Authorization

Authorization must be enforced server-side.

The application should support role and permission concepts for:

- Retail customers.
- Wholesale customers.
- Staff.
- Administrators.

Example:

```text
Customer
    └── Customer permissions

Wholesale Customer
    └── Wholesale permissions

Catalog Staff
    └── Catalog permissions

Order Staff
    └── Order permissions

Administrator
    └── Administrative permissions
```

The exact role matrix belongs in the authentication/authorization documentation.

---

## 13. Database Architecture

The primary database is PostgreSQL hosted through Supabase.

Django ORM is the application's database access layer.

The database is responsible for enforcing:

- Primary keys.
- Foreign keys.
- Unique constraints.
- Check constraints where appropriate.
- Referential integrity.
- Required fields.
- Appropriate indexes.

Application validation and database constraints should complement each other.

---

## 14. Supabase MCP

Supabase MCP will be used by the AI-agent workflow for database operations.

The process should be:

```text
Documentation
      |
Database specification
      |
Antigravity prompt
      |
Supabase MCP
      |
Database changes
      |
Verification
      |
Django compatibility check
```

AI agents must not create undocumented tables or relationships.

Every intentional database change should be reflected in the project documentation and Django migration strategy.

---

## 15. Schema Ownership

The project must avoid having two competing sources of truth for schema evolution.

The intended model is:

```text
Domain model
    ↓
Django models
    ↓
Django migrations
    ↓
PostgreSQL
```

Supabase MCP may be used to create, inspect or modify database structures during agentic development, but schema changes must remain reproducible and aligned with Django migrations.

Before production, the migration process must be tested from a clean database.

---

## 16. Storage Architecture

Supabase Storage will hold:

- Product images.
- Product gallery assets.
- Homepage banners.
- CMS media.
- Other approved media.

Database records should store:

- Storage references.
- Metadata.
- Alt text.
- Ordering.
- Ownership/relationships.

The application should not store large binary assets directly in PostgreSQL.

---

## 17. Cache Architecture

Redis will be used where caching or temporary shared state provides a real benefit.

Potential use cases:

- Frequently requested catalog data.
- Session-related temporary state if required.
- Rate limiting.
- Background-job broker.
- Short-lived computation results.

Caching must never become the authoritative source for:

- Inventory.
- Payment state.
- Order state.
- Financial totals.

The database remains authoritative for transactional data.

---

## 18. Background Job Architecture

Celery will be used for asynchronous jobs where appropriate.

Conceptually:

```text
Django API
    |
    | enqueue
    v
Redis
    |
    v
Celery Worker
    |
    ├── Email
    ├── Notifications
    ├── Payment reconciliation
    ├── Inventory tasks
    └── Other asynchronous work
```

Background jobs should be:

- Retryable where appropriate.
- Idempotent where appropriate.
- Observable.
- Safe against duplicate execution.

---

## 19. Payment Architecture

Payment providers must be isolated behind an internal abstraction.

```text
Checkout
   |
Payment Application Service
   |
Payment Provider Interface
   |
Provider Adapter
   |
External Gateway
```

The rest of the application should not depend directly on provider-specific SDK behavior.

Payment webhooks must be verified before changing payment or order state.

---

## 20. Shipping Architecture

Shipping providers should use an adapter-based integration model.

```text
Order
   |
Shipping Service
   |
Shipping Provider Interface
   |
Provider Adapter
   |
External Courier API
```

This allows a provider to be replaced or additional providers to be introduced without rewriting order logic.

---

## 21. Commerce Transaction Boundaries

Critical commerce operations must use appropriate database transactions.

Examples include:

- Creating an order.
- Reserving inventory.
- Finalizing a successful purchase.
- Applying inventory movements.
- Processing refunds where applicable.

A transaction should protect the integrity of related state changes.

Long-running external API calls should not unnecessarily hold database transactions open.

---

## 22. Inventory Flow

A simplified inventory flow:

```text
Available Stock
      |
      v
Reservation
      |
      +---- Payment Failed ----> Release
      |
      +---- Payment Success ---> Deduct / Finalize
```

The exact inventory state transitions will be documented separately.

Inventory operations must prevent race conditions and overselling.

---

## 23. Order Flow

A simplified order flow:

```text
Customer
   |
   v
Cart
   |
   v
Checkout
   |
   ├── Validate
   ├── Price
   ├── Promotion
   ├── Inventory
   ├── Shipping
   └── Payment
          |
          v
       Order
          |
          v
     Fulfillment
```

The exact workflow depends on payment and inventory rules.

---

## 24. Retail and Wholesale Architecture

Retail and wholesale share the same core commerce platform.

```text
                  Shared Catalog
                       |
          ┌────────────┴────────────┐
          │                         │
       Retail                   Wholesale
          │                         │
     Retail Price              Wholesale Price
          │                         │
     Retail Rules              Wholesale Rules
          │                         │
          └────────────┬────────────┘
                       │
                    Orders
                       |
                   Inventory
```

There should not be two independent product databases.

---

## 25. CMS Architecture

The storefront should be CMS-driven where practical.

Example:

```text
CMS
 |
 ├── Homepage Sections
 ├── Banners
 ├── Collections
 └── Content
        |
        v
     REST API
        |
        v
     Next.js
```

The frontend should not require a deployment for routine content ordering or visibility changes.

---

## 26. Administrative Architecture

Django Admin should be considered an important operational interface.

It can provide internal management for:

- Products.
- Variants.
- Categories.
- Collections.
- Inventory.
- Orders.
- Customers.
- Wholesale applications.
- Promotions.
- CMS content.

A separate custom admin frontend may be introduced where the business workflow requires a more specialized experience.

Django Admin should not automatically be exposed publicly.

---

## 27. Security Architecture

Security boundaries exist at several levels:

```text
Browser
   ↓
HTTPS
   ↓
Next.js
   ↓
Django API
   ↓
Authorization
   ↓
Domain Services
   ↓
Database
```

External providers must also be treated as untrusted until their responses are validated.

Secrets must remain outside source code.

Production credentials must never be committed to the repository.

---

## 28. Observability Architecture

The production system should provide:

- Structured application logs.
- Error tracking.
- Request tracing/correlation where appropriate.
- Background-job monitoring.
- Important business-event logging.
- Health checks.

Observability should help answer:

- What failed?
- Where did it fail?
- When did it fail?
- Which request/order/job was affected?
- Can it be retried safely?

Sensitive information must not be unnecessarily logged.

---

## 29. Deployment Model

The exact cloud providers and deployment services will be finalized in the DevOps document.

The architecture must support independently scalable components:

```text
Next.js Application
        |
Django Application
        |
PostgreSQL / Supabase
        |
Redis
        |
Celery Workers
```

The system should be deployable using environment-specific configuration.

---

## 30. Environment Separation

At minimum, the project should distinguish:

```text
Development
Testing
Staging
Production
```

Production data must never be casually used for local development.

Environment-specific credentials must remain isolated.

---

## 31. API Security Boundary

The frontend is considered untrusted.

The backend must independently validate:

- Identity.
- Permissions.
- Product availability.
- Prices.
- Discounts.
- Inventory.
- Order ownership.
- Payment state.
- Wholesale eligibility.

A malicious client must not be able to modify a request and bypass these rules.

---

## 32. Data Flow Example — Product Browsing

```text
Browser
   |
   v
Next.js
   |
GET /api/v1/products/
   |
   v
Django REST Framework
   |
Catalog Query
   |
   v
Django ORM
   |
   v
PostgreSQL
   |
   v
Serialized API Response
   |
   v
Next.js
   |
   v
Product UI
```

---

## 33. Data Flow Example — Checkout

```text
Browser
   |
   v
Next.js Checkout
   |
   v
Django Checkout API
   |
   ├── Authenticate
   ├── Validate Cart
   ├── Resolve Pricing
   ├── Validate Promotions
   ├── Validate Inventory
   ├── Resolve Shipping
   ├── Calculate Totals
   ├── Initiate Payment
   └── Finalize Order
            |
            v
       PostgreSQL
```

The client does not decide the final amount.

---

## 34. Data Flow Example — Wholesale

```text
User
  |
  v
Wholesale Application
  |
  v
Django
  |
  v
Admin Review
  |
  ├── Rejected
  |
  └── Approved
          |
          v
Wholesale Customer
          |
          v
Wholesale Pricing / Rules
          |
          v
Wholesale Checkout
```

---

## 35. Scalability Strategy

Initial scaling should focus on:

1. Efficient database queries.
2. Proper indexes.
3. Stateless Django application instances.
4. Horizontal application scaling.
5. Redis where justified.
6. Background workers.
7. CDN/media optimization.
8. Database monitoring and optimization.

Microservices are not part of the initial architecture.

---

## 36. Failure Isolation

External provider failures should not corrupt core business data.

Examples:

### Payment provider unavailable

The order/payment workflow should enter a recoverable state rather than falsely marking an order as paid.

### Email provider unavailable

Order creation should not fail solely because a notification provider is temporarily unavailable.

### Shipping provider unavailable

Shipping synchronization should be retryable.

### Background worker unavailable

Jobs should remain recoverable through the queue/retry strategy.

---

## 37. Architecture Decision Summary

The following decisions are currently locked:

| Area | Decision |
|---|---|
| Frontend | Next.js + TypeScript |
| UI | React + Tailwind CSS |
| Backend | Django |
| API | Django REST Framework |
| Architecture | Modular monolith |
| Database | PostgreSQL |
| Database platform | Supabase |
| ORM | Django ORM |
| Authentication | Supabase Auth |
| Storage | Supabase Storage |
| Cache | Redis |
| Background jobs | Celery |
| API version | `/api/v1/` |
| Development agent | Antigravity |
| Database agent tooling | Supabase MCP |

---

## 38. Architectural Non-Goals

The initial system will not intentionally introduce:

- Microservices.
- Kubernetes solely for complexity.
- Event-driven architecture everywhere.
- Multiple databases without a real requirement.
- Direct frontend-to-database commerce operations.
- Provider-specific logic throughout the domain layer.
- Complex distributed transactions.
- Premature abstractions.

---

## 39. Source of Truth

Architecture decisions are documented under:

```text
/docs
```

The following documents are particularly important:

```text
00-project-overview.md
01-product-requirements.md
02-architecture.md
03-tech-stack.md
04-backend-architecture.md
05-database-architecture.md
06-domain-model.md
07-api-architecture.md
08-authentication-authorization.md
09-commerce-rules.md
10-retail-wholesale.md
11-inventory-pricing.md
12-orders-payments-shipping.md
13-frontend-architecture.md
14-design-system.md
15-security.md
16-testing.md
17-devops-deployment.md
18-observability.md
19-development-workflow.md
20-ai-agent-rules.md
21-environment-configuration.md
```

An implementation agent must consult the relevant documents before changing architecture.

---

## 40. Status

This document defines the high-level architecture.

Detailed implementation decisions will be specified in the remaining architecture documents.

No implementation agent should infer undocumented architecture decisions when a requirement is ambiguous.
