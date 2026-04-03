// =============================================
// Lenco Payment Gateway Client
// Docs: https://lenco-api.readme.io/v2.0/reference/introduction
// =============================================

import crypto from "crypto";

const LENCO_ENVIRONMENT = (process.env.LENCO_ENVIRONMENT || "sandbox").toLowerCase();
const LENCO_API_URL =
  LENCO_ENVIRONMENT === "production"
    ? "https://api.lenco.co/access/v2"
    : "https://sandbox.lenco.co/access/v2";

const LENCO_SECRET_KEY = process.env.LENCO_SECRET_KEY || "";
const LENCO_PUBLIC_KEY = process.env.NEXT_PUBLIC_LENCO_PUBLIC_KEY || "";

// Widget script URL (for frontend)
export const LENCO_WIDGET_URL =
  LENCO_ENVIRONMENT === "production"
    ? "https://pay.lenco.co/js/v1/inline.js"
    : "https://pay.sandbox.lenco.co/js/v1/inline.js";

export interface LencoWidgetConfig {
  key: string;
  reference: string;
  email: string;
  amount: number;
  currency: "ZMW" | "USD";
  channels: ("card" | "mobile-money")[];
  customer: {
    firstName: string;
    lastName: string;
    phone: string;
  };
  metadata?: Record<string, string>;
}

export interface LencoCollectionStatus {
  id: string;
  initiatedAt: string;
  completedAt: string | null;
  amount: string;
  fee: string | null;
  bearer: "merchant" | "customer";
  currency: string;
  reference: string;
  lencoReference: string;
  type: "card" | "mobile-money" | "bank-account" | null;
  status: "pending" | "successful" | "failed" | "pay-offline";
  source: "banking-app" | "api";
  reasonForFailure: string | null;
  settlementStatus: "pending" | "settled" | null;
  settlement: {
    id: string;
    amountSettled: string;
    currency: string;
    createdAt: string;
    settledAt: string | null;
    status: "pending" | "settled";
    type: "instant" | "next-day";
    accountId: string;
  } | null;
  mobileMoneyDetails: {
    country: string;
    phone: string;
    operator: string;
    accountName: string | null;
    operatorTransactionId: string | null;
  } | null;
  bankAccountDetails: null;
  cardDetails: null;
}

export interface LencoWebhookPayload {
  event: "collection.successful" | "collection.failed" | "collection.settled";
  data: LencoCollectionStatus;
}

/**
 * Get widget configuration for frontend
 */
export function getWidgetConfig(config: Omit<LencoWidgetConfig, "key">): LencoWidgetConfig {
  if (!LENCO_PUBLIC_KEY) {
    throw new Error("LENCO_PUBLIC_KEY environment variable is required");
  }

  return {
    key: LENCO_PUBLIC_KEY,
    ...config,
  };
}

/**
 * Verify payment status by reference
 */
export async function verifyPayment(reference: string): Promise<LencoCollectionStatus> {
  if (!LENCO_SECRET_KEY) {
    throw new Error("LENCO_SECRET_KEY environment variable is required");
  }

  const res = await fetch(`${LENCO_API_URL}/collections/status/${reference}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${LENCO_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "Unknown error");
    throw new Error(`Lenco payment verification failed (${res.status}): ${errText}`);
  }

  const data = await res.json();
  
  if (!data.status) {
    throw new Error("Invalid response from Lenco API");
  }

  return data.data;
}

/**
 * Generate webhook hash key for signature verification
 */
export function getWebhookHashKey(): string {
  if (!LENCO_SECRET_KEY) {
    throw new Error("LENCO_SECRET_KEY environment variable is required");
  }
  return crypto.createHash("sha256").update(LENCO_SECRET_KEY).digest("hex");
}

/**
 * Verify Lenco webhook signature
 */
export function verifyWebhookSignature(payload: string, signature: string): boolean {
  try {
    const webhookHashKey = getWebhookHashKey();
    const expectedSignature = crypto
      .createHmac("sha512", webhookHashKey)
      .update(payload)
      .digest("hex");
    
    return crypto.timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expectedSignature, "hex")
    );
  } catch (error) {
    console.error("[Lenco] Webhook signature verification failed:", error);
    return false;
  }
}

/**
 * Generate a unique reference for Lenco transactions
 */
export function generateLencoReference(): string {
  return `ref-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
