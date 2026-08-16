# Closet by Chilli — Technology Stack

## 1. Purpose

This document locks the initial technology choices for the Closet by Chilli production e-commerce platform.

The stack is selected with the following priorities:

- Production readiness.
- Security.
- Maintainability.
- Developer productivity.
- Strong typing where practical.
- Scalability.
- Good ecosystem support.
- Compatibility with the AI-agent development workflow.
- Clear separation between frontend, backend, database and infrastructure.

Technology choices should not be changed casually during implementation.

Any proposed replacement must include a clear reason, impact analysis and documentation update.

---

## 2. Stack Summary

| Layer | Technology |
|---|---|
| Frontend framework | Next.js |
| Frontend language | TypeScript |
| UI | React |
| Styling | Tailwind CSS |
| Backend framework | Django |
| API framework | Django REST Framework |
| Backend language | Python |
| Database | PostgreSQL |
| Database platform | Supabase |
| ORM | Django ORM |
| Authentication | Supabase Auth |
| Object storage | Supabase Storage |
| Cache | Redis |
| Background jobs | Celery |
| API style | REST |
| API version | `/api/v1/` |
| Frontend testing | Vitest + React Testing Library |
| Backend testing | pytest + pytest-django |
| End-to-end testing | Playwright |
| API documentation | OpenAPI |
| Code quality — frontend | ESLint + Prettier |
| Code quality — backend | Ruff + Black |
| Static typing — frontend | TypeScript |
| Static typing — backend | mypy |
| Git hooks | pre-commit |
| Containerization | Docker |
| Local orchestration | Docker Compose |
| Primary coding agent | Antigravity |
| Database agent tooling | Supabase MCP |

---

# 3. Frontend Stack

## 3.1 Next.js

Next.js is the primary frontend framework.

It will be responsible for:

- Storefront rendering.
- Routing.
- Layouts.
- Server-side rendering where beneficial.
- Static generation where beneficial.
- Client-side interaction.
- Metadata and SEO.
- Calling the Django API.
- Frontend composition.

The application should use the current stable Next.js release at project initialization rather than pinning an outdated version.

The exact version must be recorded in the repository's package manifest and lockfile.

---

## 3.2 React

React is the UI foundation used through Next.js.

React components should remain focused on presentation and interaction.

Business-critical calculations must not be moved into React simply because they are convenient to display.

---

## 3.3 TypeScript

TypeScript is mandatory for the frontend.

The project should use strict TypeScript configuration.

The goal is to catch incorrect assumptions before runtime.

Avoid:

```typescript
any
```

unless there is a documented reason.

Prefer:

- Explicit types.
- Interfaces/types.
- Discriminated unions.
- Generated API types where practical.
- Type-safe utility functions.

---

## 3.4 Tailwind CSS

Tailwind CSS will be used for styling.

The design system should be built on top of Tailwind rather than allowing arbitrary styling patterns throughout the application.

Reusable components should encapsulate repeated visual patterns.

The client's Closet by Chilli branding should be implemented through the design-system documentation rather than scattered hard-coded values.

---

# 4. Backend Stack

## 4.1 Python

Python is the backend programming language.

The project should use a currently supported Python version at initialization.

The exact version must be pinned/documented in:

```text
.python-version
```

and/or the backend dependency configuration.

---

## 4.2 Django

Django is the core backend framework.

Django provides:

- Application structure.
- ORM.
- Security foundations.
- Middleware.
- Configuration.
- Database migrations.
- Administrative interface.
- Request/response infrastructure.

Django will own the application's core business domain.

---

## 4.3 Django REST Framework

Django REST Framework will expose the application's REST API.

DRF will handle:

- API views.
- Serializers.
- Request validation.
- Authentication integration.
- Permissions.
- Pagination.
- API exception handling.
- API representation.

Business logic should not be hidden inside serializers merely to keep views short.

Where business operations are complex, explicit service/application-layer functions should be used.

---

# 5. Database Stack

## 5.1 PostgreSQL

PostgreSQL is the primary relational database.

It is responsible for transactional business data including:

- Products.
- Variants.
- Customers.
- Orders.
- Inventory.
- Pricing.
- Promotions.
- Payments.
- Shipping.
- Wholesale data.
- CMS configuration.

