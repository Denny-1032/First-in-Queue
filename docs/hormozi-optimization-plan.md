# FiQ Website Optimization Plan — Hormozi Principles
## Focus: Pain → Outcome, Not Features

**Goal:** Shift the website from "what FiQ does" to "what your business looks like after using FiQ" while maintaining the clean, professional, unoverwhelming aesthetic.

---

## Change 1: Fix Pricing Page — Server-Side Render

**File:** `src/app/pricing/page.tsx`
**Problem:** Page is `"use client"` — returns empty to crawlers, AI tools, and link previews.
**Hormozi Principle:** Remove friction in the buying path.

**Plan:**
- Extract the static layout (hero, plan cards, FAQs, guarantee callout, CTA) into a server component.
- Move only the billing toggle into a small client component (`<BillingToggle />`).
- Default render shows monthly prices in static HTML — K499, K1,699, Custom — so crawlers and slow connections always see pricing.
- The toggle still works client-side for yearly display.
- No visual changes — same card layout, same guarantee badge, same FAQs.

**Why this matters:** Every prospect who clicks "Pricing" and sees nothing leaves forever. This is the single most revenue-blocking issue.

---

## Change 2: Add ROI Comparison Table to Homepage

**File:** `src/app/page.tsx`
**Location:** New section between "Sound familiar?" (line ~130) and "How FiQ solves it" (line ~132).
**Hormozi Principle:** Price anchoring — anchor against the real alternative before the prospect ever sees a number.

**Content:**
- Clean, minimal table comparing **Human Support Agent** vs **FiQ**:

| | Human Support Staff | FiQ |
|--|--|--|
| Monthly cost | K3,000–5,000 | From K499 |
| Available hours | 8hrs/day, 5 days | 24/7, 365 days |
| Concurrent chats | 1 at a time | Unlimited |
| Response time | Minutes to hours | Under 10 seconds |
| Languages (chat) | 1–2 | 40+ |
| Sick days / leave | Yes — business stops | Never |
| Setup time | Weeks of hiring + training | 1–2 business days |

- One anchor sentence below: *"Most businesses save K2,500–4,500 every month. FiQ pays for itself in the first week."*

**Visual approach:**
- Rounded card (`rounded-2xl border border-gray-200`) wrapping a clean table.
- Emerald text for FiQ column values — subtle, not flashy.
- No background color on the section — white, consistent with surrounding sections.
- Mobile: stack as two-column cards instead of a wide table.

---

## Change 3: Add 30-Day Guarantee to Homepage

**File:** `src/app/page.tsx`
**Hormozi Principle:** Risk reversal — remove the last objection standing between prospect and action.

**Two placements:**
1. **Hero section** (after the "5-minute setup / No technical skills / Free demo" trust badges, ~line 96):
   Add a single quiet line:
   ```
   30-day money-back guarantee. Try it risk-free.
   ```
   Styled as `text-xs text-gray-400` — not shouty, just present.

2. **Final CTA section** (the green gradient block, ~line 340):
   Add below the subtitle:
   ```
   30-day money-back guarantee — if it doesn't work, every kwacha back.
   ```
   Styled as `text-sm text-emerald-200` — matches the existing emerald-100 subtitle tone.

**Why two placements:** First one is subtle reassurance at the decision point. Second one catches anyone who scrolled the whole page and is still on the fence.

---

## Change 4: Rewrite Industries Page — Pain → Outcome First

**File:** `src/app/industries/page.tsx`
**Problem:** Every section leads with features (what FiQ does) instead of pain and outcome (what happens to the business).
**Hormozi Principle:** People buy outcomes, not features.

**Structural change per industry card:**

Current data model:
```tsx
{ emoji, name, tagline, description, useCases[] }
```

New data model:
```tsx
{ emoji, name, pain, outcome, useCases[] }
```

- **`pain`** replaces `tagline` + `description` — a 2-3 sentence paragraph that names the specific business pain and quantifies the cost.
- **`outcome`** — one sentence on the specific result after using FiQ, with a number.
- **`useCases`** stay as-is — they become the proof that the outcome is achievable.

**Per-industry content:**

1. **E-Commerce**
   - Pain: "A customer asks about delivery times at 8pm. No one answers. They buy from the shop that replied first. Every unanswered WhatsApp message is a lost sale — and most e-commerce businesses lose dozens every week without realising it."
   - Outcome: "FiQ handles order enquiries, stock checks, and delivery updates instantly — day or night. Stores typically recover 30–40% of otherwise lost after-hours sales."

