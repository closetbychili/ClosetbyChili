"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  MapPin,
  Package,
  RefreshCw,
  RotateCcw,
  Truck,
  User,
  X,
  XCircle,
} from "lucide-react";
import {
  dispatchAdminShipment,
  getAdminShipmentDetail,
  transitionAdminShipmentStatus,
  updateAdminShipmentTracking,
  type AdminShipmentDetail,
  type AdminShipmentStatus,
} from "@/lib/api/admin";

interface AdminShipmentDetailDrawerProps {
  shipmentId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onShipmentUpdated: () => void;
}

interface ActionConfirmation {
  actionType: "dispatch" | "transition";
  targetStatus?: AdminShipmentStatus;
  title: string;
  description: string;
  variant: "primary" | "danger";
  confirmButtonLabel: string;
}

function renderStatusBadge(status: AdminShipmentStatus, label: string) {
  const st = (status || "").toUpperCase();
  switch (st) {
    case "READY_TO_SHIP":
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
          Ready to Ship
        </span>
      );
    case "SHIPPED":
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-800 border border-blue-200">
          Shipped
        </span>
      );
    case "IN_TRANSIT":
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-800 border border-indigo-200">
          In Transit
        </span>
      );
    case "OUT_FOR_DELIVERY":
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-800 border border-purple-200">
          Out for Delivery
        </span>
      );
    case "DELIVERED":
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
          Delivered
        </span>
      );
    case "FAILED":
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-800 border border-rose-200">
          Failed
        </span>
      );
    case "RETURNED":
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-100 text-zinc-800 border border-zinc-300">
          Returned
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-stone-100 text-stone-700 border border-stone-200">
          {label || status}
        </span>
      );
  }
}

