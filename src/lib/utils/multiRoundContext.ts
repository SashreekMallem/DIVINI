/**
 * Multi-Round Interview Context Management
 * 
 * This module handles loading and aggregating context from previous interview rounds
 * to provide seamless continuity across multiple rounds of the same application.
 * 
 * Based on production ATS best practices:
 * - Link interviews through application_id and company_id
 * - Aggregate Q&A, transcripts, and key themes from previous rounds
 * - Provide structured context summary for next-round interviewers
 */

import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'

type Interview = Database['public']['Tables']['interviews']['Row']
type Question = Database['public']['Tables']['questions']['Row']
type Transcript = Database['public']['Tables']['transcripts']['Row']
type GeneratedAnswer = Database['public']['Tables']['generated_answers']['Row']

export interface MultiRoundContext {
    // Previous rounds summary
    previousRounds: {
        roundNumber: number
        roundName: string | null
        interviewType: string
        date: string
        questionsAsked: number
        keyQuestions: string[]
        keyAnswers: string[]
    }[]
    
    // Aggregated Q&A from all previous rounds
    allPreviousQAs: {
        question: string
        answer: string
        round: number
        roundName: string | null
    }[]
    
    // Aggregated transcripts from all previous rounds
    allPreviousTranscripts: {
        speaker: string
        text: string
        round: number
    }[]
    
    // Key themes and patterns
    keyThemes: {
        achievementsHighlighted: string[]
        technicalSkillsVerified: string[]
        gapsIdentified: string[]
        questionsForNextRound: string[]
    }
    
    // Summary text for LLM context
    contextSummary: string
}

/**
 * Load all previous rounds for the same application/company
 */
