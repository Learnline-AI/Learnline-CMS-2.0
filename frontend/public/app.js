// Template Editor CMS Frontend
class TemplateEditorCMS {
    constructor() {
        this.apiBaseUrl = 'http://localhost:8000';
        this.selectedNode = 'N001';
        this.draggedComponent = null;
        this.nodeCounter = 2; // Start at 2 since we have N001 and N002
        this.selectedComponentColor = 'neutral'; // Default component color

        // Drag and drop reordering state
        this.isDraggingComponent = false;
        this.draggedElement = null;
        this.dragStartY = 0;
        this.dragOffset = { x: 0, y: 0 };
        this.dropPlaceholder = null;
        this.componentPositions = [];

        // New component insertion tracking
        this.dropInsertionTarget = null;
        this.insertionIndicator = null;

        // Node panel collapse state
        this.isNodePanelCollapsed = false;
        this.toggleNodePanelBtn = null;

        // Session and Auto-Save state
        this.sessionId = null;
        this.autoSaveTimeout = null;
        this.lastSaved = null;
        this.saveStatus = 'idle'; // idle, saving, saved, error

        this.initializeElements();
        this.bindEvents();
        this.initializeTextFormatting();
        this.initializeSession();
        this.updatePreview();
    }

    initializeElements() {
        // Node navigation elements
        this.nodeList = document.getElementById('node-list');
        this.addNodeBtn = document.getElementById('add-node-btn');

        // Template editor elements
        this.editorCanvas = document.getElementById('editor-canvas');
        this.dropZone = document.getElementById('drop-zone');
        this.saveBtn = document.getElementById('save-btn');

        // Preview elements
        this.previewContent = document.getElementById('preview-content');
        this.deviceSelector = document.getElementById('device-selector');
        this.previewStudentBtn = document.getElementById('preview-student-btn');
        this.exportBtn = document.getElementById('export-btn');

        // Component toolbar elements
        this.componentItems = document.querySelectorAll('.component-item');

        // AI upload elements
        this.aiUploadZone = document.getElementById('ai-upload-zone');
        this.pdfUploadInput = document.getElementById('pdf-upload-input');
        this.uploadProgress = document.getElementById('upload-progress');
        this.progressText = document.getElementById('progress-text');
        
        // Get the AI upload zone text for direct updates
        this.aiUploadText = this.aiUploadZone.querySelector('p');

        // Text formatting elements
        this.textFormattingToolbar = document.getElementById('text-formatting-toolbar');
        this.fontSizeSelector = document.getElementById('font-size-selector');
        this.sizeUpBtn = document.getElementById('size-up-btn');
        this.sizeDownBtn = document.getElementById('size-down-btn');
        this.boldBtn = document.getElementById('bold-btn');
        this.italicBtn = document.getElementById('italic-btn');

        // Color picker elements
        this.componentColorPicker = document.getElementById('component-color-picker');

        // Toggle panel button
        this.toggleNodePanelBtn = document.getElementById('toggle-nodes-btn');

        // Selection tracking
        this.selectedComponent = null;
        this.hasTextSelection = false;
    }

    bindEvents() {
        // Node navigation events
        this.addNodeBtn.addEventListener('click', () => this.addNewNode());
        this.nodeList.addEventListener('click', (e) => this.handleNodeClick(e));

        // Component drag and drop events
        this.componentItems.forEach(item => {
            item.addEventListener('dragstart', (e) => this.handleComponentDragStart(e));
        });

        // Drop zone events
        this.dropZone.addEventListener('dragover', (e) => this.handleDragOver(e));
        this.dropZone.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        this.dropZone.addEventListener('drop', (e) => this.handleDrop(e));

        // Save button
        this.saveBtn.addEventListener('click', () => this.saveNode());

        // Device selector
        this.deviceSelector.addEventListener('change', (e) => this.changePreviewDevice(e));

        // Preview as Student
        if (this.previewStudentBtn) {
            this.previewStudentBtn.addEventListener('click', () => this.openStudentView());
        }

        // Export
        this.exportBtn.addEventListener('click', () => this.showExportOptions());

        // Color picker
        this.componentColorPicker.addEventListener('change', (e) => this.handleColorChange(e));

        // Selection detection events
        document.addEventListener('selectionchange', () => this.handleSelectionChange());
        this.editorCanvas.addEventListener('click', (e) => this.handleEditorClick(e));

        // AI upload events
        this.aiUploadZone.addEventListener('click', () => this.pdfUploadInput.click());
        this.aiUploadZone.addEventListener('dragover', (e) => this.handleUploadDragOver(e));
        this.aiUploadZone.addEventListener('dragleave', (e) => this.handleUploadDragLeave(e));
        this.aiUploadZone.addEventListener('drop', (e) => this.handleUploadDrop(e));
        this.pdfUploadInput.addEventListener('change', (e) => this.handlePDFUpload(e.target.files[0]));

        // Toggle panel events
        if (this.toggleNodePanelBtn) {
            this.toggleNodePanelBtn.addEventListener('click', () => this.toggleNodePanel());
        }

        // Restore collapsed state from localStorage
        this.restoreNodePanelState();
    }

    // Node Navigation Methods
    addNewNode() {
        this.nodeCounter++;
        const nodeId = `N${String(this.nodeCounter).padStart(3, '0')}`;

        const nodeItem = document.createElement('div');
        nodeItem.className = 'node-item';
        nodeItem.dataset.nodeId = nodeId;
        nodeItem.innerHTML = `
            <div class="node-indicator"></div>
            <div class="node-info">
                <div class="node-id">${nodeId}</div>
                <div class="node-title">${nodeId}</div>
            </div>
            <div class="node-status empty"></div>
        `;

        this.nodeList.appendChild(nodeItem);
        this.selectNode(nodeId);
    }

    handleNodeClick(e) {
        const nodeItem = e.target.closest('.node-item');
        if (nodeItem) {
            const nodeId = nodeItem.dataset.nodeId;
            this.selectNode(nodeId);
        }
    }

    selectNode(nodeId) {
        // Remove active class from all nodes
        document.querySelectorAll('.node-item').forEach(item => {
            item.classList.remove('active');
        });

        // Add active class to selected node
        const selectedNodeItem = document.querySelector(`[data-node-id="${nodeId}"]`);
        if (selectedNodeItem) {
            selectedNodeItem.classList.add('active');
            this.selectedNode = nodeId;
            this.loadNodeContent(nodeId);
        }
    }

    async loadNodeContent(nodeId) {
        // Clear the editor canvas first
        this.clearEditor();

        try {
            // Fetch saved components for this node
            const response = await fetch(`${this.apiBaseUrl}/nodes/${nodeId}/components`);
            const data = await response.json();

            if (data.components && data.components.length > 0) {
                // Recreate each component in the editor
                data.components.forEach(componentData => {
                    const componentElement = this.createComponentElement(componentData.type, componentData.parameters);
                    this.dropZone.appendChild(componentElement);
                });
            }

            // Update placeholder visibility based on component count
            this.updateDropZonePlaceholders();
        } catch (error) {
            console.log(`No saved content found for node ${nodeId} or error loading:`, error);
        }

        this.updatePreview();
        console.log(`Loaded content for node: ${nodeId}`);
    }

    // Component Drag and Drop Methods
    handleComponentDragStart(e) {
        this.draggedComponent = e.target.dataset.componentType;
        e.dataTransfer.effectAllowed = 'copy';
        e.target.style.opacity = '0.5';
    }

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

    handleDragLeave(e) {
        e.preventDefault();
        this.dropZone.classList.remove('drag-over');
        this.hideInsertionIndicator();
    }

    handleDrop(e) {
        e.preventDefault();
        this.dropZone.classList.remove('drag-over');
        this.hideInsertionIndicator();

        if (this.draggedComponent) {
            this.addComponentToEditor(this.draggedComponent, this.dropInsertionTarget);
            this.draggedComponent = null;
            this.dropInsertionTarget = null;
        }

        // Reset opacity for all component items
        this.componentItems.forEach(item => {
            item.style.opacity = '1';
        });
    }

    addComponentToEditor(componentType, insertBeforeTarget = null) {
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

        // Update preview
        this.updatePreview();

        console.log(`Added ${componentType} component`);

        // Update component positions after adding
        this.updateComponentPositions();
    }

