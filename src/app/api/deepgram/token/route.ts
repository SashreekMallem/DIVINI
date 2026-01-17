import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        // 1. Verify Authentication
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // 2. Check for Deepgram API Key
        const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY
        if (!DEEPGRAM_API_KEY) {
            console.error('DEEPGRAM_API_KEY is missing in environment variables')
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
        }

        // 3. Generate Ephemeral Key (valid for 10 seconds)
        // We use a short expiration because the key is only needed to establish the WebSocket connection.
        // Once connected, the socket stays open even if the key expires.
        const response = await fetch('https://api.deepgram.com/v1/projects/ba62b293-be5c-434f-8f86-9881f5315a05/keys', {
            method: 'POST',
            headers: {
                'Authorization': `Token ${DEEPGRAM_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                comment: `Ephemeral key for user ${user.id}`,
                scopes: ['usage:write'], // Minimum scope needed
                tags: ['web-client'],
                time_to_live_in_seconds: 10
            })
        })

        if (!response.ok) {
            const errorText = await response.text()
            console.error('Deepgram API Error:', errorText)
            throw new Error(`Failed to generate key: ${response.statusText}`)
        }

        const data = await response.json()

        // Deepgram returns { key_id, key, ... }
        return NextResponse.json({
            key: data.key,
            project_id: data.project_id
        })

    } catch (error: any) {
        console.error('Error in /api/deepgram/token:', error)
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
    }
}
