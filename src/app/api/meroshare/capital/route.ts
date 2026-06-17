import { NextResponse } from "next/server";
import { getCapitalList } from "@/src/lib/meroshare-api";

export async function GET() {
  try {
    const capitals = await getCapitalList();
    return NextResponse.json({ capitals });
  } catch (err) {
    console.error("[meroshare/capital] failed to fetch capital list:", err);
    return NextResponse.json(
      { error: "Could not reach MeroShare. Try again." },
      { status: 503 },
    );
  }
}
