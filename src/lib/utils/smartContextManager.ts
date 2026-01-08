/**
 * Smart Context Manager - Production-Grade Context Management
 * 
 * USES GEMINI to intelligently:
 * - Extract key facts from Q&A
 * - Generate session summaries
 * - Identify patterns and themes
 * - Create multi-round context
 * 
 * CLEAR ROLE DEFINITIONS:
 * - INTERVIEWER_QUESTION: What the interviewer asked
 * - AI_SUGGESTED_ANSWER: What AI generated for the candidate to read
 * - USER_ACTUAL_RESPONSE: What the candidate actually said (transcribed)
 * 
 * ROUND CONTEXT:
 * - CURRENT_ROUND: This interview session
 * - PREVIOUS_ROUNDS: Earlier rounds of the same job application
 */

import { createClient } from '@/lib/supabase/client'

export interface SessionMemory {
    // AI-extracted key facts (structured JSON)
    keyFacts: {
        achievementsMentioned: string[]
        technicalSkillsVerified: string[]
        companiesDiscussed: string[]
        numbersAndMetrics: string[]
        importantNames: string[]
        gapsIdentified: string[]
        strengthsHighlighted: string[]
        projectsDiscussed: string[]
    }
    
    // AI-generated conversation summary
    conversationSummary: string
    
    // Questions asked (for deduplication)
    questionsAsked: string[]
    
    // AI-identified behavioral patterns
    behavioralNotes: string[]
    
    // Last updated
    lastUpdated: Date
}

export interface MultiRoundMemory {
    rounds: {
        roundNumber: number
        roundName: string | null
        interviewType: string
        date: string
        outcome: string | null
        keyHighlights: string[]
        gapsIdentified: string[]
        questionsAsked: number
    }[]
    
    // AI-identified improvement trajectory
    improvementNotes: string[]
    
    // AI-identified cross-round patterns
    consistentStrengths: string[]
    persistentGaps: string[]
    
    // AI-generated summary
    overallSummary: string
}

/**
 * Call Gemini to generate session memory (uses AI, not regex)
 */
async function callGeminiForSummary(prompt: string): Promise<string> {
    try {
        const response = await fetch('/api/summarize-context', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt }),
        })
        
        if (!response.ok) {
            console.warn('⚠️ Gemini summarization failed, using fallback')
            return ''
        }
        
        const data = await response.json()
        return data.summary || ''
    } catch (error) {
        console.error('Error calling Gemini for summary:', error)
        return ''
    }
}

/**
 * Generate structured session memory using GEMINI AI
 * Intelligently extracts facts and creates summaries
 */
