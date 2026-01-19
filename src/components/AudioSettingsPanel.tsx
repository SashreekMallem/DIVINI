'use client'

import { useState, useEffect, useRef } from 'react'
import { Monitor, Mic, Volume2, AlertCircle, Chrome, Info, Settings } from 'lucide-react'

interface AudioSettingsPanelProps {
    selectedMicId: string
    setSelectedMicId: (id: string) => void
    useSystemAudio: boolean
    setUseSystemAudio: (enabled: boolean) => void
    isMicMuted: boolean
    toggleMicMute: () => void
    isRecording: boolean
    audioDevices: MediaDeviceInfo[]
    // Web Pre-selection props
    onConnectTab?: () => void
    connectedTabName?: string | null
    isConnectingTab?: boolean
}

export function AudioSettingsPanel({
    selectedMicId,
    setSelectedMicId,
    useSystemAudio,
    setUseSystemAudio,
    isMicMuted,
    toggleMicMute,
    isRecording,
    audioDevices,
    onConnectTab,
    connectedTabName,
    isConnectingTab
}: AudioSettingsPanelProps) {
    const [browserInfo, setBrowserInfo] = useState<{
        name: string
        supportsTabAudio: boolean
        supportsSystemAudio: boolean
    }>({ name: 'Unknown', supportsTabAudio: false, supportsSystemAudio: false })

    // Detect browser
    useEffect(() => {
        const ua = navigator.userAgent
        let name = 'Unknown'
        let supportsTabAudio = false
        let supportsSystemAudio = false

        if (ua.includes('Edg/')) {
            name = 'Edge'
            supportsTabAudio = true
            supportsSystemAudio = true // Windows only
        } else if (ua.includes('Chrome/') && !ua.includes('Edg/')) {
            name = 'Chrome'
            supportsTabAudio = true
            supportsSystemAudio = true // Windows/ChromeOS only
        } else if (ua.includes('Safari/') && !ua.includes('Chrome/')) {
            name = 'Safari'
            supportsTabAudio = false
            supportsSystemAudio = false
        } else if (ua.includes('Firefox/')) {
            name = 'Firefox'
            supportsTabAudio = false
            supportsSystemAudio = false
        }

        setBrowserInfo({ name, supportsTabAudio, supportsSystemAudio })
    }, [])

    return (
        <div style={{
            background: 'rgba(24, 24, 27, 0.95)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '16px'
        }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                <Settings style={{ width: '18px', height: '18px', color: '#818cf8' }} />
                <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'white', margin: 0 }}>
                    Audio Configuration
                </h3>
            </div>

            {/* Browser Warning */}
            {!browserInfo.supportsTabAudio && (
                <div style={{
                    padding: '12px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    borderRadius: '10px',
                    marginBottom: '16px',
                    display: 'flex',
                    gap: '10px'
                }}>
                    <AlertCircle style={{ width: '18px', height: '18px', color: '#ef4444', flexShrink: 0, marginTop: '2px' }} />
                    <div style={{ fontSize: '12px', color: '#fca5a5', lineHeight: '1.5' }}>
                        <strong>{browserInfo.name}</strong> doesn't support tab audio capture.
                        Switch to <strong>Chrome</strong> or <strong>Edge</strong> for dual-channel mode,
                        or use <strong>Microphone Only</strong> (both speakers through mic).
                    </div>
                </div>
            )}

            {/* Microphone Selection */}
            <div style={{ marginBottom: '20px' }}>
                <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: 'white',
                    marginBottom: '8px'
                }}>
                    <Mic style={{ width: '16px', height: '16px', color: '#818cf8' }} />
                    Microphone
                </label>
                <select
                    value={selectedMicId}
                    onChange={(e) => setSelectedMicId(e.target.value)}
                    disabled={isRecording}
                    style={{
                        width: '100%',
                        padding: '10px 12px',
                        background: 'rgba(39, 39, 42, 0.8)',
                        border: '1px solid #3f3f46',
                        borderRadius: '8px',
                        color: 'white',
                        fontSize: '13px',
                        cursor: isRecording ? 'not-allowed' : 'pointer',
                        opacity: isRecording ? 0.5 : 1
                    }}
                >
                    <option value="">Default Microphone</option>
                    {audioDevices.map(device => (
                        <option key={device.deviceId} value={device.deviceId}>
                            {device.label || `Microphone ${device.deviceId.slice(0, 8)}`}
                        </option>
                    ))}
                </select>

                {/* Mic Mute Button */}
                {isRecording && (
                    <button
                        onClick={toggleMicMute}
                        style={{
                            marginTop: '8px',
                            width: '100%',
                            padding: '10px',
                            background: isMicMuted ? 'rgba(239, 68, 68, 0.2)' : 'rgba(99, 102, 241, 0.1)',
                            border: isMicMuted ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(99, 102, 241, 0.2)',
                            borderRadius: '8px',
                            color: isMicMuted ? '#ef4444' : '#818cf8',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            transition: 'all 0.2s'
                        }}
                    >
                        <Mic style={{ width: '16px', height: '16px' }} />
                        {isMicMuted ? 'Mic Muted' : 'Mute Microphone'}
                    </button>
                )}
            </div>

            {/* Dual-Channel Toggle */}
            <div style={{
                padding: '16px',
                background: 'rgba(99, 102, 241, 0.05)',
                border: '1px solid rgba(99, 102, 241, 0.1)',
                borderRadius: '12px',
                marginBottom: '16px'
            }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <Monitor style={{ width: '16px', height: '16px', color: '#818cf8' }} />
                            <span style={{ fontSize: '13px', fontWeight: 600, color: 'white' }}>
                                Dual-Channel Mode
                            </span>
                        </div>
                        <p style={{ fontSize: '11px', color: '#a1a1aa', margin: 0, lineHeight: '1.4' }}>
                            Capture interviewer's audio from browser tab separately for accurate AI auto-triggering
                        </p>
                    </div>

                    {/* Toggle Switch */}
                    <button
                        onClick={() => {
                            if (useSystemAudio) {
                                // If turning off, clear pre-selection if needed? 
                                // Actually better to let the parent handle it
                            }
                            setUseSystemAudio(!useSystemAudio)
                        }}
                        disabled={isRecording || !browserInfo.supportsTabAudio}
                        style={{
                            position: 'relative',
                            width: '48px',
                            height: '26px',
                            background: useSystemAudio ? '#6366f1' : 'rgba(63, 63, 70, 0.8)',
                            borderRadius: '13px',
                            border: 'none',
                            cursor: (isRecording || !browserInfo.supportsTabAudio) ? 'not-allowed' : 'pointer',
                            transition: 'background 0.2s',
                            opacity: (isRecording || !browserInfo.supportsTabAudio) ? 0.5 : 1,
                            flexShrink: 0
                        }}
                    >
                        <div style={{
                            position: 'absolute',
                            top: '3px',
                            left: useSystemAudio ? '25px' : '3px',
                            width: '20px',
                            height: '20px',
                            background: 'white',
                            borderRadius: '50%',
                            transition: 'left 0.2s'
                        }} />
                    </button>
                </div>

                {/* Pre-selection Button (Web Only) */}
                {useSystemAudio && browserInfo.supportsTabAudio && !isRecording && !window.electron && (
                    <div style={{ marginBottom: '12px' }}>
                        <button
                            onClick={onConnectTab}
                            disabled={isConnectingTab}
                            style={{
                                width: '100%',
                                padding: '10px',
                                background: connectedTabName ? 'rgba(34, 197, 94, 0.1)' : 'rgba(99, 102, 241, 0.1)',
                                border: connectedTabName ? '1px solid rgba(34, 197, 94, 0.2)' : '1px solid rgba(99, 102, 241, 0.2)',
                                borderRadius: '8px',
                                color: connectedTabName ? '#4ade80' : '#818cf8',
                                fontSize: '13px',
                                fontWeight: 600,
                                cursor: isConnectingTab ? 'wait' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                transition: 'all 0.2s'
                            }}
                        >
                            {isConnectingTab ? (
                                <div style={{ width: '14px', height: '14px', border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                            ) : connectedTabName ? (
                                <Volume2 style={{ width: '16px', height: '16px' }} />
                            ) : (
                                <Monitor style={{ width: '16px', height: '16px' }} />
                            )}
                            {isConnectingTab ? 'Opening Picker...' : connectedTabName ? `Connected: ${connectedTabName.slice(0, 20)}${connectedTabName.length > 20 ? '...' : ''}` : 'Connect Audio Source'}
                        </button>

                        {connectedTabName && (
                            <p style={{ fontSize: '10px', color: '#4ade80', marginTop: '4px', textAlign: 'center', opacity: 0.8 }}>
                                ✓ Audio connection verified
                            </p>
                        )}
                    </div>
                )}

                {/* Instructions when enabled */}
                {useSystemAudio && browserInfo.supportsTabAudio && (
                    <div style={{
                        marginTop: '12px',
                        padding: '12px',
                        background: 'rgba(24, 24, 27, 0.8)',
                        borderRadius: '10px',
                        border: '1px solid rgba(255,255,255,0.05)',
                        fontSize: '11px',
                        color: '#d4d4d8'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                            <div style={{ padding: '4px', background: 'rgba(99, 102, 241, 0.2)', borderRadius: '6px' }}>
                                <Chrome style={{ width: '14px', height: '14px', color: '#818cf8' }} />
                            </div>
                            <strong style={{ color: 'white', fontSize: '12px' }}>Browser Selection Guide</strong>
                        </div>

                        <div style={{ display: 'grid', gap: '8px' }}>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', padding: '8px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px' }}>
                                <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#3f3f46', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 'bold' }}>1</div>
                                <span>Click <strong>"Browser Tab"</strong> at the top</span>
                            </div>

                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', padding: '8px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px' }}>
                                <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#3f3f46', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 'bold' }}>2</div>
                                <span>Select your <strong>Interview Tab</strong> (Zoom/Meet)</span>
                            </div>

                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', padding: '8px', background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)', borderRadius: '6px' }}>
                                <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#22c55e', color: 'black', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 'bold' }}>3</div>
                                <span style={{ color: '#86efac', fontWeight: 600 }}>Toggle "Share tab audio" on</span>
                            </div>

                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', padding: '8px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px' }}>
                                <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#3f3f46', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 'bold' }}>4</div>
                                <span>Click <strong>"Share"</strong></span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Browser Compatibility Info */}
            <div style={{
                padding: '10px 12px',
                background: 'rgba(39, 39, 42, 0.5)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '11px',
                color: '#a1a1aa'
            }}>
                <Chrome style={{ width: '14px', height: '14px' }} />
                <span>
                    <strong style={{ color: 'white' }}>Browser:</strong> {browserInfo.name}
                    {browserInfo.supportsTabAudio ? (
                        <span style={{ color: '#22c55e', marginLeft: '6px' }}>✓ Tab audio supported</span>
                    ) : (
                        <span style={{ color: '#ef4444', marginLeft: '6px' }}>✗ Tab audio not supported</span>
                    )}
                </span>
            </div>
        </div>
    )
}
