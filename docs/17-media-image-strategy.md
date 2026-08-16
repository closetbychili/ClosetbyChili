# Closet by Chilli --- Media & Image Strategy

## 1. Purpose

This document defines the media and image architecture for Closet by
Chilli.

Fashion e-commerce is highly dependent on visual presentation. The media
system must therefore support:

``` text
High visual quality
Fast delivery
Responsive images
Reliable storage
Secure uploads
SEO-friendly metadata
Product galleries
Admin management
Scalable media processing
```

------------------------------------------------------------------------

# 2. Media Principles

The media architecture follows:

``` text
Original asset
      ↓
Validate
      ↓
Store
      ↓
Process/transform
      ↓
Generate delivery variants
      ↓
Serve through optimized delivery
```

The original asset should remain protected from accidental destructive
transformations where the business requires it.

------------------------------------------------------------------------

# 3. Media Types

The platform should distinguish between different media purposes.

Initial types include:

``` text
Product images
Product gallery images
Category images
Collection images
Homepage/hero banners
Promotional banners
Brand/about imagery
CMS/editorial images
User-uploaded images if required
```

Each type should have an explicit ownership and visibility model.

------------------------------------------------------------------------

# 4. Product Media

A product may contain multiple images.

Typical product gallery roles:

``` text
Primary image
Secondary image
Detail image
Lifestyle image
Back view
Side view
Additional view
```

The final roles depend on the client's catalog requirements.

------------------------------------------------------------------------

# 5. Primary Product Image

Each active product should have a clearly defined primary image where
the business requires one.

The primary image is used for:

``` text
Product cards
Category listings
Search results
Recommendations
Structured data
Social previews where appropriate
```

------------------------------------------------------------------------

# 6. Product Gallery Ordering

Product images should have an explicit display order.

For example:

``` text
1 → Primary
2 → Secondary
3 → Detail
4 → Lifestyle
```

The ordering must be stored as application data rather than inferred
from filenames.

------------------------------------------------------------------------

# 7. Image Ownership

Every media record should have a clear relationship to its owner/domain
object.

Examples:

``` text
Product image → Product
Category image → Category
Collection image → Collection
Banner → CMS/banner entity
```

Avoid orphaned media records.

------------------------------------------------------------------------

# 8. Media Identity

Media objects should have stable identifiers.

Do not use mutable filenames as the primary identity.

Conceptually:

``` text
media_id
product_id
storage_path
role
sort_order
alt_text
metadata
created_at
updated_at
```

The exact database fields belong to the approved database/domain model.

------------------------------------------------------------------------

# 9. Storage Architecture

Product and public marketing media should use the approved
object-storage architecture.

The current platform direction is:

``` text
Supabase Storage
```

or another explicitly approved storage provider if infrastructure
requirements change.

------------------------------------------------------------------------

# 10. Storage Buckets

Storage should be separated logically by access requirement.

Conceptually:

``` text
public-product-media
public-site-media
private-user-media
```

Do not place private user data into a public bucket.

The final bucket names should be established during implementation.

------------------------------------------------------------------------

# 11. Public Product Media

Product imagery intended for storefront display may be publicly
deliverable.

However:

``` text
Public image
≠
Public upload permission
```

Customers must not gain write access merely because product media is
publicly readable.

------------------------------------------------------------------------

# 12. Private Media

If the platform later supports private uploads such as:

``` text
Business documents
Wholesale verification documents
Customer-uploaded private files
```

those assets must use private storage and controlled access.

Signed URLs may be used where appropriate.

------------------------------------------------------------------------

# 13. Upload Authorization

Only authorized users/services may upload product media.

Potential actors:

``` text
Admin
Authorized staff
Approved media-processing service
```

Customers should not be able to upload directly into product-media
storage.

------------------------------------------------------------------------

# 14. Upload Validation

Every upload should validate:

``` text
File type
MIME type
File size
Image dimensions
Image integrity
Filename
Authorization
```

Never trust only the browser-provided MIME type.

------------------------------------------------------------------------

# 15. File Type Restrictions

The product media pipeline should explicitly allow supported image
formats.

Typical supported source formats may include:

``` text
JPEG
PNG
WebP
```

