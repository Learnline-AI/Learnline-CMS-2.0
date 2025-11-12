/**
 * WorkedExampleComponent - Worked example component
 *
 * Problem + solution + answer fields for mathematical examples.
 * Uses three contenteditable inputs: one for problem, one for solution, one for answer.
 */

class WorkedExampleComponent extends BaseComponent {
    /**
     * Create the editor form element
     * @param {Object} data - Optional initial data {problem: "...", solution: "...", answer: "..."}
     * @returns {HTMLElement} - Editor component DOM element
     */
    createElement(data = {}) {
        const div = document.createElement('div');
        div.className = 'editor-component';
        div.dataset.componentType = 'worked-example';

        div.innerHTML = `
            <div class="component-header">
                <h4>Worked Example</h4>
                <button class="remove-component">×</button>
            </div>
            <div contenteditable="true" data-placeholder="Problem statement..." class="component-input"></div>
            <div contenteditable="true" data-placeholder="Solution steps..." class="component-input component-textarea"></div>
            <div contenteditable="true" data-placeholder="Final answer..." class="component-input"></div>
        `;

        // Bind remove button
        const removeBtn = div.querySelector('.remove-component');
        removeBtn.addEventListener('click', () => {
            if (this.cms && typeof this.cms.removeComponent === 'function') {
                this.cms.removeComponent(div);
            }
        });

        // Bind input events for ALL 3 inputs for real-time preview and auto-save
        const inputs = div.querySelectorAll('.component-input');
        inputs.forEach(input => {
            input.addEventListener('input', () => {
                this.updatePreview();
                this.scheduleAutoSave();
            });
        });

        // Populate with initial data if provided
        if (data) {
            if (data.problem) inputs[0].innerHTML = data.problem;
            if (data.solution) inputs[1].innerHTML = data.solution;
            if (data.answer) inputs[2].innerHTML = data.answer;
        }

        return div;
    }

    /**
     * Populate component inputs with data (from database or AI)
     * @param {HTMLElement} element - The editor component element
     * @param {Object} data - Data to populate {problem: "...", solution: "...", answer: "..."}
     */
    populateInputs(element, data) {
        if (data.problem || data.solution || data.answer) {
            const inputs = element.querySelectorAll('.component-input');
            if (inputs[0] && data.problem) inputs[0].innerHTML = data.problem;
            if (inputs[1] && data.solution) inputs[1].innerHTML = data.solution;
            if (inputs[2] && data.answer) inputs[2].innerHTML = data.answer;
        }
    }

    /**
     * Generate preview HTML
     * @param {HTMLElement} element - The editor component element
     * @returns {string} - HTML string for preview
     */
    generatePreview(element) {
        const inputs = element.querySelectorAll('.component-input');
        const problem = inputs[0] ? inputs[0].innerHTML : 'Problem';
        const solution = inputs[1] ? inputs[1].innerHTML : 'Solution';
        const answer = inputs[2] ? inputs[2].innerHTML : 'Answer';

        // Extract component background style (from color picker)
        const componentStyle = this.extractComponentStyle(element);

        // Format all three fields with bold/italic/colors
        const formattedProblem = CMSUtils.formatTextForPreview(problem);
        const formattedSolution = CMSUtils.formatTextForPreview(solution);
        const formattedAnswer = CMSUtils.formatTextForPreview(answer);

        return `
            <div class="preview-example" style="${componentStyle}">
                <div class="example-problem"><strong>Problem:</strong> ${formattedProblem}</div>
                <div class="example-solution"><strong>Solution:</strong> ${formattedSolution}</div>
                <div class="example-answer"><strong>Answer:</strong> ${formattedAnswer}</div>
            </div>
        `;
    }

    /**
     * Extract data for saving
     * @param {HTMLElement} element - The editor component element
     * @returns {Object} - Component data {problem: "...", solution: "...", answer: "..."}
     */
    extractData(element) {
        const inputs = element.querySelectorAll('.component-input');
        return {
            problem: inputs[0] ? inputs[0].innerHTML : '',
            solution: inputs[1] ? inputs[1].innerHTML : '',
            answer: inputs[2] ? inputs[2].innerHTML : ''
        };
    }

    /**
     * Render component for student view
     * @param {Object} data - Component data {problem: "...", solution: "...", answer: "..."}
     * @returns {string} - HTML string for student view
     */
    renderStudent(data) {
        const problem = data.problem || '';
        const solution = data.solution || '';
        const answer = data.answer || '';

        return `
            <div class="student-example">
                ${problem ? `<div class="student-example-problem"><strong>Problem:</strong> ${problem}</div>` : ''}
                ${solution ? `<div class="student-example-solution"><strong>Solution:</strong> ${solution}</div>` : ''}
                ${answer ? `<div class="student-example-answer"><strong>Answer:</strong> ${answer}</div>` : ''}
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
    window.WorkedExampleComponent = WorkedExampleComponent;
}
