"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useCart } from "@/components/CartContext";
import { PRODUCT_IMAGE_MAP } from "@/lib/adapters/catalog-adapter";

interface CrossSellProduct {
  id: string;
  category: string;
  name: string;
  price: number;
  badge: string;
  image: string;
  slug: string;
}

const CROSS_SELL_PRODUCTS: CrossSellProduct[] = [
  {
    id: "cs-dupatta",
    category: "CBC Drapes",
    name: "Handloom Organza Dupatta",
    price: 1899,
    badge: "Pure Handloom",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDdzgPTlp6z7IG1_bTfuykYHLYEAZZodVqIZ6JX71pQwQo2NsvkdQohWFyKqaTqs55d2dVVqB31wwifIpz-d-WCGqqwd460lb2kfrs-KWuw6dbm1WxgjEgBwzgC27M0lRPkMcCV1LblOBqixVueqHitlZr1voZZWvTnLcrp3dH-rzUbgtCWYkRttrK5IO2w63teEt6UXOS3Hq73EqbZFM08MgV4UBoX616ek_yFxwnX4U99fIBlfqzgoQ",
    slug: "bandhani-print-dupatta",
  },
  {
    id: "cs-juttis",
    category: "Couture Footwear",
    name: "Gulabi Hand-Embroidered Juttis",
    price: 3199,
    badge: "Handcrafted",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBN4vmW5CEpXde_O4ZaDti-D13_Ml_QIzarqGY0uoq082wx3ySO75pLC6fQIWqpKz-vI00tU0bXgVJjAsGF6UO_hbqUfgACOXvDqIEjVK8hNV0ov7ncrZk8KIHkOayZ2MHSiVIsXS8V3inaOqXtCF3oda-KsC1y9jZVKE7EmoKPmSqvdNn1xq_Z6mYm9AcgxsfBzQ4wVG_qlRSPnIdGrjODkefQUgOycVg6d8cjZfPwC1QeWCdn8jACBA",
    slug: "chikankari-embroidered-kurti",
  },
  {
    id: "cs-sharara",
    category: "Festive Ready",
    name: "Ruhani Draped Sharara Set",
    price: 7199,
    badge: "Festive Edit",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAIRpIslyjZhtEnTKYTURmlV8PXtf7dvFJ9091fGmAHCTP_pw4Rx1NJm3fMGPvMgmN_QdIkRH2LdmM2QgJWO75q2bf7THmg45Qd9dH2fuQQvtkOnLl89OvaGXOpEsK-x1EW152dGmzAIiigd0FswRooo6O-UDHHKNXqb-XHWbYKBdyMk2GLmrUfDi0izTLQDPgboonHpg53APouM0TJedN5zhtDAQKhZhCUwYhBIJ3LArcApxrKRHaVwg",
    slug: "royal-silk-anarkali-set",
  },
  {
    id: "cs-gown",
    category: "CBC Eveningwear",
    name: "Onyx Midnight Backless Gown",
    price: 9299,
    badge: "Runway Edit",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAyj57wNXE_kXrZCkc5CByghiRNjwVqA8-u5woPpwmh30HpySusRY-D5ieSbJpjs0AWK7DoYo_oWikceNfl7F4GVSoMGm8tKxgS2L7vXJGYkVznZaI-hzhdZ9hxk5q8mqYGFt0rYlSJPAHkcjvRBW1dGvP9RY0zN12HaUtUb5968qp3FLzKb4m7hNhcO2et23NiXoUgPCJcSVCwf80q9r8LVeFLjmqZ8of-74CXRcphs6wrIdarverjcg",
    slug: "maxi-ethnic-dress",
  },
];

