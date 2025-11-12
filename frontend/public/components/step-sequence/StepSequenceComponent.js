/**
 * StepSequenceComponent - Step sequence component
 *
 * Dynamic numbered list for procedures/processes.
 * Users can add/remove steps with automatic numbering.
 */

class StepSequenceComponent extends BaseComponent {
    /**
     * Create the editor form element
     * @param {Object} data - Optional initial data {steps: ["step1", "step2", ...]}
     * @returns {HTMLElement} - Editor component DOM element
     */
    createElement(data = {}) {
        const div = document.createElement('div');
        div.className = 'editor-component';
        div.dataset.componentType = 'step-sequence';

        div.innerHTML = `
            <div class="component-header">
                <h4>Step Sequence</h4>
                <button class="remove-component">×</button>
            </div>
            <div class="step-list">
                <!-- Steps will be added here -->
            </div>
            <button class="add-step">Add Step</button>
        `;

        // Bind remove button
        const removeBtn = div.querySelector('.remove-component');
        removeBtn.addEventListener('click', () => {
            if (this.cms && typeof this.cms.removeComponent === 'function') {
                this.cms.removeComponent(div);
            }
        });

        // Bind "Add Step" button
        const addStepBtn = div.querySelector('.add-step');
        addStepBtn.addEventListener('click', () => {
            this.addStep(div, '');
        });

        // Add initial step (or populate with data)
        if (data && data.steps && Array.isArray(data.steps) && data.steps.length > 0) {
            data.steps.forEach((stepText) => {
                this.addStep(div, stepText);
            });
        } else {
            // Add one empty step by default
            this.addStep(div, '');
        }

        return div;
    }

    /**
     * Helper: Create a single step div
     * @param {number} index - Step number (1-based)
     * @param {string} text - Step text content
     * @returns {HTMLElement} - Step div element
     */
    createStepDiv(index, text = '') {
        const stepDiv = document.createElement('div');
        stepDiv.className = 'step-item';
        stepDiv.innerHTML = `
            <span class="step-number">${index}.</span>
            <div contenteditable="true" data-placeholder="Step..." class="component-input">${text}</div>
            <button class="remove-step-btn" title="Remove step">×</button>
        `;

        return stepDiv;
    }

    /**
     * Helper: Add a new step to the sequence
     * @param {HTMLElement} element - The editor component element
     * @param {string} text - Initial text for the step
     */
    addStep(element, text = '') {
        const stepList = element.querySelector('.step-list');
        if (!stepList) return;

        // Get current step count to determine new step number
        const currentSteps = stepList.querySelectorAll('.step-item');
        const newStepNumber = currentSteps.length + 1;

        // Create new step
        const stepDiv = this.createStepDiv(newStepNumber, text);

        // Bind input event to the contenteditable div
        const input = stepDiv.querySelector('.component-input');
        input.addEventListener('input', () => {
            this.updatePreview();
            this.scheduleAutoSave();
        });

        // Bind remove button
        const removeBtn = stepDiv.querySelector('.remove-step-btn');
        removeBtn.addEventListener('click', () => {
            this.removeStep(element, stepDiv);
        });

        // Append to list
        stepList.appendChild(stepDiv);

        // Update preview and save
        this.updatePreview();
        this.scheduleAutoSave();
    }

    /**
     * Helper: Remove a step from the sequence
     * @param {HTMLElement} element - The editor component element
     * @param {HTMLElement} stepDiv - The step div to remove
     */
    removeStep(element, stepDiv) {
        // Remove the step
        stepDiv.remove();

        // Renumber remaining steps
        this.updateStepNumbers(element);

        // Update preview and save
        this.updatePreview();
        this.scheduleAutoSave();
    }

    /**
     * Helper: Update step numbers after add/remove
     * @param {HTMLElement} element - The editor component element
     */
    updateStepNumbers(element) {
        const stepList = element.querySelector('.step-list');
        if (!stepList) return;

        const steps = stepList.querySelectorAll('.step-item');
        steps.forEach((step, index) => {
            const numberSpan = step.querySelector('.step-number');
            if (numberSpan) {
                numberSpan.textContent = `${index + 1}.`;
            }
        });
    }

    /**
     * Populate component inputs with data (from database or AI)
     * @param {HTMLElement} element - The editor component element
     * @param {Object} data - Data to populate {steps: ["step1", "step2", ...]}
     */
    populateInputs(element, data) {
        if (!data.steps || !Array.isArray(data.steps)) return;

        const stepList = element.querySelector('.step-list');
        if (!stepList) return;

        // Clear existing steps
        stepList.innerHTML = '';

        // Add each step from data
        data.steps.forEach((stepText) => {
            this.addStep(element, stepText);
        });
    }

    /**
     * Generate preview HTML
     * @param {HTMLElement} element - The editor component element
     * @returns {string} - HTML string for preview
     */
    generatePreview(element) {
        const stepInputs = element.querySelectorAll('.step-item .component-input');

        // Extract component background style (from color picker)
        const componentStyle = this.extractComponentStyle(element);

        // Build numbered list
        let html = `<ol class="preview-steps" style="${componentStyle}">`;
        stepInputs.forEach(input => {
            const stepText = input.innerHTML || 'Step';
            const formattedText = CMSUtils.formatTextForPreview(stepText);
            html += `<li>${formattedText}</li>`;
        });
        html += '</ol>';

        return html;
    }

    /**
     * Extract data for saving
     * @param {HTMLElement} element - The editor component element
     * @returns {Object} - Component data {steps: ["step1", "step2", ...]}
     */
    extractData(element) {
        const stepInputs = element.querySelectorAll('.step-item .component-input');
        const steps = Array.from(stepInputs).map(input => input.innerHTML || '');

        return { steps };
    }

    /**
     * Render component for student view
     * @param {Object} data - Component data {steps: ["step1", "step2", ...]}
     * @returns {string} - HTML string for student view
     */
    renderStudent(data) {
        const steps = data.steps || [];
        if (steps.length === 0) return '';

        const stepsHTML = steps.map(step => `<li>${step}</li>`).join('');
        return `<ol class="student-steps">${stepsHTML}</ol>`;
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
    window.StepSequenceComponent = StepSequenceComponent;
}
