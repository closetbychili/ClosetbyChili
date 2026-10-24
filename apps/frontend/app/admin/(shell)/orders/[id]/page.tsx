import { Suspense } from "react";
import AdminOrderDetailClient from "@/components/admin/orders/AdminOrderDetailClient";

export const metadata = {
  title: "Order Details | Admin Console",
  description: "Comprehensive order inspection, customer snapshots, line items, payment audit trail, and inventory movements.",
};

interface AdminOrderDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function AdminOrderDetailPage({ params }: AdminOrderDetailPageProps) {
  const resolvedParams = await params;

  return (
    <Suspense
      fallback={
        <div className="w-full py-12 flex items-center justify-center text-xs text-[#8C7A78]">
          Loading order details...
        </div>
      }
    >
      <AdminOrderDetailClient orderId={resolvedParams.id} />
    </Suspense>
  );
}
