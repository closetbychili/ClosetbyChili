# Closet by Chilli --- Disaster Recovery & Backup Architecture

## 1. Purpose

This document defines the disaster recovery, backup, restore, and
business-continuity architecture for Closet by Chilli.

It complements the deployment/infrastructure architecture by focusing
specifically on:

``` text
Data protection
Backup
Restore
Disaster recovery
Data corruption
Provider outages
Credential compromise
Operational recovery
Business continuity
```

The objective is not merely to create backups, but to ensure that
backups can actually be restored and that the business has a documented
recovery path.

------------------------------------------------------------------------

# 2. Recovery Principles

The platform follows:

``` text
Backups must be automated
Backups must be protected
Backups must be monitored
Restores must be tested
Recovery procedures must be documented
Critical data must have defined recovery objectives
```

A backup that has never been restored successfully should not be treated
as a proven recovery mechanism.

------------------------------------------------------------------------

# 3. Disaster Categories

The recovery architecture should account for:

``` text
Database corruption
Accidental deletion
Application deployment failure
Bad migration
Storage/media loss
Credential compromise
Payment-provider outage
Cloud/provider outage
Infrastructure failure
Regional/service disruption
Malicious data modification
Human operational error
```

------------------------------------------------------------------------

# 4. Recovery Scope

Critical recoverable assets include:

``` text
PostgreSQL data
Customer/order data
Product/catalog data
Inventory
Payment/order records
Promotion configuration
Admin/audit records
Media assets
Application configuration
Infrastructure configuration
Required secrets/configuration references
```

Not every transient cache or generated artifact requires backup.

------------------------------------------------------------------------

# 5. Source of Truth

The primary business source of truth remains the authoritative
application database.

Examples:

``` text
Orders
Payments
Customers
Products
Inventory
Promotions
Admin records
```

Caches, search indexes, queues, and analytics systems should generally
be rebuildable from authoritative data where the architecture permits.

------------------------------------------------------------------------

# 6. Recovery Objectives

The project should explicitly define:

``` text
RPO = maximum acceptable data loss
RTO = maximum acceptable recovery time
```

These values must be agreed with the business before production launch.

Do not invent business-critical RPO/RTO targets solely in application
code.

------------------------------------------------------------------------

# 7. Recommended Initial Targets

For a production ecommerce platform, reasonable initial targets may be
considered during planning, for example:

``` text
Critical database:
RPO: minutes to low hours
RTO: hours

Media:
RPO: hours to one day
RTO: hours to one day

Rebuildable caches/search:
RPO: not applicable
RTO: hours
```

These are planning examples, not final contractual requirements.

------------------------------------------------------------------------

# 8. Supabase/PostgreSQL Recovery

Because the architecture uses Supabase/PostgreSQL, database recovery
planning must account for the capabilities and configuration of the
selected Supabase plan/environment.

The project should explicitly verify:

``` text
Automated backups
Point-in-time recovery availability
Backup retention
Restore mechanism
Database size limits
Recovery process
```

Do not assume a feature exists on the production plan without verifying
it.

------------------------------------------------------------------------

# 9. Database Backup Strategy

The database backup strategy should provide appropriate protection
against:

``` text
Accidental deletion
Corruption
Bad migrations
Application bugs
Operational mistakes
Infrastructure failure
```

------------------------------------------------------------------------

# 10. Point-in-Time Recovery

Where supported and appropriate, point-in-time recovery should be
preferred for critical production database recovery.

Conceptually:

``` text
Database
   ↓
Continuous/log-based recovery capability
   ↓
Choose recovery timestamp
   ↓
Restore
```

This is particularly useful when corruption or accidental deletion
occurs at a known time.

------------------------------------------------------------------------

# 11. Backup Retention

Retention should be defined by:

``` text
Business requirements
Operational recovery needs
Compliance requirements
Storage cost
```

A practical strategy may maintain:

``` text
Recent high-frequency recovery points
Daily backups
Longer-term periodic backups
```

The exact periods must be finalized before production.

------------------------------------------------------------------------

# 12. Backup Isolation

Backups should not be stored only in the same logical location as the
primary application environment.

Where practical, maintain an independent recovery path.

This reduces the risk that one incident destroys:

``` text
Primary data
+
Backup
```

simultaneously.

------------------------------------------------------------------------

# 13. Backup Security

Backups must be protected with:

``` text
Access control
Encryption where supported
Least-privilege credentials
Restricted administrative access
Auditability
```

------------------------------------------------------------------------

# 14. Backup Access

Only authorized infrastructure/operations personnel should have access
to production backups.

Application users must never be able to browse or download raw database
backups.

------------------------------------------------------------------------

# 15. Backup Encryption

Production backups should use encryption provided by the
storage/database platform where available.

If application-managed backup artifacts are created, their encryption
strategy must also be defined.

------------------------------------------------------------------------

# 16. Media Backup

Product/catalog media may be stored in object storage.

Media recovery should account for:

``` text
Original files
Processed variants
Important metadata
Folder/object identity
```

------------------------------------------------------------------------

# 17. Media Rebuildability

If resized/optimized images can be deterministically regenerated from
originals, prioritize durable backup of originals.

Generated derivatives may be rebuildable.

------------------------------------------------------------------------

# 18. Media Backup Strategy

Potential strategy:

``` text
Primary object storage
        ↓
Versioning where appropriate
        ↓
Independent backup/replication
        ↓
Periodic restore verification
```

The exact implementation depends on the selected storage provider.

------------------------------------------------------------------------

# 19. Deleted Media

Where business requirements justify it, object versioning or
soft-delete/recovery capabilities should protect against accidental
media deletion.

------------------------------------------------------------------------

# 20. Application Code Recovery

Application source code should be stored in version control.

Production recovery should be capable of rebuilding the application
from:

``` text
Git repository
+
Pinned dependencies
+
Infrastructure configuration
+
Required environment configuration
```

------------------------------------------------------------------------

# 21. Infrastructure Recovery

Infrastructure configuration should be reproducible where practical.

Prefer:

``` text
Infrastructure as Code
Documented environment configuration
Versioned deployment configuration
```

over undocumented manual production setup.

------------------------------------------------------------------------

# 22. Configuration Recovery

Recovery documentation should identify required configuration categories
such as:

``` text
Database connection
Storage
Payment provider
Email provider
Shipping provider
Authentication
Task queue
Monitoring
Analytics
```

Actual secret values must not be committed to source control.

------------------------------------------------------------------------

# 23. Secret Recovery

Secrets should be stored in an appropriate secret-management mechanism.

Recovery procedures should document:

``` text
Which secrets are required
Where authorized operators retrieve them
How compromised secrets are rotated
```

Never place actual production secrets inside this document.

------------------------------------------------------------------------

# 24. Credential Compromise

The disaster plan must include compromised credentials.

Examples:

``` text
Database credentials leaked
Payment secret leaked
Storage credentials compromised
Admin credential compromised
Webhook secret compromised
```

------------------------------------------------------------------------

# 25. Credential Rotation

A compromise response should include:

``` text
Revoke/rotate compromised credential
Update affected services
Verify old credential no longer works
Review access logs
Assess affected data
```

------------------------------------------------------------------------

# 26. Admin Account Compromise

If a privileged admin account is compromised:

``` text
Disable/revoke account
Revoke active sessions where supported
Reset credentials
Review audit logs
Review recent administrative changes
Restore affected data if necessary
```

------------------------------------------------------------------------

# 27. Database Corruption

If data corruption is detected:

``` text
Stop further destructive operations
Identify corruption window
Preserve evidence/logs
Determine recovery point
Restore to isolated environment
Validate data
Plan controlled cutover
```

