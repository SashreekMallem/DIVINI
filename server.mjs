// Custom server for WebSocket proxy to Deepgram STT
// Run with: npm run dev:ws
//
// Architecture based on Retell/Vapi research:
// - Uses Deepgram for real-time STT with proper endpointing
// - utterance_end_ms: Detects when speaker stopped talking
// - endpointing: Finalizes transcript after silence
// - interim_results: Shows partial transcripts for UI feedback

import 'dotenv/config';
import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { WebSocketServer, WebSocket } from 'ws';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env.local manually if dotenv doesn't pick it up
try {
    const envLocal = readFileSync(join(__dirname, '.env.local'), 'utf-8');
    envLocal.split('\n').forEach(line => {
        const [key, ...value] = line.split('=');
        if (key && !key.startsWith('#') && !process.env[key]) {
            process.env[key.trim()] = value.join('=').trim();
        }
    });
} catch (e) {
    // .env.local might not exist
}

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// API Keys
const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;
const ASSEMBLYAI_API_KEY = process.env.ASSEMBLYAI_API_KEY; // Legacy fallback

// Determine which STT provider to use
const STT_PROVIDER = DEEPGRAM_API_KEY ? 'deepgram' : (ASSEMBLYAI_API_KEY ? 'assemblyai' : null);

console.log('=== STT Configuration ===');
console.log('Deepgram API Key:', DEEPGRAM_API_KEY ? 'Yes' : 'No');
console.log('AssemblyAI API Key:', ASSEMBLYAI_API_KEY ? 'Yes' : 'No');
console.log('Using Provider:', STT_PROVIDER || 'NONE - Please add DEEPGRAM_API_KEY to .env.local');

