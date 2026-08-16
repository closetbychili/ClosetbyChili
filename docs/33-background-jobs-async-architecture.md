# Closet by Chilli --- Background Jobs & Async Architecture

## 1. Purpose

This document defines the background-job and asynchronous processing
architecture for Closet by Chilli.

The purpose is to move work that is:

``` text
Slow
Retryable
Provider-dependent
CPU-intensive
Scheduled
Non-critical to the immediate HTTP response
```

out of the synchronous request path.

The system must preserve:

``` text
Reliability
Idempotency
Observability
Ordering where required
Failure isolation
Operational control
```

------------------------------------------------------------------------

# 2. Core Principle

A web request should perform only the work required to produce a correct
immediate response.

Long-running or retryable work should be delegated to background
processing where appropriate.

Conceptually:

``` text
HTTP Request
    ↓
Validate
    ↓
Persist authoritative state
    ↓
Enqueue job
    ↓
Respond
    ↓
Worker processes job
```

------------------------------------------------------------------------

# 3. Technology Direction

The backend is Django.

The asynchronous architecture should use a production-grade Python task
queue such as:

``` text
Celery
```

with a suitable broker/backend.

The exact infrastructure configuration follows the deployment
architecture.

------------------------------------------------------------------------

# 4. Broker

A message broker is used to deliver background tasks from Django to
workers.

Redis may be used where appropriate because it is already relevant to
the platform's caching/infrastructure architecture.

The broker must not be treated as the authoritative business database.

------------------------------------------------------------------------

# 5. Worker Architecture

Conceptually:

``` text
                    Django API
                        |
                  Task Dispatch
                        |
                     Broker
                        |
              ┌─────────┴─────────┐
              ↓                   ↓
        Worker Pool A        Worker Pool B
              |                   |
        General Tasks       Specialized Tasks
```

Worker pools may be separated when workload characteristics require
isolation.

------------------------------------------------------------------------

# 6. Task Categories

Potential asynchronous workloads include:

``` text
Email
SMS/notifications
Payment webhook processing
Shipping webhook processing
Image processing
Catalog imports
Large exports
Reconciliation
Analytics delivery
Scheduled maintenance
Reports
```

Only required workloads should be implemented.

------------------------------------------------------------------------

# 7. Synchronous vs Asynchronous Decision

Use synchronous processing when:

``` text
The result is required immediately
The operation is short
The operation must be part of the immediate database transaction
```

Use asynchronous processing when:

``` text
The operation is slow
The provider can respond later
The work can safely be retried
The user does not need the result immediately
The work is scheduled
```

------------------------------------------------------------------------

# 8. Never Hide Required Business State in a Job

A background task must not be used to avoid persisting an authoritative
business transition that must happen before responding.

For example:

``` text
Order creation
Payment state transition
Inventory reservation
```

must have clearly defined synchronous/domain guarantees.

The job may perform follow-up work.

------------------------------------------------------------------------

# 9. Transactional Task Dispatch

A common failure case is:

``` text
Database transaction succeeds
Task dispatch fails
```

or:

``` text
Task dispatched
Database transaction rolls back
```

Use a transaction-safe dispatch strategy, such as publishing tasks after
the relevant database transaction commits.

------------------------------------------------------------------------

# 10. Django Transaction Boundary

When a task depends on newly committed database state, enqueue it only
after the transaction has successfully committed.

Conceptually:

``` text
transaction.atomic()
       ↓
Persist state
       ↓
Commit
       ↓
Dispatch task
```

This prevents workers from processing records that were later rolled
back.

------------------------------------------------------------------------

# 11. Idempotency

Every retryable task must be designed to tolerate duplicate execution.

A worker may receive the same logical work more than once because of:

``` text
Retry
Worker crash
Network interruption
Broker redelivery
Manual retry
Provider retry
```

------------------------------------------------------------------------

# 12. Task Idempotency

A task should be safe to execute multiple times without producing an
incorrect business result.

Examples:

``` text
Send order notification
Process webhook
Generate export
Update search index
Process image
```

The exact idempotency strategy depends on the task.

