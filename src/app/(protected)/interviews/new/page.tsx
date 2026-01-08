'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
    Mic,
    FileText,
    Building2,
    ArrowRight,
    ArrowLeft,
    Check,
    Loader2,
    Sparkles,
    Zap
} from 'lucide-react'
import type { Resume, Company, Application, JobDescription } from '@/types/database'

type Step = 'company' | 'resume' | 'details' | 'ready'
// type ApplicationWithCompany removed

export default function NewInterviewPage() {
    const router = useRouter()
    const supabase = createClient()

    const [step, setStep] = useState<Step>('company')
    const [loading, setLoading] = useState(true)
    const [creating, setCreating] = useState(false)

    const [resumes, setResumes] = useState<Resume[]>([])
    const [companies, setCompanies] = useState<Company[]>([])
    const [existingJDs, setExistingJDs] = useState<JobDescription[]>([])

    const [selectedResume, setSelectedResume] = useState<string | null>(null)
    const [selectedCompany, setSelectedCompany] = useState<string | null>(null)
    const [newCompanyName, setNewCompanyName] = useState('')
    const [newCompanyInfo, setNewCompanyInfo] = useState('')  // Single paste-everything field
    const [companySearch, setCompanySearch] = useState('')

    const [interviewType, setInterviewType] = useState('behavioral')
    const [roundNumber, setRoundNumber] = useState(1)
    const [roundName, setRoundName] = useState('')
    const [jobDescriptionText, setJobDescriptionText] = useState('')
    const [roleTitle, setRoleTitle] = useState('')
    const [selectedJD, setSelectedJD] = useState<string | null>(null)

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        const userId = user?.id || ''

        const [resumesRes, companiesRes] = await Promise.all([
            supabase.from('resumes').select('*').eq('user_id', userId),
            supabase.from('companies').select('*'),
        ])

        setResumes((resumesRes.data || []) as unknown as Resume[])
        setCompanies((companiesRes.data || []) as unknown as Company[])
        setLoading(false)
    }

    // Load JDs when company is selected
    const loadJDsForCompany = async (companyId: string) => {
        const { data } = await supabase
            .from('job_descriptions')
            .select('*')
            .eq('company_id', companyId)
        setExistingJDs((data || []) as JobDescription[])
    }

    const handleCreateInterview = async () => {
        setCreating(true)

        try {
            const { data: { user } } = await supabase.auth.getUser()

            // Get company from: 1) selected company, 2) new company
            let companyId = selectedCompany

            // If still no company and new company name provided, create new company
            if (!companyId && newCompanyName) {
                const { data: newCompany } = await supabase
                    .from('companies')
                    .insert({
                        name: newCompanyName,
                        culture_notes: newCompanyInfo || null,
                    })
                    .select()
                    .single()

                companyId = newCompany?.id || null
            }

            if (!user?.id) return

            // Use existing JD or create new one if provided
            let jobDescriptionId = selectedJD
            if (!selectedJD && jobDescriptionText.trim()) {
                const { data: jd } = await supabase
                    .from('job_descriptions')
                    .insert({
                        user_id: user.id,
                        role_title: roleTitle || 'Untitled Role',
                        content: jobDescriptionText,
                        company_id: companyId,
                    })
                    .select('id')
                    .single()
                jobDescriptionId = jd?.id || null
            }

            const { data: interview } = await supabase
                .from('interviews')
                .insert({
                    user_id: user.id,
                    application_id: null, // explicit null
                    company_id: companyId,
                    resume_id: selectedResume,
                    job_description_id: jobDescriptionId,
                    interview_type: interviewType,
                    round_number: roundNumber,
                    round_name: roundName || `${interviewType.charAt(0).toUpperCase() + interviewType.slice(1)} Round ${roundNumber}`,
                    session_status: 'scheduled'
                })
                .select()
                .single()

            router.push(`/interviews/${interview?.id}`)
        } catch (error) {
            console.error('Error creating interview:', error)
        } finally {
            setCreating(false)
        }
    }

    const interviewTypes = [
        { value: 'behavioral', label: 'Behavioral', description: 'Tell me about a time...', color: '#6366f1' },
        { value: 'technical', label: 'Technical', description: 'Coding and algorithms', color: '#22c55e' },
        { value: 'system_design', label: 'System Design', description: 'Design a system that...', color: '#a855f7' },
        { value: 'phone_screen', label: 'Phone Screen', description: 'Initial recruiter call', color: '#eab308' },
        { value: 'hiring_manager', label: 'Hiring Manager', description: 'Meet the manager', color: '#ec4899' },
        { value: 'team_match', label: 'Team Match', description: 'Culture fit discussion', color: '#3b82f6' },
    ]

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

    const steps = ['company', 'resume', 'details', 'ready'] as const
    const currentStepIndex = steps.indexOf(step)

    return (
        <div style={{ maxWidth: '700px', margin: '0 auto', position: 'relative' }}>
            {/* Ambient glow */}
            <div style={{
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '600px',
                height: '600px',
                background: 'radial-gradient(circle, rgba(99, 102, 241, 0.1) 0%, transparent 70%)',
                pointerEvents: 'none',
                zIndex: 0,
            }} />

            <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ marginBottom: '40px' }}>
                    <h1 style={{ fontSize: '36px', fontWeight: 700, marginBottom: '8px' }}>New Interview Session</h1>
                    <p style={{ color: '#71717a', fontSize: '15px' }}>Set up your interview to get AI-powered coaching</p>
                </div>

                {/* Progress */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '40px' }}>
                    {steps.map((s, i) => (
                        <div key={s} style={{ display: 'flex', alignItems: 'center' }}>
                            <div style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '14px',
                                fontWeight: 500,
                                background: step === s ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' :
                                    currentStepIndex > i ? '#22c55e' :
                                        'rgba(39, 39, 42, 0.8)',
                                color: 'white',
                                boxShadow: step === s ? '0 4px 12px rgba(99, 102, 241, 0.3)' : 'none',
                            }}>
                                {currentStepIndex > i ? <Check style={{ width: '18px', height: '18px' }} /> : i + 1}
                            </div>
                            {i < 3 && (
                                <div style={{
                                    width: '60px',
                                    height: '2px',
                                    marginLeft: '12px',
                                    background: currentStepIndex > i ? '#22c55e' : 'rgba(39, 39, 42, 0.8)',
                                }} />
                            )}
                        </div>
                    ))}
                </div>

                <div style={cardStyle}>
                    <div style={{ padding: '32px' }}>
                        {step === 'company' && (
                            <div>
                                <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px' }}>Select Company</h2>
                                <p style={{ color: '#71717a', fontSize: '14px', marginBottom: '24px' }}>Choose an existing application or enter a new company</p>



                                {/* Existing Companies - Searchable List */}
                                {companies.length > 0 && (
                                    <div style={{ marginBottom: '24px' }}>
                                        <label style={{ display: 'block', fontSize: '13px', color: '#a1a1aa', marginBottom: '8px' }}>
                                            Select Existing Company ({companies.length})
                                        </label>
                                        {companies.length > 5 && (
                                            <input
                                                value={companySearch}
                                                onChange={(e) => setCompanySearch(e.target.value)}
                                                placeholder="Search companies..."
                                                style={{
                                                    width: '100%',
                                                    padding: '10px 14px',
                                                    marginBottom: '10px',
                                                    background: 'rgba(39, 39, 42, 0.8)',
                                                    border: '1px solid rgba(255,255,255,0.1)',
                                                    borderRadius: '10px',
                                                    color: 'white',
                                                    fontSize: '13px',
                                                }}
                                            />
                                        )}
                                        <div style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '6px',
                                            maxHeight: '200px',
                                            overflowY: 'auto',
                                        }}>
                                            {companies
                                                .filter(c => c.name.toLowerCase().includes(companySearch.toLowerCase()))
                                                .map((comp) => (
                                                    <button
                                                        key={comp.id}
                                                        onClick={() => {
                                                            setSelectedCompany(comp.id)
                                                            setNewCompanyName('')
                                                            loadJDsForCompany(comp.id)
                                                        }}
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '12px',
                                                            padding: '12px 14px',
                                                            borderRadius: '10px',
                                                            border: selectedCompany === comp.id ? '2px solid #6366f1' : '1px solid rgba(255,255,255,0.08)',
                                                            background: selectedCompany === comp.id ? 'rgba(99, 102, 241, 0.1)' : 'rgba(39, 39, 42, 0.4)',
                                                            cursor: 'pointer',
                                                            textAlign: 'left',
                                                            color: 'white',
                                                            width: '100%',
                                                        }}
                                                    >
                                                        <Building2 style={{ width: '16px', height: '16px', color: '#6366f1', flexShrink: 0 }} />
                                                        <span style={{ flex: 1, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                            {comp.name}
                                                        </span>
                                                        {selectedCompany === comp.id && <Check style={{ width: '16px', height: '16px', color: '#6366f1' }} />}
                                                    </button>
                                                ))}
                                        </div>
                                    </div>
                                )}

                                <div style={{ position: 'relative', margin: '24px 0' }}>
                                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center' }}>
                                        <div style={{ width: '100%', borderTop: '1px solid rgba(255,255,255,0.1)' }} />
                                    </div>
                                    <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
                                        <span style={{ padding: '0 16px', background: '#18181b', fontSize: '13px', color: '#71717a' }}>or add a new company</span>
                                    </div>
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', color: '#a1a1aa', marginBottom: '8px' }}>Company Name *</label>
                                    <input
                                        value={newCompanyName}
                                        onChange={(e) => {
                                            setNewCompanyName(e.target.value)
                                            setSelectedCompany(null)
                                        }}
                                        placeholder="e.g., Google, Meta, Apple..."
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

                                {/* Company Info - simple paste box shown when entering new company */}
                                {newCompanyName && (
                                    <div style={{ marginTop: '16px' }}>
                                        <label style={{ display: 'block', fontSize: '12px', color: '#71717a', marginBottom: '6px' }}>
                                            Company Info (optional - paste anything: about, culture, values, JD, etc.)
                                        </label>
                                        <textarea
                                            value={newCompanyInfo}
                                            onChange={(e) => setNewCompanyInfo(e.target.value)}
                                            placeholder="Paste any company info here - mission, values, culture, job listings, etc. This helps AI personalize answers to match the company's style."
                                            rows={4}
                                            style={{
                                                width: '100%',
                                                padding: '12px 14px',
                                                background: 'rgba(39, 39, 42, 0.8)',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                borderRadius: '12px',
                                                color: 'white',
                                                fontSize: '13px',
                                                resize: 'vertical'
                                            }}
                                        />
                                    </div>
                                )}

                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '32px' }}>
                                    <button
                                        onClick={() => setStep('resume')}
                                        disabled={!selectedCompany && !newCompanyName}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            padding: '12px 24px',
                                            background: selectedCompany || newCompanyName ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'rgba(39, 39, 42, 0.8)',
                                            borderRadius: '12px',
                                            border: 'none',
                                            color: 'white',
                                            fontSize: '14px',
                                            fontWeight: 500,
                                            cursor: selectedCompany || newCompanyName ? 'pointer' : 'not-allowed',
                                        }}
                                    >
                                        Continue
                                        <ArrowRight style={{ width: '16px', height: '16px' }} />
                                    </button>
                                </div>
                            </div>
                        )}

                        {step === 'resume' && (
                            <div>
                                <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px' }}>Select Resume</h2>
                                <p style={{ color: '#71717a', fontSize: '14px', marginBottom: '24px' }}>Choose the resume for personalized coaching</p>

                                {resumes.length > 0 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {resumes.map((resume) => (
                                            <button
                                                key={resume.id}
                                                onClick={() => setSelectedResume(resume.id)}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '16px',
                                                    width: '100%',
                                                    padding: '16px',
                                                    borderRadius: '14px',
                                                    border: selectedResume === resume.id ? '2px solid #22c55e' : '1px solid rgba(255,255,255,0.1)',
                                                    background: selectedResume === resume.id ? 'rgba(34, 197, 94, 0.1)' : 'rgba(39, 39, 42, 0.5)',
                                                    cursor: 'pointer',
                                                    textAlign: 'left',
                                                    color: 'white',
                                                }}
                                            >
                                                <FileText style={{ width: '20px', height: '20px', color: '#22c55e' }} />
                                                <div style={{ flex: 1 }}>
                                                    <p style={{ fontWeight: 500 }}>{resume.title}</p>
                                                    <p style={{ fontSize: '13px', color: '#71717a' }}>{resume.token_count} tokens</p>
                                                </div>
                                                {selectedResume === resume.id && <Check style={{ width: '20px', height: '20px', color: '#22c55e' }} />}
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div style={{
                                        padding: '40px',
                                        textAlign: 'center',
                                        border: '2px dashed rgba(255,255,255,0.1)',
                                        borderRadius: '16px',
                                    }}>
                                        <FileText style={{ width: '40px', height: '40px', color: '#52525b', margin: '0 auto 16px' }} />
                                        <p style={{ color: '#71717a', marginBottom: '16px' }}>No resumes found</p>
                                        <button
                                            onClick={() => router.push('/resumes')}
                                            style={{
                                                padding: '10px 20px',
                                                background: 'rgba(34, 197, 94, 0.1)',
                                                borderRadius: '10px',
                                                border: 'none',
                                                color: '#22c55e',
                                                fontSize: '14px',
                                                cursor: 'pointer',
                                            }}
                                        >
                                            Add Resume
                                        </button>
                                    </div>
                                )}

                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px' }}>
                                    <button
                                        onClick={() => setStep('company')}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            padding: '12px 24px',
                                            background: 'rgba(39, 39, 42, 0.8)',
                                            borderRadius: '12px',
                                            border: 'none',
                                            color: '#a1a1aa',
                                            fontSize: '14px',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        <ArrowLeft style={{ width: '16px', height: '16px' }} />
                                        Back
                                    </button>
                                    <button
                                        onClick={() => setStep('details')}
                                        disabled={!selectedResume}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            padding: '12px 24px',
                                            background: selectedResume ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'rgba(39, 39, 42, 0.8)',
                                            borderRadius: '12px',
                                            border: 'none',
                                            color: 'white',
                                            fontSize: '14px',
                                            fontWeight: 500,
                                            cursor: selectedResume ? 'pointer' : 'not-allowed',
                                        }}
                                    >
                                        Continue
                                        <ArrowRight style={{ width: '16px', height: '16px' }} />
                                    </button>
                                </div>
                            </div>
                        )}

                        {step === 'details' && (
                            <div>
                                <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px' }}>Interview Details</h2>
                                <p style={{ color: '#71717a', fontSize: '14px', marginBottom: '24px' }}>Tell us about this interview round</p>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '24px' }}>
                                    {interviewTypes.map((type) => (
                                        <button
                                            key={type.value}
                                            onClick={() => setInterviewType(type.value)}
                                            style={{
                                                padding: '16px',
                                                borderRadius: '14px',
                                                border: interviewType === type.value ? `2px solid ${type.color}` : '1px solid rgba(255,255,255,0.1)',
                                                background: interviewType === type.value ? `${type.color}15` : 'rgba(39, 39, 42, 0.5)',
                                                cursor: 'pointer',
                                                textAlign: 'left',
                                                color: 'white',
                                            }}
                                        >
                                            <p style={{ fontWeight: 500, marginBottom: '4px' }}>{type.label}</p>
                                            <p style={{ fontSize: '12px', color: '#71717a' }}>{type.description}</p>
                                        </button>
                                    ))}
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', color: '#a1a1aa', marginBottom: '8px' }}>Round Number</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={roundNumber}
                                            onChange={(e) => setRoundNumber(parseInt(e.target.value) || 1)}
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
                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', color: '#a1a1aa', marginBottom: '8px' }}>Round Name (optional)</label>
                                        <input
                                            value={roundName}
                                            onChange={(e) => setRoundName(e.target.value)}
                                            placeholder="e.g., Technical Round 1"
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
                                </div>

                                {/* Job Description Section */}
                                <div style={{ marginTop: '24px', padding: '20px', background: 'rgba(168, 85, 247, 0.05)', border: '1px solid rgba(168, 85, 247, 0.1)', borderRadius: '14px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                        <Sparkles style={{ width: '16px', height: '16px', color: '#a855f7' }} />
                                        <span style={{ fontWeight: 500, fontSize: '14px' }}>Job Description (optional but recommended)</span>
                                    </div>
                                    <p style={{ fontSize: '12px', color: '#71717a', marginBottom: '12px' }}>
                                        Paste the JD for more personalized AI coaching tailored to the role
                                    </p>

                                    {/* Existing JDs for this company */}
                                    {existingJDs.length > 0 && selectedCompany && (
                                        <div style={{ marginBottom: '12px' }}>
                                            <label style={{ display: 'block', fontSize: '12px', color: '#71717a', marginBottom: '6px' }}>Use existing JD for this company:</label>
                                            <select
                                                value={selectedJD || ''}
                                                onChange={(e) => {
                                                    const jdId = e.target.value
                                                    setSelectedJD(jdId || null)
                                                    if (jdId) {
                                                        const jd = existingJDs.find(j => j.id === jdId)
                                                        if (jd) {
                                                            setRoleTitle(jd.role_title)
                                                            setJobDescriptionText(jd.content)
                                                        }
                                                    } else {
                                                        setRoleTitle('')
                                                        setJobDescriptionText('')
                                                    }
                                                }}
                                                style={{ width: '100%', padding: '10px 14px', background: 'rgba(39, 39, 42, 0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white', fontSize: '13px' }}
                                            >
                                                <option value="">-- Enter new JD --</option>
                                                {existingJDs.map(jd => (
                                                    <option key={jd.id} value={jd.id}>{jd.role_title}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    <input
                                        value={roleTitle}
                                        onChange={(e) => setRoleTitle(e.target.value)}
                                        placeholder="Role title (e.g., Senior Software Engineer)"
                                        style={{
                                            width: '100%',
                                            padding: '10px 14px',
                                            marginBottom: '10px',
                                            background: 'rgba(39, 39, 42, 0.8)',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: '10px',
                                            color: 'white',
                                            fontSize: '13px',
                                        }}
                                    />

                                    <textarea
                                        value={jobDescriptionText}
                                        onChange={(e) => setJobDescriptionText(e.target.value)}
                                        placeholder="Paste the full job description here..."
                                        rows={5}
                                        style={{
                                            width: '100%',
                                            padding: '12px 14px',
                                            background: 'rgba(39, 39, 42, 0.8)',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: '10px',
                                            color: 'white',
                                            fontSize: '13px',
                                            resize: 'vertical',
                                        }}
                                    />
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px' }}>
                                    <button
                                        onClick={() => setStep('resume')}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            padding: '12px 24px',
                                            background: 'rgba(39, 39, 42, 0.8)',
                                            borderRadius: '12px',
                                            border: 'none',
                                            color: '#a1a1aa',
                                            fontSize: '14px',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        <ArrowLeft style={{ width: '16px', height: '16px' }} />
                                        Back
                                    </button>
                                    <button
                                        onClick={() => setStep('ready')}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            padding: '12px 24px',
                                            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                            borderRadius: '12px',
                                            border: 'none',
                                            color: 'white',
                                            fontSize: '14px',
                                            fontWeight: 500,
                                            cursor: 'pointer',
                                        }}
                                    >
                                        Continue
                                        <ArrowRight style={{ width: '16px', height: '16px' }} />
                                    </button>
                                </div>
                            </div>
                        )}

                        {step === 'ready' && (
                            <div>
                                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                                    <div style={{
                                        width: '80px',
                                        height: '80px',
                                        borderRadius: '24px',
                                        background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(22, 163, 74, 0.3))',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        margin: '0 auto 20px',
                                    }}>
                                        <Zap style={{ width: '40px', height: '40px', color: '#22c55e' }} />
                                    </div>
                                    <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '8px' }}>Ready to Start!</h2>
                                    <p style={{ color: '#71717a' }}>Your interview session is configured</p>
                                </div>

                                <div style={{
                                    background: 'rgba(39, 39, 42, 0.5)',
                                    borderRadius: '16px',
                                    padding: '20px',
                                    margin: '24px 0',
                                }}>
                                    {[
                                        { label: 'Company', value: newCompanyName || companies.find(c => c.id === selectedCompany)?.name || 'Not selected' },
                                        { label: 'Resume', value: resumes.find(r => r.id === selectedResume)?.title || 'Not selected' },
                                        { label: 'Interview Type', value: interviewType.replace('_', ' ') },
                                        { label: 'Round', value: roundName || `Round ${roundNumber}` },
                                    ].map((item, i) => (
                                        <div key={i} style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            padding: '12px 0',
                                            borderBottom: i < 3 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                                        }}>
                                            <span style={{ color: '#71717a' }}>{item.label}</span>
                                            <span style={{ fontWeight: 500, textTransform: 'capitalize' }}>{item.value}</span>
                                        </div>
                                    ))}
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <button
                                        onClick={() => setStep('details')}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            padding: '12px 24px',
                                            background: 'rgba(39, 39, 42, 0.8)',
                                            borderRadius: '12px',
                                            border: 'none',
                                            color: '#a1a1aa',
                                            fontSize: '14px',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        <ArrowLeft style={{ width: '16px', height: '16px' }} />
                                        Back
                                    </button>
                                    <button
                                        onClick={handleCreateInterview}
                                        disabled={creating}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '10px',
                                            padding: '14px 28px',
                                            background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                                            borderRadius: '14px',
                                            border: 'none',
                                            color: 'white',
                                            fontSize: '15px',
                                            fontWeight: 600,
                                            cursor: creating ? 'not-allowed' : 'pointer',
                                            boxShadow: '0 4px 16px rgba(34, 197, 94, 0.3)',
                                        }}
                                    >
                                        {creating ? (
                                            <Loader2 style={{ width: '18px', height: '18px', animation: 'spin 1s linear infinite' }} />
                                        ) : (
                                            <Mic style={{ width: '18px', height: '18px' }} />
                                        )}
                                        {creating ? 'Starting...' : 'Start Interview'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
