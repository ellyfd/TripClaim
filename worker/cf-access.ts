/**
 * Cloudflare Access JWT 驗證（自架部署用）。
 *
 * 自架在自己的 Cloudflare 帳號時，登入交給 Zero Trust Access：
 * Access 在請求到達 Worker 前完成身分驗證，並在請求上附帶
 * `cf-access-jwt-assertion` header。這裡驗證該 JWT 的 RS256 簽章
 * 與 iss／aud／有效期間，通過後回傳使用者 email。
 *
 * 沒有通過驗證的請求（例如繞過 Access 直連 workers.dev）拿不到
 * 任何身分，因此偽造 `oai-authenticated-user-email` header 無效。
 */

type AccessJwk = {
  kid: string;
  kty: string;
  alg: string;
  n: string;
  e: string;
  use?: string;
};

type AccessJwtPayload = {
  aud?: string | string[];
  email?: string;
  exp?: number;
  nbf?: number;
  iss?: string;
};

const CERTS_TTL_MS = 60 * 60 * 1000;
const CLOCK_SKEW_SECONDS = 60;

let certsCache: {
  teamDomain: string;
  keys: AccessJwk[];
  fetchedAt: number;
} | null = null;

export async function verifyAccessJwt(
  token: string,
  teamDomain: string,
  expectedAud?: string,
): Promise<string | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [rawHeader, rawPayload, rawSignature] = parts;

  let header: { kid?: string; alg?: string };
  let payload: AccessJwtPayload;
  try {
    header = JSON.parse(decodeBase64UrlToString(rawHeader));
    payload = JSON.parse(decodeBase64UrlToString(rawPayload));
  } catch {
    return null;
  }
  if (header.alg !== "RS256" || !header.kid) return null;

  const key = await findSigningKey(teamDomain, header.kid);
  if (!key) return null;

  const cryptoKey = await crypto.subtle.importKey(
    "jwk",
    { kty: key.kty, n: key.n, e: key.e, alg: "RS256", ext: true },
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const valid = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    decodeBase64Url(rawSignature),
    new TextEncoder().encode(`${rawHeader}.${rawPayload}`),
  );
  if (!valid) return null;

  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp !== "number" || payload.exp + CLOCK_SKEW_SECONDS < now) return null;
  if (typeof payload.nbf === "number" && payload.nbf - CLOCK_SKEW_SECONDS > now) return null;
  if (payload.iss !== `https://${teamDomain}`) return null;
  if (expectedAud) {
    const audiences = Array.isArray(payload.aud)
      ? payload.aud
      : payload.aud
        ? [payload.aud]
        : [];
    if (!audiences.includes(expectedAud)) return null;
  }

  const email = payload.email?.trim().toLowerCase();
  return email || null;
}

async function findSigningKey(
  teamDomain: string,
  kid: string,
): Promise<AccessJwk | null> {
  const cached = getCachedKeys(teamDomain);
  const cachedMatch = cached?.find((key) => key.kid === kid);
  if (cachedMatch) return cachedMatch;

  // 金鑰輪替時 kid 會換新，快取沒中就強制重抓一次。
  const keys = await fetchCerts(teamDomain);
  return keys.find((key) => key.kid === kid) ?? null;
}

function getCachedKeys(teamDomain: string): AccessJwk[] | null {
  if (
    certsCache &&
    certsCache.teamDomain === teamDomain &&
    Date.now() - certsCache.fetchedAt < CERTS_TTL_MS
  ) {
    return certsCache.keys;
  }
  return null;
}

async function fetchCerts(teamDomain: string): Promise<AccessJwk[]> {
  const response = await fetch(`https://${teamDomain}/cdn-cgi/access/certs`);
  if (!response.ok) {
    throw new Error(`無法取得 Cloudflare Access 簽章金鑰（HTTP ${response.status}）`);
  }
  const body = (await response.json()) as { keys?: AccessJwk[] };
  const keys = (body.keys ?? []).filter((key) => key.kty === "RSA");
  certsCache = { teamDomain, keys, fetchedAt: Date.now() };
  return keys;
}

function decodeBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function decodeBase64UrlToString(value: string): string {
  return new TextDecoder().decode(decodeBase64Url(value));
}
