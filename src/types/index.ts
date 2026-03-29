// =============================================
// WAVELY - Core Type Definitions
// =============================================

// --- Tenant / Business ---
export interface Tenant {
  id: string;
  name: string;
  slug: string;
  whatsapp_phone_number_id: string;
  whatsapp_access_token: string;
  whatsapp_business_account_id: string;
  openai_api_key?: string;
  config: BusinessConfig;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// --- Business Configuration ---
export interface BusinessConfig {
  business_name: string;
  industry: Industry;
  description: string;
  personality: BotPersonality;
  welcome_message: string;
  fallback_message: string;
  operating_hours?: OperatingHours;
  languages: string[];
  default_language: string;
  knowledge_base: KnowledgeEntry[];
  faqs: FAQ[];
  quick_replies: QuickReply[];
  flows: ConversationFlow[];
  escalation_rules: EscalationRule[];
  custom_instructions: string;
}

export type Industry =
  | "ecommerce"
  | "healthcare"
  | "restaurant"
  | "realestate"
  | "education"
  | "travel"
  | "finance"
  | "saas"
  | "other";

export interface BotPersonality {
  name: string;
  tone: "professional" | "friendly" | "casual" | "formal";
  emoji_usage: "none" | "minimal" | "moderate" | "heavy";
  response_style: "concise" | "detailed" | "balanced";
}

export interface OperatingHours {
  timezone: string;
  schedule: {
    [day: string]: { open: string; close: string } | null;
  };
  outside_hours_message: string;
}

export interface KnowledgeEntry {
  id: string;
  topic: string;
  content: string;
  keywords: string[];
}

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category?: string;
}

export interface QuickReply {
  id: string;
  trigger: string;
  response: string;
  match_type: "exact" | "contains" | "regex";
}

export interface ConversationFlow {
  id: string;
  name: string;
  trigger: string;
  steps: FlowStep[];
}

export interface FlowStep {
  id: string;
  type: "message" | "question" | "action" | "condition" | "handoff";
  content?: string;
  options?: FlowOption[];
  action?: string;
  next_step?: string;
  condition?: {
    field: string;
    operator: "equals" | "contains" | "gt" | "lt";
    value: string;
    true_step: string;
    false_step: string;
  };
}

export interface FlowOption {
  label: string;
  value: string;
  next_step: string;
}

export interface EscalationRule {
  id: string;
  trigger: "keyword" | "sentiment" | "repeated_failure" | "request" | "timeout";
  value: string;
  priority: "low" | "medium" | "high" | "urgent";
}

// --- Conversations ---
export interface Conversation {
  id: string;
  tenant_id: string;
  customer_phone: string;
  customer_name?: string;
  status: ConversationStatus;
  assigned_agent_id?: string;
  ai_enabled: boolean;
  sentiment: "positive" | "neutral" | "negative" | null;
  tags: string[];
  metadata: Record<string, unknown>;
  last_message_at: string;
  created_at: string;
  updated_at: string;
}

export type ConversationStatus =
  | "active"
  | "waiting"
  | "handoff"
  | "resolved"
  | "archived";

// --- Messages ---
export interface Message {
  id: string;
  conversation_id: string;
  tenant_id: string;
  direction: "inbound" | "outbound";
  sender_type: "customer" | "bot" | "agent";
  message_type: WhatsAppMessageType;
  content: MessageContent;
  whatsapp_message_id?: string;
  status: "sent" | "delivered" | "read" | "failed";
  metadata?: Record<string, unknown>;
  created_at: string;
}

export type WhatsAppMessageType =
  | "text"
  | "image"
  | "audio"
  | "video"
  | "document"
  | "location"
  | "contact"
  | "interactive"
  | "template"
  | "reaction"
  | "sticker";

export interface MessageContent {
  text?: string;
  media_url?: string;
  media_id?: string;
  caption?: string;
  mime_type?: string;
  latitude?: number;
  longitude?: number;
  interactive?: InteractiveMessage;
  template?: TemplateMessage;
}

export interface InteractiveMessage {
  type: "button" | "list" | "product" | "product_list";
  header?: { type: "text" | "image" | "video" | "document"; text?: string; media_url?: string };
  body: string;
  footer?: string;
  buttons?: Array<{ id: string; title: string }>;
  sections?: Array<{
    title: string;
    rows: Array<{ id: string; title: string; description?: string }>;
  }>;
}

export interface TemplateMessage {
  name: string;
  language: string;
  components?: Array<{
    type: "header" | "body" | "button";
    parameters: Array<{ type: string; text?: string; image?: { link: string } }>;
  }>;
}

// --- Agents ---
export interface Agent {
  id: string;
  tenant_id: string;
  name: string;
  email: string;
  role: "admin" | "supervisor" | "agent";
  is_online: boolean;
  max_concurrent_chats: number;
  active_chats: number;
  created_at: string;
}

// --- Analytics ---
export interface AnalyticsData {
  total_conversations: number;
  active_conversations: number;
  resolved_conversations: number;
  avg_response_time_seconds: number;
  avg_resolution_time_seconds: number;
  ai_resolution_rate: number;
  customer_satisfaction: number;
  messages_today: number;
  messages_this_week: number;
  top_topics: Array<{ topic: string; count: number }>;
  sentiment_breakdown: { positive: number; neutral: number; negative: number };
  hourly_volume: Array<{ hour: number; count: number }>;
  daily_volume: Array<{ date: string; count: number }>;
}

