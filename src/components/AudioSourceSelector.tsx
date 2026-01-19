'use client'

import { useState, useEffect } from 'react'
import type { AudioSource } from '@/types/electron'
import { Monitor, Chrome, Loader2 } from 'lucide-react'

interface AudioSourceSelectorProps {
    onSourceSelected: (sourceId: string) => void
    selectedSourceId?: string | null
}

export function AudioSourceSelector({
    onSourceSelected,
    selectedSourceId
}: AudioSourceSelectorProps) {
    const [sources, setSources] = useState<AudioSource[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        async function loadSources() {
            if (!window.electron?.getAudioSources) {
                setError('Not running in Electron')
                setIsLoading(false)
                return
            }

            try {
                const audioSources = await window.electron.getAudioSources()
                console.log(`📱 Found ${audioSources.length} audio sources`)
                setSources(audioSources)
                setError(null)
            } catch (e) {
                console.error('Failed to load audio sources:', e)
                setError('Failed to load audio sources. Please try again.')
            } finally {
                setIsLoading(false)
            }
        }

        loadSources()
    }, [])

    // Don't render in web mode
    if (!window.electron) return null

    if (isLoading) {
        return (
            <div style={{
                padding: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                color: '#a1a1aa',
                fontSize: '14px'
            }}>
                <Loader2 style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} />
                Loading audio sources...
            </div>
        )
    }

    if (error) {
        return (
            <div style={{
                padding: '16px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: '8px',
                color: '#ef4444',
                fontSize: '13px'
            }}>
                {error}
            </div>
        )
    }

    if (sources.length === 0) {
        return (
            <div style={{
                padding: '16px',
                background: 'rgba(234, 179, 8, 0.1)',
                border: '1px solid rgba(234, 179, 8, 0.2)',
                borderRadius: '8px',
                color: '#eab308',
                fontSize: '13px'
            }}>
                No audio sources found. Make sure your interview app (Zoom, Meet, Teams) is running.
            </div>
        )
    }

    return (
        <div style={{ marginBottom: '16px' }}>
            <label style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 600,
                color: 'white',
                marginBottom: '12px'
            }}>
                Select Interview Audio Source:
            </label>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: '12px'
            }}>
                {sources.map(source => (
                    <button
                        key={source.id}
                        onClick={() => onSourceSelected(source.id)}
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            padding: '12px',
                            background: source.id === selectedSourceId
                                ? 'rgba(99, 102, 241, 0.2)'
                                : 'rgba(39, 39, 42, 0.8)',
                            border: source.id === selectedSourceId
                                ? '2px solid rgba(99, 102, 241, 0.5)'
                                : '1px solid #3f3f46',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            textAlign: 'center'
                        }}
                        onMouseEnter={(e) => {
                            if (source.id !== selectedSourceId) {
                                e.currentTarget.style.background = 'rgba(63, 63, 70, 0.8)'
                                e.currentTarget.style.transform = 'translateY(-2px)'
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (source.id !== selectedSourceId) {
                                e.currentTarget.style.background = 'rgba(39, 39, 42, 0.8)'
                                e.currentTarget.style.transform = 'translateY(0)'
                            }
                        }}
                    >
                        {/* Thumbnail */}
                        <div style={{
                            width: '100%',
                            height: '100px',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            marginBottom: '8px',
                            background: '#18181b'
                        }}>
                            <img
                                src={source.thumbnail}
                                alt={source.name}
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'contain'
                                }}
                            />
                        </div>

                        {/* App Name */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            marginBottom: '4px'
                        }}>
                            {source.type === 'screen' ? (
                                <Monitor style={{ width: '14px', height: '14px', color: '#a1a1aa' }} />
                            ) : (
                                <Chrome style={{ width: '14px', height: '14px', color: '#a1a1aa' }} />
                            )}
                            <span style={{
                                fontSize: '11px',
                                fontWeight: 600,
                                color: '#a1a1aa',
                                textTransform: 'uppercase'
                            }}>
                                {source.appName}
                            </span>
                        </div>

                        {/* Full Name */}
                        <div style={{
                            fontSize: '12px',
                            color: source.id === selectedSourceId ? '#818cf8' : 'white',
                            fontWeight: 500,
                            lineHeight: '1.4',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical'
                        }}>
                            {source.name}
                        </div>
                    </button>
                ))}
            </div>

            <p style={{
                marginTop: '12px',
                fontSize: '11px',
                color: '#71717a',
                lineHeight: '1.5'
            }}>
                💡 Tip: Select the browser tab or window where your interview is happening (Zoom, Meet, Teams, etc.)
            </p>
        </div>
    )
}
