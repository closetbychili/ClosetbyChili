import AdminPlaceholderPage from "@/components/admin/AdminPlaceholderPage";

export const metadata = {
  title: "Coupons & Promotions | Admin Console",
};

export default function AdminCouponsPage() {
  return (
    <AdminPlaceholderPage
      title="Coupons & Promotions"
      description="Discount codes, promotional campaigns, redemption limits, and minimum cart eligibility."
      routePath="/admin/coupons"
    />
  );
}
