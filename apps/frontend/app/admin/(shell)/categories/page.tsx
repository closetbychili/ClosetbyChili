import { Suspense } from "react";
import AdminCategoriesClient from "@/components/admin/categories/AdminCategoriesClient";

export const metadata = {
  title: "Categories Management | Admin Console",
  description: "Hierarchical taxonomy, parent-child category relationships, and silhouette sorting.",
};

export default function AdminCategoriesPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full py-12 flex items-center justify-center text-xs text-[#8C7A78]">
          Loading categories console...
        </div>
      }
    >
      <AdminCategoriesClient />
    </Suspense>
  );
}
