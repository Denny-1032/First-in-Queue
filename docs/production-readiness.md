# Production readiness checklist

Everything here needs a real browser, a real WordPress install, or real people —
none of it can be verified from the dev box. Work top to bottom; each item states
the command and the threshold that counts as a pass.

Spec references are to [phase1-spec-widget-and-onboarding.md](./phase1-spec-widget-and-onboarding.md).
Build status is in [phase1-progress.md](./phase1-progress.md).

npm root is the doubly-nested `First in Queue/First in Queue`.

---

## 0. Automated gate (run first, every time)

```bash
node_modules/.bin/next typegen && node_modules/.bin/tsc -p tsconfig.json --noEmit && node_modules/.bin/vitest run
```

Pass: tsc exits 0, **133+ tests green**.

Two known traps:
- Run `next typegen` first after any `.next` wipe, or tsc fails on the generated
  `RouteContext` global in the dynamic `[id]` routes.
- **Do not run tsc while `next dev` is running.** The dev server rewrites
  `.next/dev/types/routes.d.ts` and a concurrent read sees a torn file (dozens of
  bogus TS1005/TS1109 errors). Stop the server, `rm -rf .next/dev`, re-run.

---

## 1. Environment parity (before every deploy)

Every var below is read by code. Compare against Vercel → Project → Settings →
Environment Variables.

| Var | Unset ⇒ |
|---|---|
| `AUTH_TOKEN_SECRET` | **Deploy is unsafe.** Falls back to `SUPABASE_SERVICE_ROLE_KEY`; if that is also missing the app now *throws* rather than signing with the public repo constant. |
| `SUPABASE_SERVICE_ROLE_KEY` | All server DB access fails. |
| `NEXT_PUBLIC_SUPABASE_URL` | Same. |
| `OPENAI_API_KEY` | Every AI reply falls back to the "technical issue" message. |
| `RESEND_API_KEY` | Install-instruction emails, team invites and stale-install alerts silently no-op (`sent: false`). |
| `ADMIN_PASSWORD` | **Deploy is unsafe without it.** The `/admin` panel administers every tenant; the code used to fall back to a password published in this repo. It now returns 503 for all admin logins in production when unset — set a strong unique value. |
| `ADMIN_EMAILS` | Defaults to `admin@firstinqueue.com`. Set to your real superadmin address(es), comma-separated. |
| `CRON_SECRET` | Cron routes reject. `stale-installs` returns 503 in production rather than running unauthenticated. |
| `NEXT_PUBLIC_APP_URL` | Snippet/embed URLs fall back to the request origin. |
| `WIDGET_TOKEN_SECRET` | Optional; visitor tokens fall back to `AUTH_TOKEN_SECRET`. Rotating it invalidates open widget chats. |
| `NEXT_PUBLIC_FIQ_WIDGET_KEY` | Wizard's dogfood panel shows its static preview instead of a live widget. |
| `ONBOARDING_FAQ_MODEL` | Defaults to `gpt-4o-mini` (the costed free-tier choice). |

Quick diff of what the code reads vs what `.env.example` documents:

```bash
grep -rhoE 'process\.env\.[A-Z0-9_]+' src | sort -u | sed 's/process\.env\.//' > /tmp/used.txt
grep -oE '^[A-Z0-9_]+' .env.example | sort -u > /tmp/documented.txt
comm -23 /tmp/used.txt /tmp/documented.txt
```

Pass: no var used in code is missing from `.env.example` (a few build-ins like
`NODE_ENV` are expected and fine).

**Also confirm in the Vercel dashboard:** the GitHub Actions repo secret
`CRON_SECRET` matches the Vercel value, and repo variable `APP_URL` is the
production base URL. The stale-install and booking-reminder workflows both fail
loudly (exit 1) on a non-200, so a mismatch shows up in the Actions tab.

---

## 2. Migrations before code

**Invariant:** `saveMessage()` writes `channel` + `external_message_id`.
Migrations must be applied **before** the code that depends on them or every
message save fails.

Confirm 013–016 are applied to prod, then deploy. `016_fix_rls_anon_exposure.sql`
is the security fix from the 2026-07-31 incident and is not optional.

---

## 3. Accessibility (spec §10: Lighthouse 95+)

```bash
npx lighthouse https://<prod-host>/widget/chat --only-categories=accessibility --chrome-flags="--headless" --output=json --output-path=/tmp/a11y.json
```

Pass: score **≥ 95**.

Then the part Lighthouse cannot check — do it manually:
- Full keyboard operation: Tab reaches the launcher, Enter opens, focus moves
  into the panel, Esc closes, focus returns to the launcher. No focus trap.
- Screen reader (NVDA on Windows / VoiceOver on macOS): the launcher announces a
  name, new bot messages are announced, and the input has a label.
- Visible focus ring on every interactive element at the customer's brand colour.

---

## 4. Loader budget (spec §10: <15KB gzipped, <50ms added load)

```bash
gzip -c public/widget.js | wc -c
```

Pass: **< 15360 bytes**. Last measured **4,894 bytes** — comfortable headroom, so
treat a sudden jump as a regression to investigate, not just a threshold check.

For the 50ms claim, load a host page with and without the snippet in Chrome
DevTools → Performance and compare `DOMContentLoaded`.

---

## 5. Cross-platform render

Install the snippet and confirm the bubble appears, opens, and completes one AI
reply on each:

- [ ] WordPress (via the plugin, §6 below)
- [ ] Shopify (`theme.liquid`, before `</body>`)
- [ ] Wix (Custom Code → body end)
- [ ] Squarespace (Code Injection → Footer)
- [ ] Plain static HTML

Check mobile Safari and Chrome Android too — most Zambian traffic is mobile.

---

## 6. WordPress plugin (before any .org submission)

