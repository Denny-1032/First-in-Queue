# Phase 1 Spec — Text Web Chat Widget + Self-Serve Onboarding

Implementation spec. Companion to [tawk-benchmark-strategy.md](./tawk-benchmark-strategy.md) §7 Phase 1.
Date: 2026-07-30. Status: draft for review — no code written yet.

**Goal:** a stranger lands on firstinqueue.com, signs up, and has a working AI assistant answering questions on their own website — in under five minutes, with zero contact with a human at Codarti.

---

## 0. What already exists (read from the codebase)

| Asset | Location | Reusable? |
|---|---|---|
| AI engine (GPT-4o, system prompt builder, sentiment, escalation detect) | `src/lib/ai/engine.ts` (506 ln) | **Yes, unchanged** |
| Message orchestrator (quick replies, flows, bookings, escalation, operating hours, usage limits) | `src/lib/engine/handler.ts` (1629 ln) | **Yes, after transport injection** — see §2 |
| WhatsApp client | `src/lib/whatsapp/client.ts` | Yes — becomes one transport of two |
| DB operations | `src/lib/db/operations.ts` (706 ln) | Mostly — `getOrCreateConversation` needs channel awareness |
| Widget loader | `public/widget.js` (235 ln) | Structure yes, content no — currently voice-only |
| Widget iframe | `src/app/widget/iframe/page.tsx` (277 ln) | Structure yes — currently voice-only |
| Embed API | `src/app/api/widget/embed/route.ts` (183 ln) | Needs rewrite — requires a `voice_agents` row |
| Web crawler | `src/app/api/knowledge/crawl/route.ts` | **Yes** — becomes the wizard's KB bootstrap |
| Industry templates | `src/lib/config/templates.ts` | **Yes** — wizard seeds from these |
| Realtime hook | `src/lib/hooks/use-realtime.ts` | Yes — dashboard inbox live updates |
| Auth (HMAC signed cookies) | `src/proxy.ts`, `src/lib/auth/` | Yes for dashboard; **not** for widget visitors — see §6 |

---

## 1. Blockers found in the current schema and code

These must be resolved before anything else. Each one hard-stops self-serve signup today.

### 1.1 `tenants` requires WhatsApp credentials

`supabase/migrations/001_initial_schema.sql:15-16`

```sql
whatsapp_phone_number_id TEXT NOT NULL,
whatsapp_access_token TEXT NOT NULL,
```

A web-chat-only tenant has neither. Self-serve signup cannot create a tenant row.

### 1.2 `conversations` is phone-keyed

`001_initial_schema.sql:52` — `customer_phone TEXT NOT NULL`, and `getOrCreateConversation()` (`src/lib/db/operations.ts:76-135`) looks conversations up by `(tenant_id, customer_phone)`. A web visitor has no phone number. There is no `channel` column anywhere in the schema — WhatsApp is assumed everywhere.

### 1.3 `/api/setup` is a single-tenant bootstrap, not a signup endpoint

`src/app/api/setup/route.ts:13-24` selects the **first tenant in the entire database** and, if one exists, returns it instead of creating anything. It also copies platform-wide env credentials (`WHATSAPP_ACCESS_TOKEN`, `OPENAI_API_KEY`) into the tenant row. This endpoint is a dev bootstrap. It cannot be the signup path, and should be deleted or admin-gated once §7 ships.

### 1.4 The widget's public identifier is the tenant UUID

`docs/widget-integration.md` and `public/widget.js:20-21` require `data-tenant-id` **and** `data-agent-id`, where `data-agent-id` must be a row in `voice_agents`. Two problems: it leaks internal structure into customers' page source, and it makes the tenant's primary key a public token. tawk.to's snippet carries one opaque ID. So should ours.

### 1.5 `/api/widget/*` bypasses all auth

`src/proxy.ts` — `pathname.startsWith("/api/widget/")` is in the `isPublicApi` list. Correct for a public widget, but it means every new widget endpoint is unauthenticated by default and must carry its own authorization. Treated fully in §6.

---

## 2. Deliverable A — Channel abstraction (prerequisite, do first)

`handler.ts` is 1629 lines of accumulated, working business logic: quick-reply matching, flow state machines, booking confirm/cancel buttons, urgent-safety escalation, operating hours, plan usage limits, voice callback requests. **None of that should be duplicated for web chat.** Duplicating it means every future rule gets written twice and drifts.

