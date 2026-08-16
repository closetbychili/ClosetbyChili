# Closet by Chilli --- Environment & Configuration Management

## 1. Purpose

This document defines how development, staging, and production
configuration is managed for Closet by Chilli.

The goal is to ensure that:

``` text
Environments are isolated
Secrets remain private
Configuration is explicit
Deployments are reproducible
Environment drift is minimized
AI agents cannot accidentally use production credentials
```

------------------------------------------------------------------------

# 2. Environment Model

The platform should maintain clear environment boundaries:

``` text
Development
    ↓
Staging
    ↓
Production
```

Each environment must have its own appropriate configuration and
credentials.

------------------------------------------------------------------------

# 3. Development Environment

Development is intended for:

``` text
Local implementation
Agentic development
Feature work
Unit/integration testing
Database experimentation
```

Development credentials must never provide unnecessary production
access.

------------------------------------------------------------------------

# 4. Staging Environment

Staging is intended for:

``` text
Integration verification
Release candidate testing
E2E testing
Deployment verification
Provider sandbox testing
```

Staging should resemble production sufficiently to expose meaningful
deployment problems.

------------------------------------------------------------------------

# 5. Production Environment

Production contains:

``` text
Real customer data
Real orders
Real payments
Real inventory
Production integrations
```

Production credentials and data must be strictly isolated.

------------------------------------------------------------------------

# 6. Environment Isolation

Never casually share:

``` text
Production database
Production secrets
Production payment credentials
Production storage
Production customer data
```

with development.

------------------------------------------------------------------------

# 7. Supabase Environment Separation

Because Supabase/PostgreSQL is part of the architecture, each
environment should have an explicitly defined database/project strategy.

For example:

``` text
Development → development Supabase project/database
Staging     → staging Supabase project/database
Production  → production Supabase project/database
```

The exact Supabase topology should be finalized based on the selected
plan and operational requirements.

------------------------------------------------------------------------

# 8. Database Safety

Development and staging applications must never accidentally connect to
the production database.

This should be protected through:

``` text
Separate credentials
Separate project/environment identifiers
Configuration validation
Least privilege
```

------------------------------------------------------------------------

# 9. Environment Identification

Every running application should know its environment explicitly.

For example:

``` text
development
staging
production
```

Avoid inferring the environment from arbitrary URLs or hostnames inside
business logic.

------------------------------------------------------------------------

# 10. Environment Configuration

Configuration should be supplied through environment-specific
configuration mechanisms.

Examples:

``` text
Environment variables
Secret manager
Deployment platform configuration
```

------------------------------------------------------------------------

# 11. Source Control

Commit:

``` text
Configuration templates
Non-secret defaults
Example environment files
```

Do not commit:

``` text
Production secrets
Private keys
API credentials
Database passwords
Webhook secrets
```

------------------------------------------------------------------------

# 12. Example Environment File

A safe template may be committed:

``` text
.env.example
```

It should contain variable names and safe placeholder values.

Example:

``` text
DATABASE_URL=
PAYMENT_PROVIDER_KEY=
PAYMENT_WEBHOOK_SECRET=
```

Never put real credentials into the template.

------------------------------------------------------------------------

# 13. Secret Management

Secrets should be stored in an appropriate secure mechanism such as:

``` text
Deployment platform secrets
CI/CD secret store
Dedicated secret manager
```

The exact provider should be selected during infrastructure
implementation.

------------------------------------------------------------------------

# 14. Secret Categories

Potential secrets include:

``` text
Database credentials
Supabase service credentials
Payment provider secret keys
Payment webhook secrets
Shipping provider credentials
Email provider credentials
Storage credentials
Authentication secrets
Celery/broker credentials
Monitoring credentials
```

------------------------------------------------------------------------

# 15. Public vs Private Configuration

Every environment variable must be classified as:

``` text
Public/client-safe
Private/server-only
```

------------------------------------------------------------------------

# 16. Next.js Public Variables

Only values intentionally exposed to the browser may use the public
environment-variable mechanism.

For Next.js, values using:

``` text
NEXT_PUBLIC_*
```

must be assumed publicly visible.

Never place secrets there.

------------------------------------------------------------------------

# 17. Django Secrets

Django secrets such as:

``` text
SECRET_KEY
Database credentials
Provider credentials
Signing secrets
```

must remain server-side.

------------------------------------------------------------------------

