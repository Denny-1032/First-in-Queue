"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Smartphone, ArrowRight, AlertCircle } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { PLANS } from "@/lib/lipila/plans";

function TrialPaymentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const planId = searchParams.get("plan") || "basic";
  const billingParam = searchParams.get("billing") || "monthly";

  const [loading, setLoading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const plan = PLANS.find((p) => p.id === planId) || PLANS[0];
  const isYearly = billingParam === "yearly";
  const priceLabel = isYearly ? plan.yearlyMonthlyLabel : plan.priceLabel;
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
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId) return;

    setLoading(true);
    setError("");

    try {
      const payload = {
        tenantId,
        planId: plan.id,
        billingInterval: billingParam as "monthly" | "yearly",
        paymentMethod: "mobile_money",
        phoneNumber,
        email,
      };

      const res = await fetch("/api/payments/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Payment initiation failed");
      }

      // Mobile money flow
      toast("Payment initiated! Complete the payment on your phone.", "success");
      router.push("/dashboard/settings?payment=pending");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed");
      toast(err instanceof Error ? err.message : "Payment failed", "error");
    } finally {
      setLoading(false);
    }
  };

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
            30-day money-back guarantee — full refund if not satisfied
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Payment Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Plan Summary */}
              <div className="rounded-lg bg-gray-50 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900">{plan.name} Plan</span>
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">30-day guarantee</Badge>
                </div>
                <div className="text-sm text-gray-500 space-y-1">
                  <div>• {plan.messagesLabel} + {plan.voiceMinutesLabel}</div>
                  <div>• {periodLabel} (charged immediately)</div>
                  <div>• Full refund available within 30 days</div>
                </div>
              </div>

              {/* Payment Method - Mobile Money Only */}
              <div className="flex items-center gap-3 p-3 border border-emerald-500 bg-emerald-50 rounded-lg">
                <Smartphone className="h-5 w-5 text-emerald-600" />
                <div>
                  <span className="text-sm font-medium text-gray-900">Mobile Money</span>
                  <p className="text-xs text-gray-500">Pay with Airtel, MTN, or Zamtel</p>
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                />
              </div>

              {/* Mobile Money Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mobile Money Number
                </label>
                <Input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="097 123 4567"
                  required
                />
                <p className="text-xs text-gray-400 mt-1">Airtel, MTN, or Zamtel number</p>
              </div>

              {/* Error Display */}
              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full gap-2"
              >
                {loading ? (
                  "Processing..."
                ) : (
                  <>
                    Continue
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>

              <p className="text-xs text-gray-500 text-center">
                By continuing, you agree to our Terms of Service and Privacy Policy.
                Not satisfied? Contact us within 30 days for a full refund.
              </p>
            </form>
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
