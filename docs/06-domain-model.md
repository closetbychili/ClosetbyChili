# Closet by Chilli — Domain Model

## 1. Purpose

This document defines the business domain model for Closet by Chilli.

It sits between the high-level architecture and the physical database schema.

The domain model answers:

- What business entities exist?
- What does each entity represent?
- Which entity owns which information?
- How do entities relate?
- What are the important lifecycle states?
- Which rules differ between retail and wholesale?
- Which data must remain historically immutable?

The domain model must be reviewed before implementing the complete database schema.

---

# 2. Domain Principles

The platform serves two related business channels:

```text
                 Closet by Chilli
                        |
              ┌─────────┴─────────┐
              │                   │
           Retail              Wholesale
              │                   │
              └─────────┬─────────┘
                        |
                  Shared Catalog
                        |
              Shared Commerce Core
```

Retail and wholesale should share core entities whenever the underlying business concept is the same.

The system should avoid maintaining separate duplicate catalogs, order systems or inventory systems.

---

# 3. Domain Areas

The initial domain is divided into:

```text
Accounts
Catalog
Categories
Collections
Media
Pricing
Promotions
Inventory
Cart
Checkout
Orders
Payments
Shipping
Wholesale
CMS
Notifications
Audit
```

---

# 4. Accounts Domain

## 4.1 User

### Purpose

Represents the application's authenticated customer identity.

A User connects authentication identity with commerce information.

### Responsibilities

- Identify the customer.
- Connect to profile information.
- Own carts.
- Own addresses.
- Own orders.
- Connect to wholesale status.

### Relationships

```text
User
 ├── CustomerProfile
 ├── Addresses
 ├── Cart
 ├── Orders
 └── WholesaleProfile
```

---

# 5. Customer Profile

## 5.1 CustomerProfile

Represents commerce-specific customer information.

It should not duplicate authentication secrets.

Potential information includes:

- Display/name information.
- Contact information where required.
- Account preferences.
- Customer status.

The exact fields should be finalized during schema design.

---

# 6. Address

## 6.1 Address

Represents a customer's saved address.

An address may be used for:

```text
Shipping
Billing
```

A customer may have multiple addresses.

### Important rule

Historical orders must retain the address information relevant to the order.

Changing a customer's saved address must not rewrite the address displayed on an old order.

---

# 7. Catalog Domain

## 7.1 Product

Represents a merchandise concept displayed in the storefront.

Examples:

```text
A Kurti
A Kurta Set
An Anarkali Set
A Dress
A Dupatta
A Bottom Wear product
```

A Product is not necessarily the exact inventory unit.

It owns product-level information such as:

- Name.
- Description.
- Brand/product information.
- Category association.
- Product media.
- Merchandising state.
- Product-level attributes.

---

# 8. Product Variant

## 8.1 ProductVariant

Represents a specific purchasable configuration of a Product.

A variant may differ by:

- Size.
- Color.
- Other product options.

Example:

```text
Product:
Floral Anarkali Set

Variants:
S / Pink
M / Pink
L / Pink
S / Blue
M / Blue
L / Blue
```

Each sellable variant should have a unique SKU.

---

# 9. SKU

## 9.1 SKU

A SKU identifies a sellable inventory unit/configuration.

Properties:

- Unique.
- Stable.
- Used by inventory.
- Used by order items.
- Suitable for operational identification.

The backend must not depend on a frontend-generated SKU.

---

# 10. Product Attributes

Products and variants may require structured attributes.

Examples:

```text
Fabric
Color
Size
Pattern
Occasion
Sleeve Type
Neck Type
Length
```

The final attribute architecture should avoid unnecessary complexity.

Only attributes required by the actual catalog should be introduced.

---

# 11. Category

## 11.1 Category

Represents product taxonomy.

Initial business categories supplied for Closet by Chilli include:

```text
Kurtis
Kurta Sets
Dresses
Anarkali Sets
Dupattas
Bottom Wear
```

Bottom Wear may expose product-type distinctions such as:

```text
Pants
Palazzo
```

Categories answer:

> What type of product is this?

---

# 12. Category Hierarchy

Categories may support parent/child relationships.

Example:

```text
Bottom Wear
 ├── Pants
 └── Palazzo
```

The hierarchy should only be introduced where it improves navigation and merchandising.

Do not create unnecessary category depth.

---

# 13. Collection

## 13.1 Collection

A Collection is a merchandising grouping rather than a permanent taxonomy.