// --- WhatsApp Webhook Types ---
export interface WhatsAppWebhookPayload {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: string;
        metadata: {
          display_phone_number: string;
          phone_number_id: string;
        };
        contacts?: Array<{
          profile: { name: string };
          wa_id: string;
        }>;
        messages?: Array<WhatsAppIncomingMessage>;
        statuses?: Array<WhatsAppMessageStatus>;
      };
      field: string;
    }>;
  }>;
}

export interface WhatsAppIncomingMessage {
  from: string;
  id: string;
  timestamp: string;
  type: WhatsAppMessageType;
  text?: { body: string };
  image?: { id: string; mime_type: string; caption?: string };
  audio?: { id: string; mime_type: string };
  video?: { id: string; mime_type: string; caption?: string };
  document?: { id: string; mime_type: string; filename?: string; caption?: string };
  location?: { latitude: number; longitude: number; name?: string; address?: string };
  interactive?: {
    type: "button_reply" | "list_reply";
    button_reply?: { id: string; title: string };
    list_reply?: { id: string; title: string; description?: string };
  };
  reaction?: { message_id: string; emoji: string };
  context?: { from: string; id: string };
}

export interface WhatsAppMessageStatus {
  id: string;
  status: "sent" | "delivered" | "read" | "failed";
  timestamp: string;
  recipient_id: string;
  errors?: Array<{ code: number; title: string }>;
}

// --- Scheduled Messages ---
export interface ScheduledMessage {
  id: string;
  tenant_id: string;
  conversation_id?: string;
  customer_phone: string;
  message_type: "text" | "template" | "interactive";
  content: MessageContent;
  scheduled_at: string;
  status: "pending" | "sent" | "failed" | "cancelled";
  retry_count: number;
  max_retries: number;
  category: ScheduledMessageCategory;
  metadata: Record<string, unknown>;
  sent_at?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export type ScheduledMessageCategory =
  | "reminder"
  | "follow_up"
  | "appointment_reminder"
  | "delivery_update"
  | "booking_confirmation"
  | "payment_reminder"
  | "campaign"
  | "reengagement"
  | "custom";

// --- Bookings ---
export interface Booking {
  id: string;
  tenant_id: string;
  conversation_id?: string;
  customer_phone: string;
  customer_name?: string;
  booking_type: BookingType;
  status: BookingStatus;
  scheduled_date: string;
  scheduled_time?: string;
  duration_minutes?: number;
  location?: string;
  notes?: string;
  details: Record<string, unknown>;
  reminder_sent: boolean;
  confirmed_at?: string;
  cancelled_at?: string;
  cancellation_reason?: string;
  created_at: string;
  updated_at: string;
}

export type BookingType =
  | "appointment"
  | "reservation"
  | "viewing"
  | "consultation"
  | "tour"
  | "callback"
  | "service"
  | "custom";

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "cancelled"
  | "completed"
  | "no_show"
  | "rescheduled";

// --- Lead Scores ---
export interface LeadScore {
  id: string;
  tenant_id: string;
  conversation_id: string;
  customer_phone: string;
  customer_name?: string;
  score: number;
  temperature: "hot" | "warm" | "cold";
  qualification_data: Record<string, unknown>;
  intent?: string;
  budget_range?: string;
  timeline?: string;
  source?: string;
  assigned_agent_id?: string;
  last_interaction_at: string;
  next_follow_up_at?: string;
  follow_up_count: number;
  converted: boolean;
  converted_at?: string;
  created_at: string;
  updated_at: string;
}

// --- AI Engine Types ---
export interface AIContext {
  tenant_config: BusinessConfig;
  conversation_history: Array<{ role: "user" | "assistant"; content: string }>;
  customer_name?: string;
  current_flow?: ConversationFlow;
  flow_step?: string;
  collected_data?: Record<string, string>;
}

export interface AIResponse {
  text: string;
  suggested_actions?: Array<{
    type: "quick_reply" | "escalate" | "flow";
    label: string;
    value: string;
  }>;
  sentiment?: "positive" | "neutral" | "negative";
  should_escalate: boolean;
  escalation_reason?: string;
  detected_intent?: string;
  confidence: number;
}

// --- Subscription & Payment Types ---
export interface Subscription {
  id: string;
  tenant_id: string;
  plan_id: string;
  status: "active" | "past_due" | "cancelled" | "expired";
  current_period_start: string;
  current_period_end: string;
  messages_used: number;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  tenant_id: string;
  subscription_id?: string;
  lipila_reference_id: string;
  amount: number;
  currency: string;
  status: "pending" | "successful" | "failed" | "cancelled";
  payment_type?: "AirtelMoney" | "MtnMoney" | "ZamtelKwacha" | "Card";
  account_number?: string;
  narration?: string;
  lipila_identifier?: string;
  lipila_external_id?: string;
  callback_data?: Record<string, unknown>;
  error_message?: string;
  created_at: string;
  updated_at: string;
}
