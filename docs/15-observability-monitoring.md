# Closet by Chilli --- Observability & Monitoring

## 1. Purpose

This document defines the observability and monitoring architecture for
Closet by Chilli.

The objective is to make production behavior:

-   Visible.
-   Measurable.
-   Debuggable.
-   Alertable.
-   Auditable.

Observability is not limited to infrastructure uptime. The platform must
also provide visibility into important commerce workflows such as
checkout, payments, orders, inventory, and wholesale operations.

------------------------------------------------------------------------

# 2. Observability Principles

Closet by Chilli follows:

``` text
Measure important behavior
Prefer structured telemetry
Correlate requests across services
Alert on actionable failures
Protect sensitive data
Monitor both technical and business health
Use logs for investigation
Use metrics for trends
Use traces for request flow
```

------------------------------------------------------------------------

# 3. Three Pillars

The observability architecture uses:

``` text
Logs
Metrics
Traces
```

These should work together rather than exist as isolated systems.

Conceptually:

``` text
                    Observability
                         |
          ┌──────────────┼──────────────┐
          ↓              ↓              ↓
        Logs          Metrics         Traces
          |              |              |
       Events         Trends        Request flow
          └──────────────┬──────────────┘
                         ↓
                   Investigation
```

------------------------------------------------------------------------

# 4. Environment Separation

Observability data should be distinguishable by environment:

``` text
development
staging
production
```

Production alerts must never be confused with development/test noise.

------------------------------------------------------------------------

# 5. Service Identification

Telemetry should identify the originating service.

Initial services include:

``` text
nextjs-storefront
django-api
background-workers where applicable
database/supabase
payment integrations
```

The exact service naming convention should remain consistent across
logs, metrics, and traces.

------------------------------------------------------------------------

# 6. Structured Logging

Application logs should be structured rather than relying exclusively on
free-form text.

Conceptually:

``` json
{
  "timestamp": "...",
  "level": "ERROR",
  "service": "django-api",
  "event": "payment_webhook_failed",
  "request_id": "...",
  "environment": "production"
}
```

The final logging format will be selected during implementation.

------------------------------------------------------------------------

# 7. Log Levels

Use consistent log levels:

``` text
DEBUG
INFO
WARNING
ERROR
CRITICAL
```

Production should avoid excessive DEBUG logging.

------------------------------------------------------------------------

# 8. DEBUG Logs

DEBUG information should normally be disabled or heavily restricted in
production.

Never use DEBUG logging as a substitute for proper monitoring.

------------------------------------------------------------------------

# 9. INFO Logs

INFO logs may record meaningful operational events such as:

``` text
Application startup
Successful deployment
Important background-job completion
Payment event accepted
Order state transition
```

Only log data that is actually useful.

------------------------------------------------------------------------

# 10. WARNING Logs

Warnings should identify conditions that are unusual but not necessarily
service-breaking.

Examples:

``` text
External provider latency increased
Retry performed
Unexpected but recoverable state
Approaching resource threshold
```

------------------------------------------------------------------------

# 11. ERROR Logs

ERROR should represent failures requiring investigation.

Examples:

``` text
Unhandled application error
Payment provider request failure
Database operation failure
Background job failure
Webhook processing failure
```

------------------------------------------------------------------------

# 12. CRITICAL Logs

CRITICAL should be reserved for severe failures affecting major system
functionality.

Examples:

``` text
Production database unavailable
Core application cannot start
Critical infrastructure dependency unavailable
Severe security incident
```

Avoid using CRITICAL for ordinary request failures.

------------------------------------------------------------------------

# 13. Sensitive Data Rules

Logs must never contain secrets.

Never log:

``` text
Passwords
Access tokens
Service-role keys
Database passwords
Payment secrets
Webhook secrets
Private API keys
```

------------------------------------------------------------------------

# 14. Personal Data Logging

Avoid unnecessary personal data in logs.

Do not log full:

``` text
Customer addresses
Phone numbers
Email addresses
Payment details
Identity documents
```

when an identifier or redacted value is sufficient.

------------------------------------------------------------------------

# 15. Payment Logging

Payment logs should contain operational identifiers rather than
sensitive payment information.

Prefer:

