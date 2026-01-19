import { useState, useRef, useCallback } from 'react'

type DeepgramConfig = {
    onTranscript: (text: string, isFinal: boolean, speaker: 'You' | 'Interviewer') => void
    onUtteranceEnd: (speaker: 'You' | 'Interviewer') => void
    onError: (error: string) => void
}

/**
 * Dual-Channel Deepgram Hook
 * 
 * When useSystemAudio=true:
 *   - Microphone audio -> labeled as "You" (candidate's spoken answer)
 *   - System audio (from screen share) -> labeled as "Interviewer" (interviewer's voice)
 * 
 * When useSystemAudio=false:
 *   - Microphone only -> everything labeled as "You"
 */
export function useDeepgram({ onTranscript, onUtteranceEnd, onError }: DeepgramConfig) {
    const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected')
    const [isProcessing, setIsProcessing] = useState(false)

    // Mic Channel (You)
    const micSocketRef = useRef<WebSocket | null>(null)
    const micStreamRef = useRef<MediaStream | null>(null)
    const micContextRef = useRef<AudioContext | null>(null)
    const micProcessorRef = useRef<ScriptProcessorNode | null>(null)

    // System Audio Channel (Interviewer)
    const sysSocketRef = useRef<WebSocket | null>(null)
    const sysStreamRef = useRef<MediaStream | null>(null)
    const sysContextRef = useRef<AudioContext | null>(null)
    const sysProcessorRef = useRef<ScriptProcessorNode | null>(null)

    const createDeepgramSocket = useCallback(async (
        speaker: 'You' | 'Interviewer',
        socketRef: React.MutableRefObject<WebSocket | null>
    ): Promise<WebSocket> => {
        // Get ephemeral key
        const tokenRes = await fetch('/api/deepgram/token')
        if (!tokenRes.ok) throw new Error('Failed to get transcription token')
        const { key } = await tokenRes.json()

        const params = new URLSearchParams({
            encoding: 'linear16',
            sample_rate: '16000',
            channels: '1',
            interim_results: 'true',
            utterance_end_ms: '1200',
            vad_events: 'true',
            endpointing: '400',
            smart_format: 'true'
        })

        const wsUrl = `wss://api.deepgram.com/v1/listen?${params.toString()}`
        const socket = new WebSocket(wsUrl, ['token', key])
        socketRef.current = socket

        socket.onopen = () => {
            console.log(`✅ Deepgram Connected [${speaker}]`)
        }

        socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data)

                if (data.type === 'Results') {
                    const transcript = data.channel.alternatives[0]?.transcript || ''
                    const isFinal = data.is_final

                    if (transcript.trim()) {
                        onTranscript(transcript, isFinal, speaker)
                    }
                }
                else if (data.type === 'UtteranceEnd') {
                    console.log(`🎯 Deepgram UtteranceEnd [${speaker}]`)
                    onUtteranceEnd(speaker)
                }
                else if (data.type === 'SpeechStarted') {
                    console.log(`🔊 Speech Started [${speaker}]`)
                }
            } catch (e) {
                console.error('Parse error:', e)
            }
        }

        socket.onerror = (e) => {
            console.error(`Deepgram WebSocket Error [${speaker}]`, e)
            onError(`Connection error with Deepgram [${speaker}]`)
        }

        socket.onclose = () => {
            console.log(`🔌 Deepgram Disconnected [${speaker}]`)
        }

        // Wait for connection
        return new Promise((resolve, reject) => {
            socket.onopen = () => {
                console.log(`✅ Deepgram Connected [${speaker}]`)
                resolve(socket)
            }
            socket.onerror = () => reject(new Error(`Failed to connect [${speaker}]`))
        })
    }, [onTranscript, onUtteranceEnd, onError])

    const connectAudioSource = useCallback((
        stream: MediaStream,
        socket: WebSocket,
        contextRef: React.MutableRefObject<AudioContext | null>,
        processorRef: React.MutableRefObject<ScriptProcessorNode | null>
    ) => {
        const audioContext = new AudioContext({ sampleRate: 16000 })
        contextRef.current = audioContext

        const source = audioContext.createMediaStreamSource(stream)
        const processor = audioContext.createScriptProcessor(4096, 1, 1)
        processorRef.current = processor

        processor.onaudioprocess = (e) => {
            if (socket.readyState === WebSocket.OPEN) {
                const inputData = e.inputBuffer.getChannelData(0)
                const pcm16 = new Int16Array(inputData.length)
                for (let i = 0; i < inputData.length; i++) {
                    const s = Math.max(-1, Math.min(1, inputData[i]))
                    pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF
                }
                socket.send(pcm16.buffer)
            }
        }

        source.connect(processor)
        processor.connect(audioContext.destination)
    }, [])

    const connect = useCallback(async (useSystemAudio: boolean = false, selectedMicId?: string) => {
        try {
            setStatus('connecting')

            // 1. Connect Microphone (You)
            console.log('🎙️ Setting up Microphone channel...')
            const micSocket = await createDeepgramSocket('You', micSocketRef)

            const micStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    deviceId: selectedMicId ? { exact: selectedMicId } : undefined,
                    sampleRate: 16000,
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true
                }
            })
            micStreamRef.current = micStream
            connectAudioSource(micStream, micSocket, micContextRef, micProcessorRef)
            console.log('✅ Microphone channel ready')

            // 2. Connect System Audio (Interviewer) if enabled
            if (useSystemAudio) {
                console.log('🔊 Setting up System Audio channel...')
                try {
                    const sysSocket = await createDeepgramSocket('Interviewer', sysSocketRef)

                    // Request screen/tab share WITH audio
                    const displayStream = await navigator.mediaDevices.getDisplayMedia({
                        video: true, // Required for getDisplayMedia
                        audio: {
                            echoCancellation: false,
                            noiseSuppression: false,
                            autoGainControl: false
                        }
                    })

                    // Extract just the audio track
                    const audioTracks = displayStream.getAudioTracks()
                    if (audioTracks.length === 0) {
                        throw new Error('No audio track in screen share. Make sure to check "Share tab audio" or "Share system audio".')
                    }

                    // Stop the video track - we only need audio
                    displayStream.getVideoTracks().forEach(track => track.stop())

                    // Create audio-only stream
                    const audioOnlyStream = new MediaStream(audioTracks)
                    sysStreamRef.current = audioOnlyStream

                    connectAudioSource(audioOnlyStream, sysSocket, sysContextRef, sysProcessorRef)
                    console.log('✅ System Audio channel ready (Interviewer)')

                } catch (e: any) {
                    console.warn('⚠️ System audio capture failed:', e.message)
                    onError('System audio capture failed. Make sure to share a tab/window with audio enabled.')
                    // Continue with mic-only mode
                }
            }

            setStatus('connected')
            setIsProcessing(true)

        } catch (e: any) {
            setStatus('disconnected')
            onError(e.message || 'Could not connect to voice AI')
        }
    }, [createDeepgramSocket, connectAudioSource, onError])

    const disconnect = useCallback(() => {
        // Close mic channel
        micSocketRef.current?.close()
        micStreamRef.current?.getTracks().forEach(t => t.stop())
        micContextRef.current?.close()
        micProcessorRef.current?.disconnect()

        // Close system audio channel
        sysSocketRef.current?.close()
        sysStreamRef.current?.getTracks().forEach(t => t.stop())
        sysContextRef.current?.close()
        sysProcessorRef.current?.disconnect()

        setStatus('disconnected')
        setIsProcessing(false)
    }, [])

    // Legacy compatibility - startStreaming now just returns since connect handles everything
    const startStreaming = useCallback(async (_selectedMicId?: string) => {
        // No-op: streaming starts automatically in connect()
        console.log('ℹ️ startStreaming called but streaming already started in connect()')
    }, [])

    return {
        connect,
        disconnect,
        startStreaming,
        status,
        isProcessing
    }
}
