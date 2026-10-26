"use client";

import Link from "next/link";
import {
  ExternalLink,
  Eye,
  RotateCcw,
  Truck,
} from "lucide-react";
import type { AdminShipmentListItem, AdminShipmentStatus } from "@/lib/api/admin";

interface AdminShipmentsTableProps {
  shipments: AdminShipmentListItem[];
  loading: boolean;
  onSelectShipment: (shipmentId: string) => void;
  onResetFilters?: () => void;
  isFiltered?: boolean;
}

function renderStatusBadge(status: AdminShipmentStatus, label: string) {
  const st = (status || "").toUpperCase();
  switch (st) {
    case "READY_TO_SHIP":
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
          Ready to Ship
        </span>
      );
    case "SHIPPED":
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-800 border border-blue-200">
          Shipped
        </span>
      );
    case "IN_TRANSIT":
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-indigo-50 text-indigo-800 border border-indigo-200">
          In Transit
        </span>
      );
    case "OUT_FOR_DELIVERY":
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-purple-50 text-purple-800 border border-purple-200">
          Out for Delivery
        </span>
      );
    case "DELIVERED":
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
          Delivered
        </span>
      );
    case "FAILED":
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 text-rose-800 border border-rose-200">
          Failed
        </span>
      );
    case "RETURNED":
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-zinc-100 text-zinc-800 border border-zinc-300">
          Returned
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-stone-100 text-stone-700 border border-stone-200">
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

export default function AdminShipmentsTable({
  shipments,
  loading,
  onSelectShipment,
  onResetFilters,
  isFiltered,
}: AdminShipmentsTableProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-[#EBE2D8] shadow-sm overflow-hidden">
        <div className="p-8 space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center justify-between gap-4 animate-pulse">
              <div className="h-5 w-28 bg-[#F5EFE9] rounded" />
              <div className="h-5 w-24 bg-[#F5EFE9] rounded" />
              <div className="h-5 w-36 bg-[#F5EFE9] rounded" />
              <div className="h-5 w-32 bg-[#F5EFE9] rounded" />
              <div className="h-5 w-20 bg-[#F5EFE9] rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (shipments.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-[#EBE2D8] p-12 text-center shadow-sm space-y-3">
        <div className="w-12 h-12 rounded-full bg-[#FAF6F2] text-[#8C7A78] flex items-center justify-center mx-auto">
          <Truck className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-semibold text-[#1F1B17]">
          {isFiltered ? "No shipments matching criteria" : "No shipments recorded yet"}
        </h3>
        <p className="text-xs text-[#8C7A78] max-w-sm mx-auto">
          {isFiltered
            ? "Try resetting your search query, status filters, or date range."
            : "When orders are verified and packed, create shipments to track parcels with courier partners."}
        </p>
        {isFiltered && onResetFilters && (
          <div className="pt-2">
            <button
              onClick={onResetFilters}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#6D1826] bg-[#FAF6F2] hover:bg-[#F3ECE4] rounded-lg border border-[#EBE2D8]"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear Filter Criteria</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-[#EBE2D8] shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-[#EBE2D8] bg-[#FAF6F2] text-[#8C7A78] uppercase text-[10px] tracking-wider font-semibold">
              <th scope="col" className="py-3 px-4">Order #</th>
              <th scope="col" className="py-3 px-4">Status</th>
              <th scope="col" className="py-3 px-4">Carrier & Tracking</th>
              <th scope="col" className="py-3 px-4">Patron</th>
              <th scope="col" className="py-3 px-4">Dispatched At</th>
              <th scope="col" className="py-3 px-4">Delivered At</th>
              <th scope="col" className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F5EFE9]">
            {shipments.map((shipment) => (
              <tr key={shipment.id} className="hover:bg-[#FAF6F2]/50 transition-colors">
                {/* Order # */}
                <td className="py-3.5 px-4 whitespace-nowrap font-medium">
                  <Link
                    href={`/admin/orders/${shipment.order_id}`}
                    className="text-[#6D1826] hover:underline font-semibold"
                  >
                    {shipment.order_number}
                  </Link>
                  <div className="text-[10px] text-[#8C7A78] mt-0.5">
                    Items: {shipment.item_count}
                  </div>
                </td>

                {/* Status */}
                <td className="py-3.5 px-4 whitespace-nowrap">
                  {renderStatusBadge(shipment.status, shipment.status_display)}
                </td>

                {/* Carrier & Tracking */}
                <td className="py-3.5 px-4">
                  <div className="font-semibold text-[#1F1B17]">
                    {shipment.carrier || "Unassigned"}
                  </div>
                  {shipment.tracking_number ? (
                    <div className="flex items-center gap-1 text-[11px] font-mono text-[#554243] mt-0.5">
                      <span>{shipment.tracking_number}</span>
                      {shipment.tracking_url && (
                        <a
                          href={shipment.tracking_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#6D1826] hover:underline"
                          title="Open carrier tracking page"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  ) : (
                    <div className="text-[10px] text-[#8C7A78] italic">No tracking #</div>
                  )}
                </td>

                {/* Patron */}
                <td className="py-3.5 px-4">
                  <div className="font-medium text-[#1F1B17]">
                    {shipment.customer_name || "Patron"}
                  </div>
                  <div className="text-[11px] text-[#8C7A78]">{shipment.customer_email || "—"}</div>
                </td>

                {/* Dispatched */}
                <td className="py-3.5 px-4 text-[#554243] whitespace-nowrap text-[11px]">
                  {formatDate(shipment.dispatched_at)}
                  {shipment.dispatched_by_email && (
                    <div className="text-[10px] text-[#8C7A78] truncate max-w-32.5">
                      by {shipment.dispatched_by_email}
                    </div>
                  )}
                </td>

                {/* Delivered */}
                <td className="py-3.5 px-4 text-[#554243] whitespace-nowrap text-[11px]">
                  {formatDate(shipment.delivered_at)}
                  {shipment.delivered_by_email && (
                    <div className="text-[10px] text-[#8C7A78] truncate max-w-32.5">
                      by {shipment.delivered_by_email}
                    </div>
                  )}
                </td>

                {/* Actions */}
                <td className="py-3.5 px-4 text-right whitespace-nowrap">
                  <button
                    onClick={() => onSelectShipment(shipment.id)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-[#FAF6F2] hover:bg-[#F3ECE4] text-[#6D1826] border border-[#EBE2D8] transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