The coupling is narrow and mechanical. In `processIncomingMessage` (`handler.ts:90-95`):

```ts
const whatsapp = createWhatsAppClient(tenant.whatsapp_access_token, tenant.whatsapp_phone_number_id);
```

That single local variable, plus `message.from` and `message.id`, is what ties 1600 lines to WhatsApp.

### A1. Define the transport interface

New file `src/lib/channels/transport.ts`:

```ts
export type Channel = 'whatsapp' | 'web';

export interface ChannelCapabilities {
  buttons: boolean;
  lists: boolean;
  media: boolean;
  maxButtons: number;            // WhatsApp: 3   Web: 6
  maxButtonTitleLength: number;  // WhatsApp: 20  Web: 60
  readReceipts: boolean;
  typingIndicator: boolean;
}

export interface ChannelTransport {
  readonly channel: Channel;
  readonly capabilities: ChannelCapabilities;
  sendText(to: string, text: string): Promise<string>;
  sendButtons(to: string, body: string, buttons: Array<{ id: string; title: string }>, header?: string, footer?: string): Promise<string>;
  sendList(/* same signature as WhatsAppClient.sendList */): Promise<string>;
  sendImage(to: string, url: string, caption?: string): Promise<string>;
  sendDocument(to: string, url: string, filename: string, caption?: string): Promise<string>;
  markAsRead(messageId: string): Promise<void>;
  sendTypingIndicator(to: string): Promise<void>;
}
```

`WhatsAppClient` (`src/lib/whatsapp/client.ts`) already implements every one of these signatures. It needs a `channel` property, a `capabilities` property, and an `implements ChannelTransport` clause. **Zero behaviour change.**

### A2. Normalized inbound message

```ts
export interface NormalizedInboundMessage {
  externalId: string;        // WhatsApp wamid, or web message uuid
  customerRef: string;       // phone number, or web visitor id
  customerName?: string;
  type: 'text' | 'image' | 'document' | 'interactive' | 'audio' | 'location';
  content: MessageContent;   // reuse existing type
  raw: unknown;              // original payload, for channel-specific branches
}
```

`extractMessageContent()` (`handler.ts:624`) moves to `src/lib/channels/whatsapp-adapter.ts` and becomes one of two normalizers.

### A3. Refactor the handler

- `processIncomingMessage(tenant, message, customerName)` → `processIncomingMessage(tenant, msg: NormalizedInboundMessage, transport: ChannelTransport)`
- Delete line 95; use the injected `transport` throughout.
- Replace `message.from` → `msg.customerRef`, `message.id` → `msg.externalId` (mechanical, ~40 sites).
- Every `saveMessage({ ..., whatsapp_message_id })` call gains `channel` and writes the transport's returned id to a generic column (see A5).
- Downstream helpers (`handleAIResponse`, `handleEscalation`, `sendFlowStep`, `processFlowStep`, `handleBookingButton`, `sendBookingConfirmButtons`, `handleVoiceCallbackRequest`) take `transport` instead of `whatsapp`.

**Capability degradation.** Any code emitting buttons must clamp to `transport.capabilities`. Today `sendFlowStep` and `sendBookingConfirmButtons` assume WhatsApp's 3-button / 20-char limits. Add one helper — `clampButtons(buttons, capabilities)` — that truncates counts and titles and spills the overflow into the message body as a numbered list. On web, nothing is clamped.

**Voice callback path.** `checkVoiceCallbackRequest` / `handleVoiceCallbackRequest` assume the customer has a phone number. On web, no phone is known — gate this branch on `transport.channel === 'whatsapp'`, or ask for a number first. Decide before implementing; do not let it silently no-op.

### A4. Web transport

New file `src/lib/channels/web-transport.ts`. `WebTransport` implements `ChannelTransport` but sends nothing over the network: each `send*` call inserts a row into `messages` with `channel='web'` and returns the new row's UUID as the message id. Delivery to the browser happens via Supabase Realtime on the `messages` table filtered by `conversation_id` — the mechanism `src/lib/hooks/use-realtime.ts` already uses.

`markAsRead` is a no-op. `sendTypingIndicator` writes a short-lived Realtime broadcast, not a table row.

