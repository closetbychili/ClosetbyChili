export interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  description: string;
  itemCount: string;
  accentColor: string;
}

export interface ProductItem {
  id: string;
  name: string;
  category: string;
  price: number;
  originalPrice?: number;
  badge?: string;
  colorScheme: {
    bg: string;
    accent: string;
    text: string;
  };
}

export const CATEGORIES: CategoryItem[] = [
  {
    id: "cat-1",
    name: "Anarkali Sets",
    slug: "anarkali-sets",
    description: "Flowing silhouettes with rich festive flare",
    itemCount: "24 Styles",
    accentColor: "from-rose-900/80 to-amber-950/80",
  },
  {
    id: "cat-2",
    name: "Kurta Sets",
    slug: "kurta-sets",
    description: "Handcrafted 2-piece & 3-piece everyday elegance",
    itemCount: "38 Styles",
    accentColor: "from-emerald-900/80 to-teal-950/80",
  },
  {
    id: "cat-3",
    name: "Kurtis & Tunics",
    slug: "kurtis",
    description: "Contemporary cuts for casual and office wear",
    itemCount: "45 Styles",
    accentColor: "from-amber-900/80 to-orange-950/80",
  },
  {
    id: "cat-4",
    name: "Bottom Wear",
    slug: "bottom-wear",
    description: "Tailored palazzos, pants, and ethnic trousers",
    itemCount: "19 Styles",
    accentColor: "from-purple-900/80 to-indigo-950/80",
  },
];

export const FEATURED_PRODUCTS: ProductItem[] = [
  {
    id: "prod-1",
    name: "Gulbahar Floral Silk Anarkali Set",
    category: "Anarkali Sets",
    price: 3499,
    originalPrice: 4299,
    badge: "New Arrival",
    colorScheme: {
      bg: "bg-rose-50 dark:bg-rose-950/30",
      accent: "text-rose-700 dark:text-rose-300",
      text: "border-rose-200 dark:border-rose-800",
    },
  },
  {
    id: "prod-2",
    name: "Noor Zari Embroidered Chanderi Kurta Set",
    category: "Kurta Sets",
    price: 2899,
    originalPrice: 3499,
    badge: "Bestseller",
    colorScheme: {
      bg: "bg-emerald-50 dark:bg-emerald-950/30",
      accent: "text-emerald-700 dark:text-emerald-300",
      text: "border-emerald-200 dark:border-emerald-800",
    },
  },
  {
    id: "prod-3",
    name: "Sitara Mirror Work Cotton A-Line Kurti",
    category: "Kurtis",
    price: 1499,
    badge: "Trending",
    colorScheme: {
      bg: "bg-amber-50 dark:bg-amber-950/30",
      accent: "text-amber-700 dark:text-amber-300",
      text: "border-amber-200 dark:border-amber-800",
    },
  },
  {
    id: "prod-4",
    name: "Roshni Festive Co-ord Set with Dupatta",
    category: "Co-ord Sets",
    price: 2599,
    originalPrice: 2999,
    badge: "Limited Edition",
    colorScheme: {
      bg: "bg-indigo-50 dark:bg-indigo-950/30",
      accent: "text-indigo-700 dark:text-indigo-300",
      text: "border-indigo-200 dark:border-indigo-800",
    },
  },
];
