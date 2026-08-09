# v2 pricing - implementation plan

Date: 2026-08-08. Implements [pricing-model-v2.md](./pricing-model-v2.md).
Phase 0 verification was run against the live database on this date; findings
are recorded in §1 and they changed the sequencing.

---

## 0. What this delivers

Move from the volume-tier ladder still live in `src/lib/lipila/plans.ts`
(Free / Basic K499 / Business K1,699 / Enterprise K5,000, each bundling
WhatsApp conversations and voice minutes) to the v2 model:

| | Price | What it is |
|---|---|---|
| **Free** | K0 | Web chat widget, unlimited conversations & seats, 500 AI replies/mo, 1 property, FiQ branding shown |
| **Pro** | K499/mo, K4,990/yr | Branding removed, WhatsApp + voice + actions unlocked, unlimited properties & agents, 5,000 web AI replies/mo |
| **Usage credit** | prepaid packs | WhatsApp and voice draw down per use, above COGS |
| **Institution** | from K5,000/mo, annual | SLA, SSO, audit log, data residency, CSM, custom integrations, capped-and-negotiated usage |

The structural change is that **WhatsApp and voice stop being bundled** and
become metered prepaid credit. That is what turns K499 from a 40% margin line
into an ~89% one, and it is what removes the uncapped liability described in
pricing-model-v2 §2.

`/why-fiq` already tells this story publicly. `/pricing` still renders the old
ladder from `plans.ts`. **The two contradict each other until this lands.**

---

## 1. Phase 0 findings (completed 2026-08-08)

Read-only queries against the live database. Four of the six findings changed
the plan.

### 1.1 The suspected FK blocker is not a blocker - but migrations have drifted

`subscriptions.plan_id` carries `REFERENCES subscription_plans(id)`, and
`supabase/migrations/003_subscriptions_payments.sql` seeds that table with
`free, starter, growth, enterprise`. `plans.ts` uses `free, basic, business,
enterprise`. That looked like every paid insert should fail.

It does not, because the **live table actually contains `free, basic, business,
enterprise`** - it was corrected directly in the database, outside the migration
files.

The real defect is drift: **rebuilding this schema from `supabase/migrations/`
produces a database where every `basic` and `business` subscription violates the
foreign key.** Any new environment, any disaster recovery, any contributor
running migrations locally hits it.

Consequence for v2: adding `pro` and `institution` requires an `INSERT` into
`subscription_plans`, and it must ship as a **real migration file**, not another
console edit. The same migration should reconcile the drifted rows so the
repo and production agree again.

### 1.2 Scale is tiny - the data migration is trivially safe

| | Count |
|---|---|
| Tenants | 6 |
| Subscriptions (all) | 6 |
| Subscriptions (active/trialing) | 4 - three `free`, one `business` |
| Properties (widget installs) | 1, verified |
| Conversations | 7 |
| Messages | 290 |

**One paying subscription exists.** No grandfather path, no phased rollout, no
migration tooling is warranted. The plan-id remap is four rows. This removes
most of the risk normally attached to a pricing migration and argues for doing
the full change in one pass rather than a long compatibility period.

### 1.3 No credit or wallet tables exist

`usage_credits`, `credit_transactions`, `wallets` - none present. Phase 3 is
confirmed greenfield, and it is the largest piece of work in this plan.

### 1.4 Meta has not published the October rates

Meta commits to publishing to-be rates **no later than 1 September 2026** - 24
days from this document. Service messages inside the customer-service window
become chargeable on **1 October 2026** at the same per-message rate as utility
templates in that country. Zambia maps to the *Rest of Africa* region.

So pricing-model-v2 §1's `$0.0068/message` remains an **unvalidated mid
estimate against a documented range of $0.004-$0.0456** - a spread of more than
10x. The WhatsApp credit price cannot be finalised until Meta publishes.

**Action: re-run pricing-model-v2 §1 on 1 September 2026, before Phase 4 sets
the credit rate.**

### 1.5 The replies-per-conversation assumption is not supported by production data

