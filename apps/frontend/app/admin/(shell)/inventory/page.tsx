import { Suspense } from "react";
import AdminInventoryClient from "@/components/admin/inventory/AdminInventoryClient";

export const metadata = {
  title: "Inventory Overview | Admin Console",
  description: "Atelier stock levels, reservation allocations, low-stock thresholds, and ledger movements.",
};

export default function AdminInventoryPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full py-12 flex items-center justify-center text-xs text-[#8C7A78]">
          Loading inventory console...
        </div>
      }
    >
      <AdminInventoryClient />
    </Suspense>
  );
}
