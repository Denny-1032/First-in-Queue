import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { DEMO_DECKS, findDeck, isExpired, type DemoDeck } from "@/lib/demo/decks";
import { DemoWidget, TimeGreeting } from "./client";

// Staging page for a proposal: a First in Queue help centre carrying the
// prospect's name, with their assistant live on it.
//
// This deliberately does NOT imitate the prospect's own site. An earlier
// version reproduced the institutions' landing pages, and for a tax authority
// and a companies registry - two of the most spoofed identities there are - a
// convincing replica on a URL we control is a phishing kit waiting for a leak.
// The page is First in Queue's, visibly, and the assistant is the thing being
// demonstrated. Do not reintroduce their chrome.
//
// Adding a prospect is one entry in decks.ts plus one env var. No new route.
//
// This is a dynamic segment at the ROOT, so firstinqueue.com/pacra is the whole
// address - nothing to set up per prospect. Static routes (/pricing, /login)
// still win over it, and `dynamicParams = false` means any path that is not a
// deck 404s exactly as it did before, rather than rendering an empty demo.

export const dynamicParams = false;

export function generateStaticParams() {
  return DEMO_DECKS.map((d) => ({ deck: d.path }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ deck: string }>;
}): Promise<Metadata> {
  const { deck: path } = await params;
  const deck = findDeck(path);
  if (!deck) return { title: "Not found", robots: { index: false, follow: false } };

  return {
    title: `First in Queue - assistant demonstration for ${deck.shortName}`,
    description: `A demonstration of the First in Queue assistant, prepared by First in Queue for ${deck.institution}.`,
    robots: { index: false, follow: false, nocache: true },
  };
}

export default async function DemoPage({ params }: { params: Promise<{ deck: string }> }) {
  const { deck: path } = await params;
  const deck = findDeck(path);
  // An expired deck 404s rather than lingering as apparent guidance.
  if (!deck || isExpired(deck)) notFound();

  return (
    <div className="min-h-screen bg-white">
      <Hero deck={deck} />
      <Categories deck={deck} />
      <Pitch deck={deck} />
      <Footer deck={deck} />
      {deck.widgetKey && <DemoWidget widgetKey={deck.widgetKey} title={`${deck.shortName} Assistant`} />}
    </div>
  );
}

function Hero({ deck }: { deck: DemoDeck }) {
  return (
    <div className="relative overflow-hidden bg-emerald-500">
      {/* Soft blooms behind the content, the way a help centre header reads. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-emerald-400/60" />
        <div className="absolute -right-32 top-10 h-[420px] w-[420px] rounded-full bg-emerald-400/50" />
        <div className="absolute bottom-[-220px] left-1/3 h-[420px] w-[420px] rounded-full bg-emerald-600/30" />
      </div>

      <header className="relative z-10 mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-6">
        <div className="flex items-center gap-3">
          <Image
            src="/fiq-mark.png"
            alt=""
            width={36}
            height={36}
            priority
            className="h-9 w-9 rounded-lg"
          />
          <span className="text-lg font-semibold text-white">
            Help Centre <span className="text-white/70">| {deck.shortName}</span>
          </span>
        </div>
        <nav className="flex flex-wrap items-center gap-6 text-sm font-medium text-white/90">
          <span className="cursor-default">Demonstration</span>
          <a
            href={deck.officialUrl}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="underline-offset-4 hover:underline"
          >
            {deck.shortName} official site
          </a>
          <a
            href="https://firstinqueue.com"
            className="rounded-lg bg-white/15 px-3 py-1.5 hover:bg-white/25"
          >
            First in Queue
          </a>
        </nav>
      </header>

      <div className="relative z-10 mx-auto max-w-3xl px-6 pb-24 pt-10 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
          <TimeGreeting />
        </h1>
        <p className="mt-4 text-lg text-white/85">{deck.painline}</p>

        {/* Decorative: the assistant in the corner is the working thing here. */}
        <div
          aria-hidden="true"
          className="mt-10 flex items-center gap-3 rounded-lg bg-white px-6 py-4 text-[15px] text-gray-400 shadow-xl"
        >
          <span className="flex-1 text-left">Ask the assistant in the corner →</span>
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" strokeLinecap="round" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function Categories({ deck }: { deck: DemoDeck }) {
  return (
    <section className="mx-auto -mt-14 max-w-6xl px-6 pb-4">
      <div className="grid gap-6 md:grid-cols-3">
        {deck.stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <path d="M12 3 4 7v6c0 4.5 3.2 7.6 8 8.5 4.8-.9 8-4 8-8.5V7Z" strokeLinejoin="round" />
              </svg>
            </div>
            <p className="mt-4 text-xl font-bold text-gray-900">{s.value}</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">{s.label}</p>
            <p className="mt-2 text-[13px] leading-snug text-gray-500">{s.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Pitch({ deck }: { deck: DemoDeck }) {
  return (
    <section className="mx-auto max-w-6xl px-6 py-14">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-600">
        Proposed customer assistant
      </p>
      <h2 className="mt-3 max-w-3xl text-3xl font-bold leading-tight text-gray-900">
        The questions {deck.shortName} answers every day, answered the moment they are asked.
      </h2>
      <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-gray-600">{deck.blurb}</p>

      <div className="mt-8 max-w-3xl rounded-xl border border-gray-200 bg-gray-50 p-5">
        <h3 className="text-sm font-semibold text-gray-900">How to test it</h3>
        <p className="mt-2 text-[14px] leading-relaxed text-gray-600">
          Open the assistant in the corner and ask it anything {deck.shortName} publishes. It answers
          only from {deck.shortName}&apos;s own published material, captured on{" "}
          {deck.contentCapturedOn} - where it does not know, it says so and points to the official
          channel rather than guessing. That behaviour is deliberate: an assistant for a public body
          that invents a figure is worse than no assistant at all.
        </p>
      </div>
    </section>
  );
}

function Footer({ deck }: { deck: DemoDeck }) {
  return (
    <footer className="border-t border-gray-200 bg-gray-50">
      <div className="mx-auto max-w-6xl px-6 py-10 text-[13px] leading-relaxed text-gray-500">
        <p>
          Demonstration built by First in Queue for {deck.institution}, using information published on{" "}
          <a
            href={deck.officialUrl}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="underline"
          >
            {deck.officialUrl.replace(/^https?:\/\//, "")}
          </a>{" "}
          as at {deck.contentCapturedOn}. This is a First in Queue page, not an official channel of{" "}
          {deck.institution}, and is not affiliated with or endorsed by it. For anything binding, use
          the official channels.
        </p>
        <p className="mt-3">
          <a href="https://firstinqueue.com" className="font-medium text-gray-700 underline">
            firstinqueue.com
          </a>
        </p>
      </div>
    </footer>
  );
}
