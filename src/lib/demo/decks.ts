// =============================================
// Proposal demos
// ---------------------------------------------
// A prospect gets a First in Queue help centre carrying their name, with their
// assistant live on it, so an evaluation committee can interrogate the product
// instead of reading about it.
//
// It is OUR page, visibly. A previous version reproduced each institution's own
// landing page; for a tax authority and a companies registry - two of the most
// spoofed identities there are - a convincing replica hosted on a URL we control
// is a phishing kit waiting for the link to leak. Do not reintroduce their
// chrome, their logos, or their layout.
//
// What stays regardless: noindex on the page, a Disallow per deck path in
// robots.txt, an expiry after which the page 404s rather than ageing into
// apparent guidance, and no field anywhere that accepts input. The assistant in
// the corner is the only working control.
//
// Add a prospect with one entry below plus one env var - no new route.
// =============================================

export interface DemoStat {
  label: string;
  value: string;
  detail: string;
}

export interface DemoDeck {
  /**
   * Top-level path this deck answers on: `pacra` serves at
   * firstinqueue.com/pacra. A path rather than a subdomain because a path costs
   * nothing to add - no DNS record, no domain to register in Vercel, no
   * certificate to wait on. Sending a prospect a link should not be an
   * infrastructure task.
   */
  path: string;
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
}

/**
 * Keyed by path. Add a prospect by adding an entry and an env var - no new
 * page, no new route.
 */
export const DEMO_DECKS: DemoDeck[] = [
  {
    path: "zra",
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
        // Local-language support is held back until it's ready for daily use -
        // see the note where this deck's copy is edited. Until then this slot
        // carries reach instead.
        label: "Reaches every province",
        value: "No travel",
        detail: "The same answers in Ndola, Kitwe or Livingstone as at the Lusaka banking hall.",
      },
      {
        label: "Handover to an officer",
        value: "One tap",
        detail: "Anything the assistant should not answer goes to a named officer with the full transcript.",
      },
    ],
    contentCapturedOn: "12 August 2026",
    expiresOn: "2026-11-30",
  },
  {
    path: "pacra",
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
  },
];

/** Every path a deck answers on, for robots.txt and the widget loader. */
export const DEMO_PATHS: string[] = DEMO_DECKS.map((d) => `/${d.path}`);

export function findDeck(path: string): DemoDeck | undefined {
  return DEMO_DECKS.find((d) => d.path === path);
}

/** Past its expiry a deck stops serving; see the module comment. */
export function isExpired(deck: DemoDeck, now = new Date()): boolean {
  return now > new Date(`${deck.expiresOn}T23:59:59Z`);
}
