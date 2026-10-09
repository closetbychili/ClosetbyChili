import type { Metadata } from "next";
import { Bodoni_Moda, Cinzel, Montserrat } from "next/font/google";
import "lenis/dist/lenis.css";
import "./globals.css";

const bodoniModa = Bodoni_Moda({
  variable: "--font-bodoni-moda",
  subsets: ["latin"],
  display: "swap",
});

const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
  display: "swap",
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  display: "swap",
});

import { CartProvider } from "@/components/CartContext";
import { AuthProvider } from "@/components/AuthProvider";
import CartDrawer from "@/components/CartDrawer";
import SmoothScroll from "@/components/SmoothScroll";

export const metadata: Metadata = {
  title: "Closet by Chili | Bold. Feminine. Timeless.",
  description:
    "Closet by Chili — contemporary ethnic wear for women who express confidence, elegance and individuality through every drape.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
          rel="stylesheet"
        />
      </head>
      <body className={`${bodoniModa.variable} ${cinzel.variable} ${montserrat.variable} antialiased`}>
        <SmoothScroll>
          <AuthProvider>
            <CartProvider>
              {children}
              <CartDrawer />
            </CartProvider>
          </AuthProvider>
        </SmoothScroll>
      </body>
    </html>
  );
}