PostgreSQL is the authoritative persistence layer.

---

## 5.2 Supabase

Supabase provides managed infrastructure around PostgreSQL and will also be used for:

- Authentication.
- Storage.
- Database tooling.

Supabase does not replace Django as the business-logic backend.

The architecture remains:

```text
Next.js
   |
Django REST API
   |
Django ORM
   |
PostgreSQL / Supabase
```

---

## 5.3 Django ORM

Django ORM is the primary database access layer for backend application code.

Application code should not use raw SQL unless there is a documented performance or database-specific requirement.

If raw SQL is required, it must:

- Be reviewed.
- Be tested.
- Be documented.
- Avoid bypassing application-level security.

---

# 6. Authentication

## 6.1 Supabase Auth

Supabase Auth will provide user authentication.

It is responsible for identity operations such as:

- Sign up.
- Sign in.
- Sign out.
- Password/account recovery where applicable.
- Session/token management.

Django remains responsible for application-level authorization.

---

## 6.2 Authentication vs Authorization

The system must preserve this distinction:

```text
Supabase Auth
    =
Identity / Authentication

Django
    =
Application Authorization
```

For example:

A user may successfully authenticate but still not have permission to:

- Access wholesale pricing.
- Approve wholesale applications.
- Modify inventory.
- Manage products.
- Process refunds.

---

# 7. Storage

## 7.1 Supabase Storage

Supabase Storage will store application media.

Primary use cases:

- Product images.
- Variant images.
- Homepage banners.
- CMS assets.
- Other storefront media.

The application database stores references and metadata.

---

# 8. Cache and Background Jobs

## 8.1 Redis

Redis is the planned caching and message-broker technology.

Potential uses:

- Celery broker.
- Temporary state.
- Caching.
- Rate limiting.
- Short-lived application data.

Redis must not become the source of truth for financial or inventory data.

---

## 8.2 Celery

Celery will handle asynchronous backend work.

Examples:

- Sending transactional emails.
- Notifications.
- Payment reconciliation.
- Shipping synchronization.
- Long-running background tasks.
- Retryable provider operations.

Background tasks should be idempotent whenever practical.

---

# 9. API Stack

## 9.1 REST

The primary application API will be REST.

Base path:

```text
/api/v1/
```

Example:

```text
/api/v1/products/
/api/v1/categories/
/api/v1/cart/
/api/v1/orders/
/api/v1/checkout/
```

REST is preferred over introducing GraphQL because the initial product does not require GraphQL's additional complexity.

---

## 9.2 OpenAPI

The REST API should have an OpenAPI specification.

The API documentation should make it possible for:

- Frontend developers.
- Backend developers.
- QA.
- AI agents.

to understand available endpoints and schemas.

The exact OpenAPI generation/tooling will be finalized during API architecture implementation.

---

# 10. Testing Stack

Testing is mandatory.

## 10.1 Backend

Use:

```text
pytest
pytest-django
```

Backend tests should cover:

- Models.
- Services.
- Business rules.
- API endpoints.
- Permissions.
- Commerce calculations.
- Inventory behavior.
- Payment behavior where practical.

---

## 10.2 Frontend

Use:

```text
Vitest
React Testing Library
```

Frontend tests should focus on:

- Component behavior.
- User interaction.
- Rendering states.
- Form validation.
- Error states.
- Accessibility-related behavior where appropriate.

Avoid testing implementation details unnecessarily.

---

## 10.3 End-to-End

Use:

```text
Playwright
```

E2E tests should validate critical user journeys.

Initial critical journeys should include:

```text
Browse product
    ↓
View product
    ↓
Select variant
    ↓
Add to cart
    ↓
Checkout
    ↓
Order confirmation
```

Additional journeys will cover:

- Authentication.
- Retail account.
- Wholesale application.
- Wholesale purchasing.
- Admin operations.

---

# 11. Code Quality

## 11.1 Frontend Linting

Use:

```text
ESLint
```

ESLint should enforce project-specific coding standards.

---

## 11.2 Frontend Formatting

Use:

```text
Prettier
```

Formatting should be automated.

Developers and AI agents should not manually debate formatting.

---

## 11.3 Backend Linting

Use:

```text
Ruff
```

Ruff will provide fast Python linting and related code-quality checks.

---

