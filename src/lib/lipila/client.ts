// =============================================
// Lipila Payment Gateway Client
// Docs: https://docs.lipila.dev
// =============================================

const LIPILA_API_URL = process.env.LIPILA_API_URL || "https://api.lipila.dev";
const LIPILA_API_KEY = process.env.LIPILA_API_KEY || "";
const LIPILA_CALLBACK_URL = process.env.LIPILA_CALLBACK_URL || "";

export type LipilaPaymentType = "AirtelMoney" | "MtnMoney" | "ZamtelKwacha" | "Card";

export interface MoMoCollectionRequest {
  referenceId: string;
  amount: number;
  narration: string;
  accountNumber: string; // 260xxxxxxxxx
  currency: "ZMW" | "USD";
  email: string;
}

export interface CardCollectionRequest {
  customerInfo: {
    firstName: string;
    lastName: string;
    phoneNumber: string;
    city: string;
    country: string;
    address: string;
    zip: string;
    email: string;
  };
  collectionRequest: {
    referenceId: string;
    amount: number;
    narration: string;
    accountNumber: string;
    currency: "ZMW" | "USD";
    backUrl: string;
    redirectUrl: string;
  };
}

export interface LipilaCollectionResponse {
  currency: string;
  amount: number;
  accountNumber: string;
  status: "Pending" | "Successful" | "Failed";
  paymentType: LipilaPaymentType;
  ipAddress: string;
  cardRedirectionUrl: string | null;
  createdAt: string;
  referenceId: string;
  identifier: string;
  message?: string;
}

export interface LipilaCallbackPayload {
  referenceId: string;
  currency: string;
  amount: number;
  accountNumber: string;
  status: "Successful" | "Failed";
  paymentType: LipilaPaymentType;
  type: "Collection" | "Disbursement";
  ipAddress: string;
  identifier: string;
  message: string;
  externalId?: string;
}

export interface LipilaStatusResponse {
  referenceId: string;
  currency: string;
  amount: number;
  accountNumber: string;
  status: "Pending" | "Successful" | "Failed";
  paymentType: LipilaPaymentType;
  type: string;
  ipAddress: string;
  identifier: string;
  externalId?: string;
  message: string;
}

function getHeaders(callbackUrl?: string): Record<string, string> {
  const headers: Record<string, string> = {
    accept: "application/json",
    "Content-Type": "application/json",
    "x-api-key": LIPILA_API_KEY,
  };
  if (callbackUrl) {
    headers.callbackUrl = callbackUrl;
  }
  return headers;
}

/**
 * Initiate a Mobile Money collection (Airtel, MTN, Zamtel).
 * Sends a payment prompt to the customer's phone.
 */
export async function collectMobileMoney(
  request: MoMoCollectionRequest
): Promise<LipilaCollectionResponse> {
  const res = await fetch(`${LIPILA_API_URL}/api/v1/collections/mobile-money`, {
    method: "POST",
    headers: getHeaders(LIPILA_CALLBACK_URL),
    body: JSON.stringify(request),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "Unknown error");
    throw new Error(`Lipila MoMo collection failed (${res.status}): ${errText}`);
  }

  return res.json();
}

/**
 * Initiate a Card collection (Visa/Mastercard).
 * Returns a cardRedirectionUrl to redirect the user to enter card details.
 */
export async function collectCard(
  request: CardCollectionRequest
): Promise<LipilaCollectionResponse> {
  const res = await fetch(`${LIPILA_API_URL}/api/v1/collections/card`, {
    method: "POST",
    headers: getHeaders(LIPILA_CALLBACK_URL),
    body: JSON.stringify(request),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "Unknown error");
    throw new Error(`Lipila card collection failed (${res.status}): ${errText}`);
  }

  return res.json();
}

/**
 * Check the status of a collection by its reference ID.
 */
export async function checkCollectionStatus(
  referenceId: string
): Promise<LipilaStatusResponse> {
  const res = await fetch(
    `${LIPILA_API_URL}/api/v1/collections/check-status?referenceId=${encodeURIComponent(referenceId)}`,
    {
      method: "GET",
      headers: {
        accept: "application/json",
        "x-api-key": LIPILA_API_KEY,
      },
    }
  );

  if (!res.ok) {
    const errText = await res.text().catch(() => "Unknown error");
    throw new Error(`Lipila status check failed (${res.status}): ${errText}`);
  }

  return res.json();
}

/**
 * Generate a unique reference ID for Lipila transactions.
 */
export function generateReferenceId(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 12);
}

/**
 * Detect payment type from a Zambian phone number.
 * - 096x / 076x = MTN
 * - 097x / 077x = Airtel
 * - 095x / 075x = Zamtel
 */
export function detectPaymentType(phoneNumber: string): LipilaPaymentType | null {
  const cleaned = phoneNumber.replace(/\D/g, "");
  // Ensure it starts with 260 (Zambia country code)
  const normalized = cleaned.startsWith("260") ? cleaned : `260${cleaned}`;

  const prefix = normalized.slice(3, 6); // Get the 3-digit prefix after country code

  if (["096", "076"].some((p) => prefix.startsWith(p.slice(1)))) return "MtnMoney";
  if (["097", "077"].some((p) => prefix.startsWith(p.slice(1)))) return "AirtelMoney";
  if (["095", "075"].some((p) => prefix.startsWith(p.slice(1)))) return "ZamtelKwacha";

  return null;
}

/**
 * Format a Zambian phone number to the 260xxxxxxxxx format.
 */
export function formatZambianPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("260")) return cleaned;
  if (cleaned.startsWith("0")) return `260${cleaned.slice(1)}`;
  return `260${cleaned}`;
}
