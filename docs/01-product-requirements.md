# Closet by Chilli — Product Requirements

## 1. Document Purpose

This document defines the product requirements for the Closet by Chilli e-commerce platform.

It describes the business capabilities the platform must support and provides the functional foundation for subsequent architecture, database, API, frontend, security, and testing documentation.

This document is a product-level specification. Detailed implementation decisions belong in the corresponding technical documents.

---

## 2. Product Overview

Closet by Chilli is a fashion e-commerce platform serving two business models:

1. Retail / direct-to-consumer commerce.
2. Wholesale commerce.

Both business models operate through a shared platform and shared core catalog.

The platform must be designed as a production-ready system with strong security, maintainability, scalability, reliability, and operational visibility.

---

## 3. Business Goals

The platform should enable Closet by Chilli to:

- Present its fashion catalog professionally.
- Sell products directly to retail customers.
- Support wholesale customers.
- Manage products and variants.
- Manage inventory.
- Manage pricing.
- Process orders.
- Process payments.
- Manage shipping.
- Manage customer accounts.
- Manage wholesale customers.
- Manage homepage and merchandising content.
- Provide administrative tools for business operations.
- Support future growth without requiring a complete rewrite.

---

## 4. Target Users

The initial platform should account for the following user types.

### 4.1 Guest Visitor

A visitor who has not authenticated.

Capabilities should include:

- Browse the storefront.
- Browse categories.
- Browse collections.
- Search products.
- Filter and sort products.
- View product details.
- Add eligible products to a guest cart.
- Begin checkout.
- Create or authenticate an account.

---

### 4.2 Retail Customer

An authenticated direct-to-consumer customer.

Capabilities should include:

- Everything available to a guest where applicable.
- Manage profile.
- Manage addresses.
- Maintain a cart.
- Checkout.
- Make payments.
- View order history.
- View order details.
- Track eligible orders.
- Request supported cancellations/returns according to business rules.

---

### 4.3 Wholesale Applicant

A customer who has requested access to wholesale purchasing.

Capabilities should include:

- Submit wholesale application.
- Provide required business information.
- View application status.
- Receive approval/rejection status.

Wholesale access must not automatically be granted merely because a user has submitted an application.

---

### 4.4 Approved Wholesale Customer

An approved wholesale customer.

Capabilities should include, subject to the final wholesale rules:

- Access wholesale pricing.
- Purchase according to wholesale MOQ rules.
- Place wholesale orders.
- View wholesale order history.
- Manage business/customer information.
- Use wholesale-specific purchasing workflows.

---

### 4.5 Administrator / Staff

Internal business users.

The exact staff roles will be defined separately, but the platform should support controlled access to operational capabilities such as:

- Catalog management.
- Category management.
- Collection management.
- Inventory management.
- Pricing management.
- Order management.
- Customer management.
- Wholesale approval.
- CMS/content management.
- Promotions.
- Operational reporting.

Staff permissions must be role-based and follow least privilege.

---

## 5. Product Catalog Requirements

The catalog must support the initial business categories:

- Kurtis
- Kurta Sets
- Dresses
- Anarkali Sets
- Dupattas
- Bottom Wear
  - Pants
  - Palazzo

The catalog must support additional categories in the future without requiring schema redesign.

---

## 6. Product Requirements

Each product should support, where applicable:

- Name
- Slug
- Description
- Status
- Categories
- Collections
- Product images
- Variant information
- Attributes
- Options
- SKU information through variants
- Pricing
- Inventory
- Search metadata
- Merchandising information

Products should support lifecycle states such as:

- Draft
- Active
- Archived

The exact state machine will be defined in the technical design.

---

## 7. Product Variant Requirements

Products must support variants.

A variant represents a specific sellable configuration of a product.

Examples include combinations such as:

```text
Color: Blue
Size: M
```

Each sellable variant should support:

- SKU
- Variant options
- Inventory
- Availability
- Pricing where applicable
- Images where applicable

The variant is the primary inventory and cart/order reference.

---

## 8. Fashion Attributes and Options

The platform should be able to represent fashion-specific information such as:

- Size
- Color
- Fabric
- Pattern
- Occasion
- Sleeve
- Neckline
- Length

The architecture should distinguish between:

1. Variant-defining options.
2. Descriptive product attributes.

