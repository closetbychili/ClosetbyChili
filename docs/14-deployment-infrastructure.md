# Closet by Chilli --- Deployment & Infrastructure Architecture

## 1. Purpose

This document defines the deployment and infrastructure architecture for
Closet by Chilli.

The infrastructure must support:

-   Development.
-   Staging.
-   Production.
-   Secure deployments.
-   Reliable database connectivity.
-   Background processing where required.
-   Monitoring and observability.
-   Backups and recovery.
-   Horizontal scaling.
-   Safe rollback.

The infrastructure must remain consistent with the approved application
architecture.

------------------------------------------------------------------------

# 2. Infrastructure Principles

Closet by Chilli follows:

``` text
Infrastructure as Code where practical
Environment isolation
Least privilege
Immutable/repeatable deployments
Automated CI/CD
Secrets outside source control
Health checks
Observability
Backup and recovery
Simple scaling before premature complexity
```

------------------------------------------------------------------------

# 3. Environment Strategy

The project should have three logical environments:

``` text
Development
    ↓
Staging
    ↓
Production
```

Each environment should have independent configuration and credentials.

------------------------------------------------------------------------

# 4. Development Environment

Development is intended for:

``` text
Local implementation
AI-agent development
Feature testing
Database development
Integration testing
```

Developers/agents should never require production credentials for normal
development.

------------------------------------------------------------------------

# 5. Staging Environment

Staging should represent production as closely as reasonably practical.

Use staging for:

``` text
Release verification
E2E testing
Integration testing
Payment-provider sandbox testing
Performance checks
Migration verification
Production-like configuration testing
```

------------------------------------------------------------------------

# 6. Production Environment

Production is the live customer-facing environment.

Production changes must:

``` text
Be reviewed
Pass CI
Use production secrets
Use production database
Have rollback/recovery considerations
Be observable
```

Agents must not make uncontrolled production changes.

------------------------------------------------------------------------

# 7. High-Level Infrastructure

Conceptually:

``` text
                    Internet
                       |
                 CDN / DNS / TLS
                       |
              ┌────────┴────────┐
              │                 │
          Next.js            API Layer
          Frontend            Django
              │                 │
              └────────┬────────┘
                       |
                 PostgreSQL
                 / Supabase
                       |
        ┌──────────────┼──────────────┐
        │              │              │
      Storage       Background      External
                     Jobs           Providers
                                      |
                                  Payments
                                  Email
                                  Shipping
```

The exact hosting vendors may be selected during infrastructure
implementation.

------------------------------------------------------------------------

# 8. Frontend Deployment

The Next.js application should be deployed using infrastructure
appropriate for:

``` text
SSR
Static assets
Image optimization
Caching
Environment configuration
Global delivery where appropriate
```

The deployment platform must support the Next.js features actually used
by the application.

------------------------------------------------------------------------

# 9. Backend Deployment

Django should run as a production application server behind an
appropriate reverse proxy/load-balancing layer.

Conceptually:

``` text
Internet
   ↓
TLS / Load Balancer
   ↓
Django application
   ↓
PostgreSQL
```

Do not use Django's development server in production.

------------------------------------------------------------------------

# 10. Django Production Server

The production Django application should use a production-grade
WSGI/ASGI server.

The exact server configuration will be finalized during implementation.

The deployment should support:

``` text
Graceful restarts
Worker management
Health checks
Logging
Timeouts
Horizontal scaling
```

------------------------------------------------------------------------

# 11. Background Workers

Background processing should be introduced when work does not need to
block the HTTP request.

Potential workloads:

``` text
Email delivery
Image processing
Webhook follow-up work
Notifications
Report generation
Catalog synchronization
Other long-running jobs
```

The exact queue/worker technology should be finalized when these
requirements become concrete.

------------------------------------------------------------------------

# 12. Redis / Queue Infrastructure

If background jobs require a broker or cache, Redis or an equivalent
managed service may be introduced.

Do not introduce Redis solely because it is common in Django projects.

Use it when there is a clear requirement such as:

``` text
Task queue
Caching
Rate limiting
Distributed coordination
```

------------------------------------------------------------------------

# 13. Database Infrastructure

