# Closet by Chilli --- Admin Panel Architecture

## 1. Purpose

This document defines the architecture for the internal administration
platform of Closet by Chilli.

The admin panel is an operational application for authorized staff to
manage:

``` text
Products
Categories
Collections
Media
Inventory
Orders
Customers
Wholesale accounts
Promotions
Notifications
Merchandising
Operational configuration
```

The admin panel is a privileged system and must be treated as a separate
security boundary from the public storefront.

------------------------------------------------------------------------

# 2. Admin Principles

The admin platform follows:

``` text
Least privilege
Explicit permissions
Server-side authorization
Auditability
Safe destructive operations
Operational visibility
Bulk-operation safeguards
Clear separation of public/customer/admin APIs
```

------------------------------------------------------------------------

# 3. Admin Architecture

Conceptually:

``` text
Admin User
    ↓
Admin Frontend
    ↓
Django Admin API
    ↓
Authorization / Permissions
    ↓
Domain Services
    ↓
PostgreSQL / Storage / Providers
```

The admin frontend must never bypass Django/domain authorization simply
because it is an internal application.

------------------------------------------------------------------------

# 4. Admin Authentication

Admin authentication should use the approved authentication
architecture.

Administrative access should have stronger security controls than
ordinary storefront browsing.

Recommended production capability:

``` text
Strong authentication
+
MFA for privileged roles
+
Session security
+
Audit logging
```

The exact MFA implementation follows the authentication/security
architecture.

------------------------------------------------------------------------

# 5. Admin Session Security

Admin sessions should have appropriate:

``` text
Expiration
Secure cookies/tokens
Revocation
Idle timeout where appropriate
Re-authentication for sensitive operations
```

Do not leave privileged sessions indefinitely valid without an explicit
security decision.

------------------------------------------------------------------------

# 6. Admin Roles

The exact roles should be finalized according to business operations.

A possible model:

``` text
Super Admin
Catalog Manager
Inventory Manager
Order Manager
Customer Support
Wholesale Manager
Marketing/Content Manager
Finance/Operations
```

Roles should grant permissions rather than direct database access.

------------------------------------------------------------------------

# 7. Permission Model

Permissions should be action-oriented.

Examples:

``` text
product.read
product.create
product.update
product.publish
product.archive

order.read
order.update
order.cancel
order.refund

customer.read
customer.update

wholesale.read
wholesale.review
wholesale.approve
wholesale.suspend
```

The final permission catalogue should reflect actual operations.

------------------------------------------------------------------------

# 8. Least Privilege

A staff member should receive only the permissions needed for their job.

For example:

``` text
Catalog Manager
→ Product/category/collection/media operations

Order Manager
→ Order/fulfillment operations

Support
→ Customer/order read and approved support actions
```

Avoid using a single unrestricted `admin` permission for all staff.

------------------------------------------------------------------------

# 9. Super Admin

A super-admin capability may exist for platform ownership and emergency
administration.

It should be:

``` text
Rarely assigned
Strongly protected
Audited
```

------------------------------------------------------------------------

# 10. Permission Enforcement

Permissions must be enforced server-side.

Frontend route guards are useful for UX but are not security controls.

Every admin API mutation must independently verify authorization.

------------------------------------------------------------------------

# 11. Admin API Boundary

Admin endpoints should be clearly separated from public/customer APIs.

Conceptually:

``` text
/api/v1/...
```

for storefront/customer APIs and an explicit admin namespace such as:

``` text
/api/v1/admin/...
```

The exact route convention follows the API architecture.

------------------------------------------------------------------------

# 12. Admin Response Models

Admin responses may contain operational fields not suitable for
customers.

However, admin APIs should still use explicit serializers/schemas.

Do not expose unrestricted database models.

------------------------------------------------------------------------

# 13. Admin Dashboard

The dashboard should provide an operational overview rather than
attempting to render every system detail.

Potential metrics:

``` text
Orders today
Revenue where appropriate
Pending orders
Low-stock products
Wholesale applications
Failed payments
Pending returns
Notification failures
```

The exact dashboard metrics should be business-approved.

------------------------------------------------------------------------

# 14. Dashboard Performance

Dashboard widgets should use focused queries.

