# Closet by Chilli --- Production Readiness Checklist

## 1. Purpose

This document is the final pre-production and go-live checklist for
Closet by Chilli.

It consolidates the architecture decisions and implementation
requirements into a practical verification checklist.

The purpose is to answer:

``` text
Is the platform safe to launch?
Is the infrastructure ready?
Are critical customer journeys working?
Can we recover from failure?
Can the team observe and operate production?
```

This document does not replace the detailed architecture documents. It
is a release gate that points back to those requirements.

------------------------------------------------------------------------

# 2. Launch Principle

Production launch must be based on verified evidence.

Do not consider the platform ready because:

``` text
The application builds
The homepage works
The agent reports completion
```

Readiness requires:

``` text
Tests
Security checks
Operational verification
Recovery readiness
Critical-flow verification
```

------------------------------------------------------------------------

# 3. Release Information

Record:

``` text
Release/version:
Git commit:
Release date:
Environment:
Release owner:
Reviewer:
Deployment operator:
```

------------------------------------------------------------------------

# 4. Architecture Readiness

Verify:

-   Backend architecture matches the approved Django architecture.
-   Frontend architecture matches the approved Next.js/React
    architecture.
-   PostgreSQL/Supabase is configured according to the database
    architecture.
-   API boundaries are implemented consistently.
-   Domain ownership is clear.
-   Background jobs follow the async architecture.
-   Environment isolation is configured.
-   CI/CD quality gates are active.

------------------------------------------------------------------------

# 5. Repository Readiness

Verify:

-   Production code is committed to version control.
-   No uncommitted production changes exist.
-   Required documentation is present.
-   Dependency lockfiles are committed.
-   Build configuration is version-controlled.
-   Migration files are version-controlled.
-   CI configuration is version-controlled.

------------------------------------------------------------------------

# 6. Dependency Readiness

Verify:

-   Python runtime version is explicitly defined.
-   Node.js runtime version is explicitly defined.
-   Dependencies are locked appropriately.
-   No unnecessary dependencies were introduced.
-   Known critical/high dependency vulnerabilities are addressed or
    explicitly risk-accepted.
-   Production dependencies have been reviewed.
-   Build succeeds from a clean environment.

------------------------------------------------------------------------

# 7. Backend Readiness

Verify:

-   Django production configuration is active.
-   `DEBUG=False`.
-   Allowed hosts are correctly configured.
-   Production database configuration is correct.
-   API routing is correct.
-   Authentication is enabled.
-   Authorization is enforced.
-   CORS configuration is allowlisted.
-   CSRF configuration is correct.
-   Secure cookie configuration is enabled where applicable.
-   Error handling uses the standard API contract.
-   Unexpected exceptions are logged safely.

------------------------------------------------------------------------

# 8. Frontend Readiness

Verify:

-   Next.js production build succeeds.
-   TypeScript checks pass.
-   Lint checks pass.
-   Production API URL is correct.
-   Public environment variables contain no secrets.
-   Server/client component boundaries are correct.
-   Error states are implemented.
-   Loading states are implemented.
-   Empty states are implemented.
-   Critical pages work in production configuration.

------------------------------------------------------------------------

# 9. Database Readiness

Verify:

-   Production Supabase/PostgreSQL project is correct.
-   Database schema matches the approved architecture.
-   Required tables exist.
-   Relationships are correct.
-   Foreign keys are correct.
-   Unique constraints are correct.
-   Required indexes exist.
-   Required RLS/security policies are configured where applicable.
-   Migration state is consistent.
-   No accidental development/test data exists.
-   Production database credentials are correct.
-   Database backups are active.

------------------------------------------------------------------------

# 10. Supabase MCP Verification

Before production database work:

-   Verify the Supabase project/environment identity.
-   Confirm the intended production target.
-   Review the requested schema operation.
-   Verify destructive operations explicitly.
-   Confirm security policies after schema changes.
-   Confirm migrations/reproducibility where required.

The successful execution of an MCP command is not itself proof that the
resulting architecture is correct.

------------------------------------------------------------------------

# 11. Data Integrity

Verify:

-   Product identifiers are unique.
-   SKU/variant identifiers are unique where required.
-   Prices use appropriate monetary representation.
-   Inventory quantities are valid.
-   Order totals are internally consistent.
-   Payment records have valid relationships.
-   Promotion references are valid.
-   Customer/order relationships are correct.
-   Required timestamps are valid and timezone-aware.