export async function generateSessionMemory(
    qas: { question: string; answer: string }[],
    existingMemory: SessionMemory | null = null
): Promise<SessionMemory> {
    // Prepare Q&A text for Gemini with CLEAR ROLE LABELS
    const qaText = qas.map((qa, i) => 
        `INTERVIEWER_QUESTION_${i + 1}: ${qa.question}\nAI_SUGGESTED_ANSWER_${i + 1}: ${qa.answer}`
    ).join('\n\n')
    
    // Ask Gemini to extract key facts in JSON format
    const extractionPrompt = `You are analyzing an interview conversation to extract key facts.

CONTEXT EXPLANATION:
- INTERVIEWER_QUESTION: What the interviewer asked
- AI_SUGGESTED_ANSWER: What AI generated for the candidate to read/say

INTERVIEW Q&A FROM CURRENT ROUND:
${qaText}

Extract the following in JSON format. Be specific and concise. Only include what was ACTUALLY mentioned in the AI_SUGGESTED_ANSWER responses:

{
    "achievements": ["specific achievements with metrics if available"],
    "technicalSkills": ["technical skills, tools, languages mentioned"],
    "companies": ["company names mentioned"],
    "numbersAndMetrics": ["specific numbers, percentages, team sizes, budgets, user counts"],
    "projects": ["project names or products mentioned"],
    "strengths": ["strengths highlighted"],
    "weaknesses": ["weaknesses or areas for improvement mentioned"],
    "keyThemes": ["main themes or patterns"],
    "summary": "2-3 sentence summary of what the candidate discussed"
}

Return ONLY valid JSON, no markdown or explanation.`

    const geminiResponse = await callGeminiForSummary(extractionPrompt)
    
    // Parse Gemini response
    let extracted: any = {}
    try {
        const cleanResponse = geminiResponse
            .replace(/```json\n?/g, '')
            .replace(/```\n?/g, '')
            .trim()
        extracted = JSON.parse(cleanResponse)
    } catch (e) {
        console.warn('⚠️ Could not parse Gemini JSON, using fallback extraction')
        extracted = fallbackExtraction(qas)
    }
    
    // Build session memory from Gemini extraction
    const memory: SessionMemory = {
        keyFacts: {
            achievementsMentioned: extracted.achievements || [],
            technicalSkillsVerified: extracted.technicalSkills || [],
            companiesDiscussed: extracted.companies || [],
            numbersAndMetrics: extracted.numbersAndMetrics || [],
            importantNames: [],
            gapsIdentified: extracted.weaknesses || [],
            strengthsHighlighted: extracted.strengths || [],
            projectsDiscussed: extracted.projects || [],
        },
        conversationSummary: extracted.summary || `Discussed ${qas.length} questions.`,
        questionsAsked: qas.map(qa => qa.question),
        behavioralNotes: extracted.keyThemes || [],
        lastUpdated: new Date(),
    }
    
    // Merge with existing memory if provided
    if (existingMemory) {
        memory.keyFacts.achievementsMentioned = [...new Set([...existingMemory.keyFacts.achievementsMentioned, ...memory.keyFacts.achievementsMentioned])]
        memory.keyFacts.technicalSkillsVerified = [...new Set([...existingMemory.keyFacts.technicalSkillsVerified, ...memory.keyFacts.technicalSkillsVerified])]
        memory.keyFacts.companiesDiscussed = [...new Set([...existingMemory.keyFacts.companiesDiscussed, ...memory.keyFacts.companiesDiscussed])]
        memory.keyFacts.numbersAndMetrics = [...new Set([...existingMemory.keyFacts.numbersAndMetrics, ...memory.keyFacts.numbersAndMetrics])]
        memory.keyFacts.gapsIdentified = [...new Set([...existingMemory.keyFacts.gapsIdentified, ...memory.keyFacts.gapsIdentified])]
        memory.keyFacts.strengthsHighlighted = [...new Set([...existingMemory.keyFacts.strengthsHighlighted, ...memory.keyFacts.strengthsHighlighted])]
        memory.keyFacts.projectsDiscussed = [...new Set([...existingMemory.keyFacts.projectsDiscussed, ...memory.keyFacts.projectsDiscussed])]
        memory.questionsAsked = [...new Set([...existingMemory.questionsAsked, ...memory.questionsAsked])]
        memory.behavioralNotes = [...new Set([...existingMemory.behavioralNotes, ...memory.behavioralNotes])]
    }
    
    console.log('🧠 Session memory generated via Gemini:', {
        achievements: memory.keyFacts.achievementsMentioned.length,
        skills: memory.keyFacts.technicalSkillsVerified.length,
        metrics: memory.keyFacts.numbersAndMetrics.length,
        gaps: memory.keyFacts.gapsIdentified.length,
    })
    
    return memory
}

/**
 * Fallback extraction if Gemini fails (basic pattern matching)
 */
function fallbackExtraction(qas: { question: string; answer: string }[]): any {
    const allText = qas.map(qa => qa.answer).join(' ')
    const numbers = allText.match(/\d+%|\$?\d+[MKk]?|\d+\s*(people|team|engineers|users|years?)/gi) || []
    
    return {
        achievements: [],
        technicalSkills: [],
        companies: [],
        numbersAndMetrics: [...new Set(numbers)],
        projects: [],
        strengths: [],
        weaknesses: [],
        keyThemes: [],
        summary: `Discussed ${qas.length} questions.`
    }
}

/**
 * Generate multi-round summary using GEMINI AI
 */
