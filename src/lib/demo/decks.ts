// =============================================
// Proposal demos
// ---------------------------------------------
// A prospect gets a mock-up of their own landing page with the real widget
// sitting on it, so an evaluation committee can see the assistant where it
// would actually live instead of reading about it.
//
// The institutions here are a tax authority and a companies registry - exactly
// the bodies whose identities get spoofed for fraud, so the resemblance is the
// risk. It is deliberate (a committee needs to picture it on their own site),
// and it is fenced:
//
//   * a disclaimer bar pinned to the top of the viewport, naming First in Queue
//     as the author and disclaiming affiliation - it cannot be scrolled away,
//     so it is in every screenshot anyone takes,
//   * noindex on the page and a Disallow in robots.txt on the demo subdomains,
//   * an expiry, after which the page 404s rather than ageing into apparent
//     guidance,
//   * every nav item and button is inert. There is no login field, no payment
//     field, no form that accepts personal data, and none may ever be added.
//     That absence is what keeps this a mock-up rather than a working phish.
//
// Anyone tempted to remove the banner, ship a form, or point these at a domain
// that is not visibly ours should read those four points again first.
// =============================================

export interface DemoStat {
  label: string;
  value: string;
  detail: string;
}

/**
 * The visual shell of the institution's own landing page, reproduced closely
 * enough to be recognisable. Every item here is decoration - nothing in this
 * type describes a control that does anything when clicked.
 */
export interface DemoSite {
  /** Which shell component renders it. The two sites look nothing alike. */
  layout: "pacra" | "zra";
  /**
   * Their logo, served from public/. Case-sensitive on deploy even though the
   * local filesystem forgives it - the file name here must match byte for byte.
   * A missing file renders as a broken image, so the alt text stands alone.
   */
  logoSrc: string;
  logoAlt: string;
  /**
   * Set when the logo file has no transparency. It then sits on a white plate
   * instead of directly on the coloured bar, where an opaque white rectangle
   * would otherwise read as a rendering fault. Swap in a PNG with an alpha
   * channel and this can go.
   */
  logoOnPlate?: boolean;
  /** Utility links along the top. */
  topNav: string[];
  /** The main navigation band, where the site has a second one. */
  mainNav?: string[];
  heroTitle: string;
  heroSubtitle: string;
  searchPlaceholder?: string;
  /** The big shortcut tiles under the hero. */
  quickLinks: string[];
  /** Heading of the section below the fold. */
  feedTitle: string;
  feedSubtitle?: string;
  /** Placeholder headlines for that section - deliberately generic. */
  feedItems: string[];
  /** Secondary band colour (ZRA's gold bar, PACRA's footer). */
  secondary: string;
}

export interface DemoDeck {
  /** URL segment, including its unguessable suffix. */
  slug: string;
  /**
   * Host label this deck answers on: `zra` serves at zra.firstinqueue.com.
   * Guessable by design - the disclaimer, noindex and expiry are what protect
   * the page now, not the secret in the slug.
   */
  subdomain: string;
  /** Full legal name, used in the disclaimer. */
  institution: string;
  /** Short name for headings. */
  shortName: string;
  /** Their own site, linked so nobody mistakes this page for it. */
  officialUrl: string;
  /** Their palette. Header background and accents. */
  primary: string;
  /** Readable on `primary`. */
  onPrimary: string;
  /** Public widget key, from the environment - one property per deck. */
  widgetKey: string | undefined;
  /** What this office actually deals with, in their own words. */
  blurb: string;
  /** The queue this is meant to shorten. Their pain, not our features. */
  painline: string;
  /** Counters beside the chat. Deflection is the argument for a public body. */
  stats: DemoStat[];
  /** When the published information behind the knowledge base was captured. */
  contentCapturedOn: string;
  /** After this the page stops serving; a demo must not age into advice. */
  expiresOn: string;
  /** The landing page being mocked up. */
  site: DemoSite;
}

/**
 * Keyed by slug. Add a prospect by adding an entry and an env var - no new
 * page, no new route.
 */
