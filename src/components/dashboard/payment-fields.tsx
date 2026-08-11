"use client";

import { Smartphone, CreditCard, ShieldCheck, Trash2, Plus, Loader2 } from "lucide-react";

// Shared payment chrome. Every surface that takes money - plan checkout, the
// trial upgrade page, credit top-ups - uses these, so a customer sees the same
// two options and the same fields wherever they pay.

export type PaymentMethod = "mobile_money" | "card";

export interface PayerDetails {
  phoneNumber: string;
  email: string;
  firstName: string;
  lastName: string;
}

export const emptyPayer: PayerDetails = {
  phoneNumber: "",
  email: "",
  firstName: "",
  lastName: "",
};

/**
 * Lipila keys a card collection off the payer's contact details, not the card
 * number - the card itself is only ever entered on Lipila's own checkout. That
 * is why a card payment still needs a phone number here, and why it needs a
 * name when mobile money does not.
 */
export function payerComplete(method: PaymentMethod, d: PayerDetails): boolean {
  if (!d.email.trim() || !d.phoneNumber.trim()) return false;
  if (method === "card" && (!d.firstName.trim() || !d.lastName.trim())) return false;
  return true;
}

const INPUT =
  "w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none";

/**
 * A payer profile the tenant asked us to remember. Contact details only - see
 * migration 023 for why there is no card number, token or expiry in here.
 */
export interface SavedPaymentMethod {
  id: string;
  method: PaymentMethod;
  payment_type: string | null;
  phone_number: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  is_default: boolean;
  last_used_at: string | null;
}

/** "AirtelMoney" -> "Airtel Money". Falls back to the generic method name. */
function methodLabel(m: SavedPaymentMethod): string {
  if (m.method === "card") return "Visa / Mastercard";
  switch (m.payment_type) {
    case "AirtelMoney":
      return "Airtel Money";
    case "MtnMoney":
      return "MTN Money";
    case "ZamtelKwacha":
      return "Zamtel Kwacha";
    default:
      return "Mobile Money";
  }
}

/** 260971234567 -> 0971 234 567, which is how a Zambian reads their own number. */
export function prettyPhone(stored: string): string {
  const local = stored.replace(/^260/, "0");
  return local.length === 10 ? `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}` : local;
}

export function payerFromSaved(m: SavedPaymentMethod): PayerDetails {
  return {
    phoneNumber: m.phone_number,
    email: m.email,
    firstName: m.first_name || "",
    lastName: m.last_name || "",
  };
}

export function SavedMethodPicker({
  methods,
  onUse,
  onRemove,
  onAddNew,
  removingId,
}: {
  methods: SavedPaymentMethod[];
  onUse: (m: SavedPaymentMethod) => void;
  onRemove: (m: SavedPaymentMethod) => void;
  onAddNew: () => void;
  removingId?: string | null;
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">Pay with details you&apos;ve used before:</p>

      {methods.map((m) => (
        <div
          key={m.id}
          className="flex items-center gap-3 rounded-xl border-2 border-gray-200 p-3 transition-all hover:border-emerald-400 hover:bg-emerald-50/50"
        >
          <button
            type="button"
            onClick={() => onUse(m)}
            className="flex flex-1 items-center gap-3 text-left"
          >
            <span
              className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                m.method === "card" ? "bg-blue-100" : "bg-green-100"
              }`}
            >
              {m.method === "card" ? (
                <CreditCard className="h-5 w-5 text-blue-600" />
              ) : (
                <Smartphone className="h-5 w-5 text-green-600" />
              )}
            </span>
            <span className="min-w-0">
              <span className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-900">{methodLabel(m)}</span>
                {m.is_default && (
                  <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                    Default
                  </span>
                )}
              </span>
              <span className="block truncate text-xs text-gray-500">
                {prettyPhone(m.phone_number)} · {m.email}
              </span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => onRemove(m)}
            disabled={removingId === m.id}
            aria-label="Remove saved details"
            className="shrink-0 rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
          >
            {removingId === m.id ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={onAddNew}
        className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 p-3 text-sm font-medium text-gray-600 transition-all hover:border-emerald-400 hover:text-emerald-700"
      >
        <Plus className="h-4 w-4" />
        Use a different method
      </button>
    </div>
  );
}

export function PaymentMethodPicker({
  onSelect,
  prompt = "Choose your payment method:",
}: {
  onSelect: (method: PaymentMethod) => void;
  prompt?: string;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600 mb-4">{prompt}</p>

      <button
        type="button"
        onClick={() => onSelect("mobile_money")}
        className="w-full flex items-center gap-4 rounded-xl border-2 border-gray-200 p-4 hover:border-emerald-400 hover:bg-emerald-50/50 transition-all text-left"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100">
          <Smartphone className="h-6 w-6 text-green-600" />
        </div>
        <div>
          <p className="font-semibold text-gray-900">Mobile Money</p>
          <p className="text-xs text-gray-500">Airtel Money, MTN Money, or Zamtel Kwacha</p>
        </div>
      </button>

      <button
        type="button"
        onClick={() => onSelect("card")}
        className="w-full flex items-center gap-4 rounded-xl border-2 border-gray-200 p-4 hover:border-emerald-400 hover:bg-emerald-50/50 transition-all text-left"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100">
          <CreditCard className="h-6 w-6 text-blue-600" />
        </div>
        <div>
          <p className="font-semibold text-gray-900">Visa / Mastercard</p>
          <p className="text-xs text-gray-500">Pay with debit or credit card</p>
        </div>
      </button>
    </div>
  );
}

export function PayerFields({
  method,
  value,
  onChange,
}: {
  method: PaymentMethod;
  value: PayerDetails;
  onChange: (next: PayerDetails) => void;
}) {
  const set = (field: keyof PayerDetails) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...value, [field]: e.target.value });

  return (
    <>
      {method === "card" && (
        <div className="flex items-start gap-2.5 rounded-xl bg-blue-50 p-3 text-xs text-blue-900">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
          <p>
            These details are for your receipt. Your card number and CVV are entered on the next
            page, on the bank&apos;s own secure checkout - we never see them and they never reach
            our servers.
          </p>
        </div>
      )}

      {method === "card" && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">First Name</label>
            <input type="text" placeholder="John" value={value.firstName} onChange={set("firstName")} className={INPUT} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Last Name</label>
            <input type="text" placeholder="Doe" value={value.lastName} onChange={set("lastName")} className={INPUT} />
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
        <input type="email" placeholder="you@business.com" value={value.email} onChange={set("email")} className={INPUT} />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number</label>
        <input type="tel" placeholder="e.g. 0971234567" value={value.phoneNumber} onChange={set("phoneNumber")} className={INPUT} />
        <p className="text-xs text-gray-400 mt-1">
          {method === "card"
            ? "Required by our payment provider"
            : "A payment prompt will be sent to this number"}
        </p>
      </div>
    </>
  );
}