export async function generateMultiRoundSummary(
    rounds: {
        roundNumber: number
        roundName: string | null
        interviewType: string
        questionsAsked: number
        keyHighlights: string[]
        gapsIdentified: string[]
    }[]
): Promise<string> {
    if (rounds.length === 0) return ''
    
    const roundsText = rounds.map(r => 
        `Round ${r.roundNumber} (${r.roundName || r.interviewType}): ${r.questionsAsked} questions. ` +
        `Highlights: ${r.keyHighlights.join(', ')}. ` +
        `Areas to improve: ${r.gapsIdentified.join(', ')}`
    ).join('\n')
    
    const summaryPrompt = `Summarize this candidate's interview history across multiple rounds.

PREVIOUS ROUNDS:
${roundsText}

Focus on:
1. Key strengths that were consistent
2. Areas for improvement that persisted
3. Overall trajectory

Write a concise 2-3 sentence summary.`

    const summary = await callGeminiForSummary(summaryPrompt)
    return summary || `Completed ${rounds.length} rounds.`
}

/**
 * Build smart context with CLEAR ROLE DEFINITIONS
 * No token budgets - include all context
 */
export function buildSmartContext(params: {
    resumeContent: string
    jobDescription: string
    companyName: string
    companyCulture: string
    interviewType: string
    currentRoundNumber: number
    allQAs: { question: string; answer: string }[]
    currentTranscript: string
    sessionMemory: SessionMemory | null
    multiRoundMemory: MultiRoundMemory | null
}): {
    contextParts: string[]
} {
    const contextParts: string[] = []
    
    // ROLE DEFINITIONS HEADER
    contextParts.push(`=== CONTEXT ROLE DEFINITIONS ===
INTERVIEWER_QUESTION: What the interviewer asked in the interview
AI_SUGGESTED_ANSWER: What AI generated for the candidate to read/say (teleprompter style)
USER_ACTUAL_RESPONSE: What the candidate actually said (if captured)

CURRENT_ROUND: This is Round ${params.currentRoundNumber} of this job application
PREVIOUS_ROUNDS: Context from earlier rounds (if any) - candidate already said these things
=== END DEFINITIONS ===`)
    
    // 1. Resume
    if (params.resumeContent) {
        contextParts.push(`=== CANDIDATE RESUME ===
This is the candidate's actual resume/background:
${params.resumeContent}
=== END RESUME ===`)
    }
    
    // 2. Job Description
    if (params.jobDescription) {
        contextParts.push(`=== JOB DESCRIPTION ===
This is the job the candidate is interviewing for:
${params.jobDescription}
=== END JOB DESCRIPTION ===`)
    }
    
    // 3. Company Info
    if (params.companyName) {
        let companySection = `=== COMPANY INFO ===
Company: ${params.companyName}`
        if (params.companyCulture) {
            companySection += `\nCulture & Values: ${params.companyCulture}`
        }
        companySection += `\n=== END COMPANY INFO ===`
        contextParts.push(companySection)
    }
    
    // 4. PREVIOUS ROUNDS (if this is Round 2+)
    if (params.multiRoundMemory && params.multiRoundMemory.rounds.length > 0) {
        const multiRoundText = formatMultiRoundMemory(params.multiRoundMemory, params.currentRoundNumber)
        contextParts.push(multiRoundText)
    }
    
    // 5. SESSION SUMMARY (AI-extracted facts from current round)
    if (params.sessionMemory) {
        const sessionText = formatSessionMemory(params.sessionMemory, params.currentRoundNumber)
        contextParts.push(sessionText)
    }
    
    // 6. CURRENT ROUND Q&A (all Q&A from this round with clear labels)
    if (params.allQAs.length > 0) {
        const qaText = params.allQAs.map((qa, i) => 
            `INTERVIEWER_QUESTION_${i + 1}: ${qa.question}\nAI_SUGGESTED_ANSWER_${i + 1}: ${qa.answer}`
        ).join('\n\n')
        
        contextParts.push(`=== CURRENT ROUND ${params.currentRoundNumber} - Q&A HISTORY ===
These are questions already asked in THIS interview round:
${qaText}
=== END CURRENT ROUND Q&A ===`)
    }
    
    // 7. Current Transcript (live conversation)
    if (params.currentTranscript) {
        contextParts.push(`=== LIVE TRANSCRIPT (CURRENT CONVERSATION) ===
${params.currentTranscript}
=== END TRANSCRIPT ===`)
    }
    
    return { contextParts }
}

/**
 * Format session memory with CLEAR ROUND LABELS
 */
