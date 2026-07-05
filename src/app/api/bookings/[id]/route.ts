import { NextRequest, NextResponse } from "next/server";
import { getBooking, updateBooking, cancelBooking } from "@/lib/db/operations";
import { requireSession, AuthError } from "@/lib/auth/session";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const booking = await getBooking(id);
    if (!booking || booking.tenant_id !== session.tenantId) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }
    return NextResponse.json(booking);
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[API] Error fetching booking:", error);
    return NextResponse.json({ error: "Failed to fetch booking" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const existing = await getBooking(id);
    if (!existing || existing.tenant_id !== session.tenantId) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const body = await request.json();
    // Never allow moving a booking to another tenant
    delete body.tenant_id;
    delete body.id;

    // Handle cancellation specifically
    if (body.status === "cancelled") {
      const booking = await cancelBooking(id, body.cancellation_reason);
      return NextResponse.json(booking);
    }

    // Handle confirmation
    if (body.status === "confirmed") {
      body.confirmed_at = new Date().toISOString();
    }

    const booking = await updateBooking(id, body);
    return NextResponse.json(booking);
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[API] Error updating booking:", error);
    return NextResponse.json({ error: "Failed to update booking" }, { status: 500 });
  }
}
