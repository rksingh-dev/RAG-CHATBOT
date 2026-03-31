/**
 * Advanced Document Chunking with Contextual Headers & Parent-Child
 * 
 * Three key strategies:
 * 1. Recursive chunking with overlap (preserves boundaries)
 * 2. Contextual headers (prepends section/page info for better embedding)
 * 3. Parent-child structure (search small chunks, return big context)
 */

export interface ChunkMetadata {
  chunkIndex: number;
  totalChunks: number;
  docTitle: string;
  estimatedPage: number;
  /** If this is a child chunk, the parent's index */
  parentIndex?: number;
  /** Whether this chunk is used for search (child) or context (parent) */
  role: 'search' | 'context' | 'both';
  /** Contextual header prepended for embedding */
  contextHeader: string;
}

export interface TextChunk {
  content: string;
  /** Content with contextual header prepended (used for embedding only) */
  embeddingContent: string;
  metadata: ChunkMetadata;
}

// ─── Separator Hierarchy ──────────────────────────────────────────────────────
const SEPARATORS = [
  '\n\n\n',     // Triple newline: section breaks
  '\n\n',       // Double newline: paragraph breaks
  '\n',         // Single newline: line breaks
  '. ',         // Sentence boundary
  '? ',         // Question boundary
  '! ',         // Exclamation boundary
  '; ',         // Semicolon clause boundary
  ', ',         // Comma clause boundary
  ' ',          // Word boundary (last resort)
];

function recursiveSplit(text: string, maxSize: number, separatorIndex: number = 0): string[] {
  if (text.length <= maxSize) return [text];

  if (separatorIndex >= SEPARATORS.length) {
    const chunks: string[] = [];
    for (let i = 0; i < text.length; i += maxSize) {
      chunks.push(text.slice(i, i + maxSize));
    }
    return chunks;
  }

  const separator = SEPARATORS[separatorIndex];
  const parts = text.split(separator);

  if (parts.length <= 1) {
    return recursiveSplit(text, maxSize, separatorIndex + 1);
  }

  const chunks: string[] = [];
  let currentChunk = '';

  for (const part of parts) {
    const candidate = currentChunk ? currentChunk + separator + part : part;

    if (candidate.length <= maxSize) {
      currentChunk = candidate;
    } else {
      if (currentChunk) chunks.push(currentChunk);

      if (part.length > maxSize) {
        const subChunks = recursiveSplit(part, maxSize, separatorIndex + 1);
        for (let i = 0; i < subChunks.length - 1; i++) {
          chunks.push(subChunks[i]);
        }
        currentChunk = subChunks[subChunks.length - 1];
      } else {
        currentChunk = part;
      }
    }
  }

  if (currentChunk) chunks.push(currentChunk);
  return chunks;
}

function addOverlap(chunks: string[], overlap: number): string[] {
  if (overlap <= 0 || chunks.length <= 1) return chunks;

  const result: string[] = [chunks[0]];
  for (let i = 1; i < chunks.length; i++) {
    const overlapText = chunks[i - 1].slice(-overlap);
    result.push(overlapText + chunks[i]);
  }
  return result;
}

function estimatePage(charOffset: number, charsPerPage: number = 3000): number {
  return Math.floor(charOffset / charsPerPage) + 1;
}

function cleanChunk(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ─── Section Detection ────────────────────────────────────────────────────────
// Detect document structure to build contextual headers

interface SectionInfo {
  title: string;
  startChar: number;
}

/**
 * Detect section headings from the document text.
 * Looks for common patterns: numbered sections, all-caps lines, short lines
 * followed by paragraphs.
 */
function detectSections(text: string): SectionInfo[] {
  const sections: SectionInfo[] = [];
  const lines = text.split('\n');
  let charOffset = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const nextLine = lines[i + 1]?.trim() || '';

    const isHeading =
      // Numbered sections: "1. Introduction", "2.1 Methods"
      /^\d+[\.\)]\s+[A-Z]/.test(line) ||
      // All-caps lines (common section headers)
      (line.length > 3 && line.length < 80 && line === line.toUpperCase() && /[A-Z]/.test(line)) ||
      // Short line followed by longer text (probable heading)
      (line.length > 3 && line.length < 60 && nextLine.length > 80 && !line.endsWith('.'));

    if (isHeading) {
      sections.push({ title: line, startChar: charOffset });
    }

    charOffset += lines[i].length + 1; // +1 for \n
  }

  return sections;
}

