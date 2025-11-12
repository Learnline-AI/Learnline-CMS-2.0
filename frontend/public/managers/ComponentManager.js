/**
 * ComponentManager - Manages all component lifecycle operations
 *
 * Extracted from app.js (Phase 13) to handle:
 * - Component creation, removal, and population
 * - Drag and drop from toolbar
 * - Component reordering within editor
 * - Component color application
 *
 * Dependencies:
 * - ComponentRegistry (global) - Maps component types to classes
 * - DOM elements: editorCanvas, dropZone
 * - Callbacks: onComponentChange() - Triggers preview update and auto-save
 */

class ComponentManager {
    /**
     * Constructor - Dependency Injection Pattern
     * @param {HTMLElement} editorCanvas - The main editor container
     * @param {HTMLElement} dropZone - The component drop zone
     * @param {Object} componentRegistry - ComponentRegistry object
     * @param {Object} callbacks - Callback functions { onComponentChange }
     * @param {Object} colorManager - Color management { getSelectedColor, getColorValue }
     * @param {NodeList} componentItems - Toolbar component items (for drag opacity)
     * @param {Object} cmsInstance - Full CMS instance to pass to components
     */
    constructor(editorCanvas, dropZone, componentRegistry, callbacks, colorManager, componentItems, cmsInstance) {
        this.editorCanvas = editorCanvas;
        this.dropZone = dropZone;
        this.componentRegistry = componentRegistry;
        this.callbacks = callbacks;
        this.colorManager = colorManager;
        this.componentItems = componentItems;
        this.cmsInstance = cmsInstance;

        // Component drag/drop state (toolbar → drop zone)
        this.draggedComponent = null;
        this.dropInsertionTarget = null;
        this.insertionIndicator = null;

        // Component reordering state (within drop zone)
        this.isDraggingComponent = false;
        this.draggedElement = null;
        this.dragStartY = 0;
        this.dragOffset = { x: 0, y: 0 };
        this.dropPlaceholder = null;
        this.componentPositions = [];
    }

    // ==========================================
    // CORE COMPONENT LIFECYCLE METHODS
    // ==========================================

    /**
     * Add a component to the editor
     * Original: app.js line 1126
     */
    addComponent(componentType, insertBeforeTarget = null) {
        // Create component element based on type
        const componentElement = this.createComponentElement(componentType);

        // Apply selected color to the component
        this.applyColorToComponent(componentElement);

        // Add to drop zone at correct position
        if (insertBeforeTarget) {
            this.dropZone.insertBefore(componentElement, insertBeforeTarget);
        } else {
            this.dropZone.appendChild(componentElement);
        }

        // Update placeholder visibility
        this.updateDropZonePlaceholders();

        // Notify parent (triggers updatePreview and scheduleAutoSave)
        if (this.callbacks.onComponentChange) {
            this.callbacks.onComponentChange();
        }

        console.log(`Added ${componentType} component`);

        // Update component positions after adding
        this.updateComponentPositions();
    }

    /**
     * Create a component element using ComponentRegistry
     * Original: app.js line 1152
     */
    createComponentElement(componentType, data = null, suggestionIndex = null) {
        // Check component registry
        if (typeof this.componentRegistry !== 'undefined' && this.componentRegistry.has(componentType)) {
            const ComponentClass = this.componentRegistry.get(componentType);

            // Pass the full CMS instance - components need access to various methods and properties
            const componentInstance = new ComponentClass(this.cmsInstance);
            const element = componentInstance.createElement(data);

            // Add reorder handle to component
            const componentHeader = element.querySelector('.component-header');
            if (componentHeader) {
                const reorderHandle = document.createElement('div');
                reorderHandle.className = 'reorder-handle';
                reorderHandle.innerHTML = '<i class="fas fa-grip-vertical"></i>';
                componentHeader.appendChild(reorderHandle);
            }

            // Setup reordering events for the new component
            this.setupReorderingEvents(element);

            return element;
        }

        // Component not found in registry
        console.error(`Unknown component type: ${componentType}`);
        return null;
    }

    /**
     * Create multiple components from a sequence (AI/CSV import)
     * Original: app.js line 1166
     */
    createComponentsFromSequence(componentSequence) {
        // Create and add each component from the sequence
        componentSequence.forEach((componentData, index) => {
            const componentElement = this.createComponentElement(componentData.type, componentData.parameters, index);
            this.applyColorToComponent(componentElement);
            this.dropZone.appendChild(componentElement);
        });

        // Update placeholder visibility
        this.updateDropZonePlaceholders();

        // Notify parent (triggers updatePreview and scheduleAutoSave)
        if (this.callbacks.onComponentChange) {
            this.callbacks.onComponentChange();
        }

        // Update component positions
        this.updateComponentPositions();
    }

