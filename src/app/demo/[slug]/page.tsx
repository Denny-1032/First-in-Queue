import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DEMO_DECKS, findDeck, isExpired, type DemoDeck } from "@/lib/demo/decks";
import { InstitutionShell } from "./shells";

// Proposal demo page: a mock-up of the prospect's own landing page with the
// real widget on it. One template, one entry per prospect in decks.ts.
//
// Served at their subdomain (zra.firstinqueue.com) and at the slug path. The
// disclaimer bar is pinned to the viewport, the page is noindexed and expires,
// and nothing on it accepts input. See the module comment in decks.ts for why
// all four of those are load-bearing for these two institutions in particular.

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
    <>
      <DisclaimerBar deck={deck} />

      <InstitutionShell deck={deck}>
        <p>
          Mock-up prepared by First in Queue for {deck.institution}, using information published on{" "}
          <a
            href={deck.officialUrl}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="underline"
          >
            {deck.officialUrl.replace(/^https?:\/\//, "")}
          </a>{" "}
          as at {deck.contentCapturedOn}. This page is a demonstration of a proposed assistant. It is
          not an official channel of {deck.institution}, is not affiliated with or endorsed by it, and
          the navigation above is decorative. For anything binding, use the official channels.
        </p>
        <p className="mt-3">
          <a href="https://firstinqueue.com" className="font-medium underline">
            firstinqueue.com
          </a>
        </p>
      </InstitutionShell>

      <PitchSection deck={deck} />
      <ChatPanel deck={deck} />
    </>
  );
}

/**
 * The proposal itself, kept visibly separate from the mock-up above it: white
 * band, our name on it, no institutional colour. The committee should never
 * have to work out which parts of this page are theirs and which are ours.
 */
function PitchSection({ deck }: { deck: DemoDeck }) {
  return (
    <section className="border-t-4 border-gray-900 bg-gray-50">
      <div className="mx-auto max-w-6xl px-6 py-14">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
          First in Queue - proposed customer assistant
        </p>
        <h2 className="mt-3 max-w-3xl text-3xl font-bold leading-tight text-gray-900">
          The questions {deck.shortName} answers every day, answered the moment they are asked.
        </h2>
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-gray-600">{deck.painline}</p>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-gray-600">{deck.blurb}</p>

        <div className="mt-9 grid gap-4 sm:grid-cols-3">
          {deck.stats.map((s) => (
            <div key={s.label} className="rounded-xl border border-gray-200 bg-white p-5">
              <p className="text-2xl font-bold" style={{ color: deck.primary }}>
                {s.value}
              </p>
              <p className="mt-1 text-sm font-medium text-gray-900">{s.label}</p>
              <p className="mt-1.5 text-[13px] leading-snug text-gray-500">{s.detail}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 max-w-3xl rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-gray-900">How to test it</h3>
          <p className="mt-2 text-[14px] leading-relaxed text-gray-600">
            Open the assistant in the corner and ask it anything {deck.shortName} publishes. It answers
            only from {deck.shortName}&apos;s own published material, captured on{" "}
            {deck.contentCapturedOn} - where it does not know, it says so and points to the official
            channel rather than guessing. That behaviour is deliberate: an assistant for a public body
            that invents a figure is worse than no assistant at all.
          </p>
        </div>
      </div>
    </section>
  );
}

/**
 * The one element on the page that must survive every screenshot: this is not
 * their site and we are not them.
 *
 * Sticky, not static. Now that the page below it is a close mock-up of the real
 * landing page, a banner that scrolls away would leave a convincing replica of a
 * tax authority on screen with nothing marking it as ours. It stays in the
 * viewport for exactly that reason - do not make it dismissible.
 */
function DisclaimerBar({ deck }: { deck: DemoDeck }) {
  return (
    <div className="sticky top-0 z-50 border-b border-amber-300 bg-amber-100 text-amber-950 shadow-sm">
      <div className="mx-auto flex max-w-6xl items-start gap-3 px-4 py-2.5 text-[13px] leading-snug sm:px-6">
        <span aria-hidden="true" className="mt-px shrink-0 font-semibold">
          ⚠
        </span>
        <p>
          <strong className="font-semibold">Unofficial demonstration.</strong> This page is a mock-up
          built by First in Queue to show how our assistant would work for {deck.institution}. It is
          not an official {deck.shortName} service, not affiliated with {deck.shortName}, and the page
          below is a visual imitation - none of its links work. For official information go to{" "}
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

/**
 * The widget where it would actually sit: pinned to the bottom-right corner,
 * over the mock-up. This is the live product in an iframe, not a recording -
 * the one thing on the page that does anything.
 */
function ChatPanel({ deck }: { deck: DemoDeck }) {
  if (!deck.widgetKey) {
    return (
      <div className="fixed bottom-6 right-6 z-40 flex h-[420px] w-[360px] items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white px-8 text-center shadow-2xl">
        <p className="text-sm text-gray-400">
          This demonstration is not configured yet. Set the widget key for {deck.shortName} and
          redeploy.
        </p>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-40 w-[380px] max-w-[calc(100vw-2rem)]">
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl shadow-black/25">
        <iframe
          src={`/widget/chat?key=${encodeURIComponent(deck.widgetKey)}&embed=inline`}
          title={`Assistant demonstration for ${deck.shortName}`}
          className="block h-[540px] max-h-[70vh] w-full border-0"
        />
      </div>
      <p className="mt-2 text-center text-[11px] text-gray-500">
        Live assistant - not a recording.
      </p>
    </div>
  );
}
