import AdminPlaceholderPage from "@/components/admin/AdminPlaceholderPage";

export const metadata = {
  title: "Order Details | Admin Console",
};

interface AdminOrderDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function AdminOrderDetailPage({ params }: AdminOrderDetailPageProps) {
  const resolvedParams = await params;
  return (
    <AdminPlaceholderPage
      title="Order Details"
      description={`Customer order line items, payment audit trail, fulfillment status, and dispatch tracking for order ID ${resolvedParams.id}. (Coming in Sprint A4.2)`}
      routePath={`/admin/orders/${resolvedParams.id}`}
    />
  );
}
