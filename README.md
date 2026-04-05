# First in Queue — Intelligent WhatsApp Customer Care Platform

**First in Queue** is an AI-powered WhatsApp customer care platform that any business can configure and deploy in minutes. Built on the WhatsApp Cloud API with GPT-4o intelligence, it delivers instant, context-aware support that speaks your customers' language.

---

## Why First in Queue?

| Problem | First in Queue Solution |
|---|---|
| Most chatbots are rule-based and frustrating | GPT-4o AI that truly understands context and intent |
| Competitors charge $99-499/mo | Free tier + $49/mo Growth plan |
| Complex setup taking weeks | 5-minute setup with industry templates |
| No seamless human handoff | Smart escalation with full context transfer |
| English-only or poor multi-language | Auto-detects and responds in 40+ languages |
| Not WhatsApp-compliant | Built for business customer service (Meta-compliant) |

---

## Features

- **AI-Powered Responses** — GPT-4o understands your business, products, and policies
- **Multi-Language Support** — Auto-detects customer language and responds naturally in 40+ languages
- **Smart Human Handoff** — Seamless escalation to agents with full conversation context
- **Conversation Flows** — Multi-step workflows for order tracking, bookings, returns, etc.
- **Rich Media** — Interactive buttons, list menus, images, documents, locations
- **Business Config System** — JSON-based configuration with industry templates
- **Analytics Dashboard** — Sentiment tracking, resolution rates, peak hours, agent performance
- **Industry Templates** — Pre-built configs for E-Commerce, Healthcare, Restaurant, Real Estate
- **24/7 Availability** — AI assistant that never sleeps
- **WhatsApp Compliant** — Fully compliant with Meta's Business API terms

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16 (App Router) |
| **Language** | TypeScript |
| **Database** | Supabase (PostgreSQL) |
| **AI Engine** | OpenAI GPT-4o |
| **Messaging** | WhatsApp Cloud API |
| **Styling** | Tailwind CSS v4 |
| **UI Components** | Radix UI + custom components |
| **Icons** | Lucide React |
| **Deployment** | Vercel / Netlify / any Node.js host |

---

## Architecture

```
First in Queue/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── page.tsx                  # Marketing landing page
│   │   ├── layout.tsx                # Root layout (+ ToastProvider)
│   │   ├── not-found.tsx             # Custom 404 page
│   │   ├── login/page.tsx            # Login / signup page
│   │   ├── api/
│   │   │   ├── webhook/route.ts      # WhatsApp webhook handler
│   │   │   ├── auth/login/route.ts   # Auth login endpoint
│   │   │   ├── auth/logout/route.ts  # Auth logout endpoint
│   │   │   ├── conversations/        # Conversations CRUD API
│   │   │   ├── analytics/route.ts    # Analytics API
│   │   │   └── tenants/route.ts      # Tenant management API
│   │   └── dashboard/
│   │       ├── page.tsx              # Dashboard overview
│   │       ├── loading.tsx           # Loading skeleton
│   │       ├── error.tsx             # Error boundary
│   │       ├── conversations/        # Live chat management
│   │       ├── analytics/            # Analytics & insights
│   │       ├── ai-config/            # AI personality & knowledge base
│   │       ├── flows/                # Conversation flow builder
│   │       ├── agents/               # Agent management
│   │       ├── integrations/         # Third-party integrations
│   │       └── settings/             # Business settings
│   ├── lib/
│   │   ├── whatsapp/client.ts        # WhatsApp Cloud API client
│   │   ├── ai/engine.ts              # AI engine (OpenAI integration)
│   │   ├── engine/handler.ts         # Core message orchestrator
│   │   ├── db/operations.ts          # Database operations
│   │   ├── config/templates.ts       # Industry config templates
│   │   ├── supabase/                 # Supabase client setup (lazy init)
│   │   ├── api/rate-limit.ts         # Rate limiting middleware
│   │   ├── api/errors.ts             # API error helpers
│   │   ├── hooks/use-api.ts          # API fetch hook with fallback
│   │   ├── hooks/use-realtime.ts     # Supabase Realtime hook
│   │   └── utils.ts                  # Utility functions
│   ├── components/
│   │   ├── ui/toast.tsx              # Toast notification system
│   │   ├── ui/skeleton.tsx           # Loading skeleton components
│   │   ├── ui/                       # Reusable UI components
│   │   └── dashboard/sidebar.tsx     # Dashboard navigation + logout
│   ├── middleware.ts                  # Rate limiting + auth guard
│   └── types/index.ts                # TypeScript type definitions
├── supabase/
│   └── migrations/                   # Database schema SQL
├── .env.example                      # Environment variables template
└── package.json
```

