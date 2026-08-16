# Closet by Chilli --- API Error & Response Standards

## 1. Purpose

This document defines consistent API response and error-handling
standards for the Closet by Chilli backend.

The objective is to ensure that:

``` text
Frontend behavior is predictable
Errors are machine-readable
Customer messages are safe
Validation is consistent
HTTP semantics are meaningful
Logs contain diagnostic context
Sensitive internals are never leaked
```

------------------------------------------------------------------------

# 2. Scope

These standards apply to the public/application API exposed by Django.

They cover:

``` text
Success responses
Error responses
Validation errors
Authentication errors
Authorization errors
Business-rule errors
Not-found errors
Rate limiting
Pagination
Request/correlation IDs
Exception handling
Error logging
Frontend error mapping
```

------------------------------------------------------------------------

# 3. Core Principle

API responses must have a stable contract.

The frontend should not need to parse arbitrary backend prose to
determine what happened.

Prefer:

``` text
Stable error code
+
HTTP status
+
Safe message
+
Structured details where appropriate
```

------------------------------------------------------------------------

# 4. HTTP Semantics

Use HTTP status codes according to the meaning of the response.

Typical categories:

``` text
2xx → successful request
4xx → client/request/business problem
5xx → server/infrastructure problem
```

Do not return `200 OK` for an operation that actually failed.

------------------------------------------------------------------------

# 5. Success Responses

Successful responses should be predictable for each endpoint.

Examples:

``` text
200 OK
201 Created
202 Accepted
204 No Content
```

Use `201` when a resource is created.

Use `202` when work has been accepted for asynchronous processing and is
not yet complete.

Use `204` when the operation succeeds without a response body.

------------------------------------------------------------------------

# 6. Standard Success Envelope

Where the API architecture uses an envelope, maintain one consistent
shape.

Example:

``` json
{
  "data": {},
  "meta": {}
}
```

The exact envelope must remain consistent across the API.

Do not create different success formats for every Django app.

------------------------------------------------------------------------

# 7. Standard Error Envelope

A recommended error structure is:

``` json
{
  "error": {
    "code": "PRODUCT_NOT_FOUND",
    "message": "The requested product could not be found.",
    "details": {},
    "request_id": "..."
  }
}
```

The exact fields should be standardized centrally.

------------------------------------------------------------------------

# 8. Error Code

Every expected application error should have a stable machine-readable
code.

Examples:

``` text
PRODUCT_NOT_FOUND
INVALID_CART
INSUFFICIENT_STOCK
INVALID_COUPON
PAYMENT_FAILED
FORBIDDEN
RATE_LIMITED
```

------------------------------------------------------------------------

# 9. Error Code Rules

Error codes should be:

``` text
Stable
Unique
Machine-readable
Documented
Independent of human wording
```

Do not make frontend logic depend on exact English messages.

------------------------------------------------------------------------

# 10. Error Message

The `message` should be safe for customer-facing display where
appropriate.

Example:

``` text
"This product is no longer available."
```

Avoid exposing:

``` text
SQL errors
Stack traces
Provider secrets
Internal exception messages
Database identifiers
```

------------------------------------------------------------------------

# 11. Error Details

`details` may contain structured information useful to the frontend.

Example:

``` json
{
  "field": "email",
  "reason": "invalid_format"
}
```

Do not use `details` as a mechanism for dumping raw exception data.

------------------------------------------------------------------------

# 12. Request ID

Responses should expose a request/correlation identifier where
appropriate.

Example:

``` text
X-Request-ID
```

or an equivalent standardized header.

The identifier helps support and engineering teams correlate:

``` text
Frontend request
Backend logs
Background jobs
Provider calls
```

------------------------------------------------------------------------

# 13. Request ID Security

Request IDs should be non-sensitive identifiers.

Do not encode:

``` text
Passwords
Tokens
Customer data
Payment information
```

inside request IDs.

------------------------------------------------------------------------

# 14. Error Logging

The backend should log sufficient diagnostic information for unexpected
errors.

Logs may include:

``` text
Request ID
Endpoint
HTTP method
Authenticated actor context where safe
Exception category
Timestamp
Relevant entity ID
```

Do not log secrets or sensitive payment information.

------------------------------------------------------------------------

# 15. Expected vs Unexpected Errors

Separate:

``` text
Expected application errors
Unexpected system errors
```

Expected errors should produce controlled API responses.

