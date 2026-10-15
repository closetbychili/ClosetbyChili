"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, Warehouse } from "lucide-react";
import type { LowStockAlert } from "@/lib/api/admin";

interface LowStockAlertsCardProps {
  alerts: LowStockAlert[];
  threshold: number;
}

export default function LowStockAlertsCard({ alerts, threshold }: LowStockAlertsCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-[#EBE2D8] p-5 sm:p-6 shadow-[0_4px_20px_-4px_rgba(79,0,18,0.03)] flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between gap-3 mb-5">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-serif font-bold text-[#1F1B17]">Low-Stock Alerts</h2>
              {alerts.length > 0 && (
                <span className="text-[11px] font-semibold text-[#DC2626] bg-[#FEF2F2] border border-[#FECACA] px-2 py-0.5 rounded-full">
                  {alerts.length} {alerts.length === 1 ? "alert" : "alerts"}
                </span>
              )}
            </div>
            <p className="text-xs text-[#554243] mt-0.5">
              Variants at or below {threshold} available units in the live inventory ledger
            </p>
          </div>
          <Link
            href="/admin/inventory"
            className="text-xs font-medium text-[#6D1826] hover:text-[#4F0012] flex items-center gap-1 transition-colors"
          >
            <span>Manage stock</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {alerts.length === 0 ? (
          <div className="py-10 rounded-xl border border-dashed border-[#EBE2D8] bg-[#FAF6F2] flex flex-col items-center justify-center text-center p-6">
            <div className="w-10 h-10 rounded-full bg-[#ECFDF5] border border-[#A7F3D0] flex items-center justify-center text-[#059669] mb-3">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-[#1F1B17]">Inventory is healthy</h3>
            <p className="text-xs text-[#8C7A78] max-w-xs mt-1">
              All active product variants have available stock exceeding the minimum threshold ({threshold} units).
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#F2ECE5]">
            {alerts.map((item) => {
              const isOutOfStock = item.quantity_available === 0;

              return (
                <div
                  key={item.id}
                  className="py-3 flex items-center justify-between gap-3 hover:bg-[#FAF6F2]/50 px-2 rounded-lg transition-colors"
                >
                  <div className="min-w-0">
                    <h3 className="text-xs font-medium text-[#1F1B17] truncate">
                      {item.product_name}
                    </h3>
                    <div className="flex items-center gap-2 text-[11px] text-[#8C7A78] mt-0.5">
                      <span className="font-mono text-[#554243]">{item.sku}</span>
                      <span>•</span>
                      <span>{item.variant_label}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {item.quantity_reserved > 0 && (
                      <span className="text-[10px] text-[#A89895] hidden sm:inline">
                        ({item.quantity_reserved} reserved)
                      </span>
                    )}

                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-md border ${
                        isOutOfStock
                          ? "bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]"
                          : "bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]"
                      }`}
                    >
                      <AlertTriangle className="w-3 h-3" />
                      {isOutOfStock ? "0 Left" : `${item.quantity_available} Left`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-5 pt-3 border-t border-[#F2ECE5] flex items-center justify-between text-[11px] text-[#8C7A78]">
        <span className="flex items-center gap-1.5">
          <Warehouse className="w-3.5 h-3.5 text-[#6D1826]" />
          <span>Calculated directly from InventoryItem ledger</span>
        </span>
        <span className="text-[#A89895]">Threshold: ≤ {threshold}</span>
      </div>
    </div>
  );
}
