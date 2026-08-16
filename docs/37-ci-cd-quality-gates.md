# Closet by Chilli --- CI/CD & Quality Gates

## 1. Purpose

This document defines the continuous integration, continuous delivery,
and quality-gate strategy for Closet by Chilli.

The goal is to ensure that code reaching staging or production has
passed appropriate automated checks for:

``` text
Correctness
Type safety
Code quality
Security
Database compatibility
Build integrity
Tests
Deployment safety
```

CI/CD is a verification and delivery system. It must not replace
architectural or business review.

------------------------------------------------------------------------

# 2. Core Principle

Every meaningful change should pass automated quality gates before
promotion.

Conceptually:

``` text
Developer / Antigravity
        ↓
Pull Request
        ↓
CI
        ↓
Quality Gates
        ↓
Build
        ↓
Staging
        ↓
Staging Verification
        ↓
Production Approval
        ↓
Production Deployment
        ↓
Post-deploy Verification
```

------------------------------------------------------------------------

# 3. Source Control

The repository should use a protected Git-based workflow.

Production deployments must originate from reviewed, version-controlled
code.

Do not deploy uncommitted local changes directly to production.

------------------------------------------------------------------------

# 4. Branching Strategy

Use a simple branching model appropriate to the team size.

A practical structure is:

``` text
main
  ↓
feature/* or fix/*
```

Long-lived environment branches should not be introduced without a
concrete operational reason.

------------------------------------------------------------------------

# 5. Pull Requests

Meaningful changes should go through pull requests.

A pull request should communicate:

``` text
What changed
Why it changed
Tests performed
Database changes
Deployment considerations
Potential risks
```

------------------------------------------------------------------------

# 6. Protected Main Branch

The production branch should be protected against accidental direct
pushes.

Require appropriate:

``` text
CI success
Review
Status checks
```

before merging.

------------------------------------------------------------------------

# 7. CI Trigger Events

CI should run on relevant repository events such as:

``` text
Pull request
Push to protected branch
Release/tag
```

The exact provider configuration belongs to the repository
infrastructure.

------------------------------------------------------------------------

# 8. CI Pipeline Stages

A practical pipeline:

``` text
Install
 ↓
Static checks
 ↓
Type checks
 ↓
Unit tests
 ↓
Integration tests
 ↓
Security checks
 ↓
Build
 ↓
Artifact verification
```

Not every check needs to run in exactly this order, but failures should
prevent inappropriate promotion.

------------------------------------------------------------------------

# 9. Dependency Installation

CI must install dependencies from the repository's lock/pinned
dependency definitions.

Do not allow CI to silently resolve arbitrary newer dependency versions.

------------------------------------------------------------------------

# 10. Reproducible Builds

The same source revision should produce a reproducible application build
as far as practical.

Use:

``` text
Locked dependencies
Pinned runtime versions
Versioned build configuration
```

------------------------------------------------------------------------

# 11. Python Runtime

The Python version used by:

``` text
Local development
CI
Staging
Production
```

should be explicitly defined and kept compatible.

------------------------------------------------------------------------

# 12. Node Runtime

The Node.js version used by:

``` text
Local development
CI
Build environment
Production runtime where applicable
```

should also be explicitly defined.

------------------------------------------------------------------------

# 13. Backend Formatting

Run the project's configured Python formatter in CI.

Formatting failures should block merge when formatting is part of the
repository standard.

------------------------------------------------------------------------

# 14. Backend Linting

Run Python lint/static-quality checks.

The lint configuration should be committed to the repository.

Avoid making CI dependent on undocumented machine-local configuration.

------------------------------------------------------------------------

# 15. Python Type Checking

Run the selected Python type checker in CI.

Type errors should block production promotion unless an explicitly
documented exception exists.

------------------------------------------------------------------------

# 16. Django System Checks

Run appropriate Django system checks in CI.

The check should identify configuration/model issues before deployment.

------------------------------------------------------------------------

# 17. Database Migration Checks

CI should verify that model changes and migration state remain
consistent.

Where appropriate, check for:

``` text
Missing migrations
Unexpected migration changes
Invalid migration dependencies
```

------------------------------------------------------------------------

# 18. Migration Safety

A migration passing syntax checks does not automatically mean it is
production-safe.

Production migration review should consider:

``` text
Data volume
Locking
Duration
Backward compatibility
Destructive changes
Rollback/recovery
```

------------------------------------------------------------------------

# 19. Migration Generation

Migration files should be generated and reviewed as part of the code
change.

