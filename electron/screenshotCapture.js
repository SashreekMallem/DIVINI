/**
 * Screenshot Capture Module
 * 
 * Captures screenshots of specific windows for coding problem analysis.
 * Uses Electron's desktopCapturer to get high-quality window thumbnails.
 */

const { desktopCapturer } = require('electron')

// Store the currently selected audio source ID for window capture
let selectedSourceId = null

/**
 * Set the source ID to capture (from audio source selector)
 * @param {string} sourceId - The desktopCapturer source ID
 */
function setSelectedSource(sourceId) {
    selectedSourceId = sourceId
    console.log('[Screenshot] Selected source:', sourceId)
}

/**
 * Get the currently selected source ID
 * @returns {string|null}
 */
function getSelectedSource() {
    return selectedSourceId
}

/**
 * Capture a screenshot of a specific window by source ID
 * @param {string} sourceId - Optional override source ID
 * @returns {Promise<string|null>} Base64 PNG dataURL or null if not found
 */
async function captureWindow(sourceId = null) {
    const targetId = sourceId || selectedSourceId

    if (!targetId) {
        console.warn('[Screenshot] No source selected for capture')
        return null
    }

    try {
        console.log('[Screenshot] Capturing window:', targetId)

        // Get all window sources with high-quality thumbnails
        const sources = await desktopCapturer.getSources({
            types: ['window', 'screen'],
            thumbnailSize: { width: 1920, height: 1080 },
            fetchWindowIcons: false
        })

        // Find the target window
        const target = sources.find(s => s.id === targetId)

        if (!target) {
            console.warn('[Screenshot] Window not found:', targetId)
            // Fallback: try to find by partial ID match
            const fallback = sources.find(s => s.id.includes(targetId.split(':')[1]))
            if (fallback) {
                console.log('[Screenshot] Using fallback match:', fallback.name)
                return fallback.thumbnail.toDataURL()
            }
            return null
        }

        console.log('[Screenshot] Captured:', target.name)
        return target.thumbnail.toDataURL()

    } catch (error) {
        console.error('[Screenshot] Capture failed:', error)
        return null
    }
}

/**
 * Capture a screenshot of the entire screen
 * @returns {Promise<string|null>} Base64 PNG dataURL
 */
async function captureScreen() {
    try {
        const sources = await desktopCapturer.getSources({
            types: ['screen'],
            thumbnailSize: { width: 1920, height: 1080 }
        })

        if (sources.length === 0) {
            console.warn('[Screenshot] No screens found')
            return null
        }

        // Use primary screen (first one)
        const screen = sources[0]
        console.log('[Screenshot] Captured screen:', screen.name)
        return screen.thumbnail.toDataURL()

    } catch (error) {
        console.error('[Screenshot] Screen capture failed:', error)
        return null
    }
}

/**
 * Smart capture: Find and capture meeting/interview windows
 * Prioritizes: 
 * 1. Explicitly selected audio source (if any)
 * 2. Zoom, Meet, Teams, etc.
 * 3. Browser windows with coding problems
 * 4. Fallback to full screen (Critical for macOS Full Screen apps)
 * @returns {Promise<{image: string|null, windowName: string|null}>}
 */
async function captureMeetingWindow() {
    try {
        const sources = await desktopCapturer.getSources({
            types: ['window', 'screen'],
            thumbnailSize: { width: 1920, height: 1080 },
            fetchWindowIcons: false
        })

        // 1. Priority: Explicitly selected audio source
        if (selectedSourceId) {
            const selected = sources.find(s => s.id === selectedSourceId)
            if (selected) {
                console.log('[Screenshot] using selected source:', selected.name)
                return { image: selected.thumbnail.toDataURL(), windowName: selected.name }
            } else {
                console.warn('[Screenshot] Selected source not found (hidden/full-screen?). Trying fallback...')
            }
        }

        // Keywords to identify meeting/interview windows
        const meetingKeywords = [
            'zoom', 'meet.google', 'google meet', 'microsoft teams', 'teams',
            'webex', 'coderpad', 'hackerrank', 'leetcode', 'codesignal',
            'interviewing.io', 'coderbyte', 'codility'
        ]

        // Browser keywords
        const browserKeywords = ['chrome', 'firefox', 'safari', 'edge', 'brave', 'arc']

        const excludeKeywords = ['divini', 'electron', 'developer tools', 'devtools']

        // 2. First try: Find meeting app window
        for (const keyword of meetingKeywords) {
            const match = sources.find(s =>
                s.name.toLowerCase().includes(keyword) &&
                !excludeKeywords.some(ex => s.name.toLowerCase().includes(ex))
            )
            if (match) {
                console.log('[Screenshot] Found meeting window:', match.name)
                return { image: match.thumbnail.toDataURL(), windowName: match.name }
            }
        }

        // 3. Second try: Find browser window
        for (const browser of browserKeywords) {
            const match = sources.find(s =>
                s.name.toLowerCase().includes(browser) &&
                !excludeKeywords.some(ex => s.name.toLowerCase().includes(ex))
            )
            if (match) {
                console.log('[Screenshot] Found browser window:', match.name)
                return { image: match.thumbnail.toDataURL(), windowName: match.name }
            }
        }

        // 4. Critical Fallback: Capture PRIMARY SCREEN
        // This fixes the issue where full-screen apps on macOS (in a separate Space)
        // are not listed as windows, but ARE visible on the main screen.
        const screen = sources.find(s => s.id.startsWith('screen:'))
        if (screen) {
            console.log('[Screenshot] Window not found. Falling back to PRIMARY SCREEN:', screen.name)
            return { image: screen.thumbnail.toDataURL(), windowName: 'Active Screen (Fallback)' }
        }

        console.warn('[Screenshot] No suitable window or screen found')
        return { image: null, windowName: null }

    } catch (error) {
        console.error('[Screenshot] Smart capture failed:', error)
        return { image: null, windowName: null }
    }
}

/**
 * Get list of available windows for capture
 * @returns {Promise<Array>} List of window sources
 */
async function getWindowList() {
    try {
        const sources = await desktopCapturer.getSources({
            types: ['window'],
            thumbnailSize: { width: 150, height: 100 },
            fetchWindowIcons: true
        })

        return sources.map(s => ({
            id: s.id,
            name: s.name,
            thumbnail: s.thumbnail.toDataURL()
        }))

    } catch (error) {
        console.error('[Screenshot] Failed to get window list:', error)
        return []
    }
}

module.exports = {
    captureWindow,
    captureScreen,
    captureMeetingWindow,
    getWindowList,
    setSelectedSource,
    getSelectedSource
}
