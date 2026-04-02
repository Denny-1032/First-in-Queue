"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, CreditCard, Smartphone, ArrowRight, AlertCircle } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { PLANS } from "@/lib/lipila/plans";

function TrialPaymentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const planId = searchParams.get("plan") || "starter";
  const billingParam = searchParams.get("billing") || "monthly";

  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"mobile_money" | "card">("mobile_money");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
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
        paymentMethod,
        phoneNumber: paymentMethod === "mobile_money" ? phoneNumber : undefined,
        email,
        firstName: paymentMethod === "card" ? firstName : undefined,
        lastName: paymentMethod === "card" ? lastName : undefined,
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

      if (paymentMethod === "card" && data.redirectUrl) {
        window.location.href = data.redirectUrl;
      } else {
        toast("Payment initiated! Complete the payment on your phone.", "success");
        router.push("/dashboard/settings?payment=pending");
      }
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
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Start Your Free Trial</h1>
          <p className="text-gray-500">
            Add payment details to activate your 7-day trial on the {plan.name} plan.
          </p>
          <p className="text-sm text-amber-600 mt-2">
            No charges until trial ends. Cancel anytime.
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
                  <Badge variant="outline">7-day free trial</Badge>
                </div>
                <div className="text-sm text-gray-500 space-y-1">
                  <div>• {plan.messagesLabel} + {plan.voiceMinutesLabel}</div>
                  <div>• K0.00 for 7 days</div>
                  <div>• {periodLabel} after trial</div>
                </div>
              </div>

              {/* Payment Method Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Payment Method
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("mobile_money")}
                    className={`p-3 border rounded-lg flex flex-col items-center gap-2 transition-all ${
                      paymentMethod === "mobile_money"
                        ? "border-emerald-500 bg-emerald-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <Smartphone className="h-5 w-5" />
                    <span className="text-sm font-medium">Mobile Money</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("card")}
                    className={`p-3 border rounded-lg flex flex-col items-center gap-2 transition-all ${
                      paymentMethod === "card"
                        ? "border-emerald-500 bg-emerald-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <CreditCard className="h-5 w-5" />
                    <span className="text-sm font-medium">Card</span>
                  </button>
                </div>
              </div>

              {/* Email - always shown */}
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

              {/* Mobile Money fields */}
              {paymentMethod === "mobile_money" && (
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
              )}

              {/* Card-specific fields */}
              {paymentMethod === "card" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        First Name
                      </label>
                      <Input
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="John"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Last Name
                      </label>
                      <Input
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Doe"
                        required
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-400">Card details will be collected securely on the next page.</p>
                </div>
              )}

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
                    Start Free Trial
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>

              <p className="text-xs text-gray-500 text-center">
                By continuing, you agree to our Terms of Service and Privacy Policy.
                You can cancel anytime before the trial ends to avoid charges.
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