    createComponentElement(componentType, data = null, suggestionIndex = null) {
        const div = document.createElement('div');
        div.className = 'editor-component';
        div.dataset.componentType = componentType;

        switch (componentType) {
            case 'heading':
                div.innerHTML = `
                    <div class="component-header">
                        <h4>Heading</h4>
                        <button class="remove-component">×</button>
                    </div>
                    <div contenteditable="true" data-placeholder="Enter heading text..." class="component-input"></div>
                `;
                break;
            case 'paragraph':
                div.innerHTML = `
                    <div class="component-header">
                        <h4>Paragraph</h4>
                        <button class="remove-component">×</button>
                    </div>
                    <div contenteditable="true" data-placeholder="Enter paragraph text..." class="component-input component-textarea"></div>
                `;
                break;
            case 'definition':
                div.innerHTML = `
                    <div class="component-header">
                        <h4>Definition</h4>
                        <button class="remove-component">×</button>
                    </div>
                    <div contenteditable="true" data-placeholder="Term to define..." class="component-input"></div>
                    <div contenteditable="true" data-placeholder="Definition..." class="component-input component-textarea"></div>
                `;
                break;
            case 'step-sequence':
                div.innerHTML = `
                    <div class="component-header">
                        <h4>Step Sequence</h4>
                        <button class="remove-component">×</button>
                    </div>
                    <div class="step-list">
                        <div class="step-item">
                            <span class="step-number">1.</span>
                            <div contenteditable="true" data-placeholder="First step..." class="component-input"></div>
                        </div>
                    </div>
                    <button class="add-step">Add Step</button>
                `;
                break;
            case 'worked-example':
                div.innerHTML = `
                    <div class="component-header">
                        <h4>Worked Example</h4>
                        <button class="remove-component">×</button>
                    </div>
                    <div contenteditable="true" data-placeholder="Problem statement..." class="component-input"></div>
                    <div contenteditable="true" data-placeholder="Solution steps..." class="component-input component-textarea"></div>
                    <div contenteditable="true" data-placeholder="Final answer..." class="component-input"></div>
                `;
                break;
            case 'memory-trick':
                div.innerHTML = `
                    <div class="component-header">
                        <h4>Memory Trick</h4>
                        <button class="remove-component">×</button>
                    </div>
                    <div contenteditable="true" data-placeholder="Memory trick or mnemonic..." class="component-input component-textarea"></div>
                `;
                break;
            case 'four-pictures':
                div.innerHTML = `
                    <div class="component-header">
                        <h4>Four Pictures</h4>
                        <button class="remove-component">×</button>
                    </div>
                    <div class="four-pictures-grid">
                        <div class="picture-slot" data-slot="1">
                            <div class="image-upload-area">
                                <div class="upload-zone" data-slot="1">
                                    <i class="fas fa-cloud-upload-alt"></i>
                                    <p>Drop image here or click to upload</p>
                                </div>
                                <input type="file" class="image-input" accept="image/*" data-slot="1" style="display: none;">
                            </div>
                            <div contenteditable="true" data-placeholder="Image title..." class="picture-title component-input" data-slot="1"></div>
                            <div contenteditable="true" data-placeholder="Image description..." class="picture-body component-input component-textarea" data-slot="1"></div>
                        </div>
                        <div class="picture-slot" data-slot="2">
                            <div class="image-upload-area">
                                <div class="upload-zone" data-slot="2">
                                    <i class="fas fa-cloud-upload-alt"></i>
                                    <p>Drop image here or click to upload</p>
                                </div>
                                <input type="file" class="image-input" accept="image/*" data-slot="2" style="display: none;">
                            </div>
                            <div contenteditable="true" data-placeholder="Image title..." class="picture-title component-input" data-slot="2"></div>
                            <div contenteditable="true" data-placeholder="Image description..." class="picture-body component-input component-textarea" data-slot="2"></div>
                        </div>
                        <div class="picture-slot" data-slot="3">
                            <div class="image-upload-area">
                                <div class="upload-zone" data-slot="3">
                                    <i class="fas fa-cloud-upload-alt"></i>
                                    <p>Drop image here or click to upload</p>
                                </div>
                                <input type="file" class="image-input" accept="image/*" data-slot="3" style="display: none;">
                            </div>
                            <div contenteditable="true" data-placeholder="Image title..." class="picture-title component-input" data-slot="3"></div>
                            <div contenteditable="true" data-placeholder="Image description..." class="picture-body component-input component-textarea" data-slot="3"></div>
                        </div>
                        <div class="picture-slot" data-slot="4">
                            <div class="image-upload-area">
                                <div class="upload-zone" data-slot="4">
                                    <i class="fas fa-cloud-upload-alt"></i>
                                    <p>Drop image here or click to upload</p>
                                </div>
                                <input type="file" class="image-input" accept="image/*" data-slot="4" style="display: none;">
                            </div>
                            <div contenteditable="true" data-placeholder="Image title..." class="picture-title component-input" data-slot="4"></div>
                            <div contenteditable="true" data-placeholder="Image description..." class="picture-body component-input component-textarea" data-slot="4"></div>
                        </div>
                    </div>
                `;
                break;
            case 'three-pictures':
                div.innerHTML = `
                    <div class="component-header">
                        <h4>Three Pictures</h4>
                        <button class="remove-component">×</button>
                    </div>
                    <div class="three-pictures-grid">
                        <div class="picture-slot" data-slot="1">
                            <div class="image-upload-area">
                                <div class="upload-zone" data-slot="1">
                                    <i class="fas fa-cloud-upload-alt"></i>
                                    <p>Drop image here or click to upload</p>
                                </div>
                                <input type="file" class="image-input" accept="image/*" data-slot="1" style="display: none;">
                            </div>
                            <div contenteditable="true" data-placeholder="Image title..." class="picture-title component-input" data-slot="1"></div>
                            <div contenteditable="true" data-placeholder="Image description..." class="picture-body component-input component-textarea" data-slot="1"></div>
                        </div>
                        <div class="picture-slot" data-slot="2">
                            <div class="image-upload-area">
                                <div class="upload-zone" data-slot="2">
                                    <i class="fas fa-cloud-upload-alt"></i>
                                    <p>Drop image here or click to upload</p>
                                </div>
                                <input type="file" class="image-input" accept="image/*" data-slot="2" style="display: none;">
                            </div>
                            <div contenteditable="true" data-placeholder="Image title..." class="picture-title component-input" data-slot="2"></div>
                            <div contenteditable="true" data-placeholder="Image description..." class="picture-body component-input component-textarea" data-slot="2"></div>
                        </div>
                        <div class="picture-slot" data-slot="3">
                            <div class="image-upload-area">
                                <div class="upload-zone" data-slot="3">
                                    <i class="fas fa-cloud-upload-alt"></i>
                                    <p>Drop image here or click to upload</p>
                                </div>
                                <input type="file" class="image-input" accept="image/*" data-slot="3" style="display: none;">
                            </div>
                            <div contenteditable="true" data-placeholder="Image title..." class="picture-title component-input" data-slot="3"></div>
                            <div contenteditable="true" data-placeholder="Image description..." class="picture-body component-input component-textarea" data-slot="3"></div>
                        </div>
                    </div>
                `;
                break;
            case 'two-pictures':
                div.innerHTML = `
                    <div class="component-header">
                        <h4>Two Pictures</h4>
                        <button class="remove-component">×</button>
                    </div>
                    <div class="two-pictures-grid">
                        <div class="picture-slot" data-slot="1">
                            <div class="image-upload-area">
                                <div class="upload-zone" data-slot="1">
                                    <i class="fas fa-cloud-upload-alt"></i>
                                    <p>Drop image here or click to upload</p>
                                </div>
                                <input type="file" class="image-input" accept="image/*" data-slot="1" style="display: none;">
                            </div>
                            <div contenteditable="true" data-placeholder="Image title..." class="picture-title component-input" data-slot="1"></div>
                            <div contenteditable="true" data-placeholder="Image description..." class="picture-body component-input component-textarea" data-slot="1"></div>
                        </div>
                        <div class="picture-slot" data-slot="2">
                            <div class="image-upload-area">
                                <div class="upload-zone" data-slot="2">
                                    <i class="fas fa-cloud-upload-alt"></i>
                                    <p>Drop image here or click to upload</p>
                                </div>
                                <input type="file" class="image-input" accept="image/*" data-slot="2" style="display: none;">
                            </div>
                            <div contenteditable="true" data-placeholder="Image title..." class="picture-title component-input" data-slot="2"></div>
                            <div contenteditable="true" data-placeholder="Image description..." class="picture-body component-input component-textarea" data-slot="2"></div>
                        </div>
                    </div>
                `;
                break;
            case 'callout-box':
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
                break;
            case 'hero-number':
                div.innerHTML = `
                    <div class="component-header">
                        <h4>Hero Number</h4>
                        <button class="remove-component">×</button>
                    </div>
                    <select class="hero-visual-type component-select">
                        <option value="text">Text/Number</option>
                        <option value="image">Image</option>
                        <option value="pie-chart">Pie Chart</option>
                        <option value="bar-chart">Bar Chart</option>
                        <option value="fraction-circle">Fraction Circle</option>
                        <option value="svg">Custom SVG Code</option>
                    </select>
                    <select class="hero-background-style component-select">
                        <option value="purple">Purple Gradient</option>
                        <option value="blue">Blue Gradient</option>
                        <option value="green">Green Gradient</option>
                        <option value="orange">Orange Gradient</option>
                        <option value="red">Red Gradient</option>
                        <option value="dark">Dark Gradient</option>
                        <option value="light">Light Gradient</option>
                    </select>
                    <div class="hero-text-input-area" style="display: block;">
                        <div contenteditable="true" data-placeholder="Enter number or text (e.g., 3/4, 75%)" class="component-input hero-visual-content"></div>
                    </div>
                    <div class="hero-image-upload-area" style="display: none;">
                        <div class="upload-zone hero-upload-zone">
                            <i class="fas fa-cloud-upload-alt"></i>
                            <p>Drop image here or click to upload</p>
                        </div>
                        <input type="file" class="hero-image-input" accept="image/*" style="display: none;">
                    </div>
                    <div class="hero-pie-chart-input-area" style="display: none;">
                        <div style="display: flex; gap: 15px; margin-bottom: 10px;">
                            <div style="flex: 1;">
                                <label style="display: block; font-size: 0.85rem; color: #666; margin-bottom: 5px;">Numerator</label>
                                <input type="number" class="hero-pie-numerator component-input" placeholder="3" min="0" style="width: 100%;">
                            </div>
                            <div style="flex: 1;">
                                <label style="display: block; font-size: 0.85rem; color: #666; margin-bottom: 5px;">Denominator</label>
                                <input type="number" class="hero-pie-denominator component-input" placeholder="4" min="1" style="width: 100%;">
                            </div>
                        </div>
                    </div>
                    <div class="hero-bar-chart-input-area" style="display: none;">
                        <div style="display: flex; gap: 15px; margin-bottom: 10px;">
                            <div style="flex: 1;">
                                <label style="display: block; font-size: 0.85rem; color: #666; margin-bottom: 5px;">Current Value</label>
                                <input type="number" class="hero-bar-current component-input" placeholder="75" min="0" style="width: 100%;">
                            </div>
                            <div style="flex: 1;">
                                <label style="display: block; font-size: 0.85rem; color: #666; margin-bottom: 5px;">Maximum</label>
                                <input type="number" class="hero-bar-max component-input" placeholder="100" min="1" style="width: 100%;">
                            </div>
                        </div>
                    </div>
                    <div class="hero-fraction-circle-input-area" style="display: none;">
                        <div style="display: flex; gap: 15px; margin-bottom: 10px;">
                            <div style="flex: 1;">
                                <label style="display: block; font-size: 0.85rem; color: #666; margin-bottom: 5px;">Numerator</label>
                                <input type="number" class="hero-fraction-numerator component-input" placeholder="1" min="0" style="width: 100%;">
                            </div>
                            <div style="flex: 1;">
                                <label style="display: block; font-size: 0.85rem; color: #666; margin-bottom: 5px;">Denominator</label>
                                <input type="number" class="hero-fraction-denominator component-input" placeholder="2" min="1" style="width: 100%;">
                            </div>
                        </div>
                    </div>
                    <div class="hero-svg-input-area" style="display: none;">
                        <textarea class="hero-svg-code component-input" placeholder="Paste SVG code here...&#10;&#10;Example:&#10;&lt;svg width=&quot;200&quot; height=&quot;200&quot;&gt;&#10;  &lt;circle cx=&quot;100&quot; cy=&quot;100&quot; r=&quot;80&quot; fill=&quot;#667eea&quot;/&gt;&#10;&lt;/svg&gt;" rows="8"></textarea>
                    </div>
                    <div contenteditable="true" data-placeholder="Caption (optional)" class="component-input hero-caption"></div>
                `;
                break;
            default:
                div.innerHTML = `
                    <div class="component-header">
                        <h4>${componentType}</h4>
                        <button class="remove-component">×</button>
                    </div>
                    <input type="text" placeholder="Content..." class="component-input">
                `;
        }

        // Add reorder handle
        const componentHeader = div.querySelector('.component-header');
        const reorderHandle = document.createElement('div');
        reorderHandle.className = 'reorder-handle';
        reorderHandle.innerHTML = '<i class="fas fa-grip-vertical"></i>';
        componentHeader.appendChild(reorderHandle);

        // Add event listeners for remove button
        const removeBtn = div.querySelector('.remove-component');
        removeBtn.addEventListener('click', () => this.removeComponent(div));

        const inputs = div.querySelectorAll('.component-input');
        inputs.forEach(input => {
            input.addEventListener('input', () => {
                this.updatePreview();
                this.scheduleAutoSave();
            });
        });

        // Special handling for step sequence
        const addStepBtn = div.querySelector('.add-step');
        if (addStepBtn) {
            addStepBtn.addEventListener('click', () => this.addStep(div));
        }

        // Special handling for picture components
        if (componentType === 'four-pictures') {
            this.setupFourPicturesEvents(div);
        } else if (componentType === 'three-pictures') {
            this.setupThreePicturesEvents(div);
        } else if (componentType === 'two-pictures') {
            this.setupTwoPicturesEvents(div);
        }

        // Special handling for callout-box dropdown
        if (componentType === 'callout-box') {
            const typeDropdown = div.querySelector('.callout-type');
            if (typeDropdown) {
                typeDropdown.addEventListener('change', () => {
                    this.updatePreview();
                    this.scheduleAutoSave();
                });
            }
        }

        // Special handling for hero-number
        if (componentType === 'hero-number') {
            this.setupHeroNumberEvents(div);
        }


        // Add reordering event listeners
        this.setupReorderingEvents(div);

        // Populate with data if provided (AI suggestions)
        if (data) {
            this.populateComponentInputs(div, data);
        }

        return div;
    }