Avoid loading:

``` text
All orders
All customers
All products
```

just to calculate a small metric.

Use appropriate aggregate queries or precomputed metrics.

------------------------------------------------------------------------

# 15. Product Management

Admins with appropriate permissions should be able to:

``` text
Create products
Edit products
Manage variants
Manage pricing
Manage media
Assign categories
Assign collections
Publish
Archive
```

------------------------------------------------------------------------

# 16. Product Draft Workflow

Products should support a controlled lifecycle such as:

``` text
Draft
   ↓
Review
   ↓
Published
   ↓
Archived
```

The exact workflow can be simplified for Phase 1 if required.

------------------------------------------------------------------------

# 17. Product Publishing

Publishing should validate required information.

Potential checks:

``` text
Product name
Slug
Category
Pricing
Required media
Variant configuration
Availability configuration
```

Do not publish incomplete products merely because the admin clicked
Publish.

------------------------------------------------------------------------

# 18. Product Editing

Editing should validate business invariants.

For example:

``` text
Valid pricing
Valid variants
Valid category relationships
Valid media
```

------------------------------------------------------------------------

# 19. Product Price Changes

Price changes are commercially sensitive.

The admin permission to modify pricing should be restricted and audited.

------------------------------------------------------------------------

# 20. Price Change Audit

Record appropriate information such as:

``` text
Who changed it
When
Which product/variant
Previous value
New value
```

Do not expose internal pricing history to customers unless explicitly
required.

------------------------------------------------------------------------

# 21. Variant Management

Admins should be able to manage:

``` text
Size
Color
SKU
Price where applicable
Inventory linkage
Variant media
Availability
```

The exact fields follow the product architecture.

------------------------------------------------------------------------

# 22. SKU Management

SKUs should be unique according to the database/business rules.

Admins should not be able to accidentally create duplicate identifiers.

------------------------------------------------------------------------

# 23. Category Management

Admins with catalog permissions may:

``` text
Create
Edit
Reorder
Publish/hide
Archive
```

categories.

Category changes should consider existing product relationships.

------------------------------------------------------------------------

# 24. Collection Management

Admins may manage:

``` text
New Arrivals
Bestsellers
Festive Collection
Other merchandising collections
```

Collections should reference products rather than duplicate product
records.

------------------------------------------------------------------------

# 25. Merchandising

Merchandising operations may include:

``` text
Product ordering
Featured products
Collection ordering
Homepage sections
```

The exact merchandising capabilities should be business-configurable.

------------------------------------------------------------------------

# 26. Homepage Management

The admin should not hard-code homepage product IDs into the frontend.

Where merchandising is configurable, the admin controls the underlying:

``` text
Collection
Ordering
Featured status
Visibility
```

------------------------------------------------------------------------

# 27. Media Management

Admins with appropriate permissions may:

``` text
Upload media
Preview media
Associate media
Reorder media
Replace media
Archive/delete media
```

Media rules are defined by the media-storage architecture.

------------------------------------------------------------------------

# 28. Media Security

Admin uploads must follow:

``` text
File validation
Size limits
Storage policies
Authorization
Processing requirements
```

Do not provide unrestricted storage access to admin browsers.

------------------------------------------------------------------------

# 29. Inventory Management

Inventory managers should be able to view:

``` text
SKU
Available quantity
Reserved quantity where applicable
Inventory state
Low-stock indicators
```

The exact fields depend on the inventory architecture.

------------------------------------------------------------------------

# 30. Inventory Mutation

Inventory changes should go through the inventory domain.

Do not allow the admin frontend to directly modify database quantities
through generic CRUD.

------------------------------------------------------------------------

# 31. Inventory Adjustments

If manual adjustments are supported, record:

``` text
Product/variant
Previous quantity
Adjustment
Resulting quantity
Reason
Staff member
Timestamp
```

------------------------------------------------------------------------

# 32. Inventory Adjustment Reasons

Potential reasons:

``` text
Stock received
Damaged stock
Manual correction
Return
Lost stock
Inventory count
```

The exact catalogue should be business-defined.

------------------------------------------------------------------------

# 33. Inventory Audit

Inventory adjustments should be auditable because inventory affects:

``` text
Availability
Orders
Revenue
Wholesale fulfillment
```

