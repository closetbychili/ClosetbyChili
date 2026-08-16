# Closet by Chilli — Project Overview

## 1. Project Identity

**Project Name:** Closet by Chilli  
**Project Type:** Production-ready E-Commerce Platform  
**Business Model:** Retail + Wholesale  
**Primary Market:** Fashion / Women's Ethnic Wear  
**Architecture Style:** Modern Full-Stack, API-driven, modular monolith

---

## 2. Project Vision

Closet by Chilli is a professional, scalable e-commerce platform for a fashion business that operates as both:

1. A direct-to-consumer retail store.
2. A wholesale supplier.

The platform must support both business models without maintaining two separate commerce systems.

The primary goal is to build a secure, maintainable, scalable and production-ready platform that can evolve with the business.

---

## 3. Core Business Categories

The initial product catalog includes:

- Kurtis
- Kurta Sets
- Dresses
- Anarkali Sets
- Dupattas
- Bottom Wear
  - Pants
  - Palazzo

The platform also supports merchandising/grouping concepts such as:

- 2-Piece Sets
- 3-Piece Sets
- Co-ord Sets
- New Arrivals
- Bestsellers
- Festive Collection

The category and collection systems must remain separate concepts.

---

## 4. Business Models

### 4.1 Retail

Retail customers should be able to:

- Browse products.
- Search products.
- Filter products.
- View product details.
- Select variants.
- Add products to cart.
- Apply eligible promotions.
- Checkout.
- Make payments.
- Track orders.
- Manage their account.
- Manage addresses.
- View order history.

### 4.2 Wholesale

Wholesale customers should be able to operate through the same core commerce platform while receiving wholesale-specific functionality.

Potential capabilities include:

- Wholesale registration/application.
- Business information.
- Admin approval.
- Wholesale pricing.
- Quantity-based pricing.
- Minimum order quantities.
- Wholesale order management.

Wholesale must not be implemented as a completely separate product catalog or commerce engine unless a future business requirement explicitly requires it.

Retail and wholesale should share:

- Products
- Product variants
- Inventory
- Orders
- Payments
- Shipping infrastructure
- Core commerce services

The main differences should be handled through business rules such as:

- Customer eligibility
- Pricing
- MOQ
- Promotions
- Catalog visibility
- Payment rules

---

## 5. Initial Homepage Structure

The initial homepage merchandising order is:

1. New Arrivals
2. Shop by Category
3. Kurtis
4. 2-Piece Sets
5. 3-Piece Sets
6. Ethnic Dresses
7. Bestsellers
8. Festive Collection
9. About Closet by Chilli

The homepage should be CMS-driven rather than hard-coded into the frontend.

The order, visibility and content of homepage sections should eventually be manageable from the administrative system.

---

## 6. Product Architecture

The product system must distinguish between:

- Product
- Product Variant
- SKU
- Product Images
- Categories
- Collections
- Attributes
- Options

A product represents the catalog-level item.

A product variant represents a specific sellable configuration and is the primary unit for:

- SKU
- Inventory
- Cart items
- Order items
- Variant-level pricing where required

Example:

```text
Product:
Floral Kurti

Variants:
- Blue / S
- Blue / M
- Blue / L
- Pink / S
- Pink / M
- Pink / L
```

---

## 7. Sets and Bundles

The platform must support fashion set concepts such as:

- 2-Piece Sets
- 3-Piece Sets
- Co-ord Sets

A set may initially be represented as a normal product with variants.

The architecture should remain extensible enough to support true product bundles/components in the future if the business requires independent component inventory.

Do not introduce complex bundle inventory behavior unless it is required by the actual business workflow.

---

## 8. Catalog vs Collections

Categories and collections are different concepts.

### Categories

Categories represent product taxonomy.

Examples:

```text
Kurtis
Kurta Sets
Dresses
Anarkali Sets
Dupattas
Bottom Wear
```

### Collections

Collections represent merchandising/editorial groupings.

Examples:

```text
New Arrivals
Bestsellers
Festive Collection
Summer Collection
Editor's Picks
```

A product may belong to multiple categories and multiple collections where appropriate.

---

## 9. Core Commerce Domains

The platform is divided into logical domains.

Initial domains:

```text
Accounts
Catalog
Categories
Collections
Inventory
Pricing
Promotions
Cart
Checkout
Orders
Payments
Shipping
Wholesale
CMS
Media
Notifications
Administration
```

Each domain must have a clearly defined responsibility.

Business logic should not be randomly distributed between controllers, serializers, frontend code and database queries.

---

## 10. Backend

The backend will use:

- Python
- Django
- Django REST Framework

The backend will expose a REST API consumed by the Next.js frontend.

Architecture:

```text
Next.js
   |
   | REST API
   v
Django
   |
Django REST Framework
   |
Application / Domain Services
   |
Django ORM
   |
PostgreSQL
```