Unexpected errors should produce a safe generic response and detailed
internal logging.

------------------------------------------------------------------------

# 16. Unexpected Server Error

For unexpected failures, return a generic response such as:

``` json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Something went wrong. Please try again.",
    "request_id": "..."
  }
}
```

Do not expose Python/Django exception details to the client.

------------------------------------------------------------------------

# 17. HTTP 400 --- Bad Request

Use `400 Bad Request` when the request is malformed or cannot be
processed because of invalid request semantics.

Examples:

``` text
Malformed request
Invalid query parameter combination
Invalid request structure
```

Use more specific status codes when another status is semantically
appropriate.

------------------------------------------------------------------------

# 18. HTTP 401 --- Unauthorized

Use `401` when authentication is required or authentication credentials
are invalid/missing according to the authentication contract.

Examples:

``` text
Missing authentication
Expired/invalid authentication
```

------------------------------------------------------------------------

# 19. HTTP 403 --- Forbidden

Use `403` when the requester is authenticated but is not permitted to
perform the operation.

Examples:

``` text
Customer attempting admin operation
Admin without required permission
Wholesale resource accessed without eligibility
```

------------------------------------------------------------------------

# 20. HTTP 404 --- Not Found

Use `404` when the requested resource does not exist or should not be
exposed to the requester.

Examples:

``` text
Product not found
Order not found
Category not found
```

------------------------------------------------------------------------

# 21. Resource Enumeration Protection

For protected resources, carefully consider whether a response could
reveal whether another user's resource exists.

Where appropriate, return behavior that does not disclose sensitive
existence information.

------------------------------------------------------------------------

# 22. HTTP 405 --- Method Not Allowed

Use `405` when the endpoint exists but does not support the requested
HTTP method.

------------------------------------------------------------------------

# 23. HTTP 409 --- Conflict

Use `409` for state conflicts.

Examples:

``` text
Inventory changed
Duplicate resource creation
Invalid state transition
Concurrent update conflict
```

------------------------------------------------------------------------

# 24. HTTP 410 --- Gone

Use `410` only when the API intentionally communicates that a resource
previously existed but is permanently unavailable and this distinction
has business value.

Do not use it automatically for every deleted resource.

------------------------------------------------------------------------

# 25. HTTP 422 --- Unprocessable Content

Use `422` where the API contract chooses it for semantically invalid,
well-formed requests.

The project should standardize whether validation/business-rule failures
use:

``` text
400
or
422
```

and apply that choice consistently.

------------------------------------------------------------------------

# 26. Validation Errors

Validation responses should identify invalid fields in a structured
manner.

Example:

``` json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Please correct the highlighted fields.",
    "details": {
      "email": ["Enter a valid email address."],
      "quantity": ["Quantity must be at least 1."]
    }
  }
}
```

------------------------------------------------------------------------

# 27. Field Error Format

Field errors should be machine-readable enough for frontend forms.

The frontend should be able to map:

``` text
field
→
error(s)
```

without parsing human text.

------------------------------------------------------------------------

# 28. Nested Validation

Nested resources should preserve useful field paths.

Example:

``` text
items[0].quantity
shipping_address.postal_code
```

The exact serialization format should be standardized.

------------------------------------------------------------------------

# 29. Multiple Validation Errors

Where practical, return all safe validation errors from the same request
rather than failing one field at a time.

Do not expose validation information that reveals sensitive internal
state.

------------------------------------------------------------------------

# 30. Authentication Errors

Authentication failures should use stable codes.

Examples:

``` text
AUTHENTICATION_REQUIRED
INVALID_CREDENTIALS
SESSION_EXPIRED
TOKEN_INVALID
```

The exact set should match the authentication architecture.

------------------------------------------------------------------------

# 31. Authorization Errors

Authorization failures should use stable codes.

Examples:

``` text
FORBIDDEN
INSUFFICIENT_PERMISSION
WHOLESALE_ACCESS_REQUIRED
```

------------------------------------------------------------------------

# 32. Password Error Messages

Do not reveal whether a particular account exists when that would enable
account enumeration.

For sensitive authentication flows, use generic responses where
appropriate.

------------------------------------------------------------------------

# 33. Business Rule Errors

Business-rule failures should have explicit error codes.

Examples:

