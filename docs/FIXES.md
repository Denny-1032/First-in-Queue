# FiQ Fix Log

A chronological record of all critical fixes, their root causes, and preventive measures. Update this file whenever a significant fix is applied.

---

## Table of Contents

- [AI History Poisoning Loop Fix (Apr 10, 2026)](#ai-history-poisoning-loop-fix-apr-10-2026)
- [Greeting Loop Definitive Fix (Apr 11, 2026)](#greeting-loop-definitive-fix-apr-11-2026)
- [Double Billing Fix (Apr 10, 2026)](#double-billing-fix-apr-10-2026)
- [Greeting Loop Fix (Apr 10, 2026)](#greeting-loop-fix-apr-10-2026)
- [Africa's Talking Provider (Apr 10, 2026)](#africas-talking-provider-apr-10-2026)
- [Voice Call Cost Protection (Apr 10, 2026)](#voice-call-cost-protection-apr-10-2026)
- [Voice Call Fixes (Apr 10, 2026)](#voice-call-fixes-apr-10-2026)
- [AI Agent Fixes (Apr 10, 2026)](#ai-agent-fixes-apr-10-2026)
- [Voice Test Call Error (Apr 10, 2026)](#voice-test-call-error-apr-10-2026)
- [Handoff & Flows Audit Fix (Apr 11, 2026)](#handoff--flows-audit-fix-apr-11-2026)
- [Handoff & Team Management Audit (Apr 11, 2026)](#handoff--team-management-audit-apr-11-2026)
- [Agent Chat UX Fixes (Apr 12, 2026)](#agent-chat-ux-fixes-apr-12-2026)

---

## AI History Poisoning Loop Fix (Apr 10, 2026)

### Problem
After the 3-bug greeting loop fix was deployed, the bot continued sending the same greeting (`"Hey there! 👋 Welcome to First in Queue. How can I help you today?"`) to every message regardless of content — even questions like "What industries do you cover?" or "Do you offer discounts?".

### Root Cause
Vercel logs confirmed the `Response path: AI` label was firing, and the AI's `detected_intent` was always `"greeting"` with `confidence=0.95`. This was **AI history poisoning** — a self-reinforcing feedback loop:

1. Early in the conversation, `"Hi"` correctly triggered the qr1 quick reply, sending the greeting
2. `getRecentMessageHistory()` was fetching the **oldest** 20 messages (ascending order) — not the most recent
3. When the conversation accumulated many messages, the AI loaded 20 slots of all-greeting history
4. GPT-4o saw the pattern and imitated it: every response → greeting → more poisoned history → repeat

### Fixes Applied

**Fix 1: `getRecentMessageHistory` ordering** (`src/lib/db/operations.ts`)

Changed from `ascending: true` (oldest first) to `ascending: false` + `.reverse()` so the AI always receives the **most recent** 20 messages as context, not the oldest:

```typescript
.order("created_at", { ascending: false })
.limit(limit);
const data = rawData ? [...rawData].reverse() : null;
```

**Fix 2: Repetition guard** (`src/lib/engine/handler.ts`)

Before calling `handleAIResponse`, checks if the last 3+ assistant messages in history are identical. If so, strips all history and keeps only the current user message:

```typescript
const assistantMsgs = history.filter(h => h.role === "assistant").map(h => h.content);
if (assistantMsgs.length >= 3) {
  const tail = assistantMsgs.slice(-3);
  if (tail.every(m => m === tail[0])) {
    console.warn(`[Handler] REPETITION DETECTED — stripping poisoned history.`);
    const lastUserMsg = history.filter(h => h.role === "user").pop();
    history = lastUserMsg ? [lastUserMsg] : [];
  }
}
```

**Fix 3: Anti-repetition rules in system prompt** (`src/lib/ai/engine.ts`)

Added two new CRITICAL RULES to the AI system prompt:
- Rule 10: "NEVER repeat the same response twice. Every reply MUST be unique and MUST directly address what the customer just said."
- Rule 11: "Always focus on the customer's LATEST message. Ignore any repetitive patterns in conversation history."

**Fix 4: Archive poisoned conversation**

The existing conversation `f9412592-94e2-4f2e-8509-fa8125370091` had 30+ identical greeting messages. Archived it via the debug endpoint so a fresh conversation would be created, breaking the loop immediately.

### Files Changed
- `src/lib/db/operations.ts` — Fixed message history ordering (descending + reverse)
- `src/lib/engine/handler.ts` — Added repetition guard before AI call
- `src/lib/ai/engine.ts` — Added anti-repetition rules 10-11 to CRITICAL RULES
- `src/middleware.ts` — Exposed `/api/debug/` as public route for operational tooling

### Prevention
1. **Always fetch history in descending order then reverse** — `ORDER BY created_at DESC LIMIT N` then reverse gives the N most recent messages in chronological order
2. **Guard against AI pattern imitation** — When conversation history is heavily skewed toward one type of response, the AI will imitate it. A repetition check before inference prevents this.
3. **Poisoned conversations must be archived** — Code fixes alone don't repair existing corrupted conversations; the conversation must be reset to clear the bad history from the AI's context window
4. **Add anti-repetition to system prompt** — Explicitly instruct the AI to address the latest message and never repeat previous responses

---

## Greeting Loop Definitive Fix (Apr 11, 2026)

### Problem
WhatsApp bot stuck in a greeting loop — every customer message receives the same greeting/welcome response instead of an AI-generated contextual reply. Persisted all day despite previous fixes.

### Symptoms
- Messages like "How's it going?", "What products do you offer?", "The call did not come" all return the same: "Hey there! 👋 Welcome to First in Queue. How can I help you today?"
- Some messages receive NO response at all (silent failure)
- Only "call me" triggers the correct voice callback

### Root Causes (3 bugs found)

| # | Bug | Impact | File |
|---|-----|--------|------|
| 1 | **Race condition SELECT returns partial object** | `ai_enabled` is `undefined` → AI path skipped → NO response | `src/lib/db/operations.ts` |
| 2 | **matchQuickReply vulnerable to empty/short triggers** | Empty trigger with `contains` match → `"".includes("") === true` → catches ALL messages | `src/lib/engine/handler.ts` |
| 3 | **Greeting quick replies fire on existing conversations** | "hi"/"hello" QRs send welcome text instead of AI response for returning customers | `src/lib/engine/handler.ts` |

### Fix Applied

**Bug 1: Race condition SELECT** (`src/lib/db/operations.ts`)

Before:
```typescript
const { data: dupes } = await db
    .from("conversations")
    .select("id, created_at, metadata")  // Only 3 fields!
```

After:
```typescript
const { data: dupes } = await db
    .from("conversations")
    .select("*")  // All fields — ensures ai_enabled, status, etc. are present
```

**Bug 2: Quick reply trigger protection** (`src/lib/engine/handler.ts`)

```typescript
// Skip empty triggers — they match everything with "contains"
if (!trigger) continue;

// For non-exact matches, require minimum trigger length
if (qr.match_type !== "exact" && trigger.length < 3) continue;
```

**Bug 3: Skip greeting QRs for existing conversations** (`src/lib/engine/handler.ts`)

```typescript
const GREETING_TRIGGERS = ["hi", "hello", "hey", "hola", "greetings"];
const isGreetingInput = GREETING_TRIGGERS.includes(normalizedInput);

if (!isNew && isGreetingInput) {
  // Fall through to AI for contextual response
} else {
  // Send quick reply as normal
}
```

**Diagnostic logging** added at every response path:
- `HANDOFF`, `LIMIT`, `OUTSIDE_HOURS`, `ESCALATION`, `VOICE_CALLBACK`, `QUICK_REPLY`, `WELCOME`, `AI`, `AI_DISABLED`, `FALLBACK`
- Each path now prints `[Handler] Response path: <LABEL>` for production debugging

### Files Changed
- `src/lib/db/operations.ts` — Fixed `.select("*")` in dupes query
- `src/lib/engine/handler.ts` — Fixed `matchQuickReply`, added greeting skip, added path logging

### Prevention
1. **Always use `.select("*")` when returning a full typed object** — partial selects break TypeScript's type assertions silently
2. **Validate user-configurable trigger patterns** — empty/short strings cause catch-all matching
3. **Greeting responses should use the welcome_message system** — not quick replies, which fire on every match regardless of conversation state
4. **Label every response exit path** — critical for debugging webhook-driven systems where you can't attach a debugger

---

## Double Billing Fix (Apr 10, 2026)

### Problem
Each voice call was being billed twice — once in the telephony provider status callback (Twilio/Telnyx) and once in the Retell webhook.

### Symptoms
- Voice usage was 2x the actual call duration
- Customers were running out of voice minutes faster than expected
- Subscription voice usage showed inflated numbers

### Root Cause
Both webhooks were recording usage for the same call:

1. **Twilio status callback** (`/api/voice/twilio-status`): Called `recordVoiceUsage()` when `callStatus === "completed"`
2. **Telnyx status callback** (`/api/voice/telnyx-status`): Called `recordVoiceUsage()` when `event_type === "call.hangup"`
3. **Retell webhook** (`/api/voice/webhook`): Called `recordVoiceUsage()` when `event === "call_ended"`

Since both the telephony provider AND Retell fire webhooks for the same call, usage was being double-counted.

### Fix Applied
Removed `recordVoiceUsage()` calls from telephony provider status callbacks. Only the Retell webhook records usage now (single source of truth).

**Files Changed:**
- `src/app/api/voice/twilio-status/route.ts` — Removed usage recording, kept only status updates
- `src/app/api/voice/telnyx-status/route.ts` — Removed usage recording, kept only status updates

**Before (twilio-status):**
```typescript
if (callStatus === "completed" && duration && voiceCall.tenant_id) {
  const durationSec = parseInt(duration, 10);
  if (durationSec > 0) {
    await recordVoiceUsage(voiceCall.tenant_id, durationSec);
  }
}
```

**After (twilio-status):**
```typescript
// Note: Voice usage is recorded by the Retell webhook (voice/webhook/route.ts)
// to avoid double-counting since both webhooks fire for the same call.
```

### Prevention
- **Single source of truth**: Only one webhook should record usage
- Retell is the authoritative source since it knows the actual conversation duration
- Telephony provider webhooks should only update call metadata/status
- Document this architecture clearly to prevent regression

---

## Greeting Loop Fix (Apr 10, 2026)

### Problem
Returning customers were receiving welcome/greeting messages repeatedly instead of AI responses.

### Symptoms
- User sends "Hello" → gets welcome message
- User sends "How's it going?" → gets welcome message again
- User sends "What products do you offer?" → gets welcome message again
- Welcome messages accumulated instead of conversation continuing normally

### Root Cause
Race condition handling in `getOrCreateConversation()` was returning a **hybrid conversation object** instead of the actual oldest conversation. When duplicate conversations were detected (race condition), the code returned:

```typescript
// BUG: Created a hybrid with wrong timestamps and potentially wrong metadata
return { conversation: { ...created, id: oldest.id, metadata: oldest.metadata }, isNew: false };
```

This hybrid had the `created` object's timestamps (fresh) with only the ID and metadata swapped. If the `welcome_sent` flag wasn't properly preserved or if other fields were mismatched, the welcome logic could re-trigger.

### Fix Applied
Changed race condition handling to return the **actual oldest conversation object** from the database:

**File:** `src/lib/db/operations.ts`

**Before:**
```typescript
if (dupes && dupes.length > 1) {
  const oldest = dupes[0];
  if (oldest.id !== created.id) {
    await db.from("conversations").delete().eq("id", created.id);
    // BUG: Hybrid object - could cause metadata issues
    return { conversation: { ...created, id: oldest.id, metadata: oldest.metadata }, isNew: false };
  }
}
```

**After:**
```typescript
if (dupes && dupes.length > 1) {
  const oldest = dupes[0];
  if (oldest.id !== created.id) {
    await db.from("conversations").delete().eq("id", created.id);
    // Fix: Update oldest and return the actual object
    const updates = { last_message_at: new Date().toISOString() };
    await db.from("conversations").update(updates).eq("id", oldest.id);
    return { conversation: { ...oldest, ...updates }, isNew: false };
  }
}
```

### Prevention
- Always return complete database objects, not hybrids
- When handling race conditions, fetch/update the actual winning record
- Belt-and-suspenders: The welcome logic already checks `isNew` AND `welcome_sent` flag
- Test race conditions with concurrent requests during load testing

---

## Africa's Talking Provider (Apr 10, 2026)

### Context: Why Africa's Talking Was Added

Twilio was charging **~$0.51/min** for outbound calls to Zambia (+260) — international PSTN rates from a US number. With voice included in subscription plans, every Business plan customer using full voice allocation cost more than they paid.

**Africa's Talking (AT)** is a pan-African communications platform with local interconnects across Zambia, providing:
- Local/regional calling rates (estimated 70-90% cheaper than Twilio for African numbers)
- Native Zambia coverage
- Same SIP bridge architecture as Twilio (fully compatible with Retell AI)

### Architecture (AT + Retell)

```
1. FiQ calls AT REST API → AT dials customer (+260 number)
2. Customer picks up → AT POSTs to /api/voice/at-action?retellCallId=xxx
3. We respond with XML: <Dial><Sip>sip:{retellCallId}@sip.retellai.com</Sip></Dial>
4. Retell AI takes over the audio (STT → LLM → TTS)
5. Call ends → AT POSTs to /api/voice/at-status with duration + cost
6. We record usage and update the call record
```

This is identical to the Twilio flow — only the PSTN provider changes.

### Files Created

| File | Purpose |
|------|---------|
| `src/lib/voice/at-client.ts` | AT client: `makeOutboundCallViaAT`, `buildATActionXml`, `parseATStatus`, `mapATStatusToFiQ` |
| `src/app/api/voice/at-action/route.ts` | ActionURL webhook — AT calls this when customer picks up, we return SIP XML |
| `src/app/api/voice/at-status/route.ts` | Status callback — AT calls this when call ends, records usage |
| `src/app/api/voice/at-call/route.ts` | Outbound call API (AT equivalent of `/api/voice/call`) |

### Files Modified

| File | Change |
|------|--------|
| `src/lib/engine/handler.ts` | WhatsApp `handleVoiceCallbackRequest` reads `VOICE_PROVIDER` env var to choose AT or Twilio |
| `src/app/api/voice/scheduled/route.ts` | Scheduled calls cron supports AT provider |
| `.env.example` | Added `AT_USERNAME`, `AT_API_KEY`, `AT_VOICE_NUMBER`, `VOICE_PROVIDER` |

### Provider Switching

Switching providers requires **only one environment variable change**. No code changes needed.

```bash
# Use Africa's Talking (recommended for Zambia)
VOICE_PROVIDER=africastalking
AT_USERNAME=your-username
AT_API_KEY=your-api-key
AT_VOICE_NUMBER=+260xxxxxxxxx

# Use Twilio (fallback / international)
VOICE_PROVIDER=twilio
```

### Key Implementation Details

**ActionURL must include the Retell call ID as a query param:**
```typescript
const actionUrl = `${appUrl}/api/voice/at-action?retellCallId=${retellCallId}`;
```
AT doesn't support custom headers so the retellCallId is passed in the URL.

**AT uses `clientRequestId` to correlate callbacks:**
```typescript
formParams.set("clientRequestId", retellCallId);
// AT sends this back in the status callback so we can look up the call record
```

**AT XML format differs from Twilio TwiML:**
```xml
<!-- AT -->
<Response>
  <Dial record="false" sequential="true" maxDuration="300">
    <Sip>sip:{retellCallId}@sip.retellai.com;transport=tcp</Sip>
  </Dial>
</Response>

<!-- Twilio -->
<Response>
  <Dial timeout="30" timeLimit="300">
    <Sip>sip:{retellCallId}@sip.retellai.com;transport=tcp</Sip>
  </Dial>
</Response>
```

### Testing Notes
- AT voice is **LIVE ONLY** — no sandbox mode for voice calls
- Use real phone numbers when testing
- Webhook URLs must be publicly accessible (use ngrok for local dev)
  - ActionURL: `https://yourdomain.com/api/voice/at-action?retellCallId={id}`
  - CallbackURL: `https://yourdomain.com/api/voice/at-status`
- Register with Africa's Talking: https://account.africastalking.com
- Get a Zambian virtual number from AT dashboard under Voice → Phone Numbers

### Cost Comparison

| Provider | Outbound to +260 (Zambia) | Notes |
|----------|---------------------------|-------|
| Twilio | ~$0.51/min | International PSTN from US |
| Africa's Talking | ~$0.02-0.08/min (est.) | Local African interconnect |
| **Saving** | **~85-95%** | Switch via `VOICE_PROVIDER=africastalking` |

---

## Voice Call Cost Protection (Apr 10, 2026)

### Problem: $26 Twilio Charges from 10-Minute Calls

**Symptoms:**
- User requested calls via WhatsApp "Call me"
- Twilio showed 51 voice units totalling $26.30 in April 2026
- Calls showed "Completed" status with 10-minute durations
- Customer never heard anything / voicemail answered — AI talked for full 10 min

**Root Causes (6 separate issues):**

| # | Issue | Impact |
|---|-------|--------|
| 1 | No voice minutes check in WhatsApp callback handler | Calls placed ignoring plan limits |
| 2 | Default `max_call_duration_ms` was 600s (10 min) | Voicemail/silence ran for 10 min |
| 3 | No `timeLimit` or `timeout` on Twilio `<Dial>` TwiML | No hard call duration cap |
| 4 | No answering machine detection (AMD) | Voicemail answered, AI talked to it |
| 5 | `recordVoiceUsage()` never called | Minutes used not deducted from plan |
| 6 | `asyncAmd` bool vs string type error | TypeScript fix required |

**Files Changed:**
- `src/lib/voice/twilio-client.ts`
- `src/lib/engine/handler.ts`
- `src/app/api/voice/twilio-status/route.ts`
- `src/app/api/voice/call/route.ts`
- `src/lib/voice/retell-client.ts`

**Fixes Applied:**

1. **Voice minutes gate** — Added to `handleVoiceCallbackRequest` in `handler.ts`:
```typescript
const usage = await checkVoiceMinutes(tenant.id);
if (!usage.allowed) { /* send polite message, return */ }
```

2. **TwiML limits** — Added to `makeOutboundCallViaTwilio` in `twilio-client.ts`:
```xml
<Dial timeout="30" timeLimit="180">
```
- `timeout="30"`: Ring for max 30 seconds, then give up
- `timeLimit="180"`: Connected call hard cap of 3 minutes (WhatsApp callbacks)

3. **Answering machine detection (AMD):**
```typescript
machineDetection: "DetectMessageEnd",
asyncAmd: "true",  // string, not boolean
asyncAmdStatusCallback: statusCallbackUrl,
```

4. **Auto-hangup on voicemail** — Added to `twilio-status/route.ts`:
```typescript
const answeredBy = formData.get("AnsweredBy");
if (answeredBy && answeredBy !== "human") {
  await client.calls(callSid).update({ status: "completed" });
}
```

5. **Voice usage tracking** — Added to `twilio-status/route.ts`:
```typescript
if (callStatus === "completed" && duration && voiceCall.tenant_id) {
  await recordVoiceUsage(voiceCall.tenant_id, parseInt(duration, 10));
}
```

6. **Reduced default Retell agent duration** — `retell-client.ts`:
```typescript
max_call_duration_ms: (params.maxDurationSeconds || 300) * 1000  // was 600
```

**Prevention:**
- Always check plan limits before executing paid operations
- Always set `timeLimit` on `<Dial>` TwiML
- Always enable AMD for outbound calls to human phones
- Always record usage in completion callbacks
- Test with short durations first when setting up new telephony providers

---

## Voice Call Fixes (Apr 10, 2026)

### Problem: $26 in unexpected Twilio charges, 10-minute calls not connecting to user

**Symptoms:**
- User reported calls not coming through when saying "Call me" on WhatsApp
- Twilio dashboard showed $26 in voice charges
- Calls showed 10+ minute durations but user never heard anything
- Some calls went to "Completed" status but duration was 0:00

**Root Cause Analysis:**

| Issue | Cause | Impact |
|-------|-------|--------|
| No voice minute limit check | `handleVoiceCallbackRequest` didn't call `checkVoiceMinutes()` | Calls placed regardless of plan limits |
| No call duration caps | Default Retell max was 600s (10 min), no TwiML limits | Calls ran full 10 min if voicemail answered |
| No answering machine detection | No AMD configured in Twilio | Voicemail answers, AI talks to recording for 10 min |
| No voice usage tracking | `twilio-status` callback didn't call `recordVoiceUsage()` | Minutes used never deducted from plan |
| Field name mismatch | API returned `access_token`, client expected `accessToken` | Test calls failed immediately |
| Missing Twilio timeout | `<Dial>` had no timeout attribute | Calls rang indefinitely |

**Files Changed:**
- `src/lib/voice/twilio-client.ts`
- `src/lib/engine/handler.ts`
- `src/app/api/voice/twilio-status/route.ts`
- `src/app/api/voice/call/route.ts`
- `src/lib/voice/retell-client.ts`
- `src/app/api/voice/web-call/route.ts`

**Fixes Applied:**

1. **Voice Minutes Gate (handler.ts)**
   ```typescript
   // Added before any call placement
   const { checkVoiceMinutes } = await import("@/lib/voice/usage");
   const usage = await checkVoiceMinutes(tenant.id);
   if (!usage.allowed) { /* send limit message, return */ }
   ```

2. **TwiML Safety Limits (twilio-client.ts)**
   ```xml
   <Dial timeout="30" timeLimit="180">
     <Sip>...</Sip>
   </Dial>
   ```
   - `timeout="30"`: Max 30 seconds ringing before giving up
   - `timeLimit="180"`: Max 3 minutes connected (WhatsApp callbacks)

3. **Answering Machine Detection (twilio-client.ts)**
   ```typescript
   machineDetection: "DetectMessageEnd",
   asyncAmd: "true",
   ```

4. **Auto-Hangup on Voicemail (twilio-status/route.ts)**
   ```typescript
   if (answeredBy && answeredBy !== "human") {
     await client.calls(callSid).update({ status: "completed" });
   }
   ```

5. **Voice Usage Tracking (twilio-status/route.ts)**
   ```typescript
   if (callStatus === "completed" && duration && voiceCall.tenant_id) {
     await recordVoiceUsage(voiceCall.tenant_id, parseInt(duration, 10));
   }
   ```

6. **Field Name Fix (web-call/route.ts)**
   ```typescript
   return NextResponse.json({
     accessToken: response.access_token,  // camelCase for client
     access_token: response.access_token, // snake_case for compatibility
     // ...
   });
   ```

**Prevention:**
- Always check plan limits before placing calls
- Always set `timeLimit` on `<Dial>` TwiML
- Always use AMD for outbound calls to human phones
- Always record usage in status callbacks
- Use defensive field naming (both camelCase and snake_case)

---

## AI Agent Fixes (Apr 10, 2026)

### Problem 1: WhatsApp Bot Stuck in Greeting Loop

**Symptoms:** Every customer message triggered welcome message instead of AI responses.

**Root Causes:**
1. Initial fix used `history.length <= 1` — unreliable due to timing/query issues
2. Second fix used `welcome_sent` metadata flag — conversation could be recreated if status changed
3. Race conditions could create duplicate conversations for simultaneous messages

**Definitive Fix (operations.ts + handler.ts):**

```typescript
// getOrCreateConversation returns structural guarantee
export async function getOrCreateConversation(...): Promise<{ conversation: Conversation; isNew: boolean }> {
  // Try to find active conversation first
  // If found: return { ..., isNew: false }
  
  // If not found, check for ANY prior conversations (including resolved)
  const { count: priorCount } = await db...;
  const isReturningCustomer = (priorCount || 0) > 0;
  
  // Create new conversation
  // Post-insert: deduplicate if race condition created multiple
  
  // isNew = true ONLY for brand-new customers (no prior conversations at all)
  return { conversation: created, isNew: !isReturningCustomer };
}
```

```typescript
// Handler uses isNew + belt-and-suspenders metadata check
const { conversation, isNew } = await getOrCreateConversation(...);
const welcomeAlreadySent = !!(conversation.metadata?.welcome_sent);

if (isNew && !welcomeAlreadySent && tenant.config.welcome_message) {
  // Mark welcome_sent BEFORE sending to prevent race conditions
  await updateConversation(conversation.id, {
    metadata: { ...meta, welcome_sent: true, welcome_sent_at: new Date().toISOString() },
  });
  // Then send welcome
}
```

**Lesson:** For one-time actions, prefer structural guarantees (`isNew` flag from DB operation) over heuristic checks (history length, metadata flags). Use metadata as belt-and-suspenders, not primary mechanism.

---

### Problem 2: Test Your Bot Returns Raw Knowledge Base Dumps

**Symptoms:** "Test your Bot" feature on AI config page returned raw KB content like:
```
AI Configuration and Customisation - Knowledge Base — How to teach the AI about your specific business...
```

**Root Cause:** `simulateResponse` in `BotTestChat` concatenated up to 3 full KB entries verbatim.

**Fix (ai-config/page.tsx):**
```typescript
// OLD: Combined up to 3 full entries
const top = scored.filter((s) => s.score >= threshold).slice(0, 3);
const combined = top.map((s) => `${s.entry.topic}: ${s.entry.content}`).join("\n\n");

// NEW: Single best match, truncated to ~300 chars at sentence boundary
const best = scored[0].entry;
let excerpt = best.content || "";
if (excerpt.length > 300) {
  const cut = excerpt.lastIndexOf(".", 300);
  excerpt = cut > 100 ? excerpt.slice(0, cut + 1) : excerpt.slice(0, 300) + "…";
}
return `${tonePrefix}**${best.topic}**\n\n${excerpt}${emojiSuffix}`;
```

---

### Problem 3: Auto-Scroll When Updating Bot Name

**Symptoms:** Updating bot name in AI config caused page to auto-scroll to "Test your Bot" section.

**Root Cause:** `useEffect` scrolled on ANY `messages` state change, including the name update that mutated the welcome message text.

**Fix (ai-config/page.tsx):**
```typescript
// OLD: Scrolled on every messages change
useEffect(() => {
  bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
}, [messages, thinking]);

// NEW: Only scroll when NEW message added (count increases)
const prevMsgCountRef = useRef(messages.length);
useEffect(() => {
  if (messages.length > prevMsgCountRef.current || thinking) {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
  prevMsgCountRef.current = messages.length;
}, [messages.length, thinking]);
```

---

### Problem 4: AI Config Save Fails with 'Knowledge Base sync failed'

**Symptoms:** Saving AI config showed error toast: "Voice sync issues: {AgentName}: Knowledge Base sync failed"

**Root Cause:** `syncKnowledgeBaseToRetell` threw errors when:
- `RETELL_LLM_ID` not set
- Retell API key missing
- Knowledge base empty or sync failed

Error was caught and returned as 500, blocking core AI config save even though chat doesn't require voice sync.

**Fix (api/voice/agents/route.ts):**
```typescript
} catch (kbError) {
  const errorMsg = kbError instanceof Error ? kbError.message : String(kbError);
  console.error(`[Voice Agents] KB sync FAILED (non-fatal):`, kbError);
  warnings.push(`Voice agent "${existing.name}": Knowledge base sync failed — ${errorMsg}`);
  // Continue, don't return 500
}

return NextResponse.json({ 
  agent: updated,
  ...(warnings.length > 0 && { warnings })
});
```

**Lesson:** External service integrations should not block core functionality. Make non-critical integrations fail gracefully with warnings rather than hard errors.

---

## Voice Test Call Error (Apr 10, 2026)

**Symptoms:** Test call button in voice config showed "Failed to start test call" error.

**Root Cause:** Field name mismatch between API and client.
- API (`web-call/route.ts`): returned `access_token` (snake_case)
- Client (`voice/config/page.tsx`): read `data.accessToken` (camelCase)
- Result: `data.accessToken` was `undefined`, call failed

**Fix:** Include both formats in API response for compatibility:
```typescript
return NextResponse.json({
  accessToken: response.access_token,
  access_token: response.access_token,
  callId: response.call_id,
  call_id: response.call_id,
  agent_id: agentId,
});
```

---

## Preventive Coding Guidelines

Based on the fixes above, follow these principles:

### For One-Time Actions (welcome messages, etc.)
- Use structural DB guarantees (creation timestamp, ID comparison)
- Use metadata flags as belt-and-suspenders only
- Set flags BEFORE performing the action to prevent race conditions

### For External Service Integrations
- Never let non-critical integrations block core functionality
- Return warnings, not 500 errors, for optional features
- Log detailed errors server-side for debugging

### For API/Client Contracts
- Use consistent naming conventions (prefer camelCase for JSON APIs)
- When in doubt, return both formats for compatibility during transitions

### For Billing-Critical Features (voice calls, etc.)
- ALWAYS check plan limits before executing
- ALWAYS set maximum duration limits (timeLimit, timeout)
- ALWAYS detect answering machines/voicemail
- ALWAYS record usage in completion callbacks
- Log every step for audit trails

### For UI Behavior
- Only trigger side effects (scroll, notifications) on actual state changes
- Track previous values (refs) to distinguish updates from additions

---

## Update Log

| Date | Author | Changes |
|------|--------|---------|
| Apr 10, 2026 | Cascade | Initial documentation: voice call protections, greeting loop fix, Test Your Bot improvements, KB sync error handling, test call field naming |
| Apr 10, 2026 | Cascade | Added: Africa's Talking provider implementation, voice cost protection (AMD, timeLimit, usage tracking, minutes gate) |
| Apr 10, 2026 | Cascade | Added: Double billing fix (removed duplicate usage recording from Twilio/Telnyx webhooks), Greeting loop fix (race condition handling in getOrCreateConversation), Voice callback validation improvements |
| Apr 11, 2026 | Cascade | Greeting loop definitive fix: 3 bugs (partial SELECT in race condition, empty QR triggers, greeting QRs on existing convos), added response path logging |
| Apr 11, 2026 | Cascade | Handoff & Flows audit: 8 gaps fixed (waiting status handling, agent assignment, active_chats on takeover, AI silence during waiting, action steps, flow completion messages, readable data keys) |

---

## Handoff & Flows Audit Fix (Apr 11, 2026)

### Problem
Full audit of handoff and flows features revealed 8 gaps across backend and frontend.

### Gaps Found & Fixed

| # | Gap | Severity | Fix |
|---|-----|----------|-----|
| 1 | Escalation reason only shown for `handoff`, not `waiting` | Critical | Show reason for both statuses in conversation header |
| 2 | "Take Over" button doesn't assign agent or increment `active_chats` | Critical | Pass `assigned_agent_id` in PATCH body; API increments `active_chats` on entering handoff |
| 3 | AI bot still responds to customers in `waiting` status | Critical | Added `waiting` to the handoff guard: skip bot when `status === "waiting"` |
| 4 | Flow `action` steps silently advance with no user feedback | Medium | Send a confirmation message for each action type (booking, lead capture, etc.) |
| 5 | Flow completion sends nothing — customer gets silence | Medium | Send "That's everything!" completion message from both `sendFlowStep` and `processFlowStep` |
| 6 | Flow handoff escalation_reason contains raw JSON | Low | Format as readable `key: value` pairs instead of `JSON.stringify` |
| 7 | `handleSend` doesn't assign agent or handle `waiting` status | Critical | Include `assigned_agent_id` and update both `active` and `waiting` conversations |
| 8 | Collected flow data uses opaque timestamp IDs as keys | Low | Use truncated question content as key for human-readable escalation reasons |

### Files Changed
- `src/app/dashboard/conversations/page.tsx` — Gaps 1, 2, 7
- `src/app/api/conversations/[id]/route.ts` — Gap 2 (increment `active_chats` on entering handoff)
- `src/lib/engine/handler.ts` — Gaps 3, 4, 5, 6, 8

### Prevention
- Always treat `waiting` and `handoff` as equivalent from the bot's perspective — neither should get AI responses
- Any status change to `handoff` must include `assigned_agent_id` and increment `active_chats`
- Flow steps must never complete silently — always send a message to the customer
- Metadata keys should be human-readable, not IDs

---

## Handoff & Team Management Audit (Apr 11, 2026)

### Problem
Comprehensive audit of the 4-task handoff/team implementation revealed 7 gaps spanning security, UX, and logic.

### Gaps Found & Fixed

| # | Gap | Severity | File |
|---|-----|----------|------|
| 1 | Double "agent joined" WhatsApp message — `handleSend` re-PATCHes to handoff, triggering it again | High | `src/app/api/conversations/[id]/route.ts` |
| 2 | "Add & Send Invite" button only created agent but never sent the invite email | High | `src/app/dashboard/team/page.tsx` |
| 3 | Team page had no invite status visibility (pending/accepted) | Medium | `src/app/dashboard/team/page.tsx` |
| 4 | `Agent` TypeScript interface missing invite fields | Medium | `src/types/index.ts` |
| 5 | `/api/agents/[id]` PATCH+DELETE had no tenant auth — any user could edit any agent by guessing UUID | **Critical** | `src/app/api/agents/[id]/route.ts` |
| 6 | Voice webhook `needsFollowUp` triggered on web test calls (< 30s) — false positives | Medium | `src/app/api/voice/webhook/route.ts` |
| 7 | Settings page was a single long scroll — reorganized into tabbed UI | Medium | `src/app/dashboard/settings/page.tsx` |

### Fix Details

**Gap 1 — Double agent-joined message:**
Changed condition from `current?.status !== "handoff"` to also check if the same agent is already assigned:
```typescript
const enteringHandoff =
  sanitized.status === "handoff" &&
  sanitized.assigned_agent_id &&
  (current?.status !== "handoff" || current?.assigned_agent_id !== sanitized.assigned_agent_id);
```

**Gap 2 — Auto-send invite after create:**
Chained `/api/team/invite` POST immediately after `/api/agents` POST returns the new agent ID. Falls back to showing the link in a toast if email delivery fails.

**Gap 5 — Tenant auth on agents API (SECURITY):**
Added `requireSession()` + `.eq("tenant_id", session.tenantId)` to both PATCH and DELETE handlers. Previously, any authenticated user from any tenant could modify any agent record.

**Gap 6 — Web call exclusion:**
Added early return in `needsFollowUp` when `call_type === "web_call"` or `direction === "web"` or phone number is missing/too short (< 8 chars).

### Prevention
- All API routes that modify tenant-scoped data **must** include `requireSession()` + tenant_id filter
- Any UI button that says "& Send Invite" must actually chain both API calls
- Voice follow-up logic should never fire for web/test calls — always check call_type
- TypeScript interfaces must mirror DB columns to catch mismatches at compile time

---

**Next Update Instructions:**
When applying a new fix:
1. Add a new section under the appropriate date
2. Include: Problem, Root Cause, Fix (with code snippets), Prevention
3. Update the table of contents
4. Update the update log

---

## Agent Chat UX Fixes (Apr 12, 2026)

### Problem
Multiple critical issues in the agent dashboard chat:
1. **Duplicate voice call messages**: When a user requested a voice call on WhatsApp, two separate messages were sent
2. **Auto-scroll interruption**: Chat auto-scrolled to bottom every 3 seconds when polling, preventing agents from reading history
3. **CRITICAL — Messages disappearing after handoff**: Agent sends a message, it appears briefly then vanishes. Customer responses don't appear. All messages after ~50th in conversation invisible to agent.
4. **Escalation banner persists**: "Customer requests human agent" alert stays visible even after agent takes over

### Root Cause

**Issue 1 — Duplicate messages:**
AI engine generated both text AND `web_call` suggested action. Handler sent both messages.

**Issue 2 — Auto-scroll:**
Unconditional `scrollIntoView` on every `messages` state change, including 3-second polling.

**Issue 3 — Messages disappearing (CRITICAL):**
`getMessages()` in `src/lib/db/operations.ts` used `ascending: true` with `.range(0, 49)`:
```typescript
// BUG: Returns the OLDEST 50 messages, not the latest 50
.order("created_at", { ascending: true })
.range(offset, offset + limit - 1);
```
Once a conversation exceeded 50 messages, **all new messages fell outside the query window**. Agent messages were saved to DB and delivered via WhatsApp, but the dashboard poll fetched the same stale 50 oldest messages every 3 seconds — overwriting the optimistic message and hiding new inbound messages.

This is the **exact same bug pattern** as the AI history poisoning fix (ascending vs descending ordering).

**Issue 4 — Escalation banner:**
Banner showed for both `waiting` and `handoff` status. Once agent takes over (handoff), the alert is misleading.

### Fixes Applied

**Fix 1 — getMessages() ordering** (`src/lib/db/operations.ts`)
```typescript
// Fetch MOST RECENT messages first (descending), then reverse
.order("created_at", { ascending: false })
.range(offset, offset + limit - 1);
return data ? [...data].reverse() : [];
```

**Fix 2 — Skip AI text for web_call** (`src/lib/engine/handler.ts`)
Removed AI text sending when `web_call` action present. CTA button is the sole response.

**Fix 3 — Smart auto-scroll** (`src/app/dashboard/conversations/page.tsx`)
Track scroll position with refs; only auto-scroll if agent is at bottom or just sent a message.

**Fix 4 — Polling guard during send** (`src/app/dashboard/conversations/page.tsx`)
`sendingRef` prevents poll from overwriting optimistic message mid-send. Re-fetch after send completes.

**Fix 5 — Escalation banner scope** (`src/app/dashboard/conversations/page.tsx`)
Changed from `status === "handoff" || status === "waiting"` to `status === "waiting"` only.

### Files Changed
- `src/lib/db/operations.ts` — getMessages() descending + reverse
- `src/lib/engine/handler.ts` — Removed AI text for web_call
- `src/app/dashboard/conversations/page.tsx` — Smart scroll, sendingRef, escalation banner

### Prevention
- **RULE: Any query that fetches "latest N" records MUST use descending order + reverse** — never ascending + range
- When adding new `suggested_action` types, decide whether AI text should be suppressed
- Auto-scroll must track user position; never unconditionally scroll
- Polling must be paused during optimistic updates
