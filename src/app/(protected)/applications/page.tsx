'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import {
    Building2,
    Plus,
    ChevronRight,
    Loader2,
    Filter,
    Calendar,
    MapPin,
    DollarSign,
    Briefcase
} from 'lucide-react'
import type { Application, Company } from '@/types/database'

type ApplicationWithCompany = Application & { companies: Company | null }

export default function ApplicationsPage() {
    const supabase = createClient()
    const [applications, setApplications] = useState<ApplicationWithCompany[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState<string>('all')
    const [showAddModal, setShowAddModal] = useState(false)
    const [newCompany, setNewCompany] = useState('')
    const [newRole, setNewRole] = useState('')
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        loadApplications()
    }, [])

    const loadApplications = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data } = await supabase
            .from('applications')
            .select('*, companies(*)')
            .eq('user_id', user.id)
            .order('applied_at', { ascending: false })

        setApplications((data as unknown as ApplicationWithCompany[]) || [])
        setLoading(false)
    }

    const updateStatus = async (id: string, status: string) => {
        await supabase.from('applications').update({ status } as never).eq('id', id)
        loadApplications()
    }

    const addApplication = async () => {
        if (!newCompany.trim()) return
        setSaving(true)

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Create or find company
        let companyId: string
        const { data: existingCompany } = await supabase
            .from('companies')
            .select('id')
            .eq('name', newCompany.trim())
            .single()

        if (existingCompany) {
            companyId = existingCompany.id
        } else {
            const { data: newComp } = await supabase
                .from('companies')
                .insert({ name: newCompany.trim() })
                .select('id')
                .single()
            companyId = newComp?.id || ''
        }

        // Create application
        await supabase.from('applications').insert({
            user_id: user.id,
            company_id: companyId,
            status: 'applied',
            applied_at: new Date().toISOString(),
        })

        setNewCompany('')
        setNewRole('')
        setShowAddModal(false)
        setSaving(false)
        loadApplications()
    }

    const filteredApplications = filter === 'all'
        ? applications
        : applications.filter(app => app.status === filter)

    const stats = {
        total: applications.length,
        active: applications.filter(a => ['applied', 'screening', 'interviewing'].includes(a.status || '')).length,
        offers: applications.filter(a => a.status === 'offer').length,
        rejected: applications.filter(a => a.status === 'rejected').length,
    }

    const cardStyle = {
        background: 'linear-gradient(135deg, rgba(24, 24, 27, 0.8) 0%, rgba(24, 24, 27, 0.4) 100%)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        borderRadius: '20px',
    }

    const statCardStyle = (color: string, glow: string) => ({
        ...cardStyle,
        padding: '20px',
        position: 'relative' as const,
        overflow: 'hidden',
    })

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
                right: '100px',
                width: '500px',
                height: '500px',
                background: 'radial-gradient(circle, rgba(168, 85, 247, 0.12) 0%, transparent 70%)',
                pointerEvents: 'none',
                zIndex: 0,
            }} />

            <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                    <div>
                        <h1 style={{ fontSize: '36px', fontWeight: 700, marginBottom: '8px' }}>Applications</h1>
                        <p style={{ color: '#71717a', fontSize: '15px' }}>Track your job applications</p>
                    </div>
                    <button
                        onClick={() => setShowAddModal(true)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '12px 24px',
                            background: 'linear-gradient(135deg, #a855f7, #6366f1)',
                            borderRadius: '14px',
                            fontWeight: 500,
                            color: 'white',
                            fontSize: '14px',
                            border: 'none',
                            cursor: 'pointer',
                            boxShadow: '0 4px 16px rgba(168, 85, 247, 0.3)',
                        }}
                    >
                        <Plus style={{ width: '18px', height: '18px' }} />
                        Add Application
                    </button>
                </div>

                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
                    {[
                        { label: 'Total', value: stats.total, color: '#a1a1aa', glow: 'rgba(161, 161, 170, 0.1)' },
                        { label: 'Active', value: stats.active, color: '#6366f1', glow: 'rgba(99, 102, 241, 0.2)' },
                        { label: 'Offers', value: stats.offers, color: '#22c55e', glow: 'rgba(34, 197, 94, 0.2)' },
                        { label: 'Rejected', value: stats.rejected, color: '#ef4444', glow: 'rgba(239, 68, 68, 0.2)' },
                    ].map((stat, i) => (
                        <div key={i} style={statCardStyle(stat.color, stat.glow)}>
                            <p style={{ fontSize: '13px', color: '#71717a', marginBottom: '8px' }}>{stat.label}</p>
                            <p style={{ fontSize: '28px', fontWeight: 700, color: stat.color }}>{stat.value}</p>
                        </div>
                    ))}
                </div>

                {/* Filter */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                    <Filter style={{ width: '16px', height: '16px', color: '#71717a' }} />
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {['all', 'applied', 'screening', 'interviewing', 'offer', 'rejected'].map((status) => (
                            <button
                                key={status}
                                onClick={() => setFilter(status)}
                                style={{
                                    padding: '8px 16px',
                                    fontSize: '13px',
                                    borderRadius: '10px',
                                    border: 'none',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    background: filter === status ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'rgba(39, 39, 42, 0.8)',
                                    color: filter === status ? 'white' : '#a1a1aa',
                                    fontWeight: filter === status ? 500 : 400,
                                }}
                            >
                                {status.charAt(0).toUpperCase() + status.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>

                {/* List */}
                {filteredApplications.length === 0 ? (
                    <div style={{ ...cardStyle, padding: '80px 40px', textAlign: 'center' }}>
                        <div style={{
                            width: '80px',
                            height: '80px',
                            borderRadius: '24px',
                            background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(99, 102, 241, 0.2))',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 24px',
                        }}>
                            <Briefcase style={{ width: '36px', height: '36px', color: '#a855f7' }} />
                        </div>
                        <h3 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '10px' }}>No applications yet</h3>
                        <p style={{ color: '#71717a', marginBottom: '28px' }}>Start tracking your job applications</p>
                        <button
                            onClick={() => setShowAddModal(true)}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '14px 28px',
                                background: 'linear-gradient(135deg, #a855f7, #6366f1)',
                                borderRadius: '14px',
                                fontWeight: 500,
                                color: 'white',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '15px',
                                boxShadow: '0 4px 16px rgba(168, 85, 247, 0.3)',
                            }}
                        >
                            <Plus style={{ width: '18px', height: '18px' }} />
                            Add Your First Application
                        </button>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {filteredApplications.map((app) => (
                            <div key={app.id} style={{ ...cardStyle, padding: '20px 24px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                        <div style={{
                                            width: '56px',
                                            height: '56px',
                                            borderRadius: '16px',
                                            background: 'rgba(168, 85, 247, 0.1)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}>
                                            <Building2 style={{ width: '28px', height: '28px', color: '#a855f7' }} />
                                        </div>
                                        <div>
                                            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '6px' }}>
                                                {app.companies?.name || 'Unknown Company'}
                                            </h3>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '13px', color: '#71717a' }}>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <Calendar style={{ width: '14px', height: '14px' }} />
                                                    Applied {app.applied_at ? new Date(app.applied_at).toLocaleDateString() : 'N/A'}
                                                </span>
                                                <span>Round {app.current_round || 1}</span>
                                                <span>{app.days_in_process || 0} days</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                        <select
                                            value={app.status || 'applied'}
                                            onChange={(e) => updateStatus(app.id, e.target.value)}
                                            style={{
                                                padding: '8px 16px',
                                                background: 'rgba(39, 39, 42, 0.8)',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                borderRadius: '10px',
                                                color: 'white',
                                                fontSize: '13px',
                                                cursor: 'pointer',
                                            }}
                                        >
                                            <option value="applied">Applied</option>
                                            <option value="screening">Screening</option>
                                            <option value="interviewing">Interviewing</option>
                                            <option value="offer">Offer</option>
                                            <option value="rejected">Rejected</option>
                                            <option value="withdrawn">Withdrawn</option>
                                        </select>

                                        <div style={{
                                            width: '10px',
                                            height: '10px',
                                            borderRadius: '50%',
                                            background: app.status === 'offer' ? '#22c55e' :
                                                app.status === 'rejected' ? '#ef4444' :
                                                    app.status === 'interviewing' ? '#6366f1' :
                                                        '#52525b',
                                        }} />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Add Modal */}
                {showAddModal && (
                    <div style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.7)',
                        backdropFilter: 'blur(4px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 100,
                    }}>
                        <div style={{ ...cardStyle, padding: '32px', width: '400px' }}>
                            <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '24px' }}>Add Application</h2>

                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '13px', color: '#a1a1aa', marginBottom: '8px' }}>Company Name *</label>
                                <input
                                    type="text"
                                    value={newCompany}
                                    onChange={(e) => setNewCompany(e.target.value)}
                                    placeholder="e.g., Google"
                                    style={{
                                        width: '100%',
                                        padding: '12px 16px',
                                        background: 'rgba(39, 39, 42, 0.8)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '12px',
                                        color: 'white',
                                        fontSize: '14px',
                                    }}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                                <button
                                    onClick={() => setShowAddModal(false)}
                                    style={{
                                        flex: 1,
                                        padding: '12px',
                                        background: 'rgba(39, 39, 42, 0.8)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '12px',
                                        color: '#a1a1aa',
                                        fontSize: '14px',
                                        cursor: 'pointer',
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={addApplication}
                                    disabled={!newCompany.trim() || saving}
                                    style={{
                                        flex: 1,
                                        padding: '12px',
                                        background: newCompany.trim() ? 'linear-gradient(135deg, #a855f7, #6366f1)' : 'rgba(39, 39, 42, 0.8)',
                                        border: 'none',
                                        borderRadius: '12px',
                                        color: 'white',
                                        fontSize: '14px',
                                        cursor: newCompany.trim() ? 'pointer' : 'not-allowed',
                                        fontWeight: 500,
                                    }}
                                >
                                    {saving ? 'Adding...' : 'Add Application'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
