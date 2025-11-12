/**
 * AutoSaveManager - Handles all auto-save functionality
 *
 * Responsibilities:
 * - Schedule debounced auto-save (2 second delay)
 * - Perform auto-save API calls
 * - Gather current content from components
 * - Update save status UI
 * - Trigger success animations
 * - Handle immediate saves (save button)
 */

class AutoSaveManager {
    /**
     * Constructor - Dependency Injection Pattern
     * @param {string} apiBaseUrl - Base URL for API calls
     * @param {ComponentManager} componentManager - For extracting component data
     * @param {Object} callbacks - Callback functions
     *   - callbacks.getSessionId() - Returns current session ID
     *   - callbacks.getSelectedNode() - Returns current selected node ID
     *   - callbacks.getDropZone() - Returns drop zone DOM element
     */
    constructor(apiBaseUrl, componentManager, callbacks) {
        this.apiBaseUrl = apiBaseUrl;
        this.componentManager = componentManager;
        this.callbacks = callbacks;

        // Internal state
        this.autoSaveTimeout = null;
        this.saveStatus = 'idle'; // idle, saving, saved, error
        this.lastSaved = null;
    }

    /**
     * Schedule auto-save with 2 second debounce
     * Called when components change (typing, adding, removing, reordering)
     */
    scheduleSave() {
        const sessionId = this.callbacks.getSessionId();
        if (!sessionId) return;

        // Clear existing timeout to reset the 2-second timer
        if (this.autoSaveTimeout) {
            clearTimeout(this.autoSaveTimeout);
        }

        // Schedule new auto-save after 2 seconds
        this.autoSaveTimeout = setTimeout(() => {
            this.performSave();
        }, 2000);
    }

    /**
     * Perform immediate save (for save button)
     * Cancels any pending auto-save and saves immediately
     */
    saveNow() {
        // Cancel pending auto-save
        if (this.autoSaveTimeout) {
            clearTimeout(this.autoSaveTimeout);
        }

        // Perform save immediately
        this.performSave();

        // Update node status to draft in sidebar
        const selectedNode = this.callbacks.getSelectedNode();
        const nodeItem = document.querySelector(`[data-node-id="${selectedNode}"]`);
        if (nodeItem) {
            const statusIndicator = nodeItem.querySelector('.node-status');
            if (statusIndicator) {
                statusIndicator.className = 'node-status draft';
            }
        }

        console.log('Manual save triggered for node:', selectedNode);
    }

    /**
     * Cancel any pending auto-save
     * Useful when switching nodes or cleanup
     */
    cancel() {
        if (this.autoSaveTimeout) {
            clearTimeout(this.autoSaveTimeout);
            this.autoSaveTimeout = null;
        }
    }

    /**
     * Perform the actual auto-save
     * - Gathers content from drop zone
     * - Calls API endpoint
     * - Updates UI status
     * - Handles errors
     */
    async performSave() {
        const sessionId = this.callbacks.getSessionId();
        const selectedNode = this.callbacks.getSelectedNode();

        // Guard: Don't save if no session or already saving
        if (!sessionId || this.saveStatus === 'saving') return;

        // Gather current content
        const content = this.gatherContent();
        if (!content) return;

        // Update status to saving
        this.saveStatus = 'saving';
        this.updateStatusUI();

        try {
            const response = await fetch(`${this.apiBaseUrl}/session/${sessionId}/nodes/${selectedNode}/auto-save`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(content)
            });

            const result = await response.json();

            if (result.status === 'saved') {
                this.saveStatus = 'saved';
                this.lastSaved = new Date();
                // Trigger checkmark animation for success feedback
                this.triggerCheckmark();
            } else {
                this.saveStatus = 'error';
            }
        } catch (e) {
            console.error('Auto-save failed:', e);
            this.saveStatus = 'error';
        }

        this.updateStatusUI();
    }

    /**
     * Gather current content from drop zone
     * Extracts all components and their data/styles
     * @returns {Object|null} - Content object or null if no components
     */
    gatherContent() {
        const dropZone = this.callbacks.getDropZone();
        const components = dropZone.querySelectorAll('.editor-component');

        if (components.length === 0) return null;

        // Extract all components using ComponentManager
        const componentSequence = [];
        components.forEach((component, index) => {
            const componentData = this.componentManager.extractData(component);
            const componentStyle = this.componentManager.extractStyle(component);

            componentSequence.push({
                type: componentData.type,
                order: index,
                parameters: componentData,
                confidence: 1.0, // User-created content has full confidence
                styling: componentStyle
            });
        });

        return {
            components: componentSequence,
            suggested_template: "text-heavy", // TODO: Get current template
            overall_confidence: 1.0
        };
    }

    /**
     * Update save status UI indicator
     * Shows saving/saved/error status in top-right corner
     */
    updateStatusUI() {
        // Add save status indicator if it doesn't exist
        let statusElement = document.getElementById('save-status');
        if (!statusElement) {
            statusElement = document.createElement('div');
            statusElement.id = 'save-status';
            statusElement.style.cssText = 'position: fixed; top: 10px; right: 10px; padding: 8px 12px; border-radius: 4px; font-size: 12px; z-index: 1000;';
            document.body.appendChild(statusElement);
        }

        switch (this.saveStatus) {
            case 'saving':
                statusElement.textContent = 'Saving...';
                statusElement.style.background = '#ffa500';
                statusElement.style.color = 'white';
                break;
            case 'saved':
                const timeAgo = this.lastSaved ? ` ${Math.round((Date.now() - this.lastSaved.getTime()) / 1000)}s ago` : '';
                statusElement.textContent = `Saved${timeAgo}`;
                statusElement.style.background = '#4caf50';
                statusElement.style.color = 'white';
                break;
            case 'error':
                statusElement.textContent = 'Save failed';
                statusElement.style.background = '#f44336';
                statusElement.style.color = 'white';
                break;
            default:
                statusElement.textContent = '';
                statusElement.style.background = 'transparent';
        }
    }

    /**
     * Trigger checkmark animation on chat button
     * Called after successful save
     */
    triggerCheckmark() {
        if (window.animatedChatButton && window.animatedChatButton.showCheckmark) {
            window.animatedChatButton.showCheckmark();
        }
    }

    /**
     * Trigger smile animation on chat button
     * Called after export or milestone operations
     */
    triggerSmile() {
        if (window.animatedChatButton && window.animatedChatButton.showSmile) {
            window.animatedChatButton.showSmile();
        }
    }
}

// Export to global namespace
if (typeof window !== 'undefined') {
    window.AutoSaveManager = AutoSaveManager;
}
