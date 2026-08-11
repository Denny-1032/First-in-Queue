import type { Conversation } from "@/types";

// How a conversation is labelled anywhere an agent looks at it.
//
// A website visitor has no phone number and usually no name - the widget keys
// them by an opaque `v_…` ref (src/lib/properties/visitor-token.ts). Rendering
// that ref raw is useless, and falling through to initials of nothing is what
// filled the inbox with identical "?" avatars: every anonymous chat looked like
// the same person. So web visitors get a short, stable code derived from their
// ref instead - distinct per visitor, the same on every reload, and honest
// about the fact that we do not know who they are.

/** A web conversation nobody has given a name to yet. */
export function isAnonymousWebVisitor(c: Pick<Conversation, "channel" | "customer_name">): boolean {
  return c.channel === "web" && !c.customer_name?.trim();
}

/**
 * Four readable characters that identify one visitor. Taken from the end of the
 * ref, where the random part is - the `v_` prefix is the same for everyone.
 */
export function visitorCode(ref: string): string {
  const cleaned = (ref || "").replace(/^v_/, "").replace(/[^A-Za-z0-9]/g, "");
  const tail = cleaned.slice(-4).toUpperCase();
  return tail.padStart(4, "0");
}

/** The name to show in the list, the chat header, and notifications. */
export function customerLabel(
  c: Pick<Conversation, "channel" | "customer_name" | "customer_phone" | "customer_ref">
): string {
  const name = c.customer_name?.trim();
  if (name) return name;
  if (c.channel === "web") {
    return `Website visitor ${visitorCode(c.customer_ref || c.customer_phone || "")}`;
  }
  return c.customer_phone;
}

/**
 * The line under the name. WhatsApp has a real number worth showing; a web
 * visitor has a page they are sitting on, and no number at all.
 */
export function customerSubtitle(
  c: Pick<Conversation, "channel" | "customer_phone" | "customer_ref">
): string {
  if (c.channel === "web") {
    return `Website chat · ${visitorCode(c.customer_ref || c.customer_phone || "")}`;
  }
  return c.customer_phone;
}

/** Initials for the avatar, or null when the fallback icon should be used. */
export function customerInitials(
  c: Pick<Conversation, "channel" | "customer_name" | "customer_phone">
): string | null {
  const name = c.customer_name?.trim();
  if (name) {
    return name
      .split(/\s+/)
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  if (c.channel === "web") return null;
  // A WhatsApp contact who never gave a name still has digits worth showing.
  const digits = (c.customer_phone || "").replace(/\D/g, "");
  return digits ? digits.slice(-2) : null;
}