------------------------------------------------------------------------

# 13. Task Identity

Important jobs should have a stable logical identity where useful.

Potential identifiers:

``` text
Order ID
Payment event ID
Webhook event ID
Image ID
Export ID
Report ID
```

Avoid relying solely on a random worker execution ID for business
deduplication.

------------------------------------------------------------------------

# 14. Retry Policy

Retries should be explicit.

A task should define:

``` text
Maximum attempts
Retryable failures
Backoff
Maximum delay
Jitter where appropriate
```

------------------------------------------------------------------------

# 15. Retryable Failures

Typical retryable failures include:

``` text
Temporary provider outage
Connection timeout
Temporary rate limit
Transient database/network error
```

------------------------------------------------------------------------

# 16. Non-Retryable Failures

Do not endlessly retry permanent failures such as:

``` text
Invalid payload
Missing required record
Authorization failure
Unsupported operation
Invalid configuration
```

These should move to an appropriate failure state.

------------------------------------------------------------------------

# 17. Exponential Backoff

Provider/network retries should normally use increasing delays.

Conceptually:

``` text
Attempt 1 → short delay
Attempt 2 → longer delay
Attempt 3 → longer delay
...
```

Avoid immediate retry loops.

------------------------------------------------------------------------

# 18. Retry Jitter

Where many workers may retry simultaneously, add appropriate jitter to
reduce synchronized retry spikes.

------------------------------------------------------------------------

# 19. Maximum Retry Count

Every task must have a bounded retry policy unless there is a documented
reason for another strategy.

Infinite automatic retries are not acceptable.

------------------------------------------------------------------------

# 20. Failed Task State

A permanently failed task should remain observable.

Potential states:

``` text
PENDING
RUNNING
SUCCEEDED
RETRYING
FAILED
CANCELLED
```

------------------------------------------------------------------------

# 21. Dead-Letter / Failed Task Handling

Tasks that exhaust retries should be available for operational
investigation.

The exact mechanism may be:

``` text
Failed-task store
Dead-letter queue
Persistent task record
Provider event record
```

depending on infrastructure.

------------------------------------------------------------------------

# 22. Manual Retry

Authorized operators may retry appropriate failed tasks.

Manual retry must preserve idempotency.

Do not assume:

``` text
Retry button = safe
```

unless the task has been designed for repeated execution.

------------------------------------------------------------------------

# 23. Task Timeouts

Tasks should have explicit execution time limits where appropriate.

A worker should not remain occupied indefinitely because an external
provider stopped responding.

------------------------------------------------------------------------

# 24. External Provider Calls

Tasks calling external providers should use:

``` text
Timeout
Retry policy
Idempotency
Error mapping
Observability
```

where supported.

------------------------------------------------------------------------

# 25. Email Jobs

Email delivery is a strong candidate for background processing.

Examples:

``` text
Order confirmation
Shipping update
Password/recovery-related notification where applicable
Wholesale application update
Administrative notifications
```

------------------------------------------------------------------------

# 26. Email Idempotency

An email job should avoid accidentally sending duplicate
business-critical messages because of worker retries.

Use a stable notification/event identity where appropriate.

------------------------------------------------------------------------

# 27. SMS Jobs

SMS delivery may also be asynchronous.

Protect against:

``` text
Duplicate sends
Provider retries
Rate limits
Invalid destinations
```

------------------------------------------------------------------------

# 28. Notification Ordering

Some notifications may have meaningful ordering.

For example:

``` text
Order confirmed
→ Order shipped
→ Order delivered
```

The notification system should not send a later state notification
before an earlier required state if ordering matters.

------------------------------------------------------------------------

# 29. Notification Failure Isolation

Notification failure must not corrupt the underlying business state.

For example:

``` text
Email failed
≠
Order failed
```

------------------------------------------------------------------------

# 30. Payment Webhook Jobs

Payment webhook processing may use asynchronous work after the initial
webhook request has been authenticated and safely persisted.

The architecture must ensure:

``` text
Webhook accepted
→ Event persisted
→ Processing task
→ Idempotent state transition
```

------------------------------------------------------------------------

