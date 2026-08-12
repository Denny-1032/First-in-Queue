// Turn captured public material into knowledge-base entries for a proposal demo.
//
//   node scripts/build-demo-kb.mjs zra   <captured-pages.json> <out.json>
//   node scripts/build-demo-kb.mjs pacra <forms.json>          <out.json>
//
// The output is meant to be READ before it is loaded. These demos answer
// questions about tax and company registration, where a wrong figure is worse
// than no answer, so every entry is a verbatim slice of the institution's own
// published page - never a paraphrase, never generated prose.
import fs from "node:fs";

const [mode, inFile, outFile] = process.argv.slice(2);
if (!mode || !inFile || !outFile) {
  console.error("usage: build-demo-kb.mjs <zra|pacra> <input.json> <output.json>");
  process.exit(1);
}

/** Knowledge entries are prompt context, so they are capped per entry. */
const MAX_ENTRY_CHARS = 1400;
const MIN_ENTRY_CHARS = 120;

/**
 * Ceiling on the WHOLE knowledge base.
 *
 * buildSystemPrompt() concatenates every entry into the system prompt on every
 * single request - there is no retrieval step - so the knowledge base is a
 * per-message cost, not a stored asset. At 30k (~7.5k tokens) the old builds
 * dropped roughly half of the material actually captured from zra.org.zm and
 * pacra.org.zm - customs, tax incentives, mineral royalty, the PAYE band table
 * itself - which is the difference between the assistant answering and saying it
 * does not know. 72k (~18k tokens) fits the entire curated capture for both
 * institutions with headroom, and is a per-tenant cost only (one KB per tenant,
 * not both at once). 72k covers ZRA once its Withholding Tax rate schedule is
 * included. This is still the interim answer until the engine can
 * SELECT entries per question instead of sending all of them; once retrieval
 * exists this ceiling comes back down.
 */
const MAX_TOTAL_CHARS = Number(process.env.KB_MAX_CHARS || 72000);

