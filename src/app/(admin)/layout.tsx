import { redirect } from 'next/navigation'
import { getUser, createClient } from '@/lib/supabase/server'

export default async function AdminRouteGroupLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const user = await getUser()

    if (!user) {
        redirect('/login')
    }

    // Check if user is admin - if not, redirect to dashboard
    const supabase = await createClient()
    const { data: userData, error } = await supabase
        .from('users')
        .select('is_admin')
        .eq('id', user.id)
        .single()

    // Only allow access if query succeeded AND user is explicitly admin (=== true)
    // If query failed or is_admin is null/false, redirect to dashboard (safer)
    const isAdmin = !error && userData?.is_admin === true

    if (!isAdmin) {
        redirect('/dashboard')
    }

    // Admin routes - no parent layout, completely separate
    return <>{children}</>
}

