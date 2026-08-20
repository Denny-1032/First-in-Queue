// Turns assistant / agent / customer message text into React nodes with
// clickable links, for the dashboard chat transcript.

import { splitTrailingPunctuation } from "@/lib/text/links";

/* Render text with clickable links.
   The assistant replies in markdown, so a URL usually arrives as [label](url).
   Matching bare URLs alone swallowed the closing ")" and the full stop after
   it, producing dead 404 links in the dashboard. */
const MD_LINK = /\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g;
const BARE_URL = /https?:\/\/[^\s<]+/g;

function linkEl(href: string, label: string, key: string) {
  return (
    <a key={key} href={href} target="_blank" rel="noopener noreferrer" className="underline break-all">
      {label}
    </a>
  );
}

/* Bare URLs inside a stretch of plain text. */
function renderBareUrls(text: string, keyPrefix: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(BARE_URL)) {
    const start = m.index!;
    const [href, tail] = splitTrailingPunctuation(m[0]);
    if (start > last) out.push(<span key={`${keyPrefix}t${last}`}>{text.slice(last, start)}</span>);
    if (href) out.push(linkEl(href, href, `${keyPrefix}u${start}`));
    if (tail) out.push(<span key={`${keyPrefix}p${start}`}>{tail}</span>);
    last = start + m[0].length;
  }
  if (last < text.length) out.push(<span key={`${keyPrefix}t${last}`}>{text.slice(last)}</span>);
  return out;
}

export function renderTextWithLinks(text: string) {
  const out: React.ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(MD_LINK)) {
    const start = m.index!;
    if (start > last) out.push(...renderBareUrls(text.slice(last, start), `s${last}-`));
    const [href] = splitTrailingPunctuation(m[2]);
    out.push(href ? linkEl(href, m[1], `l${start}`) : <span key={`l${start}`}>{m[1]}</span>);
    last = start + m[0].length;
  }
  if (last < text.length) out.push(...renderBareUrls(text.slice(last), `s${last}-`));
  return <>{out}</>;
}
