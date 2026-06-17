const API_ROOT = "https://webbackend.cdsc.com.np/api";
const BASE = `${API_ROOT}/meroShare`;

// Headers that mimic a real browser session. Some endpoints (meroShareView/*,
// myPurchase/*) sit behind an F5 ASM policy that serves a "Request Rejected"
// block page (HTTP 200, HTML body) when these Sec-Fetch-*/Sec-Ch-Ua-* browser
// fingerprint headers are missing — captured verbatim from a real successful
// browser request via DevTools so the policy treats us the same way.
const BROWSER_HEADERS = {
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  "Content-Type": "application/json",
  Origin: "https://meroshare.cdsc.com.np",
  Referer: "https://meroshare.cdsc.com.np/",
  "Sec-Ch-Ua": '"Microsoft Edge";v="149", "Chromium";v="149", "Not)A;Brand";v="24"',
  "Sec-Ch-Ua-Mobile": "?0",
  "Sec-Ch-Ua-Platform": '"Windows"',
  "Sec-Fetch-Dest": "empty",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Site": "same-site",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 Edg/149.0.0.0",
};

export interface MeroShareUser {
  name: string;
  demat: string;
  clientCode: string;
  address: string;
}

export interface MeroShareStock {
  scrip: string;
  companyName: string;
  currentBalance: number;
}

export interface PurchaseLot {
  transactionDate: string; // "YYYY-MM-DD"
  quantity: number;
  rate: number;
  amount: number;
  transactionType: string; // "Purchase", "IPO", "Right", "Bonus", etc.
  history: string;
}

export interface EnrichedLot extends PurchaseLot {
  scrip: string;
  companyName: string;
  currentBalance: number;
}

export type MeroShareSource =
  | "IPO"
  | "FPO"
  | "RIGHT"
  | "AUCTION"
  | "MARKET"
  | "BONUS"
  | "MERGER"
  | "DEMAT";

export interface MeroShareCapital {
  id: number; // internal clientId used in the auth request
  code: string; // visible DP code users recognise (e.g. "10600")
  name: string; // broker name (e.g. "NMB SECURITIES LIMITED")
}

const REQUEST_TIMEOUT_MS = 15_000;

export interface MeroShareSession {
  token: string;
  cookie: string; // WAF/bot-protection tracking cookies set on login — must be replayed on every later request
}

// MeroShare sits behind an F5-style WAF that issues tracking cookies (TS*).
// Those cookies are rotated on every response, not just at login — each
// request must carry forward whatever the previous response just set, or it
// gets silently blocked (200 status, empty/non-JSON body). mergeCookies folds
// any new Set-Cookie values from a response into the running jar.
function mergeCookies(jar: string, res: Response): string {
  const map = new Map<string, string>();
  for (const part of jar.split(";")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    map.set(trimmed.slice(0, eq), trimmed.slice(eq + 1));
  }
  for (const [key, value] of res.headers.entries()) {
    if (key.toLowerCase() !== "set-cookie") continue;
    const pair = value.split(";")[0];
    if (!pair) continue;
    const eq = pair.indexOf("=");
    if (eq === -1) continue;
    map.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
  }
  return Array.from(map.entries())
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
}

// MeroShare's backend returns 200 with a non-JSON (often empty) body when the
// WAF silently blocks a request. Surface the real status/content-type/body
// snippet instead of a bare "Failed to parse JSON" so failures are diagnosable.
async function parseJson<T>(res: Response, label: string): Promise<T> {
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    const contentType = res.headers.get("content-type") ?? "unknown";
    const snippet = text.slice(0, 300).replace(/\s+/g, " ").trim();
    throw new Error(
      `${label} returned non-JSON response (status ${res.status}, content-type: ${contentType}): ${snippet || "<empty body>"}`,
    );
  }
}