``` text
INSUFFICIENT_STOCK
PRODUCT_UNAVAILABLE
COUPON_NOT_APPLICABLE
MINIMUM_ORDER_NOT_MET
ORDER_ALREADY_CANCELLED
INVALID_ORDER_STATE
```

------------------------------------------------------------------------

# 34. Error Codes vs HTTP Status

HTTP status communicates broad protocol semantics.

The application error code communicates domain meaning.

Example:

``` text
409 Conflict
+
INSUFFICIENT_STOCK
```

This allows the frontend to handle the domain case without depending on
message text.

------------------------------------------------------------------------

# 35. Inventory Errors

Inventory conflicts should return a controlled error.

Example:

``` json
{
  "error": {
    "code": "INSUFFICIENT_STOCK",
    "message": "Some items are no longer available in the requested quantity."
  }
}
```

The exact response may include safe item-level information where
appropriate.

------------------------------------------------------------------------

# 36. Pricing Errors

Pricing conflicts may occur when:

``` text
Price changed
Promotion expired
Coupon invalidated
Cart became stale
```

Return a stable business error and require the frontend to refresh
authoritative cart/pricing state.

------------------------------------------------------------------------

# 37. Coupon Errors

Coupon failures should use controlled codes such as:

``` text
INVALID_COUPON
COUPON_EXPIRED
COUPON_NOT_APPLICABLE
COUPON_USAGE_LIMIT_REACHED
MINIMUM_ORDER_NOT_MET
```

Do not reveal internal coupon configuration unnecessarily.

------------------------------------------------------------------------

# 38. Payment Errors

Payment failures should use controlled internal categories.

Examples:

``` text
PAYMENT_FAILED
PAYMENT_PENDING
PAYMENT_CANCELLED
PAYMENT_VERIFICATION_FAILED
PAYMENT_AMOUNT_MISMATCH
```

Do not expose raw provider error payloads.

------------------------------------------------------------------------

# 39. Payment Security

Never include:

``` text
Card number
CVV
Payment credentials
Provider secrets
Webhook secrets
```

in API error responses.

------------------------------------------------------------------------

# 40. Shipping Errors

Potential controlled errors include:

``` text
ADDRESS_INVALID
AREA_NOT_SERVICEABLE
SHIPPING_METHOD_UNAVAILABLE
SHIPPING_RATE_UNAVAILABLE
SHIPMENT_CREATION_FAILED
```

------------------------------------------------------------------------

# 41. Order Errors

Potential codes:

``` text
ORDER_NOT_FOUND
ORDER_NOT_CANCELLABLE
INVALID_ORDER_STATE
ORDER_ALREADY_CANCELLED
```

------------------------------------------------------------------------

# 42. Customer Errors

Potential codes:

``` text
CUSTOMER_NOT_FOUND
ADDRESS_NOT_FOUND
DUPLICATE_ADDRESS
ACCOUNT_OPERATION_NOT_ALLOWED
```

Do not expose private customer information through errors.

------------------------------------------------------------------------

# 43. Admin Errors

Admin APIs should use the same error contract while applying stricter
authorization.

Potential codes:

``` text
INSUFFICIENT_PERMISSION
INVALID_ADMIN_OPERATION
RESOURCE_LOCKED
```

------------------------------------------------------------------------

# 44. Rate Limiting

Rate-limited requests should return:

``` text
429 Too Many Requests
```

with a stable error code such as:

``` text
RATE_LIMITED
```

------------------------------------------------------------------------

# 45. Rate Limit Response

Where appropriate, expose retry guidance such as:

``` text
Retry-After
```

Do not expose internal infrastructure limits unnecessarily.

------------------------------------------------------------------------

# 46. Abuse Protection

Rate limiting should be considered for sensitive endpoints such as:

``` text
Login
Password/recovery
Coupon validation
Search
Checkout
Payment initiation
Admin operations
```

The exact limits belong to the security/rate-limiting configuration.

------------------------------------------------------------------------

# 47. Pagination

Paginated endpoints should use one consistent response structure.

Example:

``` json
{
  "data": [],
  "meta": {
    "page": 1,
    "page_size": 24,
    "total": 120
  }
}
```

The exact pagination model should follow the API architecture.

------------------------------------------------------------------------

# 48. Pagination Limits

The API should enforce a maximum page size.

Never allow an unbounded:

``` text
?page_size=1000000
```

request.

------------------------------------------------------------------------

# 49. Cursor Pagination

Cursor pagination may be preferred for large/highly dynamic datasets.

