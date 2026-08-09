import { NextRequest } from "next/server";
import { handleLipilaCallback } from "@/lib/lipila/callback-handler";

/**
 * Lipila Webhook Endpoint
 * The wallet-level callback configured in Lipila Dashboard -> Wallets.
 * URL: https://your-domain.com/api/webhooks/lipila
 */
export async function POST(request: NextRequest) {
  return handleLipilaCallback(request, "Webhook");
}
