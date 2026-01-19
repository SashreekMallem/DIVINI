'use client'

import { X, Chrome, Monitor, MousePointer } from 'lucide-react'

interface StealthModeGuideProps {
    onClose: () => void
    platform: 'darwin' | 'linux' | string
}

/**
 * StealthModeGuide - Modal explaining browser tab sharing strategy
 * 
 * Shown on macOS and Linux where true window invisibility is not possible.
 * Guides users through the browser tab sharing workaround.
 */
export function StealthModeGuide({ onClose, platform }: StealthModeGuideProps) {
    const isMac = platform === 'darwin'

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-zinc-900 rounded-2xl max-w-lg w-full border border-zinc-700 shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-zinc-800">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                            <Monitor className="w-5 h-5 text-amber-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold text-white">
                                {isMac ? '🍎 macOS' : '🐧 Linux'} Stealth Mode
                            </h2>
                            <p className="text-sm text-zinc-400">Browser Tab Strategy</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-zinc-800 transition-colors"
                    >
                        <X className="w-5 h-5 text-zinc-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Warning */}
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                        <p className="text-amber-200 text-sm">
                            <strong>Why this is needed:</strong> {isMac ? "Apple's ScreenCaptureKit" : "Linux screen capture"} cannot be bypassed programmatically.
                            The only reliable method is sharing a specific browser tab.
                        </p>
                    </div>

                    {/* Steps */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium text-white flex items-center gap-2">
                            <Chrome className="w-5 h-5 text-blue-400" />
                            Browser Tab Sharing Steps
                        </h3>

                        <ol className="space-y-3">
                            <li className="flex gap-3">
                                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 text-sm font-medium">1</span>
                                <span className="text-zinc-300">Open your interview (LeetCode, HackerRank) in <strong className="text-white">Chrome Tab 1</strong></span>
                            </li>
                            <li className="flex gap-3">
                                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 text-sm font-medium">2</span>
                                <span className="text-zinc-300">Open DIVINI Coach in <strong className="text-white">Chrome Tab 2</strong> (or this app)</span>
                            </li>
                            <li className="flex gap-3">
                                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 text-sm font-medium">3</span>
                                <span className="text-zinc-300">In Zoom/Teams, click <strong className="text-white">"Share Screen"</strong></span>
                            </li>
                            <li className="flex gap-3">
                                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 text-sm font-medium">4</span>
                                <span className="text-zinc-300">Select <strong className="text-green-400">"Chrome Tab"</strong> (NOT Window or Screen)</span>
                            </li>
                            <li className="flex gap-3">
                                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 text-sm font-medium">5</span>
                                <span className="text-zinc-300">Choose <strong className="text-green-400">Tab 1</strong> only (interview tab)</span>
                            </li>
                        </ol>
                    </div>

                    {/* Pro tip */}
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                        <p className="text-blue-200 text-sm flex items-start gap-2">
                            <MousePointer className="w-4 h-4 flex-shrink-0 mt-0.5" />
                            <span>
                                <strong>Pro tip:</strong> Chrome only shares the selected tab's content.
                                Your coach tab stays completely invisible to other participants!
                            </span>
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-zinc-800">
                    <button
                        onClick={onClose}
                        className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors"
                    >
                        Got it!
                    </button>
                </div>
            </div>
        </div>
    )
}
