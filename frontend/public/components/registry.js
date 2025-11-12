/**
 * Component Registry
 *
 * Central registry for all component types.
 * Maps component type strings to their class constructors.
 *
 * Usage:
 * - ComponentRegistry.register('heading', HeadingComponent)
 * - ComponentRegistry.get('heading') // returns HeadingComponent class
 * - ComponentRegistry.has('heading') // returns true
 */

const ComponentRegistry = {
    /**
     * Internal storage for registered components
     */
    _components: {},

    /**
     * Register a component class
     * @param {string} type - Component type (e.g., 'heading', 'paragraph')
     * @param {Class} ComponentClass - The component class (must extend BaseComponent)
     */
    register(type, ComponentClass) {
        if (!type || typeof type !== 'string') {
            console.error('ComponentRegistry.register: type must be a non-empty string');
            return;
        }

        if (!ComponentClass || typeof ComponentClass !== 'function') {
            console.error('ComponentRegistry.register: ComponentClass must be a class/function');
            return;
        }

        this._components[type] = ComponentClass;
        console.log(`ComponentRegistry: Registered '${type}' component`);
    },

    /**
     * Get a component class by type
     * @param {string} type - Component type
     * @returns {Class|null} - Component class or null if not found
     */
    get(type) {
        return this._components[type] || null;
    },

    /**
     * Check if a component type is registered
     * @param {string} type - Component type
     * @returns {boolean} - True if registered
     */
    has(type) {
        return !!this._components[type];
    },

    /**
     * Get all registered component types
     * @returns {string[]} - Array of registered type names
     */
    getAll() {
        return Object.keys(this._components);
    },

    /**
     * Unregister a component (useful for testing/development)
     * @param {string} type - Component type to unregister
     */
    unregister(type) {
        if (this._components[type]) {
            delete this._components[type];
            console.log(`ComponentRegistry: Unregistered '${type}' component`);
        }
    }
};

// Export to global namespace
if (typeof window !== 'undefined') {
    window.ComponentRegistry = ComponentRegistry;
}

// Register components here
// (Components must be loaded before this runs)
if (typeof window !== 'undefined' && window.HeadingComponent) {
    ComponentRegistry.register('heading', window.HeadingComponent);
}

if (typeof window !== 'undefined' && window.ParagraphComponent) {
    ComponentRegistry.register('paragraph', window.ParagraphComponent);
}

if (typeof window !== 'undefined' && window.MemoryTrickComponent) {
    ComponentRegistry.register('memory-trick', window.MemoryTrickComponent);
}

if (typeof window !== 'undefined' && window.DefinitionComponent) {
    ComponentRegistry.register('definition', window.DefinitionComponent);
}

if (typeof window !== 'undefined' && window.WorkedExampleComponent) {
    ComponentRegistry.register('worked-example', window.WorkedExampleComponent);
}

if (typeof window !== 'undefined' && window.CalloutBoxComponent) {
    ComponentRegistry.register('callout-box', window.CalloutBoxComponent);
}

if (typeof window !== 'undefined' && window.StepSequenceComponent) {
    ComponentRegistry.register('step-sequence', window.StepSequenceComponent);
}
