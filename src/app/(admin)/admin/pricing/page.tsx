'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
    ArrowLeft, 
    Save, 
    DollarSign, 
    Percent, 
    Zap, 
    Mic,
    Calculator,
    Info,
    Check,
    AlertCircle
} from 'lucide-react'
import Link from 'next/link'

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
    updated_at: string
}

export default function PricingControlPage() {
    const supabase = createClient()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [isAdmin, setIsAdmin] = useState(false)
    const [pricing, setPricing] = useState<PricingConfig | null>(null)
    const [originalPricing, setOriginalPricing] = useState<PricingConfig | null>(null)

    // Simulated interview costs
    const [simulatedInterview, setSimulatedInterview] = useState({
        durationMinutes: 30,
        questionsAsked: 15,
        avgInputTokens: 2000,
        avgOutputTokens: 300
    })

    useEffect(() => {
        loadPricing()
    }, [])

    const loadPricing = async () => {
        setLoading(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data: userData } = await supabase
                .from('users')
                .select('is_admin')
                .eq('id', user.id)
                .single()

            // Server-side layout already checked admin status, but verify client-side too
            setIsAdmin(userData?.is_admin === true)

            const { data } = await supabase
                .from('pricing_config')
                .select('*')
                .eq('is_active', true)
                .single()

            if (data) {
                setPricing(data)
                setOriginalPricing(data)
            }
        } catch (error) {
            console.error('Error loading pricing:', error)
        }
        setLoading(false)
    }

    const savePricing = async () => {
        if (!pricing) return
        setSaving(true)
        setSaved(false)

        try {
            const { error } = await supabase
                .from('pricing_config')
                .update({
                    gemini_input_per_1k_tokens: pricing.gemini_input_per_1k_tokens,
                    gemini_output_per_1k_tokens: pricing.gemini_output_per_1k_tokens,
                    assemblyai_per_hour: pricing.assemblyai_per_hour,
                    markup_percentage: pricing.markup_percentage,
                    tier_free_monthly_limit: pricing.tier_free_monthly_limit,
                    tier_basic_price: pricing.tier_basic_price,
                    tier_basic_interviews: pricing.tier_basic_interviews,
                    tier_pro_price: pricing.tier_pro_price,
                    tier_pro_interviews: pricing.tier_pro_interviews,
                    tier_unlimited_price: pricing.tier_unlimited_price,
                    updated_at: new Date().toISOString()
                })
                .eq('id', pricing.id)

            if (!error) {
                setSaved(true)
                setOriginalPricing(pricing)
                setTimeout(() => setSaved(false), 3000)
            }
        } catch (error) {
            console.error('Error saving pricing:', error)
        }
        setSaving(false)
    }

    const hasChanges = JSON.stringify(pricing) !== JSON.stringify(originalPricing)

    // Calculate costs
    const calculateCosts = () => {
        if (!pricing) return { gemini: 0, assemblyai: 0, total: 0, revenue: 0, profit: 0 }

        const geminiInputCost = (simulatedInterview.avgInputTokens / 1000) * pricing.gemini_input_per_1k_tokens * simulatedInterview.questionsAsked
        const geminiOutputCost = (simulatedInterview.avgOutputTokens / 1000) * pricing.gemini_output_per_1k_tokens * simulatedInterview.questionsAsked
        const geminiTotal = geminiInputCost + geminiOutputCost

        const assemblyaiCost = (simulatedInterview.durationMinutes / 60) * pricing.assemblyai_per_hour

        const totalCost = geminiTotal + assemblyaiCost
        const revenue = totalCost * (1 + pricing.markup_percentage / 100)
        const profit = revenue - totalCost

        return {
            gemini: geminiTotal,
            assemblyai: assemblyaiCost,
            total: totalCost,
            revenue,
            profit
        }
    }

    const costs = calculateCosts()

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
                <div style={{ width: 32, height: 32, border: '3px solid #27272a', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            </div>
        )
    }

    if (!isAdmin) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', gap: 16 }}>
                <AlertCircle style={{ width: 48, height: 48, color: '#ef4444' }} />
                <h2 style={{ color: 'white', fontSize: 20 }}>Access Denied</h2>
                <p style={{ color: '#71717a' }}>You need admin privileges to access this page.</p>
            </div>
        )
    }

    return (
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <Link 
                        href="/admin" 
                        style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 8, 
                            color: '#71717a', 
                            textDecoration: 'none',
                            padding: '8px 12px',
                            borderRadius: 8,
                            backgroundColor: '#18181b',
                            border: '1px solid #27272a'
                        }}
                    >
                        <ArrowLeft style={{ width: 16, height: 16 }} />
                        Back
                    </Link>
                    <div>
                        <h1 style={{ fontSize: 28, fontWeight: 700, color: 'white' }}>Pricing Control</h1>
                        <p style={{ color: '#71717a', fontSize: 14 }}>Configure API costs and markup</p>
                    </div>
                </div>
                <button
                    onClick={savePricing}
                    disabled={!hasChanges || saving}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '12px 24px',
                        backgroundColor: hasChanges ? '#6366f1' : '#27272a',
                        border: 'none',
                        borderRadius: 10,
                        color: hasChanges ? 'white' : '#71717a',
                        fontSize: 14,
                        fontWeight: 500,
                        cursor: hasChanges ? 'pointer' : 'not-allowed',
                        opacity: saving ? 0.7 : 1
                    }}
                >
                    {saved ? <Check style={{ width: 18, height: 18 }} /> : <Save style={{ width: 18, height: 18 }} />}
                    {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: 24 }}>
                {/* Left Column - Settings */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    {/* API Costs Card */}
                    <div style={{
                        backgroundColor: '#18181b',
                        borderRadius: 16,
                        border: '1px solid #27272a',
                        padding: 24
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                            <div style={{
                                width: 40,
                                height: 40,
                                borderRadius: 10,
                                background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <DollarSign style={{ width: 20, height: 20, color: 'white' }} />
                            </div>
                            <div>
                                <h2 style={{ fontSize: 18, fontWeight: 600, color: 'white' }}>API Costs</h2>
                                <p style={{ color: '#71717a', fontSize: 13 }}>What you pay to providers</p>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                            {/* Gemini Section */}
                            <div style={{ padding: 16, backgroundColor: '#27272a', borderRadius: 12 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                                    <Zap style={{ width: 16, height: 16, color: '#a78bfa' }} />
                                    <span style={{ color: 'white', fontSize: 14, fontWeight: 500 }}>Gemini 2.0 Flash</span>
                                </div>
                                
                                <div style={{ marginBottom: 16 }}>
                                    <label style={{ display: 'block', color: '#a1a1aa', fontSize: 12, marginBottom: 6 }}>
                                        Input (per 1K tokens)
                                    </label>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span style={{ color: '#71717a' }}>$</span>
                                        <input
                                            type="number"
                                            step="0.000001"
                                            value={pricing?.gemini_input_per_1k_tokens || 0}
                                            onChange={(e) => setPricing(p => p ? { ...p, gemini_input_per_1k_tokens: parseFloat(e.target.value) || 0 } : null)}
                                            style={{
                                                flex: 1,
                                                padding: '10px 12px',
                                                backgroundColor: '#18181b',
                                                border: '1px solid #3f3f46',
                                                borderRadius: 8,
                                                color: 'white',
                                                fontSize: 14
                                            }}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label style={{ display: 'block', color: '#a1a1aa', fontSize: 12, marginBottom: 6 }}>
                                        Output (per 1K tokens)
                                    </label>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span style={{ color: '#71717a' }}>$</span>
                                        <input
                                            type="number"
                                            step="0.000001"
                                            value={pricing?.gemini_output_per_1k_tokens || 0}
                                            onChange={(e) => setPricing(p => p ? { ...p, gemini_output_per_1k_tokens: parseFloat(e.target.value) || 0 } : null)}
                                            style={{
                                                flex: 1,
                                                padding: '10px 12px',
                                                backgroundColor: '#18181b',
                                                border: '1px solid #3f3f46',
                                                borderRadius: 8,
                                                color: 'white',
                                                fontSize: 14
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* AssemblyAI Section */}
                            <div style={{ padding: 16, backgroundColor: '#27272a', borderRadius: 12 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                                    <Mic style={{ width: 16, height: 16, color: '#22d3ee' }} />
                                    <span style={{ color: 'white', fontSize: 14, fontWeight: 500 }}>AssemblyAI</span>
                                </div>
                                
                                <div>
                                    <label style={{ display: 'block', color: '#a1a1aa', fontSize: 12, marginBottom: 6 }}>
                                        Real-time (per hour)
                                    </label>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span style={{ color: '#71717a' }}>$</span>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={pricing?.assemblyai_per_hour || 0}
                                            onChange={(e) => setPricing(p => p ? { ...p, assemblyai_per_hour: parseFloat(e.target.value) || 0 } : null)}
                                            style={{
                                                flex: 1,
                                                padding: '10px 12px',
                                                backgroundColor: '#18181b',
                                                border: '1px solid #3f3f46',
                                                borderRadius: 8,
                                                color: 'white',
                                                fontSize: 14
                                            }}
                                        />
                                    </div>
                                </div>

                                <div style={{ marginTop: 16, padding: 12, backgroundColor: '#18181b', borderRadius: 8 }}>
                                    <p style={{ color: '#71717a', fontSize: 12 }}>
                                        = ${((pricing?.assemblyai_per_hour || 0) / 60).toFixed(4)}/min
                                    </p>
                                    <p style={{ color: '#71717a', fontSize: 12 }}>
                                        = ${((pricing?.assemblyai_per_hour || 0) / 3600).toFixed(6)}/sec
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Official pricing reference */}
                        <div style={{ 
                            marginTop: 16, 
                            padding: 12, 
                            backgroundColor: 'rgba(99, 102, 241, 0.1)', 
                            borderRadius: 8,
                            border: '1px solid rgba(99, 102, 241, 0.2)',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 10
                        }}>
                            <Info style={{ width: 16, height: 16, color: '#818cf8', flexShrink: 0, marginTop: 2 }} />
                            <div style={{ fontSize: 12, color: '#a1a1aa' }}>
                                <strong style={{ color: '#818cf8' }}>Official API Pricing:</strong><br />
                                Gemini 2.0 Flash: $0.10/1M input, $0.40/1M output<br />
                                AssemblyAI Real-time: ~$18/hour ($0.005/second)
                            </div>
                        </div>
                    </div>

                    {/* Markup Card */}
                    <div style={{
                        backgroundColor: '#18181b',
                        borderRadius: 16,
                        border: '1px solid #27272a',
                        padding: 24
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                            <div style={{
                                width: 40,
                                height: 40,
                                borderRadius: 10,
                                background: 'linear-gradient(135deg, #22c55e 0%, #10b981 100%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <Percent style={{ width: 20, height: 20, color: 'white' }} />
                            </div>
                            <div>
                                <h2 style={{ fontSize: 18, fontWeight: 600, color: 'white' }}>Markup</h2>
                                <p style={{ color: '#71717a', fontSize: 13 }}>Your profit margin</p>
                            </div>
                        </div>

                        <div style={{ marginBottom: 20 }}>
                            <label style={{ display: 'block', color: '#a1a1aa', fontSize: 13, marginBottom: 8 }}>
                                Markup Percentage
                            </label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <input
                                    type="range"
                                    min="0"
                                    max="500"
                                    value={pricing?.markup_percentage || 0}
                                    onChange={(e) => setPricing(p => p ? { ...p, markup_percentage: parseInt(e.target.value) } : null)}
                                    style={{ flex: 1, accentColor: '#22c55e' }}
                                />
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <input
                                        type="number"
                                        value={pricing?.markup_percentage || 0}
                                        onChange={(e) => setPricing(p => p ? { ...p, markup_percentage: parseInt(e.target.value) || 0 } : null)}
                                        style={{
                                            width: 80,
                                            padding: '8px 12px',
                                            backgroundColor: '#27272a',
                                            border: '1px solid #3f3f46',
                                            borderRadius: 8,
                                            color: 'white',
                                            fontSize: 16,
                                            fontWeight: 600,
                                            textAlign: 'center'
                                        }}
                                    />
                                    <span style={{ color: '#71717a', fontSize: 16 }}>%</span>
                                </div>
                            </div>
                        </div>

                        <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: 'repeat(3, 1fr)', 
                            gap: 12,
                            padding: 16,
                            backgroundColor: '#27272a',
                            borderRadius: 12
                        }}>
                            <div style={{ textAlign: 'center' }}>
                                <p style={{ color: '#71717a', fontSize: 11, marginBottom: 4 }}>YOU PAY</p>
                                <p style={{ color: 'white', fontSize: 20, fontWeight: 600 }}>$1.00</p>
                            </div>
                            <div style={{ textAlign: 'center', borderLeft: '1px solid #3f3f46', borderRight: '1px solid #3f3f46' }}>
                                <p style={{ color: '#71717a', fontSize: 11, marginBottom: 4 }}>MULTIPLIER</p>
                                <p style={{ color: '#22c55e', fontSize: 20, fontWeight: 600 }}>
                                    {(1 + (pricing?.markup_percentage || 0) / 100).toFixed(2)}x
                                </p>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <p style={{ color: '#71717a', fontSize: 11, marginBottom: 4 }}>USER PAYS</p>
                                <p style={{ color: '#22c55e', fontSize: 20, fontWeight: 600 }}>
                                    ${(1 + (pricing?.markup_percentage || 0) / 100).toFixed(2)}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column - Calculator */}
                <div style={{
                    backgroundColor: '#18181b',
                    borderRadius: 16,
                    border: '1px solid #27272a',
                    padding: 24,
                    height: 'fit-content',
                    position: 'sticky',
                    top: 24
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                        <div style={{
                            width: 40,
                            height: 40,
                            borderRadius: 10,
                            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <Calculator style={{ width: 20, height: 20, color: 'white' }} />
                        </div>
                        <div>
                            <h2 style={{ fontSize: 18, fontWeight: 600, color: 'white' }}>Cost Calculator</h2>
                            <p style={{ color: '#71717a', fontSize: 13 }}>Estimate per interview</p>
                        </div>
                    </div>

                    {/* Simulator Inputs */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
                        <div>
                            <label style={{ display: 'block', color: '#a1a1aa', fontSize: 12, marginBottom: 6 }}>
                                Interview Duration
                            </label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <input
                                    type="number"
                                    value={simulatedInterview.durationMinutes}
                                    onChange={(e) => setSimulatedInterview(s => ({ ...s, durationMinutes: parseInt(e.target.value) || 0 }))}
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
                                <span style={{ color: '#71717a', fontSize: 13 }}>minutes</span>
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', color: '#a1a1aa', fontSize: 12, marginBottom: 6 }}>
                                Questions Asked
                            </label>
                            <input
                                type="number"
                                value={simulatedInterview.questionsAsked}
                                onChange={(e) => setSimulatedInterview(s => ({ ...s, questionsAsked: parseInt(e.target.value) || 0 }))}
                                style={{
                                    width: '100%',
                                    padding: '8px 12px',
                                    backgroundColor: '#27272a',
                                    border: '1px solid #3f3f46',
                                    borderRadius: 8,
                                    color: 'white',
                                    fontSize: 14
                                }}
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                            <div>
                                <label style={{ display: 'block', color: '#a1a1aa', fontSize: 11, marginBottom: 6 }}>
                                    Avg Input Tokens
                                </label>
                                <input
                                    type="number"
                                    value={simulatedInterview.avgInputTokens}
                                    onChange={(e) => setSimulatedInterview(s => ({ ...s, avgInputTokens: parseInt(e.target.value) || 0 }))}
                                    style={{
                                        width: '100%',
                                        padding: '8px 12px',
                                        backgroundColor: '#27272a',
                                        border: '1px solid #3f3f46',
                                        borderRadius: 8,
                                        color: 'white',
                                        fontSize: 14
                                    }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', color: '#a1a1aa', fontSize: 11, marginBottom: 6 }}>
                                    Avg Output Tokens
                                </label>
                                <input
                                    type="number"
                                    value={simulatedInterview.avgOutputTokens}
                                    onChange={(e) => setSimulatedInterview(s => ({ ...s, avgOutputTokens: parseInt(e.target.value) || 0 }))}
                                    style={{
                                        width: '100%',
                                        padding: '8px 12px',
                                        backgroundColor: '#27272a',
                                        border: '1px solid #3f3f46',
                                        borderRadius: 8,
                                        color: 'white',
                                        fontSize: 14
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Cost Breakdown */}
                    <div style={{ borderTop: '1px solid #27272a', paddingTop: 20 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ color: '#a1a1aa', fontSize: 13 }}>Gemini API</span>
                                <span style={{ color: 'white', fontSize: 14 }}>${costs.gemini.toFixed(4)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ color: '#a1a1aa', fontSize: 13 }}>AssemblyAI</span>
                                <span style={{ color: 'white', fontSize: 14 }}>${costs.assemblyai.toFixed(2)}</span>
                            </div>
                            <div style={{ height: 1, backgroundColor: '#27272a' }} />
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ color: '#f59e0b', fontSize: 14, fontWeight: 500 }}>Your Cost</span>
                                <span style={{ color: '#f59e0b', fontSize: 18, fontWeight: 600 }}>${costs.total.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Revenue & Profit */}
                    <div style={{ 
                        marginTop: 20, 
                        padding: 16, 
                        backgroundColor: 'rgba(34, 197, 94, 0.1)', 
                        borderRadius: 12,
                        border: '1px solid rgba(34, 197, 94, 0.2)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <span style={{ color: '#86efac', fontSize: 13 }}>User Pays ({pricing?.markup_percentage}% markup)</span>
                            <span style={{ color: '#22c55e', fontSize: 18, fontWeight: 600 }}>${costs.revenue.toFixed(2)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: '#86efac', fontSize: 13 }}>Your Profit</span>
                            <span style={{ color: '#22c55e', fontSize: 16, fontWeight: 600 }}>+${costs.profit.toFixed(2)}</span>
                        </div>
                    </div>

                    {/* Per Month Estimate */}
                    <div style={{ marginTop: 16, padding: 12, backgroundColor: '#27272a', borderRadius: 8 }}>
                        <p style={{ color: '#71717a', fontSize: 12, marginBottom: 8 }}>If user does 20 interviews/month:</p>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#a1a1aa', fontSize: 13 }}>Your cost</span>
                            <span style={{ color: 'white' }}>${(costs.total * 20).toFixed(2)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#a1a1aa', fontSize: 13 }}>Revenue</span>
                            <span style={{ color: '#22c55e' }}>${(costs.revenue * 20).toFixed(2)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#a1a1aa', fontSize: 13 }}>Profit</span>
                            <span style={{ color: '#22c55e', fontWeight: 600 }}>+${(costs.profit * 20).toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

