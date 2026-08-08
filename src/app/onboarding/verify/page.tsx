"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { Loader2, CheckCircle2, AlertCircle, Wifi, BookOpen, CalendarClock } from "lucide-react";
import { WizardShell } from "@/components/onboarding/wizard-shell";
import {
  loadOnboarding,
  getInstallStatus,
  getProperty,
  updateProperty,
  saveOnboarding,
  type InstallStatus,
} from "@/lib/onboarding/client";

// Step 7 (§5). Polls install-status every 2s for up to 3 minutes. On success →
// dashboard. On a rejected origin → one-click "add this domain" fix (the
// highest-value support-deflection in the wizard). On timeout → the actual
// diagnosis, never a blank failure.
const POLL_MS = 2000;
const TIMEOUT_MS = 3 * 60 * 1000;

export default function VerifyStep() {
  const router = useRouter();
  const { toast } = useToast();
  const [propertyId, setPropertyId] = useState<string | null>(null);
  const [status, setStatus] = useState<InstallStatus | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const [fixing, setFixing] = useState(false);
  const startedAt = useRef(Date.now());
  const stop = useRef(false);

  const finishDone = useCallback(async () => {
    await saveOnboarding({ onboarding: { step: 7, done: true } }).catch(() => {});
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    (async () => {
      const state = await loadOnboarding().catch(() => null);
      if (!state?.property_id) {
        router.replace("/onboarding/install");
        return;
      }
      setPropertyId(state.property_id);

      const poll = async () => {
        if (stop.current) return;
        try {
          const s = await getInstallStatus(state.property_id);
          if (stop.current) return;
          setStatus(s);
          if (s.status === "verified") {
            stop.current = true;
            await finishDone();
            toast("Widget connected! 🎉");
            router.push("/dashboard");
            return;
          }
        } catch {
          /* transient - keep polling */
        }
        if (Date.now() - startedAt.current > TIMEOUT_MS) {
          setTimedOut(true);
          return;
        }
        timer = setTimeout(poll, POLL_MS);
      };
      poll();
    })();

    return () => {
      stop.current = true;
      clearTimeout(timer);
    };
  }, [router, toast, finishDone]);

  const addDomain = async () => {
    if (!propertyId || status?.status !== "origin_rejected" || !status.origin) return;
    setFixing(true);
    try {
      const property = await getProperty(propertyId);
      const next = Array.from(new Set([...(property.allowed_domains ?? []), status.origin!]));
      await updateProperty(propertyId, { allowed_domains: next });
      toast("Domain added - checking again…");
      setTimedOut(false);
      setStatus({ status: "waiting" });
      startedAt.current = Date.now();
      stop.current = false;
      // resume polling
      const resume = async () => {
        if (stop.current) return;
        const s = await getInstallStatus(propertyId).catch(() => null);
        if (s) {
          setStatus(s);
          if (s.status === "verified") {
            stop.current = true;
            await finishDone();
            router.push("/dashboard");
            return;
          }
        }
        if (Date.now() - startedAt.current > TIMEOUT_MS) return setTimedOut(true);
        setTimeout(resume, POLL_MS);
      };
      resume();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't add the domain.", "error");
    } finally {
      setFixing(false);
    }
  };

  const skip = async () => {
    await finishDone();
    router.push("/dashboard");
  };

  const rejected = status?.status === "origin_rejected";

  return (
    <WizardShell
      step={7}
      title="Verify chat widget connection"
      subtitle="Open your website in another tab - we'll detect the widget automatically."
      onContinue={skip}
      continueLabel="Skip for now"
    >
      {/* Rejected origin - one-click fix takes priority over the generic states */}
      {rejected ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="flex items-start gap-2 text-sm text-amber-800">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              We saw your widget on{" "}
              <strong>{status.origin ?? "an unknown domain"}</strong>, which isn&apos;t on your
              allowed list yet.
            </span>
          </p>
          <Button onClick={addDomain} disabled={fixing} className="mt-3" size="sm">
            {fixing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add this domain & retry"}
          </Button>
        </div>
      ) : timedOut ? (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <p className="flex items-start gap-2 text-sm text-gray-700">
            <Wifi className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
            <span>
              We haven&apos;t seen the widget yet. Double-check the snippet is pasted before{" "}
              <code>&lt;/body&gt;</code> and the page has been loaded once in a browser.
            </span>
          </p>
          <div className="mt-3 flex gap-2">
            <Button variant="outline" size="sm" onClick={() => router.push("/onboarding/install")}>
              Back to install
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setTimedOut(false);
                startedAt.current = Date.now();
                stop.current = false;
                getInstallStatus(propertyId ?? undefined)
                  .then(setStatus)
                  .catch(() => {});
              }}
            >
              Check again
            </Button>
          </div>
        </div>
      ) : status?.status === "verified" ? (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
          <CheckCircle2 className="h-5 w-5" /> Connected! Taking you to your dashboard…
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-4 text-sm text-gray-600">
          <Loader2 className="h-5 w-5 animate-spin text-emerald-500" />
          Waiting for chat widget connection…
        </div>
      )}

      {/* Escape hatches (§5) */}
      <div className="mt-5 flex flex-wrap gap-4 text-sm">
        <Link href="/how-it-works" className="inline-flex items-center gap-1.5 text-emerald-600 hover:underline">
          <BookOpen className="h-4 w-4" /> Read the guide
        </Link>
        <Link href="/contact" className="inline-flex items-center gap-1.5 text-emerald-600 hover:underline">
          <CalendarClock className="h-4 w-4" /> Book a call
        </Link>
      </div>
    </WizardShell>
  );
}