------------------------------------------------------------------------

# 12. Authentication Readiness

Verify:

-   Registration works if enabled.
-   Login works.
-   Logout works.
-   Session/token behavior is correct.
-   Protected endpoints reject unauthenticated requests.
-   Expired authentication is handled correctly.
-   Password/recovery flows are safe.
-   Customer data cannot be accessed across accounts.
-   Admin authentication is protected.

------------------------------------------------------------------------

# 13. Authorization Readiness

Verify:

-   Customer endpoints enforce ownership.
-   Admin endpoints enforce permissions.
-   Wholesale access is restricted appropriately.
-   Customer users cannot access admin resources.
-   Retail users cannot access protected wholesale functionality.
-   Object-level authorization is tested.
-   Direct object-ID manipulation cannot bypass permissions.

------------------------------------------------------------------------

# 14. Catalog Readiness

Verify:

-   Categories load.
-   Products load.
-   Product variants load.
-   Product media loads.
-   Product availability is correct.
-   Product prices are correct.
-   Out-of-stock behavior is correct.
-   Product filtering works.
-   Search works.
-   Pagination works.
-   Invalid product/category requests return safe errors.

------------------------------------------------------------------------

# 15. Product Media

Verify:

-   Production storage is correct.
-   Product images load.
-   Image URLs are valid.
-   Upload permissions are restricted.
-   Invalid file types are rejected.
-   Oversized uploads are rejected.
-   Development/staging media is isolated from production.
-   Important originals are protected by the backup strategy.

------------------------------------------------------------------------

# 16. Cart Readiness

Verify:

-   Products can be added.
-   Variants can be selected.
-   Quantities can be changed.
-   Items can be removed.
-   Cart totals are correct.
-   Pricing is recalculated authoritatively.
-   Inventory availability is checked.
-   Expired promotions are removed/rejected appropriately.
-   Cart state is isolated per customer/session as designed.

------------------------------------------------------------------------

# 17. Pricing Readiness

Verify:

-   Retail pricing is correct.
-   Wholesale pricing rules are correct.
-   Variant pricing is correct.
-   Discounts are calculated server-side.
-   Monetary rounding is consistent.
-   Pricing cannot be manipulated from the frontend.
-   Price snapshots are created where required.
-   Checkout revalidates authoritative pricing.

------------------------------------------------------------------------

# 18. Promotion Readiness

Verify:

-   Promotion eligibility is correct.
-   Coupon validation works.
-   Expired coupons are rejected.
-   Usage limits are enforced.
-   Customer-specific limits are enforced where required.
-   Minimum-order rules work.
-   Product/category eligibility works.
-   Promotion stacking rules work.
-   Concurrent redemption is safe.
-   Checkout revalidates promotion eligibility.

------------------------------------------------------------------------

# 19. Inventory Readiness

Verify:

-   Inventory is authoritative on the backend.
-   Available quantity is calculated correctly.
-   Overselling protection exists.
-   Concurrent checkout behavior is tested.
-   Reservation behavior is correct if implemented.
-   Inventory is updated only through authorized domain operations.
-   Admin adjustments are audited.
-   Order cancellation/return behavior updates inventory correctly.

------------------------------------------------------------------------

# 20. Checkout Readiness

Verify the complete flow:

``` text
Cart
 ↓
Customer information
 ↓
Address
 ↓
Shipping method
 ↓
Pricing validation
 ↓
Promotion validation
 ↓
Inventory validation
 ↓
Payment
 ↓
Order creation/finalization
```

Test:

-   Successful checkout.
-   Invalid address.
-   Unserviceable area.
-   Insufficient stock.
-   Expired promotion.
-   Price change.
-   Payment failure.
-   Payment pending.
-   Duplicate submission.
-   Browser refresh/retry.

------------------------------------------------------------------------

# 21. Payment Readiness

Verify:

-   Production payment provider credentials are correct.
-   Sandbox credentials are not accidentally used in production.
-   Webhook endpoint is correct.
-   Webhook authentication/signature verification works.
-   Webhook events are persisted appropriately.
-   Duplicate webhook delivery is safe.
-   Payment state transitions are idempotent.
-   Payment amount is verified server-side.
-   Payment status is not trusted from the browser.
-   Refund behavior is tested.
-   Payment reconciliation procedure exists.
-   Raw provider errors are not exposed to customers.

------------------------------------------------------------------------

