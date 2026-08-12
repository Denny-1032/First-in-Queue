"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Copy, Globe, KeyRound, Loader2, Palette, Pencil, Phone, Plus, Trash2 } from "lucide-react";
import { useConfirm } from "@/components/ui/dialogs";
import {
  BrandingEditor,
  textColorFor,
  HEX_RE,
  type BrandingValue,
} from "@/components/onboarding/branding-editor";
import { cn } from "@/lib/utils";

// Property management: create, copy the one-line snippet, edit name + allowed
// domains, customize widget branding, rotate the key, delete (§9 block 13).

interface Property {
  id: string;
  name: string;
  widget_key: string;
  site_url: string | null;
  allowed_domains: string[];
  branding: Record<string, unknown>;
  install_status: "pending" | "verified" | "stale";
  last_seen_at: string | null;
}

/** Read the editable subset of a property's branding, with defaults. */
function brandingDraft(p: Property): BrandingValue {
  const b = p.branding || {};
  return {
    primary_color: HEX_RE.test(String(b.primary_color)) ? String(b.primary_color) : "#03A84E",
    title: typeof b.title === "string" ? b.title : "Chat with us",
    welcome_message: typeof b.welcome_message === "string" ? b.welcome_message : "👋 Hi! How can we help?",
    suggested_messages: Array.isArray(b.suggested_messages)
      ? (b.suggested_messages as string[])
      : ["I have a question", "Tell me more"],
  };
}

interface VoiceDraft {
  enabled: boolean;
  /** "" = let the server pick the tenant's first active agent. */
  agentId: string;
}

/** Read the property's voice settings out of branding. */
function voiceDraftOf(p: Property): VoiceDraft {
  const b = p.branding || {};
  return {
    enabled: b.voice_enabled === true,
    agentId: typeof b.voice_agent_id === "string" ? b.voice_agent_id : "",
  };
}

/**
 * The number the widget's WhatsApp button dials. Stored on the property rather
 * than read from the tenant's WhatsApp connection, because what Meta gives us
 * there is a phone_number_id - an internal identifier, not something wa.me can
 * open.
 */
function whatsappDraftOf(p: Property): string {
  const b = p.branding || {};
  return typeof b.whatsapp_number === "string" ? b.whatsapp_number : "";
}