## 11.4 Backend Formatting

Use:

```text
Black
```

The project should use automated formatting rather than relying on individual developer preferences.

---

## 11.5 Backend Type Checking

Use:

```text
mypy
```

Type checking should be introduced progressively where necessary, while keeping the project maintainable.

Django-specific typing support should be used where beneficial.

---

# 12. Git and Repository Management

Git will be the source-control system.

The repository should contain:

```text
frontend/
backend/
docs/
tests/
```

along with project configuration files.

The exact repository structure will be finalized during project initialization.

---

# 13. Pre-Commit Checks

Use:

```text
pre-commit
```

for automated local checks.

Potential checks include:

- Formatting.
- Linting.
- Basic static validation.
- Secret detection.
- YAML/JSON validation where applicable.

The CI pipeline must remain authoritative even if local hooks are bypassed.

---

# 14. Docker

Docker will be used to standardize local and deployment environments where appropriate.

Potential services:

```text
frontend
backend
redis
```

PostgreSQL may be run through Supabase tooling or a local container depending on the chosen development workflow.

The project must document which local database mode is being used.

---

# 15. Docker Compose

Docker Compose may be used for local orchestration.

A typical development environment may look like:

```text
Docker Compose
│
├── Next.js
├── Django
└── Redis
```

Supabase services may be managed separately through the Supabase CLI if the project chooses a local Supabase environment.

---

# 16. Package Management

## Frontend

Use the Node package manager selected during initialization.

The project should commit the package lockfile.

Do not mix package managers.

For example, if npm is selected:

```text
package.json
package-lock.json
```

If pnpm is selected:

```text
package.json
pnpm-lock.yaml
```

The repository must use exactly one package manager.

---

## Backend

Python dependencies should use a modern, reproducible dependency-management approach.

The project should commit dependency lock information where supported.

Dependency versions should be controlled rather than installing arbitrary latest versions during builds.

---

# 17. Environment Configuration

Environment variables must be used for environment-specific values.

Examples:

```text
DATABASE_URL
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
REDIS_URL
PAYMENT_PROVIDER_SECRET
SHIPPING_PROVIDER_SECRET
EMAIL_PROVIDER_SECRET
```

Actual environment variables will be defined in:

```text
docs/21-environment-configuration.md
```

Secrets must never be committed to Git.

---

# 18. Dependency Principles

Dependencies should be added only when they solve a real requirement.

Before adding a dependency, the implementation agent should consider:

1. Is it necessary?
2. Is the functionality already provided by the framework?
3. Is the package actively maintained?
4. Is it compatible with the project license?
5. Does it introduce security or operational risk?
6. Can the project reasonably maintain the integration?

Do not add libraries simply because they are popular.

---

# 19. Frontend Data Fetching

The frontend will consume the Django REST API.

A consistent API client layer should be created rather than scattering raw HTTP calls throughout components.

Conceptually:

```text
UI Component
     |
Feature Hook / Server Function
     |
API Client
     |
Django REST API
```

The exact client strategy will be finalized in the frontend architecture document.

---

# 20. Backend Architecture Libraries

The backend should prefer Django and DRF primitives where they are sufficient.

Third-party libraries should be introduced selectively.

Potential categories include:

- CORS configuration.
- API schema generation.
- Filtering.
- Authentication token verification.
- Storage integration.
- Task processing.
- Observability.

The exact package list will be established during implementation rather than adding every possible library upfront.

---

# 21. Security Tooling

The development pipeline should include automated security checks where practical.

Potential categories:

- Dependency vulnerability scanning.
- Secret detection.
- Static analysis.
- Container scanning.
- Production configuration validation.

Security tooling should be part of CI rather than relying only on developers remembering manual checks.

---

# 22. CI/CD

The project should use a CI/CD pipeline capable of running:

```text
Install dependencies
        ↓
Lint
        ↓
Type checks
        ↓
Unit tests
        ↓
Integration tests
        ↓
Build
        ↓
E2E tests where appropriate
        ↓
Security checks
```

Deployment should occur only after required checks pass.

Exact CI/CD provider and deployment platform will be defined in:

```text
docs/17-devops-deployment.md
```

---

# 23. Monitoring and Observability

The production stack should support:

- Error tracking.
- Application logs.
- Performance monitoring.
- Background job monitoring.
- Database monitoring.
- Health checks.

