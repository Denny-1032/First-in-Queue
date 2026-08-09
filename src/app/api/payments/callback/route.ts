import { NextRequest } from "next/server";
import { handleLipilaCallback } from "@/lib/lipila/callback-handler";

/**
 * Lipila Callback Endpoint
 * The URL sent as the per-request `callbackUrl` header on every collection.
 * Set LIPILA_CALLBACK_URL to https://your-domain.com/api/payments/callback
 */
export async function POST(request: NextRequest) {
  return handleLipilaCallback(request, "Callback");
}
