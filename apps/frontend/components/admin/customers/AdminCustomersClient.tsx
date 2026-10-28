"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  Users,
  Search,
  RefreshCw,
  AlertCircle,
  RotateCcw,
  ShoppingBag,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Calendar,
  CheckCircle2,
  XCircle,
  CreditCard,
  UserCheck,
} from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import {
  getAdminCustomers,
  type AdminCustomer,
  type AdminCustomerQueryParams,
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
    }).format(d);
  } catch {
    return "—";
  }
}

const PAGE_SIZE = 20;

export default function AdminCustomersClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Read URL State
  const pageParam = parseInt(searchParams.get("page") || "1", 10);
  const page = isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;
  const search = searchParams.get("search") || "";
  const sort = searchParams.get("sort") || "newest";
  const hasOrders = searchParams.get("has_orders") || "all";
  const statusParam = searchParams.get("status") || "all";
  const dateFrom = searchParams.get("date_from") || "";
  const dateTo = searchParams.get("date_to") || "";

  // Local search draft for debounce
  const [prevSearch, setPrevSearch] = useState(search);
  const [searchInput, setSearchInput] = useState(search);
  const [customDateFrom, setCustomDateFrom] = useState(dateFrom);
  const [customDateTo, setCustomDateTo] = useState(dateTo);

  if (search !== prevSearch) {
    setPrevSearch(search);
    setSearchInput(search);
  }

  // Data states
  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const isFiltered = Boolean(
    search ||
      (hasOrders && hasOrders !== "all") ||
      (statusParam && statusParam !== "all") ||
      sort !== "newest" ||
      dateFrom ||
      dateTo
  );

  // URL State Updater Helper
  const updateUrl = useCallback(
    (updates: Record<string, string | number | null | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([k, v]) => {
        if (v === null || v === undefined || v === "" || v === "all") {
          params.delete(k);
        } else {
          params.set(k, String(v));
        }
      });
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  // Debounced search handler
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== search) {
        updateUrl({ search: searchInput || null, page: 1 });
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput, search, updateUrl]);

  // Data Fetching
  const fetchCustomers = useCallback(
    async (isManualRefresh = false) => {
      if (isManualRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        const query: AdminCustomerQueryParams = {
          page,
          page_size: PAGE_SIZE,
          search: search || undefined,
          sort: sort !== "newest" ? sort : undefined,
          has_orders: hasOrders !== "all" ? hasOrders : undefined,
          status: statusParam !== "all" ? statusParam : undefined,
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
        };

        const resp = await getAdminCustomers(query);
        setCustomers(resp.results || []);
        setTotalCount(resp.count || 0);
      } catch (err: unknown) {
        const msg = (err as { message?: string })?.message || "Failed to load customers directory.";
        setError(msg);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [page, search, sort, hasOrders, statusParam, dateFrom, dateTo]
  );

  useEffect(() => {
    let ignore = false;
    const query: AdminCustomerQueryParams = {
      page,
      page_size: PAGE_SIZE,
      search: search || undefined,
      sort: sort !== "newest" ? sort : undefined,
      has_orders: hasOrders !== "all" ? hasOrders : undefined,
      status: statusParam !== "all" ? statusParam : undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
    };

    getAdminCustomers(query)
      .then((resp) => {
        if (!ignore) {
          setCustomers(resp.results || []);
          setTotalCount(resp.count || 0);
          setError(null);
          setIsLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!ignore) {
          const msg = (err as { message?: string })?.message || "Failed to load customers directory.";
          setError(msg);
          setIsLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [page, search, sort, hasOrders, statusParam, dateFrom, dateTo]);

  const handleRefresh = () => {
    fetchCustomers(true);
  };

  const handleResetFilters = () => {
    setSearchInput("");
    setCustomDateFrom("");
    setCustomDateTo("");
    router.replace(pathname, { scroll: false });
  };

  const handleApplyDateRange = () => {
    updateUrl({
      date_from: customDateFrom || null,
      date_to: customDateTo || null,
      page: 1,
    });
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      updateUrl({ page: newPage });
    }
  };

  // Derive quick summary stats from currently loaded batch
  const quickStats = useMemo(() => {
    const activeCount = customers.filter((c) => c.is_active).length;
    const withOrdersCount = customers.filter((c) => c.total_order_count > 0).length;
    const totalBatchSpend = customers.reduce(
      (acc, c) => acc + (parseFloat(c.total_paid_spend) || 0),
      0
    );

    return {
      activeCount,
      withOrdersCount,
      totalBatchSpend,
    };
  }, [customers]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <AdminPageHeader
        title="Customer Directory"
        description="Registered patrons, commerce profiles, lifetime spend analytics, and purchasing history."
        actions={
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing || isLoading}
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
            <span className="text-xs font-semibold uppercase tracking-wider">Total Patrons</span>
            <Users className="w-4 h-4 text-stone-400" />
          </div>
          <div className="text-2xl font-bold text-stone-900">{totalCount}</div>
          <div className="text-[11px] text-stone-400 mt-0.5">Verified customer profiles</div>
        </div>

        <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-emerald-700 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Accounts</span>
            <UserCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-700">
            {quickStats.activeCount}
            <span className="text-xs font-normal text-stone-400 ml-1">in batch</span>
          </div>
          <div className="text-[11px] text-stone-400 mt-0.5">In good standing</div>
        </div>

        <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-stone-700 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">With Orders</span>
            <ShoppingBag className="w-4 h-4 text-stone-500" />
          </div>
          <div className="text-2xl font-bold text-stone-900">
            {quickStats.withOrdersCount}
            <span className="text-xs font-normal text-stone-400 ml-1">in batch</span>
          </div>
          <div className="text-[11px] text-stone-400 mt-0.5">Purchased at least once</div>
        </div>

        <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-stone-700 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Page Spend</span>
            <CreditCard className="w-4 h-4 text-stone-500" />
          </div>
          <div className="text-2xl font-bold text-stone-900">
            {formatINR(quickStats.totalBatchSpend)}
          </div>
          <div className="text-[11px] text-stone-400 mt-0.5">Paid volume on this page</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-stone-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by name, email, phone, or customer UUID..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-stone-200 rounded-lg text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-400 bg-white"
            />
          </div>

          {/* Quick Select Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={hasOrders}
              onChange={(e) => updateUrl({ has_orders: e.target.value, page: 1 })}
              className="px-2.5 py-2 text-xs border border-stone-200 rounded-lg text-stone-700 bg-white"
            >
              <option value="all">Orders: All</option>
              <option value="true">With Orders Only</option>
              <option value="false">No Orders Yet</option>
            </select>

            <select
              value={statusParam}
              onChange={(e) => updateUrl({ status: e.target.value, page: 1 })}
              className="px-2.5 py-2 text-xs border border-stone-200 rounded-lg text-stone-700 bg-white"
            >
              <option value="all">Status: All</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>

            <select
              value={sort}
              onChange={(e) => updateUrl({ sort: e.target.value, page: 1 })}
              className="px-2.5 py-2 text-xs border border-stone-200 rounded-lg text-stone-700 bg-white font-medium"
            >
              <option value="newest">Sort: Newest Joined</option>
              <option value="oldest">Sort: Oldest Joined</option>
              <option value="paid_spend_desc">Sort: Highest Paid Spend</option>
              <option value="paid_spend_asc">Sort: Lowest Paid Spend</option>
              <option value="order_count_desc">Sort: Most Orders</option>
              <option value="order_count_asc">Sort: Least Orders</option>
              <option value="latest_order_desc">Sort: Most Recent Order</option>
              <option value="name_asc">Sort: Name (A-Z)</option>
              <option value="name_desc">Sort: Name (Z-A)</option>
            </select>

            {isFiltered && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Date Filter Row */}
        <div className="pt-2 border-t border-stone-100 flex flex-wrap items-center justify-between gap-3 text-xs text-stone-600">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 font-medium text-stone-500">
              <Calendar className="w-3.5 h-3.5 text-stone-400" />
              <span>Joined Between:</span>
            </span>
            <input
              type="date"
              value={customDateFrom}
              onChange={(e) => setCustomDateFrom(e.target.value)}
              className="px-2.5 py-1 text-xs border border-stone-200 rounded-lg text-stone-700 bg-white"
            />
            <span className="text-stone-400">to</span>
            <input
              type="date"
              value={customDateTo}
              onChange={(e) => setCustomDateTo(e.target.value)}
              className="px-2.5 py-1 text-xs border border-stone-200 rounded-lg text-stone-700 bg-white"
            />
            <button
              type="button"
              onClick={handleApplyDateRange}
              className="px-3 py-1 text-xs font-semibold bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition"
            >
              Apply
            </button>
          </div>

          <div className="text-[11px] text-stone-400">
            Showing {customers.length} of {totalCount} patrons
          </div>
        </div>
      </div>

      {/* Main Table Content */}
      {error ? (
        <div className="bg-white border border-rose-200 rounded-xl p-8 text-center space-y-3">
          <div className="inline-flex p-3 rounded-full bg-rose-50 text-rose-600">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-stone-900">Failed to load customer directory</h3>
          <p className="text-sm text-stone-500 max-w-md mx-auto">{error}</p>
          <button
            type="button"
            onClick={handleRefresh}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-stone-800 bg-stone-100 hover:bg-stone-200 rounded-lg transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Try Again
          </button>
        </div>
      ) : isLoading ? (
        <div className="bg-white border border-stone-200 rounded-xl p-16 text-center text-stone-400 space-y-3 animate-pulse">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-stone-900" />
          <p className="text-sm font-medium">Loading customer accounts directory...</p>
        </div>
      ) : customers.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-xl p-16 text-center space-y-4">
          <div className="inline-flex p-4 rounded-full bg-stone-100 text-stone-500">
            <Users className="w-8 h-8 text-stone-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-stone-900">No patrons found</h3>
            <p className="text-sm text-stone-500 max-w-sm mx-auto mt-1">
              {isFiltered
                ? "No customer accounts matched your search or filter parameters."
                : "No customer accounts have registered yet in the system."}
            </p>
          </div>
          {isFiltered && (
            <div>
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Filters
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-stone-50/75 border-b border-stone-200 text-stone-500 uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Joined</th>
                  <th className="py-3 px-4 text-right">Orders (Paid / Total)</th>
                  <th className="py-3 px-4 text-right">Total Paid Spend</th>
                  <th className="py-3 px-4">Latest Order</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {customers.map((c) => {
                  const initials = (c.display_name || c.email || "C")
                    .slice(0, 2)
                    .toUpperCase();

                  return (
                    <tr key={c.id} className="hover:bg-stone-50/60 transition group">
                      {/* Customer Identity */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center text-[11px] font-bold text-stone-700 font-mono shrink-0">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <Link
                              href={`/admin/customers/${c.id}`}
                              className="font-semibold text-stone-900 hover:text-[#6D1826] transition truncate block"
                            >
                              {c.display_name}
                            </Link>
                            <div className="text-[11px] text-stone-500 font-mono truncate">
                              {c.email}
                            </div>
                            {c.phone ? (
                              <div className="text-[10px] text-stone-400 font-mono truncate">
                                {c.phone}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            c.is_active
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-stone-100 text-stone-500 border border-stone-200"
                          }`}
                        >
                          {c.is_active ? (
                            <CheckCircle2 className="w-3 h-3" />
                          ) : (
                            <XCircle className="w-3 h-3" />
                          )}
                          <span>{c.is_active ? "Active" : "Inactive"}</span>
                        </span>
                      </td>

                      {/* Joined Date */}
                      <td className="py-3 px-4 text-stone-500 whitespace-nowrap text-[11px]">
                        {formatDate(c.created_at)}
                      </td>

                      {/* Orders */}
                      <td className="py-3 px-4 text-right">
                        <div className="font-semibold text-stone-900">
                          {c.successful_paid_order_count} paid
                        </div>
                        <div className="text-[10px] text-stone-400">
                          {c.total_order_count} placed
                        </div>
                      </td>

                      {/* Total Paid Spend */}
                      <td className="py-3 px-4 text-right font-serif font-bold text-stone-900">
                        {formatINR(c.total_paid_spend)}
                      </td>

                      {/* Latest Order */}
                      <td className="py-3 px-4 text-stone-500 whitespace-nowrap text-[11px]">
                        {c.latest_order_date ? (
                          formatDate(c.latest_order_date)
                        ) : (
                          <span className="text-stone-400 italic font-normal">None</span>
                        )}
                      </td>

                      {/* Action Link */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <Link
                          href={`/admin/customers/${c.id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-stone-700 bg-stone-50 border border-stone-200 rounded-lg hover:bg-stone-100 transition group-hover:border-stone-300"
                        >
                          <span>View</span>
                          <ArrowRight className="w-3 h-3 text-stone-400 group-hover:text-stone-700 transition" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="py-3 px-4 bg-stone-50/75 border-t border-stone-200 flex items-center justify-between text-xs text-stone-600">
              <div>
                Showing page <span className="font-bold text-stone-800">{page}</span> of{" "}
                <span className="font-bold text-stone-800">{totalPages}</span> ({totalCount}{" "}
                total customers)
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page <= 1}
                  className="inline-flex items-center gap-1 px-3 py-1.5 font-medium border border-stone-200 rounded-lg bg-white hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page >= totalPages}
                  className="inline-flex items-center gap-1 px-3 py-1.5 font-medium border border-stone-200 rounded-lg bg-white hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  Next
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
