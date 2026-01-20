const { desktopCapturer, systemPreferences } = require('electron')

/**
 * Get all available audio sources (windows, tabs, screens)
 * Returns actual running apps - no preset filtering
 */
async function getAudioSources() {
    try {
        // Check macOS screen recording permission
        if (process.platform === 'darwin') {
            try {
                const status = systemPreferences.getMediaAccessStatus('screen')
                if (status !== 'granted') {
                    // Note: askForMediaAccess('screen') is deprecated/removed in some Electron versions
                    // We'll let desktopCapturer handle it natively
                    console.log('⚠️ Screen permission not granted, sources might be limited')
                }
            } catch (e) {
                console.warn('⚠️ Failed to check screen permission:', e)
            }
        }

        // Create the Universal Source first - this is what makes it "simple"
        // This ID 'system-loopback' acts as a flag for the UI to just use the native loopback
        const systemSource = {
            id: 'system-loopback',
            name: 'System Audio (All Speakers)',
            thumbnail: 'icon:speaker', // We can handle this in the UI
            type: 'system',
            appName: 'System'
        }

        // Create the Universal System Audio source
        const universalSystemAudioSource = {
            id: 'universal-system-audio',
            name: 'Universal System Audio',
            thumbnail: 'icon:speaker', // We can handle this in the UI
            type: 'system',
            appName: 'System'
        }

        // Get ALL window and screen sources
        // Note: On macOS Sonoma+, windows in other Spaces might not appear here
        // unless the app is set to visible on all workspaces (which we just did)
        const sources = await desktopCapturer.getSources({
            types: ['window', 'screen'],
            fetchWindowIcons: true,
            thumbnailSize: { width: 300, height: 300 } // Higher res for better thumbnails
        })

        console.log(`📱 Found ${sources.length} total sources (windows + screens)`)

        // Map real sources
        const mappedSources = sources.map(source => ({
            id: source.id,
            name: source.name,
            thumbnail: source.thumbnail.toDataURL(),
            type: source.id.startsWith('screen:') ? 'screen' : 'window',
            appName: extractAppName(source.name)
        }))

        // Return Universal + mapped sources
        return [systemSource, universalSystemAudioSource, ...mappedSources]
    } catch (error) {
        console.error('❌ Failed to get audio sources:', error)
        throw error
    }
}

/**
 * Extract app name from source name
 * e.g., "Google Chrome - Meet" -> "Chrome"
 */
function extractAppName(sourceName) {
    // Common patterns
    if (sourceName.includes('Google Chrome')) return 'Chrome'
    if (sourceName.includes('Brave')) return 'Brave'
    if (sourceName.includes('Microsoft Edge')) return 'Edge'
    if (sourceName.includes('Safari')) return 'Safari'
    if (sourceName.includes('Firefox')) return 'Firefox'
    if (sourceName.includes('Zoom')) return 'Zoom'
    if (sourceName.includes('Microsoft Teams')) return 'Teams'

    // Otherwise return first word
    return sourceName.split(' ')[0]
}

module.exports = { getAudioSources }