No PHP runtime exists on the dev box (`php` is not installed and not on PATH),
so this has **never been executed**:

```bash
php -l wordpress-plugin/first-in-queue/first-in-queue.php
php -l wordpress-plugin/first-in-queue/uninstall.php
```

What *is* covered from here: `src/lib/properties/wordpress-plugin.test.ts` pins
the plugin's PHP literals to the TypeScript source of truth — key regex vs
`isWidgetKeyShaped`, the `printf` template vs `buildEmbedSnippet` (byte-identical),
`FIQ_DEFAULT_HOST`, the footer-hook bail-out, uninstall cleanup, and header
version vs `Stable tag`. That catches drift, **not** PHP syntax or runtime
behaviour. `php -l` is still required.

Then on a real WordPress install:
- [ ] Activate; Settings → First in Queue Chat appears.
- [ ] Saving a malformed key is rejected with the inline error, and **the
      previously saved key is still there** (a typo must not take a live
      widget offline). Clearing the field is the way to switch the widget off.
- [ ] Saving a valid `fiq_live_…` key renders the snippet in the page source.
- [ ] Deleting the plugin removes the `fiq_options` row.
- [x] Default widget host matches where `/widget.js` is actually served —
      verified 2026-08-03: `https://app.firstinqueue.com/widget.js` → 200
      (`https://firstinqueue.com/widget.js` also 200, same 7,715 bytes).
      `FIQ_DEFAULT_HOST` is pinned to the app origin, matching
      `NEXT_PUBLIC_APP_URL`, and asserted by test.
- [ ] **Before .org submission:** `readme.txt` says `Tested up to: 6.6` but the
      current WordPress release is **7.0.2** (checked 2026-08-03). Test on
      7.0.x, then bump `Tested up to` — do not bump it untested; the directory
      treats that field as a claim you actually tested.

---

## 7. Security spot-checks

**Cross-origin key use (spec §10).** Take a real property key whose allowlist is
`example.com` and call from a non-allowlisted origin:

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST https://<prod-host>/api/widget/session \
  -H "Content-Type: application/json" -H "Origin: https://not-allowed.test" \
  -d '{"key":"fiq_live_..."}'
```

Pass: **403**. The heartbeat endpoint is the deliberate exception — it records
rejected origins (200 with `reason: origin_not_allowed`) so the verify screen can
offer the one-click domain fix.

**Anon-key RLS (2026-07-31 incident regression check).** With the public anon key,
every table must refuse reads and writes:

```bash
curl -s -o /dev/null -w "%{http_code}\n" \
  "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/tenants?select=openai_api_key&limit=1" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY"
```

Pass: **401**. Repeat for `users`, `agents`, `properties`, `messages`.
Never write an RLS policy without a `TO` clause — that is what caused the
incident.

**Superadmin login.** Confirm `ADMIN_PASSWORD` is set in Vercel and that the
repo's development default (`FiQ@dmin2024!` with `admin@firstinqueue.com`) does
**not** work against production:

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST https://<prod-host>/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@firstinqueue.com","password":"FiQ@dmin2024!"}'
```

Pass: **401** (wrong credentials) or **503** (not configured). A 200 means the
published default is live — rotate immediately.

**Auth secret fail-fast.** Covered by unit tests
(`src/lib/auth/secret.test.ts`): with neither secret set and
`NODE_ENV=production`, signing throws instead of using the public constant.
Confirm the deploy has `AUTH_TOKEN_SECRET` set (see §1) so this never trips.

---

## 8. The five-minute test (spec §10 — the real gate)

Five people who have never seen First in Queue and are **not developers**. Each
signs up and gets the widget answering questions about their own business, on
their own site, having spoken to nobody.

Rules: watch, do not help. Time each run. Write down every hesitation — each one
is a bug, not a user error.

Pass: **5/5 reach a verified widget in under five minutes.**

---

## 9. Activation metrics (confirm they flow in prod)

All nine §10 events write to `analytics_events`. After the first real signups:

```sql
select event_type, count(*), min(created_at), max(created_at)
from analytics_events
where created_at > now() - interval '7 days'
group by event_type order by 2 desc;
```

Expect: `signup_started`, `signup_completed`, `wizard_step_completed`,
`crawl_completed`, `snippet_copied`, `instructions_emailed`, `widget_installed`,
`first_conversation`, `first_ai_resolution`.

**Activation = `widget_installed`.** Time-to-activation is measured from
`signup_completed`. The number that matters most is the drop-off between
`snippet_copied` and `widget_installed` — both carry `property_id`, so:

```sql
select
  count(*) filter (where event_type = 'snippet_copied')   as copied,
  count(*) filter (where event_type = 'widget_installed') as installed
from analytics_events where created_at > now() - interval '30 days';
```

Known limitation: `signup_started` is written at signup *completion* carrying the
client's page-load timestamp, because `analytics_events.tenant_id` is NOT NULL and
no tenant exists before signup. It measures time-on-form accurately but does
**not** capture people who abandon before creating an account — that needs
client-side analytics.

---

## 10. Post-deploy smoke (first 15 minutes)

- [ ] Sign up a real throwaway account end to end; delete it afterwards.
- [ ] One web chat produces exactly **one** bot reply (no duplicates) — the
      regression that shipped before the hardening pass.
- [ ] `select channel, count(*) from messages group by 1` — web conversations
      report `web`, not `whatsapp`.
- [ ] WhatsApp still replies normally (characterization tests cover the code path,
      but confirm one real message).
- [ ] Trigger the stale-install workflow manually from the Actions tab; expect
      HTTP 200 and `checked/flipped/emailed` counts.
- [ ] Watch Vercel logs for `[analytics]` warnings — tracking failures are
      swallowed by design, so they only surface here.
