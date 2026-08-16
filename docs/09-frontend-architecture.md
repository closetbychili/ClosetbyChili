# Closet by Chilli — Frontend Architecture

## 1. Purpose

This document defines the frontend architecture for the Closet by Chilli storefront.

The frontend is responsible for:

- Storefront presentation.
- Product discovery.
- Customer interactions.
- Cart interaction.
- Checkout UI.
- Customer account UI.
- Wholesale customer experience.
- CMS-driven storefront sections.
- Responsive and accessible presentation.

The frontend is **not** the authority for business-critical rules.

The authoritative business logic remains in Django.

---

# 2. Frontend Stack

The planned frontend stack is:

```text
Next.js
React
TypeScript
Tailwind CSS
shadcn/ui where appropriate
Supabase client for authentication/session integration
Django REST API for commerce operations
```

The exact package versions should be pinned during project initialization.

---

# 3. High-Level Architecture

```text
                    Browser
                       |
                       v
                  Next.js App
                       |
          ┌────────────┴────────────┐
          |                         |
      Supabase Auth             Django API
          |                         |
          |                  Application Services
          |                         |
          |                     PostgreSQL
          |
      User Session
```

The frontend consumes the Django API for commerce functionality.

---

# 4. Rendering Strategy

The application should use Next.js rendering capabilities deliberately.

Use:

```text
Server Components
```

by default where possible.

Use:

```text
Client Components
```

only where interactivity or browser APIs require them.

---

# 5. Server Components

Server Components should be preferred for:

- Product pages where possible.
- Category pages.
- Collection pages.
- CMS-driven homepage sections where possible.
- SEO-critical content.
- Static content.
- Layouts that do not require browser state.

Benefits include:

- Less client JavaScript.
- Better initial rendering.
- Better SEO.
- Better performance.

---

# 6. Client Components

Client Components are appropriate for:

- Product option selection.
- Quantity controls.
- Add-to-cart interactions.
- Cart drawer.
- Filters requiring immediate interaction.
- Mobile navigation state.
- Wishlist UI if introduced.
- Checkout forms.
- Interactive account UI.

A component should not become client-side merely because it is visually complex.

---

# 7. App Router

The project should use the Next.js App Router.

Conceptual structure:

```text
app/
├── layout.tsx
├── page.tsx
├── products/
├── categories/
├── collections/
├── cart/
├── checkout/
├── account/
├── wholesale/
└── ...
```

The exact route structure will be finalized during implementation.

---

# 8. Route Groups

Route groups may be used to separate concerns without changing URLs.

Conceptually:

```text
app/
├── (storefront)/
├── (account)/
├── (checkout)/
└── (admin)/
```

Route groups should be introduced when they improve organization rather than for unnecessary abstraction.

---

# 9. Storefront Structure

The storefront should support:

```text
Homepage
Product listing
Category listing
Collection listing
Product detail
Search
Cart
Checkout
Customer account
Wholesale experience
```

---

# 10. Homepage

The planned homepage order is:

```text
New Arrivals
Shop by Category
Kurtis
2-Piece Sets
3-Piece Sets
Ethnic Dresses
Bestsellers
Festive Collection
About Closet by Chilli
```

The implementation should allow merchandising sections to be reordered/configured through the CMS architecture where appropriate.

---

# 11. Product Listing Page

A product listing page should support:

- Product grid.
- Category context.
- Collection context.
- Filtering.
- Sorting.
- Pagination/infinite loading as appropriate.
- Loading state.
- Empty state.
- Error state.

The server/API remains responsible for authoritative filtering and pricing.

---

# 12. Product Detail Page

A product page should provide:

```text
Product images
Product name
Description
Price
Variant selection
Size selection where applicable
Color selection where applicable
Availability
Quantity
Add to cart
Relevant merchandising information
```

Wholesale users may see wholesale-specific pricing/features according to backend authorization.

---

# 13. Product Variant Selection

Variant selection is a client interaction but the frontend must not assume a selected variant is available.

Flow:

```text
User selects options
       ↓
Frontend resolves displayed variant
       ↓
Backend validates actual variant
       ↓
Cart operation
```