2. **Healthcare**
   - Pain: "Your clinic misses appointment bookings every evening after 5pm. Patients call, get no answer, and book somewhere else — or worse, they no-show because no one reminded them. The average clinic loses K15,000–25,000 a month to no-shows alone."
   - Outcome: "FiQ sends automated reminders and handles bookings 24/7. Most clinics see no-shows drop by 25–40% in the first month."

3. **Restaurants**
   - Pain: "The phone rings during dinner service and no one picks up. The customer books elsewhere. You never even knew they called. Empty tables on a Friday night are not a capacity problem — they are a response time problem."
   - Outcome: "WhatsApp reservations increase when customers can book instantly at any hour. Your staff stays focused on service, not answering phones."

4. **Real Estate**
   - Pain: "A lead messages at 7pm asking about a listing. Your office is closed. By morning, they have already viewed a property with another agent. In real estate, one missed lead can mean K10,000–50,000 in lost commission."
   - Outcome: "Capture and qualify 100% of leads, day or night. Agents start every morning with pre-screened enquiries in their inbox."

5. **Education**
   - Pain: "A parent sends a WhatsApp at 9pm asking about school fees and enrollment. No response until Monday. By then, they have already enquired at two other schools. Every delayed response is a delayed enrollment — or a lost one."
   - Outcome: "Parents get instant answers when they ask, not when your office opens. Schools using FiQ see measurable improvements in enrollment conversion rates."

6. **Travel & Hospitality**
   - Pain: "A guest in a different time zone needs help at 3am your time. No one answers. They leave a bad review. In hospitality, one bad review costs more than a dozen good ones can recover."
   - Outcome: "24/7 guest support across all time zones. Enquiries handled instantly, in the guest's language."

7. **Finance**
   - Pain: "A client sends an urgent query about a suspicious transaction at 10pm. Your team sees it at 8am the next day. In financial services, delayed responses erode trust faster than any competitor can."
   - Outcome: "Instant acknowledgement and escalation for sensitive queries. Routine account questions handled automatically, around the clock."

8. **SaaS & Technology**
   - Pain: "Support tickets pile up overnight. A frustrated user churns before your team even reads the ticket. Each churned customer is months of recurring revenue gone — not because your product failed, but because your support was asleep."
   - Outcome: "Resolve the majority of support tickets automatically. Reduce response time to seconds while keeping complex issues routed to the right human."

**Visual approach — layout change:**
- The card layout stays clean and card-based.
- Replace the current `tagline` (small green text) + `description` (gray paragraph) with:
  - **Pain block:** 2-3 sentences in gray-600 text. No special background — just the text. Honest and direct.
  - **Outcome block:** 1 sentence in emerald-600 font-medium, separated by a subtle divider. This is the payoff line.
- Use cases remain as the existing checkmark list below.
- No colored backgrounds for pain/outcome — keep it clean. The words do the work.

---

## Change 5: Rebuild About Page — Story, Philosophy, Numbers, Guarantee

**File:** `src/app/about/page.tsx`
**Problem:** Current page is a placeholder — 3-word tagline, 4 small tiles, generic stats, and a CTA. No story, no substance, no reason to trust.
**Hormozi Principle:** Named founders with a real story = accountable humans. The About page is where trust is built or broken.

### Gold extracted from the sample design (adapted to FiQ's clean white aesthetic):

The About page will have **6 sections**, each earning its place:

---

#### Section 1: Hero — Pain-Led Headline
**Current:** "Fast. Efficient. Instant." — says nothing about the customer's problem.
**New:** Lead with the pain that started the company.

- **Headline:** "Every missed message is a missed sale."
- **Subtitle:** "We built FiQ because we watched good Zambian businesses lose customers every night — not because they had a bad product, but because no one answered the WhatsApp at 9pm."

**Visual:** Same clean hero as existing site — white bg, centered text, emerald gradient on key word. No background images or dark themes.

---

#### Section 2: The Problem We Set Out to Solve
**Purpose:** Establish the market context. Make the reader feel seen.

