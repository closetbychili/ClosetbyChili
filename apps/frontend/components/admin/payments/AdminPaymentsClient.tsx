"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  CreditCard,
  ExternalLink,
  History,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  X,
  XCircle,
} from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import {
  getAdminPaymentDetail,
  getAdminPayments,
  reconcileAdminPayment,
  type AdminPaymentDetail,
  type AdminPaymentQueryParams,
  type AdminPaymentRecord,
  type PaymentDiscrepancyStatus,
} from "@/lib/api/admin";

const PAGE_SIZE = 20;

export default function AdminPaymentsClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Read URL query parameters
  const pageParam = parseInt(searchParams.get("page") || "1", 10);
  const page = isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;
  const search = searchParams.get("search") || "";
  const paymentStatus = searchParams.get("payment_status") || "all";
  const provider = searchParams.get("provider") || "all";
  const discrepancyStatus = searchParams.get("discrepancy_status") || "all";
  const dateFrom = searchParams.get("date_from") || "";
  const dateTo = searchParams.get("date_to") || "";
  const ordering = searchParams.get("ordering") || "-created_at";

  const isFiltered = Boolean(
    search ||
      (paymentStatus && paymentStatus !== "all") ||
      (provider && provider !== "all") ||
      (discrepancyStatus && discrepancyStatus !== "all") ||
      dateFrom ||
      dateTo
  );

  // Component states
  const [payments, setPayments] = useState<AdminPaymentRecord[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  // Detail Drawer state
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [paymentDetail, setPaymentDetail] = useState<AdminPaymentDetail | null>(null);

  // Reconciliation Confirmation Modal state
  const [reconcileModalOpen, setReconcileModalOpen] = useState<boolean>(false);
  const [reconciling, setReconciling] = useState<boolean>(false);
  const [reconcileError, setReconcileError] = useState<string | null>(null);
  const [reconcileSuccess, setReconcileSuccess] = useState<string | null>(null);

  // Helper to update URL query params cleanly
  const updateUrl = useCallback(
    (updates: Record<string, string | number | null | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(updates).forEach(([key, value]) => {
        if (
          value === null ||
          value === undefined ||
          value === "" ||
          value === "all"
        ) {
          params.delete(key);
        } else {
          params.set(key, String(value));
        }
      });

      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  // Main data fetching effect with race condition cancellation
  useEffect(() => {
    let active = true;

    const fetchPayments = async () => {
      try {
        setLoading(true);
        setError(null);

        const params: AdminPaymentQueryParams = {
          page,
          page_size: PAGE_SIZE,
          search: search || undefined,
          payment_status: paymentStatus !== "all" ? paymentStatus : undefined,
          provider: provider !== "all" ? provider : undefined,
          discrepancy_status: discrepancyStatus !== "all" ? discrepancyStatus : undefined,
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
          ordering,
        };

        const resp = await getAdminPayments(params);
        if (active) {
          setPayments(resp.results || []);
          setTotalCount(resp.count || 0);
        }
      } catch (err: unknown) {
        if (active) {
          const msg = err instanceof Error ? err.message : "Failed to load payment records.";
          setError(msg);
        }
      } finally {
        if (active) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    };

    fetchPayments();

    return () => {
      active = false;
    };
  }, [page, search, paymentStatus, provider, discrepancyStatus, dateFrom, dateTo, ordering, refreshTrigger]);

  // Fetch payment detail
  const loadDetail = useCallback(async (id: string) => {
    try {
      setDetailLoading(true);
      setDetailError(null);
      const detail = await getAdminPaymentDetail(id);
      setPaymentDetail(detail);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to fetch payment details.";
      setDetailError(msg);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const handleOpenDetail = (payment: AdminPaymentRecord) => {
    setSelectedPaymentId(payment.id);
    setReconcileSuccess(null);
    setReconcileError(null);
    loadDetail(payment.id);
  };

  const handleCloseDetail = () => {
    setSelectedPaymentId(null);
    setPaymentDetail(null);
    setDetailError(null);
    setReconcileSuccess(null);
    setReconcileError(null);
  };

  // Safe Reconciliation Action
  const handleTriggerReconcile = async () => {
    if (!paymentDetail) return;
    try {
      setReconciling(true);
      setReconcileError(null);

      const res = await reconcileAdminPayment(paymentDetail.id);
      setReconcileSuccess(
        `Reconciliation complete: ${res.detail} (Outcome: ${res.outcome})`
      );
      setReconcileModalOpen(false);

      // Reload both detail and list
      await loadDetail(paymentDetail.id);
      setRefreshTrigger((k) => k + 1);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Reconciliation request failed.";
      setReconcileError(msg);
    } finally {
      setReconciling(false);
    }
  };

  const formatCurrency = (val: string | number, currency = "INR") => {
    const num = typeof val === "string" ? parseFloat(val) : val;
    if (isNaN(num)) return `₹0.00`;
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currency || "INR",
      maximumFractionDigits: 2,
    }).format(num);
  };

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return "—";
    try {
      return new Date(isoString).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return isoString;
    }
  };

  const renderPaymentStatusBadge = (statusStr: string) => {
    const st = (statusStr || "").toUpperCase();
    switch (st) {
      case "PAID":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
            Paid
          </span>
        );
      case "PENDING":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
            Pending
          </span>
        );
      case "FAILED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 text-rose-800 border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
            Failed
          </span>
        );
      case "REFUNDED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
            Refunded
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-700 border border-gray-200">
            {statusStr}
          </span>
        );
    }
  };

  const renderDiscrepancyBadge = (status: PaymentDiscrepancyStatus | string) => {
    switch (status) {
      case "MATCHED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <ShieldCheck className="w-3 h-3 text-emerald-600" />
            Matched
          </span>
        );
      case "AMOUNT_MISMATCH":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
            <AlertCircle className="w-3 h-3 text-rose-600" />
            Amount Mismatch
          </span>
        );
      case "CURRENCY_MISMATCH":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
            <AlertCircle className="w-3 h-3 text-rose-600" />
            Currency Mismatch
          </span>
        );
      case "STATUS_CONFLICT":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
            <ShieldAlert className="w-3 h-3 text-rose-600" />
            Status Conflict
          </span>
        );
      case "DUPLICATE_ATTEMPT":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-purple-50 text-purple-700 border border-purple-200">
            <AlertTriangle className="w-3 h-3 text-purple-600" />
            Duplicate Attempt
          </span>
        );
      case "NEEDS_REVIEW":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600" />
            Needs Review
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-gray-50 text-gray-700 border border-gray-200">
            {status}
          </span>
        );
    }
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <AdminPageHeader
        title="Payment Operations & Reconciliation"
        description="Authoritative payment visibility, discrepancy detection, and server-side gateway reconciliation."
        breadcrumbs={[
          { label: "Dashboard", href: "/admin" },
          { label: "Orders", href: "/admin/orders" },
          { label: "Payments" },
        ]}
        actions={
          <div className="flex items-center gap-3">
            <Link
              href="/admin/orders"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#6D1826] bg-[#FAF6F2] hover:bg-[#F5EFE9] rounded-lg border border-[#EBE2D8] transition-colors"
            >
              <span>View Orders</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <button
              type="button"
              onClick={() => {
                setRefreshing(true);
                setRefreshTrigger((k) => k + 1);
              }}
              disabled={loading || refreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#1F1B17] bg-white hover:bg-[#FAF6F2] rounded-lg border border-[#EBE2D8] shadow-xs transition-colors disabled:opacity-50"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 text-[#8C7A78] ${
                  refreshing ? "animate-spin" : ""
                }`}
              />
              <span>Refresh</span>
            </button>
          </div>
        }
      />

      {/* Discrepancy & Security Guidance Alert */}
      <div className="bg-[#FAF6F2] border border-[#EBE2D8] rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800 shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-semibold text-[#1F1B17]">
              Authoritative Gateway Reconciliation
            </h2>
            <p className="text-[11px] text-[#8C7A78] mt-0.5">
              Reconciliations contact Razorpay server-side to verify captured amounts and atomic inventory finalization. Manual status overrides are disabled by policy.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <span className="text-[#8C7A78] font-medium">Evaluation Findings:</span>
          <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
            MATCHED
          </span>
          <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
            NEEDS_REVIEW
          </span>
          <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
            STATUS_CONFLICT
          </span>
          <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
            DUPLICATE_ATTEMPT
          </span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl border border-[#EBE2D8] p-4 shadow-[0_2px_10px_-2px_rgba(79,0,18,0.03)] space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8C7A78]" />
            <input
              type="text"
              defaultValue={search}
              placeholder="Search by order #, payment ID, gateway order, email..."
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  updateUrl({
                    search: (e.target as HTMLInputElement).value,
                    page: 1,
                  });
                }
              }}
              onBlur={(e) => {
                if (e.target.value !== search) {
                  updateUrl({ search: e.target.value, page: 1 });
                }
              }}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#FAF6F2] border border-[#EBE2D8] rounded-lg text-[#1F1B17] placeholder-[#A89895] focus:outline-hidden focus:border-[#4F0012] focus:bg-white transition-colors"
            />
          </div>

          {/* Payment Status Filter */}
          <div>
            <select
              value={paymentStatus}
              onChange={(e) =>
                updateUrl({ payment_status: e.target.value, page: 1 })
              }
              className="w-full px-3 py-1.5 text-xs bg-[#FAF6F2] border border-[#EBE2D8] rounded-lg text-[#1F1B17] focus:outline-hidden focus:border-[#4F0012] focus:bg-white transition-colors"
            >
              <option value="all">All Payment Statuses</option>
              <option value="PAID">Paid</option>
              <option value="PENDING">Pending</option>
              <option value="FAILED">Failed</option>
              <option value="REFUNDED">Refunded</option>
            </select>
          </div>

          {/* Provider Filter */}
          <div>
            <select
              value={provider}
              onChange={(e) =>
                updateUrl({ provider: e.target.value, page: 1 })
              }
              className="w-full px-3 py-1.5 text-xs bg-[#FAF6F2] border border-[#EBE2D8] rounded-lg text-[#1F1B17] focus:outline-hidden focus:border-[#4F0012] focus:bg-white transition-colors"
            >
              <option value="all">All Providers</option>
              <option value="razorpay">Razorpay</option>
              <option value="internal">Internal</option>
            </select>
          </div>
        </div>

        {/* Second Row: Discrepancy Status and Dates */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-1 border-t border-[#F5EFE9]">
          <div>
            <select
              value={discrepancyStatus}
              onChange={(e) =>
                updateUrl({ discrepancy_status: e.target.value, page: 1 })
              }
              className="w-full px-3 py-1.5 text-xs bg-[#FAF6F2] border border-[#EBE2D8] rounded-lg text-[#1F1B17] focus:outline-hidden focus:border-[#4F0012] focus:bg-white transition-colors"
            >
              <option value="all">All Discrepancy Findings</option>
              <option value="MATCHED">Matched</option>
              <option value="NEEDS_REVIEW">Needs Review</option>
              <option value="STATUS_CONFLICT">Status Conflict</option>
              <option value="AMOUNT_MISMATCH">Amount Mismatch</option>
              <option value="CURRENCY_MISMATCH">Currency Mismatch</option>
              <option value="DUPLICATE_ATTEMPT">Duplicate Attempt</option>
            </select>
          </div>

          <div>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) =>
                updateUrl({ date_from: e.target.value, page: 1 })
              }
              title="From date"
              placeholder="From Date"
              className="w-full px-3 py-1.5 text-xs bg-[#FAF6F2] border border-[#EBE2D8] rounded-lg text-[#1F1B17] focus:outline-hidden focus:border-[#4F0012] focus:bg-white transition-colors"
            />
          </div>

          <div>
            <input
              type="date"
              value={dateTo}
              onChange={(e) =>
                updateUrl({ date_to: e.target.value, page: 1 })
              }
              title="To date"
              placeholder="To Date"
              className="w-full px-3 py-1.5 text-xs bg-[#FAF6F2] border border-[#EBE2D8] rounded-lg text-[#1F1B17] focus:outline-hidden focus:border-[#4F0012] focus:bg-white transition-colors"
            />
          </div>

          <div className="flex items-center justify-between md:justify-end gap-2">
            {isFiltered && (
              <button
                type="button"
                onClick={() => {
                  router.replace(pathname, { scroll: false });
                }}
                className="px-3 py-1.5 text-xs font-medium text-[#6D1826] hover:bg-[#FAF6F2] rounded-lg border border-transparent hover:border-[#EBE2D8] transition-colors"
              >
                Clear Filters
              </button>
            )}
            <span className="text-[11px] text-[#8C7A78]">
              {totalCount} transaction{totalCount === 1 ? "" : "s"}
            </span>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center justify-between text-xs text-rose-800">
          <div className="flex items-center gap-2">
            <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setRefreshTrigger((k) => k + 1)}
            className="px-3 py-1 bg-white border border-rose-200 rounded-lg text-rose-700 font-medium hover:bg-rose-100 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Payments Table */}
      <div className="bg-white rounded-xl border border-[#EBE2D8] shadow-[0_2px_10px_-2px_rgba(79,0,18,0.03)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#F5EFE9] bg-[#FAF6F2] text-[#8C7A78] uppercase text-[10px] tracking-wider font-semibold">
                <th className="py-3 px-4">Order #</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Provider</th>
                <th className="py-3 px-4">Payment Status</th>
                <th className="py-3 px-4">Discrepancy Evaluation</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F5EFE9]">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#8C7A78]">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-[#6D1826]" />
                      <span>Loading payment records...</span>
                    </div>
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#8C7A78]">
                    <div className="max-w-xs mx-auto space-y-1">
                      <CreditCard className="w-8 h-8 text-[#A89895] mx-auto mb-2" />
                      <div className="font-semibold text-[#1F1B17]">No payment records found</div>
                      <p className="text-[11px] text-[#8C7A78]">
                        {isFiltered
                          ? "No transactions match your active search filters."
                          : "No payment operations have been recorded yet."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr
                    key={p.id}
                    className="hover:bg-[#FAF6F2]/60 transition-colors"
                  >
                    <td className="py-3 px-4 font-medium text-[#1F1B17]">
                      <Link
                        href={`/admin/orders/${p.order_id}`}
                        className="hover:text-[#4F0012] hover:underline flex items-center gap-1 font-mono text-[11px]"
                      >
                        {p.order_number}
                        <ExternalLink className="w-3 h-3 text-[#A89895]" />
                      </Link>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-[#1F1B17]">
                        {p.customer?.display_name || "Patron"}
                      </div>
                      <div className="text-[11px] text-[#8C7A78] font-mono">
                        {p.customer?.email}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-[#1F1B17]">
                      {formatCurrency(p.amount, p.currency)}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-medium text-[#1F1B17]">
                        {p.provider}
                      </span>
                      {p.razorpay_payment_id ? (
                        <div className="font-mono text-[10px] text-[#8C7A78] truncate max-w-30">
                          {p.razorpay_payment_id}
                        </div>
                      ) : p.razorpay_order_id ? (
                        <div className="font-mono text-[10px] text-[#A89895] truncate max-w-30">
                          {p.razorpay_order_id}
                        </div>
                      ) : null}
                    </td>
                    <td className="py-3 px-4">
                      {renderPaymentStatusBadge(p.payment_status)}
                    </td>
                    <td className="py-3 px-4">
                      {renderDiscrepancyBadge(p.discrepancy_status)}
                    </td>
                    <td className="py-3 px-4 text-[#8C7A78] text-[11px]">
                      {formatDate(p.created_at)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleOpenDetail(p)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#6D1826] bg-[#FAF6F2] hover:bg-[#F5EFE9] border border-[#EBE2D8] rounded-md transition-colors"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="p-3 border-t border-[#F5EFE9] bg-[#FAF6F2] flex items-center justify-between text-xs text-[#8C7A78]">
            <div>
              Page <span className="font-medium text-[#1F1B17]">{page}</span> of{" "}
              <span className="font-medium text-[#1F1B17]">{totalPages}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => updateUrl({ page: page - 1 })}
                className="px-3 py-1 bg-white border border-[#EBE2D8] rounded-md text-[#1F1B17] hover:bg-[#FAF6F2] disabled:opacity-40 transition-colors"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => updateUrl({ page: page + 1 })}
                className="px-3 py-1 bg-white border border-[#EBE2D8] rounded-md text-[#1F1B17] hover:bg-[#FAF6F2] disabled:opacity-40 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Slide-Over / Modal */}
      {selectedPaymentId && (
        <div
          role="dialog"
          aria-modal="true"
          data-lenis-prevent="true"
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overscroll-contain"
        >
          <div className="bg-white rounded-2xl border border-[#EBE2D8] shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 overscroll-contain">
            {/* Modal Header */}
            <div className="p-4 border-b border-[#EBE2D8] bg-[#FAF6F2] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[#6D1826]" />
                <h2 className="text-sm font-semibold text-[#1F1B17]">
                  Payment Operation Detail
                </h2>
              </div>
              <button
                type="button"
                onClick={handleCloseDetail}
                className="p-1 rounded-lg text-[#8C7A78] hover:text-[#1F1B17] hover:bg-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs">
              {detailLoading ? (
                <div className="py-12 text-center text-[#8C7A78] flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-[#6D1826]" />
                  <span>Loading payment details...</span>
                </div>
              ) : detailError ? (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-rose-800">
                  <div className="font-semibold mb-1">Failed to load payment detail</div>
                  <p>{detailError}</p>
                </div>
              ) : paymentDetail ? (
                <>
                  {/* Notifications */}
                  {reconcileSuccess && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-2 text-emerald-800">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{reconcileSuccess}</span>
                    </div>
                  )}

                  {reconcileError && (
                    <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-center gap-2 text-rose-800">
                      <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{reconcileError}</span>
                    </div>
                  )}

                  {/* Discrepancy Evaluation Card */}
                  <div className="bg-[#FAF6F2] rounded-xl border border-[#EBE2D8] p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[#1F1B17] uppercase text-[10px] tracking-wider">
                          Authoritative Assessment
                        </span>
                        {renderDiscrepancyBadge(paymentDetail.discrepancy_status)}
                      </div>
                      <span className="text-[11px] text-[#8C7A78]">
                        Evaluated against persisted records
                      </span>
                    </div>

                    <div className="space-y-1.5 pt-1 border-t border-[#EBE2D8]/80">
                      {paymentDetail.discrepancy_details &&
                      paymentDetail.discrepancy_details.length > 0 ? (
                        paymentDetail.discrepancy_details.map((finding, idx) => (
                          <div
                            key={idx}
                            className="flex items-start gap-2 text-[#554243] bg-white p-2 rounded-lg border border-[#EBE2D8]/60"
                          >
                            <span className="text-[#6D1826] font-bold">•</span>
                            <span>{finding}</span>
                          </div>
                        ))
                      ) : (
                        <div className="text-[#8C7A78] italic">
                          No discrepancy findings reported.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Gateway & Order Identifiers Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-3 rounded-xl border border-[#EBE2D8] space-y-1">
                      <span className="text-[10px] uppercase font-semibold text-[#8C7A78]">
                        Related Order
                      </span>
                      <div className="font-medium text-[#1F1B17]">
                        <Link
                          href={`/admin/orders/${paymentDetail.order_id}`}
                          className="hover:underline text-[#4F0012] flex items-center gap-1 font-mono"
                        >
                          {paymentDetail.order_number}
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </div>
                      <div className="text-[11px] text-[#8C7A78]">
                        Status: {paymentDetail.order_status_display}
                      </div>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-[#EBE2D8] space-y-1">
                      <span className="text-[10px] uppercase font-semibold text-[#8C7A78]">
                        Payment Provider
                      </span>
                      <div className="font-semibold text-[#1F1B17]">
                        {paymentDetail.provider}
                      </div>
                      <div className="text-[11px] text-[#8C7A78]">
                        Status: {paymentDetail.payment_status_display}
                      </div>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-[#EBE2D8] space-y-1">
                      <span className="text-[10px] uppercase font-semibold text-[#8C7A78]">
                        Razorpay Order ID
                      </span>
                      <code className="font-mono text-[11px] text-[#1F1B17] block truncate">
                        {paymentDetail.razorpay_order_id || "—"}
                      </code>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-[#EBE2D8] space-y-1">
                      <span className="text-[10px] uppercase font-semibold text-[#8C7A78]">
                        Razorpay Payment ID
                      </span>
                      <code className="font-mono text-[11px] text-[#1F1B17] block truncate">
                        {paymentDetail.razorpay_payment_id || "—"}
                      </code>
                    </div>
                  </div>

                  {/* Financial Breakdown */}
                  <div className="bg-white p-4 rounded-xl border border-[#EBE2D8] space-y-2">
                    <div className="font-semibold uppercase text-[10px] tracking-wider text-[#8C7A78] pb-1 border-b border-[#F5EFE9]">
                      Financial Summary
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                      <div>
                        <span className="text-[#8C7A78] block">Subtotal</span>
                        <span className="font-mono font-medium">
                          {formatCurrency(paymentDetail.subtotal, paymentDetail.currency)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#8C7A78] block">Discount</span>
                        <span className="font-mono font-medium">
                          {formatCurrency(paymentDetail.discount, paymentDetail.currency)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#8C7A78] block">Shipping</span>
                        <span className="font-mono font-medium">
                          {formatCurrency(paymentDetail.shipping_amount, paymentDetail.currency)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#8C7A78] block">Total</span>
                        <span className="font-mono font-bold text-[#4F0012]">
                          {formatCurrency(paymentDetail.amount, paymentDetail.currency)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Customer Info */}
                  <div className="bg-white p-4 rounded-xl border border-[#EBE2D8] space-y-1">
                    <span className="text-[10px] uppercase font-semibold text-[#8C7A78]">
                      Customer Identity
                    </span>
                    <div className="font-medium text-[#1F1B17]">
                      {paymentDetail.customer?.display_name || "Patron"}
                    </div>
                    <div className="text-[11px] text-[#8C7A78] font-mono">
                      {paymentDetail.customer?.email}
                    </div>
                  </div>

                  {/* Audit Logs / Reconciliation History */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 font-semibold uppercase text-[10px] tracking-wider text-[#8C7A78]">
                      <History className="w-3.5 h-3.5 text-[#6D1826]" />
                      <span>Privileged Audit History ({paymentDetail.audit_logs?.length || 0})</span>
                    </div>

                    {paymentDetail.audit_logs && paymentDetail.audit_logs.length > 0 ? (
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {paymentDetail.audit_logs.map((log) => (
                          <div
                            key={log.id}
                            className="bg-[#FAF6F2] border border-[#EBE2D8] rounded-lg p-2.5 space-y-1 text-[11px]"
                          >
                            <div className="flex items-center justify-between text-[#8C7A78]">
                              <span className="font-medium text-[#1F1B17]">
                                {log.operation_type_display || log.operation_type}
                              </span>
                              <span>{formatDate(log.created_at)}</span>
                            </div>
                            <div className="text-[#554243]">
                              {log.from_status} → {log.to_status}
                            </div>
                            {log.note && (
                              <div className="text-[#8C7A78] italic">
                                &quot;{log.note}&quot;
                              </div>
                            )}
                            <div className="text-[10px] text-[#A89895]">
                              By: {log.actor_email || "System"}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-[#8C7A78] italic text-[11px]">
                        No prior audit history for this transaction.
                      </div>
                    )}
                  </div>
                </>
              ) : null}
            </div>

            {/* Modal Actions */}
            {paymentDetail && (
              <div className="p-4 border-t border-[#EBE2D8] bg-[#FAF6F2] flex items-center justify-between">
                <span className="text-[11px] text-[#8C7A78]">
                  {paymentDetail.is_reconciled
                    ? "✓ Authoritatively confirmed on gateway"
                    : "Eligible for server-side reconciliation lookup"}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCloseDetail}
                    className="px-3 py-1.5 rounded-lg border border-[#EBE2D8] bg-white text-[#1F1B17] hover:bg-[#FAF6F2] font-medium transition-colors"
                  >
                    Close
                  </button>

                  {/* Reconcile Action Button */}
                  {paymentDetail.order_status !== "CANCELLED" && (
                    <button
                      type="button"
                      onClick={() => setReconcileModalOpen(true)}
                      className="px-3.5 py-1.5 rounded-lg bg-[#4F0012] hover:bg-[#6D1826] text-white font-medium shadow-xs transition-colors flex items-center gap-1.5"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Reconcile with Gateway</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Modal for Reconciliation */}
      {reconcileModalOpen && paymentDetail && (
        <div
          role="dialog"
          aria-modal="true"
          data-lenis-prevent="true"
          className="fixed inset-0 z-60 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overscroll-contain"
        >
          <div className="bg-white rounded-2xl border border-[#EBE2D8] shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 overscroll-contain">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#1F1B17]">
                  Confirm Gateway Reconciliation
                </h3>
                <p className="text-xs text-[#8C7A78] mt-0.5">
                  Order {paymentDetail.order_number}
                </p>
              </div>
            </div>

            <div className="bg-[#FAF6F2] border border-[#EBE2D8] rounded-xl p-3 text-xs text-[#554243] space-y-2">
              <p>
                This operation directly queries the <strong>Razorpay API</strong> to inspect authoritative payment capture status.
              </p>
              <ul className="list-disc pl-4 space-y-1 text-[11px] text-[#8C7A78]">
                <li>Verifies captured amount matches exact order total ({formatCurrency(paymentDetail.amount, paymentDetail.currency)}).</li>
                <li>Atomically confirms order and finalizes inventory reservations.</li>
                <li>Writes an immutable entry to the order audit trail.</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={reconciling}
                onClick={() => setReconcileModalOpen(false)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-[#EBE2D8] bg-white text-[#1F1B17] hover:bg-[#FAF6F2] disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={reconciling}
                onClick={handleTriggerReconcile}
                className="px-4 py-1.5 text-xs font-medium rounded-lg bg-[#4F0012] hover:bg-[#6D1826] text-white shadow-xs disabled:opacity-50 transition-colors flex items-center gap-1.5"
              >
                {reconciling ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Reconciling...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Confirm & Reconcile</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
