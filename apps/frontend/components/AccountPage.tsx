"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Package,
  Heart,
  MapPin,
  LogOut,
  Edit3,
  X,
  Check,
  Loader2,
  Mail,
  Phone,
  AlertCircle,
  Sparkles,
  ChevronRight,
  Plus,
  Trash2,
  Star,
  Home,
  Briefcase,
  MapPinned,
  ShoppingBag,
  ChevronDown,
  ChevronUp,
  Clock,
  Landmark,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useAuth } from "@/components/AuthProvider";
import { updateCurrentProfile } from "@/lib/api/auth";
import { ApiClientError } from "@/lib/api/client";
import {
  getAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
} from "@/lib/api/addresses";
import type { Address, CreateAddressPayload } from "@/lib/api/types";
import { getOrders, type OrderListItem } from "@/lib/api/orders";
import { supabase } from "@/lib/supabase/client";

function getInitials(name: string, fallback: string): string {
  const trimmed = (name || "").trim();
  const source = trimmed.length > 0 ? trimmed : fallback;
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "C";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-800 border-amber-200",
  CONFIRMED: "bg-sky-50 text-sky-800 border-sky-200",
  PROCESSING: "bg-blue-50 text-blue-800 border-blue-200",
  SHIPPED: "bg-purple-50 text-purple-800 border-purple-200",
  DELIVERED: "bg-emerald-50 text-emerald-800 border-emerald-200",
  CANCELLED: "bg-red-50 text-red-800 border-red-200",
};

const ADDRESS_TYPE_ICONS: Record<string, React.ReactNode> = {
  HOME: <Home size={14} strokeWidth={1.75} />,
  OFFICE: <Briefcase size={14} strokeWidth={1.75} />,
  OTHER: <MapPinned size={14} strokeWidth={1.75} />,
};

type ActiveSection = "profile" | "orders" | "wishlist" | "addresses" | "bank";
type SaveStatus =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

const emptyAddressForm: CreateAddressPayload = {
  full_name: "",
  phone: "",
  address_line1: "",
  address_line2: "",
  landmark: "",
  city: "",
  state: "",
  postal_code: "",
  country: "India",
  address_type: "HOME",
  is_default: false,
};

