import AdminAnalyticsClient from "@/components/admin/analytics/AdminAnalyticsClient";

export const metadata = {
  title: "Analytics & Business Intelligence | Admin Console",
  description:
    "Executive metrics, revenue velocity, product performance, and customer acquisition telemetry for Closet by Chilli.",
};

export default function AdminAnalyticsPage() {
  return <AdminAnalyticsClient />;
}
