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
      { id: "kb1", topic: "Shipping", content: "Free shipping on orders over $50. Standard delivery: 3-5 business days. Express (1-2 days): $9.99. Same-day delivery available in select metro areas for $14.99 on orders placed before 12 PM. All orders include tracking. Signature required for orders over $200.", keywords: ["shipping", "delivery", "ship", "track", "arrive", "transit"] },
      { id: "kb2", topic: "Returns & Exchanges", content: "30-day return policy. Items must be unused, unworn, with original tags and packaging. Free return shipping label provided. Exchanges for different size/color are free. Refunds processed within 5-7 business days to original payment method. Sale items can be returned for store credit only. Damaged or defective items replaced immediately.", keywords: ["return", "refund", "exchange", "damaged", "defective", "wrong item", "send back"] },
      { id: "kb3", topic: "Payment & Checkout", content: "We accept Visa, Mastercard, American Express, PayPal, Apple Pay, Google Pay, and Klarna (buy now, pay later in 4 installments). All transactions secured with SSL encryption and PCI-DSS compliant. Gift cards available in $25, $50, $100 denominations. Promo codes can be applied at checkout.", keywords: ["payment", "pay", "credit card", "gift card", "promo", "coupon", "discount", "klarna", "installment"] },
      { id: "kb4", topic: "Order Issues", content: "If you received a wrong or damaged item, contact us within 48 hours with photos and we'll send a replacement immediately. Missing items from an order can be reported within 7 days. We cannot modify orders once they've been shipped. Cancellation is possible within 1 hour of placing the order.", keywords: ["wrong", "damaged", "missing", "cancel", "modify", "problem", "issue", "broken"] },
      { id: "kb5", topic: "Account & Loyalty", content: "Create a free account to track orders, save wishlists, and earn rewards. Loyalty program: earn 1 point per $1 spent. 100 points = $5 reward. VIP status at 500+ points/year with early access to sales and double points events. Password reset available via email.", keywords: ["account", "password", "login", "rewards", "loyalty", "points", "wishlist", "vip"] },
      { id: "kb6", topic: "Product Information", content: "All products include detailed descriptions, sizing guides, and customer reviews. We source from verified suppliers with quality guarantees. Products marked 'In Stock' ship within 24 hours. 'Pre-order' items ship on the listed date. Sizing varies by brand — check the size guide on each product page.", keywords: ["product", "size", "sizing", "stock", "availability", "review", "quality", "material"] },
      { id: "kb7", topic: "Promotions & Sales", content: "Sign up for our newsletter for exclusive 10% off your first order. Major sales: Black Friday, Cyber Monday, Summer Sale, End of Season. Flash sales announced via email and social media. Promo codes cannot be combined. Price matching available within 7 days of purchase.", keywords: ["sale", "promotion", "offer", "discount", "deal", "newsletter", "price match", "black friday"] },
    ],
    faqs: [
      { id: "faq1", question: "How do I track my order?", answer: "You can track your order using the tracking link sent to your email after shipment. You can also check your order status in your account dashboard under 'My Orders'.", category: "orders" },
      { id: "faq2", question: "What is your return policy?", answer: "We offer a 30-day return policy. Items must be unused with original tags and packaging. We provide free return shipping labels. Refunds are processed within 5-7 business days.", category: "returns" },
      { id: "faq3", question: "Do you offer international shipping?", answer: "Yes! We ship to over 50 countries. International shipping rates and delivery times vary by location. Customs duties may apply and are the responsibility of the buyer.", category: "shipping" },
      { id: "faq4", question: "How can I use a promo code?", answer: "Enter your promo code at checkout in the 'Discount Code' field and click 'Apply'. Only one promo code can be used per order. Codes cannot be applied after purchase.", category: "orders" },
      { id: "faq5", question: "My order arrived damaged, what do I do?", answer: "We're sorry! Please take photos of the damage and contact us within 48 hours. We'll send a free replacement immediately — no need to return the damaged item.", category: "returns" },
      { id: "faq6", question: "Can I change or cancel my order?", answer: "Orders can be cancelled within 1 hour of placement. After that, we cannot modify orders once they enter processing. You can return items after delivery.", category: "orders" },
      { id: "faq7", question: "Do you offer buy now, pay later?", answer: "Yes! We offer Klarna at checkout — split your purchase into 4 interest-free installments. No additional fees if payments are on time.", category: "payment" },
      { id: "faq8", question: "How do I reset my password?", answer: "Click 'Forgot Password' on the login page. Enter your email and we'll send a reset link. The link expires in 24 hours.", category: "account" },
    ],
    quick_replies: [
      { id: "qr1", trigger: "hi", response: "Hey there! 👋 Welcome to {business_name}. How can I help you today?", match_type: "exact" },
      { id: "qr2", trigger: "hello", response: "Hello! 😊 Welcome to {business_name}. What can I do for you?", match_type: "exact" },
      { id: "qr3", trigger: "thanks", response: "You're welcome! 😊 Is there anything else I can help with?", match_type: "contains" },
      { id: "qr4", trigger: "bye", response: "Thanks for shopping with us! Have a great day! 🛍️", match_type: "contains" },
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
    custom_instructions: "Always try to upsell related products when appropriate. Mention ongoing promotions if relevant. For order issues, express empathy first then provide solutions. Always confirm the order number format (#ORD-XXXX). Proactively offer tracking links. If a customer is comparing products, highlight key differentiators and reviews. For returns, make the process feel easy — never make the customer feel guilty. Remind first-time customers about the loyalty program.",
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
      { id: "kb1", topic: "Appointments", content: "Appointments can be booked online, via WhatsApp, or by calling (555) 123-4567. Same-day appointments available for urgent cases. Walk-ins accepted but appointments are prioritized. Regular consultations: $150. Specialist visits: $250. Follow-up visits: $75. Cancellation required 24 hours in advance to avoid $50 no-show fee.", keywords: ["appointment", "book", "schedule", "visit", "walk-in", "cancel"] },
      { id: "kb2", topic: "Services & Departments", content: "Departments: General Medicine, Pediatrics (ages 0-18), Dermatology, Cardiology, Orthopedics, Women's Health, Mental Health & Counseling. Services: annual checkups, vaccinations (flu, COVID, travel), lab work (blood tests, urinalysis, cholesterol panels), X-rays, minor procedures, chronic disease management (diabetes, hypertension), telehealth consultations.", keywords: ["services", "offer", "specialize", "department", "checkup", "vaccine", "lab", "test", "x-ray"] },
      { id: "kb3", topic: "Insurance & Billing", content: "Accepted insurance: Blue Cross Blue Shield, Aetna, UnitedHealth, Cigna, Humana, Medicare, Medicaid. Self-pay patients receive 15% discount if paid at time of visit. Payment plans available for bills over $500. Billing inquiries: billing@healthfirst.com or (555) 123-4568. We provide itemized statements and insurance claim assistance.", keywords: ["insurance", "coverage", "accept", "billing", "cost", "price", "pay", "claim", "self-pay"] },
      { id: "kb4", topic: "Hours & Location", content: "Monday-Friday: 8:00 AM - 6:00 PM. Saturday: 9:00 AM - 2:00 PM. Sunday: Closed. Emergency/After-hours nurse line: (555) 123-4569 available 24/7. Location: 200 Health Plaza, Suite 100. Free parking in Building B garage. Wheelchair accessible. Nearest hospital ER: City General (0.5 miles).", keywords: ["hours", "open", "schedule", "time", "location", "address", "parking", "emergency"] },
      { id: "kb5", topic: "Prescriptions & Pharmacy", content: "Prescriptions sent electronically to your preferred pharmacy. Refill requests: call (555) 123-4567 or use the patient portal. Allow 48 hours for non-urgent refills. We do not prescribe controlled substances via telehealth. Generic alternatives discussed when available to reduce costs.", keywords: ["prescription", "medication", "refill", "pharmacy", "medicine", "drug"] },
      { id: "kb6", topic: "Patient Portal", content: "Access your medical records, lab results, appointment history, and messaging with your provider through our secure patient portal at portal.healthfirst.com. Results typically available within 24-48 hours of lab work. Portal registration requires a valid email and patient ID.", keywords: ["portal", "records", "results", "online", "login", "medical records", "lab results"] },
      { id: "kb7", topic: "Preventive Care", content: "We strongly recommend annual wellness visits, age-appropriate screenings (mammograms, colonoscopies, skin checks), flu shots (available September-March), and routine blood work. Most preventive services are covered 100% by insurance under ACA guidelines.", keywords: ["preventive", "wellness", "screening", "checkup", "annual", "physical"] },
    ],
    faqs: [
      { id: "faq1", question: "How do I book an appointment?", answer: "You can book online at healthfirst.com/book, call (555) 123-4567, or I can help you schedule one right now via WhatsApp.", category: "appointments" },
      { id: "faq2", question: "Do you offer telehealth?", answer: "Yes! Telehealth consultations are available for non-emergency visits including follow-ups, mental health, and minor illness. Book through our patient portal. Cost is the same as in-person visits.", category: "services" },
      { id: "faq3", question: "What should I bring to my first visit?", answer: "Please bring: photo ID, insurance card, list of current medications and dosages, any relevant medical records or referral letters, and a completed new patient form (downloadable from our website).", category: "general" },
      { id: "faq4", question: "How do I get my lab results?", answer: "Lab results are posted to your patient portal within 24-48 hours. Your doctor will call you directly if any results need immediate attention. You can also call the office to request results.", category: "results" },
      { id: "faq5", question: "Do you accept walk-ins?", answer: "Yes, we accept walk-ins during business hours, but appointments are prioritized. For faster service, we recommend booking ahead.", category: "appointments" },
      { id: "faq6", question: "How do I request a prescription refill?", answer: "Use the patient portal or call (555) 123-4567. Please allow 48 hours for non-urgent refills. Have your medication name, dosage, and pharmacy information ready.", category: "prescriptions" },
      { id: "faq7", question: "Do you treat children?", answer: "Yes! Our pediatrics department sees patients from newborns to age 18 for well-child visits, vaccinations, sick visits, and developmental screenings.", category: "services" },
    ],
    quick_replies: [
      { id: "qr1", trigger: "hi", response: "Hello! Welcome to {business_name}. How may I assist you today?", match_type: "exact" },
      { id: "qr2", trigger: "thanks", response: "You're welcome. Is there anything else I can help you with?", match_type: "contains" },
    ],
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
    custom_instructions: "NEVER provide medical diagnoses, treatment recommendations, or medication dosage advice. Always recommend consulting with a healthcare professional for medical concerns. Be HIPAA-conscious — never ask for or store sensitive medical information (SSN, full DOB, detailed medical history) via chat. For emergencies, immediately direct to 911 or the nearest ER. Always confirm appointment details (date, time, type) before finalizing. When discussing costs, mention insurance coverage options. Be compassionate and patient — many callers may be anxious about health issues.",
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
      { id: "kb1", topic: "Menu & Pricing", content: "Authentic Italian cuisine. Antipasti/Starters: $8-$14 (bruschetta, caprese, calamari). Pasta: $14-$22 (carbonara, puttanesca, truffle pappardelle, gluten-free penne available). Pizza: $12-$18 (Margherita, Quattro Formaggi, Diavola, build-your-own). Risotto: $16-$20 (mushroom, seafood, saffron). Mains: $18-$32 (chicken parmigiana, veal marsala, grilled branzino, lamb chops). Desserts: $8-$12 (tiramisu, panna cotta, gelato). Kids menu available ($8-$10). Lunch special: any pasta + drink for $16 (Tue-Fri 11:30-3 PM).", keywords: ["menu", "food", "dishes", "eat", "price", "pasta", "pizza", "dessert", "lunch", "dinner", "kids"] },
      { id: "kb2", topic: "Reservations", content: "Reservations accepted via WhatsApp, phone (555) 987-6543, or online. Walk-ins welcome but we recommend reserving for Friday/Saturday evenings and holidays. Groups of 8+: please call 48 hours ahead. Private dining room available for up to 30 guests (minimum spend $500). No reservation fee. We hold tables for 15 minutes past reservation time.", keywords: ["reservation", "book", "table", "reserve", "private", "group", "party"] },
      { id: "kb3", topic: "Hours & Location", content: "Tuesday-Thursday: 11:30 AM - 9:30 PM. Friday-Saturday: 11:30 AM - 10:30 PM. Sunday: 12:00 PM - 9:00 PM (brunch 12-3 PM). Monday: Closed. Kitchen closes 30 min before closing. Location: 123 Main Street. Free parking lot (30 spaces) behind building. Wheelchair accessible.", keywords: ["hours", "open", "time", "closed", "location", "address", "parking", "brunch"] },
      { id: "kb4", topic: "Delivery & Takeout", content: "Delivery within 5-mile radius. Free delivery on orders over $40, otherwise $5 delivery fee. Estimated delivery: 30-45 minutes. Takeout orders ready in 20-30 minutes. Order via WhatsApp, phone, or our website. We use eco-friendly packaging. 10% discount on first online order. Catering delivery available for larger orders.", keywords: ["delivery", "deliver", "order", "takeout", "pick up", "carry out", "online order"] },
      { id: "kb5", topic: "Dietary & Allergens", content: "Vegetarian options: 12+ dishes marked with 🌿 on menu. Vegan modifications available on request (dairy-free cheese, egg-free pasta). Gluten-free: GF pasta and pizza base available (+$2). Nut-free preparations available — please notify staff. Full allergen menu available on request. We cannot guarantee a 100% allergen-free kitchen — cross-contamination is possible.", keywords: ["vegetarian", "vegan", "gluten", "allergy", "allergen", "dairy", "nut", "celiac", "dietary"] },
      { id: "kb6", topic: "Drinks & Wine", content: "Full bar with cocktails ($12-$16), house wines by glass ($10-$14) or bottle ($36-$80), Italian craft beers ($8-$12), non-alcoholic options (Italian sodas, fresh juices, mocktails). Wine pairing recommendations available with dinner. Happy hour: Tue-Thu 4-6 PM — half-price appetizers and $8 house wines.", keywords: ["wine", "drink", "cocktail", "beer", "bar", "happy hour", "beverage", "alcohol"] },
      { id: "kb7", topic: "Catering & Events", content: "Full-service catering for 20-200 guests. Custom menus starting at $35/person (appetizers + main + dessert). Corporate events, weddings, birthdays. Includes setup, serving staff, and cleanup. Book at least 2 weeks in advance. Deposit: 50% at booking, balance due 3 days before event. Tastings available for events over 50 guests.", keywords: ["catering", "event", "wedding", "party", "corporate", "birthday", "banquet"] },
    ],
    faqs: [
      { id: "faq1", question: "Do you cater events?", answer: "Absolutely! We offer full-service catering for 20-200 guests starting at $35/person. Custom menus, setup, serving staff, and cleanup included. Book at least 2 weeks ahead. Contact us for a tasting!", category: "catering" },
      { id: "faq2", question: "Do you have vegetarian/vegan options?", answer: "Yes! We have 12+ vegetarian dishes marked on our menu, and many can be made vegan on request (dairy-free cheese, egg-free pasta). Gluten-free pasta and pizza bases also available. 🌱", category: "dietary" },
      { id: "faq3", question: "Is there parking available?", answer: "Yes, we have a free parking lot behind the restaurant with 30 spaces. Street parking is also available along Main Street.", category: "general" },
      { id: "faq4", question: "Do you have a kids menu?", answer: "Yes! Our kids menu ($8-$10) includes mini pizza, pasta with butter or tomato sauce, chicken fingers, and gelato. High chairs and booster seats available.", category: "menu" },
      { id: "faq5", question: "Can I see the menu?", answer: "Our full menu is at bellacucina.com/menu. Quick highlights: Pasta from $14, Pizza from $12, Risotto $16-$20, Mains $18-$32. Lunch special: any pasta + drink for $16 (Tue-Fri).", category: "menu" },
      { id: "faq6", question: "Do you do happy hour?", answer: "Yes! Happy hour runs Tue-Thu 4-6 PM — half-price appetizers and $8 house wines. It's a great deal! 🍷", category: "drinks" },
      { id: "faq7", question: "How long is the wait for delivery?", answer: "Delivery typically takes 30-45 minutes. Takeout orders are ready in 20-30 minutes. You can track your delivery status via our website.", category: "delivery" },
    ],
    quick_replies: [
      { id: "qr1", trigger: "menu", response: "Here's a peek at our menu 🍕:\n\n🥗 *Starters* — $8-$14\n🍝 *Pasta* — $14-$22\n🍕 *Pizza* — $12-$18\n🍚 *Risotto* — $16-$20\n� *Mains* — $18-$32\n🍰 *Desserts* — $8-$12\n🧒 *Kids* — $8-$10\n\n📋 Full menu: bellacucina.com/menu", match_type: "exact" },
      { id: "qr2", trigger: "hours", response: "🕐 Our hours:\nTue-Thu: 11:30 AM - 9:30 PM\nFri-Sat: 11:30 AM - 10:30 PM\nSun: 12 PM - 9 PM (brunch 12-3!)\nMon: Closed", match_type: "exact" },
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
    custom_instructions: "Be enthusiastic about the food! Use Italian phrases occasionally (Benvenuto, Grazie, Buon appetito). For allergy-related questions, ALWAYS recommend speaking to staff directly — never guarantee allergen-free preparation. Suggest wine pairings when customers order mains. Mention the lunch special during lunch hours. For large party inquiries, proactively mention the private dining room. Encourage reservations for Friday/Saturday. If a dish is asked about that's not on the menu, suggest the closest alternative.",
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
      { id: "kb1", topic: "Buying a Property", content: "Full buyer representation from search to closing. Services: personalized property search, viewing scheduling, comparative market analysis (CMA), offer strategy and negotiation, home inspection coordination, closing paperwork. First-time buyer consultation is free. We guide you through mortgage pre-approval, earnest money, contingencies, and closing costs (typically 2-5% of purchase price). Average time from offer to close: 30-45 days.", keywords: ["buy", "purchase", "home", "house", "offer", "closing", "mortgage", "first-time", "inspection"] },
      { id: "kb2", topic: "Selling a Property", content: "Comprehensive selling services: free property valuation with CMA report, professional photography and virtual tours, staging consultation, MLS listing, social media and online marketing, open house coordination, buyer screening, negotiation expertise. Commission: 2.5% (competitive). Average days on market: 21. We sell homes for 98% of asking price on average. Seller's checklist and timeline provided at listing.", keywords: ["sell", "listing", "list", "value", "valuation", "appraisal", "market", "commission", "staging"] },
      { id: "kb3", topic: "Rentals & Leasing", content: "Rental listings for apartments, condos, houses, and commercial spaces. For tenants: application fee $35, background and credit check, lease terms 6-12 months, security deposit typically 1 month rent. For landlords: tenant screening, lease preparation, rent collection, maintenance coordination, property management (8% monthly fee). Pet-friendly options available.", keywords: ["rent", "lease", "apartment", "rental", "tenant", "landlord", "pet", "deposit", "application"] },
      { id: "kb4", topic: "Market & Neighborhoods", content: "We cover the entire metro area: Downtown (walkable, condos $250K-$600K), Midtown (family-friendly, houses $350K-$700K), Westside (luxury, $500K-$1.5M), Eastside (affordable, $180K-$400K), Suburbs (spacious, $280K-$550K). Market trends: median home price $385K, 5% year-over-year appreciation, low inventory favoring sellers. School district info, crime stats, and commute times available per neighborhood.", keywords: ["neighborhood", "area", "location", "market", "price", "school", "downtown", "suburb", "trend"] },
      { id: "kb5", topic: "Financing & Mortgages", content: "We partner with local and national lenders. Common loan types: Conventional (20% down, best rates), FHA (3.5% down, first-time buyers), VA (0% down, veterans), USDA (rural areas). Pre-approval recommended before house hunting — typically takes 1-3 days. We can connect you with our preferred lender for competitive rates. Current average rates available on request.", keywords: ["mortgage", "loan", "financing", "pre-approval", "down payment", "rate", "lender", "fha", "va"] },
      { id: "kb6", topic: "Investment Properties", content: "Investment advisory: rental yield analysis, cash flow projections, cap rate calculations. Multi-family properties, fix-and-flip opportunities, and commercial investments available. Average rental yield in our market: 6-8%. We provide property management for investors who don't want to self-manage. 1031 exchange guidance available through our tax partners.", keywords: ["investment", "investor", "rental income", "cap rate", "flip", "commercial", "multi-family", "roi"] },
    ],
    faqs: [
      { id: "faq1", question: "How do I schedule a property viewing?", answer: "I can help! Just share the property address or listing ID and your preferred date/time. Viewings available 7 days a week including evenings. Virtual tours also available for out-of-town buyers.", category: "viewings" },
      { id: "faq2", question: "What areas do you cover?", answer: "We cover the entire metro area: Downtown, Midtown, Westside, Eastside, and all suburbs. Our agents are local experts who can provide detailed neighborhood insights.", category: "coverage" },
      { id: "faq3", question: "How much is my home worth?", answer: "We offer free, no-obligation property valuations with a Comparative Market Analysis (CMA). Share your address and I'll have an agent prepare a report within 24 hours.", category: "selling" },
      { id: "faq4", question: "What do I need to buy a home?", answer: "Start with mortgage pre-approval (we can connect you with lenders). You'll need: proof of income, bank statements, credit score 620+, and down payment (3.5%-20% depending on loan type). First-time buyer consultations are free.", category: "buying" },
      { id: "faq5", question: "How long does the buying process take?", answer: "From first search to closing: typically 2-4 months. Once an offer is accepted, closing usually takes 30-45 days for inspections, appraisal, and loan processing.", category: "buying" },
      { id: "faq6", question: "What are closing costs?", answer: "Closing costs typically run 2-5% of the purchase price and include loan origination fees, title insurance, appraisal, inspections, and recording fees. We provide a detailed estimate before you make an offer.", category: "buying" },
    ],
    quick_replies: [
      { id: "qr1", trigger: "hi", response: "Hello! Welcome to {business_name}. Are you looking to buy, sell, or rent? I'd love to help!", match_type: "exact" },
    ],
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
    custom_instructions: "Always try to schedule viewings and collect contact information (name, email, phone). Be knowledgeable about market trends and neighborhood features. Never provide specific legal or financial advice — recommend consulting attorneys and mortgage brokers. When buyers mention a budget, suggest properties slightly below to leave room for negotiation. For sellers, emphasize free valuation and competitive commission. Ask qualifying questions: timeline, must-haves, deal-breakers. Follow up on every inquiry with next steps.",
  },

  education: {
    business_name: "BrightPath Academy",
    industry: "education",
    description: "An educational institution offering courses, certifications, and student support services.",
    personality: {
      name: "Sage",
      tone: "friendly",
      emoji_usage: "moderate",
      response_style: "balanced",
    },
    welcome_message: "Hi {customer_name}! 🎓 Welcome to {business_name}.\nHow can I help you today?",
    fallback_message: "Sorry about that! Please email admissions@brightpath.edu or call (555) 222-3344.",
    languages: ["en", "es"],
    default_language: "en",
    knowledge_base: [
      { id: "kb1", topic: "Admissions Process", content: "Applications accepted year-round with priority deadlines. Undergraduate: March 1 (fall), October 1 (spring). Graduate: January 15 (fall), September 1 (spring). Application fee: $50 (fee waiver available for financial need). Requirements: official transcripts, personal statement (500-750 words), 2 recommendation letters, SAT/ACT optional for undergrad. International students: TOEFL 80+ or IELTS 6.5+. Acceptance rate: 68%. Decision notification within 4-6 weeks.", keywords: ["admission", "apply", "application", "enroll", "deadline", "requirements", "acceptance", "international", "transfer"] },
      { id: "kb2", topic: "Programs & Degrees", content: "40+ undergraduate programs, 20 graduate programs, 15 professional certificates. Schools: Business (MBA, Accounting, Marketing), Technology (Computer Science, Data Science, Cybersecurity), Healthcare (Nursing, Public Health), Arts & Humanities (Communications, Design, Psychology), Education (Teaching, Counseling). Dual-degree options. Accelerated 4+1 BS/MS programs. All programs available in-person; 30+ also fully online. Average class size: 22 students.", keywords: ["program", "course", "degree", "major", "certificate", "mba", "computer science", "nursing", "online"] },
      { id: "kb3", topic: "Tuition & Financial Aid", content: "Undergraduate: $12,000/year (in-state), $18,000/year (out-of-state). Graduate: $18,000/year. Online programs: $400/credit. 85% of students receive financial aid. Merit scholarships: $2,000-$15,000/year based on GPA and test scores. Need-based grants up to full tuition. Federal loans, work-study, and payment plans (4 installments/semester, no interest). Veteran benefits: Yellow Ribbon participant. International student scholarships available ($3,000-$8,000).", keywords: ["tuition", "cost", "fee", "scholarship", "financial aid", "payment", "loan", "grant", "veteran", "afford"] },
      { id: "kb4", topic: "Campus & Student Life", content: "50-acre main campus with modern library (open until midnight), 12 computer labs, science labs, performing arts center, fitness center with pool, 6 dining options, student housing (singles, doubles, suites — $4,500-$7,000/semester). 80+ student clubs and organizations. Division II athletics. Mental health counseling center (free for students). Career services: resume workshops, job fairs, internship placements. Campus shuttle runs 7 AM - 11 PM. Parking permit: $200/semester.", keywords: ["campus", "location", "parking", "housing", "dorm", "clubs", "gym", "library", "dining", "student life"] },
      { id: "kb5", topic: "Academic Support", content: "Free tutoring center (drop-in and appointment). Writing center for essays and papers. Math lab. Academic advising assigned to each student. Disability services with accommodations (testing, note-taking, assistive tech). Study abroad: 30+ partner institutions in 20 countries. Internship program: 90% of students complete at least one internship. Career placement rate: 92% within 6 months of graduation.", keywords: ["tutor", "help", "advising", "disability", "study abroad", "internship", "career", "support", "writing"] },
      { id: "kb6", topic: "Registration & Academic Calendar", content: "Fall semester: August 25 - December 15. Spring: January 13 - May 10. Summer sessions available (May-July). Registration opens 8 weeks before semester. Add/drop period: first 2 weeks. Withdrawal deadline: week 10. Full-time: 12-18 credits/semester. Overload (19+ credits) requires advisor approval. Academic calendar at brightpath.edu/calendar.", keywords: ["register", "registration", "calendar", "semester", "schedule", "class", "credit", "add", "drop", "withdraw"] },
    ],
    faqs: [
      { id: "faq1", question: "How do I apply?", answer: "Apply online at brightpath.edu/apply. You'll need official transcripts, a personal statement (500-750 words), and 2 recommendation letters. Application fee is $50 (waiver available). Decision within 4-6 weeks.", category: "admissions" },
      { id: "faq2", question: "Do you offer online courses?", answer: "Yes! 30+ programs are available fully online including popular ones like Business, Computer Science, and Nursing. Same degree, same faculty — flexible scheduling for working professionals.", category: "programs" },
      { id: "faq3", question: "What financial aid is available?", answer: "85% of students receive aid. Options include merit scholarships ($2K-$15K), need-based grants, federal loans, work-study, and interest-free payment plans. Apply via FAFSA (school code: 012345).", category: "financial" },
      { id: "faq4", question: "Can I transfer credits?", answer: "Yes! We accept transfer credits from accredited institutions. Up to 60 credits for undergraduate, 9 for graduate. Free transcript evaluation available before you apply.", category: "admissions" },
      { id: "faq5", question: "What is student housing like?", answer: "We offer singles, doubles, and suites ranging from $4,500-$7,000/semester. All include Wi-Fi, laundry, and a meal plan option. Housing applications open April 1 for fall.", category: "campus" },
      { id: "faq6", question: "Do you have internship programs?", answer: "Yes! 90% of students complete at least one internship. Our career services team connects you with 500+ partner employers. Many programs include required internship credits.", category: "career" },
      { id: "faq7", question: "What's the class size?", answer: "Average class size is 22 students with a 14:1 student-to-faculty ratio. Professors hold regular office hours and are accessible.", category: "academics" },
    ],
    quick_replies: [
      { id: "qr1", trigger: "hi", response: "Hello! 👋 Welcome to {business_name}. Are you a prospective student, current student, or parent? I'd love to help!", match_type: "exact" },
      { id: "qr2", trigger: "thanks", response: "You're welcome! Best of luck with your academic journey. 🎓 Anything else I can help with?", match_type: "contains" },
    ],
    flows: [
      {
        id: "apply",
        name: "Apply Now",
        trigger: "apply",
        steps: [
          { id: "ask_level", type: "question", content: "Are you interested in an undergraduate or graduate program?" },
          { id: "ask_program", type: "question", content: "Which program or field of study interests you?" },
          { id: "info", type: "message", content: "Great! You can start your application at brightpath.edu/apply. Our admissions team will follow up with next steps." },
        ],
      },
      {
        id: "schedule_tour",
        name: "Campus Tour",
        trigger: "tour",
        steps: [
          { id: "ask_date", type: "question", content: "When would you like to visit? Tours are available Mon-Fri at 10 AM and 2 PM." },
          { id: "confirm", type: "message", content: "I'll schedule your tour. You'll receive a confirmation email shortly!" },
        ],
      },
      {
        id: "speak_advisor",
        name: "Speak to Advisor",
        trigger: "advisor",
        steps: [
          { id: "handoff", type: "handoff" },
        ],
      },
    ],
    escalation_rules: [
      { id: "esc1", trigger: "keyword", value: "complaint", priority: "high" },
      { id: "esc2", trigger: "keyword", value: "refund", priority: "high" },
      { id: "esc3", trigger: "request", value: "advisor", priority: "medium" },
      { id: "esc4", trigger: "sentiment", value: "negative", priority: "medium" },
    ],
    custom_instructions: "Be encouraging and supportive — education is a life-changing decision. Help prospective students find the right program by asking about interests, career goals, and preferred format (online/in-person). Never guarantee admission or specific financial aid amounts. For current students, be helpful with registration and academic support resources. Mention campus visit opportunities to prospective students. When discussing costs, always mention that 85% receive aid. Direct parents to the family resources page.",
  },

  travel: {
    business_name: "Voyager Travel",
    industry: "travel",
    description: "A travel agency offering flights, hotels, packages, and 24/7 traveler support.",
    personality: {
      name: "Luna",
      tone: "friendly",
      emoji_usage: "moderate",
      response_style: "balanced",
    },
    welcome_message: "Hey {customer_name}! ✈️ Welcome to {business_name}.\nWhere would you like to go?",
    fallback_message: "Sorry about that! Please call our 24/7 line at (555) 888-7766 for immediate help.",
    languages: ["en", "es", "fr"],
    default_language: "en",
    knowledge_base: [
      { id: "kb1", topic: "Flights", content: "Partners with 200+ airlines worldwide. Best price guarantee — find it cheaper elsewhere and we'll match + 10% off. Free cancellation within 24 hours of booking. Seat selection, meal preferences, and extra baggage available at booking. Economy, Premium Economy, Business, and First class. Multi-city and open-jaw itineraries supported. Flexible date search to find cheapest fares. Frequent flyer miles can be earned on most bookings. Unaccompanied minor service available on select airlines.", keywords: ["flight", "fly", "airline", "ticket", "book", "seat", "baggage", "luggage", "class", "boarding", "layover"] },
      { id: "kb2", topic: "Hotels & Accommodation", content: "500,000+ properties worldwide: hotels, resorts, vacation rentals, hostels, boutique stays. Star ratings 1-5. Free cancellation on most bookings up to 24-48 hours before check-in. Loyalty members: 10% off + room upgrades when available. Special requests: early check-in, late checkout, adjoining rooms, crib, airport transfer. Price match guarantee. Family-friendly and adults-only filters. Pet-friendly options in 80+ countries.", keywords: ["hotel", "stay", "accommodation", "resort", "room", "hostel", "check-in", "checkout", "airbnb", "villa"] },
      { id: "kb3", topic: "Vacation Packages", content: "All-inclusive packages (flight + hotel + activities) with savings up to 30%. Popular destinations: Cancun, Bali, Paris, Maldives, Tokyo, Santorini, Dubai, Cape Town. Honeymoon packages, family vacations, adventure trips, and cultural tours. Customizable itineraries. Group travel discounts for 6+ people (save 15%). Weekend getaway deals updated weekly. Package includes airport transfers on select destinations.", keywords: ["package", "deal", "vacation", "bundle", "all-inclusive", "honeymoon", "tour", "group", "getaway"] },
      { id: "kb4", topic: "Travel Support & Changes", content: "24/7 traveler support hotline: (555) 888-7766. WhatsApp support during your trip. Free rebooking for weather disruptions and airline cancellations. Name corrections: free within 24 hours, $50 after. Date changes: subject to fare difference + $25 service fee. Travel advisories monitored daily with proactive notifications. Lost luggage assistance and claim filing support.", keywords: ["help", "support", "cancel", "change", "rebook", "delay", "problem", "emergency", "lost"] },
      { id: "kb5", topic: "Travel Insurance", content: "Plans from $29/trip (basic) to $89/trip (comprehensive). Basic: trip cancellation (up to $5,000), travel delay ($500). Comprehensive: medical emergencies (up to $100,000), medical evacuation, lost luggage ($2,500), trip interruption, 24/7 emergency assistance. Pre-existing condition waiver available if purchased within 14 days of booking. Annual plans for frequent travelers: $199/year.", keywords: ["insurance", "coverage", "medical", "cancel", "protect", "emergency", "claim"] },
      { id: "kb6", topic: "Visa & Travel Documents", content: "Visa requirement checker for all destinations. We partner with visa processing services for expedited applications. Passport validity: most countries require 6 months beyond travel dates. Electronic travel authorizations (ESTA, eTA, ETA) can be applied for through our platform. Travel document checklist provided with every booking.", keywords: ["visa", "passport", "document", "esta", "entry", "requirements", "travel documents"] },
      { id: "kb7", topic: "Activities & Experiences", content: "10,000+ bookable activities: city tours, museum passes, adventure sports, cooking classes, wine tastings, snorkeling, safari. Skip-the-line tickets for major attractions. Free cancellation up to 24 hours before. Multi-attraction passes for major cities (save 40%). Airport lounge access: $35/visit or $299/year unlimited.", keywords: ["activity", "tour", "experience", "excursion", "attraction", "things to do", "sightseeing"] },
    ],
    faqs: [
      { id: "faq1", question: "Can I cancel my booking?", answer: "Most bookings can be cancelled free within 24 hours. After that, cancellation policies vary by provider. Travel insurance covers unexpected cancellations up to $5,000.", category: "bookings" },
      { id: "faq2", question: "Do you offer travel insurance?", answer: "Yes! Basic plans start at $29/trip (cancellation + delays). Comprehensive plans at $89/trip add medical coverage, lost luggage, and evacuation. Annual plans: $199/year for frequent travelers.", category: "insurance" },
      { id: "faq3", question: "How do I check my itinerary?", answer: "Your full itinerary is in your confirmation email and available in your account dashboard. You can also access it offline through our mobile app.", category: "bookings" },
      { id: "faq4", question: "Can I change my travel dates?", answer: "Yes! Date changes are subject to fare/rate differences plus a $25 service fee. Changes within 24 hours of booking are free. Contact us and we'll find the best options.", category: "changes" },
      { id: "faq5", question: "Do I need a visa?", answer: "Visa requirements depend on your nationality and destination. I can check requirements for you — just tell me your passport country and where you're traveling.", category: "documents" },
      { id: "faq6", question: "What's included in a package deal?", answer: "Packages typically include flights + hotel + airport transfers. Some include activities and meals (all-inclusive). You save up to 30% vs booking separately. All packages are fully customizable.", category: "packages" },
      { id: "faq7", question: "My flight was cancelled, what now?", answer: "Don't worry! Contact us immediately at (555) 888-7766. We'll rebook you on the next available flight at no charge for airline-caused cancellations. If you have travel insurance, additional expenses are covered.", category: "support" },
    ],
    quick_replies: [
      { id: "qr1", trigger: "hi", response: "Hello! ✈️ Welcome to {business_name}. Planning a trip? Tell me where you'd like to go!", match_type: "exact" },
      { id: "qr2", trigger: "thanks", response: "Happy to help! Have an amazing trip! ✨ Anything else you need?", match_type: "contains" },
    ],
    flows: [
      {
        id: "book_trip",
        name: "Book Trip",
        trigger: "book",
        steps: [
          { id: "ask_dest", type: "question", content: "Where would you like to travel?" },
          { id: "ask_dates", type: "question", content: "What are your travel dates?" },
          { id: "ask_travelers", type: "question", content: "How many travelers?" },
          { id: "search", type: "message", content: "Let me find the best options for you! An agent will follow up with personalized recommendations." },
        ],
      },
      {
        id: "check_booking",
        name: "Check Booking",
        trigger: "booking",
        steps: [
          { id: "ask_ref", type: "question", content: "Please share your booking reference number." },
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
      { id: "esc1", trigger: "keyword", value: "emergency", priority: "urgent" },
      { id: "esc2", trigger: "keyword", value: "stranded", priority: "urgent" },
      { id: "esc3", trigger: "keyword", value: "complaint", priority: "high" },
      { id: "esc4", trigger: "request", value: "agent", priority: "medium" },
    ],
    custom_instructions: "Be enthusiastic about destinations — share interesting facts and tips when relevant. Always recommend travel insurance, especially for international trips. For urgent travel disruptions (missed flights, cancellations, stranded travelers), ALWAYS escalate to a human agent immediately. Proactively ask about visa requirements for international destinations. Suggest package deals when customers book flights and hotels separately (they save up to 30%). Mention flexible date searches if customers have flexible schedules. For honeymoons and special occasions, offer premium package options.",
  },

  finance: {
    business_name: "TrustVault Finance",
    industry: "finance",
    description: "A financial services firm providing banking, investments, and financial advisory.",
    personality: {
      name: "Max",
      tone: "professional",
      emoji_usage: "minimal",
      response_style: "detailed",
    },
    welcome_message: "Hello {customer_name}. Welcome to {business_name}.\nHow may I assist you today?",
    fallback_message: "We apologize for the inconvenience. Please call us at (555) 444-5500 or visit your nearest branch.",
    languages: ["en"],
    default_language: "en",
    knowledge_base: [
      { id: "kb1", topic: "Bank Accounts", content: "Checking: no monthly fee with $500 min balance (otherwise $12/month, waivable with direct deposit). Savings: 4.5% APY, no minimum. High-Yield Savings: 5.1% APY, $1,000 minimum. Money Market: 4.8% APY, check-writing, $2,500 minimum. Joint accounts available for all types. Open an account online in 5 minutes with valid ID + SSN. Free ATM access at 40,000+ locations nationwide. Mobile check deposit. Zelle transfers included free.", keywords: ["account", "checking", "savings", "open", "balance", "atm", "deposit", "zelle", "money market"] },
      { id: "kb2", topic: "Loans & Credit", content: "Personal loans: 6.9%-15.9% APR, $1,000-$50,000, terms 12-60 months. Mortgage: from 5.2% (30-yr fixed), 4.8% (15-yr fixed), 5.5% (ARM). Pre-approval in minutes. Home equity line: from 7.2%. Auto loans: from 4.9% new, 5.9% used, terms 24-72 months. No prepayment penalties on any loan. Credit score requirement: 620+ for most products, 580+ for FHA mortgages. Debt consolidation loans available. Refinancing options for existing loans from other institutions.", keywords: ["loan", "mortgage", "borrow", "rate", "credit", "refinance", "auto", "personal", "home equity", "pre-approval", "debt"] },
      { id: "kb3", topic: "Investments & Retirement", content: "Self-directed trading: $0 commission on stocks, ETFs, and options. Mutual funds: 4,000+ no-load options. Managed portfolios: starting at $1,000, 0.25% annual fee, automatic rebalancing. Retirement: Traditional IRA, Roth IRA, SEP IRA, 401(k) rollover. Robo-advisor for hands-off investing. Financial planning sessions: free for accounts over $25,000. Education savings: 529 plans. Crypto trading available for Bitcoin, Ethereum, and 50+ coins.", keywords: ["invest", "stock", "portfolio", "retirement", "trading", "ira", "401k", "etf", "mutual fund", "crypto", "roth"] },
      { id: "kb4", topic: "Security & Fraud", content: "FDIC insured up to $250,000 per depositor. 2FA authentication required for all accounts. Biometric login (fingerprint, face ID) on mobile app. Real-time fraud monitoring 24/7. Instant card lock/unlock via app. $0 liability for unauthorized transactions if reported within 60 days. Report fraud: call (555) 444-5501 or use in-app reporting. Identity theft protection included with Premium accounts. Secure messaging through online banking.", keywords: ["security", "fraud", "protect", "safe", "stolen", "hack", "unauthorized", "identity", "lock", "suspicious"] },
      { id: "kb5", topic: "Cards", content: "Debit card: free with any checking account, contactless payments, Apple/Google Pay compatible, daily limit $5,000. Credit cards: Cashback Card (2% on all purchases, no annual fee), Travel Rewards (3x points on travel/dining, $95/year), Premium (airport lounge access, concierge, $450/year). Balance transfer: 0% APR for 15 months. Credit limit increases available after 6 months of on-time payments.", keywords: ["card", "credit card", "debit", "cashback", "rewards", "points", "limit", "balance transfer"] },
      { id: "kb6", topic: "Digital Banking", content: "Full-featured mobile app (iOS & Android): check balances, transfer funds, pay bills, deposit checks, manage cards, set alerts. Online banking: 24/7 access. Bill pay: schedule one-time or recurring payments, free for all accounts. External transfers: ACH free (1-3 days), wire $25 domestic / $45 international. Budgeting tools and spending insights built into the app. eStatements (paperless billing).", keywords: ["app", "mobile", "online", "transfer", "bill pay", "wire", "digital", "budgeting", "alert"] },
      { id: "kb7", topic: "Business Banking", content: "Business checking: $0 monthly fee with $2,500 min balance. Business savings: 3.8% APY. Merchant services: POS systems, payment processing (2.6% + $0.10/transaction). Business loans: SBA loans, commercial real estate, lines of credit from $10,000. Payroll services integration. Business credit cards with expense tracking. Dedicated business banker for accounts over $100,000.", keywords: ["business", "merchant", "payroll", "commercial", "sba", "business loan", "pos", "corporate"] },
    ],
    faqs: [
      { id: "faq1", question: "How do I open an account?", answer: "Open an account online in 5 minutes at trustvault.com/open. You'll need a valid government ID and Social Security number. Minimum opening deposit: $25 for checking, $100 for savings.", category: "accounts" },
      { id: "faq2", question: "How do I report fraud?", answer: "Call our 24/7 fraud hotline immediately at (555) 444-5501. You can also lock your card instantly through our mobile app. We offer $0 liability for unauthorized transactions reported within 60 days.", category: "security" },
      { id: "faq3", question: "What are your current rates?", answer: "Savings: 4.5% APY. High-Yield Savings: 5.1% APY. Personal loans: from 6.9% APR. Mortgages: from 5.2% (30-yr fixed). Auto: from 4.9%. Rates updated daily at trustvault.com/rates.", category: "rates" },
      { id: "faq4", question: "How do I get pre-approved for a mortgage?", answer: "Apply online — pre-approval takes minutes. You'll need: proof of income (2 years), bank statements (2 months), credit score 620+. Pre-approval is valid for 90 days and doesn't affect your credit score.", category: "loans" },
      { id: "faq5", question: "How do I transfer money?", answer: "Internal transfers: instant and free. Zelle: instant, free, using email or phone. ACH to other banks: free, 1-3 business days. Wire transfers: $25 domestic, $45 international, same-day.", category: "transfers" },
      { id: "faq6", question: "What credit score do I need?", answer: "Most products require 620+. FHA mortgages: 580+. Premium credit cards: 720+. We offer a free credit score check through our app (no impact on your score).", category: "credit" },
      { id: "faq7", question: "Can I set up automatic savings?", answer: "Yes! Set up automatic transfers from checking to savings on any schedule. We also offer 'round-up' savings — every purchase is rounded up to the nearest dollar with the difference saved automatically.", category: "accounts" },
    ],
    quick_replies: [
      { id: "qr1", trigger: "hi", response: "Hello! Welcome to {business_name}. How may I assist you today?", match_type: "exact" },
    ],
    flows: [
      {
        id: "account_inquiry",
        name: "Account Help",
        trigger: "account",
        steps: [
          { id: "verify", type: "question", content: "For security, please verify your identity. What is the last 4 digits of your account number?" },
          { id: "ask_issue", type: "question", content: "How can I help with your account?" },
        ],
      },
      {
        id: "loan_inquiry",
        name: "Loan Info",
        trigger: "loan",
        steps: [
          { id: "ask_type", type: "question", content: "What type of loan are you interested in? (Personal, Mortgage, Auto)" },
          { id: "ask_amount", type: "question", content: "What amount are you looking for?" },
          { id: "result", type: "message", content: "I'll connect you with a loan specialist who can provide a personalized quote." },
        ],
      },
      {
        id: "speak_advisor",
        name: "Financial Advisor",
        trigger: "advisor",
        steps: [
          { id: "handoff", type: "handoff" },
        ],
      },
    ],
    escalation_rules: [
      { id: "esc1", trigger: "keyword", value: "fraud", priority: "urgent" },
      { id: "esc2", trigger: "keyword", value: "stolen", priority: "urgent" },
      { id: "esc3", trigger: "keyword", value: "unauthorized", priority: "urgent" },
      { id: "esc4", trigger: "keyword", value: "complaint", priority: "high" },
      { id: "esc5", trigger: "request", value: "advisor", priority: "medium" },
    ],
    custom_instructions: "NEVER provide specific financial advice, tax advice, or guarantee investment returns. Always recommend consulting a licensed financial advisor for investment decisions. Be extremely security-conscious — verify identity before discussing any account details. Never ask for full account numbers, SSN, or passwords via chat. For fraud reports, treat every case as urgent. When discussing loan options, present multiple choices and encourage comparison. Mention FDIC insurance when discussing deposits. For business inquiries, proactively mention the dedicated business banker service.",
  },

  saas: {
    business_name: "CloudSync",
    industry: "saas",
    description: "A cloud software platform providing project management and team collaboration tools.",
    personality: {
      name: "Kit",
      tone: "friendly",
      emoji_usage: "moderate",
      response_style: "concise",
    },
    welcome_message: "Hey {customer_name}! 💻 Welcome to {business_name} support.\nWhat can I help you with?",
    fallback_message: "Oops, something went wrong! Please email support@cloudsync.io or check status.cloudsync.io.",
    languages: ["en"],
    default_language: "en",
    knowledge_base: [
      { id: "kb1", topic: "Plans & Pricing", content: "Free: up to 5 users, 3 projects, 1 GB storage, community support. Pro ($12/user/month): unlimited projects, 50 GB storage, advanced analytics, priority support, custom fields, automations (50/month), guest access. Business ($24/user/month): everything in Pro + 250 GB storage, unlimited automations, time tracking, portfolio views, advanced permissions, SAML SSO. Enterprise (custom pricing): unlimited storage, audit logs, 99.99% SLA, dedicated CSM, custom integrations, on-premise option, phone support. Annual billing saves 20%.", keywords: ["plan", "pricing", "cost", "upgrade", "subscription", "free", "pro", "enterprise", "business"] },
      { id: "kb2", topic: "Features & Capabilities", content: "Core: project boards (Kanban, list, calendar, timeline/Gantt), task management (subtasks, dependencies, due dates, assignees), team chat and comments, file sharing and proofing, time tracking (Pro+), automations (if-then rules), forms for intake requests. Collaboration: real-time editing, @mentions, activity feed, workload management. Reporting: dashboards, burndown charts, velocity tracking, custom reports. Mobile apps: full-featured iOS and Android. 100+ integrations: Slack, GitHub, Figma, Google Workspace, Microsoft 365, Salesforce, Zapier.", keywords: ["feature", "what can", "capability", "tool", "kanban", "gantt", "automation", "integration", "dashboard", "report", "slack", "github"] },
      { id: "kb3", topic: "Security & Compliance", content: "99.9% uptime SLA (99.99% for Enterprise). Data encrypted at rest (AES-256) and in transit (TLS 1.3). SOC 2 Type II certified. GDPR compliant. HIPAA-eligible (Enterprise). Daily backups with 30-day retention. Point-in-time recovery for Enterprise. 2FA available for all accounts (required for Business+). IP allowlisting (Business+). Data residency options: US, EU, APAC. Penetration tested annually by independent firm. Bug bounty program active.", keywords: ["security", "uptime", "api", "backup", "soc", "encrypt", "gdpr", "hipaa", "compliance", "2fa", "sso"] },
      { id: "kb4", topic: "Billing & Account", content: "Monthly or annual billing (save 20% annually). Payment: credit card (Visa, MC, Amex), PayPal, or invoice (Business/Enterprise). Cancel anytime — access continues until end of billing period. Prorated refunds for annual downgrades within 30 days. Unused seats can be reassigned. Tax-exempt? Email billing@cloudsync.io with certificate. Receipts available in Settings → Billing → Invoices.", keywords: ["billing", "invoice", "payment", "cancel", "refund", "receipt", "tax", "downgrade", "seat"] },
      { id: "kb5", topic: "Getting Started & Onboarding", content: "Quick start: sign up → create workspace → invite team → create first project (takes ~5 minutes). Free onboarding webinar every Tuesday at 11 AM ET. Interactive product tour built into the app. Templates: 50+ pre-built templates for marketing, engineering, product, sales, HR. Import from: Asana, Trello, Jira, Monday.com, Basecamp, CSV/Excel. Dedicated onboarding specialist for Business/Enterprise (first 30 days). Help center: help.cloudsync.io with 500+ articles and video tutorials.", keywords: ["start", "setup", "onboard", "import", "template", "migrate", "getting started", "tutorial", "help"] },
      { id: "kb6", topic: "Troubleshooting Common Issues", content: "Slow loading: clear browser cache, check status.cloudsync.io, try incognito mode. Can't log in: reset password, check for caps lock, ensure 2FA device is available. Notifications not working: check Settings → Notifications, check email spam folder, ensure browser notifications are enabled. Sync issues: refresh the page, check internet connection, log out and back in. Known issues and workarounds posted at status.cloudsync.io/incidents.", keywords: ["slow", "error", "bug", "not working", "problem", "login", "notification", "sync", "crash", "fix"] },
      { id: "kb7", topic: "API & Integrations", content: "REST API: full platform access, docs at docs.cloudsync.io/api. Rate limit: 1,000 req/min (Pro), 5,000 req/min (Business), custom (Enterprise). Webhooks for real-time event notifications. OAuth 2.0 authentication. SDKs: JavaScript, Python, Ruby. Pre-built integrations: 100+ tools. Custom integrations via Zapier (Pro+) or native API. Marketplace for community-built apps and extensions.", keywords: ["api", "integration", "webhook", "zapier", "sdk", "connect", "automate", "developer"] },
    ],
    faqs: [
      { id: "faq1", question: "How do I upgrade my plan?", answer: "Go to Settings → Billing → Change Plan. Your new plan activates immediately and billing is prorated. You can upgrade or downgrade at any time.", category: "billing" },
      { id: "faq2", question: "Can I import data from other tools?", answer: "Yes! We support direct imports from Asana, Trello, Jira, Monday.com, Basecamp, and CSV/Excel files. Go to Settings → Import. Migration typically takes a few minutes.", category: "features" },
      { id: "faq3", question: "Is there an API?", answer: "Yes! Full REST API at docs.cloudsync.io/api. Rate limits: 1,000 req/min (Pro), 5,000 (Business). OAuth 2.0 auth. SDKs available for JavaScript, Python, and Ruby.", category: "technical" },
      { id: "faq4", question: "How do I invite team members?", answer: "Go to Settings → Members → Invite. Enter email addresses or share an invite link. New members can join instantly. You're billed per seat from the next billing cycle.", category: "team" },
      { id: "faq5", question: "Can I try Pro features before upgrading?", answer: "Yes! Start a free 14-day Pro trial — no credit card required. All Pro features unlocked. Your data is preserved if you choose not to upgrade.", category: "billing" },
      { id: "faq6", question: "The app is slow, what should I do?", answer: "Try: 1) Clear browser cache, 2) Check status.cloudsync.io for any incidents, 3) Try incognito/private mode, 4) Disable browser extensions. If the issue persists, contact us with your browser and OS info.", category: "troubleshooting" },
      { id: "faq7", question: "Is my data secure?", answer: "Absolutely. SOC 2 Type II certified, AES-256 encryption at rest, TLS 1.3 in transit, daily backups, 2FA available, GDPR compliant. Enterprise adds HIPAA eligibility and data residency options.", category: "security" },
      { id: "faq8", question: "Can I cancel my subscription?", answer: "Yes, cancel anytime from Settings → Billing → Cancel Plan. Your access continues until the end of your current billing period. Annual plans can get prorated refunds within 30 days.", category: "billing" },
    ],
    quick_replies: [
      { id: "qr1", trigger: "hi", response: "Hey! 👋 Welcome to {business_name} support. How can I help?", match_type: "exact" },
      { id: "qr2", trigger: "thanks", response: "Happy to help! 🙌 Anything else?", match_type: "contains" },
      { id: "qr3", trigger: "status", response: "Check our real-time system status at status.cloudsync.io 📊", match_type: "exact" },
    ],
    flows: [
      {
        id: "troubleshoot",
        name: "Troubleshoot",
        trigger: "issue",
        steps: [
          { id: "ask_issue", type: "question", content: "Can you describe the issue you're experiencing?" },
          { id: "ask_steps", type: "question", content: "What steps have you already tried?" },
          { id: "check", type: "message", content: "Let me look into this. If I can't resolve it, I'll connect you with our support team." },
        ],
      },
      {
        id: "billing_help",
        name: "Billing Help",
        trigger: "billing",
        steps: [
          { id: "ask_billing", type: "question", content: "What billing question do you have? (Upgrade, cancel, invoice, refund)" },
        ],
      },
      {
        id: "speak_support",
        name: "Talk to Support",
        trigger: "support",
        steps: [
          { id: "handoff", type: "handoff" },
        ],
      },
    ],
    escalation_rules: [
      { id: "esc1", trigger: "keyword", value: "bug", priority: "high" },
      { id: "esc2", trigger: "keyword", value: "outage", priority: "urgent" },
      { id: "esc3", trigger: "keyword", value: "data loss", priority: "urgent" },
      { id: "esc4", trigger: "keyword", value: "complaint", priority: "high" },
      { id: "esc5", trigger: "request", value: "support", priority: "medium" },
    ],
    custom_instructions: "Link to relevant help articles (help.cloudsync.io) when possible. For bugs: collect browser name/version, OS, steps to reproduce, and any error messages. For outages: direct users to status.cloudsync.io first. Never share internal infrastructure details, deployment schedules, or unannounced features. When users hit plan limits, explain upgrade benefits without being pushy. For churning users (cancel intent), offer to connect with a success manager and mention the 14-day trial for higher tiers. Suggest templates when users seem unsure how to start. For API questions, always link to docs.cloudsync.io/api."
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