    // Component Factory System - Create components from AI sequence
    createComponentsFromSequence(componentSequence) {
        // Create and add each component from the sequence
        componentSequence.forEach((componentData, index) => {
            const componentElement = this.createComponentElement(componentData.type, componentData.parameters, index);
            this.applyColorToComponent(componentElement);
            this.dropZone.appendChild(componentElement);
        });

        // Update placeholder visibility
        this.updateDropZonePlaceholders();

        // Update preview and positions
        this.updatePreview();
        this.updateComponentPositions();
    }

    // AI Upload Handlers
    handleUploadDragOver(e) {
        e.preventDefault();
        this.aiUploadZone.classList.add('drag-over');
    }

    handleUploadDragLeave(e) {
        e.preventDefault();
        this.aiUploadZone.classList.remove('drag-over');
    }

    handleUploadDrop(e) {
        e.preventDefault();
        this.aiUploadZone.classList.remove('drag-over');
        const files = e.dataTransfer.files;
        if (files.length > 0 && files[0].type === 'application/pdf') {
            this.handlePDFUpload(files[0]);
        }
    }

    async handlePDFUpload(file) {
        if (!file || file.type !== 'application/pdf') {
            alert('Please select a PDF file');
            return;
        }

        // Show progress and start animation (keeping existing visual feedback)
        this.editorCanvas.classList.add('ai-processing');
        
        // Update AI upload text directly instead of hiding/showing elements
        this.aiUploadText.textContent = 'Starting PDF analysis...';

        try {
            const formData = new FormData();
            formData.append('file', file);

            // Use streaming endpoint for real-time progress
            const response = await fetch(`${this.apiBaseUrl}/nodes/${this.selectedNode}/analyze-pdf-vision-stream`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('Failed to start PDF analysis');
            }

            // Create EventSource-like reader for streaming response
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                
                if (done) {
                    break;
                }

                // Decode chunk and add to buffer
                buffer += decoder.decode(value, { stream: true });
                
                // Process complete lines
                let lines = buffer.split('\n');
                buffer = lines.pop(); // Keep incomplete line in buffer
                
                for (let line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.substring(6));
                            this.handleProgressUpdate(data);
                        } catch (e) {
                            console.log('Error parsing progress data:', e);
                        }
                    }
                }
            }

        } catch (error) {
            console.error('Error analyzing PDF:', error);
            this.aiUploadText.textContent = 'Analysis failed - please try again';
            alert('Failed to analyze PDF. Please try again.');
            // Stop animation after delay
            setTimeout(() => {
                this.aiUploadText.textContent = 'Drop PDF here for AI suggestions';
                this.editorCanvas.classList.remove('ai-processing');
            }, 2000);
        }
    }

    handleProgressUpdate(data) {
        // Update AI upload text directly instead of hidden progress text
        switch (data.status) {
            case 'started':
                this.aiUploadText.textContent = data.message || 'Starting analysis...';
                break;
            case 'processing':
                this.aiUploadText.textContent = data.message || `Processing page ${data.current_page}...`;
                break;
            case 'page_completed':
                this.aiUploadText.textContent = data.message || `Completed page ${data.current_page}`;
                break;
            case 'completed':
                this.aiUploadText.textContent = data.message || 'Analysis completed!';
                break;
            case 'completed_with_errors':
                this.aiUploadText.textContent = data.message || `Completed with some errors (${data.successful_pages}/${data.total_pages} successful)`;
                break;
            case 'page_error':
                this.aiUploadText.textContent = data.message || `Page ${data.current_page} failed - continuing...`;
                break;
            case 'batch_cleanup':
                if (data.memory_usage_mb) {
                    this.aiUploadText.textContent = data.message || `Memory cleanup - ${data.memory_usage_mb}MB used`;
                } else {
                    this.aiUploadText.textContent = data.message || 'Memory cleanup...';
                }
                break;
            case 'memory_warning':
                this.aiUploadText.textContent = data.message || 'High memory usage detected';
                break;
            case 'warning':
                this.aiUploadText.textContent = data.message || 'Processing warning';
                break;
            case 'finished':
                // Final result received
                this.aiUploadText.textContent = 'Processing complete - updating interface...';
                this.handleAIResponse(data.result);
                // Stop animation - success
                setTimeout(() => {
                    this.aiUploadText.textContent = 'Drop PDF here for AI suggestions';
                    this.editorCanvas.classList.remove('ai-processing');
                }, 1000);
                break;
            case 'error':
                this.aiUploadText.textContent = `Error: ${data.error}`;
                console.error('Analysis error:', data.error);
                // Stop animation after delay
                setTimeout(() => {
                    this.aiUploadText.textContent = 'Drop PDF here for AI suggestions';
                    this.editorCanvas.classList.remove('ai-processing');
                }, 3000);
                break;
            default:
                if (data.message) {
                    this.aiUploadText.textContent = data.message;
                }
        }
    }

    handleAIResponse(response) {
        if (response.component_sequence && response.component_sequence.length > 0) {
            // Create components directly from AI response
            this.createComponentsFromSequence(response.component_sequence);

            console.log(`AI generated ${response.component_sequence.length} components`);
        } else {
            alert('No content could be extracted from the PDF');
        }
    }

    // Populate component inputs with AI data
    populateComponentInputs(componentElement, data) {
        const componentType = componentElement.dataset.componentType;

        switch (componentType) {
            case 'heading':
            case 'paragraph':
            case 'memory-trick':
                if (data.text) {
                    const input = componentElement.querySelector('.component-input');
                    if (input) input.innerHTML = data.text;
                }
                break;

            case 'definition':
                if (data.term || data.definition) {
                    const inputs = componentElement.querySelectorAll('.component-input');
                    if (inputs[0] && data.term) inputs[0].innerHTML = data.term;
                    if (inputs[1] && data.definition) inputs[1].innerHTML = data.definition;
                }
                break;

            case 'step-sequence':
                if (data.steps && Array.isArray(data.steps)) {
                    const stepList = componentElement.querySelector('.step-list');
                    if (stepList) {
                        stepList.innerHTML = '';
                        data.steps.forEach((step, index) => {
                            const stepItem = document.createElement('div');
                            stepItem.className = 'step-item';
                            stepItem.innerHTML = `
                                <span class="step-number">${index + 1}.</span>
                                <div contenteditable="true" class="component-input">${step}</div>
                            `;
                            stepItem.querySelector('.component-input').addEventListener('input', () => this.updatePreview());
                            stepList.appendChild(stepItem);
                        });
                    }
                }
                break;

            case 'worked-example':
                if (data.problem || data.solution || data.answer) {
                    const inputs = componentElement.querySelectorAll('.component-input');
                    if (inputs[0] && data.problem) inputs[0].innerHTML = data.problem;
                    if (inputs[1] && data.solution) inputs[1].innerHTML = data.solution;
                    if (inputs[2] && data.answer) inputs[2].innerHTML = data.answer;
                }
                break;

            case 'four-pictures':
            case 'three-pictures':
            case 'two-pictures':
                if (data.pictures) {
                    Object.keys(data.pictures).forEach(imageKey => {
                        const imageData = data.pictures[imageKey];
                        const slot = imageKey.replace('image', '');

                        const titleInput = componentElement.querySelector(`.picture-title[data-slot="${slot}"]`);
                        const bodyInput = componentElement.querySelector(`.picture-body[data-slot="${slot}"]`);

                        if (titleInput && imageData.title) titleInput.innerHTML = imageData.title;
                        if (bodyInput && imageData.body) bodyInput.innerHTML = imageData.body;
                    });
                }
                break;

            case 'callout-box':
                if (data.text) {
                    const textInput = componentElement.querySelector('.component-input');
                    if (textInput) textInput.innerHTML = data.text;
                }
                if (data.style) {
                    const styleDropdown = componentElement.querySelector('.callout-type');
                    if (styleDropdown) styleDropdown.value = data.style;
                }
                break;

            case 'hero-number':
                const heroVisualType = data.visual_type || 'text';
                const typeDropdown = componentElement.querySelector('.hero-visual-type');
                if (typeDropdown) typeDropdown.value = heroVisualType;

                // Set background style
                const backgroundStyleDropdown = componentElement.querySelector('.hero-background-style');
                if (backgroundStyleDropdown && data.background_style) {
                    backgroundStyleDropdown.value = data.background_style;
                }

                // Get all input areas
                const textInputArea = componentElement.querySelector('.hero-text-input-area');
                const imageUploadArea = componentElement.querySelector('.hero-image-upload-area');
                const pieChartInputArea = componentElement.querySelector('.hero-pie-chart-input-area');
                const barChartInputArea = componentElement.querySelector('.hero-bar-chart-input-area');
                const fractionCircleInputArea = componentElement.querySelector('.hero-fraction-circle-input-area');
                const svgInputArea = componentElement.querySelector('.hero-svg-input-area');

                // DEFENSIVE: Hide all input areas first
                if (textInputArea) textInputArea.style.display = 'none';
                if (imageUploadArea) imageUploadArea.style.display = 'none';
                if (pieChartInputArea) pieChartInputArea.style.display = 'none';
                if (barChartInputArea) barChartInputArea.style.display = 'none';
                if (fractionCircleInputArea) fractionCircleInputArea.style.display = 'none';
                if (svgInputArea) svgInputArea.style.display = 'none';

                // Now show the correct input area and populate data
                if (heroVisualType === 'image') {
                    if (imageUploadArea) imageUploadArea.style.display = 'block';

                    // Populate image upload zone with saved image
                    if (data.visual_content) {
                        const uploadZone = componentElement.querySelector('.hero-upload-zone');
                        if (uploadZone) {
                            uploadZone.innerHTML = `
                                <img src="${this.apiBaseUrl}${data.visual_content}" alt="Hero image" style="width:100%;height:150px;object-fit:cover;border-radius:8px;" onerror="this.parentElement.innerHTML='<p style=color:red;>Image failed to load</p>';">
                                <div style="position:absolute;top:5px;right:5px;background:rgba(0,0,0,0.7);color:white;padding:4px 8px;border-radius:4px;font-size:12px;">✓ Uploaded</div>
                            `;
                            uploadZone.style.position = 'relative';
                            uploadZone.dataset.imageUrl = data.visual_content;
                        }
                    }
                } else if (heroVisualType === 'pie-chart') {
                    if (pieChartInputArea) pieChartInputArea.style.display = 'block';

                    // Populate pie chart inputs from chart_data
                    if (data.chart_data) {
                        const numeratorInput = componentElement.querySelector('.hero-pie-numerator');
                        const denominatorInput = componentElement.querySelector('.hero-pie-denominator');
                        if (numeratorInput) numeratorInput.value = data.chart_data.numerator || '';
                        if (denominatorInput) denominatorInput.value = data.chart_data.denominator || '';
                    }
                } else if (heroVisualType === 'bar-chart') {
                    if (barChartInputArea) barChartInputArea.style.display = 'block';

                    // Populate bar chart inputs from chart_data
                    if (data.chart_data) {
                        const currentInput = componentElement.querySelector('.hero-bar-current');
                        const maxInput = componentElement.querySelector('.hero-bar-max');
                        if (currentInput) currentInput.value = data.chart_data.current || '';
                        if (maxInput) maxInput.value = data.chart_data.maximum || '';
                    }
                } else if (heroVisualType === 'fraction-circle') {
                    if (fractionCircleInputArea) fractionCircleInputArea.style.display = 'block';

                    // Populate fraction circle inputs from chart_data
                    if (data.chart_data) {
                        const numeratorInput = componentElement.querySelector('.hero-fraction-numerator');
                        const denominatorInput = componentElement.querySelector('.hero-fraction-denominator');
                        if (numeratorInput) numeratorInput.value = data.chart_data.numerator || '';
                        if (denominatorInput) denominatorInput.value = data.chart_data.denominator || '';
                    }
                } else if (heroVisualType === 'svg') {
                    if (svgInputArea) svgInputArea.style.display = 'block';

                    // Populate SVG textarea
                    if (data.visual_content) {
                        const svgTextarea = componentElement.querySelector('.hero-svg-code');
                        if (svgTextarea) svgTextarea.value = data.visual_content;
                    }
                } else {
                    if (textInputArea) textInputArea.style.display = 'block';

                    // Populate text input
                    if (data.visual_content) {
                        const contentInput = componentElement.querySelector('.hero-visual-content');
                        if (contentInput) contentInput.innerHTML = data.visual_content;
                    }
                }

                // Populate caption (always visible)
                if (data.caption) {
                    const captionInput = componentElement.querySelector('.hero-caption');
                    if (captionInput) captionInput.innerHTML = data.caption;
                }
                break;
        }
    }

    removeComponent(componentElement) {
        componentElement.remove();

        // Update placeholder visibility
        this.updateDropZonePlaceholders();

        this.updatePreview();
        this.updateComponentPositions();
    }

    addStep(stepComponent) {
        const stepList = stepComponent.querySelector('.step-list');
        const stepCount = stepList.querySelectorAll('.step-item').length + 1;

        const stepItem = document.createElement('div');
        stepItem.className = 'step-item';
        stepItem.innerHTML = `
            <span class="step-number">${stepCount}.</span>
            <div contenteditable="true" data-placeholder="Next step..." class="component-input"></div>
        `;

        const input = stepItem.querySelector('.component-input');
        input.addEventListener('input', () => this.updatePreview());

        stepList.appendChild(stepItem);
    }

    setupFourPicturesEvents(component) {
        const uploadZones = component.querySelectorAll('.upload-zone');
        const imageInputs = component.querySelectorAll('.image-input');

        uploadZones.forEach((zone, index) => {
            const slot = zone.dataset.slot;
            const fileInput = component.querySelector(`.image-input[data-slot="${slot}"]`);

            // Click to upload
            zone.addEventListener('click', () => {
                fileInput.click();
            });

            // Drag and drop events
            zone.addEventListener('dragover', (e) => {
                e.preventDefault();
                zone.classList.add('drag-over');
            });

            zone.addEventListener('dragleave', (e) => {
                e.preventDefault();
                zone.classList.remove('drag-over');
            });

            zone.addEventListener('drop', (e) => {
                e.preventDefault();
                zone.classList.remove('drag-over');

                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    this.handleImageUpload(files[0], slot, component);
                }
            });

            // File input change
            fileInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    this.handleImageUpload(e.target.files[0], slot, component);
                }
            });
        });
    }

    setupThreePicturesEvents(component) {
        const uploadZones = component.querySelectorAll('.upload-zone');
        const imageInputs = component.querySelectorAll('.image-input');

        uploadZones.forEach((zone, index) => {
            const slot = zone.dataset.slot;
            const fileInput = component.querySelector(`.image-input[data-slot="${slot}"]`);

            // Click to upload
            zone.addEventListener('click', () => {
                fileInput.click();
            });

            // Drag and drop events
            zone.addEventListener('dragover', (e) => {
                e.preventDefault();
                zone.classList.add('drag-over');
            });

            zone.addEventListener('dragleave', (e) => {
                e.preventDefault();
                zone.classList.remove('drag-over');
            });

            zone.addEventListener('drop', (e) => {
                e.preventDefault();
                zone.classList.remove('drag-over');

                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    this.handleImageUpload(files[0], slot, component);
                }
            });

            // File input change
            fileInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    this.handleImageUpload(e.target.files[0], slot, component);
                }
            });
        });
    }

    setupTwoPicturesEvents(component) {
        const uploadZones = component.querySelectorAll('.upload-zone');
        const imageInputs = component.querySelectorAll('.image-input');

        uploadZones.forEach((zone, index) => {
            const slot = zone.dataset.slot;
            const fileInput = component.querySelector(`.image-input[data-slot="${slot}"]`);

            // Click to upload
            zone.addEventListener('click', () => {
                fileInput.click();
            });

            // Drag and drop events
            zone.addEventListener('dragover', (e) => {
                e.preventDefault();
                zone.classList.add('drag-over');
            });

            zone.addEventListener('dragleave', (e) => {
                e.preventDefault();
                zone.classList.remove('drag-over');
            });

            zone.addEventListener('drop', (e) => {
                e.preventDefault();
                zone.classList.remove('drag-over');

                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    this.handleImageUpload(files[0], slot, component);
                }
            });

            // File input change
            fileInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    this.handleImageUpload(e.target.files[0], slot, component);
                }
            });
        });
    }

    setupHeroNumberEvents(component) {
        const typeDropdown = component.querySelector('.hero-visual-type');
        const backgroundDropdown = component.querySelector('.hero-background-style');
        const textInputArea = component.querySelector('.hero-text-input-area');
        const imageUploadArea = component.querySelector('.hero-image-upload-area');
        const pieChartInputArea = component.querySelector('.hero-pie-chart-input-area');
        const barChartInputArea = component.querySelector('.hero-bar-chart-input-area');
        const fractionCircleInputArea = component.querySelector('.hero-fraction-circle-input-area');
        const svgInputArea = component.querySelector('.hero-svg-input-area');
        const uploadZone = component.querySelector('.hero-upload-zone');
        const fileInput = component.querySelector('.hero-image-input');
        const svgTextarea = component.querySelector('.hero-svg-code');

        // Toggle between all input types
        typeDropdown.addEventListener('change', () => {
            const selectedType = typeDropdown.value;

            // Hide all input areas first
            textInputArea.style.display = 'none';
            imageUploadArea.style.display = 'none';
            pieChartInputArea.style.display = 'none';
            barChartInputArea.style.display = 'none';
            fractionCircleInputArea.style.display = 'none';
            svgInputArea.style.display = 'none';

            // Show the appropriate input area
            if (selectedType === 'text') {
                textInputArea.style.display = 'block';
            } else if (selectedType === 'image') {
                imageUploadArea.style.display = 'block';
            } else if (selectedType === 'pie-chart') {
                pieChartInputArea.style.display = 'block';
            } else if (selectedType === 'bar-chart') {
                barChartInputArea.style.display = 'block';
            } else if (selectedType === 'fraction-circle') {
                fractionCircleInputArea.style.display = 'block';
            } else if (selectedType === 'svg') {
                svgInputArea.style.display = 'block';
            }

            this.updatePreview();
            this.scheduleAutoSave();
        });

        // Background style change
        backgroundDropdown.addEventListener('change', () => {
            this.updatePreview();
            this.scheduleAutoSave();
        });

        // Generator number inputs - update preview on change
        const pieNumerator = component.querySelector('.hero-pie-numerator');
        const pieDenominator = component.querySelector('.hero-pie-denominator');
        const barCurrent = component.querySelector('.hero-bar-current');
        const barMax = component.querySelector('.hero-bar-max');
        const fractionNumerator = component.querySelector('.hero-fraction-numerator');
        const fractionDenominator = component.querySelector('.hero-fraction-denominator');

        if (pieNumerator) {
            pieNumerator.addEventListener('input', () => {
                this.updatePreview();
                this.scheduleAutoSave();
            });
        }
        if (pieDenominator) {
            pieDenominator.addEventListener('input', () => {
                this.updatePreview();
                this.scheduleAutoSave();
            });
        }
        if (barCurrent) {
            barCurrent.addEventListener('input', () => {
                this.updatePreview();
                this.scheduleAutoSave();
            });
        }
        if (barMax) {
            barMax.addEventListener('input', () => {
                this.updatePreview();
                this.scheduleAutoSave();
            });
        }
        if (fractionNumerator) {
            fractionNumerator.addEventListener('input', () => {
                this.updatePreview();
                this.scheduleAutoSave();
            });
        }
        if (fractionDenominator) {
            fractionDenominator.addEventListener('input', () => {
                this.updatePreview();
                this.scheduleAutoSave();
            });
        }

        // SVG textarea change
        if (svgTextarea) {
            svgTextarea.addEventListener('input', () => {
                this.updatePreview();
                this.scheduleAutoSave();
            });
        }

        // Click to upload
        uploadZone.addEventListener('click', () => {
            fileInput.click();
        });

        // Drag and drop events
        uploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadZone.classList.add('drag-over');
        });

        uploadZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            uploadZone.classList.remove('drag-over');
        });

        uploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadZone.classList.remove('drag-over');

            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleHeroImageUpload(files[0], component);
            }
        });

        // File input change
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleHeroImageUpload(e.target.files[0], component);
            }
        });
    }

    async handleHeroImageUpload(file, component) {
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file');
            return;
        }

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch(`${this.apiBaseUrl}/upload-image`, {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                const result = await response.json();

                // Update the upload zone to show thumbnail
                const uploadZone = component.querySelector('.hero-upload-zone');
                uploadZone.innerHTML = `
                    <img src="${this.apiBaseUrl}${result.url}" alt="Uploaded image" style="width:100%;height:150px;object-fit:cover;border-radius:8px;">
                    <div style="position:absolute;top:5px;right:5px;background:rgba(0,0,0,0.7);color:white;padding:4px 8px;border-radius:4px;font-size:12px;">✓ Uploaded</div>
                `;
                uploadZone.style.position = 'relative';

                // Store the image URL in the upload zone for data extraction
                uploadZone.dataset.imageUrl = result.url;

                console.log('Hero image uploaded successfully:', result);

                // Update preview immediately after upload
                this.updatePreview();
                this.scheduleAutoSave();
            } else {
                throw new Error('Upload failed');
            }
        } catch (error) {
            console.error('Error uploading hero image:', error);
            alert('Failed to upload image');
        }
    }

    // SVG Generator Functions for Hero Number
    generatePieChartSVG(numerator, denominator) {
        // Default values if not provided
        const num = parseInt(numerator) || 3;
        const denom = parseInt(denominator) || 4;

        // Calculate percentage
        const percentage = (num / denom) * 100;

        // Donut/Ring chart settings
        const radius = 80;
        const strokeWidth = 48;
        const circumference = 2 * Math.PI * radius;
        const fillLength = (percentage / 100) * circumference;

        return `
            <svg width="300" height="300" viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stop-color="rgba(255, 255, 255, 0.98)" />
                        <stop offset="100%" stop-color="rgba(255, 255, 255, 0.92)" />
                    </linearGradient>
                    <filter id="ringShadow">
                        <feGaussianBlur in="SourceAlpha" stdDeviation="4"/>
                        <feOffset dx="0" dy="2" result="offsetblur"/>
                        <feComponentTransfer>
                            <feFuncA type="linear" slope="0.25"/>
                        </feComponentTransfer>
                        <feMerge>
                            <feMergeNode/>
                            <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                    </filter>
                    <filter id="glow">
                        <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                        <feMerge>
                            <feMergeNode in="coloredBlur"/>
                            <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                    </filter>
                </defs>

                <!-- Background ring (unfilled portion) -->
                <circle
                    cx="150"
                    cy="150"
                    r="${radius}"
                    fill="none"
                    stroke="rgba(255, 255, 255, 0.12)"
                    stroke-width="${strokeWidth}"
                    stroke-linecap="round" />

                <!-- Foreground ring (filled portion) -->
                <circle
                    cx="150"
                    cy="150"
                    r="${radius}"
                    fill="none"
                    stroke="url(#ringGrad)"
                    stroke-width="${strokeWidth}"
                    stroke-dasharray="${fillLength} ${circumference - fillLength}"
                    stroke-dashoffset="${circumference * 0.25}"
                    stroke-linecap="round"
                    transform="rotate(-90 150 150)"
                    filter="url(#ringShadow)" />

                <!-- Fraction text -->
                <text x="150" y="162" font-size="54" font-weight="700" fill="white" text-anchor="middle" font-family="Arial, sans-serif" style="text-shadow: 0 2px 10px rgba(0,0,0,0.3);">
                    ${num}/${denom}
                </text>
            </svg>
        `.trim();
    }

    generateBarChartSVG(current, maximum) {
        // Default values if not provided
        const curr = parseInt(current) || 75;
        const max = parseInt(maximum) || 100;

        // Calculate percentage
        const percentage = Math.min((curr / max) * 100, 100);
        const barHeight = (percentage / 100) * 140;

        return `
            <svg width="320" height="260" viewBox="0 0 320 260" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="barGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stop-color="rgba(255, 255, 255, 0.95)" />
                        <stop offset="100%" stop-color="rgba(255, 255, 255, 0.85)" />
                    </linearGradient>
                    <filter id="barShadow">
                        <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
                        <feOffset dx="0" dy="2" result="offsetblur"/>
                        <feComponentTransfer>
                            <feFuncA type="linear" slope="0.3"/>
                        </feComponentTransfer>
                        <feMerge>
                            <feMergeNode/>
                            <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                    </filter>
                </defs>

                <!-- Background bar -->
                <rect x="70" y="40" width="180" height="140" fill="rgba(255, 255, 255, 0.15)" rx="14" />

                <!-- Filled bar (from bottom up) -->
                <rect
                    x="70"
                    y="${180 - barHeight}"
                    width="180"
                    height="${barHeight}"
                    fill="url(#barGrad)"
                    rx="14"
                    filter="url(#barShadow)" />

                <!-- Value text -->
                <text x="160" y="215" font-size="42" font-weight="700" fill="white" text-anchor="middle" font-family="Arial, sans-serif" style="text-shadow: 0 2px 8px rgba(0,0,0,0.3);">
                    ${curr}/${max}
                </text>
            </svg>
        `.trim();
    }

    generateFractionCircleSVG(numerator, denominator) {
        // Default values if not provided
        const num = parseInt(numerator) || 1;
        const denom = parseInt(denominator) || 2;

        // Create circles divided into sections
        const circleRadius = 35;
        const spacing = 20;
        const totalWidth = denom * (circleRadius * 2) + (denom - 1) * spacing;
        const padding = 60;
        const svgWidth = Math.max(totalWidth + padding, 280);
        const svgHeight = 240;

        let circles = '';
        for (let i = 0; i < denom; i++) {
            const startX = (svgWidth - totalWidth) / 2;
            const cx = startX + circleRadius + i * (circleRadius * 2 + spacing);
            const filled = i < num;

            const fillId = `circleFill${i}`;
            const gradientDef = filled ? `
                <radialGradient id="${fillId}">
                    <stop offset="0%" stop-color="rgba(255, 255, 255, 0.98)" />
                    <stop offset="100%" stop-color="rgba(255, 255, 255, 0.88)" />
                </radialGradient>
            ` : '';

            circles = gradientDef + circles;

            circles += `
                <circle
                    cx="${cx}"
                    cy="100"
                    r="${circleRadius}"
                    fill="${filled ? `url(#${fillId})` : 'rgba(255, 255, 255, 0.15)'}"
                    stroke="rgba(255, 255, 255, ${filled ? '0.4' : '0.25'})"
                    stroke-width="3"
                    filter="${filled ? 'url(#circleShadow)' : 'none'}" />
            `;
        }

        return `
            <svg width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    ${circles}
                    <filter id="circleShadow">
                        <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
                        <feOffset dx="0" dy="2" result="offsetblur"/>
                        <feComponentTransfer>
                            <feFuncA type="linear" slope="0.3"/>
                        </feComponentTransfer>
                        <feMerge>
                            <feMergeNode/>
                            <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                    </filter>
                </defs>

                ${circles.split('</radialGradient>').pop()}

                <!-- Fraction text -->
                <text x="${svgWidth / 2}" y="185" font-size="44" font-weight="700" fill="white" text-anchor="middle" font-family="Arial, sans-serif" style="text-shadow: 0 2px 8px rgba(0,0,0,0.3);">
                    ${num}/${denom}
                </text>
            </svg>
        `.trim();
    }

    async handleImageUpload(file, slot, component) {
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file');
            return;
        }

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch(`${this.apiBaseUrl}/upload-image`, {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                const result = await response.json();

                // Update the upload zone to show thumbnail
                const uploadZone = component.querySelector(`.upload-zone[data-slot="${slot}"]`);
                uploadZone.innerHTML = `
                    <img src="http://localhost:8001${result.url}" alt="Uploaded image" style="width:100%;height:100%;object-fit:cover;border-radius:var(--border-radius-small);">
                    <div style="position:absolute;top:5px;right:5px;background:rgba(0,0,0,0.7);color:white;padding:2px 6px;border-radius:4px;font-size:12px;">✓</div>
                `;
                uploadZone.style.position = 'relative';

                // Store the file path in the component for later data extraction
                uploadZone.dataset.imagePath = result.file_path;
                uploadZone.dataset.imageUrl = result.url;

                console.log('Image uploaded successfully:', result);

                // Update preview immediately after upload
                this.updatePreview();
            } else {
                throw new Error('Upload failed');
            }
        } catch (error) {
            console.error('Error uploading image:', error);
            alert('Failed to upload image');
        }
    }


    clearEditor() {
        const components = this.dropZone.querySelectorAll('.editor-component');
        components.forEach(component => component.remove());

        // Update placeholder visibility
        this.updateDropZonePlaceholders();
    }

    // Preview Methods
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

    generatePreviewHTML(component) {
        const componentType = component.dataset.componentType;

        // Extract component styling
        const componentStyle = this.extractComponentStyle(component);

        switch (componentType) {
            case 'heading':
                const headingText = component.querySelector('.component-input').innerHTML || 'Heading';
                return `<h2 class="preview-heading" style="${componentStyle}">${this.formatTextForPreview(headingText)}</h2>`;

            case 'paragraph':
                const paragraphText = component.querySelector('.component-input').innerHTML || 'Paragraph text';
                return `<p class="preview-paragraph" style="${componentStyle}">${this.formatTextForPreview(paragraphText)}</p>`;

            case 'definition':
                const inputs = component.querySelectorAll('.component-input');
                const term = inputs[0].innerHTML || 'Term';
                const definition = inputs[1].innerHTML || 'Definition';
                return `
                    <div class="preview-definition" style="${componentStyle}">
                        <strong>${this.formatTextForPreview(term)}:</strong> ${this.formatTextForPreview(definition)}
                    </div>
                `;

            case 'step-sequence':
                const steps = component.querySelectorAll('.step-item .component-input');
                let stepsHTML = `<ol class="preview-steps" style="${componentStyle}">`;
                steps.forEach(step => {
                    const stepText = step.innerHTML || 'Step';
                    stepsHTML += `<li>${this.formatTextForPreview(stepText)}</li>`;
                });
                stepsHTML += '</ol>';
                return stepsHTML;

            case 'worked-example':
                const exampleInputs = component.querySelectorAll('.component-input');
                const problem = exampleInputs[0].innerHTML || 'Problem';
                const solution = exampleInputs[1].innerHTML || 'Solution';
                const answer = exampleInputs[2].innerHTML || 'Answer';
                return `
                    <div class="preview-example" style="${componentStyle}">
                        <div class="example-problem"><strong>Problem:</strong> ${this.formatTextForPreview(problem)}</div>
                        <div class="example-solution"><strong>Solution:</strong> ${this.formatTextForPreview(solution)}</div>
                        <div class="example-answer"><strong>Answer:</strong> ${this.formatTextForPreview(answer)}</div>
                    </div>
                `;

            case 'memory-trick':
                const trickText = component.querySelector('.component-input').innerHTML || 'Memory trick';
                return `<div class="preview-memory-trick" style="${componentStyle}">💡 ${this.formatTextForPreview(trickText)}</div>`;

            case 'callout-box':
                const calloutText = component.querySelector('.component-input')?.innerHTML || 'Callout text';
                const calloutStyle = component.querySelector('.callout-type')?.value || 'info';
                const iconMap = {
                    'info': 'ℹ️',
                    'tip': '💡',
                    'warning': '⚠️',
                    'important': '❗'
                };
                const icon = iconMap[calloutStyle] || 'ℹ️';
                return `
                    <div class="preview-callout-box preview-callout-${calloutStyle}" style="${componentStyle}">
                        <span class="callout-icon">${icon}</span>
                        <div class="callout-text">${this.formatTextForPreview(calloutText)}</div>
                    </div>
                `;

            case 'hero-number':
                const visualContent = component.querySelector('.hero-visual-content')?.innerHTML || '0';
                const caption = component.querySelector('.hero-caption')?.innerHTML || '';
                const visualType = component.querySelector('.hero-visual-type')?.value || 'text';
                const backgroundStyle = component.querySelector('.hero-background-style')?.value || 'purple';
                const uploadZone = component.querySelector('.hero-upload-zone');
                const svgTextarea = component.querySelector('.hero-svg-code');

                let heroVisualHTML = '';
                if (visualType === 'text') {
                    heroVisualHTML = `<div class="hero-number-large">${this.formatTextForPreview(visualContent)}</div>`;
                } else if (visualType === 'image') {
                    const imageUrl = uploadZone?.dataset.imageUrl;
                    if (imageUrl) {
                        heroVisualHTML = `<img src="${this.apiBaseUrl}${imageUrl}" alt="Hero image" class="hero-preview-image" onerror="this.src=''; this.alt='Image failed to load';">`;
                    } else {
                        heroVisualHTML = `<div class="hero-placeholder">Click to upload image</div>`;
                    }
                } else if (visualType === 'pie-chart') {
                    const numerator = component.querySelector('.hero-pie-numerator')?.value;
                    const denominator = component.querySelector('.hero-pie-denominator')?.value;
                    const generatedSVG = this.generatePieChartSVG(numerator, denominator);
                    heroVisualHTML = `<div class="hero-svg-container">${generatedSVG}</div>`;
                } else if (visualType === 'bar-chart') {
                    const current = component.querySelector('.hero-bar-current')?.value;
                    const maximum = component.querySelector('.hero-bar-max')?.value;
                    const generatedSVG = this.generateBarChartSVG(current, maximum);
                    heroVisualHTML = `<div class="hero-svg-container">${generatedSVG}</div>`;
                } else if (visualType === 'fraction-circle') {
                    const numerator = component.querySelector('.hero-fraction-numerator')?.value;
                    const denominator = component.querySelector('.hero-fraction-denominator')?.value;
                    const generatedSVG = this.generateFractionCircleSVG(numerator, denominator);
                    heroVisualHTML = `<div class="hero-svg-container">${generatedSVG}</div>`;
                } else if (visualType === 'svg') {
                    const svgCode = svgTextarea?.value || '';
                    if (svgCode && svgCode.trim().length > 0) {
                        heroVisualHTML = `<div class="hero-svg-container">${svgCode}</div>`;
                    } else {
                        heroVisualHTML = `<div class="hero-placeholder">Paste SVG code above</div>`;
                    }
                }

                return `
                    <div class="preview-hero-number preview-hero-bg-${backgroundStyle}">
                        ${heroVisualHTML}
                        ${caption ? `<p class="hero-caption">${this.formatTextForPreview(caption)}</p>` : ''}
                    </div>
                `;

            case 'four-pictures':
                let fourPicturesHTML = '<div class="preview-four-pictures">';
                for (let i = 1; i <= 4; i++) {
                    const titleInput = component.querySelector(`.picture-title[data-slot="${i}"]`);
                    const bodyInput = component.querySelector(`.picture-body[data-slot="${i}"]`);
                    const uploadZone = component.querySelector(`.upload-zone[data-slot="${i}"]`);

                    const title = titleInput ? titleInput.innerHTML || `Image ${i} Title` : `Image ${i} Title`;
                    const body = bodyInput ? bodyInput.innerHTML || `Image ${i} description` : `Image ${i} description`;
                    const hasImage = uploadZone && uploadZone.dataset.imagePath;

                    fourPicturesHTML += `
                        <div class="preview-picture-item">
                            <div class="preview-image-placeholder ${hasImage ? 'has-image' : ''}">
                                ${hasImage ?
                                    `<img src="http://localhost:8001${uploadZone.dataset.imageUrl}" alt="${title}" style="width:100%;height:100%;object-fit:cover;border-radius:var(--border-radius-small);">` :
                                    '<i class="fas fa-image"></i>'
                                }
                            </div>
                            <h4 class="preview-picture-title">${this.formatTextForPreview(title)}</h4>
                            <p class="preview-picture-body">${this.formatTextForPreview(body)}</p>
                        </div>
                    `;
                }
                fourPicturesHTML += '</div>';
                return fourPicturesHTML;

            case 'three-pictures':
                let threePicturesHTML = '<div class="preview-three-pictures">';
                for (let i = 1; i <= 3; i++) {
                    const titleInput = component.querySelector(`.picture-title[data-slot="${i}"]`);
                    const bodyInput = component.querySelector(`.picture-body[data-slot="${i}"]`);
                    const uploadZone = component.querySelector(`.upload-zone[data-slot="${i}"]`);

                    const title = titleInput ? titleInput.innerHTML || `Image ${i} Title` : `Image ${i} Title`;
                    const body = bodyInput ? bodyInput.innerHTML || `Image ${i} description` : `Image ${i} description`;
                    const hasImage = uploadZone && uploadZone.dataset.imagePath;

                    threePicturesHTML += `
                        <div class="preview-picture-item">
                            <div class="preview-image-placeholder ${hasImage ? 'has-image' : ''}">
                                ${hasImage ?
                                    `<img src="http://localhost:8001${uploadZone.dataset.imageUrl}" alt="${title}" style="width:100%;height:100%;object-fit:cover;border-radius:var(--border-radius-small);">` :
                                    '<i class="fas fa-image"></i>'
                                }
                            </div>
                            <h4 class="preview-picture-title">${this.formatTextForPreview(title)}</h4>
                            <p class="preview-picture-body">${this.formatTextForPreview(body)}</p>
                        </div>
                    `;
                }
                threePicturesHTML += '</div>';
                return threePicturesHTML;

            case 'two-pictures':
                let twoPicturesHTML = '<div class="preview-two-pictures">';
                for (let i = 1; i <= 2; i++) {
                    const titleInput = component.querySelector(`.picture-title[data-slot="${i}"]`);
                    const bodyInput = component.querySelector(`.picture-body[data-slot="${i}"]`);
                    const uploadZone = component.querySelector(`.upload-zone[data-slot="${i}"]`);

                    const title = titleInput ? titleInput.innerHTML || `Image ${i} Title` : `Image ${i} Title`;
                    const body = bodyInput ? bodyInput.innerHTML || `Image ${i} description` : `Image ${i} description`;
                    const hasImage = uploadZone && uploadZone.dataset.imagePath;

                    twoPicturesHTML += `
                        <div class="preview-picture-item">
                            <div class="preview-image-placeholder ${hasImage ? 'has-image' : ''}">
                                ${hasImage ?
                                    `<img src="http://localhost:8001${uploadZone.dataset.imageUrl}" alt="${title}" style="width:100%;height:100%;object-fit:cover;border-radius:var(--border-radius-small);">` :
                                    '<i class="fas fa-image"></i>'
                                }
                            </div>
                            <h4 class="preview-picture-title">${this.formatTextForPreview(title)}</h4>
                            <p class="preview-picture-body">${this.formatTextForPreview(body)}</p>
                        </div>
                    `;
                }
                twoPicturesHTML += '</div>';
                return twoPicturesHTML;

            default:
                return `<div class="preview-component">${componentType} content</div>`;
        }
    }

    extractComponentStyle(component) {
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

    openStudentView() {
        // Open student view in new tab with current node ID
        const url = `student-view.html?nodeId=${this.selectedNode}`;
        window.open(url, '_blank');
        console.log(`Opening student view for node: ${this.selectedNode}`);
    }

    showExportOptions() {
        const formats = ['JSON', 'HTML', 'Markdown'];
        const format = prompt(`Choose export format:\n${formats.map((f, i) => `${i+1}. ${f}`).join('\n')}`);

        if (format && format >= 1 && format <= 3) {
            this.exportNodeContent(formats[format - 1].toLowerCase());
        }
    }

    exportNodeContent(format) {
        const components = this.dropZone.querySelectorAll('.editor-component');
        const nodeData = {
            nodeId: this.selectedNode,
            components: Array.from(components).map(c => this.extractComponentData(c))
        };

        let content, filename, mimeType;

        switch (format) {
            case 'json':
                content = JSON.stringify(nodeData, null, 2);
                filename = `${this.selectedNode}_content.json`;
                mimeType = 'application/json';
                break;
            case 'html':
                content = this.previewContent.innerHTML;
                filename = `${this.selectedNode}_content.html`;
                mimeType = 'text/html';
                break;
            case 'markdown':
                content = this.generateContentForTemplate(components);
                filename = `${this.selectedNode}_content.md`;
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

        console.log(`Exported ${format.toUpperCase()} content for ${this.selectedNode}`);
    }

    getNodeTitle() {
        const selectedNodeItem = document.querySelector(`[data-node-id="${this.selectedNode}"]`);
        if (selectedNodeItem) {
            const titleElement = selectedNodeItem.querySelector('.node-title');
            return titleElement ? titleElement.textContent : this.selectedNode;
        }
        return this.selectedNode;
    }

    generateLegacyPreview(components) {
        // Fallback to original preview method
        let previewHTML = '';
        components.forEach(component => {
            previewHTML += this.generatePreviewHTML(component);
        });
        return previewHTML;
    }

    changePreviewDevice(e) {
        const device = e.target.value;
        const previewFrame = document.querySelector('.preview-frame');

        // Remove existing device classes
        previewFrame.classList.remove('device-desktop', 'device-tablet', 'device-mobile');

        // Add new device class
        previewFrame.classList.add(`device-${device}`);

        console.log(`Changed preview to ${device} view`);
    }

    // Save Methods
    saveNode() {
        // Trigger immediate auto-save
        if (this.autoSaveTimeout) {
            clearTimeout(this.autoSaveTimeout);
        }

        // Perform save immediately
        this.performAutoSave();

        // Update node status to draft
        const nodeItem = document.querySelector(`[data-node-id="${this.selectedNode}"]`);
        if (nodeItem) {
            const statusIndicator = nodeItem.querySelector('.node-status');
            statusIndicator.className = 'node-status draft';
        }

        console.log('Manual save triggered for node:', this.selectedNode);
    }

    extractComponentData(component) {
        const componentType = component.dataset.componentType;
        const data = { type: componentType };

        switch (componentType) {
            case 'heading':
                data.text = component.querySelector('.component-input').innerHTML;
                break;
            case 'paragraph':
                data.text = component.querySelector('.component-input').innerHTML;
                break;
            case 'definition':
                const inputs = component.querySelectorAll('.component-input');
                data.term = inputs[0].innerHTML;
                data.definition = inputs[1].innerHTML;
                break;
            case 'step-sequence':
                const steps = component.querySelectorAll('.step-item .component-input');
                data.steps = Array.from(steps).map(step => step.innerHTML);
                break;
            case 'worked-example':
                const exampleInputs = component.querySelectorAll('.component-input');
                data.problem = exampleInputs[0].innerHTML;
                data.solution = exampleInputs[1].innerHTML;
                data.answer = exampleInputs[2].innerHTML;
                break;
            case 'memory-trick':
                data.text = component.querySelector('.component-input').innerHTML;
                break;
            case 'callout-box':
                data.text = component.querySelector('.component-input')?.innerHTML || '';
                data.style = component.querySelector('.callout-type')?.value || 'info';
                break;
            case 'hero-number':
                data.visual_type = component.querySelector('.hero-visual-type')?.value || 'text';
                data.background_style = component.querySelector('.hero-background-style')?.value || 'purple';

                // Extract visual_content and generator data based on type
                if (data.visual_type === 'image') {
                    const uploadZone = component.querySelector('.hero-upload-zone');
                    data.visual_content = uploadZone?.dataset.imageUrl || '';
                } else if (data.visual_type === 'pie-chart') {
                    const numerator = component.querySelector('.hero-pie-numerator')?.value;
                    const denominator = component.querySelector('.hero-pie-denominator')?.value;
                    data.chart_data = { numerator, denominator };
                    data.visual_content = this.generatePieChartSVG(numerator, denominator);
                } else if (data.visual_type === 'bar-chart') {
                    const current = component.querySelector('.hero-bar-current')?.value;
                    const maximum = component.querySelector('.hero-bar-max')?.value;
                    data.chart_data = { current, maximum };
                    data.visual_content = this.generateBarChartSVG(current, maximum);
                } else if (data.visual_type === 'fraction-circle') {
                    const numerator = component.querySelector('.hero-fraction-numerator')?.value;
                    const denominator = component.querySelector('.hero-fraction-denominator')?.value;
                    data.chart_data = { numerator, denominator };
                    data.visual_content = this.generateFractionCircleSVG(numerator, denominator);
                } else if (data.visual_type === 'svg') {
                    const svgTextarea = component.querySelector('.hero-svg-code');
                    data.visual_content = svgTextarea?.value || '';
                } else {
                    data.visual_content = component.querySelector('.hero-visual-content')?.innerHTML || '';
                }

                data.caption = component.querySelector('.hero-caption')?.innerHTML || '';
                break;
            case 'four-pictures':
                data.pictures = {};
                for (let i = 1; i <= 4; i++) {
                    const titleInput = component.querySelector(`.picture-title[data-slot="${i}"]`);
                    const bodyInput = component.querySelector(`.picture-body[data-slot="${i}"]`);
                    const uploadZone = component.querySelector(`.upload-zone[data-slot="${i}"]`);

                    data.pictures[`image${i}`] = {
                        title: titleInput ? titleInput.innerHTML : '',
                        body: bodyInput ? bodyInput.innerHTML : '',
                        imagePath: uploadZone ? uploadZone.dataset.imagePath : '',
                        imageUrl: uploadZone ? uploadZone.dataset.imageUrl : ''
                    };
                }
                break;
            case 'three-pictures':
                data.pictures = {};
                for (let i = 1; i <= 3; i++) {
                    const titleInput = component.querySelector(`.picture-title[data-slot="${i}"]`);
                    const bodyInput = component.querySelector(`.picture-body[data-slot="${i}"]`);
                    const uploadZone = component.querySelector(`.upload-zone[data-slot="${i}"]`);

                    data.pictures[`image${i}`] = {
                        title: titleInput ? titleInput.innerHTML : '',
                        body: bodyInput ? bodyInput.innerHTML : '',
                        imagePath: uploadZone ? uploadZone.dataset.imagePath : '',
                        imageUrl: uploadZone ? uploadZone.dataset.imageUrl : ''
                    };
                }
                break;
            case 'two-pictures':
                data.pictures = {};
                for (let i = 1; i <= 2; i++) {
                    const titleInput = component.querySelector(`.picture-title[data-slot="${i}"]`);
                    const bodyInput = component.querySelector(`.picture-body[data-slot="${i}"]`);
                    const uploadZone = component.querySelector(`.upload-zone[data-slot="${i}"]`);

                    data.pictures[`image${i}`] = {
                        title: titleInput ? titleInput.innerHTML : '',
                        body: bodyInput ? bodyInput.innerHTML : '',
                        imagePath: uploadZone ? uploadZone.dataset.imagePath : '',
                        imageUrl: uploadZone ? uploadZone.dataset.imageUrl : ''
                    };
                }
                break;
            default:
                data.content = component.querySelector('.component-input')?.innerHTML || '';
        }

        return data;
    }

    // Node Panel Toggle Methods
    toggleNodePanel() {
        // Toggle state
        this.isNodePanelCollapsed = !this.isNodePanelCollapsed;

        // Toggle CSS class on layout
        const editorLayout = document.querySelector('.editor-layout');
        if (editorLayout) {
            editorLayout.classList.toggle('nodes-collapsed', this.isNodePanelCollapsed);
        }

        // Update button title
        if (this.toggleNodePanelBtn) {
            this.toggleNodePanelBtn.title = this.isNodePanelCollapsed ? 'Expand panel' : 'Collapse panel';
        }

        // Save state to localStorage
        localStorage.setItem('nodesPanelCollapsed', this.isNodePanelCollapsed);

        console.log(`Node panel ${this.isNodePanelCollapsed ? 'collapsed' : 'expanded'}`);
    }

    restoreNodePanelState() {
        // Check localStorage for saved state
        const savedState = localStorage.getItem('nodesPanelCollapsed');

        if (savedState === 'true') {
            this.isNodePanelCollapsed = true;
            const editorLayout = document.querySelector('.editor-layout');
            if (editorLayout) {
                editorLayout.classList.add('nodes-collapsed');
            }
            if (this.toggleNodePanelBtn) {
                this.toggleNodePanelBtn.title = 'Expand panel';
            }
        }
    }

    // Visual Insertion Indicator Methods
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

    hideInsertionIndicator() {
        if (this.insertionIndicator && this.insertionIndicator.parentNode) {
            this.insertionIndicator.remove();
        }
    }

    // Smooth Drag and Drop Reordering Methods
    setupReorderingEvents(componentElement) {
        const reorderHandle = componentElement.querySelector('.reorder-handle');

        reorderHandle.addEventListener('mousedown', (e) => this.handleReorderStart(e, componentElement));

        // Touch events for mobile
        reorderHandle.addEventListener('touchstart', (e) => this.handleReorderStart(e, componentElement), { passive: false });
    }

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

    // Helper method to manage drop zone placeholder visibility
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

    performReorder() {
        if (!this.dropPlaceholder || !this.draggedElement) return;

        // Insert the dragged element at the placeholder position
        this.dropZone.insertBefore(this.draggedElement, this.dropPlaceholder);

        // Update preview to reflect new order
        this.updatePreview();
    }

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

    // Text Formatting Methods
    formatTextForPreview(text) {
        if (!text) return text;

        // Convert data attributes to inline styles for preview
        let processedText = text;

        // Handle data-text-color attributes by converting to inline styles
        processedText = processedText.replace(
            /<span data-text-color="([^"]+)"([^>]*)>(.*?)<\/span>/g,
            (match, colorName, otherAttrs, content) => {
                const colorMap = {
                    'neutral': '#333333',
                    'light-blue': '#1976D2',
                    'soft-green': '#388E3C',
                    'pale-yellow': '#F57F17',
                    'light-pink': '#C2185B',
                    'lavender': '#7B1FA2'
                };
                const color = colorMap[colorName] || colorMap['neutral'];
                return `<span style="color: ${color};"${otherAttrs}>${content}</span>`;
            }
        );

        // Convert markdown-style formatting to HTML while preserving existing styles
        return processedText
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')  // Bold: **text** -> <strong>text</strong>
            .replace(/\*(.*?)\*/g, '<em>$1</em>');             // Italic: *text* -> <em>text</em>
    }

    initializeTextFormatting() {
        this.currentActiveInput = null;
        this.showTextToolbar = false;

        // Add focus/blur event listeners to all contentEditable elements
        document.addEventListener('click', (e) => {
            if (e.target.matches('.component-input[contenteditable="true"]')) {
                this.handleTextInputFocus(e.target);
            } else {
                this.handleTextInputBlur();
            }
        });

        // Format button event listeners
        if (this.boldBtn) {
            this.boldBtn.addEventListener('click', () => this.applyTextFormatting('bold'));
        }
        if (this.italicBtn) {
            this.italicBtn.addEventListener('click', () => this.applyTextFormatting('italic'));
        }

        // Font size selector event listener
        if (this.fontSizeSelector) {
            this.fontSizeSelector.addEventListener('change', () => this.applyFontSize());
        }

        // Size up/down button event listeners
        if (this.sizeUpBtn) {
            this.sizeUpBtn.addEventListener('click', () => this.increaseFontSize());
        }
        if (this.sizeDownBtn) {
            this.sizeDownBtn.addEventListener('click', () => this.decreaseFontSize());
        }
    }

    handleTextInputFocus(input) {
        this.currentActiveInput = input;
        this.showTextFormattingToolbar();
        this.updateFormattingButtonStates();
    }

    handleTextInputBlur() {
        // Keep toolbar permanently visible - don't hide it
        // Just update the current active input tracking
        setTimeout(() => {
            if (!document.activeElement.closest('.text-formatting-toolbar')) {
                // Keep toolbar visible, just clear the active input if no text is focused
                if (!document.activeElement.matches('.component-input[contenteditable="true"]')) {
                    this.currentActiveInput = null;
                }
            }
        }, 100);
    }

    showTextFormattingToolbar() {
        if (this.textFormattingToolbar) {
            this.textFormattingToolbar.style.display = 'block';
        }
    }

    hideTextFormattingToolbar() {
        if (this.textFormattingToolbar) {
            this.textFormattingToolbar.style.display = 'none';
        }
    }

    applyTextFormatting(format) {
        if (!this.currentActiveInput) return;

        const element = this.currentActiveInput;

        // Focus the element to ensure proper selection
        element.focus();

        // Check if we have a selection
        const selection = window.getSelection();
        if (selection.rangeCount === 0) return;

        // Apply formatting using execCommand
        try {
            if (format === 'bold') {
                document.execCommand('bold', false, null);
            } else if (format === 'italic') {
                document.execCommand('italic', false, null);
            }

            // Trigger input event to update preview
            element.dispatchEvent(new Event('input', { bubbles: true }));
        } catch (error) {
            console.error('Error applying formatting:', error);
        }

        this.updateFormattingButtonStates();
    }

    applyFontSize() {
        if (!this.currentActiveInput || !this.fontSizeSelector) return;

        const fontSize = this.fontSizeSelector.value;
        const element = this.currentActiveInput;

        try {
            // Apply font size to the entire contenteditable element
            element.style.fontSize = fontSize + 'px';

            // Trigger input event to update preview
            element.dispatchEvent(new Event('input', { bubbles: true }));

            console.log(`Applied font size: ${fontSize}px to element`);
        } catch (error) {
            console.error('Error applying font size:', error);
        }
    }

    updateFormattingButtonStates() {
        if (!this.currentActiveInput) return;

        // Ensure the element is focused for queryCommandState to work
        this.currentActiveInput.focus();

        try {
            // Check current formatting state using queryCommandState
            const isBold = document.queryCommandState('bold');
            const isItalic = document.queryCommandState('italic');

            // Update button states
            if (this.boldBtn) {
                this.boldBtn.classList.toggle('active', isBold);
            }
            if (this.italicBtn) {
                this.italicBtn.classList.toggle('active', isItalic);
            }

            // Update font size selector to match current element
            this.updateFontSizeSelector();
        } catch (error) {
            console.error('Error checking formatting state:', error);
        }
    }

    increaseFontSize() {
        if (!this.currentActiveInput || !this.fontSizeSelector) return;

        const currentIndex = this.fontSizeSelector.selectedIndex;
        const options = this.fontSizeSelector.options;

        // Move to next larger size if available
        if (currentIndex < options.length - 1) {
            this.fontSizeSelector.selectedIndex = currentIndex + 1;
            this.applyFontSize();
        }
    }

    decreaseFontSize() {
        if (!this.currentActiveInput || !this.fontSizeSelector) return;

        const currentIndex = this.fontSizeSelector.selectedIndex;

        // Move to next smaller size if available
        if (currentIndex > 0) {
            this.fontSizeSelector.selectedIndex = currentIndex - 1;
            this.applyFontSize();
        }
    }

    updateFontSizeSelector() {
        if (!this.currentActiveInput || !this.fontSizeSelector) return;

        try {
            // Get the current font size of the element
            const computedStyle = window.getComputedStyle(this.currentActiveInput);
            const currentFontSize = parseInt(computedStyle.fontSize);

            // Update the selector to match the current font size
            if (currentFontSize && this.fontSizeSelector.querySelector(`option[value="${currentFontSize}"]`)) {
                this.fontSizeSelector.value = currentFontSize;
            }
        } catch (error) {
            console.error('Error updating font size selector:', error);
        }
    }

    // Selection Detection Methods
    handleSelectionChange() {
        const selection = window.getSelection();
        this.hasTextSelection = selection.toString().length > 0;

        if (this.hasTextSelection) {
            const range = selection.getRangeAt(0);
            const selectedElement = range.commonAncestorContainer.nodeType === Node.TEXT_NODE
                ? range.commonAncestorContainer.parentElement
                : range.commonAncestorContainer;

            this.selectedComponent = selectedElement.closest('[data-component-type]');
        }

        this.updateColorPickerState();
    }

    handleEditorClick(e) {
        const clickedComponent = e.target.closest('[data-component-type]');

        if (clickedComponent && !this.hasTextSelection) {
            this.selectedComponent = clickedComponent;
            this.highlightSelectedComponent();
        }

        this.updateColorPickerState();
    }

    highlightSelectedComponent() {
        document.querySelectorAll('[data-component-type]').forEach(comp => {
            comp.classList.remove('component-selected');
        });

        if (this.selectedComponent) {
            this.selectedComponent.classList.add('component-selected');
        }
    }

    updateColorPickerState() {
        const colorPickerLabel = this.componentColorPicker.parentElement.querySelector('label');
        if (this.hasTextSelection) {
            this.componentColorPicker.title = 'Text Color';
            if (colorPickerLabel) colorPickerLabel.textContent = 'Text Color';
        } else {
            this.componentColorPicker.title = 'Background Color';
            if (colorPickerLabel) colorPickerLabel.textContent = 'Background Color';
        }
    }

    // Color Methods
    handleColorChange(e) {
        this.selectedComponentColor = e.target.value;

        if (this.hasTextSelection) {
            this.applyTextColor(this.selectedComponentColor);
        } else if (this.selectedComponent) {
            this.applyBackgroundColor(this.selectedComponent, this.selectedComponentColor);
        }

        this.updatePreview();
    }

    applyTextColor(colorName) {
        const selection = window.getSelection();
        if (selection.rangeCount === 0) return;

        const range = selection.getRangeAt(0);
        const selectedText = selection.toString();

        if (selectedText.length === 0) return;

        // Validate selection is within editor canvas boundaries
        const commonAncestor = range.commonAncestorContainer;
        const editorCanvas = this.editorCanvas;

        // Check if selection is within the editor canvas
        let isWithinEditor = false;
        let currentNode = commonAncestor;

        while (currentNode && currentNode !== document) {
            if (currentNode === editorCanvas) {
                isWithinEditor = true;
                break;
            }
            currentNode = currentNode.parentNode;
        }

        // Only apply color if selection is within editor boundaries
        if (!isWithinEditor) {
            console.warn('Text selection outside editor boundaries - color not applied');
            return;
        }

        // Create span with data attribute instead of inline style
        const span = document.createElement('span');
        span.setAttribute('data-text-color', colorName);
        span.textContent = selectedText;

        // Replace selected content with the new span
        range.deleteContents();
        range.insertNode(span);

        // Clear selection
        selection.removeAllRanges();
    }

    applyBackgroundColor(component, colorName) {
        const backgroundValue = this.getColorValue(colorName);
        component.style.background = backgroundValue;
        component.dataset.componentColor = colorName;
    }

    getColorValue(colorName) {
        const colorMap = {
            'neutral': 'transparent',
            'light-blue': 'linear-gradient(135deg, #E3F2FD, #BBDEFB)',
            'soft-green': 'linear-gradient(135deg, #E8F5E8, #C8E6C9)',
            'pale-yellow': 'linear-gradient(135deg, #FFF8E1, #FFECB3)',
            'light-pink': 'linear-gradient(135deg, #FCE4EC, #F8BBD9)',
            'lavender': 'linear-gradient(135deg, #F3E5F5, #E1BEE7)'
        };
        return colorMap[colorName] || colorMap['neutral'];
    }

    // Session Management Methods
    async initializeSession() {
        // Check for existing session in localStorage
        const existingSessionId = localStorage.getItem('cms_session_id');
        
        if (existingSessionId) {
            // Validate existing session
            try {
                const response = await fetch(`${this.apiBaseUrl}/session/validate/${existingSessionId}`);
                const result = await response.json();
                
                if (result.valid) {
                    this.sessionId = existingSessionId;
                    console.log('Resumed existing session:', this.sessionId);
                    return;
                }
            } catch (e) {
                console.log('Session validation failed, creating new session');
            }
        }
        
        // Create new session
        await this.createNewSession();
    }

    async createNewSession() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/session/create`, {
                method: 'POST'
            });
            const result = await response.json();
            
            if (result.session_id) {
                this.sessionId = result.session_id;
                localStorage.setItem('cms_session_id', this.sessionId);
                console.log('Created new session:', this.sessionId);
            }
        } catch (e) {
            console.error('Failed to create session:', e);
        }
    }

    // Auto-Save Methods
    scheduleAutoSave() {
        if (!this.sessionId) return;
        
        // Clear existing timeout
        if (this.autoSaveTimeout) {
            clearTimeout(this.autoSaveTimeout);
        }
        
        // Schedule new auto-save after 2 seconds
        this.autoSaveTimeout = setTimeout(() => {
            this.performAutoSave();
        }, 2000);
    }

    async performAutoSave() {
        if (!this.sessionId || this.saveStatus === 'saving') return;
        
        // Gather current content
        const content = this.gatherCurrentContent();
        if (!content) return;
        
        this.saveStatus = 'saving';
        this.updateSaveStatusUI();
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/session/${this.sessionId}/nodes/${this.selectedNode}/auto-save`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(content)
            });
            
            const result = await response.json();
            
            if (result.status === 'saved') {
                this.saveStatus = 'saved';
                this.lastSaved = new Date();
            } else {
                this.saveStatus = 'error';
            }
        } catch (e) {
            console.error('Auto-save failed:', e);
            this.saveStatus = 'error';
        }
        
        this.updateSaveStatusUI();
    }

    gatherCurrentContent() {
        const components = this.dropZone.querySelectorAll('.editor-component');
        if (components.length === 0) return null;
        
        // Extract all components using existing extractComponentData function
        const componentSequence = [];
        components.forEach((component, index) => {
            const componentData = this.extractComponentData(component);
            const componentStyle = this.extractComponentStyle(component);
            
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

    updateSaveStatusUI() {
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
                statusElement.style.display = 'none';
        }
    }

    applyColorToComponent(component) {
        if (this.selectedComponentColor === 'neutral') {
            component.style.background = 'transparent';
        } else {
            component.style.background = this.getColorValue(this.selectedComponentColor);
            component.style.borderRadius = '8px';
            component.style.padding = '1rem';
        }
    }
}

// Global bridge functions for AI API interaction
let cmsInstance;

// Bridge function to insert components
function insertComponent(componentType) {
    if (!cmsInstance) return;

    // Create component element using existing CMS method
    const component = cmsInstance.createComponentElement(componentType);
    if (component && cmsInstance.editorCanvas) {
        cmsInstance.editorCanvas.appendChild(component);
        cmsInstance.updatePreview();
    }
}

// Bridge function to add new node
function addNewNode() {
    if (!cmsInstance) return;

    // Generate new node ID
    cmsInstance.nodeCounter++;
    const nodeId = `N${String(cmsInstance.nodeCounter).padStart(3, '0')}`;

    // Create node element and add to sidebar
    const nodeElement = document.createElement('div');
    nodeElement.className = 'node-item';
    nodeElement.dataset.nodeId = nodeId;
    nodeElement.innerHTML = `
        <div class="node-indicator"></div>
        <div class="node-info">
            <div class="node-id">${nodeId}</div>
            <div class="node-title">${nodeId}</div>
        </div>
        <div class="node-status empty"></div>
    `;

    // Add click handler
    nodeElement.addEventListener('click', () => cmsInstance.selectNode(nodeId));

    // Add to DOM
    cmsInstance.nodeList.appendChild(nodeElement);

    // Call API to store node
    fetch('/nodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            node_id: nodeId,
            title: `Node ${nodeId}`,
            chapter_id: 'CH01'
        })
    }).catch(console.error);
}

// Bridge function to select node
function selectNode(nodeId) {
    if (!cmsInstance) return;
    cmsInstance.selectNode(nodeId);
}

// Bridge function to delete current node
function deleteCurrentNode() {
    if (!cmsInstance || !cmsInstance.selectedNode) return;

    const nodeElement = document.querySelector(`[data-node-id="${cmsInstance.selectedNode}"]`);
    if (nodeElement) {
        nodeElement.remove();
    }
}

// Bridge function to set node content
function setNodeContent(nodeId, content) {
    if (!cmsInstance) return;

    fetch(`/nodes/${nodeId}/content`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(content)
    }).catch(console.error);
}

// Bridge function to get node content
function getNodeContent(nodeId) {
    if (!cmsInstance) return;

    return fetch(`/nodes/${nodeId}/content`)
        .then(response => response.json())
        .catch(console.error);
}

// Bridge function to assign template
function assignTemplate(nodeId, templateId) {
    if (!cmsInstance) return;

    fetch(`/nodes/${nodeId}/template`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            node_id: nodeId,
            template_id: templateId
        })
    }).catch(console.error);
}

// Bridge function to test component factory system with AI-like data
function testComponentFactory() {
    if (!cmsInstance) return;

    // Clear existing components
    cmsInstance.clearEditor();

    // Mock AI response data
    const mockAISequence = [
        {
            type: "heading",
            parameters: { text: "Understanding Fractions" }
        },
        {
            type: "definition",
            parameters: { term: "Fraction", definition: "A number representing a part of a whole" }
        },
        {
            type: "step-sequence",
            parameters: { steps: ["Identify the numerator", "Identify the denominator", "Simplify if possible"] }
        },
        {
            type: "memory-trick",
            parameters: { text: "Remember: Bottom number = Denominator starts with D for Down!" }
        }
    ];

    // Test the component factory
    cmsInstance.createComponentsFromSequence(mockAISequence);
    console.log('Component factory test completed - check the editor!');
}

// Bridge function to test AI suggestion mode
function testAISuggestionMode() {
    if (!cmsInstance) return;

    // Clear existing components
    cmsInstance.clearEditor();

    // Mock AI response data for suggestions
    const mockAISuggestions = [
        {
            type: "heading",
            parameters: { text: "AI Suggested: Learning Fractions" }
        },
        {
            type: "definition",
            parameters: { term: "Numerator", definition: "The top number in a fraction" }
        },
        {
            type: "step-sequence",
            parameters: { steps: ["Count total parts", "Count colored parts", "Write as fraction"] }
        }
    ];

    // Test AI component creation
    cmsInstance.createComponentsFromSequence(mockAISuggestions);
    console.log('AI component creation test completed!');
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    cmsInstance = new TemplateEditorCMS();
});