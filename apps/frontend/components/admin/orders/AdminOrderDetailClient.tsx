"use client";

/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  ExternalLink,
  Hash,
  History,
  Lock,
  MapPin,
  Package,
  RefreshCw,
  RotateCcw,
  ShoppingBag,
  Truck,
  User,
  X,
  XCircle,
} from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import {
  cancelAdminOrder,
  getAdminOrderDetail,
  transitionAdminOrderStatus,
  type AdminOrderDetail,
} from "@/lib/api/admin";

interface AdminOrderDetailClientProps {
  orderId: string;
}

interface OrderAction {
  id: "confirm" | "processing" | "shipped" | "delivered" | "cancel";
  label: string;
  type: "transition" | "cancel";
  targetStatus?: string;
  variant: "primary" | "secondary" | "danger";
  description: string;
}

function getErrorMessage(err: unknown): string {
  if (err && typeof err === "object") {
    const errorObj = err as Record<string, unknown>;
    const data = errorObj.data as Record<string, unknown> | undefined;
    if (data?.error && typeof data.error === "object") {
      const apiErr = data.error as Record<string, unknown>;
      if (apiErr.details && typeof apiErr.details === "object") {
        const details = apiErr.details as Record<string, unknown>;
        const firstKey = Object.keys(details)[0];
        if (firstKey) {
          const detailVal = details[firstKey];
          return Array.isArray(detailVal) ? String(detailVal[0]) : String(detailVal);
        }
      }
      if (typeof apiErr.message === "string") return apiErr.message;
    }
    if (typeof errorObj.message === "string") return errorObj.message;
  }
  return "An unexpected operational error occurred.";
}

function getAvailableOrderActions(order: AdminOrderDetail): OrderAction[] {
  const st = (order.status || "").toUpperCase();
  const paySt = (order.payment_status || "").toUpperCase();
  const actions: OrderAction[] = [];

  if (st === "PENDING") {
    if (paySt === "PAID") {
      actions.push({
        id: "confirm",
        label: "Confirm Order",
        type: "transition",
        targetStatus: "CONFIRMED",
        variant: "primary",
        description: "Payment is verified. Confirm this order to proceed with fulfillment.",
      });
    } else {
      actions.push({
        id: "cancel",
        label: "Cancel Order",
        type: "cancel",
        variant: "danger",
        description: "Cancel this unpaid order and release stock reservations back to inventory.",
      });
    }
  } else if (st === "CONFIRMED") {
    actions.push({
      id: "processing",
      label: "Mark as Processing",
      type: "transition",
      targetStatus: "PROCESSING",
      variant: "primary",
      description: "Send order to atelier / packing for fulfillment processing.",
    });
  } else if (st === "PROCESSING") {
    actions.push({
      id: "shipped",
      label: "Mark as Shipped",
      type: "transition",
      targetStatus: "SHIPPED",
      variant: "primary",
      description: "Hand over parcel to courier and update order status to Shipped.",
    });
  } else if (st === "SHIPPED") {
    actions.push({
      id: "delivered",
      label: "Mark as Delivered",
      type: "transition",
      targetStatus: "DELIVERED",
      variant: "primary",
      description: "Confirm successful delivery of parcel to the patron.",
    });
  }

  return actions;
}

