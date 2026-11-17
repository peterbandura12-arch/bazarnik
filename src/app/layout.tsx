import type { Metadata } from "next";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { DemoBanner } from "@/components/layout/DemoBanner";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Bazárnik – inzeráty a ponuky z celého Slovenska",
    template: "%s | Bazárnik",
  },
  description:
    "Bazárnik je moderná slovenská inzertná platforma. Pridajte vlastný inzerát zdarma a prehliadajte ponuky z viacerých zdrojov na jednom mieste.",
  openGraph: {
    type: "website",
    locale: "sk_SK",
    siteName: "Bazárnik",
    title: "Bazárnik – inzeráty a ponuky z celého Slovenska",
    description:
      "Moderná slovenská inzertná platforma. Vlastné inzeráty aj externé ponuky na jednom mieste.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="sk">
      <body className="flex min-h-screen flex-col">
        <DemoBanner visible={!isSupabaseConfigured()} />
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