**Content (adapted from sample):**
> In Zambia, WhatsApp is how customers contact businesses. It is not a secondary channel — it is the channel. And most businesses handle it manually, on a single phone, during business hours only.
>
> That means every enquiry after 5pm goes unanswered until morning. By then, the customer has moved on. They did not wait.
>
> The irony is that most of these businesses are doing everything else right. The product is good. The price is fair. The service is solid. They are losing customers not to a bad offering — but to a gap that should not exist.
>
> **That is the gap FiQ was built to close.**

**Right side:** Stats stack (existing stats, but with context):
- **78%** — "Auto-resolution rate. 78 out of 100 conversations fully resolved by AI with zero human involvement."
- **<10s** — "Average first response. Not minutes. Not hours. Under 10 seconds, at 3am or 3pm."
- **40+** — "Languages. Auto-detected. Your customers answered in the language they are most comfortable with."
- **24/7** — "Always operational. No holidays. No sick days. No lunch breaks."

**Visual:** Two-column layout on desktop (text left, stats right). On mobile, text first, then stats stacked. Gray-50 background section. Stats in clean bordered cards — no gradient backgrounds.

---

#### Section 3: The Founding Story
**Purpose:** Give the company a human face. This is the trust-building section.

**Content (adapted from sample):**
> Codarti is a Zambian technology company. We build software for African businesses.
>
> **The pattern is this:** a business invests years building something real. They develop a strong product, earn loyal customers, and build a reputation through hard work. Then they plateau — not because demand dried up, but because they cannot keep up with the enquiries. WhatsApp is overflowing. Messages are going unanswered. Bookings are lost to businesses that happened to reply first.
>
> The usual solution is to hire someone to manage messages. But a support agent in Zambia costs K3,000–5,000 per month, covers eight hours a day, takes leave, and needs management. You solve one problem and create four more.
>
> **We built FiQ because the better solution already existed — it just was not accessible to Zambian businesses.** The technology to handle customer conversations automatically, intelligently, and affordably was available. We connected it to WhatsApp, configured it for the local market, priced it in kwacha, built mobile money payments in, and made it so that any business owner — not just developers — could use it.
>
> No foreign currency. No complicated setup. No IT department required. The FiQ team handles the entire technical configuration. You provide your business information. We do everything else.

**Closing line (styled larger, with top border):**
> Enterprise-level customer care should not require an enterprise-level budget or an enterprise-level IT team. Every business doing good work deserves to respond like the best companies in the world.

**Visual:** Two-column layout — narrow left sidebar with section heading + a pull quote, wider right column for the story text. On mobile, single column. Clean white background.

**Pull quote (left sidebar):**
> *"The problem was never the product. It was always the response time."*
> — Codarti, Lusaka

Styled with a left emerald border and light emerald-50 background — subtle, not overwhelming.

---

#### Section 4: The Numbers, Honestly Stated
**Purpose:** Prove the claims with real data. Build confidence through transparency.

**Content:**
- **78%** — "Auto-resolution rate. 78 out of 100 customer conversations fully resolved by AI with zero human involvement."
- **<10s** — "First response time. Average time from customer message to first FiQ response, across all conversations."
- **40+** — "Languages. Automatically detected and matched — including all major Zambian languages for text chat."
- **30-day** — "Guarantee. Full refund if FiQ does not deliver for your business. No questions. No forms."

**Intro text:** "We do not put made-up statistics on our site. Every number here reflects real performance across actual FiQ customers, as of April 2026."

