import { Suspense } from "react";
import AdminShipmentsClient from "@/components/admin/shipments/AdminShipmentsClient";

export const metadata = {
  title: "Shipment Management | Admin Console",
  description: "Carrier parcels, tracking details, dispatch workflows, and fulfillment lifecycle.",
};

export default function AdminShipmentsPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full py-12 flex items-center justify-center text-xs text-[#8C7A78]">
          Loading shipments console...
        </div>
      }
    >
      <AdminShipmentsClient />
    </Suspense>
  );
}
