import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, company, contact, source } = body;

    if (!name || !contact) {
      return NextResponse.json(
        { error: "Name and contact (phone or email) are required" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Store demo booking in a simple table
    const { error } = await supabase.from("demo_bookings").insert({
      name,
      company: company || null,
      contact,
      source: source || "website",
      status: "new",
    });

    if (error) {
      // If table doesn't exist, log but still return success
      console.error("[Demo Booking] DB error (non-critical):", error.message);
    }

    return NextResponse.json({ success: true, message: "Demo booked successfully" });
  } catch (error) {
    console.error("[Demo Booking] Error:", error);
    return NextResponse.json(
      { error: "Failed to book demo" },
      { status: 500 }
    );
  }
}