Do not depend on production servers generating migrations automatically.

------------------------------------------------------------------------

# 20. Migration Execution

Production deployment should execute version-controlled migrations
through a controlled release process.

Do not manually alter production schema as the normal workflow.

------------------------------------------------------------------------

# 21. Frontend Formatting

Run the project's configured TypeScript/JavaScript formatter in CI.

------------------------------------------------------------------------

# 22. Frontend Linting

Run the configured Next.js/TypeScript linting checks.

Lint failures should block merge unless explicitly waived.

------------------------------------------------------------------------

# 23. TypeScript Type Checking

Run TypeScript type checking independently of the production build when
practical.

This ensures type failures cannot be hidden by unrelated build behavior.

------------------------------------------------------------------------

# 24. Next.js Build

The production frontend build must succeed in CI.

The build should run with the same major runtime/configuration
assumptions used for deployment.

------------------------------------------------------------------------

# 25. Environment Validation

Build and deployment processes should validate required environment
configuration.

Never print secret values while validating configuration.

------------------------------------------------------------------------

# 26. Unit Tests

Backend and frontend unit tests should run in CI.

Unit tests should cover important:

``` text
Calculations
Validation
Domain rules
Promotion logic
Utilities
Components
```

------------------------------------------------------------------------

# 27. Integration Tests

Integration tests should verify interactions such as:

``` text
Database
API
Authentication
Order workflows
Payment flows
Webhook processing
```

------------------------------------------------------------------------

# 28. End-to-End Tests

E2E tests should cover critical customer journeys.

At minimum, where implemented:

``` text
Browse catalog
Product selection
Cart
Checkout
Purchase
Account/order history
```

------------------------------------------------------------------------

# 29. Test Database

CI tests must use isolated test data.

Never run automated tests against production data.

------------------------------------------------------------------------

# 30. Test Isolation

Parallel CI jobs must not accidentally share mutable state unless
explicitly designed to do so.

------------------------------------------------------------------------

# 31. External Provider Testing

Use appropriate:

``` text
Mocks
Fakes
Sandbox environments
Contract tests
```

for external providers.

Do not allow ordinary CI runs to trigger real financial transactions.

------------------------------------------------------------------------

# 32. Payment CI Safety

Payment tests must ensure:

``` text
No real card charges
No production payment credentials
No production webhook endpoints
```

------------------------------------------------------------------------

# 33. Shipping CI Safety

Shipping-provider tests should not accidentally create real production
shipments.

Use sandbox/test credentials where supported.

------------------------------------------------------------------------

# 34. Database Integration Tests

Database tests should verify important constraints and transaction
behavior.

Examples:

``` text
Uniqueness
Foreign keys
Inventory concurrency
Coupon usage
Order creation
```

------------------------------------------------------------------------

# 35. Concurrency Tests

Critical race-condition behavior should have dedicated tests.

Examples:

``` text
Last inventory unit
Last coupon usage
Concurrent order creation
Duplicate webhook
Duplicate payment request
```

------------------------------------------------------------------------

# 36. Security Testing

CI should include appropriate automated security checks.

Potential checks:

``` text
Dependency vulnerabilities
Secret scanning
Static security analysis
Known insecure configuration
```

The exact tooling should be selected during implementation.

------------------------------------------------------------------------

# 37. Secret Scanning

CI should detect accidental commits of:

``` text
API keys
Private keys
Passwords
Provider secrets
Database credentials
```

Do not treat secret scanning as a substitute for proper secret
management.

------------------------------------------------------------------------

# 38. Dependency Vulnerability Scanning

Dependencies should be checked against known vulnerability databases
where practical.

Define the policy for:

``` text
Critical
High
Medium
Low
```

severity findings.

------------------------------------------------------------------------

# 39. Vulnerability Policy

Critical/high-risk findings affecting production dependencies should
normally block release until:

``` text
Fixed
Upgraded
Mitigated
```

or explicitly risk-accepted by an authorized owner.

------------------------------------------------------------------------

# 40. Static Security Analysis

Run appropriate security-focused static analysis for:

``` text
Python
TypeScript
Django configuration
```

where practical.

------------------------------------------------------------------------

# 41. Secret Handling in CI

Secrets should be injected through the CI platform's secure secret
mechanism.

Never place secrets directly in:

``` text
Workflow YAML
Repository source
Build logs
Test output
```

------------------------------------------------------------------------

# 42. Log Redaction

CI logs must not expose:

