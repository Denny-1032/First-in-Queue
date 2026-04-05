import { NextRequest, NextResponse } from "next/server";
import { createBooking, getBookings, getUpcomingBookings } from "@/lib/db/operations";
import { requireSession, AuthError } from "@/lib/auth/session";
import type { BookingStatus } from "@/types";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const session = await requireSession();
    const tenantId = session.tenantId;
    const status = searchParams.get("status") as BookingStatus | null;
    const date = searchParams.get("date");
    const customerPhone = searchParams.get("customer_phone");
    const upcoming = searchParams.get("upcoming") === "true";
    const limit = parseInt(searchParams.get("limit") || "50");

    if (upcoming) {
      const bookings = await getUpcomingBookings(tenantId, limit);
      return NextResponse.json(bookings);
    }

    const bookings = await getBookings(
      tenantId,
      {
        status: status || undefined,
        date: date || undefined,
        customer_phone: customerPhone || undefined,
      },
      limit
    );
    return NextResponse.json(bookings);
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[API] Error fetching bookings:", error);
    return NextResponse.json({ error: "Failed to fetch bookings" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const session = await requireSession();
    const tenantId = session.tenantId;

    if (!body.customer_phone || !body.booking_type || !body.scheduled_date) {
      return NextResponse.json(
        { error: "customer_phone, booking_type, and scheduled_date are required" },
        { status: 400 }
      );
    }

    const booking = await createBooking({
      tenant_id: tenantId,
      conversation_id: body.conversation_id || null,
      customer_phone: body.customer_phone,
      customer_name: body.customer_name || null,
      booking_type: body.booking_type,
      status: body.status || "pending",
      scheduled_date: body.scheduled_date,
      scheduled_time: body.scheduled_time || null,
      duration_minutes: body.duration_minutes || null,
      location: body.location || null,
      notes: body.notes || null,
      details: body.details || {},
      cancellation_reason: body.cancellation_reason || null,
    });

    return NextResponse.json(booking, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[API] Error creating booking:", error);
    return NextResponse.json({ error: "Failed to create booking" }, { status: 500 });
  }
}