Additional formats should be added only when the processing/delivery
stack supports them reliably.

------------------------------------------------------------------------

# 16. File Size Limits

Uploads should have defined maximum sizes.

The limit should balance:

``` text
Original image quality
Upload reliability
Processing cost
Storage cost
Admin usability
```

Do not allow unlimited uploads.

The exact limit should be configured after reviewing the client's actual
photography workflow.

------------------------------------------------------------------------

# 17. Image Dimension Limits

Validate both:

``` text
Minimum dimensions
Maximum dimensions
```

Very small images may be unsuitable for product detail pages.

Extremely large images may waste:

``` text
Upload bandwidth
Processing resources
Storage
```

------------------------------------------------------------------------

# 18. Filename Safety

Never use raw user-provided filenames as executable paths.

Generate safe storage object names.

Conceptually:

``` text
product/{product_id}/{media_id}/original.ext
```

rather than:

``` text
uploads/My New Kurti!!!.jpg
```

------------------------------------------------------------------------

# 19. Storage Path Design

Storage paths should be deterministic enough to organize media but must
not become the business identity.

A conceptual path:

``` text
products/
  {product-id}/
    {media-id}/
      original.ext
      variants/
```

The exact implementation can differ based on the storage provider.

------------------------------------------------------------------------

# 20. Original Asset

Where practical, retain an original source asset separately from
delivery variants.

Conceptually:

``` text
Original
   |
   +--> Thumbnail
   +--> Card
   +--> Detail
   +--> Large/Zoom
```

This allows future regeneration when processing requirements change.

------------------------------------------------------------------------

# 21. Image Transformation

Images may be transformed to:

``` text
Resize
Crop where explicitly required
Compress
Convert format
Strip unnecessary metadata
Generate responsive variants
```

Transformations must not unintentionally damage product presentation.

------------------------------------------------------------------------

# 22. Image Quality

Quality should be optimized rather than maximized blindly.

The goal is:

``` text
Visually accurate
Fast-loading
Appropriately compressed
```

Fashion imagery must preserve important details such as:

``` text
Fabric texture
Embroidery
Print
Color
Garment shape
```

------------------------------------------------------------------------

# 23. Color Accuracy

Do not aggressively compress or transform images in a way that
materially changes product appearance.

Color representation is particularly important for apparel.

------------------------------------------------------------------------

# 24. Responsive Variants

Generate image sizes appropriate for their usage.

Conceptually:

``` text
Thumbnail
Small card
Medium card
Large card
Product detail
Zoom
```

The exact widths should be established from the actual UI breakpoints
and performance measurements.

------------------------------------------------------------------------

# 25. Mobile Delivery

Mobile users should not receive unnecessarily large images.

The frontend should request an appropriately sized asset based on:

``` text
Viewport
Rendered image dimensions
Device pixel ratio
Network conditions where supported
```

------------------------------------------------------------------------

# 26. Desktop Delivery

Desktop product detail pages may require larger assets.

However, the system should still avoid serving an original
multi-megapixel asset when a smaller delivery variant is sufficient.

------------------------------------------------------------------------

# 27. Product Card Images

Product card imagery should prioritize:

``` text
Consistent aspect ratio
Fast loading
Visual consistency
Stable dimensions
```

Product cards should avoid layout shifts caused by unpredictable image
sizes.

------------------------------------------------------------------------

# 28. Product Detail Images

Product detail imagery should prioritize:

``` text
High visual quality
Responsive sizing
Gallery navigation
Zoom/detail capability where required
Fast initial primary image
```

------------------------------------------------------------------------

# 29. Image Gallery UX

The product gallery should support the client's approved design.

Potential functionality:

``` text
Thumbnail navigation
Previous/next controls
Swipe on mobile
Primary image
Zoom
Full-screen viewing where appropriate
```

Do not load every high-resolution image immediately if the gallery
contains many assets.

------------------------------------------------------------------------

# 30. Gallery Loading Strategy

The first visible image should receive priority.

Secondary images can be loaded progressively.

Conceptually:

``` text
Primary image
    ↓
Render immediately

Secondary images
    ↓
Load as needed

Zoom/full-resolution asset
    ↓
Load on interaction
```

------------------------------------------------------------------------