export default function AdminOrderDetailClient({ orderId }: AdminOrderDetailClientProps) {
  const [order, setOrder] = useState<AdminOrderDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [notFound, setNotFound] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Operations Modal State
  const [actionModalOpen, setActionModalOpen] = useState<boolean>(false);
  const [selectedAction, setSelectedAction] = useState<OrderAction | null>(null);
  const [actionNote, setActionNote] = useState<string>("");
  const [submittingAction, setSubmittingAction] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchOrder = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }
        setError(null);
        setNotFound(false);

        const data = await getAdminOrderDetail(orderId);
        setOrder(data);
      } catch (err: unknown) {
        const errorMsg =
          err instanceof Error ? err.message : "Failed to load order detail.";
        if (
          errorMsg.toLowerCase().includes("not found") ||
          (err as { status?: number })?.status === 404
        ) {
          setNotFound(true);
        } else {
          setError(errorMsg);
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [orderId]
  );

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        setNotFound(false);

        const data = await getAdminOrderDetail(orderId);
        if (active) {
          setOrder(data);
        }
      } catch (err: unknown) {
        if (active) {
          const errorMsg =
            err instanceof Error ? err.message : "Failed to load order detail.";
          if (
            errorMsg.toLowerCase().includes("not found") ||
            (err as { status?: number })?.status === 404
          ) {
            setNotFound(true);
          } else {
            setError(errorMsg);
          }
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [orderId]);

  const handleOpenActionModal = (action: OrderAction) => {
    setActionError(null);
    setActionSuccess(null);
    setSelectedAction(action);
    setActionNote("");
    setActionModalOpen(true);
  };

  const handleCloseActionModal = () => {
    if (submittingAction) return;
    setActionModalOpen(false);
    setSelectedAction(null);
    setActionNote("");
    setActionError(null);
  };

  const handleExecuteAction = async () => {
    if (!selectedAction || !order) return;
    try {
      setSubmittingAction(true);
      setActionError(null);

      let updatedOrder: AdminOrderDetail;
      if (selectedAction.type === "transition" && selectedAction.targetStatus) {
        updatedOrder = await transitionAdminOrderStatus(order.id, {
          target_status: selectedAction.targetStatus,
          note: actionNote.trim(),
        });
      } else if (selectedAction.type === "cancel") {
        updatedOrder = await cancelAdminOrder(order.id, {
          reason: actionNote.trim(),
          note: actionNote.trim(),
        });
      } else {
        throw new Error("Unsupported operational action.");
      }

      setOrder(updatedOrder);
      setActionSuccess(
        `Order status successfully updated to ${updatedOrder.status_display || updatedOrder.status}.`
      );
      setActionModalOpen(false);
      setSelectedAction(null);
      setActionNote("");
    } catch (err: unknown) {
      const errorMsg = getErrorMessage(err);
      setActionError(errorMsg);
    } finally {
      setSubmittingAction(false);
    }
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

  const formatCurrency = (val: string | number, currency = "INR") => {
    const num = typeof val === "string" ? parseFloat(val) : val;
    if (isNaN(num)) return `₹0.00`;
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currency || "INR",
      maximumFractionDigits: 2,
    }).format(num);
  };

  const renderOrderStatusBadge = (statusStr: string, display: string) => {
    const st = (statusStr || "").toUpperCase();
    let badgeClass = "bg-gray-100 text-gray-700 border-gray-200";
    let dotClass = "bg-gray-500";

    switch (st) {
      case "CONFIRMED":
        badgeClass = "bg-emerald-50 text-emerald-800 border-emerald-200";
        dotClass = "bg-emerald-600";
        break;
      case "PROCESSING":
        badgeClass = "bg-blue-50 text-blue-800 border-blue-200";
        dotClass = "bg-blue-600";
        break;
      case "SHIPPED":
        badgeClass = "bg-purple-50 text-purple-800 border-purple-200";
        dotClass = "bg-purple-600";
        break;
      case "DELIVERED":
        badgeClass = "bg-teal-50 text-teal-800 border-teal-200";
        dotClass = "bg-teal-600";
        break;
      case "PENDING":
        badgeClass = "bg-amber-50 text-amber-800 border-amber-200";
        dotClass = "bg-amber-500";
        break;
      case "CANCELLED":
        badgeClass = "bg-rose-50 text-rose-800 border-rose-200";
        dotClass = "bg-rose-600";
        break;
      case "REFUNDED":
        badgeClass = "bg-zinc-100 text-zinc-700 border-zinc-200";
        dotClass = "bg-zinc-500";
        break;
    }

    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${badgeClass}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} aria-hidden="true" />
        <span>{display || statusStr}</span>
      </span>
    );
  };

  const renderPaymentStatusBadge = (statusStr: string, display: string) => {
    const st = (statusStr || "").toUpperCase();
    let badgeClass = "bg-gray-100 text-gray-700 border-gray-200";
    let dotClass = "bg-gray-500";

    switch (st) {
      case "PAID":
        badgeClass = "bg-emerald-50 text-emerald-800 border-emerald-200";
        dotClass = "bg-emerald-600";
        break;
      case "PENDING":
        badgeClass = "bg-amber-50 text-amber-800 border-amber-200";
        dotClass = "bg-amber-500";
        break;
      case "FAILED":
        badgeClass = "bg-rose-50 text-rose-800 border-rose-200";
        dotClass = "bg-rose-600";
        break;
      case "REFUNDED":
        badgeClass = "bg-zinc-100 text-zinc-700 border-zinc-200";
        dotClass = "bg-zinc-500";
        break;
    }

    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${badgeClass}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} aria-hidden="true" />
        <span>{display || statusStr}</span>
      </span>
    );
  };

  // 404 Not Found State
  if (notFound) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-[#FAF6F2] border border-[#EBE2D8] flex items-center justify-center text-[#8C7A78] mx-auto mb-4">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-serif font-bold text-[#1F1B17] mb-2">
          Order Not Found
        </h1>
        <p className="text-xs text-[#8C7A78] max-w-md mx-auto mb-6">
          The requested order identifier &ldquo;{orderId}&rdquo; does not match any existing
          patron orders in the database.
        </p>
        <Link
          href="/admin/orders"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#4F0012] hover:bg-[#6D1826] text-white text-xs font-medium rounded-lg transition-colors shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Orders List</span>
        </Link>
      </div>
    );
  }

  // Generic Error State
  if (error && !order) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mx-auto mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-serif font-bold text-[#1F1B17] mb-2">
          Failed to Load Order Detail
        </h1>
        <p className="text-xs text-[#8C7A78] max-w-md mx-auto mb-6">
          {error}
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => fetchOrder(false)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#4F0012] hover:bg-[#6D1826] text-white text-xs font-medium rounded-lg transition-colors shadow-sm"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Retry Loading</span>
          </button>
          <Link
            href="/admin/orders"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-[#FAF6F2] text-[#554243] text-xs font-medium rounded-lg border border-[#EBE2D8] transition-colors"
          >
            <span>Back to Orders</span>
          </Link>
        </div>
      </div>
    );
  }

  // Loading Skeleton
  if (loading && !order) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-48 mb-6" />
        <div className="h-8 bg-gray-200 rounded w-64 mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2 h-48 bg-gray-200 rounded-xl" />
          <div className="h-48 bg-gray-200 rounded-xl" />
        </div>
        <div className="h-64 bg-gray-200 rounded-xl mb-6" />
        <div className="h-48 bg-gray-200 rounded-xl" />
      </div>
    );
  }

  if (!order) return null;

  const availableActions = getAvailableOrderActions(order);
  const isTerminalState = ["DELIVERED", "CANCELLED"].includes(order.status.toUpperCase());
  const isPendingUnpaid =
    order.status.toUpperCase() === "PENDING" && order.payment_status.toUpperCase() !== "PAID";

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Top Breadcrumb & Actions */}
      <AdminPageHeader
        title={order.order_number}
        description={`Placed on ${formatDate(order.created_at)} · Order ID: ${order.id}`}
        breadcrumbs={[
          { label: "Orders", href: "/admin/orders" },
          { label: order.order_number },
        ]}
        actions={
          <div className="flex items-center gap-2.5">
            <Link
              href="/admin/orders"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#554243] bg-white border border-[#EBE2D8] hover:bg-[#FAF6F2] rounded-lg transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Orders</span>
            </Link>
            <button
              type="button"
              onClick={() => fetchOrder(true)}
              disabled={refreshing}
              aria-label="Refresh order"
              className="inline-flex items-center justify-center p-2 text-[#554243] hover:text-[#1F1B17] bg-white hover:bg-[#FAF6F2] rounded-lg border border-[#EBE2D8] transition-colors disabled:opacity-50"
              title="Refresh order details"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-[#6D1826]" : ""}`}
              />
            </button>
          </div>
        }
      />

      {/* Success Notification Banner */}
      {actionSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionSuccess(null)}
            className="text-emerald-700 hover:text-emerald-900 p-1"
            aria-label="Dismiss message"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Status Bar */}
      <div className="bg-white rounded-xl border border-[#EBE2D8] p-4 shadow-[0_2px_10px_-2px_rgba(79,0,18,0.03)] flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[#8C7A78] font-medium">Order Status:</span>
            {renderOrderStatusBadge(order.status, order.status_display)}
          </div>
          <div className="h-4 w-px bg-[#EBE2D8] hidden sm:block" />
          <div className="flex items-center gap-2">
            <span className="text-[#8C7A78] font-medium">Payment Status:</span>
            {renderPaymentStatusBadge(order.payment_status, order.payment_status_display)}
          </div>
        </div>

        {order.idempotency_key && (
          <div className="flex items-center gap-1.5 text-[11px] text-[#8C7A78] bg-[#FAF6F2] px-2.5 py-1 rounded-md border border-[#EBE2D8]">
            <Hash className="w-3 h-3 text-[#A89895]" />
            <span>Idempotency:</span>
            <code className="font-mono text-[#1F1B17]">{order.idempotency_key}</code>
          </div>
        )}
      </div>

      {/* Order Operations Bar */}
      <div className="bg-white rounded-xl border border-[#EBE2D8] p-4 shadow-[0_2px_10px_-2px_rgba(79,0,18,0.03)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xs uppercase tracking-wider font-semibold text-[#1F1B17]">
              Order Operations
            </h2>
            <p className="text-[11px] text-[#8C7A78] mt-0.5">
              Privileged status transitions and auditable operations governed by business rules.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {isTerminalState && (
              <span className="inline-flex items-center gap-1.5 text-xs text-[#8C7A78] bg-[#FAF6F2] px-3 py-1.5 rounded-lg border border-[#EBE2D8]">
                <Lock className="w-3.5 h-3.5 text-[#A89895]" />
                <span>Terminal State — No transitions permitted</span>
              </span>
            )}

            {isPendingUnpaid && (
              <span className="inline-flex items-center gap-1.5 text-xs text-amber-800 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                <span>Payment Pending — Confirmation requires paid status</span>
              </span>
            )}

            {availableActions.map((action) => {
              const isDanger = action.variant === "danger";
              const buttonClass = isDanger
                ? "bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200"
                : "bg-[#4F0012] hover:bg-[#6D1826] text-white shadow-xs";

              return (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => handleOpenActionModal(action)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors ${buttonClass}`}
                >
                  {isDanger ? (
                    <XCircle className="w-3.5 h-3.5 text-rose-600" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>{action.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Grid: Order Items & Customer / Financial Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Items Table & Snapshots */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Items Table */}
          <div className="bg-white rounded-xl border border-[#EBE2D8] shadow-[0_2px_10px_-2px_rgba(79,0,18,0.03)] overflow-hidden">
            <div className="p-4 border-b border-[#EBE2D8] bg-[#FAF6F2] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-[#6D1826]" />
                <h2 className="text-xs uppercase tracking-wider font-semibold text-[#1F1B17]">
                  Order Items ({order.items?.length || 0})
                </h2>
              </div>
              <span className="text-[11px] text-[#8C7A78]">
                {order.total_units} total unit{order.total_units === 1 ? "" : "s"}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#F5EFE9] text-[#8C7A78] uppercase text-[10px] tracking-wider font-semibold">
                    <th scope="col" className="py-2.5 px-4">Item</th>
                    <th scope="col" className="py-2.5 px-4">SKU</th>
                    <th scope="col" className="py-2.5 px-4 text-right">Unit Price</th>
                    <th scope="col" className="py-2.5 px-4 text-center">Qty</th>
                    <th scope="col" className="py-2.5 px-4 text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F5EFE9]">
                  {order.items?.map((item) => (
                    <tr key={item.id} className="hover:bg-[#FAF6F2]/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-16 rounded-md bg-[#FAF6F2] border border-[#EBE2D8] overflow-hidden shrink-0 flex items-center justify-center">
                            {item.image_url ? (
                              <img
                                src={item.image_url}
                                alt={item.product_name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <ShoppingBag className="w-5 h-5 text-[#8C7A78]/50" />
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-[#1F1B17]">
                              {item.product_name}
                            </div>
                            {item.variant_name && (
                              <div className="text-[11px] text-[#8C7A78]">
                                {item.variant_name}
                              </div>
                            )}
                            {item.product_id && (
                              <Link
                                href={`/admin/products/${item.product_id}`}
                                className="inline-flex items-center gap-1 text-[11px] text-[#6D1826] hover:underline mt-0.5 font-medium"
                              >
                                <span>View Catalog Product</span>
                                <ExternalLink className="w-3 h-3" />
                              </Link>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-[#554243] font-mono text-[11px]">
                        {item.sku || "—"}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-[#554243]">
                        {formatCurrency(item.unit_price, order.currency)}
                      </td>
                      <td className="py-3 px-4 text-center text-[#554243] font-medium">
                        {item.quantity}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-[#1F1B17]">
                        {formatCurrency(item.line_total, order.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Delivery & Billing Address Snapshots */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Shipping Address */}
            <div className="bg-white rounded-xl border border-[#EBE2D8] p-4 shadow-[0_2px_10px_-2px_rgba(79,0,18,0.03)] space-y-3">
              <div className="flex items-center gap-2 border-b border-[#F5EFE9] pb-2.5">
                <Truck className="w-4 h-4 text-[#6D1826]" />
                <h3 className="text-xs uppercase tracking-wider font-semibold text-[#1F1B17]">
                  Shipping Address Snapshot
                </h3>
              </div>

              {order.shipping_address && Object.keys(order.shipping_address).length > 0 ? (
                <div className="text-xs text-[#554243] space-y-1 leading-relaxed">
                  <div className="font-semibold text-[#1F1B17]">
                    {order.shipping_address.full_name || order.customer?.display_name || "—"}
                  </div>
                  {order.shipping_address.phone && (
                    <div className="text-[#8C7A78]">Phone: {order.shipping_address.phone}</div>
                  )}
                  <div>{String(order.shipping_address.address_line1 || order.shipping_address.address_line_1 || "—")}</div>
                  {(order.shipping_address.address_line2 || order.shipping_address.address_line_2) ? (
                    <div>{String(order.shipping_address.address_line2 || order.shipping_address.address_line_2)}</div>
                  ) : null}
                  <div>
                    {[
                      order.shipping_address.city,
                      order.shipping_address.state,
                      order.shipping_address.postal_code || order.shipping_address.pincode,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </div>
                  {order.shipping_address.country && (
                    <div className="text-[11px] text-[#8C7A78] uppercase tracking-wide">
                      {order.shipping_address.country}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs text-[#8C7A78] italic">
                  No shipping address snapshot recorded.
                </div>
              )}
            </div>

            {/* Billing Address */}
            <div className="bg-white rounded-xl border border-[#EBE2D8] p-4 shadow-[0_2px_10px_-2px_rgba(79,0,18,0.03)] space-y-3">
              <div className="flex items-center gap-2 border-b border-[#F5EFE9] pb-2.5">
                <MapPin className="w-4 h-4 text-[#6D1826]" />
                <h3 className="text-xs uppercase tracking-wider font-semibold text-[#1F1B17]">
                  Billing Address Snapshot
                </h3>
              </div>

              {order.billing_address && Object.keys(order.billing_address).length > 0 ? (
                <div className="text-xs text-[#554243] space-y-1 leading-relaxed">
                  <div className="font-semibold text-[#1F1B17]">
                    {order.billing_address.full_name || order.customer?.display_name || "—"}
                  </div>
                  {order.billing_address.phone && (
                    <div className="text-[#8C7A78]">Phone: {order.billing_address.phone}</div>
                  )}
                  <div>{String(order.billing_address.address_line1 || order.billing_address.address_line_1 || "—")}</div>
                  {(order.billing_address.address_line2 || order.billing_address.address_line_2) ? (
                    <div>{String(order.billing_address.address_line2 || order.billing_address.address_line_2)}</div>
                  ) : null}
                  <div>
                    {[
                      order.billing_address.city,
                      order.billing_address.state,
                      order.billing_address.postal_code || order.billing_address.pincode,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </div>
                  {order.billing_address.country && (
                    <div className="text-[11px] text-[#8C7A78] uppercase tracking-wide">
                      {order.billing_address.country}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs text-[#8C7A78] italic">
                  Same as shipping address snapshot.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right 1 Column: Customer & Financial Breakdown */}
        <div className="space-y-6">
          {/* Customer Profile Card */}
          <div className="bg-white rounded-xl border border-[#EBE2D8] p-4 shadow-[0_2px_10px_-2px_rgba(79,0,18,0.03)] space-y-3">
            <div className="flex items-center gap-2 border-b border-[#F5EFE9] pb-2.5">
              <User className="w-4 h-4 text-[#6D1826]" />
              <h3 className="text-xs uppercase tracking-wider font-semibold text-[#1F1B17]">
                Customer Summary
              </h3>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <span className="text-[#8C7A78] block text-[10px] uppercase tracking-wider font-semibold">
                  Display Name
                </span>
                <span className="font-medium text-[#1F1B17]">
                  {order.customer?.display_name || "Patron"}
                </span>
              </div>
              <div>
                <span className="text-[#8C7A78] block text-[10px] uppercase tracking-wider font-semibold">
                  Email Address
                </span>
                <span className="font-medium text-[#1F1B17]">
                  {order.customer?.email || "—"}
                </span>
              </div>
              {order.customer?.phone && (
                <div>
                  <span className="text-[#8C7A78] block text-[10px] uppercase tracking-wider font-semibold">
                    Phone
                  </span>
                  <span className="font-medium text-[#1F1B17]">
                    {order.customer.phone}
                  </span>
                </div>
              )}
              {order.customer?.id && (
                <div className="pt-1">
                  <span className="text-[#8C7A78] block text-[10px] uppercase tracking-wider font-semibold">
                    User UUID
                  </span>
                  <span className="font-mono text-[10px] text-[#A89895] break-all">
                    {order.customer.id}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Financial Breakdown Card */}
          <div className="bg-white rounded-xl border border-[#EBE2D8] p-4 shadow-[0_2px_10px_-2px_rgba(79,0,18,0.03)] space-y-3">
            <div className="flex items-center gap-2 border-b border-[#F5EFE9] pb-2.5">
              <CreditCard className="w-4 h-4 text-[#6D1826]" />
              <h3 className="text-xs uppercase tracking-wider font-semibold text-[#1F1B17]">
                Order Financial Totals
              </h3>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between text-[#554243]">
                <span>Subtotal</span>
                <span className="font-medium">
                  {formatCurrency(order.subtotal, order.currency)}
                </span>
              </div>
              {parseFloat(order.discount || "0") > 0 && (
                <div className="flex items-center justify-between text-emerald-700">
                  <span>Discount</span>
                  <span>-{formatCurrency(order.discount, order.currency)}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-[#554243]">
                <span>Shipping</span>
                <span className="font-medium">
                  {parseFloat(order.shipping_amount || "0") > 0
                    ? formatCurrency(order.shipping_amount, order.currency)
                    : "Free"}
                </span>
              </div>
              <div className="flex items-center justify-between text-[#554243]">
                <span>Tax / GST</span>
                <span className="font-medium">
                  {formatCurrency(order.tax_amount, order.currency)}
                </span>
              </div>
              <div className="border-t border-[#EBE2D8] pt-2.5 flex items-center justify-between text-sm font-semibold text-[#1F1B17]">
                <span>Grand Total</span>
                <span className="text-[#4F0012]">
                  {formatCurrency(order.total, order.currency)}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Audit Record */}
          <div className="bg-white rounded-xl border border-[#EBE2D8] p-4 shadow-[0_2px_10px_-2px_rgba(79,0,18,0.03)] space-y-3">
            <div className="flex items-center gap-2 border-b border-[#F5EFE9] pb-2.5">
              <CreditCard className="w-4 h-4 text-[#6D1826]" />
              <h3 className="text-xs uppercase tracking-wider font-semibold text-[#1F1B17]">
                Payment Audit Record
              </h3>
            </div>

            {order.payment || (order.payments && order.payments.length > 0) ? (
              <div className="space-y-2.5 text-xs">
                {order.payments?.map((pay, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg bg-[#FAF6F2] border border-[#EBE2D8] space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[#1F1B17]">{pay.provider}</span>
                      {renderPaymentStatusBadge(pay.status, pay.status_display)}
                    </div>
                    <div className="flex items-center justify-between text-[#554243]">
                      <span>Amount:</span>
                      <span className="font-medium font-mono">
                        {formatCurrency(pay.amount, pay.currency)}
                      </span>
                    </div>
                    {pay.razorpay_order_id && (
                      <div className="text-[11px] text-[#8C7A78]">
                        <span>Razorpay Order: </span>
                        <code className="font-mono text-[#1F1B17]">{pay.razorpay_order_id}</code>
                      </div>
                    )}
                    {pay.razorpay_payment_id && (
                      <div className="text-[11px] text-[#8C7A78]">
                        <span>Razorpay Payment: </span>
                        <code className="font-mono text-[#1F1B17]">{pay.razorpay_payment_id}</code>
                      </div>
                    )}
                    {pay.created_at && (
                      <div className="text-[10px] text-[#A89895] pt-1">
                        Recorded at {formatDate(pay.created_at)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-[#8C7A78] italic py-1">
                No payment gateway transactions recorded for this order.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Privileged Order Operations & Audit Trail */}
      <div className="bg-white rounded-xl border border-[#EBE2D8] shadow-[0_2px_10px_-2px_rgba(79,0,18,0.03)] overflow-hidden">
        <div className="p-4 border-b border-[#EBE2D8] bg-[#FAF6F2] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-[#6D1826]" />
            <h2 className="text-xs uppercase tracking-wider font-semibold text-[#1F1B17]">
              Privileged Operation History & Audit Trail ({order.audit_logs?.length || 0})
            </h2>
          </div>
          <span className="text-[11px] text-[#8C7A78]">
            Immutable chronological event log
          </span>
        </div>

        <div className="p-4">
          {order.audit_logs && order.audit_logs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#F5EFE9] text-[#8C7A78] uppercase text-[10px] tracking-wider font-semibold">
                    <th scope="col" className="py-2.5 px-3">Timestamp</th>
                    <th scope="col" className="py-2.5 px-3">Operation</th>
                    <th scope="col" className="py-2.5 px-3">Status Transition</th>
                    <th scope="col" className="py-2.5 px-3">Actor / Admin</th>
                    <th scope="col" className="py-2.5 px-3">Operational Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F5EFE9]">
                  {order.audit_logs.map((log) => {
                    const isCancel = log.operation_type === "cancellation";
                    return (
                      <tr key={log.id} className="hover:bg-[#FAF6F2]/40 transition-colors">
                        <td className="py-2.5 px-3 text-[#554243] whitespace-nowrap text-[11px]">
                          {formatDate(log.created_at)}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                              isCancel
                                ? "bg-rose-50 text-rose-800 border-rose-200"
                                : "bg-blue-50 text-blue-800 border-blue-200"
                            }`}
                          >
                            {log.operation_type_display || log.operation_type}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap font-medium text-[#1F1B17]">
                          <span className="text-[#8C7A78] font-normal">{log.from_status}</span>
                          <span className="mx-1.5 text-[#A89895]">→</span>
                          <span className="font-semibold text-[#1F1B17]">{log.to_status}</span>
                        </td>
                        <td className="py-2.5 px-3 text-[#554243] text-[11px] font-mono">
                          {log.actor_email || "System"}
                        </td>
                        <td className="py-2.5 px-3 text-[#554243] text-[11px] max-w-xs break-words">
                          {log.note || "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-xs text-[#8C7A78] italic py-2">
              No status change or cancellation operations recorded for this order.
            </div>
          )}
        </div>
      </div>

      {/* Inventory & Reservation Lifecycle */}
      <div className="bg-white rounded-xl border border-[#EBE2D8] shadow-[0_2px_10px_-2px_rgba(79,0,18,0.03)] overflow-hidden">
        <div className="p-4 border-b border-[#EBE2D8] bg-[#FAF6F2] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#6D1826]" />
            <h2 className="text-xs uppercase tracking-wider font-semibold text-[#1F1B17]">
              Inventory & Reservation Lifecycle
            </h2>
          </div>
          <span className="text-[11px] text-[#8C7A78]">
            Authoritative inventory allocation timeline
          </span>
        </div>

        {/* Reservations Timeline */}
        <div className="p-4 border-b border-[#EBE2D8]/60 space-y-3">
          <h3 className="text-xs font-semibold text-[#1F1B17] uppercase tracking-wider">
            Stock Reservations ({order.inventory?.reservations?.length || 0})
          </h3>

          {order.inventory?.reservations && order.inventory.reservations.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#F5EFE9] text-[#8C7A78] uppercase text-[10px] tracking-wider font-semibold">
                    <th scope="col" className="py-2 px-3">SKU</th>
                    <th scope="col" className="py-2 px-3">Product / Variant</th>
                    <th scope="col" className="py-2 px-3 text-center">Reserved Qty</th>
                    <th scope="col" className="py-2 px-3">Status</th>
                    <th scope="col" className="py-2 px-3">Expires At</th>
                    <th scope="col" className="py-2 px-3">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F5EFE9]">
                  {order.inventory.reservations.map((res) => (
                    <tr key={res.id} className="hover:bg-[#FAF6F2]/40 transition-colors">
                      <td className="py-2.5 px-3 font-mono text-[11px] text-[#554243]">
                        {res.sku || "—"}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-medium text-[#1F1B17]">{res.product_name}</div>
                        {res.variant_label && (
                          <div className="text-[11px] text-[#8C7A78]">{res.variant_label}</div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center font-semibold text-[#1F1B17]">
                        {res.quantity}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                            res.status === "active"
                              ? "bg-amber-50 text-amber-800 border-amber-200"
                              : res.status === "released"
                              ? "bg-rose-50 text-rose-800 border-rose-200"
                              : "bg-emerald-50 text-emerald-800 border-emerald-200"
                          }`}
                        >
                          {res.status_display || res.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-[#554243] text-[11px]">
                        {formatDate(res.expires_at)}
                      </td>
                      <td className="py-2.5 px-3 text-[#8C7A78] text-[11px]">
                        {formatDate(res.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-xs text-[#8C7A78] italic py-2">
              No stock reservations recorded for this order.
            </div>
          )}
        </div>

        {/* Movements Timeline */}
        <div className="p-4 space-y-3">
          <h3 className="text-xs font-semibold text-[#1F1B17] uppercase tracking-wider">
            Stock Movements ({order.inventory?.movements?.length || 0})
          </h3>

          {order.inventory?.movements && order.inventory.movements.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#F5EFE9] text-[#8C7A78] uppercase text-[10px] tracking-wider font-semibold">
                    <th scope="col" className="py-2 px-3">Timestamp</th>
                    <th scope="col" className="py-2 px-3">Movement Type</th>
                    <th scope="col" className="py-2 px-3">SKU</th>
                    <th scope="col" className="py-2 px-3 text-center">Change</th>
                    <th scope="col" className="py-2 px-3 text-center">Resulting Stock</th>
                    <th scope="col" className="py-2 px-3">Note / Reference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F5EFE9]">
                  {order.inventory.movements.map((mov) => {
                    const isDeduction = mov.quantity_change < 0;
                    return (
                      <tr key={mov.id} className="hover:bg-[#FAF6F2]/40 transition-colors">
                        <td className="py-2.5 px-3 text-[#554243] whitespace-nowrap text-[11px]">
                          {formatDate(mov.created_at)}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-[#1F1B17]">
                          {mov.movement_type_display || mov.movement_type}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-[#554243]">
                          {mov.sku || "—"}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-semibold">
                          <span
                            className={
                              isDeduction
                                ? "text-rose-700"
                                : mov.quantity_change > 0
                                ? "text-emerald-700"
                                : "text-gray-600"
                            }
                          >
                            {mov.quantity_change > 0 ? `+${mov.quantity_change}` : mov.quantity_change}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-[#554243]">
                          {mov.resulting_quantity !== null && mov.resulting_quantity !== undefined
                            ? mov.resulting_quantity
                            : "—"}
                        </td>
                        <td className="py-2.5 px-3 text-[#8C7A78] text-[11px]">
                          {mov.note || mov.reference || "—"}
                          {mov.actor_email && (
                            <span className="block text-[10px] text-[#A89895]">
                              by {mov.actor_email}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-xs text-[#8C7A78] italic py-2">
              No inventory movements recorded for this order.
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal Dialog */}
      {actionModalOpen && selectedAction && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-action-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
        >
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#EBE2D8] space-y-5 animate-in fade-in-50 zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div>
                <h3
                  id="modal-action-title"
                  className="text-base font-serif font-bold text-[#1F1B17]"
                >
                  {selectedAction.type === "cancel"
                    ? "Confirm Order Cancellation"
                    : `Confirm ${selectedAction.label}`}
                </h3>
                <p className="text-xs text-[#8C7A78] mt-1">
                  {selectedAction.description}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseActionModal}
                disabled={submittingAction}
                className="text-[#8C7A78] hover:text-[#1F1B17] p-1 rounded-lg hover:bg-[#FAF6F2] transition-colors disabled:opacity-50"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Target status indication */}
            <div className="p-3.5 rounded-xl bg-[#FAF6F2] border border-[#EBE2D8] space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#8C7A78]">Current Status:</span>
                {renderOrderStatusBadge(order.status, order.status_display)}
              </div>
              {selectedAction.targetStatus && (
                <div className="flex items-center justify-between border-t border-[#EBE2D8]/60 pt-2">
                  <span className="text-[#8C7A78]">Target Status:</span>
                  {renderOrderStatusBadge(
                    selectedAction.targetStatus,
                    selectedAction.targetStatus
                  )}
                </div>
              )}
            </div>

            {selectedAction.type === "cancel" && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Warning:</strong> Cancelling this order will release all active inventory reservations back into available warehouse stock. This operation cannot be undone.
                </span>
              </div>
            )}

            {/* Optional Note input */}
            <div className="space-y-1.5">
              <label
                htmlFor="operational-note"
                className="block text-xs font-medium text-[#1F1B17]"
              >
                Operational Note / Reason{" "}
                <span className="text-[#8C7A78] font-normal">(Optional)</span>
              </label>
              <textarea
                id="operational-note"
                rows={3}
                value={actionNote}
                onChange={(e) => setActionNote(e.target.value)}
                disabled={submittingAction}
                placeholder="e.g. Verified by phone, atelier reference #102, dispatch carrier tracking..."
                className="w-full text-xs rounded-lg border border-[#EBE2D8] p-3 focus:outline-none focus:ring-2 focus:ring-[#4F0012]/20 focus:border-[#4F0012] bg-[#FAF6F2]/30 disabled:opacity-50"
                maxLength={1000}
              />
              <div className="flex justify-end text-[10px] text-[#8C7A78]">
                {actionNote.length}/1000 characters
              </div>
            </div>

            {/* Modal error display */}
            {actionError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{actionError}</span>
              </div>
            )}

            {/* Dialog action buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleCloseActionModal}
                disabled={submittingAction}
                className="px-4 py-2 text-xs font-medium text-[#554243] hover:text-[#1F1B17] bg-white border border-[#EBE2D8] hover:bg-[#FAF6F2] rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteAction}
                disabled={submittingAction}
                className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg text-white transition-colors disabled:opacity-50 ${
                  selectedAction.type === "cancel"
                    ? "bg-rose-700 hover:bg-rose-800"
                    : "bg-[#4F0012] hover:bg-[#6D1826]"
                }`}
              >
                {submittingAction && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>
                  {submittingAction
                    ? "Processing..."
                    : selectedAction.type === "cancel"
                    ? "Confirm Cancellation"
                    : "Confirm Transition"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
