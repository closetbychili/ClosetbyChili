"""
Closet by Chilli — Catalog Seed Data Definition.

Defines all seed data as pure Python data structures.
This module is imported by the management command and the test suite.

Data structure is authoritative and reflects:
- docs/06-domain-model.md (product taxonomy, variants, inventory)
- docs/23-search-catalog-architecture.md (catalog categories, collections)

Sprint 0.3: Added `images` key to each product entry.
Each entry maps to an existing public asset path under /assets/.
Paths are relative (no domain) so they are environment-agnostic.
The seed command uses (product, ordering) as the update_or_create key.

DEVELOPMENT USE ONLY. Never run against production.
"""

from decimal import Decimal

# ---------------------------------------------------------------------------
# Categories
# ---------------------------------------------------------------------------
# Format: (name, slug, description, parent_slug | None)
CATEGORIES = [
    ("Kurtis", "kurtis", "Elegant kurtis for every occasion.", None),
    ("Kurta Sets", "kurta-sets", "Coordinated kurta and bottom sets.", None),
    ("Dresses", "dresses", "Ethnic and fusion dresses.", None),
    (
        "Anarkali Sets",
        "anarkali-sets",
        "Floor-length anarkali suits and sets.",
        None,
    ),
    ("Bottom Wear", "bottom-wear", "Palazzo, churidar, and bottoms.", None),
    ("Dupattas", "dupattas", "Printed and embroidered dupattas.", None),
    # Sub-categories
    (
        "Printed Kurtis",
        "printed-kurtis",
        "Block print, digital print kurtis.",
        "kurtis",
    ),
    (
        "Embroidered Kurtis",
        "embroidered-kurtis",
        "Chikankari and thread-work kurtis.",
        "kurtis",
    ),
    (
        "2-Piece Sets",
        "2-piece-sets",
        "Two-piece co-ordinated ethnic sets.",
        "kurta-sets",
    ),
    (
        "3-Piece Sets",
        "3-piece-sets",
        "Three-piece kurta sets with dupatta.",
        "kurta-sets",
    ),
    (
        "Palazzo Sets",
        "palazzo-sets",
        "Wide-leg palazzo pants and tops.",
        "bottom-wear",
    ),
]

# ---------------------------------------------------------------------------
# Collections
# ---------------------------------------------------------------------------
# Format: (name, slug, description)
COLLECTIONS = [
    (
        "New Arrivals",
        "new-arrivals",
        "The latest additions to our catalog.",
    ),
    (
        "Bestsellers",
        "bestsellers",
        "Our most popular and loved styles.",
    ),
    (
        "Festive Collection",
        "festive-collection",
        "Curated festive looks for weddings and celebrations.",
    ),
    (
        "Summer Essentials",
        "summer-essentials",
        "Light, breathable fabrics for warm weather.",
    ),
    (
        "Co-ord Sets",
        "coord-sets",
        "Effortlessly matched top and bottom sets.",
    ),
]

