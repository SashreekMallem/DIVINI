// Custom server for WebSocket proxy to AssemblyAI
// Run with: npm run dev:ws

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

const ASSEMBLYAI_API_KEY = process.env.ASSEMBLYAI_API_KEY;

console.log('AssemblyAI API Key loaded:', ASSEMBLYAI_API_KEY ? 'Yes' : 'No');

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
        } else {
            // Do not destroy requests to _next/webpack-hmr or valid Next.js paths
            // Next.js handles these internally via the same server instance if we don't block them
            // socket.destroy(); 
        }
    });

    wss.on('connection', (clientWs, request) => {
        console.log('Client connected to transcription proxy');

        if (!ASSEMBLYAI_API_KEY) {
            console.error('AssemblyAI API key not configured');
            clientWs.send(JSON.stringify({ type: 'error', message: 'AssemblyAI API key not configured' }));
            clientWs.close();
            return;
        }

        // Connect to AssemblyAI with Authorization header
        // PRODUCTION SETTINGS based on Vapi/LiveKit/Pipecat best practices
        const activeUrl = new URL('wss://streaming.assemblyai.com/v3/ws')
        activeUrl.searchParams.set('sample_rate', 16000)
        
        // CRITICAL: format_turns=false saves ~200ms latency
        // We don't need punctuation for LLM input
        activeUrl.searchParams.set('format_turns', 'false')
        
        // AGGRESSIVE turn detection for minimal latency (from production voice AI research)
        // These settings prioritize speed over accuracy
        activeUrl.searchParams.set('end_of_turn_confidence_threshold', '0.3') // Default 0.4, lower = faster
        activeUrl.searchParams.set('min_end_of_turn_silence_when_confident', '160') // Default 400ms, Vapi uses 160ms
        activeUrl.searchParams.set('max_turn_silence', '400') // Default 1280ms, aggressive fallback

        // Check if client requested dual channel (multichannel)
        const clientUrl = new URL(request.url, `http://${request.headers.host}`)
        if (clientUrl.searchParams.get('dual_channel') === 'true') {
            activeUrl.searchParams.set('multichannel', 'true')
            console.log('Enabling multichannel (stereo) mode for AssemblyAI')
        }
        
        console.log('AssemblyAI WebSocket URL:', activeUrl.toString())

        const assemblyWs = new WebSocket(
            activeUrl.toString(),
            {
                headers: {
                    'Authorization': ASSEMBLYAI_API_KEY
                }
            }
        );

        assemblyWs.on('open', () => {
            console.log('Connected to AssemblyAI');
            clientWs.send(JSON.stringify({ type: 'connected' }));
        });

        assemblyWs.on('message', (data) => {
            // Forward transcription results to client IMMEDIATELY (no processing delay)
            if (clientWs.readyState === WebSocket.OPEN) {
                const message = data.toString();
                
                // Quick parse for logging only
                try {
                    const parsed = JSON.parse(message);
                    if (parsed.type === 'Turn') {
                        console.log(`[AssemblyAI Turn] end_of_turn=${parsed.end_of_turn}, confidence=${(parsed.end_of_turn_confidence || 0).toFixed(3)}, text="${(parsed.transcript || '').substring(0, 30)}..."`);
                    } else {
                        console.log(`[AssemblyAI] ${parsed.type}`);
                    }
                } catch (e) {
                    // Not JSON, just forward
                }
                
                // CRITICAL: Forward immediately without any delay
                clientWs.send(message);
            }
        });

        assemblyWs.on('error', (error) => {
            console.error('AssemblyAI error:', error.message);
            if (clientWs.readyState === WebSocket.OPEN) {
                clientWs.send(JSON.stringify({ type: 'error', message: error.message }));
            }
        });

        assemblyWs.on('close', (code, reason) => {
            console.log('AssemblyAI closed:', code, reason?.toString());
            if (clientWs.readyState === WebSocket.OPEN) {
                clientWs.close();
            }
        });

        // Forward audio from client to AssemblyAI
        clientWs.on('message', (data, isBinary) => {
            if (assemblyWs.readyState === WebSocket.OPEN) {
                if (isBinary || Buffer.isBuffer(data)) {
                    // Forward binary audio data
                    assemblyWs.send(data);
                } else {
                    // JSON message from client
                    try {
                        const msg = JSON.parse(data.toString());
                        console.log('Client JSON message:', msg.type);
                    } catch {
                        // Not JSON, might be audio data as string
                        assemblyWs.send(data);
                    }
                }
            }
        });

        clientWs.on('close', () => {
            console.log('Client disconnected');
            if (assemblyWs.readyState === WebSocket.OPEN) {
                assemblyWs.close();
            }
        });

        clientWs.on('error', (error) => {
            console.error('Client WebSocket error:', error.message);
        });
    });

    server.listen(port, () => {
        console.log(`> Ready on http://${hostname}:${port}`);
        console.log(`> WebSocket proxy available at ws://${hostname}:${port}/api/transcribe-ws`);
    });
});
