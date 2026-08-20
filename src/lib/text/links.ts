// Shared URL tail handling for every surface that turns text into links:
// the dashboard chat (React) and the widget markdown renderer (HTML string).

const TRAILING_PUNCTUATION = ".,!?";

function count(haystack: string, needle: string): number {
  let n = 0;
  for (const ch of haystack) if (ch === needle) n++;
  return n;
}

/**
 * Split the sentence punctuation a URL picks up when it ends a sentence or sits
 * inside a markdown link that was never parsed as one.
 *
 *   "https://x.com/a)."          -> ["https://x.com/a", ")."]
 *   "https://x.com/wiki/Foo_(b)" -> ["https://x.com/wiki/Foo_(b)", ""]
 *
 * A ")" is only trimmed when the URL never opened it. ";" and quotes are never
 * trimmed - in already-escaped HTML they are the tail of entities like `&#39;`.
 */
export function splitTrailingPunctuation(url: string): [string, string] {
  let href = url;
  let tail = "";
  while (href.length > 0) {
    const last = href[href.length - 1];
    const unbalancedParen = last === ")" && count(href, ")") > count(href, "(");
    if (!TRAILING_PUNCTUATION.includes(last) && !unbalancedParen) break;
    tail = last + tail;
    href = href.slice(0, -1);
  }
  return [href, tail];
}
