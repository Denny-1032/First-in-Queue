# Next session: invite flow, dashboard labels, JSON knowledge import

Written 12 August 2026. Investigation done, no code written. Everything below was
checked against the live database and the deployed site.

## Context

The ZRA and PACRA proposal demos are set up: both workspaces exist (`zra-mspspwg7`,
`pacra-mspt1no6`), both properties have widget keys, and the keys are configured on
Vercel. The demo pages themselves are already built and gated
([decks.ts](../src/lib/demo/decks.ts), [demo/[slug]/page.tsx](../src/app/demo/[slug]/page.tsx)).

Four things block sending the proposals: evaluators cannot accept an invite to view
the dashboards, two labels read wrong, and the generated knowledge bases cannot be
uploaded.

Decisions taken: **keep the agent role** and just fix the invite bugs; **add JSON
import** to the knowledge-base uploader.

---

## 1. Invite links fail with "Invalid or expired invite"

### What was proven, before changing anything

The API is **not** broken. Using the real pending token from the database against
production:

```
https://app.firstinqueue.com/api/team/invite/accept?token=…  →  200 {"valid":true,"name":"Denny Sepiso","businessName":"Codarti Support's Business"}
https://firstinqueue.com/api/team/invite/accept?token=…      →  200 {"valid":true,…}
```

Both hosts validate. The `agents` table has the invite columns, tokens are written
(64-char base64url, correct charset), and a past invite was accepted successfully in
April. So the failure is a **stale or missing token in the link that was clicked**,
not a broken endpoint — and the UI cannot tell anyone which.

