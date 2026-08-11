import { redirect } from "next/navigation";

// This page used to configure a second, voice-only "Call Us" widget with its
// own embed snippet, colours and agent picker. Everything it did is now part of
// the one chat widget, configured per website under Websites -> Customize
// widget (colours, welcome message, suggested replies, the call button and its
// agent, the WhatsApp button) and installed from the snippet on that same card.
//
// Kept as a redirect rather than deleted: the old path is bookmarked, and
// landing on a 404 after pasting a snippet is the worst possible moment for it.

export default function WidgetConfigRedirect() {
  redirect("/dashboard/properties");
}
