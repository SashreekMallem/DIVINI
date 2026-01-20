'use client'

import { useState } from 'react'
import { Code2, Lightbulb, Play, TestTube, Clock, ChevronDown, ChevronUp, Loader2, Camera, X } from 'lucide-react'

interface CodingSolution {
    clarifyingQuestions: string[]
    approach: string
    code: string
    walkthrough: string
    testCases: string[]
    complexity: {
        time: string
        space: string
        explanation: string
    }
}

interface CodingSolutionPanelProps {
    screenshot: string | null
    solution: CodingSolution | null
    isLoading: boolean
    error: string | null
    onClose: () => void
    onRetry: () => void
}

export function CodingSolutionPanel({
    screenshot,
    solution,
    isLoading,
    error,
    onClose,
    onRetry
}: CodingSolutionPanelProps) {
    const [activeTab, setActiveTab] = useState<'idea' | 'code' | 'explain' | 'tests'>('idea')
    const [isExpanded, setIsExpanded] = useState(true)

    if (!screenshot && !solution && !isLoading) {
        return null
    }

    const cardStyle = {
        background: 'linear-gradient(135deg, rgba(24, 24, 27, 0.95) 0%, rgba(24, 24, 27, 0.8) 100%)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(34, 197, 94, 0.2)',
        borderRadius: '16px',
    }

    const tabStyle = (active: boolean) => ({
        padding: '8px 12px',
        fontSize: '12px',
        fontWeight: 500,
        borderRadius: '8px',
        cursor: 'pointer',
        border: 'none',
        background: active ? 'rgba(34, 197, 94, 0.15)' : 'transparent',
        color: active ? '#22c55e' : '#71717a',
        transition: 'all 0.2s'
    })

    return (
        <div style={{ ...cardStyle, marginBottom: '16px' }}>
            {/* Header */}
            <div style={{
                padding: '12px 16px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
            }}>
                <Code2 style={{ width: '16px', height: '16px', color: '#22c55e' }} />
                <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'white' }}>Coding Solution</h3>

                {isLoading && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '8px' }}>
                        <Loader2 style={{ width: '14px', height: '14px', color: '#22c55e', animation: 'spin 1s linear infinite' }} />
                        <span style={{ fontSize: '12px', color: '#22c55e' }}>Solving...</span>
                    </div>
                )}

                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#71717a', padding: '4px' }}
                    >
                        {isExpanded ? <ChevronUp style={{ width: '16px', height: '16px' }} /> : <ChevronDown style={{ width: '16px', height: '16px' }} />}
                    </button>
                    <button
                        onClick={onClose}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#71717a', padding: '4px' }}
                    >
                        <X style={{ width: '16px', height: '16px' }} />
                    </button>
                </div>
            </div>

            {isExpanded && (
                <div style={{ padding: '12px 16px' }}>
                    {/* Screenshot Preview */}
                    {screenshot && (
                        <div style={{ marginBottom: '12px' }}>
                            <img
                                src={screenshot}
                                alt="Captured problem"
                                style={{
                                    width: '100%',
                                    maxHeight: '120px',
                                    objectFit: 'cover',
                                    borderRadius: '8px',
                                    border: '1px solid rgba(255,255,255,0.1)'
                                }}
                            />
                        </div>
                    )}

                    {/* Error State */}
                    {error && (
                        <div style={{
                            padding: '12px',
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            borderRadius: '8px',
                            marginBottom: '12px'
                        }}>
                            <p style={{ fontSize: '13px', color: '#ef4444', marginBottom: '8px' }}>{error}</p>
                            <button
                                onClick={onRetry}
                                style={{
                                    padding: '6px 12px',
                                    fontSize: '12px',
                                    background: 'rgba(239, 68, 68, 0.2)',
                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                    borderRadius: '6px',
                                    color: '#ef4444',
                                    cursor: 'pointer'
                                }}
                            >
                                Retry
                            </button>
                        </div>
                    )}

                    {/* Loading State */}
                    {isLoading && !solution && (
                        <div style={{ textAlign: 'center', padding: '24px' }}>
                            <Loader2 style={{ width: '32px', height: '32px', color: '#22c55e', margin: '0 auto 12px', animation: 'spin 1s linear infinite' }} />
                            <p style={{ fontSize: '13px', color: '#a1a1aa' }}>Analyzing problem and generating solution...</p>
                        </div>
                    )}

                    {/* Solution Content */}
                    {solution && (
                        <>
                            {/* Tabs */}
                            <div style={{ display: 'flex', gap: '4px', marginBottom: '12px' }}>
                                <button style={tabStyle(activeTab === 'idea')} onClick={() => setActiveTab('idea')}>
                                    <Lightbulb style={{ width: '12px', height: '12px', marginRight: '4px', display: 'inline' }} />
                                    Idea
                                </button>
                                <button style={tabStyle(activeTab === 'code')} onClick={() => setActiveTab('code')}>
                                    <Code2 style={{ width: '12px', height: '12px', marginRight: '4px', display: 'inline' }} />
                                    Code
                                </button>
                                <button style={tabStyle(activeTab === 'explain')} onClick={() => setActiveTab('explain')}>
                                    <Play style={{ width: '12px', height: '12px', marginRight: '4px', display: 'inline' }} />
                                    Explain
                                </button>
                                <button style={tabStyle(activeTab === 'tests')} onClick={() => setActiveTab('tests')}>
                                    <TestTube style={{ width: '12px', height: '12px', marginRight: '4px', display: 'inline' }} />
                                    Tests
                                </button>
                            </div>

                            {/* Tab Content */}
                            <div style={{
                                background: 'rgba(0,0,0,0.2)',
                                borderRadius: '8px',
                                padding: '12px',
                                maxHeight: '300px',
                                overflowY: 'auto'
                            }}>
                                {activeTab === 'idea' && (
                                    <div>
                                        <h4 style={{ fontSize: '12px', color: '#22c55e', marginBottom: '8px', fontWeight: 600 }}>
                                            Clarifying Questions to Ask:
                                        </h4>
                                        <ul style={{ marginBottom: '12px', paddingLeft: '16px' }}>
                                            {solution.clarifyingQuestions.map((q, i) => (
                                                <li key={i} style={{ fontSize: '13px', color: '#e4e4e7', marginBottom: '4px' }}>{q}</li>
                                            ))}
                                        </ul>
                                        <h4 style={{ fontSize: '12px', color: '#22c55e', marginBottom: '8px', fontWeight: 600 }}>
                                            Approach:
                                        </h4>
                                        <p style={{ fontSize: '13px', color: '#e4e4e7', lineHeight: 1.5 }}>{solution.approach}</p>
                                    </div>
                                )}

                                {activeTab === 'code' && (
                                    <pre style={{
                                        fontSize: '12px',
                                        color: '#e4e4e7',
                                        fontFamily: 'monospace',
                                        whiteSpace: 'pre-wrap',
                                        wordBreak: 'break-word'
                                    }}>
                                        {solution.code}
                                    </pre>
                                )}

                                {activeTab === 'explain' && (
                                    <p style={{ fontSize: '13px', color: '#e4e4e7', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                                        {solution.walkthrough}
                                    </p>
                                )}

                                {activeTab === 'tests' && (
                                    <div>
                                        <h4 style={{ fontSize: '12px', color: '#22c55e', marginBottom: '8px', fontWeight: 600 }}>
                                            Test Cases to Mention:
                                        </h4>
                                        <ul style={{ marginBottom: '12px', paddingLeft: '16px' }}>
                                            {solution.testCases.map((tc, i) => (
                                                <li key={i} style={{ fontSize: '13px', color: '#e4e4e7', marginBottom: '4px' }}>{tc}</li>
                                            ))}
                                        </ul>
                                        <h4 style={{ fontSize: '12px', color: '#22c55e', marginBottom: '8px', fontWeight: 600 }}>
                                            <Clock style={{ width: '12px', height: '12px', marginRight: '4px', display: 'inline' }} />
                                            Complexity:
                                        </h4>
                                        <p style={{ fontSize: '13px', color: '#e4e4e7' }}>
                                            <strong>Time:</strong> {solution.complexity.time} | <strong>Space:</strong> {solution.complexity.space}
                                        </p>
                                        <p style={{ fontSize: '12px', color: '#a1a1aa', marginTop: '4px' }}>
                                            {solution.complexity.explanation}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    )
}