export default function CartPage() {
  const {
    cart,
    itemCount,
    subtotal,
    updateQuantity,
    removeItem,
    clearCart,
    addToCart,
    openDrawer,
    isLoading,
    error,
    clearError,
  } = useCart();

  // Coupon / Voucher code state
  const [couponInput, setCouponInput] = useState("MUSE10");
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>("MUSE10");
  const [couponError, setCouponError] = useState("");

  // Gifting presentation options
  const [giftingSelected, setGiftingSelected] = useState(true);
  const [calligraphyNote, setCalligraphyNote] = useState(
    "To my darling muse, wear this with pure pride and power on your milestone day. You are unforgettable."
  );

  // Tailoring add-on checked map per item
  const [tailoringMap, setTailoringMap] = useState<Record<string, boolean>>({});

  // Cross-sell add feedback
  const [addingCrossSell, setAddingCrossSell] = useState<Record<string, boolean>>({});

  const items = cart?.items || [];
  const parsedSubtotal = parseFloat(subtotal) || 0;

  // Free shipping threshold
  const FREE_SHIPPING_THRESHOLD = 2999;
  const isFreeShipping = parsedSubtotal >= FREE_SHIPPING_THRESHOLD || parsedSubtotal === 0;
  const freeShippingProgress = Math.min(
    100,
    Math.round((parsedSubtotal / FREE_SHIPPING_THRESHOLD) * 100)
  );
  const amountToFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD - parsedSubtotal);

  // Dynamic pricing calculations for MRP and Atelier savings
  const calculatedMrpTotal = Math.round(parsedSubtotal * 1.284);
  const mrpSavings = Math.max(0, calculatedMrpTotal - parsedSubtotal);

  // Coupon savings (10% on active coupon)
  const voucherDiscount = appliedCoupon ? Math.round(parsedSubtotal * 0.1) : 0;
  const finalPayable = Math.max(0, parsedSubtotal - voucherDiscount);
  const totalCombinedSavings = mrpSavings + voucherDiscount;
  const totalSavingsPercent =
    calculatedMrpTotal > 0
      ? Math.round((totalCombinedSavings / calculatedMrpTotal) * 100)
      : 0;

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = couponInput.trim().toUpperCase();
    if (!cleanCode) {
      setCouponError("Please enter a valid coupon code.");
      return;
    }
    if (["MUSE10", "ROYAL15", "CHILI10", "WELCOME10"].includes(cleanCode)) {
      setAppliedCoupon(cleanCode);
      setCouponError("");
    } else {
      setCouponError("Invalid voucher code. Try 'MUSE10' for 10% off.");
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput("");
    setCouponError("");
  };

  const handleAddCrossSell = async (product: CrossSellProduct) => {
    setAddingCrossSell((prev) => ({ ...prev, [product.id]: true }));
    try {
      // Find matching item in cart or trigger add
      await addToCart(product.id, 1);
    } catch {
      // Open drawer on fallback
      openDrawer();
    } finally {
      setTimeout(() => {
        setAddingCrossSell((prev) => ({ ...prev, [product.id]: false }));
      }, 2000);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-on-surface font-body-md antialiased selection:bg-primary selection:text-on-primary">
      {/* ── Global Header ──────────────────────────────────────── */}
      <Header />

      <main className="w-full pt-20 bg-background flex-1">
        <div className="flex flex-col w-full">
          {/* ── Stepper & Bag Header Bar ──────────────────────── */}
          <section className="w-full bg-surface-container-low py-8 px-6 lg:px-12 border-b border-outline-variant/30">
            <div className="max-w-[1440px] mx-auto flex flex-col gap-6">
              {/* Stepper Navigation */}
              <nav
                aria-label="Checkout Progress"
                className="flex items-center justify-between max-w-2xl mx-auto w-full"
              >
                {/* Step 1: Active */}
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 flex items-center justify-center bg-primary text-on-primary font-label-caps text-label-caps rounded-full shadow-sm font-bold">
                    1
                  </span>
                  <span className="font-label-caps text-label-caps tracking-widest text-primary uppercase font-bold">
                    Shopping Bag
                  </span>
                </div>
                <div className="h-0.5 flex-1 mx-4 bg-outline-variant/50" />
                {/* Step 2: Upcoming */}
                <div className="flex items-center gap-3 opacity-60">
                  <span className="w-7 h-7 flex items-center justify-center bg-surface-container-highest text-on-surface font-label-caps text-label-caps rounded-full">
                    2
                  </span>
                  <span className="font-label-caps text-label-caps tracking-widest text-on-surface-variant uppercase">
                    Delivery Address
                  </span>
                </div>
                <div className="h-0.5 flex-1 mx-4 bg-outline-variant/50" />
                {/* Step 3: Upcoming */}
                <div className="flex items-center gap-3 opacity-60">
                  <span className="w-7 h-7 flex items-center justify-center bg-surface-container-highest text-on-surface font-label-caps text-label-caps rounded-full">
                    3
                  </span>
                  <span className="font-label-caps text-label-caps tracking-widest text-on-surface-variant uppercase">
                    Payment
                  </span>
                </div>
              </nav>

              {/* Headline + Item Count */}
              <div className="flex flex-col md:flex-row md:items-baseline justify-between gap-2 pt-2">
                <div className="flex items-baseline gap-3">
                  <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">
                    Your Shopping Bag
                  </h1>
                  <span className="font-title-editorial text-title-editorial text-tertiary italic">
                    ({itemCount} {itemCount === 1 ? "Item" : "Items"} in Bag)
                  </span>
                </div>
                <Link
                  href="/products"
                  className="font-label-caps text-label-caps text-tertiary hover:text-primary uppercase tracking-widest transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">west</span>
                  <span>Continue Exploring</span>
                </Link>
              </div>

              {/* Luxury Assurance Banner */}
              <div className="bg-surface-card p-4 rounded shadow-sm flex items-center justify-between flex-wrap gap-4 border border-outline-variant/30">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-secondary-container/40 flex items-center justify-center text-secondary">
                    <span className="material-symbols-outlined text-[20px]">
                      workspace_premium
                    </span>
                  </div>
                  <div>
                    <p className="font-body-md text-body-md font-medium text-on-surface">
                      Complimentary Express Dispatch &amp; Bespoke Luxury Gift Packaging
                    </p>
                    <p className="font-body-sm text-body-sm text-text-muted">
                      Applied automatically to this couture order. Delivered in silk-lined signature crimson carton.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-tertiary font-label-caps text-label-caps tracking-widest font-semibold">
                  <span className="material-symbols-outlined text-[18px]">verified</span>
                  <span>100% ATELIER CRAFT</span>
                </div>
              </div>
            </div>
          </section>

          {/* ── Error Banner ──────────────────────────────────── */}
          {error && (
            <div className="max-w-[1440px] mx-auto w-full px-6 lg:px-12 pt-6">
              <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-body-sm font-body-sm rounded flex items-center justify-between">
                <span>{error}</span>
                <button
                  type="button"
                  onClick={clearError}
                  className="text-rose-900 font-bold ml-4 text-base cursor-pointer"
                  aria-label="Dismiss error"
                >
                  ×
                </button>
              </div>
            </div>
          )}

          {/* ── Main Content: Empty State OR Populated Bag ────── */}
          {items.length === 0 ? (
            /* ── Opulent Empty State ── */
            <section className="max-w-[1440px] mx-auto w-full px-6 lg:px-12 py-20 sm:py-28 text-center">
              <div className="max-w-md mx-auto bg-surface-card p-8 sm:p-12 shadow-sm border border-outline-variant/40 flex flex-col items-center">
                <div className="w-20 h-20 rounded-full bg-surface-container flex items-center justify-center text-primary mb-6">
                  <span className="material-symbols-outlined text-[36px]">
                    shopping_bag
                  </span>
                </div>
                <h2 className="font-headline-md text-headline-md font-semibold text-on-surface mb-2">
                  Your Shopping Bag is Empty
                </h2>
                <p className="font-body-md text-body-md text-text-muted leading-relaxed mb-8">
                  Discover handcrafted luxury kurtis, kurta sets, and ethnic wear designed to express confidence and individuality.
                </p>
                <Link
                  href="/products"
                  className="w-full bg-primary hover:bg-primary-container text-on-primary py-4 px-8 font-label-caps text-label-caps uppercase tracking-widest font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Explore Catalog</span>
                  <span className="material-symbols-outlined text-[18px]">east</span>
                </Link>
              </div>
            </section>
          ) : (
            /* ── Main Bag Content & Sticky Checkout Sidebar ── */
            <section className="max-w-[1440px] mx-auto w-full px-6 lg:px-12 py-10">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
                {/* LEFT COLUMN: Bag Items & Customizations (8 cols) */}
                <div className="lg:col-span-8 flex flex-col gap-8">
                  {/* Free Shipping Milestone Progress Gauge */}
                  <div className="bg-surface-card p-5 rounded shadow-sm flex flex-col gap-3 border border-outline-variant/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-on-surface">
                        <span className="material-symbols-outlined text-[20px] text-secondary">
                          {isFreeShipping ? "check_circle" : "local_shipping"}
                        </span>
                        <span className="font-label-ui text-label-ui font-semibold uppercase tracking-wider">
                          {isFreeShipping ? "Milestone Achieved" : "Shipping Progress"}
                        </span>
                      </div>
                      <span className="font-label-caps text-label-caps text-secondary font-bold tracking-widest">
                        FREE EXPRESS DISPATCH
                      </span>
                    </div>

                    <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-secondary h-full rounded-full transition-all duration-500"
                        style={{ width: `${freeShippingProgress}%` }}
                      />
                    </div>

                    <p className="font-body-sm text-body-sm text-text-muted">
                      {isFreeShipping ? (
                        <>
                          You&apos;ve unlocked{" "}
                          <strong className="text-on-surface">
                            Complimentary Express Air Cargo Delivery
                          </strong>{" "}
                          across 24,000+ Indian PIN codes.
                        </>
                      ) : (
                        <>
                          Add{" "}
                          <strong className="text-primary">
                            ₹{amountToFreeShipping.toLocaleString("en-IN")}
                          </strong>{" "}
                          more to unlock Complimentary Express Air Delivery.
                        </>
                      )}
                    </p>
                  </div>

                  {/* Bag Items Listing */}
                  <div className="flex flex-col gap-6">
                    {items.map((item) => {
                      const product = item.variant.product;
                      const imageUrl =
                        PRODUCT_IMAGE_MAP[product.slug] ||
                        "https://lh3.googleusercontent.com/aida-public/AB6AXuCnIuB6P8Kk6Abw4hNs6m7CCe3ySpySVuUypDv0XX7F_QdCyPqqnO8QZx-QktplAPdYJv2Xt8wy3bPzylC4e5IdI9sSjLLOaV4SKoKG697ZjP5SkvalWlJQq93ifY3qB7fUTztWDSP-v7HHTd_LOadQMPV0ULyMlBH7Iom_qyosS9vDLDliZer0SqY7xbj9hVXybiUK8RqLiPXeAnl_EPnJi6FEbSE6tAK0Vzmp30BjS01cDgwWvqrMnA";
                      const unitPriceNum = parseFloat(item.unit_price) || 0;
                      const lineTotalNum = parseFloat(item.line_total) || 0;
                      const unitMrp = Math.round(unitPriceNum * 1.38);
                      const isTailoringChecked =
                        tailoringMap[item.id] !== undefined
                          ? tailoringMap[item.id]
                          : true;

                      return (
                        <article
                          key={item.id}
                          className="bg-surface-card rounded p-6 shadow-sm flex flex-col sm:flex-row gap-6 relative border border-outline-variant/30"
                        >
                          {/* Product Photo */}
                          <div className="w-full sm:w-44 h-56 shrink-0 relative overflow-hidden bg-surface-container rounded">
                            <Image
                              src={imageUrl}
                              alt={product.name}
                              fill
                              sizes="(max-width: 640px) 100vw, 176px"
                              className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                            />
                            <div className="absolute top-2 left-2 bg-primary text-on-primary font-label-caps text-[9px] px-2 py-0.5 tracking-widest uppercase font-semibold">
                              {product.category_name || "Bestseller"}
                            </div>
                          </div>

                          {/* Product Specs & Controls */}
                          <div className="flex-1 flex flex-col justify-between gap-4">
                            <div>
                              <div className="flex items-start justify-between gap-4">
                                <div>
                                  <span className="font-label-caps text-label-caps text-text-muted uppercase tracking-widest">
                                    SKU: {item.variant.sku}
                                  </span>
                                  <Link
                                    href={`/products/${product.slug}`}
                                    className="font-headline-sm text-headline-sm text-on-surface mt-1 hover:text-primary transition-colors block"
                                  >
                                    {product.name}
                                  </Link>
                                </div>

                                {/* Unit & Total Price */}
                                <div className="text-right shrink-0">
                                  <p className="font-price-regular text-price-regular text-primary font-bold">
                                    ₹{lineTotalNum.toLocaleString("en-IN")}
                                  </p>
                                  <p className="font-price-original text-price-original line-through text-text-muted">
                                    ₹{(unitMrp * item.quantity).toLocaleString("en-IN")}
                                  </p>
                                  <span className="inline-block bg-primary-fixed text-on-primary-fixed-variant text-[10px] font-bold px-1.5 py-0.5 rounded mt-0.5">
                                    28% OFF
                                  </span>
                                </div>
                              </div>

                              {/* Attributes & Badges */}
                              <div className="flex flex-wrap items-center gap-3 mt-3">
                                <span className="bg-surface-container px-2.5 py-1 text-[11px] font-medium font-body-sm text-on-surface">
                                  100% Pure Mulberry Silk
                                </span>
                                {item.variant.color && (
                                  <div className="flex items-center gap-1.5 bg-surface-container px-2.5 py-1 text-[11px] font-medium font-body-sm text-on-surface">
                                    <span>Hue:</span>
                                    <span className="w-3 h-3 rounded-full bg-primary inline-block" />
                                    <span>{item.variant.color}</span>
                                  </div>
                                )}
                                {item.variant.size && (
                                  <div className="flex items-center gap-2 bg-surface-container px-2.5 py-1 text-[11px] font-medium font-body-sm text-on-surface">
                                    <span>
                                      Size:{" "}
                                      <strong className="text-on-surface">
                                        {item.variant.size}
                                      </strong>
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Tailoring Guarantee Add-on Box */}
                            <div className="bg-surface-container-low p-3.5 rounded flex items-start gap-3 border border-outline-variant/30">
                              <input
                                type="checkbox"
                                id={`tailor-addon-${item.id}`}
                                checked={isTailoringChecked}
                                onChange={(e) =>
                                  setTailoringMap((prev) => ({
                                    ...prev,
                                    [item.id]: e.target.checked,
                                  }))
                                }
                                className="mt-1 h-4 w-4 accent-primary text-primary rounded cursor-pointer"
                              />
                              <label
                                htmlFor={`tailor-addon-${item.id}`}
                                className="font-body-sm text-body-sm text-on-surface-variant cursor-pointer flex-1"
                              >
                                <span className="font-medium text-on-surface">
                                  Complimentary Custom Sleeve / Hem Adjustment
                                </span>{" "}
                                —{" "}
                                <span className="text-text-muted">
                                  Our Master Drape Tailor will connect post-order for customized hem length. 14-day atelier guarantee.
                                </span>
                              </label>
                            </div>

                            {/* Quantity & Actions Bar */}
                            <div className="flex items-center justify-between pt-2 border-t border-outline-variant/20 flex-wrap gap-4">
                              {/* Quantity Stepper */}
                              <div className="flex items-center bg-surface-container rounded border border-outline-variant/40">
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateQuantity(item.id, item.quantity - 1)
                                  }
                                  disabled={isLoading || item.quantity <= 1}
                                  aria-label="Decrease quantity"
                                  className="w-8 h-8 flex items-center justify-center text-on-surface hover:text-primary transition-colors text-base font-bold cursor-pointer disabled:opacity-30"
                                >
                                  −
                                </button>
                                <span className="w-10 text-center font-label-ui text-label-ui font-semibold text-on-surface">
                                  {item.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateQuantity(item.id, item.quantity + 1)
                                  }
                                  disabled={isLoading}
                                  aria-label="Increase quantity"
                                  className="w-8 h-8 flex items-center justify-center text-on-surface hover:text-primary transition-colors text-base font-bold cursor-pointer"
                                >
                                  +
                                </button>
                              </div>

                              {/* Action Links */}
                              <div className="flex items-center gap-5">
                                <button
                                  type="button"
                                  onClick={() => removeItem(item.id)}
                                  className="flex items-center gap-1 text-on-surface-variant hover:text-primary transition-colors font-label-caps text-label-caps uppercase tracking-wider cursor-pointer"
                                >
                                  <span className="material-symbols-outlined text-[17px]">
                                    favorite
                                  </span>
                                  <span>Move to Wishlist</span>
                                </button>
                                <span className="text-outline-variant">|</span>
                                <button
                                  type="button"
                                  onClick={() => removeItem(item.id)}
                                  disabled={isLoading}
                                  aria-label={`Remove ${product.name} from bag`}
                                  className="flex items-center gap-1 text-on-surface-variant hover:text-error transition-colors font-label-caps text-label-caps uppercase tracking-wider cursor-pointer"
                                >
                                  <span className="material-symbols-outlined text-[17px]">
                                    delete
                                  </span>
                                  <span>Remove</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>

                  {/* Gifting & Unboxing Options Box */}
                  <div className="bg-surface-card rounded p-6 shadow-sm flex flex-col gap-4 border border-outline-variant/30">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        id="gifting-toggle"
                        checked={giftingSelected}
                        onChange={(e) => setGiftingSelected(e.target.checked)}
                        className="mt-1 h-4 w-4 accent-primary text-primary rounded cursor-pointer"
                      />
                      <div className="flex-1">
                        <label
                          htmlFor="gifting-toggle"
                          className="font-title-editorial text-title-editorial text-on-surface cursor-pointer flex items-center gap-2"
                        >
                          <span>Atelier Gifting Experience &amp; Presentation</span>
                          <span className="bg-secondary-fixed text-on-secondary-fixed text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                            Complimentary
                          </span>
                        </label>
                        <p className="font-body-sm text-body-sm text-text-muted mt-1">
                          Wrapped in hand-pressed butter paper, placed in our rigid Crimson keepsake box tied with gold zari cord, and invoices redacted.
                        </p>
                      </div>
                    </div>

                    {giftingSelected && (
                      <div className="pl-7 pt-2 flex flex-col gap-2">
                        <label
                          htmlFor="calligraphy-note"
                          className="font-label-caps text-label-caps uppercase tracking-widest text-on-surface-variant font-semibold"
                        >
                          Personal Handwritten Calligraphy Note:
                        </label>
                        <textarea
                          id="calligraphy-note"
                          value={calligraphyNote}
                          onChange={(e) => setCalligraphyNote(e.target.value.slice(0, 250))}
                          maxLength={250}
                          rows={3}
                          placeholder="Write your heartfelt note here (e.g., 'To dearest Ananya, may your radiance light up every corridor... With love')"
                          className="w-full bg-surface-container-low border border-outline-variant/60 rounded p-3 text-body-sm font-body-sm text-on-surface focus:outline-none focus:border-primary placeholder:text-text-muted"
                        />
                        <div className="flex items-center justify-between text-body-sm text-[11px] text-text-muted">
                          <span>Handwritten by our resident atelier scribe.</span>
                          <span>{calligraphyNote.length} / 250 characters</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions Row: Clear Bag */}
                  <div className="flex justify-between items-center pt-2">
                    <button
                      type="button"
                      onClick={clearCart}
                      disabled={isLoading}
                      className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.18em] text-on-surface-variant hover:text-error transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        delete_sweep
                      </span>
                      <span>Clear Shopping Bag</span>
                    </button>
                  </div>
                </div>

                {/* RIGHT COLUMN: Sticky Order Summary & Checkout Panel (4 cols) */}
                <aside className="lg:col-span-4 lg:sticky lg:top-24 flex flex-col gap-6">
                  <div className="bg-surface-card rounded p-6 sm:p-7 shadow-md flex flex-col gap-6 border border-outline-variant/30">
                    <div className="flex items-center justify-between pb-4 border-b border-outline-variant/30">
                      <h2 className="font-headline-sm text-headline-sm text-on-surface tracking-wider uppercase font-semibold">
                        Order Summary
                      </h2>
                      <span className="font-label-caps text-label-caps text-text-muted uppercase">
                        {itemCount} {itemCount === 1 ? "Product" : "Products"}
                      </span>
                    </div>

                    {/* Promo Code / Muse Voucher Input */}
                    <div className="flex flex-col gap-3">
                      <label
                        htmlFor="coupon-code"
                        className="font-label-caps text-label-caps uppercase tracking-widest text-on-surface font-semibold flex items-center justify-between"
                      >
                        <span>Have a Voucher or Muse Code?</span>
                        <span className="material-symbols-outlined text-[16px] text-secondary">
                          redeem
                        </span>
                      </label>

                      <form onSubmit={handleApplyCoupon} className="flex items-center gap-2">
                        <input
                          id="coupon-code"
                          type="text"
                          value={couponInput}
                          onChange={(e) => setCouponInput(e.target.value)}
                          placeholder="ENTER CODE"
                          className="flex-1 bg-surface-container-low border border-outline-variant/60 rounded px-3 py-2.5 font-label-caps text-label-caps uppercase tracking-widest text-on-surface focus:outline-none focus:border-primary font-bold"
                        />
                        <button
                          type="submit"
                          className="bg-inverse-surface text-inverse-on-surface font-label-caps text-label-caps uppercase tracking-widest px-4 py-2.5 rounded hover:bg-on-surface transition-colors cursor-pointer"
                        >
                          {appliedCoupon === couponInput.trim().toUpperCase()
                            ? "Applied"
                            : "Apply"}
                        </button>
                      </form>

                      {couponError && (
                        <p className="text-xs text-rose-700 font-medium">
                          {couponError}
                        </p>
                      )}

                      {appliedCoupon && (
                        <div className="flex items-center justify-between bg-primary-fixed/50 px-3 py-2 rounded text-on-primary-fixed-variant">
                          <div className="flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[16px]">
                              check_circle
                            </span>
                            <span className="font-body-sm text-[12px] font-semibold">
                              {appliedCoupon} — 10% Royal Welcome Off
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={handleRemoveCoupon}
                            className="text-[11px] underline uppercase tracking-wider font-bold hover:text-primary cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Price Ledger Breakdown */}
                    <div className="flex flex-col gap-3 pt-2 text-body-md font-body-md">
                      <div className="flex items-center justify-between text-on-surface-variant">
                        <span>Bag Total (MRP)</span>
                        <span className="font-price-regular text-price-regular text-on-surface">
                          ₹{calculatedMrpTotal.toLocaleString("en-IN")}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-primary font-medium">
                        <span>Atelier Bag Discount</span>
                        <span className="font-price-regular text-price-regular">
                          -₹{mrpSavings.toLocaleString("en-IN")}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-on-surface-variant">
                        <span>Subtotal</span>
                        <span className="font-price-regular text-price-regular text-on-surface">
                          ₹{parsedSubtotal.toLocaleString("en-IN")}
                        </span>
                      </div>

                      {appliedCoupon && voucherDiscount > 0 && (
                        <div className="flex items-center justify-between text-primary font-medium">
                          <span>Voucher Savings ({appliedCoupon})</span>
                          <span className="font-price-regular text-price-regular">
                            -₹{voucherDiscount.toLocaleString("en-IN")}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-on-surface-variant">
                        <div className="flex items-center gap-1">
                          <span>Express Air Delivery</span>
                          <span className="material-symbols-outlined text-[14px] text-text-muted">
                            info
                          </span>
                        </div>
                        <span className="font-label-caps text-label-caps text-secondary font-bold uppercase">
                          FREE
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-on-surface-variant">
                        <span>Luxury Silk Packaging</span>
                        <span className="font-label-caps text-label-caps text-secondary font-bold uppercase">
                          INCLUDED
                        </span>
                      </div>

                      {/* Total Bar */}
                      <div className="pt-4 mt-1 border-t border-outline-variant/40 flex items-baseline justify-between">
                        <div>
                          <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                            Total Payable
                          </span>
                          <p className="font-body-sm text-[11px] text-text-muted">
                            Inclusive of all Goods &amp; Services Taxes (GST)
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="font-display-hero-mobile text-display-hero-mobile text-primary font-bold">
                            ₹{finalPayable.toLocaleString("en-IN")}
                          </span>
                        </div>
                      </div>

                      {/* Savings Banner Pill */}
                      {totalCombinedSavings > 0 && (
                        <div className="bg-secondary-container/40 p-2.5 rounded text-center">
                          <p className="font-label-caps text-label-caps tracking-widest text-secondary font-bold uppercase">
                            🎉 YOU ARE SAVING ₹{totalCombinedSavings.toLocaleString("en-IN")}{" "}
                            ({totalSavingsPercent}%) ON THIS ORDER
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Checkout CTAs */}
                    <div className="flex flex-col gap-3 pt-2">
                      <Link
                        href="/checkout"
                        className="w-full bg-primary hover:bg-primary-container text-on-primary py-4 px-6 rounded font-label-caps text-label-caps tracking-widest uppercase font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 group cursor-pointer text-center"
                      >
                        <span>PROCEED TO SECURE CHECKOUT</span>
                        <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">
                          lock
                        </span>
                      </Link>

                      <Link
                        href="/checkout"
                        className="w-full bg-surface-container hover:bg-surface-container-high text-on-surface py-3 px-4 rounded font-label-caps text-label-caps tracking-wider uppercase font-semibold transition-colors flex items-center justify-center gap-2 border border-outline-variant/30 cursor-pointer text-center"
                      >
                        <span className="material-symbols-outlined text-[18px] text-secondary">
                          bolt
                        </span>
                        <span>Express UPI / 1-Click Pay</span>
                      </Link>
                    </div>

                    {/* Trust & Security Badges */}
                    <div className="pt-4 border-t border-outline-variant/30 flex flex-col gap-4">
                      <div className="flex items-center justify-center gap-3 text-text-muted opacity-80 flex-wrap">
                        <span className="font-label-caps text-[10px] tracking-wider uppercase px-2 py-0.5 bg-surface-container rounded font-bold">
                          UPI
                        </span>
                        <span className="font-label-caps text-[10px] tracking-wider uppercase px-2 py-0.5 bg-surface-container rounded font-bold">
                          VISA
                        </span>
                        <span className="font-label-caps text-[10px] tracking-wider uppercase px-2 py-0.5 bg-surface-container rounded font-bold">
                          MASTERCARD
                        </span>
                        <span className="font-label-caps text-[10px] tracking-wider uppercase px-2 py-0.5 bg-surface-container rounded font-bold">
                          RAZORPAY
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-body-sm text-[11px] text-text-muted">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[16px] text-primary">
                            security
                          </span>
                          <span>256-Bit SSL Encrypted</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[16px] text-primary">
                            autorenew
                          </span>
                          <span>7-Day Doorstep Returns</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[16px] text-primary">
                            verified_user
                          </span>
                          <span>100% Authentic Fabric</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[16px] text-primary">
                            local_shipping
                          </span>
                          <span>Dispatched in 24 Hrs</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Personal Atelier Stylist / WhatsApp Support Card */}
                  <div className="bg-surface-card rounded p-5 shadow-sm flex items-center gap-4 border border-outline-variant/30">
                    <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center text-primary shrink-0">
                      <span className="material-symbols-outlined text-[24px]">
                        support_agent
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="font-label-ui text-label-ui font-semibold text-on-surface">
                        Need Custom Sizing or Styling?
                      </p>
                      <p className="font-body-sm text-body-sm text-text-muted mt-0.5">
                        Chat directly with our Atelier Concierge on WhatsApp before finalizing.
                      </p>
                      <a
                        href="https://wa.me/919876543210?text=Hello%20Closet%20by%20Chili%2C%20I%20have%20a%20question%20regarding%20my%20bag%20items."
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-label-caps text-label-caps uppercase text-tertiary hover:text-primary font-bold tracking-wider mt-1 transition-colors cursor-pointer"
                      >
                        <span>CONNECT CONCIERGE</span>
                        <span className="material-symbols-outlined text-[14px]">
                          arrow_outward
                        </span>
                      </a>
                    </div>
                  </div>
                </aside>
              </div>
            </section>
          )}

          {/* ── CROSS-SELL: "Muses Also Added" 4-Column Grid ──── */}
          <section className="w-full bg-surface-container-low py-16 px-6 lg:px-12 border-t border-outline-variant/30">
            <div className="max-w-[1440px] mx-auto flex flex-col gap-10">
              <div className="flex flex-col sm:flex-row items-baseline justify-between gap-4">
                <div>
                  <span className="font-label-caps text-label-caps uppercase tracking-widest text-primary font-bold">
                    Curated Ensembles
                  </span>
                  <h2 className="font-headline-md text-headline-md text-on-surface tracking-tight mt-1">
                    Muses Also Added to Their Cart
                  </h2>
                </div>
                <p className="font-title-editorial text-title-editorial text-text-muted italic hidden sm:block">
                  Hand-picked companions for your signature scarlet silhouettes
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {CROSS_SELL_PRODUCTS.map((prod) => {
                  const isAdding = !!addingCrossSell[prod.id];

                  return (
                    <div
                      key={prod.id}
                      className="bg-surface-card rounded overflow-hidden shadow-sm flex flex-col justify-between group border border-outline-variant/30"
                    >
                      <Link href={`/products/${prod.slug}`} className="block relative w-full h-80 overflow-hidden bg-surface-container">
                        <Image
                          src={prod.image}
                          alt={prod.name}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                        <span className="absolute top-3 left-3 bg-inverse-surface text-inverse-on-surface font-label-caps text-[9px] px-2 py-0.5 tracking-widest uppercase font-semibold">
                          {prod.badge}
                        </span>
                      </Link>

                      <div className="p-5 flex flex-col gap-3 flex-1 justify-between">
                        <div>
                          <span className="font-label-caps text-label-caps text-text-muted uppercase tracking-wider">
                            {prod.category}
                          </span>
                          <Link
                            href={`/products/${prod.slug}`}
                            className="font-headline-sm text-[18px] text-on-surface font-medium line-clamp-1 mt-0.5 hover:text-primary transition-colors block"
                          >
                            {prod.name}
                          </Link>
                          <p className="font-price-regular text-price-regular text-primary font-semibold mt-1">
                            ₹{prod.price.toLocaleString("en-IN")}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleAddCrossSell(prod)}
                          disabled={isAdding}
                          className="w-full bg-surface-container hover:bg-primary hover:text-on-primary text-on-surface py-2.5 px-3 rounded font-label-caps text-label-caps tracking-widest uppercase font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <span className="material-symbols-outlined text-[16px]">
                            {isAdding ? "check" : "add"}
                          </span>
                          <span>{isAdding ? "ADDED" : "ADD TO BAG"}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* ── Global Footer ──────────────────────────────────────── */}
      <Footer />
    </div>
  );
}
