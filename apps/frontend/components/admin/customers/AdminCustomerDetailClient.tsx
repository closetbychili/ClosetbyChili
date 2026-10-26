"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Users,
  ChevronLeft,
  ChevronRight,
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
  Truck,
  ExternalLink,
  TrendingUp,
  PlusCircle,
  Lock,
} from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import {
  getAdminCustomerDetail,
  getAdminCustomerNotes,
  createAdminCustomerNote,
  type AdminCustomerDetail,
  type AdminCustomerOrderHistoryItem,
  type AdminCustomerAddress,
  type AdminCustomerNote,
} from "@/lib/api/admin";

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

function getOrderStatusBadge(status: string) {
  const norm = (status || "").toUpperCase();
  switch (norm) {
    case "DELIVERED":
      return "bg-emerald-50 text-emerald-800 border-emerald-200";
    case "SHIPPED":
      return "bg-blue-50 text-blue-800 border-blue-200";
    case "PROCESSING":
    case "CONFIRMED":
      return "bg-amber-50 text-amber-800 border-amber-200";
    case "CANCELLED":
      return "bg-rose-50 text-rose-800 border-rose-200";
    case "PENDING":
    default:
      return "bg-stone-100 text-stone-700 border-stone-200";
  }
}

function getPaymentStatusBadge(status: string) {
  const norm = (status || "").toUpperCase();
  switch (norm) {
    case "PAID":
      return "bg-emerald-50 text-emerald-800 border-emerald-200";
    case "REFUNDED":
      return "bg-purple-50 text-purple-800 border-purple-200";
    case "FAILED":
      return "bg-rose-50 text-rose-800 border-rose-200";
    case "PENDING":
    default:
      return "bg-amber-50 text-amber-800 border-amber-200";
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

  // Order history pagination state
  const [ordersPage, setOrdersPage] = useState<number>(1);
  const [isLoadingOrders, setIsLoadingOrders] = useState<boolean>(false);

  // Internal support notes state (Sprint A6.3)
  const [notes, setNotes] = useState<AdminCustomerNote[]>([]);
  const [notesCount, setNotesCount] = useState<number>(0);
  const [isLoadingNotes, setIsLoadingNotes] = useState<boolean>(false);
  const [notesError, setNotesError] = useState<string | null>(null);
  const [noteInput, setNoteInput] = useState<string>("");
  const [isSubmittingNote, setIsSubmittingNote] = useState<boolean>(false);
  const [noteSubmitSuccess, setNoteSubmitSuccess] = useState<boolean>(false);
  const [noteSubmitError, setNoteSubmitError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"overview" | "orders" | "addresses" | "notes">(
    "overview"
  );

  const fetchDetail = useCallback(
    async (isManual = false, targetPage = 1) => {
      if (isManual) {
        setIsRefreshing(true);
      } else if (targetPage !== 1) {
        setIsLoadingOrders(true);
      } else {
        setIsLoading(true);
      }
      setError(null);
      setIsNotFound(false);

      try {
        const data = await getAdminCustomerDetail(customerId, {
          page: targetPage,
          page_size: 10,
        });
        setCustomer(data);
        setOrdersPage(targetPage);
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
        setIsLoadingOrders(false);
      }
    },
    [customerId]
  );

  const fetchNotes = useCallback(async () => {
    setIsLoadingNotes(true);
    setNotesError(null);
    try {
      const resp = await getAdminCustomerNotes(customerId);
      setNotes(resp.results || []);
      setNotesCount(resp.count || 0);
    } catch (err: unknown) {
      setNotesError(
        (err as { message?: string })?.message || "Failed to load customer support notes."
      );
    } finally {
      setIsLoadingNotes(false);
    }
  }, [customerId]);

  useEffect(() => {
    let ignore = false;
    getAdminCustomerDetail(customerId, { page: 1, page_size: 10 })
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

    // Also fetch notes initially to display count badge
    getAdminCustomerNotes(customerId)
      .then((resp) => {
        if (!ignore) {
          setNotes(resp.results || []);
          setNotesCount(resp.count || 0);
        }
      })
      .catch(() => {
        // Silently catch note count failure on initial mount
      });

    return () => {
      ignore = true;
    };
  }, [customerId]);


  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = noteInput.trim();
    if (!trimmed || isSubmittingNote) return;

    if (trimmed.length > 3000) {
      setNoteSubmitError("Note body cannot exceed 3000 characters.");
      return;
    }

    setIsSubmittingNote(true);
    setNoteSubmitError(null);
    setNoteSubmitSuccess(false);

    try {
      const createdNote = await createAdminCustomerNote(customerId, trimmed);
      setNotes((prev) => [createdNote, ...prev]);
      setNotesCount((prev) => prev + 1);
      setNoteInput("");
      setNoteSubmitSuccess(true);
      setTimeout(() => setNoteSubmitSuccess(false), 4000);
    } catch (err: unknown) {
      setNoteSubmitError(
        (err as { message?: string })?.message || "Failed to save support note. Please try again."
      );
    } finally {
      setIsSubmittingNote(false);
    }
  };

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
              onClick={() => fetchDetail(true, ordersPage)}
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

  const totalOrders = customer.total_orders ?? customer.total_order_count ?? 0;
  const paidOrders = customer.paid_orders ?? customer.successful_paid_order_count ?? 0;
  const pendingOrders = customer.pending_orders ?? 0;
  const cancelledOrders = customer.cancelled_orders ?? 0;
  const addresses: AdminCustomerAddress[] = customer.addresses || [];
  const orders = customer.orders || {
    count: 0,
    page: 1,
    page_size: 10,
    total_pages: 1,
    has_next: false,
    has_previous: false,
    results: [],
  };

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
              onClick={() => {
                fetchDetail(true, ordersPage);
                if (activeTab === "notes") fetchNotes();
              }}
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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Total Spend */}
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

        {/* Orders */}
        <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-stone-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Orders</span>
            <ShoppingBag className="w-4 h-4 text-stone-400" />
          </div>
          <div className="text-2xl font-bold text-stone-900">
            {paidOrders}
            <span className="text-xs font-normal text-stone-400 ml-1">
              / {totalOrders} total
            </span>
          </div>
          <div className="text-[11px] text-stone-400 mt-0.5">Paid purchases vs all orders</div>
        </div>

        {/* Average Order Value */}
        <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-stone-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Avg Order Value</span>
            <TrendingUp className="w-4 h-4 text-stone-400" />
          </div>
          <div className="text-2xl font-serif font-bold text-stone-900">
            {formatINR(customer.average_order_value)}
          </div>
          <div className="text-[11px] text-stone-400 mt-0.5">Per paid purchase</div>
        </div>

        {/* Account Status */}
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

        {/* Latest Order Date */}
        <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-sm col-span-2 sm:col-span-1">
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
          <span>Order History ({totalOrders})</span>
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
          <span>Saved Addresses ({addresses.length})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("notes");
            fetchNotes();
          }}
          className={`pb-3 text-sm font-semibold transition border-b-2 flex items-center gap-2 ${
            activeTab === "notes"
              ? "border-stone-900 text-stone-900"
              : "border-transparent text-stone-500 hover:text-stone-800"
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Internal Notes ({notesCount})</span>
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

          {/* System Identifiers & Metrics Card */}
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

              <div className="pt-2 border-t border-stone-100 grid grid-cols-3 gap-2 text-center">
                <div className="bg-stone-50 p-2 rounded-lg border border-stone-100">
                  <div className="text-base font-bold text-emerald-700">{paidOrders}</div>
                  <div className="text-[10px] text-stone-500 font-medium uppercase">Paid</div>
                </div>
                <div className="bg-stone-50 p-2 rounded-lg border border-stone-100">
                  <div className="text-base font-bold text-amber-700">{pendingOrders}</div>
                  <div className="text-[10px] text-stone-500 font-medium uppercase">Pending</div>
                </div>
                <div className="bg-stone-50 p-2 rounded-lg border border-stone-100">
                  <div className="text-base font-bold text-rose-700">{cancelledOrders}</div>
                  <div className="text-[10px] text-stone-500 font-medium uppercase">Cancelled</div>
                </div>
              </div>

              <div className="pt-1 text-[11px] text-stone-500 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Authentication and security credentials verified by Supabase Auth</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Orders History Table */}
      {activeTab === "orders" && (
        <div className="bg-white border border-stone-200 rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-stone-200 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-stone-900">Purchase History</h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Chronological ledger of orders placed by this customer.
              </p>
            </div>
            {isLoadingOrders && (
              <div className="flex items-center gap-1.5 text-xs text-stone-500">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Loading orders...</span>
              </div>
            )}
          </div>

          {orders.results.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <ShoppingBag className="w-8 h-8 text-stone-300 mx-auto" />
              <h4 className="text-sm font-bold text-stone-800">No purchase history found</h4>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                This customer has not placed any orders yet.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-stone-600">
                  <thead className="bg-stone-50/80 text-[11px] uppercase tracking-wider text-stone-500 font-semibold border-b border-stone-200">
                    <tr>
                      <th className="py-3 px-4">Order #</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Order Status</th>
                      <th className="py-3 px-4">Payment</th>
                      <th className="py-3 px-4">Items</th>
                      <th className="py-3 px-4">Total</th>
                      <th className="py-3 px-4">Shipment Tracking</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {orders.results.map((order: AdminCustomerOrderHistoryItem) => (
                      <tr key={order.id} className="hover:bg-stone-50/60 transition">
                        {/* Order Number */}
                        <td className="py-3 px-4 font-mono font-semibold text-stone-900">
                          <Link
                            href={`/admin/orders/${order.id}`}
                            className="hover:text-[#6D1826] transition underline underline-offset-2"
                          >
                            {order.order_number}
                          </Link>
                        </td>

                        {/* Date */}
                        <td className="py-3 px-4 text-stone-600">
                          {formatDate(order.created_at)}
                        </td>

                        {/* Order Status */}
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getOrderStatusBadge(
                              order.status
                            )}`}
                          >
                            {order.status_display || order.status}
                          </span>
                        </td>

                        {/* Payment Status */}
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getPaymentStatusBadge(
                              order.payment_status
                            )}`}
                          >
                            {order.payment_status_display || order.payment_status}
                          </span>
                        </td>

                        {/* Item count */}
                        <td className="py-3 px-4 font-mono">
                          {order.item_count} {order.item_count === 1 ? "item" : "items"}
                        </td>

                        {/* Total */}
                        <td className="py-3 px-4 font-semibold text-stone-900 font-serif">
                          {formatINR(order.total)}
                        </td>

                        {/* Shipment */}
                        <td className="py-3 px-4">
                          {order.shipment ? (
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-center gap-1.5 text-stone-800 font-medium">
                                <Truck className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                                <span>{order.shipment.carrier || "Carrier Assigned"}</span>
                              </div>
                              {order.shipment.tracking_number ? (
                                <div className="flex items-center gap-1 text-[11px] font-mono text-stone-500">
                                  <span>{order.shipment.tracking_number}</span>
                                  {order.shipment.tracking_url && (
                                    <a
                                      href={order.shipment.tracking_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-stone-400 hover:text-stone-700"
                                      title="Open tracking page"
                                    >
                                      <ExternalLink className="w-3 h-3" />
                                    </a>
                                  )}
                                </div>
                              ) : null}
                            </div>
                          ) : (
                            <span className="text-stone-400 italic">No shipment yet</span>
                          )}
                        </td>

                        {/* Action */}
                        <td className="py-3 px-4 text-right">
                          <Link
                            href={`/admin/orders/${order.id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded transition"
                          >
                            <span>Inspect</span>
                            <ChevronRight className="w-3 h-3" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Order Pagination Footer */}
              {orders.total_pages > 1 && (
                <div className="p-3.5 bg-stone-50/60 border-t border-stone-200 flex items-center justify-between text-xs text-stone-600">
                  <div>
                    Page <span className="font-semibold text-stone-900">{orders.page}</span> of{" "}
                    <span className="font-semibold text-stone-900">{orders.total_pages}</span> (
                    {orders.count} total orders)
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={!orders.has_previous || isLoadingOrders}
                      onClick={() => fetchDetail(false, ordersPage - 1)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-stone-200 rounded-lg hover:bg-stone-50 disabled:opacity-40 transition font-medium"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>Previous</span>
                    </button>
                    <button
                      type="button"
                      disabled={!orders.has_next || isLoadingOrders}
                      onClick={() => fetchDetail(false, ordersPage + 1)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-stone-200 rounded-lg hover:bg-stone-50 disabled:opacity-40 transition font-medium"
                    >
                      <span>Next</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Tab 3: Saved Addresses */}
      {activeTab === "addresses" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-stone-900">Saved Address Book</h3>
              <p className="text-xs text-stone-500">
                Customer delivery locations and billing profiles recorded on file.
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-stone-100 text-stone-700 rounded-lg">
              {addresses.length} {addresses.length === 1 ? "address" : "addresses"}
            </span>
          </div>

          {addresses.length === 0 ? (
            <div className="bg-white border border-stone-200 rounded-xl p-12 text-center space-y-3 shadow-sm">
              <MapPin className="w-8 h-8 text-stone-300 mx-auto" />
              <h4 className="text-sm font-bold text-stone-800">No saved addresses</h4>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                This customer has not saved any shipping or billing addresses to their account yet.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {addresses.map((addr: AdminCustomerAddress) => (
                <div
                  key={addr.id}
                  className={`bg-white border rounded-xl p-5 shadow-sm space-y-3 flex flex-col justify-between ${
                    addr.is_default ? "border-emerald-300 ring-1 ring-emerald-200" : "border-stone-200"
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-stone-100 text-stone-700 rounded">
                        {addr.address_type}
                      </span>
                      {addr.is_default && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Default Address</span>
                        </span>
                      )}
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-stone-900">{addr.full_name}</h4>
                      <p className="text-xs font-mono text-stone-500 mt-0.5">{addr.phone}</p>
                    </div>

                    <div className="text-xs text-stone-600 leading-relaxed pt-1">
                      <div>{addr.address_line1}</div>
                      {addr.address_line2 && <div>{addr.address_line2}</div>}
                      {addr.landmark && (
                        <div className="text-stone-400 italic">Landmark: {addr.landmark}</div>
                      )}
                      <div className="font-medium text-stone-800 pt-0.5">
                        {addr.city}, {addr.state} - {addr.postal_code}
                      </div>
                      <div className="text-stone-500">{addr.country}</div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-stone-100 text-[11px] text-stone-400 flex items-center justify-between">
                    <span>Saved {formatDate(addr.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Internal Customer Notes (Sprint A6.3) */}
      {activeTab === "notes" && (
        <div className="space-y-6">
          {/* Internal Context Privacy Banner */}
          <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-4 flex items-start gap-3 shadow-sm">
            <div className="p-1 rounded bg-amber-100 text-amber-800 shrink-0 mt-0.5">
              <Lock className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <div className="text-xs font-bold text-amber-900">
                Confidential Internal Atelier & Support Context
              </div>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Staff and administrators can record interactions regarding custom measurements, delivery escalations, sizing inquiries, and return history. These notes are strictly internal and are never visible to the customer.
              </p>
            </div>
          </div>

          {/* Compose Note Card */}
          <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-sm space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700">
              Add Internal Note
            </h4>
            <form onSubmit={handleAddNote} className="space-y-3">
              <textarea
                value={noteInput}
                onChange={(e) => {
                  setNoteInput(e.target.value);
                  if (noteSubmitError) setNoteSubmitError(null);
                }}
                placeholder="Type internal customer note, sizing request, delivery inquiry, or VIP support record..."
                rows={3}
                maxLength={3000}
                disabled={isSubmittingNote}
                className="w-full text-xs text-stone-800 p-3 border border-stone-200 rounded-lg placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-400 disabled:opacity-50"
              />
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                <div className="flex items-center gap-3 text-[11px]">
                  <span
                    className={
                      noteInput.length > 2900 ? "text-amber-600 font-semibold" : "text-stone-400"
                    }
                  >
                    {noteInput.length} / 3000 characters
                  </span>
                  {noteSubmitSuccess && (
                    <span className="text-emerald-700 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Note recorded successfully
                    </span>
                  )}
                  {noteSubmitError && (
                    <span className="text-rose-600 font-medium flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {noteSubmitError}
                    </span>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={isSubmittingNote || !noteInput.trim() || noteInput.length > 3000}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-stone-900 rounded-lg hover:bg-stone-800 disabled:opacity-40 transition shadow-sm"
                >
                  {isSubmittingNote ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>Add Note</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Notes Ledger List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                Interaction History Ledger
              </h4>
              <button
                type="button"
                onClick={fetchNotes}
                disabled={isLoadingNotes}
                className="inline-flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-800 transition"
              >
                <RefreshCw className={`w-3 h-3 ${isLoadingNotes ? "animate-spin" : ""}`} />
                <span>Refresh notes</span>
              </button>
            </div>

            {notesError && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-xs text-rose-700 flex items-center justify-between">
                <span>{notesError}</span>
                <button
                  type="button"
                  onClick={fetchNotes}
                  className="font-semibold underline hover:text-rose-900"
                >
                  Retry
                </button>
              </div>
            )}

            {isLoadingNotes && notes.length === 0 ? (
              <div className="p-8 text-center text-xs text-stone-400 flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Loading internal notes...</span>
              </div>
            ) : notes.length === 0 ? (
              <div className="bg-white border border-stone-200 rounded-xl p-12 text-center space-y-3 shadow-sm">
                <FileText className="w-8 h-8 text-stone-300 mx-auto" />
                <h4 className="text-sm font-bold text-stone-800">No internal notes yet</h4>
                <p className="text-xs text-stone-500 max-w-sm mx-auto">
                  There are no internal support notes or interaction records for this customer. Use the form above to record delivery issues, custom sizing notes, or VIP requests.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {notes.map((note: AdminCustomerNote) => (
                  <div
                    key={note.id}
                    className="bg-white border border-stone-200 rounded-xl p-5 shadow-sm space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2.5 border-b border-stone-100">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center text-[10px] font-bold text-stone-700 font-mono shrink-0">
                          {(note.author_name || "S").slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-stone-900">{note.author_name}</span>
                          {note.author_email && (
                            <span className="text-[11px] text-stone-400 font-mono ml-2 truncate">
                              {note.author_email}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="px-2 py-0.5 text-[10px] font-semibold bg-stone-100 text-stone-600 rounded">
                          Internal Only
                        </span>
                        <span className="text-[11px] text-stone-400">
                          {formatDate(note.created_at)}
                        </span>
                      </div>
                    </div>
                    <div className="text-xs text-stone-800 whitespace-pre-wrap leading-relaxed font-sans">
                      {note.body}
                    </div>
                    <div className="text-[10px] font-mono text-stone-400 pt-1">
                      Note Ref: {note.id}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