# 22. Payment Safety Gate

Before launch:

``` text
NO REAL CUSTOMER PAYMENT
should be processed until:
```

-   Production provider configuration is verified.
-   Correct merchant/account configuration is verified.
-   Webhook handling is verified.
-   Monitoring is active.
-   Recovery/reconciliation procedures are ready.

------------------------------------------------------------------------

# 23. Order Readiness

Verify:

-   Orders are created correctly.
-   Order numbers/identifiers are correct.
-   Order items contain authoritative snapshots.
-   Totals are correct.
-   Payment state is recorded.
-   Fulfillment state is recorded.
-   Customer ownership is enforced.
-   Order history works.
-   Cancellation rules work.
-   Refund relationships work.
-   Order state transitions are protected.

------------------------------------------------------------------------

# 24. Shipping Readiness

Verify:

-   Shipping methods are correct.
-   Shipping rates are correct.
-   Serviceability checks work.
-   Invalid addresses are rejected.
-   Shipping provider credentials are correct.
-   Shipment creation works in the intended environment.
-   Shipping webhooks are handled safely.
-   Duplicate/out-of-order events are handled.
-   Tracking information is exposed safely.
-   Shipping failures do not corrupt order state.

------------------------------------------------------------------------

# 25. Customer Account Readiness

Verify:

-   Profile access works.
-   Address management works.
-   Order history works.
-   Customer data is private.
-   Account updates are validated.
-   Unauthorized object access is rejected.
-   Account deletion/deactivation behavior follows the approved policy.

------------------------------------------------------------------------

# 26. Wishlist/Cart Persistence

If implemented, verify:

-   Wishlist creation/removal works.
-   Cart persistence works.
-   Authentication transitions are handled correctly.
-   Data is isolated per customer.
-   Removed/unavailable products are handled safely.

------------------------------------------------------------------------

# 27. Wholesale Readiness

If wholesale functionality is enabled:

-   Application flow works.
-   Approval workflow works.
-   Wholesale-only resources are protected.
-   Wholesale pricing is server-authoritative.
-   Retail customers cannot access wholesale pricing.
-   Admin approval actions are audited.
-   Wholesale status transitions are validated.

------------------------------------------------------------------------

# 28. Admin Readiness

Verify:

-   Admin login works.
-   Role/permission checks work.
-   Product management works.
-   Inventory management works.
-   Promotion management works.
-   Order management works.
-   Customer access is controlled.
-   Wholesale management works if enabled.
-   Audit logging works for sensitive operations.
-   Bulk operations are safe.

------------------------------------------------------------------------

# 29. API Readiness

Verify:

-   API versioning strategy is applied.
-   Success responses follow the standard contract.
-   Error responses follow the standard contract.
-   Error codes are stable.
-   Validation errors are structured.
-   HTTP statuses are correct.
-   Request IDs are available.
-   Unexpected errors return safe generic responses.
-   No stack traces are exposed.
-   Pagination is bounded.
-   Filtering/sorting is allowlisted.

------------------------------------------------------------------------

# 30. API Security

Verify:

-   Authentication is enforced where required.
-   Authorization is enforced.
-   Object ownership is checked.
-   Mass assignment is prevented.
-   Input validation is active.
-   Output fields are intentionally exposed.
-   Rate limits exist for sensitive endpoints.
-   Sensitive data is not returned unnecessarily.

------------------------------------------------------------------------

# 31. Background Jobs

Verify:

-   Worker infrastructure is running.
-   Broker configuration is correct.
-   Production workers use production queues only.
-   Tasks are idempotent.
-   Retry policies are bounded.
-   Permanent failures are observable.
-   Scheduled jobs are configured.
-   Worker monitoring is active.
-   Queue backlog is visible.
-   Provider rate limits are respected.

------------------------------------------------------------------------

# 32. Background Job Recovery

Verify procedures exist for:

-   Failed task retry.
-   Duplicate task execution.
-   Worker restart.
-   Broker failure.
-   Queue recovery.
-   Payment event replay.
-   Shipping event replay.
-   Notification recovery.

Do not blindly replay financial/provider tasks.

------------------------------------------------------------------------

# 33. Email Readiness

Verify:

-   Production email provider is configured.
-   Sender identity is correct.
-   Domain authentication is configured where applicable.
-   Transactional templates are correct.
-   Customer emails do not expose sensitive information.
-   Email failures do not corrupt business state.
-   Duplicate notification behavior is controlled.

