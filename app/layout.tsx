import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";

import { auth } from "@/auth";
import { Providers } from "@/components/Providers";
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
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#1e293b" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${cormorant.variable} ${dmSans.variable} h-full antialiased`}
    >
      <body className="flex min-h-[100dvh] min-h-full flex-col bg-background pb-[env(safe-area-inset-bottom,0px)] font-[family-name:var(--font-dm-sans)] text-foreground">
        <Providers session={session}>
          <SiteNav session={session} />
          <div className="min-h-0 min-w-0 flex-1">{children}</div>
        </Providers>
      </body>
    </html>
  );
}
