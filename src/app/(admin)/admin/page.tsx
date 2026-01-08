'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
    Users,
    DollarSign,
    TrendingUp,
    Mic,
    Brain,
    Clock,
    AlertCircle,
    Settings,
    RefreshCw,
    ChevronDown,
    ChevronUp,
    ExternalLink,
    MessageSquare,
    Briefcase,
    Activity,
    LayoutDashboard,
    Search,
    Filter,
    BarChart3
} from 'lucide-react'
import Link from 'next/link'

interface User {
    id: string
    email: string
    full_name: string | null
    created_at: string
    is_admin: boolean
    total_interviews: number
}

interface UsageStats {
    total_users: number
    total_interviews: number
    total_questions: number
    total_gemini_calls: number
    total_audio_minutes: number
    total_cost_cents: number
    total_revenue_cents: number
}

interface PricingConfig {
    id: string
    gemini_input_per_1k_tokens: number
    gemini_output_per_1k_tokens: number
    assemblyai_per_hour: number
    markup_percentage: number
    tier_free_monthly_limit: number
    tier_basic_price: number
    tier_basic_interviews: number
    tier_pro_price: number
    tier_pro_interviews: number
    tier_unlimited_price: number
}

interface ApiUsage {
    id: string
    user_id: string
    api_type: string
    input_tokens: number
    output_tokens: number
    audio_seconds: number
    cost_cents: number
    created_at: string
}

