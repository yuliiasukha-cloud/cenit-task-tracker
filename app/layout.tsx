import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";

import { SiteNav } from "@/components/SiteNav";

import "./globals.css";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  style: ["italic"],
  weight: ["300", "400", "600", "700"],
  variable: "--font-cormorant",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-dm-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Cénit",
  description: "Create your perfect day — tasks in natural language.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${cormorant.variable} ${dmSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-[#FFFFFF] pb-[env(safe-area-inset-bottom,0px)] font-[family-name:var(--font-dm-sans)] text-[#2F4156]">
        <SiteNav />
        <div className="min-h-0 min-w-0 flex-1">{children}</div>
      </body>
    </html>
  );
}
