import type { DemoDeck } from "@/lib/demo/decks";

// Mock-ups of the two institutions' landing pages. Layout, palette and section
// structure only - see the module comment in decks.ts for the fence around
// building these at all.
//
// EVERY CONTROL HERE IS INERT BY DESIGN. Nav items are <span>, not <a>. The
// search boxes are `readOnly` divs, not inputs. Nothing submits, nothing
// collects, nothing stores. If you are adding an interactive element to one of
// these pages, stop: a page that looks like a tax authority and also accepts
// input is a phishing kit, whatever it was meant to be.
//
// The hero photography on the real sites is replaced with a flat wash. Their
// images are theirs, and a demo does not need them to make the point.

function NavItem({ label }: { label: string }) {
  return <span className="cursor-default whitespace-nowrap">{label}</span>;
}

/** A search field that cannot be typed into. */
function DeadSearch({ placeholder, className }: { placeholder: string; className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`flex items-center gap-3 rounded-full bg-white px-5 py-3.5 text-[15px] text-gray-400 shadow-lg ${className ?? ""}`}
    >
      <span className="flex-1 truncate">{placeholder}</span>
      <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" strokeLinecap="round" />
      </svg>
    </div>
  );
}

export function InstitutionShell({ deck, children }: { deck: DemoDeck; children: React.ReactNode }) {
  return deck.site.layout === "zra" ? (
    <ZraShell deck={deck}>{children}</ZraShell>
  ) : (
    <PacraShell deck={deck}>{children}</PacraShell>
  );
}

// ---------------------------------------------------------------- PACRA ----
// Dark photographic hero, centred question, one wide search bar, four tiles.