**Response delay.** Copy tawk.to's behaviour setting: a configurable artificial delay before the assistant's reply lands, so answers do not appear instantly and unnervingly. Default 600ms, per-property configurable, `0` allowed.

### A5. Migration `013_channels.sql`

```sql
-- 1.1: web-only tenants have no WhatsApp credentials
ALTER TABLE tenants ALTER COLUMN whatsapp_phone_number_id DROP NOT NULL;
ALTER TABLE tenants ALTER COLUMN whatsapp_access_token   DROP NOT NULL;

-- 1.2: conversations become channel-aware
ALTER TABLE conversations ADD COLUMN channel TEXT NOT NULL DEFAULT 'whatsapp'
  CHECK (channel IN ('whatsapp','web'));
ALTER TABLE conversations ADD COLUMN customer_ref TEXT;
UPDATE conversations SET customer_ref = customer_phone WHERE customer_ref IS NULL;
ALTER TABLE conversations ALTER COLUMN customer_ref SET NOT NULL;
ALTER TABLE conversations ALTER COLUMN customer_phone DROP NOT NULL;
CREATE INDEX idx_conversations_channel_ref ON conversations(tenant_id, channel, customer_ref);

-- messages: generic external id alongside the WhatsApp-specific one
ALTER TABLE messages ADD COLUMN channel TEXT NOT NULL DEFAULT 'whatsapp'
  CHECK (channel IN ('whatsapp','web'));
ALTER TABLE messages ADD COLUMN external_message_id TEXT;
UPDATE messages SET external_message_id = whatsapp_message_id WHERE external_message_id IS NULL;
CREATE INDEX idx_messages_external_id ON messages(external_message_id);
```

`customer_phone` is retained and still populated on the WhatsApp path — dashboard queries, exports and the analytics functions read it. Do not drop it in this migration.

`getOrCreateConversation(tenantId, customerPhone, customerName)` becomes `getOrCreateConversation(tenantId, channel, customerRef, customerName)` and keys on `(tenant_id, channel, customer_ref)`. On the WhatsApp path it also writes `customer_phone = customerRef` for backward compatibility.

**Regression risk is real.** `handler.ts` has no test coverage visible in the repo. Before refactoring, write characterization tests against the existing WhatsApp path — at minimum: new-conversation welcome, quick-reply match, AI response, flow step advance, booking confirm button, escalation, usage-limit block, outside-hours. These tests are the safety net for the entire refactor and are worth the day they cost.

---

## 3. Deliverable B — Properties and the widget key

### B1. Concept

Introduce **Property** as the public-facing unit, exactly as tawk.to does — and explain the word inline in the UI the first time it appears, as they do.

A property = one installable surface (one website). It owns the widget key, branding, and domain allowlist. A tenant owns one or more properties. Phase 1 ships one property per tenant in the UI; the schema supports many, so agencies and multi-department bodies are not blocked later.

### B2. Migration `014_properties.sql`

```sql
CREATE TABLE properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  widget_key TEXT UNIQUE NOT NULL,          -- public, e.g. 'fiq_live_a1b2c3...'
  site_url TEXT,
  allowed_domains TEXT[] NOT NULL DEFAULT '{}',
  branding JSONB NOT NULL DEFAULT '{}'::jsonb,
  install_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (install_status IN ('pending','verified','stale')),
  first_seen_at TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_properties_tenant ON properties(tenant_id);

ALTER TABLE conversations ADD COLUMN property_id UUID REFERENCES properties(id) ON DELETE SET NULL;
CREATE INDEX idx_conversations_property ON conversations(property_id);
```

`widget_key`: 32 bytes from `crypto.randomBytes`, base62, prefixed `fiq_live_`. Prefixed keys are greppable by secret scanners and instantly identifiable in a support ticket. Rotatable from the dashboard (issues a new key, marks the old one revoked with a grace window).

`branding` JSONB shape:

```jsonc
{
  "logo_url": null,
  "primary_color": "#03A84E",
  "text_color": "#ffffff",
  "position": "bottom-right",
  "title": "Chat with us",
  "welcome_message": "👋 Hi! How can we help?",
  "suggested_messages": ["I have a question", "Tell me more"],
  "show_branding": true,          // false only on paid — this is a revenue line
  "response_delay_ms": 600,
  "launcher": "bubble",           // bubble | tab | custom
  "offline_message": null
}
```

