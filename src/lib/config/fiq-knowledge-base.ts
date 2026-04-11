// =============================================
// FIRST IN QUEUE (FiQ) - Complete Knowledge Base
// For use by the FiQ Assistant
// =============================================

export const fiqKnowledgeBase = {
  // ============================================
  // SECTION 1: PRODUCT OVERVIEW
  // ============================================
  productOverview: {
    name: "First in Queue (FiQ)",
    tagline: "AI-Powered WhatsApp Business Automation",
    description: `First in Queue (FiQ) is an AI-powered customer engagement platform that helps businesses automate WhatsApp conversations and handle voice calls. It combines intelligent chatbots with human handoff capabilities to provide 24/7 customer support, lead qualification, appointment booking, and more.

FiQ integrates with the WhatsApp Business API to enable automated messaging at scale, while maintaining a personal, conversational experience for customers. The platform is designed for businesses of all sizes, from solo entrepreneurs to large enterprises.`,
    
    keyValuePropositions: [
      "24/7 automated customer support in 40+ languages",
      "Reduce response time from hours to seconds",
      "Handle unlimited concurrent conversations",
      "Human handoff when AI can't resolve issues",
      "AI voice calling for reminders and follow-ups",
      "No technical setup required - fully managed service",
      "Zambian payment integration (Airtel Money, MTN, Zamtel)",
    ],
  },

  // ============================================
  // SECTION 2: CORE FEATURES
  // ============================================
  features: [
    {
      name: "AI Chat Assistant",
      description: "Intelligent WhatsApp chatbot that handles customer inquiries, answers FAQs, and guides users through conversation flows. Uses GPT-4 for natural language understanding.",
      capabilities: [
        "Natural conversation in 40+ languages",
        "Context-aware responses based on conversation history",
        "Customizable personality and tone",
        "Knowledge base integration",
        "FAQ auto-response",
        "Smart escalation to human agents",
      ],
    },
    {
      name: "Voice AI Agent",
      description: "AI-powered voice calling for automated reminders, appointment confirmations, follow-ups, and lead qualification. Uses natural-sounding AI voices.",
      capabilities: [
        "Outbound call scheduling",
        "Appointment reminders",
        "Payment follow-ups",
        "Lead qualification calls",
        "Natural conversation flow",
        "Call recording and transcription",
        "Transfer to human agents",
      ],
    },
    {
      name: "Conversation Flows",
      description: "Pre-built and custom conversation flows for common business scenarios like booking appointments, collecting information, and processing orders.",
      useCases: [
        "Appointment scheduling",
        "Lead capture and qualification",
        "Order tracking",
        "Feedback collection",
        "Onboarding sequences",
        "Payment reminders",
      ],
    },
    {
      name: "Human Agent Dashboard",
      description: "Web-based dashboard for human agents to monitor conversations, take over from AI when needed, and manage customer relationships.",
      capabilities: [
        "Real-time conversation monitoring",
        "One-click AI-to-human handoff",
        "Customer profiles and history",
        "Conversation tagging and notes",
        "Team collaboration",
        "Mobile-responsive interface",
      ],
    },
    {
      name: "Analytics & Insights",
      description: "Comprehensive analytics on conversation volume, AI resolution rates, customer sentiment, and peak activity times.",
      metrics: [
        "Total conversations",
        "AI resolution rate",
        "Average response time",
        "Customer satisfaction",
        "Sentiment analysis",
        "Hourly/daily volume patterns",
        "Top conversation topics",
      ],
    },
    {
      name: "WhatsApp Business API Integration",
      description: "Full integration with Meta's WhatsApp Business API for reliable, scalable messaging with official business verification.",
      features: [
        "Official WhatsApp Business API",
        "Business profile setup",
        "Message templates support",
        "Media messages (images, documents, audio)",
        "Read receipts and delivery status",
        "End-to-end encryption",
      ],
    },
  ],

  // ============================================
  // SECTION 3: PRICING & PLANS
  // ============================================
  pricing: {
    currency: "ZMW (Zambian Kwacha)",
    billingCycle: "Monthly or Yearly (17% discount on yearly)",
    trial: "7-day free trial with full features",
    guarantee: "30-day money-back guarantee",
    
    plans: [
      {
        id: "basic",
        name: "Basic",
        price: "K499/month",
        yearlyPrice: "K4,790/year (K399/month)",
        description: "Perfect for small businesses just getting started with WhatsApp automation.",
        includes: [
          "1,000 WhatsApp conversations per month",
          "30 AI voice call minutes per month",
          "1 WhatsApp phone number",
          "AI-powered responses (FAQs, enquiries, bookings)",
          "24/7 support in 40+ languages",
          "Basic analytics dashboard",
          "7-day free trial",
        ],
        limits: [
          "Up to 1,000 conversations/month",
          "Up to 30 voice minutes/month",
          "1 WhatsApp number only",
        ],
        bestFor: "Small businesses, startups, solopreneurs",
      },
      {
        id: "business",
        name: "Business",
        price: "K1,699/month",
        yearlyPrice: "K16,310/year (K1,359/month)",
        description: "Best for growing businesses with higher volume and team collaboration needs.",
        includes: [
          "5,000 WhatsApp conversations per month",
          "120 AI voice call minutes per month",
          "2 WhatsApp phone numbers",
          "Human agent handoff",
          "Scheduled outbound calls (reminders, follow-ups)",
          "Advanced analytics & reporting",
          "Dedicated onboarding support",
          "Everything in Basic",
        ],
        limits: [
          "Up to 5,000 conversations/month",
          "Up to 120 voice minutes/month",
          "2 WhatsApp numbers",
        ],
        bestFor: "Growing businesses, multi-location businesses, teams",
        badge: "Most Popular",
      },
      {
        id: "enterprise",
        name: "Enterprise",
        price: "Custom (Starting from K5,000/month)",
        description: "Tailored solutions for large organizations with custom requirements.",
        includes: [
          "Unlimited WhatsApp conversations",
          "Unlimited voice usage",
          "Unlimited WhatsApp numbers",
          "Custom AI trained on business data",
          "99.9% uptime SLA",
          "Dedicated account manager",
          "Custom integrations (POS, ERP, CRM)",
          "On-site onboarding & training",
          "Everything in Business",
        ],
        limits: [],
        bestFor: "Large enterprises, franchises, high-volume businesses",
      },
    ],
    
    overagePolicy: `If you exceed your monthly conversation or voice minute limits:
- Conversations: Additional messages charged at K0.50 per conversation
- Voice minutes: Additional minutes charged at K15/minute
- You'll receive usage alerts at 80% and 100% of your limit
- Option to upgrade plan at any time to avoid overages`,
    
    paymentMethods: [
      "Airtel Money",
      "MTN Mobile Money",
      "Zamtel Kwacha",
      "Bank card payments (via Lenco)",
    ],
  },

  // ============================================
  // SECTION 4: WHATSAPP SETUP PROCESS
  // ============================================
  whatsappSetup: {
    overview: `To use FiQ, you need a WhatsApp Business API account. This is different from the free WhatsApp Business app on your phone. The API allows automated messaging at scale and is required for FiQ to function.

There are two ways to get set up:
1. FiQ Managed Setup (Recommended) - We handle everything
2. Self-Setup - You configure your own WhatsApp Business API`,
    
    requirements: [
      "Meta Business Account (free)",
      "WhatsApp Business API access",
      "Dedicated business phone number (not personal WhatsApp)",
      "Business verification documents (for green badge)",
    ],
    
    displayNamePolicy: `Your WhatsApp display name appears at the top of customer chats instead of your phone number. To set it:
1. Go to Meta Business Manager → WhatsApp Manager
2. Select your phone number
3. Set 'Display Name' field
4. Submit for review

Display Name Rules:
- Must match your business name or website domain
- Cannot be generic ('Support', 'Sales' alone)
- No special characters or emojis
- Must reflect actual business identity`,
    
    businessProfile: `Complete your business profile in Meta Business Manager for professional appearance:
- Profile picture/logo (192x192px minimum)
- Business description
- Business category/industry
- Address, email, website
- Business hours

Note: You do NOT need the green verification badge to show your business name. The badge is optional and only adds extra trust verification.`,
    
    phoneNumberRequirements: [
      "Must be a dedicated business number",
      "Cannot be a number already used on WhatsApp Messenger or Business App",
      "Must receive SMS or voice calls for verification",
      "Can be landline or mobile",
      "One number per WhatsApp Business API account",
    ],
    
    managedSetupProcess: [
      "Sign up for FiQ and choose your plan",
      "Provide your business details and preferred phone number",
      "FiQ team creates your WhatsApp Business API account",
      "Verify the phone number via SMS/voice call",
      "Set display name and business profile",
      "FiQ configures webhooks and integration",
      "Start using FiQ dashboard",
    ],
    
    selfSetupProcess: [
      "Create Meta Business Account at business.facebook.com",
      "Add WhatsApp to your business portfolio",
      "Create a WhatsApp Business Account (WABA)",
      "Add and verify your phone number",
      "Generate API access token",
      "Configure webhook endpoint (provided by FiQ)",
      "Enter credentials in FiQ dashboard",
    ],
    
    troubleshooting: {
      phoneNumberAlreadyInUse: `If your number is already on WhatsApp Messenger or Business App:
- You must delete the WhatsApp account from that number first
- Wait 24-48 hours for the number to be released
- Then add it to WhatsApp Business API
- Alternatively, use a different dedicated business number`,
      
      displayNameRejected: `If Meta rejects your display name:
- Ensure it matches your business registration name
- Check it follows Meta's guidelines
- Avoid generic terms
- Try a simpler variation of your business name
- Contact Meta support if you believe it's an error`,
      
      messagesNotSending: `If messages aren't sending:
- Verify access token hasn't expired
- Check phone number ID is correct
- Ensure webhook is properly configured
- Check message template approval status (for outbound)
- Verify subscription is active in FiQ`,
    },
  },

  // ============================================
  // SECTION 5: DASHBOARD & USAGE
  // ============================================
  dashboard: {
    overview: `The FiQ Dashboard is your central hub for managing customer conversations, configuring your AI, and monitoring performance. Access it at https://firstinqueue.com/dashboard

Key Dashboard Sections:
- Conversations: Live chat with customers and monitoring
- Flows: Configure automated conversation flows
- Agents: Manage AI behavior and human handoff
- Analytics: View performance metrics and insights
- Settings: Configure WhatsApp, billing, and business profile`,
    
    conversations: {
      description: "Real-time conversation management interface",
      features: [
        "View all active customer conversations",
        "See AI responses in real-time",
        "Take over conversations from AI with one click",
        "View customer history and context",
        "Tag conversations for categorization",
        "Assign conversations to team members",
        "Send images, documents, and templates",
        "Mark conversations as resolved",
      ],
    },
    
    flows: {
      description: "Pre-built and custom conversation flows",
      defaultFlows: [
        "Greeting & Welcome",
        "FAQ Auto-Response",
        "Appointment Booking",
        "Lead Qualification",
        "Order Tracking",
        "Feedback Collection",
      ],
      capabilities: [
        "Visual flow builder",
        "Conditional logic (if/else branches)",
        "Data collection steps",
        "API integration actions",
        "Human handoff triggers",
      ],
    },
    
    agents: {
      description: "AI personality and human agent configuration",
      settings: [
        "AI personality (name, tone, emoji usage)",
        "Welcome message customization",
        "Fallback message for unknown queries",
        "Operating hours configuration",
        "Language preferences",
        "Escalation rules (when to hand off to humans)",
      ],
    },
    
    settings: {
      description: "Account and integration settings",
      sections: [
        "WhatsApp Connection: View connection status and credentials",
        "Business Profile: Company information and branding",
        "Plan & Usage: Current plan, usage statistics, billing cycle",
        "Knowledge Base: Manage FAQ and information sources",
        "Team Management: Add/remove team members",
      ],
    },
  },

  // ============================================
  // SECTION 6: BILLING & SUBSCRIPTIONS
  // ============================================
  billing: {
    subscriptionManagement: `Manage your subscription in Dashboard → Settings → Plan & Usage:
- View current plan and usage statistics
- See messages used vs. limit
- See voice minutes used vs. limit
- Current period end date
- Option to upgrade, downgrade, or cancel

UPGRADING: Instant upgrade, prorated billing for remainder of cycle
DOWNGRADING: Takes effect at next billing cycle
CANCELLING: Account remains active until period end, then downgrades to free`,
    
    paymentProcess: `Payments are processed through Lipila (Zambian mobile money) and Lenco (card payments):
1. Select your plan and payment method
2. Enter payment details (phone number for mobile money, card for Lenco)
3. Authorize payment on your device
4. Payment confirmation within seconds
5. Subscription activates immediately

Failed Payments:
- If mobile money fails, check balance and try again
- If card fails, verify card details and sufficient funds
- 3 failed attempts will require waiting 24 hours`,
    
    invoiceAndReceipts: `Invoices and receipts are:
- Emailed automatically after successful payment
- Available for download in Dashboard → Settings → Billing
- Include payment date, amount, method, and plan details
- Sent to the account owner's email address`,
    
    refunds: `Refund Policy:
- 30-day money-back guarantee for first payment
- Contact support@codarti.com for refund requests
- Refunds processed within 5-7 business days
- Refunds return to original payment method`,
    
    planChanges: `Changing Plans:
- Upgrade anytime: Immediate effect, prorated charge
- Downgrade: Effective at next billing cycle
- Switch between monthly/yearly: Effective at next billing cycle
- No fees for plan changes`,
  },

  // ============================================
  // SECTION 7: AI & AUTOMATION
  // ============================================
  ai: {
    howItWorks: `FiQ's AI uses GPT-4 combined with your business knowledge base to provide intelligent responses. The AI:
1. Receives customer message via WhatsApp
2. Analyzes intent and context using conversation history
3. Searches your knowledge base for relevant information
4. Generates a personalized, natural response
5. Determines if human handoff is needed
6. Sends response back to customer

The AI learns from your knowledge base, FAQs, and conversation flows. It doesn't learn from individual conversations for privacy reasons.`,
    
    customization: `Customize your AI personality:
- Name: Give your AI a name (e.g., 'Sara', 'Bot', 'Assistant')
- Tone: Professional, friendly, casual, or formal
- Emoji usage: None, minimal, moderate, or heavy
- Response style: Concise, detailed, or balanced
- Welcome message: First message customers see
- Fallback message: Response when AI doesn't understand

These settings affect how customers perceive your brand and should match your business personality.`,
    
    knowledgeBase: `The Knowledge Base is information your AI uses to answer questions:

KNOWLEDGE ENTRIES: Detailed articles on specific topics
- Product information
- Service details
- Process explanations
- Company policies

FAQ: Common questions with direct answers
- Format: Question → Answer
- Organized by category
- Quick responses for efficiency

QUICK REPLIES: Automated responses to common greetings/triggers
- 'Hi' → Welcome message
- 'Thanks' → You're welcome message
- 'Bye' → Goodbye message

Updating Knowledge Base:
- Add new entries in Dashboard → AI Config
- Changes take effect immediately
- No AI retraining needed
- Test in the preview panel`,
    
    handoffRules: `Configure when conversations escalate to humans:

KEYWORD TRIGGERS: Specific words that trigger handoff
- 'speak to human', 'agent', 'manager', 'representative'
- 'complaint', 'refund', 'cancel account'

SENTIMENT TRIGGERS: Negative emotion detection
- Customer frustration or anger
- Repeated dissatisfaction
- Threatening language

REPEATED FAILURE: When AI can't help
- 3+ failed attempts to answer
- User explicitly requests human
- Complex issue requiring judgment

TIMEOUT: Inactive conversations
- Customer inactive for X minutes
- Return to AI or keep with human

When handoff occurs:
- Customer notified: 'Connecting you with a team member...'
- Alert sent to available agents
- AI provides conversation summary to agent
- Agent sees full context and history`,
  },

  // ============================================
  // SECTION 8: VOICE AI
  // ============================================
  voiceAI: {
    overview: `FiQ's Voice AI makes automated phone calls using natural-sounding AI voices. Use it for:
- Appointment reminders and confirmations
- Payment follow-ups
- Lead qualification calls
- Delivery notifications
- Feedback collection
- Re-engagement campaigns

Voice calls are configured in Dashboard → Voice, and can be triggered automatically or scheduled manually.`,
    
    setup: `Setting up Voice AI:
1. Go to Dashboard → Voice → Configuration
2. Configure your voice agent:
   - Name your voice agent
   - Select voice (multiple languages and accents available)
   - Set greeting message
   - Configure system prompt (AI behavior)
   - Set max call duration
   - Configure transfer number (for human handoff)
3. Save configuration
4. Test with a sample call

Default behavior:
- Calls during business hours only
- Respects timezone settings
- Leaves voicemail if no answer (configurable)
- Transfers to human if requested`,
    
    schedulingCalls: `Schedule voice calls in two ways:

AUTOMATED (Recommended):
- Set up triggers in conversation flows
- Example: After booking appointment → schedule reminder call 24hrs before
- Calls trigger automatically based on events

MANUAL:
- Go to Dashboard → Voice → Schedule Call
- Enter customer phone number
- Select voice agent
- Set date/time
- Add purpose/notes
- Schedule

BULK SCHEDULING:
- Upload CSV with phone numbers and scheduled times
- Up to 500 calls per batch
- System schedules each call individually`,
    
    callTypes: `Pre-built voice call templates:

APPOINTMENT REMINDER:
- 'Hi [Name], this is [Business] calling about your appointment tomorrow at [Time]'
- Asks for confirmation or rescheduling
- Option to speak to human

PAYMENT FOLLOW-UP:
- 'Hi [Name], calling about invoice #[Number] for [Amount]'
- Explains payment options
- Can take payment over phone (if configured)

LEAD QUALIFICATION:
- 'Hi [Name], following up on your inquiry about [Product]'
- Asks qualifying questions
- Records answers for sales team

DELIVERY NOTIFICATION:
- 'Your order is out for delivery and should arrive today'
- Confirms address
- Records special instructions`,
    
    analytics: `Voice call analytics available in Dashboard → Voice → Reports:
- Total calls made
- Answer rate (pickup percentage)
- Average call duration
- Completion rate (finished vs. hung up)
- Voicemail rate
- Transfer rate (to humans)
- Cost per call
- Call recordings and transcripts

Listen to call recordings to improve scripts and train the AI.`,
  },

  // ============================================
  // SECTION 9: SECURITY & COMPLIANCE
  // ============================================
  security: {
    dataProtection: `FiQ takes data security seriously:

ENCRYPTION:
- All data encrypted in transit (TLS 1.3)
- Database encryption at rest (AES-256)
- WhatsApp messages use end-to-end encryption
- Voice call recordings encrypted

ACCESS CONTROL:
- Role-based access (admin, supervisor, agent)
- Two-factor authentication available
- Session timeout after inactivity
- IP whitelisting available (Enterprise)

DATA STORAGE:
- Hosted on Supabase (SOC 2 compliant)
- Backups daily, retained for 30 days
- Data stored in secure cloud infrastructure
- Geographic redundancy available (Enterprise)`,
    
    compliance: `FiQ compliance standards:

WHATSAPP COMPLIANCE:
- Follows Meta WhatsApp Business API policies
- Message templates pre-approved
- Opt-in/opt-out handling
- Rate limiting to prevent spam

DATA PRIVACY:
- GDPR compliant data handling
- Right to data deletion (request via support)
- Data processing agreements available
- Privacy policy: https://firstinqueue.com/privacy

INDUSTRY STANDARDS:
- PCI-DSS compliant for payment processing
- SOC 2 Type II certified infrastructure
- Regular security audits`,
    
    messageRetention: `Message and conversation retention:
- Standard: 12 months retention
- Enterprise: Custom retention periods available
- Deleted upon account cancellation (unless legally required)
- Export your data anytime from Dashboard → Settings`,
  },

  // ============================================
  // SECTION 10: TROUBLESHOOTING
  // ============================================
  troubleshooting: {
    commonIssues: [
      {
        issue: "WhatsApp showing 'Setup In Progress'",
        cause: "WhatsApp Business API credentials not configured or invalid",
        solution: `1. Check Dashboard → Settings → WhatsApp Connection
2. Verify phone number ID, business account ID, and access token are entered
3. Ensure phone number is verified in Meta Business Manager
4. Contact FiQ support if credentials are correct but still not connecting`,
      },
      {
        issue: "Messages not sending",
        cause: "API credentials expired, rate limit, or message template not approved",
        solution: `1. Check access token hasn't expired (tokens valid for 60 days)
2. Verify subscription is active (not expired)
3. Check if message template is approved (for outbound messages)
4. Review error logs in Dashboard → Settings → Logs`,
      },
      {
        issue: "AI giving wrong answers",
        cause: "Knowledge base missing information or outdated",
        solution: `1. Update knowledge base entries in Dashboard → AI Config
2. Add FAQ for the specific question
3. Check AI personality settings for appropriate tone
4. Test in preview mode before saving changes`,
      },
      {
        issue: "Payment failed / 'Failed to create payment'",
        cause: "Database schema mismatch or payment gateway issue",
        solution: `1. Try payment again after a few minutes
2. Check mobile money balance or card funds
3. Contact FiQ support if error persists
4. Alternative: Bank transfer (contact support for details)`,
      },
      {
        issue: "Voice calls not connecting",
        cause: "Retell configuration issue or phone number blocked",
        solution: `1. Verify voice agent is active in Dashboard → Voice
2. Check transfer phone number is valid
3. Ensure business hours are correctly set
4. Review call logs for specific error messages`,
      },
      {
        issue: "Human handoff not working",
        cause: "No agents online or escalation rules misconfigured",
        solution: `1. Check at least one agent is marked online
2. Review escalation rules in Dashboard → Agents
3. Test handoff trigger words
4. Verify agent notifications are enabled`,
      },
    ],
    
    errorCodes: {
      "PGRST204": "Database column not found - usually schema migration needed. Contact support.",
      "PGRST116": "Invalid credentials - check API keys or tokens.",
      "WhatsApp 100": "Invalid parameter - check phone number format or message structure.",
      "WhatsApp 190": "Media file too large - maximum 16MB for images, 100MB for documents.",
      "WhatsApp 131014": "Template not approved - wait for Meta approval or use approved template.",
      "Rate Limit": "Too many messages sent too quickly - wait and retry. Automatic retry in 1 hour.",
    },
    
    supportChannels: `Need help? Contact FiQ support:

EMAIL: support@codarti.com
- Response time: Within 24 hours
- Best for: Technical issues, billing questions, feature requests

IN-APP CHAT: Click help icon in dashboard
- Response time: Within 4 hours (Business hours)
- Best for: Quick questions, how-to guidance

PHONE: +260-XXX-XXXX (Enterprise only)
- Available: Business hours
- Best for: Urgent issues, enterprise accounts

SELF-HELP:
- Documentation: https://docs.firstinqueue.com
- Video tutorials: YouTube channel
- Community forum: community.firstinqueue.com`,
  },

  // ============================================
  // SECTION 11: FAQ
  // ============================================
  faq: [
    {
      question: "What is FiQ and how does it work?",
      answer: "FiQ (First in Queue) is an AI-powered WhatsApp automation platform. It connects to your WhatsApp Business API account and automatically responds to customer messages using AI. You configure the knowledge base, personality, and flows — the AI handles conversations 24/7, escalating to humans when needed.",
    },
    {
      question: "Do I need technical skills to use FiQ?",
      answer: "No. FiQ is designed for non-technical users. Setup is guided, the dashboard is intuitive, and our team handles the technical WhatsApp Business API configuration. If you choose managed setup, we do everything for you.",
    },
    {
      question: "Can I use my personal WhatsApp number?",
      answer: "No. FiQ requires a dedicated business number registered with WhatsApp Business API. This number cannot be used on regular WhatsApp Messenger or WhatsApp Business App. You'll need a separate business phone number.",
    },
    {
      question: "How long does setup take?",
      answer: "Managed setup: 1-2 business days after you provide business details. Self-setup: 30 minutes to 2 hours depending on your Meta Business Account status and phone number verification speed.",
    },
    {
      question: "Can I try FiQ before paying?",
      answer: "Yes! All plans include a 7-day free trial with full features. No credit card required for trial. Cancel anytime during trial and pay nothing.",
    },
    {
      question: "What happens when I reach my message limit?",
      answer: "You'll receive alerts at 80% and 100% usage. Additional messages are charged at K0.50 per conversation. You can upgrade your plan anytime to get more included messages.",
    },
    {
      question: "Can the AI speak my local language?",
      answer: "Yes! FiQ supports 40+ languages including English, Bemba, Nyanja, and Tonga. The AI automatically detects the customer's language and responds accordingly.",
    },
    {
      question: "How do I transfer from AI to human agent?",
      answer: "Customers can ask to 'speak to human' or 'talk to agent' anytime. You can also configure automatic handoff triggers (sentiment, keywords, repeated failure). Agents receive alerts and can take over in the dashboard.",
    },
    {
      question: "Can I send broadcast messages to all customers?",
      answer: "Yes, with limitations. WhatsApp requires opt-in for marketing messages. You can send template messages (pre-approved by Meta) to customers who have messaged you in the last 24 hours. For older contacts, you need their explicit opt-in.",
    },
    {
      question: "What payment methods do you accept?",
      answer: "We accept Airtel Money, MTN Mobile Money, Zamtel Kwacha, and card payments (via Lenco). All payments are processed securely in ZMW (Zambian Kwacha).",
    },
    {
      question: "Is my customer data secure?",
      answer: "Yes. We use encryption in transit and at rest, follow GDPR compliance, and host on SOC 2 certified infrastructure. WhatsApp messages have end-to-end encryption. We never share or sell your data.",
    },
    {
      question: "Can I cancel my subscription?",
      answer: "Yes, cancel anytime in Dashboard → Settings → Plan & Usage. Your account remains active until the end of your current billing period, then downgrades to free (if available) or closes.",
    },
    {
      question: "What's the difference between plans?",
      answer: "Basic (K499): 1,000 conversations, 30 voice mins, 1 number, basic features. Business (K1,699): 5,000 conversations, 120 voice mins, 2 numbers, advanced features + human handoff. Enterprise (Custom): Unlimited everything + custom AI + SLA.",
    },
    {
      question: "Do I need Meta/Facebook Business verification?",
      answer: "Not required for basic functionality. You need WhatsApp Business API access (we help with this). The green verification badge is optional — your business name and profile will show without it.",
    },
    {
      question: "Can FiQ integrate with my existing systems?",
      answer: "Enterprise plan includes custom integrations (POS, ERP, CRM). Business plan has basic API webhooks. Contact us for specific integration requirements.",
    },
  ],

  // ============================================
  // SECTION 12: ADVANCED FEATURES & CONFIGURATION
  // ============================================
  advancedFeatures: {
    customFlows: {
      description: "Build sophisticated conversation flows beyond the default templates",
      capabilities: [
        "Multi-step data collection forms",
        "Conditional branching (if/else logic)",
        "API integration actions (HTTP requests)",
        "Database read/write operations",
        "Wait conditions and timeouts",
        "Loop back to previous steps",
        "External service webhooks",
      ],
      useCaseExamples: [
        { name: "Loan Application", steps: "Collect personal info → Income verification → Credit check API → Approval decision → Schedule signing" },
        { name: "Patient Intake", steps: "Symptom checker → Insurance verification → Appointment scheduling → Pre-visit forms → Confirmation" },
        { name: "Custom Order", steps: "Product selection → Customization options → Pricing calculation → Deposit collection → Production timeline" },
        { name: "Survey & Feedback", steps: "NPS question → Conditional follow-up → Detailed feedback → Thank you message → Incentive delivery" },
      ],
      bestPractices: [
        "Keep flows under 10 steps for completion rate",
        "Always provide 'exit' option to talk to human",
        "Save progress periodically for long flows",
        "Test thoroughly before going live",
        "Use clear, simple language in questions",
        "Validate input immediately (email format, phone numbers)",
      ],
    },
    
    messageTemplates: {
      description: "Pre-approved message templates for proactive outreach",
      whatAreThey: "WhatsApp requires all proactive (outbound) messages to use pre-approved templates. These are message formats reviewed and approved by Meta.",
      templateTypes: [
        "Transactional: Order confirmations, shipping updates, payment receipts",
        "Authentication: OTP, verification codes, password resets",
        "Marketing: Promotions, new products, special offers (requires opt-in)",
        "Utility: Appointment reminders, billing notifications, alerts",
      ],
      approvalProcess: `1. Create template in Meta Business Manager or FiQ dashboard
2. Submit for Meta review (typically 24-48 hours)
3. Once approved, use template ID in API calls
4. Templates can include variables {{1}}, {{2}}, etc. for personalization

Rejection reasons:
- Promotional content in utility template
- Missing/incorrect category
- Spam-like language
- Missing required formatting`,
      managingTemplates: `In Dashboard → Settings → Message Templates:
- View all templates and their status
- Submit new templates for approval
- Edit rejected templates and resubmit
- Archive unused templates
- Preview how templates look to customers`,
    },
    
    webhooks: {
      description: "Real-time notifications when events occur",
      whatAreWebhooks: "Webhooks are HTTP callbacks that notify your external systems when something happens in FiQ — like a new message, completed flow, or escalated conversation.",
      availableEvents: [
        "message.received - New customer message",
        "message.sent - AI response sent",
        "conversation.started - New conversation began",
        "conversation.ended - Conversation marked resolved",
        "conversation.escalated - Handed off to human",
        "flow.completed - Customer completed a flow",
        "booking.created - Appointment scheduled",
        "payment.received - Payment confirmed",
        "lead.qualified - Lead reached qualification threshold",
      ],
      setup: `1. Go to Dashboard → Settings → Webhooks
2. Enter your webhook endpoint URL (must be HTTPS)
3. Select which events to subscribe to
4. Generate webhook secret for signature verification
5. Test webhook with sample payload
6. Enable webhook

Security:
- All webhooks include signature header for verification
- Use webhook secret to validate requests came from FiQ
- Respond with 200 status within 5 seconds
- Implement retry logic for failed deliveries`,
      payloadExample: `{
  "event": "message.received",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "conversation_id": "conv_123",
    "customer_phone": "+260971234567",
    "customer_name": "John Doe",
    "message": "When will my order arrive?",
    "message_id": "msg_456",
    "tenant_id": "tenant_789"
  }
}`,
    },
    
    apiAccess: {
      description: "Programmatic access to FiQ functionality",
      authentication: `API requests require authentication via:
- API Key: Include in header 'X-API-Key: your_key'
- Bearer Token: Include in header 'Authorization: Bearer your_token'

Get your API credentials in Dashboard → Settings → API Access.

Rate limits:
- Basic: 100 requests/minute
- Business: 500 requests/minute
- Enterprise: 2000 requests/minute`,
      endpoints: [
        { method: "GET", endpoint: "/api/v1/conversations", description: "List conversations with filtering" },
        { method: "GET", endpoint: "/api/v1/conversations/:id", description: "Get specific conversation details" },
        { method: "POST", endpoint: "/api/v1/conversations/:id/messages", description: "Send a message to customer" },
        { method: "POST", endpoint: "/api/v1/conversations/:id/escalate", description: "Escalate to human agent" },
        { method: "GET", endpoint: "/api/v1/customers", description: "List customers" },
        { method: "GET", endpoint: "/api/v1/customers/:phone", description: "Get customer by phone number" },
        { method: "POST", endpoint: "/api/v1/flows/:id/trigger", description: "Trigger a conversation flow for customer" },
        { method: "POST", endpoint: "/api/v1/calls/schedule", description: "Schedule a voice call" },
        { method: "GET", endpoint: "/api/v1/analytics", description: "Get analytics data" },
        { method: "GET", endpoint: "/api/v1/usage", description: "Get current usage statistics" },
      ],
      sdk: `Official SDKs available:
- JavaScript/TypeScript: npm install @firstinqueue/sdk
- Python: pip install firstinqueue
- PHP: composer require firstinqueue/sdk

SDKs handle authentication, retry logic, and provide typed interfaces.`,
    },
    
    multiNumberSetup: {
      description: "Managing multiple WhatsApp numbers",
      whenToUse: `Use multiple numbers when:
- You have multiple business locations
- You want separate numbers for sales vs support
- You handle different product lines
- You serve different geographic regions`,
      setup: `Business Plan: Supports up to 2 numbers
Enterprise Plan: Unlimited numbers

Configuration:
1. Add each number in Dashboard → Settings → WhatsApp Numbers
2. Assign numbers to specific flows or use cases
3. Route customers to appropriate number based on:
   - Geographic location
   - Department selection
   - Time of day
   - Agent availability

Number-specific settings:
- Different AI personalities per number
- Separate knowledge bases
- Different operating hours
- Different human agent teams`,
      costs: `Each WhatsApp number has its own conversation limit.
Example with Business Plan (5,000 conversations):
- Number 1: 3,000 conversations
- Number 2: 2,000 conversations
Total cannot exceed plan limit.

Or upgrade to Enterprise for unlimited per-number usage.`,
    },
    
    operatingHours: {
      description: "Configure when your AI is active vs when to show 'away' message",
      settings: `Set in Dashboard → AI Config → Operating Hours:
- Timezone selection (important for accurate hours)
- Weekly schedule (different hours per day)
- Holiday/special day overrides
- Out-of-hours message customization

Modes:
1. 24/7: AI always responds
2. Business Hours: AI responds during hours, away message outside
3. Human Hours: AI during hours, human-only outside hours
4. Custom: Flow-based routing`,
      awayMessage: `The message shown when customer messages outside hours:
"Hi! We're currently offline. Business hours: Monday-Friday 8AM-6PM. Your message has been saved and we'll respond first thing in the morning!"

Customize with:
- Specific hours
- Emergency contact (if applicable)
- Expected response time
- Alternative contact methods`,
    },
  },

  // ============================================
  // SECTION 13: INTEGRATIONS
  // ============================================
  integrations: {
    available: [
      {
        name: "Retell Voice AI",
        description: "AI-powered voice calling for outbound calls, reminders, and lead qualification",
        setupComplexity: "Easy",
        setupTime: "10 minutes",
        capabilities: [
          "Natural-sounding AI voice conversations",
          "Call scheduling and automation",
          "Transcription and recording",
          "Human transfer during calls",
          "Multi-language voice support",
        ],
      },
      {
        name: "Lipila Mobile Money",
        description: "Zambian mobile money payments (Airtel Money, MTN, Zamtel)",
        setupComplexity: "None (pre-integrated)",
        setupTime: "Instant",
        capabilities: [
          "Airtel Money collections",
          "MTN Mobile Money collections",
          "Zamtel Kwacha collections",
          "Automatic payment confirmation",
          "Receipt generation",
        ],
      },
      {
        name: "Lenco Card Payments",
        description: "Credit/debit card payment processing",
        setupComplexity: "None (pre-integrated)",
        setupTime: "Instant",
        capabilities: [
          "Visa/Mastercard processing",
          "3D Secure authentication",
          "Automatic reconciliation",
          "Refund processing",
        ],
      },
      {
        name: "Supabase",
        description: "Database and backend infrastructure",
        setupComplexity: "None (managed)",
        setupTime: "N/A",
        capabilities: [
          "Real-time data storage",
          "Secure authentication",
          "Database backups",
          "Row-level security",
        ],
      },
    ],
    
    customIntegrations: {
      description: "Enterprise plan includes custom integrations with your existing systems",
      availableFor: "Enterprise customers only",
      typicalIntegrations: [
        { system: "CRM", examples: "Salesforce, HubSpot, Zoho, Pipedrive", useCase: "Sync customer data, log conversations, create leads" },
        { system: "ERP", examples: "SAP, Oracle, Microsoft Dynamics", useCase: "Order lookup, inventory checks, invoice generation" },
        { system: "POS", examples: "Square, Toast, Lightspeed", useCase: "Check purchase history, process refunds, loyalty points" },
        { system: "Booking Systems", examples: "Calendly, Acuity, custom systems", useCase: "Real-time availability, appointment booking, reminders" },
        { system: "E-commerce", examples: "Shopify, WooCommerce, Magento", useCase: "Order tracking, cart recovery, product recommendations" },
        { system: "Help Desk", examples: "Zendesk, Freshdesk, Intercom", useCase: "Ticket creation, conversation history, agent handoff" },
        { system: "Email Marketing", examples: "Mailchimp, SendGrid, Klaviyo", useCase: "Sync contacts, trigger campaigns, list management" },
        { system: "Analytics", examples: "Google Analytics, Mixpanel, Amplitude", useCase: "Event tracking, conversion attribution, funnel analysis" },
      ],
      process: `1. Contact FiQ sales with integration requirements
2. Technical scoping call to define data flow
3. API documentation and access provided
4. Integration development (typically 1-2 weeks)
5. Testing and QA
6. Production deployment
7. Documentation and training`,
    },
    
    zapierMake: {
      description: "Connect FiQ to 5000+ apps via Zapier or Make (formerly Integromat)",
      availableTriggers: [
        "New conversation started",
        "Conversation escalated",
        "Flow completed",
        "New lead qualified",
        "Booking created",
        "Payment received",
      ],
      availableActions: [
        "Send WhatsApp message",
        "Trigger conversation flow",
        "Schedule voice call",
        "Update customer record",
        "Tag conversation",
      ],
      setup: `1. Create Zapier/Make account (if don't have one)
2. Search for "First in Queue" or "FiQ" in app directory
3. Connect your FiQ account (requires API key)
4. Choose trigger event
5. Select action app and configure
6. Test and activate

Note: Business and Enterprise plans include Zapier/Make access. Basic plan requires upgrade.`,
    },
  },

  // ============================================
  // SECTION 14: ADMIN & MULTI-TENANT
  // ============================================
  adminGuide: {
    overview: "Admin functions for managing multiple FiQ clients/tenants",
    
    clientManagement: {
      creatingClients: `As a FiQ admin, you can create new client accounts:
1. Go to Admin Dashboard → Clients
2. Click "Add New Client"
3. Enter client details:
   - Business name
   - Contact email
   - Industry
   - Plan selection
4. System auto-generates tenant ID and credentials
5. Client receives welcome email with login details
6. Client completes setup wizard`,
      
      configuringClients: `After creating a client, configure their setup:
1. Go to Admin → Clients → [Client Name]
2. Configure WhatsApp:
   - Enter phone number ID
   - Enter business account ID
   - Enter access token
   - Or mark for "Managed Setup" (FiQ team handles)
3. Set plan and billing
4. Configure AI defaults (or use industry template)
5. Add initial knowledge base entries
6. Mark setup complete when ready`,
      
      monitoringClients: `Track client health and usage:
- Active/inactive status
- Message usage vs plan limit
- WhatsApp connection status
- Recent conversations
- Payment status
- AI resolution rate

Red flags to watch:
- Connection errors (credential issues)
- 0% AI resolution (knowledge base empty)
- High escalation rate (AI not trained properly)
- Expired trial not converted
- Payment failures`,
    },
    
    connectionsManagement: {
      description: "Manage WhatsApp API connections for all clients",
      
      bulkOperations: `For agencies managing many clients:
- Bulk import clients via CSV
- Bulk update WhatsApp credentials
- Copy configuration from one client to another
- Template sharing across clients
- Standardized reporting`,
      
      credentialRotation: `When WhatsApp access tokens expire (every 60 days):
1. Admin → Connections shows expiration warnings
2. Click client with expired token
3. Enter new token from Meta Business Manager
4. Save - connection restored immediately

Proactive: Enable token expiration notifications 7 days before expiry.`,
    },
    
    supportEscalation: {
      internal: `Client support workflow:
1. Client reports issue via support channel
2. Check Admin → Clients → [Client] → Logs
3. Identify if issue is:
   - Configuration (fix in admin panel)
   - WhatsApp API (check Meta status)
   - Platform bug (escalate to engineering)
   - Feature request (log for product team)
4. Document resolution for knowledge base`,
      
      clientCommunication: `When clients ask questions:
- Use this knowledge base for accurate answers
- Never share internal system details
- Don't promise features not on roadmap
- Always offer managed setup for WhatsApp issues
- Escalate billing disputes to finance team`,
    },
  },

  // ============================================
  // SECTION 15: INDUSTRY-SPECIFIC GUIDANCE
  // ============================================
  industrySpecific: {
    ecommerce: {
      commonUseCases: [
        "Order tracking and status updates",
        "Return and refund processing",
        "Product recommendations",
        "Cart abandonment recovery",
        "Stock availability checks",
        "Shipping cost inquiries",
        "Discount code support",
        "Size/fit guidance",
      ],
      recommendedFlows: [
        "Order Tracking Flow",
        "Return Initiation Flow",
        "Product Finder Flow",
        "Cart Recovery Flow",
      ],
      knowledgeBasePriorities: [
        "Shipping policies and timelines",
        "Return/exchange procedures",
        "Payment methods accepted",
        "Size guides per category",
        "Popular products and categories",
        "Current promotions",
      ],
      tips: "Use product images in responses when possible. Integrate with inventory system for real-time stock checks. Set up automated order confirmation and shipping notifications.",
    },
    
    healthcare: {
      commonUseCases: [
        "Appointment scheduling and reminders",
        "Prescription refill requests",
        "Test result inquiries",
        "Insurance verification",
        "Symptom triage (general info only)",
        "Clinic hours and locations",
        "Doctor availability",
        "Pre-visit instructions",
      ],
      recommendedFlows: [
        "Appointment Booking Flow",
        "Prescription Refill Flow",
        "New Patient Intake Flow",
        "Insurance Verification Flow",
      ],
      knowledgeBasePriorities: [
        "Clinic hours and locations",
        "Services offered",
        "Insurance accepted",
        "Appointment policies",
        "Preparation instructions for common procedures",
        "Emergency contact procedures",
      ],
      complianceNotes: "HIPAA compliance requires Enterprise plan with BAA. Never provide medical advice via AI - always escalate to healthcare professionals. Include disclaimers that AI is for informational purposes only.",
    },
    
    realestate: {
      commonUseCases: [
        "Property inquiries and viewings",
        "Rental application status",
        "Maintenance requests",
        "Rent payment inquiries",
        "Lease renewal questions",
        "Neighborhood information",
        "Mortgage/pre-approval referrals",
        "Document requests",
      ],
      recommendedFlows: [
        "Property Inquiry Flow",
        "Viewing Scheduling Flow",
        "Rental Application Flow",
        "Maintenance Request Flow",
      ],
      knowledgeBasePriorities: [
        "Available properties with key details",
        "Viewing scheduling process",
        "Application requirements",
        "Rent payment methods",
        "Emergency maintenance procedures",
        "Pet policies",
        "Amenities by property",
      ],
      tips: "Integrate with property management software for real-time availability. Use rich media (property photos, virtual tour links) in responses. Set up location-based recommendations.",
    },
    
    restaurant: {
      commonUseCases: [
        "Table reservations",
        "Takeout/delivery orders",
        "Menu inquiries",
        "Dietary restriction questions",
        "Catering requests",
        "Hours and location",
        "Special events and promotions",
        "Feedback and reviews",
      ],
      recommendedFlows: [
        "Reservation Booking Flow",
        "Order Placement Flow",
        "Catering Inquiry Flow",
        "Feedback Collection Flow",
      ],
      knowledgeBasePriorities: [
        "Current menu with prices",
        "Daily specials",
        "Hours for each location",
        "Reservation policies",
        "Dietary accommodation capabilities",
        "Catering menu and minimums",
        "Parking information",
      ],
      tips: "Keep menu updated daily. Use quick replies for common orders. Integrate with POS for real-time availability. Set up automated reservation reminders.",
    },
    
    saas: {
      commonUseCases: [
        "Product feature questions",
        "Pricing plan comparisons",
        "Technical troubleshooting",
        "Account setup guidance",
        "Billing inquiries",
        "Feature requests",
        "Integration help",
        "Trial to paid conversion",
      ],
      recommendedFlows: [
        "Onboarding Flow",
        "Feature Explainer Flow",
        "Technical Troubleshooting Flow",
        "Plan Recommendation Flow",
      ],
      knowledgeBasePriorities: [
        "Feature documentation",
        "Pricing and plan comparisons",
        "Common technical issues and solutions",
        "Integration guides",
        "API documentation summaries",
        "Account management procedures",
        "Security and compliance info",
      ],
      tips: "Create detailed technical knowledge base. Use flows for step-by-step troubleshooting. Set up product update announcements. Integrate with help center/ documentation site.",
    },
    
    education: {
      commonUseCases: [
        "Course inquiries",
        "Enrollment status",
        "Schedule and timetable questions",
        "Fee payment inquiries",
        "Assignment deadlines",
        "Technical support (LMS)",
        "Certificate requests",
        "Campus information",
      ],
      recommendedFlows: [
        "Course Inquiry Flow",
        "Enrollment Flow",
        "Fee Payment Flow",
        "Technical Support Flow",
      ],
      knowledgeBasePriorities: [
        "Available courses and programs",
        "Admission requirements",
        "Fee structure and payment methods",
        "Important dates (enrollment, exams)",
        "Campus locations and facilities",
        "Contact information by department",
        "Online learning platform help",
      ],
      tips: "Sync with student information system for personalized responses. Set up deadline reminders. Create separate flows for prospective vs current students.",
    },
  },

  // ============================================
  // SECTION 16: EDGE CASES & SPECIAL SCENARIOS
  // ============================================
  edgeCases: {
    numberMigration: {
      scenario: "Moving WhatsApp number from another provider to FiQ",
      process: `1. Export chat history from current provider (if possible)
2. Notify customers of brief downtime (1-2 hours)
3. FiQ disconnects number from old system
4. Add number to FiQ WhatsApp Business Account
5. Re-verify phone number
6. Update webhook endpoints
7. Test thoroughly
8. Resume service

Important:
- Customers won't lose chat history on their phones
- There may be brief downtime during migration
- Message templates may need re-approval
- Backup all data before migration`,
    },
    
    accountRecovery: {
      scenario: "Lost access to Meta Business Account or phone number",
      solutions: `Lost Meta Business Account access:
1. Try account recovery via Meta
2. Contact Meta support with business documents
3. May need to create new account and migrate

Lost phone number access:
1. If number is still active with carrier, restore service
2. If number is lost, must get new number and update FiQ
3. Notify customers of new number (use old number until fully transitioned)
4. Update all marketing materials

Prevention:
- Use dedicated business numbers (not personal)
- Enable 2FA on Meta Business Account
- Keep backup admin on Meta account
- Document all credentials securely`,
    },
    
    highVolumeEvents: {
      scenario: "Black Friday, product launches, viral moments causing message spikes",
      preparation: `Before high-volume events:
1. Upgrade to higher plan temporarily
2. Pre-approve additional message templates
3. Prepare knowledge base for common questions
4. Increase human agent availability
5. Set up overflow handling

During event:
1. Monitor dashboard for queue buildup
2. Enable priority routing for urgent issues
3. Use broadcast sparingly (rate limits)
4. Have technical team on standby

After event:
1. Analyze what worked/didn't
2. Update knowledge base based on new questions
3. Consider permanent plan upgrade if consistently higher volume`,
    },
    
    negativeSentimentHandling: {
      scenario: "Angry customers, complaints, threats",
      escalationTriggers: [
        "Keywords: 'lawsuit', 'lawyer', 'sue', 'complaint to consumer protection'",
        "Threats: 'I will destroy your reputation', 'going to authorities'",
        "Extreme negative sentiment score",
        "Repeated profanity or abusive language",
        "Request for manager/supervisor 2+ times",
      ],
      aiResponseGuidelines: `When detecting negative sentiment:
1. Acknowledge frustration immediately
2. Apologize without admitting fault ("I'm sorry you're having this experience")
3. Offer immediate human escalation
4. Don't try to resolve complex issues with AI
5. Never argue or be defensive
6. Document everything for human agent

Example response:
"I sincerely apologize that you're experiencing this issue. I understand how frustrating this must be. I'm connecting you with a supervisor right now who can help resolve this immediately."

After escalation:
- Flag conversation as high priority
- Alert senior agent or manager
- Provide full context and sentiment history
- Follow up within promised timeframe`,
    },
    
    internationalCustomers: {
      scenario: "Customers from different countries, timezones, languages",
      handling: `Language detection:
- AI automatically detects customer language
- Responds in same language
- Can switch languages mid-conversation

Timezone handling:
- Store customer's timezone in profile
- Schedule calls in their local time
- Show business hours in their timezone

International WhatsApp considerations:
- All countries supported where WhatsApp is available
- No additional fees for international messages
- Currency display based on customer location (ZMW default)
- Phone number format validation for all countries`,
    },
    
    complianceViolations: {
      scenario: "Spam complaints, opt-out requests, data deletion requests",
      handling: `Opt-out/unsubscribe:
- Must honor immediately (legally required)
- Add to suppression list
- Confirm opt-out to customer
- Document for compliance

GDPR data deletion:
- Verify identity of requester
- Delete or anonymize all personal data within 30 days
- Provide confirmation
- Exception: data required for legal/tax purposes

Spam reports:
- Meta may limit your WhatsApp account if spam rate too high
- Keep spam rate below 0.5%
- Only message customers who have opted in
- Honor 24-hour rule for proactive messages

Documentation:
- Log all opt-outs and deletions
- Maintain suppression lists
- Regular compliance audits`,
    },
  },

  // ============================================
  // SECTION 17: COMPETITIVE COMPARISON
  // ============================================
  comparison: {
    vsTraditionalWhatsApp: {
      fiq: [
        "24/7 automated responses",
        "Unlimited concurrent chats",
        "AI learns from your business",
        "Human handoff when needed",
        "Analytics and insights",
        "Voice calling automation",
        "Team collaboration",
      ],
      traditional: [
        "Manual responses only",
        "One conversation at a time",
        "No automation",
        "No escalation system",
        "No analytics",
        "No voice automation",
        "Single user only",
      ],
    },
    
    vsOtherChatbots: {
      fiq: [
        "Built specifically for WhatsApp",
        "Zambian payment integration",
        "Local language support",
        "Managed setup option",
        "Human + AI hybrid",
        "Voice AI included",
        "Industry-specific templates",
      ],
      others: [
        "Generic messaging platforms",
        "International payment only",
        "English-centric",
        "Self-service setup",
        "AI-only or human-only",
        "Voice as expensive add-on",
        "Generic templates",
      ],
    },
  },

  // ============================================
  // SECTION 18: GETTING STARTED CHECKLIST
  // ============================================
  gettingStarted: {
    checklist: [
      { step: 1, action: "Sign up for FiQ account", who: "You", time: "2 minutes" },
      { step: 2, action: "Choose your plan", who: "You", time: "2 minutes" },
      { step: 3, action: "Provide business details", who: "You", time: "5 minutes" },
      { step: 4, action: "WhatsApp Business API setup", who: "FiQ team (managed) or You (self)", time: "1-2 days or 1-2 hours" },
      { step: 5, action: "Verify phone number", who: "You", time: "5 minutes" },
      { step: 6, action: "Configure AI personality", who: "You", time: "10 minutes" },
      { step: 7, action: "Add knowledge base entries", who: "You", time: "30 minutes" },
      { step: 8, action: "Test with sample conversations", who: "You", time: "15 minutes" },
      { step: 9, action: "Go live!", who: "You", time: "Instant" },
      { step: 10, action: "Monitor and optimize", who: "You + FiQ", time: "Ongoing" },
    ],
    
    quickWins: [
      "Set up welcome message within 24 hours",
      "Add top 5 FAQs to knowledge base",
      "Configure operating hours",
      "Test AI responses with common questions",
      "Set up at least one conversation flow",
    ],
  },
};

// Export individual sections for easy importing
export const {
  productOverview,
  features,
  pricing,
  whatsappSetup,
  dashboard,
  billing,
  ai,
  voiceAI,
  security,
  troubleshooting,
  faq,
  comparison,
  gettingStarted,
  advancedFeatures,
  integrations,
  adminGuide,
  industrySpecific,
  edgeCases,
} = fiqKnowledgeBase;

export default fiqKnowledgeBase;