function formatSessionMemory(memory: SessionMemory, currentRoundNumber: number): string {
    const parts: string[] = [`=== ROUND ${currentRoundNumber} - AI-EXTRACTED SUMMARY ===
This is what AI has extracted from the current round so far:`]
    
    if (memory.conversationSummary) {
        parts.push(`\nSUMMARY: ${memory.conversationSummary}`)
    }
    
    if (memory.keyFacts.achievementsMentioned.length > 0) {
        parts.push(`\nACHIEVEMENTS CANDIDATE DISCUSSED:`)
        memory.keyFacts.achievementsMentioned.forEach(a => parts.push(`• ${a}`))
    }
    
    if (memory.keyFacts.technicalSkillsVerified.length > 0) {
        parts.push(`\nTECHNICAL SKILLS MENTIONED: ${memory.keyFacts.technicalSkillsVerified.join(', ')}`)
    }
    
    if (memory.keyFacts.projectsDiscussed.length > 0) {
        parts.push(`\nPROJECTS DISCUSSED: ${memory.keyFacts.projectsDiscussed.join(', ')}`)
    }
    
    if (memory.keyFacts.companiesDiscussed.length > 0) {
        parts.push(`\nCOMPANIES MENTIONED: ${memory.keyFacts.companiesDiscussed.join(', ')}`)
    }
    
    if (memory.keyFacts.numbersAndMetrics.length > 0) {
        parts.push(`\nKEY METRICS/NUMBERS: ${memory.keyFacts.numbersAndMetrics.join(', ')}`)
    }
    
    if (memory.keyFacts.strengthsHighlighted.length > 0) {
        parts.push(`\nSTRENGTHS HIGHLIGHTED: ${memory.keyFacts.strengthsHighlighted.join(', ')}`)
    }
    
    if (memory.keyFacts.gapsIdentified.length > 0) {
        parts.push(`\nWEAKNESSES/GAPS DISCUSSED: ${memory.keyFacts.gapsIdentified.join(', ')}`)
    }
    
    if (memory.behavioralNotes.length > 0) {
        parts.push(`\nKEY THEMES: ${memory.behavioralNotes.join(', ')}`)
    }
    
    parts.push(`\n=== END ROUND ${currentRoundNumber} SUMMARY ===`)
    
    return parts.join('\n')
}

/**
 * Format multi-round memory with CLEAR ROUND LABELS
 */
function formatMultiRoundMemory(memory: MultiRoundMemory, currentRoundNumber: number): string {
    const parts: string[] = [`=== PREVIOUS ROUNDS CONTEXT (BEFORE ROUND ${currentRoundNumber}) ===
IMPORTANT: This is what the candidate ALREADY said in previous rounds.
Use this to maintain consistency - don't contradict what was said before.`]
    
    parts.push(`\nCandidate has completed ${memory.rounds.length} previous round(s):`)
    memory.rounds.forEach(round => {
        parts.push(`\n--- ROUND ${round.roundNumber}: ${round.roundName || round.interviewType} ---`)
        parts.push(`Date: ${new Date(round.date).toLocaleDateString()}`)
        parts.push(`Questions Asked: ${round.questionsAsked}`)
        if (round.outcome) parts.push(`Outcome: ${round.outcome}`)
        if (round.keyHighlights.length > 0) {
            parts.push(`Key Things Candidate Said:`)
            round.keyHighlights.forEach(h => parts.push(`  • ${h}`))
        }
        if (round.gapsIdentified.length > 0) {
            parts.push(`Areas Identified for Improvement: ${round.gapsIdentified.join(', ')}`)
        }
    })
    
    if (memory.consistentStrengths.length > 0) {
        parts.push(`\nCONSISTENT STRENGTHS ACROSS ROUNDS: ${memory.consistentStrengths.join('; ')}`)
    }
    
    if (memory.persistentGaps.length > 0) {
        parts.push(`\nPERSISTENT AREAS TO IMPROVE: ${memory.persistentGaps.join('; ')}`)
    }
    
    if (memory.improvementNotes.length > 0) {
        parts.push(`\nIMPROVEMENT TRAJECTORY: ${memory.improvementNotes.join('; ')}`)
    }
    
    if (memory.overallSummary) {
        parts.push(`\nOVERALL: ${memory.overallSummary}`)
    }
    
    parts.push(`\n=== END PREVIOUS ROUNDS CONTEXT ===`)
    
    return parts.join('\n')
}

/**
 * Save interview summary to database after interview completes
 */
