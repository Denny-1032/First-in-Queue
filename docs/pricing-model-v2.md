# Pricing model v2 — built from measured unit costs

Date: 2026-07-31. Supersedes the pricing table in `src/lib/lipila/plans.ts`.
Companion to [tawk-benchmark-strategy.md](./tawk-benchmark-strategy.md) §6 and
[phase1-spec-widget-and-onboarding.md](./phase1-spec-widget-and-onboarding.md) §11.

---

## 0. The thing that forces this decision

**From 1 October 2026, Meta charges per WhatsApp service message.**

Today, any message your AI sends inside the 24-hour customer-service window is free. That has been true since 1 November 2024 and it is the reason FIQ's WhatsApp economics currently look fine. On 1 October 2026 — **two months from this document** — every reply inside that window becomes billable at the same per-message rate Meta already charges for utility templates.

This is not a price rise to absorb. It changes WhatsApp from a near-zero-marginal-cost channel into the *dominant* line in COGS: the Meta fee is roughly **17× the LLM cost** of generating the reply.

Two consequences fall straight out:

1. **The web widget is the only channel immune to this.** Its marginal cost is LLM tokens alone. That independently validates prioritising Phase 1.
2. **Anything sold as "unlimited WhatsApp" becomes an uncapped liability** on that date.

Exact per-country rates are published by Meta before 1 September 2026. Zambia sits in the *Rest of Africa* region. Everything below uses a **$0.0068/message** mid estimate and is stress-tested against the range.

---

## 1. Measured unit costs

LLM figures are measured from real prod tenant configs (see §3 of the cost model run): ~3,305 input tokens and ~100 output tokens per reply on a typical template-seeded tenant, `gpt-4o-mini`, 70% prompt-cache hit.

| Unit | COGS (USD) | COGS (ZMW @27) | Note |
|---|---|---|---|
| Web chat AI reply | $0.0004 | **K0.011** | LLM only — no third party |
| WhatsApp AI reply — until 30 Sep 2026 | $0.0004 | **K0.011** | Meta service window free |
| WhatsApp AI reply — from 1 Oct 2026 | $0.0072 | **K0.194** | low K0.12 / high K1.24 |
| Voice minute | $0.13 | **K3.51** | Retell all-in (infra+TTS+LLM+telephony) |
| Dashboard, inbox, human-agent chat, seats | ~0 | ~0 | Give away without hesitation |

**Read the spread on that third row.** If Meta prices Rest-of-Africa service messages at the top of the utility band (K1.24), WhatsApp margins invert on every plan below. Re-run this table the day Meta publishes.

---

## 2. What breaks in the current pricing on 1 October

Current plans, evaluated against post-October COGS:

| Plan | Revenue | COGS | Margin | |
|---|---|---|---|---|
| Basic | K499 | K300 | K199 (40%) | survivable |
| Business | K1,699 | K1,393 | K306 (**18%**) | **too thin** |
| Enterprise "unlimited" | K5,000 | K2,727 @ 5k msg/500 min | K2,273 (45%) | **uncapped downside** |

**Enterprise breaks even at 1,425 voice minutes/month.** It is sold as *unlimited voice*. One heavy account past that line is pure, unbounded loss — and an institution running a call centre will blow through it without noticing.

Two more defects, independent of Meta:

- **The free tier is not a free tier.** 5 messages and 3 voice minutes is a demo that expires before anyone forms a habit. The strategy doc already flags this (line 101: *"nothing to seed adoption with"*).
- **Unit mismatch in the meter.** Plans advertise *"1,000 WhatsApp conversations"* but `incrementMessageUsage()` fires once per inbound message. A customer expecting 1,000 conversations (6–10 messages each) gets cut off at 1,000 messages — roughly 6–10× earlier than the label implies. That is a refund-and-churn generator. Fix the wording or fix the meter, before scale makes it loud.

---

## 3. The principle

> **Give away what costs nothing. Meter what a third party bills you for. Price institutions on value, not cost.**

Three cost classes, three treatments — mixing them is what produces thin margins:

| Class | Examples | Treatment |
|---|---|---|
| Zero marginal cost | dashboard, inbox, human-agent web chat, seats, properties | **Free forever, unlimited.** This is the distribution engine. |
| Small marginal cost | web-chat AI replies | **Generous free allowance**, then cheap. K0.011 buys a lot of goodwill. |
| Real pass-through | WhatsApp messages (Meta), voice minutes (Retell+telco) | **Metered, never unlimited.** Include a modest allowance, charge overage at ~2× COGS. |
| Sales-cost | SLA, SSO, audit, data residency, integrations, training | **Institutional contracts.** Priced on value. |

