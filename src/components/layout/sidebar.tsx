'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
    LayoutDashboard,
    Mic,
    FileText,
    FolderKanban,
    BarChart3,
    Shield,
    LogOut,
    Sparkles,
    Zap
} from 'lucide-react'
import type { User } from '@supabase/supabase-js'

const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Interviews', href: '/interviews', icon: Mic },
    { name: 'Applications', href: '/applications', icon: FolderKanban },
    { name: 'Resumes', href: '/resumes', icon: FileText },
    { name: 'Analytics', href: '/analytics', icon: BarChart3 },
    { name: 'Admin', href: '/admin', icon: Shield, adminOnly: true },
]

interface SidebarProps {
    user: User
}

export function Sidebar({ user }: SidebarProps) {
    const pathname = usePathname()
    const router = useRouter()
    const supabase = createClient()

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        router.push('/login')
        router.refresh()
    }

    return (
        <aside style={{
            position: 'fixed',
            top: 0,
            left: 0,
            bottom: 0,
            width: '256px',
            backgroundColor: '#0a0a0f',
            borderRight: '1px solid #27272a',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 50,
        }}>
            {/* Logo */}
            <div style={{
                height: '64px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '0 20px',
                borderBottom: '1px solid #27272a',
            }}>
                <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)',
                }}>
                    <Zap style={{ width: '20px', height: '20px', color: 'white' }} />
                </div>
                <div>
                    <span style={{ fontWeight: 600, color: 'white' }}>Divini</span>
                </div>
            </div>

            {/* Navigation */}
            <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {navigation.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                    const Icon = item.icon

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '10px 12px',
                                borderRadius: '12px',
                                fontSize: '14px',
                                fontWeight: 500,
                                textDecoration: 'none',
                                transition: 'all 0.2s',
                                backgroundColor: isActive ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                                color: isActive ? '#818cf8' : '#a1a1aa',
                            }}
                        >
                            <Icon style={{ width: '20px', height: '20px' }} />
                            {item.name}
                            {isActive && (
                                <div style={{
                                    marginLeft: 'auto',
                                    width: '6px',
                                    height: '6px',
                                    borderRadius: '50%',
                                    backgroundColor: '#818cf8',
                                }} />
                            )}
                        </Link>
                    )
                })}
            </nav>

            {/* New Interview CTA */}
            <div style={{ padding: '0 12px 16px' }}>
                <Link
                    href="/interviews/new"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        width: '100%',
                        height: '44px',
                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        borderRadius: '12px',
                        fontWeight: 500,
                        color: 'white',
                        fontSize: '14px',
                        textDecoration: 'none',
                        boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)',
                    }}
                >
                    <Sparkles style={{ width: '16px', height: '16px' }} />
                    New Interview
                </Link>
            </div>

            {/* User Section */}
            <div style={{ padding: '12px', borderTop: '1px solid #27272a' }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '8px',
                    borderRadius: '12px',
                }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 500,
                        color: 'white',
                        fontSize: '14px',
                    }}>
                        {(user.email?.[0] || 'U').toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '14px', fontWeight: 500, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {user.user_metadata?.full_name || 'User'}
                        </p>
                        <p style={{ fontSize: '12px', color: '#71717a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {user.email}
                        </p>
                    </div>
                </div>
                <button
                    onClick={handleSignOut}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        width: '100%',
                        marginTop: '8px',
                        padding: '8px 12px',
                        fontSize: '14px',
                        color: '#a1a1aa',
                        backgroundColor: 'transparent',
                        border: 'none',
                        borderRadius: '12px',
                        cursor: 'pointer',
                    }}
                >
                    <LogOut style={{ width: '16px', height: '16px' }} />
                    Sign out
                </button>
            </div>
        </aside>
    )
}
