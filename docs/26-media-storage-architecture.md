# Closet by Chilli --- Media Storage Architecture

## 1. Purpose

This document defines the media and file-storage architecture for Closet
by Chilli.

The media system primarily supports:

``` text
Product images
Product galleries
Category images
Collection banners
Brand assets
Admin-uploaded media
Future CMS content
```

The architecture should provide:

``` text
Secure uploads
Reliable storage
Optimized delivery
CDN compatibility
Image transformations
Access control
Cleanup
Observability
```

------------------------------------------------------------------------

# 2. Storage Principle

The platform should separate:

``` text
Media metadata
```

from:

``` text
Binary file storage
```

Conceptually:

``` text
Django
   |
Media metadata
   |
Supabase Storage
   |
CDN/object delivery
```

Django remains responsible for application-level relationships and
permissions.

------------------------------------------------------------------------

# 3. Supabase Storage

The project may use Supabase Storage for object/file storage while
PostgreSQL/Django remain responsible for business-domain data.

Storage should not be treated as the source of truth for:

``` text
Product ownership
Catalog relationships
Media ordering
Publication status
Admin permissions
```

Those belong to the application/database domain.

------------------------------------------------------------------------

# 4. Storage Buckets

Use separate buckets based on access requirements rather than creating
one unrestricted bucket.

Potential structure:

``` text
product-media
category-media
collection-media
brand-media
private-media
```

The exact bucket list should be finalized based on actual Phase 1
requirements.

------------------------------------------------------------------------

# 5. Public vs Private Media

Media should be classified explicitly as:

``` text
PUBLIC
PRIVATE
```

Public media may be served through public/CDN URLs.

Private media should require controlled access, typically through signed
URLs or another authorized mechanism.

------------------------------------------------------------------------

# 6. Product Images

Product imagery is expected to be one of the primary media workloads.

A product may have:

``` text
Primary image
Gallery images
Variant-specific images where required
```

The product-media relationship should be stored in the application
database.

------------------------------------------------------------------------

# 7. Media Metadata

The database should store appropriate metadata such as:

``` text
Media ID
Storage bucket
Storage path/key
Original filename where needed
MIME type
File size
Width
Height
Alt text
Sort/order
Associated product/category/collection
Created timestamp
```

Do not store binary image data directly in PostgreSQL unless there is a
specific architectural reason.

------------------------------------------------------------------------

# 8. Media Identity

Every media record should have a stable internal identifier.

Do not use the original filename as the database identity.

------------------------------------------------------------------------

# 9. Storage Path

Storage paths should be deterministic and collision-resistant.

Conceptually:

``` text
products/{product-id}/{media-id}/original.webp
```

The exact naming convention should be standardized before
implementation.

------------------------------------------------------------------------

# 10. Filename Security

Never trust user-provided filenames as storage paths.

Normalize or generate storage object names server-side.

This prevents:

``` text
Path traversal
Unexpected overwrites
Illegal object names
Namespace collisions
```

------------------------------------------------------------------------

# 11. Upload Authorization

Only authorized users should be able to upload media.

Typical permissions:

``` text
Admin
Catalog manager
Content manager
```

Customers should not be able to upload product/catalog media unless a
future feature explicitly requires it.

------------------------------------------------------------------------

# 12. Upload Flow

A secure upload flow may be:

``` text
Admin
  ↓
Django authorization
  ↓
Validate upload metadata
  ↓
Generate controlled upload target
  ↓
Upload to Supabase Storage
  ↓
Verify upload
  ↓
Create/update media metadata
  ↓
Associate media with catalog entity
```

The exact direct-upload strategy may use signed upload URLs where
appropriate.

------------------------------------------------------------------------

# 13. Direct-to-Storage Uploads

For large images, the frontend may upload directly to Supabase Storage
using a short-lived authorized upload mechanism.

Conceptually:

``` text
Admin browser
    ↓
Django
    ↓
Authorized upload URL/token
    ↓
Supabase Storage
```

The browser must not receive permanent storage credentials.

------------------------------------------------------------------------

# 14. Storage Credentials

Never expose:

``` text
Supabase service-role key
Private storage credentials
Administrative storage secrets
```

to the browser.

Server-only credentials remain in secure deployment secrets.

------------------------------------------------------------------------

# 15. Upload Validation

Every upload should validate:

``` text
File type
MIME type
File size
Image dimensions where applicable
File extension
Storage destination
Uploader permission
```

Do not rely solely on the filename extension.

------------------------------------------------------------------------

# 16. MIME-Type Validation

The backend should not blindly trust a client-provided MIME type.

Where practical, validate the actual file signature/content.

------------------------------------------------------------------------

# 17. Image Formats

The platform may accept approved image formats such as:

``` text
JPEG
PNG
WebP
```

The final supported input list should be based on actual content
requirements.

------------------------------------------------------------------------

# 18. Image Optimization

Uploaded images should be optimized for storefront delivery.

Potential processing:

``` text
Resize
Compress
Convert
Generate responsive variants
Generate thumbnails
```

The original may be retained if required for future processing/admin
workflows.

------------------------------------------------------------------------

# 19. Responsive Image Variants

For product images, generate appropriate sizes rather than delivering
the largest original to every device.

For example:

``` text
thumbnail
card
product-detail
large
```

The exact dimensions should be defined by the frontend design system.

------------------------------------------------------------------------

# 20. Image Quality

Optimization should balance:

``` text
Visual quality
File size
Page performance
Mobile bandwidth
```

Do not apply aggressive compression that damages fashion/product
presentation.

------------------------------------------------------------------------

# 21. Product Image Aspect Ratio

The frontend design system should establish preferred product-image
ratios.

The backend/storage system should support the required dimensions
without assuming every image is identical.

------------------------------------------------------------------------

# 22. Image Cropping

Automatic cropping can destroy important garment/product details.

Where automated cropping is used, validate output visually.

Prefer predictable transformations for product imagery.

------------------------------------------------------------------------

# 23. Image Orientation

Uploaded images should normalize orientation where required.

EXIF orientation should not cause inconsistent storefront rendering.

------------------------------------------------------------------------

# 24. EXIF Metadata

Where appropriate, strip unnecessary EXIF metadata from public images.

This reduces:

``` text
Unnecessary metadata exposure
File size
Privacy risk
```

------------------------------------------------------------------------

# 25. Alt Text

Product/catalog media should support meaningful alternative text.

Alt text should describe the useful visual content rather than simply
repeating the filename.

------------------------------------------------------------------------

# 26. Alt Text Management

Alt text may be:

``` text
Entered by admin
Generated as an initial suggestion
Edited by admin
```

The final published value should be controlled by the catalog/content
workflow.

------------------------------------------------------------------------

# 27. Decorative Images

Not every image requires meaningful alt text.

Decorative UI/background images should follow the frontend accessibility
strategy.

------------------------------------------------------------------------

# 28. Product-Media Relationship

Conceptually:

``` text
Product
   |
   ├── Media 1
   ├── Media 2
   ├── Media 3
   └── Media 4
```

Ordering and role should be stored in the database.

------------------------------------------------------------------------

# 29. Primary Product Image

The product should have an explicit primary image relationship or
deterministic primary-image rule.

Do not rely on:

``` text
First file returned by storage
```

as the primary image.

------------------------------------------------------------------------

# 30. Media Ordering

Gallery ordering should be stored explicitly.

Example:

``` text
position = 1
position = 2
position = 3
```

The database should enforce appropriate uniqueness where needed.

------------------------------------------------------------------------

# 31. Variant-Specific Media

If a variant requires a distinct image:

``` text
Variant
   |
   └── Media
```

The architecture should support this without duplicating the entire
product.

------------------------------------------------------------------------

# 32. Category Media

Categories may have:

``` text
Thumbnail
Hero/banner image
SEO/social image
```

Only implement the fields actually needed by the storefront/admin.

------------------------------------------------------------------------

# 33. Collection Media

Collections may have:

``` text
Thumbnail
Banner
Hero image
```

The collection domain should own the relationship.

------------------------------------------------------------------------

# 34. Brand Assets

Brand assets may include:

``` text
Logo
Wordmark
Favicon
Social preview assets
```

These should be managed separately from product media where useful.

------------------------------------------------------------------------

# 35. CMS Media

If a CMS/content system is introduced, media should be reusable where
appropriate.

Avoid uploading the same physical asset repeatedly without reason.

------------------------------------------------------------------------

# 36. Media Reuse

A single media asset may potentially be associated with:

``` text
Collection
Category
CMS section
```

where the business model allows reuse.

The permissions and deletion behavior must account for multiple
references.

