import { createBrowserClient } from '@supabase/ssr'

// Use untyped client to avoid type conflicts with generated types
// This is intentional - the generated Supabase types don't properly handle
// relationship queries and nullable fields
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Re-export for convenience
export { createClient as supabase }
