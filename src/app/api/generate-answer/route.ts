import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

export async function POST(request: NextRequest) {
  try {
    const {
      question,
      smartContext,
      resumeContent,
      jobDescription,
      companyName,
      companyInfo,
      companyCulture,
      interviewType,
      history,
      transcript,
      multiRoundContext
    } = await request.json()

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 })
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

    // Build context
    let contextBlock: string

    if (smartContext && smartContext.trim()) {
      contextBlock = smartContext
    } else {
      const contextParts: string[] = []
      if (resumeContent?.trim()) contextParts.push(`CANDIDATE RESUME:\n${resumeContent}`)
      if (jobDescription?.trim()) contextParts.push(`JOB DESCRIPTION:\n${jobDescription}`)
      if (companyName?.trim()) {
        let companySection = `COMPANY: ${companyName}`
        if (companyInfo?.trim()) companySection += `\n${companyInfo}`
        if (companyCulture?.trim()) companySection += `\nCULTURE: ${companyCulture}`
        contextParts.push(companySection)
      }
      if (multiRoundContext?.trim()) contextParts.push(multiRoundContext)
      if (history?.length > 0) {
        const historyText = history.map((h: any) => `Q: ${h.question}\nA: ${h.answer}`).join('\n\n')
        contextParts.push(`PREVIOUS Q&A:\n${historyText}`)
      }
      if (transcript?.trim()) contextParts.push(`TRANSCRIPT:\n${transcript}`)
      contextBlock = contextParts.length > 0 ? contextParts.join('\n\n---\n\n') : ''
    }

    const prompt = `You are a job candidate in a real interview. Generate the EXACT words to speak.

=== CONTEXT ===
- INTERVIEWER_QUESTION: What was asked
- AI_SUGGESTED_ANSWER: Your previous answers (stay consistent)
- CANDIDATE RESUME: Your background

${contextBlock}

=== QUESTION ===
"${question}"

=== ANSWER LENGTH GUIDE (speaking pace ~140 words/minute) ===
First, identify the question type and generate the appropriate length:

QUICK (30-45 sec, ~80 words):
- Yes/No questions, simple factual, "What's your strength/weakness?"

INTRO (60-90 sec, ~180 words):
- "Tell me about yourself", "Why this company?", "Walk through your resume"

BEHAVIORAL (2-2.5 min, ~320 words):
- "Tell me about a time...", "Describe a situation...", "Give an example of..."
- Use STAR: Situation → Task → Action → Result

TECHNICAL (1-2 min, ~200 words):
- Concept explanations, "How does X work?", "Difference between X and Y"

TECHNICAL DEEP (2-3 min, ~350 words):
- System design, architecture, complex problem solving

CASE/PRODUCT (2-3 min, ~350 words):
- "How would you improve X?", product design, strategy questions

=== RULES ===
1. Decide the question type, then generate EXACTLY that many words
2. Stay CONSISTENT with previous AI_SUGGESTED_ANSWER entries
3. Use SPECIFIC details from resume (numbers, companies, achievements)
4. First person ("I"), natural and conversational
5. CRITICAL: Start speaking immediately - NO phrases like "Okay, here's my answer", "Let me tell you", "I would say", etc.
6. NO meta-commentary - just the answer
7. You CAN use bullet points, numbered lists, or natural paragraphs - whatever fits the question best
8. Interview type: ${interviewType || 'general'}

YOUR ANSWER (start speaking immediately, no intro phrases):`

    const result = await model.generateContentStream(prompt)

    // Create a streaming response
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()

        try {
          let accumulatedAnswer = ''
          let inputTokens = 0

          for await (const chunk of result.stream) {
            const chunkText = chunk.text()
            accumulatedAnswer += chunkText

            if (chunkText) {
              controller.enqueue(encoder.encode(JSON.stringify({ text: chunkText }) + '\n'))
            }

            if (chunk.usageMetadata) {
              inputTokens = chunk.usageMetadata.promptTokenCount || 0
            }
          }

          const metaPatterns = [
            /^okay,?\s*(here'?s|this is|let me|designing)/i,
            /^so,?\s*(here'?s|let me|i would)/i,
            /^let me\s+(tell you|explain|share)/i,
            /^i would\s+(say|tell|explain)/i,
            /^here'?s\s+(my|the)\s+answer/i,
            /^this is\s+(a|an)\s+(case|product|technical)/i,
            /^(this is|it'?s|that'?s)\s+(a|an)\s+(quick|intro|behavioral|technical|case|product)\s+question[.,]?\s*/i,
            /^(a|an)\s+(quick|intro|behavioral|technical|case|product)\s+question[.,]?\s*(so\s+)?(i\s+will\s+aim\s+for|i'll\s+aim\s+for|targeting)\s*[~]?\d+\s*words?[.,]?\s*/i,
            /^(i'?ll|i\s+will)\s+(aim\s+for|target|generate)\s*[~]?\d+\s*words?[.,]?\s*/i,
            /^targeting\s*[~]?\d+\s*words?[.,]?\s*/i,
          ]

          let cleanAnswer = accumulatedAnswer
          for (const pattern of metaPatterns) {
            cleanAnswer = cleanAnswer.replace(pattern, '').trim()
          }
          cleanAnswer = cleanAnswer.replace(/^["':*•\-\s]+/, '').trim()
          cleanAnswer = cleanAnswer.replace(/^okay,?\s+/i, '').trim()

          const outputTokens = Math.ceil(cleanAnswer.length / 4)
          const costCents = (inputTokens * 0.00001) + (outputTokens * 0.00004)

          controller.enqueue(encoder.encode(JSON.stringify({
            done: true,
            fullText: cleanAnswer,
            usage: {
              inputTokens,
              outputTokens,
              costCents: Math.round(costCents * 1000) / 1000
            }
          }) + '\n'))

          controller.close()
        } catch (error) {
          controller.error(error)
        }
      }
    })

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'application/json',
        'Transfer-Encoding': 'chunked'
      }
    })

  } catch (error: any) {
    console.error('Generate answer error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function GET() {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 })
  }
  return NextResponse.json({ status: 'ok', hasApiKey: true })
}
