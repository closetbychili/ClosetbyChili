# Closet by Chilli — Development Workflow

## 1. Purpose

This document defines how Closet by Chilli will be implemented as a production-ready application using small, controlled development sprints and Antigravity Agentic AI.

The workflow is designed to prevent:

- Uncontrolled AI changes.
- Architecture drift.
- Undocumented database changes.
- Broken integrations.
- Large unreviewed implementation batches.
- Security regressions.
- Features being considered complete without tests.

The core principle is:

```text
Plan → Prompt → Implement → Test → Review → Verify → Document → Commit
```

---

# 2. Development Philosophy

Closet by Chilli is a production e-commerce platform.

Therefore development should optimize for:

```text
Correctness
Security
Maintainability
Scalability
Observability
Testability
Performance
Business correctness
```

not merely speed of implementation.

AI agents are implementation assistants, not autonomous architects.

The human-approved architecture and documentation remain authoritative.

---

# 3. Sprint Size

Each sprint should implement one small, clearly defined capability.

Good sprint:

```text
Implement product-category API filtering.
```

Bad sprint:

```text
Build the entire catalog system.
```

A sprint should be small enough that its complete output can be reviewed and tested.

---

# 4. Sprint Lifecycle

Every sprint follows:

```text
1. Define objective
2. Identify relevant documentation
3. Define scope
4. Define non-goals
5. Write agent prompt
6. Agent inspects existing code
7. Agent implements
8. Agent runs tests/checks
9. Human reviews result
10. Fix issues
11. Run verification suite
12. Update documentation
13. Commit changes
```

---

# 5. Sprint Objective

Every sprint starts with one sentence:

```text
Objective:
<single measurable outcome>
```

Example:

```text
Objective:
Create the Product model and ProductVariant model according to the approved database architecture.
```

---

# 6. Scope

The sprint must explicitly state what will change.

Example:

```text
In scope:
- Product model
- ProductVariant model
- Required constraints
- Required indexes
- Backend tests
```

---

# 7. Non-Goals

Every non-trivial sprint should state what it must NOT implement.

Example:

```text
Out of scope:
- Product API
- Frontend product page
- Inventory reservation
- Payments
```

This is particularly important for AI agents.

---

# 8. Documentation Context

Before prompting Antigravity, provide the relevant project documents or instruct the agent to read them.

For example:

```text
Read:
docs/03-architecture.md
docs/05-database-architecture.md
docs/06-domain-model.md
docs/10-project-structure.md
```

The agent must not make architecture decisions that contradict these documents without explicit approval.

---

# 9. Agent Prompt Structure

Use a consistent prompt format:

```text
ROLE
You are working as a senior production full-stack engineer.

PROJECT CONTEXT
You are implementing Closet by Chilli.

READ FIRST
[List relevant documentation]

OBJECTIVE
[One clear objective]

SCOPE
[Allowed changes]

NON-GOALS
[Explicit exclusions]

TECHNICAL REQUIREMENTS
[Specific requirements]

SECURITY REQUIREMENTS
[Security constraints]

TEST REQUIREMENTS
[Tests required]

IMPLEMENTATION RULES
[Project-specific rules]

VALIDATION
Run the required checks.

OUTPUT
Report:
- Files changed
- Database changes
- Tests added
- Commands executed
- Results
- Remaining issues
```

---

# 10. Agent Must Inspect Before Editing

The agent must inspect the existing repository before modifying it.

At minimum:

```text
Relevant documentation
Existing directory structure
Related implementation
Existing tests
Existing configuration
Existing database/schema state where relevant
```

The agent must not assume the repository is empty.

---

# 11. No Blind Rewrites

The agent must not rewrite large parts of the application unless explicitly requested.

Avoid:

```text
"Refactor the entire backend."
```

Prefer:

```text
"Refactor the checkout service to isolate payment creation while preserving existing API behavior."
```

---

# 12. Minimal Change Principle

For each sprint:

```text
Make the smallest clean change that fully satisfies the objective.
```

Avoid unrelated:

- Refactors.
- Dependency upgrades.
- Naming changes.
- Formatting changes across the repository.
- Architecture changes.

---

# 13. Dependency Changes

Agents must not add dependencies merely because they are convenient.

Before adding a dependency, the agent should determine:

```text
Is the functionality already available?
Is the dependency maintained?
Does it materially simplify the implementation?
Does it introduce security/performance concerns?
```

Dependency additions should be reported explicitly.

---

# 14. Database Changes

Database changes are high-risk and require special discipline.

The approved workflow is:

```text
Requirement
   ↓
Database design
   ↓
Supabase MCP
   ↓
Schema change
   ↓
Verification
   ↓
Django integration
   ↓
Tests
```

The agent must not casually modify production schema.

---

# 15. Supabase MCP Workflow

When a database table/change is required, the Antigravity agent may use the configured Supabase MCP.

The prompt should explicitly state:

```text
Use the Supabase MCP for the database change.
Do not invent SQL outside the approved database design.
Inspect the existing schema first.
```

The agent must understand the intended schema before making changes.

---

# 16. Database Change Safety

Before creating or changing a table, verify:

```text
Does the table already exist?
Does an equivalent table already exist?
Are relationships already defined?
Are constraints already defined?
Are indexes already defined?
Could this change break existing data?
```

Do not create duplicate tables because an agent failed to inspect the database.

---

# 17. Database Naming

Database naming must follow the project-wide database convention.

The agent must not independently introduce a new naming convention.

Examples of concerns to keep consistent:

```text
Primary keys
Foreign keys
Timestamps
Status fields
Indexes
Unique constraints
Soft deletion where applicable
```

---

# 18. Database Verification

After a database sprint, verify:

```text
Tables exist
Columns are correct
Types are correct
Relationships are correct
Constraints are correct
Indexes are correct
RLS/security configuration is correct where applicable
```

The exact verification mechanism depends on the Supabase MCP capabilities and project tooling.

---

# 19. Django Database Integration

Django models must reflect the approved database architecture.

Do not allow the Django ORM model and Supabase schema to silently diverge.

After a schema change, verify:

```text
Django model
↔ PostgreSQL schema
```

---

# 20. Migration Policy

The project must maintain a reproducible database-change history.

Using Supabase MCP does not mean database changes can become undocumented.

Every schema change should have:

```text
Reason
Change description
Affected tables
Constraints/indexes
Rollback considerations
```

The final migration/versioning mechanism will be established before production schema changes begin.

---

# 21. API-First Feature Workflow

For commerce features, prefer:

```text
Domain model
   ↓
Business service
   ↓
API contract
   ↓
Backend implementation
   ↓
Backend tests
   ↓
Frontend integration
   ↓
E2E test
```

This prevents the frontend from becoming the source of business truth.

---

# 22. Frontend-First Exception

Purely visual work can be implemented frontend-first.

Examples:

```text
Header redesign
Product card styling
Responsive layout
Homepage visual section
```

But if the UI requires backend data, the API contract must still be defined.

---

# 23. Backend-First for Business Logic

Backend should generally be implemented before frontend for:

```text
Pricing
Cart rules
Inventory
Checkout
Orders
Payments
Wholesale authorization
Discounts
Shipping calculation
```

The frontend then consumes tested backend behavior.

---

# 24. API Contract Before Integration

Before implementing a frontend feature that consumes a new backend capability, confirm:

```text
Endpoint
HTTP method
Authentication
Request schema
Response schema
Errors
Pagination where applicable
Authorization rules
```

This should be documented in the API architecture or feature-specific documentation.

---

# 25. Tests Before Declaring Completion

A sprint is not complete because the feature visually works.

Required evidence should include relevant automated tests.

Examples:

```text
Backend unit tests
API tests
Permission tests
Frontend component tests
E2E tests
```

The type of test depends on the feature.

---

# 26. Test Pyramid

Use a balanced test strategy:

```text
             E2E
            /           Integration
        /               Unit       API
```

Most logic should be covered by fast unit/integration/API tests.

E2E tests should focus on important user journeys.

---

# 27. Security Testing