---

## 11. Database

The primary database will be:

**PostgreSQL**

The project will use:

**Supabase PostgreSQL**

Supabase will also provide infrastructure such as:

- Authentication
- Storage
- PostgreSQL
- Database tooling

Supabase MCP will be used during development to assist with database creation and management through the AI-agent workflow.

However, the database schema must remain documented and reproducible.

AI agents must not introduce undocumented database structures.

---

## 12. Frontend

The frontend will use:

- Next.js
- TypeScript
- React
- Tailwind CSS

The storefront will communicate with Django through REST APIs.

The frontend must not directly implement authoritative business rules.

The backend is authoritative for:

- Pricing
- Inventory
- Discounts
- Permissions
- Checkout
- Order state
- Payment state
- Wholesale eligibility

---

## 13. Authentication

Authentication will use Supabase Auth.

The application backend will validate authenticated requests and enforce application-level authorization.

Authentication and authorization are separate concerns.

Authentication answers:

> Who is the user?

Authorization answers:

> What is this user allowed to do?

---

## 14. Storage

Product images, banners and other media will use Supabase Storage.

The database should store media metadata and references rather than binary image data.

Conceptually:

```text
Product
   |
   v
Media Metadata
   |
   v
Supabase Storage
```

---

## 15. Caching and Background Processing

The architecture should support:

- Redis
- Background jobs
- Asynchronous processing

Potential background operations include:

- Emails
- Notifications
- Order processing
- Payment reconciliation
- Inventory tasks
- Image processing
- External API synchronization

Celery + Redis is the planned background-job architecture.

---

## 16. Payments

Payment processing must be isolated behind a payment abstraction.

The application should not spread provider-specific payment logic across Orders, Checkout, Cart or Frontend.

Instead:

```text
Checkout
   |
Payment Service
   |
Payment Provider Adapter
   |
Payment Gateway
```

This allows the provider to be changed later without rewriting the entire commerce system.

---

## 17. Shipping

Shipping should also be provider-independent.

Conceptually:

```text
Order
   |
Shipping Service
   |
Shipping Provider Interface
   |
Provider Adapter
```

This allows future integration with different courier/shipping providers.

---

## 18. Orders

Orders are historical business records.

Once an order is created, it must preserve the relevant information that existed at the time of purchase.

Order items should preserve historical values such as:

- Product name
- SKU
- Variant information
- Unit price
- Discount
- Tax
- Quantity

An order must not depend exclusively on the current product record to reconstruct historical information.

---

## 19. Inventory

Inventory is tracked primarily at the product-variant level.

The inventory architecture should support:

- Available quantity
- Reserved quantity
- Inventory movements
- Stock adjustments
- Returns
- Damaged stock
- Reservations
- Releases

Inventory changes should be auditable.

---

## 20. Pricing

Pricing must be treated as a dedicated business domain.

The architecture should support:

- Retail pricing
- Wholesale pricing
- Quantity-based wholesale pricing
- Promotional pricing
- Scheduled pricing
- Customer eligibility

Pricing logic must not be hard-coded into frontend components.

---

## 21. Promotions

Promotions are separate from base pricing.

Potential capabilities include:

- Coupon codes
- Percentage discounts
- Fixed discounts
- Product-specific promotions
- Category-specific promotions
- Minimum cart value
- Customer eligibility
- Start/end dates
- Usage limits

The exact promotion engine will be defined during detailed commerce design.

---

## 22. Cart

The cart system must support:

- Authenticated customers
- Guest customers
- Cart items
- Quantities
- Variant selection
- Pricing calculation
- Promotions
- Inventory validation
- Cart merging after authentication

The backend must remain authoritative for cart totals.

---

## 23. Checkout

Checkout is primarily an orchestration process.

Conceptually:

```text
Cart
 ↓
Validate
 ↓
Inventory
 ↓
Pricing
 ↓
Promotions
 ↓
Shipping
 ↓
Tax
 ↓
Payment
 ↓
Order
```

Checkout must not duplicate business logic that belongs to other domains.

---

## 24. Order Lifecycle

Orders will use explicit states rather than arbitrary status strings.

A simplified lifecycle may be:

```text
PENDING
   ↓
CONFIRMED
   ↓
PROCESSING
   ↓
SHIPPED
   ↓
DELIVERED
```

Additional states may include:

```text
CANCELLED
RETURN_REQUESTED
RETURNED
REFUNDED
```

Exact transitions will be defined in the commerce-rules documentation.

Invalid state transitions must be rejected by the backend.

---

## 25. Security Principles

Security is a first-class requirement.

The platform must follow:

- Principle of least privilege
- Server-side authorization
- Input validation
- Secure authentication
- Secure secret management
- Database constraints
- Transactional integrity
- Rate limiting where appropriate
- Protection against common web vulnerabilities
- Secure payment handling
- Audit logging
- Safe error handling
- No sensitive information in logs
- No secrets committed to source control