------------------------------------------------------------------------

# 34. SMS Readiness

If enabled:

-   Production SMS configuration is correct.
-   Sender identity is correct.
-   Sensitive data is not unnecessarily included.
-   Rate limits are respected.
-   Duplicate sends are controlled.
-   Provider failures are observable.

------------------------------------------------------------------------

# 35. Search Readiness

Verify:

-   Search works.
-   Search indexing is populated.
-   Product updates propagate appropriately.
-   Search filters work.
-   Pagination is bounded.
-   Search failures degrade safely.
-   Search index can be rebuilt from authoritative catalog data.

------------------------------------------------------------------------

# 36. Cache Readiness

Verify:

-   Cache configuration is correct.
-   Personalized data is not shared across users.
-   Critical authorization does not rely solely on cache state.
-   Invalidation rules are defined.
-   Cache can be safely cleared.
-   Application remains correct with a cold cache.

------------------------------------------------------------------------

# 37. Performance Readiness

Measure:

``` text
Homepage
Catalog
Product page
Search
Cart
Checkout
Admin
```

Verify:

-   No obvious N+1 queries.
-   Database queries are reasonable.
-   Images are optimized.
-   API latency is acceptable.
-   Frontend bundle is reasonable.
-   Caching behaves as expected.
-   Slow provider calls have timeouts.

------------------------------------------------------------------------

# 38. Load/Stress Readiness

For important expected traffic levels, verify:

-   Database capacity.
-   API capacity.
-   Worker capacity.
-   Queue behavior.
-   Storage behavior.
-   Rate limiting.
-   External provider limits.

Do not claim scalability without measured evidence.

------------------------------------------------------------------------

# 39. Security Readiness

Verify:

-   No committed secrets.
-   Secret scanning passes.
-   Dependency security checks pass.
-   Production debug mode is disabled.
-   HTTPS is enforced.
-   Secure cookies are configured.
-   CORS is restricted.
-   CSRF protection is correct.
-   Authentication is protected.
-   Authorization is tested.
-   File uploads are restricted.
-   Rate limiting exists.
-   Sensitive logs are protected.

------------------------------------------------------------------------

# 40. Security Headers

Verify appropriate production security headers are configured according
to the deployment architecture.

Do not enable headers blindly without verifying their compatibility
with:

``` text
Next.js
CDN
Images
Payment flows
Embedded providers
```

------------------------------------------------------------------------

# 41. Privacy Readiness

Verify:

-   Customer data exposure is minimized.
-   Logs do not contain unnecessary personal information.
-   Exports are protected.
-   Backups are access-controlled.
-   Data deletion policy is documented.
-   Staging does not casually contain production customer data.

------------------------------------------------------------------------

# 42. Observability Readiness

Verify:

-   Application logs are available.
-   Error monitoring is configured.
-   Metrics are available.
-   Request IDs are available.
-   Background task metrics are available.
-   Database health is monitored.
-   Provider failures are visible.
-   Production alerts are configured.

------------------------------------------------------------------------

# 43. Critical Alerts

At minimum, monitor important failures such as:

``` text
High 5xx rate
Checkout failures
Payment failures
Database errors
Worker failure
Queue backlog
Storage failure
Authentication failure spikes
```

------------------------------------------------------------------------

# 44. Health Checks

Verify health checks cover the services necessary for production
operation.

A health endpoint must not expose secrets or internal credentials.

------------------------------------------------------------------------

# 45. Backup Readiness

Verify:

-   Production database backups are active.
-   Backup retention is defined.
-   Backup failures are monitored.
-   Recovery points are available.
-   Media backup strategy exists.
-   Configuration recovery is documented.
-   Backup access is restricted.

------------------------------------------------------------------------

# 46. Restore Readiness

Verify:

-   A production-like restore has been tested.
-   Database can be restored.
-   Media can be restored/accessed.
-   Application can connect to restored data.
-   Critical customer journeys work after restore.
-   Payment reconciliation is documented.
-   Shipping reconciliation is documented.

------------------------------------------------------------------------

# 47. RPO/RTO

Record approved targets:

``` text
Database RPO:
Database RTO:

Media RPO:
Media RTO:

Other critical systems:
```

Do not leave these undefined for production.

------------------------------------------------------------------------

# 48. Disaster Recovery Readiness

Verify:

-   Recovery runbook exists.
-   Recovery owner is defined.
-   Emergency access is defined.
-   Credential compromise process exists.
-   Bad migration recovery exists.
-   Database corruption recovery exists.
-   Queue recovery exists.
-   Production cutover procedure exists.

------------------------------------------------------------------------

# 49. Environment Readiness

Verify:

-   Development is isolated.
-   Staging is isolated.
-   Production is isolated.
-   Correct Supabase project is selected.
-   Correct storage is selected.
-   Correct queue/broker is selected.
-   Correct provider credentials are selected.
-   Correct webhook endpoints are configured.

------------------------------------------------------------------------

# 50. Production Configuration

Verify:

-   Required environment variables exist.
-   No unsafe defaults are active.
-   Production configuration is validated.
-   Public variables contain no secrets.
-   Secret rotation procedure exists.
-   Configuration drift is controlled.

------------------------------------------------------------------------

# 51. CI/CD Readiness

Verify:

-   Main branch is protected.
-   Required checks are enforced.
-   Backend linting passes.
-   Frontend linting passes.
-   Type checks pass.
-   Unit tests pass.
-   Integration tests pass.
-   Critical E2E tests pass.
-   Security scans pass.
-   Build passes.
-   Migration checks pass.
-   Production artifact is identifiable.
-   Deployment auditability exists.

------------------------------------------------------------------------

# 52. Staging Readiness

Before production:

-   Deploy the release to staging.
-   Run smoke tests.
-   Run critical E2E flows.
-   Verify database migrations.
-   Verify background jobs.
-   Verify provider sandbox integrations.
-   Verify frontend/backend compatibility.
-   Verify monitoring.

------------------------------------------------------------------------

# 53. Production Deployment Readiness

Verify:

-   Release commit is identified.
-   Deployment artifact is identified.
-   Database migration plan is reviewed.
-   Backup/recovery readiness is confirmed.
-   Rollback/recovery strategy is documented.
-   Production secrets are available through secure mechanisms.
-   Deployment permissions are correct.
-   Monitoring is active.

------------------------------------------------------------------------

# 54. Rollback Readiness

Verify:

``` text
Application rollback method:
Database recovery/forward-fix method:
Media recovery method:
Queue recovery method:
```

Do not assume that rolling back application code automatically rolls
back database state.

------------------------------------------------------------------------

# 55. Launch-Day Smoke Test

Immediately after production deployment, verify:

``` text
Homepage
Catalog
Category
Product
Search
Login
Cart
Checkout initiation
Payment status
Order creation
Order history
Admin
```

------------------------------------------------------------------------

# 56. Launch-Day Monitoring

After deployment, monitor closely:

``` text
HTTP 5xx
HTTP latency
Checkout failures
Payment failures
Order creation
Inventory errors
Queue failures
Database load
Storage errors
Authentication errors
```

------------------------------------------------------------------------

# 57. Launch-Day Business Verification

Confirm that:

-   Products display correct prices.
-   Inventory is correct.
-   Promotions are correct.
-   Shipping rates are correct.
-   Payment provider is processing correctly.
-   Orders are being created.
-   Confirmation notifications are working.

------------------------------------------------------------------------

# 58. Launch-Day Data Verification

Check a controlled sample of:

``` text
Product
Variant
Inventory
Order
Payment
Customer
Promotion
```

for correct relationships and values.

------------------------------------------------------------------------

# 59. Customer Support Readiness

Support/operations should know:

``` text
How customers place orders
How order status is checked
How refunds are handled
How common failures are recognized
How incidents are escalated
```

------------------------------------------------------------------------

# 60. Incident Readiness

Verify:

-   Incident severity definitions exist.
-   Technical owner is known.
-   Business owner is known.
-   Provider escalation contacts are known.
-   Recovery runbook is accessible.
-   Monitoring access is available.

------------------------------------------------------------------------

# 61. Documentation Readiness

Verify the repository documentation contains the approved:

``` text
Architecture
API
Database
Security
Async
Recovery
Coding standards
CI/CD
Environment configuration
Production checklist
```

------------------------------------------------------------------------

# 62. Legal/Content Readiness

Before launch, verify the business has supplied/approved required
production content such as:

``` text
Privacy policy
Terms
Refund/cancellation policy
Shipping policy
Contact information
Business identity details
```

The engineering team must not invent legal terms.

------------------------------------------------------------------------

# 63. SEO Readiness

Verify:

