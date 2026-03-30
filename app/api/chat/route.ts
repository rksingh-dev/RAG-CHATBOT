import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { findRelevantChunksByEmbedding } from '@/lib/search';
import { env, pipeline } from '@xenova/transformers';

env.allowLocalModels = false;

class PipelineSingleton {
  static task: any = 'feature-extraction';
  static model = 'Xenova/all-MiniLM-L6-v2';
  static instance: any = null;

  static async getInstance(progress_callback?: any) {
    if (this.instance === null) {
      this.instance = await pipeline(this.task, this.model, { progress_callback });
    }
    return this.instance;
  }
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json();

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Embed the user's query
    const extractor = await PipelineSingleton.getInstance();
    const output = await extractor(message, { pooling: 'mean', normalize: true });
    const queryEmbedding = Array.from(output.data) as number[];

    // Get all document chunks from the store
    const allChunks = store.getChunks();
    
    let context = '';
    
    if (allChunks.length === 0) {
      context = 'No PDF document has been uploaded yet, or the document was empty.';
    } else {
      // Find relevant chunks based on the user's question embedding
      const relevantChunks = findRelevantChunksByEmbedding(queryEmbedding, allChunks, 5);

      // Build context from relevant chunks
      context = relevantChunks
        .map(chunk => `From ${chunk.docTitle}:\n${chunk.content}`)
        .join('\n\n---\n\n');
    }

    // Create the prompt for Groq
    const systemPrompt = `You are a helpful assistant. Answer the user's question strictly based on the following context from an uploaded PDF. If the answer cannot be found in the context, say so politely.

Context:
${context}`;

    // Call Groq API manually with fetch
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer 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`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: message
          }
        ],
        temperature: 0.1,
        max_tokens: 1000,
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Groq API Error:', errorData);
      return NextResponse.json(
        { error: 'Failed to get response from AI' },
        { status: response.status, headers: corsHeaders }
      );
    }

    const data = await response.json();
    
    // Check if response has the expected structure
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('Unexpected API response structure:', data);
      return NextResponse.json(
        { error: 'Unexpected response from AI' },
        { status: 500, headers: corsHeaders }
      );
    }

    const aiResponse = data.choices[0].message.content || 'No response generated';

    return NextResponse.json({
      response: aiResponse
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Chat API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