``` text
Tokens
Passwords
API secrets
Private keys
Payment credentials
```

------------------------------------------------------------------------

# 43. Build Artifacts

Production artifacts should be generated from a known source revision.

Artifacts may include:

``` text
Backend package/image
Frontend build
Migration files
Deployment metadata
```

------------------------------------------------------------------------

# 44. Artifact Immutability

Once an artifact is approved for a release, deploy that exact artifact.

Do not rebuild different code from the same release label during
production deployment unless the process explicitly guarantees
reproducibility.

------------------------------------------------------------------------

# 45. Release Identity

Every production deployment should be identifiable by:

``` text
Git commit SHA
Release/version
Build timestamp
Application version
```

The commit SHA should be the strongest source identifier.

------------------------------------------------------------------------

# 46. Build Metadata

Where practical, expose safe build metadata internally for debugging.

Example:

``` text
Application version
Commit SHA
Environment
```

Do not expose secrets.

------------------------------------------------------------------------

# 47. CI Cache

Dependency/build caches may be used for speed.

Caches must not contain sensitive production credentials.

------------------------------------------------------------------------

# 48. Cache Safety

A CI cache must not cause stale or incompatible dependencies to bypass
lockfile changes.

Invalidate cache appropriately when:

``` text
Lockfile changes
Runtime version changes
Build configuration changes
```

------------------------------------------------------------------------

# 49. Quality Gate Categories

Quality gates should cover:

``` text
Formatting
Linting
Type safety
Unit tests
Integration tests
E2E tests
Security
Build
Migration safety
```

------------------------------------------------------------------------

# 50. Merge Gate

A pull request should not merge into the protected production branch
when required quality checks fail.

------------------------------------------------------------------------

# 51. Flaky Tests

Flaky tests must be treated as defects.

Do not permanently solve flakiness by:

``` text
Ignoring the test
Removing the test
Adding arbitrary retries
```

Investigate the underlying cause.

------------------------------------------------------------------------

# 52. Test Retry Policy

Limited CI retries may be used for infrastructure/transient failures,
but application test failures should not be hidden by repeated automatic
retries.

------------------------------------------------------------------------

# 53. Test Coverage

Coverage is a signal, not the only quality metric.

Do not optimize for:

``` text
100% coverage
```

while leaving critical business paths poorly tested.

Prioritize:

``` text
Pricing
Orders
Payments
Inventory
Authentication
Authorization
Promotions
```

------------------------------------------------------------------------

# 54. Coverage Thresholds

If coverage thresholds are used, they should be:

``` text
Meaningful
Enforced
Maintained
```

Do not set arbitrary thresholds that encourage low-value tests.

------------------------------------------------------------------------

# 55. API Contract Tests

API contract tests should verify:

``` text
Response structure
Error structure
Status codes
Required fields
Authentication behavior
```

------------------------------------------------------------------------

# 56. Frontend/Backend Contract

When API schemas change, CI should detect incompatible frontend/backend
expectations where practical.

------------------------------------------------------------------------

# 57. OpenAPI Validation

If OpenAPI is used as the API contract, validate the
generated/documented schema in CI.

------------------------------------------------------------------------

# 58. Schema Drift

Detect unexpected differences between:

``` text
Backend implementation
API schema
Frontend generated/consumed types
```

where tooling supports it.

------------------------------------------------------------------------

# 59. Production Configuration Checks

Before production deployment, validate non-secret configuration such as:

``` text
Environment name
Required service endpoints
Allowed origins
Secure cookie settings
Debug disabled
Allowed hosts
```

------------------------------------------------------------------------

# 60. Debug Protection

Production deployment must fail or be blocked if production
configuration accidentally enables debug behavior.

------------------------------------------------------------------------

# 61. Database Backup Gate

For deployments involving high-risk/destructive database changes,
require confirmation that the recovery strategy is available before
proceeding.

------------------------------------------------------------------------

# 62. Deployment Ordering

A safe deployment may follow:

``` text
Backward-compatible database change
        ↓
Application deployment
        ↓
Data migration/finalization
        ↓
Cleanup in later release
```

when necessary.

------------------------------------------------------------------------

# 63. Zero-Downtime Considerations

Deployments should account for the possibility that old and new
application instances temporarily run together.

Avoid incompatible:

``` text
API contracts
Database schemas
Task payloads
```

during rolling deployments.

------------------------------------------------------------------------

# 64. Background Worker Compatibility

CI/release validation should consider queued Celery tasks that may have
been created by the previous version.

