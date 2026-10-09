"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  CreditCard,
  Gift,
  Headphones,
  HelpCircle,
  Loader2,
  Lock,
  MapPin,
  Phone,
  PlusCircle,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Tag,
  Truck,
  Verified,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useAuth } from "@/components/AuthProvider";
import { useCart } from "@/components/CartContext";
import {
  createAddress,
  createRazorpayOrder,
  getAddresses,
  placeOrder,
  verifyRazorpayPayment,
  type Address,
  type CheckoutOrder,
} from "@/lib/api";
import { launchRazorpayCheckout } from "@/lib/razorpay";

const emptyAddressForm = {
  full_name: "",
  phone: "",
  address_line1: "",
  address_line2: "",
  landmark: "",
  city: "",
  state: "",
  postal_code: "",
  country: "India",
  address_type: "HOME" as "HOME" | "OFFICE" | "OTHER",
  is_default: false,
};

export default function CheckoutPage() {
  const router = useRouter();
  const { user, session, loading: authLoading } = useAuth();
  const { cart, itemCount, subtotal, isLoading: cartLoading, refreshCart } = useCart();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [isAddressFormOpen, setIsAddressFormOpen] = useState(false);
  const [addressForm, setAddressForm] = useState(emptyAddressForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [paymentNotice, setPaymentNotice] = useState<string | null>(null);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(true);
  const [order, setOrder] = useState<CheckoutOrder | null>(null);

  // Luxury Concierge Extras
  const [shippingTier, setShippingTier] = useState<"standard" | "atelier">("standard");
  const [packInKeepsakeBox, setPackInKeepsakeBox] = useState(true);
  const [includeWaxSealNote, setIncludeWaxSealNote] = useState(true);
  const [giftMessage, setGiftMessage] = useState("");
  const [deliveryPref, setDeliveryPref] = useState<string[]>(["Call Upon Arrival"]);
  const [dispatchNote, setDispatchNote] = useState("");

  const idempotencyKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user || !session?.access_token) return;

    let active = true;
    getAddresses(session.access_token)
      .then((data) => {
        if (!active) return;
        const list = data.results ?? [];
        setAddresses(list);
        const defaultAddress = list.find((address) => address.is_default) ?? list[0] ?? null;
        setSelectedAddressId(defaultAddress?.id ?? null);
      })
      .catch((error) => {
        if (!active) return;
        setFormError(error instanceof Error ? error.message : "Unable to load saved addresses.");
      })
      .finally(() => {
        if (active) setIsLoadingAddresses(false);
      });

    return () => {
      active = false;
    };
  }, [session?.access_token, user]);

  const itemTotal = useMemo(() => Number.parseFloat(subtotal) || 0, [subtotal]);
  const shippingAmount = shippingTier === "atelier" ? 299 : 0;
  const grandTotal = itemTotal + shippingAmount;

  // Only treat as having no items once we have a confirmed cart (not while loading).
  const hasItems = (cart?.items?.length ?? 0) > 0;

  const toggleDeliveryPref = (pref: string) => {
    setDeliveryPref((prev) =>
      prev.includes(pref) ? prev.filter((p) => p !== pref) : [...prev, pref]
    );
  };

  const handleSubmitAddress = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user || !session?.access_token) return;

    setFormError(null);
    try {
      const newAddress = await createAddress(addressForm, session.access_token);
      const next = [...addresses, newAddress];
      setAddresses(next);
      setSelectedAddressId(newAddress.id);
      setIsAddressFormOpen(false);
      setAddressForm(emptyAddressForm);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Your address could not be saved.");
    }
  };

  const startPaymentFlow = async (targetOrder: CheckoutOrder) => {
    if (!session?.access_token) return;
    if (targetOrder.payment_status === "PAID") return;
    setIsPaying(true);
    setPaymentNotice(null);

    try {
      const paymentSession = await createRazorpayOrder(targetOrder.order_number, session.access_token);
      await launchRazorpayCheckout({
        session: paymentSession,
        user: {
          name: user?.profile?.display_name || user?.email || "",
          email: user?.email || "",
          phone: user?.profile?.phone || "",
        },
        onSuccess: async (paymentDetails) => {
          try {
            const verified = await verifyRazorpayPayment(paymentDetails, session.access_token);
            setOrder(verified);
            setPaymentNotice(null);
          } catch (verifyErr) {
            setPaymentNotice(
              verifyErr instanceof Error
                ? verifyErr.message
                : "Payment verification failed. Please contact support if your account was charged."
            );
          } finally {
            setIsPaying(false);
          }
        },
        onFailure: (err) => {
          setIsPaying(false);
          setPaymentNotice(err.description || "Payment failed or was cancelled. You can retry below.");
        },
        onDismiss: () => {
          setIsPaying(false);
          setPaymentNotice("Payment window closed before completion. You can retry anytime.");
        },
      });
    } catch (err) {
      setIsPaying(false);
      setPaymentNotice(err instanceof Error ? err.message : "Unable to launch payment. You can retry below.");
    }
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddressId || !user || !session?.access_token) {
      setFormError("Please choose a delivery address before placing the order.");
      return;
    }
    if (isSubmitting || isPaying) {
      // Prevent double-submit: silently discard subsequent clicks while in-flight.
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    if (!idempotencyKeyRef.current) {
      idempotencyKeyRef.current = `checkout-${user.id}-${cart?.id || "cart"}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    }
    const idempotencyKey = idempotencyKeyRef.current;

    try {
      const created = await placeOrder(
        {
          shipping_address_id: selectedAddressId,
          ...(idempotencyKey ? { idempotency_key: idempotencyKey } : {}),
        },
        session.access_token
      );
      // Refresh cart so the header/drawer reflect the now-empty cart.
      void refreshCart();
      setOrder(created);
      setIsSubmitting(false);

      // Launch Razorpay standard checkout flow
      if (created.payment_status !== "PAID") {
        void startPaymentFlow(created);
      }
    } catch (error) {
      setIsSubmitting(false);
      setFormError(error instanceof Error ? error.message : "We could not place your order. Please try again.");
    }
  };

  if (authLoading || !user) {
    return (
      <main className="min-h-screen bg-background text-on-surface">
        <Header />
        <div className="flex min-h-[60vh] items-center justify-center pt-32 text-sm text-text-muted">
          <Loader2 className="mr-2 animate-spin text-primary" size={16} />
          Preparing private atelier checkout…
        </div>
        <Footer />
      </main>
    );
  }

  // ── ORDER SUCCESS / CONFIRMATION STATE ─────────────────────
  if (order) {
    const isPaid = order.payment_status === "PAID";
    return (
      <div className="min-h-screen bg-page-bg text-on-surface">
        <Header />
        <main className="mx-auto max-w-3xl px-4 sm:px-6 pb-20 pt-28 sm:pt-34">
          <div
            className={`bg-surface-card p-6 sm:p-10 shadow-sm border ${
              isPaid ? "border-emerald-300" : "border-amber-300"
            }`}
          >
            <div className={`flex items-center gap-4 ${isPaid ? "text-emerald-800" : "text-amber-800"}`}>
              {isPaid ? (
                <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="h-7 w-7 text-emerald-600" />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                  <CreditCard className="h-7 w-7 text-amber-600" />
                </div>
              )}
              <div>
                <p className="font-label-caps text-xs font-semibold uppercase tracking-widest">
                  {isPaid ? "Order placed & paid" : "Order placed — pending payment"}
                </p>
                <h1 className="font-headline-lg text-2xl sm:text-3xl text-on-surface mt-1">
                  Thank you for your order
                </h1>
              </div>
            </div>

            {paymentNotice && (
              <div className="mt-5 rounded-none border border-amber-300 bg-amber-50/80 p-4 text-xs font-body text-amber-900">
                {paymentNotice}
              </div>
            )}

            <div className="mt-6 space-y-3 bg-surface-container-low p-6 text-sm font-body border border-outline-variant/30">
              <p className="flex items-center justify-between">
                <span className="font-semibold text-on-surface">Order number:</span>{" "}
                <span className="font-mono text-primary font-bold">{order.order_number}</span>
              </p>
              <p className="flex items-center justify-between">
                <span className="font-semibold text-on-surface">Status:</span>{" "}
                <span className="uppercase tracking-wider text-xs font-semibold">{order.status}</span>
              </p>
              <p className="flex items-center justify-between">
                <span className="font-semibold text-on-surface">Payment status:</span>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
                    isPaid ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {order.payment_status}
                </span>
              </p>
              <p className="flex items-center justify-between pt-2 border-t border-outline-variant/20">
                <span className="font-semibold text-on-surface">Total:</span>{" "}
                <span className="text-base font-price-regular font-bold text-primary">
                  ₹{Number.parseFloat(order.total).toLocaleString("en-IN")}
                </span>
              </p>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              {!isPaid && (
                <button
                  type="button"
                  onClick={() => startPaymentFlow(order)}
                  disabled={isPaying}
                  className="inline-flex items-center justify-center gap-2 bg-primary px-6 py-3.5 font-label-caps text-xs font-semibold uppercase tracking-widest text-on-primary hover:bg-primary-container transition-colors disabled:opacity-60 shadow-sm"
                >
                  {isPaying ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Opening Payment…
                    </>
                  ) : (
                    <>
                      <CreditCard size={14} />
                      Pay Now / Retry
                    </>
                  )}
                </button>
              )}
              <Link
                href="/account"
                className="inline-flex items-center justify-center bg-inverse-surface px-6 py-3.5 font-label-caps text-xs font-semibold uppercase tracking-widest text-on-primary hover:bg-on-surface transition-colors shadow-sm"
              >
                View Orders
              </Link>
              <Link
                href="/products"
                className="inline-flex items-center justify-center border border-outline-variant/50 bg-surface px-6 py-3.5 font-label-caps text-xs font-semibold uppercase tracking-widest text-on-surface hover:bg-surface-container transition-colors"
              >
                Continue Shopping
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // ── CART LOADING SPINNER ───────────────────────────────────
  if (cartLoading) {
    return (
      <main className="min-h-screen bg-background text-on-surface">
        <Header />
        <div className="flex min-h-[60vh] items-center justify-center pt-32 text-sm text-text-muted">
          <Loader2 className="mr-2 animate-spin text-primary" size={16} />
          Loading your bag…
        </div>
        <Footer />
      </main>
    );
  }

  // ── EMPTY CART GATE ────────────────────────────────────────
  if (!hasItems) {
    return (
      <div className="min-h-screen bg-page-bg text-on-surface">
        <Header />
        <main className="mx-auto max-w-xl px-4 sm:px-6 pb-20 pt-28 text-center sm:pt-36">
          <div className="bg-surface-card p-8 sm:p-12 shadow-sm border border-outline-variant/30">
            <span className="font-label-caps text-[10px] font-semibold uppercase tracking-widest text-primary">
              Private Atelier Order
            </span>
            <h1 className="mt-2 font-headline-lg text-2xl sm:text-3xl text-on-surface">
              Your bag is empty
            </h1>
            <p className="mt-3 text-sm text-text-muted font-body leading-relaxed">
              Add a few handcrafted statement pieces from our collection before checking out.
            </p>
            <Link
              href="/products"
              className="mt-6 inline-flex items-center justify-center bg-primary px-7 py-3.5 font-label-caps text-xs font-semibold uppercase tracking-widest text-on-primary hover:bg-primary-container transition-all shadow-sm"
            >
              Shop now
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-page-bg text-on-surface font-body selection:bg-primary selection:text-on-primary">
      {/* ── Global Header ─────────────────────────────────────── */}
      <Header />

      <main className="w-full pt-20">
        {/* ── Top Luxury Checkout Utility Banner (Distraction-Free) ── */}
        <section className="w-full bg-surface-container-low/80 py-3 px-4 sm:px-6 lg:px-12 border-b border-outline-variant/30">
          <div className="max-w-[1400px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-on-surface-variant font-label-caps text-[11px] tracking-widest uppercase">
            <div className="flex items-center gap-2">
              <ShieldCheck className="text-primary" size={16} />
              <span>256-Bit Bank-Grade SSL Encrypted Checkout</span>
            </div>
            <div className="flex items-center gap-6">
              <a
                href="tel:+919820154321"
                className="flex items-center gap-1.5 hover:text-primary transition-colors normal-case font-body text-xs tracking-normal"
              >
                <Headphones size={15} className="text-terracotta" />
                <span>
                  Atelier Concierge: <strong className="text-on-surface font-semibold">+91 98201 54321</strong>
                </span>
              </a>
              <div className="hidden md:flex items-center gap-1.5 text-secondary">
                <Sparkles size={14} />
                <span>Authentic Handcrafted Couture Guarantee</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── Stepper & Checkout Header Bar (Matched with Cart Page) ── */}
        <section className="w-full bg-surface-container-low py-8 px-6 lg:px-12 border-b border-outline-variant/30">
          <div className="max-w-[1440px] mx-auto flex flex-col gap-6">
            {/* Stepper Navigation */}
            <nav
              aria-label="Checkout Progress"
              className="flex items-center justify-between max-w-2xl mx-auto w-full"
            >
              {/* Step 1: Completed */}
              <Link
                href="/cart"
                className="flex items-center gap-3 group transition-opacity"
              >
                <span className="w-7 h-7 flex items-center justify-center bg-primary text-on-primary font-label-caps text-label-caps rounded-full shadow-sm font-bold text-xs">
                  <Check size={14} strokeWidth={2.5} />
                </span>
                <span className="font-label-caps text-label-caps tracking-widest text-primary uppercase font-bold group-hover:underline">
                  Shopping Bag
                </span>
              </Link>
              <div className="h-0.5 flex-1 mx-4 bg-outline-variant/50" />
              {/* Step 2: Active */}
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 flex items-center justify-center bg-primary text-on-primary font-label-caps text-label-caps rounded-full shadow-sm font-bold text-xs">
                  2
                </span>
                <span className="font-label-caps text-label-caps tracking-widest text-primary uppercase font-bold">
                  Delivery Address
                </span>
              </div>
              <div className="h-0.5 flex-1 mx-4 bg-outline-variant/50" />
              {/* Step 3: Upcoming */}
              <div className="flex items-center gap-3 opacity-60">
                <span className="w-7 h-7 flex items-center justify-center bg-surface-container-highest text-on-surface font-label-caps text-label-caps rounded-full text-xs">
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
                  Express Concierge Checkout
                </h1>
                <span className="font-title-editorial text-title-editorial text-tertiary italic">
                  ({itemCount} {itemCount === 1 ? "Piece" : "Pieces"} in Bag)
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-surface px-3 py-1.5 border border-outline-variant/40 text-on-surface-variant font-label-caps text-xs">
                  <Lock size={13} className="text-primary" />
                  <span>
                    Checkout ID:{" "}
                    <strong className="font-mono text-on-surface font-semibold">
                      CBL-9482-BOM
                    </strong>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Main Checkout Content Grid ──────────────────────── */}
        <section className="w-full pb-20 px-4 sm:px-6 lg:px-12 bg-page-bg">
          <div className="max-w-[1400px] mx-auto pt-8">
            <div className="mb-6">
              <Link
                href="/cart"
                className="inline-flex items-center gap-2 font-label-caps text-xs uppercase tracking-wider text-text-muted hover:text-primary transition-colors"
              >
                <ArrowLeft size={14} />
                <span>Return to Shopping Bag</span>
              </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
              {/* ── Left Column: Shipping & Preferences (7 of 12) ──── */}
              <div className="lg:col-span-7 flex flex-col gap-8">
                {/* SECTION 1: DELIVERY DESTINATION */}
                <div className="bg-surface-card p-6 md:p-8 shadow-xs border border-outline-variant/30 relative">
                  <div className="flex items-center justify-between pb-6 border-b border-outline-variant/20">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold font-label-caps text-xs">
                        1
                      </div>
                      <div>
                        <h2 className="font-headline-sm text-lg sm:text-xl text-on-surface font-semibold">
                          Select Delivery Destination
                        </h2>
                        <p className="font-body text-xs text-text-muted mt-0.5">
                          Deliver to your registered address or request bespoke boutique drop-off
                        </p>
                      </div>
                    </div>
                    {user?.email && (
                      <span className="font-label-caps text-[11px] uppercase tracking-widest text-primary font-semibold hidden sm:inline-block">
                        Logged in: {user.email.split("@")[0]}
                      </span>
                    )}
                  </div>

                  {/* Saved Addresses Cards */}
                  <div className="pt-5">
                    {isLoadingAddresses ? (
                      <div className="p-6 text-center text-xs text-text-muted bg-surface-container-low border border-dashed border-outline-variant/40">
                        <Loader2 size={16} className="animate-spin inline-block mr-2 text-primary" />
                        Loading saved addresses…
                      </div>
                    ) : addresses.length === 0 ? (
                      <div className="p-6 text-center text-xs text-text-muted bg-surface-container-low border border-dashed border-outline-variant/40">
                        No saved addresses found. Please add a delivery address below.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {addresses.map((addr) => {
                          const isSelected = selectedAddressId === addr.id;
                          return (
                            <label
                              key={addr.id}
                              className={`cursor-pointer relative p-5 flex flex-col justify-between shadow-2xs transition-all border ${
                                isSelected
                                  ? "bg-surface ring-2 ring-primary border-primary shadow-xs"
                                  : "bg-surface-container-low border-outline-variant/30 hover:bg-surface"
                              }`}
                            >
                              <input
                                type="radio"
                                name="shipping-address"
                                checked={isSelected}
                                onChange={() => setSelectedAddressId(addr.id)}
                                className="sr-only"
                              />
                              <div className="flex flex-col gap-2">
                                <div className="flex items-center justify-between">
                                  <span
                                    className={`font-label-caps text-[9px] px-2 py-0.5 tracking-wider uppercase font-semibold ${
                                      addr.is_default
                                        ? "bg-primary text-on-primary"
                                        : "bg-surface-variant text-on-surface-variant"
                                    }`}
                                  >
                                    {addr.is_default ? "DEFAULT RESIDENCE" : addr.address_type}
                                  </span>
                                  {isSelected ? (
                                    <CheckCircle2 size={18} className="text-primary fill-primary/10" />
                                  ) : (
                                    <span className="w-4 h-4 rounded-full border border-outline-variant/60" />
                                  )}
                                </div>
                                <h3 className="font-title-editorial text-sm sm:text-base text-on-surface pt-1 font-semibold">
                                  {addr.full_name}
                                </h3>
                                <p className="font-body text-xs text-on-surface-variant leading-relaxed">
                                  {addr.address_line1}
                                  {addr.address_line2 ? `, ${addr.address_line2}` : ""}
                                  <br />
                                  {addr.city}, {addr.state} —{" "}
                                  <strong className="text-on-surface font-semibold">
                                    {addr.postal_code}
                                  </strong>
                                </p>
                                <p className="font-body text-xs text-text-muted mt-1 flex items-center gap-1.5">
                                  <Phone size={13} className="text-terracotta" />
                                  <span>{addr.phone}</span>
                                </p>
                              </div>
                              <div className="flex items-center justify-between pt-4 mt-2 border-t border-outline-variant/20">
                                <span
                                  className={`font-label-caps text-[10px] uppercase tracking-wider font-bold flex items-center gap-1 ${
                                    isSelected ? "text-primary" : "text-text-muted"
                                  }`}
                                >
                                  {isSelected ? "Deliver Here" : "Select Destination"}
                                  <ArrowRight size={12} />
                                </span>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Add New Address Toggle & Form */}
                  <div className="pt-6">
                    <button
                      type="button"
                      id="toggle-new-address"
                      onClick={() => setIsAddressFormOpen(!isAddressFormOpen)}
                      className="w-full py-3 px-4 bg-surface-container-low text-on-surface hover:bg-surface-container transition-all flex items-center justify-center gap-2 font-label-caps text-xs uppercase tracking-wider font-semibold border border-outline-variant/40"
                    >
                      <PlusCircle size={16} className="text-primary" />
                      <span>{isAddressFormOpen ? "Cancel New Address" : "Add new address"}</span>
                    </button>

                    {isAddressFormOpen && (
                      <form
                        onSubmit={handleSubmitAddress}
                        className="mt-4 bg-surface p-6 shadow-xs border border-outline-variant/30"
                      >
                        <h4 className="font-headline-sm text-base text-on-surface mb-4 font-semibold">
                          Add Bespoke Delivery Details
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <label className="block font-label-caps text-xs uppercase text-text-muted">
                            <span>Full name</span>
                            <input
                              required
                              type="text"
                              value={addressForm.full_name}
                              onChange={(e) =>
                                setAddressForm((c) => ({ ...c, full_name: e.target.value }))
                              }
                              className="w-full mt-1.5 bg-surface-container-low p-3 text-xs font-body text-on-surface focus:outline-none focus:bg-surface border border-outline-variant/40 focus:border-primary transition-colors"
                            />
                          </label>

                          <label className="block font-label-caps text-xs uppercase text-text-muted">
                            <span>Phone</span>
                            <input
                              required
                              type="tel"
                              value={addressForm.phone}
                              onChange={(e) =>
                                setAddressForm((c) => ({ ...c, phone: e.target.value }))
                              }
                              className="w-full mt-1.5 bg-surface-container-low p-3 text-xs font-body text-on-surface focus:outline-none focus:bg-surface border border-outline-variant/40 focus:border-primary transition-colors"
                            />
                          </label>

                          <label className="md:col-span-2 block font-label-caps text-xs uppercase text-text-muted">
                            <span>Address line 1</span>
                            <input
                              required
                              type="text"
                              value={addressForm.address_line1}
                              onChange={(e) =>
                                setAddressForm((c) => ({ ...c, address_line1: e.target.value }))
                              }
                              className="w-full mt-1.5 bg-surface-container-low p-3 text-xs font-body text-on-surface focus:outline-none focus:bg-surface border border-outline-variant/40 focus:border-primary transition-colors"
                            />
                          </label>

                          <label className="md:col-span-2 block font-label-caps text-xs uppercase text-text-muted">
                            <span>Address line 2</span>
                            <input
                              type="text"
                              value={addressForm.address_line2}
                              onChange={(e) =>
                                setAddressForm((c) => ({ ...c, address_line2: e.target.value }))
                              }
                              className="w-full mt-1.5 bg-surface-container-low p-3 text-xs font-body text-on-surface focus:outline-none focus:bg-surface border border-outline-variant/40 focus:border-primary transition-colors"
                            />
                          </label>

                          <label className="block font-label-caps text-xs uppercase text-text-muted">
                            <span>Postal code</span>
                            <input
                              required
                              type="text"
                              value={addressForm.postal_code}
                              onChange={(e) =>
                                setAddressForm((c) => ({ ...c, postal_code: e.target.value }))
                              }
                              className="w-full mt-1.5 bg-surface-container-low p-3 text-xs font-body text-on-surface focus:outline-none focus:bg-surface border border-outline-variant/40 focus:border-primary transition-colors"
                            />
                          </label>

                          <label className="block font-label-caps text-xs uppercase text-text-muted">
                            <span>City</span>
                            <input
                              required
                              type="text"
                              value={addressForm.city}
                              onChange={(e) =>
                                setAddressForm((c) => ({ ...c, city: e.target.value }))
                              }
                              className="w-full mt-1.5 bg-surface-container-low p-3 text-xs font-body text-on-surface focus:outline-none focus:bg-surface border border-outline-variant/40 focus:border-primary transition-colors"
                            />
                          </label>

                          <label className="block font-label-caps text-xs uppercase text-text-muted">
                            <span>State</span>
                            <input
                              required
                              type="text"
                              value={addressForm.state}
                              onChange={(e) =>
                                setAddressForm((c) => ({ ...c, state: e.target.value }))
                              }
                              className="w-full mt-1.5 bg-surface-container-low p-3 text-xs font-body text-on-surface focus:outline-none focus:bg-surface border border-outline-variant/40 focus:border-primary transition-colors"
                            />
                          </label>

                          <label className="block font-label-caps text-xs uppercase text-text-muted">
                            <span>Country</span>
                            <input
                              type="text"
                              value={addressForm.country}
                              onChange={(e) =>
                                setAddressForm((c) => ({ ...c, country: e.target.value }))
                              }
                              className="w-full mt-1.5 bg-surface-container-low p-3 text-xs font-body text-on-surface focus:outline-none focus:bg-surface border border-outline-variant/40 focus:border-primary transition-colors"
                            />
                          </label>

                          <div className="md:col-span-2 pt-1">
                            <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-on-surface">
                              <input
                                type="checkbox"
                                checked={addressForm.is_default}
                                onChange={(e) =>
                                  setAddressForm((c) => ({ ...c, is_default: e.target.checked }))
                                }
                                className="h-4 w-4 accent-primary"
                              />
                              <span>Set as default address</span>
                            </label>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 pt-5 mt-4 border-t border-outline-variant/20">
                          <button
                            type="submit"
                            className="bg-primary text-on-primary font-label-caps text-xs uppercase px-6 py-3 tracking-widest hover:bg-primary-container transition-colors shadow-xs font-semibold"
                          >
                            Save address
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsAddressFormOpen(false)}
                            className="bg-transparent text-text-muted hover:text-on-surface font-label-caps text-xs uppercase px-4 py-3 tracking-wider"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    )}
                  </div>

                  {/* Delivery Experience Tier Selection */}
                  <div className="pt-6 mt-6 border-t border-outline-variant/20">
                    <label className="font-label-caps text-xs uppercase tracking-wider text-text-muted block mb-3 font-semibold">
                      Choose Delivery Experience
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Option A: Standard Express */}
                      <label
                        className={`cursor-pointer p-4 flex items-start gap-3.5 transition-all border ${
                          shippingTier === "standard"
                            ? "bg-surface ring-2 ring-primary border-primary shadow-xs"
                            : "bg-surface-container-low border-outline-variant/30 hover:bg-surface"
                        }`}
                      >
                        <input
                          type="radio"
                          name="shipping_tier"
                          value="standard"
                          checked={shippingTier === "standard"}
                          onChange={() => setShippingTier("standard")}
                          className="mt-1 accent-primary"
                        />
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="font-label-ui text-xs font-bold text-on-surface">
                              Standard Express Dispatch
                            </span>
                            <span className="bg-secondary text-on-secondary font-label-caps text-[9px] px-1.5 py-0.5 uppercase tracking-wider font-semibold">
                              Free
                            </span>
                          </div>
                          <p className="font-body text-xs text-text-muted mt-1 leading-snug">
                            Express air dispatch across India within 24–48 hours via Bluedart.
                          </p>
                        </div>
                      </label>

                      {/* Option B: White-Glove Atelier Delivery */}
                      <label
                        className={`cursor-pointer p-4 flex items-start gap-3.5 transition-all border ${
                          shippingTier === "atelier"
                            ? "bg-surface ring-2 ring-primary border-primary shadow-xs"
                            : "bg-surface-container-low border-outline-variant/30 hover:bg-surface"
                        }`}
                      >
                        <input
                          type="radio"
                          name="shipping_tier"
                          value="atelier"
                          checked={shippingTier === "atelier"}
                          onChange={() => setShippingTier("atelier")}
                          className="mt-1 accent-primary"
                        />
                        <div className="flex flex-col">
                          <div className="flex items-center justify-between w-full">
                            <span className="font-label-ui text-xs font-bold text-primary flex items-center gap-1">
                              <Sparkles size={14} />
                              Handcrafted Atelier Delivery
                            </span>
                            <span className="font-price-regular text-xs font-bold text-on-surface">
                              ₹299
                            </span>
                          </div>
                          <p className="font-body text-xs text-on-surface-variant mt-1 leading-snug">
                            Keepsake garment bag, custom wooden hanger, and master tailor trial support.
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>

                {/* SECTION 2: GIFT OPTIONS & PERSONAL MESSAGE CARD */}
                <div className="bg-surface-card p-6 md:p-8 shadow-xs border border-outline-variant/30 relative">
                  <div className="flex items-center justify-between pb-4 border-b border-outline-variant/20">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-primary font-bold">
                        <Gift size={18} />
                      </div>
                      <div>
                        <h2 className="font-headline-sm text-lg sm:text-xl text-on-surface font-semibold">
                          Gift Options &amp; Personal Message
                        </h2>
                        <p className="font-body text-xs text-text-muted mt-0.5">
                          Complimentary bespoke packaging with signature wax seal &amp; handwritten calligraphy note
                        </p>
                      </div>
                    </div>
                    <span className="bg-secondary/10 text-secondary font-label-caps text-[10px] px-2.5 py-1 tracking-wider uppercase font-semibold border border-secondary/20">
                      Complimentary
                    </span>
                  </div>

                  <div className="pt-5 flex flex-col gap-4">
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={packInKeepsakeBox}
                        onChange={(e) => setPackInKeepsakeBox(e.target.checked)}
                        className="mt-1 accent-primary w-4 h-4 cursor-pointer"
                      />
                      <div className="flex flex-col">
                        <span className="font-label-ui text-xs font-semibold text-on-surface group-hover:text-primary transition-colors">
                          Pack in Signature Royal Keepsake Box
                        </span>
                        <p className="font-body text-xs text-text-muted">
                          Rigid crimson keepsake archive box tied with gold satin sash ribbons.
                        </p>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={includeWaxSealNote}
                        onChange={(e) => setIncludeWaxSealNote(e.target.checked)}
                        className="mt-1 accent-primary w-4 h-4 cursor-pointer"
                      />
                      <div className="flex flex-col">
                        <span className="font-label-ui text-xs font-semibold text-on-surface group-hover:text-primary transition-colors">
                          Include Wax-Sealed Parchment Note
                        </span>
                        <p className="font-body text-xs text-text-muted">
                          Hand-inscribed note prepared by our Jaipur studio calligraphy master.
                        </p>
                      </div>
                    </label>

                    <div className="pt-2">
                      <label className="block font-label-caps text-xs uppercase text-text-muted mb-1.5 font-semibold">
                        Personal Note / Gift Message (Optional)
                      </label>
                      <textarea
                        rows={3}
                        value={giftMessage}
                        onChange={(e) => setGiftMessage(e.target.value)}
                        placeholder="Write your special message here (e.g. Wishing you festive grace and radiance on your special celebration...)"
                        className="w-full bg-surface-container-low p-3.5 text-xs font-body text-on-surface border border-outline-variant/40 focus:outline-none focus:bg-surface focus:border-primary transition-all resize-none"
                      />
                    </div>
                  </div>
                </div>

                {/* SECTION 3: DELIVERY INSTRUCTIONS & SECURITY GATE */}
                <div className="bg-surface-card p-6 md:p-8 shadow-xs border border-outline-variant/30 relative">
                  <div className="flex items-center gap-3 pb-4 border-b border-outline-variant/20">
                    <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-primary font-bold">
                      <MapPin size={18} />
                    </div>
                    <div>
                      <h2 className="font-headline-sm text-lg sm:text-xl text-on-surface font-semibold">
                        Delivery Instructions &amp; Security Gate
                      </h2>
                      <p className="font-body text-xs text-text-muted mt-0.5">
                        Guide our delivery concierge for effortless doorstep handover
                      </p>
                    </div>
                  </div>

                  <div className="pt-5 flex flex-col gap-4">
                    <label className="font-label-caps text-xs uppercase tracking-wider text-text-muted block font-semibold">
                      Quick Preferences
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {["Leave at Reception / Gate", "Call Upon Arrival", "Ring Doorbell Directly"].map(
                        (pref) => {
                          const isChecked = deliveryPref.includes(pref);
                          return (
                            <label
                              key={pref}
                              onClick={() => toggleDeliveryPref(pref)}
                              className={`flex items-center gap-2.5 p-3 border cursor-pointer transition-all ${
                                isChecked
                                  ? "bg-surface border-primary text-primary font-semibold"
                                  : "bg-surface-container-low border-outline-variant/30 text-on-surface hover:bg-surface"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {}}
                                className="accent-primary"
                              />
                              <span className="font-body text-xs font-medium">{pref}</span>
                            </label>
                          );
                        }
                      )}
                    </div>

                    <div className="pt-2">
                      <label className="block font-label-caps text-xs uppercase text-text-muted mb-1.5 font-semibold">
                        Specific Dispatch Note (Optional)
                      </label>
                      <input
                        type="text"
                        value={dispatchNote}
                        onChange={(e) => setDispatchNote(e.target.value)}
                        placeholder="e.g. Please enter via Gate 2, Sea Pearl Apt, notify intercom 402"
                        className="w-full bg-surface-container-low p-3 text-xs font-body text-on-surface border border-outline-variant/40 focus:outline-none focus:bg-surface focus:border-primary transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Right Column: Order Summary & Ledger (5 of 12 Sticky) ── */}
              <div className="lg:col-span-5 sticky top-24 flex flex-col gap-6">
                {/* Order Summary Card */}
                <div className="bg-surface-card p-6 md:p-7 shadow-xs border border-outline-variant/30 relative">
                  <div className="flex items-center justify-between pb-4 border-b border-outline-variant/20">
                    <h2 className="font-headline-sm text-lg text-on-surface font-semibold">
                      Private Cart Details
                    </h2>
                    <span className="font-label-caps text-xs uppercase text-text-muted font-semibold">
                      {itemCount} {itemCount === 1 ? "Piece" : "Pieces"}
                    </span>
                  </div>

                  {/* Line Items List */}
                  <div className="flex flex-col gap-4 py-4 divide-y divide-outline-variant/20">
                    {cart?.items.map((item) => {
                      const unitPrice = Number.parseFloat(item.unit_price) || 0;
                      const lineTotal = Number.parseFloat(item.line_total) || unitPrice * item.quantity;
                      return (
                        <div key={item.id} className="flex items-start gap-3.5 pt-3 first:pt-0">
                          {/* Image Thumbnail or Brand Mark Fallback */}
                          <div className="w-16 h-20 bg-surface-container flex items-center justify-center shrink-0 border border-outline-variant/30 overflow-hidden relative">
                            {item.variant.product.category_slug ? (
                              <div className="w-full h-full bg-[#8b000a]/10 flex flex-col items-center justify-center text-center p-1">
                                <span className="font-headline-sm text-xs font-bold text-primary">CBC</span>
                                <span className="text-[8px] uppercase tracking-tighter text-outline mt-0.5 line-clamp-1">
                                  {item.variant.color}
                                </span>
                              </div>
                            ) : (
                              <span className="font-headline-sm text-xs font-bold text-primary">CBC</span>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <span className="font-label-caps text-[9px] uppercase tracking-widest text-primary font-bold">
                              {item.variant.product.category_name || "Silhouettes"}
                            </span>
                            <h3 className="font-title-editorial text-sm text-on-surface truncate font-semibold">
                              {item.variant.product.name}
                            </h3>
                            <p className="font-body text-xs text-text-muted mt-0.5">
                              Size: <strong className="text-on-surface">{item.variant.size}</strong> | Color:{" "}
                              <strong className="text-on-surface">{item.variant.color}</strong> | Qty:{" "}
                              <strong className="text-on-surface">{item.quantity}</strong>
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="font-price-regular text-xs font-bold text-on-surface">
                                ₹{lineTotal.toLocaleString("en-IN")}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Applied Privilege Voucher */}
                  <div className="py-3">
                    <div className="bg-surface-container-low p-3.5 flex items-center justify-between border border-outline-variant/30">
                      <div className="flex items-center gap-2.5">
                        <Tag size={16} className="text-primary" />
                        <div className="flex flex-col">
                          <span className="font-label-caps text-xs uppercase tracking-wider text-on-surface font-bold">
                            ATELIER PRIVILEGE ACTIVE
                          </span>
                          <span className="font-body text-[11px] text-primary">
                            Complimentary shipping on orders above ₹2,999
                          </span>
                        </div>
                      </div>
                      <span className="font-label-caps text-[10px] uppercase text-secondary font-bold">
                        VERIFIED
                      </span>
                    </div>
                  </div>

                  {/* Keepsake Packaging Highlight */}
                  {packInKeepsakeBox && (
                    <div className="py-2.5 bg-surface p-3 flex items-start gap-3 my-1 border border-outline-variant/30">
                      <Gift size={18} className="text-terracotta shrink-0 mt-0.5" />
                      <div className="flex flex-col">
                        <span className="font-label-ui text-xs font-semibold text-on-surface">
                          Complimentary Royal Keepsake Box
                        </span>
                        <p className="font-body text-[11px] text-text-muted leading-relaxed">
                          Crimson rigid archive box, gold satin sash ribbons, and wax-sealed note.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Price Breakdown Ledger */}
                  <div className="flex flex-col gap-2.5 pt-4 border-t border-outline-variant/20 text-xs font-body">
                    <div className="flex justify-between items-center text-on-surface-variant">
                      <span>Cart Subtotal (MRP)</span>
                      <span className="font-price-regular text-on-surface font-semibold">
                        ₹{itemTotal.toLocaleString("en-IN")}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-on-surface-variant">
                      <span>Delivery Experience</span>
                      <span className="font-price-regular text-secondary font-bold uppercase text-[11px]">
                        {shippingTier === "atelier" ? "₹299" : "FREE (COMPLIMENTARY)"}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-text-muted text-[11px]">
                      <span>Integrated GST (12%)</span>
                      <span>Included in price</span>
                    </div>

                    {/* Grand Total */}
                    <div className="flex justify-between items-baseline pt-4 mt-2 border-t border-outline-variant/30">
                      <div className="flex flex-col">
                        <span className="font-headline-sm text-base text-on-surface font-bold">
                          Total Amount
                        </span>
                        <span className="font-label-caps text-[10px] uppercase text-text-muted">
                          Inclusive of all taxes
                        </span>
                      </div>
                      <span className="font-display-hero-mobile text-2xl sm:text-3xl font-bold text-primary">
                        ₹{grandTotal.toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>

                  {/* Inline Error Surface */}
                  {formError && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 text-xs font-body text-red-700 flex items-start gap-2">
                      <ShieldAlert size={16} className="text-red-600 shrink-0 mt-0.5" />
                      <span>{formError}</span>
                    </div>
                  )}

                  {/* Primary CTA: Place order & Proceed to Payment */}
                  <div className="pt-5">
                    <button
                      type="button"
                      aria-label="Place order"
                      id="btn-confirm-checkout"
                      onClick={handlePlaceOrder}
                      disabled={isSubmitting || isPaying || !selectedAddressId}
                      className="w-full bg-primary hover:bg-primary-container text-on-primary font-label-caps text-xs uppercase tracking-[0.16em] py-4 px-6 font-bold shadow-md transition-all flex items-center justify-center gap-2 group active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {isSubmitting || isPaying ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          <span>Routing to Secure Gateway…</span>
                        </>
                      ) : (
                        <>
                          <span>Proceed to Payment</span>
                          <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
                    </button>
                    <p className="font-body text-[11px] text-text-muted text-center mt-2.5 flex items-center justify-center gap-1">
                      <Verified size={13} className="text-secondary" />
                      <span>Instant SMS &amp; WhatsApp confirmation with live tracking link</span>
                    </p>
                  </div>
                </div>

                {/* Trust & Guarantee Badges */}
                <div className="bg-surface-card p-5 shadow-xs border border-outline-variant/30 flex flex-col gap-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-primary shrink-0 border border-primary/20">
                      <ShieldCheck size={18} />
                    </div>
                    <div>
                      <h4 className="font-label-ui text-xs font-bold text-on-surface">
                        Handloom Silk Authenticity
                      </h4>
                      <p className="font-body text-[11px] text-text-muted">
                        Certified Mulberry Silk weaving and ethical artisan payroll.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-secondary shrink-0 border border-secondary/20">
                      <Sparkles size={18} />
                    </div>
                    <div>
                      <h4 className="font-label-ui text-xs font-bold text-on-surface">
                        7-Day Doorstep Fit Alterations
                      </h4>
                      <p className="font-body text-[11px] text-text-muted">
                        Complimentary master tailor pickup &amp; custom sleeve/hem refits.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-primary shrink-0 border border-primary/20">
                      <Lock size={18} />
                    </div>
                    <div>
                      <h4 className="font-label-ui text-xs font-bold text-on-surface">
                        Escrow Buyer Protection
                      </h4>
                      <p className="font-body text-[11px] text-text-muted">
                        Zero fraud liability with PCI-DSS 3.2.1 Level 1 certification.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ── Global Footer ─────────────────────────────────────── */}
      <Footer />
    </div>
  );
}