### B3. `allowed_domains` is a security control, not a preference

The widget key is public by definition — it sits in the customer's page source. Anyone can copy it and run the widget from their own domain, consuming the property's AI message credits. `allowed_domains` is what stops that.

Populate it automatically from the site URL entered in wizard step 1 (registrable domain + `www` + all subdomains), let the customer edit it, and enforce it server-side against the `Origin` header on every widget request — never against a client-supplied value. Empty array = **deny all**, not allow all. During onboarding, before the first verified heartbeat, run in log-only mode so a mismatched domain surfaces as a clear wizard error rather than a silently broken widget.

---

## 4. Deliverable C — The widget itself

Two pieces, matching the current split and tawk.to's architecture.

### C1. Loader — `public/widget.js` v2

Stays tiny (**budget: under 15KB gzipped, no dependencies, no framework**). Responsibilities only:

1. Read config from `data-*` attributes on its own `<script>` tag.
2. Inject the launcher button and a hidden `<iframe>`.
3. `postMessage` bridge between page and iframe.
4. Fire the install heartbeat (§5).
5. Expose `window.FiQWidget` — `open()`, `close()`, `toggle()`, `isOpen()`, plus new: `identify(traits)`, `setLanguage(code)`, `on(event, cb)`.

Snippet the customer copies:

```html
<script src="https://app.firstinqueue.com/widget.js"
        data-key="fiq_live_xxxxxxxx" async></script>
```

One attribute. Everything else — colours, greeting, position, suggested messages — is fetched from `/api/widget/config`, so the customer can restyle from the dashboard **without editing their site again.** That is a real advantage over hardcoded snippet attributes and is worth the extra round trip. `data-*` overrides remain supported for developers who want them.

**Backward compatibility:** existing voice embeds in the wild use `data-tenant-id` + `data-agent-id`. If `data-key` is absent and those two are present, fall through to the current voice-only behaviour unchanged. Do not break live installs.

**Iframe, not inline DOM.** Keeps CSS and JS fully isolated from the host page — the reason tawk.to, Intercom and Crisp all do it. The launcher bubble is the only element in the host document, and it is a single shadow-DOM node.

### C2. Chat UI — `src/app/widget/iframe/page.tsx` v2

Text-first. Voice becomes an optional in-widget action ("Talk to us instead") when the property has a voice agent configured — inverting today's arrangement.

Required:
- Message list, inbound/outbound bubbles, timestamps, day separators
- Typing indicator during the response delay
- Suggested-message chips on first open (from `branding.suggested_messages`), dismissed after first send
- Interactive buttons and list menus rendered as chips — the web rendering of what `sendButtons`/`sendList` emit
- Markdown rendering, sanitized. Links get `rel="noopener noreferrer nofollow"` and `target="_blank"`
- File and image upload (deferrable to 1.5; if deferred, hide the control entirely rather than showing a dead button)
- "Powered by First in Queue" footer, hidden when `branding.show_branding === false`
- Persistent conversation across page loads and reloads via visitor token in `localStorage`
- Unread badge on the launcher when a reply arrives while the widget is closed
- Sound + browser notification, both default-off and user-toggleable
- Pre-chat form (name/email), optional, per-property — needed for lead capture and for email follow-up when the visitor leaves
- Transcript-by-email button
- Offline / outside-hours state driven by the existing `isOutsideOperatingHours()` logic

Non-negotiable for public-sector buyers, and cheap if done from the start rather than retrofitted:
- **WCAG 2.1 AA.** Full keyboard operation, visible focus rings, `aria-live="polite"` on the message list, labelled controls, 4.5:1 contrast enforced by validating `branding.primary_color` in the wizard, `prefers-reduced-motion` respected.
- **Mobile:** full-screen sheet under 480px, not a floating card. Correct behaviour when the on-screen keyboard opens.
- **RTL** layout support.
- **i18n** of widget chrome, not just AI replies — English first, structure ready for Bemba/Nyanja/Tonga.

### C3. Streaming — a deliberate staging decision

`handler.ts` returns complete strings and branches on the full response (escalation detection, flow triggers, booking parsing). Making it stream end-to-end means restructuring all of that.

**Phase 1: do not stream.** Ship the typing indicator plus the configurable response delay. One engine code path, one set of behaviours, WhatsApp and web identical. This is what makes Phase 1 a matter of weeks rather than months.