Security-sensitive features must include authorization tests.

Examples:

```text
Customer cannot access another customer's order.
Retail customer cannot access wholesale pricing.
Unauthorized user cannot modify inventory.
Staff cannot perform admin-only operations.
```

---

# 28. Financial Testing

Financial operations require especially strong tests.

Test:

```text
Correct totals
Discounts
Taxes if applicable
Shipping charges
Payment states
Duplicate payment attempts
Order creation
Refund behavior
```

Never rely solely on UI testing for financial correctness.

---

# 29. Inventory Testing

Inventory features should test:

```text
Available stock
Out-of-stock behavior
Concurrent purchase scenarios
Reservation/release behavior where applicable
Inventory adjustment permissions
```

The exact inventory model will follow the approved domain design.

---

# 30. Wholesale Testing

Wholesale features should test:

```text
Retail user
Pending wholesale user
Approved wholesale user
Rejected wholesale user
Suspended wholesale user
Staff
Admin
```

The backend must remain authoritative.

---

# 31. Test Environment

Tests must not depend on production data.

Use:

```text
Development database
Test database
Mocked/test payment provider
Test authentication identities
```

as appropriate.

---

# 32. Test Data

Test data should be deterministic.

Avoid tests that depend on:

```text
Random existing database records
Developer-specific local data
Production accounts
Current real inventory
```

---

# 33. Definition of Done

A sprint is Done only when:

- Objective is implemented.
- Scope is respected.
- Non-goals were not accidentally implemented.
- Relevant tests exist.
- Tests pass.
- Lint passes.
- Typecheck passes where applicable.
- Build passes where applicable.
- Security requirements are satisfied.
- Database changes are verified.
- Documentation is updated if required.
- No unexpected files changed.
- Agent reports implementation details.

---

# 34. Verification Commands

The actual commands will be defined during project initialization.

Conceptually:

```text
Frontend:
npm run lint
npm run typecheck
npm run test
npm run build

Backend:
ruff check .
python manage.py test
python manage.py check
```

Do not assume these exact commands until the project is initialized.

---

# 35. Final Verification

Before committing a sprint:

```text
git status
git diff
```

Review:

```text
Changed files
Unexpected changes
Secrets
Debug statements
Temporary code
Generated files
Database changes
```

---

# 36. Git Strategy

Use small, meaningful commits.

Good:

```text
feat(catalog): add product domain models
test(catalog): add product validation tests
feat(api): add product listing endpoint
feat(storefront): add product listing page
```

Avoid:

```text
final changes
stuff
updates
working
```

---

# 37. Commit Scope

One commit should ideally represent one logical change.

A sprint may contain multiple commits if that makes the history clearer.

Do not squash unrelated changes into one enormous commit.

---

# 38. Branch Strategy

A practical workflow:

```text
main
  |
  ├── feature/catalog-products
  ├── feature/cart
  ├── feature/checkout
  └── feature/wholesale
```

The exact branch naming convention will be finalized during repository setup.

Production should only receive reviewed changes.

---

# 39. Rollback Strategy

Every risky sprint should have a rollback plan.

For code:

```text
Git revert / rollback deployment
```

For database:

```text
Documented schema rollback/recovery strategy
```

For financial operations:

```text
Business-safe recovery procedure
```

Never assume a database rollback is equivalent to a code rollback.

---

# 40. AI Agent Safety Boundary

The agent must NOT:

- Delete production data.
- Drop tables without explicit approval.
- Disable security policies to make tests pass.
- Commit secrets.
- Change authentication architecture without approval.
- Change payment logic outside the sprint scope.
- Rewrite unrelated modules.
- Disable failing tests.
- Remove authorization checks to unblock UI.
- Silently change documented architecture.

---

# 41. Handling Existing Failures

If the agent discovers unrelated failing tests:

It should report:

```text
Existing failure
Location
Observed error
Whether caused by current changes
```

It must not silently rewrite unrelated functionality.

---

# 42. Handling Ambiguity

If requirements conflict with existing architecture:

```text
Stop
Identify conflict
Explain impact
Ask for architectural decision
```

