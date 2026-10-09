import { Suspense } from "react";
import AccountPage from "@/components/AccountPage";

export const metadata = { title: "My Account | Closet by Chili" };

export default function Page() {
  return (
    <Suspense fallback={null}>
      <AccountPage />
    </Suspense>
  );
}

