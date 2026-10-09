export interface HeroSlide {
  id: string;
  tag: string;
  subtitle?: string;
  heading: string;
  description?: string;
  ctaText: string;
  ctaHref: string;
  image: string;
}

export interface ProductItem {
  id: string;
  name: string;
  detail: string;
  price: number;
  originalPrice?: number;
  badge?: string;
  image?: string;
  href: string;
}

export interface CategoryItem {
  id: string;
  name: string;
  subtitle?: string;
  image?: string;
  href: string;
}

export interface SetItem {
  id: string;
  name: string;
  subtitle?: string;
  image?: string;
  href: string;
}

export interface CollectionItem {
  id: string;
  name: string;
  image?: string;
  href: string;
}

export interface ReviewItem {
  id: string;
  text: string;
  author: string;
  location?: string;
  rating: number;
}

export interface NavLink {
  label: string;
  href: string;
}

// ── Navigation ────────────────────────────────────────────────
export const NAV_LINKS: NavLink[] = [
  { label: "New Arrivals", href: "#new-arrivals" },
  { label: "Shop", href: "#shop-by-category" },
  { label: "Bestsellers", href: "#bestsellers" },
  { label: "Festive", href: "#festive" },
  { label: "About", href: "#about" },
];

export const SHOP_BY_TYPE: NavLink[] = [
  { label: "Kurtis", href: "#shop-by-category" },
  { label: "Kurta Sets", href: "#shop-by-category" },
  { label: "Dresses", href: "#shop-by-category" },
  { label: "Anarkali Sets", href: "#shop-by-category" },
  { label: "Dupattas", href: "#shop-by-category" },
  { label: "Bottom Wear", href: "#shop-by-category" },
];

export const SHOP_BY_SET_NAV: NavLink[] = [
  { label: "2-Piece Sets", href: "#shop-by-set" },
  { label: "3-Piece Sets", href: "#shop-by-set" },
  { label: "Co-ord Sets", href: "#shop-by-set" },
  { label: "Anarkali Sets", href: "#shop-by-category" },
];

// ── Hero Carousel Slides (4 slides) ───────────────────────────
export interface StitchHeroSlide {
  id: string;
  tag: string;
  subtitle: string;
  heading: string;
  description: string;
  primaryCtaText: string;
  primaryCtaHref: string;
  primaryCtaPath: string;
  secondaryCtaText: string;
  secondaryCtaHref: string;
  secondaryCtaPath: string;
  perks: { icon: string; text: string }[];
  image: string;
  accentColor?: string;
}