export async function getCapitalList(): Promise<MeroShareCapital[]> {
  const res = await fetch(`${BASE}/capital/`, {
    headers: {
      Accept: "application/json",
      Origin: "https://meroshare.cdsc.com.np",
      Referer: "https://meroshare.cdsc.com.np/",
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`getCapitalList failed: ${res.status}`);
  const data = await res.json();
  return (Array.isArray(data) ? data : []) as MeroShareCapital[];
}

export function mapTransactionType(txType: string): MeroShareSource {
  const t = txType.toLowerCase();
  if (t.includes("ipo")) return "IPO";
  if (t.includes("fpo")) return "FPO";
  if (t.includes("right")) return "RIGHT";
  if (t.includes("auction")) return "AUCTION";
  if (t.includes("bonus")) return "BONUS";
  if (t.includes("merger")) return "MERGER";
  if (t.includes("transfer") || t.includes("demat")) return "DEMAT";
  return "MARKET";
}

export async function meroShareLogin(
  username: string,
  password: string,
  clientId: number, // internal DP id from getCapitalList(), NOT the visible code
): Promise<MeroShareSession> {
  const res = await fetch(`${BASE}/auth/`, {
    method: "POST",
    headers: BROWSER_HEADERS,
    body: JSON.stringify({ clientId, username, password }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (res.status === 400 || res.status === 401 || res.status === 403) {
    throw new Error("INVALID_CREDENTIALS");
  }
  if (!res.ok) throw new Error(`MeroShare auth failed: ${res.status}`);

  const cookie = mergeCookies("", res);

  // MeroShare returns the JWT in the Authorization response header, not the JSON body
  const headerToken = res.headers.get("authorization");
  if (headerToken) return { token: headerToken, cookie };

  const data = await parseJson<{ token?: string }>(res, "meroShareLogin");
  if (!data.token) throw new Error("No token in MeroShare auth response");
  return { token: data.token, cookie };
}

export async function getMyDetails(
  session: MeroShareSession,
): Promise<MeroShareUser> {
  const res = await fetch(`${BASE}/ownDetail/`, {
    headers: {
      ...BROWSER_HEADERS,
      Authorization: session.token,
      Cookie: session.cookie,
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  session.cookie = mergeCookies(session.cookie, res);
  if (!res.ok) throw new Error(`getMyDetails failed: ${res.status}`);
  return parseJson<MeroShareUser>(res, "getMyDetails");
}

interface MeroShareDematShareEntry {
  script: string;
  scriptDesc: string;
  currentBalance: number;
}

interface WaccUpdateEntry {
  transactionDate: string;
  transactionQuantity: number;
  rate: number;
  purchaseSource: string;
  historyDescription: string;
}

// meroShareView/* and myPurchase/* sit behind an F5 Bot Defense policy that
// serves a "Request Rejected" block page to any request whose TLS/HTTP2
// fingerprint doesn't match a real browser engine — no header spoofing from
// Node's fetch gets through it (auth/ and ownDetail/ aren't behind this
// policy and work fine server-side, which is why only these two are
// affected). These endpoints respond with Access-Control-Allow-Origin: *,
// so instead of calling them from the server, the browser calls them
// directly using the JWT obtained from the server-side login — a real
// browser fetch naturally carries a real browser's fingerprint.

export async function fetchMyStocksFromBrowser(
  token: string,
  demat: string,
  clientCode: string,
): Promise<MeroShareStock[]> {
  const res = await fetch(`${API_ROOT}/meroShareView/myShare/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: token },
    body: JSON.stringify({
      sortBy: "CCY_SHORT_NAME",
      demat: [demat],
      clientCode,
      page: 1,
      size: 200,
      sortAsc: true,
    }),
  });
  if (!res.ok) throw new Error(`getMyStocks failed: ${res.status}`);
  const data = await parseJson<{
    meroShareDematShare?: MeroShareDematShareEntry[];
  }>(res, "getMyStocks");
  const entries = data.meroShareDematShare ?? [];
  return entries.map((e) => ({
    scrip: e.script,
    companyName: e.scriptDesc,
    currentBalance: e.currentBalance,
  }));
}

export async function fetchPurchaseHistoryFromBrowser(
  token: string,
  demat: string,
  scrip: string,
): Promise<PurchaseLot[]> {
  const res = await fetch(`${API_ROOT}/myPurchase/search/wacc/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: token },
    body: JSON.stringify({ demat, scrip }),
  });
  if (!res.ok)
    throw new Error(`getPurchaseHistory failed for ${scrip}: ${res.status}`);
  const data = await parseJson<{ waccUpdateResponse?: WaccUpdateEntry[] }>(
    res,
    `getPurchaseHistory(${scrip})`,
  );
  const entries = data.waccUpdateResponse ?? [];
  return entries.map((e) => ({
    transactionDate: e.transactionDate.slice(0, 10),
    quantity: e.transactionQuantity,
    rate: e.rate,
    amount: e.rate * e.transactionQuantity,
    transactionType: e.purchaseSource,
    history: e.historyDescription,
  }));
}

export async function fetchAllHoldingsFromBrowser(
  token: string,
  user: MeroShareUser,
): Promise<{ lots: EnrichedLot[]; failedScrips: string[] }> {
  const stocks = await fetchMyStocksFromBrowser(
    token,
    user.demat,
    user.clientCode,
  );

  const lots: EnrichedLot[] = [];
  const failedScrips: string[] = [];

  for (const stock of stocks) {
    try {
      const history = await fetchPurchaseHistoryFromBrowser(
        token,
        user.demat,
        stock.scrip,
      );
      for (const lot of history) {
        lots.push({
          ...lot,
          scrip: stock.scrip,
          companyName: stock.companyName,
          currentBalance: stock.currentBalance,
        });
      }
    } catch {
      failedScrips.push(stock.scrip);
    }
  }

  return { lots, failedScrips };
}
