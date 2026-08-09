"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Star } from "lucide-react";
import { SELLABLE_PLANS } from "@/lib/lipila/plans";

export function PricingPlans() {
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  const searchParams = useSearchParams();
  const fromSettings = searchParams.get("from") === "settings";
  const isYearly = billing === "yearly";

  return (
    <>
      {/* Billing toggle */}
      <div className="flex items-center justify-center gap-3 mt-8">
        <span className={`text-sm font-medium ${!isYearly ? "text-gray-900" : "text-gray-400"}`}>Monthly</span>
        <button
          onClick={() => setBilling(isYearly ? "monthly" : "yearly")}
          className={`relative w-14 h-7 rounded-full transition-colors ${isYearly ? "bg-emerald-500" : "bg-gray-200"}`}
        >
          <div className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${isYearly ? "translate-x-7" : "translate-x-0.5"}`} />
        </button>
        <span className={`text-sm font-medium ${isYearly ? "text-gray-900" : "text-gray-400"}`}>
          Yearly
        </span>
        {isYearly && (
          <span className="text-xs font-bold text-emerald-700 bg-emerald-100 rounded-full px-2.5 py-0.5">
            2 months free
          </span>
        )}
      </div>

      {/* Plans - centered grid for 3 cards */}
      <section className="py-12 px-6">
        <div className="flex justify-center">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl">
            {SELLABLE_PLANS.map((plan) => (
              <div
                key={plan.id}
                className={`rounded-2xl border-2 p-7 flex flex-col ${
                  plan.highlight
                    ? "border-emerald-500 bg-white shadow-xl shadow-emerald-500/10 relative"
                    : "border-gray-200 bg-white"
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-1 text-xs font-semibold text-white whitespace-nowrap">
                      <Star className="h-3 w-3" />
                      {plan.badge}
                    </span>
                  </div>
                )}
                <div className="text-center mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
                  <div className="mt-3">
                    {plan.id === "institution" ? (
                      <span className="text-3xl font-bold text-gray-900">Custom</span>
                    ) : plan.priceZMW === 0 ? (
                      <span className="text-3xl font-bold text-gray-900">Free</span>
                    ) : isYearly ? (
                      <>
                        <span className="text-3xl font-bold text-gray-900">{plan.yearlyMonthlyLabel}</span>
                        <span className="text-gray-500">/mo</span>
                        <p className="text-xs text-emerald-600 font-medium mt-1">
                          {plan.yearlyPriceLabel}/year &middot; 2 months free
                        </p>
                      </>
                    ) : (
                      <>
                        <span className="text-3xl font-bold text-gray-900">{plan.priceLabel}</span>
                        <span className="text-gray-500">/mo</span>
                      </>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-3 font-medium">
                    {plan.id === "free" && "For businesses starting out with chat on their website"}
                    {plan.id === "pro" && "For businesses using WhatsApp, voice and automated actions"}
                    {plan.id === "institution" && "For organisations needing SLA, SSO and data residency"}
                  </p>
                  {plan.id === "free" && (
                    <p className="text-xs text-gray-500 mt-2 italic">&quot;No card, no trial clock. It stays free.&quot;</p>
                  )}
                </div>
                <ul className="space-y-2.5 mb-8 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href={
                    plan.id === "institution"
                      ? "/contact"
                      : plan.priceZMW === 0
                        ? "/signup"
                        : fromSettings
                          ? `/trial-payment?plan=${plan.id}&billing=${billing}`
                          : "/signup"
                  }
                  className={`block w-full text-center rounded-xl py-3 text-sm font-semibold transition-all ${
                    plan.highlight
                      ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700 shadow-lg shadow-emerald-500/25"
                      : "border-2 border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {fromSettings && plan.id !== "institution" ? "Choose Plan" : plan.cta}
                </Link>
                {plan.id === "pro" && (
                  <>
                    <p className="text-xs text-gray-500 text-center mt-3">
                      WhatsApp and voice are paid from prepaid usage credit
                    </p>
                    <p className="text-xs text-emerald-600 text-center mt-1 font-medium">
                      30-day money-back guarantee
                    </p>
                  </>
                )}
                {plan.id === "free" && (
                  <p className="text-xs text-gray-500 text-center mt-3">
                    Website chat only. Add WhatsApp and voice with Pro.
                  </p>
                )}
                {plan.id === "institution" && (
                  <p className="text-xs text-gray-500 text-center mt-3 italic">
                    Higher allowances and overage rates agreed in your contract
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
