'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Zap, Loader2 } from 'lucide-react'

export default function LoginPage() {
    const router = useRouter()
    const supabase = createClient()

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        const { error, data } = await supabase.auth.signInWithPassword({ email, password })

        if (error) {
            setError(error.message)
            setLoading(false)
        } else if (data.user) {
            // Check if user is admin - default to false if query fails
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('is_admin')
                .eq('id', data.user.id)
                .single()

            // Only redirect to admin if query succeeded AND user is explicitly admin
            // If query fails or is_admin is null/false, go to dashboard (safer)
            const isAdmin = !userError && userData?.is_admin === true

            if (isAdmin) {
                router.push('/admin')
            } else {
                router.push('/dashboard')
            }
            router.refresh()
        }
    }

    const cardStyle = {
        background: 'linear-gradient(135deg, rgba(24, 24, 27, 0.8) 0%, rgba(24, 24, 27, 0.4) 100%)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        borderRadius: '24px',
    }

    return (
        <div style={{
            minHeight: '100vh',
            backgroundColor: '#09090b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            position: 'relative',
        }}>
            {/* Ambient glow */}
            <div style={{
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '600px',
                height: '600px',
                background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%)',
                pointerEvents: 'none',
            }} />

            <div style={{ width: '100%', maxWidth: '420px', position: 'relative', zIndex: 1 }}>
                <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                    <div style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '20px',
                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 24px',
                        boxShadow: '0 8px 32px rgba(99, 102, 241, 0.35)',
                    }}>
                        <Zap style={{ width: '32px', height: '32px', color: 'white' }} />
                    </div>
                    <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>Welcome to Divini</h1>
                    <p style={{ color: '#71717a', fontSize: '15px' }}>Sign in to your account</p>
                </div>

                <div style={{ ...cardStyle, padding: '32px' }}>
                    <form onSubmit={handleLogin}>
                        {error && (
                            <div style={{
                                padding: '14px 18px',
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                borderRadius: '14px',
                                fontSize: '14px',
                                color: '#ef4444',
                                marginBottom: '20px',
                            }}>
                                {error}
                            </div>
                        )}

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', fontSize: '13px', color: '#a1a1aa', marginBottom: '8px' }}>Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                required
                                style={{
                                    width: '100%',
                                    padding: '14px 18px',
                                    background: 'rgba(39, 39, 42, 0.8)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '14px',
                                    color: 'white',
                                    fontSize: '14px',
                                }}
                            />
                        </div>

                        <div style={{ marginBottom: '28px' }}>
                            <label style={{ display: 'block', fontSize: '13px', color: '#a1a1aa', marginBottom: '8px' }}>Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                style={{
                                    width: '100%',
                                    padding: '14px 18px',
                                    background: 'rgba(39, 39, 42, 0.8)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '14px',
                                    color: 'white',
                                    fontSize: '14px',
                                }}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '10px',
                                width: '100%',
                                padding: '14px',
                                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                border: 'none',
                                borderRadius: '14px',
                                color: 'white',
                                fontSize: '15px',
                                fontWeight: 600,
                                cursor: loading ? 'not-allowed' : 'pointer',
                                boxShadow: '0 4px 16px rgba(99, 102, 241, 0.3)',
                            }}
                        >
                            {loading && <Loader2 style={{ width: '18px', height: '18px', animation: 'spin 1s linear infinite' }} />}
                            {loading ? 'Signing in...' : 'Sign In'}
                        </button>
                    </form>
                </div>

                <p style={{ textAlign: 'center', fontSize: '14px', color: '#71717a', marginTop: '28px' }}>
                    Don&apos;t have an account?{' '}
                    <Link href="/register" style={{ color: '#818cf8', textDecoration: 'none', fontWeight: 500 }}>
                        Sign up
                    </Link>
                </p>
            </div>
        </div>
    )
}
