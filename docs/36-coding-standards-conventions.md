# Closet by Chilli --- Coding Standards & Conventions

## 1. Purpose

This document defines coding standards for the Closet by Chilli
codebase.

It is intended to keep the codebase:

``` text
Consistent
Maintainable
Type-safe
Testable
Secure
Reviewable
AI-agent friendly
```

These conventions apply to:

``` text
Django/Python
Django REST APIs
Next.js/React
TypeScript
Database/domain code
Tests
Configuration
Background jobs
```

------------------------------------------------------------------------

# 2. Core Principles

Prefer:

``` text
Simple code
Explicit behavior
Strong typing
Small focused modules
Reusable domain logic
Clear boundaries
Testable functions
Secure defaults
```

Avoid:

``` text
Premature abstraction
Duplicated business logic
Magic behavior
Hidden side effects
God classes
God functions
Unnecessary dependencies
```

------------------------------------------------------------------------

# 3. Backend Stack

The backend is:

``` text
Python
Django
Django REST Framework where appropriate
PostgreSQL/Supabase
Celery for background processing
```

The backend should remain the authoritative business layer.

------------------------------------------------------------------------

# 4. Frontend Stack

The storefront is:

``` text
Next.js
React
TypeScript
```

The frontend is responsible for:

``` text
Presentation
Interaction
Client-side UX state
Public SEO presentation
Calling backend APIs
```

It must not become the authoritative pricing/order/payment layer.

------------------------------------------------------------------------

# 5. TypeScript Policy

Use TypeScript rather than JavaScript for application code.

Avoid:

``` typescript
any
```

unless there is a documented, justified boundary where no safer type is
practical.

Prefer:

``` typescript
unknown
```

followed by validation/narrowing.

------------------------------------------------------------------------

# 6. Python Typing

Use Python type hints for application/service interfaces.

Example:

``` python
def calculate_total(cart: Cart) -> Decimal:
    ...
```

Prefer explicit types for:

``` text
Function parameters
Return values
Service interfaces
Important data structures
```

------------------------------------------------------------------------

# 7. Naming --- Python

Use:

``` text
snake_case
```

for:

``` text
Variables
Functions
Modules
Methods
```

Use:

``` text
PascalCase
```

for:

``` text
Classes
Exceptions
```

Use:

``` text
UPPER_SNAKE_CASE
```

for true constants.

------------------------------------------------------------------------

# 8. Naming --- TypeScript

Use:

``` text
camelCase
```

for:

``` text
Variables
Functions
Props
Hooks
```

Use:

``` text
PascalCase
```

for:

``` text
Components
Types
Interfaces
Classes
```

------------------------------------------------------------------------

# 9. Boolean Naming

Boolean values should communicate their meaning.

Prefer:

``` text
isActive
hasStock
canCheckout
isWholesale
```

Avoid ambiguous names such as:

``` text
active
flag
value
```

when the meaning is unclear.

------------------------------------------------------------------------

# 10. File Naming

Use predictable naming conventions.

Python modules:

``` text
snake_case.py
```

React components:

``` text
PascalCase.tsx
```

Hooks:

``` text
useSomething.ts
```

Tests should use the repository's standardized naming pattern.

------------------------------------------------------------------------

# 11. Imports

Keep imports organized.

Prefer:

``` text
Standard library
Third-party dependencies
Internal application imports
```

Remove unused imports.

Avoid wildcard imports:

``` python
from module import *
```

------------------------------------------------------------------------

# 12. Import Boundaries

Do not create circular dependencies between Django apps.

If two modules require each other, reconsider the boundary.

Prefer:

``` text
Shared domain/service
```

over circular imports.

------------------------------------------------------------------------

# 13. Django App Boundaries

Each Django app should have a clear responsibility.

Examples:

``` text
catalog
customers
orders
payments
shipping
promotions
wholesale
notifications
```

Do not put unrelated business logic into a convenient existing app
merely to avoid creating an appropriate boundary.

------------------------------------------------------------------------

# 14. Domain Ownership

Every business rule should have one clear owner.

For example:

``` text
Pricing
→ Pricing domain/service

Payment verification
→ Payment domain/service

Inventory
→ Inventory domain/service
```

Avoid implementing the same rule independently in:

``` text
API view
Frontend
Celery task
Admin
```

------------------------------------------------------------------------

# 15. Views / API Controllers

API views should coordinate requests rather than contain large business
algorithms.

Prefer:

``` text
Request
 ↓
Validation
 ↓
Application/domain service
 ↓
Response mapping
```

Avoid putting complex pricing/order/payment logic directly inside views.

------------------------------------------------------------------------

# 16. Serializers

Serializers should handle:

``` text
Input validation
Output representation
Simple transformation
```

They should not become the primary home for complex cross-domain
business rules.

------------------------------------------------------------------------

# 17. Services

Use application/domain services when business operations cross multiple
models or require meaningful orchestration.

Examples:

``` text
CreateOrderService
PricingService
PaymentService
RefundService
PromotionService
```

Do not create services merely to wrap one trivial ORM call.

------------------------------------------------------------------------

# 18. Repositories

Do not introduce a repository abstraction automatically for every Django
model.

Django's ORM can often serve as the data-access layer.

Use an explicit repository only when it provides meaningful
architectural value.

------------------------------------------------------------------------

# 19. Models

Django models should represent:

``` text
Persistent state
Relationships
Simple invariants
Database constraints
```

Avoid putting huge workflows into model methods.

------------------------------------------------------------------------

# 20. Database Constraints

Important invariants should be enforced at the database level where
possible.

Examples:

``` text
Unique identifiers
Non-null requirements
Unique relationships
Valid numeric boundaries
```

Application validation should complement, not replace, database
integrity.

------------------------------------------------------------------------

# 21. Transactions

Use database transactions for multi-step state changes that must be
atomic.

Example:

``` python
with transaction.atomic():
    ...
```

Do not assume separate model saves are automatically atomic.

------------------------------------------------------------------------

# 22. External Services and Transactions

Do not keep database transactions open unnecessarily while waiting on
slow external providers.

Remember:

``` text
Database transaction
≠
External provider transaction
```

Use explicit consistency/idempotency patterns.

------------------------------------------------------------------------

# 23. Money

Use:

``` python
Decimal
```

for authoritative monetary calculations.

Never use:

``` python
float
```

for financial totals.

------------------------------------------------------------------------

# 24. Time

Use timezone-aware datetimes.

Do not rely on:

``` text
Local machine time
Browser time
Naive datetime values
```

for business-critical expiration logic.

------------------------------------------------------------------------

# 25. Business Time

Promotion/payment/order expiration rules should use the explicitly
defined business/server timezone policy.

Do not infer business time from the user's browser.

------------------------------------------------------------------------

# 26. Constants

Centralize meaningful business constants.

Avoid scattering:

``` python
30
500
0.2
```

through business code without explanation.

Prefer named configuration/constants where appropriate.

------------------------------------------------------------------------

# 27. Configuration

Environment-specific configuration must not be hard-coded into
application logic.

Examples:

``` text
Database URL
Provider credentials
API keys
Email configuration
Storage configuration
```

belong in environment/secret configuration.

------------------------------------------------------------------------

# 28. Secrets

Never commit:

``` text
Passwords
API secrets
Private keys
Webhook secrets
Database credentials
```

to source control.

------------------------------------------------------------------------

# 29. Environment Variables

Use environment variables for environment-specific
secrets/configuration.

Validate required configuration during application startup where
appropriate.

------------------------------------------------------------------------

# 30. Frontend Environment Variables

Only explicitly public configuration should be exposed to browser
bundles.

Never expose server secrets through:

``` text
NEXT_PUBLIC_*
```

or equivalent public environment configuration.

------------------------------------------------------------------------

# 31. API Client

Frontend API calls should go through a consistent API client layer where
practical.

Avoid scattering raw:

``` text
fetch()
```

calls throughout every component.

------------------------------------------------------------------------

# 32. API Types

Frontend API types should be derived from or kept synchronized with the
backend API contract.

Avoid independently inventing request/response shapes.

------------------------------------------------------------------------

# 33. API Error Handling

Frontend code should use stable backend error codes.

Do not implement:

``` typescript
message.includes("stock")
```

as business logic.

Use:

``` typescript
error.code
```

------------------------------------------------------------------------

# 34. React Components

Components should have focused responsibilities.

Prefer:

``` text
Presentation
Small state coordination
User interaction
```

Avoid components that simultaneously contain:

``` text
API orchestration
Pricing logic
Payment logic
Analytics implementation
Complex data transformation
```

------------------------------------------------------------------------

# 35. Component Size

Large components should be split when they become difficult to
understand or test.

Do not split components mechanically just to reduce line count.

Split based on:

``` text
Responsibility
Reuse
Testability
Readability
```

------------------------------------------------------------------------

# 36. Server vs Client Components

Use Next.js server components by default where appropriate.

Use client components when browser interactivity/state is genuinely
required.

Do not add:

``` text
"use client"
```

to entire page trees unnecessarily.

------------------------------------------------------------------------

# 37. Client State

Client state should represent UI/application interaction state.

Do not treat client state as the authoritative source for:

``` text
Price
Inventory
Payment status
Order status
Authorization
Wholesale eligibility
```

------------------------------------------------------------------------

# 38. Data Fetching

Use the established application data-fetching strategy consistently.

Avoid multiple independent mechanisms for the same type of data unless
there is a clear reason.

------------------------------------------------------------------------

# 39. Caching

Caching behavior must follow the caching architecture.

Do not introduce ad-hoc caches inside components or services without
understanding:

``` text
Freshness
Invalidation
Personalization
Privacy
```

------------------------------------------------------------------------

# 40. Hooks

Custom hooks should encapsulate reusable client-side behavior.

Examples:

``` text
useCart
useAuth
useWishlist
```

Avoid hooks that secretly perform unrelated global side effects.

------------------------------------------------------------------------

# 41. Side Effects

Make side effects explicit.

Examples:

``` text
API calls
Analytics
Subscriptions
Timers
Browser storage
```

Do not hide important side effects inside generic utility functions.

------------------------------------------------------------------------

# 42. React Keys

Use stable entity identifiers for React list keys.

Prefer:

``` tsx
key={product.id}
```

Avoid array indexes when list ordering/content can change.

------------------------------------------------------------------------

# 43. Forms

Forms should provide:

``` text
Client validation for UX
Server validation for authority
Field-level errors
Submission state
Accessible labels
```

Never rely only on client validation.

------------------------------------------------------------------------

# 44. Accessibility

UI components should follow accessible HTML and interaction patterns.

Important areas include:

``` text
Labels
Keyboard navigation
Focus management
Button semantics
Form errors
Image alt text
Contrast
```

------------------------------------------------------------------------

# 45. Styling

Follow one established styling strategy across the project.

Do not introduce a second styling framework for a single feature without
architectural approval.

------------------------------------------------------------------------

# 46. Design Tokens

Use centralized design tokens for important visual values:

``` text
Colors
Typography
Spacing
Radius
Shadows
Breakpoints
```

This keeps the Closet by Chilli visual system consistent.

------------------------------------------------------------------------

# 47. Brand Consistency

The frontend should respect the approved Closet by Chilli brand/theme.

Do not introduce arbitrary:

``` text
Colors
Fonts
Button styles
Spacing systems
```

without design approval.

------------------------------------------------------------------------

# 48. Utility Functions

Utility functions should be:

``` text
Small
Pure where possible
Generic enough to justify reuse
Well tested
```

Avoid a huge:

``` text
utils.ts
```

containing unrelated logic.

------------------------------------------------------------------------

# 49. Business Utilities

Business-specific logic should not be hidden inside generic utilities.

For example:

``` text
calculatePromotionDiscount()
```

belongs to pricing/promotion logic rather than a generic utility module.

------------------------------------------------------------------------

# 50. Comments

Write comments to explain:

``` text
Why
```

rather than merely:

``` text
What
```

Bad:

``` python
# Add one to count
count += 1
```

Useful:

``` python
# Provider may deliver the same event more than once.
# We therefore check the event ID before applying the transition.
```

------------------------------------------------------------------------

# 51. TODO Comments

Do not accumulate undocumented TODOs.

A TODO should either:

``` text
Reference a tracked task
```

or be resolved before the feature is considered complete.

------------------------------------------------------------------------

# 52. Documentation

Public/non-obvious modules should have concise documentation.

Document:

``` text
Purpose
Inputs
Outputs
Important invariants
External dependencies
```

------------------------------------------------------------------------

# 53. Exceptions

Use specific exception types.

Prefer:

``` python
class InsufficientStockError(DomainError):
    ...
```

over:

``` python
raise Exception(...)
```

for expected business conditions.

------------------------------------------------------------------------

# 54. Exception Boundaries

Catch exceptions only where the application can:

``` text
Handle them
Translate them
Recover from them
Add meaningful context
```

Do not catch broad exceptions merely to suppress errors.

------------------------------------------------------------------------

# 55. Broad Exception Handling

Avoid:

``` python
try:
    ...
except Exception:
    pass
```

This can hide production failures.

------------------------------------------------------------------------

# 56. Logging

Use structured logging where possible.

Log meaningful context:

``` text
Request ID
Entity ID
Operation
Outcome
Error category
```

Never log secrets.

------------------------------------------------------------------------

# 57. Logging Levels

Use appropriate levels:

``` text
DEBUG
INFO
WARNING
ERROR
CRITICAL
```

Do not log every successful request at an unnecessarily expensive level.

------------------------------------------------------------------------

# 58. Logging PII

Avoid logging:

``` text
Passwords
Tokens
Payment credentials
Full addresses
Unnecessary customer data
```

Mask sensitive values when logging is genuinely required.

------------------------------------------------------------------------

# 59. API Security

Every API endpoint must explicitly consider:

``` text
Authentication
Authorization
Validation
Rate limiting
Object ownership
Sensitive data exposure
```

------------------------------------------------------------------------

# 60. IDOR Prevention

Never assume that possessing an object ID grants access.

Always verify:

``` text
Current user
+
Object ownership/permission
```

------------------------------------------------------------------------

# 61. Input Validation

Validate all untrusted input:

``` text
Query parameters
Path parameters
JSON bodies
Headers where relevant
File uploads
Webhook payloads
```

------------------------------------------------------------------------

# 62. Output Validation

Do not serialize internal models blindly.

API serializers should expose only fields intended for that API
audience.

------------------------------------------------------------------------

# 63. Mass Assignment

Do not allow clients to update arbitrary model fields through generic
serializers.

Explicitly define writable fields.

------------------------------------------------------------------------

# 64. Admin Code

Admin operations require the same engineering standards as customer
APIs.

Administrative convenience must not bypass:

``` text
Authorization
Audit logging
Validation
Concurrency controls
```

------------------------------------------------------------------------

# 65. Background Tasks

Celery tasks should be thin orchestration layers.

Prefer:

``` text
Task
 ↓
Application/domain service
```

rather than placing the entire business workflow inside the task.

------------------------------------------------------------------------

# 66. Task Idempotency

Every retryable business task must define how duplicate execution is
handled.

------------------------------------------------------------------------

# 67. Database Queries

Avoid accidental N+1 queries.

Use appropriate:

``` text
select_related
prefetch_related
```

where justified.

------------------------------------------------------------------------

# 68. Query Optimization

Optimize based on evidence.

Do not add complex query optimization prematurely without:

``` text
Measured bottleneck
Expected workload
Test/benchmark
```

------------------------------------------------------------------------

# 69. ORM Safety

Do not construct arbitrary ORM expressions directly from untrusted user
input.

Allowlist:

``` text
Sort fields
Filter fields
Search operations
```

------------------------------------------------------------------------

# 70. Database Access in Loops

Avoid repeated database queries inside large loops where a bounded
query/prefetch strategy is possible.

------------------------------------------------------------------------

# 71. Pagination

All potentially large collections should have bounded pagination.

Never return an unbounded database result set to an API by default.

------------------------------------------------------------------------

# 72. Bulk Operations

Bulk operations should be designed for:

``` text
Performance
Atomicity
Partial failure behavior
Auditability
Concurrency
```

Do not assume a loop of individual writes is acceptable for large
datasets.

------------------------------------------------------------------------

# 73. Migrations

Every schema change must use versioned migrations.

Do not modify production schema manually as the normal development
workflow.

------------------------------------------------------------------------

# 74. Migration Safety

Production migrations should consider:

``` text
Backward compatibility
Data volume
Lock duration
Rollback/recovery
Deployment order
```

------------------------------------------------------------------------

# 75. Destructive Migrations

Destructive changes require additional review.

Prefer staged migrations:

``` text
Add
→ Migrate
→ Switch application
→ Remove later
```

where practical.

------------------------------------------------------------------------

# 76. Tests

New business behavior should include tests.

Test the important invariant rather than merely increasing coverage
numbers.

------------------------------------------------------------------------

# 77. Unit Tests

Use unit tests for:

``` text
Pure calculations
Pricing rules
Promotion eligibility
Validation
Small domain behaviors
```

------------------------------------------------------------------------

# 78. Integration Tests

Use integration tests for:

``` text
Database interactions
API behavior
Authentication
Order workflows
Payment/webhook behavior
```

------------------------------------------------------------------------

# 79. End-to-End Tests

Use E2E tests for critical customer journeys:

``` text
Browse
Product
Cart
Checkout
Purchase
Account
Order history
```

------------------------------------------------------------------------

# 80. Test Naming

Test names should explain behavior.

Prefer:

``` text
test_coupon_is_rejected_when_expired
```

over:

``` text
test_coupon_2
```

------------------------------------------------------------------------

# 81. Test Isolation

Tests should not depend on:

``` text
Execution order
Local developer state
Production data
External provider availability
```

unless explicitly designed as integration tests.

------------------------------------------------------------------------

# 82. External Providers in Tests

Use:

``` text
Sandbox
Mocks
Fakes
Contract tests
```

according to the testing strategy.

Do not accidentally charge real payment methods in automated tests.

------------------------------------------------------------------------

# 83. Deterministic Tests

Avoid tests that depend on:

``` text
Current wall-clock time
Random values
External network state
```

without controlling those dependencies.

------------------------------------------------------------------------

# 84. Factory/Test Data

Use reusable factories/fixtures for test data.

Avoid enormous duplicated test setup blocks.

------------------------------------------------------------------------

# 85. Code Formatting

Use automated formatters rather than relying on manual style
enforcement.

The exact formatter/linter configuration should be committed to the
repository.

------------------------------------------------------------------------

# 86. Linting

Linting should be part of local development and CI.

Lint rules should be strict enough to catch real problems without
producing unmanageable noise.

------------------------------------------------------------------------

# 87. Type Checking

Type checking should be part of CI for the TypeScript codebase and
appropriate Python tooling.

------------------------------------------------------------------------

# 88. Dependency Management

Dependencies should be:

``` text
Explicit
Pinned/locked appropriately
Reviewed
Kept minimal
```

Do not add a dependency for a trivial function that can be safely
implemented locally.

------------------------------------------------------------------------

# 89. Dependency Security

Dependencies should be periodically checked for:

``` text
Known vulnerabilities
Abandoned packages
Incompatible licenses where relevant
```

------------------------------------------------------------------------

# 90. Third-Party Libraries

Before adding a library, evaluate:

``` text
Maintenance
Security
Bundle/runtime cost
License
API stability
Community/adoption
```

------------------------------------------------------------------------

# 91. Dead Code

Remove unused:

``` text
Functions
Components
Dependencies
Imports
Feature flags
```

when no longer required.

------------------------------------------------------------------------

# 92. Feature Flags

Feature flags should have:

``` text
Owner
Purpose
Default state
Removal plan
```

Do not leave permanent experimental flags without justification.

------------------------------------------------------------------------

# 93. Environment-Specific Behavior

Avoid code branches like:

``` python
if production:
    ...
elif staging:
    ...
```

throughout business logic.

Prefer configuration and explicit environment boundaries.

------------------------------------------------------------------------

# 94. Configuration vs Business Logic

Configuration should determine:

``` text
Provider URLs
Feature availability
Operational limits
Secrets
```

Business rules should remain in domain logic.

------------------------------------------------------------------------

# 95. API Client Retries

Frontend API clients should not blindly retry all requests.

Retries should consider:

``` text
HTTP method
Idempotency
Error category
User experience
```

------------------------------------------------------------------------

# 96. Optimistic UI

Optimistic updates may be used for low-risk UX interactions.

Do not use optimistic UI as authoritative state for:

``` text
Payment
Order confirmation
Inventory
Financial totals
```

------------------------------------------------------------------------

# 97. Analytics Calls

Analytics should go through the established analytics abstraction.

Do not scatter provider-specific tracking code throughout business
logic.

------------------------------------------------------------------------

# 98. SEO Code

SEO metadata should be generated from authoritative public
catalog/content data.

Do not hard-code large product catalogs into page components.

------------------------------------------------------------------------

# 99. Accessibility Testing

Critical interactive components should include appropriate accessibility
checks.

------------------------------------------------------------------------

# 100. Performance

Code should consider:

``` text
Database queries
Network requests
JavaScript bundle size
Image loading
Rendering
Caching
```

Optimize based on measured behavior.

------------------------------------------------------------------------

# 101. Security by Default

New features should begin with:

``` text
Least privilege
Validated input
Safe output
Explicit authorization
Minimal data exposure
```

Security should not be a final cleanup step.

------------------------------------------------------------------------

# 102. Code Review

Every meaningful change should be reviewed for:

``` text
Correctness
Security
Architecture
Tests
Performance
Maintainability
Backward compatibility
```