Examples from the planned homepage/business structure include:

```text
New Arrivals
Bestsellers
Festive Collection
```

Collections answer:

> How do we want to merchandise these products right now?

A product may belong to multiple collections.

---

# 14. Shop-by-Set Domain

The business also groups products by set structure.

Initial groupings:

```text
2-Piece Sets
3-Piece Sets
Co-ord Sets
```

These may be implemented as categories, collections, product attributes, or a combination depending on the final merchandising requirements.

The implementation must avoid creating duplicate product records solely because a product appears in a set grouping.

---

# 15. Media

## 15.1 MediaAsset

Represents a product/content media asset.

Actual binary files are stored in Supabase Storage.

The domain stores metadata and references.

Potential information:

```text
Storage path
Alt text
Media type
Ordering
Related entity
Active state
```

---

# 16. Pricing Domain

## 16.1 Price

Represents a monetary price applicable to a product variant or defined pricing context.

The platform must support the client's dual business model:

```text
Retail pricing
Wholesale pricing
```

Pricing should therefore not be reduced to one permanent `product.price` value.

---

# 17. Retail Pricing

Retail pricing is the price shown to normal retail customers subject to applicable promotions.

Conceptually:

```text
Variant
   |
Retail Price
   |
Promotions
   |
Final Retail Price
```

---

# 18. Wholesale Pricing

Wholesale pricing is available only to eligible wholesale customers.

Conceptually:

```text
Variant
   |
Wholesale Price / Rule
   |
Wholesale Eligibility
   |
Final Wholesale Price
```

Wholesale pricing must never be exposed to an unauthorized retail customer merely because the client application requested the value.

Authorization must be enforced server-side.

---

# 19. Price Resolution

The backend should determine the authoritative price.

Conceptually:

```text
Customer
   |
Determine channel
   |
Retail / Wholesale
   |
Resolve applicable price
   |
Apply valid promotion/rule
   |
Final price
```

The browser must not submit the final price as authoritative.

---

# 20. Promotion

## 20.1 Promotion

Represents a business rule capable of changing the price or applying a benefit.

Examples may include:

```text
Percentage discount
Fixed discount
Collection promotion
Category promotion
Customer eligibility promotion
```

The exact promotion types will be defined in the commerce rules document.

---

# 21. Coupon

## 21.1 Coupon

A Coupon is a customer-entered promotion code.

A coupon may have:

- Code.
- Active state.
- Validity period.
- Usage restrictions.
- Eligibility rules.
- Discount rules.

Coupon validation must occur on the backend.

---

# 22. Inventory Domain

## 22.1 InventoryItem

Represents stock state for a sellable product variant.

Conceptually:

```text
ProductVariant
      |
InventoryItem
```

The inventory system must distinguish stock that is:

```text
Available
Reserved
Consumed/Fulfilled
```

The exact fields and calculation model will be defined in the inventory document.

---

# 23. Inventory Movement

## 23.1 InventoryMovement

Represents an auditable change in inventory.

Examples:

```text
Stock received
Manual adjustment
Reservation
Reservation release
Order fulfillment
Return
Damage
```

Inventory history should not be silently rewritten.

---

# 24. Inventory Reservation

## 24.1 InventoryReservation

Represents a temporary claim on available stock.

Example lifecycle:

```text
Created
   ↓
Active
   ├── Released
   └── Finalized
```

Reservations must be safe under concurrent checkout requests.

---

# 25. Cart Domain

## 25.1 Cart

Represents a customer's current shopping session/state.

A cart may be:

```text
Guest
Authenticated
```

A cart is mutable and temporary.

It is not a historical financial record.

---

# 26. Cart Item

## 26.1 CartItem

Represents a selected product variant and quantity in a cart.

It should reference:

```text
ProductVariant
Quantity
```

The backend resolves current:

- Availability.
- Price.
- Discounts.
- Totals.

when required.

---

# 27. Guest Cart

Guest shopping should be supported where required by the Phase 1 storefront.

A guest cart may be associated with a secure anonymous identifier.

The anonymous identifier must not expose sensitive customer data.

---

# 28. Cart Merge

When a guest customer signs in, the system may need to merge:

```text
Guest Cart
     +
Customer Cart
     ↓
Merged Cart
```

The merge operation must define behavior for:

- Duplicate variants.
- Quantity limits.
- Unavailable items.
- Pricing changes.

This behavior should be implemented as an explicit business operation.

---

