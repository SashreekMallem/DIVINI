/**
 * AudioWorklet Processor for Real-Time Interview Audio
 * 
 * Features:
 * - PCM16 conversion for AssemblyAI
 * - Voice Activity Detection (VAD) to save bandwidth
 * - Efficient processing on audio thread (not main thread)
 */
class PCMProcessor extends AudioWorkletProcessor {
    constructor() {
        super()

        // VAD Configuration
        this.silenceThreshold = 0.01  // RMS threshold for silence
        this.silenceFrames = 0
        this.maxSilenceFrames = 30    // ~0.6 seconds at 48kHz/128 samples
        this.isSilent = false

        // Buffer for accumulating samples (target ~50ms chunks)
        this.sampleBuffer = []
        this.targetSamples = 800  // 50ms at 16kHz
    }

    /**
     * Calculate RMS (Root Mean Square) for VAD
     */
    calculateRMS(samples) {
        let sum = 0
        for (let i = 0; i < samples.length; i++) {
            sum += samples[i] * samples[i]
        }
        return Math.sqrt(sum / samples.length)
    }

    /**
     * Convert Float32 audio samples to PCM16 for AssemblyAI
     */
    floatToPCM16(float32Array) {
        const pcm16 = new Int16Array(float32Array.length)
        for (let i = 0; i < float32Array.length; i++) {
            // Clamp to [-1, 1] and scale to Int16 range
            const s = Math.max(-1, Math.min(1, float32Array[i]))
            pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF
        }
        return pcm16
    }

    /**
     * Process audio frames from the microphone
     * Called automatically by the AudioWorklet system
     */
    process(inputs, outputs, parameters) {
        const input = inputs[0]

        // Check if we have audio input
        if (!input || !input[0] || input[0].length === 0) {
            return true // Keep processor alive
        }

        const channel0 = input[0] // Left / Mono
        const channel1 = input[1] // Right (if exists)
        const isStereo = !!channel1

        // VAD Logic (Primary on Channel 0)
        const rms = this.calculateRMS(channel0)

        // Only use VAD to gate if NOT stereo (single channel needs silence suppression)
        // If stereo (dual channel), we stream continuously to capture interviewer context even if user is silent
        // But we still emit VAD events for UI
        if (rms < this.silenceThreshold) {
            this.silenceFrames++
            if (this.silenceFrames > this.maxSilenceFrames) {
                if (!this.isSilent) {
                    this.isSilent = true
                    this.port.postMessage({ type: 'vad', speaking: false, rms: rms })
                }
                // If NOT stereo, we can skip silence
                if (!isStereo) return true
            }
        } else {
            if (this.isSilent) {
                this.isSilent = false
                this.port.postMessage({ type: 'vad', speaking: true, rms: rms })
            }
            this.silenceFrames = 0
        }

        // Add samples to buffer
        if (isStereo) {
            // Interleave: L, R, L, R...
            for (let i = 0; i < channel0.length; i++) {
                this.sampleBuffer.push(channel0[i])
                this.sampleBuffer.push(channel1[i] || 0) // Padding if channel1 shorter
            }
        } else {
            // Mono
            for (let i = 0; i < channel0.length; i++) {
                this.sampleBuffer.push(channel0[i])
            }
        }

        // Send when we have enough samples (~50ms chunks)
        // For stereo, targetSamples represents sample FRAMES, so buffer length is 2x targetSamples
        const threshold = isStereo ? this.targetSamples * 2 : this.targetSamples

        if (this.sampleBuffer.length >= threshold) {
            const chunk = new Float32Array(this.sampleBuffer.splice(0, threshold))
            const pcm16 = this.floatToPCM16(chunk)

            // Send audio data to main thread
            this.port.postMessage(
                {
                    type: 'audio',
                    buffer: pcm16.buffer,
                    rms: rms,
                    channels: isStereo ? 2 : 1
                },
                [pcm16.buffer]
            )
        }

        return true
    }
}

// Register the processor
registerProcessor('pcm-processor', PCMProcessor)