pricing-model-v2 §8 assumes **4-6 replies per conversation**. Observed:

| Metric | Value |
|---|---|
| Bot replies per conversation | **22.7** |
| Messages per conversation (median) | 26 |
| Messages per conversation (distribution) | 1, 1, 8, 26, 127, 127 |
| Outbound bot replies | 136 of 290 messages |

**Caveat, stated plainly: the sample is 6 conversations and is contaminated with
development testing.** The two 127-message threads are almost certainly test
traffic. Excluding them gives a mean nearer 9, which is still above the assumed
4-6. This data cannot confirm a real figure, but it does **not** support 4-6,
and it shows the tail is long.

Why this matters more than its sample size suggests:

- **It is the input to the customer-facing forecast.** `/why-fiq` already
  promises the dashboard will say *"at your current rate, K200 lasts about 3
  weeks."* If that forecast is built on 4-6 and reality is 20+, every estimate
  shown to a customer is wrong by 4x, in the direction that produces angry
  support tickets.
- **It is the input to the Phase 2(b) conversation meter.** How many messages a
  conversation contains determines how different a conversation meter is from a
  message meter, and therefore what a "conversation" allowance should be.
- **It does not threaten margin.** Under v2, WhatsApp is billed per reply at a
  markup, so more replies means more revenue and more cost in the same ratio.
  This is precisely the protection the metered design buys. Under the *current*
  bundled model, the same number would be a margin emergency.

**Action: instrument this properly before Phase 3 sets forecast logic. Measure
against real customer traffic once the widget has volume, and exclude internal
tenants.**

### 1.6 There is no web traffic yet to validate the free tier

282 of 290 messages are WhatsApp. The web widget has **8 messages across 2
conversations** and one verified property - it is new. The 500 free AI
replies/month cap is therefore an untested assumption about a channel with
effectively no production history. It is a safe direction (the cap fails closed
and web replies cost ~K0.011 each), but the number itself is a guess.

---

## 2. Sequencing

Phases 1-3 are pricing-model-v2 §7's non-negotiables and each ships
independently. Phases 4-6 are the model migration and should land **together** -
a half-migrated pricing surface is worse than either end state.

```
Phase 1  Cap the uncapped liability        ships alone, do first
Phase 2  Conversation metering (option b)  ships alone
Phase 3  Usage credit + overage billing    largest; must precede 1 Oct 2026
------------------------------------------ 1 Sep: re-run cost table (§1.4)
Phase 4  Plan structure + migration        ┐
Phase 5  Capability gating                 ├ ship together
Phase 6  Pricing surfaces                  ┘
```

**If anything is cut, cut scope from 4-6, never from 3.** Phase 3 is the only
one with a hard external deadline: without metering in place, October's Meta
fees arrive with no mechanism to recover them.

---

## 3. Phase 1 - Cap the uncapped liability

*pricing-model-v2 §7 item 1. Removes unbounded downside. No dependencies.*

Enterprise currently advertises unlimited voice and **breaks even at 1,425 voice
minutes per month**. One institution running a call centre crosses that without
noticing.

- `plans.ts`: replace the `999999` sentinels on `messagesPerMonth` and
  `voiceMinutesPerMonth` with real allowances, plus a documented contracted
  overage
- Remove "unlimited" next to WhatsApp or voice from every surface:
  `/pricing`, `src/components/landing/pricing-plans.tsx`,
  `src/components/dashboard/checkout-modal.tsx`, dashboard settings
- `/why-fiq` already complies and states the rule explicitly

Ship this even if the rest of v2 slips.

---

## 4. Phase 2 - Meter conversations, not messages (option b)

*pricing-model-v2 §7 item 2.*

Plans advertise *"1,000 WhatsApp conversations"*. `incrementMessageUsage()` in
`src/lib/lipila/usage.ts` fires **once per inbound message**, so a customer
buying 1,000 conversations is cut off after 1,000 messages. Per §1.5 above the
real gap may be far wider than the 6-10x pricing-model-v2 estimated.