export async function loadPreviousRounds(
    currentInterviewId: string,
    applicationId: string | null,
    companyId: string | null,
    userId: string
): Promise<MultiRoundContext> {
    const supabase = createClient()
    
    // Build query to find previous interviews
    let query = supabase
        .from('interviews')
        .select('id, round_number, round_name, interview_type, created_at, started_at')
        .eq('user_id', userId)
        .lt('created_at', new Date().toISOString()) // Only previous interviews
        .order('round_number', { ascending: true })
        .order('created_at', { ascending: true })
    
    // Filter by application_id if available (most specific)
    if (applicationId) {
        query = query.eq('application_id', applicationId)
    } else if (companyId) {
        // Fallback: link by company_id if no application_id
        query = query.eq('company_id', companyId)
    } else {
        // No linking possible - return empty context
        return getEmptyContext()
    }
    
    const { data: previousInterviews, error } = await query
    
    if (error || !previousInterviews || previousInterviews.length === 0) {
        console.log('📚 No previous rounds found for this application')
        return getEmptyContext()
    }
    
    // Filter out current interview
    const previousRoundsData = previousInterviews.filter(i => i.id !== currentInterviewId)
    
    if (previousRoundsData.length === 0) {
        console.log('📚 This is the first round - no previous context')
        return getEmptyContext()
    }
    
    console.log(`📚 Found ${previousRoundsData.length} previous round(s)`)
    
    // Load Q&A and transcripts for all previous rounds
    const previousRoundIds = previousRoundsData.map(i => i.id)
    
    const [questionsData, transcriptsData] = await Promise.all([
        // Load all questions from previous rounds
        supabase
            .from('questions')
            .select(`
                id,
                text,
                interview_id,
                created_at,
                generated_answers(answer_text)
            `)
            .in('interview_id', previousRoundIds)
            .order('created_at', { ascending: true }),
        
        // Load all transcripts from previous rounds
        supabase
            .from('transcripts')
            .select('*')
            .in('interview_id', previousRoundIds)
            .order('created_at', { ascending: true })
    ])
    
    // Map questions to rounds
    const questionsByRound = new Map<string, Question[]>()
    const answersByQuestion = new Map<string, GeneratedAnswer[]>()
    
    if (questionsData.data) {
        questionsData.data.forEach(q => {
            const interviewId = q.interview_id
            if (!questionsByRound.has(interviewId)) {
                questionsByRound.set(interviewId, [])
            }
            questionsByRound.get(interviewId)!.push(q as Question)
            
            // Store answers
            if ((q as any).generated_answers && (q as any).generated_answers.length > 0) {
                answersByQuestion.set(q.id, (q as any).generated_answers as GeneratedAnswer[])
            }
        })
    }
    
    // Map transcripts to rounds
    const transcriptsByRound = new Map<string, Transcript[]>()
    if (transcriptsData.data) {
        transcriptsData.data.forEach(t => {
            const interviewId = t.interview_id
            if (!transcriptsByRound.has(interviewId)) {
                transcriptsByRound.set(interviewId, [])
            }
            transcriptsByRound.get(interviewId)!.push(t as Transcript)
        })
    }
    
    // Build previous rounds summary
    const previousRounds = previousRoundsData.map(interview => {
        const roundQuestions = questionsByRound.get(interview.id) || []
        const roundTranscripts = transcriptsByRound.get(interview.id) || []
        
        // Extract key questions (first 5)
        const keyQuestions = roundQuestions
            .slice(0, 5)
            .map(q => q.text)
        
        // Extract key answers (first 3)
        const keyAnswers = roundQuestions
            .slice(0, 3)
            .map(q => {
                const answers = answersByQuestion.get(q.id) || []
                return answers[0]?.answer_text || ''
            })
            .filter(a => a.length > 0)
        
        return {
            roundNumber: interview.round_number || 1,
            roundName: interview.round_name,
            interviewType: interview.interview_type,
            date: interview.started_at || interview.created_at || '',
            questionsAsked: roundQuestions.length,
            keyQuestions,
            keyAnswers
        }
    })
    
    // Build aggregated Q&A
    const allPreviousQAs = previousRoundsData.flatMap(interview => {
        const roundQuestions = questionsByRound.get(interview.id) || []
        return roundQuestions.map(q => {
            const answers = answersByQuestion.get(q.id) || []
            return {
                question: q.text,
                answer: answers[0]?.answer_text || '',
                round: interview.round_number || 1,
                roundName: interview.round_name
            }
        }).filter(qa => qa.answer.length > 0) // Only include Q&As with answers
    })
    
    // Build aggregated transcripts
    const allPreviousTranscripts = previousRoundsData.flatMap(interview => {
        const roundTranscripts = transcriptsByRound.get(interview.id) || []
        return roundTranscripts.map(t => ({
            speaker: t.speaker === 'interviewer' ? 'Interviewer' : 'You',
            text: t.text,
            round: interview.round_number || 1
        }))
    })
    
    // Extract key themes (simple extraction - can be enhanced with AI)
    const keyThemes = extractKeyThemes(allPreviousQAs, allPreviousTranscripts)
    
    // Generate context summary for LLM
    const contextSummary = generateContextSummary(previousRounds, allPreviousQAs, keyThemes)
    
    return {
        previousRounds,
        allPreviousQAs,
        allPreviousTranscripts,
        keyThemes,
        contextSummary
    }
}

/**
 * Extract key themes from previous rounds
 */
