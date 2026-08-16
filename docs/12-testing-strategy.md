# Closet by Chilli — Testing Strategy

## 1. Purpose

This document defines the testing strategy for Closet by Chilli.

The goal is to verify that the platform is:

- Functionally correct.
- Secure.
- Reliable.
- Maintainable.
- Performant.
- Accessible.
- Safe for commerce and payment workflows.

Testing is a required part of every implementation sprint.

---

# 2. Testing Philosophy

The platform follows:

```text
Test early
Test continuously
Test at the correct layer
Test business rules on the backend
Test critical user journeys end-to-end
```

A feature is not complete because it works manually in a browser.

---

# 3. Test Pyramid

The overall strategy follows:

```text
                 ┌─────────┐
                 │   E2E   │
                 └────┬────┘
                      │
             ┌────────┴────────┐
             │   Integration   │
             └────────┬────────┘
                      │
          ┌───────────┴───────────┐
          │ Unit / API / Component│
          └───────────────────────┘
```

The majority of tests should be fast and deterministic.

E2E tests should focus on critical business journeys.

---

# 4. Testing Layers

The platform should use:

```text
Unit Tests
Component Tests
API Tests
Integration Tests
Database Tests
Authentication Tests
Authorization Tests
End-to-End Tests
Security Tests
Performance Tests
Production Smoke Tests
```

Each layer serves a different purpose.

---

# 5. Unit Tests

Unit tests verify isolated logic.

Examples:

```text
Price calculation
Discount calculation
Currency formatting
Validation helpers
Order state transitions
Wholesale eligibility rules
Inventory calculations
Utility functions
```

Unit tests should be:

- Fast.
- Deterministic.
- Independent.
- Easy to diagnose.

---

# 6. Backend Unit Tests

Django unit tests should cover domain/business logic.

Examples:

```text
PricingService
InventoryService
OrderService
WholesaleService
CheckoutService
```

Business rules should be tested independently from HTTP whenever practical.

---

# 7. Frontend Unit Tests

Frontend unit tests may cover:

```text
Formatting utilities
Client-side validation
Small reusable utilities
State transition logic
```

Do not duplicate backend business logic in frontend tests.

---

# 8. Component Tests

Component tests verify UI behavior.

Examples:

```text
ProductCard
ProductVariantSelector
CartItem
AddressForm
CheckoutForm
OrderSummary
WholesaleStatus
```

Test behavior rather than implementation details.

Prefer:

```text
User clicks Add to Cart
```

over:

```text
Internal function X was called.
```

---

# 9. API Tests

Every important API endpoint should have automated coverage.

Tests should verify:

```text
HTTP method
Authentication
Authorization
Request validation
Response structure
Status codes
Business behavior
Error behavior
```

---

# 10. API Contract Testing

API responses should match the documented API contract.

Verify:

```text
Required fields
Field types
Nested structures
Pagination
Error format
Authentication requirements
```

If OpenAPI is used, generated types/contract validation should be considered.

---

# 11. Authentication Tests

Authentication tests must verify:

```text
Valid session/token
Missing authentication
Expired authentication
Invalid authentication
Session handling
Current-user resolution
Logout behavior
```

The exact cases depend on the final Supabase Auth integration.

---

# 12. Authorization Tests

Authorization tests are mandatory for protected resources.

Examples:

```text
Customer → own order       = allowed
Customer → another order   = denied

Retail → wholesale price   = denied
Wholesale → wholesale price = allowed

Staff → permitted operation = allowed
Staff → admin-only action   = denied
```

---

# 13. Object-Level Authorization

Every customer-owned resource should have ownership tests.

Examples:

```text
Order
Address
Cart
Profile
Wholesale application
```

Test that users cannot access another user's resources by manipulating IDs.

---

# 14. Role Tests

Test each application role:

```text
CUSTOMER
WHOLESALE_CUSTOMER
STAFF
ADMIN
```

For each role, verify:

```text
Allowed operations
Denied operations
Accessible resources
```

---

# 15. Wholesale Authorization Tests

Wholesale access must be tested against status.

Example:

```text
NOT_APPLIED       → denied
PENDING           → denied
UNDER_REVIEW      → denied
APPROVED          → allowed
REJECTED          → denied
SUSPENDED         → denied
```

