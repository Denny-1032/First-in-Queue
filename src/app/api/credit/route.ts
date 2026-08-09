import { NextResponse } from "next/server";
import { requireSession, AuthError } from "@/lib/auth/session";
import { getCreditForecast } from "@/lib/credit/credit";
import { TOPUP_PACKS, CREDIT_RATES, formatNgwee } from "@/lib/credit/rates";

/**
 * GET /api/credit
 * Balance, observed burn rate and the packs available to top up with.
 *
 * The forecast is computed from this tenant's OWN draw-down history, never from
 * a modelled replies-per-conversation constant - see getCreditForecast.
 */
export async function GET() {
  try {
    const session = await requireSession();
    const forecast = await getCreditForecast(session.tenantId);

    return NextResponse.json({
      balanceNgwee: forecast.balanceNgwee,
      balanceLabel: formatNgwee(forecast.balanceNgwee),
      burnRateNgweePerDay: Math.round(forecast.burnRateNgweePerDay),
      // null when there is not enough history to extrapolate from. The UI must
      // say "not enough usage yet" rather than invent a number.
      daysRemaining: forecast.daysRemaining,
      sampleSize: forecast.sampleSize,
      rates: {
        whatsappReply: formatNgwee(CREDIT_RATES.WHATSAPP_REPLY_NGWEE),
        voiceMinute: formatNgwee(CREDIT_RATES.VOICE_MINUTE_NGWEE),
      },
      packs: TOPUP_PACKS,
    });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[Credit] Error:", error);
    return NextResponse.json({ error: "Failed to load credit" }, { status: 500 });
  }
}