    /**
     * Remove a component from the editor
     * Original: app.js line 1441
     */
    removeComponent(componentElement) {
        componentElement.remove();

        // Update placeholder visibility
        this.updateDropZonePlaceholders();

        // Notify parent (triggers updatePreview and scheduleAutoSave)
        if (this.callbacks.onComponentChange) {
            this.callbacks.onComponentChange();
        }

        this.updateComponentPositions();
    }

    /**
     * Populate component inputs with data (from database or AI)
     * Original: app.js line 1426
     */
    populateInputs(componentElement, data) {
        const componentType = componentElement.dataset.componentType;

        // Check component registry
        if (typeof this.componentRegistry !== 'undefined' && this.componentRegistry.has(componentType)) {
            const ComponentClass = this.componentRegistry.get(componentType);
            const componentInstance = new ComponentClass(this.cmsInstance);
            componentInstance.populateInputs(componentElement, data);
            return;
        }

        // Component not found in registry
        console.warn(`Unknown component type: ${componentType}`);
    }

    /**
     * Extract data from a component for saving
     * Original: app.js line 1767
     */
    extractData(component) {
        const componentType = component.dataset.componentType;

        // Check component registry
        if (typeof this.componentRegistry !== 'undefined' && this.componentRegistry.has(componentType)) {
            const ComponentClass = this.componentRegistry.get(componentType);
            const componentInstance = new ComponentClass(this.cmsInstance);
            const extractedData = componentInstance.extractData(component);
            return { type: componentType, ...extractedData };
        }

        // Component not found in registry - return basic data
        return {
            type: componentType,
            content: component.querySelector('.component-input')?.innerHTML || ''
        };
    }

    /**
     * Extract component style for preview/export
     * Original: app.js line 1555
     */
    extractStyle(component) {
        let styleString = '';

        // Extract background color from component styling
        if (component.style.background && component.style.background !== '') {
            styleString += `background: ${component.style.background}; `;
        }

        // Add padding and border radius for background colors
        if (styleString.includes('background:') && !styleString.includes('transparent')) {
            styleString += 'padding: 12px; border-radius: 6px; ';
        }

        return styleString;
    }

    /**
     * Apply selected color to a component
     * Original: app.js line 4502
     */
    applyColorToComponent(component) {
        const selectedColor = this.colorManager.getSelectedColor();

        if (selectedColor === 'neutral') {
            component.style.background = 'transparent';
        } else {
            component.style.background = this.colorManager.getColorValue(selectedColor);
            component.style.borderRadius = '8px';
            component.style.padding = '1rem';
        }
    }

    /**
     * Get all components in the editor
     */
    getAllComponents() {
        return Array.from(this.dropZone.querySelectorAll('.editor-component'));
    }

    /**
     * Clear all components from the editor
     */
    clear() {
        this.dropZone.innerHTML = '';
        this.updateDropZonePlaceholders();
    }

    // ==========================================
    // TOOLBAR DRAG AND DROP METHODS
    // ==========================================

    /**
     * Handle component drag start from toolbar
     * Original: app.js line 1070
     */
    handleComponentDragStart(e) {
        this.draggedComponent = e.target.dataset.componentType;
        e.dataTransfer.effectAllowed = 'copy';
        e.target.style.opacity = '0.5';
    }

    /**
     * Handle drag over drop zone
     * Original: app.js line 1076
     */
    handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        this.dropZone.classList.add('drag-over');

        // Track insertion position
        const mouseY = e.clientY;
        const components = this.dropZone.querySelectorAll('.editor-component');

        // Reset insertion target
        this.dropInsertionTarget = null;

        // Find where to insert based on mouse position
        for (let component of components) {
            const rect = component.getBoundingClientRect();
            const componentCenter = rect.top + rect.height / 2;

            if (mouseY < componentCenter) {
                this.dropInsertionTarget = component;
                break;
            }
        }

