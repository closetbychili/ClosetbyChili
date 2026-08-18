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

// ── Hero Carousel Slides (5 slides) ───────────────────────────
export const HERO_SLIDES: HeroSlide[] = [
  {
    id: "hero-1",
    tag: "NEW ARRIVALS",
    heading: "Fresh silhouettes.\nTimeless confidence.",
    ctaText: "SHOP NEW",
    ctaHref: "#new-arrivals",
    image: "/assets/hero/hero-1.jpg",
  },
  {
    id: "hero-2",
    tag: "KURTIS",
    subtitle: "The Everyday Edit",
    heading: "Effortless kurtis, made to move with you.",
    ctaText: "SHOP KURTIS",
    ctaHref: "#shop-by-category",
    image: "/assets/hero/hero-2.jpg",
  },
  {
    id: "hero-3",
    tag: "KURTA SETS",
    subtitle: "Complete Looks",
    heading: "Thoughtfully coordinated for effortless style.",
    ctaText: "SHOP SETS",
    ctaHref: "#shop-by-set",
    image: "/assets/hero/hero-3.jpg",
  },
  {
    id: "hero-4",
    tag: "DRESSES & ANARKALI",
    subtitle: "Flow & Form",
    heading: "Statement pieces for those who love to twirl.",
    ctaText: "SHOP ANARKALI",
    ctaHref: "#shop-by-category",
    image: "/assets/hero/hero-4.jpg",
  },
  {
    id: "hero-5",
    tag: "FESTIVE",
    subtitle: "Celebrate in Style",
    heading: "Intricate details for your special occasions.",
    ctaText: "SHOP FESTIVE",
    ctaHref: "#festive",
    image: "/assets/hero/hero-5.jpg",
  },
];

// ── Section 1: New Arrivals (4 products) ──────────────────────
export const NEW_ARRIVALS: ProductItem[] = [
  {
    id: "na-1",
    name: "Crimson Silk Anarkali",
    detail: "Hand-embroidered",
    price: 4500,
    badge: "New",
    href: "#",
  },
  {
    id: "na-2",
    name: "Ivory Grace Kurta Set",
    detail: "Pure Cotton",
    price: 3200,
    badge: "New",
    href: "#",
  },
  {
    id: "na-3",
    name: "Midnight Indigo Anarkali",
    detail: "Block Print",
    price: 5100,
    badge: "New",
    href: "#",
  },
  {
    id: "na-4",
    name: "Emerald Jewel Set",
    detail: "Silk Blend",
    price: 4800,
    badge: "New",
    href: "#",
  },
];

// ── Section 2: Shop by Category (6 categories) ────────────────
export const CATEGORIES: CategoryItem[] = [
  {
    id: "cat-1",
    name: "Kurtis",
    subtitle: "Everyday cuts & relaxed silhouettes",
    href: "#",
  },
  {
    id: "cat-2",
    name: "Kurta Sets",
    subtitle: "Coordinated elegance for every day",
    href: "#",
  },
  {
    id: "cat-3",
    name: "Dresses",
    subtitle: "Modern draping with ethnic charm",
    href: "#",
  },
  {
    id: "cat-4",
    name: "Anarkali Sets",
    subtitle: "Statement royal flare & twirl",
    href: "#",
  },
  {
    id: "cat-5",
    name: "Bottom Wear",
    subtitle: "Tailored pants, palazzos & trousers",
    href: "#",
  },
  {
    id: "cat-6",
    name: "Dupattas",
    subtitle: "Handloom silks, organza & zari trims",
    href: "#",
  },
];

// ── Section 3: Shop by Set (3 sets) ───────────────────────────
export const SETS: SetItem[] = [
  {
    id: "set-1",
    name: "2-Piece Sets",
    subtitle: "Kurta & Trousers",
    href: "#",
  },
  {
    id: "set-2",
    name: "3-Piece Sets",
    subtitle: "Kurta, Bottom & Dupatta",
    href: "#",
  },
  {
    id: "set-3",
    name: "Co-ord Sets",
    subtitle: "Contemporary Indo-Western",
    href: "#",
  },
];

// ── Section 4: Bestsellers (4 products) ───────────────────────
export const BESTSELLERS: ProductItem[] = [
  {
    id: "bs-1",
    name: "Classic Ivory Kurta",
    detail: "Chanderi Silk Blend",
    price: 2800,
    badge: "Bestseller",
    href: "#",
  },
  {
    id: "bs-2",
    name: "Rose Print Anarkali",
    detail: "Mulmul Cotton Flared",
    price: 4200,
    badge: "Bestseller",
    href: "#",
  },
  {
    id: "bs-3",
    name: "Mustard Yellow Set",
    detail: "Zari Yoke & Cigarette Pants",
    price: 3500,
    badge: "Bestseller",
    href: "#",
  },
  {
    id: "bs-4",
    name: "Emerald Silk Dress",
    detail: "Pleated Maxi Silhouette",
    price: 5500,
    badge: "Bestseller",
    href: "#",
  },
];

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