export default function AdminPage() {
    const supabase = createClient()
    const [loading, setLoading] = useState(true)
    const [isAdmin, setIsAdmin] = useState(false)
    const [users, setUsers] = useState<User[]>([])
    const [stats, setStats] = useState<UsageStats>({
        total_users: 0,
        total_interviews: 0,
        total_questions: 0,
        total_gemini_calls: 0,
        total_audio_minutes: 0,
        total_cost_cents: 0,
        total_revenue_cents: 0
    })
    const [pricing, setPricing] = useState<PricingConfig | null>(null)
    const [recentUsage, setRecentUsage] = useState<ApiUsage[]>([])
    const [recentInterviews, setRecentInterviews] = useState<any[]>([])
    const [recentQuestions, setRecentQuestions] = useState<any[]>([])
    const [recentApplications, setRecentApplications] = useState<any[]>([])
    const [interviewQuestions, setInterviewQuestions] = useState<Record<string, any[]>>({})
    const [interviewAnswers, setInterviewAnswers] = useState<Record<string, any[]>>({})
    const [interviewTranscripts, setInterviewTranscripts] = useState<Record<string, any[]>>({})
    const [expandedInterviews, setExpandedInterviews] = useState<Set<string>>(new Set())
    const [showPricingEditor, setShowPricingEditor] = useState(false)
    const [selectedUser, setSelectedUser] = useState<string | null>(null)
    const [selectedCompany, setSelectedCompany] = useState<string | null>(null)
    const [selectedInterview, setSelectedInterview] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'companies' | 'interviews' | 'performance'>('overview')
    const [allInterviews, setAllInterviews] = useState<any[]>([])
    const [allCompanies, setAllCompanies] = useState<any[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [dateRange, setDateRange] = useState('month') // 'week', 'month', 'all'

    useEffect(() => {
        loadAdminData()
    }, [dateRange])

    const loadAdminData = async () => {
        setLoading(true)
        try {
            // Check if user is admin
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data: userData } = await supabase
                .from('users')
                .select('is_admin')
                .eq('id', user.id)
                .single()

            // Server-side layout already checked admin status, but verify client-side too
            setIsAdmin(userData?.is_admin === true)

            // Load all users with their stats (including admins)
            const { data: usersData, error: usersError } = await supabase
                .from('users')
                .select(`
                    id,
                    email,
                    full_name,
                    created_at,
                    is_admin,
                    total_interviews
                `)
                .order('created_at', { ascending: false })

            if (usersError) {
                console.error('Error loading users:', usersError)
                // If RLS error, try to provide more context
                if (usersError.code === 'PGRST301' || usersError.message?.includes('permission')) {
                    console.error('RLS Policy Error: Admin may not have permission to view all users')
                }
            }

            setUsers(usersData || [])

            // Load pricing config
            const { data: pricingData } = await supabase
                .from('pricing_config')
                .select('*')
                .eq('is_active', true)
                .single()

            setPricing(pricingData)

            // Load API usage
            let usageQuery = supabase
                .from('api_usage')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(100)

            if (dateRange === 'week') {
                const weekAgo = new Date()
                weekAgo.setDate(weekAgo.getDate() - 7)
                usageQuery = usageQuery.gte('created_at', weekAgo.toISOString())
            } else if (dateRange === 'month') {
                const monthAgo = new Date()
                monthAgo.setMonth(monthAgo.getMonth() - 1)
                usageQuery = usageQuery.gte('created_at', monthAgo.toISOString())
            }

            const { data: usageData } = await usageQuery
            setRecentUsage(usageData || [])

            // Load recent interviews across all users
            let interviewsQuery = supabase
                .from('interviews')
                .select(`
                    id,
                    round_name,
                    interview_type,
                    session_status,
                    created_at,
                    total_questions,
                    users(email, full_name)
                `)
                .order('created_at', { ascending: false })
                .limit(10)

            if (dateRange === 'week') {
                const weekAgo = new Date()
                weekAgo.setDate(weekAgo.getDate() - 7)
                interviewsQuery = interviewsQuery.gte('created_at', weekAgo.toISOString())
            } else if (dateRange === 'month') {
                const monthAgo = new Date()
                monthAgo.setMonth(monthAgo.getMonth() - 1)
                interviewsQuery = interviewsQuery.gte('created_at', monthAgo.toISOString())
            }

            const { data: interviewsData } = await interviewsQuery
            setRecentInterviews(interviewsData || [])

            // Load recent questions
            let questionsQuery = supabase
                .from('questions')
                .select(`
                    id,
                    text,
                    question_type,
                    created_at,
                    users(email, full_name)
                `)
                .order('created_at', { ascending: false })
                .limit(10)

            if (dateRange === 'week') {
                const weekAgo = new Date()
                weekAgo.setDate(weekAgo.getDate() - 7)
                questionsQuery = questionsQuery.gte('created_at', weekAgo.toISOString())
            } else if (dateRange === 'month') {
                const monthAgo = new Date()
                monthAgo.setMonth(monthAgo.getMonth() - 1)
                questionsQuery = questionsQuery.gte('created_at', monthAgo.toISOString())
            }

            const { data: questionsData } = await questionsQuery
            setRecentQuestions(questionsData || [])

            // Load recent applications
            const { data: applicationsData } = await supabase
                .from('applications')
                .select(`
                    id,
                    status,
                    created_at,
                    users(email, full_name),
                    companies(name)
                `)
                .order('created_at', { ascending: false })
                .limit(10)

            setRecentApplications(applicationsData || [])

            // Load all interviews for detailed view
            const { data: allInterviewsData } = await supabase
                .from('interviews')
                .select(`
                    id,
                    round_name,
                    round_number,
                    interview_type,
                    session_status,
                    created_at,
                    total_questions,
                    user_id,
                    company_id,
                    application_id,
                    users(id, email, full_name),
                    companies(id, name),
                    applications(id, status)
                `)
                .order('created_at', { ascending: false })

            setAllInterviews(allInterviewsData || [])

            // Load all companies
            const { data: companiesData } = await supabase
                .from('companies')
                .select('id, name')
                .order('name', { ascending: true })

            setAllCompanies(companiesData || [])

            // Load questions, answers, and transcripts for each interview
            const questionsMap: Record<string, any[]> = {}
            const answersMap: Record<string, any[]> = {}
            const transcriptsMap: Record<string, any[]> = {}
            
            for (const interview of interviewsData || []) {
                // Load questions
                const { data: qData } = await supabase
                    .from('questions')
                    .select('id, text, question_type, created_at')
                    .eq('interview_id', interview.id)
                    .order('created_at', { ascending: true })
                questionsMap[interview.id] = qData || []
                
                // Load generated answers (linked to questions)
                const { data: aData } = await supabase
                    .from('generated_answers')
                    .select('id, question_id, answer_text, created_at')
                    .eq('interview_id', interview.id)
                    .order('created_at', { ascending: true })
                answersMap[interview.id] = aData || []
                
                // Load transcripts
                const { data: tData } = await supabase
                    .from('transcripts')
                    .select('id, speaker, text, timestamp_ms, created_at')
                    .eq('interview_id', interview.id)
                    .eq('is_final', true)
                    .order('timestamp_ms', { ascending: true })
                transcriptsMap[interview.id] = tData || []
            }
            
            setInterviewQuestions(questionsMap)
            setInterviewAnswers(answersMap)
            setInterviewTranscripts(transcriptsMap)

            // Get actual counts from tables (not aggregated fields)
            const { count: interviewsCount } = await supabase
                .from('interviews')
                .select('*', { count: 'exact', head: true })

            const { count: questionsCount } = await supabase
                .from('questions')
                .select('*', { count: 'exact', head: true })

            // Calculate stats
            const totalCostCents = (usageData || []).reduce((sum, u) => sum + (Number(u.cost_cents) || 0), 0)
            const markupMultiplier = 1 + ((pricingData?.markup_percentage || 200) / 100)
            
            setStats({
                total_users: usersData?.length || 0,
                total_interviews: interviewsCount || 0,
                total_questions: questionsCount || 0,
                total_gemini_calls: (usageData || []).filter(u => u.api_type?.includes('gemini')).length,
                total_audio_minutes: (usageData || []).reduce((sum, u) => sum + ((Number(u.audio_seconds) || 0) / 60), 0),
                total_cost_cents: totalCostCents,
                total_revenue_cents: Math.round(totalCostCents * markupMultiplier)
            })

        } catch (error) {
            console.error('Error loading admin data:', error)
        }
        setLoading(false)
    }

    const updatePricing = async (field: string, value: number) => {
        if (!pricing) return

        const { error } = await supabase
            .from('pricing_config')
            .update({ [field]: value, updated_at: new Date().toISOString() })
            .eq('id', pricing.id)

        if (!error) {
            setPricing({ ...pricing, [field]: value })
            loadAdminData() // Recalculate stats with new markup
        }
    }

    const formatCurrency = (cents: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(cents / 100)
    }

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
                <RefreshCw style={{ width: 32, height: 32, color: '#6366f1', animation: 'spin 1s linear infinite' }} />
            </div>
        )
    }

    if (!isAdmin) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', gap: 16 }}>
                <AlertCircle style={{ width: 48, height: 48, color: '#ef4444' }} />
                <h2 style={{ color: 'white', fontSize: 20 }}>Access Denied</h2>
                <p style={{ color: '#71717a' }}>You don't have admin privileges.</p>
            </div>
        )
    }

    // Filter interviews based on selected filters
    const filteredInterviews = allInterviews.filter((interview: any) => {
        if (selectedUser && interview.user_id !== selectedUser) return false
        if (selectedCompany && interview.company_id !== selectedCompany) return false
        if (searchQuery) {
            const query = searchQuery.toLowerCase()
            const matchesUser = (interview.users as any)?.email?.toLowerCase().includes(query)
            const matchesCompany = (interview.companies as any)?.name?.toLowerCase().includes(query)
            const matchesRound = interview.round_name?.toLowerCase().includes(query) || interview.interview_type?.toLowerCase().includes(query)
            if (!matchesUser && !matchesCompany && !matchesRound) return false
        }
        return true
    })

    // Get selected interview details
    const selectedInterviewData = selectedInterview 
        ? allInterviews.find((i: any) => i.id === selectedInterview)
        : null

    return (
        <div style={{ maxWidth: '100%', margin: '0 auto', padding: '0 16px' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                    <h1 style={{ fontSize: 28, fontWeight: 700, color: 'white', marginBottom: 8 }}>Admin Dashboard</h1>
                    <p style={{ color: '#71717a' }}>Manage users, track costs, and configure pricing</p>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                    <select
                        value={dateRange}
                        onChange={(e) => setDateRange(e.target.value)}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: '#18181b',
                            border: '1px solid #27272a',
                            borderRadius: 8,
                            color: 'white',
                            fontSize: 14
                        }}
                    >
                        <option value="week">Last 7 days</option>
                        <option value="month">Last 30 days</option>
                        <option value="all">All time</option>
                    </select>
                    <Link
                        href="/admin/pricing"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '8px 16px',
                            backgroundColor: '#6366f1',
                            border: 'none',
                            borderRadius: 8,
                            color: 'white',
                            textDecoration: 'none',
                            fontSize: 14
                        }}
                    >
                        <Settings style={{ width: 16, height: 16 }} />
                        Pricing
                    </Link>
                    <button
                        onClick={loadAdminData}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '8px 16px',
                            backgroundColor: '#27272a',
                            border: 'none',
                            borderRadius: 8,
                            color: 'white',
                            cursor: 'pointer'
                        }}
                    >
                        <RefreshCw style={{ width: 16, height: 16 }} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
                <StatCard
                    icon={<Users style={{ width: 20, height: 20, color: '#6366f1' }} />}
                    label="Total Users"
                    value={stats.total_users}
                    color="#6366f1"
                />
                <StatCard
                    icon={<Mic style={{ width: 20, height: 20, color: '#10b981' }} />}
                    label="Interviews"
                    value={stats.total_interviews}
                    color="#10b981"
                />
                <StatCard
                    icon={<DollarSign style={{ width: 20, height: 20, color: '#f59e0b' }} />}
                    label="API Cost"
                    value={formatCurrency(stats.total_cost_cents)}
                    color="#f59e0b"
                    isString
                />
                <StatCard
                    icon={<TrendingUp style={{ width: 20, height: 20, color: '#22c55e' }} />}
                    label="Revenue"
                    value={formatCurrency(stats.total_revenue_cents)}
                    subtitle={`${pricing?.markup_percentage || 200}% markup`}
                    color="#22c55e"
                    isString
                />
            </div>

            {/* Secondary Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
                <StatCard
                    icon={<Brain style={{ width: 20, height: 20, color: '#8b5cf6' }} />}
                    label="Gemini Calls"
                    value={stats.total_gemini_calls}
                    color="#8b5cf6"
                />
                <StatCard
                    icon={<Clock style={{ width: 20, height: 20, color: '#06b6d4' }} />}
                    label="Audio Minutes"
                    value={Math.round(stats.total_audio_minutes)}
                    color="#06b6d4"
                />
                <StatCard
                    icon={<DollarSign style={{ width: 20, height: 20, color: '#22c55e' }} />}
                    label="Profit"
                    value={formatCurrency(stats.total_revenue_cents - stats.total_cost_cents)}
                    color="#22c55e"
                    isString
                />
            </div>

            {/* Tab Navigation */}
            <div style={{
                backgroundColor: '#18181b',
                borderRadius: 12,
                border: '1px solid #27272a',
                marginBottom: 24,
                overflow: 'hidden'
            }}>
                <div style={{ display: 'flex', borderBottom: '1px solid #27272a', overflowX: 'auto' }}>
                    {[
                        { id: 'overview', label: 'Overview', icon: LayoutDashboard },
                        { id: 'users', label: 'Users', icon: Users },
                        { id: 'companies', label: 'Companies', icon: Briefcase },
                        { id: 'interviews', label: 'Interviews', icon: Mic },
                        { id: 'performance', label: 'Performance', icon: BarChart3 }
                    ].map((tab) => {
                        const Icon = tab.icon
                        const isActive = activeTab === tab.id
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                style={{
                                    flex: '1 1 0',
                                    minWidth: 150,
                                    padding: '16px 24px',
                                    backgroundColor: isActive ? '#27272a' : 'transparent',
                                    border: 'none',
                                    borderBottom: isActive ? '3px solid #6366f1' : '3px solid transparent',
                                    color: isActive ? '#818cf8' : '#a1a1aa',
                                    fontSize: 15,
                                    fontWeight: isActive ? 600 : 500,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 10,
                                    transition: 'all 0.2s',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                <Icon style={{ width: 20, height: 20 }} />
                                {tab.label}
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
                <>
            {/* Pricing Configuration */}
            <div style={{
                backgroundColor: '#18181b',
                borderRadius: 16,
                border: '1px solid #27272a',
                padding: 24,
                marginBottom: 32
            }}>
                <div
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                    onClick={() => setShowPricingEditor(!showPricingEditor)}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <Settings style={{ width: 20, height: 20, color: '#6366f1' }} />
                        <h2 style={{ fontSize: 18, fontWeight: 600, color: 'white' }}>Pricing Configuration</h2>
                    </div>
                    {showPricingEditor ? <ChevronUp style={{ color: '#71717a' }} /> : <ChevronDown style={{ color: '#71717a' }} />}
                </div>

                {showPricingEditor && pricing && (
                    <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
                        {/* API Costs */}
                        <div>
                            <h3 style={{ color: '#a1a1aa', fontSize: 14, marginBottom: 16 }}>API COSTS</h3>
                            <PricingInput
                                label="Gemini Input (per 1K tokens)"
                                value={pricing.gemini_input_per_1k_tokens}
                                onChange={(v) => updatePricing('gemini_input_per_1k_tokens', v)}
                                prefix="$"
                            />
                            <PricingInput
                                label="Gemini Output (per 1K tokens)"
                                value={pricing.gemini_output_per_1k_tokens}
                                onChange={(v) => updatePricing('gemini_output_per_1k_tokens', v)}
                                prefix="$"
                            />
                            <PricingInput
                                label="AssemblyAI (per hour)"
                                value={pricing.assemblyai_per_hour}
                                onChange={(v) => updatePricing('assemblyai_per_hour', v)}
                                prefix="$"
                            />
                        </div>

                        {/* Markup */}
                        <div>
                            <h3 style={{ color: '#a1a1aa', fontSize: 14, marginBottom: 16 }}>MARKUP</h3>
                            <PricingInput
                                label="Markup Percentage"
                                value={pricing.markup_percentage}
                                onChange={(v) => updatePricing('markup_percentage', v)}
                                suffix="%"
                            />
                            <div style={{ marginTop: 16, padding: 16, backgroundColor: '#27272a', borderRadius: 8 }}>
                                <p style={{ color: '#71717a', fontSize: 13 }}>
                                    With {pricing.markup_percentage}% markup:
                                </p>
                                <p style={{ color: 'white', fontSize: 14, marginTop: 4 }}>
                                    $1 cost → ${(1 + pricing.markup_percentage / 100).toFixed(2)} charged
                                </p>
                            </div>
                        </div>

                        {/* Subscription Tiers */}
                        <div>
                            <h3 style={{ color: '#a1a1aa', fontSize: 14, marginBottom: 16 }}>SUBSCRIPTION TIERS</h3>
                            <PricingInput
                                label="Free tier interviews"
                                value={pricing.tier_free_monthly_limit}
                                onChange={(v) => updatePricing('tier_free_monthly_limit', v)}
                            />
                            <PricingInput
                                label="Basic tier price"
                                value={pricing.tier_basic_price}
                                onChange={(v) => updatePricing('tier_basic_price', v)}
                                prefix="$"
                            />
                            <PricingInput
                                label="Pro tier price"
                                value={pricing.tier_pro_price}
                                onChange={(v) => updatePricing('tier_pro_price', v)}
                                prefix="$"
                            />
                            <PricingInput
                                label="Unlimited tier price"
                                value={pricing.tier_unlimited_price}
                                onChange={(v) => updatePricing('tier_unlimited_price', v)}
                                prefix="$"
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Users Table */}
            <div style={{
                backgroundColor: '#18181b',
                borderRadius: 16,
                border: '1px solid #27272a',
                overflow: 'hidden',
                marginBottom: 32
            }}>
                <div style={{ padding: '16px 24px', borderBottom: '1px solid #27272a' }}>
                    <h2 style={{ fontSize: 18, fontWeight: 600, color: 'white' }}>All Users ({users.length})</h2>
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#27272a' }}>
                                <th style={{ padding: '12px 24px', textAlign: 'left', color: '#a1a1aa', fontSize: 12, fontWeight: 500 }}>USER</th>
                                <th style={{ padding: '12px 24px', textAlign: 'left', color: '#a1a1aa', fontSize: 12, fontWeight: 500 }}>JOINED</th>
                                <th style={{ padding: '12px 24px', textAlign: 'right', color: '#a1a1aa', fontSize: 12, fontWeight: 500 }}>INTERVIEWS</th>
                                <th style={{ padding: '12px 24px', textAlign: 'center', color: '#a1a1aa', fontSize: 12, fontWeight: 500 }}>ADMIN</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((user) => (
                                <tr
                                    key={user.id}
                                    style={{
                                        borderBottom: '1px solid #27272a',
                                        backgroundColor: selectedUser === user.id ? '#27272a' : 'transparent'
                                    }}
                                    onClick={() => setSelectedUser(selectedUser === user.id ? null : user.id)}
                                >
                                    <td style={{ padding: '16px 24px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <div style={{
                                                width: 36,
                                                height: 36,
                                                borderRadius: '50%',
                                                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: 'white',
                                                fontSize: 14,
                                                fontWeight: 500
                                            }}>
                                                {(user.email?.[0] || 'U').toUpperCase()}
                                            </div>
                                            <div>
                                                <p style={{ color: 'white', fontSize: 14, fontWeight: 500 }}>
                                                    {user.full_name || 'No name'}
                                                </p>
                                                <p style={{ color: '#71717a', fontSize: 13 }}>{user.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px 24px', color: '#a1a1aa', fontSize: 14 }}>
                                        {new Date(user.created_at).toLocaleDateString()}
                                    </td>
                                    <td style={{ padding: '16px 24px', textAlign: 'right', color: 'white', fontSize: 14 }}>
                                        {user.total_interviews || 0}
                                    </td>
                                    <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                                        {user.is_admin && (
                                            <span style={{
                                                padding: '4px 8px',
                                                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                                                color: '#818cf8',
                                                borderRadius: 4,
                                                fontSize: 12
                                            }}>
                                                Admin
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Recent Activity Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginBottom: 32 }}>
                {/* Recent Interviews */}
                <div style={{
                    backgroundColor: '#18181b',
                    borderRadius: 16,
                    border: '1px solid #27272a',
                    overflow: 'hidden'
                }}>
                    <div style={{ padding: '16px 24px', borderBottom: '1px solid #27272a', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Mic style={{ width: 18, height: 18, color: '#10b981' }} />
                        <h2 style={{ fontSize: 16, fontWeight: 600, color: 'white' }}>Recent Interviews</h2>
                    </div>
                    <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                        {recentInterviews.length === 0 ? (
                            <div style={{ padding: 32, textAlign: 'center', color: '#71717a' }}>No interviews yet</div>
                        ) : (
                            <div style={{ padding: 12 }}>
                                {recentInterviews.map((interview: any) => {
                                    const isExpanded = expandedInterviews.has(interview.id)
                                    const questions = interviewQuestions[interview.id] || []
                                    
                                    return (
                                        <div key={interview.id} style={{ 
                                            borderBottom: '1px solid #27272a'
                                        }}>
                                            <div 
                                                onClick={() => {
                                                    const newExpanded = new Set(expandedInterviews)
                                                    if (isExpanded) {
                                                        newExpanded.delete(interview.id)
                                                    } else {
                                                        newExpanded.add(interview.id)
                                                    }
                                                    setExpandedInterviews(newExpanded)
                                                }}
                                                style={{ 
                                                    padding: '12px', 
                                                    cursor: 'pointer',
                                                    backgroundColor: isExpanded ? '#27272a' : 'transparent',
                                                    transition: 'background-color 0.2s'
                                                }}
                                            >
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 4 }}>
                                                    <div style={{ flex: 1 }}>
                                                        <p style={{ color: 'white', fontSize: 13, fontWeight: 500, marginBottom: 2 }}>
                                                            {interview.round_name || interview.interview_type}
                                                        </p>
                                                        <p style={{ color: '#71717a', fontSize: 11 }}>
                                                            {(interview.users as any)?.email || 'Unknown user'}
                                                        </p>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                        <span style={{
                                                            padding: '2px 8px',
                                                            backgroundColor: interview.session_status === 'completed' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(99, 102, 241, 0.1)',
                                                            color: interview.session_status === 'completed' ? '#22c55e' : '#818cf8',
                                                            borderRadius: 4,
                                                            fontSize: 10
                                                        }}>
                                                            {interview.session_status}
                                                        </span>
                                                        <ChevronDown style={{ 
                                                            width: 16, 
                                                            height: 16, 
                                                            color: '#71717a',
                                                            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                                            transition: 'transform 0.2s'
                                                        }} />
                                                    </div>
                                                </div>
                                                <p style={{ color: '#a1a1aa', fontSize: 11, marginTop: 4 }}>
                                                    {formatDate(interview.created_at)} • {questions.length || interview.total_questions || 0} questions
                                                </p>
                                            </div>
                                            
                                            {/* Expanded Q&A and Transcripts */}
                                            {isExpanded && (
                                                <div style={{ 
                                                    padding: '16px', 
                                                    backgroundColor: '#0a0a0f',
                                                    borderTop: '1px solid #27272a'
                                                }}>
                                                    {/* Questions with Answers */}
                                                    {questions.length > 0 && (
                                                        <div style={{ marginBottom: 16 }}>
                                                            <h3 style={{ color: '#a1a1aa', fontSize: 12, fontWeight: 600, marginBottom: 12 }}>
                                                                Questions & AI-Generated Answers
                                                            </h3>
                                                            {questions.map((q: any, idx: number) => {
                                                                const answer = (interviewAnswers[interview.id] || []).find((a: any) => a.question_id === q.id)
                                                                return (
                                                                    <div key={q.id} style={{ 
                                                                        padding: '12px',
                                                                        marginBottom: 12,
                                                                        backgroundColor: '#18181b',
                                                                        borderRadius: 8,
                                                                        border: '1px solid #27272a'
                                                                    }}>
                                                                        <div style={{ display: 'flex', alignItems: 'start', gap: 8, marginBottom: 8 }}>
                                                                            <span style={{
                                                                                color: '#6366f1',
                                                                                fontSize: 12,
                                                                                fontWeight: 600,
                                                                                minWidth: 32
                                                                            }}>
                                                                                Q{idx + 1}:
                                                                            </span>
                                                                            <div style={{ flex: 1 }}>
                                                                                <p style={{ color: 'white', fontSize: 13, lineHeight: 1.5, marginBottom: 4 }}>
                                                                                    {q.text}
                                                                                </p>
                                                                                {q.question_type && (
                                                                                    <span style={{
                                                                                        display: 'inline-block',
                                                                                        padding: '2px 6px',
                                                                                        backgroundColor: 'rgba(139, 92, 246, 0.1)',
                                                                                        color: '#a78bfa',
                                                                                        borderRadius: 4,
                                                                                        fontSize: 10
                                                                                    }}>
                                                                                        {q.question_type}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                        
                                                                        {answer && (
                                                                            <div style={{ 
                                                                                marginTop: 12,
                                                                                padding: '10px',
                                                                                backgroundColor: '#27272a',
                                                                                borderRadius: 6,
                                                                                borderLeft: '3px solid #22c55e'
                                                                            }}>
                                                                                <p style={{ color: '#71717a', fontSize: 11, marginBottom: 6, fontWeight: 500 }}>
                                                                                    AI-Generated Answer:
                                                                                </p>
                                                                                <p style={{ color: '#d1d5db', fontSize: 12, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                                                                                    {answer.answer_text}
                                                                                </p>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )
                                                            })}
                                                        </div>
                                                    )}
                                                    
                                                    {/* Transcripts */}
                                                    {(interviewTranscripts[interview.id] || []).length > 0 && (
                                                        <div>
                                                            <h3 style={{ color: '#a1a1aa', fontSize: 12, fontWeight: 600, marginBottom: 12 }}>
                                                                Full Transcript
                                                            </h3>
                                                            <div style={{ 
                                                                padding: '12px',
                                                                backgroundColor: '#18181b',
                                                                borderRadius: 8,
                                                                border: '1px solid #27272a',
                                                                maxHeight: 300,
                                                                overflowY: 'auto'
                                                            }}>
                                                                {(interviewTranscripts[interview.id] || []).map((t: any, idx: number) => (
                                                                    <div key={t.id} style={{ 
                                                                        marginBottom: idx < (interviewTranscripts[interview.id] || []).length - 1 ? 8 : 0,
                                                                        paddingBottom: idx < (interviewTranscripts[interview.id] || []).length - 1 ? 8 : 0,
                                                                        borderBottom: idx < (interviewTranscripts[interview.id] || []).length - 1 ? '1px solid #27272a' : 'none'
                                                                    }}>
                                                                        <div style={{ display: 'flex', alignItems: 'start', gap: 8 }}>
                                                                            <span style={{
                                                                                color: t.speaker === 'Interviewer' ? '#f59e0b' : '#22c55e',
                                                                                fontSize: 11,
                                                                                fontWeight: 600,
                                                                                minWidth: 90
                                                                            }}>
                                                                                {t.speaker}:
                                                                            </span>
                                                                            <p style={{ color: '#d1d5db', fontSize: 12, lineHeight: 1.5, flex: 1 }}>
                                                                                {t.text}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Recent Questions */}
                <div style={{
                    backgroundColor: '#18181b',
                    borderRadius: 16,
                    border: '1px solid #27272a',
                    overflow: 'hidden'
                }}>
                    <div style={{ padding: '16px 24px', borderBottom: '1px solid #27272a', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <MessageSquare style={{ width: 18, height: 18, color: '#8b5cf6' }} />
                        <h2 style={{ fontSize: 16, fontWeight: 600, color: 'white' }}>Recent Questions</h2>
                    </div>
                    <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                        {recentQuestions.length === 0 ? (
                            <div style={{ padding: 32, textAlign: 'center', color: '#71717a' }}>No questions yet</div>
                        ) : (
                            <div style={{ padding: 12 }}>
                                {recentQuestions.map((question: any) => (
                                    <div key={question.id} style={{ 
                                        padding: '12px', 
                                        borderBottom: '1px solid #27272a'
                                    }}>
                                        <p style={{ color: 'white', fontSize: 12, marginBottom: 6, lineHeight: 1.4 }}>
                                            {question.text?.substring(0, 100)}{question.text?.length > 100 ? '...' : ''}
                                        </p>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                                            <p style={{ color: '#71717a', fontSize: 10 }}>
                                                {(question.users as any)?.email || 'Unknown'}
                                            </p>
                                            {question.question_type && (
                                                <span style={{
                                                    padding: '2px 6px',
                                                    backgroundColor: 'rgba(139, 92, 246, 0.1)',
                                                    color: '#a78bfa',
                                                    borderRadius: 4,
                                                    fontSize: 10
                                                }}>
                                                    {question.question_type}
                                                </span>
                                            )}
                                        </div>
                                        <p style={{ color: '#71717a', fontSize: 10, marginTop: 4 }}>
                                            {formatDate(question.created_at)}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Recent Applications */}
                <div style={{
                    backgroundColor: '#18181b',
                    borderRadius: 16,
                    border: '1px solid #27272a',
                    overflow: 'hidden'
                }}>
                    <div style={{ padding: '16px 24px', borderBottom: '1px solid #27272a', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Briefcase style={{ width: 18, height: 18, color: '#f59e0b' }} />
                        <h2 style={{ fontSize: 16, fontWeight: 600, color: 'white' }}>Recent Applications</h2>
                    </div>
                    <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                        {recentApplications.length === 0 ? (
                            <div style={{ padding: 32, textAlign: 'center', color: '#71717a' }}>No applications yet</div>
                        ) : (
                            <div style={{ padding: 12 }}>
                                {recentApplications.map((app: any) => (
                                    <div key={app.id} style={{ 
                                        padding: '12px', 
                                        borderBottom: '1px solid #27272a'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 4 }}>
                                            <div style={{ flex: 1 }}>
                                                <p style={{ color: 'white', fontSize: 13, fontWeight: 500, marginBottom: 2 }}>
                                                    {(app.companies as any)?.name || 'Unknown Company'}
                                                </p>
                                                <p style={{ color: '#71717a', fontSize: 11 }}>
                                                    {(app.users as any)?.email || 'Unknown user'}
                                                </p>
                                            </div>
                                            <span style={{
                                                padding: '2px 8px',
                                                backgroundColor: app.status === 'offer' ? 'rgba(34, 197, 94, 0.1)' : 
                                                               app.status === 'rejected' ? 'rgba(239, 68, 68, 0.1)' : 
                                                               'rgba(99, 102, 241, 0.1)',
                                                color: app.status === 'offer' ? '#22c55e' : 
                                                       app.status === 'rejected' ? '#ef4444' : '#818cf8',
                                                borderRadius: 4,
                                                fontSize: 10
                                            }}>
                                                {app.status}
                                            </span>
                                        </div>
                                        <p style={{ color: '#71717a', fontSize: 10, marginTop: 4 }}>
                                            {formatDate(app.created_at)}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Recent API Usage */}
            <div style={{
                backgroundColor: '#18181b',
                borderRadius: 16,
                border: '1px solid #27272a',
                overflow: 'hidden'
            }}>
                <div style={{ padding: '16px 24px', borderBottom: '1px solid #27272a' }}>
                    <h2 style={{ fontSize: 18, fontWeight: 600, color: 'white' }}>Recent API Usage</h2>
                </div>
                <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                    {recentUsage.length === 0 ? (
                        <div style={{ padding: 48, textAlign: 'center', color: '#71717a' }}>
                            No API usage recorded yet
                        </div>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#27272a' }}>
                                    <th style={{ padding: '12px 24px', textAlign: 'left', color: '#a1a1aa', fontSize: 12 }}>TIME</th>
                                    <th style={{ padding: '12px 24px', textAlign: 'left', color: '#a1a1aa', fontSize: 12 }}>TYPE</th>
                                    <th style={{ padding: '12px 24px', textAlign: 'right', color: '#a1a1aa', fontSize: 12 }}>TOKENS</th>
                                    <th style={{ padding: '12px 24px', textAlign: 'right', color: '#a1a1aa', fontSize: 12 }}>COST</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentUsage.map((usage) => (
                                    <tr key={usage.id} style={{ borderBottom: '1px solid #27272a' }}>
                                        <td style={{ padding: '12px 24px', color: '#a1a1aa', fontSize: 13 }}>
                                            {formatDate(usage.created_at)}
                                        </td>
                                        <td style={{ padding: '12px 24px' }}>
                                            <span style={{
                                                padding: '4px 8px',
                                                backgroundColor: usage.api_type?.includes('gemini') ? 'rgba(139, 92, 246, 0.1)' : 'rgba(6, 182, 212, 0.1)',
                                                color: usage.api_type?.includes('gemini') ? '#a78bfa' : '#22d3ee',
                                                borderRadius: 4,
                                                fontSize: 12
                                            }}>
                                                {usage.api_type || 'unknown'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px 24px', textAlign: 'right', color: 'white', fontSize: 13 }}>
                                            {usage.input_tokens + usage.output_tokens || '-'}
                                        </td>
                                        <td style={{ padding: '12px 24px', textAlign: 'right', color: '#22c55e', fontSize: 13 }}>
                                            {formatCurrency(usage.cost_cents)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
                </>
            )}

            {activeTab === 'users' && (
                <div style={{ width: '100%' }}>
                    {/* Users Tab */}
                    <div style={{
                        backgroundColor: '#18181b',
                        borderRadius: 16,
                        border: '1px solid #27272a',
                        overflow: 'hidden',
                        marginBottom: 24
                    }}>
                        <div style={{ padding: '20px 24px', borderBottom: '1px solid #27272a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 style={{ fontSize: 20, fontWeight: 600, color: 'white' }}>All Users ({users.length})</h2>
                            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flex: '1 1 300px', maxWidth: 400 }}>
                                <Search style={{ width: 18, height: 18, color: '#71717a' }} />
                                <input
                                    type="text"
                                    placeholder="Search users..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    style={{
                                        padding: '8px 12px',
                                        backgroundColor: '#27272a',
                                        border: '1px solid #3f3f46',
                                        borderRadius: 8,
                                        color: 'white',
                                        fontSize: 14,
                                        width: '100%'
                                    }}
                                />
                            </div>
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ backgroundColor: '#27272a' }}>
                                        <th style={{ padding: '16px 24px', textAlign: 'left', color: '#a1a1aa', fontSize: 13, fontWeight: 600 }}>USER</th>
                                        <th style={{ padding: '16px 24px', textAlign: 'left', color: '#a1a1aa', fontSize: 13, fontWeight: 600 }}>JOINED</th>
                                        <th style={{ padding: '16px 24px', textAlign: 'right', color: '#a1a1aa', fontSize: 13, fontWeight: 600 }}>INTERVIEWS</th>
                                        <th style={{ padding: '16px 24px', textAlign: 'center', color: '#a1a1aa', fontSize: 13, fontWeight: 600 }}>ADMIN</th>
                                        <th style={{ padding: '16px 24px', textAlign: 'center', color: '#a1a1aa', fontSize: 13, fontWeight: 600 }}>ACTIONS</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users
                                        .filter(u => !searchQuery || u.email.toLowerCase().includes(searchQuery.toLowerCase()) || (u.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()))
                                        .map((user) => (
                                        <tr
                                            key={user.id}
                                            style={{
                                                borderBottom: '1px solid #27272a',
                                                backgroundColor: selectedUser === user.id ? '#27272a' : 'transparent',
                                                cursor: 'pointer'
                                            }}
                                            onClick={() => {
                                                setSelectedUser(selectedUser === user.id ? null : user.id)
                                                if (selectedUser !== user.id) {
                                                    setActiveTab('interviews')
                                                }
                                            }}
                                        >
                                            <td style={{ padding: '20px 24px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                    <div style={{
                                                        width: 40,
                                                        height: 40,
                                                        borderRadius: '50%',
                                                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        color: 'white',
                                                        fontSize: 16,
                                                        fontWeight: 600
                                                    }}>
                                                        {(user.email?.[0] || 'U').toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p style={{ color: 'white', fontSize: 15, fontWeight: 600, marginBottom: 2 }}>
                                                            {user.full_name || 'No name'}
                                                        </p>
                                                        <p style={{ color: '#71717a', fontSize: 13 }}>{user.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ padding: '20px 24px', color: '#a1a1aa', fontSize: 14 }}>
                                                {new Date(user.created_at).toLocaleDateString()}
                                            </td>
                                            <td style={{ padding: '20px 24px', textAlign: 'right', color: 'white', fontSize: 15, fontWeight: 500 }}>
                                                {user.total_interviews || 0}
                                            </td>
                                            <td style={{ padding: '20px 24px', textAlign: 'center' }}>
                                                {user.is_admin && (
                                                    <span style={{
                                                        padding: '6px 12px',
                                                        backgroundColor: 'rgba(99, 102, 241, 0.1)',
                                                        color: '#818cf8',
                                                        borderRadius: 6,
                                                        fontSize: 12,
                                                        fontWeight: 500
                                                    }}>
                                                        Admin
                                                    </span>
                                                )}
                                            </td>
                                            <td style={{ padding: '20px 24px', textAlign: 'center' }}>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        setSelectedUser(user.id)
                                                        setActiveTab('interviews')
                                                    }}
                                                    style={{
                                                        padding: '8px 16px',
                                                        backgroundColor: '#6366f1',
                                                        border: 'none',
                                                        borderRadius: 8,
                                                        color: 'white',
                                                        fontSize: 13,
                                                        fontWeight: 500,
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    View Interviews
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'companies' && (
                <div style={{ width: '100%' }}>
                    {/* Companies Tab */}
                    <div style={{
                        backgroundColor: '#18181b',
                        borderRadius: 16,
                        border: '1px solid #27272a',
                        overflow: 'hidden'
                    }}>
                        <div style={{ padding: '20px 24px', borderBottom: '1px solid #27272a' }}>
                            <h2 style={{ fontSize: 20, fontWeight: 600, color: 'white' }}>All Companies ({allCompanies.length})</h2>
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ backgroundColor: '#27272a' }}>
                                        <th style={{ padding: '16px 24px', textAlign: 'left', color: '#a1a1aa', fontSize: 13, fontWeight: 600 }}>COMPANY</th>
                                        <th style={{ padding: '16px 24px', textAlign: 'right', color: '#a1a1aa', fontSize: 13, fontWeight: 600 }}>INTERVIEWS</th>
                                        <th style={{ padding: '16px 24px', textAlign: 'center', color: '#a1a1aa', fontSize: 13, fontWeight: 600 }}>ACTIONS</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {allCompanies.map((company: any) => {
                                        const companyInterviews = allInterviews.filter((i: any) => i.company_id === company.id)
                                        return (
                                            <tr
                                                key={company.id}
                                                style={{
                                                    borderBottom: '1px solid #27272a',
                                                    cursor: 'pointer'
                                                }}
                                                onClick={() => {
                                                    setSelectedCompany(company.id)
                                                    setActiveTab('interviews')
                                                }}
                                            >
                                                <td style={{ padding: '20px 24px' }}>
                                                    <p style={{ color: 'white', fontSize: 15, fontWeight: 600 }}>
                                                        {company.name}
                                                    </p>
                                                </td>
                                                <td style={{ padding: '20px 24px', textAlign: 'right', color: 'white', fontSize: 15, fontWeight: 500 }}>
                                                    {companyInterviews.length}
                                                </td>
                                                <td style={{ padding: '20px 24px', textAlign: 'center' }}>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            setSelectedCompany(company.id)
                                                            setActiveTab('interviews')
                                                        }}
                                                        style={{
                                                            padding: '8px 16px',
                                                            backgroundColor: '#6366f1',
                                                            border: 'none',
                                                            borderRadius: 8,
                                                            color: 'white',
                                                            fontSize: 13,
                                                            fontWeight: 500,
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        View Interviews
                                                    </button>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'interviews' && (
                <div style={{ width: '100%' }}>
                    {/* Filters */}
                    <div style={{
                        backgroundColor: '#18181b',
                        borderRadius: 16,
                        border: '1px solid #27272a',
                        padding: 20,
                        marginBottom: 24,
                        display: 'flex',
                        gap: 16,
                        alignItems: 'center',
                        flexWrap: 'wrap'
                    }}>
                        <Filter style={{ width: 18, height: 18, color: '#71717a' }} />
                        <div style={{ flex: 1, minWidth: 200 }}>
                            <label style={{ display: 'block', color: '#a1a1aa', fontSize: 12, marginBottom: 6, fontWeight: 500 }}>Filter by User</label>
                            <select
                                value={selectedUser || ''}
                                onChange={(e) => setSelectedUser(e.target.value || null)}
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    backgroundColor: '#27272a',
                                    border: '1px solid #3f3f46',
                                    borderRadius: 8,
                                    color: 'white',
                                    fontSize: 14
                                }}
                            >
                                <option value="">All Users</option>
                                {users.map((u) => (
                                    <option key={u.id} value={u.id}>{u.email}</option>
                                ))}
                            </select>
                        </div>
                        <div style={{ flex: 1, minWidth: 200 }}>
                            <label style={{ display: 'block', color: '#a1a1aa', fontSize: 12, marginBottom: 6, fontWeight: 500 }}>Filter by Company</label>
                            <select
                                value={selectedCompany || ''}
                                onChange={(e) => setSelectedCompany(e.target.value || null)}
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    backgroundColor: '#27272a',
                                    border: '1px solid #3f3f46',
                                    borderRadius: 8,
                                    color: 'white',
                                    fontSize: 14
                                }}
                            >
                                <option value="">All Companies</option>
                                {allCompanies.map((c: any) => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                        <div style={{ flex: 1, minWidth: 200 }}>
                            <label style={{ display: 'block', color: '#a1a1aa', fontSize: 12, marginBottom: 6, fontWeight: 500 }}>Search</label>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <Search style={{ width: 18, height: 18, color: '#71717a' }} />
                                <input
                                    type="text"
                                    placeholder="Search interviews..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    style={{
                                        flex: 1,
                                        padding: '10px 12px',
                                        backgroundColor: '#27272a',
                                        border: '1px solid #3f3f46',
                                        borderRadius: 8,
                                        color: 'white',
                                        fontSize: 14
                                    }}
                                />
                            </div>
                        </div>
                        {(selectedUser || selectedCompany || searchQuery) && (
                            <button
                                onClick={() => {
                                    setSelectedUser(null)
                                    setSelectedCompany(null)
                                    setSearchQuery('')
                                }}
                                style={{
                                    padding: '10px 16px',
                                    backgroundColor: '#27272a',
                                    border: '1px solid #3f3f46',
                                    borderRadius: 8,
                                    color: 'white',
                                    fontSize: 14,
                                    cursor: 'pointer',
                                    marginTop: 20
                                }}
                            >
                                Clear Filters
                            </button>
                        )}
                    </div>

                    {/* Interviews List */}
                    <div style={{
                        backgroundColor: '#18181b',
                        borderRadius: 16,
                        border: '1px solid #27272a',
                        overflow: 'hidden'
                    }}>
                        <div style={{ padding: '20px 24px', borderBottom: '1px solid #27272a' }}>
                            <h2 style={{ fontSize: 20, fontWeight: 600, color: 'white' }}>
                                Interviews ({filteredInterviews.length})
                            </h2>
                        </div>
                        <div style={{ maxHeight: 'calc(100vh - 400px)', overflowY: 'auto' }}>
                            {filteredInterviews.length === 0 ? (
                                <div style={{ padding: 48, textAlign: 'center', color: '#71717a' }}>
                                    No interviews found
                                </div>
                            ) : (
                                filteredInterviews.map((interview: any) => {
                                    const isSelected = selectedInterview === interview.id
                                    const questions = interviewQuestions[interview.id] || []
                                    const answers = interviewAnswers[interview.id] || []
                                    const transcripts = interviewTranscripts[interview.id] || []
                                    
                                    return (
                                        <div key={interview.id} style={{
                                            borderBottom: '1px solid #27272a',
                                            backgroundColor: isSelected ? '#27272a' : 'transparent'
                                        }}>
                                            <div
                                                onClick={() => setSelectedInterview(isSelected ? null : interview.id)}
                                                style={{
                                                    padding: '20px 24px',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center'
                                                }}
                                            >
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                                                        <h3 style={{ color: 'white', fontSize: 18, fontWeight: 600 }}>
                                                            {interview.round_name || interview.interview_type}
                                                        </h3>
                                                        {interview.round_number && (
                                                            <span style={{
                                                                padding: '4px 10px',
                                                                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                                                                color: '#818cf8',
                                                                borderRadius: 6,
                                                                fontSize: 12,
                                                                fontWeight: 500
                                                            }}>
                                                                Round {interview.round_number}
                                                            </span>
                                                        )}
                                                        <span style={{
                                                            padding: '4px 10px',
                                                            backgroundColor: interview.session_status === 'completed' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(99, 102, 241, 0.1)',
                                                            color: interview.session_status === 'completed' ? '#22c55e' : '#818cf8',
                                                            borderRadius: 6,
                                                            fontSize: 12,
                                                            fontWeight: 500
                                                        }}>
                                                            {interview.session_status}
                                                        </span>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: 20, color: '#71717a', fontSize: 14 }}>
                                                        <span>👤 {(interview.users as any)?.email || 'Unknown'}</span>
                                                        <span>🏢 {(interview.companies as any)?.name || 'Unknown'}</span>
                                                        <span>📅 {formatDate(interview.created_at)}</span>
                                                        <span>❓ {questions.length || interview.total_questions || 0} questions</span>
                                                    </div>
                                                </div>
                                                <ChevronDown style={{
                                                    width: 24,
                                                    height: 24,
                                                    color: '#71717a',
                                                    transform: isSelected ? 'rotate(180deg)' : 'rotate(0deg)',
                                                    transition: 'transform 0.2s'
                                                }} />
                                            </div>
                                            
                                            {/* Expanded Details */}
                                            {isSelected && (
                                                <div style={{
                                                    padding: '32px',
                                                    backgroundColor: '#0a0a0f',
                                                    borderTop: '1px solid #27272a'
                                                }}>
                                                    {/* Questions & Answers */}
                                                    {questions.length > 0 && (
                                                        <div style={{ marginBottom: 32 }}>
                                                            <h3 style={{ color: 'white', fontSize: 18, fontWeight: 600, marginBottom: 20 }}>
                                                                Questions & AI-Generated Answers
                                                            </h3>
                                                            {questions.map((q: any, idx: number) => {
                                                                const answer = answers.find((a: any) => a.question_id === q.id)
                                                                return (
                                                                    <div key={q.id} style={{
                                                                        marginBottom: 24,
                                                                        padding: '20px',
                                                                        backgroundColor: '#18181b',
                                                                        borderRadius: 12,
                                                                        border: '1px solid #27272a'
                                                                    }}>
                                                                        <div style={{ display: 'flex', alignItems: 'start', gap: 12, marginBottom: 12 }}>
                                                                            <span style={{
                                                                                color: '#6366f1',
                                                                                fontSize: 16,
                                                                                fontWeight: 600,
                                                                                minWidth: 50
                                                                            }}>
                                                                                Q{idx + 1}:
                                                                            </span>
                                                                            <div style={{ flex: 1 }}>
                                                                                <p style={{ color: 'white', fontSize: 15, lineHeight: 1.7, marginBottom: 8 }}>
                                                                                    {q.text}
                                                                                </p>
                                                                                {q.question_type && (
                                                                                    <span style={{
                                                                                        padding: '4px 10px',
                                                                                        backgroundColor: 'rgba(139, 92, 246, 0.1)',
                                                                                        color: '#a78bfa',
                                                                                        borderRadius: 6,
                                                                                        fontSize: 12,
                                                                                        fontWeight: 500
                                                                                    }}>
                                                                                        {q.question_type}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                        
                                                                        {answer && (
                                                                            <div style={{
                                                                                marginTop: 16,
                                                                                padding: '16px',
                                                                                backgroundColor: '#27272a',
                                                                                borderRadius: 10,
                                                                                borderLeft: '4px solid #22c55e'
                                                                            }}>
                                                                                <p style={{ color: '#71717a', fontSize: 13, marginBottom: 10, fontWeight: 600 }}>
                                                                                    AI-Generated Answer:
                                                                                </p>
                                                                                <p style={{ color: '#d1d5db', fontSize: 14, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                                                                                    {answer.answer_text}
                                                                                </p>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )
                                                            })}
                                                        </div>
                                                    )}
                                                    
                                                    {/* Full Transcript */}
                                                    {transcripts.length > 0 && (
                                                        <div>
                                                            <h3 style={{ color: 'white', fontSize: 18, fontWeight: 600, marginBottom: 20 }}>
                                                                Full Transcript
                                                            </h3>
                                                            <div style={{
                                                                padding: '20px',
                                                                backgroundColor: '#18181b',
                                                                borderRadius: 12,
                                                                border: '1px solid #27272a',
                                                                maxHeight: 500,
                                                                overflowY: 'auto'
                                                            }}>
                                                                {transcripts.map((t: any, idx: number) => (
                                                                    <div key={t.id} style={{
                                                                        marginBottom: idx < transcripts.length - 1 ? 16 : 0,
                                                                        paddingBottom: idx < transcripts.length - 1 ? 16 : 0,
                                                                        borderBottom: idx < transcripts.length - 1 ? '1px solid #27272a' : 'none'
                                                                    }}>
                                                                        <div style={{ display: 'flex', alignItems: 'start', gap: 12 }}>
                                                                            <span style={{
                                                                                color: t.speaker === 'Interviewer' ? '#f59e0b' : '#22c55e',
                                                                                fontSize: 13,
                                                                                fontWeight: 600,
                                                                                minWidth: 120
                                                                            }}>
                                                                                {t.speaker}:
                                                                            </span>
                                                                            <p style={{ color: '#d1d5db', fontSize: 14, lineHeight: 1.7, flex: 1 }}>
                                                                                {t.text}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )
                                })
                            )}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'performance' && (
                <div style={{ width: '100%' }}>
                    {/* Performance Tab */}
                    <div style={{
                        backgroundColor: '#18181b',
                        borderRadius: 16,
                        border: '1px solid #27272a',
                        padding: 32
                    }}>
                        <h2 style={{ fontSize: 20, fontWeight: 600, color: 'white', marginBottom: 24 }}>Performance Analytics</h2>
                        <p style={{ color: '#71717a', fontSize: 14 }}>Performance metrics and analytics coming soon...</p>
                    </div>
                </div>
            )}
        </div>
    )
}

function StatCard({ icon, label, value, subtitle, color, isString }: {
    icon: React.ReactNode
    label: string
    value: string | number
    subtitle?: string
    color: string
    isString?: boolean
}) {
    return (
        <div style={{
            backgroundColor: '#18181b',
            borderRadius: 16,
            border: '1px solid #27272a',
            padding: 20
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    backgroundColor: `${color}15`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    {icon}
                </div>
                <span style={{ color: '#a1a1aa', fontSize: 14 }}>{label}</span>
            </div>
            <p style={{ fontSize: 28, fontWeight: 700, color: 'white' }}>
                {isString ? value : value.toLocaleString()}
            </p>
            {subtitle && (
                <p style={{ color: '#71717a', fontSize: 13, marginTop: 4 }}>{subtitle}</p>
            )}
        </div>
    )
}

function PricingInput({ label, value, onChange, prefix, suffix }: {
    label: string
    value: number
    onChange: (value: number) => void
    prefix?: string
    suffix?: string
}) {
    return (
        <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', color: '#a1a1aa', fontSize: 13, marginBottom: 8 }}>
                {label}
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {prefix && <span style={{ color: '#71717a' }}>{prefix}</span>}
                <input
                    type="number"
                    value={value}
                    onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
                    step="0.01"
                    style={{
                        flex: 1,
                        padding: '8px 12px',
                        backgroundColor: '#27272a',
                        border: '1px solid #3f3f46',
                        borderRadius: 8,
                        color: 'white',
                        fontSize: 14
                    }}
                />
                {suffix && <span style={{ color: '#71717a' }}>{suffix}</span>}
            </div>
        </div>
    )
}