export const STITCH_HERO_SLIDES: StitchHeroSlide[] = [
  {
    id: "hero-slide-1",
    tag: "DRESSES",
    subtitle: "Wear Your Story",
    heading: "Draped in grace.\nMade to be seen.",
    description:
      "Contemporary festive and draped tailoring crafted for the modern muse. Flowing pure satin weaves, razor-sharp cuts, and hand-gilded embellishments.",
    primaryCtaText: "SHOP DRESSES",
    primaryCtaHref: "#",
    primaryCtaPath: "dresses",
    secondaryCtaText: "View Lookbook",
    secondaryCtaHref: "#",
    secondaryCtaPath: "collections",
    accentColor: "border-primary text-primary",
    perks: [
      { icon: "local_shipping", text: "Complimentary Shipping above ₹2,999" },
      { icon: "verified", text: "Pure Silk & Chanderi Weaves" },
    ],
    image: "/assets/hero/hero-1.webp",
  },
  {
    id: "hero-slide-2",
    tag: "ANARKALI",
    subtitle: "Flow & Form",
    heading: "Twirl into elegance.\nEvery curve, celebrated.",
    description:
      "Handcrafted pure silk weaves and royal flares with fluid movement. Intricate scalloped zari borders tailored for moments that linger forever.",
    primaryCtaText: "SHOP ANARKALI",
    primaryCtaHref: "#",
    primaryCtaPath: "festive-sets",
    secondaryCtaText: "Festive Edit",
    secondaryCtaHref: "#",
    secondaryCtaPath: "festive-sets",
    accentColor: "border-secondary text-secondary",
    perks: [
      { icon: "local_shipping", text: "Express Dispatch Across India" },
      { icon: "straighten", text: "Custom Length Alterations" },
    ],
    image: "/assets/hero/hero-2.webp",
  },
  {
    id: "hero-slide-3",
    tag: "KURTIS",
    subtitle: "The Everyday Edit",
    heading: "Effortless ease.\nAll-day beautiful.",
    description:
      "Modern pleats, breezy silhouettes, and fine handcrafted artisan details. Contemporary ethnic kurtas styled for both workwear grace and weekend brunches.",
    primaryCtaText: "SHOP KURTIS",
    primaryCtaHref: "#",
    primaryCtaPath: "kurtas-and-tunics",
    secondaryCtaText: "Explore Tunics",
    secondaryCtaHref: "#",
    secondaryCtaPath: "kurtas-and-tunics",
    accentColor: "border-primary text-primary",
    perks: [
      { icon: "verified", text: "Breathable Natural Fabrics" },
      { icon: "local_shipping", text: "Complimentary Shipping above ₹2,999" },
    ],
    image: "/assets/hero/hero-3.webp",
  },
  {
    id: "hero-slide-4",
    tag: "CO-ORD SETS",
    subtitle: "Perfectly Paired",
    heading: "Thoughtfully matched.\nEffortlessly styled.",
    description:
      "Structured cuts meet fluid luxury for power dressing and festive occasions. Tailored blazers and coordinated flared trousers in rich royal tones.",
    primaryCtaText: "SHOP CO-ORDS",
    primaryCtaHref: "#",
    primaryCtaPath: "co-ord-sets",
    secondaryCtaText: "Power Dressing",
    secondaryCtaHref: "#",
    secondaryCtaPath: "co-ord-sets",
    accentColor: "border-primary text-primary",
    perks: [
      { icon: "workspace_premium", text: "Custom Crest Gold Buttons" },
      { icon: "straighten", text: "Flawless Tailored Fit" },
    ],
    image: "/assets/hero/hero-4.webp",
  },
];

export const HERO_SLIDES: HeroSlide[] = STITCH_HERO_SLIDES.map((s) => ({
  id: s.id,
  tag: s.tag,
  subtitle: s.subtitle,
  heading: s.heading,
  description: s.description,
  ctaText: s.primaryCtaText,
  ctaHref: s.primaryCtaHref,
  image: s.image,
}));

// ── Section 2: Shop by Category (5 Arched Cards) ──────────────
export interface StitchCategoryItem {
  id: string;
  name: string;
  subtitle: string;
  stylesCount: string;
  image: string;
  href: string;
  dataPath: string;
  badge?: string;
  alt: string;
}

