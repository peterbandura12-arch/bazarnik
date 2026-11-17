import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const staticRoutes = [
    "",
    "/inzeraty",
    "/o-nas",
    "/kontakt",
    "/pomoc",
    "/podmienky",
    "/ochrana-osobnych-udajov",
    "/prihlasenie",
    "/registracia",
  ];
  return staticRoutes.map((route) => ({
    url: `${siteUrl}${route}`,
    changeFrequency: route === "/inzeraty" ? "hourly" : "monthly",
    priority: route === "" ? 1 : route === "/inzeraty" ? 0.9 : 0.5,
  }));
}
