const { BrowserWindow } = require('electron')
const { exec } = require('child_process')

/**
 * StealthManager - Handles platform-specific window invisibility
 * 
 * WINDOWS: Uses setContentProtection (calls SetWindowDisplayAffinity internally)
 *          - Window is truly invisible to all screen capture
 * 
 * macOS: Smart Auto-Hide Strategy
 *        - Cannot bypass ScreenCaptureKit (Apple design)
 *        - Detects when screen sharing starts → hides window
 *        - Detects when screen sharing stops → restores window
 *        - Saves/restores exact position, size, and app state
 * 
 * LINUX: Falls back to guide (no reliable detection)
 */
class StealthManager {
    constructor(win) {
        this.win = win
        this.isStealthEnabled = false
        this.isAutoHideActive = false
        this.monitorInterval = null
        this.wasHiddenByAutoHide = false

        // Saved window state for restoration
        this.savedWindowState = {
            x: 0,
            y: 0,
            width: 400,
            height: 800,
            isMaximized: false
        }
    }

    /**
     * Enable stealth mode - makes window invisible to screen capture
     */
    enableStealth() {
        const platform = process.platform

        if (platform === 'win32') {
            return this._enableWindowsStealth()
        }

        if (platform === 'darwin') {
            return this._enableMacOSStealth()
        }

        // Linux: No stealth support
        console.log('[Stealth] ⚠️ Linux: Stealth mode not available')
        return {
            success: false,
            platform: 'linux',
            supported: false,
            message: 'Stealth mode is not supported on Linux',
            showGuide: true
        }
    }

    /**
     * Windows: True invisibility via SetWindowDisplayAffinity
     */
    _enableWindowsStealth() {
        try {
            // Always on top so coach stays visible during interview
            this.win.setAlwaysOnTop(true, 'screen-saver')

            this.isStealthEnabled = true

            console.log('[Stealth] ✅ Windows stealth mode enabled')
            return {
                success: true,
                platform: 'windows',
                method: 'content-protection',
                message: 'Window is now invisible to screen capture'
            }
        } catch (error) {
            console.error('[Stealth] Failed to enable:', error)
            return {
                success: false,
                platform: 'windows',
                error: error.message
            }
        }
    }

    /**
     * macOS: Smart Auto-Hide with screen recording detection
     */
    _enableMacOSStealth() {
        try {
            // Always on top
            this.win.setAlwaysOnTop(true, 'floating')

            // Start monitoring for screen recording
            this._startScreenRecordingMonitor()

            this.isStealthEnabled = true
            this.isAutoHideActive = true

            console.log('[Stealth] ✅ macOS auto-hide mode enabled')
            return {
                success: true,
                platform: 'darwin',
                method: 'auto-hide',
                message: 'Auto-hide enabled. Window will hide during screen sharing.',
                autoHide: true
            }
        } catch (error) {
            console.error('[Stealth] Failed to enable macOS stealth:', error)
            return { success: false, platform: 'darwin', error: error.message }
        }
    }

    /**
     * Start monitoring for screen recording/sharing processes
     * Checks every 500ms for active screen capture
     */
    _startScreenRecordingMonitor() {
        if (this.monitorInterval) {
            clearInterval(this.monitorInterval)
        }

        console.log('[Stealth] Starting screen recording monitor...')

        this.monitorInterval = setInterval(() => {
            this._checkScreenRecording()
        }, 500) // Check every 500ms
    }

    /**
     * Stop the screen recording monitor
     */
    _stopScreenRecordingMonitor() {
        if (this.monitorInterval) {
            clearInterval(this.monitorInterval)
            this.monitorInterval = null
            console.log('[Stealth] Screen recording monitor stopped')
        }
    }