Where used, cursors should be opaque and treated as untrusted input.

------------------------------------------------------------------------

# 50. Sorting

Sort parameters should be allowlisted.

Do not allow clients to submit arbitrary database expressions.

------------------------------------------------------------------------

# 51. Filtering

Filter parameters should be validated against supported
fields/operators.

Do not expose arbitrary ORM query construction through API parameters.

------------------------------------------------------------------------

# 52. Search Errors

Search endpoints should handle:

``` text
Invalid query
Unsupported filter
Provider/index unavailable
```

with controlled error codes.

A temporary search-index outage should not expose internal
infrastructure details.

------------------------------------------------------------------------

# 53. API Versioning

The API should have a defined versioning strategy.

Possible approaches:

``` text
URL versioning
Header versioning
```

The chosen approach must be applied consistently.

------------------------------------------------------------------------

# 54. Backward Compatibility

Existing API contracts should not be broken casually.

Breaking changes require:

``` text
Versioning
Migration strategy
Frontend coordination
Documentation
Testing
```

------------------------------------------------------------------------

# 55. Error Contract Versioning

Changes to error codes/structure can break frontend behavior.

Treat the error contract as part of the public API contract.

------------------------------------------------------------------------

# 56. Content Type

JSON APIs should return the correct content type.

Example:

``` text
application/json
```

Do not return HTML Django debug/error pages to production API clients.

------------------------------------------------------------------------

# 57. Exception Handling

Global API exception handling should normalize expected
framework/application exceptions into the standard error contract.

Examples:

``` text
ValidationError
Authentication failure
Permission failure
Not found
Rate limiting
Domain/business exception
```

------------------------------------------------------------------------

# 58. Django Exception Boundary

Django/DRF framework exceptions should be translated at the API
boundary.

Domain code should not need to know the exact shape of HTTP JSON
responses.

------------------------------------------------------------------------

# 59. Domain Exceptions

Domain/application services may raise controlled business exceptions
such as:

``` text
InsufficientStock
InvalidCoupon
InvalidOrderState
PaymentVerificationFailed
```

The API layer maps these to:

``` text
HTTP status
Error code
Safe message
Details
```

------------------------------------------------------------------------

# 60. Separation of Concerns

Keep:

``` text
Domain logic
API response formatting
Logging
```

separate.

Do not embed HTTP response objects inside core domain services.

------------------------------------------------------------------------

# 61. Error Mapping Layer

Conceptually:

``` text
Domain Exception
      ↓
API Error Mapper
      ↓
HTTP Status + Error Code
      ↓
JSON Response
```

------------------------------------------------------------------------

# 62. Unknown Exceptions

Unknown exceptions should:

``` text
Be logged internally
Include request/correlation ID
Return generic client response
```

They must not expose implementation details.

------------------------------------------------------------------------

# 63. Logging Sensitive Data

Error logging must not contain:

``` text
Passwords
Access tokens
Refresh tokens
Payment credentials
Webhook secrets
Raw sensitive customer information
```

Apply the same rule to:

``` text
Application logs
Error monitoring
Background task logs
```

------------------------------------------------------------------------

# 64. Error Monitoring

Unexpected server errors should be captured by the
observability/error-monitoring system.

Useful metadata:

``` text
Request ID
Endpoint
Application version
Environment
Exception category
Safe business entity ID
```

------------------------------------------------------------------------

# 65. Customer-Facing Error Tracking

Frontend error handling should be able to report:

``` text
Request ID
Endpoint/action
Stable error code
```

to support teams without exposing sensitive backend diagnostics.

------------------------------------------------------------------------

# 66. Frontend Error Mapping

The frontend should map stable codes to appropriate UI behavior.

Example:

``` text
INSUFFICIENT_STOCK
→ Refresh cart and show inventory message

SESSION_EXPIRED
→ Re-authenticate

PAYMENT_PENDING
→ Show payment status/retry guidance

RATE_LIMITED
→ Show retry message
```

------------------------------------------------------------------------

# 67. Avoid Message Parsing

Do not write frontend logic such as:

``` text
if message.includes("stock")
```

Business behavior must use:

``` text
error.code
```

------------------------------------------------------------------------

# 68. Form Error Mapping

Form components should consume structured validation errors.

For example:

``` text
email
password
postal_code
```

should map directly to form fields.

------------------------------------------------------------------------

# 69. Global vs Field Errors

