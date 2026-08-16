import { NextRequest, NextResponse } from "next/server";
import {
  getBookingsNeedingReminders,
  getTenantById,
  updateBooking,
  saveMessage,
} from "@/lib/db/operations";
import { WhatsAppClient } from "@/lib/whatsapp/client";
import { rejectUnauthorizedCron } from "@/lib/api/cron-auth";
import type { Booking, ReminderTemplateConfig, TemplateMessage, Tenant } from "@/types";

// Cron Job: Booking Reminders
// Finds pending/confirmed bookings happening within the next 24 hours that
// haven't been reminded yet, sends the customer a WhatsApp reminder, and
// marks reminder_sent so each booking is only reminded once.
// Vercel cron invokes this via GET with "Authorization: Bearer <CRON_SECRET>".

const REMINDER_HOURS_AHEAD = 24;

function formatBookingDate(booking: Booking): string {
  const date = new Date(`${booking.scheduled_date}T${booking.scheduled_time || "00:00"}`);
  const dateStr = date.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return booking.scheduled_time
    ? `${dateStr} at ${booking.scheduled_time}`
    : dateStr;
}

function buildReminderText(booking: Booking, tenant: Tenant): string {
  const businessName = tenant.config?.business_name || tenant.name;
  const typeLabel = booking.booking_type === "custom" ? "booking" : booking.booking_type;
  // No emoji: this is an appointment time going out unprompted, and it is sent
  // whatever the tenant's emoji setting says. See EMOJI DISCIPLINE in
  // buildSystemPrompt - the same rule the model is held to.
  const lines = [
    `Reminder from ${businessName}`,
    "",
    `Hi${booking.customer_name ? " " + booking.customer_name : ""}! You have a ${typeLabel} scheduled for ${formatBookingDate(booking)}.`,
  ];
  if (booking.location) lines.push(`Location: ${booking.location}`);
  if (booking.notes) lines.push(`Notes: ${booking.notes}`);
  lines.push("", "If you need to reschedule or cancel, just reply to this message.");
  return lines.join("\n");
}

// Fallback for customers outside the 24h service window. The registered Meta
// template must match: body {{1}} name, {{2}} business, {{3}} datetime, plus
// two quick-reply buttons (Confirm, Cancel) - see the settings page hint.
function buildReminderTemplate(booking: Booking, tenant: Tenant, cfg: ReminderTemplateConfig): TemplateMessage {
  return {
    name: cfg.name,
    language: cfg.language || "en",
    components: [
      {
        type: "body",
        parameters: [
          { type: "text", text: booking.customer_name || "there" },
          { type: "text", text: tenant.config?.business_name || tenant.name },
          { type: "text", text: formatBookingDate(booking) },
        ],
      },
      {
        type: "button",
        sub_type: "quick_reply",
        index: "0",
        parameters: [{ type: "payload", payload: `booking_confirm_${booking.id}` }],
      },
      {
        type: "button",
        sub_type: "quick_reply",
        index: "1",
        parameters: [{ type: "payload", payload: `booking_cancel_${booking.id}` }],
      },
    ],
  };
}

// Pull the Meta error object out of an axios failure so details carry the code
function describeSendError(err: unknown): string {
  const axiosData = (err as { response?: { data?: { error?: { code?: number; message?: string } } } })?.response?.data?.error;
  if (axiosData) return `[${axiosData.code}] ${axiosData.message}`;
  return err instanceof Error ? err.message : "Unknown error";
}

async function runReminders() {
  const bookings = await getBookingsNeedingReminders(REMINDER_HOURS_AHEAD);
  const tenantCache = new Map<string, Tenant | null>();
  let sent = 0;
  let failed = 0;

  for (const booking of bookings) {
    let tenant = tenantCache.get(booking.tenant_id);
    if (tenant === undefined) {
      tenant = await getTenantById(booking.tenant_id);
      tenantCache.set(booking.tenant_id, tenant);
    }
    if (!tenant?.whatsapp_access_token || !tenant?.whatsapp_phone_number_id) {
      continue;
    }

    const whatsapp = new WhatsAppClient(
      tenant.whatsapp_access_token,
      tenant.whatsapp_phone_number_id
    );
    const text = buildReminderText(booking, tenant);

    try {
      const waMessageId = await whatsapp.sendText(booking.customer_phone, text);

      if (booking.conversation_id) {
        await saveMessage({
          conversation_id: booking.conversation_id,
          tenant_id: tenant.id,
          direction: "outbound",
          sender_type: "bot",
          message_type: "text",
          content: { text },
          whatsapp_message_id: waMessageId,
          status: "sent",
        });
      }

      await updateBooking(booking.id, {
        reminder_sent: true,
        details: { ...booking.details, reminder_channel: "text", reminder_sent_at: new Date().toISOString() },
      });
      sent++;
      console.log(`[BookingReminders] Text reminder sent for booking ${booking.id}`);
    } catch (textErr) {
      // Usually outside the WhatsApp 24h customer service window (Meta 131047)
      // - retry with the tenant's approved template if one is configured.
      const textError = describeSendError(textErr);
      const tpl = tenant.config?.reminder_template;

      if (tpl?.enabled && tpl.name) {
        try {
          const template = buildReminderTemplate(booking, tenant, tpl);
          const waMessageId = await whatsapp.sendTemplate(booking.customer_phone, template);

          if (booking.conversation_id) {
            await saveMessage({
              conversation_id: booking.conversation_id,
              tenant_id: tenant.id,
              direction: "outbound",
              sender_type: "bot",
              message_type: "template",
              content: { text, template },
              whatsapp_message_id: waMessageId,
              status: "sent",
            });
          }

          await updateBooking(booking.id, {
            reminder_sent: true,
            details: {
              ...booking.details,
              reminder_channel: "template",
              reminder_text_error: textError,
              reminder_sent_at: new Date().toISOString(),
            },
          });
          sent++;
          console.log(`[BookingReminders] Template reminder sent for booking ${booking.id}`);
          continue;
        } catch (tplErr) {
          const templateError = describeSendError(tplErr);
          failed++;
          console.error(`[BookingReminders] Both channels failed for booking ${booking.id}: text=${textError} template=${templateError}`);
          await updateBooking(booking.id, {
            reminder_sent: true,
            details: {
              ...booking.details,
              reminder_error: textError,
              reminder_template_error: templateError,
              reminder_attempted_at: new Date().toISOString(),
            },
          });
          continue;
        }
      }

      // No template configured - record the failure so the cron doesn't
      // retry the same booking forever.
      failed++;
      console.error(`[BookingReminders] Failed for booking ${booking.id}:`, textError);
      await updateBooking(booking.id, {
        reminder_sent: true,
        details: { ...booking.details, reminder_error: textError, reminder_attempted_at: new Date().toISOString() },
      });
    }
  }

  return { checked: bookings.length, sent, failed };
}

// Vercel cron entrypoint (crons always call GET)
export async function GET(request: NextRequest) {
  const rejected = rejectUnauthorizedCron(request, "booking-reminders");
  if (rejected) return rejected;
  try {
    const result = await runReminders();
    return NextResponse.json({ success: true, ...result, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error("[BookingReminders] Cron failed:", error);
    return NextResponse.json({ error: "Cron failed" }, { status: 500 });
  }
}

// Manual trigger
export async function POST(request: NextRequest) {
  return GET(request);
}