# 18. Service Credentials

Provider credentials should be scoped to the environment.

For example:

``` text
Development → sandbox credentials
Staging → sandbox/test credentials
Production → live credentials
```

where the provider supports separate environments.

------------------------------------------------------------------------

# 19. Payment Credentials

Production payment credentials must never be used by:

``` text
Local development
Automated CI
Ordinary staging
```

unless the provider/business has explicitly designed a controlled test
arrangement.

------------------------------------------------------------------------

# 20. Shipping Credentials

The same isolation applies to shipping/carrier credentials.

Development/staging should use sandbox/test integrations where
available.

------------------------------------------------------------------------

# 21. Email Credentials

Development should avoid accidentally sending real transactional emails
to customers.

Use:

``` text
Email sandbox
Test recipient routing
Development email backend
```

where appropriate.

------------------------------------------------------------------------

# 22. SMS Credentials

Development/staging should not accidentally send real SMS messages.

Use provider test modes or restricted test destinations where supported.

------------------------------------------------------------------------

# 23. Webhook Configuration

Each environment must have its own webhook configuration.

Conceptually:

``` text
Development webhook
Staging webhook
Production webhook
```

Webhook secrets must match the corresponding environment.

------------------------------------------------------------------------

# 24. Storage Configuration

Storage configuration must also be environment-specific.

Do not let development uploads enter the production media bucket.

------------------------------------------------------------------------

# 25. Storage Separation

Prefer:

``` text
Development bucket
Staging bucket
Production bucket
```

or an equivalent strict namespace/access model.

------------------------------------------------------------------------

# 26. Redis/Broker Configuration

Background workers should connect to the broker appropriate for their
environment.

Never let development workers consume production queues.

------------------------------------------------------------------------

# 27. Queue Isolation

Environment isolation must apply to:

``` text
Celery queues
Scheduled tasks
Webhook events
Background jobs
```

------------------------------------------------------------------------

# 28. Analytics Configuration

Analytics environments should be intentionally separated where the
provider supports it.

Development events should not pollute production business analytics
unnecessarily.

------------------------------------------------------------------------

# 29. Monitoring Configuration

Monitoring should identify:

``` text
Environment
Application version
Service
```

so development/staging errors do not become indistinguishable from
production incidents.

------------------------------------------------------------------------

# 30. Configuration Validation

Applications should validate required configuration at startup.

Examples:

``` text
Required database configuration exists
Required secret exists
Allowed environment value
Provider configuration is complete
```

------------------------------------------------------------------------

# 31. Fail Fast

If a required production configuration is missing, the application
should fail clearly rather than silently using an unsafe default.

------------------------------------------------------------------------

# 32. Unsafe Defaults

Avoid defaults such as:

``` text
debug=true
production database fallback
real payment credentials
insecure signing secret
```

------------------------------------------------------------------------

# 33. Django Debug

Production must always have:

``` text
DEBUG=False
```

or the equivalent safe configuration.

The deployment process should verify this.

------------------------------------------------------------------------

# 34. Allowed Hosts

Production Django configuration must explicitly define allowed hosts.

Do not use an unrestricted production configuration merely for
convenience.

------------------------------------------------------------------------

# 35. CORS

CORS origins should be environment-specific and allowlisted.

Do not use unrestricted wildcard origins for authenticated production
APIs unless there is a specific justified architecture.

------------------------------------------------------------------------

# 36. CSRF

CSRF/trusted-origin configuration must be environment-specific and
explicit.

------------------------------------------------------------------------

# 37. Cookie Configuration

Production authentication/session cookies should use appropriate secure
settings.

Consider:

``` text
Secure
HttpOnly
SameSite
Domain
```

according to the authentication architecture.

------------------------------------------------------------------------

# 38. Frontend API URL

The frontend must use the API endpoint appropriate for its environment.

Conceptually:

``` text
Development → development API
Staging → staging API
Production → production API
```

------------------------------------------------------------------------

# 39. API URL Safety

Do not hard-code production API URLs into generic development code.

------------------------------------------------------------------------

# 40. Environment Configuration Ownership

Configuration should have a clear owner.

For example:

``` text
Application defaults → repository
Secrets → secret manager
Deployment configuration → infrastructure
Business configuration → admin/domain system
```

Do not mix these responsibilities.

------------------------------------------------------------------------

