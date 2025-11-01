import { NextRequest, NextResponse } from 'next/server';
import { getAllChunks } from '@/lib/documents';
import { findRelevantChunks } from '@/lib/search';

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

    // Get all document chunks
    const allChunks = getAllChunks();

    // Find relevant chunks based on the user's question
    const relevantChunks = findRelevantChunks(message, allChunks, 5);

    // Build context from relevant chunks
    const context = relevantChunks
      .map(chunk => `From ${chunk.docTitle}:\n${chunk.content}`)
      .join('\n\n---\n\n');

    // Create the prompt for DeepSeek
    const systemPrompt = `You are a helpful assistant. Answer the user's question based on the following context from the knowledge base. If the answer cannot be found in the context, say so politely.

Context:
${context}`;

    // Call OpenRouter API with DeepSeek
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'RAG Chatbot',
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-20b:free',
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
        temperature: 0.7,
        max_tokens: 1000,
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenRouter API Error:', errorData);
      return NextResponse.json(
        { error: 'Failed to get response from AI' },
        { status: response.status, headers: corsHeaders }
      );
    }

    const data = await response.json();
    console.log('OpenRouter Response:', JSON.stringify(data, null, 2));
    
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