# 29. Checkout Domain

## 29.1 Checkout

Checkout represents the orchestration process that converts a cart into an order/payment workflow.

Checkout is not simply a database table.

It coordinates:

```text
Cart
 ↓
Customer
 ↓
Address
 ↓
Pricing
 ↓
Promotions
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

# 30. Checkout Validation

Before finalizing an order, the backend should validate:

- Cart contents.
- Variant availability.
- Quantity.
- Current prices.
- Promotion validity.
- Customer eligibility.
- Shipping information.
- Payment requirements.

The final values must be calculated by the backend.

---

# 31. Order Domain

## 31.1 Order

Represents the historical commercial transaction.

An Order is created only after the checkout process reaches the appropriate state.

An order owns:

- Order number.
- Customer reference.
- Items.
- Financial totals.
- Address snapshots.
- Payment relationships.
- Shipment relationships.
- Status/history.

---

# 32. Order Number

Order number is a customer/operations-facing identifier.

It should be:

- Unique.
- Stable.
- Safe to reference operationally.
- Independent of the customer's internal database identity.

---

# 33. Order Item

## 33.1 OrderItem

Represents one purchased line in an order.

It should preserve historical information including:

```text
Product identity
Product/variant display name
SKU
Selected variant details
Quantity
Unit price
Discount
Line total
```

Historical order information must not change merely because the catalog changes later.

---

# 34. Order Financial Snapshot

An order should preserve the authoritative financial state at the time of purchase.

Conceptually:

```text
Subtotal
+ Shipping
+ Tax where applicable
- Discounts
= Final Total
```

The exact tax and shipping behavior will be defined separately.

---

# 35. Order Status

Order lifecycle should use controlled transitions.

Initial conceptual states:

```text
PENDING
CONFIRMED
PROCESSING
SHIPPED
DELIVERED
CANCELLED
RETURNED
REFUNDED
```

The final state machine is defined in the orders/payments/shipping documentation.

---

# 36. Payment Domain

## 36.1 Payment

Represents the payment relationship associated with an order.

Payment state must be independent from frontend state.

---

# 37. Payment Attempt

## 37.1 PaymentAttempt

Represents an individual attempt to collect payment.

An order may have:

```text
Payment Attempt #1 → Failed
Payment Attempt #2 → Successful
```

This prevents payment retries from corrupting the order record.

---

# 38. Payment Provider Event

## 38.1 PaymentWebhookEvent

Represents an external event received from the payment provider.

The event should support:

- Verification.
- Idempotency.
- Processing status.
- Auditability.

The exact provider is not yet locked.

---

# 39. Refund

## 39.1 Refund

Represents money returned to a customer.

A refund is associated with a payment/order context and must have its own status and provider reference.

Refund processing must be safe against duplicate requests.

---

# 40. Shipping Domain

## 40.1 Shipment

Represents the fulfillment/shipping process for an order or order portion.

Potential information:

```text
Order
Carrier
Tracking number
Status
Shipping method
Timestamps
```

The domain should allow multiple shipments later if business requirements require split fulfillment.

---

# 41. Shipping Status

Potential lifecycle:

```text
PENDING
PACKED
SHIPPED
IN_TRANSIT
DELIVERED
FAILED
RETURNED
```

Final states depend on the selected shipping provider and operational process.

---

# 42. Wholesale Domain

## 42.1 WholesaleApplication

Represents a request from a customer/business to become eligible for wholesale purchasing.

Potential lifecycle:

```text
PENDING
UNDER_REVIEW
APPROVED
REJECTED
SUSPENDED
```

The exact workflow will be finalized during wholesale implementation.

---

# 43. WholesaleProfile

## 43.1 WholesaleProfile

Represents the approved wholesale business/customer relationship.

Potential information:

```text
Business name
Business information
Approval status
Wholesale pricing eligibility
Operational metadata
```

Sensitive business information should be protected appropriately.

---

# 44. Wholesale Authorization

Wholesale access is not determined by:

```text
Frontend route
URL
Hidden UI
Submitted flag
```

It is determined by backend authorization based on the customer's actual wholesale state.

---

# 45. Retail vs Wholesale

The same Product and ProductVariant should generally serve both channels.

Example:

```text
                    Product
                       |
                Product Variant
                 /                           /                     Retail Context    Wholesale Context
             |                  |
        Retail Price       Wholesale Price
