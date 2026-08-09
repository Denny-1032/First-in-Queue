"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

interface TopupPack {
  id: string;
  ngwee: number;
  label: string;
  description: string;
}

interface CreditState {
  balanceNgwee: number;
  balanceLabel: string;
  burnRateNgweePerDay: number;
  daysRemaining: number | null;
  sampleSize: number;
  rates: { whatsappReply: string; voiceMinute: string };
  packs: TopupPack[];
}

/**
 * Usage credit: balance, what it is being spent on, and how long it lasts.
 *
 * The "lasts about N days" line is computed server-side from this tenant's own
 * draw-down history. When there is not enough history it says so rather than
 * inventing a number - /why-fiq promises customers this estimate publicly, and
 * a confident wrong figure is worse than an honest blank.
 */
export function CreditPanel({ phoneNumber }: { phoneNumber?: string }) {
  const [credit, setCredit] = useState<CreditState | null>(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function load() {
    try {
      const res = await fetch("/api/credit");
      if (res.ok) setCredit(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function topUp(pack: TopupPack) {
    const phone = phoneNumber || window.prompt("Mobile money number to charge (e.g. 0971234567)");
    if (!phone) return;

    setBuying(pack.id);
    setNotice(null);
    try {
      const res = await fetch("/api/credit/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId: pack.id, phoneNumber: phone }),
      });
      const data = await res.json();
      setNotice(
        res.ok
          ? data.message || "Check your phone for the payment prompt."
          : data.error || "Could not start the top-up."
      );
    } catch {
      setNotice("Could not start the top-up.");
    } finally {
      setBuying(null);
    }
  }

  if (loading) return null;
  if (!credit) return null;

  const empty = credit.balanceNgwee <= 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-emerald-600" />
          <CardTitle>Usage Credit</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end justify-between py-3 border-b border-gray-100">
          <div>
            <p className="text-sm font-medium text-gray-700">Balance</p>
            <p className="text-xs text-gray-500">
              Pays for WhatsApp and voice past your plan allowance. Web chat is never charged.
            </p>
          </div>
          <span className={cn("text-2xl font-bold", empty ? "text-red-600" : "text-gray-900")}>
            {credit.balanceLabel}
          </span>
        </div>

        <div className="flex items-center justify-between py-3 border-b border-gray-100">
          <div>
            <p className="text-sm font-medium text-gray-700">At your current rate</p>
            <p className="text-xs text-gray-500">
              {credit.rates.whatsappReply} per WhatsApp message &middot; {credit.rates.voiceMinute} per voice minute
            </p>
          </div>
          <span className="text-sm font-semibold text-gray-900">
            {credit.daysRemaining !== null && credit.sampleSize >= 3
              ? `about ${credit.daysRemaining} days left`
              : "not enough usage yet"}
          </span>
        </div>

        {empty && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Your credit is empty. WhatsApp and voice stay quiet past your plan allowance until you top up.
            Your website chat keeps working.
          </p>
        )}

        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Top up</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {credit.packs.map((pack) => (
              <Button
                key={pack.id}
                variant="outline"
                className="h-auto flex-col items-start gap-1 py-3"
                disabled={buying !== null}
                onClick={() => topUp(pack)}
                title={pack.description}
              >
                <span className="text-base font-semibold text-gray-900">{pack.label}</span>
                <span className="text-[10px] leading-tight text-gray-500 text-left whitespace-normal">
                  {buying === pack.id ? "Starting..." : pack.description}
                </span>
              </Button>
            ))}
          </div>
        </div>

        {notice && <p className="text-xs text-gray-600">{notice}</p>}
      </CardContent>
    </Card>
  );
}