export const STITCH_CATEGORIES: StitchCategoryItem[] = [
  {
    id: "cat-coord",
    name: "Co-ord Sets",
    subtitle: "Structured & Fluid Power Sets",
    stylesCount: "28 Styles",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAzx8ElMGHI0NrkXWNgHTbdaJ6bV3CcgVhVT8L13AJubN8bFocAr-ywaX3JB7PSuQMWgXb0H64Wq9B5LGPYuFyYfpfgQKeXHWeSDTg5dj99SQOnymK1B0B3TpfIg-Re420gCtr0Q6ljx7FQJwOyvZGB7Al6bBxH0pUZIBHpCB8S2fUoUgR4Q7XEe8cSQJHL4WkGrLobNysEygbr1GwT8_Oy99PofbpM9tki4_tp1UED0woveb0zCuEMJw",
    href: "#",
    dataPath: "co-ord-sets",
    alt: "Modern Indian tailored co-ord set in deep scarlet red silk with flared trousers and peak lapel jacket styled with minimalist gold jewels",
  },
  {
    id: "cat-kurtas",
    name: "Kurtas & Tunics",
    subtitle: "Modern Pleats & Drapes",
    stylesCount: "34 Styles",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBPiNNT6opb1WvIUMmYs3Bm7A1DnRBs5_-xk23Zl2DwmBq9cuKhynPuHuBM9s54UoUJxJiDmK0deKfMH7ZgFb7KIHdVJAHMjwHkaKWdWyvipXXSKT9nnIZQtdVL0NKdIGczUDoCaeQp72nlPIe-iVqG7vOKOLvwl_QvcGV3lb7VdQpFbMtgSmUC3rwuu_sH8nBCZQqxpr_yB1l8TsJyuBNoo-jXfxtSLY-gmaxegRATrrziRH2Weyxxyw",
    href: "#",
    dataPath: "kurtas-and-tunics",
    alt: "Editorial look of an asymmetrical draped kurta in deep crimson chanderi with hand-polished gold button row",
  },
  {
    id: "cat-festive",
    name: "Festive Sets",
    subtitle: "Chanderi & Organza Suiting",
    stylesCount: "42 Styles",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuC1HZS5o8D9v-UN6yQyFN9fmZZLtpWObcpxs-PSzdRiyNy0UgOOosig-KMz6rKpagt06gaC74WCyHGT1b7DmFonER9Kkh5zXyhbAeS-EyLN_NQwi-Q38hJQb2gJZ9ZfdNXDcAQWsz3YVag6YE5ds-W97kSbFnJZqPyfbR_aYjCMQLAVO_m-z6xd-qWaxMi0tmEUZ8TGW5P3C91Eq4Bl4AHJVO7Me-jri3_25QySngSlfNC1Trv1be3P9Q",
    href: "#",
    dataPath: "festive-sets",
    badge: "Trending",
    alt: "Opulent Indian festive kurta set in rich chili red and antique gold foil zari accents",
  },
  {
    id: "cat-dresses",
    name: "Dresses & Gowns",
    subtitle: "Evening Statements",
    stylesCount: "19 Styles",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCp9WmjTSPYmCN_VGJszhxxEoExWiB010R7W7OhRhLpk09DczafkA3KN1j0P3nFSsyCjZirRykCZRSwo-vrAy6SM9O_ljwNnsLA63r7rq8NIx_7c1HXXICee2e4gz7XFYSHnJy_gxJ1MV2L0TXdrkiMaX0XlfW6pWsOL8SUolUMvNsLmqxwefi0CgJNaKtorjz2FTnpSH0IsrAUCmedM88-tzRfBwILOqWmhZabtte8BjGa9IsuAd9cFA",
    href: "#",
    dataPath: "dresses",
    alt: "Sweeping floor-length scarlet red satin gown with backless silhouette, high thigh split, and delicate gold waist belt",
  },
  {
    id: "cat-silk",
    name: "The Silk Edit",
    subtitle: "Pure Mulberry & Drapes",
    stylesCount: "22 Styles",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBxV5bDZsrp2rrnmxcc9k1y8FgO8kIyYj3XzRtyabEOdNmcxcyOjpAAuVyXPbEHZdHt8gH57Xciym29vh7mmksYePEjd5bd1Af5GiBT-YfxKvvnR95ePYgQgecMdQY4SyeDE7FMrqYJPF7AlC0F-JZaDx94cKKTXpIQ7UezYd4_4PrKaPSaozICVwmpHctJ-O6oGVMdIZVUfJAWj8z_FHy7XHmzs9Q25WBZfMREmRens4HzvPXyO5sSQw",
    href: "#",
    dataPath: "collections",
    alt: "Sumptuous close up drape of pure mulberry silk and crimson red liquid satin fabric with rich luster",
  },
];

export const CATEGORIES: CategoryItem[] = STITCH_CATEGORIES.map((c) => ({
  id: c.id,
  name: c.name,
  subtitle: c.subtitle,
  image: c.image,
  href: c.href,
}));

export const SETS: SetItem[] = [
  {
    id: "set-1",
    name: "2-Piece Sets",
    subtitle: "Kurta & Trousers",
    image: "/assets/products/kurti-1.jpg",
    href: "/products?category=co-ord-sets",
  },
  {
    id: "set-2",
    name: "3-Piece Sets",
    subtitle: "Kurta, Bottom & Dupatta",
    image: "/assets/products/kurti-2.jpg",
    href: "/products?category=kurta-sets",
  },
  {
    id: "set-3",
    name: "Co-ord Sets",
    subtitle: "Contemporary Indo-Western",
    image: "/assets/products/kurti-3.jpg",
    href: "/products?category=co-ord-sets",
  },
];