Do not immediately overwrite the only surviving copy.

------------------------------------------------------------------------

# 28. Accidental Deletion

For accidental deletion:

``` text
Identify affected records
Determine deletion timestamp
Determine whether logical recovery is possible
Use point-in-time/backup recovery if required
Validate restored data
Recover only necessary data where possible
```

------------------------------------------------------------------------

# 29. Bad Database Migration

A failed migration can cause:

``` text
Application errors
Data corruption
Missing columns
Invalid constraints
Incorrect transformations
```

The recovery strategy should distinguish:

``` text
Schema rollback
Data restoration
Forward-fix migration
Full database restore
```

A destructive migration should never depend solely on an assumed
rollback command.

------------------------------------------------------------------------

# 30. Migration Safety

Before destructive production migrations:

``` text
Backup/recovery point verified
Migration tested against realistic data
Rollback/recovery procedure reviewed
Deployment window defined
Monitoring active
```

------------------------------------------------------------------------

# 31. Deployment Rollback

Application rollback should be possible when a deployment introduces:

``` text
Critical errors
Checkout failures
Payment problems
Catalog corruption
Authentication failures
```

------------------------------------------------------------------------

# 32. Database/Application Compatibility

Application rollback is only safe when the database schema remains
compatible with the previous application version.

Use backward-compatible migration sequencing where possible.

------------------------------------------------------------------------

# 33. Recovery Deployment Sequence

A typical recovery sequence:

``` text
Incident identified
      ↓
Stabilize system
      ↓
Prevent additional damage
      ↓
Identify recovery target
      ↓
Restore/rebuild isolated environment
      ↓
Validate database/media
      ↓
Deploy compatible application
      ↓
Run smoke tests
      ↓
Redirect production traffic
      ↓
Monitor
```

------------------------------------------------------------------------

# 34. Isolated Recovery Environment

When practical, restore critical data into an isolated environment
first.

Validate:

``` text
Database integrity
Orders
Products
Inventory
Payments
Customer records
Media references
```

before exposing restored data to customers.

------------------------------------------------------------------------

# 35. Recovery Validation

Recovery validation should include critical business workflows:

``` text
Homepage
Catalog
Product page
Login
Cart
Checkout
Order history
Admin
Payment status
Inventory
```

------------------------------------------------------------------------

# 36. Payment Recovery

Payment records require special care.

Never assume that restoring the database alone tells the complete
current payment state.

After recovery, reconcile payment records against the payment provider
where necessary.

------------------------------------------------------------------------

# 37. Payment Reconciliation After Recovery

A recovery procedure should support identifying:

``` text
Internal succeeded / provider succeeded
Internal pending / provider succeeded
Internal succeeded / provider refunded
Internal pending / provider failed
```

and other mismatches.

------------------------------------------------------------------------

# 38. Order Recovery

Orders are financial/business records.

After restore, verify:

``` text
Order identity
Order totals
Payment state
Fulfillment state
Refund state
Customer relationship
```

------------------------------------------------------------------------

# 39. Inventory Recovery

Inventory should be reconciled after database recovery where necessary.

Particular care is required when:

``` text
Orders were created
Returns were processed
Manual inventory adjustments occurred
```

after the recovery point.

------------------------------------------------------------------------

# 40. External System Reconciliation

Recovery should account for external systems such as:

``` text
Payment provider
Shipping/carrier provider
Email provider
Storage provider
Analytics systems
```

The application database may not contain the latest external state.

------------------------------------------------------------------------

# 41. Search Index Recovery

The search index should ideally be rebuildable from authoritative
catalog data.

Recovery flow:

``` text
Restore catalog
   ↓
Rebuild search index
   ↓
Validate search
```

Do not treat a stale search index as authoritative catalog data.

------------------------------------------------------------------------

# 42. Cache Recovery

Caches should generally be disposable.

After recovery:

``` text
Start application
↓
Warm naturally
```

or perform controlled cache warming where useful.

Do not restore stale personalized cache data blindly.

------------------------------------------------------------------------

# 43. Queue Recovery

Queued tasks should be treated carefully after disaster recovery.

Determine:

``` text
Which jobs were completed
Which jobs were pending
Which jobs can be safely replayed
Which jobs must be discarded
```

Idempotency is essential.

------------------------------------------------------------------------

# 44. Background Job Recovery

For financial/provider tasks:

``` text
Do not blindly replay every queue message.
```

First reconcile authoritative state and provider events.

------------------------------------------------------------------------

# 45. Notification Recovery

Do not blindly resend every queued notification after recovery.

Duplicate customer notifications can create confusion.

Use persistent notification/event state where required.

------------------------------------------------------------------------

# 46. Analytics Recovery

Analytics data is generally lower priority than orders/payments.

Analytics gaps should not block business recovery.

Where possible, recover/reconcile authoritative commerce reporting
independently.

------------------------------------------------------------------------

# 47. Backup Verification

Backups should be verified automatically where practical.

Checks may include:

``` text
Backup completed
Backup size is plausible
Backup timestamp is current
Backup is accessible
Backup integrity check passes
```

------------------------------------------------------------------------

# 48. Restore Testing

Perform scheduled restore tests.

A restore test should verify that:

``` text
Backup can actually be restored
Application can connect
Critical data exists
Media can be accessed
Core workflows work
```

------------------------------------------------------------------------

# 49. Restore Test Frequency

The final frequency should be agreed operationally.

A production system should not go indefinitely without a restore
exercise.

------------------------------------------------------------------------

# 50. Recovery Drill

A recovery drill should simulate a realistic failure.

Examples:

``` text
Database corruption
Bad migration
Production environment loss
Credential compromise
Storage outage
```

------------------------------------------------------------------------

# 51. Recovery Runbook

The project should maintain an operational runbook containing:

``` text
Detection
Severity classification
Stabilization
Recovery decision
Backup selection
Restore procedure
Validation
Cutover
Communication
Post-incident review
```

------------------------------------------------------------------------

# 52. Incident Severity

Define severity levels appropriate to the business.

For example:

``` text
Critical
High
Medium
Low
```

A complete production outage or financial data corruption should have a
critical response path.

------------------------------------------------------------------------

# 53. Incident Communication

For severe incidents, define:

``` text
Technical owner
Business owner
Communication channel
Customer communication responsibility
Payment/provider escalation
```

------------------------------------------------------------------------

# 54. Recovery Ownership

Every recovery procedure should have a clearly responsible role.

Avoid:

``` text
Everyone assumes someone else will restore production.
```

------------------------------------------------------------------------

# 55. Recovery Access

Emergency recovery access should be:

``` text
Restricted
Audited
Documented
Tested
```

------------------------------------------------------------------------

# 56. Break-Glass Access

If emergency access is required, use a controlled break-glass process.

The process should include:

``` text
Reason
Authorized operator
Time
Actions performed
Post-incident review
```

------------------------------------------------------------------------

# 57. Backup Monitoring

Monitor:

``` text
Backup success
Backup failure
Backup age
Retention
Storage capacity
Restore-test success
```

------------------------------------------------------------------------

# 58. Backup Alerts

Alert when:

``` text
Expected backup is missing
Backup fails repeatedly
Recovery point becomes too old
Storage capacity is insufficient
Restore test fails
```

------------------------------------------------------------------------

# 59. Recovery Metrics

Useful metrics include:

``` text
Actual RPO
Actual RTO
Backup success rate
Restore success rate
Recovery drill duration
Unrecoverable incidents
```

------------------------------------------------------------------------

# 60. Recovery and Privacy

Backups contain sensitive customer/business data.

Therefore:

``` text
Access must be restricted
Retention must be intentional
Deletion policies must account for backups
Exports must not expose backups
```