The system must remain extensible for future fashion attributes.

---

## 9. Product Images and Media

Products must support multiple images.

The system should support:

- Primary image.
- Gallery images.
- Ordering of images.
- Alternative text.
- Variant-specific images where required.

Media files should be stored through the configured storage system.

The database should store metadata and references rather than image binaries.

---

## 10. Categories

Categories represent the primary product taxonomy.

The category system should support:

- Parent categories.
- Child categories.
- Slugs.
- Descriptions where needed.
- Visibility/status.
- Ordering.
- SEO metadata where required.

Example:

```text
Bottom Wear
├── Pants
└── Palazzo
```

A product may belong to multiple categories where appropriate.

---

## 11. Collections

Collections are merchandising/editorial groupings rather than the primary taxonomy.

Initial examples include:

- New Arrivals
- Bestsellers
- Festive Collection

The platform should support future collections without code changes.

Products may belong to multiple collections.

Collections should support ordering and visibility.

---

## 12. Sets and Product Grouping

The platform must support merchandising concepts including:

- 2-Piece Sets
- 3-Piece Sets
- Co-ord Sets

Initially, these may be represented as normal products.

The architecture should remain extensible enough to support true product bundles/components if the business later requires independent component inventory.

Complex bundle behavior must not be implemented unless explicitly required.

---

## 13. Search

The storefront should support product search.

Search should eventually support relevant product information such as:

- Product name
- SKU where appropriate
- Category
- Collection
- Attributes
- Other searchable catalog metadata

Search must be designed so that the underlying implementation can evolve without changing the public product model.

---

## 14. Product Filtering

The storefront should support filters relevant to the catalog.

Potential filters include:

- Category
- Collection
- Price
- Size
- Color
- Availability
- Fabric
- Occasion
- Other relevant attributes

Only filters supported by actual catalog data should be exposed.

---

## 15. Product Sorting

The storefront should support sorting such as:

- Newest
- Price low to high
- Price high to low
- Popularity / bestsellers where supported
- Merchandising order where applicable

Sorting must be implemented through backend-supported query behavior rather than relying only on frontend sorting.

---

## 16. Homepage Requirements

The initial homepage order is:

1. New Arrivals
2. Shop by Category
3. Kurtis
4. 2-Piece Sets
5. 3-Piece Sets
6. Ethnic Dresses
7. Bestsellers
8. Festive Collection
9. About Closet by Chilli

The homepage should be configurable through the CMS/admin system.

The frontend should render the configured homepage rather than requiring code changes for every merchandising update.

---

## 17. Retail Shopping Requirements

Retail customers should be able to:

1. Discover products.
2. View product information.
3. Select a variant.
4. Add a variant to cart.
5. Update cart quantity.
6. Remove cart items.
7. Review calculated totals.
8. Apply eligible promotions.
9. Select shipping information.
10. Complete payment.
11. Receive an order confirmation.
12. View order history.

---

## 18. Guest Shopping

Guest users should be able to browse and use a cart before authentication.

The system should support a guest-to-authenticated-cart transition.

If a guest authenticates during shopping, the platform should apply an explicit cart merge policy.

The merge policy must be defined before implementation.

---

## 19. Cart Requirements

The cart must support:

- Product variant references.
- Quantity.
- Current availability validation.
- Price calculation.
- Promotion calculation where applicable.
- Subtotal calculation.
- Applicable shipping/tax calculations.
- Total calculation.

The backend is authoritative for cart calculations.

The client must not be trusted to submit authoritative prices or totals.

---

## 20. Checkout Requirements

Checkout should orchestrate:

```text
Cart
 ↓
Validation
 ↓
Inventory
 ↓
Pricing
 ↓
Promotion
 ↓
Shipping
 ↓
Tax
 ↓
Payment
 ↓
Order creation
```

Checkout must validate all relevant business conditions again on the server.

A client-side cart state must never be treated as sufficient proof that a purchase is valid.

---

## 21. Pricing Requirements

The platform must support separate pricing concepts for:

- Retail
- Wholesale
- Promotional pricing

The system should support quantity-based wholesale pricing.

Pricing must be centrally calculated by the backend.

The frontend may display calculated prices but must not be the source of truth.

---

## 22. Wholesale Requirements

