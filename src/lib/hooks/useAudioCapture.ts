'use client'

import { useState, useRef, useCallback } from 'react'

interface UseAudioCaptureOptions {
  onAudioData?: (data: ArrayBuffer) => void
  sampleRate?: number
}

export function useAudioCapture({ onAudioData, sampleRate = 16000 }: UseAudioCaptureOptions = {}) {
  const [isRecording, setIsRecording] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null)
  
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)

  const requestPermission = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: sampleRate,
        } 
      })
      
      // Stop the stream immediately, we just wanted to check permission
      stream.getTracks().forEach(track => track.stop())
      
      setPermissionGranted(true)
      setError(null)
      return true
    } catch (err) {
      setPermissionGranted(false)
      setError('Microphone permission denied')
      return false
    }
  }, [sampleRate])

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: sampleRate,
        } 
      })
      
      mediaStreamRef.current = stream
      
      // Create audio context
      const audioContext = new AudioContext({ sampleRate })
      audioContextRef.current = audioContext
      
      // Create source from stream
      const source = audioContext.createMediaStreamSource(stream)
      sourceRef.current = source
      
      // Create processor node (buffer size 4096 for ~250ms chunks at 16kHz)
      const processor = audioContext.createScriptProcessor(4096, 1, 1)
      processorRef.current = processor
      
      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0)
        
        // Convert Float32Array to Int16Array (PCM format for AssemblyAI)
        const pcmData = new Int16Array(inputData.length)
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]))
          pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF
        }
        
        onAudioData?.(pcmData.buffer)
      }
      
      source.connect(processor)
      processor.connect(audioContext.destination)
      
      setIsRecording(true)
      setPermissionGranted(true)
      setError(null)
    } catch (err) {
      setError('Failed to start recording')
      setPermissionGranted(false)
    }
  }, [sampleRate, onAudioData])

  const stopRecording = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.disconnect()
      processorRef.current = null
    }
    
    if (sourceRef.current) {
      sourceRef.current.disconnect()
      sourceRef.current = null
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }
    
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop())
      mediaStreamRef.current = null
    }
    
    setIsRecording(false)
  }, [])

  const pauseRecording = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => {
        track.enabled = false
      })
    }
  }, [])

  const resumeRecording = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => {
        track.enabled = true
      })
    }
  }, [])

  return {
    isRecording,
    error,
    permissionGranted,
    requestPermission,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
  }
}

