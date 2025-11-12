/**
 * MemoryTrickComponent - Memory trick/mnemonic component
 *
 * Single text input for mnemonics and memory aids.
 * Displayed with lightbulb emoji and special styling.
 */

class MemoryTrickComponent extends BaseComponent {
    /**
     * Create the editor form element
     * @param {Object} data - Optional initial data {text: "..."}
     * @returns {HTMLElement} - Editor component DOM element
     */
    createElement(data = {}) {
        const div = document.createElement('div');
        div.className = 'editor-component';
        div.dataset.componentType = 'memory-trick';

        div.innerHTML = `
            <div class="component-header">
                <h4>Memory Trick</h4>
                <button class="remove-component">×</button>
            </div>
            <div contenteditable="true" data-placeholder="Memory trick or mnemonic..." class="component-input component-textarea"></div>
        `;

        // Bind remove button
        const removeBtn = div.querySelector('.remove-component');
        removeBtn.addEventListener('click', () => {
            if (this.cms && typeof this.cms.removeComponent === 'function') {
                this.cms.removeComponent(div);
            }
        });

        // Bind input events for real-time preview and auto-save
        const input = div.querySelector('.component-input');
        input.addEventListener('input', () => {
            this.updatePreview();
            this.scheduleAutoSave();
        });

        // Populate with initial data if provided
        if (data && data.text) {
            input.innerHTML = data.text;
        }

        return div;
    }

    /**
     * Populate component inputs with data (from database or AI)
     * @param {HTMLElement} element - The editor component element
     * @param {Object} data - Data to populate {text: "..."}
     */
    populateInputs(element, data) {
        if (data.text) {
            const input = element.querySelector('.component-input');
            if (input) {
                input.innerHTML = data.text;
            }
        }
    }

    /**
     * Generate preview HTML
     * @param {HTMLElement} element - The editor component element
     * @returns {string} - HTML string for preview
     */
    generatePreview(element) {
        const input = element.querySelector('.component-input');
        const trickText = input ? input.innerHTML : 'Memory trick';

        // Extract component background style (from color picker)
        const componentStyle = this.extractComponentStyle(element);

        // Format text with bold/italic/colors
        const formattedText = CMSUtils.formatTextForPreview(trickText);

        return `<div class="preview-memory-trick" style="${componentStyle}">💡 ${formattedText}</div>`;
    }

    /**
     * Extract data for saving
     * @param {HTMLElement} element - The editor component element
     * @returns {Object} - Component data {text: "..."}
     */
    extractData(element) {
        const input = element.querySelector('.component-input');
        return {
            text: input ? input.innerHTML : ''
        };
    }

    /**
     * Render component for student view
     * @param {Object} data - Component data {text: "..."}
     * @returns {string} - HTML string for student view
     */
    renderStudent(data) {
        const text = data.text || 'Memory trick';
        return `<div class="student-memory-trick">${text}</div>`;
    }

    /**
     * Helper: Extract component background style
     * (Copied from app.js extractComponentStyle method)
     */
    extractComponentStyle(component) {
        const bgColor = component.style.backgroundColor;
        return bgColor ? `background-color: ${bgColor};` : '';
    }
}

// Export to global namespace
if (typeof window !== 'undefined') {
    window.MemoryTrickComponent = MemoryTrickComponent;
}