The primary relational database is PostgreSQL through the approved
Supabase architecture.

The database is a critical production dependency.

Infrastructure must provide:

``` text
Secure connectivity
Backups
Monitoring
Access control
Recovery procedures
```

------------------------------------------------------------------------

# 14. Supabase Production Separation

Development/staging/production database environments should be separated
according to the selected Supabase setup.

Do not allow local development operations to accidentally target
production.

------------------------------------------------------------------------

# 15. Database Credentials

Database credentials must:

-   Never be committed.
-   Never be embedded in frontend code.
-   Never be logged.
-   Be stored using secure environment/secret management.

------------------------------------------------------------------------

# 16. Supabase Service Credentials

Privileged Supabase credentials must remain server-side.

In particular:

``` text
Service-role credentials
Database passwords
Privileged API keys
```

must never be exposed to browser JavaScript.

------------------------------------------------------------------------

# 17. Database Migrations

Database changes must be reproducible.

The deployment process must know:

``` text
Which schema version is deployed
Which changes are pending
Whether migrations are safe
Whether rollback/recovery is possible
```

Supabase MCP does not replace the need for controlled schema-change
history.

------------------------------------------------------------------------

# 18. Migration Deployment

Production migrations should follow:

``` text
Review
   ↓
Test against staging
   ↓
Backup/recovery verification
   ↓
Production migration
   ↓
Application deployment
   ↓
Health checks
```

The exact ordering may vary for backward-compatible changes.

------------------------------------------------------------------------

# 19. Backward-Compatible Schema Changes

For zero/minimal downtime deployments, prefer:

``` text
Add new structure
Deploy compatible application
Migrate data if required
Switch application behavior
Remove old structure later
```

Avoid destructive schema changes in the same release as dependent
application changes whenever possible.

------------------------------------------------------------------------

# 20. Database Backups

Production database backups must be enabled according to the selected
Supabase plan/configuration.

The project should document:

``` text
Backup frequency
Retention
Recovery process
Responsible owner
Recovery expectations
```

------------------------------------------------------------------------

# 21. Recovery Testing

A backup is not considered reliable merely because it exists.

Recovery should be tested periodically.

Verify:

``` text
Backup can be located
Backup can be restored
Application can connect
Data integrity is maintained
Recovery procedure is documented
```

------------------------------------------------------------------------

# 22. Storage Infrastructure

Product images and other media should use the approved Supabase Storage
architecture or another explicitly approved object-storage system.

Storage should support:

``` text
Public product media
Private user data where required
Access policies
CDN/cache delivery where appropriate
Lifecycle management
```

------------------------------------------------------------------------

# 23. Media Processing

If image processing is required, processing should occur outside the
critical customer request when practical.

Potential operations:

``` text
Resize
Compress
Generate thumbnails
Create responsive variants
Validate uploads
```

------------------------------------------------------------------------

# 24. Domain Architecture

The production deployment should use a clear domain strategy.

Conceptually:

``` text
www.<domain>
    ↓
Next.js storefront

api.<domain>
    ↓
Django API
```

The final domains are business/deployment decisions and should not be
hard-coded into source code.

------------------------------------------------------------------------

# 25. DNS

DNS records should be managed centrally.

Document:

``` text
Production domain
API domain
Staging domain
Required verification records
Email-related DNS records
```

Avoid making undocumented DNS changes.

------------------------------------------------------------------------

# 26. HTTPS / TLS

Production traffic must use HTTPS.

Required considerations include:

``` text
TLS certificates
Certificate renewal
HTTPS redirects
Secure cookies
HSTS
```

------------------------------------------------------------------------

# 27. CDN

A CDN may be used for:

``` text
Static assets
Images
Public catalog content
Cacheable storefront resources
```

Do not cache personalized/private responses accidentally.

------------------------------------------------------------------------

# 28. Cache Strategy

Caching must define:

``` text
Cache key
TTL
Invalidation
Public/private scope
Staleness tolerance
```

Be especially careful with:

``` text
Price
Inventory
Cart
Checkout
Payment
Account information
```

------------------------------------------------------------------------

# 29. CI/CD

The project should use automated CI/CD.

Conceptually:

``` text
Git Push / Pull Request
        ↓
CI
        ↓
Lint
        ↓
Typecheck
        ↓
Tests
        ↓
Build
        ↓
Security checks
        ↓
Review
        ↓
Deploy
```

------------------------------------------------------------------------

# 30. Pull Request Checks

At minimum, CI should eventually verify:

``` text
Frontend lint
Frontend typecheck
Frontend tests
Frontend build
Backend lint
Backend tests
Backend system checks
Security/dependency checks
```

The exact commands are established during project initialization.

------------------------------------------------------------------------

# 31. Deployment Promotion

A recommended flow is:

``` text
Feature branch
     ↓
Pull Request
     ↓
CI
     ↓
Merge
     ↓
Staging
     ↓
E2E / release verification
     ↓
Production
```

------------------------------------------------------------------------

# 32. Production Deployment Approval

Production deployment should require a controlled release process.

At minimum verify:

``` text
CI green
Staging healthy
Critical E2E tests passing
Database changes reviewed
Known issues reviewed
Rollback strategy available
```

------------------------------------------------------------------------

# 33. Automated vs Manual Deployment

Automation should handle repeatable deployment steps.

Human approval may remain appropriate for:

``` text
Production release
Destructive database migration
Security-sensitive infrastructure changes
Payment configuration changes
```

------------------------------------------------------------------------

# 34. Environment Variables

Maintain environment-specific configuration.

Conceptually:

``` text
.env.example
.env.local
staging secrets
production secrets
```

Only `.env.example` belongs in source control.

Actual secrets do not.

------------------------------------------------------------------------

# 35. Environment Variable Rules

Every environment variable should have:

``` text
Name
Purpose
Required/optional status
Public/secret classification
Environment scope
```

Unused environment variables should be removed.

------------------------------------------------------------------------

# 36. Secret Rotation

Production secrets should be rotatable without requiring source-code
changes.

Potential secrets include:

``` text
Payment credentials
Webhook secrets
Email provider keys
Database credentials
Supabase privileged keys
```

------------------------------------------------------------------------

# 37. Secret Exposure Prevention

CI should scan for accidentally committed secrets where practical.

Before committing, verify:

``` text
No .env files
No private keys
No API secrets
No tokens
No credentials
```

------------------------------------------------------------------------

# 38. Containerization

Containerization may be used for the Django application and supporting
services when it improves:

``` text
Environment consistency
Deployment repeatability
Scaling
Isolation
Local/CI parity
```

The project should avoid unnecessary container complexity.

------------------------------------------------------------------------

# 39. Infrastructure as Code

Infrastructure configuration should be version-controlled where
practical.

Potentially managed resources:

``` text
Deployment configuration
Environment configuration templates
CI/CD
Infrastructure services
Monitoring
DNS configuration where supported
```

Do not store secrets in infrastructure code.

------------------------------------------------------------------------

# 40. Health Checks

Production services should expose appropriate health checks.

Conceptually:

``` text
GET /health/
```

Health checks should verify service availability without exposing
sensitive information.

------------------------------------------------------------------------

# 41. Readiness vs Liveness

Where the hosting platform supports it, distinguish:

``` text
Liveness
    Application process is running.

Readiness
    Application is ready to serve traffic.
```

A service should not receive traffic if critical dependencies make it
unable to operate correctly.

------------------------------------------------------------------------

# 42. Health Check Security

Health endpoints should not expose:

``` text
Database credentials
Environment variables
Stack traces
Internal topology
Secrets
```

------------------------------------------------------------------------

# 43. Graceful Shutdown

Application instances should handle termination gracefully.

The deployment should allow:

``` text
Stop accepting new work
Finish active requests where practical
Close connections
Terminate workers
```

This reduces failed requests during deployments.

------------------------------------------------------------------------

# 44. Horizontal Scaling

The architecture should permit multiple Django instances.

Conceptually:

``` text
Load Balancer
      |
 ┌────┼────┐
 ↓    ↓    ↓
Django Django Django
      |
 PostgreSQL
```

Application instances should remain as stateless as practical.

------------------------------------------------------------------------

# 45. Stateless Application Design

Do not depend on local application filesystem state for persistent
business data.

