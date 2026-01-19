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

    // System instruction for persona and behavioral guidelines
    const systemInstruction = `You are an expert interview coach generating SPOKEN answers for a job candidate.

CRITICAL RULES:
1. Output ONLY the words the candidate should speak - nothing else
2. NEVER output meta-commentary like "This is a behavioral question" or "I'll aim for X words"
3. NEVER output category labels like "QUICK:", "BEHAVIORAL:", "STAR:" etc.
4. First person only ("I", "my", "we")
5. Be conversational and natural - this will be READ ALOUD
6. Natural filler phrases are okay ("So,", "Well,", "You know,") - sound human, not robotic

ANSWER LENGTH REQUIREMENTS (speaking pace = 140 words/minute):
- Simple/Quick questions (Yes/No, one fact): 80-120 words (30-50 seconds)
- Introduction questions ("Tell me about yourself"): 350-450 words (3-3.5 minutes)
- Behavioral STAR questions ("Tell me about a time..."): 450-600 words (3.5-5.5 minutes) - GIVE DETAILED ANSWERS
- Technical explanations: 350-450 words (2.5-3.5 minutes)
- Case/Product/Strategy questions: 400-600 words (6-8 minutes)

For BEHAVIORAL questions, use STAR format with SPECIFIC details:
- Situation (10%): Brief context with specifics (company name, team size, timeline)
- Task (15%): Your specific responsibility  
- Action (50-60%): Detailed steps YOU took - this is the MEAT of your answer
- Result (20%): Quantified outcomes (percentages, revenue, time saved, etc.)

CONSISTENCY: Stay consistent with previously given AI_SUGGESTED_ANSWER entries.
USE RESUME DETAILS: Reference specific achievements, numbers, and experiences from the candidate's resume.
BE THOROUGH: Give complete, detailed answers. Don't cut yourself short.`

    const prompt = `${systemInstruction}

=== CONTEXT ===
${contextBlock}

=== CURRENT QUESTION ===
"${question}"

=== YOUR SPOKEN ANSWER ===`

    // Use generation config for better control
    const generationConfig = {
      temperature: 0.8,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 3000, // Supports up to ~2200 words for long 8-min answers
    }

    const result = await model.generateContentStream({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig,
    })

    // Create a streaming response - pass through directly for natural flow
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()

        // Only strip true meta-commentary, not natural speech patterns
        const metaPatterns = [
          /^this is (a|an) (quick|intro|behavioral|technical|case|product) question[,.]?\s*/i,
          /^(quick|intro|behavioral|technical|case|product)[,:.]?\s+/i,
          /^star[,:.]?\s+/i,
          /^(i'?ll|i will) (aim for|target|generate)\s*~?\d+\s*words?[,.]?\s*/i,
          /^targeting\s*~?\d+\s*words?[,.]?\s*/i,
          /^["':*•]+\s*/,
        ]

        try {
          let accumulatedAnswer = ''
          let inputTokens = 0
          let hasStartedOutput = false
          let skipBuffer = ''

          for await (const chunk of result.stream) {
            const chunkText = chunk.text()
            accumulatedAnswer += chunkText

            // Only filter meta-commentary at the very start
            if (!hasStartedOutput) {
              skipBuffer += chunkText

              if (skipBuffer.length > 30) {
                let cleanedStart = skipBuffer
                for (const pattern of metaPatterns) {
                  cleanedStart = cleanedStart.replace(pattern, '')
                }

                if (cleanedStart.trim().length > 0) {
                  hasStartedOutput = true
                  controller.enqueue(encoder.encode(JSON.stringify({ text: cleanedStart }) + '\n'))
                }
              }
            } else if (chunkText) {
              controller.enqueue(encoder.encode(JSON.stringify({ text: chunkText }) + '\n'))
            }

            if (chunk.usageMetadata) {
              inputTokens = chunk.usageMetadata.promptTokenCount || 0
            }
          }

          // Flush remaining buffer
          if (!hasStartedOutput && skipBuffer.trim().length > 0) {
            let cleanedStart = skipBuffer
            for (const pattern of metaPatterns) {
              cleanedStart = cleanedStart.replace(pattern, '')
            }
            if (cleanedStart.trim().length > 0) {
              controller.enqueue(encoder.encode(JSON.stringify({ text: cleanedStart }) + '\n'))
            }
          }

          // Final cleanup
          let cleanAnswer = accumulatedAnswer
          for (const pattern of metaPatterns) {
            cleanAnswer = cleanAnswer.replace(pattern, '')
          }
          cleanAnswer = cleanAnswer.trim()

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
