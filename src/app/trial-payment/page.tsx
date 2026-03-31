"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, CreditCard, Smartphone, ArrowRight, AlertCircle } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { PLANS } from "@/lib/lipila/plans";

export default function TrialPaymentPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"mobile_money" | "card">("mobile_money");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    // Get tenant info
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
      // Get starter plan pricing
      const plan = PLANS.find((p) => p.id === "starter");
      if (!plan) throw new Error("Plan not found");

      const payload = {
        tenantId,
        planId: "starter",
        billingInterval: "monthly" as const,
        paymentMethod,
        // For mobile money
        accountNumber: paymentMethod === "mobile_money" ? phoneNumber : undefined,
        email,
        // For card payments
        customerInfo: paymentMethod === "card" ? {
          firstName,
          lastName,
          phoneNumber,
          email,
          city: "Lusaka",
          country: "ZM",
          address: "",
          zip: "",
        } : undefined,
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
        // Redirect to card payment page
        window.location.href = data.redirectUrl;
      } else {
        // Mobile money - show pending status
        toast("Payment initiated! Please complete the payment on your phone.", "success");
        router.push("/dashboard/settings?payment=pending");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed");
      toast(err instanceof Error ? err.message : "Payment failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const plan = PLANS.find((p) => p.id === "starter");

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 mb-4">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Activate Your Free Trial</h1>
          <p className="text-gray-500">
            Add payment details to start your 7-day trial with 3 voice minutes and 10 messages.
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
                  <span className="font-medium text-gray-900">{plan?.name} Plan</span>
                  <Badge variant="outline">7-day trial</Badge>
                </div>
                <div className="text-sm text-gray-500 space-y-1">
                  <div>• 3 voice minutes + 10 messages</div>
                  <div>• K0.00 for 7 days</div>
                  <div>• K499/month after trial</div>
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

              {/* Common Fields */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <Input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="97 123 4567"
                  required
                />
              </div>

              {/* Card-specific fields */}
              {paymentMethod === "card" && (
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