The backend remains authoritative.

---

# 14. Cart UI

The cart should support:

```text
View items
Change quantity
Remove item
View subtotal
View applicable discounts
Proceed to checkout
```

Cart totals returned by the backend should be treated as authoritative.

---

# 15. Cart State

The frontend may maintain temporary UI state for:

```text
Drawer open/closed
Pending quantity update
Optimistic interaction state
Loading state
```

But it should not maintain an independent authoritative cart database.

---

# 16. Checkout

Checkout should be designed as a controlled multi-step user flow.

Possible structure:

```text
Cart
  ↓
Customer Information
  ↓
Shipping Address
  ↓
Shipping Method
  ↓
Payment
  ↓
Order Confirmation
```

The exact steps depend on the final payment and shipping requirements.

---

# 17. Checkout State

Checkout state may contain temporary client-side information such as:

```text
Selected address
Selected shipping method
Payment UI state
Form state
```

Sensitive financial decisions and final totals are controlled by the backend/payment provider.

---

# 18. Order Confirmation

After successful order creation, the user should receive:

```text
Order number
Order summary
Items
Final total
Payment status
Shipping information where available
```

The frontend should obtain the authoritative result from the backend rather than constructing a fake success page from local state.

---

# 19. Customer Account

The account area should support appropriate features such as:

```text
Profile
Addresses
Orders
Order details
Wholesale status
```

Future features can be introduced without redesigning the core route architecture.

---

# 20. Wholesale Experience

Wholesale functionality should reuse storefront components where possible.

Example:

```text
Shared Product Card
        |
   ┌────┴────┐
Retail     Wholesale
Price       Price
```

Do not create a completely separate storefront codebase for wholesale unless the business requirements eventually justify it.

---

# 21. Wholesale UI Security

The frontend may conditionally display wholesale functionality.

However:

```text
Hidden UI ≠ Authorization
```

If a retail customer manually requests a wholesale API resource, Django must reject it.

---

# 22. API Client

The frontend should have one centralized API client layer.

Conceptually:

```text
lib/
└── api/
    ├── client.ts
    ├── products.ts
    ├── cart.ts
    ├── checkout.ts
    ├── orders.ts
    └── wholesale.ts
```

Avoid scattering raw `fetch()` calls throughout components.

---

# 23. API Client Responsibilities

The API client should handle:

- Base URL.
- Authentication headers.
- JSON serialization.
- Error normalization.
- Request IDs where applicable.
- Idempotency headers for supported operations.
- Response parsing.

It should not contain business rules.

---

# 24. Data Fetching

Data fetching should be organized around the API contract.

Use server-side fetching where it improves:

- SEO.
- Initial performance.
- Data security.
- Rendering.

Use client-side fetching for:

- Interactive updates.
- User-triggered operations.
- Frequently changing local UI state.

---

# 25. Cache Strategy

Cacheability should be determined by data characteristics.

Good candidates may include:

```text
Public categories
Public collections
Public product content
CMS homepage content
```

Avoid caching personalized data incorrectly.

Examples:

```text
Cart
Account
Private orders
Wholesale pricing
```

require careful cache handling.

---

# 26. Revalidation

Next.js revalidation should be introduced for public catalog/CMS data where appropriate.

The system should avoid unnecessarily rebuilding or fetching the entire storefront after every small change.

The exact revalidation mechanism will be selected during implementation.

---

# 27. State Management

Do not introduce a global state library automatically.

Prefer:

```text
React state
Server Components
URL state
Server/API state
```

where sufficient.

A client state library should be introduced only when there is a demonstrated need.

---

# 28. URL State

Search/filter/sort state should preferably be reflected in URL parameters.

Example:

```text
/products/kurtis?size=M&color=blue&sort=-created_at
```

Benefits:

- Shareable URLs.
- Browser navigation.
- Better discoverability.
- Predictable state restoration.

---

# 29. Forms

Forms should have:

- Client-side usability validation.
- Server-side authoritative validation.
- Clear field errors.
- Loading state.
- Submission protection.
- Accessible labels.

Client validation must never replace server validation.

---

