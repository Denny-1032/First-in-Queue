# Payment Integration Guide

Payments run entirely on **Lipila** - mobile money and cards. Lenco has been removed.

## Overview

- **Mobile Money**: Airtel Money, MTN Money, Zamtel Kwacha
- **Cards**: Visa, Mastercard, American Express (Lipila hosted checkout)
- **Subscriptions**: activated on a successful plan payment
- **Usage credit**: prepaid top-ups, credited on a successful `credit_topup` payment
- **30-Day Money-Back Guarantee**: all paid plans

> Free trials were removed. New signups get the free tier (website chat, 500 AI replies/month).

## Architecture

```
┌─────────────────┐    ┌────────────────────────┐    ┌──────────────┐
│   Frontend      │    │   Backend API          │    │    Lipila    │
│                 │    │                        │    │              │
│ - CheckoutModal │───▶│ /api/payments/initiate │───▶│ MoMo prompt  │
│ - CreditPanel   │    │ /api/credit/topup      │    │ Card checkout│
│ - TrialPayment  │    │                        │    │              │
└─────────────────┘    │ /api/payments/status   │◀───│ check-status │
                       │ /api/payments/confirm  │◀───│ backUrl      │
                       │ /api/payments/callback │◀───│ callback     │
                       │ /api/webhooks/lipila   │◀───│ wallet hook  │
                       └───────────┬────────────┘    └──────────────┘
                                   │
                              settlePayment()
                          ┌────────┴────────┐
                          │                 │
                 activatePaidSubscription  addCredit
```

All four inbound paths funnel into `settlePayment` (`src/lib/lipila/settle.ts`). That
is deliberate: they each used to decide independently what a successful payment
meant, and only the confirm redirect checked `purpose`, so a credit top-up that
settled via the webhook was run through the plan resolver and silently rewrote the
tenant's subscription.

`settlePayment` is idempotent on the payment row - Lipila retries callbacks, the
customer can refresh the return URL, and the checkout modal polls at the same time.

## Environment Variables

```env
LIPILA_ENVIRONMENT=sandbox            # or production
LIPILA_API_KEY=Lsk_...
LIPILA_CALLBACK_URL=https://yourdomain.com/api/payments/callback
LIPILA_WEBHOOK_SECRET=<base64 32-byte signing key>
NEXT_PUBLIC_APP_URL=https://yourdomain.com

CRON_SECRET=your-secret-key-for-cron-jobs
```

| Environment | API base |
|---|---|
| sandbox | `https://api.lipila.dev` |
| production | `https://blz.lipila.io` |

`LIPILA_WEBHOOK_SECRET` comes from Dashboard → Settings → Webhooks. It is **not** the
API key. Callbacks are rejected with 401 when it is unset - without it, anyone who
learns a reference id can POST a "Successful" callback and get a free subscription.

## Payment Flows

### 1. Mobile Money

1. Frontend POSTs `/api/payments/initiate` with `paymentMethod: "mobile_money"`.
2. Backend writes a pending `payments` row, calls `POST /api/v1/collections/mobile-money`.
3. Lipila pushes a PIN prompt to the customer's phone.
4. The checkout modal polls `/api/payments/status?ref=` every 5s (60 attempts, ~5 min).
5. Lipila also POSTs the callback. Whichever arrives first settles the payment; the
   other becomes a no-op.

### 2. Card

1. Frontend POSTs `/api/payments/initiate` with `paymentMethod: "card"`.
2. Backend calls `POST /api/v1/collections/card` with the nested body Lipila expects:

```json
{
  "customerInfo": {
    "firstName": "Jane", "lastName": "Doe", "phoneNumber": "260xxxxxxxxx",
    "city": "Lusaka", "country": "ZM", "address": "...", "zip": "10101",
    "email": "jane@example.com"
  },
  "collectionRequest": {
    "referenceId": "43174606b87e",
    "amount": 499,
    "narration": "First in Queue - Pro Plan (Monthly)",
    "accountNumber": "260xxxxxxxxx",
    "currency": "ZMW",
    "backUrl": "https://yourdomain.com/api/payments/confirm?ref=43174606b87e",
    "referenceData": "First in Queue - Pro Plan (Monthly)"
  }
}
```

3. The response carries `cardRedirectionUrl`; the frontend redirects there.
4. Customer enters card details on Lipila's checkout and approves with their bank.
5. They land back on `backUrl`, which re-checks the status with Lipila before
   deciding anything, then settles and redirects to the dashboard.

> `referenceData` replaced `redirectUrl` when Lipila shipped card collections. The
> old field is ignored silently, which is how a card charge could succeed with the
> customer never being sent anywhere. A phone number is required on card
> collections too - it is what Lipila keys the transaction to, not the card.

