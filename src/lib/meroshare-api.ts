const BASE = "https://webbackend.cdsc.com.np/api/meroShare";

// Headers that mimic a real browser session — MeroShare's backend checks Origin/Referer
const BROWSER_HEADERS = {
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  "Content-Type": "application/json",
  Origin: "https://meroshare.cdsc.com.np",
  Referer: "https://meroshare.cdsc.com.np/",
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
  scripId: number;
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

// MeroShare sits behind an F5-style WAF that issues tracking cookies (TS*) on
// login; requests without them get silently blocked (non-JSON/empty response).
function extractCookies(res: Response): string {
  const cookies: string[] = [];
  for (const [key, value] of res.headers.entries()) {
    if (key.toLowerCase() === "set-cookie") {
      const pair = value.split(";")[0];
      if (pair) cookies.push(pair);
    }
  }
  return cookies.join("; ");
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

  const cookie = extractCookies(res);

  // MeroShare returns the JWT in the Authorization response header, not the JSON body
  const headerToken = res.headers.get("authorization");
  if (headerToken) return { token: headerToken, cookie };

  const data = await res.json();
  if (!data.token) throw new Error("No token in MeroShare auth response");
  return { token: data.token as string, cookie };
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
  if (!res.ok) throw new Error(`getMyDetails failed: ${res.status}`);
  return res.json() as Promise<MeroShareUser>;
}

export async function getMyStocks(
  session: MeroShareSession,
): Promise<MeroShareStock[]> {
  const res = await fetch(`${BASE}/myPurchase/myPurchaseSource/`, {
    headers: {
      ...BROWSER_HEADERS,
      Authorization: session.token,
      Cookie: session.cookie,
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`getMyStocks failed: ${res.status}`);
  const data = await res.json();
  return (Array.isArray(data) ? data : (data.data ?? [])) as MeroShareStock[];
}

export async function getPurchaseHistory(
  session: MeroShareSession,
  demat: string,
  scrip: string,
): Promise<PurchaseLot[]> {
  const res = await fetch(`${BASE}/myPurchase/`, {
    method: "POST",
    headers: {
      ...BROWSER_HEADERS,
      Authorization: session.token,
      Cookie: session.cookie,
    },
    body: JSON.stringify({ demat, scrip, clientCode: demat }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!res.ok)
    throw new Error(`getPurchaseHistory failed for ${scrip}: ${res.status}`);
  const data = await res.json();
  return (Array.isArray(data) ? data : (data.data ?? [])) as PurchaseLot[];
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

export async function fetchAllHoldings(
  session: MeroShareSession,
): Promise<{
  user: MeroShareUser;
  lots: EnrichedLot[];
  failedScrips: string[];
}> {
  const [user, stocks] = await Promise.all([
    getMyDetails(session),
    getMyStocks(session),
  ]);

  const lots: EnrichedLot[] = [];
  const failedScrips: string[] = [];

  for (const chunk of chunkArray(stocks, 3)) {
    await Promise.all(
      chunk.map(async (stock) => {
        try {
          const history = await getPurchaseHistory(
            session,
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
      }),
    );
  }

  return { user, lots, failedScrips };
}
