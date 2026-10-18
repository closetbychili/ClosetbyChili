"use client";

import { CheckCircle2, AlertTriangle, XCircle, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import type { ProductReadiness } from "@/lib/api/admin";

interface ProductReadinessCardProps {
  readiness?: ProductReadiness | null;
  onPublishClick?: () => void;
  status?: "draft" | "active" | "archived";
}

export default function ProductReadinessCard({
  readiness,
  onPublishClick,
  status = "draft",
}: ProductReadinessCardProps) {
  const [expanded, setExpanded] = useState(true);

  if (!readiness) return null;

  const r = readiness as unknown as Record<string, unknown>;
  const hasTitle = Boolean(r.has_title ?? r.has_name);
  const hasCategory = Boolean(r.has_category);
  const hasActiveVariants = Boolean(r.has_active_variants ?? r.has_variants);
  const hasPrices = Boolean(r.has_prices ?? r.has_price);
  const hasImages = Boolean(r.has_images);
  const issues = (readiness.issues ?? (r.missing_requirements as string[] | undefined)) || [];
  const isComplete = Boolean(
    r.is_ready_for_publish ?? r.can_publish ?? (hasTitle && hasCategory && hasActiveVariants && hasPrices && hasImages)
  );

  const checklistItems = [
    { label: "Product title provided", satisfied: hasTitle },
    { label: "Category taxonomy assigned", satisfied: hasCategory },
    { label: "At least one active variant defined", satisfied: hasActiveVariants },
    { label: "Variant retail pricing configured", satisfied: hasPrices },
    { label: "At least one product gallery image", satisfied: hasImages },
  ];

  const satisfiedCount = checklistItems.filter((i) => i.satisfied).length;

  return (
    <div
      data-testid="storefront-readiness-card"
      className={`rounded-2xl border transition-all ${
        isComplete
          ? "bg-[#F0FDF4] border-[#BBF7D0]"
          : status === "active"
          ? "bg-[#FEF2F2] border-[#FECACA]"
          : "bg-[#FFFBF5] border-[#FDE68A]"
      } p-4 mb-6 shadow-sm`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              isComplete
                ? "bg-[#DCFCE7] text-[#16A34A]"
                : status === "active"
                ? "bg-[#FEE2E2] text-[#DC2626]"
                : "bg-[#FEF3C7] text-[#D97706]"
            }`}
          >
            {isComplete ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : status === "active" ? (
              <XCircle className="w-4 h-4" />
            ) : (
              <AlertTriangle className="w-4 h-4" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-semibold text-[#1F1B17]">
                Storefront Publication Readiness
              </h4>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-medium ${
                  isComplete
                    ? "bg-[#DCFCE7] text-[#15803D]"
                    : "bg-[#FEF3C7] text-[#B45309]"
                }`}
              >
                {satisfiedCount} / {checklistItems.length} Requirements Met
              </span>
            </div>
            <p className="text-[11px] text-[#786967] mt-0.5">
              {isComplete
                ? "This product fulfills all storefront requirements and is ready for customer purchases."
                : "Complete all checklist items before activating this product on the public storefront."}
            </p>
            {isComplete && status !== "active" && onPublishClick && (
              <button
                type="button"
                onClick={onPublishClick}
                className="mt-1 text-[11px] font-semibold text-[#15803D] hover:underline"
              >
                All criteria met — click here to activate now
              </button>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="p-1 rounded-lg text-[#8C7A78] hover:text-[#1F1B17] hover:bg-black/5 transition-colors"
          aria-label={expanded ? "Collapse checklist" : "Expand checklist"}
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-black/5 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {checklistItems.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 text-xs text-[#423735] bg-white/70 px-2.5 py-1.5 rounded-lg border border-black/5"
              >
                {item.satisfied ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A] shrink-0" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-[#DC2626] shrink-0" />
                )}
                <span className={item.satisfied ? "text-[#1F1B17]" : "text-[#786967]"}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>

          {issues && issues.length > 0 && (
            <div className="mt-2 p-2.5 bg-white/80 rounded-lg border border-[#FCA5A5]/40 text-xs text-[#DC2626]">
              <span className="font-semibold block mb-1">Actions needed to publish:</span>
              <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                {issues.map((issue, idx) => (
                  <li key={idx}>{issue}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