# 31. Webhook Event Persistence

Important provider events should be persisted before asynchronous
processing when required for:

``` text
Idempotency
Auditability
Recovery
Replay
```

------------------------------------------------------------------------

# 32. Shipping Webhook Jobs

Carrier/shipping provider events may also be processed asynchronously.

Examples:

``` text
Shipment picked up
In transit
Out for delivery
Delivered
Exception
```

------------------------------------------------------------------------

# 33. Webhook Ordering

Asynchronous processing must handle events arriving:

``` text
Out of order
Duplicated
Delayed
```

State transitions must be validated before application.

------------------------------------------------------------------------

# 34. Image Processing Jobs

Catalog image processing can run asynchronously.

Potential work:

``` text
Validation
Optimization
Resizing
Thumbnail generation
Metadata extraction
```

------------------------------------------------------------------------

# 35. Image Job Safety

Image processing should have:

``` text
Input size limits
Processing time limits
Memory/resource limits
Safe file validation
```

------------------------------------------------------------------------

# 36. Catalog Import Jobs

Large product/catalog imports should not block an HTTP request.

Conceptually:

``` text
Upload file
    ↓
Create import job
    ↓
Background processing
    ↓
Validate rows
    ↓
Apply valid changes
    ↓
Generate result
```

------------------------------------------------------------------------

# 37. Import Validation

Imports must validate before making broad changes.

Potential checks:

``` text
Required fields
SKU uniqueness
Category references
Pricing
Media references
Variant structure
```

------------------------------------------------------------------------

# 38. Import Atomicity

The import strategy must explicitly define whether failures cause:

``` text
Whole import rollback
Partial successful rows
```

Do not accidentally implement partial writes when the business expects
all-or-nothing behavior.

------------------------------------------------------------------------

# 39. Export Jobs

Large exports should run asynchronously.

Examples:

``` text
Order export
Product export
Customer export
Inventory report
```

------------------------------------------------------------------------

# 40. Export Security

Exports may contain sensitive data.

Use:

``` text
Authorization
Audit logging
Private storage
Short-lived download access
Expiration
```

------------------------------------------------------------------------

# 41. Report Generation

Large admin reports can run in background workers.

The admin UI should expose:

``` text
Requested
Processing
Completed
Failed
```

------------------------------------------------------------------------

# 42. Background Job Result

Long-running jobs should have a persistent job/result representation
when the admin or user needs to check progress.

Potential fields:

``` text
Job ID
Type
Status
Requested by
Created at
Started at
Completed at
Failure category
Result reference
```

------------------------------------------------------------------------

# 43. Progress Tracking

Progress percentages should be used only when meaningful.

Do not invent misleading progress values for jobs where actual progress
cannot be measured.

------------------------------------------------------------------------

# 44. Scheduled Jobs

Scheduled tasks may include:

``` text
Promotion expiration processing
Payment reconciliation
Shipping reconciliation
Cleanup
Analytics reconciliation
Abandoned-cart processing
Operational reports
```

Only approved business processes should be scheduled.

------------------------------------------------------------------------

# 45. Scheduler

Use a controlled scheduler such as:

``` text
Celery Beat
```

or an infrastructure-native scheduler where appropriate.

There must be one clearly defined source of scheduled-job responsibility
for each task.

------------------------------------------------------------------------

# 46. Scheduled Task Idempotency

Scheduled tasks must tolerate overlapping execution or accidental
duplicate triggers.

For example:

``` text
Reconciliation job
```

must not corrupt state if two workers attempt it concurrently.

------------------------------------------------------------------------

# 47. Distributed Locking

Where a scheduled task must have only one active execution, use an
appropriate distributed locking or database coordination strategy.

Do not rely on:

``` text
if running:
```

stored only in worker memory.

------------------------------------------------------------------------

# 48. Task Concurrency

Workers should have controlled concurrency.

Do not allow unlimited parallelism against:

``` text
Database
Payment provider
Shipping provider
Email provider
```

------------------------------------------------------------------------

# 49. Provider Rate Limits

External provider calls should respect provider rate limits.

Use:

``` text
Concurrency limits
Backoff
Queues
Batching where supported
```

------------------------------------------------------------------------

# 50. Queue Separation

Different workloads may use separate queues.

For example:

``` text
critical
notifications
media
imports
reports
reconciliation
```

The exact queue structure should be kept as simple as possible
initially.

------------------------------------------------------------------------

# 51. Priority

Critical jobs may have higher priority than expensive non-critical
workloads.

For example:

``` text
Payment/webhook processing
>
Large report generation
```

when business requirements justify it.

------------------------------------------------------------------------

# 52. Long-Running Work

Do not run extremely long operations inside ordinary web workers.

Move them to background workers with appropriate:

``` text
Timeout
Resource limits
Progress tracking
Retry strategy
```

------------------------------------------------------------------------

# 53. Database Access from Workers

Workers use the same domain/data-access rules as the application.

Do not create a second undocumented business logic implementation only
for background jobs.

------------------------------------------------------------------------

# 54. Domain Services

Background tasks should generally call application/domain services
rather than duplicating business logic.

Conceptually:

``` text
Task
 ↓
Domain/Application Service
 ↓
Repository/ORM
```

------------------------------------------------------------------------

# 55. Task Payloads

Prefer small, stable task payloads.

Use identifiers such as:

``` text
order_id
event_id
image_id
job_id
```

rather than serializing large database objects into the broker.

------------------------------------------------------------------------

# 56. Stale Task Payloads

A worker may execute later than the moment the task was created.

Therefore, when appropriate:

``` text
Load current authoritative state
Validate current state
Then perform operation
```

Do not blindly trust stale serialized business data.

------------------------------------------------------------------------

# 57. Task Serialization

Use a safe, controlled serialization format.

Do not deserialize untrusted arbitrary executable objects.

------------------------------------------------------------------------

# 58. Task Security

Task payloads must not contain unnecessary:

``` text
Passwords
Tokens
Payment credentials
Secrets
Private documents
```

------------------------------------------------------------------------

# 59. Task Logging

Every important task should produce safe structured logs containing
useful identifiers.

Potential fields:

``` text
Task name
Task ID
Business entity ID
Attempt
Duration
Outcome
Error category
```

------------------------------------------------------------------------

# 60. Correlation IDs

Where possible, propagate a request/correlation ID from:

``` text
HTTP request
→ Domain operation
→ Task
→ Provider call
```

This makes production debugging easier.

------------------------------------------------------------------------

# 61. Observability

Monitor:

``` text
Queue depth
Task latency
Task throughput
Failure rate
Retry rate
Oldest queued task
Worker health
Provider latency
```

------------------------------------------------------------------------

# 62. Queue Backlog

A growing queue is an operational signal.

Alerts should be considered for:

``` text
High queue depth
Old tasks waiting too long
Repeated failures
Worker capacity exhaustion
```

------------------------------------------------------------------------

# 63. Worker Health

Monitor:

``` text
Worker availability
CPU
Memory
Task execution
Crash/restart frequency
```

------------------------------------------------------------------------

# 64. Graceful Shutdown

Workers should stop accepting new work appropriately during
deployment/shutdown and allow safe completion or requeue behavior for
in-flight tasks.

------------------------------------------------------------------------

# 65. Deployment Safety

During deployment:

``` text
New application code
+
Existing queued tasks
```

may coexist temporarily.

Task interfaces should therefore be backward-compatible across normal
rolling deployment windows where required.

------------------------------------------------------------------------

# 66. Task Versioning

If a task payload or behavior changes incompatibly, use an explicit
migration/versioning strategy.

Do not assume queued messages instantly disappear during deployment.

------------------------------------------------------------------------

# 67. Database Migrations and Workers

Database migrations must account for running workers.

Avoid deploying code that requires a schema change before all relevant
workers can safely operate with the old schema.

Prefer backward-compatible migration sequences.

------------------------------------------------------------------------

# 68. Task Cancellation

Some long-running tasks may support cancellation.

Cancellation must define:

``` text
What state is already committed
What work can safely stop
Whether partial results remain
```

------------------------------------------------------------------------