        // Show visual indicator
        this.showInsertionIndicator();
    }

    /**
     * Handle drag leave
     * Original: app.js line 1103
     */
    handleDragLeave(e) {
        e.preventDefault();
        this.dropZone.classList.remove('drag-over');
        this.hideInsertionIndicator();
    }

    /**
     * Handle drop event
     * Original: app.js line 1109
     */
    handleDrop(e) {
        e.preventDefault();
        this.dropZone.classList.remove('drag-over');
        this.hideInsertionIndicator();

        if (this.draggedComponent) {
            this.addComponent(this.draggedComponent, this.dropInsertionTarget);
            this.draggedComponent = null;
            this.dropInsertionTarget = null;
        }

        // Reset opacity for all component items
        this.componentItems.forEach(item => {
            item.style.opacity = '1';
        });
    }

    /**
     * Show insertion indicator
     * Original: app.js line 3303
     */
    showInsertionIndicator() {
        // Create indicator if it doesn't exist
        if (!this.insertionIndicator) {
            this.insertionIndicator = document.createElement('div');
            this.insertionIndicator.className = 'drag-placeholder active';
            this.insertionIndicator.style.height = '3px';
            this.insertionIndicator.style.background = 'var(--primary-blue)';
            this.insertionIndicator.style.borderRadius = '2px';
            this.insertionIndicator.style.margin = '4px 0';
        }

        // Position the indicator
        if (this.dropInsertionTarget) {
            // Insert before the target component
            this.dropZone.insertBefore(this.insertionIndicator, this.dropInsertionTarget);
        } else {
            // Insert at the end
            this.dropZone.appendChild(this.insertionIndicator);
        }
    }

    /**
     * Hide insertion indicator
     * Original: app.js line 3324
     */
    hideInsertionIndicator() {
        if (this.insertionIndicator && this.insertionIndicator.parentNode) {
            this.insertionIndicator.remove();
        }
    }

    // ==========================================
    // COMPONENT REORDERING METHODS
    // ==========================================

    /**
     * Setup reordering events for a component
     * Original: app.js line 3331
     */
    setupReorderingEvents(componentElement) {
        const reorderHandle = componentElement.querySelector('.reorder-handle');

        if (!reorderHandle) return; // Some components might not have reorder handles

        reorderHandle.addEventListener('mousedown', (e) => this.handleReorderStart(e, componentElement));

        // Touch events for mobile
        reorderHandle.addEventListener('touchstart', (e) => this.handleReorderStart(e, componentElement), { passive: false });
    }

    /**
     * Handle reorder drag start
     * Original: app.js line 3340
     */
    handleReorderStart(e, componentElement) {
        e.preventDefault();

        if (this.isDraggingComponent) return;

        this.isDraggingComponent = true;
        this.draggedElement = componentElement;

        // Get initial positions
        const rect = componentElement.getBoundingClientRect();
        const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
        const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;

        this.dragStartY = clientY;
        this.dragOffset = {
            x: clientX - rect.left,
            y: clientY - rect.top
        };

        // Store all component positions
        this.updateComponentPositions();

        // Create and insert drop placeholder
        this.createDropPlaceholder();

        // Style dragged element
        componentElement.classList.add('is-dragging');

        // Add global event listeners
        document.addEventListener('mousemove', this.handleReorderMove.bind(this));
        document.addEventListener('mouseup', this.handleReorderEnd.bind(this));
        document.addEventListener('touchmove', this.handleReorderMove.bind(this), { passive: false });
        document.addEventListener('touchend', this.handleReorderEnd.bind(this));

        // Prevent text selection
        document.body.style.userSelect = 'none';
    }

    /**
     * Handle reorder drag move
     * Original: app.js line 3378
     */
    handleReorderMove(e) {
        if (!this.isDraggingComponent || !this.draggedElement) return;

        e.preventDefault();

        const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;
        const deltaY = clientY - this.dragStartY;

        // Move the dragged element
        this.draggedElement.style.transform = `translateY(${deltaY}px)`;

        // Find the closest drop position
        this.updateDropPosition(clientY);
    }

    /**
     * Handle reorder drag end
     * Original: app.js line 3393
     */
    handleReorderEnd(e) {
        if (!this.isDraggingComponent || !this.draggedElement) return;

        // Remove global event listeners
        document.removeEventListener('mousemove', this.handleReorderMove.bind(this));
        document.removeEventListener('mouseup', this.handleReorderEnd.bind(this));
        document.removeEventListener('touchmove', this.handleReorderMove.bind(this));
        document.removeEventListener('touchend', this.handleReorderEnd.bind(this));

        // Restore text selection
        document.body.style.userSelect = '';

        // Perform the actual reordering
        this.performReorder();

        // Clean up
        this.cleanupDragState();
    }

    /**
     * Update drop zone placeholder visibility
     * Original: app.js line 3413
     */
    updateDropZonePlaceholders() {
        const components = this.dropZone.querySelectorAll('.editor-component');
        const dropZoneMessage = this.dropZone.querySelector('.drop-zone-message');
        const aiUploadZone = this.dropZone.querySelector('#ai-upload-zone');

        if (components.length > 0) {
            // Hide placeholders when we have components
            if (dropZoneMessage) {
                dropZoneMessage.classList.add('hidden');
                dropZoneMessage.style.display = 'none';
            }
            if (aiUploadZone) {
                aiUploadZone.classList.add('hidden');
                aiUploadZone.style.display = 'none';
            }
        } else {
            // Show placeholders when drop zone is empty
            if (dropZoneMessage) {
                dropZoneMessage.classList.remove('hidden');
                dropZoneMessage.style.display = 'flex';
            }
            if (aiUploadZone) {
                aiUploadZone.classList.remove('hidden');
                aiUploadZone.style.display = 'block';
            }
        }
    }

    /**
     * Update component positions for reordering
     * Original: app.js line 3441
     */
    updateComponentPositions() {
        const components = this.dropZone.querySelectorAll('.editor-component');
        this.componentPositions = [];

        components.forEach((component, index) => {
            const rect = component.getBoundingClientRect();
            this.componentPositions.push({
                element: component,
                index: index,
                top: rect.top,
                bottom: rect.bottom,
                height: rect.height,
                center: rect.top + rect.height / 2
            });
        });
    }

    /**
     * Create drop placeholder for reordering
     * Original: app.js line 3458
     */
    createDropPlaceholder() {
        if (this.dropPlaceholder) {
            this.dropPlaceholder.remove();
        }

        this.dropPlaceholder = document.createElement('div');
        this.dropPlaceholder.className = 'drag-placeholder';

        // Insert placeholder at the dragged element's position
        const draggedIndex = this.componentPositions.findIndex(pos => pos.element === this.draggedElement);
        if (draggedIndex !== -1) {
            const nextSibling = this.draggedElement.nextElementSibling;
            if (nextSibling) {
                this.dropZone.insertBefore(this.dropPlaceholder, nextSibling);
            } else {
                this.dropZone.appendChild(this.dropPlaceholder);
            }
        }

        // Activate placeholder animation
        setTimeout(() => {
            this.dropPlaceholder.classList.add('active');
        }, 10);
    }

    /**
     * Update drop position during reorder drag
     * Original: app.js line 3483
     */
    updateDropPosition(clientY) {
        let insertIndex = -1;

        // Find where to insert based on mouse position
        for (let i = 0; i < this.componentPositions.length; i++) {
            const pos = this.componentPositions[i];

            // Skip the dragged element
            if (pos.element === this.draggedElement) continue;

            if (clientY < pos.center) {
                insertIndex = i;
                break;
            }
        }

        // If no position found, insert at the end
        if (insertIndex === -1) {
            insertIndex = this.componentPositions.length;
        }

        // Move placeholder to the new position
        this.moveDropPlaceholder(insertIndex);

        // Animate other components
        this.animateComponentDisplacement();
    }

    /**
     * Move drop placeholder to new position
     * Original: app.js line 3511
     */
    moveDropPlaceholder(insertIndex) {
        const components = Array.from(this.dropZone.querySelectorAll('.editor-component'));
        const targetComponent = components[insertIndex];

        if (targetComponent && targetComponent !== this.draggedElement) {
            this.dropZone.insertBefore(this.dropPlaceholder, targetComponent);
        } else {
            // Insert at the end
            this.dropZone.appendChild(this.dropPlaceholder);
        }
    }

    /**
     * Animate component displacement during reorder
     * Original: app.js line 3523
     */
    animateComponentDisplacement() {
        const components = this.dropZone.querySelectorAll('.editor-component');

        components.forEach(component => {
            if (component === this.draggedElement) return;

            // Reset any existing transforms
            component.classList.remove('drag-over', 'drag-under');
            component.style.transform = '';

            // Add reordering class for smooth transition
            component.classList.add('reordering');
        });

        // Remove reordering class after animation
        setTimeout(() => {
            components.forEach(component => {
                component.classList.remove('reordering');
            });
        }, 300);
    }

    /**
     * Perform the actual reorder
     * Original: app.js line 3545
     */
    performReorder() {
        if (!this.dropPlaceholder || !this.draggedElement) return;

        // Insert the dragged element at the placeholder position
        this.dropZone.insertBefore(this.draggedElement, this.dropPlaceholder);

        // Notify parent (triggers updatePreview)
        if (this.callbacks.onComponentChange) {
            this.callbacks.onComponentChange();
        }
    }

    /**
     * Cleanup drag state after reorder
     * Original: app.js line 3555
     */
    cleanupDragState() {
        // Reset dragged element
        if (this.draggedElement) {
            this.draggedElement.classList.remove('is-dragging');
            this.draggedElement.style.transform = '';
        }

        // Remove placeholder
        if (this.dropPlaceholder) {
            this.dropPlaceholder.remove();
            this.dropPlaceholder = null;
        }

        // Clean up other components
        const components = this.dropZone.querySelectorAll('.editor-component');
        components.forEach(component => {
            component.classList.remove('drag-over', 'drag-under', 'reordering');
            component.style.transform = '';
        });

        // Reset state
        this.isDraggingComponent = false;
        this.draggedElement = null;
        this.dragStartY = 0;
        this.dragOffset = { x: 0, y: 0 };
        this.componentPositions = [];

        // Update positions for next drag operation
        setTimeout(() => {
            this.updateComponentPositions();
        }, 50);
    }
}

// Export to global namespace (for vanilla JS loading)
if (typeof window !== 'undefined') {
    window.ComponentManager = ComponentManager;
}
