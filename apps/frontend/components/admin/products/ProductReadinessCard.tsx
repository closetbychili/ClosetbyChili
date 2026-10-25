"use client";

import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  ArrowRight,
  Info,
} from "lucide-react";
import { useState } from "react";
import type { ProductReadiness, ProductValidationError } from "@/lib/api/admin";

interface ProductReadinessCardProps {
  readiness?: ProductReadiness | null;
  onPublishClick?: () => void;
  onValidateClick?: () => void;
  onNavigateSection?: (
    section: "basic" | "images" | "variants" | "inventory",
    field?: string
  ) => void;
  isValidating?: boolean;
  status?: "draft" | "active" | "archived";
}

export default function ProductReadinessCard({
  readiness,
  onPublishClick,
  onValidateClick,
  onNavigateSection,
  isValidating = false,
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

  const errors = readiness.errors || [];
  const warnings = readiness.warnings || [];
  const totalErrors = readiness.summary?.total_errors ?? errors.length;
  const isComplete = Boolean(
    readiness.is_ready ??
      readiness.can_publish ??
      (totalErrors === 0 && (r.is_ready_for_publish ?? (hasTitle && hasCategory && hasActiveVariants && hasPrices && hasImages)))
  );

  const sectionConfig: {
    key: "basic" | "images" | "variants" | "inventory";
    title: string;
    description: string;
  }[] = [
    {
      key: "basic",
      title: "Basic Information",
      description: "Product name, URL slug, and category taxonomy",
    },
    {
      key: "images",
      title: "Images & Media",
      description: "Gallery imagery, primary photo, and SEO alt text",
    },
    {
      key: "variants",
      title: "Variants & Pricing",
      description: "Active sizes/colors, SKUs, and retail pricing",
    },
    {
      key: "inventory",
      title: "Inventory Ledger",
      description: "Stock ledger records and warehouse availability",
    },
  ];

  const getSectionErrors = (secKey: "basic" | "images" | "variants" | "inventory") => {
    if (readiness.sections?.[secKey]?.errors) {
      return readiness.sections[secKey].errors;
    }
    return errors.filter((e) => e.section === secKey);
  };

  const getSectionWarnings = (secKey: "basic" | "images" | "variants" | "inventory") => {
    if (readiness.sections?.[secKey]?.warnings) {
      return readiness.sections[secKey].warnings;
    }
    return warnings.filter((w) => w.section === secKey);
  };

  const isSectionValid = (secKey: "basic" | "images" | "variants" | "inventory") => {
    if (readiness.sections?.[secKey]) {
      return readiness.sections[secKey].is_valid;
    }
    const secErrors = getSectionErrors(secKey);
    return secErrors.length === 0;
  };

  const satisfiedSections = sectionConfig.filter((s) => isSectionValid(s.key)).length;

  return (
    <div
      data-testid="storefront-readiness-card"
      className={`rounded-2xl border transition-all ${
        isComplete
          ? "bg-[#F0FDF4] border-[#BBF7D0]"
          : status === "active"
          ? "bg-[#FEF2F2] border-[#FECACA]"
          : "bg-[#FFFBF5] border-[#FDE68A]"
      } p-4 sm:p-5 mb-6 shadow-sm`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
              isComplete
                ? "bg-[#DCFCE7] text-[#16A34A]"
                : status === "active"
                ? "bg-[#FEE2E2] text-[#DC2626]"
                : "bg-[#FEF3C7] text-[#D97706]"
            }`}
          >
            {isComplete ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : status === "active" ? (
              <XCircle className="w-5 h-5" />
            ) : (
              <AlertTriangle className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm font-semibold text-[#1F1B17]">
                Storefront Publication Readiness
              </h4>
              <span
                data-testid="readiness-summary-badge"
                className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full font-semibold uppercase tracking-wider ${
                  isComplete
                    ? "bg-[#DCFCE7] text-[#15803D]"
                    : totalErrors > 0
                    ? "bg-[#FEE2E2] text-[#DC2626]"
                    : "bg-[#FEF3C7] text-[#B45309]"
                }`}
              >
                {isComplete
                  ? "Ready to Publish"
                  : `${satisfiedSections} / ${sectionConfig.length} Sections Ready`}
              </span>
            </div>
            <p className="text-xs text-[#786967] mt-0.5">
              {isComplete
                ? "This product fulfills all catalog validation rules and is ready for customer purchases."
                : `Resolve all ${totalErrors} blocking error${totalErrors === 1 ? "" : "s"} before publishing to the storefront.`}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-end sm:self-center">
          {onValidateClick && (
            <button
              type="button"
              data-testid="validate-product-btn"
              onClick={onValidateClick}
              disabled={isValidating}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#D5C7B8] bg-white hover:bg-[#FAF6F2] text-xs font-medium text-[#1F1B17] transition-colors shadow-2xs disabled:opacity-50"
              title="Validate product against catalog publishing criteria"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isValidating ? "animate-spin text-[#4F0012]" : "text-[#786967]"}`} />
              <span>{isValidating ? "Validating..." : "Validate Product"}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 rounded-lg text-[#8C7A78] hover:text-[#1F1B17] hover:bg-black/5 transition-colors"
            aria-label={expanded ? "Collapse readiness checklist" : "Expand readiness checklist"}
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Success banner CTA */}
      {isComplete && status !== "active" && onPublishClick && (
        <div className="mt-3 p-3 bg-white/80 rounded-xl border border-[#BBF7D0] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-[#15803D]">
            <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0" />
            <span className="font-medium">
              All validation criteria satisfied. Ready to activate on the live storefront.
            </span>
          </div>
          <button
            type="button"
            onClick={onPublishClick}
            className="inline-flex items-center gap-1 text-xs font-semibold text-white bg-[#059669] hover:bg-[#047857] px-3 py-1.5 rounded-lg transition-colors shadow-sm shrink-0"
          >
            <span>Publish Now</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Expanded Section Breakdown */}
      {expanded && (
        <div className="mt-4 pt-4 border-t border-black/5 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {sectionConfig.map((sec) => {
              const secErrors = getSectionErrors(sec.key);
              const secWarnings = getSectionWarnings(sec.key);
              const valid = isSectionValid(sec.key);

              return (
                <div
                  key={sec.key}
                  data-testid={`readiness-section-${sec.key}`}
                  className={`p-3 rounded-xl border transition-colors ${
                    valid
                      ? "bg-white/80 border-[#BBF7D0]"
                      : "bg-white/95 border-[#FCA5A5]/80 shadow-2xs"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      {valid ? (
                        <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-[#DC2626] shrink-0" />
                      )}
                      <div>
                        <h5 className="text-xs font-semibold text-[#1F1B17]">
                          {sec.title}
                        </h5>
                        <p className="text-[10px] text-[#786967]">{sec.description}</p>
                      </div>
                    </div>

                    {onNavigateSection && (
                      <button
                        type="button"
                        onClick={() => onNavigateSection(sec.key)}
                        className="text-[11px] font-medium text-[#4F0012] hover:text-[#6D1826] hover:underline flex items-center gap-0.5"
                      >
                        <span>Edit</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {/* Section Errors */}
                  {secErrors.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {secErrors.map((err: ProductValidationError, idx: number) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => onNavigateSection?.(sec.key, err.field)}
                          className="w-full text-left p-1.5 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-[11px] text-[#DC2626] hover:bg-[#FEE2E2] transition-colors flex items-start gap-1.5"
                        >
                          <span className="font-mono text-[9px] font-bold px-1 py-0.2 bg-[#FEE2E2] rounded shrink-0 mt-0.5">
                            {err.code}
                          </span>
                          <span className="flex-1">{err.message}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Section Warnings */}
                  {secWarnings.length > 0 && (
                    <div className="mt-1.5 space-y-1">
                      {secWarnings.map((warn: ProductValidationError, idx: number) => (
                        <div
                          key={idx}
                          className="p-1.5 rounded-lg bg-[#FFFBEB] border border-[#FDE68A] text-[11px] text-[#B45309] flex items-start gap-1.5"
                        >
                          <Info className="w-3.5 h-3.5 text-[#D97706] shrink-0 mt-0.5" />
                          <span className="flex-1">{warn.message}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legacy Issues Fallback */}
          {(!readiness.sections || Object.keys(readiness.sections).length === 0) &&
            readiness.issues &&
            readiness.issues.length > 0 && (
              <div className="mt-2 p-3 bg-white/90 rounded-xl border border-[#FCA5A5] text-xs text-[#DC2626]">
                <span className="font-semibold block mb-1">Actions needed to publish:</span>
                <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                  {readiness.issues.map((issue, idx) => (
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
