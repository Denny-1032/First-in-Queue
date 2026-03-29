import { NextRequest, NextResponse } from "next/server";
import { createBooking, getBookings, getUpcomingBookings } from "@/lib/db/operations";
import { getDefaultTenantId } from "@/lib/db/get-default-tenant";
import type { BookingStatus } from "@/types";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const tenantId = searchParams.get("tenant_id") || await getDefaultTenantId();
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
    console.error("[API] Error fetching bookings:", error);
    return NextResponse.json({ error: "Failed to fetch bookings" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const tenantId = body.tenant_id || await getDefaultTenantId();

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
    console.error("[API] Error creating booking:", error);
    return NextResponse.json({ error: "Failed to create booking" }, { status: 500 });
  }
}
