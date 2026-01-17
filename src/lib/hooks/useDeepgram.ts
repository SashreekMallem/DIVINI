import { useState, useRef, useEffect, useCallback } from 'react'

type DeepgramConfig = {
    onTranscript: (text: string, isFinal: boolean, speaker: 'You' | 'Interviewer') => void
    onUtteranceEnd: () => void
    onError: (error: string) => void
}

export function useDeepgram({ onTranscript, onUtteranceEnd, onError }: DeepgramConfig) {
    const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected')
    const [isProcessing, setIsProcessing] = useState(false)

    const socketRef = useRef<WebSocket | null>(null)
    const audioContextRef = useRef<AudioContext | null>(null)
    const streamRef = useRef<MediaStream | null>(null)
    const processorRef = useRef<ScriptProcessorNode | null>(null) // Fallback or Worklet

    const connect = useCallback(async () => {
        try {
            setStatus('connecting')

            // 1. Get Ephemeral Key
            const tokenRes = await fetch('/api/deepgram/token')
            if (!tokenRes.ok) throw new Error('Failed to get transcription token')
            const { key } = await tokenRes.json()

            // 2. Setup WebSocket URL
            const params = new URLSearchParams({
                encoding: 'linear16',
                sample_rate: '16000',
                channels: '1',
                interim_results: 'true',
                utterance_end_ms: '1000',
                vad_events: 'true',
                endpointing: '300',
                smart_format: 'true'
            })

            const wsUrl = `wss://api.deepgram.com/v1/listen?${params.toString()}`
            const socket = new WebSocket(wsUrl, ['token', key])
            socketRef.current = socket

            socket.onopen = () => {
                console.log('✅ Deepgram Connected')
                setStatus('connected')
            }

            socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data)

                    if (data.type === 'Results') {
                        const transcript = data.channel.alternatives[0]?.transcript || ''
                        const isFinal = data.is_final

                        if (transcript.trim()) {
                            // Deepgram doesn't identify speakers in mono stream without diarization, 
                            // but for this pipeline "You" are the primary input.
                            onTranscript(transcript, isFinal, 'You')
                        }
                    }
                    else if (data.type === 'UtteranceEnd') {
                        console.log('🎯 Deepgram UtteranceEnd')
                        onUtteranceEnd()
                    }
                    else if (data.type === 'SpeechStarted') {
                        console.log('🔊 Speech Started')
                    }
                } catch (e) {
                    console.error('Parse error:', e)
                }
            }

            socket.onerror = (e) => {
                console.error('Deepgram WebSocket Error', e)
                onError('Connection error with Deepgram')
                setStatus('disconnected')
            }

            socket.onclose = () => {
                setStatus('disconnected')
                setIsProcessing(false)
            }

        } catch (e: any) {
            setStatus('disconnected')
            onError(e.message || 'Could not connect to voice AI')
        }
    }, [onTranscript, onUtteranceEnd, onError])

    const startStreaming = useCallback(async (selectedMicId?: string) => {
        if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
            onError('Not connected to Deepgram')
            return
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    deviceId: selectedMicId ? { exact: selectedMicId } : undefined,
                    sampleRate: 16000,
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true
                }
            })
            streamRef.current = stream

            const audioContext = new AudioContext({ sampleRate: 16000 })
            audioContextRef.current = audioContext

            const source = audioContext.createMediaStreamSource(stream)

            // Use ScriptProcessor as simple fallback for raw PCM access 
            // (AudioWorklet is better but this is simpler for immediate Vercel fix)
            const processor = audioContext.createScriptProcessor(4096, 1, 1)
            processorRef.current = processor

            processor.onaudioprocess = (e) => {
                if (socketRef.current?.readyState === WebSocket.OPEN) {
                    const inputData = e.inputBuffer.getChannelData(0)
                    // Downsample/Convert to Int16
                    const pcm16 = new Int16Array(inputData.length)
                    for (let i = 0; i < inputData.length; i++) {
                        const s = Math.max(-1, Math.min(1, inputData[i]))
                        pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF
                    }
                    socketRef.current.send(pcm16.buffer)
                }
            }

            source.connect(processor)
            processor.connect(audioContext.destination)

            setIsProcessing(true)

        } catch (e: any) {
            onError('Microphone access failed: ' + e.message)
        }
    }, [onError])

    const disconnect = useCallback(() => {
        socketRef.current?.close()
        streamRef.current?.getTracks().forEach(t => t.stop())
        audioContextRef.current?.close()
        processorRef.current?.disconnect()
        setStatus('disconnected')
        setIsProcessing(false)
    }, [])

    return {
        connect,
        disconnect,
        startStreaming,
        status,
        isProcessing
    }
}
