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

        // 3. (TEMPORARY) Return Static Key directly
        // Reason: The provided API key does not have 'keys:write' or 'member' permissions to generate temporary keys.
        // Fallback: We return the static key so the client can connect. 
        // WARNING: This exposes the long-lived API key to the client. Ideally, replace this with the logic below once an Admin key is provided.

        /* 
        // SECURE IMPLEMENTATION (Requires Admin/Member Key):
        const response = await fetch('https://api.deepgram.com/v1/projects/.../keys', { ... })
        */

        console.warn('⚠️ Using static Deepgram key (Permissions Restricted)')

        return NextResponse.json({
            key: DEEPGRAM_API_KEY,
            // project_id: '...' // Optional
        })

    } catch (error: any) {
        console.error('Error in /api/deepgram/token:', error)
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
    }
}