function formatDate(dateStr?: string | null) {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    return d.toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

export default function AdminShipmentDetailDrawer({
  shipmentId,
  isOpen,
  onClose,
  onShipmentUpdated,
}: AdminShipmentDetailDrawerProps) {
  const [shipment, setShipment] = useState<AdminShipmentDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState<boolean>(false);

  // Edit Tracking Form State
  const [isEditingTracking, setIsEditingTracking] = useState<boolean>(false);
  const [editCarrier, setEditCarrier] = useState<string>("");
  const [editTrackingNumber, setEditTrackingNumber] = useState<string>("");
  const [editTrackingUrl, setEditTrackingUrl] = useState<string>("");
  const [editInternalNote, setEditInternalNote] = useState<string>("");
  const [trackingSaving, setTrackingSaving] = useState<boolean>(false);
  const [trackingError, setTrackingError] = useState<string | null>(null);

  // Operation Confirmation Modal State
  const [confirmation, setConfirmation] = useState<ActionConfirmation | null>(null);
  const [actionNote, setActionNote] = useState<string>("");
  const [submittingAction, setSubmittingAction] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Load shipment detail
  useEffect(() => {
    if (!isOpen || !shipmentId) {
      return;
    }

    let active = true;

    const fetchDetail = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getAdminShipmentDetail(shipmentId);
        if (active) {
          setShipment(data);
          setEditCarrier(data.carrier || "");
          setEditTrackingNumber(data.tracking_number || "");
          setEditTrackingUrl(data.tracking_url || "");
          setEditInternalNote(data.internal_note || "");
        }
      } catch (err: unknown) {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load shipment details.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchDetail();

    return () => {
      active = false;
    };
  }, [isOpen, shipmentId]);

  if (!isOpen) return null;

  const handleCopyTracking = () => {
    if (!shipment?.tracking_number) return;
    navigator.clipboard.writeText(shipment.tracking_number);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleSaveTracking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shipment) return;

    if (editTrackingUrl.trim()) {
      const lower = editTrackingUrl.trim().toLowerCase();
      if (!lower.startsWith("http://") && !lower.startsWith("https://")) {
        setTrackingError("Tracking URL must start with http:// or https://");
        return;
      }
    }

    try {
      setTrackingSaving(true);
      setTrackingError(null);

      const updated = await updateAdminShipmentTracking(shipment.id, {
        carrier: editCarrier,
        tracking_number: editTrackingNumber,
        tracking_url: editTrackingUrl,
        internal_note: editInternalNote,
      });

      setShipment(updated);
      setIsEditingTracking(false);
      onShipmentUpdated();
    } catch (err: unknown) {
      setTrackingError(err instanceof Error ? err.message : "Failed to update tracking info.");
    } finally {
      setTrackingSaving(false);
    }
  };

  const executeAction = async () => {
    if (!shipment || !confirmation) return;

    try {
      setSubmittingAction(true);
      setActionError(null);

      let updated: AdminShipmentDetail;
      if (confirmation.actionType === "dispatch") {
        updated = await dispatchAdminShipment(shipment.id, {
          note: actionNote.trim(),
        });
      } else if (confirmation.targetStatus) {
        updated = await transitionAdminShipmentStatus(shipment.id, {
          target_status: confirmation.targetStatus,
          note: actionNote.trim(),
        });
      } else {
        return;
      }

      setShipment(updated);
      setConfirmation(null);
      setActionNote("");
      onShipmentUpdated();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Operational state transition failed.");
    } finally {
      setSubmittingAction(false);
    }
  };

  const currentStatus = shipment?.status || "PENDING";

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col border-l border-[#EBE2D8] text-[#1F1B17] overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
      >
        {/* Header */}
        <div className="p-5 border-b border-[#EBE2D8] bg-[#FAF6F2] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#6D1826]/10 text-[#6D1826] flex items-center justify-center font-bold">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="drawer-title" className="text-base font-semibold text-[#1F1B17]">
                  Shipment Inspection
                </h2>
                {shipment && renderStatusBadge(shipment.status, shipment.status_display)}
              </div>
              {shipment && (
                <div className="text-xs text-[#8C7A78] flex items-center gap-1.5 mt-0.5">
                  <span>Order:</span>
                  <Link
                    href={`/admin/orders/${shipment.order.id}`}
                    className="font-medium text-[#6D1826] hover:underline"
                  >
                    {shipment.order.order_number}
                  </Link>
                  <span>•</span>
                  <span>Created {formatDate(shipment.created_at)}</span>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[#8C7A78] hover:text-[#1F1B17] hover:bg-black/5 rounded-lg transition-colors"
            aria-label="Close drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading && (
            <div className="py-20 flex flex-col items-center justify-center text-[#8C7A78] space-y-3">
              <RefreshCw className="w-6 h-6 animate-spin text-[#6D1826]" />
              <p className="text-sm font-medium">Loading shipment details...</p>
            </div>
          )}

          {error && !loading && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 space-y-2">
              <div className="flex items-center gap-2 font-medium">
                <AlertCircle className="w-4 h-4" />
                <span>Failed to load shipment details</span>
              </div>
              <p className="text-xs">{error}</p>
              <button
                onClick={() => {
                  if (shipmentId) {
                    setLoading(true);
                    getAdminShipmentDetail(shipmentId)
                      .then(setShipment)
                      .catch((err) => setError(err.message))
                      .finally(() => setLoading(false));
                  }
                }}
                className="inline-flex items-center gap-1.5 text-xs font-semibold underline hover:no-underline pt-1"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry
              </button>
            </div>
          )}

          {shipment && !loading && (
            <>
              {/* Contextual Operations Bar */}
              <div className="bg-[#FAF6F2] p-4 rounded-xl border border-[#EBE2D8] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wider font-semibold text-[#8C7A78]">
                    Eligible Fulfillment Actions
                  </span>
                  <span className="text-[11px] text-[#A89895]">
                    Status: <strong className="text-[#1F1B17]">{shipment.status_display}</strong>
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {(currentStatus === "PENDING" || currentStatus === "READY_TO_SHIP") && (
                    <button
                      onClick={() =>
                        setConfirmation({
                          actionType: "dispatch",
                          title: "Confirm Parcel Dispatch",
                          description:
                            "Mark this shipment as Dispatched. This will advance the order status to Shipped and record an immutable dispatch audit event.",
                          variant: "primary",
                          confirmButtonLabel: "Dispatch Parcel",
                        })
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#6D1826] text-white hover:bg-[#52121D] shadow-sm transition-all"
                    >
                      <Truck className="w-3.5 h-3.5" />
                      Dispatch Shipment
                    </button>
                  )}

                  {currentStatus === "SHIPPED" && (
                    <>
                      <button
                        onClick={() =>
                          setConfirmation({
                            actionType: "transition",
                            targetStatus: "IN_TRANSIT",
                            title: "Mark as In Transit",
                            description: "Record that the carrier parcel is currently in transit.",
                            variant: "primary",
                            confirmButtonLabel: "Mark In Transit",
                          })
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-700 text-white hover:bg-indigo-800 transition-colors"
                      >
                        <Clock className="w-3.5 h-3.5" />
                        Mark In Transit
                      </button>
                      <button
                        onClick={() =>
                          setConfirmation({
                            actionType: "transition",
                            targetStatus: "DELIVERED",
                            title: "Confirm Parcel Delivery",
                            description:
                              "Confirm that the parcel was safely handed to the patron. This will transition the order to Delivered.",
                            variant: "primary",
                            confirmButtonLabel: "Confirm Delivered",
                          })
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-700 text-white hover:bg-emerald-800 transition-colors"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Mark Delivered
                      </button>
                      <button
                        onClick={() =>
                          setConfirmation({
                            actionType: "transition",
                            targetStatus: "FAILED",
                            title: "Record Delivery Failure",
                            description: "Record that delivery attempts failed. Order payment remains unchanged.",
                            variant: "danger",
                            confirmButtonLabel: "Record Failed",
                          })
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100 transition-colors"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Delivery Failed
                      </button>
                    </>
                  )}

                  {currentStatus === "IN_TRANSIT" && (
                    <>
                      <button
                        onClick={() =>
                          setConfirmation({
                            actionType: "transition",
                            targetStatus: "OUT_FOR_DELIVERY",
                            title: "Mark Out for Delivery",
                            description: "Record that the parcel is out for doorstep delivery today.",
                            variant: "primary",
                            confirmButtonLabel: "Mark Out for Delivery",
                          })
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-purple-700 text-white hover:bg-purple-800 transition-colors"
                      >
                        <Truck className="w-3.5 h-3.5" />
                        Out for Delivery
                      </button>
                      <button
                        onClick={() =>
                          setConfirmation({
                            actionType: "transition",
                            targetStatus: "DELIVERED",
                            title: "Confirm Parcel Delivery",
                            description:
                              "Confirm that the parcel was safely handed to the patron. This will transition the order to Delivered.",
                            variant: "primary",
                            confirmButtonLabel: "Confirm Delivered",
                          })
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-700 text-white hover:bg-emerald-800 transition-colors"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Mark Delivered
                      </button>
                      <button
                        onClick={() =>
                          setConfirmation({
                            actionType: "transition",
                            targetStatus: "FAILED",
                            title: "Record Delivery Failure",
                            description: "Record that delivery attempts failed.",
                            variant: "danger",
                            confirmButtonLabel: "Record Failed",
                          })
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100 transition-colors"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Delivery Failed
                      </button>
                    </>
                  )}

                  {currentStatus === "OUT_FOR_DELIVERY" && (
                    <>
                      <button
                        onClick={() =>
                          setConfirmation({
                            actionType: "transition",
                            targetStatus: "DELIVERED",
                            title: "Confirm Parcel Delivery",
                            description:
                              "Confirm that the parcel was safely handed to the patron. This will transition the order to Delivered.",
                            variant: "primary",
                            confirmButtonLabel: "Confirm Delivered",
                          })
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-700 text-white hover:bg-emerald-800 transition-colors"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Confirm Delivered
                      </button>
                      <button
                        onClick={() =>
                          setConfirmation({
                            actionType: "transition",
                            targetStatus: "FAILED",
                            title: "Record Delivery Failure",
                            description: "Record that delivery attempts failed.",
                            variant: "danger",
                            confirmButtonLabel: "Record Failed",
                          })
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100 transition-colors"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Delivery Failed
                      </button>
                    </>
                  )}

                  {currentStatus === "DELIVERED" && (
                    <button
                      onClick={() =>
                        setConfirmation({
                          actionType: "transition",
                          targetStatus: "RETURNED",
                          title: "Record Parcel Return",
                          description: "Record that the patron has returned the parcel to the atelier.",
                          variant: "danger",
                          confirmButtonLabel: "Record Return",
                        })
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100 transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Record Return
                    </button>
                  )}

                  {currentStatus === "RETURNED" && (
                    <span className="text-xs text-[#8C7A78] italic">
                      Terminal state: Parcel has been returned.
                    </span>
                  )}
                </div>
              </div>

              {/* Carrier & Tracking Information Card */}
              <div className="bg-white rounded-xl border border-[#EBE2D8] p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-[#F5EFE9] pb-2.5">
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-[#6D1826]" />
                    <h3 className="text-xs uppercase tracking-wider font-semibold text-[#1F1B17]">
                      Carrier & Tracking Details
                    </h3>
                  </div>
                  {currentStatus !== "RETURNED" && (
                    <button
                      onClick={() => setIsEditingTracking(!isEditingTracking)}
                      className="text-xs text-[#6D1826] hover:underline font-semibold"
                    >
                      {isEditingTracking ? "Cancel Edit" : "Edit Tracking"}
                    </button>
                  )}
                </div>

                {isEditingTracking ? (
                  <form onSubmit={handleSaveTracking} className="space-y-3 pt-1">
                    {trackingError && (
                      <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800">
                        {trackingError}
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-[#554243] mb-1">
                          Carrier Name
                        </label>
                        <input
                          type="text"
                          value={editCarrier}
                          onChange={(e) => setEditCarrier(e.target.value)}
                          placeholder="e.g. BlueDart, Delhivery"
                          className="w-full text-xs px-3 py-2 rounded-lg border border-[#EBE2D8] bg-white focus:outline-none focus:ring-1 focus:ring-[#6D1826]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#554243] mb-1">
                          Tracking Number
                        </label>
                        <input
                          type="text"
                          value={editTrackingNumber}
                          onChange={(e) => setEditTrackingNumber(e.target.value)}
                          placeholder="e.g. BD-12345678"
                          className="w-full text-xs px-3 py-2 rounded-lg border border-[#EBE2D8] bg-white focus:outline-none focus:ring-1 focus:ring-[#6D1826]"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#554243] mb-1">
                        Tracking URL (HTTP/HTTPS only)
                      </label>
                      <input
                        type="url"
                        value={editTrackingUrl}
                        onChange={(e) => setEditTrackingUrl(e.target.value)}
                        placeholder="https://..."
                        className="w-full text-xs px-3 py-2 rounded-lg border border-[#EBE2D8] bg-white focus:outline-none focus:ring-1 focus:ring-[#6D1826]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#554243] mb-1">
                        Internal Operational Note
                      </label>
                      <textarea
                        rows={2}
                        value={editInternalNote}
                        onChange={(e) => setEditInternalNote(e.target.value)}
                        placeholder="Atelier packaging notes, instructions for dispatch..."
                        className="w-full text-xs px-3 py-2 rounded-lg border border-[#EBE2D8] bg-white focus:outline-none focus:ring-1 focus:ring-[#6D1826]"
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsEditingTracking(false)}
                        className="px-3 py-1.5 text-xs font-medium text-[#554243] hover:bg-[#FAF6F2] rounded-lg border border-[#EBE2D8]"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={trackingSaving}
                        className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#6D1826] hover:bg-[#52121D] rounded-lg transition-colors disabled:opacity-50"
                      >
                        {trackingSaving ? "Saving..." : "Save Tracking"}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-[#8C7A78] block text-[10px] uppercase tracking-wider font-semibold">
                        Carrier
                      </span>
                      <span className="font-semibold text-[#1F1B17]">
                        {shipment.carrier || "Not assigned"}
                      </span>
                    </div>

                    <div>
                      <span className="text-[#8C7A78] block text-[10px] uppercase tracking-wider font-semibold">
                        Tracking Number
                      </span>
                      {shipment.tracking_number ? (
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <code className="font-mono font-medium text-[#1F1B17] bg-[#FAF6F2] px-1.5 py-0.5 rounded border border-[#EBE2D8]">
                            {shipment.tracking_number}
                          </code>
                          <button
                            onClick={handleCopyTracking}
                            className="text-[#8C7A78] hover:text-[#6D1826] p-1"
                            title="Copy tracking number"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          {copySuccess && (
                            <span className="text-[10px] text-emerald-600 font-semibold">Copied!</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[#8C7A78] italic">Pending assignment</span>
                      )}
                    </div>

                    <div className="sm:col-span-2">
                      <span className="text-[#8C7A78] block text-[10px] uppercase tracking-wider font-semibold">
                        Tracking URL
                      </span>
                      {shipment.tracking_url ? (
                        <a
                          href={shipment.tracking_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[#6D1826] hover:underline font-medium break-all mt-0.5"
                        >
                          <span>{shipment.tracking_url}</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      ) : (
                        <span className="text-[#8C7A78] italic">No tracking link provided</span>
                      )}
                    </div>

                    {shipment.internal_note && (
                      <div className="sm:col-span-2 pt-1 border-t border-[#F5EFE9]">
                        <span className="text-[#8C7A78] block text-[10px] uppercase tracking-wider font-semibold">
                          Internal Note
                        </span>
                        <p className="text-[#554243] mt-0.5 leading-relaxed bg-[#FAF6F2] p-2.5 rounded-lg border border-[#EBE2D8]">
                          {shipment.internal_note}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Order & Patron Summary Snapshot */}
              <div className="bg-white rounded-xl border border-[#EBE2D8] p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-[#F5EFE9] pb-2.5">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-[#6D1826]" />
                    <h3 className="text-xs uppercase tracking-wider font-semibold text-[#1F1B17]">
                      Order & Customer Information
                    </h3>
                  </div>
                  <Link
                    href={`/admin/orders/${shipment.order.id}`}
                    className="text-xs text-[#6D1826] hover:underline font-semibold flex items-center gap-1"
                  >
                    <span>Full Order View</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-[#8C7A78] block text-[10px] uppercase tracking-wider font-semibold">
                      Order Number
                    </span>
                    <span className="font-medium text-[#1F1B17]">
                      {shipment.order.order_number}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#8C7A78] block text-[10px] uppercase tracking-wider font-semibold">
                      Order Status
                    </span>
                    <span className="font-medium text-[#1F1B17]">
                      {shipment.order.status_display} ({shipment.order.payment_status_display})
                    </span>
                  </div>
                  <div>
                    <span className="text-[#8C7A78] block text-[10px] uppercase tracking-wider font-semibold">
                      Patron Name
                    </span>
                    <span className="font-medium text-[#1F1B17]">
                      {shipment.order.customer?.display_name || "Patron"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#8C7A78] block text-[10px] uppercase tracking-wider font-semibold">
                      Patron Email
                    </span>
                    <span className="font-medium text-[#1F1B17]">
                      {shipment.order.customer?.email || "—"}
                    </span>
                  </div>
                </div>

                {/* Shipping Address */}
                <div className="pt-2 border-t border-[#F5EFE9] text-xs">
                  <div className="flex items-center gap-1.5 font-semibold text-[#1F1B17] mb-1">
                    <MapPin className="w-3.5 h-3.5 text-[#6D1826]" />
                    <span>Shipping Destination Snapshot</span>
                  </div>
                  {shipment.order.shipping_address && Object.keys(shipment.order.shipping_address).length > 0 ? (
                    <div className="text-[#554243] space-y-0.5 pl-5">
                      <div>
                        {String(shipment.order.shipping_address.address_line1 || shipment.order.shipping_address.address_line_1 || "—")}
                      </div>
                      {(shipment.order.shipping_address.address_line2 || shipment.order.shipping_address.address_line_2) ? (
                        <div>{String(shipment.order.shipping_address.address_line2 || shipment.order.shipping_address.address_line_2)}</div>
                      ) : null}
                      <div>
                        {[
                          shipment.order.shipping_address.city,
                          shipment.order.shipping_address.state,
                          shipment.order.shipping_address.postal_code || shipment.order.shipping_address.pincode,
                        ]
                          .filter(Boolean)
                          .join(", ")}
                      </div>
                    </div>
                  ) : (
                    <p className="text-[#8C7A78] italic pl-5">No address snapshot recorded.</p>
                  )}
                </div>

                {/* Items in Shipment */}
                <div className="pt-2 border-t border-[#F5EFE9] text-xs space-y-2">
                  <div className="flex items-center gap-1.5 font-semibold text-[#1F1B17]">
                    <Package className="w-3.5 h-3.5 text-[#6D1826]" />
                    <span>Items in Order ({shipment.order.items?.length || 0})</span>
                  </div>
                  <div className="divide-y divide-[#F5EFE9]">
                    {shipment.order.items?.map((item) => (
                      <div key={item.id} className="py-2 flex items-center justify-between text-xs">
                        <div>
                          <div className="font-medium text-[#1F1B17]">{item.product_name}</div>
                          {item.variant_name && (
                            <div className="text-[11px] text-[#8C7A78]">{item.variant_name}</div>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="font-medium text-[#554243]">Qty: {item.quantity}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Audit Trail */}
              <div className="bg-white rounded-xl border border-[#EBE2D8] p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-[#F5EFE9] pb-2.5">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#6D1826]" />
                    <h3 className="text-xs uppercase tracking-wider font-semibold text-[#1F1B17]">
                      Shipment Event Audit Log ({shipment.audit_logs?.length || 0})
                    </h3>
                  </div>
                  <span className="text-[11px] text-[#8C7A78]">Authoritative immutable log</span>
                </div>

                {shipment.audit_logs && shipment.audit_logs.length > 0 ? (
                  <div className="space-y-3 pt-1">
                    {shipment.audit_logs.map((log) => (
                      <div
                        key={log.id}
                        className="p-3 rounded-lg bg-[#FAF6F2] border border-[#EBE2D8] text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-[#1F1B17]">
                            {log.event_type_display || log.event_type}
                          </span>
                          <span className="text-[10px] text-[#8C7A78]">
                            {formatDate(log.created_at)}
                          </span>
                        </div>
                        {log.from_status && log.to_status && (
                          <div className="text-[11px] font-medium text-[#554243]">
                            <span>{log.from_status}</span>
                            <span className="mx-1.5 text-[#A89895]">→</span>
                            <span className="text-[#1F1B17]">{log.to_status}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between text-[11px] text-[#8C7A78]">
                          <span>Actor: {log.actor_email || "System"}</span>
                        </div>
                        {log.note && (
                          <div className="text-[11px] text-[#554243] bg-white p-2 rounded border border-[#EBE2D8]/60 mt-1">
                            {log.note}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#8C7A78] italic py-2">
                    No audit records recorded yet.
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        {/* Action Confirmation Modal */}
        {confirmation && (
          <div className="fixed inset-0 z-60 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-[#EBE2D8] space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-[#F5EFE9] pb-3">
                <h3 className="text-sm font-semibold text-[#1F1B17]">{confirmation.title}</h3>
                <button
                  onClick={() => {
                    setConfirmation(null);
                    setActionError(null);
                  }}
                  className="text-[#8C7A78] hover:text-[#1F1B17]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {actionError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800">
                  {actionError}
                </div>
              )}

              <p className="text-xs text-[#554243] leading-relaxed">
                {confirmation.description}
              </p>

              <div>
                <label className="block text-xs font-medium text-[#554243] mb-1">
                  Operational Note (Optional)
                </label>
                <textarea
                  rows={2}
                  value={actionNote}
                  onChange={(e) => setActionNote(e.target.value)}
                  placeholder="Record note for audit logs..."
                  className="w-full text-xs px-3 py-2 rounded-lg border border-[#EBE2D8] bg-white focus:outline-none focus:ring-1 focus:ring-[#6D1826]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#F5EFE9]">
                <button
                  type="button"
                  onClick={() => {
                    setConfirmation(null);
                    setActionError(null);
                  }}
                  disabled={submittingAction}
                  className="px-3.5 py-2 text-xs font-medium text-[#554243] hover:bg-[#FAF6F2] rounded-lg border border-[#EBE2D8]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={executeAction}
                  disabled={submittingAction}
                  className={`px-4 py-2 text-xs font-semibold text-white rounded-lg transition-colors disabled:opacity-50 ${
                    confirmation.variant === "danger"
                      ? "bg-rose-700 hover:bg-rose-800"
                      : "bg-[#6D1826] hover:bg-[#52121D]"
                  }`}
                >
                  {submittingAction ? "Processing..." : confirmation.confirmButtonLabel}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