Database state at the time of writing: exactly **one** agent row has a non-null
`invite_token` (`denny@codarti.com`, Codarti Support's Business). Every other invite
ever sent is dead, because re-inviting overwrites the column.

### Root causes to fix

**a. Every failure shows the same sentence.** [invite/accept/page.tsx](../src/app/invite/accept/page.tsx)
collapses missing-token, unknown-token, already-used and expired into one
`status: "invalid"` and one message. The API already returns `reason: "expired"` and
the page throws it away (line ~34). Nobody — including us — can tell what happened.

Fix: have the GET return an explicit `reason` for all four cases
(`missing` | `not_found` | `already_used` | `expired`), and render a distinct message
per case. "This invite has already been used — sign in instead" and "This link was
replaced by a newer invite" are actionable; the current sentence is not.

**b. Re-inviting silently kills the previous link.** [api/team/invite/route.ts](../src/app/api/team/invite/route.ts)
overwrites `invite_token` on every send. Anyone clicking an older email gets the dead
end above with no explanation. At minimum, say so in the new `not_found` copy. Better:
add a "Request a new link" button on the error page that hits a small endpoint keyed
on the agent's email.

**c. A failed token write still sends the email.** Same file: the
`update({ invite_token, invite_sent_at, invite_accepted_at })` result is never
destructured, so a database error is invisible and the invite email goes out carrying
a token that was never stored. Check the error and return 500 before sending.

**d. Accepting an invite overwrites an existing account.** [api/team/invite/accept/route.ts](../src/app/api/team/invite/accept/route.ts)
lines ~94-100: when the email already has a user, it **resets their password** to
whatever they type on the accept screen and **moves their default `tenant_id`** to the
inviting workspace. An evaluator with an existing FiQ account loses their own login,
and inviting the same person to both ZRA and PACRA leaves them pointing at whichever
was accepted last.

Fix: for an existing user, do not touch `password_hash`, and do not move `tenant_id`.
Add the `user_tenants` membership (already done), then send them to sign in with their
existing password. Only set a password when creating a brand-new user.

### Worth confirming while in there

- `/invite/accept` is outside the proxy matcher and `/api/team/invite/accept` is
  in `isPublicApi` — both correct, no change needed.
- The invite email is sent to `NEXT_PUBLIC_APP_URL` (`app.firstinqueue.com`) while the
  dashboard is being used on `firstinqueue.com`. Both work, but the mismatch is worth
  a look if sessions ever behave oddly across the two hosts.

---

## 2. Sidebar: "Websites" → "Website widget"

[sidebar.tsx](../src/components/dashboard/sidebar.tsx) line 36. One string. Note the
comment at line 43 also refers to "Websites" and should follow.

---

## 3. Property status: "Not installed yet" → connected / not connected

[dashboard/properties/page.tsx](../src/app/dashboard/properties/page.tsx) line 83,
`STATUS_LABEL`:

| state | now | should be |
|---|---|---|
| `verified` | Installed | **Connected** |
| `pending` | Not installed yet | **Not connected** |
| `stale` | Not seen recently | **Not connected recently** |

The green already exists: `Badge` `variant="default"` is `bg-emerald-100
text-emerald-800`, and the render at line ~391 already picks it for `verified`. So
`verified` needs no colour work. Give `stale` `variant="warning"` (amber) instead of
`secondary`, so "connected but gone quiet" reads differently from "never connected".

---

## 4. Knowledge base: accept JSON

The uploader at [ai-config/page.tsx](../src/app/dashboard/ai-config/page.tsx) line 624
accepts `.txt,.csv,.md,.markdown,.text` only. The demo knowledge bases are JSON.

Add `.json`:

- `accept=".txt,.csv,.md,.markdown,.text,.json"`, and update both copy strings
  (lines ~608 and ~620) that list the supported types.
- In the `onChange` handler, branch on `.json` **before** the markdown branch:
  `JSON.parse`, accept an array of `{ topic, content }` (extra keys such as `source`
  and `keywords` are ignored or folded into content), validate that both fields are
  non-empty strings, and push straight into `setKnowledgeBase`. No AI generation step —
  these entries are already verbatim source material and must not be paraphrased.
- Reject anything else with a clear toast: wrong shape, not "nothing happened".
- Cap the import the same way the rest of the flow should: warn if the resulting
  knowledge base exceeds ~30k characters, because `buildSystemPrompt()` sends the
  **entire** knowledge base on every message (this is the standing issue tracked
  separately). Both demo files are already trimmed to that budget.

Files to load, already in the repo at [scripts/demo-kb/](../scripts/demo-kb/):

| file | entries | chars |
|---|---|---|
| `zra-kb.json` | 78 | ~30,000 |
| `pacra-kb.json` | 98 | ~30,000 |
| `zra-pages.json`, `pacra-forms.json` | raw captures, not for import | |

They are currently untracked — decide whether to commit them or gitignore.

---

## Verification

1. **Invite, end to end.** Invite a throwaway address to the ZRA workspace, click the
   emailed link, set a password, confirm it lands in the ZRA dashboard and that
   `user_tenants` has the row. Then click the *same* link again and confirm it now says
   "already used", not "invalid or expired".
2. **Existing-account safety.** Invite an address that already has a FiQ account.
   Confirm the original password still works afterwards and the user's default
   workspace has not moved.
3. **Stale link.** Invite the same agent twice, click the first email, confirm the
   message explains it was superseded.
4. **Labels.** `/dashboard/properties` shows "Connected" in green for a property whose
   widget has loaded, "Not connected" otherwise; sidebar reads "Website widget".
5. **JSON import.** Upload `scripts/demo-kb/pacra-kb.json` into the Pacra workspace,
   confirm 98 entries appear with topics intact and no paraphrasing, save, then ask the
   demo widget "how much is name clearance?" and expect **K120** quoted from the entry.
6. `npx tsc --noEmit`, `npx vitest run`, `npx eslint` on the touched files.

## Out of scope

The two standing product issues remain tracked separately and should not be pulled
into this session: the crawler failing on incomplete TLS chains and client-rendered
sites, and the knowledge base being injected whole into every prompt instead of being
searched.
