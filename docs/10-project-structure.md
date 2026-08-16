# Closet by Chilli — Project Structure

## 1. Purpose

This document defines the repository structure and organization conventions for the Closet by Chilli production platform.

The structure is designed for:

- Next.js frontend development.
- Django backend development.
- Supabase/PostgreSQL integration.
- Automated testing.
- Documentation.
- CI/CD.
- Infrastructure configuration.
- AI-agent-driven implementation.

The repository should remain understandable to both human developers and Antigravity AI agents.

---

# 2. Repository Strategy

Use a single repository containing the major application layers.

Recommended structure:

```text
closet-by-chilli/
│
├── frontend/
├── backend/
├── docs/
├── tests/
├── infrastructure/
├── scripts/
├── .github/
├── .env.example
├── .gitignore
├── README.md
└── ...
```

This keeps frontend and backend independently organized while keeping the entire product in one version-controlled repository.

---

# 3. Root Directory

Recommended root:

```text
closet-by-chilli/
```

The root should contain only project-wide configuration and directories.

Do not place application source code directly in the repository root.

---

# 4. Frontend Directory

```text
frontend/
```

Contains the complete Next.js application.

Conceptually:

```text
frontend/
├── app/
├── components/
├── lib/
├── hooks/
├── types/
├── public/
├── tests/
├── package.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts / CSS configuration
└── ...
```

The exact files depend on the selected Next.js version and configuration.

---

# 5. Next.js App Directory

Recommended organization:

```text
frontend/app/
│
├── layout.tsx
├── page.tsx
├── not-found.tsx
├── error.tsx
├── loading.tsx
│
├── (storefront)/
├── (account)/
├── (checkout)/
└── ...
```

Route groups should be used to organize related routes without unnecessarily changing public URLs.

---

# 6. Storefront Routes

Conceptually:

```text
frontend/app/(storefront)/
├── products/
├── categories/
├── collections/
├── search/
└── ...
```

The homepage can remain at:

```text
/
```

Public product/category/collection routes should be SEO-friendly.

---

# 7. Account Routes

Conceptually:

```text
frontend/app/(account)/
└── account/
    ├── page.tsx
    ├── orders/
    ├── addresses/
    └── ...
```

These routes are customer-facing and require appropriate authentication.

---

# 8. Checkout Routes

Conceptually:

```text
frontend/app/(checkout)/
└── checkout/
    ├── page.tsx
    ├── success/
    └── ...
```

Checkout should remain isolated from general storefront layout where the UX requires a dedicated flow.

---

# 9. Wholesale Routes

Wholesale functionality may live inside shared storefront/account routes.

Example:

```text
frontend/app/
└── wholesale/
    ├── page.tsx
    ├── apply/
    └── ...
```

Do not create a second Next.js application for wholesale unless requirements later justify it.

---

# 10. Components

```text
frontend/components/
```

Recommended organization:

```text
components/
├── ui/
├── layout/
├── navigation/
├── product/
├── cart/
├── checkout/
├── account/
├── wholesale/
└── cms/
```

---

# 11. UI Components

```text
components/ui/
```

Contains reusable, business-agnostic components.

Examples:

```text
Button
Input
Select
Dialog
Drawer
Badge
Skeleton
Alert
Tabs
```

These components should not contain commerce-specific business rules.

---

# 12. Product Components

```text
components/product/
```

Potential components:

```text
ProductCard
ProductGrid
ProductGallery
ProductInformation
VariantSelector
PriceDisplay
AddToCartButton
```

Each component should have a focused responsibility.

---

# 13. Cart Components

```text
components/cart/
```

Potential components:

```text
CartDrawer
CartItem
CartSummary
QuantitySelector
```

Cart components communicate with the API layer rather than directly manipulating database state.

---

# 14. Checkout Components

```text
components/checkout/
```

Potential components:

```text
CheckoutForm
AddressSelector
ShippingSelector
OrderSummary
PaymentSection
```

Payment provider-specific UI should remain isolated from generic checkout components.

---

# 15. Account Components

```text
components/account/
```

Potential components:

```text
ProfileForm
AddressList
AddressForm
OrderList
OrderCard
OrderStatus
```

---

# 16. Wholesale Components

