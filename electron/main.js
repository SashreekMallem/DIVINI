const { app, BrowserWindow, shell, ipcMain, globalShortcut } = require('electron')
const path = require('path')
const { StealthManager } = require('./stealth')
const { initMain } = require('electron-audio-loopback')

// Initialize loopback plugin BEFORE app is ready
initMain({
    forceCoreAudioTap: true, // Critical for stealth on macOS
    loopbackWithMute: false,
})

const APP_URL = process.env.DIVINI_APP_URL || 'https://divini.vercel.app'

let mainWindow
let stealthManager

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
        },
        titleBarStyle: 'hiddenInset',
        backgroundColor: '#09090b',
        show: false,
    })

    stealthManager = new StealthManager(mainWindow)

    // Allow the window to follow the user across all macOS Spaces / Virtual Desktops
    // This is critical for seeing windows that are in Full Screen mode
    mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })

    if (app.isPackaged) {
        console.log(`[App] Loading production URL: ${APP_URL}`)
        mainWindow.loadURL(APP_URL)
    } else {
        const startUrl = process.env.ELECTRON_START_URL || 'http://localhost:3000'
        console.log(`[App] Loading development URL: ${startUrl}`)
        mainWindow.loadURL(startUrl)
    }

    mainWindow.once('ready-to-show', () => {
        mainWindow.show()
    })

    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith('http')) {
            shell.openExternal(url)
            return { action: 'deny' }
        }
        return { action: 'allow' }
    })

    mainWindow.on('closed', () => {
        mainWindow = null
    })

    return mainWindow
}

function setupIpcHandlers() {
    ipcMain.handle('stealth:enable', () => {
        return stealthManager ? stealthManager.enableStealth() : { success: false, error: 'Not initialized' }
    })
    ipcMain.handle('stealth:disable', () => {
        return stealthManager ? stealthManager.disableStealth() : { success: false, error: 'Not initialized' }
    })
    ipcMain.handle('stealth:status', () => {
        return stealthManager ? stealthManager.getStatus() : { enabled: false }
    })
    ipcMain.handle('stealth:alwaysOnTop', (event, enabled) => {
        return stealthManager ? stealthManager.setAlwaysOnTop(enabled) : { success: false }
    })
    ipcMain.handle('stealth:manualHide', () => {
        return stealthManager ? stealthManager.manualHide() : { success: false }
    })
    ipcMain.handle('stealth:manualRestore', () => {
        return stealthManager ? stealthManager.manualRestore() : { success: false }
    })

    const { getAudioSources } = require('./audioSources')
    ipcMain.handle('audio:getSources', async () => {
        try {
            return await getAudioSources()
        } catch (error) {
            console.error('Failed to get audio sources:', error)
            return []
        }
    })

    const { captureMeetingWindow, setSelectedSource, getWindowList } = require('./screenshotCapture')

    ipcMain.handle('capture:setSource', (event, sourceId) => {
        setSelectedSource(sourceId)
        return { success: true }
    })

    ipcMain.handle('capture:smart', async () => {
        try {
            return await captureMeetingWindow(mainWindow)
        } catch (error) {
            console.error('Capture smart failed:', error)
            return { success: false, error: error.message }
        }
    })

    ipcMain.handle('capture:getWindows', async () => {
        try {
            return await getWindowList()
        } catch (error) {
            console.error('Failed to get window list:', error)
            return []
        }
    })
}

function registerGlobalShortcuts() {
    // Cmd/Ctrl+Shift+C = Capture coding problem
    const captureShortcut = process.platform === 'darwin' ? 'Command+Shift+C' : 'Ctrl+Shift+C'
    globalShortcut.register(captureShortcut, async () => {
        console.log('[Hotkey] Capture shortcut triggered')
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('trigger-capture')
            if (!mainWindow.isVisible()) {
                mainWindow.show()
                stealthManager.manualRestore()
            }
            mainWindow.focus()
        }
    })

    // Panic Hide Hotkey (Cmd+Shift+H)
    const panicHideShortcut = process.platform === 'darwin' ? 'Command+Shift+H' : 'Ctrl+Shift+H'
    globalShortcut.register(panicHideShortcut, () => {
        if (mainWindow && !mainWindow.isDestroyed() && stealthManager) {
            if (mainWindow.isVisible()) {
                stealthManager.manualHide()
            } else {
                stealthManager.manualRestore()
            }
        }
    })
}

app.whenReady().then(() => {
    if (process.platform === 'darwin' && app.dock) {
        app.dock.hide()
        console.log('[App] Dock icon hidden (background agent mode)')
    }

    setupIpcHandlers()
    registerGlobalShortcuts()
    createWindow()

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
})

app.on('will-quit', () => {
    globalShortcut.unregisterAll()
})
