import type { KnowledgeEntry } from "@/types";

/**
 * Import a knowledge base straight from JSON: `[{ topic, content, keywords? }, ...]`.
 * Extra keys (`source`, and anything else a scrape carried along) are ignored.
 *
 * Entries are taken verbatim - no AI pass, no rewriting. These files are source
 * material (published fees, form names, opening hours) and paraphrasing them is how
 * a demo ends up quoting a price that does not exist.
 *
 * The field rules match `cleanKnowledge` in lib/onboarding/knowledge-input.ts, but
 * deliberately not its MAX_KB_ENTRIES / FREE_KB_CAP_BYTES caps: those are the
 * free-tier onboarding cost control, and applying them here would silently drop most
 * of a real imported knowledge base. Size is warned about at the call site instead.
 *
 * Throws on unparseable JSON or a non-array root so the caller can say which.
 */
export function parseKnowledgeEntriesJson(
  jsonContent: string
): { entries: KnowledgeEntry[]; skipped: number } {
  let raw: unknown;
  try {
    raw = JSON.parse(jsonContent);
  } catch {
    throw new Error("That file isn't valid JSON.");
  }

  if (!Array.isArray(raw)) {
    throw new Error("Expected a JSON array of entries, each with a topic and content.");
  }

  const entries: KnowledgeEntry[] = [];
  let skipped = 0;

  raw.forEach((item, i) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      skipped++;
      return;
    }
    const r = item as Record<string, unknown>;
    const topic = typeof r.topic === "string" ? r.topic.trim() : "";
    const content = typeof r.content === "string" ? r.content.trim() : "";
    if (!topic || !content) {
      skipped++;
      return;
    }

    entries.push({
      id: typeof r.id === "string" && r.id ? r.id : `kb_${Date.now()}_${i}`,
      topic: topic.slice(0, 150),
      content,
      keywords: Array.isArray(r.keywords)
        ? (r.keywords as unknown[]).filter((k): k is string => typeof k === "string").slice(0, 12)
        : [],
    });
  });

  return { entries, skipped };
}

// Utility to create better segmented knowledge base entries from markdown content
export function parseMarkdownToKnowledgeEntries(markdownContent: string): KnowledgeEntry[] {
  const entries: KnowledgeEntry[] = [];
  const lines = markdownContent.split('\n');
  
  let currentSection = '';
  let currentContent = '';
  let currentKeywords: string[] = [];
  let inCodeBlock = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines
    if (!line) {
      if (currentContent) currentContent += '\n';
      continue;
    }
    
    // Handle code blocks
    if (line.startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      if (currentContent) currentContent += line + '\n';
      continue;
    }
    
    if (inCodeBlock) {
      if (currentContent) currentContent += line + '\n';
      continue;
    }
    
    // Main headers (# or ##)
    const headerMatch = line.match(/^#{1,2}\s+(.+)$/);
    if (headerMatch) {
      // Save previous section if it exists
      if (currentSection && currentContent.trim()) {
        entries.push({
          id: Date.now().toString() + entries.length,
          topic: currentSection,
          content: currentContent.trim(),
          keywords: currentKeywords
        });
      }
      
      // Start new section
      currentSection = headerMatch[1].replace(/^\d+\.\s*/, ''); // Remove numbering
      currentContent = '';
      currentKeywords = extractKeywords(currentSection);
      continue;
    }
    
    // Sub-headers (### or ####) - create subsections
    const subHeaderMatch = line.match(/^#{3,4}\s+(.+)$/);
    if (subHeaderMatch) {
      // Save current subsection if exists
      if (currentContent.trim()) {
        const subTopic = currentSection ? `${currentSection} - ${subHeaderMatch[1]}` : subHeaderMatch[1];
        entries.push({
          id: Date.now().toString() + entries.length,
          topic: subTopic,
          content: currentContent.trim(),
          keywords: [...currentKeywords, ...extractKeywords(subHeaderMatch[1])]
        });
        currentContent = '';
      }
      
      // Continue with subsection
      const nextLines = [];
      for (let j = i + 1; j < lines.length && !lines[j].match(/^#{1,4}\s+/); j++) {
        nextLines.push(lines[j]);
      }
      
      if (nextLines.some(l => l.trim())) {
        const subContent = nextLines.join('\n').trim();
        if (subContent) {
          const subTopic = currentSection ? `${currentSection} - ${subHeaderMatch[1]}` : subHeaderMatch[1];
          entries.push({
            id: Date.now().toString() + entries.length,
            topic: subTopic,
            content: subContent,
            keywords: [...currentKeywords, ...extractKeywords(subHeaderMatch[1])]
          });
        }
      }
      
      // Skip the lines we just processed
      i += nextLines.length;
      continue;
    }
    
    // Regular content
    if (currentContent) currentContent += '\n';
    currentContent += line;
  }
  
  // Save final section
  if (currentSection && currentContent.trim()) {
    entries.push({
      id: Date.now().toString() + entries.length,
      topic: currentSection,
      content: currentContent.trim(),
      keywords: currentKeywords
    });
  }
  
  return entries.filter(entry => entry.content.length > 10); // Filter out very short entries
}

function extractKeywords(text: string): string[] {
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'shall', 'this', 'that', 'these', 'those']);
  
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word))
    .slice(0, 10); // Limit to 10 keywords
}

export { extractKeywords };
