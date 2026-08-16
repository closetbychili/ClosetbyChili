# Closet by Chilli --- Admin & Operations Architecture

## 1. Purpose

This document defines the administrative and operational architecture
for Closet by Chilli.

The admin system is the operational control plane for the business.

It must allow authorized staff to manage:

``` text
Catalog
Products
Variants
Inventory
Orders
Customers
Wholesale
Promotions
Content
Media
Operational settings
```

The admin application must be secure, auditable, predictable, and
resistant to accidental destructive actions.

------------------------------------------------------------------------

# 2. Admin Principles

The admin architecture follows:

``` text
Least privilege
Explicit permissions
Server-side authorization
Auditability
Safe defaults
Confirmation for destructive actions
Bulk-operation safeguards
Clear operational state
```

The admin interface is not trusted merely because it is hidden behind an
admin URL.

Every sensitive operation must be authorized by the backend.

------------------------------------------------------------------------

# 3. Admin Application Boundary

Conceptually:

``` text
Admin User
    |
    | Authenticated
    v
Admin Frontend
    |
    | Authorized API
    v
Django Backend
    |
    ├── Catalog
    ├── Inventory
    ├── Orders
    ├── Customers
    ├── Wholesale
    ├── Promotions
    ├── CMS
    └── Audit
```

------------------------------------------------------------------------

# 4. Admin Roles

The initial role model is:

``` text
STAFF
ADMIN
```

The exact permission granularity should follow the approved
authentication/authorization architecture.

Do not assume every staff member should have full administrative access.

------------------------------------------------------------------------

# 5. Least Privilege

Permissions should be granted according to operational responsibility.

Potential permission areas:

``` text
Catalog management
Inventory management
Order management
Customer management
Wholesale management
Promotion management
Content management
Media management
Reports
Settings
User/role management
```

------------------------------------------------------------------------

# 6. Example Permission Model

Conceptually:

``` text
Catalog Staff
    → Manage products/categories/media

Inventory Staff
    → Manage stock/adjustments

Order Staff
    → Process orders/cancellations/fulfillment

Wholesale Staff
    → Review wholesale applications

Content Staff
    → Manage homepage/CMS content

Admin
    → Full approved administrative capabilities
```

The final permission matrix must be business-approved.

------------------------------------------------------------------------

# 7. Admin Authentication

Admin users must authenticate through the approved authentication
architecture.

The frontend must not implement its own authorization system.

The backend must verify:

``` text
Authenticated identity
Role
Permission
Resource ownership/access
```

------------------------------------------------------------------------

# 8. Admin Session Security

Administrative sessions should use the same secure session principles
defined by the security architecture.

Additional protections may be considered for high-risk administrative
operations.

Examples:

``` text
Recent authentication
Step-up authentication
MFA where supported
Re-authentication for sensitive changes
```

These should be introduced based on the final security requirements.

------------------------------------------------------------------------

# 9. Admin Route Protection

All admin routes must be protected.

Conceptually:

``` text
/admin
/admin/products
/admin/orders
/admin/inventory
```

must never become publicly accessible merely because the frontend route
exists.

------------------------------------------------------------------------

# 10. Backend Authorization

Every administrative mutation must be authorized server-side.

Examples:

``` text
Create product
Update product
Delete/archive product
Adjust inventory
Cancel order
Approve wholesale customer
Create promotion
Change settings
```

Frontend visibility is not authorization.

------------------------------------------------------------------------

# 11. Admin Navigation

The admin navigation should be organized by business domain.

A conceptual structure:

``` text
Dashboard

Catalog
├── Products
├── Categories
├── Collections
└── Media

Orders
├── Orders
└── Fulfillment

Inventory
├── Stock
├── Adjustments
└── Low Stock

Customers
├── Customers
└── Wholesale

Marketing
├── Promotions
├── Collections
└── Content

Reports

Settings
```

The final navigation depends on Phase 1 scope.

------------------------------------------------------------------------

# 12. Admin Dashboard

The dashboard should prioritize operational information.

Potential widgets:

``` text
Orders today
Pending orders
Pending wholesale applications
Low-stock products
Recent orders
Recent inventory adjustments
Payment issues
Operational alerts
```

Do not overload the dashboard with decorative analytics.

------------------------------------------------------------------------

# 13. Dashboard Data

Dashboard data should be optimized for fast loading.

Avoid performing many independent expensive queries on every page load.

Prefer:

``` text
Aggregated queries
Cached read models where justified
Efficient database queries
```