**Shipped 2026-08-09** - `supabase/migrations/018_conversation_metering.sql`,
`consumeConversation()` in `src/lib/lipila/usage.ts`. Still to apply in the
Supabase SQL editor; until then the code falls back to the message meter
(Postgres 42883) rather than taking WhatsApp down.

Also fixed in the same pass, found while tracing the meter: **web chat was
being charged against the WhatsApp allowance.** `handler.ts` is shared by both
transports, so every web message ran through `checkMessageUsage` as well as the
widget's own `consumeAiReply` - which capped a Free tenant's website widget at
**5 messages**, against a 500-reply web allowance. The conversation meter is now
skipped for `channel === "web"` entirely.

Decision taken: **meter real conversations** rather than relabel to messages.

- Define the conversation window. **Recommend aligning to WhatsApp's own 24-hour
  customer-service window** - it is the unit Meta bills against from October, it
  is already meaningful to the product, and it makes the meter and the cost
  driver the same shape. A conversation is counted once when it opens; further
  messages inside the window are free.
- Add a conversation-level counter alongside `messages_used`, following the
  atomic RPC pattern already established by `widget_consume_ai_reply` in
  migration 015 (fail closed, unique-violation tolerant).
- Keep `messages_used` recording in parallel through at least one billing cycle,
  so the two meters can be compared on real traffic - this is also how §1.5 gets
  its honest number.
- Update `checkMessageUsage()` and every plan-limit read to consult the new
  meter.

---

## 5. Phase 3 - Usage credit and overage billing

*pricing-model-v2 §7 item 3. Largest build. Greenfield per §1.3. Hard deadline
1 October 2026.*

**Schema**

- `usage_credits` - per-tenant balance held in **ngwee (integer)**, never
  floating point
- `credit_transactions` - immutable ledger of top-ups and draw-downs, with
  source (`whatsapp_reply`, `voice_minute`, `topup`, `adjustment`) and a
  reference to the originating row. The ledger is the audit trail; the balance
  is a cache of it.
- `consume_credit()` RPC - atomic decrement, **fails closed**, mirroring
  `consume_ai_reply`. An unrecoverable third-party bill is worse than a
  temporarily unavailable channel.

**Draw-down hooks (both already exist)**

- Voice: `recordVoiceUsage()`, called from the Retell `call_ended` webhook -
  already the single source of truth for duration
- WhatsApp: the outbound send path in the engine

**Top-up flow**

- Prepaid packs through the existing Lipila mobile-money rails
- Optional auto-top-up, opt-in only
- Zero-balance behaviour must degrade, not error: WhatsApp and voice go quiet,
  web chat keeps working. This mirrors the widget voice button, which already
  hides itself when a tenant's minutes are exhausted.

**Forecast**

The dashboard estimate promised on `/why-fiq` - *"at your current rate, K200
lasts about 3 weeks"* - must be computed from that tenant's **own observed
draw-down rate**, not a modelled replies-per-conversation constant. Per §1.5,
the constant is not trustworthy and the promise is already public.

---

## 6. Phase 4 - Plan structure and data migration

*Blocked on §1.4: do not set the WhatsApp credit rate until Meta publishes on
1 September 2026.*

- Rewrite `plans.ts` to Free / Pro / Institution
- **Migration must insert `pro` and `institution` into `subscription_plans`**
  and reconcile the drift documented in §1.1, so the repo reproduces production
- Remap the four live rows: `basic|business -> pro`, `enterprise ->
  institution`, `free` unchanged
- Rewrite `resolvePlanFromAmount()` in `src/lib/lipila/subscription-helpers.ts`.
  It currently matches on `amount >= price` sorted descending, which silently
  assigns the wrong plan the moment prices change or a partial payment arrives.
  Match on an explicit plan reference carried through the payment instead.

Consumers to update: `src/app/api/payments/initiate/route.ts`,
`src/app/api/payments/confirm/route.ts`, `src/lib/lipila/usage.ts`,
`src/lib/voice/usage.ts`, `src/lib/trial-helpers.ts`,
`src/app/api/subscriptions/route.ts`, `src/app/api/tenants/create/route.ts`,
`src/app/api/auth/signup/route.ts`, `src/app/admin/page.tsx`.

