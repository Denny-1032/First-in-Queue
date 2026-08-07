# Phase 1 — build progress

Living status file. Spec: [phase1-spec-widget-and-onboarding.md](./phase1-spec-widget-and-onboarding.md).
Pricing: [pricing-model-v2.md](./pricing-model-v2.md). Last updated 2026-07-31.

---

## START HERE (handoff)

**2026-08-02 update — OpenAI key fixed + Block 10 (signup + wizard steps 0–4) built.**

The stale `.env` OpenAI key is replaced and a **real AI reply is confirmed
working** end to end (raw `gpt-4o-mini` → 200; live `AIEngine.generateResponse`
pulled from KB + FAQ, not the fallback). The old blocker is closed.

**Block 10 built** — signup wizard steps 0–4, dependency-ordered per §7:
  * `/signup` (step 0) — email+password, reuses `POST /api/auth/signup`
    (now seeds `config.onboarding.step=1`). **Google OAuth deferred** by
    decision — do it later as its own task.
  * `/onboarding/{site,org,industry,brand}` (steps 1–4) + a `/onboarding/review`
    **stub** (step 5) so the flow doesn't dead-end — block 11 replaces it.
  * `/onboarding` index resumes to the saved step; progress persists in
    `tenants.config.onboarding` (no migration — it's JSONB).
  * Crawl core extracted to `src/lib/knowledge/crawl.ts` (behaviour unchanged;
    the old route is now a thin wrapper). Step 1 fires `POST /api/onboarding/crawl`
    which runs the crawl via `after()` and stashes entries in
    `config.onboarding.crawl` for the block-11 review screen. Industry is guessed
    from the crawl to pre-select step 3.
  * Middleware now protects `/onboarding/*` (307 → `/signup` when signed out).

**Verified:** `tsc --noEmit` clean · 78 unit tests green · `/signup` renders,
no console errors · onboarding pages 307→/signup unauthed, `/api/onboarding` 401
unauthed · with a minted session cookie all five step pages return 200 and the
wizard chrome renders (progress bar, dogfood left panel, industry grid).
**Live write-path run against prod (2026-08-02, test rows cleaned up after):**
signup → crawl(example.com) → create property → branding PATCH → advance. The
`after()` background crawl completed and persisted (`crawl.status=done`, 1 entry);
branding PATCH merged without wiping untouched keys; `onboarding` persisted
`step`, `property_id`, `site_url`, crawl entries. All six test rows
(properties/subscriptions/agents/user_tenants/users/tenants) deleted afterward,
0 remaining.

**Files added this block:** `src/lib/onboarding/{state,client}.ts`,
`src/lib/knowledge/crawl.ts`, `src/app/api/onboarding/route.ts`,
`src/app/api/onboarding/crawl/route.ts`, `src/app/signup/page.tsx`,
`src/app/onboarding/{layout,page}.tsx` + `{site,org,industry,brand,review}/page.tsx`,
`src/components/onboarding/{wizard-shell,dogfood-panel}.tsx`. Type: `OnboardingState`
in `src/types/index.ts`. `.claude/launch.json` added for the dev preview.

**Block 11 built + verified (2026-08-02).** Step 5 review is now the real
editable "trust moment", not a stub:
  * `src/lib/knowledge/faq-generator.ts` — gpt-4o-mini (JSON mode) turns crawl KB
    entries into grounded FAQs; prompt forbids invention; best-effort ([] on any
    failure). Wired into the crawl `after()` step so FAQs + KB are both staged in
    `config.onboarding.crawl` by the time the user reaches step 5.
  * `POST /api/onboarding/knowledge` — commits the REVIEWED (edited/kept) FAQs +
    KB into `config.faqs` / `config.knowledge_base` (what the engine reads).
    Enforces the free-tier ~4KB KB cap (`FREE_KB_CAP_BYTES=4096`): entries kept
    in order until the byte budget, rest dropped and reported.
  * `/onboarding/review` rebuilt: editable FAQ list + KB list (edit/delete/add),
    polls while the crawl runs, clean manual-entry fallback on crawl failure.
    Finish commits + marks onboarding `done` → dashboard (install/verify are
    block 12).
  * **Verified:** tsc clean · 78 tests green · live grounded-FAQ generation
    (3 FAQs from synthetic entries, all facts from source, no invention) · live
    commit against prod persisted `config.faqs`+`config.knowledge_base` and the
    4KB cap dropped an oversized entry (kept 2 FAQ / 1 KB, dropped 1). Test rows
    cleaned up, 0 remaining.

**Block 12 built + verified (2026-08-02).** Install + verify screens (steps 6–7)
— the wizard now runs end to end, signup → verified widget:
  * `src/lib/email/send.ts` — Resend extracted into a shared `sendEmail` +
    `emailShell` (§11.4); the team-invite route refactored onto it. No-ops when
    `RESEND_API_KEY` is unset.
  * `POST /api/onboarding/send-instructions` — emails the snippet + guide to a
    developer's address (session-scoped; the §5 escape hatch for buyers who
    can't publish HTML).
  * `GET /api/onboarding/install-status` — turns heartbeat state into a verdict:
    `verified` | `origin_rejected(origin)` | `waiting`. Reads the property via
    `onboarding.property_id` (or `?property_id`), tenant-scoped.
  * `/onboarding/install` (step 6) — one-line snippet + copy-to-clipboard,
    platform tiles, send-instructions form.
  * `/onboarding/verify` (step 7) — polls status every 2s up to 3 min; on a
    rejected origin shows **one-click "add this domain & retry"**; on timeout
    shows the real diagnosis + back-to-install; on success → dashboard. Read-guide
    + book-a-call escape hatches.
  * Review's Finish now flows to `/onboarding/install` (not straight to dashboard).
  * **Verified:** tsc clean · 78 tests green · live diagnosis chain against prod:
    `waiting → origin_rejected(https://blog.evil.com) → [one-click add domain] →
    verified`, via simulated allowed/rejected heartbeats; send-instructions
    validation (400 on bad email). Test rows + analytics_events cleaned up.

**Milestone:** the whole §7 five-minute wizard (steps 0–7) is now built and
walks end to end. Remaining Phase 1: block 13 (dashboard — property settings,
branding editor, install status, web inbox; note `/dashboard/properties` already
exists from the block-10-era CRUD work), 14 (WordPress plugin), 15 (retire /
admin-gate `/api/setup`).

**Block 13 built + verified (2026-08-03).** Dashboard surfaces:
  * `src/components/onboarding/branding-editor.tsx` — the branding controls +
    live preview + contrast logic, extracted from onboarding step 4 into one
    shared controlled component. Onboarding step 4 now consumes it.
  * `/dashboard/properties` — "Customize widget" panel per property using the
    shared editor (saves branding via `PATCH /api/properties/[id]`), plus a
    last-seen label under the install-status badge. (Create/snippet/domains/
    rotate/delete already existed from the block-10-era CRUD.)
  * Web inbox: `Conversation` type gained `channel`/`property_id`/`customer_ref`
    (`getConversations` already `select('*')`s them); the conversations list now
    shows a **Web** vs **WhatsApp** channel chip so web chats are first-class.
  * **Verified:** tsc clean · 78 tests green · dashboard branding editor rendered
    live (all controls + preview) and a save persisted to prod (title + colour
    changed, untouched branding keys preserved by the PATCH merge). Inbox:
    `/api/conversations` returns `channel` for seeded web + whatsapp rows (200);
    badge is a pure function of `convo.channel`, tsc-clean — the visual paint was
    blocked only by slow client hydration of the heavy conversations page in the
    embedded dev pane, not a code issue. Test rows (incl. 2 conversations)
    cleaned up.

**Block 14 built + hardened (2026-08-03).** The plugin already existed in
`wordpress-plugin/first-in-queue/` (built in an earlier session, never recorded
here) — settings page, `fiq_options`, `wp_footer` injection, `uninstall.php`,
`readme.txt`. This pass audited it against the app and fixed two real defects:
  * **A malformed key wiped the stored one.** `fiq_sanitize_options` set
    `widget_key = ''` on a bad key, so a typo on a live site silently took the
    widget offline — and readiness required "nothing stored". It now starts from
    the current options and leaves `widget_key` untouched on rejection (same for
    a bad host). Clearing the field is still the explicit way to switch it off.
  * **`FIQ_DEFAULT_HOST` was the apex** `https://firstinqueue.com`, not the app
    origin. Both serve `/widget.js` today (both 200, 7,715 bytes), so it was not
    yet broken — but it would break the day the apex becomes marketing-only. Now
    `https://app.firstinqueue.com`, matching `NEXT_PUBLIC_APP_URL`.
  * `src/lib/properties/wordpress-plugin.test.ts` (7 tests) pins the PHP to the
    TS source of truth: key regex agrees with `isWidgetKeyShaped` across 9
    cases, the `printf` template renders **byte-identical** to
    `buildEmbedSnippet`, default host, footer-hook bail-out, uninstall cleanup,
    header version vs `Stable tag`.
  * **Verified:** tsc clean · **140 tests green** (was 78 in this file's older
    note — the suite has grown). **`php -l` has NOT run: no PHP on this box**
    (not installed, not on PATH), so PHP syntax and runtime behaviour are
    unverified, as is anything needing a real WordPress. Directory submission is
    also blocked on `readme.txt` `Tested up to: 6.6` vs current WordPress
    **7.0.2** — test on 7.0.x then bump. See production-readiness §6.

**Next:** block 15 (retire/admin-gate `/api/setup` + docs rewrite). Then the
unexecuted WordPress items above, before any .org submission.

---

**Blocks 1–8 are done and verified. Migrations 013–016 are applied to prod.**

**Full property CRUD exists and the whole loop has run end to end against
prod.** `GET/POST /api/properties`, `GET/PATCH/DELETE /api/properties/[id]`,
`POST /api/properties/[id]/rotate-key` and `/dashboard/properties` — verified
by `next build` + 78 unit tests AND live runs on 2026-07-31 / 2026-08-02 (test
rows cleaned up afterwards):

  no-cookie → 401 · create → 201 · list · config (good Origin → 200,
  foreign Origin → 403) · session → visitor token · message → 202, engine ran,
  reply saved to `messages` · missing-token → 401 · rotate-key → new key ·
  PATCH merges branding without wiping untouched keys · bad domain → 400 ·
  cross-tenant PATCH/DELETE → 404 · DELETE → gone.

**Dev gotcha that cost time:** running `next build` (writes `.next`) then
`npm run dev` (Turbopack) makes every dynamic `[id]` route 404 with an HTML
not-found page until you `rm -rf .next` and restart. See [[project-layout-gotchas]].

**One blocker surfaced, and it is not in this code: the OpenAI key in `.env`
is invalid** (`401 Incorrect API key provided: sk-proj-…K-IA`). It was rotated
during the 2026-07-31 security incident and `.env` was never updated. The
engine handled it correctly — saved the graceful "brief technical issue"
fallback — but **no real AI reply can be produced until the key is replaced.**
That is the single thing standing between here and a working demo.

Two smaller notes from the run:
  * The message path saved the bot fallback **twice** (two identical outbound
    rows). Pre-existing in the web-transport/handler path, not the property
    routes. Worth a look before block 13.
  * This tenant ran `keySource=env, model=gpt-4o` — the free-tier
    `gpt-4o-mini` path (open item 2) is not yet wired to real properties.

The property routes are dashboard-authenticated (`fiq-auth` cookie via
`src/middleware.ts`), **not** public like `/api/widget/*`. Body-supplied
`tenant_id` is ignored; rotation authorizes by `.eq("tenant_id", session…)`.

After that: spec §9 blocks 10 → 11 → 12 (signup + wizard), then 9, 13, 14, 15.

**Read first:** this file, then spec §2 (channel abstraction), §3 (properties),
§6 (security). `AGENTS.md` is not boilerplate — Next.js is 16.2.1 and differs
from training data; read `node_modules/next/dist/docs/` before writing routes.

**Verify commands** (npm root is the doubly-nested `First in Queue/First in Queue`):

```bash
node_modules/.bin/tsc -p tsconfig.json --noEmit && node_modules/.bin/vitest run
```

---

## Blocks

| # | Block | Status |
|---|---|---|
| 1 | Characterization tests, WhatsApp handler path | **Done** — 13 tests |
| 2 | Migration 013 (channels) + channel-aware conversations | **Done, applied to prod** |
| 3 | `ChannelTransport` + WhatsApp adapter | **Done** |
| 4 | Handler refactor to injected transport | **Done** — tests green |
| 5 | Migration 014 (properties) + widget keys | **Done, applied to prod** |
| 6 | `WebTransport` + widget API + security layer | **Done, 015 applied + verified** |
| 7 | Widget chat UI (`/widget/chat`) | **Done** |
| 8 | Loader `widget.js` v2 | **Done** |
| — | **016 — critical RLS fix** | **Done, applied + verified** |
| 9 | Heartbeat verification + diagnostics + stale job | route done; wizard screen pending |
| — | **Property CRUD (GET/POST/PATCH/DELETE) + dashboard page** | **Done + verified live** |
| 10 | Signup + wizard steps 0–4 | **Done + verified live** (write path run against prod, test rows cleaned up) |
| 11 | Crawl-to-FAQ review screen (step 5) | **Done + verified live** (AI FAQ gen + editable review + 4KB-capped commit) |
| 12 | Install + verify screens (steps 6–7) + send-instructions email | **Done + verified live** (diagnosis chain + one-click domain fix) |
| 13 | Dashboard: branding editor + install status + web inbox channel badge | **Done** (branding editor verified live; inbox badge via code+API) |
| 14 | WordPress plugin | **Built + contract-tested** — key-wipe bug fixed, default host pinned. `php -l` / real-WP install / .org submission still pending (production-readiness §6) |
| 15 | Retire `/api/setup` | not started |

## Security incident — 2026-07-31 (resolved)

The `USING (true)` policies from migration 001 applied to PUBLIC, not just the
service role. The **public anon key** (shipped in every client bundle) had full
read **and write** on every table — verified in prod: `tenants.openai_api_key`,
`tenants.whatsapp_access_token`, `users.password_hash`, `agents.invite_token`,
customer PII, and an authorized `PATCH` on `tenants`.

Fixed by `016_fix_rls_anon_exposure.sql`; anon now returns 401 on every table
and every write, service role unaffected. OpenAI and WhatsApp credentials were
rotated. **Never write a policy without a `TO` clause** — service_role bypasses
RLS, so "service role full access" policies are never needed.

## Key decisions made

- **Free tier:** 500 AI replies/month, `gpt-4o-mini`, ~4KB KB cap. `gpt-4o` stays on paid. Measured: free property ≈ $0.20/mo; one Pro funds 145 free properties.
- **Pricing:** $29/mo flat Pro (K499 Zambia) + prepaid usage credit for WhatsApp/voice. Not a volume tier ladder — buyers cannot forecast message volume. Institutions from $500/mo annual.
- **Streaming deferred** to Phase 1.5 (fast-path for plain Q&A only). Phase 1 ships typing indicator + response delay.
- **Voice callback gated to WhatsApp** — web visitors have no phone number.

## Files added

```
src/lib/channels/transport.ts          ChannelTransport, capabilities, NormalizedInboundMessage
src/lib/channels/whatsapp-adapter.ts   normalizeWhatsAppMessage + extractMessageContent
src/lib/channels/web-transport.ts      WebTransport (writes messages rows, Realtime delivery)
src/lib/properties/keys.ts             widget key gen + Origin allowlist  (+ .test.ts)
src/lib/properties/visitor-token.ts    HMAC visitor sessions              (+ .test.ts)
src/lib/properties/guard.ts            resolveByKey/resolveByToken, CORS, durable limits
src/lib/properties/input.ts            property body validation + branding allowlist (+ .test.ts)
src/app/api/widget/{config,session,message,history,heartbeat}/route.ts
src/app/api/properties/route.ts        GET list + POST create (dashboard auth)
src/app/api/properties/[id]/route.ts   GET one + PATCH edit + DELETE (tenant-scoped)
src/app/api/properties/[id]/rotate-key/route.ts
src/app/dashboard/properties/page.tsx  create, copy snippet, edit, rotate, delete
supabase/migrations/013,014,015
```

## Open items

1. **Property editing is built** — `GET/PATCH/DELETE /api/properties/[id]`
   done. PATCH merges a branding patch onto the property's CURRENT branding so a
   partial edit can't reset untouched keys; all queries scoped by
   `.eq("tenant_id", session…)` (cross-tenant edit/delete → 404). The dashboard
   page now edits name + allowed domains and deletes. The §5 heartbeat
   "we saw your widget on X, add it?" one-click fix can now just PATCH
   `allowed_domains` — the wizard screen that calls it is still block 12.
   `parseUpdateProperty` in `src/lib/properties/input.ts` (+ tests, 78 total).
2. ~~**Free ceiling hardcoded** at 500 in `api/widget/message/route.ts`~~ —
   **RESOLVED (2026-08-07).** Now plan-aware: `getWebReplyCeiling(tenantId)` in
   `src/lib/lipila/usage.ts` reads the tenant's active/trialing subscription →
   `PLANS[].webAiRepliesPerMonth` (free 500, basic/business 5,000, enterprise
   50,000 fair-use), and the widget message route passes that into
   `consumeAiReply`. Web replies are a SEPARATE meter from WhatsApp
   `messagesPerMonth`. Fails safe to `FREE_WEB_AI_REPLIES` (500) on no-sub /
   unknown-plan / read error, so the "no unbounded OpenAI bill" invariant holds.
   No migration (reuses `subscriptions` + `widget_consume_ai_reply` RPC). 7 unit
   tests in `src/lib/lipila/usage.test.ts` (147 tests green).
3. **A/B `gpt-4o-mini` vs `gpt-4o`** on Zambian-English and local-language transcripts before committing publicly to the cheap model.
4. **Before 1 Oct 2026:** Meta starts charging per WhatsApp service message. Cap "unlimited" Enterprise, fix the conversations-vs-messages label in `plans.ts`, build overage billing. See pricing doc §7.
5. `/api/widget/transcript` and `/upload` deferred to Phase 1.5.

## Invariants — do not regress

- `saveMessage()` writes `channel` + `external_message_id`; **migrations must precede code deploys** or every message save fails.
- Widget endpoints take `tenantId`/`conversationId` from the **signed token only** — never the request body (IDOR).
- Empty `allowed_domains` = **deny all**, never allow-all. Origin comes from the header, never the body.
- AI ceiling is consumed **before** the model call. Burst limits fail open; the ceiling fails closed.
- Never `select('*')` on `tenants` or `properties` in a widget response — both hold secrets.
