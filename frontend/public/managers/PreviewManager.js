/**
 * PreviewManager - Handles all preview and export functionality
 *
 * Responsibilities:
 * - Update live preview panel as components change
 * - Generate preview HTML from components
 * - Handle device selector (desktop/tablet/mobile views)
 * - Export node content (JSON, HTML, Markdown)
 * - Open student view in new tab
 * - Generate content for templates
 */

class PreviewManager {
    /**
     * Constructor - Dependency Injection Pattern
     * @param {HTMLElement} previewContent - The preview panel DOM element
     * @param {HTMLElement} dropZone - The editor drop zone containing components
     * @param {Map} componentRegistry - Registry mapping component types to classes
     * @param {Object} cmsInstance - Full CMS instance (for creating component instances)
     * @param {Object} callbacks - Callback functions
     *   - callbacks.getSelectedNode() - Returns current selected node ID
     *   - callbacks.triggerSmileAnimation() - Triggers smile animation
     *   - callbacks.extractComponentData(component) - Extracts component data
     */
    constructor(previewContent, dropZone, componentRegistry, cmsInstance, callbacks) {
        this.previewContent = previewContent;
        this.dropZone = dropZone;
        this.componentRegistry = componentRegistry;
        this.cmsInstance = cmsInstance;
        this.callbacks = callbacks;
    }

    /**
     * Update preview panel with current components
     * Called after any component change (add, remove, edit, reorder)
     */
    updatePreview() {
        const components = this.dropZone.querySelectorAll('.editor-component');

        if (components.length === 0) {
            this.previewContent.innerHTML = `
                <div class="preview-placeholder">
                    <i class="fas fa-eye"></i>
                    <h4>Preview</h4>
                    <p>Your content will appear here as you build it</p>
                </div>
            `;
            return;
        }

        // Generate preview using local component rendering
        const nodeTitle = this.getNodeTitle();

        // Create preview with proper component rendering
        let previewHTML = `
            <div class="preview-node">
                <h1 class="preview-node-title">${nodeTitle}</h1>
                <div class="preview-components">
        `;

        // Render each component using the existing generatePreviewHTML method
        components.forEach(component => {
            previewHTML += this.generatePreviewHTML(component);
        });

        previewHTML += `
                </div>
            </div>
        `;

        this.previewContent.innerHTML = previewHTML;
    }

    /**
     * Generate preview HTML for a single component
     * @param {HTMLElement} component - The editor component element
     * @returns {string} - Preview HTML string
     */
    generatePreviewHTML(component) {
        const componentType = component.dataset.componentType;

        // Check component registry
        if (typeof this.componentRegistry !== 'undefined' && this.componentRegistry.has(componentType)) {
            const ComponentClass = this.componentRegistry.get(componentType);
            const componentInstance = new ComponentClass(this.cmsInstance);
            return componentInstance.generatePreview(component);
        }

        // Component not found in registry
        return `<div class="preview-component">${componentType} content</div>`;
    }

    /**
     * Generate markdown-style content from components
     * Used for markdown export and AI processing
     * @param {NodeList} components - List of editor component elements
     * @returns {string} - Markdown-formatted content
     */
    generateContentForTemplate(components) {
        let content = '';

        components.forEach(component => {
            const componentType = component.dataset.componentType;

            switch (componentType) {
                case 'heading':
                    const headingText = component.querySelector('.component-input').innerHTML || 'Heading';
                    content += `# ${headingText}\n\n`;
                    break;

                case 'paragraph':
                    const paragraphText = component.querySelector('.component-input').innerHTML || '';
                    if (paragraphText) {
                        content += `${paragraphText}\n\n`;
                    }
                    break;

                case 'definition':
                    const inputs = component.querySelectorAll('.component-input');
                    const term = inputs[0].innerHTML || '';
                    const definition = inputs[1].innerHTML || '';
                    if (term || definition) {
                        content += `**${term}**: ${definition}\n\n`;
                    }
                    break;

                case 'step-sequence':
                    const steps = component.querySelectorAll('.step-item .component-input');
                    steps.forEach(step => {
                        const stepText = step.innerHTML;
                        if (stepText) {
                            content += `- ${stepText}\n`;
                        }
                    });
                    content += '\n';
                    break;

                case 'worked-example':
                    const exampleInputs = component.querySelectorAll('.component-input');
                    const problem = exampleInputs[0].innerHTML || '';
                    const solution = exampleInputs[1].innerHTML || '';
                    const answer = exampleInputs[2].innerHTML || '';

                    if (problem || solution || answer) {
                        content += `## Example Problem\n\n`;
                        if (problem) content += `**Problem**: ${problem}\n\n`;
                        if (solution) content += `**Solution**: ${solution}\n\n`;
                        if (answer) content += `**Answer**: ${answer}\n\n`;
                    }
                    break;

                case 'memory-trick':
                    const trickText = component.querySelector('.component-input').innerHTML || '';
                    if (trickText) {
                        content += `💡 **Memory Trick**: ${trickText}\n\n`;
                    }
                    break;

                case 'four-pictures':
                    content += `## Visual Examples\n\n`;
                    for (let i = 1; i <= 4; i++) {
                        const titleInput = component.querySelector(`.picture-title[data-slot="${i}"]`);
                        const bodyInput = component.querySelector(`.picture-body[data-slot="${i}"]`);

                        const title = titleInput ? titleInput.innerHTML : '';
                        const body = bodyInput ? bodyInput.innerHTML : '';

                        if (title || body) {
                            content += `### ${title || `Example ${i}`}\n\n${body}\n\n`;
                        }
                    }
                    break;


                default:
                    const defaultInput = component.querySelector('.component-input');
                    if (defaultInput && defaultInput.innerHTML) {
                        content += `${defaultInput.innerHTML}\n\n`;
                    }
            }
        });

        return content.trim();
    }