```text
components/wholesale/
```

Potential components:

```text
WholesaleStatus
WholesaleApplicationForm
WholesalePriceDisplay
WholesaleRequirements
```

Wholesale authorization must still be enforced by Django.

---

# 17. CMS Components

```text
components/cms/
```

Potential components:

```text
HomepageSection
CollectionSection
CategorySection
ProductCarousel
ContentSection
```

CMS components render supported content types.

---

# 18. Frontend Library

```text
frontend/lib/
```

Contains application infrastructure and integrations.

Recommended:

```text
lib/
├── api/
├── auth/
├── config/
├── formatting/
├── validation/
├── analytics/
└── utils/
```

---

# 19. API Layer

```text
frontend/lib/api/
```

Potential structure:

```text
api/
├── client.ts
├── products.ts
├── categories.ts
├── collections.ts
├── cart.ts
├── checkout.ts
├── orders.ts
├── wholesale.ts
└── cms.ts
```

This is the primary interface between the frontend and Django.

---

# 20. API Client Rules

The API client must:

- Use the configured backend URL.
- Attach authentication where required.
- Normalize API errors.
- Support request IDs where appropriate.
- Support idempotency where required.
- Parse typed responses.

Components should not duplicate this logic.

---

# 21. Authentication Library

```text
frontend/lib/auth/
```

Contains Supabase authentication integration.

Potential responsibilities:

```text
Session handling
Authentication helpers
User/session utilities
Auth route helpers
```

Do not implement password authentication here.

Supabase remains the identity provider.

---

# 22. Configuration

```text
frontend/lib/config/
```

Contains safe application configuration helpers.

Examples:

```text
API URL
Feature flags
Public application configuration
```

Secrets must not be exposed through browser configuration.

---

# 23. Formatting

```text
frontend/lib/formatting/
```

Contains presentation helpers such as:

```text
Currency formatting
Date formatting
Number formatting
```

These helpers must not contain pricing business rules.

---

# 24. Validation

```text
frontend/lib/validation/
```

Contains client-side form validation schemas where appropriate.

Server-side validation remains authoritative.

---

# 25. Hooks

```text
frontend/hooks/
```

Contains reusable client-side React hooks.

Examples:

```text
useCart
useDebounce
useMediaQuery
useAuth
```

Hooks should not become an alternative backend/service layer.

---

# 26. Types

```text
frontend/types/
```

Contains shared frontend TypeScript types.

Where possible, API types should be generated/derived from the API contract rather than manually recreated.

---

# 27. Public Assets

```text
frontend/public/
```

Contains static assets that belong in the frontend deployment.

Examples:

```text
favicon
static icons
brand assets
public fonts if applicable
```

Large product media should generally live in Supabase Storage rather than being committed into the repository.

---

# 28. Frontend Tests

```text
frontend/tests/
```

May contain:

```text
unit/
integration/
e2e/
```

The exact testing tools will be selected during project initialization.

---

# 29. Backend Directory

```text
backend/
```

Contains the Django application.

Recommended high-level structure:

```text
backend/
├── config/
├── apps/
├── tests/
├── manage.py
├── requirements/
└── ...
```

---

# 30. Django Configuration

```text
backend/config/
```

Contains project-level Django configuration.

Potential structure:

```text
config/
├── settings/
│   ├── base.py
│   ├── development.py
│   ├── staging.py
│   └── production.py
├── urls.py
├── asgi.py
├── wsgi.py
└── ...
```

The exact settings strategy can be simplified if the final deployment architecture favors a different approach.

---

# 31. Django Applications

Business domains should be represented by Django apps.

Recommended initial organization:

```text
backend/apps/
├── accounts/
├── catalog/
├── categories/
├── collections/
├── pricing/
├── promotions/
├── inventory/
├── cart/
├── checkout/
├── orders/
├── payments/
├── shipping/
├── wholesale/
├── cms/
├── notifications/
└── audit/
```

Not every domain necessarily needs its own app on day one.

The final list should follow actual business complexity.

---

# 32. Django App Responsibilities

Each Django app should have a clear domain responsibility.

Example:

```text
catalog/
    Product
    ProductVariant

inventory/
    Stock
    Reservation
    InventoryMovement

orders/
    Order
    OrderItem

payments/
    Payment
    PaymentAttempt
    WebhookEvent
    Refund
```

Do not duplicate entities across apps.

---

# 33. Django App Internal Structure

A mature app may use:

```text
catalog/
├── admin.py
├── apps.py
├── models/
├── serializers/
├── services/
├── selectors/
├── permissions/
├── urls.py
├── views/
├── tests/
└── ...
```

The project should introduce this structure where complexity warrants it.

Do not create dozens of empty abstraction files merely for appearance.

---

# 34. Models

Models represent persistent domain state.

They should contain:

- Database relationships.
- Constraints.
- Simple domain invariants.
- Appropriate indexes.

Complex workflows should generally live in services rather than enormous models.

---

# 35. Serializers

Django REST Framework serializers define API representations.

They should:

- Validate API input.
- Serialize safe output.
- Explicitly expose fields.
- Avoid leaking internal fields.

---

# 36. Services

Services coordinate business operations.

Examples:

```text
CheckoutService
OrderService
PricingService
InventoryService
WholesaleService
PaymentService
```

Services should be used for operations involving multiple entities or business rules.

---

# 37. Selectors

For complex read/query logic, selector/query modules may be used.

Examples:

```text
ProductQueries
OrderQueries
InventoryQueries
```

The architecture should avoid placing large query logic inside API views.

---

# 38. Permissions

Authorization logic should be explicit.

Potential locations:

```text
permissions/
services/
policies/
```

The project should select one consistent pattern rather than duplicating permission systems.

---

# 39. Django URLs

The root API routing should be centralized.

Conceptually:

```text
config/urls.py
      |
      v
/api/v1/
      |
      ├── accounts
      ├── catalog
      ├── cart
      ├── checkout
      ├── orders
      ├── wholesale
      └── webhooks
```

---

# 40. Backend Tests

```text
backend/tests/
```

Tests should cover:

```text
Unit
Integration
API
Permissions
Business workflows
```

Critical commerce workflows should have integration coverage.

---

# 41. Root Tests Directory

A root-level:

```text
tests/
```

may contain cross-application or end-to-end test infrastructure.

Application-specific tests should generally remain close to the application they test.

---

# 42. Documentation Directory

```text
docs/
```

This is the source of truth for project documentation.

Recommended:

```text
docs/
├── 01-project-overview.md
├── 02-product-requirements.md
├── 03-architecture.md
├── 04-tech-stack.md
├── 05-database-architecture.md
├── 06-domain-model.md
├── 07-api-architecture.md
├── 08-authentication-authorization.md
├── 09-frontend-architecture.md
├── 10-project-structure.md
└── ...
```

The exact numbering should remain stable after documents are referenced by agents.

---

# 43. Documentation Rules

Every major architectural decision should have one authoritative document.

Agents must:

1. Read relevant documentation.
2. Follow documented decisions.
3. Avoid inventing conflicting architecture.
4. Update documentation when architecture changes.
5. Record important decisions in the appropriate document.

---

# 44. Infrastructure Directory

```text
infrastructure/
```

Contains deployment/infrastructure configuration.

Potential future contents:

```text
docker/
deployment/
monitoring/
scripts/
```

The exact infrastructure provider is not locked by this document.

---

# 45. Scripts Directory

```text
scripts/
```

Contains project automation that is not part of application runtime.

Examples:

```text
setup
development utilities
database verification
test orchestration
code generation
```

Scripts should be documented and deterministic.

---

# 46. GitHub Directory

```text
.github/
```

Potential contents:

```text
.github/
├── workflows/
├── pull_request_template.md
└── ...
```

CI should eventually validate:

```text
Frontend lint
Frontend typecheck
Frontend tests
Backend tests
Backend lint
API/schema checks
Security checks
```

---

# 47. Environment Files

At repository level:

```text
.env.example
```

may document required environment variables.

Actual secrets must never be committed.

Potential local files:

```text
.env.local
.env.development
```

depending on framework conventions.

---

# 48. Environment Variable Ownership

Frontend variables:

```text
frontend/.env.*
```

Backend variables:

```text
backend/.env.*
```

or a controlled root-level configuration approach.