------------------------------------------------------------------------

# 34. Order Management

Order managers should be able to:

``` text
Search orders
View order details
View fulfillment state
Update operational states
Process approved cancellations
Process returns/refunds according to permissions
View shipment/tracking information
```

------------------------------------------------------------------------

# 35. Order State Protection

Admins must not arbitrarily change financial/order states without domain
validation.

For example:

``` text
Delivered
```

should not be set if the operation violates the order state machine.

------------------------------------------------------------------------

# 36. Order Cancellation

Cancellation should use the order/cancellation service.

The admin UI should not directly mutate:

``` text
order.status = cancelled
```

without executing the required domain logic.

------------------------------------------------------------------------

# 37. Refunds

Refund operations are financially sensitive.

Only authorized roles should initiate/approve refunds.

Refund processing must use the payment architecture and be idempotent.

------------------------------------------------------------------------

# 38. Order Notes

Internal notes may be supported.

They must be clearly separated from customer-visible order information.

------------------------------------------------------------------------

# 39. Customer Management

Authorized staff may:

``` text
Search customers
View customer profile
View order history
View addresses where permitted
View wholesale status
Perform approved support actions
```

------------------------------------------------------------------------

# 40. Customer Privacy

Admin access to customer data should be permission-controlled.

Do not display unnecessary:

``` text
Authentication secrets
Payment credentials
Private security information
```

------------------------------------------------------------------------

# 41. Customer Account Actions

Where supported, admins may perform controlled actions such as:

``` text
Account deactivation
Account support
Address correction
Wholesale status review
```

Sensitive actions should be audited.

------------------------------------------------------------------------

# 42. Wholesale Management

Wholesale managers may manage:

``` text
Applications
Business information
Approval status
Suspension
Reactivation
Wholesale eligibility
```

------------------------------------------------------------------------

# 43. Wholesale Approval Workflow

A typical workflow:

``` text
Application submitted
       ↓
Pending review
       ↓
Approved / Rejected
       ↓
Active wholesale access
```

The final workflow follows the wholesale architecture.

------------------------------------------------------------------------

# 44. Wholesale Approval Security

Approval should require explicit permission.

Do not automatically approve wholesale access based solely on submitted
customer fields.

------------------------------------------------------------------------

# 45. Wholesale Documents

If business verification documents are collected:

``` text
Private storage
Restricted permissions
Audit access
Secure deletion/retention
```

must apply.

------------------------------------------------------------------------

# 46. Promotions Management

If promotions are included in Phase 1, authorized admins may manage:

``` text
Promotion code
Discount rules
Validity
Usage limits
Eligibility
```

Promotions must be validated by the promotion domain.

------------------------------------------------------------------------

# 47. Promotion Security

Admins must not be able to create promotion configurations that bypass:

``` text
Usage limits
Eligibility
Expiration
Maximum discount
```

without explicit privileged behavior.

------------------------------------------------------------------------

# 48. Notification Management

Authorized admins may view:

``` text
Notification status
Failed deliveries
Retryable notifications
```

Manual resend should be permission-controlled.

------------------------------------------------------------------------

# 49. Notification Resend

A resend should retry communication only.

It must not:

``` text
Create another order
Create another refund
Change financial state
```

------------------------------------------------------------------------

# 50. Search

Admin search may span operational entities such as:

``` text
Products
Orders
Customers
SKUs
Wholesale applications
```

Search must respect permissions.

------------------------------------------------------------------------

# 51. Admin Filters

Admin tables should provide appropriate filters for:

``` text
Status
Date
Category
Stock
Order state
Wholesale state
```

Avoid building a separate custom query for every UI filter without a
consistent API/query architecture.

------------------------------------------------------------------------

# 52. Admin Pagination

Large datasets must be paginated.

Examples:

``` text
Orders
Customers
Products
Notifications
Audit logs
```

Do not load entire datasets into the browser.

------------------------------------------------------------------------

# 53. Bulk Operations

Bulk actions may include:

``` text
Publish products
Archive products
Assign collection
Update category
Update merchandising order
```

Bulk operations require additional safeguards.

------------------------------------------------------------------------

# 54. Bulk Operation Authorization

