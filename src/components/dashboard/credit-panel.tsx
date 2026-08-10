"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { TopupModal } from "./topup-modal";
import type { TopupPack } from "@/lib/credit/rates";

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
 * Usage credit: the balance, and a way to add to it.
 *
 * The panel deliberately does NOT quote the per-message rates - a customer
 * reading their balance does not need our unit economics, and the top-up modal
 * already states what each amount buys. What stays is the "lasts about N days"
 * line, computed server-side from this tenant's OWN draw-down history. When
 * there is not enough history it says so rather than inventing a number:
 * /why-fiq promises customers this estimate publicly, and a confident wrong
 * figure is worse than an honest blank.
 */
export function CreditPanel({ phoneNumber }: { phoneNumber?: string }) {
  const [credit, setCredit] = useState<CreditState | null>(null);
  const [loading, setLoading] = useState(true);
  const [topupOpen, setTopupOpen] = useState(false);

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

  if (loading) return null;
  if (!credit) return null;

  const empty = credit.balanceNgwee <= 0;
  const haveForecast = credit.daysRemaining !== null && credit.sampleSize >= 3;

  return (
    <>
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
              <p className="text-xs text-gray-500 mt-1">
                {haveForecast
                  ? `At your usage, this lasts about ${credit.daysRemaining} days.`
                  : "Not enough usage yet to estimate how long this lasts."}
              </p>
            </div>
            <span className={cn("text-2xl font-bold", empty ? "text-red-600" : "text-gray-900")}>
              {credit.balanceLabel}
            </span>
          </div>

          {empty && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Your credit is empty. WhatsApp and voice stay quiet past your plan allowance until you
              top up. Your website chat keeps working.
            </p>
          )}

          <Button onClick={() => setTopupOpen(true)} className="w-full sm:w-auto">
            Top up
          </Button>
        </CardContent>
      </Card>

      <TopupModal
        isOpen={topupOpen}
        onClose={() => {
          setTopupOpen(false);
          load();
        }}
        packs={credit.packs}
        defaultPhone={phoneNumber}
        onCredited={load}
      />
    </>
  );
}