# 30. Error Handling

The frontend must provide intentional error states.

Examples:

```text
Product not found
Network failure
Out of stock
Price changed
Session expired
Unauthorized
Checkout failed
Payment failed
Order creation failed
```

Avoid displaying raw backend exceptions.

---

# 31. Loading States

Important routes should provide deliberate loading UI.

Examples:

```text
Product skeleton
Product grid skeleton
Cart loading state
Checkout loading state
Account loading state
```

The UI should not appear frozen during network requests.

---

# 32. Empty States

Examples:

```text
No search results
Empty cart
No orders
No saved addresses
No wholesale application
```

Empty states should explain what happened and provide an appropriate next action.

---

# 33. Optimistic UI

Optimistic updates may be used for low-risk interactions such as:

```text
Cart quantity updates
Removing an item
Wishlist interactions if introduced
```

Do not use optimistic UI to falsely imply success for:

```text
Payment
Order creation
Refund
Wholesale approval
```

---

# 34. Design System

The project should use a consistent design system.

It should define:

```text
Typography
Spacing
Buttons
Inputs
Cards
Badges
Dialogs
Drawers
Tables
Alerts
Skeletons
Navigation
```

The design system must follow the client's approved visual direction.

---

# 35. Brand Theme

The client-provided logo and visual theme are the source of truth for brand presentation.

The implementation should centralize:

```text
Brand colors
Typography
Logo usage
Border radius
Spacing
Shadows
Component styling
```

Do not hard-code brand values throughout individual components.

---

# 36. Theme Tokens

Use centralized design tokens.

Conceptually:

```text
--color-primary
--color-secondary
--color-background
--color-foreground
--color-muted
--color-border
--radius-sm
--radius-md
--radius-lg
```

The exact values should come from the approved design system.

---

# 37. Responsive Design

The storefront must be designed mobile-first.

Required experiences:

```text
Mobile
Tablet
Desktop
Large desktop
```

The UI should not merely shrink desktop layouts.

Navigation, product grids, filters, cart and checkout should be intentionally responsive.

---

# 38. Mobile Navigation

The mobile navigation should provide easy access to:

```text
Categories
Collections
Search
Account
Cart
```

The implementation should avoid unnecessarily complex navigation states.

---

# 39. Product Grid

The product grid should adapt to viewport size.

Conceptually:

```text
Mobile       → 2 columns
Tablet       → 3 columns
Desktop      → 4+ columns
```

Exact column counts depend on final design.

---

# 40. Image Strategy

Fashion commerce depends heavily on imagery.

Product images should:

- Use appropriate aspect ratios.
- Be optimized.
- Include meaningful alt text.
- Support responsive sizing.
- Avoid unnecessary full-resolution downloads.

Next.js image optimization should be used where compatible with the image storage/CDN architecture.

---

# 41. Image Loading

Use:

```text
Lazy loading
Responsive sizes
Appropriate dimensions
Placeholder strategy
```

Above-the-fold images should be prioritized appropriately.

---

# 42. SEO

SEO is important for public storefront pages.

Each indexable product/category/collection page should have:

```text
Title
Meta description
Canonical URL
Open Graph metadata
Relevant structured data where appropriate
```

---

# 43. Product SEO

Product pages should expose structured product information where appropriate, including:

```text
Product name
Price
Availability
Images
```

Structured data must reflect actual backend information.

---

# 44. Canonical URLs

Duplicate catalog URLs should be controlled.

For example:

```text
/products/kurtis
```

and filter/sort URLs should have a deliberate indexing strategy.

Not every query parameter should automatically create an indexable search-engine page.

---

# 45. Sitemap

Public indexable pages should be represented in the sitemap strategy.

Potential sources:

```text
Products
Categories
Collections
CMS pages
```

The sitemap should avoid private/account/checkout routes.

---

# 46. Robots

Private routes should not be treated as public SEO content.

Examples:

```text
/account
/cart
/checkout
/admin
```

should not be indexed.

---

# 47. Accessibility

The frontend must target strong WCAG-aligned accessibility.

Requirements include:

- Semantic HTML.
- Keyboard navigation.
- Visible focus states.
- Accessible forms.
- Meaningful labels.
- Sufficient contrast.
- Screen-reader-friendly controls.
- Accessible dialogs/drawers.
- Reduced-motion considerations where appropriate.

---

# 48. Images and Accessibility

Decorative images should not create unnecessary screen-reader noise.

Product images should have useful alternative text.

Avoid:

```text
alt="image123.jpg"
```

Prefer meaningful descriptions based on actual product information.

---

# 49. Keyboard Navigation

Users must be able to navigate important flows without a mouse.

Critical flows include:

```text
Navigation
Search
Product selection
Add to cart
Cart
Checkout
Account
```

---

# 50. Performance Goals

The frontend should prioritize:

```text
Fast initial render
Low client JavaScript
Optimized images
Efficient API requests
Good Core Web Vitals
Responsive interaction
```

Performance should be measured rather than assumed.

---

# 51. Performance Anti-Patterns

Avoid:

- Making every component a Client Component.
- Huge client-side state stores.
- Loading all products on the homepage.
- Unoptimized original images.
- Waterfall API requests.
- Duplicate API calls.
- Unnecessary third-party scripts.
- Large UI libraries imported wholesale.

---

# 52. Component Architecture

Organize components by responsibility.

Conceptually:

```text
components/
├── ui/
├── layout/
├── navigation/
├── product/
├── cart/
├── checkout/
├── account/
├── wholesale/
└── cms/
```

The exact organization can evolve as the application grows.

---

# 53. UI Components

Generic UI components should remain business-agnostic.

Examples:

```text
Button
Input
Dialog
Drawer
Select
Badge
Skeleton
```

---

# 54. Domain Components

Domain components contain storefront-specific presentation.

Examples:

```text
ProductCard
ProductGallery
ProductVariantSelector
CartItem
OrderSummary
AddressForm
WholesaleStatusCard
```

---

# 55. Component Composition

Prefer composition over extremely large components.

Avoid:

```text
ProductPage.tsx
  → 1,500 lines
```

Prefer:

```text
ProductPage
 ├── ProductGallery
 ├── ProductInformation
 ├── VariantSelector
 ├── PriceDisplay
 └── AddToCart
```

---

# 56. TypeScript

TypeScript should be used throughout the frontend.

Avoid:

```text
any
```

unless there is a documented reason.

API response types should be explicit.

---

# 57. API Types

API types should correspond to the API contract rather than manually duplicated ad-hoc shapes.

Where practical, generate or derive types from OpenAPI.

The frontend should not invent response fields.

---

# 58. Environment Variables

Public frontend configuration may include safe public values such as:

```text
NEXT_PUBLIC_API_URL
Supabase public client configuration
```

Secrets must never use `NEXT_PUBLIC_*`.

---

# 59. Secret Boundary

Never place the following into browser-exposed environment variables:

```text
Database password
Supabase service-role key
Payment secret
Webhook secret
Private API credentials
```

---

# 60. Authentication UI

Authentication UI should integrate with Supabase Auth.

Potential screens:

```text
Login
Register
Forgot Password
Reset Password
Email Verification
```

The exact authentication methods depend on final client requirements.

---

# 61. Authentication UX

Authentication errors should be:

- Clear.
- User-friendly.
- Non-sensitive.

Avoid exposing whether a particular account exists when that would create an account-enumeration issue.

---

# 62. Session-Aware UI

The frontend may adapt navigation based on session state:

```text
Guest
   → Login/Register

Customer
   → Account/Orders

Wholesale
   → Wholesale features
```

This is UX behavior, not the authorization boundary.

---

# 63. Middleware

Next.js middleware may be used for appropriate route/session handling.

It should not replace Django authorization.

For example:

```text
Middleware says:
"User appears authenticated."

Django says:
"User is authorized to access this order."
```

The second check is authoritative.

---

# 64. Route Protection

Routes such as:

```text
/account
/checkout where authentication is required
/wholesale protected areas
```

may be protected at the frontend for UX.

The API must independently enforce the same security boundary.

---

# 65. Admin Frontend

