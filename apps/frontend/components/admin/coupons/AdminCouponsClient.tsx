"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  TicketPercent,
  Plus,
  RefreshCw,
  AlertCircle,
  Clock,
  CheckCircle2,
  Calendar,
  PowerOff,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import {
  getAdminCoupons,
  createAdminCoupon,
  updateAdminCoupon,
  activateAdminCoupon,
  deactivateAdminCoupon,
  type AdminCoupon,
  type AdminCreateCouponPayload,
  type AdminUpdateCouponPayload,
} from "@/lib/api/admin";
import AdminCouponsFilterBar from "./AdminCouponsFilterBar";
import AdminCouponsTable from "./AdminCouponsTable";
import AdminCouponFormModal from "./AdminCouponFormModal";
import AdminCouponToggleModal from "./AdminCouponToggleModal";
import AdminCouponDetailDrawer from "./AdminCouponDetailDrawer";

const PAGE_SIZE = 20;

export default function AdminCouponsClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // URL state
  const pageParam = parseInt(searchParams.get("page") || "1", 10);
  const page = isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;
  const search = searchParams.get("search") || "";
  const lifecycle = searchParams.get("lifecycle") || "all";
  const discountType = searchParams.get("discount_type") || "all";
  const targetingMode = searchParams.get("targeting_mode") || "all";
  const isActive = searchParams.get("is_active") || "all";
  const ordering = searchParams.get("ordering") || "-created_at";

  const isFiltered = Boolean(
    search ||
      (lifecycle && lifecycle !== "all") ||
      (discountType && discountType !== "all") ||
      (targetingMode && targetingMode !== "all") ||
      (isActive && isActive !== "all") ||
      ordering !== "-created_at"
  );

  // Data states
  const [coupons, setCoupons] = useState<AdminCoupon[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Modal / Drawer states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [couponToEdit, setCouponToEdit] = useState<AdminCoupon | null>(null);

  const [isToggleModalOpen, setIsToggleModalOpen] = useState(false);
  const [couponToToggle, setCouponToToggle] = useState<AdminCoupon | null>(null);
  const [isToggleLoading, setIsToggleLoading] = useState(false);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedCouponId, setSelectedCouponId] = useState<string | null>(null);

  // URL update helper
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

  // Fetch data on parameters change
  useEffect(() => {
    let ignore = false;

    getAdminCoupons({
      page,
      page_size: PAGE_SIZE,
      search: search || undefined,
      lifecycle: lifecycle !== "all" ? lifecycle : undefined,
      discount_type: discountType !== "all" ? discountType : undefined,
      targeting_mode: targetingMode !== "all" ? targetingMode : undefined,
      is_active: isActive !== "all" ? isActive : undefined,
      ordering,
    })
      .then((resp) => {
        if (!ignore) {
          setCoupons(resp.results || []);
          setTotalCount(resp.count || 0);
          setError(null);
          setIsLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!ignore) {
          const msg =
            (err as { message?: string })?.message || "Failed to load promotional coupons.";
          setError(msg);
          setIsLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [page, search, lifecycle, discountType, targetingMode, isActive, ordering]);

  // Manual refresh handler
  const handleRefresh = useCallback(async () => {
    try {
      setIsRefreshing(true);
      setError(null);
      const resp = await getAdminCoupons({
        page,
        page_size: PAGE_SIZE,
        search: search || undefined,
        lifecycle: lifecycle !== "all" ? lifecycle : undefined,
        discount_type: discountType !== "all" ? discountType : undefined,
        targeting_mode: targetingMode !== "all" ? targetingMode : undefined,
        is_active: isActive !== "all" ? isActive : undefined,
        ordering,
      });

      setCoupons(resp.results || []);
      setTotalCount(resp.count || 0);
    } catch (err: unknown) {
      const msg =
        (err as { message?: string })?.message || "Failed to reload promotional coupons.";
      setError(msg);
    } finally {
      setIsRefreshing(false);
    }
  }, [page, search, lifecycle, discountType, targetingMode, isActive, ordering]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      updateUrl({ page: newPage });
    }
  };

  // Reset filters
  const handleResetFilters = () => {
    router.replace(pathname, { scroll: false });
  };

  // Modal handlers
  const handleOpenCreateModal = () => {
    setCouponToEdit(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (coupon: AdminCoupon) => {
    setCouponToEdit(coupon);
    setIsFormModalOpen(true);
  };

  const handleFormSubmit = async (
    payload: AdminCreateCouponPayload | AdminUpdateCouponPayload,
    isEdit: boolean
  ) => {
    if (isEdit && couponToEdit) {
      await updateAdminCoupon(couponToEdit.id, payload as AdminUpdateCouponPayload);
    } else {
      await createAdminCoupon(payload as AdminCreateCouponPayload);
    }
    await handleRefresh();
  };

  // Toggle handlers
  const handleOpenToggleModal = (coupon: AdminCoupon) => {
    setCouponToToggle(coupon);
    setIsToggleModalOpen(true);
  };

  const handleConfirmToggle = async () => {
    if (!couponToToggle) return;
    try {
      setIsToggleLoading(true);
      if (couponToToggle.is_active) {
        await deactivateAdminCoupon(couponToToggle.id);
      } else {
        await activateAdminCoupon(couponToToggle.id);
      }
      setIsToggleModalOpen(false);
      setCouponToToggle(null);
      await handleRefresh();
    } catch (err: unknown) {
      const msg =
        (err as { message?: string })?.message || "Failed to update coupon status.";
      alert(msg);
    } finally {
      setIsToggleLoading(false);
    }
  };

  // Drawer handlers
  const handleSelectCoupon = (coupon: AdminCoupon) => {
    setSelectedCouponId(coupon.id);
    setDrawerOpen(true);
  };

  // Metric breakdown derived from current dataset / total
  const metrics = useMemo(() => {
    const valid = coupons.filter(
      (c) => c.is_active && c.lifecycle_status === "CURRENTLY_VALID"
    ).length;
    const scheduled = coupons.filter(
      (c) => c.is_active && c.lifecycle_status === "SCHEDULED"
    ).length;
    const expired = coupons.filter(
      (c) => c.is_active && c.lifecycle_status === "EXPIRED"
    ).length;
    const inactive = coupons.filter((c) => !c.is_active).length;

    return {
      total: totalCount,
      valid,
      scheduled,
      expired,
      inactive,
    };
  }, [coupons, totalCount]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <AdminPageHeader
        title="Coupons & Promotions"
        description="Discount codes, promotional campaigns, redemption limits, and minimum cart eligibility."
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
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-stone-900 rounded-lg hover:bg-stone-800 transition shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Coupon</span>
            </button>
          </div>
        }
      />

      {/* Summary Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-stone-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Total</span>
            <TicketPercent className="w-4 h-4 text-stone-400" />
          </div>
          <div className="text-2xl font-bold text-stone-900">{metrics.total}</div>
          <div className="text-[11px] text-stone-400 mt-0.5">Configured promo codes</div>
        </div>

        <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-emerald-700 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Valid Now</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-700">{metrics.valid}</div>
          <div className="text-[11px] text-stone-400 mt-0.5">Active & redeemable</div>
        </div>

        <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-amber-700 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Scheduled</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-700">{metrics.scheduled}</div>
          <div className="text-[11px] text-stone-400 mt-0.5">Upcoming promotions</div>
        </div>

        <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-stone-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Expired</span>
            <Calendar className="w-4 h-4 text-stone-400" />
          </div>
          <div className="text-2xl font-bold text-stone-600">{metrics.expired}</div>
          <div className="text-[11px] text-stone-400 mt-0.5">Past end date</div>
        </div>

        <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-sm col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-rose-700 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Inactive</span>
            <PowerOff className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold text-rose-700">{metrics.inactive}</div>
          <div className="text-[11px] text-stone-400 mt-0.5">Disabled by admin</div>
        </div>
      </div>

      {/* Filter Bar */}
      <AdminCouponsFilterBar
        search={search}
        onSearchChange={(val) => updateUrl({ search: val, page: 1 })}
        lifecycle={lifecycle}
        onLifecycleChange={(val) => updateUrl({ lifecycle: val, page: 1 })}
        discountType={discountType}
        onDiscountTypeChange={(val) => updateUrl({ discount_type: val, page: 1 })}
        targetingMode={targetingMode}
        onTargetingModeChange={(val) => updateUrl({ targeting_mode: val, page: 1 })}
        isActive={isActive}
        onIsActiveChange={(val) => updateUrl({ is_active: val, page: 1 })}
        ordering={ordering}
        onOrderingChange={(val) => updateUrl({ ordering: val, page: 1 })}
        onResetFilters={handleResetFilters}
        isFiltered={isFiltered}
      />

      {/* Main Content Area */}
      {error ? (
        <div className="bg-white border border-rose-200 rounded-xl p-8 text-center space-y-3">
          <div className="inline-flex p-3 rounded-full bg-rose-50 text-rose-600">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-stone-900">Failed to load coupons</h3>
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
        <div className="bg-white border border-stone-200 rounded-xl p-16 text-center text-stone-400 space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-stone-900" />
          <p className="text-sm font-medium">Loading promotional coupons...</p>
        </div>
      ) : coupons.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-xl p-16 text-center space-y-4">
          <div className="inline-flex p-4 rounded-full bg-stone-100 text-stone-500">
            <TicketPercent className="w-8 h-8 text-stone-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-stone-900">No coupons found</h3>
            <p className="text-sm text-stone-500 max-w-sm mx-auto mt-1">
              {isFiltered
                ? "No promotional coupons matched your selected filter parameters."
                : "No coupons have been registered yet in the system."}
            </p>
          </div>
          <div>
            {isFiltered ? (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Filters
              </button>
            ) : (
              <button
                type="button"
                onClick={handleOpenCreateModal}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-stone-900 hover:bg-stone-800 rounded-lg transition shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                Create First Coupon
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <AdminCouponsTable
            coupons={coupons}
            onSelectCoupon={handleSelectCoupon}
            onEditCoupon={handleOpenEditModal}
            onToggleStatus={handleOpenToggleModal}
          />

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-2 pt-2 text-xs text-stone-500">
              <div>
                Showing page <span className="font-bold text-stone-800">{page}</span> of{" "}
                <span className="font-bold text-stone-800">{totalPages}</span> ({totalCount}{" "}
                total coupons)
              </div>
              <div className="flex items-center gap-2">
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

      {/* Form Modal (Create & Edit) */}
      <AdminCouponFormModal
        isOpen={isFormModalOpen}
        couponToEdit={couponToEdit}
        onClose={() => setIsFormModalOpen(false)}
        onSubmit={handleFormSubmit}
      />

      {/* Confirmation Modal (Activate & Deactivate) */}
      <AdminCouponToggleModal
        isOpen={isToggleModalOpen}
        coupon={couponToToggle}
        isLoading={isToggleLoading}
        onClose={() => {
          setIsToggleModalOpen(false);
          setCouponToToggle(null);
        }}
        onConfirm={handleConfirmToggle}
      />

      {/* Slide-out Detail Drawer */}
      <AdminCouponDetailDrawer
        isOpen={drawerOpen}
        couponId={selectedCouponId}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedCouponId(null);
        }}
        onEdit={(coupon) => {
          handleOpenEditModal(coupon);
        }}
        onToggleStatus={(coupon) => {
          handleOpenToggleModal(coupon);
        }}
      />
    </div>
  );
}
