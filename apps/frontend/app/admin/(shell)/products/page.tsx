import { Suspense } from "react";
import AdminProductsClient from "@/components/admin/products/AdminProductsClient";

export const metadata = {
  title: "Products Management | Admin Console",
  description: "Couture silhouettes, inventory matrices, variant configuration, and catalog pricing.",
};

export default function AdminProductsPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full py-12 flex items-center justify-center text-xs text-[#8C7A78]">
          Loading products console...
        </div>
      }
    >
      <AdminProductsClient />
    </Suspense>
  );
}

