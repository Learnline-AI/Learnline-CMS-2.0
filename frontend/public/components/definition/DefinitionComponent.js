/**
 * DefinitionComponent - Definition component
 *
 * Term + definition fields for key concepts.
 * Uses two contenteditable inputs: one for term, one for definition.
 */

class DefinitionComponent extends BaseComponent {
    /**
     * Create the editor form element
     * @param {Object} data - Optional initial data {term: "...", definition: "..."}
     * @returns {HTMLElement} - Editor component DOM element
     */
    createElement(data = {}) {
        const div = document.createElement('div');
        div.className = 'editor-component';
        div.dataset.componentType = 'definition';

        div.innerHTML = `
            <div class="component-header">
                <h4>Definition</h4>
                <button class="remove-component">×</button>
            </div>
            <div contenteditable="true" data-placeholder="Term to define..." class="component-input"></div>
            <div contenteditable="true" data-placeholder="Definition..." class="component-input component-textarea"></div>
        `;

        // Bind remove button
        const removeBtn = div.querySelector('.remove-component');
        removeBtn.addEventListener('click', () => {
            if (this.cms && typeof this.cms.removeComponent === 'function') {
                this.cms.removeComponent(div);
            }
        });

        // Bind input events for BOTH inputs for real-time preview and auto-save
        const inputs = div.querySelectorAll('.component-input');
        inputs.forEach(input => {
            input.addEventListener('input', () => {
                this.updatePreview();
                this.scheduleAutoSave();
            });
        });

        // Populate with initial data if provided
        if (data) {
            if (data.term) inputs[0].innerHTML = data.term;
            if (data.definition) inputs[1].innerHTML = data.definition;
        }

        return div;
    }

    /**
     * Populate component inputs with data (from database or AI)
     * @param {HTMLElement} element - The editor component element
     * @param {Object} data - Data to populate {term: "...", definition: "..."}
     */
    populateInputs(element, data) {
        if (data.term || data.definition) {
            const inputs = element.querySelectorAll('.component-input');
            if (inputs[0] && data.term) inputs[0].innerHTML = data.term;
            if (inputs[1] && data.definition) inputs[1].innerHTML = data.definition;
        }
    }

    /**
     * Generate preview HTML
     * @param {HTMLElement} element - The editor component element
     * @returns {string} - HTML string for preview
     */
    generatePreview(element) {
        const inputs = element.querySelectorAll('.component-input');
        const term = inputs[0] ? inputs[0].innerHTML : 'Term';
        const definition = inputs[1] ? inputs[1].innerHTML : 'Definition';

        // Extract component background style (from color picker)
        const componentStyle = this.extractComponentStyle(element);

        // Format both fields with bold/italic/colors
        const formattedTerm = CMSUtils.formatTextForPreview(term);
        const formattedDefinition = CMSUtils.formatTextForPreview(definition);

        return `
            <div class="preview-definition" style="${componentStyle}">
                <strong>${formattedTerm}:</strong> ${formattedDefinition}
            </div>
        `;
    }

    /**
     * Extract data for saving
     * @param {HTMLElement} element - The editor component element
     * @returns {Object} - Component data {term: "...", definition: "..."}
     */
    extractData(element) {
        const inputs = element.querySelectorAll('.component-input');
        return {
            term: inputs[0] ? inputs[0].innerHTML : '',
            definition: inputs[1] ? inputs[1].innerHTML : ''
        };
    }

    /**
     * Render component for student view
     * @param {Object} data - Component data {term: "...", definition: "..."}
     * @returns {string} - HTML string for student view
     */
    renderStudent(data) {
        const term = data.term || 'Term';
        const definition = data.definition || 'Definition';
        return `
            <div class="student-definition">
                <span class="student-definition-term">${term}:</span> ${definition}
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
    window.DefinitionComponent = DefinitionComponent;
}
