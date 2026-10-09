import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AuthForm from "@/components/AuthForm";

export const metadata: Metadata = {
  title: "Sign In | Closet by Chili",
  description: "Access your saved silhouettes, order archives, and complimentary personal curations.",
};

export default function LoginPage() {
  return (
    <>
      <Header />
      <AuthForm mode="login" />
      <Footer />
    </>
  );
}
