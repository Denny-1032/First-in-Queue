# Payment Integration Guide

This document explains the payment system integration for First in Queue, which supports both mobile money (via Lipila) and card payments (via Lenco).

## Overview

The payment system handles:
- **Mobile Money Payments**: Airtel Money, MTN Money, Zamtel Kwacha via Lipila
- **Card Payments**: Visa, Mastercard via Lenco popup widget
- **Free Trials**: 7-day trials with deferred billing
- **Subscription Management**: Automatic activation and renewal

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API    │    │ Payment Gateway │
│                 │    │                  │    │                 │
│ - Payment Form  │───▶│ - /api/payments/ │───▶│ - Lipila (MoMo) │
│ - Lenco Widget  │    │   initiate       │    │ - Lenco (Cards) │
│ - Status UI     │    │ - /api/payments/ │    │                 │
│                 │    │   verify-lenco   │    │                 │
└─────────────────┘    │ - /api/webhooks/ │    └─────────────────┘
                       │   lenco          │              │
                       │ - /api/payments/ │              │
                       │   callback       │◀─────────────┘
                       └──────────────────┘
```

## Environment Variables

Add these to your `.env` file:

```env
# Lipila (Mobile Money)
LIPILA_ENVIRONMENT=sandbox
LIPILA_API_KEY=your_lipila_api_key
LIPILA_CALLBACK_URL=https://yourdomain.com/api/payments/callback

# Lenco (Card Payments)
LENCO_ENVIRONMENT=sandbox
LENCO_SECRET_KEY=993bed87f9d592566a6cce2cefd79363d1b7e95af3e1e6642b294ce5fc8c59f6
NEXT_PUBLIC_LENCO_PUBLIC_KEY=pub-88dd921c0ecd73590459a1dd5a9343c77db0f3c344f222b9

# Cron Security (Optional but Recommended)
CRON_SECRET=your-secret-key-for-cron-jobs
```

## Payment Flow

### 1. Mobile Money (Lipila)

1. User selects mobile money and enters phone number
2. Frontend calls `/api/payments/initiate` with `paymentMethod: "mobile_money"`
3. Backend creates payment record and calls Lipila API
4. Lipila sends payment prompt to user's phone
5. User enters PIN on their phone
6. Lipila sends webhook to `/api/payments/callback`
7. Backend activates subscription

### 2. Card Payments (Lenco)

1. User selects card payment and enters details
2. Frontend loads Lenco widget script
3. Frontend calls `/api/payments/initiate` with `paymentMethod: "card"`
4. Backend returns widget configuration
5. Lenco popup opens for card details
6. User completes payment
7. Lenco calls `onSuccess` callback
8. Frontend calls `/api/payments/verify-lenco`
9. Backend verifies with Lenco and activates subscription

### 3. Free Trials

1. User starts trial by adding payment method
2. Backend creates trial subscription (`status: "trialing"`)
3. No immediate charge
4. Daily cron job checks for expired trials
5. When trial ends, system charges saved payment method
6. Subscription becomes `active`

## API Endpoints

### Payment Initiation
```
POST /api/payments/initiate
```
Request:
```json
{
  "tenantId": "tenant-uuid",
  "planId": "basic|business|enterprise",
  "billingInterval": "monthly|yearly",
  "paymentMethod": "mobile_money|card",
  "phoneNumber": "0971234567",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe"
}
```

### Lenco Verification
```
GET /api/payments/verify-lenco?reference=ref-123
```

### Webhooks
- Lipila: `POST /api/payments/callback`
- Lenco: `POST /api/webhooks/lenco`

### Cron Job
```
POST /api/cron/process-expired-trials
Authorization: Bearer CRON_SECRET
```

## Database Schema

### payments table
```sql
- id: uuid
- tenant_id: uuid
- lipila_reference_id: string (payment reference)
- amount: decimal
- currency: string
- status: string (pending|successful|failed)
- payment_method: string (mobile_money|card)
- payment_type: string (AirtelMoney|MtnMoney|Card)
- subscription_id: uuid (foreign key)
- created_at: timestamp
- completed_at: timestamp
```

### subscriptions table
```sql
- id: uuid
- tenant_id: uuid
- plan_id: string
- status: string (trialing|active|cancelled)
- current_period_start: timestamp
- current_period_end: timestamp
- trial_ends_at: timestamp (nullable)
- billing_interval: string (monthly|yearly)
- payment_method_id: uuid (nullable)
```

## Testing

### Mobile Money Testing
1. Use Lipila sandbox dashboard
2. Test with real Zambian phone numbers
3. Use test amounts provided by Lipila

### Card Testing
1. Lenco provides test card numbers in their demo
2. Visit: https://pay.lenco.co/demo
3. Use sandbox widget URL: https://pay.sandbox.lenco.co/js/v1/inline.js

### Webhook Testing
1. Use ngrok or similar for local testing
2. Update webhook URLs in provider dashboards
3. Test all webhook events

## Production Deployment

### 1. Update Environment Variables
```env
LIPILA_ENVIRONMENT=production
LENCO_ENVIRONMENT=production
```

### 2. Configure Webhooks
- Lipila: Set callback URL to `https://yourdomain.com/api/payments/callback`
- Lenco: Set webhook URL to `https://yourdomain.com/api/webhooks/lenco`
- Contact Lenco support at support@lenco.co to configure webhooks

### 3. Set Up Cron Job
Add to your crontab:
```bash
0 2 * * * curl -X POST https://yourdomain.com/api/cron/process-expired-trials -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### 4. Security Considerations
- Protect cron endpoint with secret key
- Use HTTPS for all webhook URLs
- Verify webhook signatures
- Monitor for duplicate webhook events

## Troubleshooting

### Common Issues

1. **Lenco widget not loading**
   - Check `NEXT_PUBLIC_LENCO_PUBLIC_KEY` is set
   - Verify widget URL matches environment
   - Check browser console for errors

2. **Payment not activating subscription**
   - Check webhook logs
   - Verify payment status in database
   - Check for webhook signature verification failures

3. **Trial billing not working**
   - Verify cron job is running
   - Check `processExpiredTrials` logs
   - Ensure payment methods are saved correctly

### Logs to Monitor
- `[Lenco Webhook]` - Lenco webhook events
- `[Lipila Callback]` - Lipila callback events
- `[Trial]` - Trial processing events
- `[Subscription]` - Subscription activation events

## Support Contacts

- **Lipila Support**: Check their dashboard documentation
- **Lenco Support**: support@lenco.co
- **Internal Issues**: Check application logs and database

## Future Enhancements

1. **Payment Method Saving**: Allow users to save payment methods for auto-renewal
2. **Multiple Payment Methods**: Support more payment providers
3. **Subscription Pausing**: Allow users to pause subscriptions
4. **Advanced Analytics**: Payment success rates, churn analysis
5. **Refund Management**: Automated refund processing