```

Inventory remains shared unless the business explicitly requires separate stock pools.

---

# 46. Shared Inventory

By default, retail and wholesale should consume from the same inventory model.

Example:

```text
Variant: ABC-001
Available: 50

Retail purchase: 5
Wholesale purchase: 10

Remaining: 35
```

The system must prevent one channel from bypassing inventory controls.

---

# 47. Wholesale Minimums

If wholesale purchasing requires minimum quantities, case packs, minimum order values or similar rules, those are business rules rather than reasons to create a second catalog.

They should be enforced during:

```text
Cart validation
Checkout validation
Order creation
```

The exact rules must be documented once confirmed by the client.

---

# 48. CMS Domain

## 48.1 CMS Page

Represents a content-managed storefront page or page configuration.

---

# 49. CMS Section

Represents a reusable/content section.

The planned homepage order includes:

```text
New Arrivals
Shop by Category
Kurtis
2-Piece Sets
3-Piece Sets
Ethnic Dresses
Bestsellers
Festive Collection
About Closet by Chilli
```

The CMS architecture should support this merchandising structure without requiring code changes for every content reorder.

---

# 50. Homepage Merchandising

The homepage should be modeled as configurable content/merchandising rather than hard-coded permanently into React components.

Conceptually:

```text
Homepage
   |
   ├── Section
   ├── Section
   ├── Section
   └── Section
```

Each section may reference products, categories, collections or content depending on its type.

---

# 51. Notification Domain

## 51.1 Notification

Represents an application event or communication intended for a customer/administrator.

Potential events:

```text
Order confirmation
Payment confirmation
Shipment update
Delivery update
Wholesale application update
```

Actual delivery may happen asynchronously.

---

# 52. Audit Domain

## 52.1 AuditEvent

Represents a record of an important system/business action.

Examples:

```text
Product created
Price changed
Inventory adjusted
Wholesale approved
Order cancelled
Refund processed
```

Audit events should support operational investigation.

---

# 53. Entity Ownership

A domain should own its own business state.

Examples:

```text
Catalog
  → Product / ProductVariant

Inventory
  → Stock / Reservations / Movements

Orders
  → Order / OrderItem

Payments
  → Payment / PaymentAttempt / WebhookEvent / Refund

Wholesale
  → WholesaleApplication / WholesaleProfile
```

Other domains may reference these entities but should not silently mutate their state.

---

# 54. Cross-Domain Operations

Cross-domain operations should use services.

Example:

```text
CheckoutService
    |
    ├── Catalog validation
    ├── Pricing
    ├── Promotion
    ├── Inventory
    ├── Payment
    └── Order
```

This preserves domain ownership.

---

# 55. Historical Immutability

The following should generally be treated as historical records once finalized:

```text
Order
OrderItem
Payment Attempt
Refund
Inventory Movement
Audit Event
```

Corrections should be represented through additional records/state changes where appropriate instead of silently rewriting history.

---

# 56. Product Lifecycle

A product should have an explicit lifecycle such as:

```text
Draft
   ↓
Active
   ↓
Inactive / Archived
```

The exact status vocabulary should be finalized during catalog implementation.

Deleting a product should not destroy historical order information.

---

# 57. Variant Lifecycle

Variants may independently become unavailable even when the parent product remains active.

Example:

```text
Product: Active

Variant S: Available
Variant M: Available
Variant L: Out of Stock
Variant XL: Inactive
```

Product visibility and variant availability must therefore be separate concepts.

---

# 58. Inventory Lifecycle

Conceptually:

```text
Stock Received
      ↓
Available
      ↓
Reserved
   ↙     ↘
Released  Consumed
            ↓
        Fulfilled
```

Exact behavior depends on the checkout/order state machine.

---

# 59. Promotion Lifecycle

Conceptually:

```text
Draft
  ↓
Scheduled
  ↓
Active
  ↓
Expired
```

The system should calculate whether a promotion is currently valid rather than trusting a frontend flag.

---

# 60. Wholesale Application Lifecycle

Conceptually:

```text
Submitted
   ↓
Pending Review
   ├── Approved
   └── Rejected
```

An approved account may later become:

```text
Suspended
```

if business rules require it.

---

# 61. Order Lifecycle

A simplified model:

```text
Checkout
   ↓
Pending
   ↓
Confirmed
   ↓
Processing
   ↓
Shipped
   ↓
Delivered
```

Alternative paths may include:

```text
Pending → Cancelled
Confirmed → Cancelled
Delivered → Returned
Returned → Refunded
```

The exact permitted transitions will be defined separately.

---

# 62. Payment Lifecycle

A simplified conceptual lifecycle:

```text
Created
  ↓