export default function AccountPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, session, loading, signOut } = useAuth();

  const tabParam = searchParams.get("tab") as ActiveSection | null;
  const initialTab: ActiveSection =
    tabParam && ["profile", "orders", "wishlist", "addresses", "bank"].includes(tabParam)
      ? tabParam
      : "profile";

  const [activeSection, setActiveSection] = useState<ActiveSection>(initialTab);

  // Sync tab with URL parameter if it changes
  useEffect(() => {
    if (tabParam && ["profile", "orders", "wishlist", "addresses", "bank"].includes(tabParam)) {
      setActiveSection(tabParam);
    }
  }, [tabParam]);

  // Profile basic info state
  const [editingBasic, setEditingBasic] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [gender, setGender] = useState("Female");
  const [dob, setDob] = useState("14/08/1996");
  const [basicStatus, setBasicStatus] = useState<SaveStatus>({ kind: "idle" });

  // Contact info mobile state
  const [editingMobile, setEditingMobile] = useState(false);
  const [mobilePhone, setMobilePhone] = useState("");
  const [mobileStatus, setMobileStatus] = useState<SaveStatus>({ kind: "idle" });

  // Password change state
  const [pwdStatus, setPwdStatus] = useState<{ kind: "idle" | "loading" | "success" | "error"; message?: string }>({
    kind: "idle",
  });

  // Newsletter state
  const [subscribedNewsletter, setSubscribedNewsletter] = useState(true);

  // Orders state
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  // Addresses state
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [addressesError, setAddressesError] = useState<string | null>(null);
  const [isAddressFormOpen, setIsAddressFormOpen] = useState(false);
  const [addressForm, setAddressForm] = useState<CreateAddressPayload>(emptyAddressForm);
  const [addressFormError, setAddressFormError] = useState<string | null>(null);
  const [addressFormSaving, setAddressFormSaving] = useState(false);
  const [deletingAddressId, setDeletingAddressId] = useState<string | null>(null);

  // Bank refund state (mock / persistence)
  const [upiId, setUpiId] = useState("");
  const [isEditingBank, setIsEditingBank] = useState(false);
  const [bankSaved, setBankSaved] = useState(false);

  // Initialize fields from user profile
  useEffect(() => {
    if (user) {
      const rawName = user.profile?.display_name || "";
      const parts = rawName.trim().split(/\s+/);
      if (parts.length > 1) {
        setFirstName(parts[0]);
        setLastName(parts.slice(1).join(" "));
      } else if (parts.length === 1 && parts[0]) {
        setFirstName(parts[0]);
        setLastName("");
      } else {
        setFirstName(user.email ? user.email.split("@")[0] : "");
        setLastName("");
      }
      setMobilePhone(user.profile?.phone || "");

      // Check localStorage for gender and dob if available
      try {
        const storedMeta = localStorage.getItem(`closet_user_meta_${user.id}`);
        if (storedMeta) {
          const parsed = JSON.parse(storedMeta);
          if (parsed.gender) setGender(parsed.gender);
          if (parsed.dob) setDob(parsed.dob);
          if (parsed.upiId) {
            setUpiId(parsed.upiId);
            setBankSaved(true);
          }
        }
      } catch {
        // Ignore JSON error
      }
    }
  }, [user]);

  const fullName = useMemo(() => {
    const combined = `${firstName} ${lastName}`.trim();
    if (combined) return combined;
    if (user?.profile?.display_name) return user.profile.display_name;
    if (user?.email) {
      const uname = user.email.split("@")[0];
      return uname.charAt(0).toUpperCase() + uname.slice(1);
    }
    return "Muse";
  }, [firstName, lastName, user]);

  const initials = useMemo(() => {
    return getInitials(fullName, user?.email ?? "C");
  }, [fullName, user]);

  // Profile completion calculation
  const completionPercent = useMemo(() => {
    let score = 0;
    const total = 5;
    if (fullName.trim().length > 0) score++;
    if (user?.email) score++;
    if (mobilePhone.trim().length > 0 || user?.profile?.phone) score++;
    if (gender && dob) score++;
    if (addresses.length > 0) score++;
    return Math.min(100, Math.round((score / total) * 100));
  }, [fullName, user, mobilePhone, gender, dob, addresses.length]);

  // Protect route
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  // Load orders
  const loadOrders = useCallback(async () => {
    if (!session?.access_token) return;
    setOrdersLoading(true);
    setOrdersError(null);
    try {
      const data = await getOrders(session.access_token);
      setOrders(data.results ?? []);
    } catch (err) {
      setOrdersError(err instanceof Error ? err.message : "Unable to load orders.");
    } finally {
      setOrdersLoading(false);
    }
  }, [session?.access_token]);

  // Load addresses
  const loadAddresses = useCallback(async () => {
    if (!session?.access_token) return;
    setAddressesLoading(true);
    setAddressesError(null);
    try {
      const data = await getAddresses(session.access_token);
      setAddresses(data.results ?? []);
    } catch (err) {
      setAddressesError(err instanceof Error ? err.message : "Unable to load addresses.");
    } finally {
      setAddressesLoading(false);
    }
  }, [session?.access_token]);

  useEffect(() => {
    if (activeSection === "orders") void loadOrders();
    if (activeSection === "addresses" || activeSection === "profile") void loadAddresses();
  }, [activeSection, loadOrders, loadAddresses]);

  // Basic Info Handlers
  function beginEditBasic() {
    setBasicStatus({ kind: "idle" });
    setEditingBasic(true);
  }

  function cancelEditBasic() {
    if (user) {
      const parts = (user.profile?.display_name || "").trim().split(/\s+/);
      setFirstName(parts[0] || "");
      setLastName(parts.slice(1).join(" ") || "");
    }
    setBasicStatus({ kind: "idle" });
    setEditingBasic(false);
  }

  async function handleSaveBasic(e: FormEvent) {
    e.preventDefault();
    setBasicStatus({ kind: "loading" });
    try {
      const combined = `${firstName} ${lastName}`.trim();
      await updateCurrentProfile({ display_name: combined });

      // Save gender & dob to local storage for persistent profile view
      if (user) {
        try {
          const currentMeta = JSON.parse(localStorage.getItem(`closet_user_meta_${user.id}`) || "{}");
          localStorage.setItem(
            `closet_user_meta_${user.id}`,
            JSON.stringify({ ...currentMeta, gender, dob })
          );
        } catch {
          // ignore
        }
      }

      setBasicStatus({ kind: "success", message: "Basic information updated successfully." });
      setEditingBasic(false);
      setTimeout(() => setBasicStatus({ kind: "idle" }), 4000);
    } catch (err) {
      const msg =
        err instanceof ApiClientError
          ? err.message
          : "Unable to update profile details. Please try again.";
      setBasicStatus({ kind: "error", message: msg });
    }
  }

  // Mobile Handlers
  function beginEditMobile() {
    setMobileStatus({ kind: "idle" });
    setEditingMobile(true);
  }

  function cancelEditMobile() {
    setMobilePhone(user?.profile?.phone || "");
    setMobileStatus({ kind: "idle" });
    setEditingMobile(false);
  }

  async function handleSaveMobile() {
    setMobileStatus({ kind: "loading" });
    try {
      await updateCurrentProfile({ phone: mobilePhone.trim() });
      setMobileStatus({ kind: "success", message: "Mobile number updated." });
      setEditingMobile(false);
      setTimeout(() => setMobileStatus({ kind: "idle" }), 4000);
    } catch (err) {
      const msg =
        err instanceof ApiClientError
          ? err.message
          : "Unable to update mobile number. Please try again.";
      setMobileStatus({ kind: "error", message: msg });
    }
  }

  // Password reset handler
  async function handleChangePassword() {
    if (!user?.email) return;
    setPwdStatus({ kind: "loading" });
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: typeof window !== "undefined" ? `${window.location.origin}/login` : undefined,
      });
      if (error) throw error;
      setPwdStatus({
        kind: "success",
        message: `A secure password reset link has been dispatched to ${user.email}.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unable to dispatch reset email.";
      setPwdStatus({ kind: "error", message: msg });
    }
  }

  // Address Handlers
  async function handleSaveAddress(e: FormEvent) {
    e.preventDefault();
    if (!session?.access_token) return;
    setAddressFormError(null);
    setAddressFormSaving(true);
    try {
      const newAddress = await createAddress(addressForm, session.access_token);
      setAddresses((prev) =>
        newAddress.is_default
          ? [...prev.map((a) => ({ ...a, is_default: false })), newAddress]
          : [...prev, newAddress]
      );
      setIsAddressFormOpen(false);
      setAddressForm(emptyAddressForm);
    } catch (err) {
      setAddressFormError(err instanceof Error ? err.message : "Could not save address.");
    } finally {
      setAddressFormSaving(false);
    }
  }

  async function handleSetDefaultAddress(id: string) {
    if (!session?.access_token) return;
    try {
      const updated = await updateAddress(id, { is_default: true }, session.access_token);
      setAddresses((prev) =>
        prev.map((a) => (a.id === id ? updated : { ...a, is_default: false }))
      );
    } catch {
      void loadAddresses();
    }
  }

  async function handleDeleteAddress(id: string) {
    if (!session?.access_token) return;
    setDeletingAddressId(id);
    try {
      await deleteAddress(id, session.access_token);
      setAddresses((prev) => prev.filter((a) => a.id !== id));
    } catch {
      void loadAddresses();
    } finally {
      setDeletingAddressId(null);
    }
  }

  // Bank Info Save
  function handleSaveBank(e: FormEvent) {
    e.preventDefault();
    if (user && upiId.trim()) {
      try {
        const currentMeta = JSON.parse(localStorage.getItem(`closet_user_meta_${user.id}`) || "{}");
        localStorage.setItem(
          `closet_user_meta_${user.id}`,
          JSON.stringify({ ...currentMeta, upiId: upiId.trim() })
        );
        setBankSaved(true);
        setIsEditingBank(false);
      } catch {
        // ignore
      }
    }
  }

  // Logout Handler
  async function handleLogout() {
    await signOut();
    router.push("/");
    router.refresh();
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col justify-center items-center py-32">
        <Loader2 size={32} className="animate-spin text-primary mb-3" />
        <p className="font-label-caps text-label-caps uppercase tracking-widest text-on-surface-variant">
          Loading Atelier Account...
        </p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <>
      <Header />
      <main className="w-full pt-20 bg-background min-h-screen">
        <div className="flex flex-col w-full">
          {/* Breadcrumb Bar */}
          <div className="bg-surface-container-low py-3 px-6 lg:px-12 border-b border-outline-variant/20">
            <div className="max-w-[1440px] mx-auto flex items-center gap-2 font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant">
              <Link className="hover:text-primary transition-colors" href="/">
                Home
              </Link>
              <span className="text-outline-variant">/</span>
              <span className="text-primary font-semibold">My Account</span>
            </div>
          </div>

          {/* Main Account View Area */}
          <div className="max-w-[1440px] mx-auto w-full px-6 lg:px-12 py-10 lg:py-14">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-start">
              {/* Left Column: User Summary & Navigation */}
              <aside className="lg:col-span-4 flex flex-col gap-8 bg-surface-card p-6 lg:p-8 rounded-none shadow-sm border border-outline-variant/30">
                {/* User Completion Header */}
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center shrink-0 text-primary border border-outline-variant/40 font-headline-md text-2xl font-bold">
                      {initials}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <h2 className="font-headline-sm text-headline-sm text-on-surface leading-tight truncate">
                        {fullName}
                      </h2>
                      <p className="font-body-sm text-body-sm text-on-surface-variant truncate">
                        {user.email}
                      </p>
                    </div>
                  </div>

                  {/* Progress Bar Indicator */}
                  <div className="flex flex-col gap-1.5 pt-2">
                    <div className="flex items-center justify-between text-label-caps font-label-caps">
                      <span className="text-primary font-semibold">
                        {completionPercent}% COMPLETED
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-surface-container rounded-none overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-500"
                        style={{ width: `${completionPercent}%` }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveSection("profile");
                        setEditingBasic(true);
                      }}
                      className="text-left text-primary italic font-body-sm text-body-sm hover:underline pt-0.5 cursor-pointer"
                    >
                      Complete profile for better suggestions
                    </button>
                  </div>
                </div>

                {/* Navigation Menu */}
                <nav className="flex flex-col gap-1 pt-2" id="account-nav">
                  {/* Active Tab: My Profile */}
                  <button
                    type="button"
                    onClick={() => setActiveSection("profile")}
                    className={`flex items-start gap-4 p-3.5 transition-colors text-left w-full group cursor-pointer ${
                      activeSection === "profile"
                        ? "bg-surface-container-low border-l-2 border-primary"
                        : "hover:bg-surface-container-low"
                    }`}
                  >
                    <span
                      className={`material-symbols-outlined text-[22px] shrink-0 mt-0.5 transition-colors ${
                        activeSection === "profile"
                          ? "text-primary"
                          : "text-on-surface-variant group-hover:text-primary"
                      }`}
                    >
                      person
                    </span>
                    <div className="flex flex-col">
                      <span
                        className={`font-label-ui text-label-ui font-semibold ${
                          activeSection === "profile"
                            ? "text-primary"
                            : "text-on-surface group-hover:text-primary transition-colors"
                        }`}
                      >
                        My Profile
                      </span>
                      <span className="font-body-sm text-body-sm text-on-surface-variant">
                        All your personal details
                      </span>
                    </div>
                  </button>

                  {/* My Orders */}
                  <button
                    type="button"
                    onClick={() => setActiveSection("orders")}
                    className={`flex items-start gap-4 p-3.5 transition-colors text-left w-full group cursor-pointer ${
                      activeSection === "orders"
                        ? "bg-surface-container-low border-l-2 border-primary"
                        : "hover:bg-surface-container-low"
                    }`}
                  >
                    <span
                      className={`material-symbols-outlined text-[22px] shrink-0 mt-0.5 transition-colors ${
                        activeSection === "orders"
                          ? "text-primary"
                          : "text-on-surface-variant group-hover:text-primary"
                      }`}
                    >
                      local_mall
                    </span>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-label-ui text-label-ui font-medium ${
                            activeSection === "orders"
                              ? "text-primary font-semibold"
                              : "text-on-surface group-hover:text-primary transition-colors"
                          }`}
                        >
                          My Orders
                        </span>
                        {orders.length > 0 && (
                          <span className="bg-primary/10 text-primary text-[10px] font-bold px-1.5 py-0.2 rounded-none">
                            {orders.length}
                          </span>
                        )}
                      </div>
                      <span className="font-body-sm text-body-sm text-on-surface-variant">
                        All your confirmed orders
                      </span>
                    </div>
                  </button>

                  {/* My Wishlist */}
                  <button
                    type="button"
                    onClick={() => setActiveSection("wishlist")}
                    className={`flex items-start gap-4 p-3.5 transition-colors text-left w-full group cursor-pointer ${
                      activeSection === "wishlist"
                        ? "bg-surface-container-low border-l-2 border-primary"
                        : "hover:bg-surface-container-low"
                    }`}
                  >
                    <span
                      className={`material-symbols-outlined text-[22px] shrink-0 mt-0.5 transition-colors ${
                        activeSection === "wishlist"
                          ? "text-primary"
                          : "text-on-surface-variant group-hover:text-primary"
                      }`}
                    >
                      favorite
                    </span>
                    <div className="flex flex-col">
                      <span
                        className={`font-label-ui text-label-ui font-medium ${
                          activeSection === "wishlist"
                            ? "text-primary font-semibold"
                            : "text-on-surface group-hover:text-primary transition-colors"
                        }`}
                      >
                        My Wishlist
                      </span>
                      <span className="font-body-sm text-body-sm text-on-surface-variant">
                        All your curated product collection
                      </span>
                    </div>
                  </button>

                  {/* My Addresses */}
                  <button
                    type="button"
                    onClick={() => setActiveSection("addresses")}
                    className={`flex items-start gap-4 p-3.5 transition-colors text-left w-full group cursor-pointer ${
                      activeSection === "addresses"
                        ? "bg-surface-container-low border-l-2 border-primary"
                        : "hover:bg-surface-container-low"
                    }`}
                  >
                    <span
                      className={`material-symbols-outlined text-[22px] shrink-0 mt-0.5 transition-colors ${
                        activeSection === "addresses"
                          ? "text-primary"
                          : "text-on-surface-variant group-hover:text-primary"
                      }`}
                    >
                      location_on
                    </span>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-label-ui text-label-ui font-medium ${
                            activeSection === "addresses"
                              ? "text-primary font-semibold"
                              : "text-on-surface group-hover:text-primary transition-colors"
                          }`}
                        >
                          My Addresses
                        </span>
                        {addresses.length > 0 && (
                          <span className="bg-primary/10 text-primary text-[10px] font-bold px-1.5 py-0.2 rounded-none">
                            {addresses.length}
                          </span>
                        )}
                      </div>
                      <span className="font-body-sm text-body-sm text-on-surface-variant">
                        All your saved addresses
                      </span>
                    </div>
                  </button>

                  {/* My Bank Account */}
                  <button
                    type="button"
                    onClick={() => setActiveSection("bank")}
                    className={`flex items-start gap-4 p-3.5 transition-colors text-left w-full group cursor-pointer ${
                      activeSection === "bank"
                        ? "bg-surface-container-low border-l-2 border-primary"
                        : "hover:bg-surface-container-low"
                    }`}
                  >
                    <span
                      className={`material-symbols-outlined text-[22px] shrink-0 mt-0.5 transition-colors ${
                        activeSection === "bank"
                          ? "text-primary"
                          : "text-on-surface-variant group-hover:text-primary"
                      }`}
                    >
                      account_balance
                    </span>
                    <div className="flex flex-col">
                      <span
                        className={`font-label-ui text-label-ui font-medium ${
                          activeSection === "bank"
                            ? "text-primary font-semibold"
                            : "text-on-surface group-hover:text-primary transition-colors"
                        }`}
                      >
                        My Bank Account
                      </span>
                      <span className="font-body-sm text-body-sm text-on-surface-variant">
                        All your saved bank Account
                      </span>
                    </div>
                  </button>
                </nav>

                {/* Footer credentials inside sidebar */}
                <div className="pt-4 border-t border-surface-container-high/60 flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex items-center gap-2 text-primary italic font-body-sm hover:underline cursor-pointer"
                  >
                    <LogOut size={15} />
                    <span>Sign Out of Account</span>
                  </button>
                  <p className="text-[10px] uppercase font-label-caps tracking-widest text-outline">
                    Role: {user.role.replace("_", " ")}
                  </p>
                </div>
              </aside>

              {/* Right Column: Dynamic Panel Content */}
              <section className="lg:col-span-8 bg-surface-card p-6 lg:p-10 shadow-sm border border-outline-variant/30 flex flex-col gap-10 min-h-[620px]">
                {/* ────────────────────────────────────────────────────────── */}
                {/* TAB 1: MY PROFILE */}
                {/* ────────────────────────────────────────────────────────── */}
                {activeSection === "profile" && (
                  <>
                    {/* Section Header */}
                    <div className="flex flex-col gap-1 pb-4 border-b border-surface-container-high/60">
                      <h1 className="font-headline-md text-headline-md text-on-surface uppercase tracking-wide">
                        My Profile
                      </h1>
                      <p className="font-body-sm text-on-surface-variant">
                        Review and customize your personal credentials, communication preferences, and passwords.
                      </p>
                    </div>

                    {/* Upper Avatar + Basic Information */}
                    <div className="flex flex-col md:flex-row items-start gap-8 lg:gap-10" id="basic-info">
                      {/* Large Circular Avatar Display */}
                      <div className="w-32 h-32 md:w-36 md:h-36 rounded-full bg-surface-container-low border border-outline-variant/40 flex items-center justify-center shrink-0 mx-auto md:mx-0 shadow-sm text-primary font-headline-lg text-4xl">
                        {initials}
                      </div>

                      {/* Basic Information Table / Grid */}
                      <div className="flex-1 w-full flex flex-col gap-6">
                        <div className="flex items-center justify-between">
                          <h2 className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface font-semibold">
                            Basic Information
                          </h2>
                          {!editingBasic ? (
                            <button
                              type="button"
                              onClick={beginEditBasic}
                              aria-label="Edit Basic Information"
                              className="font-label-ui text-label-ui text-primary hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                              id="edit-basic-btn"
                            >
                              <Edit3 size={14} />
                              <span>Edit</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={cancelEditBasic}
                              className="font-label-ui text-label-ui text-outline hover:text-on-surface font-semibold flex items-center gap-1 cursor-pointer"
                            >
                              <X size={14} />
                              <span>Cancel</span>
                            </button>
                          )}
                        </div>

                        {basicStatus.kind === "success" && (
                          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-body-sm p-3 flex items-center gap-2">
                            <Check size={16} />
                            <span>{basicStatus.message}</span>
                          </div>
                        )}
                        {basicStatus.kind === "error" && (
                          <div className="bg-error-container border border-error/20 text-error text-body-sm p-3 flex items-center gap-2">
                            <AlertCircle size={16} />
                            <span>{basicStatus.message}</span>
                          </div>
                        )}

                        {/* Read View */}
                        {!editingBasic ? (
                          <div
                            className="grid grid-cols-1 sm:grid-cols-3 gap-y-4 gap-x-6 text-body-md font-body-md"
                            id="basic-info-display"
                          >
                            <div className="text-on-surface-variant font-medium">First Name</div>
                            <div className="sm:col-span-2 font-medium text-on-surface" id="disp-first-name">
                              {firstName || "—"}
                            </div>

                            <div className="text-on-surface-variant font-medium">Last Name</div>
                            <div className="sm:col-span-2 font-medium text-on-surface" id="disp-last-name">
                              {lastName || "—"}
                            </div>

                            <div className="text-on-surface-variant font-medium">Email</div>
                            <div className="sm:col-span-2 font-medium text-on-surface truncate" id="disp-email">
                              {user.email}
                            </div>

                            <div className="text-on-surface-variant font-medium">Gender</div>
                            <div className="sm:col-span-2 font-medium text-on-surface" id="disp-gender">
                              {gender}
                            </div>

                            <div className="text-on-surface-variant font-medium">Date of birth</div>
                            <div className="sm:col-span-2 font-medium text-on-surface" id="disp-dob">
                              {dob}
                            </div>
                          </div>
                        ) : (
                          /* Edit Form */
                          <form
                            className="flex flex-col gap-4 bg-surface-container-low p-5 shadow-sm border border-outline-variant/30"
                            id="basic-info-form"
                            onSubmit={handleSaveBasic}
                          >
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <label htmlFor="input-first-name" className="block font-label-caps text-label-caps uppercase text-on-surface-variant mb-1 font-semibold">
                                  First Name
                                </label>
                                <input
                                  className="w-full bg-surface-card border border-outline-variant/50 px-3 py-2 text-body-md font-body-md text-on-surface focus:outline-none focus:border-primary"
                                  id="input-first-name"
                                  type="text"
                                  value={firstName}
                                  onChange={(e) => setFirstName(e.target.value)}
                                  required
                                />
                              </div>
                              <div>
                                <label htmlFor="input-last-name" className="block font-label-caps text-label-caps uppercase text-on-surface-variant mb-1 font-semibold">
                                  Last Name
                                </label>
                                <input
                                  className="w-full bg-surface-card border border-outline-variant/50 px-3 py-2 text-body-md font-body-md text-on-surface focus:outline-none focus:border-primary"
                                  id="input-last-name"
                                  type="text"
                                  value={lastName}
                                  onChange={(e) => setLastName(e.target.value)}
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <label htmlFor="input-gender" className="block font-label-caps text-label-caps uppercase text-on-surface-variant mb-1 font-semibold">
                                  Gender
                                </label>
                                <select
                                  className="w-full bg-surface-card border border-outline-variant/50 px-3 py-2 text-body-md font-body-md text-on-surface focus:outline-none focus:border-primary"
                                  id="input-gender"
                                  value={gender}
                                  onChange={(e) => setGender(e.target.value)}
                                >
                                  <option value="Female">Female</option>
                                  <option value="Male">Male</option>
                                  <option value="Other">Other</option>
                                  <option value="Prefer not to say">Prefer not to say</option>
                                </select>
                              </div>
                              <div>
                                <label htmlFor="input-dob" className="block font-label-caps text-label-caps uppercase text-on-surface-variant mb-1 font-semibold">
                                  Date of birth
                                </label>
                                <input
                                  className="w-full bg-surface-card border border-outline-variant/50 px-3 py-2 text-body-md font-body-md text-on-surface focus:outline-none focus:border-primary"
                                  id="input-dob"
                                  placeholder="DD/MM/YYYY"
                                  type="text"
                                  value={dob}
                                  onChange={(e) => setDob(e.target.value)}
                                />
                              </div>
                            </div>
                            <div className="flex items-center gap-3 pt-2">
                              <button
                                className="bg-primary text-on-primary px-5 py-2.5 font-label-caps text-label-caps uppercase tracking-wider hover:bg-primary-container transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-2"
                                id="save-basic-btn"
                                type="submit"
                                disabled={basicStatus.kind === "loading"}
                              >
                                {basicStatus.kind === "loading" && <Loader2 size={14} className="animate-spin" />}
                                <span>Save Changes</span>
                              </button>
                              <button
                                className="bg-surface-card border border-outline-variant/50 text-on-surface-variant px-4 py-2.5 font-label-caps text-label-caps uppercase tracking-wider hover:bg-surface-container transition-colors cursor-pointer"
                                id="cancel-basic-btn"
                                type="button"
                                onClick={cancelEditBasic}
                              >
                                Cancel
                              </button>
                            </div>
                          </form>
                        )}
                      </div>
                    </div>

                    {/* Section Spacing Separator */}
                    <div className="w-full h-px bg-surface-container-high my-2" />

                    {/* Contact Information Section */}
                    <div className="flex flex-col gap-6">
                      <div className="flex items-center justify-between">
                        <h2 className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface font-semibold">
                          Contact Information
                        </h2>
                      </div>

                      {mobileStatus.kind === "success" && (
                        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-body-sm p-3 flex items-center gap-2">
                          <Check size={16} />
                          <span>{mobileStatus.message}</span>
                        </div>
                      )}
                      {mobileStatus.kind === "error" && (
                        <div className="bg-error-container border border-error/20 text-error text-body-sm p-3 flex items-center gap-2">
                          <AlertCircle size={16} />
                          <span>{mobileStatus.message}</span>
                        </div>
                      )}

                      {/* Mobile Number Entry */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-y-2 gap-x-6 items-center text-body-md font-body-md">
                        <div className="text-on-surface-variant font-medium">Mobile Number</div>
                        <div className="font-medium text-on-surface" id="disp-mobile">
                          {mobilePhone || user.profile?.phone || "Not provided"}
                        </div>
                        <div className="sm:text-right">
                          {!editingMobile ? (
                            <button
                              type="button"
                              onClick={beginEditMobile}
                              aria-label="Edit Mobile Number"
                              className="font-label-ui text-label-ui text-primary hover:underline font-semibold cursor-pointer"
                              id="edit-mobile-btn"
                            >
                              Edit
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={cancelEditMobile}
                              className="font-label-ui text-label-ui text-outline hover:text-on-surface font-semibold cursor-pointer"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Inline Mobile Edit Panel */}
                      {editingMobile && (
                        <div
                          className="bg-surface-container-low p-4 shadow-sm border border-outline-variant/30 flex flex-col sm:flex-row items-center gap-3"
                          id="mobile-edit-panel"
                        >
                          <input
                            className="flex-1 bg-surface-card border border-outline-variant/50 px-3 py-2 text-body-md font-body-md text-on-surface focus:outline-none focus:border-primary w-full"
                            id="input-mobile"
                            type="tel"
                            placeholder="+91 98201 54321"
                            value={mobilePhone}
                            onChange={(e) => setMobilePhone(e.target.value)}
                          />
                          <div className="flex items-center gap-2 w-full sm:w-auto">
                            <button
                              className="flex-1 sm:flex-initial bg-primary text-on-primary px-4 py-2 font-label-caps text-label-caps uppercase tracking-wider hover:bg-primary-container disabled:opacity-50 cursor-pointer flex items-center gap-1"
                              id="save-mobile-btn"
                              type="button"
                              onClick={handleSaveMobile}
                              disabled={mobileStatus.kind === "loading"}
                            >
                              {mobileStatus.kind === "loading" && <Loader2 size={13} className="animate-spin" />}
                              <span>Update</span>
                            </button>
                            <button
                              className="flex-1 sm:flex-initial bg-surface-card border border-outline-variant/50 text-on-surface px-4 py-2 font-label-caps text-label-caps uppercase tracking-wider hover:bg-surface-container cursor-pointer"
                              id="cancel-mobile-btn"
                              type="button"
                              onClick={cancelEditMobile}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Password Entry */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-y-2 gap-x-6 items-center text-body-md font-body-md">
                        <div className="text-on-surface-variant font-medium">Password</div>
                        <div className="font-medium text-on-surface tracking-widest text-[16px]">
                          **********
                        </div>
                        <div className="sm:text-right">
                          <button
                            type="button"
                            onClick={handleChangePassword}
                            disabled={pwdStatus.kind === "loading"}
                            className="font-label-ui text-label-ui text-primary hover:underline font-semibold cursor-pointer disabled:opacity-50"
                            id="change-pwd-btn"
                          >
                            {pwdStatus.kind === "loading" ? "Dispatching..." : "Change"}
                          </button>
                        </div>
                      </div>

                      {pwdStatus.kind === "success" && (
                        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-body-sm p-3 flex items-center gap-2">
                          <Check size={16} />
                          <span>{pwdStatus.message}</span>
                        </div>
                      )}
                      {pwdStatus.kind === "error" && (
                        <div className="bg-error-container border border-error/20 text-error text-body-sm p-3 flex items-center gap-2">
                          <AlertCircle size={16} />
                          <span>{pwdStatus.message}</span>
                        </div>
                      )}
                    </div>

                    {/* Section Spacing Separator */}
                    <div className="w-full h-px bg-surface-container-high my-2" />

                    {/* Newsletter Subscription Area */}
                    <div className="flex flex-col gap-4">
                      <h2 className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface font-semibold">
                        Subscribe for Newsletter
                      </h2>
                      <label className="flex items-start gap-3 cursor-pointer group select-none">
                        <input
                          checked={subscribedNewsletter}
                          onChange={(e) => setSubscribedNewsletter(e.target.checked)}
                          className="mt-1 h-4 w-4 rounded-none accent-primary cursor-pointer text-primary"
                          type="checkbox"
                        />
                        <span className="font-body-md text-body-md text-on-surface-variant group-hover:text-on-surface transition-colors leading-relaxed">
                          Become a part of the Closet by Chili family! Sign up to stay updated on our new product launches, runway drops, and much more!
                        </span>
                      </label>
                    </div>

                    {/* Logout Action Area */}
                    <div className="pt-4 border-t border-surface-container-high/60 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="inline-block text-primary italic font-body-md text-body-md hover:underline font-medium cursor-pointer"
                      >
                        Logout
                      </button>
                      <span className="text-[10px] font-label-caps uppercase tracking-widest text-outline">
                        256-Bit Encrypted Secure Session
                      </span>
                    </div>
                  </>
                )}

                {/* ────────────────────────────────────────────────────────── */}
                {/* TAB 2: MY ORDERS */}
                {/* ────────────────────────────────────────────────────────── */}
                {activeSection === "orders" && (
                  <div className="flex flex-col gap-6">
                    <div className="flex items-center justify-between pb-4 border-b border-surface-container-high/60">
                      <div>
                        <h1 className="font-headline-md text-headline-md text-on-surface uppercase tracking-wide">
                          My Orders
                        </h1>
                        <p className="font-body-sm text-on-surface-variant">
                          Track shipments, inspect item invoices, and review order histories.
                        </p>
                      </div>
                      {!ordersLoading && (
                        <span className="text-primary font-label-caps text-label-caps uppercase font-semibold">
                          {orders.length} {orders.length === 1 ? "Order" : "Orders"}
                        </span>
                      )}
                    </div>

                    {ordersLoading ? (
                      <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <Loader2 size={28} className="animate-spin text-primary" />
                        <p className="font-label-caps text-label-caps uppercase text-on-surface-variant">
                          Retrieving Order Archives...
                        </p>
                      </div>
                    ) : ordersError ? (
                      <div className="bg-error-container border border-error/20 text-error text-body-sm p-4 flex items-center gap-2">
                        <AlertCircle size={18} />
                        <span>{ordersError}</span>
                      </div>
                    ) : orders.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-surface-container-low flex items-center justify-center text-outline">
                          <ShoppingBag size={28} />
                        </div>
                        <div className="flex flex-col gap-1 max-w-sm">
                          <h3 className="font-headline-sm text-headline-sm text-on-surface">
                            No Orders Found
                          </h3>
                          <p className="font-body-sm text-body-sm text-on-surface-variant">
                            You have not placed any orders yet. Discover our signature luxury silhouettes and couture drops.
                          </p>
                        </div>
                        <Link
                          href="/products"
                          className="mt-2 inline-flex items-center gap-2 bg-primary text-on-primary px-6 py-3 font-label-caps text-label-caps uppercase tracking-wider hover:bg-primary-container transition-colors shadow-sm"
                        >
                          <span>Explore Collections</span>
                          <ArrowRight size={14} />
                        </Link>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {orders.map((order) => {
                          const isExpanded = expandedOrder === order.order_number;
                          return (
                            <div
                              key={order.order_number}
                              className="border border-outline-variant/40 bg-surface-container-lowest transition shadow-xs"
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedOrder(isExpanded ? null : order.order_number)
                                }
                                className="w-full p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left hover:bg-surface-container-low/40 transition-colors cursor-pointer"
                              >
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-3">
                                    <span className="font-headline-sm text-base text-on-surface font-semibold">
                                      #{order.order_number}
                                    </span>
                                    <span
                                      className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
                                        STATUS_COLORS[order.status] || "bg-surface-container text-on-surface"
                                      }`}
                                    >
                                      {order.status}
                                    </span>
                                  </div>
                                  <span className="font-body-sm text-xs text-on-surface-variant flex items-center gap-1.5">
                                    <Clock size={12} />
                                    <span>Placed on {formatDate(order.created_at)}</span>
                                  </span>
                                </div>
                                <div className="flex items-center justify-between sm:justify-end gap-5">
                                  <div className="flex flex-col sm:text-right">
                                    <span className="font-headline-sm text-lg text-primary font-bold">
                                      ₹{Number.parseFloat(order.total).toLocaleString("en-IN")}
                                    </span>
                                    <span className="text-[11px] font-label-caps text-outline uppercase">
                                      {order.item_count} {order.item_count === 1 ? "Item" : "Items"}
                                    </span>
                                  </div>
                                  <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-outline">
                                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                  </div>
                                </div>
                              </button>

                              {isExpanded && (
                                <div className="border-t border-outline-variant/30 p-5 bg-surface-container-low/30 flex flex-col gap-3 font-body-sm text-on-surface-variant">
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                                    <div>
                                      <span className="block font-label-caps text-[10px] uppercase text-outline">
                                        Payment Status
                                      </span>
                                      <span className="font-semibold text-on-surface">
                                        {order.payment_status}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="block font-label-caps text-[10px] uppercase text-outline">
                                        Currency
                                      </span>
                                      <span className="font-semibold text-on-surface">
                                        {order.currency}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="block font-label-caps text-[10px] uppercase text-outline">
                                        Dispatch Tracking
                                      </span>
                                      <span className="font-semibold text-on-surface">
                                        Express India Delivery
                                      </span>
                                    </div>
                                    <div>
                                      <span className="block font-label-caps text-[10px] uppercase text-outline">
                                        Support
                                      </span>
                                      <span className="font-semibold text-primary">
                                        Concierge Assistance
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* ────────────────────────────────────────────────────────── */}
                {/* TAB 3: MY ADDRESSES */}
                {/* ────────────────────────────────────────────────────────── */}
                {activeSection === "addresses" && (
                  <div className="flex flex-col gap-6">
                    <div className="flex items-center justify-between pb-4 border-b border-surface-container-high/60 flex-wrap gap-4">
                      <div>
                        <h1 className="font-headline-md text-headline-md text-on-surface uppercase tracking-wide">
                          My Addresses
                        </h1>
                        <p className="font-body-sm text-on-surface-variant">
                          Manage multiple shipping and billing residences for express door delivery.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setAddressForm(emptyAddressForm);
                          setAddressFormError(null);
                          setIsAddressFormOpen((prev) => !prev);
                        }}
                        className="inline-flex items-center gap-2 bg-primary text-on-primary px-4 py-2.5 font-label-caps text-label-caps uppercase tracking-wider hover:bg-primary-container transition-colors shadow-xs cursor-pointer font-semibold"
                      >
                        {isAddressFormOpen ? (
                          <>
                            <X size={14} />
                            <span>Cancel</span>
                          </>
                        ) : (
                          <>
                            <Plus size={14} />
                            <span>Add New Address</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* New Address Form Modal/Panel */}
                    {isAddressFormOpen && (
                      <form
                        onSubmit={handleSaveAddress}
                        className="bg-surface-container-low p-6 border border-outline-variant/40 shadow-sm flex flex-col gap-5"
                      >
                        <h3 className="font-label-caps text-label-caps uppercase tracking-wider text-primary font-bold">
                          Add New Delivery Address
                        </h3>

                        {addressFormError && (
                          <div className="bg-error-container border border-error/20 text-error text-body-sm p-3 flex items-center gap-2">
                            <AlertCircle size={16} />
                            <span>{addressFormError}</span>
                          </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block font-label-caps text-label-caps uppercase text-on-surface-variant mb-1 font-semibold">
                              Full Name *
                            </label>
                            <input
                              className="w-full bg-surface-card border border-outline-variant/50 px-3 py-2 text-body-md font-body-md text-on-surface focus:outline-none focus:border-primary"
                              type="text"
                              required
                              value={addressForm.full_name}
                              onChange={(e) =>
                                setAddressForm((f) => ({ ...f, full_name: e.target.value }))
                              }
                            />
                          </div>
                          <div>
                            <label className="block font-label-caps text-label-caps uppercase text-on-surface-variant mb-1 font-semibold">
                              Phone Number *
                            </label>
                            <input
                              className="w-full bg-surface-card border border-outline-variant/50 px-3 py-2 text-body-md font-body-md text-on-surface focus:outline-none focus:border-primary"
                              type="tel"
                              required
                              value={addressForm.phone}
                              onChange={(e) =>
                                setAddressForm((f) => ({ ...f, phone: e.target.value }))
                              }
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                          <div>
                            <label className="block font-label-caps text-label-caps uppercase text-on-surface-variant mb-1 font-semibold">
                              Address Line 1 (Flat, House no., Building) *
                            </label>
                            <input
                              className="w-full bg-surface-card border border-outline-variant/50 px-3 py-2 text-body-md font-body-md text-on-surface focus:outline-none focus:border-primary"
                              type="text"
                              required
                              value={addressForm.address_line1}
                              onChange={(e) =>
                                setAddressForm((f) => ({ ...f, address_line1: e.target.value }))
                              }
                            />
                          </div>
                          <div>
                            <label className="block font-label-caps text-label-caps uppercase text-on-surface-variant mb-1 font-semibold">
                              Address Line 2 (Area, Street, Sector)
                            </label>
                            <input
                              className="w-full bg-surface-card border border-outline-variant/50 px-3 py-2 text-body-md font-body-md text-on-surface focus:outline-none focus:border-primary"
                              type="text"
                              value={addressForm.address_line2 || ""}
                              onChange={(e) =>
                                setAddressForm((f) => ({ ...f, address_line2: e.target.value }))
                              }
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div>
                            <label className="block font-label-caps text-label-caps uppercase text-on-surface-variant mb-1 font-semibold">
                              Postal Code *
                            </label>
                            <input
                              className="w-full bg-surface-card border border-outline-variant/50 px-3 py-2 text-body-md font-body-md text-on-surface focus:outline-none focus:border-primary"
                              type="text"
                              required
                              value={addressForm.postal_code}
                              onChange={(e) =>
                                setAddressForm((f) => ({ ...f, postal_code: e.target.value }))
                              }
                            />
                          </div>
                          <div>
                            <label className="block font-label-caps text-label-caps uppercase text-on-surface-variant mb-1 font-semibold">
                              City *
                            </label>
                            <input
                              className="w-full bg-surface-card border border-outline-variant/50 px-3 py-2 text-body-md font-body-md text-on-surface focus:outline-none focus:border-primary"
                              type="text"
                              required
                              value={addressForm.city}
                              onChange={(e) =>
                                setAddressForm((f) => ({ ...f, city: e.target.value }))
                              }
                            />
                          </div>
                          <div>
                            <label className="block font-label-caps text-label-caps uppercase text-on-surface-variant mb-1 font-semibold">
                              State *
                            </label>
                            <input
                              className="w-full bg-surface-card border border-outline-variant/50 px-3 py-2 text-body-md font-body-md text-on-surface focus:outline-none focus:border-primary"
                              type="text"
                              required
                              value={addressForm.state}
                              onChange={(e) =>
                                setAddressForm((f) => ({ ...f, state: e.target.value }))
                              }
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-6 pt-1 flex-wrap">
                          <div>
                            <label className="block font-label-caps text-label-caps uppercase text-on-surface-variant mb-1 font-semibold">
                              Address Type
                            </label>
                            <div className="flex gap-2">
                              {(["HOME", "OFFICE", "OTHER"] as const).map((type) => (
                                <button
                                  key={type}
                                  type="button"
                                  onClick={() =>
                                    setAddressForm((f) => ({ ...f, address_type: type }))
                                  }
                                  className={`px-3 py-1.5 text-xs font-label-caps uppercase tracking-wider border flex items-center gap-1.5 cursor-pointer ${
                                    addressForm.address_type === type
                                      ? "bg-primary text-on-primary border-primary font-bold"
                                      : "bg-surface-card border-outline-variant/50 text-on-surface-variant hover:border-primary"
                                  }`}
                                >
                                  {ADDRESS_TYPE_ICONS[type]}
                                  <span>{type}</span>
                                </button>
                              ))}
                            </div>
                          </div>

                          <label className="flex items-center gap-2 cursor-pointer mt-5 select-none font-body-sm text-on-surface">
                            <input
                              type="checkbox"
                              checked={addressForm.is_default || false}
                              onChange={(e) =>
                                setAddressForm((f) => ({ ...f, is_default: e.target.checked }))
                              }
                              className="accent-primary cursor-pointer w-4 h-4"
                            />
                            <span>Make this my default shipping address</span>
                          </label>
                        </div>

                        <div className="flex items-center gap-3 pt-3">
                          <button
                            type="submit"
                            disabled={addressFormSaving}
                            className="bg-primary text-on-primary px-6 py-2.5 font-label-caps text-label-caps uppercase tracking-wider hover:bg-primary-container disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                          >
                            {addressFormSaving && <Loader2 size={14} className="animate-spin" />}
                            <span>Save Address</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsAddressFormOpen(false)}
                            className="bg-surface-card border border-outline-variant/50 px-4 py-2.5 font-label-caps text-label-caps uppercase tracking-wider hover:bg-surface-container cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    )}

                    {/* Address Cards List */}
                    {addressesLoading ? (
                      <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <Loader2 size={28} className="animate-spin text-primary" />
                        <p className="font-label-caps text-label-caps uppercase text-on-surface-variant">
                          Loading Saved Addresses...
                        </p>
                      </div>
                    ) : addressesError ? (
                      <div className="bg-error-container border border-error/20 text-error text-body-sm p-4 flex items-center gap-2">
                        <AlertCircle size={18} />
                        <span>{addressesError}</span>
                      </div>
                    ) : addresses.length === 0 && !isAddressFormOpen ? (
                      <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-surface-container-low flex items-center justify-center text-outline">
                          <MapPin size={28} />
                        </div>
                        <div className="flex flex-col gap-1 max-w-sm">
                          <h3 className="font-headline-sm text-headline-sm text-on-surface">
                            No Addresses Saved
                          </h3>
                          <p className="font-body-sm text-body-sm text-on-surface-variant">
                            Save your home or studio address for seamless 1-click checkout and express parcel dispatch.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsAddressFormOpen(true)}
                          className="mt-2 inline-flex items-center gap-2 bg-primary text-on-primary px-6 py-3 font-label-caps text-label-caps uppercase tracking-wider hover:bg-primary-container transition-colors shadow-sm cursor-pointer"
                        >
                          <Plus size={14} />
                          <span>Add Your First Address</span>
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {addresses.map((address) => (
                          <div
                            key={address.id}
                            className={`p-5 border flex flex-col justify-between gap-4 transition-all ${
                              address.is_default
                                ? "border-primary bg-primary/[0.02] shadow-xs"
                                : "border-outline-variant/40 bg-surface-container-lowest hover:border-outline"
                            }`}
                          >
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center justify-between gap-2">
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-surface-container text-on-surface font-label-caps text-[10px] uppercase font-bold">
                                  {ADDRESS_TYPE_ICONS[address.address_type]}
                                  <span>{address.address_type}</span>
                                </span>
                                {address.is_default && (
                                  <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 font-label-caps text-[9px] uppercase font-bold">
                                    <Star size={9} fill="currentColor" />
                                    <span>Default Address</span>
                                  </span>
                                )}
                              </div>
                              <h4 className="font-headline-sm text-base text-on-surface font-bold pt-1">
                                {address.full_name}
                              </h4>
                              <p className="font-body-sm text-xs text-on-surface-variant leading-relaxed">
                                {address.address_line1}
                                {address.address_line2 ? `, ${address.address_line2}` : ""}
                                {address.landmark ? ` (near ${address.landmark})` : ""}
                                <br />
                                {address.city}, {address.state} — {address.postal_code}
                                <br />
                                {address.country}
                              </p>
                              <p className="font-body-sm text-xs text-outline flex items-center gap-1 mt-1">
                                <Phone size={11} />
                                <span>{address.phone}</span>
                              </p>
                            </div>

                            <div className="flex items-center justify-between pt-3 border-t border-outline-variant/30 text-xs">
                              {!address.is_default ? (
                                <button
                                  type="button"
                                  onClick={() => handleSetDefaultAddress(address.id)}
                                  className="text-primary hover:underline font-label-caps text-[11px] uppercase tracking-wider font-semibold cursor-pointer"
                                >
                                  Set as Default
                                </button>
                              ) : (
                                <span className="text-emerald-700 font-label-caps text-[10px] uppercase tracking-wider">
                                  Primary Destination
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => handleDeleteAddress(address.id)}
                                disabled={deletingAddressId === address.id}
                                className="text-error hover:underline font-label-caps text-[11px] uppercase tracking-wider font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                              >
                                {deletingAddressId === address.id ? (
                                  <Loader2 size={12} className="animate-spin" />
                                ) : (
                                  <Trash2 size={12} />
                                )}
                                <span>Remove</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ────────────────────────────────────────────────────────── */}
                {/* TAB 4: MY WISHLIST */}
                {/* ────────────────────────────────────────────────────────── */}
                {activeSection === "wishlist" && (
                  <div className="flex flex-col gap-6">
                    <div className="flex items-center justify-between pb-4 border-b border-surface-container-high/60">
                      <div>
                        <h1 className="font-headline-md text-headline-md text-on-surface uppercase tracking-wide">
                          My Wishlist
                        </h1>
                        <p className="font-body-sm text-on-surface-variant">
                          Your private curation of favourite drapes, limited capsules, and coveted ensembles.
                        </p>
                      </div>
                    </div>

                    <div className="p-8 sm:p-12 border border-outline-variant/30 bg-surface-container-low/40 flex flex-col items-center justify-center text-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-primary">
                        <Heart size={28} />
                      </div>
                      <div className="flex flex-col gap-1 max-w-md">
                        <h3 className="font-headline-sm text-headline-sm text-on-surface">
                          Curate Your Wardrobe
                        </h3>
                        <p className="font-body-sm text-body-sm text-on-surface-variant">
                          Explore our new season launches and tap the heart icon on any silhouette to reserve it in your private atelier wishlist.
                        </p>
                      </div>
                      <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                        <Link
                          href="/products"
                          className="bg-primary text-on-primary px-6 py-3 font-label-caps text-label-caps uppercase tracking-wider hover:bg-primary-container transition-colors shadow-sm"
                        >
                          Explore New Arrivals
                        </Link>
                        <Link
                          href="/products"
                          className="bg-surface-card border border-outline-variant/60 text-on-surface px-6 py-3 font-label-caps text-label-caps uppercase tracking-wider hover:bg-surface-container transition-colors"
                        >
                          View Bestsellers
                        </Link>
                      </div>
                    </div>
                  </div>
                )}

                {/* ────────────────────────────────────────────────────────── */}
                {/* TAB 5: MY BANK ACCOUNT */}
                {/* ────────────────────────────────────────────────────────── */}
                {activeSection === "bank" && (
                  <div className="flex flex-col gap-6">
                    <div className="flex items-center justify-between pb-4 border-b border-surface-container-high/60">
                      <div>
                        <h1 className="font-headline-md text-headline-md text-on-surface uppercase tracking-wide">
                          My Bank Account
                        </h1>
                        <p className="font-body-sm text-on-surface-variant">
                          Verified settlement credentials for instant returns, reverse pickups, and refund processing.
                        </p>
                      </div>
                    </div>

                    <div className="p-6 sm:p-8 border border-outline-variant/40 bg-surface-container-lowest flex flex-col gap-6">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center text-primary shrink-0">
                          <Landmark size={24} />
                        </div>
                        <div className="flex flex-col gap-1">
                          <h3 className="font-headline-sm text-base text-on-surface font-semibold">
                            Direct Refund Registry (UPI &amp; Bank IMPS)
                          </h3>
                          <p className="font-body-sm text-xs text-on-surface-variant leading-relaxed">
                            Refunds for eligible returned couture are disbursed within 2 to 4 hours directly into your verified UPI or account.
                          </p>
                        </div>
                      </div>

                      {bankSaved && !isEditingBank ? (
                        <div className="bg-surface-container-low p-5 border border-outline-variant/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex flex-col gap-1">
                            <span className="font-label-caps text-[10px] uppercase text-outline">
                              Linked UPI Virtual Payment Address (VPA)
                            </span>
                            <span className="font-headline-sm text-base text-on-surface font-bold tracking-wide">
                              {upiId}
                            </span>
                            <span className="text-emerald-700 text-xs font-semibold flex items-center gap-1 pt-0.5">
                              <ShieldCheck size={13} />
                              <span>Verified For Instant Direct Credit</span>
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setIsEditingBank(true)}
                            className="bg-surface-card border border-outline-variant/50 px-4 py-2 font-label-caps text-label-caps uppercase text-primary hover:bg-surface-container cursor-pointer self-start sm:self-auto font-semibold"
                          >
                            Update VPA
                          </button>
                        </div>
                      ) : (
                        <form
                          onSubmit={handleSaveBank}
                          className="bg-surface-container-low p-5 border border-outline-variant/30 flex flex-col gap-4"
                        >
                          <label className="block font-label-caps text-label-caps uppercase text-on-surface-variant font-semibold">
                            UPI ID / VPA Handle
                          </label>
                          <div className="flex flex-col sm:flex-row items-center gap-3">
                            <input
                              className="w-full bg-surface-card border border-outline-variant/50 px-3.5 py-2.5 text-body-md font-body-md text-on-surface focus:outline-none focus:border-primary"
                              placeholder="e.g. yourname@okhdfcbank or yourname@upi"
                              type="text"
                              required
                              value={upiId}
                              onChange={(e) => setUpiId(e.target.value)}
                            />
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                              <button
                                type="submit"
                                className="flex-1 sm:flex-initial bg-primary text-on-primary px-5 py-2.5 font-label-caps text-label-caps uppercase tracking-wider hover:bg-primary-container cursor-pointer font-semibold shrink-0"
                              >
                                Save UPI ID
                              </button>
                              {bankSaved && (
                                <button
                                  type="button"
                                  onClick={() => setIsEditingBank(false)}
                                  className="flex-1 sm:flex-initial bg-surface-card border border-outline-variant/50 px-4 py-2.5 font-label-caps text-label-caps uppercase text-on-surface hover:bg-surface-container cursor-pointer"
                                >
                                  Cancel
                                </button>
                              )}
                            </div>
                          </div>
                          <p className="text-[11px] text-outline">
                            Your VPA is securely encrypted and used strictly for return refund settlements.
                          </p>
                        </form>
                      )}

                      <div className="border-t border-outline-variant/30 pt-4 flex items-center justify-between text-outline font-label-caps text-[10px] uppercase tracking-wider">
                        <span className="flex items-center gap-1.5">
                          <ShieldCheck size={14} className="text-secondary" />
                          <span>NPCI / UPI 2.0 Compliant</span>
                        </span>
                        <span>Zero Commission Deductions</span>
                      </div>
                    </div>
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
