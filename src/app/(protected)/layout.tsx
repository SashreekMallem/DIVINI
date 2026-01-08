import { redirect } from 'next/navigation'
import { getUser, createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/sidebar'

export default async function ProtectedLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const user = await getUser()

    if (!user) {
        redirect('/login')
    }

    // If user is admin, redirect to admin panel (they should NEVER see user interface)
    const supabase = await createClient()
    const { data: userData, error } = await supabase
        .from('users')
        .select('is_admin')
        .eq('id', user.id)
        .single()

    // Only redirect to admin if query succeeded AND user is explicitly admin (=== true)
    // If query failed or is_admin is null/false, show user interface (safer)
    const isAdmin = !error && userData?.is_admin === true

    if (isAdmin) {
        redirect('/admin')
    }

    // If query failed, log it but continue (might be RLS issue, but we'll catch it)
    if (error) {
        console.error('ProtectedLayout: Error checking admin status:', error)
    }

    // Regular users only - show sidebar
    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#09090b' }}>
            <Sidebar user={user} />
            <main style={{ marginLeft: '256px', minHeight: '100vh' }}>
                <div style={{ padding: '32px', maxWidth: '1280px', margin: '0 auto' }}>
                    {children}
                </div>
            </main>
        </div>
    )
}