Wholesale access should follow an explicit lifecycle:

```text
User
 ↓
Wholesale Application
 ↓
Review
 ↓
Approved / Rejected
 ↓
Wholesale Customer
```

Wholesale pricing and purchasing rules must only apply to eligible customers.

Wholesale requirements may include:

- MOQ.
- Tiered pricing.
- Business verification.
- Approval.
- Wholesale-specific payment rules.
- Wholesale-specific shipping rules.

Exact rules must be defined before implementation.

---

## 23. Inventory Requirements

Inventory must be tracked at the product-variant level.

The system should support:

- Available inventory.
- Reserved inventory.
- Inventory adjustments.
- Stock additions.
- Sales deductions.
- Returns.
- Damaged inventory.
- Reservation release.

Inventory operations must be auditable.

The system should protect against overselling through appropriate validation and transactional behavior.

---

## 24. Promotions Requirements

The platform should support promotional mechanisms such as:

- Coupon codes.
- Percentage discounts.
- Fixed discounts.
- Product-specific discounts.
- Category-specific discounts.
- Minimum cart value.
- Customer eligibility.
- Start/end dates.
- Usage limits.

Promotion stacking and wholesale eligibility must be explicitly defined before implementation.

---

## 25. Customer Account Requirements

Authenticated customers should be able to manage:

- Profile information.
- Contact information.
- Addresses.
- Orders.
- Account preferences where applicable.

Sensitive account operations must require appropriate authentication and authorization.

---

## 26. Order Requirements

An order should contain enough historical information to represent what the customer purchased at the time of checkout.

Order information should include, where applicable:

- Order number.
- Customer.
- Items.
- SKU.
- Product/variant snapshot.
- Quantity.
- Unit price.
- Discounts.
- Taxes.
- Shipping cost.
- Grand total.
- Shipping address snapshot.
- Billing information where required.
- Payment state.
- Fulfillment state.
- Timestamps.

Historical orders must not depend entirely on mutable current catalog records.

---

## 27. Order Lifecycle

The platform should support explicit order states.

A preliminary lifecycle is:

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

Exact state transitions must be documented and enforced by the backend.

---

## 28. Payment Requirements

Payments must be integrated through a dedicated payment abstraction.

The system should support:

- Payment initiation.
- Payment success.
- Payment failure.
- Payment retries.
- Payment verification.
- Payment reconciliation.
- Refunds where supported.

The backend must verify payment results using trusted provider-side information.

The client must not be trusted to declare that a payment succeeded.

---

## 29. Refund Requirements

The architecture should support:

- Full refunds.
- Partial refunds.
- Multiple refund events where necessary.
- Refund status.
- Refund reconciliation.

Refunds must be linked to the appropriate payment/order records.

---

## 30. Shipping Requirements

The platform should support:

- Shipping address.
- Shipping method.
- Shipping cost.
- Shipment creation.
- Tracking information.
- Shipment status.
- Delivery status.

The shipping architecture should allow future provider integrations.

An order may eventually contain multiple shipments if required.

---

## 31. Notifications

The platform should be designed to support transactional notifications such as:

- Account-related notifications.
- Order confirmation.
- Payment confirmation/failure.
- Shipment updates.
- Delivery updates.
- Wholesale application updates.
- Refund notifications.

Notification delivery should be separated from core request processing where appropriate.

---

## 32. CMS Requirements

The CMS should support controlled management of storefront content such as:

- Homepage sections.
- Banners.
- Promotional content.
- Collection presentation.
- About content.
- Other approved merchandising content.

CMS content should not require frontend code changes for routine content updates.

---

## 33. Administration Requirements

The internal administration system should eventually support:

### Catalog

- Products.
- Variants.
- Categories.
- Collections.
- Media.

### Commerce

- Orders.
- Customers.
- Payments.
- Refunds.
- Shipping.

### Inventory

- Stock.
- Adjustments.
- Inventory history.

### Wholesale

- Applications.
- Businesses.
- Approval status.
- Wholesale pricing/rules.

### Marketing

- Promotions.
- Coupons.
- Collections.
- Homepage merchandising.

### CMS

- Homepage sections.
- Banners.
- Content.

Access must be controlled by staff roles and permissions.

---

## 34. Auditability Requirements

Important administrative and financial operations should be auditable.