------------------------------------------------------------------------

# 103. Review Questions

Reviewers should ask:

``` text
Does this introduce duplicated business logic?
Can the client manipulate an authoritative value?
Does this leak private data?
Are race conditions handled?
Are failures handled?
Are retries safe?
Are tests sufficient?
```

------------------------------------------------------------------------

# 104. Commit Messages

Use clear, consistent commit messages.

A practical convention is:

``` text
feat:
fix:
refactor:
test:
docs:
chore:
```

Example:

``` text
feat(cart): add variant quantity validation
```

------------------------------------------------------------------------

# 105. Pull Requests

Pull requests should describe:

``` text
What changed
Why it changed
Testing performed
Potential risks
Migration requirements
Deployment considerations
```

------------------------------------------------------------------------

# 106. Small Changes

Prefer focused pull requests.

Avoid combining unrelated changes such as:

``` text
Payment feature
+
Unrelated UI redesign
+
Dependency migration
```

unless there is a clear reason.

------------------------------------------------------------------------

# 107. AI-Generated Code

AI-generated code must follow the same standards as human-written code.

Never merge AI-generated code merely because:

``` text
It compiles
```

or:

``` text
The agent says it is complete
```

------------------------------------------------------------------------

# 108. AI Verification

Antigravity-generated changes must be verified through:

``` text
Tests
Lint
Type checking
Security review
Architecture review
Relevant manual checks
```

------------------------------------------------------------------------

# 109. AI Agent Boundaries

The agent must not invent:

``` text
Business requirements
Payment rules
Pricing rules
Authorization rules
Database semantics
```

when the project documentation has not defined them.

It should identify the gap instead.

------------------------------------------------------------------------

# 110. AI Database Changes

Because Supabase MCP may be used to create/modify database structures,
every database change must still be reviewed for:

``` text
Correct relationships
Constraints
Indexes
RLS/security
Nullability
Uniqueness
Migration/reproducibility
```

The agent must not assume that successful MCP execution means the schema
is architecturally correct.

------------------------------------------------------------------------

# 111. AI Code Duplication

Before creating a new service/component/helper, the agent should search
the repository for an existing equivalent.

Avoid duplicate abstractions.

------------------------------------------------------------------------

# 112. AI Context

Agents should read the relevant project documentation before
implementing a feature.

At minimum, identify:

``` text
Architecture document
Domain ownership
API contract
Database model
Security rules
Testing requirements
```

------------------------------------------------------------------------

# 113. AI Change Scope

Agents should stay within the requested sprint scope.

Do not silently refactor unrelated modules during feature
implementation.

------------------------------------------------------------------------

# 114. AI Completion Claims

An agent must not claim:

``` text
Implemented
Tested
Secure
Production-ready
```

unless the corresponding work has actually been performed and verified.

------------------------------------------------------------------------

# 115. Definition of Done

A code change is complete when:

-   Required behavior is implemented.
-   Architecture boundaries are respected.
-   Types are correct.
-   Linting passes.
-   Tests pass.
-   Security considerations are addressed.
-   API contracts are updated where required.
-   Database migrations/schema changes are correct.
-   Documentation is updated where necessary.
-   No unrelated regressions are introduced.

------------------------------------------------------------------------

# 116. Coding Standards Summary

``` text
                    Feature
                       |
                 Architecture
                       |
                 Domain Rules
                       |
             ┌─────────┴─────────┐
             ↓                   ↓
          Backend             Frontend
             |                   |
          Typed                Typed
          Tested               Tested
             |                   |
             └─────────┬─────────┘
                       ↓
                  API Contract
                       |
                    Security
                       |
                 Observability
                       |
                      CI
```

The fundamental rule is:

``` text
Write explicit, typed, testable code.
Keep business rules in the correct domain.
Keep security at the boundary.
Keep APIs stable.
Do not duplicate logic.
Treat AI-generated code as code that requires verification.
```

------------------------------------------------------------------------

# 117. Next Document

The next genuinely new document should be:

``` text
37-ci-cd-quality-gates.md
```

It will define:

-   CI pipeline stages.
-   Backend checks.
-   Frontend checks.
-   Type checking.
-   Linting.
-   Unit/integration/E2E gates.
-   Security scanning.
-   Migration checks.
-   Build verification.
-   Deployment gates.
-   Staging promotion.
-   Production release process.
-   Rollback gates.
-   Branch/PR requirements.
