import { NextRequest, NextResponse } from 'next/server';
import { env } from '@xenova/transformers';
import { hybridSearch, SearchResult } from '@/lib/search';
import { store } from '@/lib/store';
import { validateRelevance, checkGroundedness } from '@/lib/query';

env.allowLocalModels = false;

const GROQ_API_KEY = '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';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * Build citation-enhanced system prompt with Self-RAG validated context.
 */
function buildSystemPrompt(searchResults: SearchResult[]): string {
  if (searchResults.length === 0) {
    return `You are a helpful assistant. No documents have been uploaded yet. 
Politely inform the user that they need to upload a PDF document first before you can answer questions about it.`;
  }

  const contextBlocks = searchResults.map((result, i) => {
    const sourceLabel = `[${i + 1}] ${result.docTitle} (p.${result.estimatedPage})`;
    return `${sourceLabel}:\n${result.content}`;
  }).join('\n\n---\n\n');

  return `You are a highly knowledgeable assistant performing Retrieval-Augmented Generation. Answer the user's question ONLY using the reference context below.

## Strict Rules
1. **Only use information from the provided context.** If the context doesn't contain enough information, say "I couldn't find this information in the uploaded document."
2. **Cite your sources.** Reference the source number in brackets like [1], [2], etc. for every factual claim.
3. **Be precise and thorough.** Provide detailed answers with relevant specifics from the context.
4. **Structure your response.** Use markdown formatting: bullet points, numbered lists, headers, and bold text for readability.
5. **Never fabricate information.** Do not invent facts, numbers, or details not in the context.
6. **Synthesize across sources.** If multiple sources contain relevant info, combine them into a coherent answer.
7. **State confidence.** If the context only partially answers the question, note what was found and what wasn't.

## Reference Context
${contextBlocks}

## Source Legend
${searchResults.map((r, i) => `[${i + 1}] = ${r.docTitle}, ~page ${r.estimatedPage}${r.expandedToParent ? ' (expanded context)' : ''}`).join('\n')}`;
}

export async function POST(req: NextRequest) {
  try {
    const { message, history } = await req.json();

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    const allChunks = store.getChunks();

    // ── Advanced Search: HyDE + Multi-Query + Hybrid + Re-Ranking + MMR ──
    let searchResults: SearchResult[] = [];

    if (allChunks.length > 0) {
      searchResults = await hybridSearch(message, {
        topK: 6,
        rerankerCandidates: 15,
        useReranker: true,
        mmrLambda: 0.7,
        useHyDE: true,
        useMultiQuery: true,
        expandToParent: true,
      });

      console.log(`[Chat] Retrieved ${searchResults.length} chunks via advanced search`);

      // ── Self-RAG: Validate relevance of retrieved chunks ──
      if (searchResults.length > 0) {
        try {
          const chunksToValidate = searchResults.map((r, i) => ({
            content: r.matchedContent,
            index: i,
          }));

          const relevantIndices = await validateRelevance(message, chunksToValidate);
          const beforeCount = searchResults.length;

          // Filter to only relevant chunks (but keep at least 2)
          if (relevantIndices.length >= 2) {
            searchResults = searchResults.filter((_, i) => relevantIndices.includes(i));
          }

          console.log(`[Self-RAG] Filtered ${beforeCount} → ${searchResults.length} relevant chunks`);
        } catch (err) {
          console.warn('[Self-RAG] Validation failed, keeping all chunks:', err);
        }
      }

      searchResults.forEach((r, i) => {
        console.log(`  [${i + 1}] score=${r.score.toFixed(4)} page~${r.estimatedPage} parent=${r.expandedToParent} "${r.matchedContent.slice(0, 50)}..."`);
      });
    }

    // ── Build messages with conversational memory ──
    const systemPrompt = buildSystemPrompt(searchResults);

    const messages: Array<{ role: string; content: string }> = [
      { role: 'system', content: systemPrompt },
    ];

    if (Array.isArray(history)) {
      const recentHistory = history.slice(-6);
      for (const msg of recentHistory) {
        if (msg.role && msg.content) {
          messages.push({
            role: msg.role === 'user' ? 'user' : 'assistant',
            content: msg.content,
          });
        }
      }
    }

    messages.push({ role: 'user', content: message });

    // ── Stream response from Groq ──
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages,
        temperature: 0.1,
        max_tokens: 2000,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Groq API Error:', errorData);
      return NextResponse.json(
        { error: 'Failed to get response from AI' },
        { status: response.status, headers: corsHeaders }
      );
    }

    // ── SSE Streaming ──
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }

        // Send sources metadata first
        const sourcesEvent = JSON.stringify({
          type: 'sources',
          sources: searchResults.map((r, i) => ({
            index: i + 1,
            docTitle: r.docTitle,
            page: r.estimatedPage,
            score: parseFloat(r.score.toFixed(4)),
            preview: r.matchedContent.slice(0, 150) + '...',
            expandedToParent: r.expandedToParent,
          })),
        });
        controller.enqueue(encoder.encode(`data: ${sourcesEvent}\n\n`));

        // Send pipeline info
        const pipelineEvent = JSON.stringify({
          type: 'pipeline',
          stages: ['HyDE', 'Multi-Query', 'Dense+BM25', 'RRF Fusion', 'Re-Rank', 'Self-RAG', 'MMR', 'Parent Expand'],
        });
        controller.enqueue(encoder.encode(`data: ${pipelineEvent}\n\n`));

        let buffer = '';
        let fullAnswer = '';

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || !trimmed.startsWith('data: ')) continue;

              const data = trimmed.slice(6);
              if (data === '[DONE]') {
                // ── Self-RAG: Post-generation groundedness check ──
                if (fullAnswer.length > 50 && searchResults.length > 0) {
                  try {
                    const context = searchResults.map(r => r.content).join('\n\n');
                    const groundedness = await checkGroundedness(fullAnswer, context);

                    const groundedEvent = JSON.stringify({
                      type: 'groundedness',
                      grounded: groundedness.grounded,
                      confidence: groundedness.confidence,
                      issues: groundedness.issues,
                    });
                    controller.enqueue(encoder.encode(`data: ${groundedEvent}\n\n`));

                    console.log(`[Self-RAG] Groundedness: ${groundedness.grounded ? '✓' : '✗'} (${(groundedness.confidence * 100).toFixed(0)}% confident)`);
                    if (groundedness.issues.length > 0) {
                      console.log(`[Self-RAG] Issues: ${groundedness.issues.join(', ')}`);
                    }
                  } catch (err) {
                    console.warn('[Self-RAG] Groundedness check failed:', err);
                  }
                }

                controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                continue;
              }

              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  fullAnswer += content;
                  const event = JSON.stringify({ type: 'content', content });
                  controller.enqueue(encoder.encode(`data: ${event}\n\n`));
                }
              } catch {}
            }
          }
        } catch (err) {
          console.error('[Chat] Stream error:', err);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Chat API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
