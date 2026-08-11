import { NextRequest, NextResponse } from "next/server";
import { requireSession, AuthError } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { formatZambianPhone } from "@/lib/lipila/client";

// =============================================
// Saved payment methods for the signed-in tenant.
// ---------------------------------------------
// tenant_id comes from the session, never the body — otherwise any signed-in
// user could read another tenant's payer details.
//
// These rows hold contact details only: no card number, no expiry, no CVV, no
// chargeable token. See migration 023 for why that is the whole story.
// =============================================

const FIELDS =
  "id, method, payment_type, phone_number, email, first_name, last_name, is_default, last_used_at, created_at";

/** The table is added by migration 023; treat "not there yet" as "none saved". */
const MISSING_TABLE = ["42P01", "PGRST205"];

export async function GET() {
  try {
    const session = await requireSession();

    const { data, error } = await getSupabaseAdmin()
      .from("saved_payment_methods")
      .select(FIELDS)
      .eq("tenant_id", session.tenantId)
      .order("is_default", { ascending: false })
      .order("last_used_at", { ascending: false, nullsFirst: false });

    if (error) {
      if (MISSING_TABLE.includes(error.code ?? "")) {
        console.warn("[API/payments/methods] table missing — run migration 023");
        return NextResponse.json({ methods: [] });
      }
      console.error("[API/payments/methods] list failed:", error.message);
      return NextResponse.json({ error: "Failed to load payment methods" }, { status: 500 });
    }

    return NextResponse.json({ methods: data ?? [] });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[API/payments/methods] list error:", error);
    return NextResponse.json({ error: "Failed to load payment methods" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const body = await request.json().catch(() => null);

    const method = body?.method;
    if (method !== "mobile_money" && method !== "card") {
      return NextResponse.json({ error: "Invalid payment method" }, { status: 400 });
    }

    const rawPhone = typeof body?.phoneNumber === "string" ? body.phoneNumber.trim() : "";
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    if (!rawPhone || !email) {
      return NextResponse.json({ error: "Phone number and email are required" }, { status: 400 });
    }

    // Normalise before storing, so "0971234567" and "+260971234567" collapse
    // onto one row instead of two entries for the same wallet.
    const phone_number = formatZambianPhone(rawPhone);
    if (phone_number.length < 11 || phone_number.length > 15) {
      return NextResponse.json({ error: "Enter a valid phone number" }, { status: 400 });
    }

    // The CHECK constraint only accepts Lipila's four names. A card collection
    // is always "Card"; mobile money is whatever Lipila resolved the number to,
    // and null until a collection tells us.
    const VALID_TYPES = ["AirtelMoney", "MtnMoney", "ZamtelKwacha", "Card"];
    const claimed = typeof body?.paymentType === "string" ? body.paymentType : null;
    const payment_type =
      method === "card" ? "Card" : claimed && VALID_TYPES.includes(claimed) ? claimed : null;

    const row = {
      tenant_id: session.tenantId,
      method,
      phone_number,
      email: email.slice(0, 200),
      first_name: typeof body?.firstName === "string" ? body.firstName.trim().slice(0, 80) : null,
      last_name: typeof body?.lastName === "string" ? body.lastName.trim().slice(0, 80) : null,
      payment_type,
      last_used_at: new Date().toISOString(),
    };

    const { data, error } = await getSupabaseAdmin()
      .from("saved_payment_methods")
      .upsert(row, { onConflict: "tenant_id,method,phone_number" })
      .select(FIELDS)
      .single();

    if (error) {
      if (MISSING_TABLE.includes(error.code ?? "")) {
        // Saving is a convenience. A tenant paying on an environment that has
        // not run 023 should still complete their payment.
        console.warn("[API/payments/methods] table missing — run migration 023");
        return NextResponse.json({ method: null, saved: false }, { status: 202 });
      }
      console.error("[API/payments/methods] save failed:", error.message);
      return NextResponse.json({ error: "Failed to save payment method" }, { status: 500 });
    }

    return NextResponse.json({ method: data, saved: true }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[API/payments/methods] save error:", error);
    return NextResponse.json({ error: "Failed to save payment method" }, { status: 500 });
  }
}