export async function saveInterviewSummary(
    interviewId: string,
    userId: string,
    sessionMemory: SessionMemory,
    qas: { question: string; answer: string }[]
) {
    const supabase = createClient()
    
    const strengths = [
        ...sessionMemory.keyFacts.strengthsHighlighted,
        ...sessionMemory.keyFacts.achievementsMentioned
    ]
    
    const weaknesses = sessionMemory.keyFacts.gapsIdentified
    
    const keyInsights = sessionMemory.conversationSummary || 
        `${qas.length} questions answered. ` +
        (sessionMemory.keyFacts.achievementsMentioned.length > 0 ? `Achievements: ${sessionMemory.keyFacts.achievementsMentioned.join(', ')}. ` : '') +
        (sessionMemory.keyFacts.technicalSkillsVerified.length > 0 ? `Skills: ${sessionMemory.keyFacts.technicalSkillsVerified.join(', ')}. ` : '')
    
    const { error } = await supabase
        .from('interview_summaries')
        .upsert({
            interview_id: interviewId,
            user_id: userId,
            strengths: strengths,
            weaknesses: weaknesses,
            key_insights: keyInsights,
            question_count: qas.length,
            ai_adoption_rate: 1.0,
            created_at: new Date().toISOString(),
        }, {
            onConflict: 'interview_id'
        })
    
    if (error) {
        console.error('Error saving interview summary:', error)
    } else {
        console.log('✅ Interview summary saved:', { interviewId, questionCount: qas.length })
    }
}

/**
 * Load interview summaries for multi-round context
 */
export async function loadMultiRoundMemory(
    applicationId: string | null,
    companyId: string | null,
    userId: string,
    currentInterviewId: string
): Promise<MultiRoundMemory | null> {
    const supabase = createClient()
    
    let query = supabase
        .from('interviews')
        .select(`
            id,
            round_number,
            round_name,
            interview_type,
            created_at,
            interview_outcome,
            total_questions,
            interview_summaries(strengths, weaknesses, key_insights, question_count)
        `)
        .eq('user_id', userId)
        .neq('id', currentInterviewId)
        .order('round_number', { ascending: true })
    
    if (applicationId) {
        query = query.eq('application_id', applicationId)
    } else if (companyId) {
        query = query.eq('company_id', companyId)
    } else {
        return null
    }
    
    const { data: previousInterviews, error } = await query
    
    if (error || !previousInterviews || previousInterviews.length === 0) {
        return null
    }
    
    const memory: MultiRoundMemory = {
        rounds: [],
        improvementNotes: [],
        consistentStrengths: [],
        persistentGaps: [],
        overallSummary: '',
    }
    
    const allStrengths: string[] = []
    const allGaps: string[] = []
    
    previousInterviews.forEach((interview: any) => {
        const summary = interview.interview_summaries?.[0]
        
        memory.rounds.push({
            roundNumber: interview.round_number || 1,
            roundName: interview.round_name,
            interviewType: interview.interview_type,
            date: interview.created_at,
            outcome: interview.interview_outcome,
            keyHighlights: summary?.strengths || [],
            gapsIdentified: summary?.weaknesses || [],
            questionsAsked: summary?.question_count || interview.total_questions || 0,
        })
        
        if (summary?.strengths) allStrengths.push(...summary.strengths)
        if (summary?.weaknesses) allGaps.push(...summary.weaknesses)
    })
    
    memory.consistentStrengths = findFrequentItems(allStrengths, 2)
    memory.persistentGaps = findFrequentItems(allGaps, 2)
    
    if (memory.rounds.length > 1) {
        memory.overallSummary = await generateMultiRoundSummary(memory.rounds)
    } else {
        memory.overallSummary = `Completed ${memory.rounds.length} previous round.`
    }
    
    return memory
}

/**
 * Find items that appear frequently
 */
function findFrequentItems(items: string[], minCount: number): string[] {
    const counts = new Map<string, number>()
    items.forEach(item => {
        const key = item.toLowerCase().substring(0, 50)
        counts.set(key, (counts.get(key) || 0) + 1)
    })
    
    return Array.from(counts.entries())
        .filter(([_, count]) => count >= minCount)
        .sort((a, b) => b[1] - a[1])
        .map(([item, _]) => item)
}