# 41. Configuration vs Database Data

Some values are infrastructure configuration:

``` text
Database URL
Provider secret
Allowed origins
```

Other values are business data:

``` text
Promotion
Shipping rate
Product price
Store content
```

Business configuration that administrators need to change should
generally live in the application/database rather than environment
variables.

------------------------------------------------------------------------

# 42. Environment Variables Are Not Business Database

Do not use environment variables as a CMS or commercial rules database.

For example, do not require a deployment to change:

``` text
Product price
Promotion
Shipping rate
```

unless the value is genuinely infrastructure configuration.

------------------------------------------------------------------------

# 43. Configuration Naming

Use consistent, descriptive environment variable names.

Prefer:

``` text
PAYMENT_PROVIDER_SECRET_KEY
```

over ambiguous names such as:

``` text
KEY
VALUE
SECRET
```

------------------------------------------------------------------------

# 44. Configuration Validation

Invalid configuration should produce a clear startup error identifying:

``` text
Missing variable
Invalid value
Environment mismatch
```

without printing the secret itself.

------------------------------------------------------------------------

# 45. Type/Format Validation

Configuration should validate expected types and formats.

Examples:

``` text
Boolean
Integer
URL
Enum
Duration
```

Do not rely on every environment variable being a valid string for every
purpose.

------------------------------------------------------------------------

# 46. Secret Rotation

Secrets should be rotatable without requiring source-code changes.

Examples:

``` text
Payment key rotation
Webhook secret rotation
Database password rotation
JWT/signing secret rotation
```

------------------------------------------------------------------------

# 47. Rotation Procedure

A rotation should follow:

``` text
Create new credential
   ↓
Configure application
   ↓
Deploy/verify
   ↓
Switch provider if required
   ↓
Revoke old credential
   ↓
Verify old credential fails
```

The exact sequence depends on the provider.

------------------------------------------------------------------------

# 48. Secret Expiration

Where providers support expiration, track:

``` text
Credential owner
Created date
Expiration
Rotation date
```

Do not wait for a credential to expire unexpectedly in production.

------------------------------------------------------------------------

# 49. Secret Access

Access to production secrets should be limited to the people/services
that require it.

------------------------------------------------------------------------

# 50. AI Agent Secret Access

Antigravity should normally operate with development credentials only.

It must not require production secrets to implement ordinary application
features.

------------------------------------------------------------------------

# 51. AI Agent Production Safety

The agent must not:

``` text
Print production secrets
Commit secrets
Copy production credentials into .env files
Use production credentials for local testing
Upload production secrets into prompts
```

------------------------------------------------------------------------

# 52. Local Development Secrets

Developers may use:

``` text
.env.local
```

or an equivalent ignored local configuration file.

It must be excluded from source control.

------------------------------------------------------------------------

# 53. Git Ignore

Ensure local secret files are ignored.

Examples:

``` text
.env
.env.local
.env.*.local
```

The exact ignore patterns should match the repository's configuration
strategy.

------------------------------------------------------------------------

# 54. Environment Template

The repository should contain a documented safe template for required
configuration.

Example:

``` text
.env.example
```

It should be updated when new required variables are introduced.

------------------------------------------------------------------------

# 55. Configuration Documentation

Every important environment variable should document:

``` text
Name
Purpose
Required environments
Public/private
Expected format
Example placeholder
Owner
```

------------------------------------------------------------------------

# 56. Configuration Drift

Environment configuration can drift when staging and production are
manually modified.

Reduce drift through:

``` text
Versioned infrastructure
Configuration templates
Automated deployment
Configuration validation
```

------------------------------------------------------------------------

# 57. Manual Configuration

Manual production configuration should be minimized.

When manual changes are necessary:

``` text
Document change
Record owner
Record timestamp
Update source-of-truth configuration
```

------------------------------------------------------------------------

# 58. Configuration Audit

Periodically review:

``` text
Unused variables
Expired credentials
Duplicate configuration
Environment differences
Unexpected production values
```

------------------------------------------------------------------------

# 59. Configuration Consistency

The same variable should have consistent meaning across environments.

Avoid:

``` text
PAYMENT_MODE=production
```

meaning something completely different in staging.

------------------------------------------------------------------------

# 60. Feature Flags

Environment-specific feature flags may be used for controlled rollout.

However, feature flags should have:

``` text
Owner
Purpose
Default state
Removal plan
```

