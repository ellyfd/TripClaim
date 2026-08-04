import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "快報 TripClaim",
    short_name: "快報",
    description: "共同規劃出差，快速收單並完成個人報支。",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f5f6f3",
    theme_color: "#145c47",
    orientation: "any",
    lang: "zh-Hant",
    categories: ["business", "productivity", "travel"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