Pending
  ├── Failed
  └── Succeeded
```

A successful payment may later have:

```text
Refund Requested
    ↓
Refunded / Partially Refunded
```

---

# 63. Shipment Lifecycle

Conceptually:

```text
Pending
  ↓
Packed
  ↓
Shipped
  ↓
In Transit
  ↓
Delivered
```

Provider failures or returns must be represented explicitly.

---

# 64. Retail Customer Journey

Domain sequence:

```text
Browse Catalog
      ↓
View Product
      ↓
Select Variant
      ↓
Add to Cart
      ↓
Checkout
      ↓
Payment
      ↓
Order
      ↓
Shipment
      ↓
Delivery
```

---

# 65. Wholesale Customer Journey

Conceptually:

```text
Register/Login
      ↓
Wholesale Application
      ↓
Review
      ↓
Approval
      ↓
Wholesale Catalog/Pricing
      ↓
Cart
      ↓
Wholesale Checkout
      ↓
Order
      ↓
Fulfillment
```

The wholesale journey uses the shared catalog/order/inventory infrastructure.

---

# 66. Domain Rules for Client/Frontend

The frontend may display:

- Product information.
- Available prices.
- Availability.
- Promotions.
- Order status.

But it must not be the authoritative source for:

```text
Price
Inventory
Discount
Tax
Payment status
Wholesale authorization
Order status
```

These belong to the backend/domain.

---

# 67. Domain Rules for AI Agents

Before creating an entity, the agent must ask:

1. Does an existing entity already represent this concept?
2. Which domain owns it?
3. Is it persistent state or a calculated concept?
4. Does it require historical storage?
5. Does it need a lifecycle?
6. Does it require database constraints?
7. Does it need an audit trail?
8. Does it differ between retail and wholesale?

This prevents unnecessary tables and duplicated concepts.

---

# 68. Conceptual Entity Map

```text
                         User
                          |
          ┌───────────────┼────────────────┐
          |               |                |
       Profile         Addresses          Cart
          |                                |
   WholesaleProfile                    CartItems
          |                                |
 WholesaleApplication                ProductVariant
                                           |
                    ┌──────────────────────┼─────────────────┐
                    |                      |                 |
                 Product                Pricing          Inventory
                    |                                        |
          ┌─────────┼─────────┐                        Movements
          |         |         |                        Reservations
       Category  Collection  Media
                    |
                Promotion
                    |
                  Coupon

Cart
 |
Checkout
 |
Order
 ├── OrderItems
 ├── Payments
 │    ├── Attempts
 │    ├── Webhook Events
 │    └── Refunds
 └── Shipments
```

---

# 69. Domain Boundaries Summary

| Domain | Primary responsibility |
|---|---|
| Accounts | Customer identity and profile |
| Catalog | Products and variants |
| Categories | Product taxonomy |
| Collections | Merchandising groups |
| Media | Media metadata |
| Pricing | Price resolution |
| Promotions | Discount rules |
| Inventory | Stock and reservations |
| Cart | Current shopping state |
| Checkout | Commerce orchestration |
| Orders | Historical transactions |
| Payments | Payment lifecycle |
| Shipping | Fulfillment/shipment lifecycle |
| Wholesale | Wholesale eligibility |
| CMS | Storefront content |
| Notifications | Communications |
| Audit | Business/system history |

---

# 70. Domain Model Definition of Done

The domain model is considered ready for implementation when:

- Each required business concept has an owner.
- Duplicate concepts have been eliminated.
- Retail and wholesale responsibilities are clear.
- Product/variant behavior is clear.
- Inventory ownership is clear.
- Pricing ownership is clear.
- Order history requirements are clear.
- Payment ownership is clear.
- Lifecycle states are documented.
- Cross-domain operations are identified.
- Historical data requirements are understood.

---

# 71. Next Document

The next document is:

```text
07-api-architecture.md
```

It will define the REST API contract at an implementation level, including:

- Endpoint structure.
- HTTP methods.
- Request/response conventions.
- Authentication requirements.
- Permissions.
- Pagination.
- Filtering.
- Sorting.
- Error format.
- API versioning.
- Catalog endpoints.
- Cart endpoints.
- Checkout endpoints.
- Order endpoints.
- Wholesale endpoints.
- Admin/operations API boundaries.