Persistent state should live in:

``` text
Database
Object storage
Approved external services
```

------------------------------------------------------------------------

# 46. File Storage in Deployments

Do not assume files written to a Django container/server filesystem will
persist across deployments.

Use object storage for persistent uploads/media.

------------------------------------------------------------------------

# 47. Scaling Database Access

Database performance should be protected through:

``` text
Indexes
Efficient queries
Connection management
Pagination
Caching where appropriate
Query monitoring
```

Do not solve poor queries by immediately increasing database size.

------------------------------------------------------------------------

# 48. Connection Management

Production Django database connections should be configured
appropriately for the hosting architecture.

Consider:

``` text
Connection limits
Pooling
Worker count
Database capacity
Timeouts
```

Avoid exhausting PostgreSQL connections by blindly increasing
application workers.

------------------------------------------------------------------------

# 49. External Services

External dependencies should have:

``` text
Timeouts
Failure handling
Retries where safe
Circuit/fallback strategy where appropriate
Monitoring
```

Critical external services include:

``` text
Payment provider
Email provider
Shipping provider
Authentication provider
Storage
```

------------------------------------------------------------------------

# 50. Payment Provider Configuration

Production and sandbox credentials must remain separate.

Deployment must ensure:

``` text
Staging → sandbox/test provider
Production → production provider
```

Do not accidentally run real payment operations from staging.

------------------------------------------------------------------------

# 51. Webhook Configuration

Webhook URLs must be environment-specific.

Conceptually:

``` text
Staging:
https://api-staging.<domain>/api/v1/webhooks/...

Production:
https://api.<domain>/api/v1/webhooks/...
```

Webhook secrets must also be environment-specific.

------------------------------------------------------------------------

# 52. Monitoring

Production infrastructure should monitor:

``` text
Application availability
Request latency
Error rates
Database health
Worker health
External-service failures
Infrastructure resource usage
```

------------------------------------------------------------------------

# 53. Error Tracking

Use an approved error-tracking platform or equivalent infrastructure.

Errors should include enough context to diagnose problems while avoiding
sensitive information.

------------------------------------------------------------------------

# 54. Logging

Production logs should be:

``` text
Structured where practical
Timestamped
Correlated
Searchable
Retention-controlled
```

Do not log secrets or unnecessary personal information.

------------------------------------------------------------------------

# 55. Metrics

Important metrics include:

``` text
Requests/minute
P95/P99 latency
5xx rate
4xx rate
Database latency
Queue depth
Worker failures
Checkout failures
Payment failures
Webhook failures
```

Business metrics should be separated from infrastructure metrics where
practical.

------------------------------------------------------------------------

# 56. Alerts

Alerts should focus on actionable failures.

Potential alerts:

``` text
High 5xx rate
High latency
Database unavailable
Worker queue failure
Payment webhook failures
Payment failure spike
Storage failures
Authentication failure spike
```

Avoid alerting on every minor warning.

------------------------------------------------------------------------

# 57. Incident Response

Infrastructure incidents should follow:

``` text
Detect
 ↓
Assess
 ↓
Contain
 ↓
Recover
 ↓
Verify
 ↓
Document
```

Production ownership and escalation contacts should be documented before
launch.

------------------------------------------------------------------------

# 58. Rollback Strategy

Code rollback:

``` text
Previous application release
```

Database rollback:

``` text
Backward-compatible migration
or
Documented recovery procedure
```

Do not assume application rollback automatically reverses database
changes.

------------------------------------------------------------------------

# 59. Release Strategy

For higher-risk releases, consider:

``` text
Small release
 ↓
Health verification
 ↓
Gradual traffic increase
 ↓
Monitor
 ↓
Continue or rollback
```

The exact rollout mechanism depends on the hosting platform.

------------------------------------------------------------------------

# 60. Zero-Downtime Considerations

Where possible:

``` text
Run compatible application versions
Use backward-compatible migrations
Use graceful shutdown
Use health checks
Drain traffic before termination
```

------------------------------------------------------------------------

# 61. Disaster Recovery

The production plan should define:

``` text
RPO
RTO
Backup strategy
Database recovery
Application redeployment
Secret recovery
DNS recovery
Third-party dependency recovery
```

