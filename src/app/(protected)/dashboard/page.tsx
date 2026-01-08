import { createServerSupabaseClient } from '@/lib/supabase/server'
import Link from 'next/link'
import {
    Mic,
    FileText,
    Building2,
    TrendingUp,
    ArrowRight,
    Clock,
    CheckCircle2,
    XCircle,
    Sparkles,
    Calendar,
    BarChart3,
    Plus,
    Zap
} from 'lucide-react'
import type { Interview, Application, Resume, Company } from '@/types/database'

type ApplicationWithCompany = Application & { companies: Company | null }

export default async function DashboardPage() {
    const supabase = await createServerSupabaseClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return <div>Please log in</div>
    }

    const [interviewsRes, applicationsRes, resumesRes] = await Promise.all([
        supabase
            .from('interviews')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(5),
        supabase
            .from('applications')
            .select('*, companies(*)')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(5),
        supabase
            .from('resumes')
            .select('*')
            .eq('user_id', user.id)
            .eq('is_active', true)
    ])

    const interviews = (interviewsRes.data || []) as unknown as Interview[]
    const applications = (applicationsRes.data || []) as unknown as ApplicationWithCompany[]
    const resumes = (resumesRes.data || []) as unknown as Resume[]

    const totalInterviews = interviews.length
    const totalApplications = applications.length
    const totalResumes = resumes.length
    const passedInterviews = interviews.filter(i => i.interview_outcome === 'passed').length
    const successRate = totalInterviews > 0 ? Math.round((passedInterviews / totalInterviews) * 100) : 0

    const getGreeting = () => {
        const hour = new Date().getHours()
        if (hour < 12) return 'Good morning'
        if (hour < 18) return 'Good afternoon'
        return 'Good evening'
    }

    const firstName = user.user_metadata?.full_name?.split(' ')[0] || 'there'

    // Styles
    const cardStyle = {
        background: 'linear-gradient(135deg, rgba(24, 24, 27, 0.8) 0%, rgba(24, 24, 27, 0.4) 100%)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        borderRadius: '20px',
    }

    const statCardStyle = (color: string) => ({
        ...cardStyle,
        position: 'relative' as const,
        overflow: 'hidden',
    })

    return (
        <div style={{ position: 'relative' }}>
            {/* Ambient Background Glow */}
            <div style={{
                position: 'fixed',
                top: '-200px',
                right: '100px',
                width: '600px',
                height: '600px',
                background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%)',
                pointerEvents: 'none',
                zIndex: 0,
            }} />
            <div style={{
                position: 'fixed',
                bottom: '-200px',
                left: '300px',
                width: '500px',
                height: '500px',
                background: 'radial-gradient(circle, rgba(139, 92, 246, 0.1) 0%, transparent 70%)',
                pointerEvents: 'none',
                zIndex: 0,
            }} />

            <div style={{ position: 'relative', zIndex: 1 }}>
                {/* Hero Section */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px' }}>
                    <div>
                        <p style={{ fontSize: '14px', color: '#a1a1aa', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {getGreeting()}
                        </p>
                        <h1 style={{
                            fontSize: '48px',
                            fontWeight: 700,
                            lineHeight: 1.1,
                            background: 'linear-gradient(135deg, #ffffff 0%, #a5b4fc 50%, #c4b5fd 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                        }}>
                            {firstName}
                        </h1>
                        <p style={{ fontSize: '18px', color: '#71717a', marginTop: '8px' }}>
                            Ready to ace your next interview?
                        </p>
                    </div>
                    <Link
                        href="/interviews/new"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '16px 28px',
                            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                            borderRadius: '16px',
                            fontWeight: 600,
                            color: 'white',
                            textDecoration: 'none',
                            fontSize: '15px',
                            boxShadow: '0 8px 32px rgba(99, 102, 241, 0.35), inset 0 1px 0 rgba(255,255,255,0.2)',
                            transition: 'all 0.3s',
                        }}
                    >
                        <Sparkles style={{ width: '18px', height: '18px' }} />
                        Start AI Interview
                    </Link>
                </div>

                {/* Stats Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '40px' }}>
                    {[
                        { label: 'Interviews', value: totalInterviews, icon: Mic, color: '#6366f1', glow: 'rgba(99, 102, 241, 0.2)' },
                        { label: 'Passed', value: passedInterviews, icon: CheckCircle2, color: '#22c55e', glow: 'rgba(34, 197, 94, 0.2)' },
                        { label: 'Applications', value: totalApplications, icon: Building2, color: '#a855f7', glow: 'rgba(168, 85, 247, 0.2)' },
                        { label: 'Success Rate', value: `${successRate}%`, icon: TrendingUp, color: '#ec4899', glow: 'rgba(236, 72, 153, 0.2)' },
                    ].map((stat, i) => {
                        const Icon = stat.icon
                        return (
                            <div key={i} style={statCardStyle(stat.color)}>
                                {/* Glow effect */}
                                <div style={{
                                    position: 'absolute',
                                    top: '-20px',
                                    right: '-20px',
                                    width: '100px',
                                    height: '100px',
                                    background: `radial-gradient(circle, ${stat.glow} 0%, transparent 70%)`,
                                    pointerEvents: 'none',
                                }} />
                                <div style={{ padding: '24px', position: 'relative' }}>
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
                                        color: stat.label === 'Success Rate' || stat.label === 'Passed' ? stat.color : 'white',
                                        letterSpacing: '-0.02em',
                                    }}>
                                        {stat.value}
                                    </p>
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* Main Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
                    {/* Recent Interviews */}
                    <div style={cardStyle}>
                        <div style={{
                            padding: '20px 24px',
                            borderBottom: '1px solid rgba(255,255,255,0.06)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Clock style={{ width: '18px', height: '18px', color: '#6366f1' }} />
                                <h2 style={{ fontSize: '16px', fontWeight: 600 }}>Recent Interviews</h2>
                            </div>
                            <Link href="/interviews" style={{ fontSize: '13px', color: '#818cf8', textDecoration: 'none' }}>
                                View all →
                            </Link>
                        </div>

                        <div style={{ padding: '16px' }}>
                            {interviews.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {interviews.map((interview) => (
                                        <Link
                                            key={interview.id}
                                            href={`/interviews/${interview.id}`}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '16px',
                                                padding: '16px',
                                                borderRadius: '14px',
                                                border: '1px solid rgba(255,255,255,0.04)',
                                                textDecoration: 'none',
                                                color: 'inherit',
                                                transition: 'all 0.2s',
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
                                                ) : interview.interview_outcome === 'failed' ? (
                                                    <XCircle style={{ width: '24px', height: '24px', color: '#ef4444' }} />
                                                ) : (
                                                    <Mic style={{ width: '24px', height: '24px', color: '#a1a1aa' }} />
                                                )}
                                            </div>

                                            <div style={{ flex: 1 }}>
                                                <p style={{ fontWeight: 500, marginBottom: '4px' }}>
                                                    {interview.round_name || interview.interview_type?.replace('_', ' ') || 'Interview'}
                                                </p>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#71717a' }}>
                                                    <Calendar style={{ width: '12px', height: '12px' }} />
                                                    <span>{new Date(interview.created_at || '').toLocaleDateString()}</span>
                                                    <span>•</span>
                                                    <span>{interview.total_questions || 0} questions</span>
                                                </div>
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

                                            <ArrowRight style={{ width: '16px', height: '16px', color: '#52525b' }} />
                                        </Link>
                                    ))}
                                </div>
                            ) : (
                                <div style={{ textAlign: 'center', padding: '48px 24px' }}>
                                    <div style={{
                                        width: '80px',
                                        height: '80px',
                                        borderRadius: '24px',
                                        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(139, 92, 246, 0.2))',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        margin: '0 auto 20px',
                                    }}>
                                        <Zap style={{ width: '36px', height: '36px', color: '#818cf8' }} />
                                    </div>
                                    <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>No interviews yet</h3>
                                    <p style={{ fontSize: '14px', color: '#71717a', marginBottom: '24px', maxWidth: '280px', margin: '0 auto 24px' }}>
                                        Start your first AI-powered mock interview and get real-time coaching
                                    </p>
                                    <Link
                                        href="/interviews/new"
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            padding: '12px 24px',
                                            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                            borderRadius: '12px',
                                            fontWeight: 500,
                                            color: 'white',
                                            textDecoration: 'none',
                                            fontSize: '14px',
                                            boxShadow: '0 4px 16px rgba(99, 102, 241, 0.3)',
                                        }}
                                    >
                                        <Sparkles style={{ width: '16px', height: '16px' }} />
                                        Start Your First Interview
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {/* Applications */}
                        <div style={cardStyle}>
                            <div style={{
                                padding: '16px 20px',
                                borderBottom: '1px solid rgba(255,255,255,0.06)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Building2 style={{ width: '16px', height: '16px', color: '#a855f7' }} />
                                    <h2 style={{ fontSize: '14px', fontWeight: 600 }}>Applications</h2>
                                </div>
                                <Link href="/applications" style={{ fontSize: '12px', color: '#818cf8', textDecoration: 'none' }}>
                                    View all →
                                </Link>
                            </div>

                            <div style={{ padding: '12px' }}>
                                {applications.length > 0 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        {applications.slice(0, 4).map((app) => (
                                            <Link
                                                key={app.id}
                                                href={`/applications/${app.id}`}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '12px',
                                                    padding: '12px',
                                                    borderRadius: '12px',
                                                    textDecoration: 'none',
                                                    color: 'inherit',
                                                }}
                                            >
                                                <div style={{
                                                    width: '36px',
                                                    height: '36px',
                                                    borderRadius: '10px',
                                                    background: 'rgba(39, 39, 42, 0.8)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                }}>
                                                    <Building2 style={{ width: '18px', height: '18px', color: '#a1a1aa' }} />
                                                </div>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <p style={{ fontSize: '14px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {(app.companies as { name: string } | null)?.name || 'Unknown'}
                                                    </p>
                                                    <p style={{ fontSize: '12px', color: '#71717a', textTransform: 'capitalize' }}>
                                                        {(app.status || 'applied').replace('_', ' ')}
                                                    </p>
                                                </div>
                                                <div style={{
                                                    width: '8px',
                                                    height: '8px',
                                                    borderRadius: '50%',
                                                    background: app.status === 'offer' ? '#22c55e' :
                                                        app.status === 'rejected' ? '#ef4444' :
                                                            app.status === 'interviewing' ? '#6366f1' :
                                                                '#52525b',
                                                }} />
                                            </Link>
                                        ))}
                                    </div>
                                ) : (
                                    <div style={{ textAlign: 'center', padding: '24px 16px' }}>
                                        <p style={{ fontSize: '13px', color: '#71717a', marginBottom: '12px' }}>Track your applications</p>
                                        <Link
                                            href="/applications"
                                            style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                padding: '8px 16px',
                                                background: 'rgba(99, 102, 241, 0.1)',
                                                borderRadius: '10px',
                                                fontSize: '13px',
                                                color: '#818cf8',
                                                textDecoration: 'none',
                                            }}
                                        >
                                            <Plus style={{ width: '14px', height: '14px' }} />
                                            Add Application
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Quick Links */}
                        <Link href="/resumes" style={cardStyle as any}>
                            <div style={{
                                padding: '20px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '16px',
                                textDecoration: 'none',
                                color: 'inherit',
                            }}>
                                <div style={{
                                    width: '48px',
                                    height: '48px',
                                    borderRadius: '14px',
                                    background: 'rgba(34, 197, 94, 0.1)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}>
                                    <FileText style={{ width: '24px', height: '24px', color: '#22c55e' }} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <p style={{ fontWeight: 500, marginBottom: '2px' }}>Resumes</p>
                                    <p style={{ fontSize: '13px', color: '#71717a' }}>{totalResumes} active</p>
                                </div>
                                <ArrowRight style={{ width: '16px', height: '16px', color: '#52525b' }} />
                            </div>
                        </Link>

                        <Link href="/analytics" style={cardStyle as any}>
                            <div style={{
                                padding: '20px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '16px',
                                textDecoration: 'none',
                                color: 'inherit',
                            }}>
                                <div style={{
                                    width: '48px',
                                    height: '48px',
                                    borderRadius: '14px',
                                    background: 'rgba(59, 130, 246, 0.1)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}>
                                    <BarChart3 style={{ width: '24px', height: '24px', color: '#3b82f6' }} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <p style={{ fontWeight: 500, marginBottom: '2px' }}>Analytics</p>
                                    <p style={{ fontSize: '13px', color: '#71717a' }}>View insights</p>
                                </div>
                                <ArrowRight style={{ width: '16px', height: '16px', color: '#52525b' }} />
                            </div>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    )
}
