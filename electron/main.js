const { app, BrowserWindow, shell, ipcMain, globalShortcut } = require('electron')
const { spawn } = require('child_process')
const path = require('path')
const { StealthManager } = require('./stealth')
const { initMain } = require('electron-audio-loopback')

// Initialize loopback plugin BEFORE app is ready
initMain({
    forceCoreAudioTap: true, // Critical for stealth on macOS
    loopbackWithMute: false,
})

let mainWindow
let nextServer
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
        titleBarStyle: 'hiddenInset', // macOS native feel
        backgroundColor: '#09090b', // Matches app dark theme
        show: false, // Don't show until ready
    })

    // Initialize stealth manager
    stealthManager = new StealthManager(mainWindow)

    // Load the Next.js app
    const startUrl = process.env.ELECTRON_START_URL || 'http://localhost:3000'

    // In production, wait for the server to be ready
    if (app.isPackaged) {
        console.log('[App] Waiting for server on port 3000...')
        const checkServer = setInterval(async () => {
            try {
                const response = await fetch('http://localhost:3000')
                if (response.ok) {
                    clearInterval(checkServer)
                    console.log('[App] Server ready, loading URL')
                    mainWindow.loadURL('http://localhost:3000')
                }
            } catch (e) {
                // Not ready yet
            }
        }, 500)
    } else {
        mainWindow.loadURL(startUrl)
    }

    mainWindow.once('ready-to-show', () => {
        mainWindow.show()
    })

    // Open external links in browser, not Electron
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

function startNextServer() {
    const isPackaged = app.isPackaged

    if (isPackaged) {
        // In production, use the Next.js standalone server
        // "extraResources" copies it directly to resources/standalone
        const standaloneDir = path.join(process.resourcesPath, 'standalone')
        const serverPath = path.join(standaloneDir, 'server.js')

        console.log('Starting Next.js standalone server from:', serverPath)

        // Fork the server process using Electron as Node.js
        nextServer = spawn(process.execPath, [serverPath], {
            cwd: standaloneDir,
            env: {
                ...process.env,
                PORT: '3000',
                HOSTNAME: 'localhost',
                NODE_ENV: 'production',
                ELECTRON_RUN_AS_NODE: '1'
            }
        })

        nextServer.stdout.on('data', (data) => {
            console.log(`[Next.js]: ${data}`)
        })

        nextServer.stderr.on('data', (data) => {
            console.error(`[Next.js Error]: ${data}`)
        })

        nextServer.on('error', (err) => {
            console.error('[Next.js] Failed to start server:', err)
        })
    } else {
        console.log('In Development mode - waiting for localhost:3000')
    }
}

// Setup IPC handlers for stealth mode
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

    // Manual hide/restore (for testing)
    ipcMain.handle('stealth:manualHide', () => {
        return stealthManager ? stealthManager.manualHide() : { success: false }
    })

    ipcMain.handle('stealth:manualRestore', () => {
        return stealthManager ? stealthManager.manualRestore() : { success: false }
    })

    // Audio source selection (legacy - still useful for source list)
    const { getAudioSources } = require('./audioSources')
    ipcMain.handle('audio:getSources', async () => {
        try {
            return await getAudioSources()
        } catch (error) {
            console.error('Failed to get audio sources:', error)
            return []
        }
    })

    // === STEALTH AUDIO INITIALIZATION ===
    // This allows getDisplayMedia to capture system audio without screen recording permission
    // on supported macOS versions.
    // The library automatically registers 'enable-loopback-audio' and 'disable-loopback-audio' handlers.

    // Window controls (for custom titlebar if needed)
    ipcMain.on('window:minimize', () => mainWindow?.minimize())
    ipcMain.on('window:maximize', () => {
        if (mainWindow?.isMaximized()) {
            mainWindow.unmaximize()
        } else {
            mainWindow?.maximize()
        }
    })
    ipcMain.on('window:close', () => mainWindow?.close())

    // === SCREENSHOT CAPTURE (Coding Question Feature) ===
    const { captureWindow, captureScreen, captureMeetingWindow, setSelectedSource, getWindowList } = require('./screenshotCapture')

    // Set the selected audio source for screenshot capture
    ipcMain.handle('capture:setSource', (event, sourceId) => {
        setSelectedSource(sourceId)
        return { success: true }
    })

    // Capture screenshot of selected window
    ipcMain.handle('capture:window', async () => {
        try {
            const screenshot = await captureWindow()
            return { success: true, image: screenshot }
        } catch (error) {
            console.error('Screenshot capture failed:', error)
            return { success: false, error: error.message }
        }
    })

    // Capture full screen
    ipcMain.handle('capture:screen', async () => {
        try {
            const screenshot = await captureScreen()
            return { success: true, image: screenshot }
        } catch (error) {
            console.error('Screen capture failed:', error)
            return { success: false, error: error.message }
        }
    })

    // Smart capture: Find meeting/browser window automatically
    ipcMain.handle('capture:smart', async () => {
        console.log('[IPC] capture:smart called - using captureMeetingWindow()')
        try {
            const result = await captureMeetingWindow()
            console.log('[IPC] Smart capture result:', { success: !!result.image, windowName: result.windowName })
            return { success: !!result.image, image: result.image, windowName: result.windowName }
        } catch (error) {
            console.error('[IPC] Smart capture failed:', error)
            return { success: false, error: error.message }
        }
    })

    // Get list of windows for manual selection
    ipcMain.handle('capture:getWindows', async () => {
        try {
            return await getWindowList()
        } catch (error) {
            console.error('Failed to get window list:', error)
            return []
        }
    })
}