------------------------------------------------------------------------

# 14. Catalog Management

Authorized staff should be able to manage:

``` text
Products
Categories
Collections
Variants
Product media
Pricing
Availability
SEO metadata where applicable
```

------------------------------------------------------------------------

# 15. Product Lifecycle

A product should have a clear lifecycle.

Conceptually:

``` text
Draft
  ↓
Published
  ↓
Active
  ↓
Archived
```

The exact status model should follow the approved domain model.

------------------------------------------------------------------------

# 16. Draft Products

Draft products should not become publicly purchasable merely because
they exist in the database.

The backend should explicitly enforce publication state.

------------------------------------------------------------------------

# 17. Publishing

Publishing a product should validate required information.

Potential checks:

``` text
Product name
Slug
Category
Pricing
At least required variant information
Primary image where required
Required description/content
```

The exact required fields depend on the final catalog rules.

------------------------------------------------------------------------

# 18. Unpublishing

Unpublishing should be deliberate.

Before unpublishing, consider:

``` text
Existing customer links
Open carts
Existing orders
SEO behavior
Promotional campaigns
```

Do not destroy historical order information.

------------------------------------------------------------------------

# 19. Product Editing

Product editing should clearly separate:

``` text
Customer-facing information
Operational information
Inventory information
SEO information
Media
```

This reduces accidental changes.

------------------------------------------------------------------------

# 20. Variant Management

Variants should be managed independently where the domain model requires
them.

Potential attributes:

``` text
Size
Color
SKU
Price
Inventory
Barcode where applicable
Availability
```

The final attribute model must follow the approved product/domain model.

------------------------------------------------------------------------

# 21. SKU Management

SKUs should be unique according to the database constraints.

Admin users should not be able to create duplicate SKUs.

The backend must enforce uniqueness.

------------------------------------------------------------------------

# 22. Pricing Management

Admin pricing operations must be server-authoritative.

Changing price should not retroactively modify historical orders.

Historical orders must preserve their recorded financial values.

------------------------------------------------------------------------

# 23. Price Changes

A product price change should affect:

``` text
Future purchases
```

unless an explicit promotion or business rule applies.

Existing orders should retain their original recorded price.

------------------------------------------------------------------------

# 24. Inventory Management

Inventory operations should support:

``` text
View stock
Adjust stock
Review stock movements
Identify low stock
```

Inventory should never be edited through arbitrary direct database
changes.

------------------------------------------------------------------------

# 25. Inventory Adjustments

Every manual adjustment should record:

``` text
Actor
Product/variant
Previous quantity
Adjustment
New quantity
Reason
Timestamp
```

This creates an operational audit trail.

------------------------------------------------------------------------

# 26. Inventory Adjustment Reasons

Potential reasons:

``` text
Stock received
Damaged
Lost
Correction
Return
Manual count
Other approved reason
```

The exact list should be configurable only if business requirements
justify it.

------------------------------------------------------------------------

# 27. Negative Inventory

The system should define whether negative inventory is allowed.

For normal customer-facing inventory:

``` text
Negative stock should generally be prevented.
```

Exceptional administrative corrections must follow explicit business
rules.

------------------------------------------------------------------------

# 28. Low Stock

Low-stock thresholds should be defined at the appropriate inventory
level.

Potentially:

``` text
Variant-level threshold
Product-level threshold
```

The final design should match the actual inventory model.

------------------------------------------------------------------------

# 29. Inventory History

Admin users should be able to inspect inventory movement history where
appropriate.

This helps investigate:

``` text
Unexpected stock changes
Overselling
Manual corrections
Returns
Receiving errors
```

------------------------------------------------------------------------

# 30. Order Management

Admin order management should provide:

``` text
Order list
Order detail
Customer information
Items
Pricing
Payment state
Fulfillment state
Shipping information
Order history
```

Sensitive payment information must not be exposed unnecessarily.

------------------------------------------------------------------------

# 31. Order State

Order state transitions must be controlled.

Conceptually:

``` text
Created
   ↓
Payment confirmed
   ↓
Processing
   ↓
Shipped
   ↓
Delivered
```

Other states may include:

``` text
Cancelled
Refunded
Failed
```

The exact state machine belongs to the approved order architecture.

------------------------------------------------------------------------

# 32. State Transition Rules

Admin users should not be able to arbitrarily set any order state.

For example:

``` text
Delivered
    ↓
Processing
```

should not be possible unless an explicit business operation supports
it.