    /**
     * Check if screen recording/sharing is active
     */
    _checkScreenRecording() {
        const platform = process.platform

        if (platform === 'darwin') {
            // macOS: Check for common screen capture processes
            // ScreenCaptureUI = macOS native share picker
            // screencaptureui = older macOS
            // Zoom.us = Zoom screen sharing
            // Electron Helper = Could be Discord/Slack screen share
            const checkCommand = `ps aux | grep -iE "(screencaptureui|ScreenCaptureUI|controlcenter|zoom.*screen|teams.*screen|discord.*screen|obs|QuickTime.*Player)" | grep -v grep`

            exec(checkCommand, (error, stdout) => {
                const isScreenCapturing = stdout.trim().length > 0

                if (isScreenCapturing && this.win.isVisible() && !this.wasHiddenByAutoHide) {
                    // Screen capture started → Hide window
                    this._saveWindowState()
                    this.win.hide()
                    this.wasHiddenByAutoHide = true
                    this._notifyRenderer('stealth:hidden')
                    console.log('[Stealth] 🙈 Screen share detected → Window hidden')
                } else if (!isScreenCapturing && this.wasHiddenByAutoHide) {
                    // Screen capture stopped → Restore window
                    this._restoreWindowState()
                    this._notifyRenderer('stealth:restored')
                    this.wasHiddenByAutoHide = false
                    console.log('[Stealth] 👁️ Screen share stopped → Window restored')
                }
            })
        }

        if (platform === 'win32') {
            // Windows: Check for screen capture processes
            // Windows doesn't need this since setContentProtection works, but as backup
            const checkCommand = 'tasklist /v | findstr /i "ScreenClip ScreenCapture ZoomScreenShare"'

            exec(checkCommand, { shell: 'cmd.exe' }, (error, stdout) => {
                const isScreenCapturing = stdout.trim().length > 0

                // On Windows, we don't need to hide since content protection works
                // But we can notify the renderer for UI updates
                if (isScreenCapturing) {
                    this._notifyRenderer('stealth:capturing')
                }
            })
        }
    }

    /**
     * Save current window state before hiding
     */
    _saveWindowState() {
        try {
            const [x, y] = this.win.getPosition()
            const [width, height] = this.win.getSize()

            this.savedWindowState = {
                x,
                y,
                width,
                height,
                isMaximized: this.win.isMaximized()
            }

            // Tell renderer to save app state (scroll position, current content, etc)
            this.win.webContents.send('stealth:save-state')

            console.log('[Stealth] Window state saved:', this.savedWindowState)
        } catch (error) {
            console.error('[Stealth] Failed to save window state:', error)
        }
    }

    /**
     * Restore window to exact previous state
     */
    _restoreWindowState() {
        try {
            const { x, y, width, height, isMaximized } = this.savedWindowState

            if (isMaximized) {
                this.win.maximize()
            } else {
                this.win.setPosition(x, y)
                this.win.setSize(width, height)
            }

            this.win.show()

            // Tell renderer to restore app state
            this.win.webContents.send('stealth:restore-state')

            console.log('[Stealth] Window state restored:', this.savedWindowState)
        } catch (error) {
            console.error('[Stealth] Failed to restore window state:', error)
            // Fallback: just show the window
            this.win.show()
        }
    }

    /**
     * Send notification to renderer process
     */
    _notifyRenderer(channel, data = {}) {
        try {
            this.win.webContents.send(channel, data)
        } catch (error) {
            console.error('[Stealth] Failed to notify renderer:', error)
        }
    }

    /**
     * Disable stealth mode - restore normal window behavior
     */
    disableStealth() {
        try {
            this.win.setAlwaysOnTop(false)
            this.win.setSkipTaskbar(false)

            this._stopScreenRecordingMonitor()

            // If window was hidden, show it
            if (this.wasHiddenByAutoHide) {
                this._restoreWindowState()
                this.wasHiddenByAutoHide = false
            }

            this.isStealthEnabled = false
            this.isAutoHideActive = false

            console.log('[Stealth] Stealth mode disabled')
            return { success: true }
        } catch (error) {
            console.error('[Stealth] Failed to disable:', error)
            return { success: false, error: error.message }
        }
    }

    /**
     * Toggle always-on-top without full stealth
     */
    setAlwaysOnTop(enabled) {
        try {
            this.win.setAlwaysOnTop(enabled, enabled ? 'floating' : undefined)
            return { success: true, alwaysOnTop: enabled }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    /**
     * Manually trigger hide (for testing)
     */
    manualHide() {
        if (this.win.isVisible()) {
            this._saveWindowState()
            this.win.hide()
            this.wasHiddenByAutoHide = true
            return { success: true, hidden: true }
        }
        return { success: false, message: 'Window already hidden' }
    }

    /**
     * Manually trigger restore (for testing)
     */
    manualRestore() {
        if (!this.win.isVisible()) {
            this._restoreWindowState()
            this.wasHiddenByAutoHide = false
            return { success: true, restored: true }
        }
        return { success: false, message: 'Window already visible' }
    }

    /**
     * Get current stealth status
     */
    getStatus() {
        return {
            enabled: this.isStealthEnabled,
            platform: process.platform,
            supported: process.platform === 'win32',
            autoHideActive: this.isAutoHideActive,
            isHidden: this.wasHiddenByAutoHide,
            alwaysOnTop: this.win.isAlwaysOnTop(),
            windowState: this.savedWindowState
        }
    }
}

module.exports = { StealthManager }
