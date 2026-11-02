"use client";

import { FolderTree, PieChart } from "lucide-react";
import type { CategoryPerformanceItem } from "@/lib/api/admin";
import { formatINR } from "@/components/admin/dashboard/DashboardMetricCard";

interface CategoryPerformanceSectionProps {
  categories: CategoryPerformanceItem[];
}

export default function CategoryPerformanceSection({
  categories,
}: CategoryPerformanceSectionProps) {
  const topCategory = categories.length > 0 ? categories[0] : null;

  return (
    <div className="bg-white rounded-2xl border border-[#EBE2D8] p-5 sm:p-6 shadow-[0_4px_20px_-4px_rgba(79,0,18,0.03)]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h3 className="text-base font-serif font-bold text-[#1F1B17]">
            Category Contribution & Taxonomy Velocity
          </h3>
          <p className="text-xs text-[#554243]">
            Revenue generation and share of total store sales by silhouette taxonomy
          </p>
        </div>

        {topCategory && (
          <div className="flex items-center gap-2 bg-[#FCF2EB] border border-[#F3DEC9] px-3 py-1.5 rounded-xl text-xs text-[#6D1826] self-start sm:self-auto">
            <PieChart className="w-3.5 h-3.5" />
            <span>
              Lead Category: <strong>{topCategory.category_name}</strong> (
              {topCategory.contribution_percentage}%)
            </span>
          </div>
        )}
      </div>

      {categories.length === 0 ? (
        <div className="py-12 text-center rounded-xl border border-dashed border-[#EBE2D8] bg-[#FAF6F2]">
          <FolderTree className="w-8 h-8 text-[#8C7A78] mx-auto mb-2" />
          <p className="text-xs text-[#8C7A78]">
            No category transactions recorded in this period.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {categories.map((cat, idx) => {
            const barColors = [
              "bg-[#6D1826]", // Maroon
              "bg-[#C49A45]", // Gold
              "bg-[#059669]", // Emerald
              "bg-[#0284C7]", // Blue
              "bg-[#7C3AED]", // Purple
            ];
            const colorClass = barColors[idx % barColors.length];

            return (
              <div
                key={cat.category_id || idx}
                className="p-4 rounded-xl bg-[#FAF6F2] border border-[#EBE2D8] transition-all hover:border-[#D5C2AF]"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-md bg-white border border-[#EBE2D8] flex items-center justify-center text-xs font-bold text-[#6D1826]">
                      {idx + 1}
                    </span>
                    <span className="text-sm font-semibold text-[#1F1B17]">
                      {cat.category_name}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-[#554243]">
                      Units: <strong className="text-[#1F1B17]">{cat.units_sold}</strong>
                    </span>
                    <span className="text-[#554243]">
                      Revenue:{" "}
                      <strong className="text-[#1F1B17] font-serif">
                        {formatINR(cat.revenue)}
                      </strong>
                    </span>
                    <span className="font-bold text-[#6D1826] bg-white border border-[#EBE2D8] px-2 py-0.5 rounded-full">
                      {cat.contribution_percentage}% Share
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2 rounded-full bg-white border border-[#EBE2D8] overflow-hidden">
                  <div
                    style={{ width: `${Math.min(cat.contribution_percentage, 100)}%` }}
                    className={`h-full ${colorClass} transition-all duration-300`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

