import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AuthForm from "@/components/AuthForm";

export const metadata: Metadata = {
  title: "Create Account | Closet by Chili",
  description: "Join Closet by Chili as a Muse for tailored luxury ethnic wear and member privileges.",
};

export default function RegisterPage() {
  return (
    <>
      <Header />
      <AuthForm mode="register" />
      <Footer />
    </>
  );
}