# 31. Hero/Banner Media

Homepage hero images and campaign banners should use a separate media
workflow from product images.

They often have different requirements for:

``` text
Aspect ratio
Responsive crops
Art direction
Overlay content
Loading priority
```

------------------------------------------------------------------------

# 32. Responsive Hero Images

Desktop and mobile may require different image compositions.

Do not simply scale a desktop banner down if the composition becomes
unusable on mobile.

Where necessary, maintain separate:

``` text
Desktop asset
Mobile asset
```

------------------------------------------------------------------------

# 33. Art Direction

For important marketing banners, responsive art direction should be
supported when the design requires different crops/compositions.

The frontend should choose the appropriate asset rather than relying on
a poor automatic crop.

------------------------------------------------------------------------

# 34. Homepage Media Priority

The first visible homepage media should be treated as
performance-critical.

Coordinate:

``` text
Image dimensions
Format
Compression
Preloading/prioritization
Responsive delivery
```

with the SEO/performance architecture.

------------------------------------------------------------------------

# 35. Category and Collection Media

Categories and collections may have:

``` text
Cover image
Thumbnail
Banner image
```

The exact roles should be explicit rather than inferred.

------------------------------------------------------------------------

# 36. CMS Media

If a CMS is implemented, CMS media should reference managed media
records rather than embedding uncontrolled external URLs wherever
possible.

This enables:

``` text
Validation
Replacement
Usage tracking
Access control
Optimization
```

------------------------------------------------------------------------

# 37. Alt Text

Important public images should have appropriate alternative text.

For product images, alt text should describe the product meaningfully.

Avoid:

``` text
image1
IMG_4839
photo
```

Prefer descriptive text based on authoritative product information.

------------------------------------------------------------------------

# 38. Decorative Images

Purely decorative imagery should not create unnecessary accessibility
noise.

The frontend should use appropriate accessibility semantics for
decorative assets.

------------------------------------------------------------------------

# 39. Alt Text Ownership

Alt text should be managed as content, not generated blindly from
filenames.

For example:

``` text
Product:
Printed Cotton Anarkali Kurta Set

Alt text:
Printed cotton Anarkali kurta set
```

The final content style should follow the brand/content guidelines.

------------------------------------------------------------------------

# 40. Media SEO

Important public media should support:

``` text
Descriptive alt text
Stable public URLs
Appropriate file delivery
Product structured data
Open Graph images where relevant
```

Do not use filenames as a substitute for proper page SEO.

------------------------------------------------------------------------

# 41. CDN Delivery

Public media should be delivered through the approved CDN/storage
delivery architecture where available.

Benefits include:

``` text
Lower latency
Caching
Reduced origin load
Faster image delivery
```

------------------------------------------------------------------------

# 42. Cache Headers

Public immutable media can use long-lived caching where the URL changes
when the asset changes.

Conceptually:

``` text
/media/{immutable-id}/image.webp
```

This reduces the need for expensive cache invalidation.

------------------------------------------------------------------------

# 43. Media Versioning

When replacing an image, prefer a new immutable media asset rather than
mutating a cached file in place.

Conceptually:

``` text
old-media-id
      ↓
new-media-id
```

This reduces stale CDN behavior.

------------------------------------------------------------------------

# 44. Media Replacement

When an admin replaces a product image:

``` text
Upload new asset
   ↓
Validate
   ↓
Process
   ↓
Create new media record
   ↓
Assign/order it
   ↓
Retire old asset if no longer referenced
```

Do not delete the old asset before the replacement is successfully
processed.

------------------------------------------------------------------------

# 45. Media Deletion

Deletion should consider references.

Before deleting an asset, determine:

``` text
Is it used by a product?
Is it used by a collection?
Is it used by a banner?
Is it used by CMS content?
Is it used in historical data?
```

Unused storage objects may be cleaned up through a controlled process.

------------------------------------------------------------------------

# 46. Orphaned Media

The system should have a strategy for detecting orphaned assets.

Possible causes:

``` text
Upload succeeded but database creation failed
Database record deleted but storage object remained
Processing failed halfway
Admin abandoned upload
```

Cleanup should be safe and preferably asynchronous.

------------------------------------------------------------------------

