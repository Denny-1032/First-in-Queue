"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Clock, X } from "lucide-react";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";

// This replaced a seven-row spec table. The table was accurate and nobody read
// it: "Response time — minutes to hours vs under 10 seconds" is a number, and
// the thing being sold is what that number does to a Saturday night.
//
// So: one message, two lanes, and the green one visibly finishes while the grey
// one is still waiting. The staggered delays ARE the argument - which is why
// they are data, not decoration. The numbers the table carried are still here,
// compressed into the strip underneath.

interface Step {
  time: string;
  text: string;
  /** ms after the section enters view. Tuned so the lanes diverge on screen. */
  delay: number;
  emphasis?: boolean;
}

const WITHOUT: Step[] = [
  { time: "9:47pm", text: "Message delivered", delay: 0 },
  { time: "Sunday", text: "Closed. Nobody sees it.", delay: 1100 },
  { time: "Mon 9:12am", text: "Seen — 35 hours later", delay: 2300, emphasis: true },
];

const WITH: Step[] = [
  { time: "9:47pm", text: "Message delivered", delay: 0 },
  { time: "9:47pm", text: "Replied in 8 seconds — 14 left in stock", delay: 450, emphasis: true },
  { time: "9:52pm", text: "Order placed, one reserved", delay: 900 },
];

/** After the last lane step, so the verdicts land last. */
const OUTCOME_DELAY = { without: 3000, with: 1350 };

const STATS = [
  { label: "Monthly cost", old: "K3,000–5,000", now: "from K499" },
  { label: "Covers", old: "8hrs, 5 days", now: "24/7, 365 days" },
  { label: "Languages", old: "1–2", now: "40+" },
  { label: "Live in", old: "weeks of hiring", now: "1–2 days" },
];

export function TwoLaneStory() {
  const [seen, setSeen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  // Someone who asked for no motion gets both lanes complete, immediately - the
  // comparison must not depend on an animation they turned off. Derived rather
  // than set in the effect below, so there is no render just to catch up.
  const started = seen || reducedMotion;

  useEffect(() => {
    if (reducedMotion) return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold: 0.25 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reducedMotion]);

  // Delays only make sense while the story is playing.
  const delay = (ms: number) => (reducedMotion ? 0 : ms);

  return (
    <div ref={ref}>
      {/* The message both lanes are answering */}
      <div className="flex justify-center">
        <div className="max-w-md">
          <div className="rounded-2xl rounded-tl-sm bg-white border border-gray-200 shadow-sm px-4 py-3">
            <p className="text-sm text-gray-900">
              Hi, is the 20kg bag still available?
            </p>
          </div>
          <p className="mt-2 text-center text-xs text-gray-500">
            <Clock className="inline h-3 w-3 mr-1 -mt-px" />
            9:47pm, Saturday
          </p>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-5">
        <Lane
          title="Without FiQ"
          tone="old"
          steps={WITHOUT}
          outcome="Customer bought elsewhere."
          outcomeDelay={delay(OUTCOME_DELAY.without)}
          started={started}
          scale={delay}
        />
        <Lane
          title="With FiQ"
          tone="fiq"
          steps={WITH}
          outcome="Handled automatically. Nobody was working."
          outcomeDelay={delay(OUTCOME_DELAY.with)}
          started={started}
          scale={delay}
        />
      </div>

      {/* The numbers the old table carried, kept but compressed */}
      <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-3">
        {STATS.map((s) => (
          <div key={s.label} className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              {s.label}
            </p>
            <p className="mt-1.5 text-xs text-gray-400 line-through">{s.old}</p>
            <p className="text-sm font-semibold text-emerald-600">{s.now}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function Lane({
  title,
  tone,
  steps,
  outcome,
  outcomeDelay,
  started,
  scale,
}: {
  title: string;
  tone: "old" | "fiq";
  steps: Step[];
  outcome: string;
  outcomeDelay: number;
  started: boolean;
  scale: (ms: number) => number;
}) {
  const isFiq = tone === "fiq";

  return (
    <div
      className={`rounded-2xl border p-5 sm:p-6 ${
        isFiq ? "border-emerald-200 bg-emerald-50/40" : "border-gray-200 bg-gray-50/60"
      }`}
    >
      <div className="flex items-center gap-2 mb-5">
        <span
          className={`h-2 w-2 rounded-full ${isFiq ? "bg-emerald-500" : "bg-gray-300"}`}
          aria-hidden="true"
        />
        <p
          className={`text-sm font-semibold ${isFiq ? "text-emerald-700" : "text-gray-500"}`}
        >
          {title}
        </p>
      </div>

      <ol className="relative space-y-4 pl-6">
        {/* Spine the timestamps hang off */}
        <span
          className={`absolute left-[5px] top-1.5 bottom-1.5 w-px ${
            isFiq ? "bg-emerald-200" : "bg-gray-200"
          }`}
          aria-hidden="true"
        />
        {steps.map((step) => (
          <li
            key={step.time + step.text}
            className={`relative transition-all duration-500 ease-out ${
              started ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
            }`}
            style={{ transitionDelay: `${scale(step.delay)}ms` }}
          >
            <span
              className={`absolute -left-6 top-1.5 h-[11px] w-[11px] rounded-full border-2 border-white ${
                isFiq ? "bg-emerald-500" : "bg-gray-300"
              }`}
              aria-hidden="true"
            />
            <p
              className={`text-[11px] font-medium uppercase tracking-wider ${
                isFiq ? "text-emerald-600" : "text-gray-400"
              }`}
            >
              {step.time}
            </p>
            <p
              className={`text-sm mt-0.5 ${
                step.emphasis
                  ? isFiq
                    ? "text-gray-900 font-semibold"
                    : "text-gray-700 font-semibold"
                  : "text-gray-600"
              }`}
            >
              {step.text}
            </p>
          </li>
        ))}
      </ol>

      <div
        className={`mt-5 pt-4 border-t flex items-start gap-2 transition-all duration-500 ease-out ${
          isFiq ? "border-emerald-200" : "border-gray-200"
        } ${started ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}
        style={{ transitionDelay: `${outcomeDelay}ms` }}
      >
        {isFiq ? (
          <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
        ) : (
          <X className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
        )}
        <p
          className={`text-sm font-semibold ${isFiq ? "text-emerald-700" : "text-gray-500"}`}
        >
          {outcome}
        </p>
      </div>
    </div>
  );
}