``` text
payment_id
order_id
provider_event_id
provider_status
```

Do not log raw card/payment credentials.

------------------------------------------------------------------------

# 16. Request IDs

Every important API request should have a correlation/request
identifier.

Conceptually:

``` text
Client
  |
  | request_id
  v
Next.js
  |
  | request_id
  v
Django
  |
  +--> Database
  |
  +--> Payment provider
  |
  +--> Background job
```

------------------------------------------------------------------------

# 17. Correlation ID Rules

The request identifier should:

-   Be safe to log.
-   Be propagated where practical.
-   Be included in error responses where appropriate.
-   Allow support/engineering teams to locate the corresponding logs.

Do not use sensitive customer data as a request ID.

------------------------------------------------------------------------

# 18. Trace IDs

Where distributed tracing is implemented, trace IDs should connect
related operations across services.

Conceptually:

``` text
Trace
 ├── Frontend request
 ├── Django request
 ├── Database operation
 ├── External provider call
 └── Background processing
```

------------------------------------------------------------------------

# 19. Distributed Tracing

Tracing should be introduced when it provides meaningful diagnostic
value.

Useful areas include:

``` text
Checkout
Payment initiation
Order creation
Slow catalog requests
External provider calls
Background jobs
```

Do not trace sensitive payload contents unnecessarily.

------------------------------------------------------------------------

# 20. Metrics

Metrics should measure system behavior over time.

Core categories:

``` text
Traffic
Latency
Errors
Saturation
Business operations
```

------------------------------------------------------------------------

# 21. Traffic Metrics

Track:

``` text
Requests per minute
Requests per endpoint
Active requests
Background jobs
Webhook events
```

Traffic should be segmented by environment/service where useful.

------------------------------------------------------------------------

# 22. Latency Metrics

Monitor:

``` text
Average latency
P50
P95
P99
```

P95/P99 are particularly useful for identifying slow-tail behavior.

------------------------------------------------------------------------

# 23. Error Metrics

Track:

``` text
4xx rate
5xx rate
Error rate by endpoint
Error rate by service
Payment failures
Webhook failures
Background-job failures
```

------------------------------------------------------------------------

# 24. Saturation Metrics

Monitor resource pressure such as:

``` text
CPU
Memory
Database connections
Database capacity
Storage usage
Queue depth
Worker utilization
```

------------------------------------------------------------------------

# 25. API Metrics

Important Django API metrics include:

``` text
Request count
Latency
Status code distribution
Endpoint error rate
Database query time
```

Identify slow endpoints before they become production incidents.

------------------------------------------------------------------------

# 26. Frontend Metrics

The storefront should monitor appropriate client-side signals.

Potential metrics:

``` text
Page load performance
Client-side errors
API request failures
Navigation failures
Core Web Vitals
```

Do not collect unnecessary personal information.

------------------------------------------------------------------------

# 27. Database Metrics

Monitor:

``` text
Database availability
Connection utilization
Query latency
Slow queries
Lock contention where available
Storage utilization
CPU/resource utilization where available
```

------------------------------------------------------------------------

# 28. Background Worker Metrics

If workers are introduced, monitor:

``` text
Queue depth
Job execution time
Successful jobs
Failed jobs
Retries
Dead-lettered jobs where applicable
```

------------------------------------------------------------------------

# 29. Payment Metrics

Payment monitoring is business-critical.

Track:

``` text
Payment initiation count
Payment success rate
Payment failure rate
Payment pending rate
Webhook success rate
Webhook failure rate
Webhook processing latency
Refund failures
```

------------------------------------------------------------------------

# 30. Payment Anomaly Alerts

Potential alerts:

``` text
Sudden payment failure spike
Webhook failure spike
Unusually high pending payments
Provider unavailable
Duplicate/idempotency conflicts
```

Alert thresholds should be established after baseline traffic is
understood.

------------------------------------------------------------------------

# 31. Inventory Metrics

Monitor:

``` text
Inventory adjustment failures
Reservation failures where applicable
Out-of-stock frequency
Inventory synchronization failures
Overselling indicators
```

Inventory anomalies should be treated as high-priority commerce issues.

------------------------------------------------------------------------

