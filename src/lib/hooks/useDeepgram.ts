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
 * - Support for pre-selected audio streams (Web Pre-selection)
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

    const connect = useCallback(async (useSystemAudio: boolean = false, selectedMicId?: string, existingSystemStream?: MediaStream | null) => {
        try {
            setStatus('connecting')
            console.log('🚀 Starting audio capture...')

            let micStream: MediaStream
            let displayStream: MediaStream | null = null

            // 1. Get microphone (always required)
            console.log('🎙️ Requesting microphone access...')
            micStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    deviceId: selectedMicId ? { exact: selectedMicId } : undefined,
                    sampleRate: 16000,
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true
                }
            })

            // 2. Get system audio (optional)
            if (useSystemAudio) {
                if (existingSystemStream) {
                    console.log('🔊 Using pre-selected web system audio stream')
                    displayStream = existingSystemStream
                } else {
                    console.log('🔊 Requesting screen share for system audio...')
                    console.log('IMPORTANT INSTRUCTIONS:')
                    console.log('1. Select "Browser Tab" (not Window/Screen)')
                    console.log('2. Pick the tab where the interview is happening')
                    console.log('3. CHECK "Share tab audio" (Crucial!)')

                    try {
                        displayStream = await navigator.mediaDevices.getDisplayMedia({
                            video: { width: 1, height: 1, frameRate: 1 },
                            audio: {
                                echoCancellation: false,
                                noiseSuppression: false,
                                autoGainControl: false,
                                // @ts-ignore - Chrome hint
                                systemAudio: 'include',
                            },
                            // @ts-ignore - Chrome constraints
                            preferCurrentTab: false,
                            surfaceSwitching: 'include',
                            selfBrowserSurface: 'exclude',
                            monitorTypeSurfaces: 'exclude'
                        })
                    } catch (e: any) {
                        if (e.name === 'NotAllowedError') {
                            console.warn('⚠️ Screen share cancelled by user')
                            onError('System audio cancelled. Using microphone only.')
                        } else {
                            console.error('❌ Screen share error:', e)
                            onError(`System audio error: ${e.message}`)
                        }
                        displayStream = null
                    }
                }
            }

            // ===== Create WebSocket connections =====

            // Setup Microphone Channel
            console.log('🔌 Connecting mic to Deepgram...')
            const micSocket = await createDeepgramSocket('You')
            micSocketRef.current = micSocket
            micStreamRef.current = micStream
            setupAudioPipeline(micStream, micSocket, micContextRef, micGainRef)
            console.log('✅ Mic ready')

            // Setup System Audio Channel (if display stream was captured)
            if (displayStream) {
                const audioTracks = displayStream.getAudioTracks()

                // Stop video track immediately
                displayStream.getVideoTracks().forEach(t => t.stop())

                if (audioTracks.length === 0) {
                    console.error('❌ No system audio track found!')
                    onError('NO SYSTEM AUDIO DETECTED. Please restart and check "Share tab audio" in the popup.')
                    displayStream.getTracks().forEach(t => t.stop())
                } else {
                    console.log('🔌 Connecting system audio to Deepgram (Interviewer channel)...')
                    try {
                        const sysSocket = await createDeepgramSocket('Interviewer')
                        sysSocketRef.current = sysSocket

                        const audioOnlyStream = new MediaStream(audioTracks)
                        sysStreamRef.current = audioOnlyStream

                        setupAudioPipeline(audioOnlyStream, sysSocket, sysContextRef)
                        console.log('✅ System audio connected & processing')

                        audioTracks[0].onended = () => {
                            console.log('🛑 User stopped sharing system audio')
                            sysSocketRef.current?.close()
                            onError('System audio sharing stopped.')
                        }
                    } catch (e) {
                        console.error('❌ Failed to connect system audio socket:', e)
                    }
                }
            }

            setStatus('connected')
            setIsProcessing(true)
            console.log('🎉 Audio active!')

        } catch (e: any) {
            console.error('❌ Failed:', e)
            setStatus('disconnected')
            onError(e.message || 'Could not start audio')
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

        // Stop stealth audio if running (Electron only)
        // We just disable loopback mode to be safe, though stream is closed above
        if (typeof window !== 'undefined' && (window as any).electron?.stealthAudio) {
            (window as any).electron.stealthAudio.disable().catch(() => { })
        }

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

    // Electron-specific: Use desktopCapturer source ID
    const connectElectron = useCallback(async (sourceId: string, selectedMicId?: string) => {
        try {
            setStatus('connecting')
            console.log('🚀 Starting Electron audio capture...')

            // 1. Get microphone
            const micStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    deviceId: selectedMicId ? { exact: selectedMicId } : undefined,
                    sampleRate: 16000,
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true
                }
            })

            // 2. Handling System Audio (The "Set and Forget" Logic)

            // Check if user selected the Universal System Audio option
            if (sourceId === 'universal-system-audio' || sourceId === 'system-loopback') {
                console.log('🔊 Universal System Audio selected! Using native loopback...')

                // Check if running in Electron with stealth audio support
                const electron = typeof window !== 'undefined' ? (window as any).electron : null
                if (!electron?.stealthAudio) {
                    throw new Error('Universal System Audio requires the Electron app')
                }

                // Enable loopback mode in main process
                await electron.stealthAudio.enable()

                // Get the loopback stream - library intercepts this call
                const loopbackStream = await navigator.mediaDevices.getDisplayMedia({
                    audio: true,
                    video: true // Required by library
                })

                // Disable loopback mode (restore normal behavior)
                await electron.stealthAudio.disable()

                console.log('✅ Native audio loopback stream acquired')

                const audioTracks = loopbackStream.getAudioTracks()
                if (audioTracks.length === 0) {
                    throw new Error('No audio track in loopback stream')
                }

                // Stop video immediately
                loopbackStream.getVideoTracks().forEach(t => t.stop())

                // ===== Setup both channels =====

                // Mic channel (You) - using the micStream we already captured at the top
                console.log('🔌 Connecting mic to Deepgram...')
                const micSocket = await createDeepgramSocket('You')
                micSocketRef.current = micSocket
                micStreamRef.current = micStream
                setupAudioPipeline(micStream, micSocket, micContextRef, micGainRef)
                console.log('✅ Mic ready (Your voice)')

                // System audio channel (Interviewer)
                console.log('🔌 Connecting system audio to Deepgram...')
                const sysSocket = await createDeepgramSocket('Interviewer')
                sysSocketRef.current = sysSocket

                const sysStream = new MediaStream(audioTracks)
                sysStreamRef.current = sysStream

                setupAudioPipeline(sysStream, sysSocket, sysContextRef)
                console.log('✅ System audio ready (Interviewer voice)')

                setStatus('connected')
                setIsProcessing(true)
                console.log('🎉 Universal System Audio active! Both channels working.')
                return // Exit - we've handled everything
            }

            // Standard Window/Tab Audio (Legacy / Specific Window)
            // @ts-ignore - Electron-specific API
            const displayStream = await navigator.mediaDevices.getUserMedia({
                audio: false,
                video: {
                    // @ts-ignore
                    mandatory: {
                        chromeMediaSource: 'desktop',
                        chromeMediaSourceId: sourceId
                    }
                }
            })

            // ===== Setup WebSocket connections =====

            // Mic channel
            console.log('🔌 Connecting mic to Deepgram...')
            const micSocket = await createDeepgramSocket('You')
            micSocketRef.current = micSocket
            micStreamRef.current = micStream
            setupAudioPipeline(micStream, micSocket, micContextRef, micGainRef)
            console.log('✅ Mic ready')

            // System audio channel (from Electron source)
            const audioTrack = displayStream.getAudioTracks()[0]

            if (!audioTrack) {
                console.warn('⚠️ No audio track from selected source')
                onError('Selected source has no audio. Try a different source.')
            } else {
                console.log('🔌 Connecting system audio to Deepgram...')
                const sysSocket = await createDeepgramSocket('Interviewer')
                sysSocketRef.current = sysSocket

                const audioOnlyStream = new MediaStream([audioTrack])
                sysStreamRef.current = audioOnlyStream

                // Stop video track (don't need it)
                displayStream.getVideoTracks().forEach(t => t.stop())

                setupAudioPipeline(audioOnlyStream, sysSocket, sysContextRef)
                console.log('✅ System audio ready (Interviewer)')

                // Handle track ending
                audioTrack.onended = () => {
                    console.log('🛑 Audio track ended')
                    sysSocketRef.current?.close()
                }
            }

            setStatus('connected')
            setIsProcessing(true)
            console.log('🎉 Electron audio active!')

        } catch (e: any) {
            console.error('❌ Electron capture failed:', e)
            setStatus('disconnected')
            onError(e.message || 'Could not capture Electron audio')
        }
    }, [createDeepgramSocket, setupAudioPipeline, onError])

    /**
     * STEALTH MODE: Invisible audio capture using native OS APIs
     * 
     * This method uses native audio loopback (Core Audio Taps on macOS, WASAPI on Windows)
     * to capture system audio WITHOUT:
     * - Screen recording permission popup
     * - "Sharing to..." browser indicator
     * - Any visible indicators to the meeting app
     * 
     * This is how Final Round AI and similar apps work.
     */
    const connectStealth = useCallback(async (selectedMicId?: string) => {
        try {
            setStatus('connecting')
            console.log('🔊 Starting STEALTH audio capture (invisible!)...')

            // Check if running in Electron
            const electron = typeof window !== 'undefined' ? (window as any).electron : null
            if (!electron?.stealthAudio) {
                throw new Error('Stealth audio requires the Electron app')
            }

            // 1. Get microphone (standard way - always needed)
            console.log('🎙️ Requesting microphone access...')
            const micStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    deviceId: selectedMicId ? { exact: selectedMicId } : undefined,
                    sampleRate: 16000,
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true
                }
            })

            // 2. Start native system audio loopback (INVISIBLE!)
            console.log('🔇 Starting invisible system audio capture...')

            // Enable loopback mode in main process
            await electron.stealthAudio.enable()

            // Get the stream - library intercepts this call!
            // MUST request video: true for it to work, but it's loopback not screen share
            const stream = await navigator.mediaDevices.getDisplayMedia({
                audio: true,
                video: true // Required by library, but will be stealthy
            })

            // Disable loopback mode (restore normal behavior)
            // await electron.stealthAudio.disable() 
            // ^ Keep enabled for duration or disable immediately? 
            // Library docs say "disable... restoration full functionality". 
            // We'll keep it enabled or disable after getting stream? 
            // Docs pattern: enable -> getStream -> disable.
            await electron.stealthAudio.disable()

            console.log('✅ Native audio loopback stream acquired')

            const audioTracks = stream.getAudioTracks()
            if (audioTracks.length === 0) {
                throw new Error('No audio track in stealth stream')
            }

            // Stop video immediately (it's just a loopback visual or black screen)
            stream.getVideoTracks().forEach(t => t.stop())

            // ===== Setup WebSocket connections =====

            // Mic channel (You)
            console.log('🔌 Connecting mic to Deepgram...')
            const micSocket = await createDeepgramSocket('You')
            micSocketRef.current = micSocket
            micStreamRef.current = micStream
            setupAudioPipeline(micStream, micSocket, micContextRef, micGainRef)
            console.log('✅ Mic ready')

            // System audio channel (Interviewer)
            console.log('🔌 Connecting stealth audio to Deepgram...')
            const sysSocket = await createDeepgramSocket('Interviewer')
            sysSocketRef.current = sysSocket

            const sysStream = new MediaStream(audioTracks)
            sysStreamRef.current = sysStream  // Store to close later

            setupAudioPipeline(sysStream, sysSocket, sysContextRef)

            console.log('✅ Stealth audio connected (INVISIBLE!)')

            setStatus('connected')
            setIsProcessing(true)
            console.log('🎉 Stealth mode active! No indicators visible.')

        } catch (e: any) {
            console.error('❌ Stealth capture failed:', e)
            setStatus('disconnected')
            onError(e.message || 'Could not start stealth audio')

            // Cleanup just in case
            if (typeof window !== 'undefined' && (window as any).electron?.stealthAudio) {
                (window as any).electron.stealthAudio.disable().catch(() => { })
            }
        }
    }, [createDeepgramSocket, setupAudioPipeline, onError])

    // Legacy compatibility
    const startStreaming = useCallback(async () => {
        console.log('ℹ️ startStreaming is now handled by connect()')
    }, [])

    return {
        connect,
        connectElectron,
        connectStealth, // NEW: Invisible audio capture
        disconnect,
        startStreaming,
        toggleMicMute,
        setMicVolume,
        status,
        isProcessing,
        isMicMuted
    }
}