**Phase 1.5: add a streaming fast-path** for the plain-Q&A case only — no active flow state, no booking in progress, no pending escalation. Those conditions are already computed early in `processIncomingMessage`. When they all hold, stream tokens over SSE; otherwise fall back to the buffered path. The visitor sees streaming for the ~80% case without the state machine being touched.

Be clear-eyed that this is a real gap in the interim: competitors stream, and a 3-second silent wait feels broken. The typing indicator is mitigation, not parity.

### C4. Widget API contract

All under `/api/widget/`. All public. See §6 for how each is authorized.

| Endpoint | Method | Auth | Purpose |
|---|---|---|---|
| `/api/widget/config` | GET | `key` + Origin check | Boot config: branding, greeting, suggested messages, online state, locale |
| `/api/widget/session` | POST | `key` + Origin check | Create/resume visitor session → signed visitor token + conversation id |
| `/api/widget/message` | POST | visitor token | Send visitor message; returns 202 + assistant reply (or delivered via Realtime) |
| `/api/widget/history` | GET | visitor token | Replay messages on reload |
| `/api/widget/heartbeat` | POST | `key` + Origin check | Install verification ping (§5) |
| `/api/widget/transcript` | POST | visitor token | Email transcript to visitor |
| `/api/widget/upload` | POST | visitor token | Attachments (1.5) |

`/api/widget/embed` (existing, `route.ts`) is rewritten to key off `properties` instead of requiring a `voice_agents` row, and to return the one-attribute snippet.

### C5. Attachments (implemented)

Images and documents, plus an emoji palette, in the composer. Rules live in `src/lib/widget/media.ts` and are enforced on both sides — the browser's copy is a courtesy, the route's is the control.

**Flow.** Pick or paste or drop a file → the browser downscales photos to 1600px (`image-resize.ts`) → `POST /api/widget/upload` stores the bytes and returns an object path → `POST /api/widget/message` is sent with that path, and the visitor's typed text rides along as the attachment's `caption`. Two steps, so a failed upload never produces a message pointing at nothing, and so the caption can still be edited after the file is chosen.