------------------------------------------------------------------------

# 37. Deletion Semantics

Deleting a media record should not automatically delete the storage
object if other references still depend on it.

Conversely, orphaned storage objects should eventually be cleaned up.

------------------------------------------------------------------------

# 38. Orphaned Media

An orphan occurs when:

``` text
Storage object exists
but
No valid application media record/reference exists
```

The platform should support detecting and cleaning these objects safely.

------------------------------------------------------------------------

# 39. Cleanup Jobs

A background cleanup job may identify:

``` text
Unreferenced media
Abandoned uploads
Failed processing artifacts
Expired temporary files
```

Deletion should use a safety period rather than immediately deleting
uncertain objects.

------------------------------------------------------------------------

# 40. Failed Uploads

If an upload succeeds but database metadata creation fails:

``` text
Storage object
+
No media record
```

This should become an identifiable cleanup/reconciliation case.

------------------------------------------------------------------------

# 41. Failed Processing

If image transformation fails:

``` text
Record processing failure
Keep source if appropriate
Retry safely
Alert when persistent
```

Do not publish broken image references.

------------------------------------------------------------------------

# 42. Media Processing

Image processing may be asynchronous for expensive operations.

Conceptually:

``` text
Upload
  ↓
Original stored
  ↓
Processing job
  ↓
Variants generated
  ↓
Media marked ready
```

------------------------------------------------------------------------

# 43. Media Processing State

Where needed, track:

``` text
UPLOADED
PROCESSING
READY
FAILED
```

The exact state model should match the implementation.

------------------------------------------------------------------------

# 44. Publishing Media

A product should not publish an image that has not completed required
processing.

The catalog publication workflow should validate media readiness where
appropriate.

------------------------------------------------------------------------

# 45. CDN Delivery

Public product images should be delivered through an appropriate
CDN/cache layer.

This reduces load on the application and storage origin.

------------------------------------------------------------------------

# 46. Cache Headers

Public immutable media can use long cache lifetimes when storage paths
are versioned/unique.

If an object can be overwritten at the same URL, cache invalidation
becomes more difficult.

Prefer immutable/versioned paths.

------------------------------------------------------------------------

# 47. Immutable Media Paths

A useful strategy is:

``` text
New image
   ↓
New object key
   ↓
Update database reference
```

rather than repeatedly replacing the same public object.

------------------------------------------------------------------------

# 48. Image URL Stability

The application should store logical media identity while allowing the
underlying delivery URL strategy to evolve.

Do not hard-code storage provider URLs throughout business logic.

------------------------------------------------------------------------

# 49. Signed URLs

Private media should use short-lived signed URLs where supported.

Signed URLs should:

``` text
Expire
Be scoped
Not expose permanent credentials
```

------------------------------------------------------------------------

# 50. Private Media

Potential private media:

``` text
Wholesale verification documents
Internal admin assets
Private operational documents
```

These must not be stored in publicly accessible buckets.

------------------------------------------------------------------------

# 51. Sensitive Documents

If the wholesale workflow later requires business documents, treat them
as a separate sensitive-media class.

Use:

``` text
Private bucket
Strict authorization
Short-lived access
Auditability
```

------------------------------------------------------------------------

# 52. Storage Policies

Supabase Storage access policies should follow the application's
authorization requirements.

Do not create:

``` text
Allow all uploads
Allow all reads
Allow all deletes
```

policies for convenience.

------------------------------------------------------------------------

# 53. Service-Role Usage

The Supabase service-role credential bypasses normal row/storage
security mechanisms and must remain server-side.

Use it only where the backend genuinely requires elevated storage
operations.

------------------------------------------------------------------------

# 54. Customer Uploads

If future features allow customer uploads, such as:

``` text
Review images
Return evidence
```

they should use separate storage paths/policies from admin catalog
media.

------------------------------------------------------------------------

# 55. Upload Size Limits

Set explicit limits for:

``` text
Individual file size
Total upload batch size
Number of files per operation
```

The exact values should be defined based on production requirements.

------------------------------------------------------------------------

# 56. Image Dimension Limits

Prevent pathological files with extremely large dimensions.

Validate:

``` text
Maximum width
Maximum height
Maximum pixel count
```

where appropriate.

------------------------------------------------------------------------

# 57. Decompression Bomb Protection

Image processing must protect against malicious images designed to
consume excessive memory/CPU during decompression or transformation.