The project should choose one convention during initialization.

Never mix secret and public configuration accidentally.

---

# 49. Gitignore

The repository must ignore:

```text
node_modules/
.venv/
__pycache__/
.env*
!.env.example
.next/
coverage/
dist/
build/
```

The final `.gitignore` must reflect the actual tooling.

---

# 50. Dependency Management

Frontend dependencies should be locked through the selected package manager lockfile.

Backend Python dependencies should be pinned/locked using the selected dependency management strategy.

Production builds must be reproducible.

---

# 51. Code Formatting

Use automated formatting.

Frontend:

```text
Prettier / project-approved formatter
```

Backend:

```text
Ruff formatter or approved Python formatter
```

The project must choose one authoritative formatting configuration per language.

---

# 52. Linting

Frontend:

```text
ESLint
```

Backend:

```text
Ruff
```

Linting must run in CI.

Agents should run linting before considering a sprint complete.

---

# 53. Type Checking

Frontend:

```text
TypeScript
```

must run in strict mode where practical.

Backend may use:

```text
mypy
```

or another approved type checker if the project complexity justifies it.

---

# 54. Naming Conventions

Frontend:

```text
Components → PascalCase
Hooks → useSomething
Utilities → camelCase
Types → PascalCase
```

Backend:

```text
Modules → snake_case
Functions → snake_case
Classes → PascalCase
Constants → UPPER_SNAKE_CASE
```

Database naming conventions must remain consistent with the selected PostgreSQL/Django strategy.

---

# 55. Import Rules

Avoid circular dependencies.

Preferred dependency direction:

```text
UI
 ↓
API / application utilities
 ↓
Domain/application services
 ↓
Infrastructure
```

Do not create arbitrary cross-domain imports.

---

# 56. Domain Dependency Rules

A domain may depend on another domain only when the business relationship requires it.

Avoid creating a dependency graph where every Django app imports every other app.

For cross-domain operations, prefer explicit service interfaces or application orchestration.

---

# 57. Frontend Dependency Rules

Components should not directly import database or backend implementation details.

Frontend dependency direction:

```text
Route
 ↓
Domain Component
 ↓
API Client
 ↓
Django API
```

---

# 58. Backend Dependency Rules

API views should not contain entire business workflows.

Preferred:

```text
View
 ↓
Serializer
 ↓
Service
 ↓
Domain / Repository / ORM
```

---

# 59. Shared Code

Do not create a generic:

```text
shared/
```

directory immediately.

Only create shared modules when there is a real reusable abstraction.

Premature shared abstractions tend to become difficult-to-maintain dumping grounds.

---

# 60. Generated Code

Generated code must be clearly identified.

Examples:

```text
OpenAPI-generated TypeScript types
Code-generated API clients
Migration files
```

Agents should not manually edit generated files unless explicitly documented.

---

# 61. Database Migrations

Database migrations belong to the backend/database workflow.

When Supabase MCP is used to create or modify database structures, the project must still preserve a reproducible representation of schema changes.

The exact migration/versioning strategy must be finalized before production database changes are made.

Agents must not make undocumented schema changes.

---

# 62. Supabase Configuration

Supabase-related configuration should be documented and separated from application source.

Potential structure:

```text
infrastructure/supabase/
```

if local Supabase configuration or project configuration is required.

Credentials must never be committed.

---

# 63. Storage

Product/media binaries should be stored in Supabase Storage rather than Git.

The application should store only the required metadata/reference in PostgreSQL.

---

# 64. Local Development

The project should eventually support a reproducible local workflow:

```text
Clone repository
      ↓
Install dependencies
      ↓
Configure environment
      ↓
Run frontend
      ↓
Run Django backend
      ↓
Connect to development Supabase
      ↓
Run tests
```

The exact commands will be documented in the root README.

---

# 65. Development Ports

Do not hard-code production assumptions into source code.

Local ports should be configurable.

A common conceptual setup is:

```text
Frontend → localhost:3000
Backend  → localhost:8000
```

The exact ports are not architecturally important.

---

# 66. Docker

Docker should be introduced if it improves:

- Development reproducibility.
- CI consistency.
- Deployment.
- Service isolation.

Do not add Docker complexity solely because it is conventional.

