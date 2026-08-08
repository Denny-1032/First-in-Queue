"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { Check, Copy, Mail, Loader2, Code2 } from "lucide-react";
import { WizardShell } from "@/components/onboarding/wizard-shell";
import {
  loadOnboarding,
  getProperty,
  sendInstructions,
  saveOnboarding,
  trackClientEvent,
} from "@/lib/onboarding/client";

// Step 6 (§7). "Your widget is ready!" - the one-line snippet, copy-to-clipboard
// with confirmation, platform tiles, and the send-instructions escape hatch
// (§5) for buyers who can't publish HTML themselves.
const PLATFORMS = [
  { name: "WordPress", note: "Use the First in Queue plugin" },
  { name: "Shopify", note: "Paste in theme.liquid before </body>" },
  { name: "Wix", note: "Add via Custom Code (body end)" },
  { name: "Squarespace", note: "Code Injection → Footer" },
  { name: "Plain HTML", note: "Before </body> on every page" },
];

export default function InstallStep() {
  const router = useRouter();
  const { toast } = useToast();
  const [snippet, setSnippet] = useState("");
  const [ready, setReady] = useState(false);
  const [copied, setCopied] = useState(false);
  const [devEmail, setDevEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [propertyId, setPropertyId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const state = await loadOnboarding();
        if (!state.property_id) {
          router.replace("/onboarding/org");
          return;
        }
        setPropertyId(state.property_id);
        const property = await getProperty(state.property_id);
        const origin = window.location.origin;
        setSnippet(`<script src="${origin}/widget.js" data-key="${property.widget_key}" async></script>`);
      } catch (e) {
        toast(e instanceof Error ? e.message : "Failed to load your widget.", "error");
      } finally {
        setReady(true);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      // Left-hand side of the snippet_copied → widget_installed drop-off (§10).
      trackClientEvent("snippet_copied", propertyId ?? undefined);
      toast("Snippet copied.");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast("Couldn't copy - select and copy manually.", "warning");
    }
  };

  const send = async () => {
    if (!propertyId) return;
    const email = devEmail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast("Enter a valid email address.", "warning");
      return;
    }
    setSending(true);
    try {
      await sendInstructions(propertyId, email);
      toast(`Instructions sent to ${email}.`);
      setDevEmail("");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed to send.", "error");
    } finally {
      setSending(false);
    }
  };

  const goVerify = async () => {
    await saveOnboarding({ onboarding: { step: 7 } }).catch(() => {});
    router.push("/onboarding/verify");
  };

  return (
    <WizardShell
      step={6}
      title="Your widget is ready!"
      subtitle="Add this one line to your site and the chat bubble appears automatically."
      onContinue={goVerify}
      continueLabel="I've added it"
      busy={!ready}
      continueDisabled={!ready}
    >
      {/* Snippet */}
      <div className="rounded-xl border border-gray-200 bg-slate-900 p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
            <Code2 className="h-3.5 w-3.5" /> Paste before &lt;/body&gt;
          </span>
          <button
            type="button"
            onClick={copy}
            disabled={!snippet}
            className="inline-flex items-center gap-1 rounded-md bg-slate-800 px-2 py-1 text-xs font-medium text-slate-200 hover:bg-slate-700 disabled:opacity-50"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <code className="block break-all font-mono text-xs leading-relaxed text-emerald-300">
          {snippet || <span className="text-slate-500">Loading…</span>}
        </code>
      </div>

      {/* Platform tiles */}
      <div className="mt-5">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
          Where are you installing?
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {PLATFORMS.map((p) => (
            <div key={p.name} className="rounded-lg border border-gray-200 p-2.5">
              <p className="text-sm font-medium text-gray-800">{p.name}</p>
              <p className="mt-0.5 text-[11px] leading-tight text-gray-500">{p.note}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Send instructions */}
      <div className="mt-5 rounded-xl bg-gray-50 p-4">
        <p className="flex items-center gap-1.5 text-sm font-medium text-gray-800">
          <Mail className="h-4 w-4" /> Not the one who edits the site?
        </p>
        <p className="mt-0.5 text-xs text-gray-500">Email the snippet + guide to your developer.</p>
        <div className="mt-2.5 flex gap-2">
          <Input
            type="email"
            placeholder="developer@email.com"
            value={devEmail}
            onChange={(e) => setDevEmail(e.target.value)}
            className="h-9 text-sm"
          />
          <Button variant="outline" onClick={send} disabled={sending} className="h-9 shrink-0">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send"}
          </Button>
        </div>
      </div>
    </WizardShell>
  );
}
