import { NextRequest, NextResponse } from "next/server";
import { requireSession, AuthError } from "@/lib/auth/session";
import axios from "axios";

// =============================================
// Web Crawl API for Knowledge Base Population
// POST: Crawl a URL and extract structured knowledge
// =============================================

interface CrawledPage {
  url: string;
  title: string;
  content: string;
  rawHtml: string;
}

interface KnowledgeEntry {
  id: string;
  topic: string;
  content: string;
  keywords: string[];
}

const MAX_PAGES = 30;
const MAX_CONTENT_LENGTH = 500_000; // 500KB per page fetch
const REQUEST_TIMEOUT = 15_000;
const CRAWL_DELAY = 300; // ms between requests to be polite

export async function POST(request: NextRequest) {
  try {
    await requireSession();

    const body = await request.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json({ error: "url is required" }, { status: 400 });
    }

    // Validate URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        throw new Error("Invalid protocol");
      }
    } catch {
      return NextResponse.json({ error: "Invalid URL. Please provide a valid http or https URL." }, { status: 400 });
    }

    const baseOrigin = parsedUrl.origin;
    const visited = new Set<string>();
    const toVisit: string[] = [parsedUrl.href];
    const crawledPages: CrawledPage[] = [];

    // Crawl the site — prioritize business-relevant pages
    while (toVisit.length > 0 && crawledPages.length < MAX_PAGES) {
      const currentUrl = toVisit.shift()!;
      const normalized = normalizeUrl(currentUrl);

      if (visited.has(normalized)) continue;
      visited.add(normalized);

      try {
        const page = await fetchPage(currentUrl);
        if (!page) continue;

        crawledPages.push(page);

        // Extract internal links for further crawling
        const links = extractInternalLinks(page.rawHtml, currentUrl, baseOrigin);
        const unseen = links.filter((l) => {
          const n = normalizeUrl(l);
          return !visited.has(n) && !toVisit.includes(l);
        });
        // Sort by business relevance — about, services, pricing, FAQ, contact first
        unseen.sort((a, b) => urlPriority(b) - urlPriority(a));
        toVisit.push(...unseen);

        // Be polite — small delay between requests
        if (toVisit.length > 0) {
          await sleep(CRAWL_DELAY);
        }
      } catch (err) {
        console.warn(`[Crawl] Failed to fetch ${currentUrl}:`, err instanceof Error ? err.message : err);
      }
    }

    if (crawledPages.length === 0) {
      return NextResponse.json({ 
        error: "Could not crawl any pages from this URL. The site may be blocking automated requests." 
      }, { status: 422 });
    }

    // Convert crawled pages into structured knowledge entries
    const entries = convertToKnowledgeEntries(crawledPages, parsedUrl.hostname);

    return NextResponse.json({
      entries,
      pagesCrawled: crawledPages.length,
      pagesFound: visited.size,
      source: parsedUrl.hostname,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[Crawl] Error:", error);
    return NextResponse.json({ error: "Failed to crawl website" }, { status: 500 });
  }
}

// ── Helpers ──────────────────────────────────────────────────

async function fetchPage(url: string): Promise<CrawledPage | null> {
  try {
    const response = await axios.get(url, {
      timeout: REQUEST_TIMEOUT,
      maxContentLength: MAX_CONTENT_LENGTH,
      headers: {
        "User-Agent": "FiQ-KnowledgeBot/1.0 (knowledge base crawler)",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
      validateStatus: (status) => status < 400,
    });

    const contentType = response.headers["content-type"] || "";
    if (!contentType.includes("text/html")) {
      return null; // Skip non-HTML
    }

    const html = typeof response.data === "string" ? response.data : String(response.data);
    const title = extractTitle(html);
    const textContent = extractTextContent(html);

    if (!textContent || textContent.length < 50) {
      return null; // Skip nearly-empty pages
    }

    return { url, title, content: textContent, rawHtml: html };
  } catch {
    return null;
  }
}

function extractTitle(html: string): string {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? decodeHtmlEntities(match[1].trim()) : "Untitled";
}

function extractTextContent(html: string): string {
  // Remove scripts, styles, nav, footer, header, SVGs, iframes
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "")
    .replace(/<svg[\s\S]*?<\/svg>/gi, "")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "");

  // Convert structural elements to markers for parsing
  text = text
    .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, "\n## $1\n")
    .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, "\n## $1\n")
    .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, "\n### $1\n")
    .replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, "\n#### $1\n")
    .replace(/<h5[^>]*>([\s\S]*?)<\/h5>/gi, "\n##### $1\n")
    .replace(/<h6[^>]*>([\s\S]*?)<\/h6>/gi, "\n###### $1\n")
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, "\n- $1")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<td[^>]*>/gi, " | ")
    .replace(/<th[^>]*>/gi, " | ");

  // Strip remaining tags
  text = text.replace(/<[^>]+>/g, " ");

  // Decode HTML entities
  text = decodeHtmlEntities(text);

  // Clean up whitespace
  text = text
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return text;
}

