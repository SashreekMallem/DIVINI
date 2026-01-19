import { useState, useRef, useCallback } from 'react'

type DeepgramConfig = {
    onTranscript: (text: string, isFinal: boolean, speaker: 'You' | 'Interviewer') => void
    onUtteranceEnd: (speaker: 'You' | 'Interviewer') => void
    onError: (error: string) => void
}

/**
 * Dual-Channel Deepgram Hook with proper audio handling
 * 
 * Features:
 * - Microphone audio → labeled as "You" (candidate's spoken answer)
 * - System audio (from tab/screen share) → labeled as "Interviewer"
 * - GainNode for volume/mute control
 * - Proper error handling for getDisplayMedia
 */
export function useDeepgram({ onTranscript, onUtteranceEnd, onError }: DeepgramConfig) {
    const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected')
    const [isProcessing, setIsProcessing] = useState(false)
    const [isMicMuted, setIsMicMuted] = useState(false)

    // Mic Channel (You)
    const micSocketRef = useRef<WebSocket | null>(null)
    const micStreamRef = useRef<MediaStream | null>(null)
    const micContextRef = useRef<AudioContext | null>(null)
    const micGainRef = useRef<GainNode | null>(null)

    // System Audio Channel (Interviewer)
    const sysSocketRef = useRef<WebSocket | null>(null)
    const sysStreamRef = useRef<MediaStream | null>(null)
    const sysContextRef = useRef<AudioContext | null>(null)

    // Track last speaker for UtteranceEnd
    const lastMicTranscriptRef = useRef<string>('')
    const lastSysTranscriptRef = useRef<string>('')

    const createDeepgramSocket = useCallback(async (
        speaker: 'You' | 'Interviewer'
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

        return new Promise((resolve, reject) => {
            const socket = new WebSocket(wsUrl, ['token', key])

            const timeout = setTimeout(() => {
                reject(new Error(`Connection timeout [${speaker}]`))
                socket.close()
            }, 10000)

            socket.onopen = () => {
                clearTimeout(timeout)
                console.log(`✅ Deepgram Connected [${speaker}]`)
                resolve(socket)
            }

            socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data)

                    if (data.type === 'Results') {
                        const transcript = data.channel.alternatives[0]?.transcript || ''
                        const isFinal = data.is_final

                        if (transcript.trim()) {
                            // Track last transcript for this speaker
                            if (speaker === 'You') {
                                lastMicTranscriptRef.current = transcript
                            } else {
                                lastSysTranscriptRef.current = transcript
                            }
                            onTranscript(transcript, isFinal, speaker)
                        }
                    }
                    else if (data.type === 'UtteranceEnd') {
                        console.log(`🎯 UtteranceEnd [${speaker}]`)
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
                clearTimeout(timeout)
                console.error(`Deepgram WebSocket Error [${speaker}]`, e)
                reject(new Error(`Connection failed [${speaker}]`))
            }

            socket.onclose = () => {
                console.log(`🔌 Disconnected [${speaker}]`)
            }
        })
    }, [onTranscript, onUtteranceEnd])

    const setupAudioPipeline = useCallback((
        stream: MediaStream,
        socket: WebSocket,
        contextRef: React.MutableRefObject<AudioContext | null>,
        gainRef?: React.MutableRefObject<GainNode | null>
    ) => {
        const audioContext = new AudioContext({ sampleRate: 16000 })
        contextRef.current = audioContext

        const source = audioContext.createMediaStreamSource(stream)

        // Create gain node for volume control (optional, mainly for mic)
        const gainNode = audioContext.createGain()
        gainNode.gain.value = 1.0
        if (gainRef) {
            gainRef.current = gainNode
        }

        // Create script processor for PCM conversion
        const processor = audioContext.createScriptProcessor(4096, 1, 1)

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

        // Connect: source -> gain -> processor -> destination (required for ScriptProcessor)
        source.connect(gainNode)
        gainNode.connect(processor)
        processor.connect(audioContext.destination)

        return { audioContext, processor }
    }, [])

    const connect = useCallback(async (useSystemAudio: boolean = false, selectedMicId?: string) => {
        try {
            setStatus('connecting')
            console.log('🚀 Starting audio capture...')

            // ===== STEP 1: Setup Microphone Channel =====
            console.log('🎙️ Setting up Microphone channel...')
            const micSocket = await createDeepgramSocket('You')
            micSocketRef.current = micSocket

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
            setupAudioPipeline(micStream, micSocket, micContextRef, micGainRef)
            console.log('✅ Microphone channel ready')

            // ===== STEP 2: Setup System Audio Channel (if enabled) =====
            if (useSystemAudio) {
                console.log('🔊 Setting up System Audio channel...')
                console.log('📋 Please select a browser TAB and check "Share tab audio"')

                try {
                    // Request screen/tab share - this opens the browser picker
                    // IMPORTANT: Must have video:true, but we'll stop the video track immediately
                    const displayStream = await navigator.mediaDevices.getDisplayMedia({
                        video: {
                            width: 1,
                            height: 1,
                            frameRate: 1
                        },
                        audio: {
                            echoCancellation: false,
                            noiseSuppression: false,
                            autoGainControl: false
                        }
                    })

                    // Check if we got audio
                    const audioTracks = displayStream.getAudioTracks()

                    // Stop video track immediately - we only need audio
                    displayStream.getVideoTracks().forEach(track => {
                        console.log('🎬 Stopping video track (not needed)')
                        track.stop()
                    })

                    if (audioTracks.length === 0) {
                        console.warn('⚠️ No audio track! User may not have selected "Share tab audio"')
                        onError('No audio captured. Please select a tab and check "Share tab audio" or "Share system audio".')
                        // Continue with mic-only mode
                    } else {
                        console.log('🎵 Got audio track:', audioTracks[0].label)

                        // Create Deepgram connection for system audio
                        const sysSocket = await createDeepgramSocket('Interviewer')
                        sysSocketRef.current = sysSocket

                        // Create audio-only stream from the display audio
                        const audioOnlyStream = new MediaStream(audioTracks)
                        sysStreamRef.current = audioOnlyStream

                        setupAudioPipeline(audioOnlyStream, sysSocket, sysContextRef)
                        console.log('✅ System Audio channel ready (Interviewer)')

                        // Handle when user stops sharing via browser UI
                        audioTracks[0].onended = () => {
                            console.log('🛑 User stopped sharing audio')
                            sysSocketRef.current?.close()
                        }
                    }
                } catch (e: any) {
                    if (e.name === 'NotAllowedError') {
                        console.warn('⚠️ User cancelled screen share')
                        onError('Screen share cancelled. Running in microphone-only mode.')
                    } else {
                        console.error('❌ System audio error:', e.message)
                        onError(`System audio failed: ${e.message}. Running in microphone-only mode.`)
                    }
                    // Continue with mic-only mode
                }
            }

            setStatus('connected')
            setIsProcessing(true)
            console.log('🎉 Audio capture started!')

        } catch (e: any) {
            console.error('❌ Connection failed:', e)
            setStatus('disconnected')
            onError(e.message || 'Could not start audio capture')
        }
    }, [createDeepgramSocket, setupAudioPipeline, onError])

    const disconnect = useCallback(() => {
        console.log('🔌 Disconnecting all audio...')

        // Close mic channel
        micSocketRef.current?.close()
        micStreamRef.current?.getTracks().forEach(t => t.stop())
        micContextRef.current?.close()

        // Close system audio channel
        sysSocketRef.current?.close()
        sysStreamRef.current?.getTracks().forEach(t => t.stop())
        sysContextRef.current?.close()

        setStatus('disconnected')
        setIsProcessing(false)
        setIsMicMuted(false)
    }, [])

    // Mute/unmute microphone
    const toggleMicMute = useCallback(() => {
        if (micGainRef.current) {
            const newMuted = !isMicMuted
            micGainRef.current.gain.value = newMuted ? 0 : 1
            setIsMicMuted(newMuted)
            console.log(`🎙️ Mic ${newMuted ? 'MUTED' : 'UNMUTED'}`)
        }
    }, [isMicMuted])

    // Set mic volume (0-1)
    const setMicVolume = useCallback((volume: number) => {
        if (micGainRef.current) {
            micGainRef.current.gain.value = Math.max(0, Math.min(1, volume))
        }
    }, [])

    // Legacy compatibility
    const startStreaming = useCallback(async () => {
        console.log('ℹ️ startStreaming is now handled by connect()')
    }, [])

    return {
        connect,
        disconnect,
        startStreaming,
        toggleMicMute,
        setMicVolume,
        status,
        isProcessing,
        isMicMuted
    }
}