The final deployment architecture determines the appropriate container strategy.

---

# 67. Production Build

The production system should be buildable from a clean checkout using:

```text
Pinned dependencies
Environment configuration
Automated build
Automated tests
```

No developer machine state should be required.

---

# 68. CI Pipeline

The initial CI pipeline should eventually perform:

```text
Checkout
 ↓
Install dependencies
 ↓
Lint
 ↓
Typecheck
 ↓
Unit tests
 ↓
Integration/API tests
 ↓
Build
```

Security/dependency scanning can be added as the project matures.

---

# 69. Pull Request Checks

A change should not be considered production-ready if:

```text
Tests fail
Lint fails
Typecheck fails
Build fails
Security checks fail
```

where those checks are applicable.

---

# 70. AI Agent Workspace Rules

Antigravity agents must treat:

```text
docs/
```

as authoritative project context.

Before changing architecture, the agent should inspect relevant documentation.

Before adding a new domain:

```text
Check existing domain model
Check database architecture
Check API architecture
Check project structure
```

---

# 71. AI Agent File Creation Rules

The agent should not create:

```text
random utility folders
duplicate API clients
duplicate types
duplicate domain models
```

without documenting why they are needed.

Every new major directory should have a clear responsibility.

---

# 72. AI Agent Implementation Order

For a new feature:

```text
1. Read requirements
2. Read relevant architecture docs
3. Identify domain
4. Define/update database
5. Implement backend domain/service
6. Implement API
7. Implement frontend integration
8. Add tests
9. Run quality checks
10. Update documentation
```

The exact order can vary for UI-only work, but business-critical backend rules must never be skipped.

---

# 73. Production Readiness Principle

A feature is not production-ready merely because:

```text
"It works in the browser."
```

It must also have:

```text
Security
Validation
Error handling
Tests
Observability
Documentation
Reproducibility
```

---

# 74. Repository Definition of Done

The repository structure is considered established when:

- Frontend has a clear Next.js structure.
- Backend has clear Django domain boundaries.
- Documentation has a stable location.
- Tests have defined locations.
- Infrastructure has a defined location.
- Environment handling is documented.
- CI configuration has a defined location.
- Naming conventions are documented.
- AI-agent rules are explicit.
- No secrets are committed.

---

# 75. Final Repository Structure

The target structure is:

```text
closet-by-chilli/
│
├── frontend/
│   ├── app/
│   ├── components/
│   ├── lib/
│   ├── hooks/
│   ├── types/
│   ├── public/
│   └── tests/
│
├── backend/
│   ├── config/
│   ├── apps/
│   │   ├── accounts/
│   │   ├── catalog/
│   │   ├── categories/
│   │   ├── collections/
│   │   ├── pricing/
│   │   ├── promotions/
│   │   ├── inventory/
│   │   ├── cart/
│   │   ├── checkout/
│   │   ├── orders/
│   │   ├── payments/
│   │   ├── shipping/
│   │   ├── wholesale/
│   │   ├── cms/
│   │   ├── notifications/
│   │   └── audit/
│   ├── tests/
│   └── manage.py
│
├── docs/
│   ├── 01-project-overview.md
│   ├── 02-product-requirements.md
│   ├── 03-architecture.md
│   ├── 04-tech-stack.md
│   ├── 05-database-architecture.md
│   ├── 06-domain-model.md
│   ├── 07-api-architecture.md
│   ├── 08-authentication-authorization.md
│   ├── 09-frontend-architecture.md
│   └── 10-project-structure.md
│
├── tests/
├── infrastructure/
├── scripts/
├── .github/
├── .env.example
├── .gitignore
└── README.md
```

This structure is the baseline for the implementation sprints.

---

# 76. Next Document

The next document is:

```text
11-development-workflow.md
```

It will define how we actually build Closet by Chilli in small, controlled Antigravity sprints, including:

- Sprint structure.
- Agent prompt structure.
- Context/document loading.
- Implementation boundaries.
- Testing after every sprint.
- Database changes through Supabase MCP.
- Code review checkpoints.
- Definition of Done.
- Git/commit strategy.
- Rollback strategy.
- How to prevent AI agents from making uncontrolled architectural changes.
