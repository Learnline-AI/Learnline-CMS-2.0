/**
 * BaseComponent - Base class for all educational components
 *
 * This class defines the interface that all components must implement.
 * Each component type (heading, paragraph, hero-number, etc.) should extend this class
 * and implement all required methods.
 *
 * Benefits:
 * - Consistent interface across all components
 * - Dependency injection (components receive cms instance instead of being tightly coupled)
 * - Clear contract for what every component must do
 * - Easy to add new components following the same pattern
 */

class BaseComponent {
    /**
     * Constructor - Dependency Injection Pattern
     * @param {Object} cms - The TemplateEditorCMS instance (provides access to CMS methods)
     *
     * The cms object provides:
     * - cms.updatePreview() - Triggers preview refresh
     * - cms.scheduleAutoSave() - Triggers debounced auto-save
     * - cms.sessionId - Current session ID
     * - cms.apiBaseUrl - API base URL for uploads/generation
     */
    constructor(cms) {
        this.cms = cms;
        this.type = this.constructor.name.replace('Component', '').toLowerCase();
    }

    /**
     * Create the editor form element (left panel)
     * @param {Object} data - Optional initial data to populate the form
     * @returns {HTMLElement} - The DOM element containing the editor form
     *
     * This method should:
     * - Create a container div with class 'editor-component'
     * - Add component header with title and remove button
     * - Add form inputs specific to this component type
     * - Bind event listeners (input changes should call cms.updatePreview() and cms.scheduleAutoSave())
     *
     * Example structure:
     * <div class="editor-component" data-type="heading">
     *   <div class="component-header">
     *     <h4>Heading</h4>
     *     <button class="remove-component">×</button>
     *   </div>
     *   <div contenteditable="true" class="component-input">...</div>
     * </div>
     */
    createElement(data = {}) {
        throw new Error(`${this.constructor.name} must implement createElement(data) method`);
    }

    /**
     * Populate the component form with data (from database or AI generation)
     * @param {HTMLElement} element - The editor component DOM element
     * @param {Object} data - The data to populate into the form
     *
     * This method should:
     * - Read data from the data object
     * - Find corresponding inputs in the element
     * - Fill inputs with the data values
     * - Handle missing/null values gracefully
     *
     * Called when:
     * - Loading saved content from database
     * - AI generates component from PDF
     * - User imports components
     */
    populateInputs(element, data) {
        throw new Error(`${this.constructor.name} must implement populateInputs(element, data) method`);
    }

    /**
     * Generate preview HTML (middle panel)
     * @param {HTMLElement} element - The editor component DOM element
     * @returns {string} - HTML string for the preview
     *
     * This method should:
     * - Read current values from form inputs
     * - Generate styled HTML preview
     * - Return HTML string (not DOM element)
     * - Apply text formatting if component contains text (use CMSUtils.formatTextForPreview)
     *
     * The preview should look like the final student-facing component
     * but may include editor-specific styling/interactions.
     */
    generatePreview(element) {
        throw new Error(`${this.constructor.name} must implement generatePreview(element) method`);
    }

    /**
     * Extract data from the form for saving
     * @param {HTMLElement} element - The editor component DOM element
     * @returns {Object} - JSON object with component data
     *
     * This method should:
     * - Read all input values from the form
     * - Return clean JSON object
     * - Match the structure defined in component_schemas.py
     * - Handle empty/null values appropriately
     *
     * The returned object will be:
     * - Saved to database
     * - Validated against Python schema
     * - Used to reconstruct the component on load
     */
    extractData(element) {
        throw new Error(`${this.constructor.name} must implement extractData(element) method`);
    }

    /**
     * Render component for student view
     * @param {Object} data - The component data from database
     * @returns {string} - HTML string for student-facing display
     *
     * This method should:
     * - Read data from the data object
     * - Generate clean, student-facing HTML
     * - Apply appropriate CSS classes (student-heading, student-paragraph, etc.)
     * - Apply text formatting if component contains text (use CMSUtils.formatTextForPreview)
     * - Be responsive and accessible
     *
     * Student view should be:
     * - Clean and distraction-free
     * - Responsive on mobile
     * - Accessible (screen readers, keyboard navigation)
     * - Visually consistent with other components
     */
    renderStudent(data) {
        throw new Error(`${this.constructor.name} must implement renderStudent(data) method`);
    }

    /**
     * Helper: Trigger preview update
     * Components can call this.updatePreview() after changes
     */
    updatePreview() {
        if (this.cms && typeof this.cms.updatePreview === 'function') {
            this.cms.updatePreview();
        }
    }

    /**
     * Helper: Trigger auto-save
     * Components can call this.scheduleAutoSave() after changes
     */
    scheduleAutoSave() {
        if (this.cms && typeof this.cms.scheduleAutoSave === 'function') {
            this.cms.scheduleAutoSave();
        }
    }

    /**
     * Helper: Get session ID
     * @returns {string|null} - Current session ID
     */
    getSessionId() {
        return this.cms ? this.cms.sessionId : null;
    }

    /**
     * Helper: Get API base URL
     * @returns {string} - API base URL
     */
    getApiBaseUrl() {
        return this.cms ? this.cms.apiBaseUrl : '';
    }
}

// Export for use in component files
// Note: In vanilla JS without modules, this will be available globally
// Future: Can be converted to ES6 module export when we add build step
if (typeof window !== 'undefined') {
    window.BaseComponent = BaseComponent;
}
