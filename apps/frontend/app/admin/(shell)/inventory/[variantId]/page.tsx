import { Suspense } from "react";
import AdminInventoryDetailClient from "@/components/admin/inventory/AdminInventoryDetailClient";

export const metadata = {
  title: "Inventory Detail & Stock Adjustment | Admin Console",
  description:
    "Authoritative stock levels, active reservations, and complete movement audit history for Closet by Chilli.",
};

interface AdminInventoryDetailPageProps {
  params: Promise<{ variantId: string }>;
}

export default async function AdminInventoryDetailPage({
  params,
}: AdminInventoryDetailPageProps) {
  const { variantId } = await params;

  return (
    <Suspense
      fallback={
        <div className="w-full py-12 flex items-center justify-center text-xs text-[#8C7A78]">
          Loading variant inventory details...
        </div>
      }
    >
      <AdminInventoryDetailClient variantId={variantId} />
    </Suspense>
  );
}