------------------------------------------------------------------------

# 65. Migration + Worker Compatibility

Do not deploy a migration that breaks currently running workers before
they have been safely replaced or made compatible.

------------------------------------------------------------------------

# 66. Staging Environment

Changes should reach staging before production when the deployment
process supports it.

Staging should resemble production sufficiently to expose meaningful
integration problems.

------------------------------------------------------------------------

# 67. Staging Data

Do not copy production customer/payment data into staging casually.

If production-like data is required for testing, use appropriately
sanitized/anonymized data.

------------------------------------------------------------------------

# 68. Staging Verification

After deployment, verify:

``` text
Application health
Database connectivity
Authentication
Catalog
Cart
Checkout
Background workers
Storage
Provider integrations
```

------------------------------------------------------------------------

# 69. Smoke Tests

A deployment should have a small fast smoke-test suite.

Smoke tests should detect obvious production-breaking failures without
replacing the full test suite.

------------------------------------------------------------------------

# 70. Production Approval

Production promotion should require the defined release gates to pass.

For high-risk changes, explicit human approval should be required.

------------------------------------------------------------------------

# 71. Automated vs Manual Gates

Automate objective checks:

``` text
Tests
Lint
Type checks
Build
Security scans
```

Use human approval for decisions requiring business/operational
judgment:

``` text
High-risk migration
Major payment change
Major pricing change
Emergency release
```

------------------------------------------------------------------------

# 72. Emergency Releases

Emergency changes should still pass the minimum safe checks.

Afterward:

``` text
Document incident
Complete missing review
Add regression test
```

------------------------------------------------------------------------

# 73. Rollback Strategy

Every production deployment should have a defined rollback or recovery
strategy appropriate to the change.

Application rollback may be:

``` text
Previous artifact
Previous release
```

Database rollback may require:

``` text
Forward fix
Restore
Migration-specific recovery
```

Do not assume database rollback is always safe.

------------------------------------------------------------------------

# 74. Automatic Rollback

Automatic rollback may be used only where health signals are reliable.

Do not automatically roll back a financial/data migration based on a
single application error.

------------------------------------------------------------------------

# 75. Health Checks

Deployment health should consider:

``` text
Process health
Application health
Database connectivity
Dependency health
Error rate
```

------------------------------------------------------------------------

# 76. Post-Deployment Monitoring

Immediately after production deployment, monitor:

``` text
HTTP errors
Checkout errors
Payment failures
Database errors
Queue failures
Latency
CPU/memory
```

------------------------------------------------------------------------

# 77. Deployment Observation Window

High-risk releases should have an explicit post-deployment observation
period.

The exact duration depends on:

``` text
Traffic
Risk
Business hours
Change type
```

------------------------------------------------------------------------

# 78. Release Notes

Production releases should record:

``` text
Version
Commit
Major changes
Database changes
Known risks
Rollback/recovery notes
```

------------------------------------------------------------------------

# 79. Database Migration Releases

Migration-heavy releases should document:

``` text
Expected duration
Locking risk
Data volume
Backward compatibility
Recovery strategy
```

------------------------------------------------------------------------

# 80. Dependency Upgrade Releases

Major dependency upgrades should have focused testing.

Examples:

``` text
Django upgrade
Next.js upgrade
React upgrade
Python upgrade
Node upgrade
Payment SDK upgrade
```

------------------------------------------------------------------------

# 81. CI Environment Parity

CI should use runtime versions compatible with staging/production.

Avoid passing CI because it runs on an unrelated runtime.

------------------------------------------------------------------------

# 82. Monorepo Pipeline Structure

If frontend/backend live in one repository, the pipeline may be
organized as:

``` text
backend checks
frontend checks
shared contract checks
integration checks
build
deployment
```

Only relevant jobs need to run for a given change when dependency
analysis is reliable.

------------------------------------------------------------------------

# 83. Change Detection

Selective CI optimization may be used to avoid unnecessary jobs.

However, correctness takes priority over CI speed.

If dependency impact is uncertain, run the broader check.

------------------------------------------------------------------------

# 84. CI Performance

Optimize CI using:

``` text
Caching
Parallel jobs
Selective test suites
Reusable setup
```

without weakening quality gates.

------------------------------------------------------------------------

# 85. CI Failure Ownership

When CI fails, the change owner should investigate whether the failure
is:

``` text
Application defect
Test defect
Infrastructure issue
Dependency issue
CI configuration issue
```

------------------------------------------------------------------------

