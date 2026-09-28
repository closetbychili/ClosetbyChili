"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Loader2, MapPin, ShieldCheck, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useAuth } from "@/components/AuthProvider";
import { useCart } from "@/components/CartContext";
import { createAddress, getAddresses, placeOrder, type Address, type CheckoutOrder } from "@/lib/api";

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
  const { cart, itemCount, subtotal, isLoading: cartLoading } = useCart();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [isAddressFormOpen, setIsAddressFormOpen] = useState(false);
  const [addressForm, setAddressForm] = useState(emptyAddressForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(true);
  const [order, setOrder] = useState<CheckoutOrder | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user || !session?.access_token) return;

    let active = true;
    setIsLoadingAddresses(true);
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
  const hasItems = (cart?.items?.length ?? 0) > 0;

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

  const handlePlaceOrder = async () => {
    if (!selectedAddressId || !user || !session?.access_token) {
      setFormError("Please choose a delivery address before placing the order.");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const created = await placeOrder(
        {
          shipping_address_id: selectedAddressId,
          idempotency_key: `checkout-${user.id}-${Date.now()}`,
        },
        session.access_token
      );
      setOrder(created);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "We could not place your order.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || !user) {
    return (
      <main className="min-h-screen bg-[#fff8f7] text-[#111111]">
        <Header />
        <div className="flex min-h-[60vh] items-center justify-center pt-32 text-sm text-ink/60">
          <Loader2 className="mr-2 animate-spin" size={16} />
          Preparing checkout…
        </div>
        <Footer />
      </main>
    );
  }

  if (order) {
    return (
      <div className="min-h-screen bg-[#fff8f7]">
        <Header />
        <main className="mx-auto max-w-3xl px-5 pb-20 pt-28 sm:pt-34">
          <div className="rounded-2xl border border-emerald-200 bg-white p-8 shadow-sm">
            <div className="flex items-center gap-3 text-emerald-700">
              <CheckCircle2 className="h-10 w-10" />
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em]">Order placed</p>
                <h1 className="font-display text-3xl text-ink">Thank you for your order</h1>
              </div>
            </div>

            <div className="mt-6 space-y-3 rounded-xl bg-[#f7f2ee] p-5 text-sm text-ink/80">
              <p>
                <span className="font-semibold text-ink">Order number:</span> {order.order_number}
              </p>
              <p>
                <span className="font-semibold text-ink">Status:</span> {order.status}
              </p>
              <p>
                <span className="font-semibold text-ink">Payment status:</span> {order.payment_status}
              </p>
              <p>
                <span className="font-semibold text-ink">Total:</span> ₹{Number.parseFloat(order.total).toLocaleString("en-IN")}
              </p>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/account"
                className="inline-flex items-center justify-center rounded-full bg-[#8b000a] px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#fff8f7]"
              >
                View Orders
              </Link>
              <Link
                href="/products"
                className="inline-flex items-center justify-center rounded-full border border-ink/15 bg-white px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-ink"
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

  if (!hasItems) {
    return (
      <div className="min-h-screen bg-[#fff8f7]">
        <Header />
        <main className="mx-auto max-w-xl px-5 pb-20 pt-28 text-center sm:pt-36">
          <div className="rounded-2xl border border-ink/10 bg-white p-10 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8b000a]">Checkout</p>
            <h1 className="mt-3 font-display text-3xl text-ink">Your bag is empty</h1>
            <p className="mt-3 text-sm text-ink/60">Add a few statement pieces before checking out.</p>
            <Link
              href="/products"
              className="mt-6 inline-flex items-center justify-center rounded-full bg-[#8b000a] px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#fff8f7]"
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
    <div className="min-h-screen bg-[#fff8f7] text-[#111111]">
      <Header />
      <main className="mx-auto max-w-6xl px-5 pb-20 pt-28 sm:pt-34">
        <div className="mb-8 flex items-center gap-3">
          <Link href="/cart" className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-ink/60">
            <ArrowLeft size={15} />
            Back to bag
          </Link>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="space-y-6">
            <div className="rounded-2xl border border-ink/10 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8b000a]">Shipping</p>
                  <h1 className="mt-2 font-display text-2xl text-ink">Delivery address</h1>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddressFormOpen((current) => !current)}
                  className="rounded-full border border-ink/15 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-ink/70"
                >
                  {isAddressFormOpen ? 'Cancel' : '+ Add new address'}
                </button>
              </div>

              {isAddressFormOpen && (
                <form onSubmit={handleSubmitAddress} className="mt-6 grid gap-4 rounded-xl border border-ink/8 bg-[#fffaf9] p-4 sm:grid-cols-2">
                  <label className="sm:col-span-2 text-xs font-medium uppercase tracking-[0.18em] text-ink/60">
                    Full name
                    <input
                      required
                      value={addressForm.full_name}
                      onChange={(event) => setAddressForm((current) => ({ ...current, full_name: event.target.value }))}
                      className="mt-2 w-full rounded-md border border-ink/10 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-[#8b000a]"
                    />
                  </label>
                  <label className="text-xs font-medium uppercase tracking-[0.18em] text-ink/60">
                    Phone
                    <input
                      required
                      value={addressForm.phone}
                      onChange={(event) => setAddressForm((current) => ({ ...current, phone: event.target.value }))}
                      className="mt-2 w-full rounded-md border border-ink/10 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-[#8b000a]"
                    />
                  </label>
                  <label className="text-xs font-medium uppercase tracking-[0.18em] text-ink/60">
                    Postal code
                    <input
                      required
                      value={addressForm.postal_code}
                      onChange={(event) => setAddressForm((current) => ({ ...current, postal_code: event.target.value }))}
                      className="mt-2 w-full rounded-md border border-ink/10 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-[#8b000a]"
                    />
                  </label>
                  <label className="sm:col-span-2 text-xs font-medium uppercase tracking-[0.18em] text-ink/60">
                    Address line 1
                    <input
                      required
                      value={addressForm.address_line1}
                      onChange={(event) => setAddressForm((current) => ({ ...current, address_line1: event.target.value }))}
                      className="mt-2 w-full rounded-md border border-ink/10 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-[#8b000a]"
                    />
                  </label>
                  <label className="sm:col-span-2 text-xs font-medium uppercase tracking-[0.18em] text-ink/60">
                    Address line 2
                    <input
                      value={addressForm.address_line2}
                      onChange={(event) => setAddressForm((current) => ({ ...current, address_line2: event.target.value }))}
                      className="mt-2 w-full rounded-md border border-ink/10 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-[#8b000a]"
                    />
                  </label>
                  <label className="text-xs font-medium uppercase tracking-[0.18em] text-ink/60">
                    Landmark
                    <input
                      value={addressForm.landmark}
                      onChange={(event) => setAddressForm((current) => ({ ...current, landmark: event.target.value }))}
                      className="mt-2 w-full rounded-md border border-ink/10 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-[#8b000a]"
                    />
                  </label>
                  <label className="text-xs font-medium uppercase tracking-[0.18em] text-ink/60">
                    City
                    <input
                      required
                      value={addressForm.city}
                      onChange={(event) => setAddressForm((current) => ({ ...current, city: event.target.value }))}
                      className="mt-2 w-full rounded-md border border-ink/10 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-[#8b000a]"
                    />
                  </label>
                  <label className="text-xs font-medium uppercase tracking-[0.18em] text-ink/60">
                    State
                    <input
                      required
                      value={addressForm.state}
                      onChange={(event) => setAddressForm((current) => ({ ...current, state: event.target.value }))}
                      className="mt-2 w-full rounded-md border border-ink/10 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-[#8b000a]"
                    />
                  </label>
                  <label className="sm:col-span-2 text-xs font-medium uppercase tracking-[0.18em] text-ink/60">
                    Country
                    <input
                      value={addressForm.country}
                      onChange={(event) => setAddressForm((current) => ({ ...current, country: event.target.value }))}
                      className="mt-2 w-full rounded-md border border-ink/10 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-[#8b000a]"
                    />
                  </label>
                  <div className="sm:col-span-2">
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-ink/60">Address type</p>
                    <div className="flex gap-2 flex-wrap">
                      {(["HOME", "OFFICE", "OTHER"] as const).map((type) => (
                        <button key={type} type="button" onClick={() => setAddressForm((c) => ({ ...c, address_type: type }))}
                          className={`rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] transition ${addressForm.address_type === type ? 'border-[#8b000a] bg-[#fff5f5] text-[#8b000a]' : 'border-ink/15 text-ink/60 hover:border-[#8b000a]/40'}`}>
                          {type.charAt(0) + type.slice(1).toLowerCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-ink/70">
                      <input type="checkbox" checked={addressForm.is_default} onChange={(e) => setAddressForm((c) => ({ ...c, is_default: e.target.checked }))} className="h-4 w-4 accent-[#8b000a] rounded" />
                      Set as default address
                    </label>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-[10px] text-ink/45 flex items-center gap-1">
                      <MapPin size={10} />This address will also be saved to your profile for future checkouts.
                    </p>
                  </div>
                  <div className="sm:col-span-2 flex justify-end">
                    <button
                      type="submit"
                      className="rounded-full bg-[#8b000a] px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#fff8f7]"
                    >
                      Save address
                    </button>
                  </div>
                </form>
              )}

              <div className="mt-6 space-y-3">
                {isLoadingAddresses ? (
                  <div className="rounded-xl border border-dashed border-ink/15 bg-[#fffaf9] p-4 text-sm text-ink/60">
                    Loading saved addresses…
                  </div>
                ) : addresses.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-ink/15 bg-[#fffaf9] p-4 text-sm text-ink/60">
                    No saved addresses yet. Add one to continue.
                  </div>
                ) : (
                  addresses.map((address) => (
                    <label
                      key={address.id}
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${
                        selectedAddressId === address.id
                          ? 'border-[#8b000a] bg-[#fff5f5]'
                          : 'border-ink/10 bg-[#fffaf9]'
                      }`}
                    >
                      <input
                        type="radio"
                        name="shipping-address"
                        checked={selectedAddressId === address.id}
                        onChange={() => setSelectedAddressId(address.id)}
                        className="mt-1 h-4 w-4 accent-[#8b000a]"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-ink">{address.full_name}</p>
                          {address.is_default && (
                            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-emerald-700">
                              Default
                            </span>
                          )}
                        </div>
                        <p className="mt-2 text-sm text-ink/80">
                          {address.address_line1}
                          {address.address_line2 ? `, ${address.address_line2}` : ''}, {address.city}, {address.state}, {address.postal_code}
                        </p>
                        <p className="mt-1 text-xs text-ink/60">{address.phone}</p>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-ink/10 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2 text-[#8b000a]">
                <Sparkles size={16} />
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em]">Security</p>
              </div>
              <div className="mt-4 flex items-start gap-3 rounded-xl bg-[#f7f2ee] p-4">
                <ShieldCheck className="mt-0.5 text-emerald-700" size={18} />
                <p className="text-sm leading-relaxed text-ink/70">
                  Your order will be validated against your current cart and the selected delivery address before it is confirmed.
                </p>
              </div>
            </div>
          </section>

          <aside className="rounded-2xl border border-ink/10 bg-white p-6 shadow-sm">
            <h2 className="font-display text-xl text-ink">Order summary</h2>
            <div className="mt-5 space-y-3">
              {cart?.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 border-b border-ink/8 pb-3 last:border-b-0 last:pb-0">
                  <div>
                    <p className="text-sm font-medium text-ink">{item.variant.product.name}</p>
                    <p className="text-xs text-ink/60">{item.variant.size} / {item.variant.color} · Qty {item.quantity}</p>
                  </div>
                  <p className="text-sm font-semibold text-ink">₹{(Number.parseFloat(item.line_total) || 0).toLocaleString('en-IN')}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 space-y-2 border-t border-ink/8 pt-4 text-sm text-ink/70">
              <div className="flex items-center justify-between">
                <span>Bag subtotal</span>
                <span className="font-semibold text-ink">₹{itemTotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Shipping</span>
                <span className="font-medium text-emerald-700">Complimentary</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Estimated total</span>
                <span className="text-base font-display font-bold text-[#8b000a]">₹{itemTotal.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {formError && (
              <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                {formError}
              </div>
            )}

            <button
              type="button"
              onClick={handlePlaceOrder}
              disabled={isSubmitting || cartLoading || !selectedAddressId}
              className="mt-6 w-full rounded-full bg-[#8b000a] px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#fff8f7] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <Loader2 size={14} className="animate-spin" />
                  Placing order…
                </span>
              ) : (
                'Place order'
              )}
            </button>

            <p className="mt-4 flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-ink/50">
              <MapPin size={12} />
              {itemCount} {itemCount === 1 ? 'item' : 'items'} ready for delivery
            </p>
          </aside>
        </div>
      </main>
      <Footer />
    </div>
  );
}
