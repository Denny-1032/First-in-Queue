import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export async function GET() {
  try {
    const db = getSupabaseAdmin();
    const { data: bookings, error } = await db
      .from("demo_bookings")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[Admin API] Error fetching demo bookings:", error);
      return NextResponse.json({ error: "Failed to fetch demo bookings" }, { status: 500 });
    }

    return NextResponse.json(bookings || []);
  } catch (error) {
    console.error("[Admin API] Error fetching demo bookings:", error);
    return NextResponse.json({ error: "Failed to fetch demo bookings" }, { status: 500 });
  }
}