------------------------------------------------------------------------

# 33. Order Cancellation

Cancellation must validate:

``` text
Current order state
Payment state
Fulfillment state
Authorization
```

If inventory or payment state must change, those changes should occur
through the approved business workflow.

------------------------------------------------------------------------

# 34. Refund Operations

Refunds are financially sensitive.

Admin refund operations must:

``` text
Verify authorization
Verify order/payment state
Use payment-provider APIs
Be idempotent where appropriate
Record the result
```

Never manually mark an order refunded without the appropriate payment
operation.

------------------------------------------------------------------------

# 35. Customer Management

Authorized staff may need to view:

``` text
Customer profile
Order history
Addresses where permitted
Account status
Wholesale status
```

Access to personal data must follow least privilege.

------------------------------------------------------------------------

# 36. Customer Editing

Admin users should only be able to modify fields explicitly approved for
administrative editing.

Do not expose unrestricted database-model editing.

------------------------------------------------------------------------

# 37. Customer Impersonation

If customer impersonation is ever implemented, it must have exceptional
safeguards.

Potential controls:

``` text
Explicit permission
Reason capture
Audit event
Visible impersonation indicator
Restricted duration
Easy exit
```

Do not silently impersonate customers.

------------------------------------------------------------------------

# 38. Wholesale Management

Wholesale operations are an important administrative domain because the
business serves both retail and wholesale customers.

Admin capabilities may include:

``` text
View applications
Review business information
Approve
Reject
Suspend
Reactivate
Review wholesale status
```

------------------------------------------------------------------------

# 39. Wholesale Approval

Approval should be an explicit workflow.

Conceptually:

``` text
Application submitted
       ↓
Pending review
       ↓
Approved / Rejected
```

Only authorized staff should approve wholesale access.

------------------------------------------------------------------------

# 40. Wholesale Suspension

Suspension should be auditable.

Record:

``` text
Actor
Reason
Previous status
New status
Timestamp
```

------------------------------------------------------------------------

# 41. Wholesale Pricing Security

Wholesale pricing must not become visible to unauthorized users because
of:

``` text
Frontend bugs
Cached responses
Incorrect API serialization
Admin configuration mistakes
```

The backend must enforce wholesale access.

------------------------------------------------------------------------

# 42. Promotions

Promotion management may include:

``` text
Promotion code
Discount type
Discount value
Start/end dates
Eligibility
Usage limits
Applicable products/categories
Status
```

The final promotion model depends on Phase 1 requirements.

------------------------------------------------------------------------

# 43. Promotion Safety

Promotion rules must be validated server-side.

Admin users should not be able to create logically invalid
configurations.

Examples:

``` text
Invalid date range
Negative discount
Impossible percentage
Conflicting conditions
```

------------------------------------------------------------------------

# 44. Promotion Preview

Where practical, the admin interface should provide a preview of how a
promotion behaves before activation.

This reduces accidental pricing errors.

------------------------------------------------------------------------

# 45. Content Management

If CMS functionality is included, authorized staff should manage:

``` text
Homepage sections
Banners
Campaign content
About content
Informational pages
```

Content should have clear publication state.

------------------------------------------------------------------------

# 46. Content Lifecycle

Conceptually:

``` text
Draft
  ↓
Review
  ↓
Published
  ↓
Archived
```

The exact workflow can be simplified for Phase 1 if a formal review
process is unnecessary.

------------------------------------------------------------------------

# 47. Homepage Management

The homepage should support the approved merchandising structure.

The admin should be able to manage:

``` text
Section visibility
Section ordering where appropriate
Featured products
Featured categories
Collections
Banners
```

The admin should not be able to accidentally break the frontend layout
by entering arbitrary unsupported configuration.

------------------------------------------------------------------------

# 48. Media Management

Admin media functionality should follow the media architecture.

Capabilities may include:

``` text
Upload
Preview
Reorder
Set primary
Edit alt text
Replace
Archive
```

------------------------------------------------------------------------

# 49. Bulk Operations

Bulk operations can improve catalog efficiency.

Potential operations:

``` text
Bulk publish
Bulk archive
Bulk category assignment
Bulk collection assignment
Bulk price update
Bulk inventory adjustment
Bulk media association
```

Only implement operations justified by actual workflow requirements.

------------------------------------------------------------------------

# 50. Bulk Operation Safety

Bulk actions should require appropriate safeguards.

For high-impact actions:

``` text
Show affected record count
Show preview
Require confirmation
Record actor
Record operation
Allow recovery where practical
```