The admin interface should be treated as a separate protected application area if a custom admin UI is eventually required.

Before building it, evaluate whether Django Admin already satisfies the operational requirements.

Avoid rebuilding functionality unnecessarily.

---

# 66. Error Boundaries

Important route segments should have error boundaries.

Examples:

```text
Product
Catalog
Checkout
Account
```

An isolated component failure should not unnecessarily crash the entire application.

---

# 67. Not Found Pages

Provide custom not-found experiences for:

```text
Product
Category
Collection
CMS page
```

The experience should offer useful navigation back into the storefront.

---

# 68. Analytics

Analytics should be introduced through a controlled integration layer.

Potential events include:

```text
Product viewed
Search performed
Add to cart
Checkout started
Purchase completed
```

Do not send sensitive payment/authentication data to analytics.

---

# 69. Third-Party Scripts

Third-party scripts should be:

- Necessary.
- Documented.
- Loaded efficiently.
- Privacy-reviewed.
- Restricted to required pages where possible.

Do not add tracking libraries simply because they are popular.

---

# 70. Internationalization

Internationalization should not be implemented unless required by the business.

However, the architecture should avoid hard-coding assumptions that would make future localization impossible.

---

# 71. Currency

The frontend should display currency values supplied by the backend pricing model.

Do not perform independent business pricing calculations in JavaScript.

Formatting can occur client-side.

---

# 72. Date/Time

Dates should be received from the API in a consistent format, preferably ISO 8601.

The frontend may format dates according to the user's locale.

---

# 73. Frontend Testing

Testing should include:

### Unit tests

For:

```text
Utility functions
UI components
Formatting
Client-side logic
```

### Integration tests

For:

```text
Product interactions
Cart
Forms
API integration
```

### End-to-end tests

For:

```text
Browse → Product → Cart → Checkout
Login → Account → Orders
Wholesale application → approved experience
```

---

# 74. Critical E2E Flows

The following should eventually have automated E2E coverage:

```text
Browse storefront
Search product
Open product
Select variant
Add to cart
Update cart
Checkout
Payment success
Payment failure
Order confirmation
View order
Wholesale application
Wholesale authorization
```

---

# 75. Frontend Development Workflow

A frontend feature should generally follow:

```text
Requirement
   ↓
API contract
   ↓
UI design
   ↓
Component design
   ↓
Server/client boundary
   ↓
Implementation
   ↓
Accessibility
   ↓
Responsive testing
   ↓
Automated tests
   ↓
Performance check
```

---

# 76. AI Agent Frontend Rules

The AI agent must:

- Read project documentation before implementation.
- Follow the established design tokens.
- Avoid creating duplicate components.
- Prefer Server Components.
- Use Client Components only when needed.
- Use the centralized API client.
- Never bypass Django for commerce operations.
- Never place secrets in frontend code.
- Add tests for critical interactions.
- Preserve responsive behavior.
- Preserve accessibility.

---

# 77. Frontend Definition of Done

A frontend feature is complete when:

- Desktop layout works.
- Mobile layout works.
- API integration works.
- Loading state exists.
- Error state exists.
- Empty state exists where relevant.
- Accessibility has been checked.
- TypeScript passes.
- Linting passes.
- Tests pass.
- No secrets are exposed.
- No business-critical logic is incorrectly delegated to the browser.

---

# 78. Final Frontend Architecture

```text
                         Next.js
                           |
                    ┌──────┴──────┐
                    |             |
               Server UI      Client UI
                    |             |
                    └──────┬──────┘
                           |
                      API Client
                           |
                    Django REST API
                           |
                  Application Services
                           |
                       PostgreSQL

Supabase Auth
      |
      └────────── Authentication / Session
```

The frontend is therefore a fast, SEO-friendly presentation layer over the Django commerce backend, with Supabase providing authentication identity.

---

# 79. Next Document

The next document is:

```text
10-project-structure.md
```

It will define the actual repository structure for:

```text
frontend/
backend/
docs/
infrastructure/
tests/
```

including Django apps, Next.js directories, shared conventions, environment files, scripts, configuration, and the structure the Antigravity coding agent must follow.