---

## Quick Start

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project
- A [Meta Developer](https://developers.facebook.com) account with WhatsApp Business API access
- An [OpenAI](https://platform.openai.com) API key

### 1. Clone & Install

```bash
git clone https://github.com/your-org/First in Queue.git
cd First in Queue
npm install
```

### 2. Setup Environment

```bash
cp .env.example .env.local
```

Edit `.env.local` with your credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

WHATSAPP_ACCESS_TOKEN=your-whatsapp-access-token
WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id
WHATSAPP_BUSINESS_ACCOUNT_ID=your-business-account-id
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your-custom-verify-token

OPENAI_API_KEY=your-openai-api-key

# Auth (uses SUPABASE_SERVICE_ROLE_KEY as fallback if not set)
AUTH_TOKEN_SECRET=your-random-secret-key
ADMIN_EMAILS=admin@yourdomain.com
ADMIN_PASSWORD=your-secure-admin-password

# Payments
LIPILA_API_KEY=your-lipila-api-key
LIPILA_CALLBACK_URL=https://your-domain.com/api/webhooks/lipila
LENGO_PUBLIC_KEY=your-lenco-public-key

# Voice (optional)
RETELL_API_KEY=your-retell-api-key

# WhatsApp contact number shown on landing/contact pages
NEXT_PUBLIC_WHATSAPP_NUMBER=260XXXXXXXXX
```

### 3. Setup Database

Run the migration SQL in your Supabase SQL Editor:

```bash
# Copy and run the contents of:
supabase/migrations/001_initial_schema.sql
```

### 4. Configure WhatsApp Webhook

1. Go to [Meta Developer Console](https://developers.facebook.com)
2. Navigate to your WhatsApp app > Configuration > Webhooks
3. Set webhook URL: `https://your-domain.com/api/webhook`
4. Set verify token: same as `WHATSAPP_WEBHOOK_VERIFY_TOKEN` in your `.env.local`
5. Subscribe to: `messages`, `message_deliveries`, `message_reads`

### 5. Run

```bash
npm run dev
```

Visit:
- **Landing page**: http://localhost:3000
- **Login**: http://localhost:3000/login
- **Dashboard**: http://localhost:3000/dashboard (requires auth)

---

## Authentication

First in Queue uses cookie-based authentication with middleware protection:

- **Login page** at `/login` with email/password and demo mode
- **Auth cookie** (`fiq-auth`) — HMAC-signed token containing userId, email, and tenantId
- **Admin cookie** (`fiq-admin-auth`) — HMAC-signed session token
- **Middleware** validates token signatures and redirects unauthenticated users from `/dashboard/*` to `/login`
- **Tenant isolation** — all API routes extract tenantId from the signed auth token, not from query params
- **Rate limiting** on API routes (120 req/min per IP, webhook excluded)
- **Sign Out** button in dashboard sidebar

---

## Business Configuration

First in Queue uses a JSON-based configuration system. Each tenant/business has a `config` object that defines:

```typescript
{
  business_name: "My Store",
  industry: "ecommerce",
  description: "An online store...",
  personality: {
    name: "Alex",           // Bot's name
    tone: "friendly",       // professional | friendly | casual | formal
    emoji_usage: "moderate", // none | minimal | moderate | heavy
    response_style: "balanced" // concise | balanced | detailed
  },
  welcome_message: "Hey {customer_name}! Welcome to {business_name}!",
  knowledge_base: [...],    // Business facts the AI should know
  faqs: [...],              // Common Q&A pairs
  quick_replies: [...],     // Instant keyword-triggered responses
  flows: [...],             // Multi-step conversation workflows
  escalation_rules: [...],  // When to escalate to human agents
  languages: ["en", "es"],  // Supported languages
  custom_instructions: "..." // Additional AI behavior rules
}
```

### Industry Templates

Pre-built templates are available for:

| Template | Includes |
|---|---|
| **E-Commerce** | Order tracking, returns, shipping FAQs, upselling |
| **Healthcare** | Appointments, lab results, HIPAA-conscious responses |
| **Restaurant** | Reservations, menu info, delivery, catering |
| **Real Estate** | Property search, viewings, agent handoff |

---

## API Reference

### Webhook (WhatsApp)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/webhook` | WhatsApp webhook verification |
| `POST` | `/api/webhook` | Incoming message handler |

### Conversations

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/conversations` | List conversations |
| `GET` | `/api/conversations/[id]` | Get conversation details |
| `PATCH` | `/api/conversations/[id]` | Update conversation (status, tags, etc.) |
| `GET` | `/api/conversations/[id]/messages` | Get messages in conversation |
| `POST` | `/api/conversations/[id]/messages` | Send message as agent |

### Analytics & Tenants

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/analytics` | Get analytics data |
| `GET` | `/api/tenants` | List tenants |
| `POST` | `/api/tenants` | Create/update tenant |

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/login` | Login (sets auth cookie) |
| `POST` | `/api/auth/logout` | Logout (clears auth cookie) |

---

## Message Flow

```
Customer sends WhatsApp message
        │
        ▼
  WhatsApp Cloud API
        │
        ▼
  POST /api/webhook
        │
        ▼
  handleWebhook() ─── Status update? ──→ Update message status
        │
        ▼
  getTenant() ──→ Load business config
        │
        ▼
  getOrCreateConversation()
        │
        ▼
  Is conversation in "handoff" mode?
  ├─ YES ──→ Skip auto-reply (agent handles it)
  └─ NO
        │
        ▼
  Match quick reply?
  ├─ YES ──→ Send instant response
  └─ NO
        │
        ▼
  Is this a new conversation?
  ├─ YES ──→ Send welcome message + menu buttons
  └─ NO
        │
        ▼
  AI Engine (GPT-4o)
  ├─ Build system prompt from business config
  ├─ Include conversation history (last 20 messages)
  ├─ Generate contextual response
  └─ Analyze sentiment + detect escalation need
        │
        ▼
  Should escalate?
  ├─ YES ──→ Find available agent ──→ Handoff
  └─ NO ──→ Send AI response (with optional action buttons)
```

---

## Deployment

### Vercel (Recommended)

```bash
npm i -g vercel
vercel --prod
```

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Important Notes

- Your deployment URL must be **HTTPS** for WhatsApp webhooks
- For local development, use [ngrok](https://ngrok.com): `ngrok http 3000`
- Set all environment variables in your deployment platform

---

## Roadmap

- [x] AI-powered conversation engine (GPT-4o)
- [x] Full dashboard with 8+ pages
- [x] HMAC-signed cookie auth with tenant isolation
- [x] Admin panel with signed session tokens
- [x] Toast notification system
- [x] Loading skeletons & error boundaries
- [x] Interactive UI (save, connect, resolve, take over, create)
- [x] Real-time hooks (Supabase Realtime)
- [x] Lipila mobile money payments (Airtel, MTN, Zamtel)
- [x] Lenco card payments
- [x] Trial management with auto-charge on expiry
- [x] Voice agents (Retell AI integration)
- [x] Lead scoring & CRM
- [x] Booking management
- [x] Scheduled messages
- [x] Web crawling for knowledge base population
- [x] Industry templates (E-Commerce, Healthcare, Restaurant, Real Estate)
- [ ] Visual flow builder (drag-and-drop)
- [ ] Shopify/WooCommerce order sync
- [ ] CRM integrations (HubSpot, Salesforce)
- [ ] Slack/Teams agent notifications
- [ ] WhatsApp template message management
- [ ] Customer satisfaction surveys (CSAT)
- [ ] Proactive cart abandonment recovery

---

## License

MIT License. See [LICENSE](LICENSE) for details.

---

**Built with** Next.js, Supabase, OpenAI & WhatsApp Cloud API