// ── Section 3: New Arrivals (4 Products) ──────────────────────
export interface StitchProductItem {
  id: string;
  name: string;
  category: string;
  price: number;
  originalPrice: number;
  discount: string;
  badge: string;
  badgeType: "primary" | "secondary" | "inverse" | "terracotta";
  image: string;
  alt: string;
  sizes: string[];
  selectedSize?: string;
  swatches: { name: string; color: string; border?: boolean }[];
  extraColors?: number;
  href: string;
  dataPath?: string;
}

export const STITCH_NEW_ARRIVALS: StitchProductItem[] = [
  {
    id: "stitch-na-1",
    name: "The Scarlet Empress Silk Blazer Set",
    category: "Tailored Co-ords",
    price: 6499,
    originalPrice: 8999,
    discount: "(28% OFF)",
    badge: "Bestseller",
    badgeType: "primary",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuC6Vldsgnpv9ipjPEF41mHpgZThTSbqB3fk6r9kKRS5B5l73Q8_UbZMAZiwRVUARUxOgFAXqS63gHTNdQulsOfk-g8DUDGYzLHZU0j8p5dyJvZ5FaO4edgQtgFdM47pddIAUOTlQXFBvFKNuyxKQK5QLPD9n4oSXYAeqmnGKkif-WPOowHO3g5my7VAdhZ1XWNNzjBcFK5GRvDEcQy7hsfQ4lYwZGtnxOvVtOEZXdtMdcEWlx0duX9tuQ",
    alt: "Editorial look of model wearing The Scarlet Empress silk blazer suit in vibrant chili red",
    sizes: ["XS", "S", "M", "L", "XL"],
    selectedSize: "M",
    swatches: [
      { name: "Crimson Red", color: "#b31317" },
      { name: "Onyx Black", color: "#313030" },
      { name: "Pure Ivory", color: "#fdfbf7", border: true },
    ],
    extraColors: 2,
    href: "#",
    dataPath: "co-ord-sets",
  },
  {
    id: "stitch-na-2",
    name: "Aura Pleated Asymmetric Kurta",
    category: "Kurtas & Tunics",
    price: 4299,
    originalPrice: 5499,
    discount: "(21% OFF)",
    badge: "New",
    badgeType: "secondary",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBlHOD9mEVTE6sk-9zL6MIV-PM_GSkQ5FcECMj90EPrWhdHC1pHTFt6ZRL_NGEEbjm7kck_rCv5Xh3r-x3HL2lMQvfNgldwNC5F-sFTOow78Xqhzx9tnwz_ZorU73_8Sf6aM7YQhRs2Il_xIrKeTUuXyE7SS0CLUwiGch0JRPtBlg2hj1mOeP93gNkj1nBZmOJEASb4DpHMBGtfCVQvoprR5YS-hPcTLylOhNYSUJ4yfCIsAzak7ekdtQ",
    alt: "Editorial model wearing Aura Pleated Asymmetric Kurta in deep crimson georgette and chanderi blend",
    sizes: ["XS", "S", "M", "L", "XL"],
    swatches: [
      { name: "Deep Red", color: "#b31317" },
      { name: "Champagne Gold", color: "#735c00" },
    ],
    href: "#",
    dataPath: "kurtas-and-tunics",
  },
  {
    id: "stitch-na-3",
    name: "Noor Draped Satin Evening Gown",
    category: "Evening Wear",
    price: 7899,
    originalPrice: 9999,
    discount: "(21% OFF)",
    badge: "Limited Drop",
    badgeType: "inverse",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBvY6iULpk55zFLir0Qyvvz_LbkNU3WLDnOx-jr_0eYKVskk9sj5Us-rABFbaakqX9cwbpy5-KM5yLA1MkCOa21PZllHaxzoDwq3W8CvWJjftob6cm3JO4W_YZ6RI_g5vYIZywDhobuI2YSXUMX0ecA4XGnzwxOqR3hlCXH6bJ7YyaAHnaWqGoqldakMOKRcTRmBDgBonCTBsKjejVn3CnSokihMKAbjbbwn2oHZdVu-KpXM3RPRGt6RQ",
    alt: "Stunning model in Noor Draped Satin Evening Gown featuring deep red floor sweeping drape",
    sizes: ["XS", "S", "M", "L", "XL"],
    swatches: [
      { name: "Fiery Red", color: "#b31317" },
      { name: "Midnight Black", color: "#313030" },
    ],
    href: "#",
    dataPath: "dresses",
  },
  {
    id: "stitch-na-4",
    name: "Zoya Handcrafted Chanderi Co-ord",
    category: "Festive Co-ords",
    price: 5199,
    originalPrice: 6899,
    discount: "(24% OFF)",
    badge: "Handcrafted",
    badgeType: "terracotta",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCk8cHyw3oCxH2dx62WSWUW43UWRu7AZZdSLlrmrxcIII9dHdikzsS0yfm0UjH2qBvv-d-qNUuPukNnmQAyxOiMhc7_iCYCw9UhU5uCSwG08KZvW0Bpew4Q4puwLYNMKEFeL7cHfpCU6dcD_XgrkI_EgcVDluUu-jtEbwinQWPM6SHIcT5WtXKzaRwaqm44BOpHi8iL2I1JQihM6zFtdRuGVxyLw1ubv0SvBUrD0cXMksjVyCX92QnnJw",
    alt: "Fashion model wearing Zoya Handcrafted Chanderi co-ord set in terracotta and warm ivory hues",
    sizes: ["XS", "S", "M", "L", "XL"],
    swatches: [
      { name: "Terracotta", color: "#A6533D" },
      { name: "Warm Ivory", color: "#f6f2ec", border: true },
    ],
    href: "#",
    dataPath: "festive-sets",
  },
];