function decodeEntities(s) {
  return String(s || "")
    .replace(/&#(\d+);/g, (_m, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_m, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&(l|r)squo;/g, "'")
    .replace(/&(l|r)dquo;/g, '"')
    .replace(/&(m|n)dash;/g, "-");
}

function clean(s) {
  return decodeEntities(s)
    .replace(/\s*\|\s*Patents and Companies Registration Agency\s*/gi, "")
    .replace(/\s*[-–]\s*Zambia Revenue Authority\s*/gi, "")
    .replace(/[^\S\n]+/g, " ")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

/**
 * Trim to the prompt budget, keeping the order the builder produced - which is
 * the order the pages were captured in, most-asked first. Dropping the tail is
 * safer than sampling: a half-present fee schedule invites a confident wrong
 * answer, whereas an absent one hits the "say you don't know" instruction.
 */
function applyBudget(entries) {
  const kept = [];
  const seen = new Set(); // drop verbatim duplicates - the same paragraph is
  let total = 0; // captured under several headings and each copy wastes budget.
  for (const e of entries) {
    const key = e.content.trim().toLowerCase();
    if (seen.has(key)) continue;
    if (total + e.content.length > MAX_TOTAL_CHARS) continue;
    seen.add(key);
    kept.push(e);
    total += e.content.length;
  }
  return { kept, total, dropped: entries.length - kept.length };
}

/**
 * Split a page into entries at its own headings.
 *
 * The captured text keeps one heading per line, so a line that is short, has no
 * terminal punctuation and is followed by prose reads as a section start. Crude,
 * but it keeps each entry to a single subject - which is what stops the model
 * answering a PAYE question with customs text sitting in the same chunk.
 */
function splitIntoSections(text) {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const sections = [];
  let current = { heading: "", body: [] };

  for (const line of lines) {
    // A heading is a short, self-contained label. The crude test below used to
    // promote mid-sentence body lines ("K12,000 up to K800,000", "c) remit tax
    // deducted to ZRA", "Energy Minerals; and") into their own sections, which
    // produced garbage topics AND split real answers across entries. Tighten it:
    // reject data lines (currency/percent), list continuations, and fragments
    // that open or close mid-thought. Content is never altered - a rejected
    // line simply stays in the body of the section it belongs to.
    const looksLikeHeading =
      line.length <= 70 &&
      !/[.:;,]$/.test(line) && // ends in sentence punctuation
      /[A-Za-z]/.test(line) &&
      line.split(" ").length <= 10 &&
      /^[A-Z(]/.test(line) && // real headings start uppercase (or a paren)
      !/\b(and|or|the|of|to|a|an|but|with|for)$/i.test(line) && // trails mid-thought
      !/(K\s?[\d,]|\d%|\bper cent\b)/i.test(line) && // a figure line, not a label
      !/^(a|b|c|d|e|i|ii|iii|iv|v)\)/i.test(line); // list continuation, e.g. "c)"
    if (looksLikeHeading && current.body.length) {
      sections.push(current);
      current = { heading: line, body: [] };
    } else if (looksLikeHeading && !current.heading) {
      current.heading = line;
    } else {
      current.body.push(line);
    }
  }
  if (current.body.length) sections.push(current);
  return sections;
}

function chunk(text, max = MAX_ENTRY_CHARS) {
  const out = [];
  let buf = "";
  for (const line of text.split("\n")) {
    if ((buf + "\n" + line).length > max && buf) {
      out.push(buf.trim());
      buf = line;
    } else {
      buf = buf ? `${buf}\n${line}` : line;
    }
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}

function buildZra(pages) {
  const entries = [];
  for (const page of pages) {
    const pageTitle = clean(page.title);
    for (const section of splitIntoSections(clean(page.text))) {
      const body = clean(section.body.join("\n"));
      if (body.length < MIN_ENTRY_CHARS) continue;
      for (const [i, part] of chunk(body).entries()) {
        entries.push({
          topic: [pageTitle, section.heading, i ? `part ${i + 1}` : ""].filter(Boolean).join(" - "),
          content: part,
          source: page.url,
        });
      }
    }
  }
  return entries;
}

function buildPacra(forms) {
  const entries = [];

  // One entry per form: title, official fee, and PACRA's own summary. Fees are
  // the single most asked question at the counter, so they stay verbatim.
  for (const f of forms) {
    const fees = (f.fees || []).map((x) => `${x.description}: ${x.amount}`).join("; ");
    const body = [
      f.summary && clean(f.summary),
      fees && `Fees - ${fees}.`,
      f.feeRange && `Published fee: ${f.feeRange}.`,
      f.lastUpdated && `Fee last updated ${f.lastUpdated}.`,
    ]
      .filter(Boolean)
      .join(" ");
    if (body.length < 40) continue;
    entries.push({
      topic: `${f.category} - ${clean(f.title)}`,
      content: body,
      source: "https://www.pacra.org.zm/fees-and-forms",
      keywords: f.keywords || [],
    });
  }

  // A category index, so "how much to register a company" has something to land
  // on even when the visitor names no form.
  const byCat = new Map();
  for (const f of forms) {
    if (!byCat.has(f.category)) byCat.set(f.category, []);
    byCat.get(f.category).push(f);
  }
  for (const [cat, list] of byCat) {
    const cheapest = list
      .map((f) => f.feeRange)
      .filter(Boolean)
      .slice(0, 8)
      .join(", ");
    entries.push({
      topic: `${cat} - forms available`,
      content:
        `PACRA publishes ${list.length} ${cat} forms. Examples: ` +
        list.slice(0, 8).map((f) => clean(f.title)).join("; ") +
        (cheapest ? `. Published fees include ${cheapest}.` : "") +
        " All forms and current fees are on https://www.pacra.org.zm/fees-and-forms.",
      source: "https://www.pacra.org.zm/fees-and-forms",
    });
  }

  return entries;
}

const input = JSON.parse(fs.readFileSync(inFile, "utf8"));
const built = mode === "zra" ? buildZra(input) : buildPacra(input);
const { kept, total, dropped } = applyBudget(built);

fs.writeFileSync(outFile, JSON.stringify(kept, null, 2));

console.log(
  `built ${built.length} entries, kept ${kept.length} (${total} chars, ~${Math.round(
    total / 4
  )} tokens per request), dropped ${dropped} over the ${MAX_TOTAL_CHARS}-char budget`
);
console.log("\nfirst five topics:");
for (const e of kept.slice(0, 5)) console.log(` - ${e.topic}`);
