import type { Metadata } from "next";
import "./globals.css";
import { WixProvider } from "@/context/WixProvider";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";

export const metadata: Metadata = {
  title: "MegaDeal — Local deals up to 70% off",
  description:
    "Restaurants, spas, activities and getaways at up to 70% off. New deals added daily.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <WixProvider>
          <Header />
          {children}
          <Footer />
          <CartDrawer />
        </WixProvider>
      </body>
    </html>
  );
}