The exact business rules remain governed by the approved wholesale architecture.

---

# 16. Database Tests

Database-related tests should verify:

```text
Constraints
Unique rules
Foreign keys
Required fields
Indexes where relevant
Deletion behavior
Relationship behavior
Security policies where applicable
```

Database correctness should not rely entirely on Django validation.

---

# 17. Database Constraint Testing

Important constraints should have tests.

Examples:

```text
Duplicate SKU
Invalid foreign key
Invalid status transition
Invalid negative quantity
Duplicate unique value
```

The database should reject invalid states even if application validation is bypassed.

---

# 18. Product Catalog Tests

Catalog tests should cover:

```text
Create product
Update product
Product variants
Product visibility
Category relationship
Collection relationship
Product retrieval
Filtering
Sorting
Pagination
```

---

# 19. Product Variant Tests

Test:

```text
Variant creation
SKU uniqueness
Variant attributes
Price association
Stock association
Availability
Invalid variant combinations
```

The exact variant model follows the database/domain architecture.

---

# 20. Category Tests

Verify:

```text
Category creation
Category visibility
Category hierarchy where applicable
Product association
Slug uniqueness
Public retrieval
```

---

# 21. Collection Tests

Verify:

```text
Collection creation
Collection visibility
Product association
Ordering
Public retrieval
```

---

# 22. Search Tests

Search should be tested for:

```text
Relevant product matches
No results
Partial queries
Case handling
Pagination
Filtering
Sorting
```

The exact search technology is defined separately.

---

# 23. Cart Tests

Cart testing is critical.

Verify:

```text
Create cart
Add item
Update quantity
Remove item
Empty cart
Multiple items
Variant selection
Price calculation
Stock validation
```

---

# 24. Cart Ownership Tests

Verify:

```text
User A cannot access User B's cart.
```

For guest carts:

```text
Guest A cannot manipulate Guest B's cart.
```

The exact guest-cart mechanism will follow the approved architecture.

---

# 25. Cart Price Integrity

The client must not be trusted to provide authoritative pricing.

Test:

```text
Client submits fake product price
        ↓
Backend ignores/recalculates it
```

Expected result:

```text
Server-authoritative price
```

---

# 26. Cart Quantity Validation

Test:

```text
Quantity = 0
Quantity < 0
Very large quantity
Non-integer quantity
Quantity greater than available stock
```

The API should reject invalid values.

---

# 27. Inventory Tests

Inventory is a high-risk commerce domain.

Test:

```text
Stock available
Stock unavailable
Stock reaches zero
Stock adjustment
Reservation where applicable
Release where applicable
Concurrent purchase
```

---

# 28. Inventory Concurrency

The system must be tested for race conditions.

Conceptual scenario:

```text
Stock = 1

Customer A → attempts purchase
Customer B → attempts purchase
```

The system must not incorrectly allow both customers to successfully purchase the same single unit.

The final implementation should use appropriate database transaction/concurrency mechanisms.

---

# 29. Pricing Tests

Pricing tests should verify:

```text
Base price
Variant price
Wholesale price
Discount
Promotion
Shipping
Taxes if applicable
Final total
```

The exact pricing model will follow the approved business rules.

---

# 30. Price Tampering Tests

Test requests containing:

```text
Fake unit price
Fake subtotal
Fake discount
Fake shipping amount
Fake total
```

The backend must not trust client-provided financial totals.

---

# 31. Promotion Tests

Where promotions are implemented, test:

```text
Valid promotion
Expired promotion
Inactive promotion
Minimum purchase requirement
Usage limits
Invalid coupon
Coupon stacking rules
```

Only business-approved promotion behavior should be implemented.

---

# 32. Checkout Tests

Checkout tests should cover:

```text
Valid cart
Empty cart
Invalid address
Invalid shipping option
Out-of-stock product
Price changed since cart creation
Payment initiation failure
Successful payment
```

---

# 33. Checkout Integrity

The backend must revalidate important information at checkout.

At minimum:

```text
Products
Variants
Prices
Availability
Customer
Shipping
Discounts
Final total
```

Do not rely on stale frontend state.

---

# 34. Order Creation Tests

Verify:

```text
Correct order creation
Correct order items
Correct totals
Correct customer
Correct address snapshot/reference
Correct payment state
Correct initial order state
```

The final data model determines whether values are snapshotted or referenced.

---

# 35. Order Idempotency Tests

Retrying the same order/payment operation should not accidentally create duplicate orders or financial effects.

Test:

```text
Same idempotency key
Same request repeated
Network retry
Client retry
```

Expected behavior should follow the API/idempotency contract.

---

# 36. Payment Tests

Payment functionality must have dedicated tests.

Test:

```text
Payment initiated
Payment success
Payment failure
Payment pending
Payment cancelled
Duplicate callback
Invalid callback
Webhook signature failure
```

---

# 37. Payment Webhook Tests

Webhook processing should verify:

```text
Valid signature → accepted
Invalid signature → rejected
Malformed payload → rejected
Unknown event → safely handled
Duplicate event → idempotently handled
```

Never trust a payment-success status supplied directly by the browser.

---

# 38. Refund Tests

Where refunds are implemented:

```text
Valid refund
Invalid amount
Duplicate refund request
Unauthorized refund
Provider failure
Webhook confirmation
```

Financial operations require strong authorization and idempotency.

---

# 39. Order State Tests

Order state transitions should be explicitly tested.

Conceptually:

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

Failure/cancellation paths should also be tested according to the approved order lifecycle.

---

# 40. Invalid State Transition Tests

Test invalid transitions.

Example:

```text
DELIVERED → PENDING
```

should not silently succeed if the business model prohibits it.

---

# 41. Address Tests

Verify:

```text
Create address
Update address
Delete address
Set default address
Use address at checkout
Ownership
Validation
```

Customer A must not modify Customer B's address.

---

# 42. Customer Account Tests

Test:

```text
View profile
Update profile
View orders
View order details
Manage addresses
Session behavior
```

---

# 43. Wholesale Application Tests

Test:

```text
Submit application
Required fields
Duplicate application
Application status
Staff review
Approval
Rejection
Suspension
```

Only authorized staff/admin users should be able to perform review actions.

---

# 44. Wholesale Pricing Tests

Verify that:

```text
Approved wholesale user
    → receives permitted wholesale pricing

Retail user
    → does not receive wholesale pricing

Suspended wholesale user
    → loses wholesale privileges
```

The backend must determine the price.

---

# 45. CMS Tests

Where CMS functionality is implemented, test:

```text
Content creation
Content update
Publication state
Ordering
Visibility
Public rendering
Invalid content
```

---

# 46. Admin Tests

Admin functionality should test:

```text
Staff access
Admin access
Permission boundaries
Catalog operations
Order operations
Inventory operations
Wholesale review
CMS operations
```

Staff must not automatically inherit unrestricted administrator privileges.

---

# 47. Security Tests

Security testing should include:

```text
Authentication bypass
Authorization bypass
Object-level access
Input validation
Rate limiting where applicable
Secret exposure
CORS behavior
CSRF behavior where applicable
Webhook verification
Sensitive data exposure
```

---

# 48. Input Validation Tests

Test malicious and invalid input such as:

```text
Unexpected fields
Wrong data types
Oversized strings
Invalid IDs
Invalid quantities
Invalid state values
Malformed JSON
```

The API should fail safely.

---

# 49. Sensitive Data Exposure Tests

Verify API responses do not expose:

```text
Passwords
Tokens
Service-role credentials
Payment secrets
Internal notes
Supplier costs
Unnecessary personal data
```

---

# 50. Rate Limiting Tests

Where rate limiting is implemented, test appropriate endpoints such as:

```text
Authentication-related endpoints
Search
Sensitive mutations
Webhook endpoints where applicable
```

The exact limits should be defined during security hardening.

---

# 51. Frontend Integration Tests

Frontend integration tests should verify interaction with the API layer.

Examples:

```text
Product loading
Add to cart
Cart update
Login/session state
Checkout validation
Order confirmation
```

---

# 52. Loading State Tests

Important asynchronous UI should be tested for:

```text
Initial loading
Submitting
Refreshing
Slow response
```

The UI should not permit duplicate critical submissions accidentally.

---

# 53. Error State Tests

Test frontend behavior when the API returns:

