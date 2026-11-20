import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      // Fotky externých inzerátov (Bazoš, Bazar.sk / United Classifieds)
      { protocol: "https", hostname: "**.bazos.sk" },
      { protocol: "https", hostname: "**.unitedclassifieds.sk" },
      { protocol: "https", hostname: "**.bazar.sk" },
      { protocol: "https", hostname: "bazos.sk" },
      { protocol: "https", hostname: "bazar.sk" },
    ],
    // Menšie súbory (WebP) = rýchlejšie načítanie stránky.
    formats: ["image/webp"],
  },
  compress: true,
};

export default nextConfig;
