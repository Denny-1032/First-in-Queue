import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DEMO_DECKS, findDeck, isExpired, type DemoDeck } from "@/lib/demo/decks";

// Proposal demo page. One template, one entry per prospect in decks.ts.
//
// Reached only through the secret in the slug, excluded from robots.ts, and
// carrying a disclaimer that cannot be scrolled past. See the module comment in
// decks.ts for why that matters for these two institutions in particular.

export const dynamicParams = false;

export function generateStaticParams() {
  return DEMO_DECKS.map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const deck = findDeck(slug);
  if (!deck) return { title: "Not found", robots: { index: false, follow: false } };

  return {
    // Names US, not them: a tab or a shared link must never read as official.
    title: `First in Queue - demonstration prepared for ${deck.shortName}`,
    description: `An unofficial demonstration of the First in Queue assistant, prepared by First in Queue for ${deck.institution}.`,
    robots: { index: false, follow: false, nocache: true },
  };
}

export default async function DemoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const deck = findDeck(slug);
  // An expired deck 404s rather than lingering as apparent guidance.
  if (!deck || isExpired(deck)) notFound();

  return (
    <div className="min-h-screen bg-gray-50">
      <DisclaimerBar deck={deck} />
      <InstitutionHeader deck={deck} />

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
        <div className="grid gap-10 lg:grid-cols-[1fr_440px] lg:gap-12">
          <div>
            <p
              className="text-xs font-semibold uppercase tracking-[0.14em]"
              style={{ color: deck.primary }}
            >
              Proposed customer assistant
            </p>
            <h1 className="mt-3 text-3xl font-bold leading-tight text-gray-900 sm:text-4xl">
              The questions {deck.shortName} answers every day, answered the moment they are asked.
            </h1>
            <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-gray-600">{deck.painline}</p>
            <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-gray-600">{deck.blurb}</p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {deck.stats.map((s) => (
                <div key={s.label} className="rounded-xl border border-gray-200 bg-white p-4">
                  <p className="text-2xl font-bold" style={{ color: deck.primary }}>
                    {s.value}
                  </p>
                  <p className="mt-1 text-sm font-medium text-gray-900">{s.label}</p>
                  <p className="mt-1.5 text-[13px] leading-snug text-gray-500">{s.detail}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 rounded-xl border border-gray-200 bg-white p-5">
              <h2 className="text-sm font-semibold text-gray-900">How to test it</h2>
              <p className="mt-2 text-[14px] leading-relaxed text-gray-600">
                Ask it anything {deck.shortName} publishes. It answers only from {deck.shortName}&apos;s
                own published material, captured on {deck.contentCapturedOn} - where it does not know,
                it says so and points to the official channel rather than guessing. That behaviour is
                deliberate: an assistant for a public body that invents a figure is worse than no
                assistant at all.
              </p>
            </div>
          </div>

          <div className="lg:sticky lg:top-8 lg:self-start">
            <ChatPanel deck={deck} />
          </div>
        </div>
      </main>

      <footer className="border-t border-gray-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-8 text-[13px] leading-relaxed text-gray-500 sm:px-6">
          <p>
            Demonstration prepared by First in Queue for {deck.institution}, using information
            published on{" "}
            <a
              href={deck.officialUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="underline"
            >
              {deck.officialUrl.replace(/^https?:\/\//, "")}
            </a>{" "}
            as at {deck.contentCapturedOn}. Not an official channel of {deck.institution}, and not
            affiliated with or endorsed by it. For anything binding, use the official channels.
          </p>
          <p className="mt-3">
            <a href="https://firstinqueue.com" className="font-medium text-gray-700 underline">
              firstinqueue.com
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}

/**
 * The one element on the page that must survive every screenshot: this is not
 * their site and we are not them.
 */
function DisclaimerBar({ deck }: { deck: DemoDeck }) {
  return (
    <div className="bg-amber-100 text-amber-950">
      <div className="mx-auto flex max-w-6xl items-start gap-3 px-4 py-2.5 text-[13px] leading-snug sm:px-6">
        <span aria-hidden="true" className="mt-px shrink-0 font-semibold">
          ⚠
        </span>
        <p>
          <strong className="font-semibold">Unofficial demonstration.</strong> Built by First in Queue
          to show how our assistant would work for {deck.institution}. It is not an official{" "}
          {deck.shortName} service and not affiliated with {deck.shortName}. For official information
          go to{" "}
          <a
            href={deck.officialUrl}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="font-medium underline"
          >
            {deck.officialUrl.replace(/^https?:\/\//, "")}
          </a>
          .
        </p>
      </div>
    </div>
  );
}

function InstitutionHeader({ deck }: { deck: DemoDeck }) {
  return (
    <header style={{ backgroundColor: deck.primary, color: deck.onPrimary }}>
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <span
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/15 text-sm font-bold"
            aria-hidden="true"
          >
            {deck.shortName.slice(0, 2)}
          </span>
          <div>
            <p className="text-[15px] font-semibold leading-tight">{deck.shortName}</p>
            <p className="text-[12px] opacity-80">Customer assistant - concept demonstration</p>
          </div>
        </div>
        <a
          href={deck.officialUrl}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="rounded-lg bg-white/15 px-3 py-1.5 text-[13px] font-medium hover:bg-white/25"
        >
          Official {deck.shortName} website →
        </a>
      </div>
    </header>
  );
}

function ChatPanel({ deck }: { deck: DemoDeck }) {
  if (!deck.widgetKey) {
    return (
      <div className="flex h-[560px] items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white px-8 text-center">
        <p className="text-sm text-gray-400">
          This demonstration is not configured yet. Set the widget key for {deck.shortName} and
          redeploy.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl shadow-gray-300/40">
        <iframe
          src={`/widget/chat?key=${encodeURIComponent(deck.widgetKey)}&embed=inline`}
          title={`Assistant demonstration for ${deck.shortName}`}
          className="block h-[560px] w-full border-0"
        />
      </div>
      <p className="mt-3 text-center text-[12px] text-gray-500">
        The assistant above is the live product, not a recording.
      </p>
    </div>
  );
}