Do not let the agent silently choose a major architecture change.

---

# 43. Handling Missing Requirements

If a feature requires an undefined business rule:

```text
Identify missing rule
Do not invent financial/business behavior
Report the decision required
```

Examples:

```text
Wholesale minimum order quantity
Discount stacking
Refund policy
Inventory reservation duration
Shipping eligibility
```

These must be business-approved.

---

# 44. Documentation Updates

When implementation changes architecture, update the appropriate document.

Examples:

```text
Database change → database/domain documentation
API change → API documentation
Auth change → auth documentation
Frontend architecture change → frontend documentation
Deployment change → infrastructure documentation
```

Documentation should describe the actual implemented architecture.

---

# 45. Agent Completion Report

Every sprint prompt should require the agent to return:

```text
## Summary

## Files Changed

## Database Changes

## API Changes

## Tests Added

## Commands Run

## Results

## Security Considerations

## Known Issues

## Follow-up Work
```

This makes AI output auditable.

---

# 46. Human Review Checklist

After every sprint, review:

### Scope

```text
Did it implement exactly the requested feature?
```

### Architecture

```text
Does it follow the documentation?
```

### Security

```text
Can unauthorized users bypass it?
```

### Data

```text
Are database changes correct?
```

### API

```text
Are contracts consistent?
```

### Frontend

```text
Is the UI responsive/accessibile?
```

### Tests

```text
Are important paths covered?
```

---

# 47. Sprint Review Questions

Before accepting a sprint:

```text
1. What changed?
2. Why did it change?
3. What data changed?
4. What API changed?
5. What security boundaries changed?
6. What tests prove it works?
7. What could break?
8. What remains intentionally unfinished?
```

---

# 48. Sprint Progression

The implementation should progress approximately as:

```text
Foundation
   ↓
Database
   ↓
Backend domains
   ↓
Authentication
   ↓
Catalog APIs
   ↓
Storefront
   ↓
Cart
   ↓
Checkout
   ↓
Payments
   ↓
Orders
   ↓
Wholesale
   ↓
CMS
   ↓
Admin/Operations
   ↓
Hardening
   ↓
Production readiness
```

The exact sequence can change based on dependencies.

---

# 49. Do Not Build Everything at Once

Avoid asking Antigravity:

```text
Build the complete e-commerce platform.
```

Instead:

```text
Sprint 1 → Foundation
Sprint 2 → Database foundation
Sprint 3 → Accounts
Sprint 4 → Catalog
...
```

Each sprint should have a controlled blast radius.

---

# 50. Sprint Prompt Versioning

Prompts should be treated as implementation artifacts.

For important sprints, keep the final approved prompt in:

```text
docs/prompts/
```

Example:

```text
docs/prompts/
├── sprint-001-foundation.md
├── sprint-002-database-foundation.md
└── ...
```

This creates a historical record of what the agent was instructed to implement.

---

# 51. Test Prompt Versioning

Test prompts can also be stored.

Example:

```text
docs/prompts/tests/
├── sprint-001-tests.md
├── sprint-002-tests.md
└── ...
```

This is optional for simple tests but valuable for important milestones.

---

# 52. Sprint Numbering

Use stable numbering:

```text
SPRINT-001
SPRINT-002
SPRINT-003
```

Do not renumber completed sprints.

---

# 53. Sprint Template

Use this template for every sprint:

```markdown
# SPRINT-XXX — [Title]

## Objective

[Single objective]

## Read First

- docs/...
- docs/...

## In Scope

- ...
- ...

## Out of Scope

- ...
- ...

## Technical Requirements

- ...
- ...

## Security Requirements

- ...
- ...

## Database Requirements

- ...
- ...

## API Requirements

- ...
- ...

## Testing Requirements

- ...
- ...

## Implementation Rules

- ...
- ...

## Validation

Run:
- ...
- ...

## Completion Report

Return:
- Files changed
- Database changes
- API changes
- Tests
- Commands
- Results
- Issues
```

---

# 54. First Implementation Sprint

Before building business features, the first implementation sprint should establish the development foundation.

