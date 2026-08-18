/**
 * =============================================================
 * DEMO DATA — Closet by Chili Homepage
 * =============================================================
 *
 * All product names, prices, and images are PLACEHOLDERS.
 * In Sprint 2, these arrays will be replaced with API calls
 * to the Django/Supabase catalog backend.
 *
 * The visual components consuming this data should NOT
 * need to be rewritten when real data is connected.
 * =============================================================
 */

// ── Types ─────────────────────────────────────────────────────

export interface DemoProduct {
  id: string;
  name: string;
  category: string;
  price: number;
  originalPrice?: number;
  badge?: string;
  image: string; // local asset path
  href: string;
}

export interface DemoCategory {
  id: string;
  name: string;
  slug: string;
  image: string; // local asset path
  href: string;
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
  { label: "Kurtis", href: "/collections/kurtis" },
  { label: "Kurta Sets", href: "/collections/kurta-sets" },
  { label: "Dresses", href: "/collections/dresses" },
  { label: "Anarkali Sets", href: "/collections/anarkali-sets" },
  { label: "Dupattas", href: "/collections/dupattas" },
  { label: "Bottom Wear (Pants / Palazzo)", href: "/collections/bottom-wear" },
];

export const SHOP_BY_SET: NavLink[] = [
  { label: "2-Piece Sets", href: "/collections/2-piece-sets" },
  { label: "3-Piece Sets", href: "/collections/3-piece-sets" },
  { label: "Co-ord Sets", href: "/collections/co-ord-sets" },
];

// ── Homepage Categories (4 editorial cards) ───────────────────

export const HOMEPAGE_CATEGORIES: DemoCategory[] = [
  {
    id: "hc-1",
    name: "Kurtis",
    slug: "kurtis",
    image: "/assets/categories/kurtis.jpg",
    href: "/collections/kurtis",
  },
  {
    id: "hc-2",
    name: "2-Piece Sets",
    slug: "two-piece-sets",
    image: "/assets/categories/two-piece-sets.jpg",
    href: "/collections/2-piece-sets",
  },
  {
    id: "hc-3",
    name: "3-Piece Sets",
    slug: "three-piece-sets",
    image: "/assets/categories/three-piece-sets.jpg",
    href: "/collections/3-piece-sets",
  },
  {
    id: "hc-4",
    name: "Ethnic Dresses",
    slug: "ethnic-dresses",
    image: "/assets/categories/ethnic-dresses.jpg",
    href: "/collections/dresses",
  },
];

// ── New Arrivals (6 DEMO products) ────────────────────────────

export const NEW_ARRIVALS: DemoProduct[] = [
  {
    id: "na-1",
    name: "Ruby Bloom Kurta Set",
    category: "Kurta Sets",
    price: 2899,
    originalPrice: 3499,
    badge: "NEW",
    image: "/assets/products/new-arrivals/ruby-bloom-kurta-set.jpg",
    href: "#",
  },
  {
    id: "na-2",
    name: "Noir Anarkali Set",
    category: "Anarkali Sets",
    price: 3499,
    badge: "NEW",
    image: "/assets/products/new-arrivals/noir-anarkali-set.jpg",
    href: "#",
  },
  {
    id: "na-3",
    name: "Gilded Ivory Co-ord",
    category: "Co-ord Sets",
    price: 2599,
    originalPrice: 2999,
    badge: "NEW",
    image: "/assets/products/new-arrivals/gilded-ivory-co-ord.jpg",
    href: "#",
  },
  {
    id: "na-4",
    name: "Crimson Drape Kurti",
    category: "Kurtis",
    price: 1499,
    badge: "NEW",
    image: "/assets/products/new-arrivals/crimson-drape-kurti.jpg",
    href: "#",
  },
  {
    id: "na-5",
    name: "Midnight 3-Piece Set",
    category: "3-Piece Sets",
    price: 3299,
    originalPrice: 3899,
    image: "/assets/products/new-arrivals/midnight-3-piece-set.jpg",
    href: "#",
  },
  {
    id: "na-6",
    name: "Amber Weave Dress",
    category: "Dresses",
    price: 2199,
    badge: "NEW",
    image: "/assets/products/new-arrivals/amber-weave-dress.jpg",
    href: "#",
  },
];

// ── Bestsellers (6 DEMO products) ─────────────────────────────

export const BESTSELLERS: DemoProduct[] = [
  {
    id: "bs-1",
    name: "Scarlet Muse Anarkali",
    category: "Anarkali Sets",
    price: 3699,
    originalPrice: 4299,
    badge: "BESTSELLER",
    image: "/assets/products/bestsellers/scarlet-muse-anarkali.jpg",
    href: "#",
  },
  {
    id: "bs-2",
    name: "Onyx Elegance Kurta Set",
    category: "Kurta Sets",
    price: 2799,
    badge: "BESTSELLER",
    image: "/assets/products/bestsellers/onyx-elegance-kurta-set.jpg",
    href: "#",
  },
  {
    id: "bs-3",
    name: "Gold Thread 2-Piece Set",
    category: "2-Piece Sets",
    price: 2499,
    originalPrice: 2999,
    image: "/assets/products/bestsellers/gold-thread-2-piece-set.jpg",
    href: "#",
  },
  {
    id: "bs-4",
    name: "Chili Red Draped Dress",
    category: "Dresses",
    price: 2299,
    badge: "BESTSELLER",
    image: "/assets/products/bestsellers/chili-red-draped-dress.jpg",
    href: "#",
  },
  {
    id: "bs-5",
    name: "Ivory Bloom Kurti",
    category: "Kurtis",
    price: 1599,
    image: "/assets/products/bestsellers/ivory-bloom-kurti.jpg",
    href: "#",
  },
  {
    id: "bs-6",
    name: "Wine 3-Piece Set",
    category: "3-Piece Sets",
    price: 3499,
    originalPrice: 3999,
    image: "/assets/products/bestsellers/wine-3-piece-set.jpg",
    href: "#",
  },
];

// ── Festive Collection (3 DEMO products) ──────────────────────

export const FESTIVE_PRODUCTS: DemoProduct[] = [
  {
    id: "fp-1",
    name: "Regal Zari Anarkali",
    category: "Anarkali Sets",
    price: 4299,
    originalPrice: 4999,
    badge: "FESTIVE",
    image: "/assets/products/festive/regal-zari-anarkali.jpg",
    href: "#",
  },
  {
    id: "fp-2",
    name: "Golden Hour 3-Piece Set",
    category: "3-Piece Sets",
    price: 3999,
    badge: "FESTIVE",
    image: "/assets/products/festive/golden-hour-3-piece-set.jpg",
    href: "#",
  },
  {
    id: "fp-3",
    name: "Vermillion Silk Kurti",
    category: "Kurtis",
    price: 2499,
    badge: "FESTIVE",
    image: "/assets/products/festive/vermillion-silk-kurti.jpg",
    href: "#",
  },
];

// ── Customer / Footer Links ──────────────────────────────────

export const CUSTOMER_LINKS: NavLink[] = [
  { label: "Contact", href: "#" },
  { label: "Shipping", href: "#" },
  { label: "Returns", href: "#" },
  { label: "Privacy", href: "#" },
  { label: "Terms", href: "#" },
];
