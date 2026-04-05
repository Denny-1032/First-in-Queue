import type { KnowledgeEntry } from "@/types";

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
