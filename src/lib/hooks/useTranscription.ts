'use client'

import { useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface TranscriptSegment {
  id: string
  text: string
  timestamp: number
  speaker: 'interviewer' | 'candidate' | 'unknown'
  isFinal: boolean
  confidence?: number
}

interface UseTranscriptionOptions {
  onTranscript?: (segment: TranscriptSegment) => void
  onQuestionDetected?: (question: TranscriptSegment) => void
}

export function useTranscription({ onTranscript, onQuestionDetected }: UseTranscriptionOptions) {
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [partialTranscript, setPartialTranscript] = useState('')
  
  const wsRef = useRef<WebSocket | null>(null)
  const startTimeRef = useRef<number>(0)
  const lastSpeakerRef = useRef<'interviewer' | 'candidate' | 'unknown'>('unknown')
  const supabase = createClient()

  const connect = useCallback(async () => {
    try {
      // Get temporary token from our Edge Function (keeps API key secure)
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        throw new Error('Not authenticated')
      }

      const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const response = await fetch(`${projectUrl}/functions/v1/assemblyai-token`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to get transcription token')
      }
      
      const { token } = await response.json()
      
      // Connect to AssemblyAI WebSocket with temporary token
      const ws = new WebSocket(
        `wss://api.assemblyai.com/v2/realtime/ws?sample_rate=16000&token=${token}`
      )
      
      ws.onopen = () => {
        setIsConnected(true)
        setError(null)
        startTimeRef.current = Date.now()
      }
      
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data)
        
        if (data.message_type === 'PartialTranscript' && data.text) {
          setPartialTranscript(data.text)
        }
        
        if (data.message_type === 'FinalTranscript' && data.text) {
          setPartialTranscript('')
          
          const segment: TranscriptSegment = {
            id: crypto.randomUUID(),
            text: data.text,
            timestamp: Date.now() - startTimeRef.current,
            speaker: detectSpeaker(data.text),
            isFinal: true,
            confidence: data.confidence,
          }
          
          lastSpeakerRef.current = segment.speaker
          
          onTranscript?.(segment)
          
          // Detect if this is a question
          if (isQuestion(data.text)) {
            onQuestionDetected?.(segment)
          }
        }
      }
      
      ws.onerror = () => {
        setError('WebSocket connection error')
        setIsConnected(false)
      }
      
      ws.onclose = () => {
        setIsConnected(false)
      }
      
      wsRef.current = ws
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed')
    }
  }, [supabase, onTranscript, onQuestionDetected])

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    setIsConnected(false)
    setPartialTranscript('')
  }, [])

  const sendAudio = useCallback((audioData: ArrayBuffer) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      // Convert ArrayBuffer to base64
      const base64 = btoa(
        String.fromCharCode(...new Uint8Array(audioData))
      )
      wsRef.current.send(JSON.stringify({ audio_data: base64 }))
    }
  }, [])

  return {
    isConnected,
    error,
    partialTranscript,
    connect,
    disconnect,
    sendAudio,
  }
}

// Helper: Detect if text is a question
function isQuestion(text: string): boolean {
  const trimmed = text.trim()
  
  // Ends with question mark
  if (trimmed.endsWith('?')) return true
  
  // Starts with question words
  const questionStarts = [
    'what', 'how', 'why', 'when', 'where', 'who', 'which',
    'tell me', 'describe', 'explain', 'walk me through',
    'can you', 'could you', 'would you', 'have you',
    'design', 'implement', 'build', 'create',
  ]
  
  const lower = trimmed.toLowerCase()
  return questionStarts.some(start => lower.startsWith(start))
}

// Helper: Simple speaker detection (can be improved with ML)
function detectSpeaker(text: string): 'interviewer' | 'candidate' | 'unknown' {
  const lower = text.toLowerCase()
  
  // Question patterns suggest interviewer
  if (isQuestion(text)) {
    return 'interviewer'
  }
  
  // Answer patterns suggest candidate
  const answerStarts = ['i ', 'my ', 'we ', 'our ', 'at my', 'in my', 'when i']
  if (answerStarts.some(start => lower.startsWith(start))) {
    return 'candidate'
  }
  
  return 'unknown'
}
