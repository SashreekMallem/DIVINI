import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

/**
 * API Route: /api/summarize-context
 * 
 * Uses Gemini to intelligently:
 * - Extract key facts from Q&A
 * - Generate session summaries
 * - Identify patterns and themes
 * 
 * Called by smartContextManager.ts for AI-powered context compression
 */
export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json()

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 })
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    
    // Use fast model for summarization (low latency)
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash',
      generationConfig: {
        maxOutputTokens: 1024, // Keep summaries concise
        temperature: 0.3, // Lower temperature for more focused extraction
      }
    })

    console.log('🧠 Gemini summarization request:', {
      promptLength: prompt.length,
      promptPreview: prompt.substring(0, 100) + '...'
    })

    const result = await model.generateContent(prompt)
    const response = await result.response
    const summary = response.text()

    console.log('✅ Gemini summarization complete:', {
      summaryLength: summary.length
    })

    return NextResponse.json({ summary })

  } catch (error: any) {
    console.error('Summarize context error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Health check
export async function GET() {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 })
  }
  return NextResponse.json({ status: 'ok', service: 'summarize-context' })
}