-   Production domain is correct.
-   Metadata is correct.
-   Canonical URLs are correct.
-   Sitemap works.
-   Robots configuration is correct.
-   Product/category pages are indexable as intended.
-   No staging environment is accidentally indexed.

------------------------------------------------------------------------

# 64. Accessibility Readiness

Verify critical flows support:

``` text
Keyboard navigation
Form labels
Visible focus
Accessible errors
Alt text
Meaningful button/link labels
```

------------------------------------------------------------------------

# 65. Browser/Device Readiness

Test the supported browser/device matrix.

At minimum, verify:

``` text
Desktop
Mobile
Common modern browsers
```

The exact support matrix should be documented.

------------------------------------------------------------------------

# 66. Mobile Readiness

Verify:

-   Navigation works.
-   Product pages work.
-   Cart works.
-   Checkout works.
-   Payment flow works.
-   Forms are usable.
-   Buttons are reachable.
-   Images do not break layout.

------------------------------------------------------------------------

# 67. Production Data Seeding

Verify that required production seed/reference data exists.

Examples:

``` text
Categories
Shipping configuration
Required system settings
Admin roles
Initial content
```

Do not seed fake customer/order/payment data into production.

------------------------------------------------------------------------

# 68. Admin Bootstrap

Verify the initial administrative access is:

``` text
Created
Protected
Audited
Documented
```

Do not share admin credentials casually.

------------------------------------------------------------------------

# 69. Monitoring Ownership

For each critical alert, identify:

``` text
Who receives it
Who investigates
Who escalates
```

------------------------------------------------------------------------

# 70. Launch Go/No-Go Criteria

Production should be:

``` text
GO
```

only when critical launch gates are satisfied.

Use:

``` text
NO-GO
```

when a critical issue remains in areas such as:

``` text
Payment
Order creation
Inventory correctness
Authentication
Authorization
Database integrity
Security
Backup/recovery
Production configuration
```

------------------------------------------------------------------------

# 71. Risk Acceptance

If a non-critical item remains incomplete, record:

``` text
Risk
Impact
Owner
Mitigation
Target completion
Approval
```

Do not silently ignore known risks.

------------------------------------------------------------------------

# 72. Final Security Sign-Off

Confirm:

``` text
Secrets safe
Auth safe
Authorization safe
Production debug disabled
Sensitive logging controlled
Provider credentials correct
```

------------------------------------------------------------------------

# 73. Final Data Sign-Off

Confirm:

``` text
Database schema correct
RLS/security policies correct
Catalog correct
Pricing correct
Inventory correct
Order structure correct
```

------------------------------------------------------------------------

# 74. Final Payment Sign-Off

Confirm:

``` text
Provider account correct
Credentials correct
Webhook correct
Signature verification correct
Idempotency correct
Amount verification correct
Refund flow correct
Reconciliation ready
```

------------------------------------------------------------------------

# 75. Final Recovery Sign-Off

Confirm:

``` text
Backup exists
Backup monitoring active
Restore tested
RPO/RTO defined
Recovery owner defined
Runbook accessible
```

------------------------------------------------------------------------

# 76. Final Operations Sign-Off

Confirm:

``` text
Monitoring active
Alerts active
Logs available
Workers healthy
Queue healthy
Deployment access controlled
Incident process known
```

------------------------------------------------------------------------

# 77. Final AI-Agent Sign-Off

Before allowing Antigravity to participate in the release:

-   Repository documentation is available to the agent.
-   The agent has development/staging access appropriate to its task.
-   Production credentials are not unnecessarily exposed.
-   CI/CD quality gates are active.
-   The agent cannot silently bypass required checks.
-   Database MCP target/environment is verified before sensitive
    operations.
-   The agent's generated changes are reviewed and tested.

------------------------------------------------------------------------

# 78. Final Go-Live Checklist

Use this condensed checklist immediately before release:

``` text
[ ] Release commit identified
[ ] CI green
[ ] Tests green
[ ] Security scans green
[ ] Production build green
[ ] Database migrations reviewed
[ ] Backup verified
[ ] Recovery procedure ready
[ ] Production configuration verified
[ ] Supabase project verified
[ ] Storage verified
[ ] Queue/broker verified
[ ] Payment provider verified
[ ] Shipping provider verified
[ ] Webhooks verified
[ ] Authentication verified
[ ] Authorization verified
[ ] Catalog verified
[ ] Pricing verified
[ ] Promotions verified
[ ] Inventory verified
[ ] Checkout verified
[ ] Orders verified
[ ] Admin verified
[ ] Monitoring verified
[ ] Alerts verified
[ ] Smoke tests ready
[ ] Rollback/recovery plan ready
[ ] Support ready
[ ] Required content/legal pages approved
[ ] Go/No-Go owner approved
```

