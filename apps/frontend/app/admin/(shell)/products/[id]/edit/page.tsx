import { Suspense } from "react";
import AdminEditProductClient from "@/components/admin/products/AdminEditProductClient";

export const metadata = {
  title: "Edit Product | Admin Console",
  description: "Modify silhouette attributes, taxonomy classification, and publication visibility.",
};

export default async function AdminEditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense
      fallback={
        <div className="w-full py-12 flex items-center justify-center text-xs text-[#8C7A78]">
          Loading product editor...
        </div>
      }
    >
      <AdminEditProductClient id={id} />
    </Suspense>
  );
}

