/**
 * CalloutBoxComponent - Callout box component
 *
 * Text input + style dropdown for highlighted information boxes.
 * Supports 4 styles: info, tip, warning, important.
 */

class CalloutBoxComponent extends BaseComponent {
    /**
     * Create the editor form element
     * @param {Object} data - Optional initial data {text: "...", style: "info"}
     * @returns {HTMLElement} - Editor component DOM element
     */
    createElement(data = {}) {
        const div = document.createElement('div');
        div.className = 'editor-component';
        div.dataset.componentType = 'callout-box';

        div.innerHTML = `
            <div class="component-header">
                <h4>Callout Box</h4>
                <button class="remove-component">×</button>
            </div>
            <select class="callout-type component-select">
                <option value="info">Info</option>
                <option value="tip">Tip</option>
                <option value="warning">Warning</option>
                <option value="important">Important</option>
            </select>
            <div contenteditable="true" data-placeholder="Enter callout text..." class="component-input component-textarea"></div>
        `;

        // Bind remove button
        const removeBtn = div.querySelector('.remove-component');
        removeBtn.addEventListener('click', () => {
            if (this.cms && typeof this.cms.removeComponent === 'function') {
                this.cms.removeComponent(div);
            }
        });

        // Bind change event to dropdown (NOT input event)
        const dropdown = div.querySelector('.callout-type');
        dropdown.addEventListener('change', () => {
            this.updatePreview();
            this.scheduleAutoSave();
        });

        // Bind input event to text input
        const textInput = div.querySelector('.component-input');
        textInput.addEventListener('input', () => {
            this.updatePreview();
            this.scheduleAutoSave();
        });

        // Populate with initial data if provided
        if (data) {
            if (data.style) dropdown.value = data.style;
            if (data.text) textInput.innerHTML = data.text;
        }

        return div;
    }

    /**
     * Populate component inputs with data (from database or AI)
     * @param {HTMLElement} element - The editor component element
     * @param {Object} data - Data to populate {text: "...", style: "info"}
     */
    populateInputs(element, data) {
        if (data.text) {
            const textInput = element.querySelector('.component-input');
            if (textInput) textInput.innerHTML = data.text;
        }
        if (data.style) {
            const dropdown = element.querySelector('.callout-type');
            if (dropdown) dropdown.value = data.style;
        }
    }

    /**
     * Generate preview HTML
     * @param {HTMLElement} element - The editor component element
     * @returns {string} - HTML string for preview
     */
    generatePreview(element) {
        const textInput = element.querySelector('.component-input');
        const dropdown = element.querySelector('.callout-type');

        const text = textInput ? textInput.innerHTML : 'Callout text';
        const style = dropdown ? dropdown.value : 'info';

        // Extract component background style (from color picker)
        const componentStyle = this.extractComponentStyle(element);

        // Format text with bold/italic/colors
        const formattedText = CMSUtils.formatTextForPreview(text);

        // Icon map for different callout styles
        const iconMap = {
            'info': 'ℹ️',
            'tip': '💡',
            'warning': '⚠️',
            'important': '❗'
        };
        const icon = iconMap[style] || 'ℹ️';

        return `
            <div class="preview-callout-box preview-callout-${style}" style="${componentStyle}">
                <span class="callout-icon">${icon}</span>
                <div class="callout-text">${formattedText}</div>
            </div>
        `;
    }

    /**
     * Extract data for saving
     * @param {HTMLElement} element - The editor component element
     * @returns {Object} - Component data {text: "...", style: "info"}
     */
    extractData(element) {
        const textInput = element.querySelector('.component-input');
        const dropdown = element.querySelector('.callout-type');

        return {
            text: textInput ? textInput.innerHTML : '',
            style: dropdown ? dropdown.value : 'info'
        };
    }

    /**
     * Render component for student view
     * @param {Object} data - Component data {text: "...", style: "info"}
     * @returns {string} - HTML string for student view
     */
    renderStudent(data) {
        const text = data.text || 'Callout';
        const style = data.style || 'info';

        // Icon map for different callout styles
        const iconMap = {
            'info': 'ℹ️',
            'tip': '💡',
            'warning': '⚠️',
            'important': '❗'
        };
        const icon = iconMap[style] || 'ℹ️';

        return `
            <div class="student-callout-box student-callout-${style}">
                <span class="student-callout-icon">${icon}</span>
                <div class="student-callout-text">${text}</div>
            </div>
        `;
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
    window.CalloutBoxComponent = CalloutBoxComponent;
}
