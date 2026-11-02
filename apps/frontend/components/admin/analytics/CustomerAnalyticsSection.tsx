"use client";

import {
  Calendar,
  Repeat,
  Sparkles,
  TrendingUp,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react";
import type { CustomerAnalyticsData } from "@/lib/api/admin";

interface CustomerAnalyticsSectionProps {
  data: CustomerAnalyticsData;
}

export default function CustomerAnalyticsSection({
  data,
}: CustomerAnalyticsSectionProps) {
  const behavior = data.ordering_behavior;
  const growthTrend = data.customer_growth_trend;

  // Max daily signups for scaling mini-chart
  const maxSignups = Math.max(...growthTrend.map((g) => g.count), 5);

  return (
    <div className="bg-white rounded-2xl border border-[#EBE2D8] p-5 sm:p-6 shadow-[0_4px_20px_-4px_rgba(79,0,18,0.03)]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h3 className="text-base font-serif font-bold text-[#1F1B17]">
            Patron Intelligence & Acquisition
          </h3>
          <p className="text-xs text-[#554243]">
            Customer lifecycle telemetry, repeat ordering behavior, and membership growth
          </p>
        </div>

        <div className="flex items-center gap-2 bg-[#FAF6F2] border border-[#EBE2D8] px-3 py-1.5 rounded-xl text-xs text-[#1F1B17] self-start sm:self-auto">
          <Users className="w-4 h-4 text-[#6D1826]" />
          <span>
            Total Registered Patrons:{" "}
            <strong className="font-bold">
              {data.total_registered_customers.toLocaleString("en-IN")}
            </strong>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* 1. Returning vs First-Time Buyers Breakdown */}
        <div className="p-5 rounded-xl bg-[#FAF6F2] border border-[#EBE2D8] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-[#8C7A78] uppercase tracking-wider">
                Ordering Patron Composition
              </span>
              <span className="text-xs font-medium text-[#1F1B17]">
                {behavior.total_unique_buyers} Unique Buyers in Period
              </span>
            </div>

            {/* Visual Split Bar */}
            <div className="w-full h-3 rounded-full bg-white border border-[#EBE2D8] overflow-hidden flex mb-4">
              <div
                style={{ width: `${behavior.returning_buyers_percentage}%` }}
                className="bg-[#6D1826] h-full"
                title={`Returning: ${behavior.returning_buyers_percentage}%`}
              />
              <div
                style={{ width: `${behavior.first_time_buyers_percentage}%` }}
                className="bg-[#C49A45] h-full"
                title={`First-Time: ${behavior.first_time_buyers_percentage}%`}
              />
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 gap-3">
              {/* Returning */}
              <div className="p-3 bg-white rounded-xl border border-[#EBE2D8]">
                <div className="flex items-center gap-1.5 text-xs text-[#6D1826] font-semibold mb-1">
                  <Repeat className="w-3.5 h-3.5" />
                  Returning Patrons
                </div>
                <span className="text-xl font-bold font-serif text-[#1F1B17] block">
                  {behavior.returning_buyers_count}
                </span>
                <span className="text-[11px] text-[#8C7A78]">
                  {behavior.returning_buyers_percentage}% of active buyers
                </span>
              </div>

              {/* First Time */}
              <div className="p-3 bg-white rounded-xl border border-[#EBE2D8]">
                <div className="flex items-center gap-1.5 text-xs text-[#C49A45] font-semibold mb-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  First-Time Buyers
                </div>
                <span className="text-xl font-bold font-serif text-[#1F1B17] block">
                  {behavior.first_time_buyers_count}
                </span>
                <span className="text-[11px] text-[#8C7A78]">
                  {behavior.first_time_buyers_percentage}% of active buyers
                </span>
              </div>
            </div>
          </div>

          <p className="mt-4 pt-3 border-t border-[#EBE2D8] text-[11px] text-[#8C7A78]">
            Evaluated by comparing current order actors against historical transaction ledgers.
          </p>
        </div>

        {/* 2. New Registrations Trend Sparkline */}
        <div className="p-5 rounded-xl bg-[#FAF6F2] border border-[#EBE2D8] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-[#8C7A78] uppercase tracking-wider">
                Patron Registration Trend
              </span>
              <span className="text-xs font-semibold text-[#6D1826] bg-white border border-[#EBE2D8] px-2 py-0.5 rounded-full">
                +{data.new_registered_customers} New in Period
              </span>
            </div>

            {growthTrend.length === 0 ? (
              <div className="h-32 flex flex-col items-center justify-center text-center">
                <UserCheck className="w-6 h-6 text-[#8C7A78] mb-1" />
                <span className="text-xs text-[#8C7A78]">
                  No account registrations recorded in this window.
                </span>
              </div>
            ) : (
              <div className="space-y-2 mt-2">
                <div className="h-28 flex items-end gap-1.5 pt-4">
                  {growthTrend.map((pt, i) => {
                    const heightPct = Math.max((pt.count / maxSignups) * 100, 8);
                    return (
                      <div
                        key={pt.date || i}
                        className="flex-1 flex flex-col items-center h-full justify-end group relative"
                      >
                        {/* Hover Tooltip */}
                        <div className="hidden group-hover:block absolute bottom-full mb-1 z-10 bg-[#1F1B17] text-white text-[10px] px-2 py-0.5 rounded whitespace-nowrap shadow-md pointer-events-none">
                          {pt.date}: {pt.count} new
                        </div>
                        {/* Bar */}
                        <div
                          style={{ height: `${heightPct}%` }}
                          className="w-full bg-[#6D1826] rounded-t-sm opacity-85 group-hover:opacity-100 transition-opacity cursor-pointer"
                        />
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between text-[10px] text-[#8C7A78] pt-1 border-t border-[#EBE2D8]">
                  <span>{growthTrend[0]?.date}</span>
                  <span>{growthTrend[growthTrend.length - 1]?.date}</span>
                </div>
              </div>
            )}
          </div>

          <p className="mt-4 pt-3 border-t border-[#EBE2D8] text-[11px] text-[#8C7A78]">
            Verified customer identities registered in Supabase Auth & Django application ledger.
          </p>
        </div>
      </div>
    </div>
  );
}

