# Industry-Specific Templates — Full Implementation Plan

**Status:** Planned — Not yet implemented  
**Created:** April 2026  
**Author:** FiQ Engineering  
**Depends on:** existing `src/lib/config/templates.ts`, `src/types/index.ts`, `src/lib/engine/handler.ts`

---

## Table of Contents

1. [Goal & Scope](#1-goal--scope)
2. [Industry Use Cases Summary](#2-industry-use-cases-summary)
3. [Architecture Overview](#3-architecture-overview)
4. [Phase 1 — Type System & Schema](#4-phase-1--type-system--schema)
5. [Phase 2 — Integration Layer](#5-phase-2--integration-layer)
6. [Phase 3 — Template Enhancements](#6-phase-3--template-enhancements)
7. [Phase 4 — Handler Extensions](#7-phase-4--handler-extensions)
8. [Phase 5 — Dashboard UI Changes](#8-phase-5--dashboard-ui-changes)
9. [Phase 6 — API Endpoints](#9-phase-6--api-endpoints)
10. [Phased Rollout Schedule](#10-phased-rollout-schedule)
11. [Success Metrics](#11-success-metrics)
12. [Open Questions & Decisions Needed](#12-open-questions--decisions-needed)

---

## 1. Goal & Scope

**Goal:** Transform FiQ's 8 industry templates from generic WhatsApp FAQ bots into industry-specific automation tools that handle real business processes end-to-end.

**In scope:**
- Extended conversation flow engine (typed integration steps)
- External system integrations (Google Calendar, Stripe, custom webhooks)
- New database tables for structured data capture (appointments, leads, returns, card issues)
- Industry-specific dashboard views for each data type
- Integration configuration UI per tenant

**Out of scope (future):**
- Native app integrations (Shopify, Salesforce, OpenTable) — use Custom Webhook for now
- AI-generated appointment slots (manual calendar setup first)
- Payment processing within WhatsApp chat (link to external payment page instead)

---

## 2. Industry Use Cases Summary

Each industry gets exactly 2 deeply-implemented use cases. These are the highest-volume, highest-impact automations for each vertical.

| # | Industry | Use Case 1 | Use Case 2 |
|---|----------|-----------|-----------|
| 1 | **Healthcare** | Appointment Scheduling | Prescription Refill Request |
| 2 | **Restaurant** | Table Reservation | Takeout/Delivery Ordering |
| 3 | **Real Estate** | Property Inquiry & Lead Qualification | Property Viewing Scheduling |
| 4 | **E-commerce** | Order Status & Tracking | Returns / Refunds / Exchanges |
| 5 | **Education** | Enrollment & Admissions Support | Student FAQ & Support Routing |
| 6 | **Travel** | Booking Modification | Itinerary Support & Disruption Alerts |
| 7 | **Finance** | Account Inquiry & Balance Check | Card Issues & Fraud Reporting |
| 8 | **SaaS** | Subscription & Billing Support | Onboarding & Product Setup |

### Justification per industry

#### Healthcare
- Appointment scheduling = 40–60% of all healthcare call volume. No-show rate averages 23% ($200+ cost per no-show). AI-driven confirmations and slot suggestions reduce no-shows by 15–30%.
- Prescription refills = repetitive, rules-based (verify eligibility → pharmacy → confirm). Currently handled entirely by staff. Can be 80% automated.

#### Restaurant
- Reservations spike during dinner hours when staff is least available. AI handles the queue without interruption. Confirmation reminders cut no-shows.
- Phone ordering has a 20% error rate (misheard items). AI eliminates errors and captures every call during rush hours.

#### Real Estate
- First response within 5 minutes increases conversion 400%. AI provides instant response 24/7.
- Agents spend 40% of time on unqualified leads. AI pre-qualifies with budget/timeline/requirements before routing.

#### E-commerce
- "Where's my order?" = 40–60% of e-commerce support volume. Pure data retrieval, ideal for automation.
- Returns = 20–30% of volume. Policy application is rules-based; AI applies consistently and reduces disputes.

#### Education
- Admissions inquiries spike 5–10x during application seasons. Same questions repeat daily.
- Student support is year-round. AI answers 24/7 outside office hours; escalates when judgment is needed.

#### Travel
- Booking changes are time-sensitive and high-anxiety. AI immediately assesses options and change fees.
- Disruptions (delays, cancellations) cause mass simultaneous calls. AI handles volume spikes.

#### Finance
- Balance checks = 50–70% of banking call volume. Zero human judgment needed.
- Fraud reporting is time-critical. AI provides calm, structured rapid response while blocking the card.

#### SaaS
- Billing disputes are the #1 churn trigger. Quick resolution saves 30–40% of at-risk accounts.
- Poor onboarding causes 75% of SaaS churn in the first 90 days. AI guides setup and reduces CSM burden.

---

## 3. Architecture Overview

```
Customer Message (WhatsApp / Voice)
         │
         ▼
   Flow Engine (handler.ts)
         │
    ┌────┴────┐
    │         │
 Question   Integration Step
  Step      (NEW)
    │         │
    │    IntegrationManager
    │         │
    │    ┌────┴──────────────────┐
    │    │                       │
    │  Google Calendar    Custom Webhook
    │  (appointments)     (orders, cards,
    │                      prescriptions)
    │         │
    └────┬────┘
         │
   Action Step (save to DB)
         │
    ┌────┴────────────────────────┐
    │           │         │       │
appointments  leads   returns  card_issues
  (new)       (new)   (new)    (new)
         │
         ▼
   Confirmation Message → Customer
         │
         ▼
   Dashboard View (appointments, leads, etc.)
```

---

## 4. Phase 1 — Type System & Schema

### 4.1 Type Changes

**File:** `src/types/index.ts`

Add the following to `FlowStep`:

```typescript
export interface FlowStep {
  id: string;
  type: "question" | "message" | "action" | "integration" | "condition";
  content?: string;
  action?: FlowAction;
  integration?: IntegrationStepConfig;
  condition?: ConditionConfig;
  on_success?: string;  // next step id on success
  on_failure?: string;  // next step id on failure
  variables_to_collect?: string[]; // variable names this step populates
}

// Extend existing FlowAction type
export type FlowAction =
  | "lookup_order"
  | "save_appointment"        // NEW
  | "check_refill_eligibility" // NEW
  | "reserve_table"            // NEW
  | "place_order"              // NEW
  | "qualify_lead"             // NEW
  | "save_viewing"             // NEW
  | "process_return"           // NEW
  | "check_balance"            // NEW
  | "block_card"               // NEW
  | "update_subscription"      // NEW
  | "escalate_to_human";

// NEW: Integration step configuration
export interface IntegrationStepConfig {
  type: "google_calendar" | "stripe" | "custom_webhook";
  operation: string;
  params: Record<string, string | number | boolean>;
  // Mapping from API response keys → conversation variable names
  response_mapping?: Record<string, string>;
  // What to send customer on failure
  failure_message?: string;
}

// NEW: Condition step (branch logic)
export interface ConditionConfig {
  variable: string;
  operator: "equals" | "not_equals" | "greater_than" | "less_than" | "contains";
  value: string | number;
  true_step: string;
  false_step: string;
}
```

Add to `BusinessConfig`:

```typescript
export interface BusinessConfig {
  // ... all existing fields remain unchanged ...

  // NEW: External system integrations
  integrations?: TenantIntegrations;

  // NEW: Availability configuration for scheduling flows
  scheduling?: SchedulingConfig;
}

export interface TenantIntegrations {
  google_calendar?: {
    enabled: boolean;
    calendar_id: string;
    service_account_json?: string; // stored encrypted
  };
  stripe?: {
    enabled: boolean;
    // NOTE: Store in env vars, never in config JSON
    // This entry just tracks whether Stripe is configured
    publishable_key?: string;
  };
  custom_webhook?: {
    enabled: boolean;
    url: string;
    auth_header?: string;
    headers?: Record<string, string>;
  };
}

export interface SchedulingConfig {
  timezone: string;
  slot_duration_minutes: 15 | 30 | 60;
  booking_window_days: number;  // How many days ahead customers can book
  schedule: {
    // Day name → available hours, null means closed
    [day: string]: { open: string; close: string } | null;
  };
  resources?: SchedulingResource[];  // Doctors, agents, tables, etc.
}

export interface SchedulingResource {
  id: string;
  name: string;       // "Dr. Mwansa", "Table 4", "Agent: John"
  capacity: number;   // 1 for appointments, 4 for table of 4
  calendar_id?: string; // If each resource has its own Google Calendar
}
```

### 4.2 Database Migration

**File:** `supabase/migrations/020_industry_automation.sql`

```sql
-- =============================================
-- Industry Automation Tables
-- Created: April 2026
-- =============================================

-- APPOINTMENTS
-- Used by: healthcare (consultations), restaurant (reservations), real estate (viewings)
CREATE TABLE IF NOT EXISTS appointments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES conversations(id) ON DELETE SET NULL,

  -- Customer
  customer_phone  text,
  customer_name   text,
  customer_email  text,

  -- Appointment
  appointment_type text NOT NULL, -- 'consultation', 'table_reservation', 'property_viewing'
  start_time      timestamptz NOT NULL,
  end_time        timestamptz NOT NULL,
  status          text NOT NULL DEFAULT 'confirmed',
  -- status values: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show'

  -- Resource (doctor, table, agent)
  resource_id     text,
  resource_name   text,

  -- External sync
  external_id     text,  -- Google Calendar event ID, etc.
  external_system text,  -- 'google_calendar' | 'resy' | 'manual'

  -- Data
  notes           text,
  metadata        jsonb DEFAULT '{}',

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_appointments_tenant    ON appointments(tenant_id);
CREATE INDEX idx_appointments_convo     ON appointments(conversation_id);
CREATE INDEX idx_appointments_time      ON appointments(start_time);
CREATE INDEX idx_appointments_status    ON appointments(status);
CREATE INDEX idx_appointments_customer  ON appointments(customer_phone);

-- Enable RLS
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant access only" ON appointments
  USING (tenant_id::text = current_setting('app.tenant_id', true));


-- LEADS
-- Used by: real estate (buyer/seller leads), education (prospective students), SaaS (sales prospects)
CREATE TABLE IF NOT EXISTS leads (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES conversations(id) ON DELETE SET NULL,

  -- Contact
  name            text,
  phone           text,
  email           text,

  -- Qualification data
  budget          text,
  timeline        text,
  requirements    jsonb DEFAULT '[]',
  score           int  DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  status          text NOT NULL DEFAULT 'new',
  -- status values: 'new' | 'qualified' | 'contacted' | 'converted' | 'lost'

  -- Context
  source          text DEFAULT 'whatsapp',  -- 'whatsapp' | 'web' | 'voice'
  notes           text,
  assigned_to     uuid REFERENCES users(id) ON DELETE SET NULL,

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_leads_tenant   ON leads(tenant_id);
CREATE INDEX idx_leads_status   ON leads(status);
CREATE INDEX idx_leads_score    ON leads(score DESC);
CREATE INDEX idx_leads_phone    ON leads(phone);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant access only" ON leads
  USING (tenant_id::text = current_setting('app.tenant_id', true));


-- RETURN REQUESTS
-- Used by: e-commerce
CREATE TABLE IF NOT EXISTS return_requests (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES conversations(id) ON DELETE SET NULL,

  -- Order
  order_id        text NOT NULL,
  order_amount    decimal(10, 2),

  -- Return details
  reason          text,
  item_condition  text,  -- 'unused_with_tags' | 'opened' | 'damaged'
  return_type     text,  -- 'refund' | 'exchange' | 'store_credit'

  -- Processing
  status          text NOT NULL DEFAULT 'pending',
  -- status values: 'pending' | 'approved' | 'rejected' | 'label_sent' | 'received' | 'refunded'
  refund_amount   decimal(10, 2),
  return_label_url text,

  -- External
  external_id     text,
  external_system text,

  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_returns_tenant ON return_requests(tenant_id);
CREATE INDEX idx_returns_order  ON return_requests(order_id);
CREATE INDEX idx_returns_status ON return_requests(status);

ALTER TABLE return_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant access only" ON return_requests
  USING (tenant_id::text = current_setting('app.tenant_id', true));


-- CARD ISSUES
-- Used by: finance
CREATE TABLE IF NOT EXISTS card_issues (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES conversations(id) ON DELETE SET NULL,

  -- Customer
  customer_phone  text,
  customer_name   text,

  -- Issue
  issue_type      text NOT NULL, -- 'lost' | 'stolen' | 'fraud_transaction' | 'damaged'
  card_last4      text,
  reported_at     timestamptz NOT NULL DEFAULT now(),

  -- Processing
  status          text NOT NULL DEFAULT 'reported',
  -- status values: 'reported' | 'blocked' | 'replacement_issued' | 'resolved'

  -- Fraud details (if applicable)
  fraud_amount    decimal(10, 2),
  fraud_merchant  text,
  fraud_date      date,

  -- Resolution
  case_number     text,  -- Internal reference
  external_case_id text, -- Bank system reference

  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_card_issues_tenant  ON card_issues(tenant_id);
CREATE INDEX idx_card_issues_status  ON card_issues(status);
CREATE INDEX idx_card_issues_phone   ON card_issues(customer_phone);

ALTER TABLE card_issues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant access only" ON card_issues
  USING (tenant_id::text = current_setting('app.tenant_id', true));


-- CONVERSATION VARIABLES
-- Stores key-value pairs collected during multi-step flows
-- Allows the handler to persist extracted data across flow steps
CREATE TABLE IF NOT EXISTS conversation_variables (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,

  variable_name   text NOT NULL,
  variable_value  text,
  collected_at_step text,

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  UNIQUE(conversation_id, variable_name)
);

CREATE INDEX idx_conv_vars_conversation ON conversation_variables(conversation_id);

ALTER TABLE conversation_variables ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant access only" ON conversation_variables
  USING (tenant_id::text = current_setting('app.tenant_id', true));


-- TRIGGERS for updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER appointments_updated_at   BEFORE UPDATE ON appointments           FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER leads_updated_at          BEFORE UPDATE ON leads                  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER returns_updated_at        BEFORE UPDATE ON return_requests        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER card_issues_updated_at    BEFORE UPDATE ON card_issues            FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER conv_vars_updated_at      BEFORE UPDATE ON conversation_variables FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

---

## 5. Phase 2 — Integration Layer

### 5.1 File Structure

```
src/lib/integrations/
├── index.ts              ← base Integration interface + registry
├── manager.ts            ← IntegrationManager (tenant-aware executor)
├── google-calendar.ts    ← Google Calendar implementation
├── stripe.ts             ← Stripe implementation
└── custom-webhook.ts     ← Generic webhook implementation
```

### 5.2 Base Interface

**File:** `src/lib/integrations/index.ts`

```typescript
export interface Integration {
  type: string;
  execute(operation: string, params: Record<string, any>): Promise<IntegrationResult>;
}

export interface IntegrationResult {
  success: boolean;
  data?: Record<string, any>;
  error?: string;
}

export { GoogleCalendarIntegration } from "./google-calendar";
export { StripeIntegration }         from "./stripe";
export { CustomWebhookIntegration }  from "./custom-webhook";
```

### 5.3 Google Calendar Integration

**File:** `src/lib/integrations/google-calendar.ts`

Operations to implement:
- `check_availability` — query freebusy API for available slots
- `create_event` — create appointment event
- `cancel_event` — delete/cancel event by ID
- `list_events` — list upcoming events for a calendar

Dependencies to add to `package.json`:
```json
"googleapis": "^144.0.0"
```

### 5.4 Custom Webhook Integration

**File:** `src/lib/integrations/custom-webhook.ts`

Generic POST to any URL with:
- Auth header injection
- Variable resolution in body
- Response mapping to conversation variables
- Timeout and retry logic (3 retries, 5s timeout)

### 5.5 Stripe Integration

**File:** `src/lib/integrations/stripe.ts`

Operations to implement:
- `process_refund` — create refund against a charge ID
- `get_subscription` — retrieve subscription details
- `update_subscription` — upgrade / downgrade / cancel
- `get_invoice` — retrieve invoice details

Dependencies already in `package.json`: `stripe` (verify version)

### 5.6 Integration Manager

**File:** `src/lib/integrations/manager.ts`

```typescript
export class IntegrationManager {
  static async execute(
    tenantConfig: TenantIntegrations,
    integrationType: string,
    operation: string,
    params: Record<string, any>
  ): Promise<IntegrationResult>;

  static resolveVariables(
    params: Record<string, any>,
    variables: Record<string, string>
  ): Record<string, any>;
  // Replaces {{variable_name}} in params with actual values

  static mapResponse(
    result: Record<string, any>,
    mapping: Record<string, string>
  ): Record<string, string>;
  // Maps response keys to conversation variable names
}
```

---

## 6. Phase 3 — Template Enhancements

Each template in `src/lib/config/templates.ts` gets 2 new flows with `integration` and `action` step types.

### Healthcare — New Flows

#### Flow 1: `schedule_appointment`
Triggers: "appointment", "book", "schedule", "see doctor", "doctor available"

Steps:
1. `ask_reason` (question) — "What type of appointment? General / Follow-up / Lab / Specialist"
2. `ask_doctor` (question) — "Preferred doctor, or first available?"
3. `ask_date` (question) — "Preferred date or 'earliest available'?"
4. `ask_time` (question) — "Morning / Afternoon / Evening?"
5. `check_availability` (integration: google_calendar → check_availability) — returns `available_slots`
6. `suggest_slots` (message) — Shows slots from `{{available_slots}}`
7. `confirm_slot` (question) — "Which slot would you like?"
8. `ask_contact` (question) — "Your full name and email for the confirmation?"
9. `create_event` (integration: google_calendar → create_event)
10. `save_to_db` (action: save_appointment)
11. `confirmation` (message) — Full appointment summary with reminder note

#### Flow 2: `prescription_refill`
Triggers: "refill", "prescription", "medication", "medicine", "tablets"

Steps:
1. `ask_medication` (question) — "Which medication?"
2. `ask_patient_id` (question) — "Patient ID or date of birth?"
3. `ask_pharmacy` (question) — "Which pharmacy?"
4. `check_eligibility` (action: check_refill_eligibility) — checks last refill date in custom webhook
5. `submit_refill` (integration: custom_webhook → submit_refill_request)
6. `confirmation` (message) — "Refill request submitted to {{pharmacy}}. Ready within 24–48 hours."

---

### Restaurant — New Flows

#### Flow 1: `reserve_table`
Triggers: "reservation", "book a table", "reserve", "table for", "dining"

Steps:
1. `ask_party_size` (question) — "How many people?"
2. `ask_date` (question) — "Which date?"
3. `ask_time` (question) — "Preferred time?"
4. `ask_special` (question) — "Any special requests? (birthday, dietary, etc.) or say 'none'"
5. `check_availability` (integration: custom_webhook → check_table_availability) — returns `available_times`
6. `suggest_times` (message) — Shows `{{available_times}}`
7. `confirm_time` (question) — "Which time works?"
8. `ask_contact` (question) — "Name and phone for the reservation?"
9. `save_reservation` (integration: custom_webhook → create_reservation)
10. `save_to_db` (action: save_appointment with type='table_reservation')
11. `confirmation` (message) — Reservation summary + reminder note

#### Flow 2: `takeout_order`
Triggers: "order", "takeout", "collection", "pick up", "takeaway"

Steps:
1. `ask_items` (question) — "What would you like to order? (say menu items)"
2. `build_order` (action: parse_order_items) — AI extracts items to structured list
3. `show_order` (message) — "Your order:\n{{order_items}}\nTotal: {{total}}\nAnything else?"
4. `confirm_or_add` (question) — "Confirm order or add/remove items?"
5. `ask_name` (question) — "Name for the order?"
6. `ask_pickup_time` (question) — "When would you like to pick up?"
7. `submit_order` (integration: custom_webhook → create_order)
8. `confirmation` (message) — "Order #{{order_number}} placed! Ready in ~{{prep_time}} mins."

---

### Real Estate — New Flows

#### Flow 1: `qualify_lead`
Triggers: "property", "house", "apartment", "buy", "rent", "looking for"

Steps:
1. `ask_transaction` (question) — "Are you looking to buy or rent?"
2. `ask_type` (question) — "What type of property? House / Apartment / Commercial / Land"
3. `ask_budget` (question) — "What is your budget range?"
4. `ask_location` (question) — "Preferred area or neighbourhood?"
5. `ask_timeline` (question) — "How soon are you looking to move? Immediately / 1–3 months / 3–6 months / Just browsing"
6. `ask_preapproval` (question — condition branch) — "Have you been pre-approved for a mortgage? (buyers only)"
7. `ask_contact` (question) — "Your full name and email so an agent can follow up?"
8. `score_lead` (action: qualify_lead) — Calculates score (0–100) based on answers
9. `save_to_db` (action: save_lead)
10. `qualified_response` (message, condition: score >= 50) — "Great! An agent will contact you within 30 minutes."
11. `nurture_response` (message, condition: score < 50) — "Thanks! We'll send you matching listings as they come up."

#### Flow 2: `schedule_viewing`
Triggers: "viewing", "view property", "see the house", "arrange a visit"

Steps:
1. `ask_property` (question) — "Which property? (address or listing reference)"
2. `ask_date` (question) — "Preferred date?"
3. `ask_time` (question) — "Morning or afternoon?"
4. `check_agent_availability` (integration: google_calendar → check_availability)
5. `suggest_slots` (message) — Shows available slots
6. `confirm_slot` (question) — "Which time works for you?"
7. `ask_contact` (question) — "Full name and phone number?"
8. `book_viewing` (integration: google_calendar → create_event)
9. `save_to_db` (action: save_appointment with type='property_viewing')
10. `confirmation` (message) — Viewing details + agent name + property address

---

### E-commerce — New Flows

#### Flow 1: `order_status` (enhance existing)
Triggers: "track", "order status", "where is", "delivery", "shipped"

Enhance the existing `order_tracking` flow — add a real integration step:
- `lookup_order` (integration: custom_webhook → get_order_status) — returns `order_status`, `tracking_url`, `eta`
- Replace static message with dynamic: "Your order is {{order_status}}. ETA: {{eta}}. Track: {{tracking_url}}"

#### Flow 2: `return_initiation` (enhance existing)
Triggers: "return", "refund", "exchange", "send back"

Enhance the existing `return_initiation` flow — add real processing:
- `check_eligibility` (integration: custom_webhook → check_return_eligibility) — validates order age and condition
- `submit_return` (integration: custom_webhook → create_return) — creates return in system
- `save_to_db` (action: process_return)
- `issue_label` (integration: custom_webhook → generate_return_label) — returns `label_url`
- Confirmation includes label URL and refund timeline

---

### Education — New Flows

#### Flow 1: `enrollment_inquiry`
Triggers: "enroll", "apply", "admission", "program", "course", "register"

Steps:
1. `ask_program_type` (question) — "Are you interested in a degree, diploma, short course, or professional certification?"
2. `ask_field` (question) — "What field? Business / Technology / Health / Arts / Other"
3. `ask_study_mode` (question) — "Full-time, part-time, or online?"
4. `ask_start` (question) — "When do you plan to start? Next intake / Next year / Just exploring"
5. `provide_programs` (integration: custom_webhook → match_programs) — returns `matched_programs`
6. `show_options` (message) — Shows matched programs
7. `ask_interest` (question) — "Which program interests you most?"
8. `ask_contact` (question) — "Full name and email for more information?"
9. `save_lead` (action: qualify_lead with type='education')
10. `confirmation` (message) — "We'll send full details and application requirements to {{email}}."

#### Flow 2: `student_support`
Triggers: "help", "support", "question", "issue", "problem", "deadline"

Steps:
1. `categorise_issue` (question) — "What do you need help with?\n• Fees & Payments\n• Timetable\n• Registration\n• Results\n• Campus services\n• Something else"
2. Route to category-specific sub-flow or AI response based on selection
3. `resolve_or_escalate` (condition) — If AI confidence < 0.8, escalate with full context
4. `escalation` (action: escalate_to_human) — Includes issue category and conversation summary

---

### Travel — New Flows

#### Flow 1: `booking_modification`
Triggers: "change", "modify", "reschedule", "cancel booking", "alter my"

Steps:
1. `ask_booking_ref` (question) — "Your booking reference number?"
2. `ask_change_type` (question) — "What would you like to change?\n• Dates\n• Passengers\n• Seat/Room upgrade\n• Cancel booking"
3. `lookup_booking` (integration: custom_webhook → get_booking) — returns `booking_details`, `change_fee`, `cancellation_policy`
4. `show_booking` (message) — Shows booking details and applicable fees
5. `confirm_change` (question) — "Confirm the change for {{change_fee}}?"
6. `process_change` (integration: custom_webhook → modify_booking)
7. `confirmation` (message) — Change summary with new details

#### Flow 2: `disruption_support`
Triggers: "delayed", "cancelled", "missed", "flight cancelled", "stranded"

Steps:
1. `ask_booking_ref` (question) — "Booking reference or flight number?"
2. `ask_issue` (question) — "What happened?\n• Flight delayed\n• Flight cancelled\n• Missed connection\n• Baggage lost\n• Other"
3. `lookup_flight` (integration: custom_webhook → get_flight_status)
4. `provide_options` (message) — Shows rebooking options or policy based on disruption type
5. `escalate_with_context` (action: escalate_to_human) — Passes all context: booking ref, issue type, flight status, customer urgency

---

### Finance — New Flows

#### Flow 1: `account_inquiry`
Triggers: "balance", "account", "statement", "transaction", "check my"

Steps:
1. `verify_identity` (question) — "For security, please confirm the last 4 digits of your ID number."
2. `verify_phone` (action: send_otp_via_sms) — Sends OTP to registered number
3. `ask_otp` (question) — "Please enter the OTP sent to your registered number."
4. `validate_otp` (action: validate_otp)
5. `ask_inquiry_type` (question) — "What would you like to check?\n• Account balance\n• Last 5 transactions\n• Statement request"
6. `fetch_data` (integration: custom_webhook → get_account_data) — returns `balance`, `transactions`, etc.
7. `show_data` (message) — Presents account information
8. Note: No actual account numbers displayed in chat for security

#### Flow 2: `card_issue_report`
Triggers: "stolen", "lost card", "fraud", "suspicious transaction", "block my card"

Steps:
1. `acknowledge_urgency` (message) — "I'll help you immediately. Your security is our top priority."
2. `ask_issue_type` (question) — "What happened?\n• Card lost\n• Card stolen\n• Suspicious transaction\n• Card damaged"
3. `ask_card_last4` (question) — "Last 4 digits of the card?"
4. `block_card` (integration: custom_webhook → block_card_immediately)
5. `confirm_block` (message) — "Your card ending in {{card_last4}} has been blocked."
6. `ask_fraud_details` (question — condition: issue_type=fraud) — "When and where was the suspicious transaction?"
7. `save_issue` (action: block_card) — Saves to card_issues table
8. `escalate` (action: escalate_to_human) — Routes to fraud team with full report
9. `next_steps` (message) — "A replacement card will be issued within 3–5 business days. Case #{{case_number}} has been opened."

---

### SaaS — New Flows

#### Flow 1: `billing_support`
Triggers: "billing", "invoice", "charge", "payment", "subscription", "plan", "cancel subscription"

Steps:
1. `ask_issue` (question) — "What's your billing question?\n• View invoice\n• Change plan\n• Failed payment\n• Cancel subscription\n• Unexpected charge"
2. `ask_account_email` (question) — "Email address on your account?"
3. `fetch_account` (integration: custom_webhook → get_account_by_email) — returns `subscription`, `balance`, `invoices`
4. Route to sub-flow based on issue type:
   - **View invoice** → fetch and send invoice PDF link
   - **Change plan** → show plan options, confirm, `update_subscription` via Stripe
   - **Failed payment** → show payment method on file, retry or update
   - **Cancel** → show retention offer first, then process if confirmed
5. `save_outcome` (action: update_subscription)
6. `confirmation` (message) — Issue-specific summary

#### Flow 2: `onboarding_support`
Triggers: "setup", "getting started", "how do I", "help with", "configure", "onboard"

Steps:
1. `ask_role` (question) — "What's your role? Owner / Admin / Support Agent / Developer"
2. `ask_goal` (question) — "What are you trying to accomplish first?\n• Connect WhatsApp\n• Set up the AI\n• Add team members\n• Configure automations\n• Other"
3. `provide_steps` (integration: custom_webhook → get_onboarding_guide) — returns role + goal specific steps
4. `show_guide` (message) — Step-by-step guide
5. `ask_stuck` (question) — "Were you able to complete these steps?"
6. `escalate_if_stuck` (condition: answer='no') — Escalate to onboarding specialist with context
7. `book_call` (question — condition: stuck) — "Would you like to book a 15-minute setup call with our team?"
8. `schedule_call` (integration: google_calendar → create_event — if yes)

---

## 7. Phase 4 — Handler Extensions

**File:** `src/lib/engine/handler.ts`

### 7.1 Conversation Variables Store

Add helpers to persist and retrieve variables collected during a flow:

```typescript
async function getConversationVariables(
  conversationId: string
): Promise<Record<string, string>>;

async function setConversationVariable(
  tenantId: string,
  conversationId: string,
  name: string,
  value: string,
  stepId: string
): Promise<void>;

async function clearConversationVariables(
  conversationId: string
): Promise<void>;
```

### 7.2 Integration Step Handler

```typescript
async function executeIntegrationStep(
  step: FlowStep,
  conversation: Conversation,
  tenant: Tenant,
  variables: Record<string, string>
): Promise<{ success: boolean; variables: Record<string, string>; message?: string }>;
```

Logic:
1. Resolve `{{variable}}` placeholders in `step.integration.params` using `variables`
2. Call `IntegrationManager.execute(tenant.config.integrations, ...)`
3. Map response to new variable names via `step.integration.response_mapping`
4. On failure: return `step.integration.failure_message` to customer

### 7.3 Action Step Handler Extensions

Extend existing action handler to cover new actions:

| Action | Table | Key operation |
|--------|-------|---------------|
| `save_appointment` | `appointments` | INSERT with all collected variables |
| `save_viewing` | `appointments` | INSERT with type='property_viewing' |
| `qualify_lead` | `leads` | INSERT + compute score |
| `process_return` | `return_requests` | INSERT, trigger webhook |
| `block_card` | `card_issues` | INSERT + trigger custom_webhook immediately |
| `update_subscription` | — | Stripe API call |
| `check_refill_eligibility` | — | Custom webhook call |

### 7.4 Condition Step Handler

```typescript
function evaluateCondition(
  condition: ConditionConfig,
  variables: Record<string, string>
): boolean;
// Returns true/false → determines next_step_id
```

---

## 8. Phase 5 — Dashboard UI Changes

### 8.1 Integration Configuration Page

**New file:** `src/app/dashboard/integrations/page.tsx`

Sections:
- Google Calendar — calendar ID + service account JSON upload
- Stripe — publishable key (secret in env vars)
- Custom Webhook — URL + auth header + test button

Each integration card:
- Toggle to enable/disable
- Status indicator (connected / not configured / error)
- "Test Connection" button → calls new `/api/integrations/[type]/test`

### 8.2 Appointments Dashboard

**New file:** `src/app/dashboard/appointments/page.tsx`

Features:
- Table of upcoming appointments (sortable by date, status, type)
- Status badges (Confirmed / Cancelled / Completed / No-Show)
- One-click cancel button
- Export to CSV

### 8.3 Leads Dashboard

**New file:** `src/app/dashboard/leads/page.tsx`

Features:
- Leads table with score bar (0–100)
- Status pipeline view (New → Qualified → Contacted → Converted)
- Assign lead to team member
- One-click WhatsApp follow-up

### 8.4 Returns Dashboard

**New file:** `src/app/dashboard/returns/page.tsx`

Features:
- Returns queue with status
- Approve / Reject buttons
- View customer conversation link

### 8.5 Scheduling Configuration

**Add to:** `src/app/dashboard/settings/page.tsx`

New "Scheduling" tab:
- Timezone picker
- Day-by-day hours
- Slot duration (15 / 30 / 60 min)
- Booking window (1–30 days)
- Add resources (e.g., add doctors, add tables)

### 8.6 Industry Template Preview in Onboarding

**Update:** `src/app/dashboard/onboarding-wizard.tsx` and `src/components/dashboard/onboarding-wizard.tsx`

When user selects industry, show:
- 2 use cases with description
- Required integrations for those use cases (with setup links)
- "Preview flow" button showing the steps

---

## 9. Phase 6 — API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/appointments` | List appointments for tenant |
| POST | `/api/appointments` | Create appointment (from flow) |
| PATCH | `/api/appointments/[id]` | Update status (cancel, complete) |
| GET | `/api/leads` | List leads |
| POST | `/api/leads` | Create/update lead |
| PATCH | `/api/leads/[id]` | Update lead status / assign |
| GET | `/api/returns` | List return requests |
| PATCH | `/api/returns/[id]` | Approve / reject return |
| GET | `/api/card-issues` | List card issues |
| PATCH | `/api/card-issues/[id]` | Update case status |
| POST | `/api/integrations/[type]/test` | Test integration connection |
| GET | `/api/integrations` | Get configured integrations for tenant |
| PATCH | `/api/integrations/[type]` | Save integration config |
| GET | `/api/scheduling/availability` | Get available slots for a date range |

All new endpoints follow the existing pattern: `requireSession()` + tenant scoping.

---

## 10. Phased Rollout Schedule

### Week 1–2: Foundation
- [ ] Extend `FlowStep`, `FlowAction`, `IntegrationStepConfig` in `src/types/index.ts`
- [ ] Add `TenantIntegrations` and `SchedulingConfig` to `BusinessConfig`
- [ ] Create `supabase/migrations/020_industry_automation.sql`
- [ ] Run migration on staging, verify all tables
- [ ] Create `src/lib/integrations/` folder structure
- [ ] Implement `IntegrationManager` + `CustomWebhookIntegration`
- [ ] Add `executeIntegrationStep` and `getConversationVariables` to handler

### Week 3: Healthcare + Restaurant
- [ ] Update healthcare template: `schedule_appointment` flow
- [ ] Update healthcare template: `prescription_refill` flow
- [ ] Implement `GoogleCalendarIntegration` (`check_availability`, `create_event`)
- [ ] Update restaurant template: `reserve_table` flow
- [ ] Update restaurant template: `takeout_order` flow
- [ ] Test appointment booking end-to-end (WhatsApp → Calendar → DB)
- [ ] Build integration configuration page
- [ ] Build appointments dashboard

### Week 4: Real Estate + E-commerce
- [ ] Update real estate template: `qualify_lead` flow
- [ ] Update real estate template: `schedule_viewing` flow
- [ ] Implement lead scoring logic in `qualify_lead` action
- [ ] Enhance e-commerce `order_status` flow with real webhook lookup
- [ ] Enhance e-commerce `return_initiation` flow with eligibility + label
- [ ] Implement `StripeIntegration` (process_refund, basic operations)
- [ ] Build leads dashboard
- [ ] Build returns dashboard

### Week 5: Education + Travel + Finance + SaaS
- [ ] Update education template: `enrollment_inquiry` flow
- [ ] Update education template: `student_support` flow
- [ ] Update travel template: `booking_modification` flow
- [ ] Update travel template: `disruption_support` flow
- [ ] Update finance template: `account_inquiry` flow (with OTP verification stub)
- [ ] Update finance template: `card_issue_report` flow
- [ ] Update SaaS template: `billing_support` flow (Stripe integration)
- [ ] Update SaaS template: `onboarding_support` flow
- [ ] Build card issues dashboard

### Week 6: Polish + Launch
- [ ] Scheduling configuration UI in settings
- [ ] Industry template preview in onboarding wizard
- [ ] All new API endpoints
- [ ] End-to-end testing: one customer per industry
- [ ] Error handling audit: all integration steps must have `failure_message`
- [ ] Security review: OTP flow (finance), card data handling, webhook auth
- [ ] Documentation per industry for customer-facing help centre

---

## 11. Success Metrics

| Metric | Target |
|--------|--------|
| Template adoption | ≥70% of new tenants use industry flows (not just defaults) |
| Flow completion rate | ≥60% of triggered flows complete all steps |
| Integration success rate | ≥95% uptime for external API calls |
| Appointment no-show reduction | ≥20% vs. manual booking (measure after 60 days) |
| Lead qualification time | From 2+ hours → <1 minute |
| Return processing time | From 24+ hours → <5 minutes for AI-initiated returns |
| Support escalation rate | ≥30% reduction in escalations for covered use cases |

---

## 12. Open Questions & Decisions Needed

### Before implementation begins:

1. **Google Calendar vs. own availability engine**
   - Google Calendar requires customers to share their calendar with FiQ
   - Alternative: build a simple availability engine in Supabase (no external dependency)
   - **Recommended:** Ship with own availability engine first; add Google Calendar as optional sync in v2

2. **OTP verification for Finance flows**
   - Finance account inquiries require identity verification
   - FiQ doesn't have direct bank integration; is this feature realistic for our customers?
   - **Decision needed:** Scope down to "general financial FAQ" or require custom webhook per bank?

3. **Menu data for Restaurant ordering**
   - Order flow requires knowing the menu (items, prices, categories)
   - How do restaurant customers provide their menu to FiQ?
   - **Options:** (a) Manual entry in dashboard, (b) Import from URL/PDF, (c) Custom webhook to POS
   - **Recommended:** Manual entry in dashboard for MVP, POS webhook in v2

4. **Stripe secret key handling**
   - Stripe requires the secret key server-side; must NOT be stored in `config` JSONB (exposed in API responses)
   - **Decision:** Store Stripe secret key in a separate encrypted `tenant_secrets` table, not in `tenants.config`
   - This needs a new migration and a secret management pattern before Stripe integration ships

5. **Pricing implications**
   - Integration steps consume API calls (Google, Stripe, webhooks)
   - Should these be billable events or included in plan?
   - **Decision needed before Phase 3**

6. **Voice vs. WhatsApp parity**
   - Are these flows WhatsApp-only, or do voice call flows need the same use cases?
   - Integration steps work server-side so they can serve both channels
   - **Recommended:** Build channel-agnostic actions; flows work on both channels

---

*Last updated: April 2026*  
*Next review: After Phase 1 completion*