The exact targets must be agreed based on business requirements.

------------------------------------------------------------------------

# 62. Production Cost Control

Infrastructure should scale according to actual requirements.

Avoid premature adoption of:

``` text
Kubernetes
Complex microservices
Multiple databases
Multiple queues
Custom infrastructure
```

unless business/technical requirements justify them.

------------------------------------------------------------------------

# 63. Architecture Preference

For Phase 1, prefer a modular monolith:

``` text
Next.js storefront
        +
Django modular backend
        +
PostgreSQL/Supabase
        +
Managed supporting services
```

This gives the project strong separation without unnecessary operational
complexity.

------------------------------------------------------------------------

# 64. Production Readiness Checklist

## Application

``` text
[ ] Production build succeeds
[ ] Health checks work
[ ] Errors are tracked
[ ] Logs are available
[ ] Environment configuration verified
```

## Database

``` text
[ ] Production database configured
[ ] Backups enabled
[ ] Recovery tested
[ ] Migrations reviewed
[ ] Connection limits verified
```

## Security

``` text
[ ] Secrets secured
[ ] HTTPS enabled
[ ] Security headers configured
[ ] CORS verified
[ ] Authentication verified
[ ] Authorization verified
```

## CI/CD

``` text
[ ] CI passes
[ ] Staging deployment works
[ ] Production deployment process documented
[ ] Rollback process documented
```

## Payments

``` text
[ ] Production credentials verified
[ ] Sandbox/production separation verified
[ ] Webhooks verified
[ ] Idempotency verified
```

## Operations

``` text
[ ] Monitoring
[ ] Alerts
[ ] Error tracking
[ ] Logs
[ ] Incident process
```

------------------------------------------------------------------------

# 65. AI Agent Infrastructure Rules

Antigravity must not:

-   Deploy directly to production without the approved release process.
-   Modify DNS without explicit authorization.
-   Change production secrets.
-   Disable health checks.
-   Disable security controls.
-   Delete infrastructure resources without explicit approval.
-   Change database infrastructure casually.
-   Add complex infrastructure without a documented requirement.
-   Commit secrets.
-   Assume local filesystem persistence in production.

------------------------------------------------------------------------

# 66. Infrastructure Change Workflow

Infrastructure changes should follow:

``` text
Requirement
   ↓
Architecture review
   ↓
Implementation
   ↓
Staging verification
   ↓
Security review
   ↓
Production deployment
   ↓
Health verification
   ↓
Documentation update
```

------------------------------------------------------------------------

# 67. Infrastructure Definition of Done

An infrastructure change is complete when:

-   The architecture is documented.
-   Configuration is reproducible.
-   Secrets are protected.
-   Staging has been verified.
-   CI/CD is updated if necessary.
-   Monitoring is configured.
-   Rollback/recovery considerations exist.
-   Production impact is understood.
-   Documentation reflects the actual implementation.

------------------------------------------------------------------------

# 68. Deployment Architecture Summary

``` text
                         Internet
                            |
                      DNS / TLS / CDN
                            |
             ┌──────────────┴──────────────┐
             |                             |
         Next.js                       Django API
         Storefront                       |
             |                            |
             |                     ┌──────┴──────┐
             |                     |             |
             |                PostgreSQL      Workers
             |                 / Supabase        |
             |                     |             |
             └──────────────┬──────┴─────────────┘
                            |
                    Storage / Providers
                            |
              ┌─────────────┼─────────────┐
              |             |             |
           Payments       Email        Shipping
```

The Phase 1 infrastructure should remain deliberately simple, managed,
secure, observable, and scalable without introducing operational
complexity before it is justified.

------------------------------------------------------------------------

# 69. Next Document

The next document should be:

``` text
15-observability-monitoring.md
```

It will define:

-   Logging architecture.
-   Metrics.
-   Error tracking.
-   Distributed/request tracing.
-   Correlation IDs.
-   Health checks.
-   Dashboards.
-   Alerts.
-   Business monitoring.
-   Payment monitoring.
-   Inventory monitoring.
-   Security monitoring.
-   Incident investigation.
-   Production SLOs/SLIs.
