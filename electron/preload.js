const { contextBridge, ipcRenderer } = require('electron')

/**
 * Preload script - Exposes safe Electron APIs to the renderer process
 * 
 * Security: contextBridge ensures the renderer can only access
 * the specific methods we expose, not full Node.js capabilities
 */

contextBridge.exposeInMainWorld('electron', {
    // Stealth Mode API
    stealth: {
        enable: () => ipcRenderer.invoke('stealth:enable'),
        disable: () => ipcRenderer.invoke('stealth:disable'),
        getStatus: () => ipcRenderer.invoke('stealth:status'),
        setAlwaysOnTop: (enabled) => ipcRenderer.invoke('stealth:alwaysOnTop', enabled),
        manualHide: () => ipcRenderer.invoke('stealth:manualHide'),
        manualRestore: () => ipcRenderer.invoke('stealth:manualRestore'),

        // Event listeners for auto-hide (macOS)
        onHidden: (callback) => ipcRenderer.on('stealth:hidden', callback),
        onRestored: (callback) => ipcRenderer.on('stealth:restored', callback),
        onSaveState: (callback) => ipcRenderer.on('stealth:save-state', callback),
        onRestoreState: (callback) => ipcRenderer.on('stealth:restore-state', callback),
        removeListeners: () => {
            ipcRenderer.removeAllListeners('stealth:hidden')
            ipcRenderer.removeAllListeners('stealth:restored')
            ipcRenderer.removeAllListeners('stealth:save-state')
            ipcRenderer.removeAllListeners('stealth:restore-state')
        }
    },

    // Audio source selection (legacy - for dropdown UI)
    getAudioSources: () => ipcRenderer.invoke('audio:getSources'),

    // === STEALTH AUDIO API (Invisible System Audio Capture) ===
    // This uses the native handlers registered by electron-audio-loopback
    stealthAudio: {
        enable: () => ipcRenderer.invoke('enable-loopback-audio'),
        disable: () => ipcRenderer.invoke('disable-loopback-audio'),
    },

    // Platform detection
    platform: process.platform,

    // App info
    isElectron: true,

    // Window controls (for custom titlebar if needed)
    window: {
        minimize: () => ipcRenderer.send('window:minimize'),
        maximize: () => ipcRenderer.send('window:maximize'),
        close: () => ipcRenderer.send('window:close'),
    }
})

// Log that preload executed successfully
console.log('[Preload] Electron APIs exposed to renderer')
