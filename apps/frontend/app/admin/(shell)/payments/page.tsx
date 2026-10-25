import { Suspense } from "react";
import AdminPaymentsClient from "@/components/admin/payments/AdminPaymentsClient";

export const metadata = {
  title: "Payments & Reconciliation | Admin Console",
  description: "Authoritative payment operations, discrepancy detection, and safe gateway reconciliation for Closet by Chilli.",
};

export default function AdminPaymentsPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full py-12 flex items-center justify-center text-xs text-[#8C7A78]">
          Loading payment operations console...
        </div>
      }
    >
      <AdminPaymentsClient />
    </Suspense>
  );
}