# 32. Checkout Metrics

Track the checkout funnel:

``` text
Checkout initiated
Address validation passed
Inventory validation passed
Payment initiated
Payment succeeded
Order created
```

This helps distinguish:

``` text
Traffic problem
Application problem
Payment problem
Inventory problem
```

------------------------------------------------------------------------

# 33. Order Metrics

Monitor:

``` text
Orders created
Orders cancelled
Order creation failures
Order state transition failures
Fulfillment delays where tracked
```

------------------------------------------------------------------------

# 34. Wholesale Metrics

Potential wholesale operational metrics:

``` text
Applications submitted
Applications pending
Applications approved
Applications rejected
Applications suspended
Wholesale order activity
```

These should not expose sensitive customer information in dashboards.

------------------------------------------------------------------------

# 35. Security Metrics

Security monitoring should consider:

``` text
Authentication failures
Authorization denials
Rate-limit violations
Suspicious request patterns
Privileged actions
Webhook signature failures
Unexpected administrative activity
```

------------------------------------------------------------------------

# 36. Health Checks

Production services should expose appropriate health/readiness checks.

Conceptually:

``` text
GET /health/
GET /ready/
```

The final endpoint structure may be adjusted to the hosting environment.

------------------------------------------------------------------------

# 37. Liveness

Liveness should answer:

``` text
Is the application process alive?
```

It should be lightweight and should not fail because of an optional
third-party dependency.

------------------------------------------------------------------------

# 38. Readiness

Readiness should answer:

``` text
Can this instance safely receive traffic?
```

It may consider critical dependencies required for normal operation.

Do not expose internal dependency details publicly.

------------------------------------------------------------------------

# 39. Health Check Security

Health endpoints must not reveal:

``` text
Secrets
Environment variables
Database credentials
Internal topology
Stack traces
Sensitive provider information
```

------------------------------------------------------------------------

# 40. Dashboards

Production should have dashboards for at least:

``` text
Application
Database
Payments
Checkout
Orders
Workers where applicable
Security
```

------------------------------------------------------------------------

# 41. Application Dashboard

Include:

``` text
Requests/minute
P95/P99 latency
4xx rate
5xx rate
Top failing endpoints
Top slow endpoints
Active incidents
```

------------------------------------------------------------------------

# 42. Database Dashboard

Include:

``` text
Availability
Connections
Latency
Slow queries
Storage
Resource utilization
```

------------------------------------------------------------------------

# 43. Commerce Dashboard

Include:

``` text
Checkout starts
Checkout completion
Payment success/failure
Orders created
Order failures
Inventory anomalies
```

------------------------------------------------------------------------

# 44. Security Dashboard

Include:

``` text
Authentication failures
Authorization failures
Rate-limit events
Webhook signature failures
Privileged actions
```

------------------------------------------------------------------------

# 45. Alerting Principles

Alerts should be:

-   Actionable.
-   Specific.
-   Prioritized.
-   Low-noise.
-   Connected to an owner/runbook.

Avoid alerting simply because a metric changed slightly.

------------------------------------------------------------------------

# 46. Severity Levels

A practical severity model:

``` text
SEV-1
Critical production outage/security/financial incident.

SEV-2
Major production degradation affecting important functionality.

SEV-3
Limited production issue with workaround.

SEV-4
Minor operational issue or warning.
```

The final incident policy should define exact response expectations.

------------------------------------------------------------------------

# 47. Critical Alerts

Examples:

``` text
Production application unavailable
Database unavailable
Major payment outage
Critical security incident
Large-scale checkout failure
```

------------------------------------------------------------------------

# 48. Warning Alerts

Examples:

``` text
Increasing latency
Growing queue depth
Elevated error rate
Storage approaching threshold
Database connection pressure
```

------------------------------------------------------------------------

# 49. Alert Deduplication

The monitoring system should avoid sending multiple alerts for the same
underlying incident.

Prefer:

``` text
One incident
   ↓
Correlated symptoms
```

rather than dozens of independent notifications.

------------------------------------------------------------------------

# 50. Alert Routing

Alerts should route to the appropriate operational channel.

Conceptually:

``` text
Critical production issue
        ↓
On-call/engineering notification

Payment issue
        ↓
Engineering + operations

Security incident
        ↓
Security/engineering escalation
```

Exact tools and channels will be selected during deployment.

------------------------------------------------------------------------

# 51. Runbooks

Important alerts should have runbooks.

A runbook should explain:

``` text
What happened?
How to confirm it?
Immediate mitigation
What not to do
Recovery procedure
Escalation
Post-incident action
```

------------------------------------------------------------------------

# 52. Example Runbook --- High 5xx Rate

``` text
1. Check application dashboard.
2. Identify affected endpoint/service.
3. Check recent deployment.
4. Check database health.
5. Check external dependencies.
6. Inspect correlated logs/traces.
7. Roll back if the deployment is the likely cause.
8. Verify recovery.
9. Document the incident.
```

------------------------------------------------------------------------

# 53. Example Runbook --- Payment Failure Spike

``` text
1. Check payment metrics.
2. Determine whether failures are provider-wide or application-specific.
3. Inspect provider status/integration errors.
4. Check recent deployments.
5. Verify webhook health.
6. Do not manually mark payments successful.
7. Apply approved fallback/recovery procedure.
8. Verify order/payment consistency.
```

------------------------------------------------------------------------

# 54. Example Runbook --- Database Failure

``` text
1. Confirm database availability.
2. Check connection saturation.
3. Check recent infrastructure/application changes.
4. Verify provider status.
5. Protect customer-facing operations if necessary.
6. Restore service or execute recovery procedure.
7. Verify data integrity.
8. Review incident.
```

------------------------------------------------------------------------

# 55. Deployment Monitoring

Every production deployment should be monitored immediately after
release.

Check:

``` text
Application health
Error rate
Latency
Database behavior
Checkout
Payment integration
Critical background jobs
```

------------------------------------------------------------------------

# 56. Deployment Verification Window

A release should have a defined observation period appropriate to its
risk.

During this period monitor:

``` text
5xx rate
Latency
Checkout failures
Payment failures
Webhook failures
```

------------------------------------------------------------------------

# 57. Synthetic Monitoring

Where practical, use synthetic checks for critical public journeys.

Potential checks:

``` text
Homepage loads
Catalog loads
Product detail loads
API health
Authentication flow
Cart availability
Checkout availability
```

Synthetic tests must not perform real financial transactions unless
explicitly designed for safe production testing.

------------------------------------------------------------------------

# 58. Production Smoke Tests

After deployment:

``` text
Health check
Homepage
Catalog
Product detail
Authentication
Cart
Critical API endpoints
```

Verify payment integration health separately.

------------------------------------------------------------------------

# 59. Business Continuity

Monitoring should help detect situations that are technically "up" but
commercially broken.

Examples:

``` text
Homepage works
but checkout fails.

API works
but payment webhooks fail.

Orders are created
but inventory is not updated.
```

Business monitoring is therefore mandatory.

------------------------------------------------------------------------

# 60. Data Quality Monitoring

Important business invariants should be monitored where practical.

Examples:

``` text
Payment marked successful but no corresponding order state
Order total mismatch
Inventory inconsistency
Duplicate external event
Unprocessed webhook
```

These are high-value monitoring signals.

------------------------------------------------------------------------

# 61. Background Job Recovery

Failed jobs should have a defined strategy:

``` text
Retry
Dead-letter/failure state
Alert
Manual recovery where necessary
```

Do not retry indefinitely.

------------------------------------------------------------------------

# 62. External Provider Monitoring

For critical providers, monitor:

``` text
Availability
Latency
Error rate
Timeouts
Authentication failures
Webhook delivery
```

------------------------------------------------------------------------

# 63. Monitoring Privacy

Observability systems can become sensitive data stores.

Therefore:

``` text
Collect only necessary data
Redact sensitive fields
Restrict dashboard access
Restrict log access
Define retention
```

------------------------------------------------------------------------

# 64. Retention

Retention policies should be defined for:

``` text
Application logs
Audit logs
Metrics
Traces
Error events
```

Long-term retention should be justified by operational, legal, or
business requirements.

------------------------------------------------------------------------

# 65. Access Control

Observability systems should follow least privilege.

