const { app, BrowserWindow, shell, ipcMain } = require('electron')
const { spawn } = require('child_process')
const path = require('path')
const { StealthManager } = require('./stealth')

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
    mainWindow.loadURL(startUrl)

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
        const serverPath = path.join(process.resourcesPath, 'app', 'server.js')
        console.log('Starting Next.js server from:', serverPath)

        nextServer = spawn('node', [serverPath], {
            cwd: path.join(process.resourcesPath, 'app'),
            env: { ...process.env, PORT: '3000', NODE_ENV: 'production' }
        })
    } else {
        console.log('In Development mode - waiting for localhost:3000')
    }

    if (nextServer) {
        nextServer.stdout.on('data', (data) => {
            console.log(`[Next.js]: ${data}`)
        })

        nextServer.stderr.on('data', (data) => {
            console.error(`[Next.js Error]: ${data}`)
        })
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

    // Audio source selection
    const { getAudioSources } = require('./audioSources')
    ipcMain.handle('audio:getSources', async () => {
        try {
            return await getAudioSources()
        } catch (error) {
            console.error('Failed to get audio sources:', error)
            return []
        }
    })

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
}

app.whenReady().then(() => {
    // 1. Setup IPC handlers
    setupIpcHandlers()

    // 2. Start Server (if needed)
    startNextServer()

    // 3. Create Window
    setTimeout(createWindow, 1000)

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
})

app.on('will-quit', () => {
    if (nextServer) {
        nextServer.kill()
    }
})