------------------------------------------------------------------------

# 61. Production Feature Flags

Production feature flags should not become an undocumented second
configuration system.

Important flags should be documented and auditable.

------------------------------------------------------------------------

# 62. Configuration Changes

Configuration changes should follow the appropriate change-management
process.

For sensitive production changes:

``` text
Review
Audit
Deployment
Verification
```

------------------------------------------------------------------------

# 63. CI/CD Integration

CI/CD should inject environment-specific configuration rather than
storing production secrets in repository files.

------------------------------------------------------------------------

# 64. Build-Time vs Runtime Configuration

Distinguish:

``` text
Build-time frontend configuration
Runtime backend configuration
```

Do not assume a runtime secret can safely be referenced from browser
code merely because it exists in the deployment environment.

------------------------------------------------------------------------

# 65. Next.js Build-Time Exposure

Any frontend value embedded into a Next.js browser bundle should be
considered public.

Never expose private backend credentials through build-time frontend
configuration.

------------------------------------------------------------------------

# 66. Runtime Secret Availability

Backend services should obtain private secrets through their server-side
environment/secret-management mechanism.

------------------------------------------------------------------------

# 67. Configuration During Local Development

Local setup should provide a clear process:

``` text
Clone repository
   ↓
Copy environment template
   ↓
Provide development credentials
   ↓
Run services
   ↓
Validate configuration
```

------------------------------------------------------------------------

# 68. Local Database

Local development may use:

``` text
Local PostgreSQL
Development Supabase project
```

according to the selected developer workflow.

The choice must be documented consistently.

------------------------------------------------------------------------

# 69. Local Supabase MCP

If Supabase MCP is used by Antigravity for schema work, the agent should
operate against the explicitly selected development/project context.

Before destructive schema operations, verify the target environment.

------------------------------------------------------------------------

# 70. MCP Environment Safety

The agent must not assume the currently connected Supabase project is
safe.

Before database operations that can modify data/schema, verify:

``` text
Project/environment identity
Expected database
Requested operation
```

------------------------------------------------------------------------

# 71. Staging Data

Staging should use:

``` text
Synthetic data
Sanitized data
Controlled test data
```

rather than unrestricted production customer data.

------------------------------------------------------------------------

# 72. Production Data Access

Development tools and AI agents should not receive broad production data
access merely for convenience.

------------------------------------------------------------------------

# 73. Configuration Secrets in Logs

Never print environment variables wholesale.

Avoid debugging patterns such as:

``` python
print(os.environ)
```

or equivalent configuration dumps.

------------------------------------------------------------------------

# 74. Error Messages

Configuration errors should reveal:

``` text
Variable name
Expected type/format
```

but not:

``` text
Secret value
Credential
Private endpoint token
```

------------------------------------------------------------------------

# 75. Environment Health Endpoint

A health endpoint may expose safe service health information.

Do not expose:

``` text
Secret configuration
Database credentials
Full environment variables
Internal tokens
```

------------------------------------------------------------------------

# 76. Environment Validation in CI

CI should validate configuration templates and expected variable names.

It should not require production secret values for ordinary pull-request
validation unless a secure deployment-stage test explicitly needs them.

------------------------------------------------------------------------

# 77. Production Deployment Gate

Before production deployment, verify:

``` text
Correct environment
Correct database
Correct provider credentials
Correct webhook configuration
Debug disabled
Allowed origins correct
Monitoring enabled
```

------------------------------------------------------------------------

# 78. Environment Mismatch Protection

The application should detect obvious dangerous mismatches where
practical.

For example:

``` text
Production environment
+
development payment credentials
```

should fail validation rather than silently operate.

------------------------------------------------------------------------

# 79. Cross-Environment Webhooks

Do not configure a production provider webhook to point at a development
application.

Environment-specific webhook URLs and secrets must match.

------------------------------------------------------------------------

# 80. Cross-Environment Jobs

Development workers must never consume:

``` text
Production Celery queues
```

and staging workers must not consume production jobs.

------------------------------------------------------------------------

# 81. Cross-Environment Storage

Development/staging processes must not accidentally write to production
media storage.

------------------------------------------------------------------------

# 82. Cross-Environment Analytics

Development/staging analytics should use appropriate provider
environments/configuration where available.

------------------------------------------------------------------------

# 83. Disaster Recovery Configuration