Not every developer needs unrestricted access to:

``` text
Production logs
Customer-related telemetry
Security events
Payment operational data
```

------------------------------------------------------------------------

# 66. Error Tracking

Error tracking should capture:

``` text
Error type
Stack trace
Service
Environment
Release/version
Request/trace identifier
Relevant safe context
```

It should not capture secrets.

------------------------------------------------------------------------

# 67. Release Correlation

Each deployment should have a release/version identifier.

Then incidents can be correlated with:

``` text
Version X deployed
      ↓
Error rate increased
      ↓
Rollback X
      ↓
Error rate recovered
```

This greatly improves incident diagnosis.

------------------------------------------------------------------------

# 68. SLI / SLO Strategy

The project should eventually define Service Level Indicators and
Objectives.

Potential SLIs:

``` text
API availability
API latency
Checkout success
Payment processing success
Webhook processing success
```

Exact targets should be agreed after expected traffic and business
criticality are established.

------------------------------------------------------------------------

# 69. Example SLO Categories

Do not blindly choose targets before measuring the system.

Instead define categories such as:

``` text
Public storefront availability
Authenticated API availability
Checkout reliability
Payment integration reliability
Webhook processing reliability
```

Then establish measurable targets.

------------------------------------------------------------------------

# 70. Observability Definition of Done

Observability is complete for a production-critical feature when:

-   Important events are logged.
-   Sensitive data is protected.
-   Relevant metrics exist.
-   Errors are trackable.
-   Requests can be correlated.
-   Critical failures have alerts where appropriate.
-   Dashboards expose important health signals.
-   A runbook exists for high-impact incidents.
-   Deployment impact can be observed.

------------------------------------------------------------------------

# 71. AI Agent Observability Rules

Antigravity must not:

-   Add noisy logging everywhere.
-   Log secrets.
-   Log payment credentials.
-   Log full personal data unnecessarily.
-   Disable monitoring to hide failures.
-   Suppress errors without explanation.
-   Remove health checks without approval.
-   Ignore failing observability checks.
-   Introduce an external monitoring dependency without documenting it.

------------------------------------------------------------------------

# 72. Observability Change Workflow

Observability changes should follow:

``` text
Requirement
   ↓
Define signal
   ↓
Implement
   ↓
Test
   ↓
Verify dashboard/alert
   ↓
Review privacy
   ↓
Document
```

------------------------------------------------------------------------

# 73. Production Incident Workflow

The standard incident flow is:

``` text
Alert
  ↓
Triage
  ↓
Identify scope
  ↓
Correlate logs/metrics/traces
  ↓
Mitigate
  ↓
Recover
  ↓
Verify
  ↓
Document
  ↓
Root-cause analysis
  ↓
Prevent recurrence
```

------------------------------------------------------------------------

# 74. Root-Cause Analysis

Important incidents should produce a post-incident review containing:

``` text
Summary
Timeline
Impact
Root cause
Detection
Mitigation
Resolution
What went well
What failed
Preventive actions
```

Focus on system improvement rather than blame.

------------------------------------------------------------------------

# 75. Observability Architecture Summary

``` text
                         Production
                             |
             ┌───────────────┼────────────────┐
             ↓               ↓                ↓
           Logs            Metrics          Traces
             |               |                |
             └───────────────┼────────────────┘
                             ↓
                       Dashboards
                             |
                      Alerting/Incidents
                             |
                   Investigation/Recovery
```

For Closet by Chilli, observability must cover both:

``` text
Technical health
+
Commerce health
```

A technically healthy application that cannot complete checkout or
process payments is not healthy from the business perspective.

------------------------------------------------------------------------

# 76. Next Document

The next document should be:

``` text
16-seo-performance.md
```

It will define:

-   Technical SEO.
-   Metadata.
-   Structured data.
-   Product/category SEO.
-   URL strategy.
-   Sitemap.
-   Robots.
-   Canonicals.
-   Open Graph.
-   Core Web Vitals.
-   Image optimization.
-   Next.js rendering strategy.
-   Caching.
-   API performance.
-   Database query performance.
-   Frontend bundle performance.
-   Accessibility/performance relationship.
-   Performance budgets.
-   Production performance testing.
