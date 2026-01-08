import { getUser, createClient } from '@/lib/supabase/server'
import { Shield } from 'lucide-react'
import { AdminNav } from '@/components/layout/admin-nav'

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const user = await getUser()
    const supabase = await createClient()

    // Get user data for display (already checked in parent layout)
    const { data: userData } = await supabase
        .from('users')
        .select('email, full_name')
        .eq('id', user?.id || '')
        .single()

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#09090b' }}>
            {/* Admin Header */}
            <header style={{
                position: 'sticky',
                top: 0,
                zIndex: 50,
                backgroundColor: '#18181b',
                borderBottom: '1px solid #27272a',
                padding: '16px 32px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Shield style={{ width: 20, height: 20, color: '#6366f1' }} />
                    <span style={{ color: 'white', fontSize: 18, fontWeight: 600 }}>Admin Panel</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: '#71717a', fontSize: 13 }}>
                        {userData?.full_name || userData?.email || 'Admin'}
                    </span>
                </div>
            </header>

            {/* Admin Navigation - Client component for active state */}
            <AdminNav />

            {/* Main Content */}
            <main style={{ padding: '32px', maxWidth: '1600px', margin: '0 auto' }}>
                {children}
            </main>
        </div>
    )
}