A user must have permission for the underlying operation on every
affected resource.

Do not treat:

``` text
bulk=true
```

as authorization.

------------------------------------------------------------------------

# 55. Bulk Operation Limits

Bulk requests should have reasonable limits to protect:

``` text
Database
Application
Worker queue
Admin UX
```

------------------------------------------------------------------------

# 56. Bulk Operation Preview

For risky operations, provide a preview/confirmation step showing:

``` text
Number of affected records
Type of action
Potential consequences
```

------------------------------------------------------------------------

# 57. Destructive Actions

Destructive operations should require explicit confirmation.

Examples:

``` text
Delete media
Archive product
Cancel order
Refund
Suspend wholesale account
```

The exact confirmation strength depends on risk.

------------------------------------------------------------------------

# 58. Double Confirmation

Highly sensitive actions may require stronger confirmation such as:

``` text
Typed confirmation
Re-authentication
Second approval
```

The business should identify which operations qualify.

------------------------------------------------------------------------

# 59. Audit Logs

Important admin actions should be recorded.

Potential fields:

``` text
Admin identity
Action
Entity
Entity ID
Timestamp
Previous state where appropriate
New state where appropriate
Request/correlation ID
```

------------------------------------------------------------------------

# 60. Audit Log Access

Audit logs should be readable only by authorized roles.

Ordinary staff should not be able to erase or modify audit history.

------------------------------------------------------------------------

# 61. Admin Activity

The system should make sensitive activity observable.

Examples:

``` text
Large inventory adjustment
Unusual refunds
Wholesale approvals
Mass product changes
Permission changes
```

------------------------------------------------------------------------

# 62. Admin Notifications

Operations staff may receive alerts for:

``` text
Failed payments
Wholesale applications
Low stock
Critical notification failures
Operational exceptions
```

The notification architecture controls delivery.

------------------------------------------------------------------------

# 63. Configuration Management

Business configuration should be separated from source code where
appropriate.

Potential configuration:

``` text
Store settings
Shipping configuration
Promotion settings
Merchandising settings
Notification settings
```

Sensitive secrets must remain in deployment secret management, not
ordinary admin configuration.

------------------------------------------------------------------------

# 64. Admin Configuration Security

Do not allow ordinary admins to edit:

``` text
Database credentials
Payment secrets
Supabase service-role keys
Webhook secrets
Application signing keys
```

------------------------------------------------------------------------

# 65. Admin API Idempotency

Sensitive mutations should be idempotent where repeated requests could
cause duplicate effects.

Examples:

``` text
Refund
Bulk action
Notification resend
Inventory adjustment where appropriate
```

------------------------------------------------------------------------

# 66. Admin Concurrency

The system should protect against two admins modifying the same record
unexpectedly.

Possible approaches:

``` text
Optimistic locking
Version checks
Latest-state validation
```

The exact mechanism depends on the domain.

------------------------------------------------------------------------

# 67. Stale Admin Data

Admin screens may become stale while another staff member edits the same
entity.

Sensitive mutations should revalidate server-side before committing.

------------------------------------------------------------------------

# 68. Admin Error Handling

Errors should clearly communicate:

``` text
What failed
Whether the operation was applied
What the admin can do next
```

Do not expose stack traces or internal database details.

------------------------------------------------------------------------

# 69. Admin UX States

Every major admin screen should support:

``` text
Loading
Empty
Error
Permission denied
Validation failure
Success
Conflict/stale data
```

------------------------------------------------------------------------

# 70. Admin API Security Testing

Test:

``` text
Unauthenticated admin access
Wrong role
Missing permission
Cross-resource access
Bulk authorization
Sensitive operation authorization
```

------------------------------------------------------------------------

# 71. Admin Audit Testing

Verify that important actions generate the expected audit records.

Test:

``` text
Product price change
Inventory adjustment
Order cancellation
Refund
Wholesale approval
Permission change
```

------------------------------------------------------------------------

# 72. Admin Performance

Admin APIs should use:

``` text
Pagination
Selective fields
Efficient queries
Indexes
Background jobs for expensive operations
```

------------------------------------------------------------------------

# 73. Long-Running Operations

Expensive operations should be asynchronous where appropriate.

Examples:

``` text
Large media processing
Mass catalog import
Large bulk update
Report generation
```

The UI should expose job status.

------------------------------------------------------------------------

# 74. Admin Job Status

For asynchronous jobs:

``` text
Queued
Running
Completed
Failed
```

The admin should be able to inspect safe failure information.

------------------------------------------------------------------------

# 75. Import/Export

If catalog/customer/order imports or exports are required, they should
be treated as privileged operations.

Requirements include:

``` text
Authorization
Validation
Size limits
Audit logging
Safe file handling
```

------------------------------------------------------------------------

# 76. Data Export Security

Exports may contain sensitive information.

Use:

``` text
Restricted access
Short-lived download links
Audit records
Appropriate expiration
```

------------------------------------------------------------------------

# 77. Admin File Downloads

Private administrative files should not be publicly accessible.

Use controlled/signed access where appropriate.

------------------------------------------------------------------------

# 78. Admin Definition of Done

The admin architecture is complete when:

-   Admin authentication is defined.
-   Roles and permissions are explicit.
-   Server-side authorization exists.
-   Public/customer/admin APIs are separated.
-   Product management is defined.
-   Inventory operations are domain-controlled.
-   Order/refund operations are protected.
-   Customer access is permission-controlled.
-   Wholesale approval is protected.
-   Promotions are permission-controlled.
-   Media operations follow storage security.
-   Bulk actions have safeguards.
-   Destructive operations have confirmation.
-   Audit logging is implemented for critical actions.
-   Sensitive configuration is protected.
-   Admin concurrency is considered.
-   Long-running operations can run asynchronously.
-   Admin security/performance tests are defined.

------------------------------------------------------------------------

# 79. AI Agent Admin Rules

Antigravity must not:

-   Treat hidden admin frontend routes as authorization.
-   Give every staff member unrestricted admin access.
-   Allow frontend code to directly mutate inventory.
-   Allow frontend code to directly mutate order/payment states.
-   Let admins bypass domain validation through generic CRUD.
-   Allow retail users to access admin APIs.
-   Allow staff to access customer data beyond their permissions.
-   Allow unauthorized wholesale approval.
-   Perform irreversible bulk operations without safeguards.
-   Expose secrets through admin configuration.
-   Delete audit records through ordinary admin operations.
-   Trust stale admin state for sensitive mutations.
-   Execute expensive bulk operations synchronously when they can
    overload production.
-   Expose private documents through public URLs.

------------------------------------------------------------------------

# 80. Admin Change Workflow

Changes should follow:

``` text
Operational requirement
   ↓
Permission review
   ↓
Domain workflow review
   ↓
API design
   ↓
Admin UI
   ↓
Audit requirements
   ↓
Security testing
   ↓
Concurrency testing
   ↓
Staging verification
   ↓
Production monitoring
```

------------------------------------------------------------------------

# 81. Admin Architecture Summary

``` text
                         Admin User
                             |
                      Admin Frontend
                             |
                       Admin API
                             |
                    Authentication
                             |
                     Authorization
                             |
                    Domain Services
          ┌──────────┬────────┼─────────┐
          ↓          ↓        ↓         ↓
       Catalog    Orders   Customers  Wholesale
          |          |        |         |
       Inventory   Payments  Media   Promotions
          \          |        |         /
           └─────────┼────────┼────────┘
                     ↓
                 Audit Logs
                     |
                Observability
```

The fundamental rule is:

``` text
The admin panel is a privileged operational application.
Frontend restrictions are not security controls.
Every mutation is authorized and validated server-side.
Sensitive operations are audited.
Destructive/bulk operations are safeguarded.
```

------------------------------------------------------------------------

# 82. Next Document

The next document should be:

``` text
30-analytics-tracking-architecture.md
```

It will define:

-   Analytics architecture.
-   GA4/event tracking.
-   Ecommerce events.
-   Server-side vs client-side tracking.
-   Consent/privacy boundaries.
-   Retail/wholesale analytics separation.
-   Conversion tracking.
-   UTM attribution.
-   Product/search analytics.
-   Admin/business reporting.
-   Event naming conventions.
-   Data quality.
-   Duplicate-event prevention.
-   Analytics observability.
-   PII protection.