The specific provider can be selected later without changing the application architecture.

---

# 24. SEO and Performance

Next.js will be used to support:

- Server-rendered content.
- Metadata.
- Search-engine-friendly product pages.
- Optimized image delivery.
- Appropriate caching.
- Fast page loading.

The application should prioritize Core Web Vitals and real-user performance.

---

# 25. Accessibility

The frontend stack must support accessible UI implementation.

The project should target WCAG-aligned practices, including:

- Semantic HTML.
- Keyboard navigation.
- Focus management.
- Accessible forms.
- Meaningful labels.
- Alternative text.
- Sufficient contrast.
- Accessible error states.

Accessibility should be tested during feature development rather than deferred until the end.

---

# 26. AI-Agent Development Stack

The project will be developed through an agentic workflow.

Primary coding agent:

```text
Antigravity
```

Database tooling:

```text
Supabase MCP
```

The agent must use the project documentation as the architectural source of truth.

The agent should not independently replace selected technologies.

---

# 27. Versioning Policy

At project initialization, record exact versions for:

- Node.js.
- Next.js.
- React.
- TypeScript.
- Python.
- Django.
- Django REST Framework.
- Redis/Celery dependencies.
- Testing tools.

Use lockfiles to guarantee reproducible installations.

Dependency upgrades should be intentional and tested.

---

# 28. Production vs Development

Development tooling must not accidentally become production infrastructure.

Examples:

- Development debug mode must never be enabled in production.
- Development credentials must never be used in production.
- Local storage credentials must not be reused in production.
- Test payment credentials must remain isolated.
- Development database data must not be treated as production data.

---

# 29. Technology Selection Rules

When evaluating a new technology, ask:

### Does it solve a real requirement?

If not, do not add it.

### Does it fit the existing architecture?

If not, document the architectural impact.

### Is it production-ready?

Evaluate maintenance, security and ecosystem maturity.

### Does it increase operational complexity?

Prefer simpler solutions when the business requirements are equivalent.

### Can AI agents reliably work with it?

The technology should be sufficiently documented and predictable for the project's agentic workflow.

---

# 30. Locked Technology Decisions

The following are currently considered locked:

```text
Frontend:
Next.js
React
TypeScript
Tailwind CSS

Backend:
Python
Django
Django REST Framework

Database:
PostgreSQL
Supabase

ORM:
Django ORM

Authentication:
Supabase Auth

Storage:
Supabase Storage

Cache:
Redis

Background jobs:
Celery

API:
REST
OpenAPI
/api/v1/

Testing:
pytest
pytest-django
Vitest
React Testing Library
Playwright

Code quality:
ESLint
Prettier
Ruff
Black
mypy

Development:
Docker
Docker Compose
pre-commit
Antigravity
Supabase MCP
```

---

# 31. Technology Decisions That Remain Open

The following should be finalized during detailed implementation:

- Exact production hosting provider.
- Exact CI/CD provider.
- Exact payment gateway.
- Exact shipping provider.
- Exact email provider.
- Exact observability provider.
- Exact package manager if not already selected.
- Exact API schema generation package.
- Local Supabase vs remote development database workflow.
- CDN strategy.
- Search infrastructure if PostgreSQL search becomes insufficient.

These decisions must be documented before their respective implementation phases.

---

# 32. Important Rule for AI Agents

The AI agent must not install or replace major technologies without explicit approval.

For example, it must not decide on its own to replace:

```text
Django → FastAPI
PostgreSQL → MongoDB
REST → GraphQL
Supabase Auth → another authentication provider
Celery → another job system
```

because of personal preference.

Architectural changes require a documented decision.

---

# 33. Definition of Done for Stack Initialization

The technology stack is considered initialized when:

- Frontend dependencies are installed.
- Backend dependencies are installed.
- Version constraints are recorded.
- Lockfiles are committed.
- Linting works.
- Formatting works.
- Type checking works.
- Backend tests run.
- Frontend tests run.
- Playwright can run.
- Docker development environment works where configured.
- Environment configuration is documented.
- CI can execute the core quality checks.

---

# 34. Next Technical Documents

The next detailed documents are:

```text
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

These documents will turn the high-level architecture into implementation-ready specifications.