**Storage.** Private bucket `chat-media` (migration 024), keys shaped `<tenant_id>/<conversation_id>/<uuid>.<ext>`. Messages persist `content.media_path`, never a URL: readers mint a 6-hour signed URL at fetch time (`media-storage.ts`, used by `/api/widget/history` and the dashboard's messages route). A public bucket would be an open file host for anyone who guesses a key, and a stored URL would be either permanent or expired.

**Checks at the boundary.** Declared MIME against an allowlist (no SVG — it is scriptable and we render attachments inline), size against `MAX_UPLOAD_BYTES` (4 MB, set by Vercel's 4.5 MB request-body cap), and magic-byte sniffing so a renamed executable cannot be stored as a PDF. On send, the supplied path must sit under the caller's own `<tenant>/<conversation>/` prefix and must resolve to an object that exists — otherwise a visitor could attach another business's file to their own conversation and have it signed back to them. Uploads get their own rate buckets, tighter than messages.

**The model sees them.** `getRecentMessageHistory()` already renders inbound media as `[Customer sent an image with caption: "…"]`, so no engine change was needed — the same path WhatsApp media has always taken.

---

## 5. Deliverable D — Install verification

The step worth copying most precisely, because it converts an ambiguous state into a confirmed one and gives the business its cleanest activation metric.

**Flow:**

1. Widget loader, on first load in a browser, `POST /api/widget/heartbeat` with `{ key, page_url, referrer }`. Origin comes from the header, never the body.
2. Server validates key and Origin, then sets `properties.first_seen_at` (if null), `last_seen_at = now()`, `install_status = 'verified'`, and writes an `analytics_events` row (`widget_installed`).
3. Wizard's verify screen polls `GET /api/onboarding/install-status` every 2s for up to 3 minutes, showing "Waiting for chat widget connection" — tawk.to's exact copy is fine here because it is exactly right.
4. On success: green confirmed state, then straight into the dashboard.
5. On timeout: **do not just fail.** Show the actual diagnosis. The server knows which of these happened, so say which:
   - no heartbeat at all → "We haven't seen the widget yet" + reinstall guide
   - heartbeat received from a **non-allowlisted domain** → "We saw your widget on `blog.example.com`, which isn't on your allowed list. Add it?" — one-click fix
   - key mismatch → "That key doesn't match this property"

   That second bullet is the single highest-value support-deflection feature in the whole wizard.
6. Nightly job: any property with `last_seen_at` older than 14 days flips to `stale` and emails the owner. Catches site redesigns that drop the snippet — a silent, common, revenue-losing failure.

**Escape hatches on the same screen**, per tawk.to:
- **Send instructions** — email the snippet + install guide to a developer's address. Requires an email-sending path; there is no obvious mail module in `src/lib/`, so this is likely new work.
- **Read guide** — link to install docs, per platform.
- **Book a call** — reuse the existing demo-booking flow (`supabase/migrations/008_demo_bookings.sql`).

For ZRA and similar buyers, "send instructions" is not a convenience — it is the only path, because the person evaluating the product will never have access to publish HTML.

---

## 6. Security

This section is deliberately written in full prose. The widget endpoints are the only unauthenticated, internet-facing, LLM-cost-incurring surface in the product, and `src/proxy.ts` already exempts `/api/widget/*` from the auth check. Everything below must be implemented; none of it is optional.

**Never expose secrets to the widget.** `tenants.openai_api_key`, `tenants.whatsapp_access_token` and the Supabase service-role key must never appear in any `/api/widget/*` response, in the iframe's initial HTML, or in any client-side bundle. The `/api/widget/config` response must be an explicit, hand-built allowlist of fields — never a `select('*')` on tenants or properties passed through to the client.

**Origin enforcement.** Every request carrying only the widget key must validate the `Origin` header against `properties.allowed_domains` server-side. The `Origin` header is set by the browser and cannot be forged by page JavaScript. Never trust a domain value supplied in the request body. Return CORS headers echoing only the matched allowed origin — never `Access-Control-Allow-Origin: *` on any endpoint that reads or writes conversation data.

**Visitor sessions.** `/api/widget/session` issues a short-lived HMAC-signed visitor token — same signing approach as the existing `fiq-auth` cookie — with a payload of `{ propertyId, tenantId, conversationId, visitorId, iat, exp }`. Every message and history request is authorized from that token's claims. **Never** accept `conversationId` or `tenantId` from the request body: that is a direct IDOR into other businesses' conversations. Set expiry to 24 hours with silent renewal.

**Rate limiting is the cost-control boundary.** The existing limiter (`src/lib/api/rate-limit.ts`, 120 req/min per IP, in-memory) is insufficient here for two reasons: it is per-IP only, and in-memory state does not survive serverless instance recycling. Widget endpoints need persistent, layered limits: per visitor token (e.g. 20 messages / 5 min), per property (a daily AI-message ceiling derived from the plan), and per IP across all properties (catching one attacker hitting many keys). A single abusive visitor must not be able to exhaust a customer's monthly credits, and no combination of visitors must be able to run up an unbounded OpenAI bill. Enforce the property ceiling **before** the model call, not after.

**Message-size and content limits.** Cap inbound message length (~4000 chars) and attachment size at the API boundary before any tokenization. Reject non-allowlisted MIME types on upload. Store attachments outside the app origin, or serve them with `Content-Disposition: attachment` and a restrictive `Content-Security-Policy`, so an uploaded HTML file cannot execute in the app's origin.

**XSS.** Assistant output is model-generated and visitor input is attacker-controlled; both are rendered in the widget. Sanitize all markdown to a strict allowlist of tags and attributes. Never use `dangerouslySetInnerHTML` on unsanitized content. Ship a strict CSP on the iframe document.

**Clickjacking and framing.** The widget iframe is intended to be framed by customer sites, so it cannot use `X-Frame-Options: DENY`. Instead set `Content-Security-Policy: frame-ancestors` dynamically from `allowed_domains`. The dashboard and all authenticated routes keep `DENY`.

**Prompt injection.** Visitor messages reach a model that will, in Phase 2, be able to call tools. Treat all visitor text as untrusted data, never as instructions: keep it clearly delimited from system instructions in the prompt, and never let retrieved page content or visitor text alter tool permissions. Build this boundary now, in Phase 1, while there are no tools to abuse — retrofitting it after tool-calling ships is far harder.

**PII.** Pre-chat forms collect names and emails, and transcripts contain whatever visitors type — which, for a revenue authority, means TPINs and financial details. Decide retention now: a default window, a per-property override, a documented deletion path, and a redaction pass before text is sent to the model provider. Publish which sub-processors receive message content. Enterprise buyers will ask, and "we'll look into it" loses the deal.

**Key rotation.** Rotating `widget_key` must invalidate outstanding visitor tokens issued under the old key, with a short grace window so a customer who rotates does not instantly break every open chat on their site.

---

## 7. Deliverable E — The onboarding wizard

Structure copied from tawk.to: **one question per screen, Skip and Back on every step, no credit card, nothing mandatory.**

| Step | Route | Question | Notes |
|---|---|---|---|
| 0 | `/signup` | Email + password | Creates `users` + `tenants` rows. Also offer Google OAuth. Email verification **after** setup, not before — a verification wall here kills the five-minute promise. |
| 1 | `/onboarding/site` | "What's your website address?" | Prefilled `https://`. **Kicks off the crawl in the background immediately** via the existing `/api/knowledge/crawl`. Auto-derives `allowed_domains`. |
| 2 | `/onboarding/org` | "What's the name of your organization?" | Creates the property. Explain the word "Property" inline, in the same sentence, exactly as tawk.to does. |
| 3 | `/onboarding/industry` | "What kind of business is this?" | Seeds from `src/lib/config/templates.ts`. Pre-select the guess from the crawl. Skippable. |
| 4 | `/onboarding/brand` | "Customize the widget to suit your brand" | Logo, colour presets + hex, welcome message, suggested-message chips (drag-reorder, delete). **Live preview panel, updating on every keystroke.** Validate contrast here and warn, don't block. |
| 5 | `/onboarding/review` | "Here's what your assistant learned" | **The trust moment.** Show the crawl-generated FAQs and KB entries; let the user edit and delete. tawk.to does exactly this, and it is why customers believe the thing works. Do not skip it. |
| 6 | `/onboarding/install` | "Your widget is ready!" | Copy box with the one-attribute snippet, copy-to-clipboard with confirmation, plugin tiles, "Send instructions to my developer". |
| 7 | `/onboarding/verify` | "Verify chat widget connection" | §5. Verify button, polling state, diagnostic failure states, Read Guide, Book Call. |

Persist wizard progress on the tenant row (`config.onboarding_step`) so a closed tab resumes where it left off.

**Dogfood.** Put the FIQ widget itself on the wizard's left panel, as tawk.to does with "Chat with us". It is the strongest possible demo — the customer uses the product while buying it — and it doubles as onboarding support.

**Crawl timing matters.** Steps 2–4 exist partly to give the crawler 60–90 seconds of cover so step 5 has content ready. If the crawl is still running, show partial results with a spinner rather than blocking. If it fails (JS-rendered site, robots.txt, timeout), fall back cleanly to the industry template plus a "paste your FAQs" textarea — never a dead end.

---

## 8. Deliverable F — WordPress plugin

Scope: read the property key from a settings field, inject the snippet in `wp_footer`, done. Perhaps 150 lines of PHP. The value is not technical — it is the WordPress.org plugin directory listing, which is a permanent, free, high-intent distribution channel. Shopify next. Everything else can wait until there is demand.

---

## 9. Sequencing

Dependency-ordered. Each block is shippable and testable on its own.

| # | Block | Depends on | Rough effort |
|---|---|---|---|
| 1 | Characterization tests for the existing WhatsApp handler path | — | 1–2 days |
| 2 | Migration 013 (channels) + `getOrCreateConversation` channel-aware | 1 | 1 day |
| 3 | `ChannelTransport` interface + WhatsApp adapter (no behaviour change) | 2 | 1–2 days |
| 4 | Handler refactor to injected transport; WhatsApp tests still green | 3 | 2–3 days |
| 5 | Migration 014 (properties) + widget key generation + rotation | 2 | 1 day |
| 6 | `WebTransport` + widget API endpoints + full §6 security layer | 4, 5 | 4–5 days |
| 7 | Widget chat UI (iframe v2) incl. accessibility and mobile | 6 | 5–7 days |
| 8 | Widget loader v2 (+ legacy voice fallback) | 7 | 2 days |
| 9 | Heartbeat + verification + diagnostics + stale-install job | 5, 8 | 2 days |
| 10 | Signup + wizard steps 0–4 | 5 | 4–5 days |
| 11 | Crawl-to-FAQ review screen (step 5) | 10 | 2–3 days |
| 12 | Install + verify screens (steps 6–7), send-instructions email | 9, 10 | 2 days |
| 13 | Dashboard: property settings, branding editor, install status, web inbox | 6, 7 | 3–4 days |
| 14 | WordPress plugin + directory submission | 8 | 2 days |
| 15 | Retire/admin-gate `/api/setup`; docs rewrite | 10 | 1 day |

Roughly 6–8 focused weeks for one developer. Blocks 1–4 are the highest-risk stretch — they touch working revenue code with no existing tests — and blocks 6–7 are the largest.

Nothing customer-visible ships until block 7, which is worth flagging up front: there is a three-week stretch of foundation work with no demo. If a demo is needed sooner for the ZRA conversation, blocks 5→6→7 can be built against a temporary standalone endpoint that bypasses the handler, with the transport refactor landing behind it. That is deliberate throwaway work — a few days — and only worth it if a specific meeting depends on it.

---

## 10. Definition of done

**The five-minute test.** Someone who has never seen First in Queue signs up and, inside five minutes, has the widget answering questions about their own business on their own site, having spoken to nobody. Run this with five real people who are not developers. Watch, don't help. Every place they hesitate is a bug.

Additionally:
- WhatsApp behaviour is identical to today — characterization tests green throughout.
- Widget scores 95+ on Lighthouse accessibility; full keyboard operation verified with a screen reader.
- Loader is under 15KB gzipped and adds under 50ms to host-page load.
- Widget renders correctly on WordPress, Shopify, Wix, Squarespace and a plain static HTML page.
- Every §6 security control implemented and verified, including a deliberate attempt to use one property's key from a non-allowlisted origin.
- A property's AI spend cannot exceed its plan ceiling regardless of visitor behaviour.

**Metrics to instrument from day one** — all writable to the existing `analytics_events` table:
`signup_started`, `signup_completed`, `wizard_step_completed` (per step), `crawl_completed`, `snippet_copied`, `instructions_emailed`, `widget_installed` (first heartbeat), `first_conversation`, `first_ai_resolution`.

Activation = `widget_installed`. Time-to-activation is the number that says whether Phase 1 worked. Track the drop-off between `snippet_copied` and `widget_installed` specifically — that gap is where every self-serve funnel in this category leaks, and it is the entire reason the verify step exists.

---

## 11. Open decisions needed before coding

1. **Voice callback on web** (§A3) — ask the visitor for a phone number, or hide the option on the web channel entirely?
2. ~~**Free-tier AI ceiling**~~ — **RESOLVED: 500 AI replies/month**, hard stop, plus a ~4KB knowledge-base cap on free properties. Cost model run 2026-07-31 against real prod configs (see [pricing-model-v2.md](./pricing-model-v2.md) §1). Measured 3,305 input / 100 output tokens per reply; free property costs ~$0.20/mo. KB size is the dominant lever — FIQ's own 47KB config costs 3× a typical 12KB tenant.
3. ~~**Model for the free tier**~~ — **RESOLVED: `gpt-4o-mini` on free web chat, `gpt-4o` on paid.** At `gpt-4o` a free property costs K90/mo and only 5 free properties are funded per paying customer — the free tier cannot survive that. At `gpt-4o-mini` it is K5.4/mo and 145 free properties per Pro subscription. Conclusion holds even at zero cache-hit and a 2.5× booking tool-loop. Chose mini over the cheaper nano models because replies are JSON-structured with escalation/sentiment fields and instruction-following matters more than the remaining K2. **Still to do: A/B mini vs 4o on real Zambian-English and local-language transcripts before committing publicly.**
4. ~~**Email provider**~~ — **RESOLVED.** Resend is already in use: `RESEND_API_KEY` is set, and `src/app/api/team/invite/route.ts` posts to `https://api.resend.com/emails` from `noreply@firstinqueue.com`. There is no shared mail module — the call is inlined in the invite route. Extract it to `src/lib/email/` and reuse for send-instructions, transcripts and stale-install alerts.
5. **Persistent rate-limit store** — the in-memory limiter will not hold. Supabase table, or Upstash Redis?
6. **`data-agent-id` deprecation window** — how long to keep the legacy voice embed path alive.