function lastSeenLabel(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return "seen just now";
  if (mins < 60) return `seen ${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `seen ${hrs}h ago`;
  return `seen ${Math.round(hrs / 24)}d ago`;
}

// Phrased as a connection, not an installation: the snippet being pasted in is not
// the thing anyone cares about - whether the widget is talking to us is.
const STATUS_LABEL: Record<Property["install_status"], string> = {
  pending: "Not connected",
  verified: "Connected",
  stale: "Not connected recently",
};

// A status pill rather than the generic Badge: the labels are long enough to wrap
// inside a pill built for one word, and a solid fill shouts at you from the corner
// of every card. Tinted background, hairline ring, and a dot doing the colour work
// - so the eye finds the row that is wrong without the page turning into traffic
// lights. "Connected but gone quiet" is a different problem from "never connected",
// hence amber rather than sharing grey with pending.
const STATUS_STYLE: Record<Property["install_status"], { pill: string; dot: string }> = {
  verified: {
    pill: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    dot: "bg-emerald-500",
  },
  pending: {
    pill: "bg-slate-50 text-slate-600 ring-slate-500/20",
    dot: "bg-slate-300",
  },
  stale: {
    pill: "bg-amber-50 text-amber-700 ring-amber-600/20",
    dot: "bg-amber-500",
  },
};

function StatusPill({ status }: { status: Property["install_status"] }) {
  const style = STATUS_STYLE[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1",
        "text-xs font-medium ring-1 ring-inset",
        style.pill
      )}
    >
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", style.dot)} aria-hidden="true" />
      {STATUS_LABEL[status]}
    </span>
  );
}

function snippetFor(widgetKey: string): string {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  return `<script src="${origin}/widget.js" data-key="${widgetKey}" async></script>`;
}

export default function PropertiesPage() {
  const confirm = useConfirm();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");
  const [name, setName] = useState("");
  const [siteUrl, setSiteUrl] = useState("");

  // Per-property edit draft. null = not editing that property.
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDomains, setEditDomains] = useState("");

  // Per-property branding panel. null = closed.
  const [brandId, setBrandId] = useState<string | null>(null);
  const [brandDraft, setBrandDraft] = useState<BrandingValue | null>(null);
  // Voice lives outside BrandingValue - it is an entitlement, not appearance,
  // and the onboarding wizard (which shares BrandingEditor) has no agents yet.
  const [voiceDraft, setVoiceDraft] = useState<VoiceDraft>({ enabled: false, agentId: "" });
  const [whatsappDraft, setWhatsappDraft] = useState("");
  const [voiceAgents, setVoiceAgents] = useState<Array<{ id: string; name: string }>>([]);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/properties");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load properties");
      setProperties(data.properties || []);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load properties");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    // Voice agents are only needed to label the picker; a failure just leaves
    // the property on "first active agent".
    fetch("/api/voice/agents")
      .then((r) => (r.ok ? r.json() : { agents: [] }))
      .then((d) => setVoiceAgents(d.agents || []))
      .catch(() => {});
  }, [load]);

  const create = async () => {
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, site_url: siteUrl || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create property");
      setProperties((prev) => [...prev, data.property]);
      setName("");
      setSiteUrl("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create property");
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (p: Property) => {
    setEditId(p.id);
    setEditName(p.name);
    setEditDomains(p.allowed_domains.join(", "));
    setError("");
  };

  const saveEdit = async (id: string) => {
    setBusyId(id);
    setError("");
    try {
      const allowed_domains = editDomains
        .split(",")
        .map((d) => d.trim())
        .filter(Boolean);
      const res = await fetch(`/api/properties/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName, allowed_domains }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save changes");
      setProperties((prev) => prev.map((p) => (p.id === id ? data.property : p)));
      setEditId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save changes");
    } finally {
      setBusyId(null);
    }
  };

  const openBranding = (p: Property) => {
    setBrandId(p.id);
    setBrandDraft(brandingDraft(p));
    setVoiceDraft(voiceDraftOf(p));
    setWhatsappDraft(whatsappDraftOf(p));
    setError("");
  };

  const saveBranding = async (id: string) => {
    if (!brandDraft) return;
    if (!HEX_RE.test(brandDraft.primary_color)) {
      setError("Enter a valid hex colour, e.g. #03A84E");
      return;
    }
    const whatsappDigits = whatsappDraft.replace(/\D/g, "");
    if (whatsappDraft.trim() && (whatsappDigits.length < 8 || whatsappDigits.length > 15)) {
      setError("Enter the WhatsApp number in full international form, e.g. 260971234567");
      return;
    }
    setBusyId(id);
    setError("");
    try {
      const res = await fetch(`/api/properties/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branding: {
            primary_color: brandDraft.primary_color,
            text_color: textColorFor(brandDraft.primary_color),
            title: brandDraft.title,
            welcome_message: brandDraft.welcome_message,
            suggested_messages: brandDraft.suggested_messages,
            voice_enabled: voiceDraft.enabled,
            voice_agent_id: voiceDraft.agentId || null,
            whatsapp_number: whatsappDigits || null,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save branding");
      setProperties((prev) => prev.map((p) => (p.id === id ? data.property : p)));
      setBrandId(null);
      setBrandDraft(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save branding");
    } finally {
      setBusyId(null);
    }
  };

  const rotate = async (id: string) => {
    const ok = await confirm({
      title: "Rotate this widget key?",
      description:
        "The snippet on your website must be updated within the hour, or the chat widget will stop loading for visitors.",
      confirmLabel: "Rotate key",
      tone: "warning",
    });
    if (!ok) return;
    setBusyId(id);
    setError("");
    try {
      const res = await fetch(`/api/properties/${id}/rotate-key`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to rotate key");
      setProperties((prev) =>
        prev.map((p) => (p.id === id ? { ...p, widget_key: data.property.widget_key } : p))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to rotate key");
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (id: string, propName: string) => {
    const ok = await confirm({
      title: `Delete "${propName}"?`,
      description: "The widget stops working on that site immediately. This cannot be undone.",
      confirmLabel: "Delete website",
      tone: "danger",
    });
    if (!ok) return;
    setBusyId(id);
    setError("");
    try {
      const res = await fetch(`/api/properties/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete property");
      setProperties((prev) => prev.filter((p) => p.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete property");
    } finally {
      setBusyId(null);
    }
  };

  const copy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(""), 2000);
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 flex justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Website widget</h1>
          <p className="text-gray-600">
            A <strong>property</strong> is one website you install the chat widget on. Each has its
            own key and its own allowed domains.
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Add a website</CardTitle>
            <CardDescription>
              We use the address to allow your domain automatically - the widget refuses to run
              anywhere else.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={name}
                  placeholder="Acme Ltd"
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="site">Website address</Label>
                <Input
                  id="site"
                  value={siteUrl}
                  placeholder="https://acme.co.zm"
                  onChange={(e) => setSiteUrl(e.target.value)}
                />
              </div>
            </div>
            <Button onClick={create} disabled={creating || !name.trim()}>
              {creating ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Create property
            </Button>
          </CardContent>
        </Card>

        {properties.length === 0 ? (
          <Alert>
            <Globe className="h-4 w-4" />
            <AlertDescription>
              No websites yet. Add one above to get your install snippet.
            </AlertDescription>
          </Alert>
        ) : (
          properties.map((p) => {
            const editing = editId === p.id;
            const busy = busyId === p.id;
            return (
              <Card key={p.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      {editing ? (
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="max-w-xs"
                        />
                      ) : (
                        <CardTitle>{p.name}</CardTitle>
                      )}
                      <CardDescription>{p.site_url || "No address set"}</CardDescription>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <StatusPill status={p.install_status} />
                      {lastSeenLabel(p.last_seen_at) && (
                        <span className="text-[11px] text-gray-400">{lastSeenLabel(p.last_seen_at)}</span>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Install snippet</Label>
                    <p className="text-xs text-gray-500">
                      Paste this into your site&apos;s HTML, on every page. Anywhere works -
                      the &lt;head&gt; or the footer.
                    </p>
                    <div className="relative">
                      <pre className="bg-gray-100 p-4 pr-24 rounded-lg text-xs overflow-x-auto">
                        {snippetFor(p.widget_key)}
                      </pre>
                      <Button
                        size="sm"
                        variant="outline"
                        className="absolute top-2 right-2"
                        onClick={() => copy(snippetFor(p.widget_key), p.id)}
                      >
                        {copied === p.id ? "Copied!" : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`domains-${p.id}`}>Allowed domains</Label>
                    {editing ? (
                      <>
                        <Input
                          id={`domains-${p.id}`}
                          value={editDomains}
                          placeholder="acme.co.zm, www.acme.co.zm"
                          onChange={(e) => setEditDomains(e.target.value)}
                        />
                        <p className="text-xs text-gray-500">
                          Comma-separated. Empty means the widget refuses every domain.
                        </p>
                      </>
                    ) : (
                      <p className="text-xs text-gray-500">
                        {p.allowed_domains.length ? (
                          p.allowed_domains.join(", ")
                        ) : (
                          <span className="text-amber-600">
                            none - the widget will refuse every domain until one is added
                          </span>
                        )}
                      </p>
                    )}
                  </div>

                  {brandId === p.id && brandDraft && (
                    <div className="space-y-4 rounded-lg border border-gray-100 bg-gray-50/60 p-4">
                      <Label>Widget appearance</Label>
                      <BrandingEditor value={brandDraft} onChange={setBrandDraft} />

                      <div className="space-y-2 border-t border-gray-200 pt-4">
                        <label className="flex items-start gap-2 text-sm">
                          <input
                            type="checkbox"
                            className="mt-0.5 h-4 w-4 accent-emerald-600"
                            checked={voiceDraft.enabled}
                            onChange={(e) =>
                              setVoiceDraft({ ...voiceDraft, enabled: e.target.checked })
                            }
                          />
                          <span>
                            <span className="flex items-center gap-1.5 font-medium text-gray-900">
                              <Phone className="h-3.5 w-3.5 text-gray-400" />
                              Let visitors talk to the AI from the widget
                            </span>
                            <span className="block text-xs text-gray-500">
                              Adds a call button to the chat header. Uses your plan&apos;s voice
                              minutes - the button hides automatically when they run out, and on
                              the free plan.
                            </span>
                          </span>
                        </label>

                        {voiceDraft.enabled && (
                          <div className="pl-6 space-y-1.5">
                            <Label htmlFor={`voice-agent-${p.id}`} className="text-xs">
                              Voice agent
                            </Label>
                            <select
                              id={`voice-agent-${p.id}`}
                              value={voiceDraft.agentId}
                              onChange={(e) =>
                                setVoiceDraft({ ...voiceDraft, agentId: e.target.value })
                              }
                              className="h-9 w-full rounded-md border border-gray-200 bg-white px-2 text-sm"
                            >
                              <option value="">First active agent</option>
                              {voiceAgents.map((a) => (
                                <option key={a.id} value={a.id}>
                                  {a.name}
                                </option>
                              ))}
                            </select>
                            {voiceAgents.length === 0 && (
                              <p className="text-xs text-amber-600">
                                No voice agent yet - create one under Voice Agent first, or the
                                call button stays hidden.
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="space-y-1.5 border-t border-gray-200 pt-4">
                        <Label htmlFor={`wa-number-${p.id}`} className="text-sm">
                          WhatsApp number
                        </Label>
                        <input
                          id={`wa-number-${p.id}`}
                          type="tel"
                          inputMode="tel"
                          value={whatsappDraft}
                          onChange={(e) => setWhatsappDraft(e.target.value)}
                          placeholder="260971234567"
                          className="h-9 w-full rounded-md border border-gray-200 bg-white px-2 text-sm"
                        />
                        <p className="text-xs text-gray-500">
                          Adds a WhatsApp button to the chat header, so a visitor can carry on the
                          conversation on their phone. Full international number, no plus sign.
                          Leave empty to hide it.
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => saveBranding(p.id)} disabled={busy}>
                          {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                          Save branding
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setBrandId(null);
                            setBrandDraft(null);
                          }}
                          disabled={busy}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 pt-1">
                    {editing ? (
                      <>
                        <Button size="sm" onClick={() => saveEdit(p.id)} disabled={busy}>
                          {busy ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : null}
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditId(null)}
                          disabled={busy}
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button size="sm" variant="outline" onClick={() => startEdit(p)}>
                          <Pencil className="w-4 h-4 mr-2" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openBranding(p)}
                          disabled={busy}
                        >
                          <Palette className="w-4 h-4 mr-2" />
                          Customize widget
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => rotate(p.id)}
                          disabled={busy}
                        >
                          {busy ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <KeyRound className="w-4 h-4 mr-2" />
                          )}
                          Rotate key
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => remove(p.id, p.name)}
                          disabled={busy}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
