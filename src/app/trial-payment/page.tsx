"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Loader2 } from "lucide-react";
import { CheckoutFlow } from "@/components/dashboard/checkout-flow";
import { PLANS } from "@/lib/lipila/plans";

function TrialPaymentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const planId = searchParams.get("plan") || "pro";
  const billingParam = searchParams.get("billing") || "monthly";

  const [tenantId, setTenantId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [loadingTenant, setLoadingTenant] = useState(true);

  const plan = PLANS.find((p) => p.id === planId) || PLANS[0];
  const isYearly = billingParam === "yearly";
  const periodLabel = isYearly ? `${plan.yearlyPriceLabel}/year` : `${plan.priceLabel}/month`;

  useEffect(() => {
    fetch("/api/tenants")
      .then((r) => r.json())
      .then((d) => {
        const list = Array.isArray(d) ? d : d.tenants || [];
        if (list[0]) {
          setTenantId(list[0].id);
          setEmail(list[0].config?.business_email || "");
        }
      })
      .catch(() => {
        /* the flow stays hidden and the notice below explains why */
      })
      .finally(() => setLoadingTenant(false));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 mb-4">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Upgrade to {plan.name}</h1>
          <p className="text-gray-500">
            Complete payment to activate your {plan.name} plan immediately.
          </p>
          <p className="text-sm text-emerald-600 mt-2 font-medium">
            30-day money-back guarantee - full refund if not satisfied
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Payment Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Plan Summary */}
            <div className="rounded-lg bg-gray-50 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-900">{plan.name} Plan</span>
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                  30-day guarantee
                </Badge>
              </div>
              <div className="text-sm text-gray-500 space-y-1">
                <div>• {plan.messagesLabel}</div>
                <div>• {plan.voiceMinutesLabel}</div>
                <div>• {periodLabel} (charged immediately)</div>
                <div>• Full refund available within 30 days</div>
              </div>
            </div>

            {/* Mobile money and card, from the same flow the dashboard uses. */}
            {loadingTenant ? (
              <div className="flex items-center justify-center py-8 text-gray-400">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : tenantId ? (
              <CheckoutFlow
                planId={plan.id}
                tenantId={tenantId}
                billingInterval={isYearly ? "yearly" : "monthly"}
                initialEmail={email}
                onDone={() => router.push("/dashboard")}
              />
            ) : (
              <p className="text-sm text-red-600">
                We couldn&apos;t load your account. Please refresh, or sign in again.
              </p>
            )}

            <p className="text-xs text-gray-500 text-center">
              By continuing, you agree to our Terms of Service and Privacy Policy. Not satisfied?
              Contact us within 30 days for a full refund.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function TrialPaymentPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <TrialPaymentContent />
    </Suspense>
  );
}
