/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";
import { verifyAccessJwt } from "./cf-access";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  IMAGES?: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
  /**
   * 自架部署（不走 GPT site）時設定：Zero Trust team domain，
   * 例如 `your-team.cloudflareaccess.com`。設定後即啟用
   * Cloudflare Access 登入模式；留空則維持 GPT site 的
   * ChatGPT header 登入。
   */
  ACCESS_TEAM_DOMAIN?: string;
  /** 自架部署時設定：Access 應用程式的 Audience (AUD) tag。 */
  ACCESS_AUD?: string;
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const SIGN_IN_PATH = "/signin-with-chatgpt";
const SIGN_OUT_PATH = "/signout-with-chatgpt";

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (env.ACCESS_TEAM_DOMAIN) {
      const authed = await applyCloudflareAccessAuth(request, env, url);
      if (authed instanceof Response) return authed;
      request = authed;
    }

    if (url.pathname === "/_vinext/image") {
      // 自架環境若未開通 Images 綁定，直接回原始資產，不做尺寸轉換。
      if (!env.IMAGES) {
        const target = url.searchParams.get("url") ?? "";
        if (target.startsWith("/") && !target.startsWith("//")) {
          return env.ASSETS.fetch(new Request(new URL(target, request.url)));
        }
        return new Response("Image optimization is not configured.", { status: 404 });
      }
      const images = env.IMAGES;
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await images.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    return handler.fetch(request, env, ctx);
  },
};

/**
 * 自架模式的身分轉接層：把 Cloudflare Access 驗證過的身分，
 * 轉成應用程式既有的 `oai-authenticated-user-email` header，
 * 讓 app 層的權限與角色邏輯完全不用改。
 */
async function applyCloudflareAccessAuth(
  request: Request,
  env: Env,
  url: URL,
): Promise<Request | Response> {
  const requestHeaders = new Headers(request.headers);

  // 防偽：自架模式下身分只能來自驗證過的 Access JWT，
  // 先移除外部帶進來的所有 oai-* header。
  for (const key of [...requestHeaders.keys()]) {
    if (key.toLowerCase().startsWith("oai-")) requestHeaders.delete(key);
  }

  const token = requestHeaders.get("cf-access-jwt-assertion");
  const email = token
    ? await verifyAccessJwt(token, env.ACCESS_TEAM_DOMAIN!, env.ACCESS_AUD)
    : null;

  if (!email) {
    return new Response(
      "此部署由 Cloudflare Access 保護。請透過已設定 Access 的網址開啟並完成登入；若持續看到此頁，請確認 Access 應用程式已涵蓋此網域。",
      { status: 403, headers: { "content-type": "text/plain; charset=utf-8" } },
    );
  }

  // GPT site 的登入／登出路徑原本由平台處理；自架模式在這裡對應到
  // Access 的行為。走到 signin 代表 Access 已登入但帳號未啟用
  // （app 層會把無角色的使用者導來這裡），直接導回會形成迴圈，
  // 所以顯示說明頁。
  if (url.pathname === SIGN_IN_PATH) {
    return accountPendingPage(email, url);
  }
  if (url.pathname === SIGN_OUT_PATH) {
    return Response.redirect(new URL("/cdn-cgi/access/logout", url.origin).toString(), 302);
  }

  requestHeaders.set("oai-authenticated-user-email", email);
  return new Request(request, { headers: requestHeaders });
}

function accountPendingPage(email: string, url: URL): Response {
  const logoutUrl = new URL("/cdn-cgi/access/logout", url.origin).toString();
  const html = `<!doctype html>
<html lang="zh-Hant">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>帳號尚未啟用</title>
<style>body{font-family:system-ui,sans-serif;max-width:32rem;margin:15vh auto;padding:0 1.5rem;color:#1f2937;line-height:1.7}h1{font-size:1.25rem}code{background:#f3f4f6;padding:.1rem .35rem;border-radius:.25rem}a{color:#2563eb}</style></head>
<body>
<h1>你已登入，但帳號尚未啟用</h1>
<p>目前登入身分：<code>${escapeHtml(email)}</code></p>
<p>此帳號在 TripClaim 中尚未啟用或已被停用。請聯絡系統管理員在「系統管理」中啟用你的帳號後，再重新開啟 <a href="/">首頁</a>。</p>
<p><a href="${logoutUrl}">改用其他帳號登入</a></p>
</body></html>`;
  return new Response(html, {
    status: 403,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export default worker;
