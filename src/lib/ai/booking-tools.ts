import type OpenAI from "openai";
import {
  createBooking,
  getBooking,
  getBookings,
  updateBooking,
  cancelBooking,
} from "@/lib/db/operations";
import { getAvailability } from "@/lib/booking/availability";
import type { Booking, BookingSettings, BookingType, OperatingHours } from "@/types";

export interface BookingToolContext {
  tenant_id: string;
  customer_phone: string;
  customer_name?: string;
  conversation_id?: string;
  settings: BookingSettings;
  operating_hours?: OperatingHours;
  /** Channel that created the booking. Defaults to "ai_tool" (WhatsApp/chat). */
  source?: string;
  /** Extra fields merged into booking.details - e.g. { retell_call_id } for voice. */
  details?: Record<string, unknown>;
}

export interface BookingToolResult {
  result: Record<string, unknown>;
  created_booking_id?: string;
}

const VALID_BOOKING_TYPES: BookingType[] = [
  "appointment",
  "reservation",
  "viewing",
  "consultation",
  "tour",
  "callback",
  "service",
  "custom",
];

export const BOOKING_TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "check_availability",
      description: "Get available booking slots for a date. Always call this before proposing or creating a booking.",
      parameters: {
        type: "object",
        properties: {
          date: { type: "string", description: "Date to check, format YYYY-MM-DD" },
        },
        required: ["date"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_booking",
      description: "Create a booking for the customer at a specific date and time. Only call after check_availability confirmed the slot is free and the customer agreed.",
      parameters: {
        type: "object",
        properties: {
          date: { type: "string", description: "YYYY-MM-DD" },
          time: { type: "string", description: "24h HH:MM slot start time from check_availability" },
          customer_name: { type: "string", description: "Customer's name if they provided one" },
          booking_type: { type: "string", enum: VALID_BOOKING_TYPES },
          notes: { type: "string", description: "Anything the business should know" },
        },
        required: ["date", "time"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "find_my_bookings",
      description: "List this customer's upcoming bookings (needed to get a booking_id before rescheduling or cancelling).",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "reschedule_booking",
      description: "Move an existing booking to a new date/time. Get booking_id from find_my_bookings and confirm the new slot with check_availability first.",
      parameters: {
        type: "object",
        properties: {
          booking_id: { type: "string" },
          date: { type: "string", description: "New date YYYY-MM-DD" },
          time: { type: "string", description: "New time HH:MM" },
        },
        required: ["booking_id", "date", "time"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "cancel_booking",
      description: "Cancel an existing booking. Get booking_id from find_my_bookings.",
      parameters: {
        type: "object",
        properties: {
          booking_id: { type: "string" },
          reason: { type: "string" },
        },
        required: ["booking_id"],
      },
    },
  },
];

/** Booking must belong to this tenant AND this customer - the model can pass any id */
async function getOwnedBooking(bookingId: string, ctx: BookingToolContext): Promise<Booking | null> {
  const booking = await getBooking(bookingId);
  if (!booking || booking.tenant_id !== ctx.tenant_id || booking.customer_phone !== ctx.customer_phone) {
    return null;
  }
  return booking;
}

async function slotIsFree(date: string, time: string, ctx: BookingToolContext): Promise<{ ok: boolean; error?: string }> {
  const availability = await getAvailability(ctx.tenant_id, date, ctx.settings, ctx.operating_hours);
  if (!availability.open) {
    return { ok: false, error: `Date ${date} is not bookable (${availability.reason}).` };
  }
  const slot = availability.slots.find((s) => s.time === time);
  if (!slot) {
    return {
      ok: false,
      error: `Slot ${time} on ${date} is not available. Available: ${availability.slots.slice(0, 10).map((s) => s.time).join(", ") || "none"}.`,
    };
  }
  return { ok: true };
}

export async function executeBookingTool(
  name: string,
  args: Record<string, unknown>,
  ctx: BookingToolContext
): Promise<BookingToolResult> {
  try {
    switch (name) {
      case "check_availability": {
        const date = String(args.date || "");
        const availability = await getAvailability(ctx.tenant_id, date, ctx.settings, ctx.operating_hours);
        return {
          result: {
            date: availability.date,
            open: availability.open,
            ...(availability.reason && { reason: availability.reason }),
            slots: availability.slots.slice(0, 20),
          },
        };
      }

      case "create_booking": {
        const date = String(args.date || "");
        const time = String(args.time || "").slice(0, 5);
        const free = await slotIsFree(date, time, ctx);
        if (!free.ok) return { result: { error: free.error } };

        const requestedType = String(args.booking_type || "appointment") as BookingType;
        const booking = await createBooking({
          tenant_id: ctx.tenant_id,
          conversation_id: ctx.conversation_id,
          customer_phone: ctx.customer_phone,
          customer_name: (args.customer_name as string) || ctx.customer_name,
          booking_type: VALID_BOOKING_TYPES.includes(requestedType) ? requestedType : "appointment",
          status: "pending",
          scheduled_date: date,
          scheduled_time: time,
          duration_minutes: ctx.settings.slot_minutes || 30,
          notes: (args.notes as string) || undefined,
          details: { source: ctx.source || "ai_tool", ...(ctx.details || {}) },
        });

        return {
          result: { booking_id: booking.id, date, time, status: "pending" },
          created_booking_id: booking.id,
        };
      }

      case "find_my_bookings": {
        const all = await getBookings(ctx.tenant_id, { customer_phone: ctx.customer_phone }, 20);
        const today = new Date().toISOString().split("T")[0];
        const upcoming = all
          .filter((b) => (b.status === "pending" || b.status === "confirmed") && b.scheduled_date >= today)
          .map((b) => ({
            booking_id: b.id,
            date: b.scheduled_date,
            time: b.scheduled_time || null,
            status: b.status,
            type: b.booking_type,
          }));
        return { result: { bookings: upcoming } };
      }

      case "reschedule_booking": {
        const booking = await getOwnedBooking(String(args.booking_id || ""), ctx);
        if (!booking) return { result: { error: "Booking not found for this customer." } };
        if (booking.status !== "pending" && booking.status !== "confirmed") {
          return { result: { error: `Booking is already ${booking.status} and cannot be rescheduled.` } };
        }
        const date = String(args.date || "");
        const time = String(args.time || "").slice(0, 5);
        const free = await slotIsFree(date, time, ctx);
        if (!free.ok) return { result: { error: free.error } };

        await updateBooking(booking.id, {
          scheduled_date: date,
          scheduled_time: time,
          status: "pending",
          reminder_sent: false,
          details: {
            ...booking.details,
            rescheduled_from: { date: booking.scheduled_date, time: booking.scheduled_time },
          },
        });
        return { result: { booking_id: booking.id, date, time, status: "pending" } };
      }

      case "cancel_booking": {
        const booking = await getOwnedBooking(String(args.booking_id || ""), ctx);
        if (!booking) return { result: { error: "Booking not found for this customer." } };
        if (booking.status === "cancelled") {
          return { result: { error: "Booking is already cancelled." } };
        }
        await cancelBooking(booking.id, (args.reason as string) || "Cancelled by customer via chat");
        return { result: { booking_id: booking.id, status: "cancelled" } };
      }

      default:
        return { result: { error: `Unknown tool: ${name}` } };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Tool execution failed";
    console.error(`[BookingTools] ${name} failed:`, message);
    return { result: { error: message } };
  }
}