export const NEW_ARRIVALS: ProductItem[] = STITCH_NEW_ARRIVALS.map((p) => ({
  id: p.id,
  name: p.name,
  detail: p.category,
  price: p.price,
  originalPrice: p.originalPrice,
  badge: p.badge,
  image: p.image,
  href: p.href,
}));

// ── Section 5: Most Loved / Best Sellers (3 Spotlight Cards) ──
export interface StitchSpotlightItem {
  id: string;
  name: string;
  rankBadge: string;
  rating: string;
  reviewsCount: string;
  description: string;
  price: number;
  image: string;
  alt: string;
  href: string;
  dataPath: string;
}

export const STITCH_BESTSELLERS: StitchSpotlightItem[] = [
  {
    id: "bs-1",
    name: "The Regal Tuxedo Draped Dress",
    rankBadge: "Rank #1 Best Seller",
    rating: "4.9 / 5.0",
    reviewsCount: "(184 Reviews)",
    description:
      "Structured blazer front flowing into asymmetric knife pleats. Tailored with Italian crepe and pure silk lapel.",
    price: 8499,
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBgSDJ3ZHGNQC497HFcEjVGyGSIgTQShpgUbS1Lq23Vta3dqEq_7HMY_XHXTPMo1fwfkiekTfIcaKB3s2Qi3eBQ1Vaz0UFCGe-waF8nsp08tYImEH1Z5vXkffMOPXUBhYLmv4xi-LMSLku-KvX-0pBM-pM337-fmr5cZj5WCfukaw0o8FBbNGYbdzRegxwXIrBiBxolvyluQkv79s-L2_sCbz2xDKA2spdeORxSjov8pTlaVypXba4RfA",
    alt: "Editorial look of an Indian muse styling the Scarlet Draped Tuxedo Dress with gold buttons",
    href: "#",
    dataPath: "dresses",
  },
  {
    id: "bs-2",
    name: "Onyx Midnight Backless Silhouette",
    rankBadge: "Celebrity Pick",
    rating: "5.0 / 5.0",
    reviewsCount: "(92 Reviews)",
    description:
      "Plunging sculptured back framed by gold rope cord. Perfect for black-tie sangeets and red-carpet gatherings.",
    price: 9299,
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCoS9fZZiGMiEQALCxtriJ9MV7ZwCnAM-JZpO9Um-_-ey0yawjfERRLY-gjEYriKdCkMpdDpxpvIYiUGKi5E-hlZwAT-shWr5dTpzLV0NH4yTsYcBBewFdzwKDBftH3maS79P1TyKeJsdP5fcGbSCEaKtThAnVMVeyGca06PEcrvK_jEsH3-Z3sAW0_Qbyed6kXzxdaAFGMUzlQuRirqI6yivsHP9HCbKmWRrxt8VnI6qcAfvhilzLZDQ",
    alt: "Woman in high end midnight black backless velvet and satin gown with subtle gold strap detailing",
    href: "#",
    dataPath: "dresses",
  },
  {
    id: "bs-3",
    name: "Ruhani Draped Sharara Set",
    rankBadge: "Festive Essential",
    rating: "4.8 / 5.0",
    reviewsCount: "(215 Reviews)",
    description:
      "Fluid accordion-pleated sharara trousers paired with a tailored sleeveless asymmetrical peplum kurti.",
    price: 7199,
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCVsCs85vPU-f6hxAHxK1iSXIeBBLWZDS1YH4N9a5EggJufvVcHGbRe85dzrBoOk0EI_GQ7KPOn6eLUPfjfBXWempUGzpSiM7YrSwhfCk3teoNb11ePVWKsj9d4ictjF46nWQOWvw3pglUyzXYaUVAfbjmCgSdYrmbTndTSCSuhPhbO0UZUCBlw5z-zwdFL5tPYiq9VdOi0Kn94uJQBGM_jk__VNaQA2IJq19M3vScwC_lp2dFQ3AQUAg",
    alt: "Editorial model wearing deep red pure silk pleated sharara and embellished kurta set with zari embroidery on neckline",
    href: "#",
    dataPath: "festive-sets",
  },
];

