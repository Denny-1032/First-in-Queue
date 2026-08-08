"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Plus, MessageSquare } from "lucide-react";

// Shared widget-branding editor (§7 step 4 + dashboard block 13). Controlled:
// the parent owns the value and persistence. Renders the controls + a live
// preview that updates on every keystroke, and warns (never blocks) on low
// contrast. Used by both the onboarding wizard and the dashboard property card.

export interface BrandingValue {
  primary_color: string;
  title: string;
  welcome_message: string;
  suggested_messages: string[];
}

export const BRANDING_PRESETS = ["#03A84E", "#2563EB", "#7C3AED", "#DB2777", "#EA580C", "#0891B2"];
export const HEX_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/** Relative luminance → readable text colour + a low-contrast warning. */
export function luminance(hex: string): number {
  const m = hex.replace("#", "");
  const full = m.length === 3 ? m.split("").map((c) => c + c).join("") : m;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255);
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** The text colour the widget should use over a given brand colour. */
export function textColorFor(primary: string): string {
  return HEX_RE.test(primary) && luminance(primary) > 0.5 ? "#111827" : "#ffffff";
}

interface Props {
  value: BrandingValue;
  onChange: (next: BrandingValue) => void;
}

export function BrandingEditor({ value, onChange }: Props) {
  const [chip, setChip] = useState("");
  const set = (patch: Partial<BrandingValue>) => onChange({ ...value, ...patch });

  const colorValid = HEX_RE.test(value.primary_color);
  const textColor = textColorFor(value.primary_color);
  const lowContrast = colorValid && luminance(value.primary_color) > 0.6;

  const addChip = () => {
    const v = chip.trim();
    if (!v || value.suggested_messages.length >= 6) return;
    set({ suggested_messages: [...value.suggested_messages, v.slice(0, 80)] });
    setChip("");
  };

  return (
    <div className="grid gap-6 sm:grid-cols-[1fr_auto]">
      {/* Controls */}
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label>Brand colour</Label>
          <div className="flex flex-wrap items-center gap-2">
            {BRANDING_PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                aria-label={`Use ${p}`}
                onClick={() => set({ primary_color: p })}
                className={`h-7 w-7 rounded-full ring-offset-2 transition ${
                  value.primary_color.toLowerCase() === p.toLowerCase() ? "ring-2 ring-gray-900" : ""
                }`}
                style={{ backgroundColor: p }}
              />
            ))}
            <Input
              value={value.primary_color}
              onChange={(e) => set({ primary_color: e.target.value })}
              className="h-8 w-24 font-mono text-xs"
              aria-label="Hex colour"
            />
          </div>
          {lowContrast && (
            <p className="text-xs text-amber-600">
              This colour is light - text may be hard to read. We&apos;ll use dark text.
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="be-title">Header title</Label>
          <Input
            id="be-title"
            value={value.title}
            maxLength={60}
            onChange={(e) => set({ title: e.target.value })}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="be-welcome">Welcome message</Label>
          <Input
            id="be-welcome"
            value={value.welcome_message}
            maxLength={300}
            onChange={(e) => set({ welcome_message: e.target.value })}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Suggested messages</Label>
          <div className="flex flex-wrap gap-1.5">
            {value.suggested_messages.map((m, i) => (
              <span
                key={`${m}-${i}`}
                className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-700"
              >
                {m}
                <button
                  type="button"
                  aria-label={`Remove ${m}`}
                  onClick={() =>
                    set({ suggested_messages: value.suggested_messages.filter((_, j) => j !== i) })
                  }
                  className="text-gray-400 hover:text-gray-700"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={chip}
              placeholder="Add a chip"
              maxLength={80}
              onChange={(e) => setChip(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addChip();
                }
              }}
              className="h-8 text-sm"
            />
            <button
              type="button"
              onClick={addChip}
              className="inline-flex h-8 items-center rounded-md border border-gray-200 px-2 text-gray-600 hover:bg-gray-50"
              aria-label="Add suggested message"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Live preview */}
      <div className="w-full sm:w-64">
        <div className="overflow-hidden rounded-2xl border border-gray-200 shadow-sm">
          <div
            className="flex items-center gap-2 px-4 py-3 text-sm font-medium"
            style={{ backgroundColor: colorValid ? value.primary_color : "#03A84E", color: textColor }}
          >
            <MessageSquare className="h-4 w-4" /> {value.title || "Chat with us"}
          </div>
          <div className="space-y-2 bg-gray-50 p-3">
            <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-white px-3 py-2 text-xs text-gray-800 shadow-sm">
              {value.welcome_message || "👋 Hi! How can we help?"}
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {value.suggested_messages.map((m, i) => (
                <span
                  key={i}
                  className="rounded-full border px-2 py-1 text-[11px]"
                  style={{
                    borderColor: colorValid ? value.primary_color : "#03A84E",
                    color: colorValid ? value.primary_color : "#03A84E",
                  }}
                >
                  {m}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
