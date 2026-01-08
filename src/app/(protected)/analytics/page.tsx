import { createServerSupabaseClient } from '@/lib/supabase/server'
import {
    BarChart3,
    Clock,
    TrendingUp,
    Target,
    Mic,
    CheckCircle2,
    Calendar
} from 'lucide-react'

export default async function AnalyticsPage() {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return <div>Please log in</div>
    }

    const { data: interviews } = await supabase
        .from('interviews')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

    const allInterviews = interviews || []
    const completedInterviews = allInterviews.filter(i => i.session_status === 'completed')
    const passedInterviews = allInterviews.filter(i => i.interview_outcome === 'passed')

    const avgDuration = completedInterviews.length > 0
        ? Math.round(completedInterviews.reduce((acc, i) => acc + (i.actual_duration_seconds || 0), 0) / completedInterviews.length / 60)
        : 0

    const totalQuestions = allInterviews.reduce((acc, i) => acc + (i.total_questions || 0), 0)
    const successRate = allInterviews.length > 0 ? Math.round((passedInterviews.length / allInterviews.length) * 100) : 0

    const cardStyle = {
        background: 'linear-gradient(135deg, rgba(24, 24, 27, 0.8) 0%, rgba(24, 24, 27, 0.4) 100%)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        borderRadius: '20px',
    }

    const statCardStyle = (color: string, glow: string) => ({
        ...cardStyle,
        padding: '24px',
        position: 'relative' as const,
        overflow: 'hidden',
    })

    return (
        <div style={{ position: 'relative' }}>
            {/* Ambient glow */}
            <div style={{
                position: 'fixed',
                top: '-100px',
                right: '100px',
                width: '500px',
                height: '500px',
                background: 'radial-gradient(circle, rgba(59, 130, 246, 0.12) 0%, transparent 70%)',
                pointerEvents: 'none',
                zIndex: 0,
            }} />

            <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ marginBottom: '32px' }}>
                    <h1 style={{ fontSize: '36px', fontWeight: 700, marginBottom: '8px' }}>Analytics</h1>
                    <p style={{ color: '#71717a', fontSize: '15px' }}>Track your interview performance</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '32px' }}>
                    {[
                        { label: 'Total Interviews', value: allInterviews.length, icon: Mic, color: '#6366f1', glow: 'rgba(99, 102, 241, 0.2)' },
                        { label: 'Success Rate', value: `${successRate}%`, icon: TrendingUp, color: '#22c55e', glow: 'rgba(34, 197, 94, 0.2)' },
                        { label: 'Avg. Duration', value: `${avgDuration}m`, icon: Clock, color: '#a855f7', glow: 'rgba(168, 85, 247, 0.2)' },
                        { label: 'Total Questions', value: totalQuestions, icon: Target, color: '#3b82f6', glow: 'rgba(59, 130, 246, 0.2)' },
                    ].map((stat, i) => {
                        const Icon = stat.icon
                        return (
                            <div key={i} style={statCardStyle(stat.color, stat.glow)}>
                                <div style={{
                                    position: 'absolute',
                                    top: '-20px',
                                    right: '-20px',
                                    width: '100px',
                                    height: '100px',
                                    background: `radial-gradient(circle, ${stat.glow} 0%, transparent 70%)`,
                                    pointerEvents: 'none',
                                }} />
                                <div style={{ position: 'relative' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                                        <div style={{
                                            width: '44px',
                                            height: '44px',
                                            borderRadius: '14px',
                                            background: `${stat.color}20`,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}>
                                            <Icon style={{ width: '22px', height: '22px', color: stat.color }} />
                                        </div>
                                        <span style={{ fontSize: '14px', color: '#a1a1aa', fontWeight: 500 }}>{stat.label}</span>
                                    </div>
                                    <p style={{
                                        fontSize: '36px',
                                        fontWeight: 700,
                                        color: 'white',
                                        letterSpacing: '-0.02em',
                                    }}>
                                        {stat.value}
                                    </p>
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* Recent Activity */}
                <div style={cardStyle}>
                    <div style={{
                        padding: '20px 24px',
                        borderBottom: '1px solid rgba(255,255,255,0.06)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Calendar style={{ width: '18px', height: '18px', color: '#3b82f6' }} />
                            <h2 style={{ fontSize: '16px', fontWeight: 600 }}>Recent Activity</h2>
                        </div>
                    </div>

                    <div style={{ padding: '16px' }}>
                        {completedInterviews.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {completedInterviews.slice(0, 5).map((interview) => (
                                    <div
                                        key={interview.id}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '16px',
                                            padding: '16px',
                                            borderRadius: '14px',
                                            background: 'rgba(255,255,255,0.02)',
                                        }}
                                    >
                                        <div style={{
                                            width: '48px',
                                            height: '48px',
                                            borderRadius: '14px',
                                            background: interview.interview_outcome === 'passed' ? 'rgba(34, 197, 94, 0.1)' :
                                                interview.interview_outcome === 'failed' ? 'rgba(239, 68, 68, 0.1)' :
                                                    'rgba(39, 39, 42, 0.8)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}>
                                            {interview.interview_outcome === 'passed' ? (
                                                <CheckCircle2 style={{ width: '24px', height: '24px', color: '#22c55e' }} />
                                            ) : (
                                                <Mic style={{ width: '24px', height: '24px', color: '#a1a1aa' }} />
                                            )}
                                        </div>

                                        <div style={{ flex: 1 }}>
                                            <p style={{ fontWeight: 500, marginBottom: '4px' }}>
                                                {interview.round_name || interview.interview_type?.replace('_', ' ') || 'Interview'}
                                            </p>
                                            <p style={{ fontSize: '13px', color: '#71717a' }}>
                                                {new Date(interview.created_at || '').toLocaleDateString()} • {interview.total_questions || 0} questions • {Math.round((interview.actual_duration_seconds || 0) / 60)}m
                                            </p>
                                        </div>

                                        {interview.interview_outcome && (
                                            <span style={{
                                                padding: '6px 12px',
                                                borderRadius: '8px',
                                                fontSize: '12px',
                                                fontWeight: 500,
                                                background: interview.interview_outcome === 'passed' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                                color: interview.interview_outcome === 'passed' ? '#22c55e' : '#ef4444',
                                                textTransform: 'capitalize',
                                            }}>
                                                {interview.interview_outcome}
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '48px 24px' }}>
                                <div style={{
                                    width: '80px',
                                    height: '80px',
                                    borderRadius: '24px',
                                    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(99, 102, 241, 0.2))',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    margin: '0 auto 20px',
                                }}>
                                    <BarChart3 style={{ width: '36px', height: '36px', color: '#3b82f6' }} />
                                </div>
                                <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>No data yet</h3>
                                <p style={{ fontSize: '14px', color: '#71717a' }}>
                                    Complete interviews to see your analytics here
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