# ---------------------------------------------------------------------------
# Products
# ---------------------------------------------------------------------------
# Format: {
#   name, slug, description, category_slug, status,
#   collections: [slug, ...],   (ordering = index+1)
#   variants: [{sku, size, color, retail_price, wholesale_price, is_active,
#               inventory_qty}]
#   images: [{image_url, alt_text, ordering, is_primary}]
#       - image_url: relative path served by Next.js (no domain prefix).
#       - ordering:  unique per product; used as update_or_create key.
#       - is_primary: True for exactly one image — shown on listing cards.
# }
PRODUCTS = [
    # ---- Kurtis ----
    {
        "name": "Sunflower Block Print Kurti",
        "slug": "sunflower-block-print-kurti",
        "description": (
            "Vibrant sunflower block-print kurti in soft cotton. "
            "Perfect for casual and festive occasions."
        ),
        "category_slug": "printed-kurtis",
        "status": "active",
        "collections": ["new-arrivals", "summer-essentials"],
        "variants": [
            {
                "sku": "SBP-KRT-YEL-S",
                "size": "S",
                "color": "Yellow",
                "retail_price": Decimal("1299.00"),
                "wholesale_price": Decimal("780.00"),
                "is_active": True,
                "inventory_qty": 25,
            },
            {
                "sku": "SBP-KRT-YEL-M",
                "size": "M",
                "color": "Yellow",
                "retail_price": Decimal("1299.00"),
                "wholesale_price": Decimal("780.00"),
                "is_active": True,
                "inventory_qty": 30,
            },
            {
                "sku": "SBP-KRT-YEL-L",
                "size": "L",
                "color": "Yellow",
                "retail_price": Decimal("1299.00"),
                "wholesale_price": Decimal("780.00"),
                "is_active": True,
                "inventory_qty": 20,
            },
            {
                "sku": "SBP-KRT-YEL-XL",
                "size": "XL",
                "color": "Yellow",
                "retail_price": Decimal("1349.00"),
                "wholesale_price": Decimal("810.00"),
                "is_active": True,
                "inventory_qty": 15,
            },
            {
                "sku": "SBP-KRT-GRN-M",
                "size": "M",
                "color": "Green",
                "retail_price": Decimal("1299.00"),
                "wholesale_price": Decimal("780.00"),
                "is_active": False,  # Out of season — inactive
                "inventory_qty": 0,
            },
        ],
        "images": [
            {
                "image_url": "/assets/products/kurti-1.jpg",
                "alt_text": "Sunflower Block Print Kurti — front view",
                "ordering": 1,
                "is_primary": True,
            },
            {
                "image_url": "/assets/products/kurti-2.jpg",
                "alt_text": "Sunflower Block Print Kurti — detail",
                "ordering": 2,
                "is_primary": False,
            },
            {
                "image_url": "/assets/products/kurti-3.jpg",
                "alt_text": "Sunflower Block Print Kurti — side view",
                "ordering": 3,
                "is_primary": False,
            },
        ],
    },
    {
        "name": "Chikankari Embroidered Kurti",
        "slug": "chikankari-embroidered-kurti",
        "description": (
            "Delicate Lucknowi chikankari embroidery on georgette fabric. "
            "Timeless ethnic wear for women."
        ),
        "category_slug": "embroidered-kurtis",
        "status": "active",
        "collections": ["bestsellers", "festive-collection"],
        "variants": [
            {
                "sku": "CHK-KRT-WHT-S",
                "size": "S",
                "color": "White",
                "retail_price": Decimal("2199.00"),
                "wholesale_price": Decimal("1320.00"),
                "is_active": True,
                "inventory_qty": 18,
            },
            {
                "sku": "CHK-KRT-WHT-M",
                "size": "M",
                "color": "White",
                "retail_price": Decimal("2199.00"),
                "wholesale_price": Decimal("1320.00"),
                "is_active": True,
                "inventory_qty": 22,
            },
            {
                "sku": "CHK-KRT-WHT-L",
                "size": "L",
                "color": "White",
                "retail_price": Decimal("2199.00"),
                "wholesale_price": Decimal("1320.00"),
                "is_active": True,
                "inventory_qty": 16,
            },
            {
                "sku": "CHK-KRT-PNK-M",
                "size": "M",
                "color": "Powder Pink",
                "retail_price": Decimal("2299.00"),
                "wholesale_price": Decimal("1380.00"),
                "is_active": True,
                "inventory_qty": 12,
            },
        ],
        "images": [
            {
                "image_url": "/assets/products/kurti-2.jpg",
                "alt_text": "Chikankari Embroidered Kurti — front view",
                "ordering": 1,
                "is_primary": True,
            },
            {
                "image_url": "/assets/products/kurti-3.jpg",
                "alt_text": "Chikankari Embroidered Kurti — detail",
                "ordering": 2,
                "is_primary": False,
            },
            {
                "image_url": "/assets/products/kurti-1.jpg",
                "alt_text": "Chikankari Embroidered Kurti — side view",
                "ordering": 3,
                "is_primary": False,
            },
        ],
    },
    # ---- Anarkali Sets ----
    {
        "name": "Royal Silk Anarkali Set",
        "slug": "royal-silk-anarkali-set",
        "description": (
            "Floor-length silk anarkali with churidar and embroidered dupatta. "
            "Ideal for weddings and festive occasions."
        ),
        "category_slug": "anarkali-sets",
        "status": "active",
        "collections": ["festive-collection", "bestsellers"],
        "variants": [
            {
                "sku": "RSA-ANK-GLD-S",
                "size": "S",
                "color": "Gold",
                "retail_price": Decimal("4999.00"),
                "wholesale_price": Decimal("3000.00"),
                "is_active": True,
                "inventory_qty": 10,
            },
            {
                "sku": "RSA-ANK-GLD-M",
                "size": "M",
                "color": "Gold",
                "retail_price": Decimal("4999.00"),
                "wholesale_price": Decimal("3000.00"),
                "is_active": True,
                "inventory_qty": 12,
            },
            {
                "sku": "RSA-ANK-GLD-L",
                "size": "L",
                "color": "Gold",
                "retail_price": Decimal("4999.00"),
                "wholesale_price": Decimal("3000.00"),
                "is_active": True,
                "inventory_qty": 8,
            },
            {
                "sku": "RSA-ANK-MAR-M",
                "size": "M",
                "color": "Maroon",
                "retail_price": Decimal("4999.00"),
                "wholesale_price": Decimal("3000.00"),
                "is_active": True,
                "inventory_qty": 14,
            },
            {
                "sku": "RSA-ANK-MAR-L",
                "size": "L",
                "color": "Maroon",
                "retail_price": Decimal("4999.00"),
                "wholesale_price": Decimal("3000.00"),
                "is_active": True,
                "inventory_qty": 9,
            },
        ],
        "images": [
            {
                "image_url": "/assets/products/kurti-3.jpg",
                "alt_text": "Royal Silk Anarkali Set — front view",
                "ordering": 1,
                "is_primary": True,
            },
            {
                "image_url": "/assets/products/kurti-1.jpg",
                "alt_text": "Royal Silk Anarkali Set — detail",
                "ordering": 2,
                "is_primary": False,
            },
            {
                "image_url": "/assets/products/kurti-2.jpg",
                "alt_text": "Royal Silk Anarkali Set — side view",
                "ordering": 3,
                "is_primary": False,
            },
        ],
    },
    # ---- Kurta Sets ----
    {
        "name": "Floral Cotton 2-Piece Kurta Set",
        "slug": "floral-cotton-2-piece-kurta-set",
        "description": (
            "Lightweight cotton kurta paired with matching palazzo. "
            "Ideal for summer casual wear."
        ),
        "category_slug": "2-piece-sets",
        "status": "active",
        "collections": ["new-arrivals", "summer-essentials", "coord-sets"],
        "variants": [
            {
                "sku": "FLR-2PC-TEL-XS",
                "size": "XS",
                "color": "Teal",
                "retail_price": Decimal("1799.00"),
                "wholesale_price": Decimal("1080.00"),
                "is_active": True,
                "inventory_qty": 8,
            },
            {
                "sku": "FLR-2PC-TEL-S",
                "size": "S",
                "color": "Teal",
                "retail_price": Decimal("1799.00"),
                "wholesale_price": Decimal("1080.00"),
                "is_active": True,
                "inventory_qty": 20,
            },
            {
                "sku": "FLR-2PC-TEL-M",
                "size": "M",
                "color": "Teal",
                "retail_price": Decimal("1799.00"),
                "wholesale_price": Decimal("1080.00"),
                "is_active": True,
                "inventory_qty": 25,
            },
            {
                "sku": "FLR-2PC-TEL-L",
                "size": "L",
                "color": "Teal",
                "retail_price": Decimal("1799.00"),
                "wholesale_price": Decimal("1080.00"),
                "is_active": True,
                "inventory_qty": 18,
            },
            {
                "sku": "FLR-2PC-RSE-M",
                "size": "M",
                "color": "Rose",
                "retail_price": Decimal("1799.00"),
                "wholesale_price": Decimal("1080.00"),
                "is_active": True,
                "inventory_qty": 22,
            },
        ],
        "images": [
            {
                "image_url": "/assets/products/kurti-1.jpg",
                "alt_text": "Floral Cotton 2-Piece Kurta Set — front view",
                "ordering": 1,
                "is_primary": True,
            },
            {
                "image_url": "/assets/products/kurti-2.jpg",
                "alt_text": "Floral Cotton 2-Piece Kurta Set — detail",
                "ordering": 2,
                "is_primary": False,
            },
        ],
    },
    {
        "name": "Ethnic Embroidered 3-Piece Suit",
        "slug": "ethnic-embroidered-3-piece-suit",
        "description": (
            "Fully embroidered kurta with churidar bottom and net dupatta. "
            "Elegant festive wear for women."
        ),
        "category_slug": "3-piece-sets",
        "status": "active",
        "collections": ["festive-collection"],
        "variants": [
            {
                "sku": "EMB-3PC-IVR-S",
                "size": "S",
                "color": "Ivory",
                "retail_price": Decimal("3499.00"),
                "wholesale_price": Decimal("2100.00"),
                "is_active": True,
                "inventory_qty": 6,
            },
            {
                "sku": "EMB-3PC-IVR-M",
                "size": "M",
                "color": "Ivory",
                "retail_price": Decimal("3499.00"),
                "wholesale_price": Decimal("2100.00"),
                "is_active": True,
                "inventory_qty": 9,
            },
            {
                "sku": "EMB-3PC-IVR-L",
                "size": "L",
                "color": "Ivory",
                "retail_price": Decimal("3499.00"),
                "wholesale_price": Decimal("2100.00"),
                "is_active": True,
                "inventory_qty": 5,
            },
        ],
        "images": [
            {
                "image_url": "/assets/products/kurti-2.jpg",
                "alt_text": "Ethnic Embroidered 3-Piece Suit — front view",
                "ordering": 1,
                "is_primary": True,
            },
            {
                "image_url": "/assets/products/kurti-3.jpg",
                "alt_text": "Ethnic Embroidered 3-Piece Suit — detail",
                "ordering": 2,
                "is_primary": False,
            },
        ],
    },
    # ---- Dresses ----
    {
        "name": "Maxi Ethnic Dress",
        "slug": "maxi-ethnic-dress",
        "description": (
            "Floor-length printed maxi dress with mirror-work border. "
            "Bold ethnic fusion for the modern woman."
        ),
        "category_slug": "dresses",
        "status": "active",
        "collections": ["new-arrivals"],
        "variants": [
            {
                "sku": "MXD-ETH-RED-S",
                "size": "S",
                "color": "Red",
                "retail_price": Decimal("2499.00"),
                "wholesale_price": Decimal("1500.00"),
                "is_active": True,
                "inventory_qty": 12,
            },
            {
                "sku": "MXD-ETH-RED-M",
                "size": "M",
                "color": "Red",
                "retail_price": Decimal("2499.00"),
                "wholesale_price": Decimal("1500.00"),
                "is_active": True,
                "inventory_qty": 15,
            },
            {
                "sku": "MXD-ETH-RED-L",
                "size": "L",
                "color": "Red",
                "retail_price": Decimal("2499.00"),
                "wholesale_price": Decimal("1500.00"),
                "is_active": True,
                "inventory_qty": 10,
            },
            {
                "sku": "MXD-ETH-NAV-M",
                "size": "M",
                "color": "Navy",
                "retail_price": Decimal("2499.00"),
                "wholesale_price": Decimal("1500.00"),
                "is_active": True,
                "inventory_qty": 18,
            },
        ],
        "images": [
            {
                "image_url": "/assets/products/kurti-3.jpg",
                "alt_text": "Maxi Ethnic Dress — front view",
                "ordering": 1,
                "is_primary": True,
            },
            {
                "image_url": "/assets/products/kurti-1.jpg",
                "alt_text": "Maxi Ethnic Dress — detail",
                "ordering": 2,
                "is_primary": False,
            },
        ],
    },
    # ---- Dupattas ----
    {
        "name": "Bandhani Print Dupatta",
        "slug": "bandhani-print-dupatta",
        "description": (
            "Traditional bandhani tie-dye pattern on pure georgette. "
            "Pairs beautifully with salwar suits and kurtis."
        ),
        "category_slug": "dupattas",
        "status": "active",
        "collections": ["bestsellers"],
        "variants": [
            {
                "sku": "BND-DPT-PNK-OS",
                "size": "One Size",
                "color": "Pink",
                "retail_price": Decimal("799.00"),
                "wholesale_price": Decimal("480.00"),
                "is_active": True,
                "inventory_qty": 35,
            },
            {
                "sku": "BND-DPT-YEL-OS",
                "size": "One Size",
                "color": "Yellow",
                "retail_price": Decimal("799.00"),
                "wholesale_price": Decimal("480.00"),
                "is_active": True,
                "inventory_qty": 28,
            },
            {
                "sku": "BND-DPT-ORG-OS",
                "size": "One Size",
                "color": "Orange",
                "retail_price": Decimal("799.00"),
                "wholesale_price": Decimal("480.00"),
                "is_active": True,
                "inventory_qty": 22,
            },
        ],
        "images": [
            {
                "image_url": "/assets/products/kurti-1.jpg",
                "alt_text": "Bandhani Print Dupatta — draped view",
                "ordering": 1,
                "is_primary": True,
            },
            {
                "image_url": "/assets/products/kurti-2.jpg",
                "alt_text": "Bandhani Print Dupatta — detail",
                "ordering": 2,
                "is_primary": False,
            },
        ],
    },
    # ---- Bottom Wear ----
    {
        "name": "Rayon Palazzo Pants",
        "slug": "rayon-palazzo-pants",
        "description": (
            "Flowy rayon palazzo pants in solid pastels. "
            "Comfortable and stylish for all-day wear."
        ),
        "category_slug": "palazzo-sets",
        "status": "active",
        "collections": ["summer-essentials", "coord-sets"],
        "variants": [
            {
                "sku": "RYN-PAL-SKY-S",
                "size": "S",
                "color": "Sky Blue",
                "retail_price": Decimal("899.00"),
                "wholesale_price": Decimal("540.00"),
                "is_active": True,
                "inventory_qty": 30,
            },
            {
                "sku": "RYN-PAL-SKY-M",
                "size": "M",
                "color": "Sky Blue",
                "retail_price": Decimal("899.00"),
                "wholesale_price": Decimal("540.00"),
                "is_active": True,
                "inventory_qty": 35,
            },
            {
                "sku": "RYN-PAL-SKY-L",
                "size": "L",
                "color": "Sky Blue",
                "retail_price": Decimal("899.00"),
                "wholesale_price": Decimal("540.00"),
                "is_active": True,
                "inventory_qty": 25,
            },
            {
                "sku": "RYN-PAL-PEA-M",
                "size": "M",
                "color": "Peach",
                "retail_price": Decimal("899.00"),
                "wholesale_price": Decimal("540.00"),
                "is_active": True,
                "inventory_qty": 28,
            },
        ],
        "images": [
            {
                "image_url": "/assets/products/kurti-2.jpg",
                "alt_text": "Rayon Palazzo Pants — front view",
                "ordering": 1,
                "is_primary": True,
            },
            {
                "image_url": "/assets/products/kurti-1.jpg",
                "alt_text": "Rayon Palazzo Pants — detail",
                "ordering": 2,
                "is_primary": False,
            },
        ],
    },
    # ---- Draft product (for visibility testing) ----
    {
        "name": "Upcoming Silk Saree",
        "slug": "upcoming-silk-saree",
        "description": "Coming soon — premium silk saree collection.",
        "category_slug": "dresses",
        "status": "draft",
        "collections": [],
        "variants": [
            {
                "sku": "UPS-SLK-RED-OS",
                "size": "One Size",
                "color": "Red",
                "retail_price": Decimal("5999.00"),
                "wholesale_price": Decimal("3600.00"),
                "is_active": False,
                "inventory_qty": 0,
            },
        ],
        # No images for draft product — intentionally absent.
        "images": [],
    },
]
