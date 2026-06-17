import { type NextRequest, NextResponse } from "next/server";
import {
  meroShareLogin,
  getMyDetails,
  type MeroShareSession,
} from "@/src/lib/meroshare-api";

export async function POST(req: NextRequest) {
  let body: {
    username?: string;
    password?: string;
    clientId?: number;  // internal DP id (from capital list), NOT the visible code
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  const { username, password, clientId } = body;
  if (!username || !password || clientId == null) {
    return NextResponse.json(
      { error: "username, password and clientId are required." },
      { status: 400 },
    );
  }

  let session: MeroShareSession;
  try {
    session = await meroShareLogin(username, password, clientId);
  } catch (err) {
    if (err instanceof Error && err.message === "INVALID_CREDENTIALS") {
      return NextResponse.json(
        {
          error:
            "Invalid MeroShare credentials. Check your username, password and DP.",
        },
        { status: 400 },
      );
    }
    console.error("[meroshare/sync] login failed:", err);
    return NextResponse.json(
      { error: "Could not reach MeroShare. Try again." },
      { status: 503 },
    );
  }

  try {
    const user = await getMyDetails(session);
    // meroShareView/* and myPurchase/* are behind a WAF policy that blocks
    // server-side requests regardless of headers (see meroshare-api.ts) —
    // the browser fetches holdings/purchase history directly using this token.
    return NextResponse.json({ user, token: session.token });
  } catch (err) {
    console.error("[meroshare/sync] getMyDetails failed:", err);
    return NextResponse.json(
      { error: "Could not reach MeroShare. Try again." },
      { status: 503 },
    );
  }
}