---

## 7. Phase 5 - Gate on capability, not volume

The core v2 shift: Free vs Pro is **branding on/off and WhatsApp/voice
locked/unlocked**, not a message quota.

- `resolveWidgetVoice()` in `src/lib/voice/widget-voice.ts` already gates voice
  on plan - update its `VOICE_PLANS` list to `["pro", "institution"]`
- Branding removal becomes plan-driven. Today `show_branding` is a free-form
  toggle in property branding; on Free it must be forced on and not editable
- Property and agent count limits lift on Pro

---

## 8. Phase 6 - Pricing surfaces

Clears the `/why-fiq` vs `/pricing` contradiction currently live.

`src/app/pricing/page.tsx`, `src/components/landing/pricing-plans.tsx`,
`src/components/dashboard/checkout-modal.tsx`, `src/app/trial-payment/page.tsx`,
dashboard settings billing, onboarding.

Add a credit balance and burn-rate panel to the dashboard - Phase 3's forecast
needs somewhere to live.

---

## 9. Risks

| Risk | Severity | Handling |
|---|---|---|
| Meta rates land at the top of the range ($0.0456) | **High** | Credit price is set after 1 Sep (§1.4). Metered design means the rate passes through rather than compressing margin. |
| Phase 3 slips past 1 Oct 2026 | **High** | It is the only phase with an external deadline. Protect its scope by cutting 4-6. |
| Forecast built on the wrong replies-per-conversation figure | Medium | §1.5. Compute from observed per-tenant draw-down, not a constant. |
| Migration drift bites a rebuild before Phase 4 | Medium | §1.1. Can be fixed immediately and independently. |
| 500 free web replies is the wrong number | Low | §1.6. No web traffic yet; cap fails closed and costs ~K0.011/reply, so the downside is bounded. Revisit once the widget has real volume. |

---

## 10. Immediate next actions

1. ~~Fix the `subscription_plans` migration drift (§1.1)~~ - **done 2026-08-09**,
   `supabase/migrations/017_reconcile_subscription_plans.sql`. Idempotent on both
   a fresh rebuild and the live database, and it asserts that no subscription
   references a missing plan so future drift fails the migration instead of the
   next rebuild. `scripts/sync-plans-to-frontend.sql` is marked superseded.
   **Still to apply in the Supabase SQL editor** - a no-op on production apart
   from the assertion and the Enterprise cap.
2. ~~Phase 1 - strip "unlimited" and cap Enterprise~~ - **done 2026-08-09**.
   Enterprise is 5,000 WhatsApp conversations / 500 voice minutes / up to 10
   numbers, with overage stated as contracted rather than published (no WhatsApp
   rate can be set before §1.4). Voice overage on Basic/Business raised from
   K3.80/min to K7.00/min - the old rate sat 8% above the K3.51 COGS.
3. ~~Phase 2 - meter conversations, not messages~~ - **done 2026-08-09**,
   migration 018. Windows are 24h and aligned to Meta's customer-service window.
   `messages_used` keeps ticking as a shadow meter so the two can be compared.
4. Instrument replies-per-conversation against real traffic, excluding internal
   tenants (§1.5). The shadow meter shipped in Phase 2 is the instrument:
   `conversations_used` vs `messages_used` on the same subscription row, over a
   full billing cycle, excluding internal tenants.
5. **1 September 2026: re-run pricing-model-v2 §1** with Meta's published Rest of
   Africa rates, then set the WhatsApp credit price

Also done 2026-08-09: the FiQ knowledge base quoted WhatsApp overage at
**K0.50/conversation** against `/pricing`'s **K1.70/message**. Reconciled to
K1.70/message and K7.00/minute, so the agent and every pricing surface now
quote the same rates. "Per message" is also the honest label until Phase 2
lands - `incrementMessageUsage()` still meters per message, not per
conversation (§4).
