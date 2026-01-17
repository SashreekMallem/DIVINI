'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
    Mic,
    Square,
    Loader2,
    MessageSquare,
    Sparkles,
    Clock,
    ChevronLeft,
    Volume2,
    AlertCircle,
    FileText,
    Briefcase,
    ShieldAlert,
    EyeOff,
    Building2,
    RefreshCw,
    Settings,
    Monitor
} from 'lucide-react'
import type { Interview, Resume, JobDescription, Company } from '@/types/database'
import { screenShareManager } from '@/lib/utils/screenShareManager'
import { loadPreviousRounds, type MultiRoundContext } from '@/lib/utils/multiRoundContext'
import {
    buildSmartContext,
    generateSessionMemory,
    saveInterviewSummary,
    loadMultiRoundMemory,
    type SessionMemory,
    type MultiRoundMemory
} from '@/lib/utils/smartContextManager'
import { useDeepgram } from '@/lib/hooks/useDeepgram'

interface CoachingEntry {
    id: string
    questionId: string
    question: string
    answer: string
    timestamp: Date
}

interface InterviewWithRelations extends Interview {
    resumes?: Resume
    job_descriptions?: JobDescription
    companies?: Company
}

export default function InterviewSessionPage() {
    const params = useParams()
    const router = useRouter()
    const supabase = createClient()
    const transcriptRef = useRef<HTMLDivElement>(null)
    const coachingRef = useRef<HTMLDivElement>(null)

    const [interview, setInterview] = useState<InterviewWithRelations | null>(null)
    const [resume, setResume] = useState<Resume | null>(null)
    const [jobDescription, setJobDescription] = useState<JobDescription | null>(null)
    const [company, setCompany] = useState<Company | null>(null)
    const [loading, setLoading] = useState(true)
    const [isRecording, setIsRecording] = useState(false)
    const [elapsedTime, setElapsedTime] = useState(0)
    const [error, setError] = useState<string | null>(null)
    // const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected') // Replaced by hook

    const [showContext, setShowContext] = useState(false)
    const [isStealthMode, setIsStealthMode] = useState(false)

    const [transcriptSegments, setTranscriptSegments] = useState<{ id: string, speaker: 'You' | 'Interviewer', text: string, timestamp: number }[]>([])
    const [transcript, setTranscript] = useState<string>('') // Keep for legacy/AI prompt context
    const [partialTranscript, setPartialTranscript] = useState<string>('')
    const [coaching, setCoaching] = useState<CoachingEntry[]>([])
    const [isGenerating, setIsGenerating] = useState(false)
    const [multiRoundContext, setMultiRoundContext] = useState<MultiRoundContext | null>(null)

    // Smart Context Management
    const [sessionMemory, setSessionMemory] = useState<SessionMemory | null>(null)
    const [multiRoundMemory, setMultiRoundMemory] = useState<MultiRoundMemory | null>(null)

    // Audio Settings
    const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([])
    const [selectedMicId, setSelectedMicId] = useState<string>('')
    const [useSystemAudio, setUseSystemAudio] = useState(false) // Toggle for Dual Channel
    const [showAudioSettings, setShowAudioSettings] = useState(false)

    const socketRef = useRef<WebSocket | null>(null)
    const timerRef = useRef<NodeJS.Timeout | null>(null)
    const audioContextRef = useRef<AudioContext | null>(null)
    const streamRef = useRef<MediaStream | null>(null)
    const userId = useRef<string | null>(null)
    // For cancel/restart pattern: abort in-flight LLM requests when new speech comes in
    const abortControllerRef = useRef<AbortController | null>(null)

    useEffect(() => {
        loadInterview()

        // Load Audio Devices
        const getDevices = async () => {
            try {
                // Request permission first to get labels
                await navigator.mediaDevices.getUserMedia({ audio: true })
                const devices = await navigator.mediaDevices.enumerateDevices()
                const audioInputs = devices.filter(d => d.kind === 'audioinput')
                setAudioDevices(audioInputs)
                if (audioInputs.length > 0) {
                    setSelectedMicId(audioInputs[0].deviceId)
                }
            } catch (e) {
                console.error('Error listing devices:', e)
            }
        }
        getDevices()

        // Initialize Stealth Mode Manager
        screenShareManager.init((isStealth) => {
            setIsStealthMode(isStealth)
        })

        return () => {
            cleanup()
            screenShareManager.cleanup()
        }
    }, [])

    const cleanup = () => {
        if (timerRef.current) clearInterval(timerRef.current)
        disconnect() // Use hook's disconnect
        // screenShareManager handled separately
    }

    const loadInterview = async () => {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
            userId.current = user.id
        }

        // Fetch interview with all related data
        const { data: interviewData } = await supabase
            .from('interviews')
            .select(`
        *,
        resumes (*),
        job_descriptions (*),
        companies (*)
      `)
            .eq('id', params.id)
            .single()

        if (interviewData) {
            setInterview(interviewData as InterviewWithRelations)

            // Set related data
            if (interviewData.resumes) {
                setResume(interviewData.resumes as Resume)
                console.log('Resume loaded:', interviewData.resumes.title, 'Content length:', interviewData.resumes.content?.length)
            }
            if (interviewData.job_descriptions) {
                setJobDescription(interviewData.job_descriptions as JobDescription)
                console.log('JD loaded:', interviewData.job_descriptions.role_title)
            }
            if (interviewData.companies) {
                setCompany(interviewData.companies as Company)
                console.log('Company loaded:', interviewData.companies.name)
            }

            // LOAD HISTORY: Q&A
            const { data: qData } = await supabase
                .from('questions')
                .select('id, text, created_at, generated_answers(answer_text)')
                .eq('interview_id', params.id)
                .order('created_at', { ascending: true })

            if (qData) {
                const historyEntries: CoachingEntry[] = qData.map(q => ({
                    id: q.id,
                    questionId: q.id,
                    question: q.text,
                    answer: q.generated_answers?.[0]?.answer_text || 'Thinking...',
                    timestamp: new Date(q.created_at)
                }))
                setCoaching(historyEntries)
            }

            // LOAD HISTORY: Transcripts
            const { data: tData } = await supabase
                .from('transcripts')
                .select('*')
                .eq('interview_id', params.id)
                .order('created_at', { ascending: true })

            if (tData) {
                const segments = tData.map(t => ({
                    id: t.id,
                    speaker: (t.speaker === 'interviewer' ? 'Interviewer' : 'You') as 'You' | 'Interviewer',
                    text: t.text,
                    timestamp: new Date(t.created_at).getTime()
                }))
                setTranscriptSegments(segments)

                // Also update the flat transcript text for AI context
                const flatText = tData.map(t => `${t.speaker}: ${t.text}`).join('\n')
                setTranscript(flatText)
            }

            // LOAD MULTI-ROUND CONTEXT: Previous rounds for same application/company
            if (user && interviewData) {
                // Legacy context (still useful for raw data access)
                const context = await loadPreviousRounds(
                    params.id as string,
                    interviewData.application_id || null,
                    interviewData.company_id || null,
                    user.id
                )
                setMultiRoundContext(context)

                // Smart multi-round memory (uses summaries, not raw Q&A)
                const smartMemory = await loadMultiRoundMemory(
                    interviewData.application_id || null,
                    interviewData.company_id || null,
                    user.id,
                    params.id as string
                )
                setMultiRoundMemory(smartMemory)

                if (smartMemory && smartMemory.rounds.length > 0) {
                    console.log(`📚 Smart multi-round memory loaded: ${smartMemory.rounds.length} previous round(s)`)
                    console.log(`📚 Consistent strengths: ${smartMemory.consistentStrengths.join(', ')}`)
                    console.log(`📚 Persistent gaps: ${smartMemory.persistentGaps.join(', ')}`)
                } else if (context.previousRounds.length > 0) {
                    console.log(`📚 Multi-round context loaded: ${context.previousRounds.length} previous round(s)`)
                    console.log(`📚 Previous Q&As: ${context.allPreviousQAs.length}`)
                } else {
                    console.log('📚 This is the first round - no previous context')
                }
            }
        }
        setLoading(false)
    }

    // Detect if text is likely a question (for intelligent Gemini triggering)
    const detectQuestion = useCallback((text: string): boolean => {
        if (!text || text.length < 10) return false

        const lowerText = text.toLowerCase().trim()

        // Patterns that indicate a question
        const questionPatterns = [
            // Direct question marks
            /\?$/,
            // Question starters
            /^(tell me|describe|explain|what|how|why|when|where|who|can you|could you|would you|have you|do you|did you|are you|were you|is there|was there)/i,
            // Interview-specific patterns
            /^(walk me through|give me an example|share|what's your|what is your|talk about|discuss)/i,
            // Behavioral questions
            /^(tell me about a time|describe a situation|give an example of when)/i,
            // Technical questions
            /^(how would you|what approach|what's the difference|explain the)/i,
        ]

        return questionPatterns.some(pattern => pattern.test(lowerText))
    }, [])

    const saveQuestion = async (questionText: string): Promise<string | null> => {
        if (!userId.current) return null

        const { data, error } = await supabase
            .from('questions')
            .insert({
                interview_id: params.id as string,
                user_id: userId.current,
                text: questionText,
                detected_at: new Date().toISOString(),
                timestamp_ms: elapsedTime * 1000,
                company_id: interview?.company_id,
            })
            .select('id')
            .single()

        if (error) {
            console.error('Error saving question:', error)
            return null
        }
        return data?.id || null
    }

    const saveGeneratedAnswer = async (questionId: string, answerText: string) => {
        if (!userId.current) {
            console.error('❌ Cannot save answer: userId not set')
            return
        }

        if (!questionId) {
            console.error('❌ Cannot save answer: questionId is missing')
            return
        }

        console.log('💾 Saving generated answer to database:', {
            questionId,
            interviewId: params.id,
            userId: userId.current,
            answerLength: answerText.length
        })

        const { data, error } = await supabase.from('generated_answers').insert({
            interview_id: params.id as string,
            user_id: userId.current,
            question_id: questionId,
            answer_text: answerText,
            model_used: 'gemini-2.0-flash',
        }).select('id')

        if (error) {
            console.error('❌ Error saving generated answer:', error)
        } else {
            console.log('✅ Generated answer saved successfully:', data?.[0]?.id)
        }
    }

    const saveTranscriptSegment = async (text: string, speaker: string = 'interviewer') => {
        await supabase.from('transcripts').insert({
            interview_id: params.id as string,
            text,
            speaker,
            timestamp_ms: elapsedTime * 1000,
            is_final: true,
        })
    }

    const generateAnswer = useCallback(async (question: string) => {
        if (isGenerating) return

        // 1. Save question to DB (for coaching summary)
        const questionId = await saveQuestion(question)

        // 2. Transcripts are now saved globally in onmessage, so no duplicate save here

        setIsGenerating(true)
        try {
            // SMART CONTEXT MANAGEMENT: Only last 10 Q&A + summaries
            const currentSessionQAs = coaching.map(c => ({
                question: c.question,
                answer: c.answer
            }))

            // Update session memory every 10 Q&A for compression
            let updatedSessionMemory = sessionMemory
            if (currentSessionQAs.length >= 10 && currentSessionQAs.length % 5 === 0) {
                console.log('🧠 Updating session memory (Q&A count:', currentSessionQAs.length, ')')
                updatedSessionMemory = await generateSessionMemory(currentSessionQAs, sessionMemory)
                setSessionMemory(updatedSessionMemory)
            }

            // Build smart context with clear role definitions
            const { contextParts } = buildSmartContext({
                resumeContent: resume?.content || '',
                jobDescription: jobDescription?.content || '',
                companyName: company?.name || '',
                companyCulture: company?.culture_notes || '',
                interviewType: interview?.interview_type || 'behavioral',
                currentRoundNumber: interview?.round_number || 1,
                allQAs: currentSessionQAs,
                currentTranscript: transcriptSegments.map(s => `${s.speaker}: ${s.text}`).join('\n'),
                sessionMemory: updatedSessionMemory,
                multiRoundMemory: multiRoundMemory,
            })

            // Log smart context
            console.log('🧠 Smart Context:', {
                currentRound: interview?.round_number || 1,
                contextParts: contextParts.length,
                sessionQACount: currentSessionQAs.length,
                hasSessionMemory: !!updatedSessionMemory,
                hasMultiRoundMemory: !!multiRoundMemory,
            })

            // Build context for API (using smart context)
            const contextData = {
                question,
                smartContext: contextParts.join('\n\n---\n\n'), // Use smart context
                resumeContent: resume?.content || '',
                jobDescription: jobDescription?.content || '',
                companyName: company?.name || '',
                companyCulture: company?.culture_notes || '',
                interviewType: interview?.interview_type || 'behavioral',
                history: currentSessionQAs.slice(-10), // Only last 10 for direct history
                transcript: transcriptSegments.slice(-20).map(s => `${s.speaker}: ${s.text}`).join('\n'), // Last 20 lines
            }

            console.log('📋 Context sent to Gemini:', {
                round: interview?.round_number || 1,
                hasResume: !!contextData.resumeContent,
                hasJobDescription: !!contextData.jobDescription,
                companyName: contextData.companyName,
                historyCount: contextData.history.length,
                smartContextLength: contextData.smartContext.length,
            })

            // CANCEL/RESTART PATTERN: Abort any in-flight request before starting new one
            if (abortControllerRef.current) {
                console.log('⏹️ Cancelling previous LLM request...')
                abortControllerRef.current.abort()
            }
            abortControllerRef.current = new AbortController()

            const response = await fetch('/api/generate-answer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(contextData),
                signal: abortControllerRef.current.signal,
            })

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                throw new Error(errorData.error || 'Failed to generate answer')
            }
            const data = await response.json()

            console.log('✅ Answer received from Gemini:', {
                answerLength: data.answer?.length || 0,
                questionId: questionId || 'missing',
                usage: data.usage
            })

            // Track API usage for billing
            if (data.usage && userId.current) {
                supabase.from('api_usage').insert({
                    user_id: userId.current,
                    api_type: 'gemini_answer',
                    input_tokens: data.usage.inputTokens || 0,
                    output_tokens: data.usage.outputTokens || 0,
                    cost_cents: data.usage.costCents || 0,
                    interview_id: params.id as string
                }).then(() => console.log('📊 Usage tracked'))
            }

            // Save generated answer to DB
            if (questionId && data.answer) {
                await saveGeneratedAnswer(questionId, data.answer)
            } else {
                console.warn('⚠️ Skipping save - questionId or answer missing:', { questionId, hasAnswer: !!data.answer })
            }

            setCoaching(prev => [...prev, {
                id: Date.now().toString(),
                questionId: questionId || '',
                question,
                answer: data.answer,
                timestamp: new Date(),
            }])

            setTimeout(() => {
                coachingRef.current?.scrollTo({ top: coachingRef.current.scrollHeight, behavior: 'smooth' })
            }, 100)
        } catch (err: any) {
            // Don't log abort errors - they're intentional from cancel/restart pattern
            if (err?.name === 'AbortError') {
                console.log('⏹️ LLM request aborted (new request started)')
                return // Exit silently, new request is in progress
            }
            console.error('Error generating answer:', err)
        } finally {
            setIsGenerating(false)
        }
    }, [isGenerating, resume, jobDescription, company, interview, coaching, transcriptSegments, multiRoundMemory])

    // SERVERLESS ARCHITECTURE: Use Deepgram Hook (Direct Client -> Deepgram)
    const { connect, startStreaming, disconnect, status: connectionStatus } = useDeepgram({
        onTranscript: (text, isFinal, speaker) => {
            if (isFinal) {
                const segmentId = `${Date.now()}-${speaker}`
                setTranscriptSegments(prev => {
                    const last = prev[prev.length - 1]
                    if (last && last.text === text && last.speaker === speaker) return prev
                    return [...prev, {
                        id: segmentId,
                        speaker,
                        text,
                        timestamp: Date.now()
                    }]
                })
                setTranscript(prev => prev + (prev ? '\n' : '') + `${speaker}: ${text}`)
                setPartialTranscript('') // Clear partial on final

                // Save to DB
                const dbSpeaker = speaker === 'You' ? 'candidate' : 'interviewer'
                saveTranscriptSegment(text, dbSpeaker)
            } else {
                setPartialTranscript(text)
            }

            // Auto-scroll
            if (transcriptRef.current) {
                transcriptRef.current.scrollTo({ top: transcriptRef.current.scrollHeight, behavior: 'smooth' })
            }
        },
        onUtteranceEnd: () => {
            // Trigger Gemini on UtteranceEnd (Speech stopped)
            // accessing state directly here might be stale if not careful, 
            // but we can use the transcript saved in state or passed in callback?
            // Actually, page.tsx doesn't track accumulated transcript well outside of segments.
            // Let's rely on the fact that if UtteranceEnd fires, the last "final" transcript was the end.
            // A better way is to pass the text to onUtteranceEnd in the hook, but for now let's just trigger logic.
            // We'll use a ref to track the last final text if needed, or just let 'detectQuestion' run on latest segment?
            // Simplified: The previous logic triggered generateAnswer(accumulatedTranscript).
            // Let's modify useDeepgram to return the current transcript/utterance?
            // Or simpler: Just rely on the last segment added.

            // NOTE: Ideally we want to pass the text that just ended. 
            // For now, let's look at the last added segment.
            setTranscriptSegments(prev => {
                const last = prev[prev.length - 1]
                if (last && last.speaker === 'Interviewer' && detectQuestion(last.text)) {
                    console.log('⚡ Detected question (Serverless) - Triggering Gemini!')
                    generateAnswer(last.text)
                } else if (last && last.speaker === 'You') {
                    // Check if 'You' asked a question (maybe self-practice?)
                    // Usually we only trigger on Interviewer, but if using Mic-only mode, 'You' might be roleplaying.
                    // The original logic checked if speaker === 'Interviewer' OR !useSystemAudio.
                    if (!useSystemAudio && detectQuestion(last.text)) {
                        console.log('⚡ Detected question (Mic Only) - Triggering Gemini!')
                        generateAnswer(last.text)
                    }
                }
                return prev
            })
        },
        onError: (err) => {
            setError(err)
            // setConnectionStatus('disconnected') // Managed by hook
        }
    })

    const startRecording = async () => {
        setError(null)
        setShowAudioSettings(false)

        try {
            await connect()
        } catch (e: any) {
            setError(e.message)
        }
    }

    // Effect to start streaming once connected
    useEffect(() => {
        if (connectionStatus === 'connected' && !isRecording) {
            console.log('🎙️ Starting audio streaming (Serverless)...')
            startStreaming(selectedMicId)
            setIsRecording(true)
            timerRef.current = setInterval(() => setElapsedTime(prev => prev + 1), 1000)

            if (interview?.id) {
                supabase.from('interviews').update({
                    session_status: 'in_progress',
                    started_at: new Date().toISOString()
                }).eq('id', interview.id)
            }
        }
    }, [connectionStatus, isRecording, startStreaming, selectedMicId, interview?.id, supabase])

    // Note: Legacy audio processing functions removed in favor of useDeepgram hook


    const endInterview = async () => {
        cleanup()
        setIsRecording(false)
        setIsRecording(false)
        // setConnectionStatus('disconnected') // Managed by hook

        // FLUSH PARTIAL TRANSCRIPT: If there's pending text, save it as a final segment
        if (partialTranscript.trim()) {
            const text = partialTranscript.trim()
            // Default to 'You' for flushed segments as we can't determine speaker easily without WS data
            // Or use the last speaker if available. Safe default is 'You' (Candidate).
            const speaker = 'You'

            setTranscriptSegments(prev => [...prev, {
                id: Date.now().toString(),
                speaker: speaker as 'You' | 'Interviewer',
                text: text,
                timestamp: Date.now()
            }])

            setTranscript(prev => prev + (prev ? '\n' : '') + text)

            // Persist the flushed segment
            await saveTranscriptSegment(text, 'candidate')
        }

        // Clear partial to remove "Listening..." UI immediately
        setPartialTranscript('')

        // SMART CONTEXT: Generate final session summary
        const currentSessionQAs = coaching.map(c => ({
            question: c.question,
            answer: c.answer
        }))

        if (currentSessionQAs.length > 0 && userId.current) {
            console.log('🧠 Generating final interview summary...')
            const finalMemory = await generateSessionMemory(currentSessionQAs, sessionMemory)
            setSessionMemory(finalMemory)

            // Save summary to database for future multi-round context
            await saveInterviewSummary(
                params.id as string,
                userId.current,
                finalMemory,
                currentSessionQAs
            )
            console.log('✅ Interview summary saved:', {
                questionCount: currentSessionQAs.length,
                achievements: finalMemory.keyFacts.achievementsMentioned.length,
                gaps: finalMemory.keyFacts.gapsIdentified.length,
            })
        }

        // Update interview with final data
        await supabase.from('interviews').update({
            session_status: 'completed',
            ended_at: new Date().toISOString(),
            actual_duration_seconds: elapsedTime,
            total_questions: coaching.length,
            total_answers_generated: coaching.length,
        }).eq('id', params.id)

        // Update local state to show completed view
        setInterview(prev => prev ? { ...prev, session_status: 'completed' } : null)
    }

    const resumeInterview = async () => {
        setLoading(true)
        await supabase.from('interviews').update({
            session_status: 'in_progress'
        }).eq('id', params.id)

        setInterview(prev => prev ? { ...prev, session_status: 'in_progress' } : null)

        // Reload history when resuming to ensure we have latest Q&A and transcripts
        await loadInterview()
        setLoading(false)
    }

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }

    const cardStyle = {
        background: 'linear-gradient(135deg, rgba(24, 24, 27, 0.8) 0%, rgba(24, 24, 27, 0.4) 100%)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        borderRadius: '20px',
    }

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
                <Loader2 style={{ width: '32px', height: '32px', color: '#6366f1', animation: 'spin 1s linear infinite' }} />
            </div>
        )
    }

    const hasContext = resume?.content || jobDescription?.content || company?.name
    const hasMultiRoundContext = multiRoundContext && multiRoundContext.previousRounds.length > 0

    // STEALTH MODE: Render absolutely nothing (blank screen) if active.
    // Logic hooks (audio, etc.) above still run.
    if (isStealthMode) {
        return <div style={{ minHeight: '100vh', background: 'black' }} />
    }

    return (
        <div style={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <button onClick={() => router.push('/interviews')} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: 'rgba(39, 39, 42, 0.8)', border: 'none', borderRadius: '10px', color: '#a1a1aa', fontSize: '14px', cursor: 'pointer' }}>
                        <ChevronLeft style={{ width: '16px', height: '16px' }} /> Back
                    </button>
                    <div>
                        <h1 style={{ fontSize: '22px', fontWeight: 600 }}>{interview?.round_name || 'Interview Session'}</h1>
                        <p style={{ fontSize: '13px', color: '#71717a' }}>
                            {company?.name && `${company.name} • `}
                            {jobDescription?.role_title && `${jobDescription.role_title} • `}
                            {interview?.interview_type?.replace('_', ' ')}
                        </p>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {/* Audio Settings Toggle */}
                    <button onClick={() => setShowAudioSettings(!showAudioSettings)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', background: showAudioSettings ? 'rgba(255, 255, 255, 0.1)' : 'rgba(39, 39, 42, 0.8)', border: '1px solid transparent', borderRadius: '10px', color: 'white', fontSize: '13px', cursor: 'pointer' }}>
                        <Settings style={{ width: '14px', height: '14px' }} /> Audio
                    </button>

                    {/* Context Toggle */}
                    <button onClick={() => setShowContext(!showContext)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', background: showContext ? 'rgba(99, 102, 241, 0.2)' : 'rgba(39, 39, 42, 0.8)', border: showContext ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid transparent', borderRadius: '10px', color: showContext ? '#6366f1' : '#a1a1aa', fontSize: '13px', cursor: 'pointer' }}>
                        <FileText style={{ width: '14px', height: '14px' }} /> Context
                    </button>

                    {/* Audio Settings Panel (Absolute) */}
                    {showAudioSettings && (
                        <div style={{ position: 'absolute', top: '70px', right: '140px', background: '#18181b', border: '1px solid #3f3f46', borderRadius: '12px', padding: '16px', zIndex: 50, width: '300px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
                            <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'white', marginBottom: '12px' }}>Audio Configuration</h3>

                            <div style={{ marginBottom: '12px' }}>
                                <label style={{ display: 'block', fontSize: '12px', color: '#a1a1aa', marginBottom: '6px' }}>Your Microphone</label>
                                <select
                                    value={selectedMicId}
                                    onChange={(e) => setSelectedMicId(e.target.value)}
                                    style={{ width: '100%', background: '#27272a', border: '1px solid #3f3f46', borderRadius: '8px', padding: '8px', color: 'white', fontSize: '13px' }}
                                >
                                    {audioDevices.map(d => (
                                        <option key={d.deviceId} value={d.deviceId}>{d.label || `Microphone ${d.deviceId.slice(0, 5)}...`}</option>
                                    ))}
                                </select>
                            </div>

                            <div style={{ marginBottom: '12px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={useSystemAudio}
                                        onChange={(e) => setUseSystemAudio(e.target.checked)}
                                        style={{ width: '16px', height: '16px', accentColor: '#6366f1' }}
                                    />
                                    <span style={{ fontSize: '13px', color: 'white' }}>Capture System Audio (Dual Channel)</span>
                                </label>
                                <p style={{ fontSize: '11px', color: '#71717a', marginTop: '4px', marginLeft: '24px' }}>
                                    Required for AI to hear the interviewer. When you start recording, you'll see a browser dialog to:
                                    <br />1. Select the tab where your interview is (Zoom, Teams, etc.)
                                    <br />2. Check "Share tab audio" checkbox
                                    <br />3. Click "Share"
                                </p>
                            </div>

                            <div style={{ padding: '8px', background: 'rgba(234, 179, 8, 0.1)', borderRadius: '6px', border: '1px solid rgba(234, 179, 8, 0.2)' }}>
                                <p style={{ fontSize: '11px', color: '#fbbf24' }}>
                                    Tip: Provide distinct sources for "You" and "Interviewer" for best results.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Connection Status or Completed Status */}
                    {interview?.session_status === 'completed' ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ padding: '8px 12px', background: 'rgba(39, 39, 42, 0.5)', borderRadius: '8px', color: '#a1a1aa', fontSize: '13px', fontWeight: 500, border: '1px solid rgba(255,255,255,0.1)' }}>
                                Session Completed
                            </div>
                            <button onClick={resumeInterview} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.2)', borderRadius: '12px', color: '#818cf8', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
                                <RefreshCw style={{ width: '16px', height: '16px' }} /> Resume
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Connection Status */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: connectionStatus === 'connected' ? 'rgba(34, 197, 94, 0.1)' : connectionStatus === 'connecting' ? 'rgba(234, 179, 8, 0.1)' : 'rgba(113, 113, 122, 0.1)', borderRadius: '8px', fontSize: '12px', color: connectionStatus === 'connected' ? '#22c55e' : connectionStatus === 'connecting' ? '#eab308' : '#71717a' }}>
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: connectionStatus === 'connected' ? '#22c55e' : connectionStatus === 'connecting' ? '#eab308' : '#71717a' }} />
                                {connectionStatus === 'connected' ? 'Live' : connectionStatus === 'connecting' ? 'Connecting...' : 'Ready'}
                            </div>

                            {/* Timer */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: isRecording ? 'rgba(239, 68, 68, 0.1)' : 'rgba(39, 39, 42, 0.8)', borderRadius: '10px', fontFamily: 'monospace', fontSize: '16px', fontWeight: 600, color: isRecording ? '#ef4444' : 'white' }}>
                                <Clock style={{ width: '16px', height: '16px' }} />
                                {formatTime(elapsedTime)}
                                {isRecording && <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', animation: 'pulse 1s infinite' }} />}
                            </div>

                            {!isRecording ? (
                                <button onClick={startRecording} disabled={connectionStatus === 'connecting'} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: 'linear-gradient(135deg, #22c55e, #16a34a)', border: 'none', borderRadius: '12px', color: 'white', fontSize: '14px', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 16px rgba(34, 197, 94, 0.3)' }}>
                                    <Mic style={{ width: '16px', height: '16px' }} /> Start
                                </button>
                            ) : (
                                <button onClick={endInterview} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: 'linear-gradient(135deg, #ef4444, #dc2626)', border: 'none', borderRadius: '12px', color: 'white', fontSize: '14px', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 16px rgba(239, 68, 68, 0.3)' }}>
                                    <Square style={{ width: '16px', height: '16px' }} /> End
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Errors and Warnings */}
            {error && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '10px', marginBottom: '12px', color: '#ef4444', fontSize: '13px' }}>
                    <AlertCircle style={{ width: '16px', height: '16px' }} /> {error}
                </div>
            )}

            {!hasContext && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.2)', borderRadius: '10px', marginBottom: '12px', color: '#eab308', fontSize: '13px' }}>
                    <AlertCircle style={{ width: '16px', height: '16px' }} />
                    No resume, JD, or company linked. AI coaching will be generic. Add context in interview setup.
                </div>
            )}

            {hasMultiRoundContext && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.2)', borderRadius: '10px', marginBottom: '12px', color: '#818cf8', fontSize: '13px' }}>
                    <Sparkles style={{ width: '16px', height: '16px' }} />
                    <span>
                        <strong>Multi-Round Context Active:</strong> {multiRoundContext.previousRounds.length} previous round(s) loaded.
                        AI will reference previous Q&A and avoid repeating questions.
                    </span>
                </div>
            )}

            {/* Context Panel */}
            {showContext && (
                <div style={{ ...cardStyle, padding: '16px', marginBottom: '12px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: '#6366f1' }}>
                            <FileText style={{ width: '14px', height: '14px' }} />
                            <span style={{ fontWeight: 600, fontSize: '13px' }}>Resume</span>
                        </div>
                        <p style={{ fontSize: '12px', color: '#a1a1aa', maxHeight: '80px', overflow: 'auto' }}>
                            {resume?.content ? `${resume.content.substring(0, 200)}...` : 'No resume linked'}
                        </p>
                    </div>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: '#a855f7' }}>
                            <Briefcase style={{ width: '14px', height: '14px' }} />
                            <span style={{ fontWeight: 600, fontSize: '13px' }}>Job Description</span>
                        </div>
                        <p style={{ fontSize: '12px', color: '#a1a1aa', maxHeight: '80px', overflow: 'auto' }}>
                            {jobDescription?.content ? `${jobDescription.content.substring(0, 200)}...` : 'No JD linked'}
                        </p>
                    </div>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: '#22c55e' }}>
                            <Building2 style={{ width: '14px', height: '14px' }} />
                            <span style={{ fontWeight: 600, fontSize: '13px' }}>Company</span>
                        </div>
                        <p style={{ fontSize: '12px', color: '#a1a1aa' }}>
                            {company?.culture_notes && <span style={{ display: 'block', marginTop: '2px', opacity: 0.7 }} className="line-clamp-1">{company.culture_notes}</span>}
                        </p>
                    </div>
                </div>
            )}

            {/* Main Content - 2 Column */}
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', minHeight: 0 }}>
                {/* Transcript Panel */}
                <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                        <Volume2 style={{ width: '16px', height: '16px', color: '#6366f1' }} />
                        <h2 style={{ fontSize: '14px', fontWeight: 600 }}>Live Transcript</h2>
                        {isRecording && <span style={{ marginLeft: 'auto', padding: '3px 8px', background: 'rgba(34, 197, 94, 0.1)', borderRadius: '6px', fontSize: '11px', color: '#22c55e' }}>Listening...</span>}
                    </div>

                    <div ref={transcriptRef} style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {transcriptSegments.length > 0 || partialTranscript ? (
                            <>
                                {transcriptSegments.map((seg) => (
                                    <div key={seg.id} style={{
                                        alignSelf: seg.speaker === 'You' ? 'flex-end' : 'flex-start',
                                        maxWidth: '85%',
                                        padding: '10px 14px',
                                        borderRadius: '16px',
                                        borderTopRightRadius: seg.speaker === 'You' ? '4px' : '16px',
                                        borderTopLeftRadius: seg.speaker === 'Interviewer' ? '4px' : '16px',
                                        background: seg.speaker === 'You' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(39, 39, 42, 0.6)',
                                        border: seg.speaker === 'You' ? '1px solid rgba(99, 102, 241, 0.2)' : '1px solid rgba(255, 255, 255, 0.05)',
                                    }}>
                                        <p style={{ fontSize: '11px', color: seg.speaker === 'You' ? '#818cf8' : '#a1a1aa', marginBottom: '4px', fontWeight: 600 }}>
                                            {seg.speaker === 'You' ? 'You' : 'Interviewer'}
                                        </p>
                                        <p style={{ fontSize: '14px', color: '#e4e4e7', lineHeight: 1.5 }}>{seg.text}</p>
                                    </div>
                                ))}

                                {partialTranscript && (
                                    <div style={{
                                        alignSelf: 'center',
                                        width: '100%',
                                        padding: '10px 14px',
                                        background: 'transparent',
                                        border: '1px dashed rgba(255, 255, 255, 0.1)',
                                        borderRadius: '12px',
                                        marginTop: '8px'
                                    }}>
                                        <p style={{ fontSize: '11px', color: '#71717a', marginBottom: '4px', textAlign: 'center' }}>Listening...</p>
                                        <p style={{ fontSize: '14px', color: '#a1a1aa', lineHeight: 1.5, textAlign: 'center', fontStyle: 'italic' }}>
                                            {partialTranscript}
                                        </p>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                                <div>
                                    <MessageSquare style={{ width: '40px', height: '40px', color: '#3f3f46', margin: '0 auto 12px' }} />
                                    <p style={{ color: '#71717a', fontSize: '13px' }}>{isRecording ? 'Listening for speech...' : 'Click Start to begin'}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Coaching Panel */}
                <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                        <Sparkles style={{ width: '16px', height: '16px', color: '#a855f7' }} />
                        <h2 style={{ fontSize: '14px', fontWeight: 600 }}>AI Coaching</h2>
                        <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#71717a' }}>{coaching.length} answers</span>
                        {isGenerating && <Loader2 style={{ width: '14px', height: '14px', color: '#a855f7', animation: 'spin 1s linear infinite' }} />}
                    </div>

                    <div ref={coachingRef} style={{ flex: 1, padding: '12px', overflowY: 'auto' }}>
                        {coaching.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {coaching.map((entry) => (
                                    <div key={entry.id} style={{ padding: '12px', background: 'rgba(168, 85, 247, 0.05)', border: '1px solid rgba(168, 85, 247, 0.1)', borderRadius: '12px' }}>
                                        <p style={{ fontSize: '12px', color: '#a855f7', marginBottom: '6px', fontWeight: 500 }}>Q: {entry.question}</p>
                                        <p style={{ fontSize: '13px', color: '#e4e4e7', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{entry.answer}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                                <div>
                                    <Sparkles style={{ width: '40px', height: '40px', color: '#3f3f46', margin: '0 auto 12px' }} />
                                    <p style={{ color: '#71717a', fontSize: '13px', maxWidth: '240px' }}>AI answers will appear when questions are detected</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