---

## 4. Recommended structure

### 4.1 Why this is not a tier ladder

A volume ladder (Starter / Growth / Business, each with a message quota) fails at the moment of purchase: **no first-time buyer knows how many messages or voice minutes they need.** Forcing that forecast is the single biggest source of friction in a self-serve funnel, and it is precisely what tawk.to avoids.

tawk.to sells no volume tiers at all. It sells *named capabilities* at flat rates:

| tawk.to | Price |
|---|---|
| Remove branding | $29/mo |
| AI Assist | $29/mo **+ message credits** |
| **Both** | **$58/mo + credits** |

They can price capability flat because their marginal cost is ~zero. **Flat pricing is a privilege of zero COGS** — it does not transfer to WhatsApp messages or voice minutes, which are real third-party pass-throughs. Selling those flat-unlimited rebuilds exactly the uncapped liability described in §2.

Note also that tawk.to's AI add-on is *"$29/mo **plus message credits**"* — the category leader already meters AI consumption on top of a flat fee. The structure below is not a compromise; it is what the market already validates.

So the split follows cost structure, not packaging taste:

| Cost | Items | Pricing |
|---|---|---|
| Zero | branding removal, extra agents, extra properties, seats, tool-calling actions | **Flat** — never meter |
| Trivial (K0.011) | web-chat AI replies | **Flat**, fair-use cap |
| Real pass-through | WhatsApp messages, voice minutes | **Metered** — no other option |

Everything is flat *except* the two things a third party bills us for.

### 4.2 Answering "how much do I need?" — don't make them answer it

Go **prepaid**. Zambia's native payment model already is: airtime, ZESCO units, mobile money. Nobody asks *"which electricity plan suits my usage?"* — they buy K200 of units and top up when low. Lipila is mobile-money based, so this rides existing rails.

The customer never forecasts. The dashboard forecasts *for* them, from real traffic after they have started: **"At your current rate, $10 lasts about 3 weeks."** That is an honest estimate from data, not a guess demanded before signup.

### 4.3 The price card

Priced **global-first** — nothing about a web chat widget is Zambia-specific, and local-language support is a differentiator rather than a limit. USD is list; ZMW is a PPP-adjusted local rate on mobile money.

| | Price | What it is |
|---|---|---|
| **Free** | **$0** | Web chat, unlimited conversations & seats, **500 AI replies/mo**, 1 property, 1 agent, KB cap ~4KB, **FIQ branding shown** |
| **Pro** | **$29/mo** (K499 in Zambia) | Branding removed, WhatsApp + voice + actions unlocked, unlimited agents & properties, 5,000 web AI replies/mo |
| **Usage credit** | prepaid packs $10 / $25 / $50 / $100 | WhatsApp **$0.015**/reply · Voice **$0.25**/min · optional auto-top-up |
| **Institution** | from **$500/mo**, annual | SLA, SSO, audit log, data residency, dedicated CSM, on-site training, custom integrations, **capped-and-negotiated** usage |

Annual Pro: **$290/yr** (2 months free). Zambia: K4,990/yr.

**Two questions, both answerable on day one without any data:** *Branded or not?* and *Do I want WhatsApp?* No volume forecast anywhere in the purchase decision.

### 4.4 Why $29

- tawk.to charges **$58** for branding removal + AI. Pro delivers both, plus WhatsApp, voice, tool-calling and local languages, for **half**. That is a sharper sales line than $20 of extra ARPU.
- Sits inside the global SaaS band for this category ($19–49), so no repricing is needed when selling outside Zambia.
- **$19** would price FIQ *below* tawk.to's branding-only line — a product that does far less — and makes the jump to $500 institutional look arbitrary.
- **$49** is defensible on features but forfeits the "half of tawk.to" anchor.

### 4.5 Margins

| Line | Price | COGS | Margin |
|---|---|---|---|
| Pro flat | $29 | ~$0.60 (5,000 web replies) | **~98%** |
| WhatsApp reply | $0.015 | $0.0072 | **108%** |
| Voice minute | $0.25 | $0.13 | **92%** |
| Free property | $0 | ~$0.20 | acquisition cost |