Recovery documentation must include the configuration categories
required to rebuild the environment, but never store actual production
secrets in the documentation.

------------------------------------------------------------------------

# 84. Environment Bootstrap

A new environment should be reproducible through:

``` text
Application source
+
Infrastructure configuration
+
Database schema/migrations
+
Safe configuration templates
+
Authorized secrets
```

------------------------------------------------------------------------

# 85. Environment Teardown

When an environment is destroyed, ensure:

``` text
Credentials revoked where necessary
Storage cleaned appropriately
Webhook removed
Workers stopped
DNS removed
Secrets retired
```

------------------------------------------------------------------------

# 86. Environment Access Review

Periodically review who/services have access to:

``` text
Development
Staging
Production
Secrets
Databases
Storage
Deployment
```

Remove unnecessary access.

------------------------------------------------------------------------

# 87. Configuration Testing

Test configuration behavior for:

``` text
Missing variable
Invalid value
Wrong environment
Expired credential
Unavailable provider
```

------------------------------------------------------------------------

# 88. Production Configuration Tests

A safe pre-deployment validation should verify production configuration
without exposing secret values.

------------------------------------------------------------------------

# 89. Configuration Definition of Done

Environment/configuration architecture is complete when:

-   Development, staging, and production boundaries are defined.
-   Database environments are isolated.
-   Storage environments are isolated.
-   Queue environments are isolated.
-   Provider credentials are environment-specific.
-   Public/private configuration is defined.
-   Secret management is defined.
-   `.env.example` strategy exists.
-   Production debug protection exists.
-   CORS/CSRF configuration is environment-aware.
-   Secret rotation is documented.
-   Configuration drift is controlled.
-   Configuration validation exists.
-   AI agents normally use development credentials.
-   MCP database operations verify the target environment.
-   Production deployment checks environment identity.
-   Production secrets are never committed or exposed in logs.

------------------------------------------------------------------------

# 90. AI Agent Configuration Rules

Antigravity must not:

-   Assume the current environment is safe.
-   Modify production configuration without explicit authorization.
-   Ask for or expose production secrets unnecessarily.
-   Put secrets into source code.
-   Put secrets into public Next.js environment variables.
-   Use production payment credentials for local testing.
-   Connect development workers to production queues.
-   Connect development storage to production media.
-   Run Supabase MCP destructive operations without verifying the target
    project/environment.
-   Print environment variables for debugging.
-   Create undocumented environment-specific behavior.
-   Treat environment variables as a substitute for business data.
-   silently fall back from missing production configuration to unsafe
    defaults.

------------------------------------------------------------------------

# 91. Configuration Change Workflow

``` text
Configuration requirement
   ↓
Classify:
public/private
infrastructure/business
build/runtime
   ↓
Define variable/configuration
   ↓
Update template/documentation
   ↓
Update environment configuration
   ↓
Validate
   ↓
Deploy
   ↓
Verify
   ↓
Audit
```

For secret rotation:

``` text
New credential
   ↓
Configure
   ↓
Deploy
   ↓
Verify
   ↓
Revoke old credential
   ↓
Audit
```

------------------------------------------------------------------------

# 92. Environment Architecture Summary

``` text
                 Repository
                     |
          ┌──────────┼──────────┐
          ↓          ↓          ↓
     Development   Staging   Production
          |          |          |
       Dev DB      Stage DB    Prod DB
          |          |          |
       Dev keys    Test keys   Live keys
          |          |          |
       Dev jobs    Stage jobs  Prod jobs
          |          |          |
       Dev media   Stage media Prod media
```

The fundamental rule is:

``` text
Environment identity must be explicit.
Secrets must be private.
Production must be isolated.
Business configuration belongs in the appropriate domain system.
AI agents should default to development access and must verify environment identity before sensitive operations.
```

------------------------------------------------------------------------

# 93. Next Document

The next genuinely new document should be:

``` text
39-production-readiness-checklist.md
```

It will consolidate the architecture into a final go-live checklist
covering:

-   Application readiness
-   Database readiness
-   Security
-   Authentication
-   Payments
-   Orders
-   Inventory
-   Shipping
-   SEO
-   Performance
-   Observability
-   Backups/recovery
-   CI/CD
-   Environment configuration
-   Admin
-   Legal/content placeholders
-   Monitoring
-   Launch-day verification
-   Rollback readiness
