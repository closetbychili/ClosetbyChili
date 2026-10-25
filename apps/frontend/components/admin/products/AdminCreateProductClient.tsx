"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import ProductForm from "@/components/admin/products/ProductForm";
import {
  createAdminProduct,
  getAdminCategories,
  getAdminCollections,
  type CreateProductPayload,
} from "@/lib/api/admin";
import { getCategories, getCollections } from "@/lib/api/catalog";
import type { CategorySummary, CollectionSummary } from "@/lib/api/types";

export default function AdminCreateProductClient() {
  const router = useRouter();

  const [categories, setCategories] = useState<CategorySummary[]>([]);
  const [collections, setCollections] = useState<CollectionSummary[]>([]);
  const [loadingTaxonomy, setLoadingTaxonomy] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadTaxonomy() {
      try {
        const [catResp, colResp] = await Promise.all([
          getAdminCategories({ all: true })
            .catch(() => getCategories({ page_size: 100 }))
            .catch(() => ({ results: [] })),
          getAdminCollections({ all: true })
            .catch(() => getCollections({ page_size: 100 }))
            .catch(() => ({ results: [] })),
        ]);

        if (active) {
          setCategories(catResp.results || []);
          setCollections(colResp.results || []);
        }
      } finally {
        if (active) {
          setLoadingTaxonomy(false);
        }
      }
    }

    loadTaxonomy();
    return () => {
      active = false;
    };
  }, []);

  const handleCreate = async (payload: CreateProductPayload) => {
    const createdProduct = await createAdminProduct(payload);
    // Route to edit page on success with a short delay or query parameter for feedback
    setTimeout(() => {
      router.push(`/admin/products/${createdProduct.id}/edit?created=true`);
    }, 600);
    return createdProduct;
  };

  return (
    <div className="w-full">
      <AdminPageHeader
        title="Create Product"
        description="Design a new couture product silhouette for the Closet by Chilli catalog."
        breadcrumbs={[
          { label: "Products", href: "/admin/products" },
          { label: "New Product" },
        ]}
      />

      {loadingTaxonomy ? (
        <div className="bg-white rounded-2xl border border-[#EBE2D8] p-8 text-center text-xs text-[#8C7A78] animate-pulse">
          Loading catalog taxonomy options...
        </div>
      ) : (
        <ProductForm
          categories={categories}
          collections={collections}
          onSubmit={handleCreate}
          isEdit={false}
        />
      )}
    </div>
  );
}