------------------------------------------------------------------------

# 61. Recovery and Customer Deletion

If customer data deletion is required, backup retention and restoration
behavior must be considered.

A restored backup must not unintentionally reintroduce data that the
business is required to keep deleted.

The exact legal/compliance process must be defined separately.

------------------------------------------------------------------------

# 62. Recovery and Audit Logs

Audit records may be important for security and financial
investigations.

Determine which audit data must be:

``` text
Backed up
Retained
Restored
Preserved during recovery
```

------------------------------------------------------------------------

# 63. Recovery and Media

After database restore, verify that referenced media still exists.

Potential inconsistency:

``` text
Database restored
+
Media object missing
```

The recovery process should detect and report this.

------------------------------------------------------------------------

# 64. Recovery and DNS/Traffic

If infrastructure failure requires moving environments, the recovery
plan should include:

``` text
DNS
TLS
Domain configuration
CDN
Load balancing
Environment variables
```

The exact mechanism belongs to the deployment/infrastructure setup.

------------------------------------------------------------------------

# 65. Recovery and TLS

Recovery environments must have valid TLS and secure production
configuration before receiving customer traffic.

------------------------------------------------------------------------

# 66. Recovery and Monitoring

Monitoring must be available during recovery.

Do not perform a blind cutover with no:

``` text
Logs
Metrics
Error monitoring
Health checks
```

------------------------------------------------------------------------

# 67. Recovery Smoke Tests

Immediately after recovery, verify:

``` text
GET homepage
GET category
GET product
Authentication
Cart
Checkout initiation
Payment status
Order lookup
Admin login
Database health
Storage access
```

Do not necessarily perform a live financial transaction unless the
recovery drill explicitly requires it.

------------------------------------------------------------------------

# 68. Production Cutover

Cutover should occur only after:

``` text
Data validation
Application validation
External dependency validation
Security validation
Monitoring validation
```

------------------------------------------------------------------------

# 69. Post-Recovery Monitoring

After recovery, closely monitor:

``` text
Error rate
Orders
Payments
Inventory
Background jobs
Database load
Storage
Checkout conversion
Provider integrations
```

for a defined stabilization period.

------------------------------------------------------------------------

# 70. Post-Incident Review

Every significant disaster/recovery event should produce a review
covering:

``` text
What happened
Why it happened
What data was affected
What recovery succeeded
What failed
Actual RPO
Actual RTO
What should change
```

------------------------------------------------------------------------

# 71. Recovery Documentation Updates

After each drill or incident:

``` text
Update runbook
Fix gaps
Update contacts
Update commands
Update recovery assumptions
```

A recovery document must evolve with the system.

------------------------------------------------------------------------

# 72. Business Continuity

If the platform is unavailable, the business should know how to handle:

``` text
Customer inquiries
Orders already placed
Payment inquiries
Shipping inquiries
Refund requests
Inventory operations
```

The exact manual fallback process is a business operations
responsibility.

------------------------------------------------------------------------

# 73. Manual Order Fallback

If the storefront is temporarily unavailable, any manual order process
must be controlled and auditable.

Do not create informal spreadsheets containing payment credentials or
sensitive customer information.

------------------------------------------------------------------------

# 74. Payment Provider Outage

A payment-provider outage is not necessarily a database disaster.

The application should:

``` text
Detect provider failure
Show safe customer messaging
Avoid duplicate payment attempts
Preserve cart/order state appropriately
Resume normal processing when provider recovers
```

------------------------------------------------------------------------

# 75. Shipping Provider Outage

Shipping provider outages should not corrupt order state.

If shipment creation fails:

``` text
Keep order state accurate
Record shipping failure
Retry/reconcile safely
```

------------------------------------------------------------------------

# 76. Storage Outage

If media storage becomes unavailable:

``` text
Do not corrupt catalog records
Use appropriate fallback/error behavior
Restore/replace storage access
Verify media afterward
```

------------------------------------------------------------------------

# 77. Database Provider Outage

During a database outage:

``` text
Do not repeatedly hammer the database
Fail safely
Protect against partial writes
Monitor recovery
Validate data after restoration
```

------------------------------------------------------------------------

# 78. Recovery Testing Matrix

At minimum, test:

``` text
Database backup restore
Point-in-time recovery where available
Bad migration recovery
Accidental deletion recovery
Media recovery
Application rollback
Queue recovery
Payment reconciliation
Shipping reconciliation
Credential rotation
```

------------------------------------------------------------------------

# 79. Disaster Recovery Definition of Done

Disaster recovery is complete when:

-   Production database backup strategy is defined.
-   Backup retention is defined.
-   RPO/RTO targets are agreed.
-   Supabase/PostgreSQL recovery capabilities are verified.
-   Media recovery is defined.
-   Application/infrastructure rebuild is documented.
-   Secrets/configuration recovery is documented.
-   Credential compromise recovery exists.
-   Database corruption recovery is documented.
-   Bad migration recovery is documented.
-   Payment reconciliation after recovery is defined.
-   Shipping/external-system reconciliation is defined.
-   Queue replay strategy is defined.
-   Restore testing is scheduled.
-   Backup monitoring exists.
-   Recovery runbooks exist.
-   Emergency access is controlled.
-   Post-incident review process exists.

------------------------------------------------------------------------

# 80. AI Agent Disaster-Recovery Rules

Antigravity must not:

-   Claim a backup exists without verifying the configured
    infrastructure.
-   Assume Supabase plan capabilities without verification.
-   Delete the only known backup copy.
-   Restore production directly over the only surviving database without
    validation.
-   Treat cache/search data as the primary source of truth.
-   Blindly replay every queued task after recovery.
-   Blindly replay financial/provider events.
-   Roll back a database migration without considering data
    transformations.
-   Store production secrets in recovery documentation.
-   Expose raw backups through application endpoints.
-   Treat an untested backup as a proven recovery mechanism.
-   Perform destructive recovery operations without explicit
    authorization.
-   Assume application rollback is safe when database schema
    compatibility is unknown.

------------------------------------------------------------------------

# 81. Recovery Change Workflow

Changes should follow:

``` text
Infrastructure/data change
   ↓
Recovery impact review
   ↓
Backup strategy review
   ↓
RPO/RTO review
   ↓
Restore procedure update
   ↓
Recovery test
   ↓
Monitoring update
   ↓
Runbook update
```

------------------------------------------------------------------------

# 82. Disaster Recovery Summary

``` text
                    Production
                        |
             ┌──────────┼──────────┐
             ↓          ↓          ↓
         PostgreSQL    Media    Configuration
             |          |          |
          Backups     Backup     Recovery
             |          |          |
             └──────────┼──────────┘
                        ↓
                 Recovery Storage
                        |
                Restore / Rebuild
                        |
                Isolated Validation
                        |
             External Reconciliation
                        |
                 Smoke Testing
                        |
                    Cutover
                        |
                  Monitoring
```

The fundamental rule is:

``` text
Back up critical data.
Protect the backups.
Test restoration.
Recover into isolation first when practical.
Reconcile external systems.
Only then return production traffic.
```

------------------------------------------------------------------------

# 83. Next Document

The next genuinely new document should be:

``` text
35-api-error-response-standards.md
```

It will define:

-   API error envelope.
-   Error codes.
-   HTTP status conventions.
-   Validation errors.
-   Authentication/authorization errors.
-   Business-rule errors.
-   Rate-limit responses.
-   Pagination conventions.
-   Correlation/request IDs.
-   Safe error messages.
-   Exception handling.
-   Error logging.
-   Frontend error mapping.
-   API consistency rules.
-   Testing requirements.