# 47. Upload Transaction Boundaries

Storage operations and database operations are not necessarily one
atomic transaction.

The implementation should explicitly handle partial failures.

Conceptually:

``` text
Upload
 ↓
Process
 ↓
Persist media metadata
 ↓
Attach to product
```

If any step fails, the system must have a cleanup/retry strategy.

------------------------------------------------------------------------

# 48. Processing Failures

Image processing failures should:

``` text
Be recorded
Be observable
Not silently create broken media
Allow retry
```

A product should not expose a broken image URL because processing
failed.

------------------------------------------------------------------------

# 49. Media Processing Jobs

If processing becomes expensive, use background jobs.

Potential flow:

``` text
Admin uploads
      ↓
Upload accepted
      ↓
Job queued
      ↓
Image processed
      ↓
Variants generated
      ↓
Media marked ready
```

------------------------------------------------------------------------

# 50. Media Status

A media record may need a lifecycle status such as:

``` text
UPLOADING
PROCESSING
READY
FAILED
ARCHIVED
```

The exact enum belongs to the approved domain model.

------------------------------------------------------------------------

# 51. Admin Media Workflow

The admin interface should make media management predictable.

Potential workflow:

``` text
Select product
   ↓
Upload images
   ↓
Preview
   ↓
Reorder
   ↓
Set primary
   ↓
Add/edit alt text
   ↓
Save
```

------------------------------------------------------------------------

# 52. Drag-and-Drop

If drag-and-drop ordering is implemented, the resulting order must be
persisted server-side.

UI order alone is not sufficient.

------------------------------------------------------------------------

# 53. Bulk Media Upload

Bulk upload may be useful for a fashion catalog.

If implemented, support:

``` text
Validation
Progress
Per-file status
Retry
Failure reporting
Safe association
```

Do not make bulk operations all-or-nothing if the business workflow
benefits from per-file recovery.

------------------------------------------------------------------------

# 54. Bulk Import Naming

If bulk association depends on filenames or SKUs, the naming convention
must be explicitly documented.

For example:

``` text
SKU-front.jpg
SKU-back.jpg
SKU-detail.jpg
```

This should be treated as an import convention, not as the permanent
media identity.

------------------------------------------------------------------------

# 55. Media Permissions

Admin/staff permissions should determine who can:

``` text
Upload
View
Reorder
Replace
Archive
Delete
```

Sensitive/private media must have stricter access controls.

------------------------------------------------------------------------

# 56. Customer Uploads

If customer uploads are introduced later, they must use a separate
workflow.

Customer uploads should not share unrestricted product-media
permissions.

------------------------------------------------------------------------

# 57. Security Considerations

Media handling must protect against:

``` text
Malicious file uploads
Oversized uploads
Invalid file formats
Path traversal
Unauthorized access
Public exposure of private files
Resource exhaustion
```

------------------------------------------------------------------------

# 58. Image Content Validation

Where security requirements justify it, validate actual image content
rather than trusting extensions.

An attacker should not be able to disguise arbitrary content as an image
and bypass upload controls.

------------------------------------------------------------------------

# 59. Storage Access Policies

Storage permissions should follow the approved Supabase/storage security
architecture.

Conceptually:

``` text
Public read
    only for intended public media

Admin/staff write
    only for authorized operations

Private media
    authenticated + authorized access
```

------------------------------------------------------------------------

# 60. Direct Browser Uploads

Direct browser-to-storage uploads may be used if they improve
performance.

If used, the backend should issue appropriately restricted upload
permissions/tokens.

Do not expose unrestricted storage credentials to the browser.

------------------------------------------------------------------------

# 61. Signed Uploads

For secure direct uploads, use short-lived scoped upload permissions
where supported.

The upload should be restricted by:

``` text
Destination
File type
Size
Expiration
User/actor
```

------------------------------------------------------------------------

# 62. Media URL Security

Public media URLs can be public when the asset is intentionally public.

Private media URLs should use appropriate access controls or signed
URLs.

Never assume an obscure URL is a security mechanism.

------------------------------------------------------------------------

# 63. Storage Lifecycle

Define lifecycle behavior for:

``` text
Active media
Archived media
Failed uploads
Orphaned assets
Temporary processing assets
```