/**
 * Find which section a character offset belongs to.
 */
function findSection(charOffset: number, sections: SectionInfo[]): string {
  let currentSection = '';
  for (const section of sections) {
    if (section.startChar <= charOffset) {
      currentSection = section.title;
    } else {
      break;
    }
  }
  return currentSection;
}

// ─── Main Entry Point ─────────────────────────────────────────────────────────

export interface ChunkOptions {
  /** Max characters per child chunk for search (default: 256) */
  childChunkSize?: number;
  /** Max characters per parent chunk for context (default: 1024) */
  parentChunkSize?: number;
  /** Characters of overlap between chunks (default: 50) */
  overlap?: number;
  /** Minimum chunk length to keep (default: 40) */
  minChunkLength?: number;
  /** Document title for metadata */
  docTitle?: string;
}

/**
 * Split a document into a parent-child chunk hierarchy with contextual headers.
 * 
 * - PARENT chunks (1024 chars): Large, context-rich — sent to the LLM
 * - CHILD chunks (256 chars): Small, precise — used for embedding & search
 * 
 * Each child knows its parent index. When a child matches a query,
 * the search pipeline can return the parent chunk for richer context.
 */
export function chunkDocument(content: string, options: ChunkOptions = {}): TextChunk[] {
  const {
    childChunkSize = 256,
    parentChunkSize = 1024,
    overlap = 50,
    minChunkLength = 40,
    docTitle = 'Untitled',
  } = options;

  // Detect document sections for contextual headers
  const sections = detectSections(content);
  console.log(`[Chunking] Detected ${sections.length} sections in document`);

  const allChunks: TextChunk[] = [];
  let globalIndex = 0;

  // ── Step 1: Create parent chunks (large, for context) ──
  const rawParents = recursiveSplit(content, parentChunkSize);
  const overlappedParents = addOverlap(rawParents, Math.min(overlap, 30));
  const cleanedParents = overlappedParents.map(cleanChunk).filter(c => c.length >= minChunkLength);

  let parentCharOffset = 0;

  for (let pi = 0; pi < cleanedParents.length; pi++) {
    const parentText = cleanedParents[pi];
    const parentPage = estimatePage(parentCharOffset);
    const parentSection = findSection(parentCharOffset, sections);

    // Build the contextual header
    const contextHeader = [
      `Document: ${docTitle}`,
      parentSection ? `Section: ${parentSection}` : null,
      `Page: ~${parentPage}`,
    ].filter(Boolean).join(' | ');

    const parentIndex = globalIndex;

    // Add parent chunk (role: 'context')
    allChunks.push({
      content: parentText,
      embeddingContent: `${contextHeader}\n${parentText}`,
      metadata: {
        chunkIndex: parentIndex,
        totalChunks: 0, // Updated at the end
        docTitle,
        estimatedPage: parentPage,
        role: 'context',
        contextHeader,
      },
    });
    globalIndex++;

    // ── Step 2: Split parent into child chunks (small, for search) ──
    const rawChildren = recursiveSplit(parentText, childChunkSize);
    const overlappedChildren = addOverlap(rawChildren, overlap);
    const cleanedChildren = overlappedChildren.map(cleanChunk).filter(c => c.length >= minChunkLength);

    for (const childText of cleanedChildren) {
      allChunks.push({
        content: childText,
        embeddingContent: `${contextHeader}\n${childText}`,
        metadata: {
          chunkIndex: globalIndex,
          totalChunks: 0, // Updated at the end
          docTitle,
          estimatedPage: parentPage,
          parentIndex,
          role: 'search',
          contextHeader,
        },
      });
      globalIndex++;
    }

    parentCharOffset += parentText.length;
  }

  // Update totalChunks in all metadata
  for (const chunk of allChunks) {
    chunk.metadata.totalChunks = allChunks.length;
  }

  const searchChunks = allChunks.filter(c => c.metadata.role === 'search').length;
  const contextChunks = allChunks.filter(c => c.metadata.role === 'context').length;
  console.log(`[Chunking] Created ${searchChunks} search chunks + ${contextChunks} context chunks = ${allChunks.length} total`);

  return allChunks;
}