The contract should support both:

``` text
Field-level errors
Global request/business errors
```

Example:

``` text
field:
postal_code

global:
AREA_NOT_SERVICEABLE
```

------------------------------------------------------------------------

# 70. Error Localization

Human-readable error messages may eventually support localization.

Stable error codes must remain language-independent.

------------------------------------------------------------------------

# 71. Error Message Ownership

Messages intended for customers should be defined in a controlled layer.

Do not expose arbitrary database/provider exception messages.

------------------------------------------------------------------------

# 72. Retry Guidance

Responses should make it possible for the frontend to determine whether
retrying is appropriate.

Examples:

``` text
Transient server failure → retry may be appropriate
Invalid coupon → retrying unchanged request is pointless
Payment pending → poll/refresh status
Rate limited → wait
```

The frontend should not blindly retry every error.

------------------------------------------------------------------------

# 73. Idempotent API Operations

Endpoints that may be safely retried should support idempotency where
appropriate.

Especially:

``` text
Order creation
Payment initiation
Refund operations
Other financial operations
```

------------------------------------------------------------------------

# 74. Idempotency Errors

Potential code:

``` text
IDEMPOTENCY_CONFLICT
```

when a client reuses an idempotency key with incompatible request data.

------------------------------------------------------------------------

# 75. Request Size

APIs should enforce reasonable request-size limits.

This protects against:

``` text
Memory exhaustion
Abusive payloads
Accidental oversized uploads
```

------------------------------------------------------------------------

# 76. File Upload Errors

File APIs should return controlled errors such as:

``` text
FILE_TOO_LARGE
UNSUPPORTED_FILE_TYPE
INVALID_FILE
UPLOAD_FAILED
```

Do not expose filesystem paths.

------------------------------------------------------------------------

# 77. Bulk Operation Errors

Admin bulk operations should communicate:

``` text
Accepted
Partially completed
Failed
```

using an explicit contract.

Large bulk operations may return `202 Accepted` and a job reference.

------------------------------------------------------------------------

# 78. Async Job Response

For long-running work:

``` json
{
  "data": {
    "job_id": "..."
  }
}
```

may be returned with:

``` text
202 Accepted
```

The job status endpoint then exposes controlled progress/state.

------------------------------------------------------------------------

# 79. API Timeouts

The API should not wait indefinitely for external providers.

Provider calls should have bounded timeouts and produce controlled error
responses.

------------------------------------------------------------------------

# 80. Dependency Failure

When a non-critical dependency fails, determine whether the API should:

``` text
Return degraded response
Return controlled error
Use cached/rebuildable data
```

Do not hide a critical financial failure as a successful response.

------------------------------------------------------------------------

# 81. Correlation Across Async Work

When an API request creates a background job, preserve useful
correlation information.

Conceptually:

``` text
Request ID
   ↓
Job ID
   ↓
Provider/Event ID
```

This makes troubleshooting possible across system boundaries.

------------------------------------------------------------------------

# 82. Security Error Consistency

Security-sensitive endpoints should avoid revealing information through
different errors where that would enable enumeration.

Examples:

``` text
Login
Password recovery
Customer lookup
Wholesale application status
```

------------------------------------------------------------------------

# 83. Admin API Errors

Admin endpoints may expose more operational context to authorized staff,
but still must not expose:

``` text
Secrets
Credentials
Raw stack traces
Sensitive provider payloads
```

------------------------------------------------------------------------

# 84. API Documentation

Every public endpoint should document:

``` text
Success response
Possible HTTP statuses
Error codes
Validation errors
Authentication requirements
Authorization requirements
Pagination/filtering where applicable
```

------------------------------------------------------------------------

# 85. OpenAPI

The API contract should be represented in OpenAPI/schema documentation
where practical.

Error schemas should be reusable components rather than duplicated
manually.

------------------------------------------------------------------------

# 86. Error Code Registry

Maintain a central error-code registry.

For each code document:

``` text
Code
HTTP status
Meaning
Frontend behavior
Retryability
Security considerations
```

------------------------------------------------------------------------

# 87. Example Registry

Example:

``` text
INSUFFICIENT_STOCK
409
Cart/order cannot proceed with requested quantity
Frontend refreshes inventory
Retry after cart refresh

INVALID_COUPON
422
Coupon cannot be applied
Do not retry unchanged request
```

The final registry should be maintained with the implementation.

