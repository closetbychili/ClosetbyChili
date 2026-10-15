import AdminPlaceholderPage from "@/components/admin/AdminPlaceholderPage";

export const metadata = {
  title: "Analytics & Reports | Admin Console",
};

export default function AdminAnalyticsPage() {
  return (
    <AdminPlaceholderPage
      title="Analytics"
      description="Gross merchandise value, conversion rates, average order values, and inventory turnover reports."
      routePath="/admin/analytics"
    />
  );
}