app.prepare().then(() => {
    const server = createServer(async (req, res) => {
        try {
            const parsedUrl = parse(req.url, true);
            await handle(req, res, parsedUrl);
        } catch (err) {
            console.error('Error occurred handling', req.url, err);
            res.statusCode = 500;
            res.end('internal server error');
        }
    });

    // WebSocket server for transcription proxy
    const wss = new WebSocketServer({ noServer: true });

    server.on('upgrade', (request, socket, head) => {
        const { pathname } = parse(request.url);

        if (pathname === '/api/transcribe-ws') {
            wss.handleUpgrade(request, socket, head, (ws) => {
                wss.emit('connection', ws, request);
            });
        }
        // Don't destroy other WebSocket connections (needed for Next.js HMR)
    });

    wss.on('connection', (clientWs, request) => {
        console.log('\\n=== Client connected to transcription proxy ===');

        if (!STT_PROVIDER) {
            console.error('No STT API key configured');
            clientWs.send(JSON.stringify({
                type: 'error',
                message: 'No STT API key configured. Add DEEPGRAM_API_KEY to .env.local'
            }));
            clientWs.close();
            return;
        }

        // Parse client request params
        const clientUrl = new URL(request.url, `http://${request.headers.host}`);
        const dualChannel = clientUrl.searchParams.get('dual_channel') === 'true';

        if (STT_PROVIDER === 'deepgram') {
            handleDeepgramConnection(clientWs, dualChannel);
        } else {
            handleAssemblyAIConnection(clientWs, request, dualChannel);
        }
    });

    // ========================================================================
    // DEEPGRAM HANDLER - Primary STT Provider
    // ========================================================================
    function handleDeepgramConnection(clientWs, dualChannel) {
        console.log('[Deepgram] Initializing connection...');
        console.log('[Deepgram] Dual channel:', dualChannel);

        // Build Deepgram WebSocket URL with all necessary params
        const params = new URLSearchParams({
            // Audio format
            encoding: 'linear16',
            sample_rate: '16000',
            channels: dualChannel ? '2' : '1',

            // Model
            model: 'nova-2',
            language: 'en-US',

            // Smart formatting
            smart_format: 'true',
            punctuate: 'true',

            // CRITICAL: Enable interim results for partial transcripts
            interim_results: 'true',

            // CRITICAL: Utterance end detection (1 second of silence after last word)
            utterance_end_ms: '1000',

            // CRITICAL: Endpointing - finalize transcript after 300ms silence
            endpointing: '300',

            // VAD events for speech start/end
            vad_events: 'true',

            // Diarization for speaker identification (if dual channel)
            ...(dualChannel && { diarize: 'true' })
        });

        const deepgramUrl = `wss://api.deepgram.com/v1/listen?${params.toString()}`;
        console.log('[Deepgram] Connecting to:', deepgramUrl.substring(0, 80) + '...');

        const deepgramWs = new WebSocket(deepgramUrl, {
            headers: {
                'Authorization': `Token ${DEEPGRAM_API_KEY}`
            }
        });

        // Track accumulated transcript for utterance grouping
        let currentUtterance = '';
        let lastSpeaker = null;

        deepgramWs.on('open', () => {
            console.log('[Deepgram] Connected successfully');
            clientWs.send(JSON.stringify({ type: 'connected', provider: 'deepgram' }));
        });

        deepgramWs.on('message', (data) => {
            if (clientWs.readyState !== WebSocket.OPEN) return;

            try {
                const msg = JSON.parse(data.toString());

                // Handle different Deepgram message types
                if (msg.type === 'Results') {
                    const transcript = msg.channel?.alternatives?.[0]?.transcript || '';
                    const isFinal = msg.is_final === true;
                    const speechFinal = msg.speech_final === true;
                    const words = msg.channel?.alternatives?.[0]?.words || [];

                    // Determine speaker from diarization or channel
                    let speaker = 'candidate'; // default
                    if (dualChannel && msg.channel_index) {
                        // In dual channel mode: channel 0 = interviewer (system), channel 1 = candidate (mic)
                        speaker = msg.channel_index[0] === 0 ? 'interviewer' : 'candidate';
                    } else if (words.length > 0 && words[0].speaker !== undefined) {
                        speaker = words[0].speaker === 0 ? 'candidate' : 'interviewer';
                    }

                    if (transcript) {
                        console.log(`[Deepgram] ${isFinal ? 'FINAL' : 'interim'} | speech_final=${speechFinal} | speaker=${speaker} | "${transcript.substring(0, 50)}..."`);
                    }

                    // Send normalized message to client
                    clientWs.send(JSON.stringify({
                        type: 'transcript',
                        transcript: transcript,
                        is_final: isFinal,
                        speech_final: speechFinal,
                        speaker: speaker,
                        channel: msg.channel_index?.[0] || 0,
                        words: words,
                        // Include raw for debugging
                        raw_type: 'Results'
                    }));

                    // Accumulate final transcripts
                    if (isFinal && transcript) {
                        currentUtterance += (currentUtterance ? ' ' : '') + transcript;
                        lastSpeaker = speaker;
                    }

                    // If speech_final, this is a good point to process the full utterance
                    if (speechFinal && currentUtterance) {
                        console.log(`[Deepgram] Speech ended - Full utterance: "${currentUtterance.substring(0, 80)}..."`);
                    }

                } else if (msg.type === 'UtteranceEnd') {
                    // CRITICAL: This is when Deepgram detected end of speech
                    console.log('[Deepgram] *** UtteranceEnd received ***');
                    console.log(`[Deepgram] Final utterance to process: "${currentUtterance}"`);

                    clientWs.send(JSON.stringify({
                        type: 'utterance_end',
                        transcript: currentUtterance,
                        speaker: lastSpeaker || 'candidate',
                        last_word_end: msg.last_word_end
                    }));

                    // Reset for next utterance
                    currentUtterance = '';
                    lastSpeaker = null;

                } else if (msg.type === 'SpeechStarted') {
                    console.log('[Deepgram] Speech started');
                    clientWs.send(JSON.stringify({ type: 'speech_started' }));

                } else if (msg.type === 'Metadata') {
                    console.log('[Deepgram] Metadata received:', msg.request_id);

                } else if (msg.type === 'Error') {
                    console.error('[Deepgram] Error:', msg.message);
                    clientWs.send(JSON.stringify({ type: 'error', message: msg.message }));
                }

            } catch (e) {
                console.error('[Deepgram] Error parsing message:', e);
            }
        });

        deepgramWs.on('error', (error) => {
            console.error('[Deepgram] WebSocket error:', error.message);
            clientWs.send(JSON.stringify({ type: 'error', message: error.message }));
        });

        deepgramWs.on('close', (code, reason) => {
            console.log('[Deepgram] Connection closed:', code, reason?.toString());
            if (clientWs.readyState === WebSocket.OPEN) {
                clientWs.close();
            }
        });

        // Forward audio from client to Deepgram
        clientWs.on('message', (data, isBinary) => {
            if (deepgramWs.readyState === WebSocket.OPEN) {
                if (isBinary || Buffer.isBuffer(data)) {
                    deepgramWs.send(data);
                }
            }
        });

        clientWs.on('close', () => {
            console.log('[Deepgram] Client disconnected');
            if (deepgramWs.readyState === WebSocket.OPEN) {
                // Send close frame to Deepgram
                deepgramWs.close();
            }
        });

        clientWs.on('error', (error) => {
            console.error('[Deepgram] Client WebSocket error:', error.message);
        });
    }

    // ========================================================================
    // ASSEMBLYAI HANDLER - Legacy Fallback
    // ========================================================================
    function handleAssemblyAIConnection(clientWs, request, dualChannel) {
        console.log('[AssemblyAI] Using legacy fallback...');

        const activeUrl = new URL('wss://streaming.assemblyai.com/v3/ws');
        activeUrl.searchParams.set('sample_rate', '16000');
        activeUrl.searchParams.set('format_turns', 'false');
        activeUrl.searchParams.set('end_of_turn_confidence_threshold', '0.3');
        activeUrl.searchParams.set('min_end_of_turn_silence_when_confident', '160');
        activeUrl.searchParams.set('max_turn_silence', '400');

        if (dualChannel) {
            activeUrl.searchParams.set('multichannel', 'true');
        }

        const assemblyWs = new WebSocket(activeUrl.toString(), {
            headers: { 'Authorization': ASSEMBLYAI_API_KEY }
        });

        assemblyWs.on('open', () => {
            console.log('[AssemblyAI] Connected');
            clientWs.send(JSON.stringify({ type: 'connected', provider: 'assemblyai' }));
        });

        assemblyWs.on('message', (data) => {
            if (clientWs.readyState === WebSocket.OPEN) {
                const message = data.toString();
                try {
                    const parsed = JSON.parse(message);

                    // Normalize AssemblyAI format to match our new format
                    if (parsed.type === 'Turn') {
                        clientWs.send(JSON.stringify({
                            type: 'transcript',
                            transcript: parsed.transcript || '',
                            is_final: parsed.end_of_turn === true,
                            speech_final: parsed.end_of_turn === true,
                            speaker: dualChannel ? (parsed.channel === 1 ? 'candidate' : 'interviewer') : 'candidate',
                            channel: parsed.channel || 0,
                            raw_type: 'Turn'
                        }));

                        // Also send utterance_end when turn ends
                        if (parsed.end_of_turn === true && parsed.transcript) {
                            clientWs.send(JSON.stringify({
                                type: 'utterance_end',
                                transcript: parsed.transcript,
                                speaker: dualChannel ? (parsed.channel === 1 ? 'candidate' : 'interviewer') : 'candidate'
                            }));
                        }
                    } else if (parsed.type === 'Begin') {
                        clientWs.send(JSON.stringify({ type: 'session_started' }));
                    } else {
                        clientWs.send(message);
                    }
                } catch (e) {
                    clientWs.send(message);
                }
            }
        });

        assemblyWs.on('error', (error) => {
            console.error('[AssemblyAI] Error:', error.message);
            clientWs.send(JSON.stringify({ type: 'error', message: error.message }));
        });

        assemblyWs.on('close', (code, reason) => {
            console.log('[AssemblyAI] Closed:', code);
            if (clientWs.readyState === WebSocket.OPEN) {
                clientWs.close();
            }
        });

        clientWs.on('message', (data, isBinary) => {
            if (assemblyWs.readyState === WebSocket.OPEN) {
                if (isBinary || Buffer.isBuffer(data)) {
                    assemblyWs.send(data);
                }
            }
        });

        clientWs.on('close', () => {
            console.log('[AssemblyAI] Client disconnected');
            if (assemblyWs.readyState === WebSocket.OPEN) {
                assemblyWs.close();
            }
        });
    }

    server.listen(port, () => {
        console.log(`\\n> Ready on http://${hostname}:${port}`);
        console.log(`> WebSocket proxy available at ws://${hostname}:${port}/api/transcribe-ws`);
        console.log(`> STT Provider: ${STT_PROVIDER?.toUpperCase() || 'NONE'}`);
    });
});