**Visual:** Emerald-500 background section (the site's existing gradient). White text. 2x2 grid of stat cells with dark (gray-900) backgrounds — creates contrast. Each cell has the big number, a label, and a one-line context sentence.

---

#### Section 5: How We Operate — Philosophy Cards
**Purpose:** Communicate values through principles, not generic mission statements.

**Six principles (adapted from sample, trimmed to the gold):**

1. **"The business owner should not need a developer"**
   Every feature in FiQ was designed for someone running a real business — not someone who writes code. The FiQ team handles technical setup. Full stop.

2. **"Price in kwacha. Pay in kwacha. Always."**
   Foreign software that charges in USD creates an invisible tax on Zambian businesses. FiQ prices in ZMW and accepts Airtel Money, MTN, Zamtel, and card. No exchange rate surprises.

3. **"The AI should never lie to a customer"**
   If the answer is not in your knowledge base, FiQ tells the customer a human will follow up — it does not guess or invent. A wrong answer damages your reputation far more than a slight delay.

4. **"The risk should be on us, not on you"**
   Try it for 30 days. If it does not work, every kwacha comes back. No questions. No forms. We built the product well enough to stake that on it.

5. **"Local context is not optional — it is the product"**
   FiQ was built in Lusaka. We understand that a clinic in Chelston operates differently to a retail shop in Kitwe. That local understanding is not a feature — it is foundational.

6. **"Human agents matter — FiQ works with them"**
   FiQ handles the 80% of conversations that are routine. The moment something needs human judgment, the conversation is handed over immediately with full context. AI and humans work together.

**Visual:** 3x2 grid of cards on desktop, single column on mobile. White background, bordered cards (`rounded-2xl border border-gray-200`). Each card has a large faded number (01–06 in emerald-100), bold title, and body text. Clean, no background colors per card. Hover: subtle shadow.

---

#### Section 6: 30-Day Guarantee + CTA
**Purpose:** Risk reversal as the final push before the CTA.

**Content:**
- Left: A clean circular badge — "30" large, "Day Money-Back Guarantee" label, "On every paid plan. No questions asked." sub-text. Styled with emerald border and subtle emerald-50 background.
- Right: Text block:
  > Every paid FiQ plan comes with a 30-day money-back guarantee. If you sign up, use the product, and genuinely find it does not work for your business within 30 days, you receive every kwacha back.
  >
  > **One email to support@codarti.com. Full refund. No questions. No lengthy process.**

  Followed by 4 bullet points:
  - Applies to Basic, Business, and Enterprise paid plans
  - No free trial required — start with the permanent free tier or go straight to paid
  - Claim within 30 days of first payment — single email, full refund issued
  - No justification required — if it did not work, we refund

**Then the standard CTA block** (existing emerald gradient card):
  - "See it working on your actual business"
  - "Book a free demo" + "See Pricing" buttons
  - "30-day money-back on all paid plans" reassurance line

**Visual:** Two-column layout (badge left, text right). White background. The guarantee badge uses emerald-500 border with concentric subtle rings (via box-shadow or extra borders). On mobile, badge stacks above text. CTA uses existing site gradient card style.

---

### What We're NOT Including from the Sample

The sample design uses a dark theme, amber accents, custom fonts (Cormorant Garamond, Syne), fade-up animations, and a comparison table. We are **not** adopting:
- Dark theme — FiQ is white/clean
- Amber color palette — staying with emerald/teal
- Custom serif fonts — staying with the existing font stack
- Scroll-triggered animations — keeping it static/instant
- The comparison table — that's on the homepage (Change 2), not duplicated on About

We **are** taking:
- The pain-led narrative structure
- The founding story content and philosophy
- The "numbers honestly stated" approach with context
- The guarantee section with badge + terms
- The principle cards format (adapted to white theme)

---

## Design Principles (Unchanged)

1. **Clean white background** with subtle gray-50 sections
2. **Emerald/teal gradient** accent only
3. **Minimalist typography** — existing font stack
4. **Generous whitespace**
5. **Rounded corners (2xl)** for cards
6. **Subtle shadows** — no harsh drops
7. **Mobile-first responsive**
8. **Lucide icons** — consistent set
9. **No scroll animations** — content loads instantly

---

## Implementation Order

1. Fix pricing page SSR
2. Add ROI comparison table to homepage
3. Add 30-day guarantee to homepage hero + bottom CTA
4. Rewrite industries page (pain → outcome)
5. Rebuild About page (story, philosophy, numbers, guarantee)

---

## Files to Modify

| # | File | Change |
|---|------|--------|
| 1 | `src/app/pricing/page.tsx` | SSR fix — extract static layout, small client toggle |
| 2 | `src/app/page.tsx` | ROI table + guarantee (hero + bottom CTA) |
| 3 | `src/app/industries/page.tsx` | Pain/outcome rewrite for all 8 industries |
| 4 | `src/app/about/page.tsx` | Full rebuild — 6 sections |

---

## Confirmed Decisions

1. **Founder/team info:** Keep as "Codarti" without individual names or photos for now.
2. **Stats accuracy:** 78% resolution, <10s response, 40+ languages — confirmed and approved.
3. **Industry pain numbers:** Keep estimated loss figures, ensure all figures are specific to each industry.