Examples include:

- Product changes.
- Price changes.
- Inventory adjustments.
- Wholesale approvals.
- Order status changes.
- Refund operations.
- Promotion changes.

Audit records should identify the relevant actor, action, resource and timestamp.

---

## 35. Security Requirements

Security is a core product requirement.

The platform must:

- Validate input server-side.
- Enforce authorization server-side.
- Protect secrets.
- Avoid exposing sensitive information.
- Use secure authentication.
- Protect administrative operations.
- Apply appropriate rate limiting.
- Maintain database integrity.
- Use secure payment flows.
- Avoid trusting client-provided financial values.
- Maintain auditability for sensitive operations.

---

## 36. Performance Requirements

The system should be designed for production performance.

Important areas include:

- Fast catalog browsing.
- Efficient product queries.
- Pagination.
- Appropriate database indexing.
- Caching where justified.
- Optimized media delivery.
- Efficient API responses.
- Background processing for expensive operations.

Performance optimizations must not compromise correctness or security.

---

## 37. Scalability Requirements

The initial architecture should support growth without requiring an immediate migration to microservices.

The backend should remain a modular monolith with clear domain boundaries.

The architecture should allow future scaling of:

- Application servers.
- Database resources.
- Caching.
- Background workers.
- Storage.
- External integrations.

Individual domains may be extracted into services later only when justified by real operational requirements.

---

## 38. Reliability Requirements

The platform should handle failures safely.

Examples:

- Payment failure must not create a false successful order.
- Inventory reservation failure must not allow checkout to proceed incorrectly.
- External provider failure should be recoverable where appropriate.
- Background jobs should support retries.
- Critical operations should be transactional where necessary.

---

## 39. Observability Requirements

The production system should provide sufficient visibility into:

- Application errors.
- API failures.
- Background job failures.
- Payment failures.
- Order failures.
- Important business events.
- Performance issues.

Logs must not expose secrets or unnecessary sensitive customer information.

---

## 40. Development and Delivery Requirements

Development will use small implementation sprints.

Each sprint should have:

- A clearly defined objective.
- Limited scope.
- Implementation tasks.
- Automated tests.
- Verification steps.
- A clear definition of done.

Antigravity will be used as the primary AI coding agent.

Supabase MCP will be used for database operations where appropriate.

AI agents must read the relevant project documentation before implementation.

---

## 41. Product Principles

The platform should follow these principles:

### Customer-first

The storefront should be intuitive, fast and trustworthy.

### Business-first

The system must support real operational workflows rather than only visual storefront requirements.

### Security-first

Security must be considered from the beginning, not added after implementation.

### Data integrity

Financial, inventory and order data must remain consistent and auditable.

### Maintainability

Code and architecture must remain understandable to future developers and AI agents.

### Extensibility

The platform should support future business requirements without unnecessary complexity.

### Controlled complexity

Do not build functionality that the business does not currently need simply because it may be useful someday.

---

## 42. Out of Scope Until Explicitly Approved

The following should not be implemented merely by assumption:

- Microservices.
- Complex product bundle inventory.
- Advanced loyalty programs.
- Marketplace/multi-vendor functionality.
- Subscription commerce.
- Complex recommendation engines.
- International multi-currency commerce.
- International tax systems.
- Advanced ERP synchronization.
- Complex warehouse management.
- Arbitrary third-party integrations.

Such functionality requires explicit product decisions before implementation.

---

## 43. Requirements Status

This document defines the current product-level requirements.

Detailed technical specifications will be defined in:

```text
docs/02-architecture.md
docs/03-tech-stack.md
docs/04-backend-architecture.md
docs/05-database-architecture.md
docs/06-domain-model.md
docs/07-api-architecture.md
docs/08-authentication-authorization.md
docs/09-commerce-rules.md
docs/10-retail-wholesale.md
docs/11-inventory-pricing.md
docs/12-orders-payments-shipping.md
docs/13-frontend-architecture.md
docs/14-design-system.md
docs/15-security.md
docs/16-testing.md
docs/17-devops-deployment.md
docs/18-observability.md
docs/19-development-workflow.md
docs/20-ai-agent-rules.md
docs/21-environment-configuration.md
```

Any requirement that is not explicitly documented should not be invented by an implementation agent.