export const DEMO_DECKS: DemoDeck[] = [
  {
    slug: "zra-preview-8f3ac91d",
    subdomain: "zra",
    institution: "the Zambia Revenue Authority",
    shortName: "ZRA",
    officialUrl: "https://www.zra.org.zm",
    primary: "#0b6b3a",
    onPrimary: "#ffffff",
    widgetKey: process.env.NEXT_PUBLIC_DEMO_ZRA_KEY,
    blurb:
      "Taxpayer registration, returns and payments, TPIN queries, customs and excise - the questions that fill the contact centre and the banking hall.",
    painline:
      "Most walk-ins and calls are the same handful of questions, asked again at the counter because there was nowhere else to ask them.",
    stats: [
      {
        label: "Answered without a queue ticket",
        value: "24/7",
        detail: "Filing deadlines, TPIN and registration questions, answered the moment they are asked.",
      },
      {
        label: "Languages",
        value: "40+",
        detail: "Bemba, Nyanja, Tonga, Lozi and English, from the same knowledge base.",
      },
      {
        label: "Handover to an officer",
        value: "One tap",
        detail: "Anything the assistant should not answer goes to a named officer with the full transcript.",
      },
    ],
    contentCapturedOn: "12 August 2026",
    expiresOn: "2026-11-30",
    site: {
      layout: "zra",
      logoSrc: "/ZRA-logo.png",
      logoAlt: "Zambia Revenue Authority",
      logoOnPlate: true,
      topNav: ["About Us", "Tax Payer Charter", "Tenders", "Careers", "Tutorials", "Contact Us"],
      mainNav: [
        "HOME",
        "REGISTRATIONS",
        "BUSINESS",
        "CUSTOMS",
        "PUBLICATIONS",
        "STATISTICS",
        "TAX PORTAL",
        "TAX TOOLS",
        "SMART INVOICE",
        "TAXPAYER RELATIONS",
      ],
      heroTitle: "Get started with",
      heroSubtitle: "File your returns and pay taxes on time",
      quickLinks: ["Select Service"],
      feedTitle: "Latest News",
      feedSubtitle: "Latest events and announcements from the ZRA",
      feedItems: [
        "Filing deadline reminder for the current tax period",
        "Smart Invoice onboarding continues countrywide",
        "Customs service points extend operating hours",
        "Taxpayer education clinics announced for the provinces",
      ],
      secondary: "#b08d3f",
    },
  },
  {
    slug: "pacra-preview-2d7be540",
    subdomain: "pacra",
    institution: "the Patents and Companies Registration Agency",
    shortName: "PACRA",
    officialUrl: "https://www.pacra.org.zm",
    primary: "#b4791f",
    onPrimary: "#ffffff",
    widgetKey: process.env.NEXT_PUBLIC_DEMO_PACRA_KEY,
    blurb:
      "Business name and company registration, annual returns, name searches, intellectual property - the counter questions that arrive before anyone has filed anything.",
    painline:
      "First-time registrants ask the same sequence of questions, and every one of them currently costs a phone call or a trip to Lusaka.",
    stats: [
      {
        label: "Answered without a phone call",
        value: "24/7",
        detail: "Registration steps, required documents and turnaround times, answered on the spot.",
      },
      {
        label: "Reaches every province",
        value: "No travel",
        detail: "The same answers in Kitwe, Chipata or Mongu as at the Lusaka counter.",
      },
      {
        label: "Handover to an officer",
        value: "One tap",
        detail: "Anything needing a human goes to a named officer with the full transcript.",
      },
    ],
    contentCapturedOn: "12 August 2026",
    expiresOn: "2026-11-30",
    site: {
      layout: "pacra",
      logoSrc: "/pacra-logo.png",
      logoAlt: "Patents and Companies Registration Agency",
      topNav: ["Menu", "Services"],
      heroTitle: "How can we help you?",
      heroSubtitle: "Search for companies, trademarks, or learn about our services",
      searchPlaceholder: "Search for companies, trademarks, or services...",
      quickLinks: ["Business Registration", "Register IP", "Business Search", "Movable Property"],
      feedTitle: "Latest Updates",
      feedItems: [
        "Annual return filing window now open",
        "Name clearance turnaround times updated",
        "Movable property registry maintenance notice",
      ],
      secondary: "#7d5314",
    },
  },
];

/** Host label to slug, for the subdomain rewrite in middleware. */
export const DEMO_SUBDOMAINS: Record<string, string> = Object.fromEntries(
  DEMO_DECKS.map((d) => [d.subdomain, d.slug])
);

export function findDeck(slug: string): DemoDeck | undefined {
  return DEMO_DECKS.find((d) => d.slug === slug);
}

/** Past its expiry a deck stops serving; see the module comment. */
export function isExpired(deck: DemoDeck, now = new Date()): boolean {
  return now > new Date(`${deck.expiresOn}T23:59:59Z`);
}
