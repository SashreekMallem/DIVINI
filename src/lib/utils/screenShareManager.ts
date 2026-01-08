/**
 * ScreenShareManager
 * 
 * Intercepts the browser's getDisplayMedia API to detect when screen sharing starts.
 * When sharing starts, it triggers a callback to hide the coaching UI.
 * When sharing ends, it triggers a callback to restore the UI.
 */

type StealthCallback = (isStealth: boolean) => void;

class ScreenShareManager {
    private originalGetDisplayMedia: ((options?: DisplayMediaStreamOptions) => Promise<MediaStream>) | null = null;
    private onStealthChange: StealthCallback | null = null;
    private isInitialized = false;

    constructor() {
        if (typeof window !== 'undefined' && navigator.mediaDevices) {
            this.originalGetDisplayMedia = navigator.mediaDevices.getDisplayMedia.bind(navigator.mediaDevices);
        }
    }

    /**
     * Mocks the getDisplayMedia API to intercept screen share events
     */
    public init(callback: StealthCallback) {
        if (this.isInitialized || !this.originalGetDisplayMedia) return;

        this.onStealthChange = callback;
        this.isInitialized = true;

        // Override the API
        navigator.mediaDevices.getDisplayMedia = async (options) => {
            try {
                // 1. Trigger Stealth Mode BEFORE user picks a screen
                // This is proactive, but safer. Or we can do it after specific stream start.
                // Actually, browsers only return the stream AFTER the user picks a screen.
                // So this logic runs after selection.

                if (!this.originalGetDisplayMedia) throw new Error('MediaDevices API not supported');

                const stream = await this.originalGetDisplayMedia(options);

                // 2. User picked a screen -> HIDE COACHING
                this.onStealthChange?.(true);
                console.log('🔒 Stealth Mode Activated: Screen sharing detected');

                // 3. Listen for "stop sharing" event
                stream.getTracks()[0].onended = () => {
                    this.onStealthChange?.(false);
                    console.log('🔓 Stealth Mode Deactivated: Screen sharing stopped');
                };

                return stream;
            } catch (err) {
                // User cancelled or error
                console.warn('Screen share cancelled or failed', err);
                throw err;
            }
        };

        console.log('🛡️ Stealth Mode Guard: Active');
    }

    /**
     * Restore original API behavior
     */
    public cleanup() {
        if (this.originalGetDisplayMedia && navigator.mediaDevices) {
            navigator.mediaDevices.getDisplayMedia = this.originalGetDisplayMedia;
        }
        this.isInitialized = false;
        this.onStealthChange = null;
    }
}

export const screenShareManager = new ScreenShareManager();