    /**
     * Open student view in new tab with current node
     */
    openStudentView() {
        const selectedNode = this.callbacks.getSelectedNode();
        const url = `student-view.html?nodeId=${selectedNode}`;
        window.open(url, '_blank');
        console.log(`Opening student view for node: ${selectedNode}`);
    }

    /**
     * Show export format selector prompt
     */
    showExportOptions() {
        const formats = ['JSON', 'HTML', 'Markdown'];
        const format = prompt(`Choose export format:\n${formats.map((f, i) => `${i+1}. ${f}`).join('\n')}`);

        if (format && format >= 1 && format <= 3) {
            this.exportNodeContent(formats[format - 1].toLowerCase());
        }
    }

    /**
     * Export node content in specified format
     * @param {string} format - Export format: 'json', 'html', or 'markdown'
     */
    exportNodeContent(format) {
        const components = this.dropZone.querySelectorAll('.editor-component');
        const selectedNode = this.callbacks.getSelectedNode();
        const nodeData = {
            nodeId: selectedNode,
            components: Array.from(components).map(c => this.callbacks.extractComponentData(c))
        };

        let content, filename, mimeType;

        switch (format) {
            case 'json':
                content = JSON.stringify(nodeData, null, 2);
                filename = `${selectedNode}_content.json`;
                mimeType = 'application/json';
                break;
            case 'html':
                content = this.previewContent.innerHTML;
                filename = `${selectedNode}_content.html`;
                mimeType = 'text/html';
                break;
            case 'markdown':
                content = this.generateContentForTemplate(components);
                filename = `${selectedNode}_content.md`;
                mimeType = 'text/markdown';
                break;
        }

        // Download file
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);

        console.log(`Exported ${format.toUpperCase()} content for ${selectedNode}`);

        // Trigger smile animation for export
        this.callbacks.triggerSmileAnimation();
    }

    /**
     * Get the title of the currently selected node
     * @returns {string} - Node title or node ID as fallback
     */
    getNodeTitle() {
        const selectedNode = this.callbacks.getSelectedNode();
        const selectedNodeItem = document.querySelector(`[data-node-id="${selectedNode}"]`);
        if (selectedNodeItem) {
            const titleElement = selectedNodeItem.querySelector('.node-title');
            return titleElement ? titleElement.textContent : selectedNode;
        }
        return selectedNode;
    }

    /**
     * Generate preview HTML using legacy method (fallback)
     * @param {NodeList} components - List of editor component elements
     * @returns {string} - Preview HTML string
     */
    generateLegacyPreview(components) {
        // Fallback to original preview method
        let previewHTML = '';
        components.forEach(component => {
            previewHTML += this.generatePreviewHTML(component);
        });
        return previewHTML;
    }

    /**
     * Change preview device (desktop, tablet, mobile)
     * @param {Event} e - Change event from device selector dropdown
     */
    changePreviewDevice(e) {
        const device = e.target.value;
        const previewFrame = document.querySelector('.preview-frame');

        // Remove existing device classes
        previewFrame.classList.remove('device-desktop', 'device-tablet', 'device-mobile');

        // Add new device class
        previewFrame.classList.add(`device-${device}`);

        console.log(`Changed preview to ${device} view`);
    }
}

// Export to global namespace
if (typeof window !== 'undefined') {
    window.PreviewManager = PreviewManager;
}