------------------------------------------------------------------------

# 79. Post-Launch Checklist

After launch:

``` text
[ ] Homepage verified
[ ] Catalog verified
[ ] Search verified
[ ] Cart verified
[ ] Checkout verified
[ ] Payment verified
[ ] Order creation verified
[ ] Inventory verified
[ ] Notifications verified
[ ] Background workers verified
[ ] Queue depth normal
[ ] Error rate normal
[ ] Database healthy
[ ] Storage healthy
[ ] No critical alerts
```

------------------------------------------------------------------------

# 80. First-Day Monitoring

During the initial production period, pay special attention to:

``` text
Payment failures
Order failures
Inventory inconsistencies
Unexpected 5xx responses
Authentication problems
Provider outages
Queue backlog
Database performance
Customer-reported issues
```

------------------------------------------------------------------------

# 81. Post-Launch Review

After the initial launch window, review:

``` text
What worked
What failed
Unexpected errors
Performance
Customer feedback
Operational issues
Monitoring gaps
```

Create follow-up tasks for meaningful issues.

------------------------------------------------------------------------

# 82. Production Readiness Definition of Done

Production readiness is complete when:

-   Critical customer journeys are verified.
-   Database is correct and recoverable.
-   Payment flow is verified.
-   Inventory is protected.
-   Authentication/authorization are verified.
-   API contracts are stable.
-   Background jobs are healthy.
-   Security checks pass.
-   Environment isolation is verified.
-   CI/CD gates pass.
-   Monitoring and alerts are active.
-   Backup/restore readiness is proven.
-   Rollback/recovery is documented.
-   Support/operations are prepared.
-   Business-required content is approved.
-   Launch owner gives explicit Go/No-Go approval.

------------------------------------------------------------------------

# 83. AI Agent Production Rules

Antigravity must not:

-   Declare the project production-ready based only on successful
    builds.
-   Skip critical tests.
-   Bypass failed security checks.
-   Deploy to production without the approved release process.
-   Modify production data to make a checklist pass.
-   Use real customer/payment data for testing.
-   Assume payment success without provider verification.
-   Assume inventory correctness without database/domain verification.
-   Claim backup/recovery readiness without evidence.
-   Treat MCP execution success as proof of schema correctness.
-   Expose production credentials.
-   Mark unresolved critical risks as complete.
-   Invent legal/business approval.

------------------------------------------------------------------------

# 84. Go-Live Decision

The final decision should be explicit:

``` text
GO
NO-GO
```

with:

``` text
Decision owner:
Date:
Release:
Known accepted risks:
Notes:
```

------------------------------------------------------------------------

# 85. Production Readiness Summary

``` text
                         GO-LIVE
                            |
          ┌─────────────────┼─────────────────┐
          ↓                 ↓                 ↓
       Product           Platform          Operations
          |                 |                 |
       Catalog           Database          Monitoring
       Pricing           Security          Alerts
       Cart              Payments           Recovery
       Checkout          Storage            Support
       Orders            Workers            Incident
          |                 |                 |
          └─────────────────┼─────────────────┘
                            ↓
                     Final Verification
                            ↓
                       GO / NO-GO
```

The fundamental rule is:

``` text
Production readiness is evidence, not confidence.

If a critical business, security, data, payment, recovery, or operational requirement
has not been verified, the system is not ready for launch.
```

------------------------------------------------------------------------

# 86. Architecture Documentation Set Complete

This document completes the current architecture/documentation
foundation.

The next phase should not be another broad architecture document.

Move to:

``` text
Professional repository/project initialization
        ↓
Local development environment
        ↓
Django backend initialization
        ↓
Next.js frontend initialization
        ↓
Supabase environment/MCP setup
        ↓
CI/CD foundation
        ↓
Sprint-by-sprint implementation
```

Each implementation sprint should follow the agreed workflow:

``` text
Sprint Prompt
    ↓
Antigravity implementation
    ↓
Run prescribed tests
    ↓
Review results
    ↓
Fix failures
    ↓
Approve sprint
    ↓
Next sprint
```