It should cover:

```text
Repository initialization
Next.js application
Django application
Python environment
Package manager
Formatting
Linting
TypeScript
Testing infrastructure
Environment templates
Basic CI
Documentation wiring
```

It should NOT implement:

```text
Products
Cart
Checkout
Payments
Wholesale
Orders
```

---

# 55. Foundation Sprint Validation

The foundation sprint should prove:

```text
Frontend starts
Backend starts
Frontend builds
Backend passes system checks
Frontend lint/typecheck works
Backend lint/test tooling works
Environment configuration works
Repository structure matches documentation
```

---

# 56. Database Foundation Sprint

After the repository foundation is stable, the next database-focused sprint should establish only the approved foundational schema.

Use Supabase MCP to:

```text
Inspect project
Create approved tables
Create relationships
Create constraints
Create indexes
Configure required security policies
```

Then verify the schema.

Do not build every future table immediately unless the approved database architecture explicitly requires it.

---

# 57. Feature Sprint Example

A product catalog sprint could be:

```text
Objective:
Implement the read-only product catalog API.

In scope:
- Product query service
- Product serializer
- Product listing endpoint
- Product detail endpoint
- Pagination
- Filtering
- API tests

Out of scope:
- Cart
- Inventory reservation
- Checkout
- Admin UI
```

This gives the agent a precise boundary.

---

# 58. Full Feature Lifecycle Example

For a product feature:

```text
SPRINT A
Database/product schema

       ↓

SPRINT B
Django product domain

       ↓

SPRINT C
Product API

       ↓

SPRINT D
Product listing UI

       ↓

SPRINT E
Product detail UI

       ↓

SPRINT F
Search/filter UX

       ↓

SPRINT G
E2E catalog tests
```

This is slower than one giant prompt but substantially safer and easier to debug.

---

# 59. Why Small Sprints Matter

Small sprints provide:

```text
Smaller diffs
Faster tests
Easier review
Easier rollback
Better AI reliability
Lower architectural drift
Better debugging
Clearer commits
```

For an AI-driven project, this is especially important.

---

# 60. Production Readiness Phase

After core functionality is complete, dedicated hardening sprints should address:

```text
Security
Performance
Observability
SEO
Accessibility
Load testing
Failure recovery
Payment reliability
Backup/recovery
Deployment
Monitoring
```

These should not be left as an afterthought.

---

# 61. Final Release Gate

Before production launch:

```text
All critical tests pass
Security review complete
Database verified
Payment flows tested
Webhook flows tested
Inventory behavior verified
Wholesale rules verified
SEO checked
Accessibility checked
Performance checked
Error monitoring configured
Backups/recovery verified
Production environment verified
Rollback plan verified
```

---

# 62. Core Principle

The project should always move through:

```text
                 ┌──────────────┐
                 │ Documentation│
                 └──────┬───────┘
                        ↓
                 ┌──────────────┐
                 │ Sprint Prompt│
                 └──────┬───────┘
                        ↓
                 ┌──────────────┐
                 │ AI Agent     │
                 │ Implementation│
                 └──────┬───────┘
                        ↓
                 ┌──────────────┐
                 │ Automated    │
                 │ Tests        │
                 └──────┬───────┘
                        ↓
                 ┌──────────────┐
                 │ Human Review │
                 └──────┬───────┘
                        ↓
                 ┌──────────────┐
                 │ Verification │
                 └──────┬───────┘
                        ↓
                 ┌──────────────┐
                 │ Documentation│
                 │ + Commit     │
                 └──────────────┘
```

This is the standard workflow for the Closet by Chilli implementation.

---

# 63. Next Document

The next document is:

```text
12-testing-strategy.md
```

It will define the complete testing architecture, including:

- Backend testing.
- Frontend testing.
- API testing.
- Database testing.
- Authentication tests.
- Authorization tests.
- E-commerce workflow tests.
- Payment tests.
- Inventory/concurrency tests.
- Wholesale tests.
- E2E testing.
- Test data strategy.
- CI test gates.
- Production smoke tests.
