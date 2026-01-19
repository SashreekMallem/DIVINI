const { desktopCapturer, systemPreferences } = require('electron')

/**
 * Get all available audio sources (windows, tabs, screens)
 * Returns actual running apps - no preset filtering
 */
async function getAudioSources() {
    try {
        // Check macOS screen recording permission
        if (process.platform === 'darwin') {
            const status = systemPreferences.getMediaAccessStatus('screen')
            if (status !== 'granted') {
                const granted = await systemPreferences.askForMediaAccess('screen')
                if (!granted) {
                    throw new Error('Screen recording permission denied')
                }
            }
        }

        // Get ALL window and screen sources
        const sources = await desktopCapturer.getSources({
            types: ['window', 'screen'],
            fetchWindowIcons: true,
            thumbnailSize: { width: 150, height: 150 }
        })

        console.log(`📱 Found ${sources.length} audio sources`)

        // Return ALL sources - let user choose
        // No filtering - show everything that's open
        return sources.map(source => ({
            id: source.id,
            name: source.name,
            thumbnail: source.thumbnail.toDataURL(),
            type: source.id.startsWith('screen:') ? 'screen' : 'window',
            appName: extractAppName(source.name)
        }))
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