**One Pro subscription funds 145 free properties.** The free tier is not a cost centre at this price — it is advertising with a 145:1 coverage ratio.

**Never print the word "unlimited" next to WhatsApp or voice.** Unlimited is only safe on the zero-cost class.

### 4.6 The trade-off, stated plainly

Prepaid usage weakens MRR predictability, which is worse for investor optics than clean recurring subscriptions. The $29 flat fee exists partly to preserve a recurring baseline, with usage riding on top. That hybrid is worth more than five tiers nobody can self-select into.

---

## 5. Why free-branded is right for Zambian SMEs

K499/month is real money for a small Zambian business, and most will never pay it. Trying to convert them is a losing fight. But serving them costs **K0.011 per reply**:

| Free properties | Total monthly cost |
|---|---|
| 100 | K540 |
| 1,000 | K5,400 |
| 5,000 | K27,000 |

Five thousand Zambian businesses running FIQ costs less per month than one Business subscription earns — and every one of them displays *"Powered by First in Queue"* to every customer who opens the chat.

**That is the institutional sales channel.** A procurement officer at ZRA, Zanaco, or a ministry does not read cold emails; they notice the widget they have already used on six local sites. The free tier is not charity and it is not a trial — it is the cheapest brand distribution available, and it funds itself at **one Pro subscription per 145 free properties** (`gpt-4o-mini`, measured).

This is exactly the mechanic behind the user's instinct, and the numbers support it: **free-branded for SMEs, value-priced for institutions.**

---

## 6. The institutional play

Institutions are the profit centre. They do not buy AI replies; they buy risk reduction:

- **Uptime SLA** with penalties
- **Data residency and retention** commitments — decisive for a revenue authority handling TPINs
- **SSO, audit logging, RBAC** — mandatory for public-sector procurement
- **Named support and on-site training**
- **Custom integration** into POS/ERP/CRM/tax systems
- **Local-language coverage** (Bemba, Nyanja, Tonga) — a differentiator no global vendor offers

COGS on these deals is a rounding error against contract value; margins are 80%+. Price on the cost of *their* alternative (a call centre, or staff answering the same question 400 times a day), never on token cost.

Sell annual, invoice-friendly contracts. Procurement cannot process a K1,299 card charge, but it can process a K180,000 annual PO.

---

## 7. Before 1 October 2026

Ordered, and the first three are non-negotiable:

1. **Cap Enterprise.** Remove "unlimited WhatsApp/voice" from `plans.ts` and every marketing surface. Replace with a stated allowance plus contracted overage. This is the uncapped-liability fix.
2. **Fix the conversations-vs-messages label.** Either meter conversations or advertise messages. Currently the meter is ~6–10× stingier than the label.
3. **Build usage metering + overage billing.** Per-message counters exist; overage pricing and invoicing do not. Without this, October's Meta fees land with no way to recover them.
4. **Re-run §1 the day Meta publishes Rest-of-Africa rates** (before 1 Sep 2026). If service messages land near the top of the utility band, WhatsApp allowances must shrink.
5. **Ship the web widget** (Phase 1, Block 6). It is the only channel unaffected by the Meta change and the only one where free is genuinely free.
6. **A/B `gpt-4o-mini` vs `gpt-4o`** on real Zambian-English and local-language transcripts before committing publicly to the cheap model.

---

## 8. Assumptions to verify

| Assumption | Value | Risk |
|---|---|---|
| Meta service-message rate, Rest of Africa | $0.0068 | **High** — range $0.004–$0.0456; published before 1 Sep 2026 |
| USD→ZMW | 27 | Medium — moves |
| Retell all-in voice | $0.13/min | Medium — $0.07 base, $0.13–0.31 real |
| LLM cost/reply | $0.0004 | **Low** — measured from real configs |
| Replies per conversation | 4–6 | Medium — prod sample is only 282 messages, pre-launch |

---

## Sources

- [Meta — WhatsApp Business Platform pricing](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing)
- [WhatsApp service-message charges from October 2026](https://www.hello-charles.com/blog/whatsapp-service-message-pricing-what-changes-in-2026)
- [OpenAI API pricing](https://developers.openai.com/api/docs/pricing)
- [Retell AI pricing](https://www.cloudtalk.io/retell-ai-pricing/)
