import { NextResponse } from "next/server";
import { getPlatformStats } from "@/lib/db/admin-operations";

export async function GET() {
  try {
    const stats = await getPlatformStats();
    return NextResponse.json(stats);
  } catch (error) {
    console.error("[Admin API] Error fetching stats:", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
