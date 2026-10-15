import AdminPlaceholderPage from "@/components/admin/AdminPlaceholderPage";

export const metadata = {
  title: "Orders Management | Admin Console",
};

export default function AdminOrdersPage() {
  return (
    <AdminPlaceholderPage
      title="Orders"
      description="Patron orders, Razorpay payment verification states, packing manifests, and dispatch statuses."
      routePath="/admin/orders"
    />
  );
}
