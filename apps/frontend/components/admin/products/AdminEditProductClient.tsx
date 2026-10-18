"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertCircle, ArrowLeft, CheckCircle2, Package, RefreshCw } from "lucide-react";

import AdminPageHeader from "@/components/admin/AdminPageHeader";
import ProductForm from "@/components/admin/products/ProductForm";
import {
  getAdminCategories,
  getAdminCollections,
  getAdminProduct,
  updateAdminProduct,
  type AdminProductDetail,
  type UpdateProductPayload,
} from "@/lib/api/admin";
import { getCategories, getCollections } from "@/lib/api/catalog";
import type { CategorySummary, CollectionSummary } from "@/lib/api/types";
import { ApiClientError } from "@/lib/api/client";

interface AdminEditProductClientProps {
  id: string;
}

export default function AdminEditProductClient({ id }: AdminEditProductClientProps) {
  const searchParams = useSearchParams();
  const isNewlyCreated = searchParams.get("created") === "true";

  const [product, setProduct] = useState<AdminProductDetail | null>(null);
  const [categories, setCategories] = useState<CategorySummary[]>([]);
  const [collections, setCollections] = useState<CollectionSummary[]>([]);

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        setNotFound(false);

        const [productData, catResp, colResp] = await Promise.all([
          getAdminProduct(id),
          getAdminCategories({ all: true })
            .catch(() => getCategories({ page_size: 100 }))
            .catch(() => ({ results: [] })),
          getAdminCollections({ all: true })
            .catch(() => getCollections({ page_size: 100 }))
            .catch(() => ({ results: [] })),
        ]);

        if (active) {
          setProduct(productData);
          setCategories(catResp.results || []);
          setCollections(colResp.results || []);
        }
      } catch (err: unknown) {
        if (active) {
          if (err instanceof ApiClientError && err.status === 404) {
            setNotFound(true);
          } else if (err instanceof Error) {
            setError(err.message || "Failed to load product details.");
          } else {
            setError("An unexpected error occurred while loading product details.");
          }
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      active = false;
    };
  }, [id, reloadKey]);

  const handleUpdate = async (payload: UpdateProductPayload) => {
    const updated = await updateAdminProduct(id, payload);
    setProduct(updated);
    return updated;
  };

  return (
    <div className="w-full">
      <AdminPageHeader
        title={product ? `Edit: ${product.name}` : "Edit Product"}
        description="Modify silhouette attributes, taxonomy classification, and publication visibility."
        breadcrumbs={[
          { label: "Products", href: "/admin/products" },
          { label: product ? product.name : "Edit Product" },
        ]}
      />

      {/* Just Created Banner */}
      {isNewlyCreated && (
        <div
          role="status"
          className="mb-6 p-4 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] flex items-start gap-3 text-xs text-[#059669]"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">
            Product created successfully. You can now configure additional details or review settings.
          </div>
        </div>
      )}

      {/* Not Found State */}
      {notFound ? (
        <div className="bg-white rounded-2xl border border-[#EBE2D8] p-10 text-center shadow-[0_4px_20px_-4px_rgba(79,0,18,0.03)] max-w-lg mx-auto my-8">
          <div className="w-12 h-12 rounded-full bg-[#FAF6F2] border border-[#EBE2D8] flex items-center justify-center mx-auto mb-3 text-[#8C7A78]">
            <Package className="w-6 h-6" />
          </div>
          <h2 className="text-base font-serif font-bold text-[#1F1B17] mb-1">
            Product Silhouette Not Found
          </h2>
          <p className="text-xs text-[#554243] max-w-sm mx-auto mb-5 leading-relaxed">
            The requested product with ID <code className="font-mono text-[#1F1B17]">{id}</code> does not exist or may have been removed.
          </p>
          <Link
            href="/admin/products"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#4F0012] hover:bg-[#6D1826] text-white text-xs font-medium transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Products Catalog</span>
          </Link>
        </div>
      ) : error ? (
        /* Network / Fetch Error State */
        <div className="bg-white rounded-2xl border border-[#FECACA] p-8 text-center shadow-[0_4px_20px_-4px_rgba(79,0,18,0.03)] max-w-lg mx-auto my-8">
          <div className="w-12 h-12 rounded-full bg-[#FEF2F2] border border-[#FECACA] flex items-center justify-center mx-auto mb-3 text-[#DC2626]">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-sm font-semibold text-[#1F1B17] mb-1">
            Failed to Load Product
          </h2>
          <p className="text-xs text-[#DC2626] max-w-sm mx-auto mb-4">{error}</p>
          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#4F0012] hover:bg-[#6D1826] text-white text-xs font-medium transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry loading</span>
          </button>
        </div>
      ) : loading ? (
        /* Loading Skeleton */
        <div className="bg-white rounded-2xl border border-[#EBE2D8] p-8 shadow-[0_4px_20px_-4px_rgba(79,0,18,0.03)] space-y-4 animate-pulse">
          <div className="h-4 bg-[#FAF6F2] rounded w-1/4 mb-4" />
          <div className="h-10 bg-[#FAF6F2] rounded-xl w-full" />
          <div className="h-10 bg-[#FAF6F2] rounded-xl w-full" />
          <div className="h-24 bg-[#FAF6F2] rounded-xl w-full" />
        </div>
      ) : product ? (
        /* Populated Form */
        <ProductForm
          initialData={product}
          categories={categories}
          collections={collections}
          onSubmit={handleUpdate}
          isEdit={true}
        />
      ) : null}
    </div>
  );
}
