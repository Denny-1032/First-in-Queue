"use client";

import { Smartphone, CreditCard } from "lucide-react";

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