------------------------------------------------------------------------

# 88. API Testing

Tests should verify:

``` text
Correct HTTP status
Correct error code
Safe message
Structured details
Request ID
No sensitive data
```

------------------------------------------------------------------------

# 89. Validation Testing

Test:

``` text
Missing field
Invalid type
Invalid format
Boundary values
Unknown field where forbidden
Malformed JSON
Oversized request
```

------------------------------------------------------------------------

# 90. Authorization Testing

Test:

``` text
Unauthenticated
Authenticated but unauthorized
Correctly authorized
Cross-customer access
Retail → wholesale protected resource
Customer → admin resource
```

------------------------------------------------------------------------

# 91. Business Error Testing

Test:

``` text
Insufficient stock
Expired promotion
Invalid coupon
Invalid order state
Payment failure
Shipping unavailable
```

------------------------------------------------------------------------

# 92. Error Contract Regression Testing

A shared test suite should ensure that error response structure remains
stable across API modules.

------------------------------------------------------------------------

# 93. Production Error Behavior

Production APIs must:

``` text
Never expose Django debug pages
Never expose stack traces
Never expose database errors
Never expose secrets
Always provide safe error responses
Log unexpected failures internally
```

------------------------------------------------------------------------

# 94. API Error Definition of Done

The API response architecture is complete when:

-   Success response conventions are defined.
-   Error envelope is standardized.
-   Stable error codes exist.
-   HTTP status conventions are defined.
-   Validation errors are structured.
-   Authentication/authorization errors are consistent.
-   Business-rule errors are mapped centrally.
-   Unexpected exceptions produce safe generic responses.
-   Request/correlation IDs are available.
-   Sensitive information is excluded from responses/logs.
-   Rate-limit behavior is defined.
-   Pagination conventions are defined.
-   Async operation responses are defined.
-   Idempotency behavior is defined.
-   OpenAPI/error schemas are documented.
-   Frontend uses error codes rather than message parsing.
-   Error contract regression tests exist.

------------------------------------------------------------------------

# 95. AI Agent API Rules

Antigravity must not:

-   Return `200 OK` for failed operations.
-   Expose raw Django/Python exceptions in production.
-   Expose database errors to customers.
-   Make frontend logic depend on error-message text.
-   Create arbitrary error shapes per endpoint.
-   Return sensitive data inside error details.
-   Log passwords, tokens, payment credentials, or webhook secrets.
-   Trust client-provided HTTP status/error state.
-   Allow arbitrary ORM expressions through filters/sorting.
-   Allow unbounded pagination.
-   Retry every API error automatically.
-   Create non-idempotent financial endpoints without explicit
    safeguards.
-   Put HTTP response objects into domain services.
-   Leak resource existence through authorization errors where
    enumeration is a concern.

------------------------------------------------------------------------

# 96. API Change Workflow

Changes should follow:

``` text
API requirement
   ↓
Contract design
   ↓
HTTP status decision
   ↓
Error code definition
   ↓
OpenAPI/schema update
   ↓
Backend implementation
   ↓
Frontend mapping
   ↓
Contract tests
   ↓
Security review
   ↓
Staging verification
```

------------------------------------------------------------------------

# 97. API Error Architecture Summary

``` text
                    Django Domain
                         |
                Domain/Application
                     Exception
                         |
                    API Mapper
                         |
             ┌───────────┼───────────┐
             ↓           ↓           ↓
          HTTP Code   Error Code   Safe Message
             |           |           |
             └───────────┼───────────┘
                         ↓
                    JSON Response
                         |
                    Request ID
                         |
                     Frontend
                         |
                Stable UI Behavior
```

The fundamental rule is:

``` text
HTTP status communicates protocol semantics.
Error codes communicate application semantics.
Messages communicate safely to humans.
Logs contain the diagnostics.
The client must never need internal exception details to understand an API failure.
```

------------------------------------------------------------------------

# 98. Next Document

The next genuinely new document should be:

``` text
36-coding-standards-conventions.md
```

It will define:

-   Python/Django conventions.
-   TypeScript/Next.js conventions.
-   Naming.
-   Project layering.
-   Service/repository conventions.
-   API coding rules.
-   Database/model conventions.
-   React component conventions.
-   Error handling.
-   Type safety.
-   Import organization.
-   Comments/documentation.
-   Dependency rules.
-   Code review standards.
-   AI-generated code standards.
