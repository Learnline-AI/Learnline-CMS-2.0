/**
 * StateManager - Centralized state management for TemplateEditorCMS
 *
 * Manages application state including:
 * - Visual network transform (zoom/pan)
 * - Pan operation state
 * - Keyboard modifier state
 * - UI panel state
 */

class StateManager {
    constructor(config = {}) {
        // State categories
        this.state = {
            // Transform state (zoom/pan)
            transform: {
                scale: 1,
                panX: 0,
                panY: 0,
                minScale: 0.25,
                maxScale: 3,
                scaleStep: 0.2,
                wheelScaleStep: 0.04
            },

            // Pan operation state
            pan: {
                isPanning: false,
                lastX: 0,
                lastY: 0
            },

            // Keyboard modifier state
            keyboard: {
                space: false,
                alt: false
            },

            // UI panel state
            ui: {
                chatPanelOpen: false
            }
        };

        // Callbacks for state changes
        this.callbacks = {
            onTransformChange: config.callbacks?.onTransformChange || null,
            onChatPanelChange: config.callbacks?.onChatPanelChange || null
        };

        // Restore persisted state
        this.restorePersistedState();
    }

    // ==================== TRANSFORM STATE GETTERS ====================

    /**
     * Get current zoom scale
     * @returns {number} Current scale (0.25 to 3.0)
     */
    getVisualScale() {
        return this.state.transform.scale;
    }

    /**
     * Get current pan offset
     * @returns {{x: number, y: number}} Pan offset in pixels
     */
    getPanOffset() {
        return {
            x: this.state.transform.panX,
            y: this.state.transform.panY
        };
    }

    /**
     * Get complete transform state
     * @returns {{scale: number, panX: number, panY: number}} Transform state
     */
    getTransform() {
        return {
            scale: this.state.transform.scale,
            panX: this.state.transform.panX,
            panY: this.state.transform.panY
        };
    }

    /**
     * Get scale bounds
     * @returns {{min: number, max: number}} Scale bounds
     */
    getScaleBounds() {
        return {
            min: this.state.transform.minScale,
            max: this.state.transform.maxScale
        };
    }

    /**
     * Get scale step values
     * @returns {{button: number, wheel: number}} Scale step sizes
     */
    getScaleSteps() {
        return {
            button: this.state.transform.scaleStep,
            wheel: this.state.transform.wheelScaleStep
        };
    }

    // ==================== TRANSFORM STATE SETTERS ====================

    /**
     * Set zoom scale
     * @param {number} scale - New scale value
     */
    setZoom(scale) {
        const bounded = Math.max(
            this.state.transform.minScale,
            Math.min(scale, this.state.transform.maxScale)
        );
        this.state.transform.scale = bounded;
        this.notifyTransformChange();
    }

    /**
     * Set pan offset
     * @param {number} x - X offset in pixels
     * @param {number} y - Y offset in pixels
     */
    setPan(x, y) {
        this.state.transform.panX = x;
        this.state.transform.panY = y;
        this.notifyTransformChange();
    }

    /**
     * Set complete transform state atomically
     * @param {number} scale - Scale value
     * @param {number} panX - X offset
     * @param {number} panY - Y offset
     */
    setTransform(scale, panX, panY) {
        const bounded = Math.max(
            this.state.transform.minScale,
            Math.min(scale, this.state.transform.maxScale)
        );
        this.state.transform.scale = bounded;
        this.state.transform.panX = panX;
        this.state.transform.panY = panY;
        this.notifyTransformChange();
    }

    /**
     * Reset transform to defaults
     */
    resetTransform() {
        this.setTransform(1, 0, 0);
    }

    /**
     * Zoom in by button step
     */
    zoomIn() {
        const newScale = this.state.transform.scale + this.state.transform.scaleStep;
        this.setZoom(newScale);
    }

    /**
     * Zoom out by button step
     */
    zoomOut() {
        const newScale = this.state.transform.scale - this.state.transform.scaleStep;
        this.setZoom(newScale);
    }

    /**
     * Zoom by wheel step
     * @param {number} direction - 1 for zoom in, -1 for zoom out
     */
    zoomWheel(direction) {
        const delta = direction * this.state.transform.wheelScaleStep;
        const newScale = this.state.transform.scale + delta;
        this.setZoom(newScale);
    }