The frontend must never be treated as a trusted security boundary.

---

## 26. API Principles

The API should be:

- Versioned
- RESTful
- Consistent
- Validated
- Documented
- Secure
- Idempotent where appropriate

Initial API version:

```text
/api/v1/
```

Examples:

```text
/api/v1/products/
/api/v1/categories/
/api/v1/cart/
/api/v1/orders/
/api/v1/checkout/
/api/v1/wholesale/
```

Exact endpoints will be defined in the API architecture document.

---

## 27. Code Quality Principles

The project must prioritize:

- Readability
- Maintainability
- Explicit business logic
- Strong typing where applicable
- Small cohesive modules
- Reusable services
- Automated tests
- Clear naming
- Documentation
- Security
- Observability

Avoid premature abstraction.

Do not create abstractions simply because they appear architecturally sophisticated.

Every abstraction should solve an actual problem.

---

## 28. AI-Agent Development Rules

This project will be developed using an agentic AI workflow.

Antigravity will be used as the primary coding agent.

Supabase MCP will be used for database operations.

AI agents must follow the documentation in `/docs` before making architectural changes.

Agents must:

1. Read relevant documentation before modifying code.
2. Never invent business requirements.
3. Never silently change architectural decisions.
4. Never modify unrelated modules while implementing a task.
5. Prefer small, isolated changes.
6. Run relevant tests after changes.
7. Report failures instead of hiding them.
8. Never expose secrets.
9. Never directly manipulate production data during development.
10. Update documentation when an intentional architectural decision changes.

---

## 29. Sprint-Based Development

Implementation will happen in small, controlled sprints.

Each sprint should contain:

```text
1. Objective
2. Scope
3. Implementation
4. Tests
5. Verification
6. Review
```

A sprint should have a clearly defined completion condition.

Do not ask the AI agent to implement the entire application in one prompt.

---

## 30. Definition of Done

A feature is not considered complete merely because the code exists.

A feature is considered complete when:

- Implementation is complete.
- Relevant tests exist.
- Tests pass.
- API behavior is verified where applicable.
- Security considerations are addressed.
- Database constraints are verified.
- Error cases are handled.
- Documentation is updated if required.
- No unrelated functionality is broken.

---

## 31. Architecture Evolution

The architecture should support future growth without prematurely introducing distributed microservices.

The initial architecture is intentionally a:

**Modular Monolith**

This means:

```text
One backend application
        |
        ├── Accounts
        ├── Catalog
        ├── Inventory
        ├── Pricing
        ├── Cart
        ├── Orders
        ├── Payments
        ├── Shipping
        ├── Wholesale
        └── CMS
```

Modules remain logically separated.

If the platform eventually reaches a scale where independent services are justified, individual domains can be extracted later.

Do not introduce microservices merely for architectural appearance.

---

## 32. Current Locked Decisions

### Frontend

```text
Next.js
TypeScript
React
Tailwind CSS
```

### Backend

```text
Python
Django
Django REST Framework
```

### Database

```text
PostgreSQL
Supabase
```

### ORM

```text
Django ORM
```

### Authentication

```text
Supabase Auth
```

### Storage

```text
Supabase Storage
```

### Cache / Jobs

```text
Redis
Celery
```

### API

```text
REST
/api/v1/
```

### Architecture

```text
Modular Monolith
```

### Development

```text
Antigravity
AI-agent-driven development
Small implementation sprints
Supabase MCP for database operations
```

---

## 33. Important Architectural Rule

When there is uncertainty about implementation, the AI agent must prefer:

```text
Ask / flag uncertainty
```

over:

```text
Invent a business rule
```

If the agent does not know whether a wholesale customer can combine a coupon with wholesale pricing, it must not arbitrarily decide.

It should identify the ambiguity and refer to the relevant commerce-rules documentation or request a decision.

---

## 34. Source of Truth

The documentation directory is the project's architectural source of truth.

```text
/docs
```

contains the decisions that govern implementation.

Code implements the documented architecture.

The database implements the documented data model.

The frontend implements the documented user experience.

The AI agent implements the approved requirements.

---

## 35. Current Status

Architecture is currently in the design phase.

Completed decisions include:

- Business model
- Retail + wholesale strategy
- High-level architecture
- Frontend technology
- Backend technology
- Database platform
- Authentication platform
- Storage platform
- Modular backend domains
- AI-agent development workflow

Still to be finalized:

- Detailed database schema
- Detailed product model
- Detailed variant/options model
- Bundle/set behavior
- Pricing rules
- Wholesale rules
- Inventory rules
- Order state machine
- Payment lifecycle
- Shipping lifecycle
- API contracts
- Security implementation
- Deployment architecture
- Testing strategy
