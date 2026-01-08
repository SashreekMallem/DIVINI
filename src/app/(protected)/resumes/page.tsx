'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
    FileText,
    Plus,
    Edit2,
    Trash2,
    Check,
    X,
    Loader2,
    Star,
    Upload,
    FileUp,
    ExternalLink
} from 'lucide-react'
import type { Resume } from '@/types/database'

export default function ResumesPage() {
    const supabase = createClient()
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [resumes, setResumes] = useState<Resume[]>([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [uploadProgress, setUploadProgress] = useState('')

    const [title, setTitle] = useState('')
    const [content, setContent] = useState('')
    const [fileUrl, setFileUrl] = useState<string | null>(null)

    useEffect(() => {
        loadResumes()
    }, [])

    const loadResumes = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user?.id) return
        const { data } = await supabase
            .from('resumes')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })

        setResumes((data || []) as unknown as Resume[])
        setLoading(false)
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setUploading(true)
        setUploadProgress('Uploading file...')

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            // Generate unique filename
            const fileExt = file.name.split('.').pop()
            const fileName = `${user.id}/${Date.now()}.${fileExt}`

            // Upload to Supabase Storage
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('resumes')
                .upload(fileName, file, {
                    cacheControl: '3600',
                    upsert: false
                })

            if (uploadError) {
                console.error('Upload error:', uploadError)
                // Show the actual error
                setUploadProgress(`Upload error: ${uploadError.message}`)
                setTimeout(() => {
                    setUploadProgress('')
                    setUploading(false)
                }, 5000)
                return
            }

            // Get public URL
            const { data: urlData } = supabase.storage
                .from('resumes')
                .getPublicUrl(fileName)

            setFileUrl(urlData.publicUrl)
            setTitle(file.name.replace(/\.(pdf|doc|docx|txt)$/i, ''))

            // For text files, extract content
            if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
                const text = await file.text()
                setContent(text)
                setUploadProgress('File uploaded! Text extracted.')
            } else {
                // For PDFs, automatically parse content
                setUploadProgress('Analyzing PDF content...')

                const formData = new FormData()
                formData.append('file', file)

                const parseResponse = await fetch('/api/parse-resume', {
                    method: 'POST',
                    body: formData
                })

                if (parseResponse.ok) {
                    const parseData = await parseResponse.json()
                    if (parseData.text) {
                        setContent(parseData.text)
                        setUploadProgress('PDF uploaded & text extracted successfully!')
                    } else {
                        throw new Error('No text found in PDF')
                    }
                } else {
                    throw new Error('Failed to parse PDF')
                }
            }

            setShowForm(true)
        } catch (error: any) {
            console.error('Error uploading file:', error)
            setUploadProgress(`Upload failed: ${error.message}`)
        } finally {
            setTimeout(() => {
                setUploading(false)
                setUploadProgress('')
            }, 3000)
            if (fileInputRef.current) {
                fileInputRef.current.value = ''
            }
        }
    }

    const handleSave = async () => {
        setSaving(true)
        const { data: { user } } = await supabase.auth.getUser()

        try {
            const resumeData = {
                title,
                content,
                token_count: Math.ceil(content.length / 4),
                file_url: fileUrl,
            }

            if (editingId) {
                await supabase.from('resumes').update(resumeData).eq('id', editingId)
            } else {
                await supabase.from('resumes').insert({
                    ...resumeData,
                    user_id: user?.id,
                    is_active: resumes.length === 0
                })
            }
            resetForm()
            loadResumes()
        } finally {
            setSaving(false)
        }
    }

    const handleEdit = (resume: Resume) => {
        setEditingId(resume.id)
        setTitle(resume.title)
        setContent(resume.content)
        setFileUrl((resume as any).file_url || null)
        setShowForm(true)
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this resume?')) return
        await supabase.from('resumes').delete().eq('id', id)
        loadResumes()
    }

    const handleSetActive = async (id: string) => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user?.id) return
        await supabase.from('resumes').update({ is_active: false }).eq('user_id', user.id)
        await supabase.from('resumes').update({ is_active: true }).eq('id', id)
        loadResumes()
    }

    const resetForm = () => {
        setShowForm(false)
        setEditingId(null)
        setTitle('')
        setContent('')
        setFileUrl(null)
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
            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.pdf,.doc,.docx"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
            />

            {/* Ambient glow */}
            <div style={{
                position: 'fixed',
                top: '-100px',
                right: '150px',
                width: '500px',
                height: '500px',
                background: 'radial-gradient(circle, rgba(34, 197, 94, 0.1) 0%, transparent 70%)',
                pointerEvents: 'none',
                zIndex: 0,
            }} />

            <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                    <div>
                        <h1 style={{ fontSize: '36px', fontWeight: 700, marginBottom: '8px' }}>Resumes</h1>
                        <p style={{ color: '#71717a', fontSize: '15px' }}>Manage your resumes for AI-powered coaching</p>
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '12px 24px',
                                background: 'rgba(39, 39, 42, 0.8)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '14px',
                                fontWeight: 500,
                                color: 'white',
                                fontSize: '14px',
                                cursor: 'pointer',
                            }}
                        >
                            {uploading ? (
                                <Loader2 style={{ width: '18px', height: '18px', animation: 'spin 1s linear infinite' }} />
                            ) : (
                                <FileUp style={{ width: '18px', height: '18px' }} />
                            )}
                            {uploading ? uploadProgress || 'Uploading...' : 'Upload File'}
                        </button>
                        <button
                            onClick={() => setShowForm(true)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '12px 24px',
                                background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                                borderRadius: '14px',
                                fontWeight: 500,
                                color: 'white',
                                fontSize: '14px',
                                border: 'none',
                                cursor: 'pointer',
                                boxShadow: '0 4px 16px rgba(34, 197, 94, 0.3)',
                            }}
                        >
                            <Plus style={{ width: '18px', height: '18px' }} />
                            Paste Text
                        </button>
                    </div>
                </div>

                {uploadProgress && !showForm && (
                    <div style={{
                        padding: '16px 20px',
                        background: 'rgba(99, 102, 241, 0.1)',
                        border: '1px solid rgba(99, 102, 241, 0.2)',
                        borderRadius: '14px',
                        marginBottom: '20px',
                        fontSize: '14px',
                        color: '#818cf8',
                    }}>
                        {uploadProgress}
                    </div>
                )}

                {showForm && (
                    <div style={{ ...cardStyle, padding: '24px', marginBottom: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h2 style={{ fontSize: '18px', fontWeight: 600 }}>{editingId ? 'Edit Resume' : 'Add Resume'}</h2>
                            <button onClick={resetForm} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#71717a' }}>
                                <X style={{ width: '20px', height: '20px' }} />
                            </button>
                        </div>

                        {fileUrl && (
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '12px 16px',
                                background: 'rgba(34, 197, 94, 0.1)',
                                borderRadius: '12px',
                                marginBottom: '16px',
                            }}>
                                <FileText style={{ width: '20px', height: '20px', color: '#22c55e' }} />
                                <span style={{ flex: 1, fontSize: '14px', color: '#22c55e' }}>File uploaded to storage</span>
                                <a
                                    href={fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ color: '#22c55e' }}
                                >
                                    <ExternalLink style={{ width: '16px', height: '16px' }} />
                                </a>
                            </div>
                        )}

                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '13px', color: '#a1a1aa', marginBottom: '8px' }}>Title</label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="e.g., Software Engineer Resume"
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

                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '13px', color: '#a1a1aa', marginBottom: '8px' }}>
                                Resume Content <span style={{ color: '#71717a' }}>(paste text for AI coaching)</span>
                            </label>
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder="Paste your resume text here for AI-powered interview coaching. The AI uses this content to generate personalized answers during your interviews."
                                rows={15}
                                style={{
                                    width: '100%',
                                    padding: '12px 16px',
                                    background: 'rgba(39, 39, 42, 0.8)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '12px',
                                    color: 'white',
                                    fontSize: '13px',
                                    fontFamily: 'monospace',
                                    resize: 'vertical',
                                }}
                            />
                            <p style={{ fontSize: '12px', color: '#52525b', marginTop: '8px' }}>~{Math.ceil(content.length / 4)} tokens</p>
                        </div>

                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button
                                onClick={resetForm}
                                style={{
                                    padding: '10px 20px',
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
                                onClick={handleSave}
                                disabled={!title || !content || saving}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '10px 20px',
                                    background: title && content ? 'linear-gradient(135deg, #22c55e, #16a34a)' : 'rgba(39, 39, 42, 0.8)',
                                    border: 'none',
                                    borderRadius: '12px',
                                    color: 'white',
                                    fontSize: '14px',
                                    cursor: title && content ? 'pointer' : 'not-allowed',
                                    fontWeight: 500,
                                }}
                            >
                                <Check style={{ width: '16px', height: '16px' }} />
                                {saving ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </div>
                )}

                {resumes.length === 0 && !showForm ? (
                    <div style={{ ...cardStyle, padding: '80px 40px', textAlign: 'center' }}>
                        <div style={{
                            width: '80px',
                            height: '80px',
                            borderRadius: '24px',
                            background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(22, 163, 74, 0.2))',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 24px',
                        }}>
                            <FileText style={{ width: '36px', height: '36px', color: '#22c55e' }} />
                        </div>
                        <h3 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '10px' }}>No resumes yet</h3>
                        <p style={{ color: '#71717a', marginBottom: '28px' }}>Add your resume to get personalized AI coaching</p>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '14px 28px',
                                    background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                                    borderRadius: '14px',
                                    fontWeight: 500,
                                    color: 'white',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: '15px',
                                    boxShadow: '0 4px 16px rgba(34, 197, 94, 0.3)',
                                }}
                            >
                                <Upload style={{ width: '18px', height: '18px' }} />
                                Upload Resume
                            </button>
                            <button
                                onClick={() => setShowForm(true)}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '14px 28px',
                                    background: 'rgba(39, 39, 42, 0.8)',
                                    borderRadius: '14px',
                                    fontWeight: 500,
                                    color: 'white',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    cursor: 'pointer',
                                    fontSize: '15px',
                                }}
                            >
                                <Plus style={{ width: '18px', height: '18px' }} />
                                Paste Text
                            </button>
                        </div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {resumes.map((resume) => (
                            <div
                                key={resume.id}
                                style={{
                                    ...cardStyle,
                                    padding: '24px',
                                    borderColor: resume.is_active ? 'rgba(99, 102, 241, 0.4)' : 'rgba(255, 255, 255, 0.06)',
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px' }}>
                                        <div style={{
                                            width: '56px',
                                            height: '56px',
                                            borderRadius: '16px',
                                            background: resume.is_active ? 'rgba(99, 102, 241, 0.15)' : 'rgba(34, 197, 94, 0.1)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}>
                                            <FileText style={{ width: '28px', height: '28px', color: resume.is_active ? '#6366f1' : '#22c55e' }} />
                                        </div>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
                                                <h3 style={{ fontSize: '16px', fontWeight: 600 }}>{resume.title}</h3>
                                                {resume.is_active && (
                                                    <span style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        padding: '4px 10px',
                                                        background: 'rgba(99, 102, 241, 0.15)',
                                                        borderRadius: '8px',
                                                        fontSize: '11px',
                                                        fontWeight: 500,
                                                        color: '#818cf8',
                                                    }}>
                                                        <Star style={{ width: '12px', height: '12px' }} />
                                                        Active
                                                    </span>
                                                )}
                                                {(resume as any).file_url && (
                                                    <a
                                                        href={(resume as any).file_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '4px',
                                                            padding: '4px 10px',
                                                            background: 'rgba(34, 197, 94, 0.1)',
                                                            borderRadius: '8px',
                                                            fontSize: '11px',
                                                            fontWeight: 500,
                                                            color: '#22c55e',
                                                            textDecoration: 'none',
                                                        }}
                                                    >
                                                        <ExternalLink style={{ width: '12px', height: '12px' }} />
                                                        View File
                                                    </a>
                                                )}
                                            </div>
                                            <p style={{ fontSize: '13px', color: '#71717a' }}>
                                                {resume.token_count} tokens • Used {resume.times_used || 0} times
                                            </p>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        {!resume.is_active && (
                                            <button
                                                onClick={() => handleSetActive(resume.id)}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    padding: '8px 16px',
                                                    background: 'rgba(99, 102, 241, 0.1)',
                                                    border: 'none',
                                                    borderRadius: '10px',
                                                    color: '#818cf8',
                                                    fontSize: '13px',
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                <Star style={{ width: '14px', height: '14px' }} />
                                                Set Active
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleEdit(resume)}
                                            style={{
                                                padding: '8px',
                                                background: 'rgba(39, 39, 42, 0.8)',
                                                border: 'none',
                                                borderRadius: '10px',
                                                color: '#a1a1aa',
                                                cursor: 'pointer',
                                            }}
                                        >
                                            <Edit2 style={{ width: '16px', height: '16px' }} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(resume.id)}
                                            style={{
                                                padding: '8px',
                                                background: 'rgba(239, 68, 68, 0.1)',
                                                border: 'none',
                                                borderRadius: '10px',
                                                color: '#ef4444',
                                                cursor: 'pointer',
                                            }}
                                        >
                                            <Trash2 style={{ width: '16px', height: '16px' }} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
