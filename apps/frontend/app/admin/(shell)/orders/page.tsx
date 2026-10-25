import { Suspense } from "react";
import AdminOrdersClient from "@/components/admin/orders/AdminOrdersClient";

export const metadata = {
  title: "Orders Management | Admin Console",
  description: "Patron orders, payment verification states, order statuses, and fulfillment tracking.",
};

export default function AdminOrdersPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full py-12 flex items-center justify-center text-xs text-[#8C7A78]">
          Loading orders console...
        </div>
      }
    >
      <AdminOrdersClient />
    </Suspense>
  );
}
