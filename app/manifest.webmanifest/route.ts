import { NextResponse } from "next/server";

// 以一般 route 提供 manifest，而非 app/manifest.ts 慣例檔：
// 慣例檔會自動注入不帶憑證的 <link rel="manifest">，
// 在需要 cookie 驗證的 Sites 環境上會拿到 401。
// 帶 use-credentials 的 link 由 layout.tsx 手動輸出。
export function GET() {
  return NextResponse.json(
    {
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
    },
    { headers: { "content-type": "application/manifest+json" } },
  );
}