```text
400
401
403
404
409
422 where applicable
429
500
Network failure
```

The UI should provide appropriate user-facing behavior.

---

# 54. Empty State Tests

Verify:

```text
Empty cart
No products
No search results
No orders
No addresses
No wholesale data
```

---

# 55. Responsive Testing

Critical pages should be checked at:

```text
Mobile
Tablet
Desktop
Large desktop
```

At minimum:

```text
Homepage
Catalog
Product
Cart
Checkout
Account
```

---

# 56. Accessibility Testing

Accessibility tests should include:

```text
Keyboard navigation
Focus behavior
Form labels
Semantic structure
Dialog accessibility
Color contrast
Screen-reader-compatible names
```

Automated accessibility tooling should be combined with manual review.

---

# 57. SEO Testing

Public storefront pages should be checked for:

```text
Title
Description
Canonical URL
Open Graph metadata
Structured data where applicable
Sitemap inclusion
Robots behavior
404 behavior
```

---

# 58. Performance Testing

Performance testing should cover:

```text
Homepage
Catalog
Product detail
Search
Cart
Checkout
```

Measure:

```text
Initial load
API response time
Client JavaScript
Image loading
Core Web Vitals
```

---

# 59. Load Testing

Before production launch, critical APIs should be load-tested.

Candidates:

```text
Product listing
Product detail
Search
Cart operations
Checkout initiation
Order lookup
```

The target traffic levels should be defined based on expected business usage.

---

# 60. Concurrency Testing

Concurrency testing is especially important for:

```text
Inventory
Cart
Checkout
Payment
Coupons/promotions
Order creation
```

Test multiple simultaneous requests.

---

# 61. E2E Testing

End-to-end tests should simulate real customer journeys.

Core journey:

```text
Homepage
   ↓
Category
   ↓
Product
   ↓
Variant
   ↓
Add to Cart
   ↓
Cart
   ↓
Checkout
   ↓
Payment
   ↓
Order Confirmation
```

---

# 62. E2E Authentication Journey

Test:

```text
Register/Login
   ↓
Browse
   ↓
Add to cart
   ↓
Checkout
   ↓
Order
   ↓
Account
   ↓
View order
```

---

# 63. E2E Wholesale Journey

Test:

```text
Customer
   ↓
Wholesale application
   ↓
Staff/Admin review
   ↓
Approval
   ↓
Wholesale login/session
   ↓
Wholesale pricing
   ↓
Wholesale checkout/order
```

The exact flow depends on final business requirements.

---

# 64. E2E Failure Journeys

Do not test only successful flows.

Important failure scenarios:

```text
Out of stock
Payment failure
Expired session
Invalid coupon
Price change
Network failure
Unauthorized resource
```

---

# 65. Test Data Strategy

Test data should be generated using controlled fixtures/factories.

Avoid hard-coded dependencies on production-like records.

Potential categories:

```text
Customer
Wholesale customer
Staff
Admin
Product
Variant
Inventory
Order
Payment
Promotion
```

---

# 66. Test Users

Create deterministic test identities for:

```text
Customer
Approved wholesale customer
Pending wholesale customer
Staff
Admin
```

Test credentials/secrets must be isolated from production.

---

# 67. Test Product Catalog

A test catalog should include:

```text
In-stock product
Out-of-stock product
Multiple variants
Discounted product
Wholesale-enabled product
Product with missing optional content
```

This helps cover edge cases.

---

# 68. Test Payment Provider

Use a sandbox/test payment environment.

Never execute real payments during automated tests.

Payment provider behavior should be simulated using official test mechanisms where possible.

---

# 69. Test Isolation

Tests should not depend on execution order.

Each test should:

```text
Arrange
Act
Assert
```

and clean up or isolate its data appropriately.

---

# 70. Flaky Tests

Flaky tests must be treated as defects.

Do not solve flaky tests by:

```text
Increasing arbitrary sleep times
Retrying indefinitely
Ignoring failures
```

Find and fix the underlying race/timing issue.

---

# 71. Mocking Strategy

Mock external services when appropriate:

```text
Payment provider
Email provider
Shipping provider
Analytics
External APIs
```

Do not mock the business logic being tested.

---

# 72. Integration vs Mocking