Use safe processing libraries and resource limits.

------------------------------------------------------------------------

# 58. File Type Security

Do not assume a file is safe because its extension is:

``` text
.jpg
.png
.webp
```

Validate actual content and process only supported formats.

------------------------------------------------------------------------

# 59. SVG Handling

SVG files can contain active content.

If SVG uploads are allowed, they require additional sanitization and
security controls.

If they are not required for product imagery, prefer not to accept them.

------------------------------------------------------------------------

# 60. Image Processing Isolation

Expensive or potentially unsafe image processing should not block the
main Django request unnecessarily.

Use controlled worker processing where appropriate.

------------------------------------------------------------------------

# 61. Storage Availability

If storage becomes temporarily unavailable:

``` text
Existing cached public media
→
Should continue serving where possible

New uploads
→
May fail gracefully
```

Do not allow storage outages to corrupt product metadata.

------------------------------------------------------------------------

# 62. Media Metadata Consistency

The application database should never point to a media object that is
known to be missing.

Periodic reconciliation can detect inconsistencies.

------------------------------------------------------------------------

# 63. Storage Reconciliation

A reconciliation process may compare:

``` text
Database media records
        ↕
Storage objects
```

and identify:

``` text
Missing objects
Orphaned objects
Unexpected objects
```

------------------------------------------------------------------------

# 64. Media Backup

Storage backup/retention strategy should be defined separately from
database backups.

Product imagery may be business-critical and should not depend on a
single accidental deletion event.

------------------------------------------------------------------------

# 65. Media Retention

Retention should distinguish:

``` text
Active catalog media
Archived media
Temporary upload artifacts
Private documents
```

The business should define how long historical assets must be retained.

------------------------------------------------------------------------

# 66. Admin Media Library

If required, the admin should provide:

``` text
Upload
Search
Preview
Attach
Reorder
Replace
Archive
Delete
```

These operations require appropriate permissions.

------------------------------------------------------------------------

# 67. Media Search

Admin media search may use:

``` text
Filename
Media ID
Associated product
Category
Collection
Upload date
```

Do not expose private storage information to unauthorized staff.

------------------------------------------------------------------------

# 68. Media Replacement

Replacing an image should not accidentally break existing product
references.

Prefer:

``` text
New media object
   ↓
Update product association
```

rather than overwriting a shared asset unexpectedly.

------------------------------------------------------------------------

# 69. Media Archive

Archiving can be safer than immediate deletion when an asset may still
be referenced historically.

------------------------------------------------------------------------

# 70. Product Deletion and Media

If a product is archived/deleted:

``` text
Product record
   ↓
Media references
   ↓
Storage cleanup
```

must follow the product retention policy.

Do not automatically delete shared media.

------------------------------------------------------------------------

# 71. Social Preview Images

If Open Graph/social images are managed through the media system, they
should have explicit relationships/metadata.

------------------------------------------------------------------------

# 72. Media API

Conceptual admin endpoints:

``` text
POST   /api/v1/admin/media/
GET    /api/v1/admin/media/
GET    /api/v1/admin/media/{id}/
PATCH  /api/v1/admin/media/{id}/
DELETE /api/v1/admin/media/{id}/
```

The exact endpoint structure follows the API architecture.

------------------------------------------------------------------------

# 73. Media Upload API

If Django issues upload authorization:

``` text
POST /api/v1/admin/media/upload-intent/
```

The response may provide a short-lived upload mechanism.

The browser then uploads to storage.

------------------------------------------------------------------------

# 74. Media Association API

Associating media with products/categories/collections should be an
explicit authorized operation.

Do not infer relationships solely from filenames.

------------------------------------------------------------------------

# 75. Media API Security

Every media mutation should validate:

``` text
Authenticated user
Permission
Media ownership/context
Input
Storage destination
```

------------------------------------------------------------------------

# 76. Public Media API

Public storefront responses should expose only safe delivery
information.

Do not expose:

``` text
Storage credentials
Private bucket paths where inappropriate
Internal processing details
Administrative metadata
```

------------------------------------------------------------------------

# 77. Media Performance

Optimize for:

``` text
Fast first image
Responsive image sizes
Lazy loading for secondary images
CDN caching
Compressed assets
Minimal layout shift
```

The frontend architecture controls rendering behavior, while the media
system provides optimized assets.

------------------------------------------------------------------------