# 69. Financial Tasks

Financially significant background jobs require extra caution.

Examples:

``` text
Payment reconciliation
Refund processing
Payment webhook processing
```

These must be:

``` text
Idempotent
Auditable
State-machine aware
Retry-safe
```

------------------------------------------------------------------------

# 70. Inventory Tasks

Inventory-related background work must not create race conditions with
synchronous checkout/order operations.

Use domain/database concurrency controls where required.

------------------------------------------------------------------------

# 71. Search Indexing Jobs

If search indexing is asynchronous:

``` text
Catalog change
 ↓
Index update task
 ↓
Search index
```

the source database remains authoritative.

A temporarily stale search index must not corrupt catalog/order data.

------------------------------------------------------------------------

# 72. Cache Invalidation Jobs

Cache invalidation may be asynchronous when safe.

However, critical privacy/security invalidations should not depend
solely on eventually running background work.

------------------------------------------------------------------------

# 73. Analytics Jobs

Analytics delivery may be asynchronous.

Analytics failure must never block:

``` text
Order creation
Payment
Inventory
```

------------------------------------------------------------------------

# 74. Cleanup Jobs

Cleanup tasks may remove:

``` text
Expired temporary files
Expired job artifacts
Old transient records
```

Retention rules must be explicitly defined before deletion.

------------------------------------------------------------------------

# 75. Data Deletion

Privacy-related deletion must not be implemented as an uncontrolled
background cleanup.

The deletion workflow should define:

``` text
What is deleted
What is retained
Why it is retained
Audit requirements
Provider-side deletion where applicable
```

------------------------------------------------------------------------

# 76. Background Job Testing

Test:

``` text
Successful execution
Retry
Duplicate execution
Timeout
Permanent failure
Manual retry
Concurrent execution
Worker crash
Provider outage
Stale payload
```

------------------------------------------------------------------------

# 77. Idempotency Testing

Every important task should have a test proving that repeated execution
does not create incorrect duplicate side effects.

------------------------------------------------------------------------

# 78. Retry Testing

Verify:

``` text
Transient failure → retry
Permanent failure → no endless retry
Maximum attempts → failed state
```

------------------------------------------------------------------------

# 79. Scheduling Testing

Verify:

``` text
Scheduled execution
Duplicate scheduler trigger
Overlapping runs
Timezone behavior
Daylight-saving behavior where applicable
```

------------------------------------------------------------------------

# 80. Operational Testing

Test:

``` text
Worker restart
Broker restart
Deployment
Queue backlog
Provider outage
Database temporary failure
```

------------------------------------------------------------------------

# 81. Failure Recovery

The system should make it possible to:

``` text
Identify failed work
Inspect safe failure details
Retry safe tasks
Replay appropriate provider events
Recover from worker failure
```

------------------------------------------------------------------------

# 82. Admin Job Management

Where operationally useful, the admin panel may provide:

``` text
Job status
Failed jobs
Retry action
Job details
```

These actions must be permission-controlled.

------------------------------------------------------------------------

# 83. Manual Replay

Manual replay of payment/shipping/provider events must be carefully
controlled.

Replay should use the same idempotency protections as normal processing.

------------------------------------------------------------------------

# 84. Background Job Security

Workers should use only the credentials they need.

Do not give every worker unrestricted:

``` text
Database
Storage
Provider
```

permissions if workloads can be isolated more narrowly.

------------------------------------------------------------------------

# 85. Worker Secrets

Worker environment configuration must be treated as server-side secret
configuration.

Never expose worker credentials to the frontend.

------------------------------------------------------------------------

# 86. Resource Limits

Background processing should have limits for:

``` text
CPU
Memory
Task duration
Payload size
Concurrency
External requests
```

where infrastructure supports them.

------------------------------------------------------------------------

# 87. Backpressure

When downstream services are overloaded, the system should slow or queue
work rather than continuously increasing concurrency.

------------------------------------------------------------------------

# 88. Thundering Herd Prevention

Avoid scheduling or retrying thousands of identical tasks
simultaneously.

Use:

``` text
Jitter
Batching
Deduplication
Rate limits
Controlled scheduling
```

where appropriate.

------------------------------------------------------------------------

# 89. Batch Jobs

Large workloads should be processed in bounded batches rather than
loading an entire dataset into worker memory.

------------------------------------------------------------------------

# 90. Task Result Retention

Task results should not be retained indefinitely.

Define retention for:

``` text
Success metadata
Failure metadata
Generated reports
Temporary artifacts
```

------------------------------------------------------------------------

# 91. Background Architecture Definition of Done

The async architecture is complete when:

-   Django task dispatch is defined.
-   Celery/worker direction is defined.
-   Broker responsibilities are defined.
-   Synchronous vs asynchronous boundaries are explicit.
-   Transaction-safe task dispatch is defined.
-   Idempotency is mandatory for retryable tasks.
-   Retry/backoff policies are defined.
-   Permanent failures are observable.
-   Webhook processing can be asynchronous safely.
-   Notifications are isolated from business state.
-   Image/import/export/report jobs are supported where required.
-   Scheduled jobs are controlled.
-   Concurrency and provider rate limits are handled.
-   Queue monitoring exists.
-   Worker health is observable.
-   Deployment compatibility is considered.
-   Background jobs use domain services.
-   Security and secret handling are defined.
-   Failure recovery and manual retry are controlled.
-   Background-job tests cover retries, duplicates, failures, and
    concurrency.

------------------------------------------------------------------------

# 92. AI Agent Async Rules

Antigravity must not:

-   Put slow provider operations unnecessarily in HTTP requests.
-   Dispatch a task before required database state is committed.
-   Assume a task executes exactly once.
-   Create retry loops without a maximum/recovery strategy.
-   Retry permanent validation failures indefinitely.
-   Serialize entire ORM objects into task messages.
-   Put secrets or payment credentials in task payloads.
-   Duplicate business logic inside Celery tasks.
-   Allow unlimited worker concurrency.
-   Let background analytics failures block checkout/payment.
-   Process financial tasks without idempotency.
-   Assume queued tasks disappear during deployment.
-   Delete data through scheduled jobs without explicit retention rules.
-   Allow arbitrary staff to replay sensitive financial/provider events.

------------------------------------------------------------------------

# 93. Async Change Workflow

Changes should follow:

``` text
Workload requirement
   ↓
Synchronous/async decision
   ↓
Failure analysis
   ↓
Idempotency design
   ↓
Transaction boundary
   ↓
Queue/task design
   ↓
Retry policy
   ↓
Implementation
   ↓
Failure/concurrency tests
   ↓
Observability
   ↓
Staging verification
   ↓
Production monitoring
```

------------------------------------------------------------------------

# 94. Background Architecture Summary

``` text
                         Django
                           |
                    Domain Operation
                           |
                   DB Transaction
                           |
                      Commit
                           |
                    Task Dispatch
                           |
                         Broker
                           |
                    ┌──────┴──────┐
                    ↓             ↓
                 Workers       Scheduled Jobs
                    |             |
              Domain Services    Domain Services
                    |             |
          ┌─────────┼─────────────┼─────────┐
          ↓         ↓             ↓         ↓
      Providers  Notifications  Media   Reconciliation
          |         |             |         |
          └─────────┴─────────────┴─────────┘
                            |
                      Observability
```

The fundamental rule is:

``` text
Background jobs are an execution mechanism, not a second business layer.
Tasks must be idempotent, observable, retry-safe, and bounded.
The database/domain remain authoritative.
```

------------------------------------------------------------------------

# 95. Next Document

The next genuinely new document should be:

``` text
34-disaster-recovery-backup-architecture.md
```

It will define:

-   Backup strategy.
-   PostgreSQL recovery.
-   Supabase recovery considerations.
-   Storage/media backup.
-   Point-in-time recovery.
-   RPO/RTO.
-   Restore testing.
-   Disaster scenarios.
-   Credential compromise recovery.
-   Deployment rollback.
-   Data corruption recovery.
-   Business continuity.
-   Recovery runbooks.
-   Backup retention.
-   Recovery security.