function extractKeyThemes(
    qas: MultiRoundContext['allPreviousQAs'],
    transcripts: MultiRoundContext['allPreviousTranscripts']
): MultiRoundContext['keyThemes'] {
    // Simple extraction - can be enhanced with AI/NLP
    const achievementsHighlighted: string[] = []
    const technicalSkillsVerified: string[] = []
    const gapsIdentified: string[] = []
    const questionsForNextRound: string[] = []
    
    // Extract from Q&A
    qas.forEach(qa => {
        const q = qa.question.toLowerCase()
        const a = qa.answer.toLowerCase()
        
        // Look for achievement mentions
        if (q.includes('achievement') || q.includes('accomplishment') || q.includes('proud')) {
            achievementsHighlighted.push(qa.answer.substring(0, 200))
        }
        
        // Look for technical skills
        if (q.includes('technical') || q.includes('skill') || q.includes('technology') || q.includes('language')) {
            technicalSkillsVerified.push(qa.answer.substring(0, 150))
        }
        
        // Look for gaps/weaknesses
        if (q.includes('weakness') || q.includes('improve') || q.includes('challenge') || q.includes('difficult')) {
            gapsIdentified.push(qa.answer.substring(0, 200))
        }
    })
    
    // Extract from transcripts (interviewer questions)
    transcripts
        .filter(t => t.speaker === 'Interviewer')
        .slice(0, 10) // Last 10 interviewer questions
        .forEach(t => {
            questionsForNextRound.push(t.text)
        })
    
    return {
        achievementsHighlighted: [...new Set(achievementsHighlighted)].slice(0, 5),
        technicalSkillsVerified: [...new Set(technicalSkillsVerified)].slice(0, 5),
        gapsIdentified: [...new Set(gapsIdentified)].slice(0, 3),
        questionsForNextRound: [...new Set(questionsForNextRound)].slice(0, 5)
    }
}

/**
 * Generate human-readable context summary for LLM with CLEAR ROLE LABELS
 */
function generateContextSummary(
    previousRounds: MultiRoundContext['previousRounds'],
    allPreviousQAs: MultiRoundContext['allPreviousQAs'],
    keyThemes: MultiRoundContext['keyThemes']
): string {
    if (previousRounds.length === 0) {
        return ''
    }
    
    const parts: string[] = []
    
    parts.push(`=== PREVIOUS ROUNDS CONTEXT ===`)
    parts.push(`IMPORTANT: The candidate has completed ${previousRounds.length} previous round(s).`)
    parts.push(`The Q&A below shows what the candidate ALREADY SAID. Maintain consistency.`)
    parts.push('')
    
    // Previous rounds summary
    parts.push('COMPLETED ROUNDS:')
    previousRounds.forEach(round => {
        parts.push(`- ROUND_${round.roundNumber} (${round.roundName || round.interviewType}): ${round.questionsAsked} questions answered`)
    })
    parts.push('')
    
    // Key achievements
    if (keyThemes.achievementsHighlighted.length > 0) {
        parts.push('ACHIEVEMENTS CANDIDATE ALREADY MENTIONED:')
        keyThemes.achievementsHighlighted.forEach((achievement, i) => {
            parts.push(`• ${achievement}...`)
        })
        parts.push('')
    }
    
    // Technical skills
    if (keyThemes.technicalSkillsVerified.length > 0) {
        parts.push('SKILLS CANDIDATE ALREADY VERIFIED:')
        keyThemes.technicalSkillsVerified.forEach((skill, i) => {
            parts.push(`• ${skill}...`)
        })
        parts.push('')
    }
    
    // Gaps identified
    if (keyThemes.gapsIdentified.length > 0) {
        parts.push('AREAS CANDIDATE ACKNOWLEDGED FOR IMPROVEMENT:')
        keyThemes.gapsIdentified.forEach((gap, i) => {
            parts.push(`• ${gap}...`)
        })
        parts.push('')
    }
    
    // Previous Q&A with clear labels
    if (allPreviousQAs.length > 0) {
        parts.push('Q&A FROM PREVIOUS ROUNDS (what candidate already said):')
        allPreviousQAs.slice(-5).forEach((qa, i) => {
            parts.push(`INTERVIEWER_QUESTION_ROUND${qa.round}: ${qa.question}`)
            parts.push(`AI_SUGGESTED_ANSWER_ROUND${qa.round}: ${qa.answer.substring(0, 150)}...`)
            parts.push('')
        })
    }
    
    parts.push('=== END PREVIOUS ROUNDS ===')
    
    return parts.join('\n')
}

/**
 * Return empty context structure
 */
function getEmptyContext(): MultiRoundContext {
    return {
        previousRounds: [],
        allPreviousQAs: [],
        allPreviousTranscripts: [],
        keyThemes: {
            achievementsHighlighted: [],
            technicalSkillsVerified: [],
            gapsIdentified: [],
            questionsForNextRound: []
        },
        contextSummary: ''
    }
}

