"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Users,
  ChevronLeft,
  CheckCircle2,
  XCircle,
  CreditCard,
  ShoppingBag,
  RefreshCw,
  AlertCircle,
  Fingerprint,
  ShieldCheck,
  Clock,
  MapPin,
  FileText,
} from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { getAdminCustomerDetail, type AdminCustomerDetail } from "@/lib/api/admin";

export function formatINR(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return "₹0.00";
  const numeric = typeof amount === "number" ? amount : parseFloat(amount || "0");
  if (isNaN(numeric)) return "₹0.00";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numeric);
}

function formatDate(isoString: string | null | undefined): string {
  if (!isoString) return "—";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "—";
    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return "—";
  }
}

interface AdminCustomerDetailClientProps {
  customerId: string;
}

export default function AdminCustomerDetailClient({
  customerId,
}: AdminCustomerDetailClientProps) {
  const [customer, setCustomer] = useState<AdminCustomerDetail | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isNotFound, setIsNotFound] = useState<boolean>(false);

  const [activeTab, setActiveTab] = useState<"overview" | "orders" | "addresses" | "notes">(
    "overview"
  );

  const fetchDetail = useCallback(
    async (isManual = false) => {
      if (isManual) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);
      setIsNotFound(false);

      try {
        const data = await getAdminCustomerDetail(customerId);
        setCustomer(data);
      } catch (err: unknown) {
        const status = (err as { status?: number })?.status;
        if (status === 404) {
          setIsNotFound(true);
        } else {
          const msg =
            (err as { message?: string })?.message || "Failed to load customer profile details.";
          setError(msg);
        }
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [customerId]
  );

  useEffect(() => {
    let ignore = false;
    getAdminCustomerDetail(customerId)
      .then((data) => {
        if (!ignore) {
          setCustomer(data);
          setError(null);
          setIsLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!ignore) {
          const status = (err as { status?: number })?.status;
          if (status === 404) {
            setIsNotFound(true);
          } else {
            const msg =
              (err as { message?: string })?.message || "Failed to load customer profile details.";
            setError(msg);
          }
          setIsLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [customerId]);

  if (isNotFound) {
    return (
      <div className="space-y-6 pb-12">
        <div className="bg-white border border-stone-200 rounded-xl p-12 text-center space-y-4">
          <div className="inline-flex p-4 rounded-full bg-stone-100 text-stone-500">
            <Users className="w-8 h-8 text-stone-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-stone-900">Customer Not Found</h2>
            <p className="text-sm text-stone-500 max-w-sm mx-auto mt-1">
              No registered customer record exists with identifier{" "}
              <span className="font-mono text-stone-700 font-semibold">{customerId}</span>.
            </p>
          </div>
          <div>
            <Link
              href="/admin/customers"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-stone-900 rounded-lg hover:bg-stone-800 transition shadow-sm"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back to Customer Directory</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 pb-12">
        <div className="bg-white border border-rose-200 rounded-xl p-8 text-center space-y-3">
          <div className="inline-flex p-3 rounded-full bg-rose-50 text-rose-600">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-stone-900">Failed to load customer profile</h3>
          <p className="text-sm text-stone-500 max-w-md mx-auto">{error}</p>
          <div className="flex items-center justify-center gap-3">
            <Link
              href="/admin/customers"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-stone-700 bg-white border border-stone-200 rounded-lg hover:bg-stone-50"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </Link>
            <button
              type="button"
              onClick={() => fetchDetail(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-stone-800 bg-stone-100 hover:bg-stone-200 rounded-lg transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Try Again</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading || !customer) {
    return (
      <div className="space-y-6 pb-12">
        <div className="bg-white border border-stone-200 rounded-xl p-16 text-center text-stone-400 space-y-3 animate-pulse">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-stone-900" />
          <p className="text-sm font-medium">Loading customer profile details...</p>
        </div>
      </div>
    );
  }

  const initials = (customer.display_name || customer.email || "C")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="space-y-6 pb-12">
      {/* Top Back Link */}
      <div>
        <Link
          href="/admin/customers"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-500 hover:text-stone-900 transition"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Back to Customer Directory</span>
        </Link>
      </div>

      {/* Customer Header */}
      <AdminPageHeader
        title={customer.display_name}
        description={`Customer account registered with ${customer.email}`}
        actions={
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => fetchDetail(true)}
              disabled={isRefreshing}
              className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold text-stone-700 bg-white border border-stone-200 rounded-lg hover:bg-stone-50 transition shadow-sm disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>
        }
      />

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-stone-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Lifetime Spend</span>
            <CreditCard className="w-4 h-4 text-stone-400" />
          </div>
          <div className="text-2xl font-serif font-bold text-stone-900">
            {formatINR(customer.total_paid_spend)}
          </div>
          <div className="text-[11px] text-stone-400 mt-0.5">Authoritative paid revenue</div>
        </div>

        <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-stone-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Orders</span>
            <ShoppingBag className="w-4 h-4 text-stone-400" />
          </div>
          <div className="text-2xl font-bold text-stone-900">
            {customer.successful_paid_order_count}
            <span className="text-xs font-normal text-stone-400 ml-1">
              / {customer.total_order_count} total
            </span>
          </div>
          <div className="text-[11px] text-stone-400 mt-0.5">Paid purchases vs all orders</div>
        </div>

        <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-stone-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Account Status</span>
            {customer.is_active ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            ) : (
              <XCircle className="w-4 h-4 text-stone-400" />
            )}
          </div>
          <div
            className={`text-2xl font-bold ${
              customer.is_active ? "text-emerald-700" : "text-stone-600"
            }`}
          >
            {customer.is_active ? "Active" : "Inactive"}
          </div>
          <div className="text-[11px] text-stone-400 mt-0.5">
            Role: {customer.role.replace("_", " ")}
          </div>
        </div>

        <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-stone-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Latest Order</span>
            <Clock className="w-4 h-4 text-stone-400" />
          </div>
          <div className="text-sm font-semibold text-stone-800 mt-1 truncate">
            {customer.latest_order_date ? formatDate(customer.latest_order_date) : "No orders yet"}
          </div>
          <div className="text-[11px] text-stone-400 mt-0.5">
            Joined {formatDate(customer.created_at)}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-stone-200 flex items-center gap-6">
        <button
          type="button"
          onClick={() => setActiveTab("overview")}
          className={`pb-3 text-sm font-semibold transition border-b-2 flex items-center gap-2 ${
            activeTab === "overview"
              ? "border-stone-900 text-stone-900"
              : "border-transparent text-stone-500 hover:text-stone-800"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Profile Identity</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("orders")}
          className={`pb-3 text-sm font-semibold transition border-b-2 flex items-center gap-2 ${
            activeTab === "orders"
              ? "border-stone-900 text-stone-900"
              : "border-transparent text-stone-500 hover:text-stone-800"
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Order History ({customer.total_order_count})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("addresses")}
          className={`pb-3 text-sm font-semibold transition border-b-2 flex items-center gap-2 ${
            activeTab === "addresses"
              ? "border-stone-900 text-stone-900"
              : "border-transparent text-stone-500 hover:text-stone-800"
          }`}
        >
          <MapPin className="w-4 h-4" />
          <span>Addresses</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("notes")}
          className={`pb-3 text-sm font-semibold transition border-b-2 flex items-center gap-2 ${
            activeTab === "notes"
              ? "border-stone-900 text-stone-900"
              : "border-transparent text-stone-500 hover:text-stone-800"
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Atelier Notes</span>
        </button>
      </div>

      {/* Tab 1: Profile Identity Overview */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Identity Card */}
          <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-stone-100">
              <div className="w-12 h-12 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center text-sm font-bold text-stone-800 font-mono">
                {initials}
              </div>
              <div>
                <h3 className="text-base font-bold text-stone-900">{customer.display_name}</h3>
                <span className="text-xs text-stone-500 font-mono">{customer.email}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-stone-400 block mb-0.5">Phone Number</span>
                <span className="font-mono font-medium text-stone-800">
                  {customer.phone || "Not provided"}
                </span>
              </div>

              <div>
                <span className="text-stone-400 block mb-0.5">Classification</span>
                <span className="font-semibold text-stone-800 uppercase tracking-wide text-[11px]">
                  {customer.role.replace("_", " ")}
                </span>
              </div>

              <div>
                <span className="text-stone-400 block mb-0.5">Registration Date</span>
                <span className="text-stone-800 font-medium">
                  {formatDate(customer.created_at)}
                </span>
              </div>

              <div>
                <span className="text-stone-400 block mb-0.5">Profile Last Updated</span>
                <span className="text-stone-800 font-medium">
                  {formatDate(customer.updated_at)}
                </span>
              </div>
            </div>
          </div>

          {/* System Identifiers Card */}
          <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                System Identifiers
              </span>
              <Fingerprint className="w-4 h-4 text-stone-400" />
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-stone-400 block mb-0.5">Application Customer UUID</span>
                <span className="font-mono text-stone-800 bg-stone-50 px-2.5 py-1 rounded border border-stone-200 block text-[11px] select-all">
                  {customer.id}
                </span>
              </div>

              <div>
                <span className="text-stone-400 block mb-0.5">Supabase Auth UUID</span>
                <span className="font-mono text-stone-800 bg-stone-50 px-2.5 py-1 rounded border border-stone-200 block text-[11px] select-all">
                  {customer.supabase_user_id}
                </span>
              </div>

              <div className="pt-2 text-[11px] text-stone-500 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Authentication and security credentials verified by Supabase Auth</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Orders Placeholder */}
      {activeTab === "orders" && (
        <div className="bg-white border border-stone-200 rounded-xl p-12 text-center space-y-3">
          <ShoppingBag className="w-8 h-8 text-stone-300 mx-auto" />
          <h3 className="text-sm font-bold text-stone-900">
            Order History Details ({customer.total_order_count} Total Orders)
          </h3>
          <p className="text-xs text-stone-500 max-w-md mx-auto">
            Granular order breakdown, item-level fulfillment tracking, and invoice downloads for this
            customer will be available in the upcoming customer management sprint.
          </p>
          <div className="pt-2">
            <Link
              href={`/admin/orders?search=${encodeURIComponent(customer.email)}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-stone-800 bg-stone-100 hover:bg-stone-200 rounded-lg transition"
            >
              <span>View Orders in Orders Console</span>
              <ChevronLeft className="w-3.5 h-3.5 rotate-180" />
            </Link>
          </div>
        </div>
      )}

      {/* Tab 3: Addresses Placeholder */}
      {activeTab === "addresses" && (
        <div className="bg-white border border-stone-200 rounded-xl p-12 text-center space-y-3">
          <MapPin className="w-8 h-8 text-stone-300 mx-auto" />
          <h3 className="text-sm font-bold text-stone-900">Saved Addresses</h3>
          <p className="text-xs text-stone-500 max-w-md mx-auto">
            Customer shipping addresses and delivery profiles will be available in the upcoming
            customer management sprint.
          </p>
        </div>
      )}

      {/* Tab 4: Notes Placeholder */}
      {activeTab === "notes" && (
        <div className="bg-white border border-stone-200 rounded-xl p-12 text-center space-y-3">
          <FileText className="w-8 h-8 text-stone-300 mx-auto" />
          <h3 className="text-sm font-bold text-stone-900">Internal Atelier Notes</h3>
          <p className="text-xs text-stone-500 max-w-md mx-auto">
            VIP client notes, measurements, and concierge records will be available in the upcoming
            sprint.
          </p>
        </div>
      )}
    </div>
  );
}
