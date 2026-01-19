/**
 * ScreenShareManager
 * 
 * Intercepts the browser's getDisplayMedia API and Electron's IPC events
 * to detect when screen sharing starts and manage the "Stealth Mode" UI.
 * 
 * In Electron (macOS):
 * Handles hardware-level detection via process monitoring in the main process.
 */

type StealthCallback = (isStealth: boolean) => void;
type StateCallback = (data: any) => void;

class ScreenShareManager {
    private originalGetDisplayMedia: ((options?: DisplayMediaStreamOptions) => Promise<MediaStream>) | null = null;
    private onStealthChange: StealthCallback | null = null;
    private onSaveState: StateCallback | null = null;
    private onRestoreState: StateCallback | null = null;
    private isInitialized = false;

    constructor() {
        if (typeof window !== 'undefined' && navigator.mediaDevices) {
            this.originalGetDisplayMedia = navigator.mediaDevices.getDisplayMedia.bind(navigator.mediaDevices);
        }
    }

    /**
     * Initialize the manager with callbacks for UI state changes
     */
    public init(
        onStealthChange: StealthCallback,
        onSaveState?: StateCallback,
        onRestoreState?: StateCallback
    ) {
        if (this.isInitialized) return;

        this.onStealthChange = onStealthChange;
        this.onSaveState = onSaveState;
        this.onRestoreState = onRestoreState;
        this.isInitialized = true;

        // 1. Browser-based interception (Standard Web / Fallback)
        if (this.originalGetDisplayMedia) {
            navigator.mediaDevices.getDisplayMedia = async (options) => {
                try {
                    if (!this.originalGetDisplayMedia) throw new Error('MediaDevices API not supported');
                    const stream = await this.originalGetDisplayMedia(options);

                    // User started sharing -> Activate Stealth
                    this.onStealthChange?.(true);
                    console.log('🔒 Stealth Mode Activated: Screen sharing detected');

                    stream.getTracks()[0].onended = () => {
                        this.onStealthChange?.(false);
                        console.log('🔓 Stealth Mode Deactivated: Screen sharing stopped');
                    };

                    return stream;
                } catch (err) {
                    console.warn('Screen share cancelled or failed', err);
                    throw err;
                }
            };
        }

        // 2. Electron-based hardware detection (Smart Auto-Hide)
        if (typeof window !== 'undefined' && (window as any).electron) {
            const electron = (window as any).electron;

            // Listen for window hidden (auto-hide triggered)
            electron.stealth.onHidden(() => {
                this.onStealthChange?.(true);
                console.log('[Electron] 🙈 Window hidden by auto-hide');
            });

            // Listen for window restored
            electron.stealth.onRestored(() => {
                this.onStealthChange?.(false);
                console.log('[Electron] 👁️ Window restored');
            });

            // Listen for state save request (just before hide)
            electron.stealth.onSaveState(() => {
                if (this.onSaveState) {
                    const state = this.onSaveState(null);
                    localStorage.setItem('divini-stealth-state', JSON.stringify(state));
                    console.log('[Electron] ✅ App state saved to localStorage');
                }
            });

            // Listen for state restore request (just after show)
            electron.stealth.onRestoreState(() => {
                const saved = localStorage.getItem('divini-stealth-state');
                if (saved && this.onRestoreState) {
                    this.onRestoreState(JSON.parse(saved));
                    console.log('[Electron] ✅ App state restored from localStorage');
                }
            });

            console.log('🛡️ Stealth Mode (Electron): Enabled with state preservation');
        }

        console.log('🛡️ Stealth Mode Manager: Initialized');
    }

    /**
     * Manual Stealth Toggle (e.g. for Windows content protection)
     */
    public async setStealth(enabled: boolean) {
        if (typeof window !== 'undefined' && (window as any).electron) {
            const electron = (window as any).electron;
            if (enabled) {
                return await electron.stealth.enable();
            } else {
                return await electron.stealth.disable();
            }
        }
        this.onStealthChange?.(enabled);
        return { success: true };
    }

    /**
     * Restore original API behavior
     */
    public cleanup() {
        if (this.originalGetDisplayMedia && navigator.mediaDevices) {
            navigator.mediaDevices.getDisplayMedia = this.originalGetDisplayMedia;
        }

        if (typeof window !== 'undefined' && (window as any).electron) {
            (window as any).electron.stealth.removeListeners();
        }

        this.isInitialized = false;
        this.onStealthChange = null;
        this.onSaveState = null;
        this.onRestoreState = null;
    }
}

export const screenShareManager = new ScreenShareManager();
