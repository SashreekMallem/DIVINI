import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest, NextResponse } from 'next/server'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

interface SolveCodeRequest {
    image: string // Base64 image
    context: {
        resume?: string
        jobDescription?: string
        transcript?: string[]
        previousQA?: { question: string; answer: string }[]
    }
    phase: 'analyze' | 'solve'
    analysisResult?: {
        problem: string
        clarifyingQuestions: string[]
        approach: string
    }
}

export async function POST(request: NextRequest) {
    try {
        const body: SolveCodeRequest = await request.json()
        const { image, context, phase, analysisResult } = body

        if (!image) {
            return NextResponse.json({ error: 'No image provided' }, { status: 400 })
        }

        // Use Gemini 3 Pro Preview for best coding reasoning
        const model = genAI.getGenerativeModel({ model: 'gemini-3-pro-preview' })

        // Prepare image for Gemini
        const imageData = image.replace(/^data:image\/\w+;base64,/, '')
        const imagePart = {
            inlineData: {
                data: imageData,
                mimeType: 'image/png'
            }
        }

        // State-based JSON sanitizer - properly escapes control chars only inside strings
        const sanitizeJson = (str: string): string => {
            // Remove markdown code blocks
            str = str.replace(/```json\n?|\n?```/g, '').trim()

            let result = ''
            let inString = false
            let escaped = false

            for (let i = 0; i < str.length; i++) {
                const char = str[i]

                if (inString) {
                    if (escaped) {
                        result += char
                        escaped = false
                    } else if (char === '\\') {
                        result += char
                        escaped = true
                    } else if (char === '"') {
                        result += char
                        inString = false
                    } else if (char === '\n') {
                        result += '\\n'
                    } else if (char === '\r') {
                        result += '\\r'
                    } else if (char === '\t') {
                        result += '\\t'
                    } else {
                        result += char
                    }
                } else {
                    if (char === '"') {
                        inString = true
                    }
                    result += char
                }
            }
            return result
        }

        // === PHASE 1: Analyze the problem ===
        if (phase === 'analyze') {
            const prompt = `You are an expert coding interview coach analyzing a screenshot of a coding problem.

CONTEXT:
- Candidate Resume: ${context.resume?.substring(0, 500) || 'Not provided'}
- Job Requirements: ${context.jobDescription?.substring(0, 500) || 'Not provided'}
- Recent interview exchanges: ${context.transcript?.slice(-5).join('\n') || 'None yet'}

TASK:
 Look at this screenshot of a coding problem. Identify:
 1. The full problem title and verbatim description text (extract all visible problem text)
 2. 2-3 clarifying questions the candidate should ask
 3. A high-level approach (1-2 sentences)
 
 Respond ONLY in this JSON format:
 {
     "problem": "Full verbatim problem description and constraints extracted from the image",
     "clarifyingQuestions": ["Question 1", "Question 2", "Question 3"],
     "approach": "High-level strategy to solve this"
 }`

            const result = await model.generateContent([prompt, imagePart])
            const response = result.response.text()

            // Parse JSON from response
            const jsonMatch = response.match(/\{[\s\S]*\}/)
            if (!jsonMatch) {
                return NextResponse.json({
                    error: 'Failed to find JSON in analysis response',
                    raw: response
                }, { status: 500 })
            }

            try {
                const analysis = JSON.parse(jsonMatch[0])
                return NextResponse.json({ phase: 'analyze', result: analysis })
            } catch (parseError) {
                console.log('JSON Parse failed, attempting cleanup...')
                // Try to clean and parse again
                try {
                    const cleaned = sanitizeJson(jsonMatch[0])
                    const analysis = JSON.parse(cleaned)
                    return NextResponse.json({ phase: 'analyze', result: analysis })
                } catch (retryError) {
                    const cleaned2 = jsonMatch[0].replace(/\n/g, "\\n").replace(/\r/g, "")
                    try {
                        const analysis = JSON.parse(cleaned2)
                        return NextResponse.json({ phase: 'analyze', result: analysis })
                    } catch (finalError) {
                        return NextResponse.json({
                            error: 'Failed to parse analysis JSON',
                            raw: response
                        }, { status: 500 })
                    }
                }
            }

        } else if (phase === 'solve') {
            // === PHASE 2: Generate full solution ===
            if (!analysisResult) {
                return NextResponse.json({ error: 'Analysis result required for solve phase' }, { status: 400 })
            }

            const prompt = `You are helping a candidate solve a coding problem in a live technical interview.

PROBLEM: ${analysisResult.problem}
APPROACH: ${analysisResult.approach}

CANDIDATE CONTEXT:
- Resume highlights: ${context.resume?.substring(0, 300) || 'Not provided'}
- They should mention their relevant experience naturally.

Generate a COMPLETE solution with these sections:

1. **CLARIFYING QUESTIONS**
${analysisResult.clarifyingQuestions.map((q, i) => `   ${i + 1}. ${q}`).join('\n')}

2. **APPROACH**
   - Start with: "My approach would be..."
   - Mention time/space complexity goals

3. **CODE**
   - Clean, production-ready code (Prefer Python or JavaScript unless specified)
   - Include helpful comments

4. **WALKTHROUGH**
   - Step-by-step explanation

5. **TEST CASES**
   - Normal case
   - Edge case
   - Large input case

6. **COMPLEXITY ANALYSIS**
   - Time: O(?)
   - Space: O(?)
   - Brief justification

Respond in this JSON format:
{
    "clarifyingQuestions": ["..."],
    "approach": "...",
    "code": "...",
    "walkthrough": "...",
    "testCases": ["...", "...", "..."],
    "complexity": { "time": "O(?)", "space": "O(?)", "explanation": "..." }
}`

            const result = await model.generateContent([prompt, imagePart])
            const response = result.response.text()

            // Parse JSON from response
            const jsonMatch = response.match(/\{[\s\S]*\}/)
            if (!jsonMatch) {
                return NextResponse.json({
                    error: 'Failed to find JSON in solution response',
                    raw: response
                }, { status: 500 })
            }

            try {
                const solution = JSON.parse(jsonMatch[0])
                return NextResponse.json({ phase: 'solve', result: solution })
            } catch (parseError: any) {
                console.log('🔴 JSON Parse failed:', parseError.message)
                console.log('🔴 Raw JSON (first 800 chars):', jsonMatch[0].substring(0, 800))
                console.log('🔴 Raw JSON (chars around error pos 1589):', jsonMatch[0].substring(1560, 1620))

                try {
                    // Standard cleanup
                    const cleaned = sanitizeJson(jsonMatch[0])
                    console.log('🟡 Attempting parse with sanitized JSON...')
                    const solution = JSON.parse(cleaned)
                    console.log('✅ Sanitized parse succeeded!')
                    return NextResponse.json({ phase: 'solve', result: solution })
                } catch (retryError: any) {
                    console.log('🔴 Sanitized parse failed:', retryError.message)
                    try {
                        // Aggressive cleanup: Replace all literal newlines with escaped newlines
                        const cleaned2 = jsonMatch[0].replace(/\n/g, "\\n").replace(/\r/g, "")
                        console.log('🟡 Attempting aggressive cleanup...')
                        const solution = JSON.parse(cleaned2)
                        console.log('✅ Aggressive cleanup succeeded!')
                        return NextResponse.json({ phase: 'solve', result: solution })
                    }
                    catch (finalError: any) {
                        console.log('🔴 All parse attempts failed:', finalError.message)
                        return NextResponse.json({
                            error: 'Failed to parse solution JSON',
                            details: finalError.message,
                            raw: response.substring(0, 1000)
                        }, { status: 500 })
                    }
                }
            }
        }

        return NextResponse.json({ error: 'Invalid phase' }, { status: 400 })

    } catch (error: any) {
        console.error('[solve-code] Error:', error)
        return NextResponse.json({
            error: error.message || 'Failed to process request'
        }, { status: 500 })
    }
}
