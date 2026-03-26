import type { BusinessConfig } from "@/types";

export const templates: Record<string, BusinessConfig> = {
  ecommerce: {
    business_name: "My Store",
    industry: "ecommerce",
    description: "An online store selling quality products with fast delivery and excellent customer service.",
    personality: {
      name: "Alex",
      tone: "friendly",
      emoji_usage: "moderate",
      response_style: "balanced",
    },
    welcome_message: "Hey {customer_name}! Welcome to {business_name} 🛍️\nHow can I help you today?",
    fallback_message: "Oops! Something went wrong on our end. Please try again or reach out to us at support@mystore.com",
    languages: ["en"],
    default_language: "en",
    knowledge_base: [
      { id: "kb1", topic: "Shipping", content: "We offer free shipping on orders over $50. Standard delivery takes 3-5 business days. Express shipping (1-2 days) is available for $9.99.", keywords: ["shipping", "delivery", "ship"] },
      { id: "kb2", topic: "Returns", content: "We accept returns within 30 days of purchase. Items must be unused and in original packaging. Refunds are processed within 5-7 business days.", keywords: ["return", "refund", "exchange"] },
      { id: "kb3", topic: "Payment", content: "We accept Visa, Mastercard, PayPal, and Apple Pay. All transactions are secured with SSL encryption.", keywords: ["payment", "pay", "credit card"] },
    ],
    faqs: [
      { id: "faq1", question: "How do I track my order?", answer: "You can track your order using the tracking link sent to your email after shipment. You can also check your order status in your account dashboard.", category: "orders" },
      { id: "faq2", question: "What is your return policy?", answer: "We offer a 30-day return policy. Items must be unused and in original packaging. Simply contact us and we'll provide a return shipping label.", category: "returns" },
      { id: "faq3", question: "Do you offer international shipping?", answer: "Yes! We ship to over 50 countries. International shipping rates and delivery times vary by location.", category: "shipping" },
    ],
    quick_replies: [
      { id: "qr1", trigger: "hi", response: "Hey there! 👋 Welcome to {business_name}. How can I help you today?", match_type: "exact" },
      { id: "qr2", trigger: "hello", response: "Hello! 😊 Welcome to {business_name}. What can I do for you?", match_type: "exact" },
      { id: "qr3", trigger: "thanks", response: "You're welcome! 😊 Is there anything else I can help with?", match_type: "contains" },
    ],
    flows: [
      {
        id: "order_status",
        name: "Track Order",
        trigger: "track order",
        steps: [
          { id: "ask_order", type: "question", content: "Sure! Please share your order number and I'll look it up for you." },
          { id: "lookup", type: "action", action: "lookup_order" },
        ],
      },
      {
        id: "product_inquiry",
        name: "Product Help",
        trigger: "product",
        steps: [
          { id: "ask_product", type: "question", content: "I'd love to help! What product are you interested in?" },
        ],
      },
      {
        id: "support",
        name: "Get Support",
        trigger: "support",
        steps: [
          { id: "ask_issue", type: "question", content: "I'm here to help! Could you describe the issue you're experiencing?" },
        ],
      },
    ],
    escalation_rules: [
      { id: "esc1", trigger: "keyword", value: "speak to human", priority: "medium" },
      { id: "esc2", trigger: "keyword", value: "manager", priority: "high" },
      { id: "esc3", trigger: "keyword", value: "complaint", priority: "high" },
      { id: "esc4", trigger: "sentiment", value: "negative", priority: "medium" },
      { id: "esc5", trigger: "request", value: "agent", priority: "medium" },
    ],
    custom_instructions: "Always try to upsell related products when appropriate. Mention ongoing promotions if any.",
  },

  healthcare: {
    business_name: "HealthFirst Clinic",
    industry: "healthcare",
    description: "A modern healthcare clinic providing primary care, specialist consultations, and preventive health services.",
    personality: {
      name: "Dr. Care",
      tone: "professional",
      emoji_usage: "minimal",
      response_style: "detailed",
    },
    welcome_message: "Hello {customer_name}. Welcome to {business_name}.\nHow may I assist you today?",
    fallback_message: "We apologize for the inconvenience. Please call us at (555) 123-4567 for immediate assistance.",
    languages: ["en", "es"],
    default_language: "en",
    knowledge_base: [
      { id: "kb1", topic: "Appointments", content: "Appointments can be booked online or by calling (555) 123-4567. Same-day appointments are available for urgent cases. Regular consultations are $150, specialist visits are $250.", keywords: ["appointment", "book", "schedule", "visit"] },
      { id: "kb2", topic: "Services", content: "We offer: General checkups, Pediatrics, Dermatology, Cardiology, Lab tests, Vaccinations, and Telehealth consultations.", keywords: ["services", "offer", "specialize", "department"] },
      { id: "kb3", topic: "Insurance", content: "We accept most major insurance plans including Blue Cross, Aetna, UnitedHealth, and Medicare. Please bring your insurance card to your visit.", keywords: ["insurance", "coverage", "accept"] },
      { id: "kb4", topic: "Hours", content: "Monday-Friday: 8:00 AM - 6:00 PM, Saturday: 9:00 AM - 2:00 PM, Sunday: Closed. Emergency line available 24/7.", keywords: ["hours", "open", "schedule", "time"] },
    ],
    faqs: [
      { id: "faq1", question: "How do I book an appointment?", answer: "You can book an appointment by calling (555) 123-4567, visiting our website, or I can help you schedule one right now.", category: "appointments" },
      { id: "faq2", question: "Do you offer telehealth?", answer: "Yes, we offer telehealth consultations for non-emergency visits. You can book a video consultation through our patient portal.", category: "services" },
      { id: "faq3", question: "What should I bring to my first visit?", answer: "Please bring: photo ID, insurance card, list of current medications, and any relevant medical records.", category: "general" },
    ],
    quick_replies: [],
    flows: [
      {
        id: "book_appointment",
        name: "Book Appointment",
        trigger: "appointment",
        steps: [
          { id: "ask_type", type: "question", content: "What type of appointment would you like to schedule?" },
          { id: "ask_date", type: "question", content: "What date and time works best for you?" },
          { id: "confirm", type: "message", content: "I'll have our scheduling team confirm your appointment shortly." },
        ],
      },
      {
        id: "check_results",
        name: "Lab Results",
        trigger: "results",
        steps: [
          { id: "verify", type: "question", content: "For security, please provide your patient ID or date of birth." },
        ],
      },
      {
        id: "speak_doctor",
        name: "Speak to Doctor",
        trigger: "doctor",
        steps: [
          { id: "handoff", type: "handoff" },
        ],
      },
    ],
    escalation_rules: [
      { id: "esc1", trigger: "keyword", value: "emergency", priority: "urgent" },
      { id: "esc2", trigger: "keyword", value: "urgent", priority: "urgent" },
      { id: "esc3", trigger: "keyword", value: "pain", priority: "high" },
      { id: "esc4", trigger: "request", value: "doctor", priority: "high" },
    ],
    custom_instructions: "NEVER provide medical diagnoses or treatment recommendations. Always recommend consulting with a healthcare professional for medical concerns. Be HIPAA-conscious — never ask for or store sensitive medical information via chat.",
  },

  restaurant: {
    business_name: "Bella Cucina",
    industry: "restaurant",
    description: "An Italian restaurant offering authentic cuisine, dine-in, takeout, and catering services.",
    personality: {
      name: "Marco",
      tone: "friendly",
      emoji_usage: "moderate",
      response_style: "concise",
    },
    welcome_message: "Ciao {customer_name}! 🍝 Welcome to {business_name}!\nWhat can I help you with today?",
    fallback_message: "Sorry about that! Please call us at (555) 987-6543 and we'll help you right away.",
    languages: ["en", "it"],
    default_language: "en",
    knowledge_base: [
      { id: "kb1", topic: "Menu", content: "Our menu features authentic Italian dishes: Pasta (from $14), Pizza (from $12), Risotto ($16-$20), Seafood ($18-$28), Desserts ($8-$12). We also offer a lunch special: any pasta + drink for $16.", keywords: ["menu", "food", "dishes", "eat", "price"] },
      { id: "kb2", topic: "Reservations", content: "Reservations can be made for parties of any size. For groups of 8+, please call ahead. We recommend reserving for Friday and Saturday evenings.", keywords: ["reservation", "book", "table", "reserve"] },
      { id: "kb3", topic: "Hours", content: "Tuesday-Thursday: 11:30 AM - 9:30 PM, Friday-Saturday: 11:30 AM - 10:30 PM, Sunday: 12:00 PM - 9:00 PM, Monday: Closed.", keywords: ["hours", "open", "time", "closed"] },
      { id: "kb4", topic: "Delivery", content: "We offer delivery within a 5-mile radius. Free delivery on orders over $40. Estimated delivery time: 30-45 minutes.", keywords: ["delivery", "deliver", "order", "takeout"] },
    ],
    faqs: [
      { id: "faq1", question: "Do you cater events?", answer: "Absolutely! We offer catering for events of all sizes. Contact us for a custom menu and quote.", category: "catering" },
      { id: "faq2", question: "Do you have vegetarian/vegan options?", answer: "Yes! We have a dedicated vegetarian section on our menu, and many dishes can be made vegan upon request. 🌱", category: "dietary" },
      { id: "faq3", question: "Is there parking available?", answer: "Yes, we have a free parking lot behind the restaurant with 30 spaces. Street parking is also available.", category: "general" },
    ],
    quick_replies: [
      { id: "qr1", trigger: "menu", response: "Here's a peek at our menu 🍕:\n\n🍝 *Pasta* — from $14\n🍕 *Pizza* — from $12\n🍚 *Risotto* — $16-$20\n🦐 *Seafood* — $18-$28\n🍰 *Desserts* — $8-$12\n\n📋 Full menu: bellacucina.com/menu", match_type: "exact" },
    ],
    flows: [
      {
        id: "make_reservation",
        name: "Reserve Table",
        trigger: "reservation",
        steps: [
          { id: "ask_guests", type: "question", content: "Great! How many guests will be dining?" },
          { id: "ask_datetime", type: "question", content: "What date and time would you prefer?" },
          { id: "confirm", type: "message", content: "Let me check availability... I'll confirm your reservation shortly!" },
        ],
      },
      {
        id: "place_order",
        name: "Order Food",
        trigger: "order",
        steps: [
          { id: "ask_items", type: "question", content: "What would you like to order? You can check our menu at bellacucina.com/menu" },
        ],
      },
      {
        id: "contact_us",
        name: "Contact Us",
        trigger: "contact",
        steps: [
          { id: "info", type: "message", content: "📍 123 Main Street\n📞 (555) 987-6543\n📧 info@bellacucina.com\n🌐 bellacucina.com" },
        ],
      },
    ],
    escalation_rules: [
      { id: "esc1", trigger: "keyword", value: "allergy", priority: "urgent" },
      { id: "esc2", trigger: "keyword", value: "food poisoning", priority: "urgent" },
      { id: "esc3", trigger: "keyword", value: "complaint", priority: "high" },
    ],
    custom_instructions: "Be enthusiastic about the food! Use Italian phrases occasionally. For allergy-related questions, ALWAYS recommend speaking to staff directly.",
  },

  realestate: {
    business_name: "Prime Properties",
    industry: "realestate",
    description: "A real estate agency helping clients buy, sell, and rent residential and commercial properties.",
    personality: {
      name: "Sarah",
      tone: "professional",
      emoji_usage: "minimal",
      response_style: "detailed",
    },
    welcome_message: "Hello {customer_name}! Welcome to {business_name}.\nWhether you're looking to buy, sell, or rent, I'm here to help. What are you looking for?",
    fallback_message: "Apologies for the inconvenience. Please email us at info@primeproperties.com or call (555) 456-7890.",
    languages: ["en"],
    default_language: "en",
    knowledge_base: [
      { id: "kb1", topic: "Buying", content: "We help buyers find their dream home. Our services include property search, viewing scheduling, negotiation assistance, and closing support. First-time buyer consultations are free.", keywords: ["buy", "purchase", "home", "house"] },
      { id: "kb2", topic: "Selling", content: "We offer comprehensive selling services: free property valuation, professional photography, online/offline marketing, open house management, and negotiation expertise. Our commission is competitive at 2.5%.", keywords: ["sell", "listing", "list", "value"] },
      { id: "kb3", topic: "Rentals", content: "Browse our rental listings for apartments, houses, and commercial spaces. We handle tenant screening, lease preparation, and property management.", keywords: ["rent", "lease", "apartment", "rental"] },
    ],
    faqs: [
      { id: "faq1", question: "How do I schedule a property viewing?", answer: "I can help schedule a viewing! Just let me know which property you're interested in and your preferred date/time, and I'll arrange it.", category: "viewings" },
      { id: "faq2", question: "What areas do you cover?", answer: "We cover the entire metro area including downtown, suburbs, and surrounding counties. Our agents are local experts in each neighborhood.", category: "coverage" },
    ],
    quick_replies: [],
    flows: [
      {
        id: "property_search",
        name: "Find Property",
        trigger: "search",
        steps: [
          { id: "ask_type", type: "question", content: "Are you looking to buy or rent?" },
          { id: "ask_budget", type: "question", content: "What's your budget range?" },
          { id: "ask_area", type: "question", content: "Which area or neighborhood do you prefer?" },
          { id: "results", type: "message", content: "Let me find the best matching properties for you. An agent will follow up with personalized recommendations shortly." },
        ],
      },
      {
        id: "schedule_viewing",
        name: "Book Viewing",
        trigger: "viewing",
        steps: [
          { id: "ask_property", type: "question", content: "Which property would you like to view? Please share the listing ID or address." },
          { id: "ask_datetime", type: "question", content: "What date and time works for you?" },
        ],
      },
      {
        id: "speak_agent",
        name: "Speak to Agent",
        trigger: "agent",
        steps: [
          { id: "handoff", type: "handoff" },
        ],
      },
    ],
    escalation_rules: [
      { id: "esc1", trigger: "keyword", value: "offer", priority: "high" },
      { id: "esc2", trigger: "keyword", value: "negotiate", priority: "high" },
      { id: "esc3", trigger: "request", value: "agent", priority: "medium" },
    ],
    custom_instructions: "Always try to schedule viewings and collect contact information. Be knowledgeable about market trends. Never provide specific legal or financial advice — recommend consulting professionals.",
  },
};

export function getTemplate(industry: string): BusinessConfig | null {
  return templates[industry] || null;
}

export function getAvailableTemplates(): Array<{ id: string; name: string; industry: string }> {
  return Object.entries(templates).map(([key, config]) => ({
    id: key,
    name: config.business_name,
    industry: config.industry,
  }));
}