Temporary files should not accumulate indefinitely.

------------------------------------------------------------------------

# 64. Storage Cost Management

Monitor:

``` text
Total storage
Original assets
Generated variants
Unused assets
Bandwidth
```

Media can become one of the largest infrastructure costs for a fashion
store.

------------------------------------------------------------------------

# 65. Original vs Derived Storage

Where cost becomes significant, evaluate whether every generated variant
must be permanently stored.

Depending on the delivery platform:

``` text
Pre-generated variants
or
On-demand transformations
```

may be appropriate.

The decision should be based on traffic, cost, latency, and operational
simplicity.

------------------------------------------------------------------------

# 66. Media Observability

Monitor:

``` text
Upload failures
Processing failures
Image delivery failures
Storage errors
Transformation latency
Orphaned assets
Storage growth
```

Media failures should be visible in production monitoring.

------------------------------------------------------------------------

# 67. Media Testing

Tests should cover:

``` text
Valid upload
Invalid format
Oversized file
Unauthorized upload
Private media access
Image processing
Variant generation
Replacement
Deletion
Reordering
Alt text
Orphan cleanup
```

------------------------------------------------------------------------

# 68. Frontend Media Testing

Verify:

``` text
Correct image loads
Responsive sizing
Gallery navigation
Mobile swipe
Primary image priority
Broken image fallback
Layout stability
Alt text
```

------------------------------------------------------------------------

# 69. SEO/Performance Testing

Verify:

``` text
Image dimensions are stable
LCP image is optimized
Below-fold images are lazy-loaded where appropriate
Modern formats are delivered where supported
Alt text is present
Public image URLs are stable
```

------------------------------------------------------------------------

# 70. Media Definition of Done

A media feature is complete when:

-   Storage location is defined.
-   Access policy is defined.
-   Upload validation exists.
-   Image processing behavior is defined.
-   Responsive variants are supported where required.
-   Metadata/alt text is handled.
-   Replacement/deletion behavior is safe.
-   Errors are observable.
-   Tests cover important failure paths.
-   Performance impact is measured.

------------------------------------------------------------------------

# 71. AI Agent Media Rules

Antigravity must not:

-   Upload files without validating them.
-   Expose private media publicly.
-   Expose Supabase service-role credentials.
-   Trust filenames as media identity.
-   Delete an old asset before a replacement is safely processed.
-   Create unlimited image variants without justification.
-   Serve original high-resolution assets everywhere.
-   Remove alt text from meaningful images.
-   Store persistent uploads only on local application disk.
-   Ignore failed media-processing jobs.
-   Make storage buckets public to solve authorization problems.

------------------------------------------------------------------------

# 72. Media Change Workflow

Media architecture changes should follow:

``` text
Requirement
   ↓
Storage/access review
   ↓
Upload/processing design
   ↓
Implementation
   ↓
Security testing
   ↓
Performance testing
   ↓
Production verification
   ↓
Documentation update
```

------------------------------------------------------------------------

# 73. Media Architecture Summary

``` text
                     Admin / Authorized User
                              |
                           Upload
                              |
                         Validation
                              |
                           Storage
                              |
                     Processing / Transform
                              |
               ┌──────────────┼──────────────┐
               ↓              ↓              ↓
           Thumbnail        Card          Detail/Zoom
               └──────────────┼──────────────┘
                              ↓
                         CDN / Delivery
                              |
                         Next.js Store
                              |
                         Customer Browser
```

The media system should make it easy for the business to manage a
growing fashion catalog without sacrificing:

``` text
Visual quality
Security
Performance
SEO
Operational reliability
```

------------------------------------------------------------------------

# 74. Next Document

The next document should be:

``` text
18-admin-operations.md
```

It will define the operational/admin architecture, including:

-   Admin roles and permissions.
-   Catalog management.
-   Product/variant management.
-   Inventory operations.
-   Orders.
-   Customers.
-   Wholesale approvals.
-   Promotions.
-   CMS/content management.
-   Media operations.
-   Audit logs.
-   Bulk operations.
-   Admin dashboards.
-   Approval workflows.
-   Operational safeguards.
-   AI-agent rules for administrative functionality.