function PacraShell({ deck, children }: { deck: DemoDeck; children: React.ReactNode }) {
  const { site } = deck;

  return (
    <div className="min-h-screen bg-white">
      <div
        className="relative"
        style={{
          background: `linear-gradient(160deg, #2b2118 0%, #4a3a24 45%, #1f1a13 100%)`,
        }}
      >
        <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={site.logoSrc} alt={site.logoAlt} className="h-12 w-auto" />
          <nav className="flex items-center gap-7 text-[15px] font-medium text-white">
            {site.topNav.map((item) => (
              <span key={item} className="flex cursor-default items-center gap-1">
                {item}
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="m6 9 6 6 6-6" strokeLinecap="round" />
                </svg>
              </span>
            ))}
            <span
              aria-hidden="true"
              className="flex h-9 w-9 items-center justify-center rounded-full"
              style={{ backgroundColor: deck.primary }}
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="4.5" />
                <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19" strokeLinecap="round" />
              </svg>
            </span>
          </nav>
        </header>

        <div className="relative z-10 mx-auto max-w-3xl px-6 pb-24 pt-16 text-center">
          <h1 className="text-5xl font-bold tracking-tight text-white sm:text-6xl">{site.heroTitle}</h1>
          <p className="mt-5 text-lg text-white/85">{site.heroSubtitle}</p>
          <DeadSearch placeholder={site.searchPlaceholder ?? "Search"} className="mt-10" />

          <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {site.quickLinks.map((label) => (
              <div
                key={label}
                className="flex flex-col items-center gap-3 rounded-lg bg-white/15 px-4 py-6 text-center text-[15px] font-semibold text-white backdrop-blur-sm"
              >
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                  <rect x="4" y="3" width="16" height="18" rx="2" />
                  <path d="M8 8h8M8 12h8M8 16h5" strokeLinecap="round" />
                </svg>
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>

      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="flex items-end justify-between">
          <h2 className="text-3xl font-bold text-gray-900">{site.feedTitle}</h2>
          <span className="cursor-default text-sm font-medium" style={{ color: deck.primary }}>
            View All →
          </span>
        </div>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {site.feedItems.map((headline) => (
            <article key={headline} className="overflow-hidden rounded-xl border border-gray-200">
              <div className="h-36 bg-gray-100" aria-hidden="true" />
              <div className="p-5">
                <p className="text-[15px] font-semibold leading-snug text-gray-900">{headline}</p>
                <p className="mt-2 text-[13px] text-gray-500">Placeholder item - demonstration only.</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <footer style={{ backgroundColor: site.secondary }} className="text-white/80">
        <div className="mx-auto max-w-7xl px-6 py-10 text-sm">{children}</div>
      </footer>
    </div>
  );
}

// ------------------------------------------------------------------ ZRA ----
// Blue utility bar, gold main navigation, service picker card, news grid.

function ZraShell({ deck, children }: { deck: DemoDeck; children: React.ReactNode }) {
  const { site } = deck;

  return (
    <div className="min-h-screen bg-white">
      <div style={{ backgroundColor: deck.primary }}>
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-8 gap-y-4 px-6 py-5">
          <span className={site.logoOnPlate ? "rounded-md bg-white px-4 py-2" : undefined}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={site.logoSrc} alt={site.logoAlt} className="h-14 w-auto" />
          </span>
          <nav className="flex flex-wrap items-center gap-x-7 gap-y-2 text-[15px] font-medium text-white">
            {site.topNav.map((item) => (
              <NavItem key={item} label={item} />
            ))}
          </nav>
        </div>
      </div>

      <div style={{ backgroundColor: site.secondary }}>
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-6 py-3 text-[13px] font-semibold tracking-wide text-white">
          {site.mainNav?.map((item) => (
            <NavItem key={item} label={item} />
          ))}
          <svg viewBox="0 0 24 24" className="ml-auto h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" strokeLinecap="round" />
          </svg>
        </div>
      </div>

      <div className="bg-gradient-to-b from-gray-100 to-gray-200">
        <div className="mx-auto max-w-4xl px-6 py-20">
          <div className="flex flex-wrap items-center justify-center gap-5 rounded-lg bg-white px-8 py-7 shadow-sm">
            <span className="text-xl font-semibold text-gray-800">{site.heroTitle}</span>
            <span
              aria-hidden="true"
              className="flex min-w-[200px] items-center justify-between gap-3 border-b border-gray-300 pb-1 text-lg text-gray-600"
            >
              {site.quickLinks[0]}
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m6 9 6 6 6-6" strokeLinecap="round" />
              </svg>
            </span>
            <span
              className="cursor-default rounded px-7 py-3 text-[15px] font-semibold text-white"
              style={{ backgroundColor: site.secondary }}
            >
              Click here
            </span>
          </div>
        </div>
      </div>

      <div style={{ backgroundColor: deck.primary }} className="text-white">
        <div className="mx-auto flex max-w-7xl items-center gap-6 px-6 py-3 text-[14px]">
          <span className="flex shrink-0 items-center gap-2 font-medium">
            Foreign Exchange Rates
            <span
              aria-hidden="true"
              className="flex h-4 w-4 items-center justify-center rounded-full border border-white/60 text-[10px]"
            >
              ?
            </span>
          </span>
          <span className="truncate text-white/85">{site.heroSubtitle}</span>
        </div>
      </div>

      <section className="mx-auto max-w-7xl px-6 py-16 text-center">
        <h2 className="text-3xl font-bold text-gray-900">{site.feedTitle}</h2>
        {site.feedSubtitle && <p className="mt-2 text-[15px] text-gray-500">{site.feedSubtitle}</p>}
        <div className="mt-10 grid gap-6 text-left sm:grid-cols-2 lg:grid-cols-4">
          {site.feedItems.map((headline, i) => (
            <article key={headline} className="overflow-hidden rounded-lg border border-gray-200">
              <div
                className="h-28"
                aria-hidden="true"
                style={{ backgroundColor: i % 2 === 0 ? "#e6ebf1" : "#efe8d8" }}
              />
              <div className="p-4">
                <p className="text-sm font-semibold leading-snug text-gray-900">{headline}</p>
                <p className="mt-2 text-[12px] text-gray-500">Placeholder item - demonstration only.</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <footer style={{ backgroundColor: deck.primary }} className="text-white/80">
        <div className="mx-auto max-w-7xl px-6 py-10 text-sm">{children}</div>
      </footer>
    </div>
  );
}
