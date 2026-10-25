import { Suspense } from "react";
import AdminCouponsClient from "@/components/admin/coupons/AdminCouponsClient";

export const metadata = {
  title: "Coupons & Promotions | Admin Console",
  description: "Discount codes, promotional campaigns, redemption limits, and minimum cart eligibility.",
};

export default function AdminCouponsPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full py-12 flex items-center justify-center text-xs text-stone-500">
          Loading promotional coupons console...
        </div>
      }
    >
      <AdminCouponsClient />
    </Suspense>
  );
}