# 86. Broken Main Policy

The protected production branch should remain releasable.

If main becomes broken:

``` text
Stop unrelated merges
Identify failure
Fix/revert
Restore green pipeline
```

------------------------------------------------------------------------

# 87. Revert Strategy

If a change breaks the main branch and cannot be fixed quickly, revert
the offending change where safe.

Then create a follow-up fix.

------------------------------------------------------------------------

# 88. Release Tags

Production releases may use immutable Git tags.

Tags should map to a specific commit.

------------------------------------------------------------------------

# 89. Versioning

Use a consistent application versioning strategy.

The exact scheme may be:

``` text
Semantic versioning
Date-based release
Commit-based identity
```

The repository should choose one clear approach.

------------------------------------------------------------------------

# 90. Deployment Auditability

Record:

``` text
Who deployed
What version
When
Environment
Result
```

------------------------------------------------------------------------

# 91. Deployment Permissions

Production deployment permissions should be restricted.

Not every developer or AI agent should automatically have unrestricted
production deployment authority.

------------------------------------------------------------------------

# 92. AI Agent Deployment Rule

Antigravity may prepare:

``` text
Code
Tests
Migration
CI configuration
Release notes
```

but production deployment authority must follow the project's explicit
permissions and approval process.

------------------------------------------------------------------------

# 93. AI Agent Quality Rule

An AI agent must not bypass failed quality gates because:

``` text
The feature is urgent
The failure appears unrelated
The agent believes the code is correct
```

A bypass requires explicit human authorization.

------------------------------------------------------------------------

# 94. CI/CD Definition of Done

CI/CD architecture is complete when:

-   Repository workflow is defined.
-   Main/protected branch policy exists.
-   Backend lint/type checks run.
-   Frontend lint/type checks run.
-   Unit tests run.
-   Integration tests run.
-   Critical E2E tests run.
-   Security/secret/dependency checks run.
-   Migration consistency is checked.
-   Production build succeeds.
-   Artifacts are identifiable and reproducible.
-   Staging verification exists.
-   Production approval gates exist.
-   Rollback/recovery strategy exists.
-   Deployment monitoring exists.
-   Deployment auditability exists.
-   AI agents cannot silently bypass required quality gates.

------------------------------------------------------------------------

# 95. AI Agent CI/CD Rules

Antigravity must not:

-   Skip tests to make CI green.
-   Disable lint/type checks to merge a feature.
-   Delete failing tests without explicit justification.
-   Ignore migration failures.
-   Commit secrets to CI configuration.
-   Print secrets in build logs.
-   Deploy unreviewed code to production.
-   Bypass required production approvals.
-   Automatically downgrade security checks to warnings.
-   Treat flaky tests as acceptable permanent failures.
-   Change CI quality gates merely to accommodate its generated code.
-   Claim CI passed without actually running/observing the relevant
    checks.

------------------------------------------------------------------------

# 96. CI/CD Change Workflow

``` text
Requirement
   ↓
Code change
   ↓
Tests
   ↓
CI quality gates
   ↓
Review
   ↓
Build artifact
   ↓
Staging deployment
   ↓
Smoke/integration verification
   ↓
Production approval
   ↓
Production deployment
   ↓
Post-deployment monitoring
   ↓
Release record
```

------------------------------------------------------------------------

# 97. CI/CD Summary

``` text
                     Git
                      |
                   PR/Push
                      |
                     CI
                      |
        ┌─────────────┼─────────────┐
        ↓             ↓             ↓
      Backend       Frontend     Security
        |             |             |
        └─────────────┼─────────────┘
                      ↓
                    Tests
                      ↓
                    Build
                      ↓
                   Staging
                      ↓
                  Verification
                      ↓
                 Production
                      ↓
                 Monitoring
```

The fundamental rule is:

``` text
No quality gate exists merely for appearance.
Every enforced gate must protect correctness, security, reliability, or deployability.
If a gate fails, fix the underlying problem or obtain an explicit authorized exception.
Never weaken the pipeline just to make a release pass.
```

------------------------------------------------------------------------

# 98. Next Document

The next genuinely new document should be:

``` text
38-environment-configuration-management.md
```

It will define:

-   Development/staging/production environments.
-   Environment variables.
-   Secret management.
-   Configuration validation.
-   Public vs private configuration.
-   Local setup.
-   Supabase environment separation.
-   Payment/shipping provider environments.
-   Configuration drift.
-   Secret rotation.
-   Environment parity.
-   AI-agent configuration rules.
