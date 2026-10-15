import AdminPlaceholderPage from "@/components/admin/AdminPlaceholderPage";

export const metadata = {
  title: "Products Management | Admin Console",
};

export default function AdminProductsPage() {
  return (
    <AdminPlaceholderPage
      title="Products"
      description="Couture catalog, product silhouettes, sizing matrices, and fabric specifications."
      routePath="/admin/products"
    />
  );
}