// Register global hotkeys
function registerGlobalShortcuts() {
    // Cmd/Ctrl+Shift+C = Capture coding problem
    const captureShortcut = process.platform === 'darwin' ? 'Command+Shift+C' : 'Ctrl+Shift+C'

    const registered = globalShortcut.register(captureShortcut, async () => {
        console.log('[Hotkey] Capture shortcut triggered')

        if (mainWindow && !mainWindow.isDestroyed()) {
            // Notify renderer to trigger capture flow
            mainWindow.webContents.send('capture:hotkeyTriggered')
        }
    })

    if (registered) {
        console.log(`[Hotkey] Registered: ${captureShortcut}`)
    } else {
        console.warn(`[Hotkey] Failed to register: ${captureShortcut}`)
    }

    // Panic Hide Hotkey (Cmd+Shift+H) - Instantly toggle window visibility
    const panicHideShortcut = process.platform === 'darwin' ? 'Command+Shift+H' : 'Ctrl+Shift+H'
    const panicRegistered = globalShortcut.register(panicHideShortcut, () => {
        if (mainWindow && !mainWindow.isDestroyed() && stealthManager) {
            if (mainWindow.isVisible()) {
                stealthManager.manualHide()
                console.log('[Hotkey] Panic hide triggered - window hidden')
            } else {
                stealthManager.manualRestore()
                console.log('[Hotkey] Panic restore triggered - window visible')
            }
        }
    })

    if (panicRegistered) {
        console.log(`[Hotkey] Registered panic hide: ${panicHideShortcut}`)
    } else {
        console.warn(`[Hotkey] Failed to register panic hide: ${panicHideShortcut}`)
    }
}

app.whenReady().then(() => {
    // Hide dock icon on macOS (background agent app)
    if (process.platform === 'darwin' && app.dock) {
        app.dock.hide()
        console.log('[App] Dock icon hidden (background agent mode)')
    }

    // 1. Setup IPC handlers
    setupIpcHandlers()

    // 2. Register global shortcuts
    registerGlobalShortcuts()

    // 3. Start Server (if needed)
    startNextServer()

    //4. Create Window
    if (app.isPackaged) {
        // In production, wait for server to be ready before creating window
        waitForServerReady().then(() => {
            console.log('[App] Server is ready, creating window...')
            createWindow()
        })
    } else {
        // In development, Next.js dev server is already running
        setTimeout(createWindow, 1000)
    }

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

// Wait for Next.js server to be ready
async function waitForServerReady() {
    const maxRetries = 30 // 30 seconds max wait
    const retryDelay = 1000 // 1 second between retries

    for (let i = 0; i < maxRetries; i++) {
        try {
            const http = require('http')
            await new Promise((resolve, reject) => {
                const req = http.get('http://localhost:3000', (res) => {
                    if (res.statusCode === 200 || res.statusCode === 404) {
                        resolve()
                    } else {
                        reject(new Error(`Server returned ${res.statusCode}`))
                    }
                })
                req.on('error', reject)
                req.setTimeout(500)
            })
            console.log(`[App] Server responded after ${i + 1} attempts`)
            return // Server is ready
        } catch (err) {
            if (i < maxRetries - 1) {
                await new Promise(resolve => setTimeout(resolve, retryDelay))
            }
        }
    }
    console.warn('[App] Server did not respond, creating window anyway...')
}

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
})

app.on('will-quit', () => {
    // Unregister all shortcuts
    globalShortcut.unregisterAll()

    if (nextServer) {
        nextServer.kill()
    }
})