### 3. Credit Top-Up

Mobile money only. `/api/credit/topup` writes `purpose: "credit_topup"` on the
payment row; `settlePayment` reads that flag and calls `addCredit` instead of
activating a subscription. Credit is added on confirmation, never at initiation.

## Webhook Security

Lipila signs every callback. `src/lib/lipila/webhook.ts` verifies:

| Header | Purpose |
|---|---|
| `webhook-id` | Event id, stable across retries |
| `webhook-timestamp` | Unix seconds; rejected past 5 minutes |
| `webhook-signature` | Space-delimited `v1,<base64>` signatures |

Signed content is `{webhook-id}.{webhook-timestamp}.{raw_body}`, HMAC-SHA256 with
the base64-decoded secret, base64 encoded, prefixed `v1,`. Verification uses the
**raw request bytes** - re-serialising the parsed JSON reorders keys and no
signature will ever match. Comparison is constant-time, and several signatures may
be present during a key rotation.

## API Endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/payments/initiate` | POST | Start a plan payment (MoMo or card) |
| `/api/credit/topup` | POST | Start a usage-credit top-up (MoMo) |
| `/api/payments/status?ref=` | GET | Poll and settle |
| `/api/payments/confirm?ref=` | GET | Browser return URL; polls, settles, redirects |
| `/api/payments/callback` | POST | Per-request `callbackUrl` target |
| `/api/webhooks/lipila` | POST | Wallet-level callback target |

Both POST endpoints share `handleLipilaCallback`; Lipila takes the destination from
two places, so both URLs exist and behave identically.

### Initiate request

```json
{
  "tenantId": "tenant-uuid",
  "planId": "pro",
  "billingInterval": "monthly",
  "paymentMethod": "mobile_money",
  "phoneNumber": "0971234567",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "city": "Lusaka",
  "country": "ZM",
  "address": "Plot 24",
  "zip": "10101"
}
```

`city`, `country`, `address` and `zip` apply to cards only and fall back to Lusaka
defaults when omitted.

## Database

### `payments`

```sql
id, tenant_id, subscription_id
lipila_reference_id     -- our reference, what every lookup keys on
lipila_identifier       -- Lipila's transaction id
lipila_external_id      -- MNO transaction id
amount, currency
status                  -- pending | successful | failed | cancelled
payment_method          -- mobile_money | card
payment_type            -- AirtelMoney | MtnMoney | ZamtelKwacha | Card
purpose                 -- subscription | credit_topup
plan_id, billing_interval
callback_data, error_message
created_at, completed_at
```

Migration 022 dropped `lenco_reference` (any value it held was preserved into
`callback_data.legacy_lenco_reference` first) and narrowed the `payment_type`
check back to the Lipila vocabulary. Historical rows written by the old Lenco
card path were remapped: `card` became `Card`.

## Testing

- **Mobile money**: Lipila sandbox dashboard, real Zambian numbers, small amounts.
- **Cards**: the sandbox checkout at the returned `cardRedirectionUrl`.
- **Webhooks**: sign the body yourself - see `src/lib/lipila/webhook.test.ts` for
  the exact construction. An unsigned POST is rejected by design.
- Unit tests: `npx vitest run src/lib/lipila/`

## Production Checklist

1. `LIPILA_ENVIRONMENT=production`, production API key.
2. Set the wallet callback to `https://yourdomain.com/api/webhooks/lipila`.
3. Set `LIPILA_CALLBACK_URL` to `https://yourdomain.com/api/payments/callback`.
4. Set `LIPILA_WEBHOOK_SECRET` from the production dashboard.
5. Confirm `NEXT_PUBLIC_APP_URL` is the real origin - the card `backUrl` is built
   from it, so a wrong value strands paying customers.

## Troubleshooting

**Card checkout never opens** - `initiate` returns 502 when Lipila omits
`cardRedirectionUrl`. Check the API key and that card collections are enabled on
the merchant account.

**Callbacks 401** - `LIPILA_WEBHOOK_SECRET` missing, wrong, or the body is being
re-serialised somewhere in front of the route (a proxy that rewrites JSON will
break the signature).

**Paid but not activated** - find the `payments` row by `lipila_reference_id`. If
`status` is still `pending`, the callback never arrived; hitting
`/api/payments/status?ref=` settles it from Lipila's own record.

**Top-up paid but no credit** - look for `[Settle] Top-up <id> paid but NOT
credited`. The payment is marked successful and the `add_credit` RPC failed;
`addCredit` is idempotent on the payment id, so it is safe to retry.

### Log prefixes

- `[Lipila Callback]` / `[Lipila Webhook]` - inbound callbacks
- `[Settle]` - settlement outcomes
- `[Payments]` - initiation
- `[Credit Topup]` - top-up initiation