------------------------------------------------------------------------

# 51. Bulk Operation Limits

Do not allow an unlimited bulk operation to overload the database.

Large jobs may need:

``` text
Background processing
Batching
Progress tracking
Retry
Failure reporting
```

------------------------------------------------------------------------

# 52. Audit Logging

Administrative actions should produce audit records where
business/security significance warrants it.

Examples:

``` text
Product publication
Price change
Inventory adjustment
Wholesale approval
Order cancellation
Refund
Promotion activation
Role/permission change
Settings change
```

------------------------------------------------------------------------

# 53. Audit Record

A useful audit record should contain:

``` text
Actor
Action
Resource
Resource identifier
Timestamp
Result
Request/correlation ID where available
Reason where required
```

Do not store unnecessary sensitive payloads.

------------------------------------------------------------------------

# 54. Audit Immutability

Normal admin users should not be able to modify or delete audit history.

Access to audit records must itself be permission-controlled.

------------------------------------------------------------------------

# 55. Admin Activity History

The admin interface may expose relevant activity history for operational
context.

Examples:

``` text
Recent inventory changes
Recent order changes
Recent product edits
Wholesale approval history
```

This should not replace the authoritative audit log.

------------------------------------------------------------------------

# 56. Destructive Actions

Destructive actions should require explicit confirmation.

Examples:

``` text
Delete media
Archive product
Cancel order
Refund payment
Remove promotion
```

The confirmation should clearly describe the consequence.

------------------------------------------------------------------------

# 57. Soft Delete vs Hard Delete

Use soft deletion/archive where historical relationships matter.

Examples:

``` text
Products
Categories
Customers
Promotions
```

Hard deletion should be reserved for data that is genuinely safe to
remove.

------------------------------------------------------------------------

# 58. Historical Data

Historical order and financial information must remain consistent.

Do not delete product/customer records in a way that destroys the
meaning of historical orders.

Use snapshots/references according to the approved order/data
architecture.

------------------------------------------------------------------------

# 59. Admin Search

Admin lists should support efficient search where useful.

Potential search areas:

``` text
Products
Orders
Customers
Wholesale applications
SKUs
```

Search must use controlled query parameters and efficient indexes.

------------------------------------------------------------------------

# 60. Admin Filtering

Filters should reflect actual operational needs.

Examples:

``` text
Order status
Payment status
Fulfillment status
Stock status
Wholesale status
Publication status
```

------------------------------------------------------------------------

# 61. Admin Pagination

Large admin datasets must be paginated.

Never load:

``` text
All orders
All customers
All products
```

into the browser by default.

------------------------------------------------------------------------

# 62. Admin Exports

If exports are required, they should be:

``` text
Permission-controlled
Audited where appropriate
Generated efficiently
Protected from excessive data extraction
```

Exports should not expose fields that the requesting user is not
authorized to see.

------------------------------------------------------------------------

# 63. Export Limits

Large exports may require:

``` text
Background job
Date filters
Record limits
Approval
```

depending on data sensitivity and infrastructure capacity.

------------------------------------------------------------------------

# 64. Admin Notifications

Operational notifications may be useful for:

``` text
Low stock
Payment issues
Wholesale applications
Failed jobs
Operational incidents
```

Do not create notification noise.

------------------------------------------------------------------------

# 65. Admin Settings

Settings should be categorized.

Potential groups:

``` text
Store settings
Commerce settings
Shipping settings
Payment settings
Notification settings
SEO settings
```

High-risk settings should have stronger permissions.

------------------------------------------------------------------------

# 66. Configuration Validation

Settings should be validated before saving.

Do not allow an admin to save configuration that makes the application
unusable.

------------------------------------------------------------------------

# 67. Feature Flags

If feature flags are introduced, they must be controlled securely.

A feature flag should not be treated as a security boundary.

Sensitive authorization must remain enforced independently.

------------------------------------------------------------------------

# 68. Admin Error Handling

Admin errors should be:

``` text
Clear
Actionable
Safe
```

Do not expose stack traces or database internals.

------------------------------------------------------------------------

# 69. Admin Performance

Admin performance should remain acceptable even as data grows.

Use:

``` text
Pagination
Indexes
Efficient queries
Aggregations
Lazy loading
Background jobs for expensive tasks
```

------------------------------------------------------------------------

# 70. Admin API Architecture

Admin APIs should follow the general API architecture.

Conceptually:

``` text
/api/v1/admin/products/
/api/v1/admin/orders/
/api/v1/admin/inventory/
/api/v1/admin/wholesale/
```

The exact endpoint organization must follow the approved backend
structure.

------------------------------------------------------------------------

# 71. Admin API Authorization

Every admin endpoint must explicitly enforce permissions.

Do not rely on the frontend hiding the endpoint.

------------------------------------------------------------------------

# 72. Admin API Testing

Every important admin operation should test:

``` text
Authorized user
Unauthorized user
Unauthenticated user
Wrong role
Invalid input
Invalid state transition
Ownership/access restrictions where applicable
Audit creation
Business-rule enforcement
```

------------------------------------------------------------------------

# 73. Admin Concurrency

Admin users may edit the same resource simultaneously.

The system should consider:

``` text
Concurrent inventory adjustments
Concurrent product edits
Concurrent order operations
```

Critical operations should use appropriate database
transaction/concurrency controls.

------------------------------------------------------------------------

# 74. Optimistic Concurrency

For resources where overwriting another admin's changes is dangerous,
consider optimistic concurrency.

Conceptually:

``` text
Resource version = 10

Admin A edits version 10
Admin B edits version 10

Admin A saves → version 11
Admin B attempts save version 10 → conflict
```

The exact mechanism depends on the implementation.

------------------------------------------------------------------------

# 75. Admin Audit + Correlation

Important administrative operations should connect:

``` text
Admin actor
Action
Resource
Request ID
Timestamp
Result
```

This enables effective incident investigation.

------------------------------------------------------------------------

# 76. Admin Security Checklist

``` text
[ ] Authentication required
[ ] Role/permission checked
[ ] Server-side authorization
[ ] Sensitive actions audited
[ ] Destructive actions confirmed
[ ] Personal data minimized
[ ] Payment actions protected
[ ] Bulk operations protected
[ ] Export permissions enforced
[ ] Errors do not leak internals
```

------------------------------------------------------------------------

# 77. Admin Definition of Done

An admin feature is complete when:

-   The permission requirement is defined.
-   Backend authorization is implemented.
-   UI access is restricted.
-   Validation exists.
-   Business rules are enforced.
-   Audit requirements are satisfied.
-   Destructive actions are protected.
-   Tests cover unauthorized access.
-   Performance is acceptable.
-   Documentation is updated.

------------------------------------------------------------------------

# 78. AI Agent Admin Rules

Antigravity must not:

-   Grant admin access to make development easier.
-   Hide an authorization failure by changing frontend behavior.
-   Allow arbitrary model-field editing.
-   Allow admins to directly manipulate payment state.
-   Allow inventory changes without an auditable operation.
-   Delete historical order data casually.
-   Create destructive bulk operations without safeguards.
-   Expose customer data unnecessarily.
-   Remove audit logging to simplify implementation.
-   Make private wholesale information public.
-   Bypass backend permission checks.

------------------------------------------------------------------------

# 79. Admin Change Workflow

Administrative functionality should follow:

``` text
Requirement
   ↓
Permission design
   ↓
API/domain implementation
   ↓
Admin UI
   ↓
Authorization tests
   ↓
Audit verification
   ↓
Operational testing
   ↓
Documentation
```

------------------------------------------------------------------------

# 80. Admin Architecture Summary

``` text
                         Admin User
                             |
                        Authentication
                             |
                        Authorization
                             |
                         Admin UI
                             |
                         Django API
                             |
        ┌────────────┬───────┼────────┬────────────┐
        ↓            ↓       ↓        ↓            ↓
     Catalog      Orders  Inventory Customers    Wholesale
        |            |       |        |            |
        └────────────┴───────┼────────┴────────────┘
                             ↓
                       PostgreSQL
                             |
                         Audit Log
```

The admin system is a business-critical control plane.

It must prioritize:

``` text
Correctness
Security
Auditability
Operational clarity
```

over unnecessary administrative complexity.

------------------------------------------------------------------------

# 81. Next Document

The next document should be:

``` text
19-wholesale-architecture.md
```

It will define the dual retail + wholesale business model in detail,
including:

-   Wholesale customer lifecycle.
-   Applications.
-   Approval/rejection.
-   Wholesale pricing.
-   Eligibility.
-   Wholesale catalog visibility.
-   Minimum order quantities where required.
-   Wholesale cart/checkout behavior.
-   Customer/account differences.
-   Staff workflows.
-   Wholesale security.
-   Auditability.
-   Pricing isolation.
-   Future scalability.
