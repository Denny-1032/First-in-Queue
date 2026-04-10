# FiQ Fix Log

A chronological record of all critical fixes, their root causes, and preventive measures. Update this file whenever a significant fix is applied.

---

## Table of Contents

- [Voice Call Fixes (Apr 10, 2026)](#voice-call-fixes-apr-10-2026)
- [AI Agent Fixes (Apr 10, 2026)](#ai-agent-fixes-apr-10-2026)
- [Voice Test Call Error (Apr 10, 2026)](#voice-test-call-error-apr-10-2026)

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
| Apr 10, 2026 | Cascade | Documented all fixes from session: voice call protections, greeting loop fix, Test Your Bot improvements, KB sync error handling, test call field naming |

---

**Next Update Instructions:**
When applying a new fix:
1. Add a new section under the appropriate date
2. Include: Problem, Root Cause, Fix (with code snippets), Prevention
3. Update the table of contents
4. Update the update log
