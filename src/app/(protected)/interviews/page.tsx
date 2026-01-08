'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import {
    Mic,
    Plus,
    Clock,
    CheckCircle2,
    XCircle,
    ChevronRight,
    ChevronDown,
    Building2,
    Sparkles,
    Loader2
} from 'lucide-react'
import type { Interview, Company } from '@/types/database'

interface InterviewWithCompany extends Interview {
    companies: Company | null
}

interface GroupedInterviews {
    company: Company | null
    companyName: string
    interviews: InterviewWithCompany[]
}

export default function InterviewsPage() {
    const supabase = createClient()
    const [interviews, setInterviews] = useState<InterviewWithCompany[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadInterviews()
    }, [])

    const loadInterviews = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data } = await supabase
            .from('interviews')
            .select('*, companies(*)')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })

        setInterviews((data || []) as InterviewWithCompany[])
        setLoading(false)
    }

    // Group interviews by company
    const groupedByCompany = interviews.reduce<Record<string, GroupedInterviews>>((acc, interview) => {
        const companyId = interview.company_id || 'no-company'
        const companyName = interview.companies?.name || 'No Company'

        if (!acc[companyId]) {
            acc[companyId] = {
                company: interview.companies,
                companyName,
                interviews: []
            }
        }
        acc[companyId].interviews.push(interview)
        return acc
    }, {})

    const companyGroups = Object.values(groupedByCompany).sort((a, b) =>
        a.companyName.localeCompare(b.companyName)
    )

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        })
    }

    const formatDuration = (seconds: number | null) => {
        if (!seconds) return '-'
        const mins = Math.floor(seconds / 60)
        return `${mins} min`
    }

    const getStatusIcon = (status: string | null, outcome: string | null) => {
        if (outcome === 'passed') return <CheckCircle2 style={{ width: '16px', height: '16px', color: '#22c55e' }} />
        if (outcome === 'failed') return <XCircle style={{ width: '16px', height: '16px', color: '#ef4444' }} />
        if (status === 'completed') return <CheckCircle2 style={{ width: '16px', height: '16px', color: '#3b82f6' }} />
        if (status === 'in_progress') return <Mic style={{ width: '16px', height: '16px', color: '#eab308' }} />
        return <Clock style={{ width: '16px', height: '16px', color: '#71717a' }} />
    }

    const cardStyle = {
        background: 'linear-gradient(135deg, rgba(24, 24, 27, 0.8) 0%, rgba(24, 24, 27, 0.4) 100%)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        borderRadius: '20px',
    }

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
                <Loader2 style={{ width: '32px', height: '32px', color: '#6366f1', animation: 'spin 1s linear infinite' }} />
            </div>
        )
    }

    return (
        <div style={{ position: 'relative' }}>
            {/* Ambient glow */}
            <div style={{
                position: 'fixed',
                top: '-100px',
                right: '200px',
                width: '500px',
                height: '500px',
                background: 'radial-gradient(circle, rgba(99, 102, 241, 0.12) 0%, transparent 70%)',
                pointerEvents: 'none',
                zIndex: 0,
            }} />

            <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                    <div>
                        <h1 style={{ fontSize: '36px', fontWeight: 700, marginBottom: '8px' }}>Interviews</h1>
                        <p style={{ color: '#71717a', fontSize: '15px' }}>View and manage your interview sessions by company</p>
                    </div>
                    <Link
                        href="/interviews/new"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '12px 24px',
                            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                            borderRadius: '14px',
                            fontWeight: 500,
                            color: 'white',
                            textDecoration: 'none',
                            fontSize: '14px',
                            boxShadow: '0 4px 16px rgba(99, 102, 241, 0.3)',
                        }}
                    >
                        <Plus style={{ width: '18px', height: '18px' }} />
                        New Interview
                    </Link>
                </div>

                {companyGroups.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        {companyGroups.map((group) => (
                            <div key={group.companyName} style={cardStyle}>
                                {/* Company Header */}
                                <div style={{
                                    padding: '20px 24px',
                                    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '14px',
                                }}>
                                    <div style={{
                                        width: '44px',
                                        height: '44px',
                                        borderRadius: '12px',
                                        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(139, 92, 246, 0.2))',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}>
                                        <Building2 style={{ width: '22px', height: '22px', color: '#6366f1' }} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <h2 style={{ fontSize: '18px', fontWeight: 600 }}>{group.companyName}</h2>
                                        <p style={{ fontSize: '13px', color: '#71717a' }}>
                                            {group.interviews.length} interview{group.interviews.length !== 1 ? 's' : ''}
                                        </p>
                                    </div>
                                    <ChevronDown style={{ width: '20px', height: '20px', color: '#71717a' }} />
                                </div>

                                {/* Interviews List */}
                                <div style={{ padding: '8px' }}>
                                    {group.interviews.map((interview, idx) => (
                                        <Link
                                            key={interview.id}
                                            href={`/interviews/${interview.id}`}
                                            style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
                                        >
                                            <div
                                                className="interview-row"
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '16px',
                                                    padding: '16px',
                                                    borderRadius: '14px',
                                                    cursor: 'pointer',
                                                    borderBottom: idx < group.interviews.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                                                }}
                                            >
                                                {getStatusIcon(interview.session_status, interview.interview_outcome)}

                                                <div style={{ flex: 1 }}>
                                                    <p style={{ fontWeight: 500, marginBottom: '4px' }}>
                                                        {interview.round_name || `Round ${interview.round_number}`}
                                                    </p>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px', color: '#71717a' }}>
                                                        <span style={{ textTransform: 'capitalize' }}>{interview.interview_type?.replace('_', ' ')}</span>
                                                        <span>•</span>
                                                        <span>{formatDate(interview.created_at || '')}</span>
                                                        {interview.actual_duration_seconds && (
                                                            <>
                                                                <span>•</span>
                                                                <span>{formatDuration(interview.actual_duration_seconds)}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>

                                                {interview.total_questions && interview.total_questions > 0 && (
                                                    <div style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        padding: '4px 10px',
                                                        background: 'rgba(168, 85, 247, 0.1)',
                                                        borderRadius: '8px',
                                                        fontSize: '12px',
                                                        color: '#a855f7',
                                                    }}>
                                                        <Sparkles style={{ width: '12px', height: '12px' }} />
                                                        {interview.total_questions} Q&A
                                                    </div>
                                                )}

                                                <ChevronRight style={{ width: '18px', height: '18px', color: '#52525b' }} />
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div style={cardStyle}>
                        <div style={{ padding: '60px 40px', textAlign: 'center' }}>
                            <div style={{
                                width: '80px',
                                height: '80px',
                                borderRadius: '24px',
                                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1))',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 20px',
                            }}>
                                <Mic style={{ width: '36px', height: '36px', color: '#6366f1' }} />
                            </div>
                            <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px' }}>No interviews yet</h2>
                            <p style={{ color: '#71717a', fontSize: '14px', marginBottom: '24px', maxWidth: '360px', margin: '0 auto 24px' }}>
                                Start your first AI-powered interview session to get real-time coaching
                            </p>
                            <Link
                                href="/interviews/new"
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '12px 24px',
                                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                    borderRadius: '14px',
                                    fontWeight: 500,
                                    color: 'white',
                                    textDecoration: 'none',
                                    fontSize: '14px',
                                }}
                            >
                                <Plus style={{ width: '18px', height: '18px' }} />
                                New Interview
                            </Link>
                        </div>
                    </div>
                )}
            </div>

            {/* Hover styles */}
            <style>{`
                .interview-row:hover {
                    background: rgba(255,255,255,0.03);
                }
            `}</style>
        </div>
    )
}
