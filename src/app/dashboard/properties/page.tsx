"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Copy, Globe, KeyRound, Loader2, Palette, Pencil, Plus, Trash2 } from "lucide-react";
import {
  BrandingEditor,
  textColorFor,
  HEX_RE,
  type BrandingValue,
} from "@/components/onboarding/branding-editor";

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

const STATUS_LABEL: Record<Property["install_status"], string> = {
  pending: "Not installed yet",
  verified: "Installed",
  stale: "Not seen recently",
};

function snippetFor(widgetKey: string): string {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  return `<script src="${origin}/widget.js" data-key="${widgetKey}" async></script>`;
}

export default function PropertiesPage() {
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
    setError("");
  };

  const saveBranding = async (id: string) => {
    if (!brandDraft) return;
    if (!HEX_RE.test(brandDraft.primary_color)) {
      setError("Enter a valid hex colour, e.g. #03A84E");
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
    if (
      !confirm(
        "Rotate this key? Your website's snippet must be updated within the hour or the chat widget will stop loading."
      )
    ) {
      return;
    }
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
    if (!confirm(`Delete "${propName}"? The widget will stop working on that site immediately.`)) {
      return;
    }
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
          <h1 className="text-2xl font-bold text-gray-900">Websites</h1>
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
              We use the address to allow your domain automatically — the widget refuses to run
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
                      <Badge variant={p.install_status === "verified" ? "default" : "secondary"}>
                        {STATUS_LABEL[p.install_status]}
                      </Badge>
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
                      Paste this just before the closing &lt;/body&gt; tag on every page.
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
                            none — the widget will refuse every domain until one is added
                          </span>
                        )}
                      </p>
                    )}
                  </div>

                  {brandId === p.id && brandDraft && (
                    <div className="space-y-4 rounded-lg border border-gray-100 bg-gray-50/60 p-4">
                      <Label>Widget appearance</Label>
                      <BrandingEditor value={brandDraft} onChange={setBrandDraft} />
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
