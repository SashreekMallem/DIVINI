# DIVINI — AI Interview & Job Application Intelligence

A desktop app for job seekers built on Electron + Next.js. Tracks your application pipeline, records and analyses interview sessions, and surfaces AI coaching insights from what was actually said.

## What it does

Most interview prep tools give you generic advice. DIVINI records your real interviews and tells you what happened — what you said well, what you missed, where you rambled.

- **Interview recording** — Real-time audio capture via Deepgram with low-latency transcription
- **AI answer generation** — Live AI-powered answer suggestions during interview sessions
- **Post-session analysis** — Multi-modal AI flows analyse transcripts to surface coaching insights
- **Resume parsing** — Upload a resume, get structured extraction of experience and skills
- **Coding assistant** — Integrated coding solution panel for technical interviews
- **Application tracker** — Full pipeline view across all active applications
- **Analytics dashboard** — Interview performance trends over time

## Tech stack

- **Desktop** — Electron with custom IPC bridge
- **Frontend** — Next.js, TypeScript, Tailwind CSS, shadcn/ui
- **Audio** — Deepgram real-time transcription, Web Audio API worklet
- **AI** — Supabase Edge Functions (Deno) for answer generation, resume parsing, context summarisation
- **Database** — Supabase (Postgres + Auth)
- **Admin** — Full admin panel with user management, interview analytics, pricing controls

## Architecture note

Audio capture runs in a dedicated Web Audio worklet to avoid blocking the main thread. The context manager maintains a rolling window of transcript segments and compresses them before sending to the AI layer — keeping token costs bounded during long sessions. On-device inference via vLLM was evaluated for privacy of recorded sessions; cloud AI was selected for latency and model quality at current scale.