    // ==================== PAN STATE GETTERS ====================

    /**
     * Check if currently panning
     * @returns {boolean} True if pan gesture is active
     */
    isPanning() {
        return this.state.pan.isPanning;
    }

    /**
     * Get last pan position
     * @returns {{x: number, y: number}} Last mouse position
     */
    getLastPanPosition() {
        return {
            x: this.state.pan.lastX,
            y: this.state.pan.lastY
        };
    }

    // ==================== PAN STATE SETTERS ====================

    /**
     * Start pan gesture
     * @param {number} x - Initial mouse X
     * @param {number} y - Initial mouse Y
     */
    startPan(x, y) {
        this.state.pan.isPanning = true;
        this.state.pan.lastX = x;
        this.state.pan.lastY = y;
    }

    /**
     * Update pan during drag
     * @param {number} mouseX - Current mouse X
     * @param {number} mouseY - Current mouse Y
     */
    updatePan(mouseX, mouseY) {
        if (!this.state.pan.isPanning) return;

        const deltaX = mouseX - this.state.pan.lastX;
        const deltaY = mouseY - this.state.pan.lastY;

        this.state.transform.panX += deltaX;
        this.state.transform.panY += deltaY;

        this.state.pan.lastX = mouseX;
        this.state.pan.lastY = mouseY;

        this.notifyTransformChange();
    }

    /**
     * End pan gesture
     */
    endPan() {
        this.state.pan.isPanning = false;
    }

    // ==================== KEYBOARD STATE ====================

    /**
     * Check if a key is pressed
     * @param {string} key - Key name ('space' or 'alt')
     * @returns {boolean} True if key is pressed
     */
    isKeyPressed(key) {
        return this.state.keyboard[key] || false;
    }

    /**
     * Set keyboard key state
     * @param {string} key - Key name ('space' or 'alt')
     * @param {boolean} pressed - True if pressed, false if released
     */
    setKeyState(key, pressed) {
        if (this.state.keyboard.hasOwnProperty(key)) {
            this.state.keyboard[key] = pressed;
        }
    }

    /**
     * Reset all keyboard state (useful on window blur)
     */
    resetKeyboardState() {
        this.state.keyboard.space = false;
        this.state.keyboard.alt = false;
    }

    // ==================== UI STATE ====================

    /**
     * Check if chat panel is open
     * @returns {boolean} True if chat panel is open
     */
    isChatOpen() {
        return this.state.ui.chatPanelOpen;
    }

    /**
     * Toggle chat panel state
     * @returns {boolean} New state (true if now open)
     */
    toggleChatPanel() {
        this.state.ui.chatPanelOpen = !this.state.ui.chatPanelOpen;
        this.saveChatPanelState();
        this.notifyChatPanelChange();
        return this.state.ui.chatPanelOpen;
    }

    /**
     * Set chat panel state explicitly
     * @param {boolean} isOpen - True to open, false to close
     */
    setChatPanelOpen(isOpen) {
        this.state.ui.chatPanelOpen = isOpen;
        this.saveChatPanelState();
        this.notifyChatPanelChange();
    }

    // ==================== PERSISTENCE ====================

    /**
     * Save chat panel state to localStorage
     */
    saveChatPanelState() {
        try {
            localStorage.setItem('chatPanelOpen', this.state.ui.chatPanelOpen);
        } catch (error) {
            console.error('Failed to save chat panel state:', error);
        }
    }

    /**
     * Restore persisted state from localStorage
     */
    restorePersistedState() {
        try {
            const chatPanelState = localStorage.getItem('chatPanelOpen');
            if (chatPanelState === 'true') {
                this.state.ui.chatPanelOpen = true;
            }
        } catch (error) {
            console.error('Failed to restore persisted state:', error);
        }
    }

    // ==================== CALLBACKS ====================

    /**
     * Notify transform change callback
     * @private
     */
    notifyTransformChange() {
        if (this.callbacks.onTransformChange) {
            this.callbacks.onTransformChange();
        }
    }

    /**
     * Notify chat panel change callback
     * @private
     */
    notifyChatPanelChange() {
        if (this.callbacks.onChatPanelChange) {
            this.callbacks.onChatPanelChange(this.state.ui.chatPanelOpen);
        }
    }
}

// Export for ES6 modules or make available globally
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StateManager;
}
