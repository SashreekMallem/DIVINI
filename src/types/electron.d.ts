// Global Electron API types
export { }

declare global {
    interface Window {
        electron?: {
            // Stealth Mode
            stealth: {
                enable: () => Promise<{ success: boolean; showGuide?: boolean }>
                disable: () => Promise<{ success: boolean }>
                getStatus: () => Promise<{ enabled: boolean; platform: string }>
                setAlwaysOnTop: (enabled: boolean) => Promise<void>
                manualHide: () => Promise<{ success: boolean }>
                manualRestore: () => Promise<{ success: boolean }>
                onHidden: (callback: () => void) => void
                onRestored: (callback: () => void) => void
                onSaveState: (callback: (event: any, data: any) => void) => void
                onRestoreState: (callback: (event: any, data: any) => void) => void
                removeListeners: () => void
            }

            // Audio Source Selection
            getAudioSources: () => Promise<AudioSource[]>

            // Platform
            platform: 'darwin' | 'win32' | 'linux'
            isElectron: true

            // Window controls
            window: {
                minimize: () => void
                maximize: () => void
                close: () => void
            }
        }
    }
}

export interface AudioSource {
    id: string
    name: string
    thumbnail: string // Base64 data URL
    type: 'screen' | 'window'
    appName: string
}