export const BESTSELLERS: ProductItem[] = STITCH_BESTSELLERS.map((b) => ({
  id: b.id,
  name: b.name,
  detail: b.description,
  price: b.price,
  badge: b.rankBadge,
  image: b.image,
  href: b.href,
}));


// ── Section 8: Explore Collections (5 collections) ────────────
export const COLLECTIONS: CollectionItem[] = [
  {
    id: "col-1",
    name: "Everyday Elegance",
    href: "#",
  },
  {
    id: "col-2",
    name: "Festive Edit",
    href: "#",
  },
  {
    id: "col-3",
    name: "Statement Kurtis",
    href: "#",
  },
  {
    id: "col-4",
    name: "Modern Anarkalis",
    href: "#",
  },
  {
    id: "col-5",
    name: "Timeless Neutrals",
    href: "#",
  },
];

// ── Section 9: Customer Reviews (3 reviews) ───────────────────
export const REVIEWS: ReviewItem[] = [
  {
    id: "rev-1",
    text: "The quality is exceptional. The Crimson Anarkali fits perfectly and the fabric feels incredibly luxurious.",
    author: "Priya S.",
    location: "Mumbai",
    rating: 5,
  },
  {
    id: "rev-2",
    text: "I always find exactly what I need for festive occasions. The designs are modern but deeply rooted in tradition.",
    author: "Ananya M.",
    location: "Delhi",
    rating: 5,
  },
  {
    id: "rev-3",
    text: "Beautiful everyday kurtis. They wash well, feel great, and I always get compliments when I wear them.",
    author: "Riya K.",
    location: "Bengaluru",
    rating: 5,
  },
];

// ── Footer Column Data ────────────────────────────────────────
export const FOOTER_SHOP = [
  { label: "New Arrivals", href: "#new-arrivals" },
  { label: "Bestsellers", href: "#bestsellers" },
  { label: "Kurtis", href: "#shop-by-category" },
  { label: "Dresses", href: "#shop-by-category" },
  { label: "Festive", href: "#festive" },
];

export const FOOTER_SHOP_BY_SET = [
  { label: "2-Piece Sets", href: "#shop-by-set" },
  { label: "3-Piece Sets", href: "#shop-by-set" },
  { label: "Co-ord Sets", href: "#shop-by-set" },
  { label: "Anarkali Sets", href: "#shop-by-category" },
];

export const FOOTER_CUSTOMER_CARE = [
  { label: "Contact Us", href: "#" },
  { label: "Shipping & Returns", href: "#" },
  { label: "Track Order", href: "#" },
  { label: "Size Guide", href: "#" },
  { label: "FAQ", href: "#" },
];

export const FOOTER_ABOUT = [
  { label: "Our Story", href: "#about" },
  { label: "Store Locator", href: "#" },
  { label: "Careers", href: "#" },
];

export const FOOTER_LEGAL = [
  { label: "Privacy Policy", href: "#" },
  { label: "Terms of Service", href: "#" },
];