Use real integration environments when validating:

```text
Database behavior
Authentication integration
Critical API behavior
Webhook processing
```

Use mocks when testing isolated application logic.

The balance depends on test speed and reliability.

---

# 73. CI Test Gates

CI should eventually enforce:

```text
Frontend lint
Frontend typecheck
Frontend unit/component tests
Backend lint
Backend type checks where enabled
Backend tests
API tests
Build
```

Critical E2E tests can run in a dedicated CI stage.

---

# 74. Pull Request Quality Gate

A PR should not be merged when:

```text
Required tests fail
Lint fails
Typecheck fails
Build fails
Security checks fail
```

Exceptions must be explicit and documented.

---

# 75. Coverage

Coverage should be used as a quality signal, not as the sole objective.

Do not write meaningless tests solely to increase percentage.

Prioritize coverage of:

```text
Financial logic
Authorization
Inventory
Checkout
Orders
Wholesale
Security boundaries
```

---

# 76. Critical Path Coverage

The following should have strong automated coverage before launch:

```text
Authentication
Catalog
Cart
Pricing
Inventory
Checkout
Payment
Order creation
Order lookup
Wholesale authorization
```

---

# 77. Regression Testing

Every production bug should result in a regression test where practical.

Workflow:

```text
Bug
 ↓
Fix
 ↓
Regression test
 ↓
CI
```

This prevents repeated failures.

---

# 78. Production Smoke Tests

After deployment, run a minimal smoke suite.

Examples:

```text
Homepage loads
Catalog loads
Product page loads
Search works
Authentication works
Cart works
Checkout endpoint is healthy
Payment integration health is verified
Order retrieval works
```

Do not perform real financial transactions unless explicitly required by the deployment test plan.

---

# 79. Monitoring vs Testing

Monitoring does not replace testing.

Testing answers:

```text
"Does the system behave correctly under known scenarios?"
```

Monitoring answers:

```text
"Is the production system behaving normally right now?"
```

Both are required.

---

# 80. Sprint Testing Workflow

Every sprint should follow:

```text
Implementation
    ↓
Developer/Agent tests
    ↓
Automated checks
    ↓
Human review
    ↓
Feature-specific manual test
    ↓
Regression suite
    ↓
Accept sprint
```

---

# 81. AI Agent Testing Rules

Antigravity must:

- Add relevant tests.
- Run tests after implementation.
- Report failures.
- Never disable tests to achieve green status.
- Never delete an existing test without explicit justification.
- Never weaken assertions merely to make tests pass.
- Report unrelated existing failures.
- Test authorization for protected features.
- Test important edge cases.

---

# 82. AI Agent Test Report

Every sprint completion report should include:

```text
Tests added:
- ...

Tests run:
- ...

Passed:
- ...

Failed:
- ...

Existing failures:
- ...

Manual checks:
- ...

Remaining risks:
- ...
```

---

# 83. Testing Definition of Done

Testing is complete for a sprint when:

- Relevant unit tests exist.
- Relevant API/integration tests exist.
- Security tests exist for protected functionality.
- Frontend tests exist where UI behavior is non-trivial.
- Critical flows have E2E coverage where appropriate.
- All required checks pass.
- No test was weakened or disabled to hide a failure.
- Known risks are documented.

---

# 84. Final Testing Architecture

```text
                         Production
                              ↑
                       Smoke Testing
                              ↑
                         E2E Tests
                              ↑
                    Integration Tests
                              ↑
              ┌───────────────┴───────────────┐
              │                               │
          API Tests                     Component Tests
              │                               │
              └───────────────┬───────────────┘
                              ↓
                         Unit Tests
                              ↓
                       Domain Logic
```

The testing strategy is intentionally layered so that most defects are caught quickly and critical customer journeys are still verified end-to-end.

---

# 85. Next Document

The next document is:

```text
13-security-architecture.md
```

It will define the broader production security model, including:

- Threat model.
- OWASP considerations.
- API security.
- Database/RLS security.
- Secrets management.
- CORS/CSRF.
- Rate limiting.
- Input validation.
- File upload security.
- Payment/webhook security.
- Session security.
- Audit logging.
- Security headers.
- Dependency/security scanning.
- Incident response.
- Production security checklist.