function extractInternalLinks(rawHtml: string, currentUrl: string, baseOrigin: string): string[] {
  const links: string[] = [];
  const hrefRegex = /href=["']([^"'#]+)["']/gi;
  let match;

  while ((match = hrefRegex.exec(rawHtml)) !== null) {
    let href = match[1].trim();
    if (!href || href.startsWith("javascript:") || href.startsWith("mailto:") || href.startsWith("tel:")) continue;

    // Resolve relative URLs
    try {
      const resolved = new URL(href, currentUrl);
      // Only follow same-origin links
      if (resolved.origin !== baseOrigin) continue;
      // Skip non-page resources
      if (/\.(png|jpg|jpeg|gif|svg|webp|ico|css|js|pdf|zip|mp4|mp3|woff|woff2|ttf|eot)$/i.test(resolved.pathname)) continue;

      links.push(resolved.href);
    } catch {
      // Invalid URL, skip
    }
  }

  return [...new Set(links)]; // deduplicate
}

// Score URLs by business relevance so high-value pages are crawled first
const PRIORITY_PATTERNS: [RegExp, number][] = [
  [/\/(about|company|who-we-are|our-story)/i, 10],
  [/\/(services?|solutions?|what-we-do|offerings?)/i, 10],
  [/\/(pricing|plans|packages|rates)/i, 9],
  [/\/(faq|frequently-asked|help|support)/i, 9],
  [/\/(contact|get-in-touch|reach-us)/i, 8],
  [/\/(products?|features?|capabilities)/i, 8],
  [/\/(team|staff|people|careers)/i, 5],
  [/\/(blog|news|articles|resources)/i, 3],
  [/\/(terms|privacy|legal|cookie)/i, 1],
];

function urlPriority(url: string): number {
  const path = new URL(url).pathname.toLowerCase();
  if (path === "/" || path === "") return 7; // homepage is mid-priority (already visited first)
  for (const [pattern, score] of PRIORITY_PATTERNS) {
    if (pattern.test(path)) return score;
  }
  return 4; // default
}

function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    // Remove trailing slash, hash, common tracking params
    let path = u.pathname.replace(/\/$/, "") || "/";
    return `${u.origin}${path}`.toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Convert crawled pages to knowledge entries ──────────────

function convertToKnowledgeEntries(pages: CrawledPage[], hostname: string): KnowledgeEntry[] {
  const entries: KnowledgeEntry[] = [];
  const seenTopics = new Set<string>();

  for (const page of pages) {
    const sections = splitIntoSections(page.content);

    if (sections.length === 0) {
      // No headers found — treat entire page as one entry
      const topic = cleanTitle(page.title, hostname);
      if (!seenTopics.has(topic.toLowerCase()) && page.content.length > 50) {
        seenTopics.add(topic.toLowerCase());
        entries.push({
          id: `crawl_${Date.now()}_${entries.length}`,
          topic,
          content: truncateContent(page.content),
          keywords: extractKeywords(`${topic} ${page.content}`),
        });
      }
      continue;
    }

    for (const section of sections) {
      const topic = section.heading
        ? `${cleanTitle(page.title, hostname)} - ${section.heading}`
        : cleanTitle(page.title, hostname);

      const normalizedTopic = topic.toLowerCase().trim();
      if (seenTopics.has(normalizedTopic)) continue;
      if (section.content.length < 30) continue;

      seenTopics.add(normalizedTopic);
      entries.push({
        id: `crawl_${Date.now()}_${entries.length}`,
        topic: topic.length > 120 ? topic.slice(0, 117) + "..." : topic,
        content: truncateContent(section.content),
        keywords: extractKeywords(`${topic} ${section.content}`),
      });
    }
  }

  return entries;
}

interface Section {
  heading: string;
  content: string;
}

function splitIntoSections(text: string): Section[] {
  const sections: Section[] = [];
  const lines = text.split("\n");
  let currentHeading = "";
  let currentContent = "";

  for (const line of lines) {
    const headerMatch = line.match(/^#{2,6}\s+(.+)$/);
    if (headerMatch) {
      // Save previous section
      if (currentContent.trim()) {
        sections.push({
          heading: currentHeading,
          content: currentContent.trim(),
        });
      }
      currentHeading = headerMatch[1].trim();
      currentContent = "";
    } else {
      currentContent += line + "\n";
    }
  }

  // Save last section
  if (currentContent.trim()) {
    sections.push({
      heading: currentHeading,
      content: currentContent.trim(),
    });
  }

  return sections;
}

function cleanTitle(title: string, hostname: string): string {
  // Remove common suffixes like "| Company Name", "- Company Name"
  return title
    .replace(/\s*[|–—-]\s*.*$/, "")
    .replace(new RegExp(hostname.replace(/\./g, "\\."), "gi"), "")
    .trim() || "Website Information";
}

function truncateContent(content: string, maxLength = 2000): string {
  if (content.length <= maxLength) return content;
  return content.slice(0, maxLength).replace(/\s+\S*$/, "") + "...";
}

function extractKeywords(text: string): string[] {
  const stopWords = new Set([
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of",
    "with", "by", "is", "are", "was", "were", "be", "been", "have", "has", "had",
    "do", "does", "did", "will", "would", "could", "should", "may", "might", "can",
    "shall", "this", "that", "these", "those", "not", "no", "your", "our", "its",
    "their", "you", "we", "they", "it", "all", "any", "each", "every", "more",
    "most", "other", "some", "such", "than", "too", "very", "just", "also",
    "about", "above", "after", "again", "between", "both", "during", "from",
    "here", "there", "how", "what", "when", "where", "which", "who", "why",
  ]);

  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w));

  // Count frequency
  const freq: Record<string, number> = {};
  for (const w of words) {
    freq[w] = (freq[w] || 0) + 1;
  }

  // Return top keywords by frequency
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);
}