# 78. Image Loading Strategy

Product detail pages may load:

``` text
Primary image eagerly
Secondary gallery images lazily
```

The exact behavior belongs to the frontend performance architecture.

------------------------------------------------------------------------

# 79. Preloading

Only preload images that materially improve perceived performance.

Do not preload entire product galleries.

------------------------------------------------------------------------

# 80. Media Observability

Monitor:

``` text
Upload success/failure
Processing duration
Processing failures
Storage errors
CDN/image errors
Missing media references
Orphaned objects
```

------------------------------------------------------------------------

# 81. Media Alerts

Potential alerts:

``` text
Upload failure spike
Image-processing failure spike
Storage unavailable
Unexpected orphan growth
Missing product media
```

------------------------------------------------------------------------

# 82. Media Testing

Tests should cover:

``` text
Authorized upload
Unauthorized upload
File validation
MIME validation
Size limits
Image processing
Media association
Ordering
Primary image
Variant image
Deletion
Orphan cleanup
Private-media access
Signed URL expiration
```

------------------------------------------------------------------------

# 83. Security Testing

Verify:

``` text
No unauthorized uploads
No arbitrary storage paths
No service-role key exposure
No private-media leakage
No malicious file execution
No cross-product media manipulation
No unrestricted deletion
```

------------------------------------------------------------------------

# 84. Media Definition of Done

Media functionality is complete when:

-   Storage buckets are defined.
-   Public/private separation exists.
-   Upload authorization is enforced.
-   File validation exists.
-   Image optimization is implemented.
-   Media metadata is stored separately from binary files.
-   Product/category/collection relationships are explicit.
-   Primary/order semantics are defined.
-   CDN/cache behavior is safe.
-   Private media uses controlled access.
-   Orphan cleanup/reconciliation exists.
-   Storage credentials remain server-side.
-   Admin media operations are permission-controlled.
-   Backup/retention expectations are documented.
-   Media failures are observable.
-   Security tests pass.

------------------------------------------------------------------------

# 85. AI Agent Media Rules

Antigravity must not:

-   Expose Supabase service-role credentials.
-   Allow arbitrary users to upload to catalog buckets.
-   Trust filenames as storage paths.
-   Allow unrestricted storage policies.
-   Store binary product images in PostgreSQL without a specific reason.
-   Expose private media publicly.
-   Use permanent signed URLs for sensitive media.
-   Overwrite shared media objects without checking references.
-   Delete storage objects merely because one reference was removed.
-   Process untrusted files without validation/resource limits.
-   Accept unsupported active-content file types casually.
-   Publish products with required media still in a failed/processing
    state.
-   Hard-code storage-provider URLs throughout application business
    logic.

------------------------------------------------------------------------

# 86. Media Change Workflow

Changes should follow:

``` text
Media requirement
   ↓
Storage/access review
   ↓
Security review
   ↓
Processing/performance review
   ↓
Implementation
   ↓
Upload/security tests
   ↓
CDN/cache tests
   ↓
Reconciliation tests
   ↓
Staging verification
   ↓
Production monitoring
```

------------------------------------------------------------------------

# 87. Media Architecture Summary

``` text
                       Admin
                         |
                   Django API
                         |
               Authorization Layer
                         |
              Upload Intent / Metadata
                    /          \
                   /            \
                  ↓              ↓
             Supabase         PostgreSQL
              Storage        Media Metadata
                  |
          Image Processing
                  |
          Optimized Variants
                  |
                 CDN
                  |
              Storefront
```

The fundamental rule is:

``` text
Storage holds binary objects.
PostgreSQL/Django owns media relationships and business meaning.
Public assets are optimized and CDN-delivered.
Private assets are access-controlled.
Uploads are validated.
Cleanup and reconciliation are explicit.
```

------------------------------------------------------------------------

# 88. Next Document

The next document should be:

``` text
27-caching-performance-architecture.md
```

It will define:

-   Performance goals.
-   Caching layers.
-   Next.js caching.
-   Django/API caching.
-   PostgreSQL/query optimization.
-   CDN caching.
-   Supabase Storage/CDN interaction.
-   Personalized cache isolation.
-   Retail vs wholesale cache separation.
-   Cache invalidation.
-   ISR/revalidation strategy.
-   Rate limiting.
-   Background jobs.
-   Performance budgets.
-   Observability.
-   Load testing.
-   Scalability strategy.
