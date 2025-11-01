// Template Editor CMS Frontend
class TemplateEditorCMS {
    constructor() {
        this.apiBaseUrl = 'http://localhost:8000';
        this.selectedNode = null; // Will be set from loaded session nodes
        this.draggedComponent = null;
        this.nodeCounter = 0; // Will be calculated from loaded session nodes
        this.selectedComponentColor = 'neutral'; // Default component color

        // Content loading state protection
        this.isLoadingContent = false;

        // SelectNode debouncing to prevent rapid-fire double events
        this.lastSelectTime = 0;
        this.selectDebounceMs = 100;

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

        // View mode state
        this.viewMode = 'list'; // 'list' or 'visual'
        this.viewModeToggleBtn = null;
        this.visualNetworkContainer = null;

        // Visual network zoom/pan state
        this.visualScale = 1;
        this.visualPanX = 0;
        this.visualPanY = 0;
        this.minScale = 0.25;
        this.maxScale = 3;
        this.scaleStep = 0.2;
        this.wheelScaleStep = 0.04; // 20% sensitivity for wheel zoom
        this.isPanning = false;
        this.lastPanX = 0;
        this.lastPanY = 0;
        this.positioningMode = false;

        // Keyboard state tracking
        this.isSpacePressed = false;
        this.isAltPressed = false;
        this.arrowUpdateTimeout = null;

        // Visual network nodes
        this.visualNodes = new Map(); // nodeId -> VisualNode instance
        this.nodeConnections = new Map(); // nodeId -> array of connected nodeIds

        // Relationship data - Initialize as empty array to prevent race conditions
        this.relationships = []; // Will be populated from database during session loading

        // Session and Auto-Save state
        this.sessionId = null;
        this.autoSaveTimeout = null;
        this.lastSaved = null;
        this.saveStatus = 'idle'; // idle, saving, saved, error
        this.sessionReadyPromise = null; // Track session readiness

        this.initializeElements();
        this.bindEvents();
        this.initializeTextFormatting();
        this.updatePreview();

        // Initialize session asynchronously and store promise
        this.sessionReadyPromise = this.initializeSession().then(async () => {
            console.log('Session initialization completed');
            // Restore view mode state AFTER session loading completes
            await this.restoreViewModeState();
        }).catch(error => {
            console.error('Session initialization failed:', error);
            throw error; // Re-throw to maintain promise chain
        });
    }

    initializeElements() {
        // Node navigation elements
        this.nodeList = document.getElementById('node-list');
        this.addNodeBtn = document.getElementById('add-node-btn');
        this.importCsvBtn = document.getElementById('import-csv-btn');
        this.csvFileInput = document.getElementById('csv-file-input');

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

        // View mode toggle elements
        this.viewModeToggleBtn = document.getElementById('view-mode-toggle-btn');
        this.visualNetworkContainer = document.getElementById('visual-network-container');

        // Visual network elements
        this.visualNetworkSvg = document.getElementById('visual-network-svg');
        this.networkContent = document.getElementById('network-content');
        this.zoomInBtn = document.getElementById('zoom-in-btn');
        this.zoomOutBtn = document.getElementById('zoom-out-btn');
        this.resetViewBtn = document.getElementById('reset-view-btn');
        this.positionModeBtn = document.getElementById('position-mode-btn');
        this.savePositionsBtn = document.getElementById('save-positions-btn');

        // Selection tracking
        this.selectedComponent = null;
        this.hasTextSelection = false;
    }

    bindEvents() {
        // Node navigation events
        this.addNodeBtn.addEventListener('click', async () => await this.addNewNode());
        this.nodeList.addEventListener('click', (e) => this.handleNodeClick(e));

        // CSV import events
        this.importCsvBtn.addEventListener('click', () => this.openCsvFileDialog());
        this.csvFileInput.addEventListener('change', (e) => this.handleCsvFileSelection(e));

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

        // View mode toggle events
        if (this.viewModeToggleBtn) {
            this.viewModeToggleBtn.addEventListener('click', async () => await this.toggleViewMode());
        }

        // Visual network control events
        if (this.zoomInBtn) {
            this.zoomInBtn.addEventListener('click', () => this.zoomIn());
        }
        if (this.zoomOutBtn) {
            this.zoomOutBtn.addEventListener('click', () => this.zoomOut());
        }
        if (this.resetViewBtn) {
            this.resetViewBtn.addEventListener('click', () => this.resetView());
        }
        if (this.positionModeBtn) {
            this.positionModeBtn.addEventListener('click', () => this.togglePositioningMode());
        }
        if (this.savePositionsBtn) {
            this.savePositionsBtn.addEventListener('click', async () => await this.saveNodePositions());
        }

        // Visual network pan events
        if (this.visualNetworkSvg) {
            this.visualNetworkSvg.addEventListener('mousedown', (e) => this.startPan(e));
            this.visualNetworkSvg.addEventListener('mousemove', (e) => this.handlePan(e));
            this.visualNetworkSvg.addEventListener('mouseup', () => this.endPan());
            this.visualNetworkSvg.addEventListener('mouseleave', () => this.endPan());

            // Ctrl+scroll zoom events
            this.visualNetworkSvg.addEventListener('wheel', (e) => this.handleWheelZoom(e));
        }

        // Add global keyboard event listeners
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));

        // Restore collapsed state from localStorage
        this.restoreNodePanelState();

        // Restore view mode state from localStorage
        // View mode state will be restored after session loading completes
    }

    // Node Navigation Methods
    async addNewNode() {
        await this.ensureSessionReady();

        this.nodeCounter++;
        const nodeId = `N${String(this.nodeCounter).padStart(3, '0')}`;

        // Validate node ID before creation
        if (!this.isValidNodeId(nodeId)) {
            console.error(`❌ Generated invalid node ID: ${nodeId}`);
            throw new Error(`Invalid node ID format: ${nodeId}`);
        }

        console.log(`✅ Creating new node with validated ID: ${nodeId}`);

        // Create session node first
        const sessionNodeData = {
            node_id: nodeId,
            title: nodeId,
            raw_content: "",
            chapter_id: 1
        };

        try {
            const response = await fetch(`${this.apiBaseUrl}/session/${this.sessionId}/nodes`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(sessionNodeData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Failed to create session node: ${errorData.detail || 'Unknown error'}`);
            }

            // Create DOM element for the new session node
            const sessionNode = {
                node_id: nodeId,
                title: nodeId,
                raw_content: "",
                chapter_id: 1
            };
            this.createSessionNodeElement(sessionNode, 0);

            this.selectNode(nodeId);

            // Update visual network if in visual mode
            if (this.viewMode === 'visual') {
                await this.initializeVisualNetwork();
            }

            console.log(`Successfully created new node: ${nodeId}`);
        } catch (error) {
            console.error('Failed to create new node:', error);
            alert(`Failed to create new node: ${error.message}`);
            // Revert counter on failure
            this.nodeCounter--;
        }
    }

    handleNodeClick(e) {
        const nodeItem = e.target.closest('.node-item');
        if (nodeItem) {
            const nodeId = nodeItem.dataset.nodeId;
            this.selectNode(nodeId);
        }
    }

    selectNode(nodeId) {
        console.log(`🎯 selectNode called with nodeId: ${nodeId}`);

        // Debounce rapid-fire selectNode calls to prevent double events
        const currentTime = Date.now();
        if (currentTime - this.lastSelectTime < this.selectDebounceMs) {
            console.log(`⏱️ Debouncing selectNode call for ${nodeId} (${currentTime - this.lastSelectTime}ms since last call)`);
            return;
        }
        this.lastSelectTime = currentTime;
        console.log(`✅ Proceeding with selectNode for ${nodeId}`);

        // Remove active class from all nodes
        const allNodes = document.querySelectorAll('.node-item');
        console.log(`📋 Found ${allNodes.length} total .node-item elements`);
        allNodes.forEach(item => {
            item.classList.remove('active');
        });

        // Add active class to selected node
        const selectedNodeItem = document.querySelector(`[data-node-id="${nodeId}"]`);
        console.log(`🔍 querySelector result for [data-node-id="${nodeId}"]:`, selectedNodeItem);

        if (selectedNodeItem) {
            selectedNodeItem.classList.add('active');
            this.selectedNode = nodeId;
            console.log(`✅ Node ${nodeId} set as active, calling loadNodeContent`);

            // Update visual node selection
            this.updateVisualNodeSelection(nodeId);

            this.loadNodeContent(nodeId);
        } else {
            console.log(`❌ No element found with [data-node-id="${nodeId}"]`);
        }
    }

    updateVisualNodeSelection(selectedNodeId) {
        // Update visual node selection states
        this.visualNodes.forEach((visualNode, nodeId) => {
            visualNode.setSelected(nodeId === selectedNodeId);
        });
    }

    async loadNodeContent(nodeId) {
        console.log(`📂 loadNodeContent called for nodeId: ${nodeId}`);
        console.log(`🔗 API URL: ${this.apiBaseUrl}/nodes/${nodeId}/components`);

        // Prevent simultaneous content loading to avoid duplication
        if (this.isLoadingContent) {
            console.log(`⏳ Already loading content, skipping duplicate call for ${nodeId}`);
            return;
        }

        this.isLoadingContent = true;
        console.log(`🔒 Set loading state to prevent race conditions`);

        try {
            // Clear the editor canvas first
            this.clearEditor();
            console.log(`🧹 Editor cleared`);

            // Fetch saved components for this node
            const response = await fetch(`${this.apiBaseUrl}/nodes/${nodeId}/components`);
            console.log(`📡 API response status: ${response.status} ${response.statusText}`);
            const data = await response.json();
            console.log(`📦 API response data:`, data);

            if (data.components && data.components.length > 0) {
                console.log(`✅ Found ${data.components.length} components for node ${nodeId}`);
                // Recreate each component in the editor
                data.components.forEach(componentData => {
                    const componentElement = this.createComponentElement(componentData.type, componentData.parameters);
                    this.dropZone.appendChild(componentElement);
                    console.log(`🔧 Added component: ${componentData.type}`);
                });
            } else {
                console.log(`📭 No components found for node ${nodeId}`);
            }

            // Update placeholder visibility based on component count
            this.updateDropZonePlaceholders();
        } catch (error) {
            console.log(`❌ Error loading content for node ${nodeId}:`, error);
        } finally {
            // Always reset loading state
            this.isLoadingContent = false;
            console.log(`🔓 Released loading state for ${nodeId}`);
        }

        this.updatePreview();
        console.log(`🎬 Loaded content for node: ${nodeId}`);
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
            case 'three-svgs':
                div.innerHTML = `
                    <div class="component-header">
                        <h4>Three SVGs</h4>
                        <button class="remove-component">×</button>
                    </div>
                    <div class="three-svgs-grid">
                        <div class="svg-slot" data-slot="1">
                            <div class="svg-preview-area">
                                <div class="svg-preview" data-slot="1">
                                    <p>No SVG yet</p>
                                </div>
                            </div>
                            <div contenteditable="true" data-placeholder="SVG title..." class="svg-title component-input" data-slot="1"></div>
                            <div contenteditable="true" data-placeholder="SVG description..." class="svg-description component-input component-textarea" data-slot="1"></div>
                        </div>
                        <div class="svg-slot" data-slot="2">
                            <div class="svg-preview-area">
                                <div class="svg-preview" data-slot="2">
                                    <p>No SVG yet</p>
                                </div>
                            </div>
                            <div contenteditable="true" data-placeholder="SVG title..." class="svg-title component-input" data-slot="2"></div>
                            <div contenteditable="true" data-placeholder="SVG description..." class="svg-description component-input component-textarea" data-slot="2"></div>
                        </div>
                        <div class="svg-slot" data-slot="3">
                            <div class="svg-preview-area">
                                <div class="svg-preview" data-slot="3">
                                    <p>No SVG yet</p>
                                </div>
                            </div>
                            <div contenteditable="true" data-placeholder="SVG title..." class="svg-title component-input" data-slot="3"></div>
                            <div contenteditable="true" data-placeholder="SVG description..." class="svg-description component-input component-textarea" data-slot="3"></div>
                        </div>
                    </div>
                    <div class="svg-generation-controls">
                        <input type="text" class="svg-context-input" placeholder="Add context for SVG generation...">
                        <button class="generate-svgs-btn">Generate SVGs</button>
                    </div>
                `;

                const generateBtn = div.querySelector('.generate-svgs-btn');
                generateBtn.addEventListener('click', async () => {
                    const titles = [];
                    const descriptions = [];
                    const context = div.querySelector('.svg-context-input').value;

                    for (let i = 1; i <= 3; i++) {
                        const title = div.querySelector(`.svg-title[data-slot="${i}"]`).innerHTML || '';
                        const desc = div.querySelector(`.svg-description[data-slot="${i}"]`).innerHTML || '';
                        titles.push(title);
                        descriptions.push(desc);
                    }

                    generateBtn.disabled = true;
                    generateBtn.textContent = 'Generating...';

                    try {
                        const response = await fetch('http://localhost:8000/api/generate-svgs', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ context, titles, descriptions })
                        });
                        const data = await response.json();

                        for (let i = 1; i <= 3; i++) {
                            const svgPreview = div.querySelector(`.svg-preview[data-slot="${i}"]`);
                            svgPreview.innerHTML = data.svgs[i-1];
                            svgPreview.dataset.svgCode = data.svgs[i-1];
                        }

                        this.updatePreview();
                        this.scheduleAutoSave();
                    } catch (error) {
                        alert('Failed to generate SVGs: ' + error.message);
                    } finally {
                        generateBtn.disabled = false;
                        generateBtn.textContent = 'Generate SVGs';
                    }
                });
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

            case 'three-svgs':
                for (let i = 1; i <= 3; i++) {
                    const titleInput = componentElement.querySelector(`.svg-title[data-slot="${i}"]`);
                    const descInput = componentElement.querySelector(`.svg-description[data-slot="${i}"]`);
                    const svgPreview = componentElement.querySelector(`.svg-preview[data-slot="${i}"]`);

                    if (titleInput && data[`title${i}`]) titleInput.innerHTML = data[`title${i}`];
                    if (descInput && data[`description${i}`]) descInput.innerHTML = data[`description${i}`];
                    if (svgPreview && data[`svg${i}`]) {
                        svgPreview.innerHTML = data[`svg${i}`];
                        svgPreview.dataset.svgCode = data[`svg${i}`];
                    }
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

            case 'three-svgs':
                let threeSVGsHTML = '<div class="preview-three-svgs">';
                for (let i = 1; i <= 3; i++) {
                    const titleInput = component.querySelector(`.svg-title[data-slot="${i}"]`);
                    const descInput = component.querySelector(`.svg-description[data-slot="${i}"]`);
                    const svgPreview = component.querySelector(`.svg-preview[data-slot="${i}"]`);

                    const title = titleInput ? titleInput.innerHTML || `SVG ${i} Title` : `SVG ${i} Title`;
                    const desc = descInput ? descInput.innerHTML || `SVG ${i} description` : `SVG ${i} description`;
                    const svgCode = svgPreview ? svgPreview.dataset.svgCode || '' : '';

                    threeSVGsHTML += `
                        <div class="preview-svg-item">
                            <div class="preview-svg-container">
                                ${svgCode ? svgCode : '<p class="no-svg-placeholder">No SVG generated</p>'}
                            </div>
                            <h4 class="preview-svg-title">${this.formatTextForPreview(title)}</h4>
                            <p class="preview-svg-description">${this.formatTextForPreview(desc)}</p>
                        </div>
                    `;
                }
                threeSVGsHTML += '</div>';
                return threeSVGsHTML;

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
            case 'three-svgs':
                for (let i = 1; i <= 3; i++) {
                    const titleInput = component.querySelector(`.svg-title[data-slot="${i}"]`);
                    const descInput = component.querySelector(`.svg-description[data-slot="${i}"]`);
                    const svgPreview = component.querySelector(`.svg-preview[data-slot="${i}"]`);

                    data[`title${i}`] = titleInput ? titleInput.innerHTML : '';
                    data[`description${i}`] = descInput ? descInput.innerHTML : '';
                    data[`svg${i}`] = svgPreview ? svgPreview.dataset.svgCode || '' : '';
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

    // View Mode Management Methods
    async toggleViewMode() {
        // Toggle state
        this.viewMode = this.viewMode === 'list' ? 'visual' : 'list';

        // Update the UI
        await this.updateViewMode();

        // Save state to localStorage
        localStorage.setItem('viewMode', this.viewMode);

        console.log(`View mode switched to: ${this.viewMode}`);
    }

    async updateViewMode() {
        const editorLayout = document.querySelector('.editor-layout');
        const nodeList = document.getElementById('node-list');

        if (this.viewMode === 'visual') {
            // Switch to visual mode
            editorLayout.classList.add('visual-mode');
            nodeList.style.display = 'none';
            this.visualNetworkContainer.style.display = 'flex';

            // Ensure session is ready before initializing visual network
            await this.ensureSessionReady();

            // Initialize visual network with current data (now async)
            await this.initializeVisualNetwork();

            // Update button appearance
            this.viewModeToggleBtn.innerHTML = '<i class="fas fa-list"></i>';
            this.viewModeToggleBtn.title = 'Switch to list view';
            this.viewModeToggleBtn.classList.add('active');
        } else {
            // Switch to list mode
            editorLayout.classList.remove('visual-mode');
            nodeList.style.display = 'block';
            this.visualNetworkContainer.style.display = 'none';

            // Update button appearance
            this.viewModeToggleBtn.innerHTML = '<i class="fas fa-project-diagram"></i>';
            this.viewModeToggleBtn.title = 'Switch to visual view';
            this.viewModeToggleBtn.classList.remove('active');
        }
    }

    async restoreViewModeState() {
        // Check localStorage for saved view mode state
        const savedViewMode = localStorage.getItem('viewMode');

        if (savedViewMode && savedViewMode === 'visual') {
            this.viewMode = 'visual';
            await this.updateViewMode();
        }
    }

    // Node Position Management Methods
    async saveNodePositions() {
        try {
            await this.ensureSessionReady();

            const positions = {};
            this.visualNodes.forEach((node, nodeId) => {
                positions[nodeId] = {
                    x: node.position.x,
                    y: node.position.y
                };
            });

            const response = await fetch(`${this.apiBaseUrl}/session/${this.sessionId}/positions`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ positions })
            });

            const result = await response.json();

            if (response.ok && result.status === 'saved') {
                console.log('Node positions saved to database:', positions);
                this.showLayoutFeedback('Positions saved!', 'success');
                return true;
            } else {
                throw new Error(result.message || 'Failed to save positions');
            }
        } catch (error) {
            console.error('Failed to save positions:', error);
            this.showLayoutFeedback('Save failed', 'error');
            return false;
        }
    }

    async loadNodePositions() {
        try {
            await this.ensureSessionReady();

            const response = await fetch(`${this.apiBaseUrl}/session/${this.sessionId}/positions`);
            const result = await response.json();

            if (response.ok && result.status === 'success') {
                console.log('Node positions loaded from database:', result.positions);
                return result.positions || {};
            } else {
                console.log('No saved positions found or error loading positions');
                return {};
            }
        } catch (error) {
            console.error('Failed to load positions:', error);
            return {};
        }
    }

    // Layout Management Methods
    collectCurrentPositions() {
        const positions = {};
        this.visualNodes.forEach((node, nodeId) => {
            positions[nodeId] = { x: node.position.x, y: node.position.y };
        });
        return positions;
    }

    resetToDefaultLayout() {
        const nodeData = Array.from(document.querySelectorAll('.node-item')).map((el, index) => ({
            nodeId: el.getAttribute('data-node-id')
        }));

        nodeData.forEach((data, index) => {
            const position = this.calculateGridPosition(index, nodeData.length);
            const node = this.visualNodes.get(data.nodeId);
            if (node) {
                node.updatePosition(position.x, position.y);
            }
        });

        this.showLayoutFeedback('Layout reset to default', 'success');
    }

    showLayoutFeedback(message, type) {
        const feedback = document.createElement('div');
        feedback.textContent = message;
        feedback.style.cssText = `
            position: fixed; top: 70px; right: 10px; padding: 8px 12px; border-radius: 4px;
            font-size: 12px; z-index: 1000; pointer-events: none;
            background: ${type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : '#2196f3'};
            color: white; animation: fadeInOut 2s ease-in-out;
        `;
        document.body.appendChild(feedback);
        setTimeout(() => feedback.remove(), 2000);
    }

    // Visual Network Zoom/Pan Methods
    zoomIn() {
        if (this.visualScale < this.maxScale) {
            this.visualScale = Math.min(this.visualScale + this.scaleStep, this.maxScale);
            this.updateVisualTransform();
        }
    }

    zoomOut() {
        if (this.visualScale > this.minScale) {
            this.visualScale = Math.max(this.visualScale - this.scaleStep, this.minScale);
            this.updateVisualTransform();
        }
    }

    resetView() {
        this.visualScale = 1;
        this.visualPanX = 0;
        this.visualPanY = 0;
        this.updateVisualTransform();
    }

    togglePositioningMode() {
        this.positioningMode = !this.positioningMode;

        // Update button visual state
        if (this.positionModeBtn) {
            this.positionModeBtn.classList.toggle('active', this.positioningMode);
        }

        // Update SVG cursor
        if (this.visualNetworkSvg) {
            this.visualNetworkSvg.style.cursor = this.positioningMode ? 'default' : 'grab';
        }

        console.log('Positioning mode:', this.positioningMode ? 'ON' : 'OFF');
    }

    startPan(e) {
        // Allow panning with: Space+drag, middle click, or left click in normal mode
        const isSpacePan = this.isSpacePressed && e.button === 0;
        const isMiddleClick = e.button === 1;
        const isLeftClickInNormalMode = e.button === 0 && !this.positioningMode && !this.isSpacePressed;

        if (!isSpacePan && !isMiddleClick && !isLeftClickInNormalMode) return;

        this.isPanning = true;
        this.lastPanX = e.clientX;
        this.lastPanY = e.clientY;

        // Disable transitions during dragging for smooth movement
        if (this.networkContent) {
            this.networkContent.style.transition = 'none';
        }

        if (this.visualNetworkSvg) {
            this.visualNetworkSvg.style.cursor = 'grabbing';
        }
        e.preventDefault();
    }

    handlePan(e) {
        if (!this.isPanning) return;

        const deltaX = e.clientX - this.lastPanX;
        const deltaY = e.clientY - this.lastPanY;

        this.visualPanX += deltaX;
        this.visualPanY += deltaY;

        this.lastPanX = e.clientX;
        this.lastPanY = e.clientY;

        this.updateVisualTransform();
        e.preventDefault();
    }

    endPan() {
        this.isPanning = false;

        // Re-enable transitions after dragging ends
        if (this.networkContent) {
            this.networkContent.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)';
        }

        if (this.visualNetworkSvg) {
            this.visualNetworkSvg.style.cursor = 'grab';
        }
    }

    updateVisualTransform() {
        if (this.networkContent) {
            this.networkContent.setAttribute(
                'transform',
                `translate(${this.visualPanX}, ${this.visualPanY}) scale(${this.visualScale})`
            );
        }
    }

    handleWheelZoom(e) {
        // Only zoom when Ctrl key is pressed
        if (!e.ctrlKey) return;

        // Prevent default browser zoom
        e.preventDefault();

        // Use smaller step for wheel zoom
        if (e.deltaY < 0) {
            // Scroll up = zoom in
            if (this.visualScale < this.maxScale) {
                this.visualScale = Math.min(this.visualScale + this.wheelScaleStep, this.maxScale);
                this.updateVisualTransform();
            }
        } else {
            // Scroll down = zoom out
            if (this.visualScale > this.minScale) {
                this.visualScale = Math.max(this.visualScale - this.wheelScaleStep, this.minScale);
                this.updateVisualTransform();
            }
        }
    }

    // Keyboard event handlers
    handleKeyDown(e) {
        if (e.code === 'Space') {
            this.isSpacePressed = true;
            // Prevent page scroll when space is pressed
            e.preventDefault();
        }
        if (e.code === 'AltLeft' || e.code === 'AltRight') {
            this.isAltPressed = true;
        }
    }

    handleKeyUp(e) {
        if (e.code === 'Space') {
            this.isSpacePressed = false;
        }
        if (e.code === 'AltLeft' || e.code === 'AltRight') {
            this.isAltPressed = false;
        }
    }

    // Grid positioning algorithm
    calculateGridPosition(index, totalNodes) {
        const gridSize = Math.ceil(Math.sqrt(totalNodes));
        const spacing = 100; // pixels between nodes
        const offsetX = 50; // starting offset
        const offsetY = 50;

        const row = Math.floor(index / gridSize);
        const col = index % gridSize;

        // Add slight randomness for organic feel
        const randomX = (Math.random() - 0.5) * 20;
        const randomY = (Math.random() - 0.5) * 20;

        return {
            x: offsetX + col * spacing + randomX,
            y: offsetY + row * spacing + randomY
        };
    }

    // Initialize visual network
    async initializeVisualNetwork() {
        if (!this.networkContent) return;

        // Clear existing nodes
        this.clearVisualNetwork();

        // Get node data from existing list
        const nodeElements = document.querySelectorAll('.node-item');
        const nodeData = [];

        console.log(`Found ${nodeElements.length} nodes for visual network`);

        nodeElements.forEach((element, index) => {
            const nodeId = element.getAttribute('data-node-id');
            const titleElement = element.querySelector('.node-title');
            const statusElement = element.querySelector('.node-status');

            const title = titleElement ? titleElement.textContent : nodeId;
            const status = this.getNodeStatus(element);

            // Extract metadata from DOM attributes
            const nodeType = element.getAttribute('data-node-type') || 'core';
            const difficulty = element.getAttribute('data-difficulty') ? parseInt(element.getAttribute('data-difficulty')) : null;
            const timeMinutes = element.getAttribute('data-time-minutes') ? parseInt(element.getAttribute('data-time-minutes')) : null;
            const description = element.getAttribute('data-description') || '';
            const textbookPages = element.getAttribute('data-textbook-pages') || '';

            console.log(`Node ${nodeId}: title="${title}", status="${status}", type="${nodeType}"`);
            nodeData.push({
                nodeId,
                title,
                status,
                type: nodeType,
                difficulty,
                timeMinutes,
                description,
                textbookPages
            });
        });

        // Load saved positions (now async and session-aware)
        const savedPositions = await this.loadNodePositions();

        // Comprehensive readiness validation before progressive rendering
        const isReady = await this.validateVisualizationReadiness(nodeData, savedPositions);
        if (!isReady) {
            console.log('❌ Visual network initialization failed readiness validation - falling back to list mode');
            return; // Graceful fallback to list mode
        }

        // Create visual nodes with async batching to prevent browser hang
        await this.createVisualNodesBatched(nodeData, savedPositions);

        // Refresh relationships from database to ensure latest data
        await this.loadSessionRelationships();

        // Set up connections based on available data
        await this.setupConnections(nodeData);
    }

    getStatusFromClass(className) {
        if (className.includes('complete')) return 'complete';
        if (className.includes('draft')) return 'draft';
        return 'empty';
    }

    // Progressive visual node creation with educational priority
    async createVisualNodesBatched(nodeData, savedPositions) {
        const BATCH_SIZE = 10; // Nodes per frame to prevent browser hang

        // Educational Priority: Sort nodes to render selected/core nodes first
        const prioritizedNodes = this.prioritizeNodesForEducation(nodeData);

        console.log(`Creating ${prioritizedNodes.length} visual nodes in batches of ${BATCH_SIZE}`);

        for (let i = 0; i < prioritizedNodes.length; i += BATCH_SIZE) {
            const batch = prioritizedNodes.slice(i, i + BATCH_SIZE);

            // Process batch in single frame
            batch.forEach((data, batchIndex) => {
                const globalIndex = i + batchIndex;
                const savedPosition = savedPositions[data.nodeId];
                const position = savedPosition || this.calculateGridPosition(globalIndex, prioritizedNodes.length);
                const visualNode = new this.VisualNode(data, position, this);

                this.visualNodes.set(data.nodeId, visualNode);
                this.networkContent.appendChild(visualNode.elements.group);
            });

            // Yield control to browser between batches
            if (i + BATCH_SIZE < prioritizedNodes.length) {
                await this.nextFrame();
            }
        }

        console.log(`✅ Created ${this.visualNodes.size} visual nodes with educational priority`);
    }

    // Educational node prioritization for optimal learning workflow
    prioritizeNodesForEducation(nodeData) {
        const prioritized = [...nodeData];

        // Priority 1: Currently selected node (educational continuity)
        prioritized.sort((a, b) => {
            if (a.nodeId === this.selectedNode) return -1;
            if (b.nodeId === this.selectedNode) return 1;

            // Priority 2: Core learning path (N001, N002, N003...)
            const aIsCore = a.nodeId.match(/^N\d+$/);
            const bIsCore = b.nodeId.match(/^N\d+$/);
            if (aIsCore && !bIsCore) return -1;
            if (!aIsCore && bIsCore) return 1;

            // Priority 3: Maintain original order for same priority
            return 0;
        });

        return prioritized;
    }

    // RequestAnimationFrame helper for non-blocking operations
    nextFrame() {
        return new Promise(resolve => requestAnimationFrame(resolve));
    }

    // Comprehensive readiness validation with fail-fast retry
    async validateVisualizationReadiness(nodeData, savedPositions, retryCount = 0) {
        const MAX_RETRIES = 1;
        const RETRY_DELAY = 100; // ms

        console.log(`🔍 Validating visualization readiness (attempt ${retryCount + 1})`);

        // Gate 1: DOM Readiness
        if (!this.networkContent || !this.networkContent.isConnected) {
            console.log('❌ DOM Gate: Network container not ready');
            return this.retryValidation(nodeData, savedPositions, retryCount, MAX_RETRIES, RETRY_DELAY);
        }

        // Gate 2: Data Completeness
        if (!nodeData || nodeData.length === 0) {
            console.log('❌ Data Gate: No node data extracted');
            return this.retryValidation(nodeData, savedPositions, retryCount, MAX_RETRIES, RETRY_DELAY);
        }

        // Gate 3: Clean State
        if (this.visualNodes.size > 0) {
            console.log('❌ State Gate: Previous visual nodes not fully cleared');
            this.clearVisualNetwork(); // Force clear
            return this.retryValidation(nodeData, savedPositions, retryCount, MAX_RETRIES, RETRY_DELAY);
        }

        // Gate 4: Browser Environment
        if (typeof requestAnimationFrame === 'undefined') {
            console.log('❌ Browser Gate: RequestAnimationFrame not available');
            return false; // No retry for browser environment issues
        }

        // Gate 5: Session Data Integrity
        if (!this.sessionId) {
            console.log('❌ Session Gate: No valid session ID');
            return this.retryValidation(nodeData, savedPositions, retryCount, MAX_RETRIES, RETRY_DELAY);
        }

        console.log('✅ All readiness gates passed - proceeding with visualization');
        return true;
    }

    // Retry helper with delay
    async retryValidation(nodeData, savedPositions, retryCount, maxRetries, delay) {
        if (retryCount < maxRetries) {
            console.log(`⏳ Retrying validation in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return this.validateVisualizationReadiness(nodeData, savedPositions, retryCount + 1);
        }

        console.log('❌ Max retries exceeded - visualization readiness validation failed');
        return false;
    }

    // Enhanced status detection that checks the actual DOM structure
    getNodeStatus(element) {
        // Check .node-status element class
        const statusElement = element.querySelector('.node-status');
        if (statusElement) {
            const statusFromClass = this.getStatusFromClass(statusElement.className);
            if (statusFromClass !== 'empty') {
                return statusFromClass;
            }
        }

        // Check if node has active class (might indicate draft status like N001)
        if (element.classList.contains('active')) {
            return 'draft';
        }

        // Check for any status indicators in the element
        const indicators = element.querySelectorAll('.node-indicator, .status-indicator');
        for (let indicator of indicators) {
            if (indicator.style.backgroundColor || indicator.className.includes('draft') || indicator.className.includes('complete')) {
                // If there's any visual indicator, assume it's draft
                return 'draft';
            }
        }

        return 'empty';
    }

    clearVisualNetwork() {
        // Remove all visual nodes
        this.visualNodes.forEach(node => node.remove());
        this.visualNodes.clear();

        // Clear connections
        const connections = this.networkContent.querySelectorAll('.node-connection');
        connections.forEach(connection => connection.remove());
    }

    setupBasicConnections(nodeData) {
        // Simple sequential connections: N001 -> N002 -> N003, etc.
        for (let i = 0; i < nodeData.length - 1; i++) {
            const fromNode = this.visualNodes.get(nodeData[i].nodeId);
            const toNode = this.visualNodes.get(nodeData[i + 1].nodeId);

            if (fromNode && toNode) {
                this.createConnection(fromNode, toNode);
            }
        }
    }

    async setupConnections(nodeData) {
        console.log('=== SETUP CONNECTIONS DEBUGGING ===');
        console.log(`Visual nodes in network: ${this.visualNodes.size}`);
        console.log(`Relationships available: ${this.relationships ? this.relationships.length : 'NONE'}`);
        console.log(`Node data provided: ${nodeData.length} nodes`);

        // Reset all nodes to baseline size first
        this.resetAllNodeScaling();

        if (this.relationships && this.relationships.length > 0) {
            console.log(`✅ USING RELATIONSHIP CONNECTIONS (${this.relationships.length} relationships)`);
            console.log('Relationship summary:');
            this.relationships.forEach((rel, index) => {
                console.log(`  ${index + 1}. ${rel.from} --[${rel.type}]--> ${rel.to}`);
            });
            await this.setupRelationshipConnections();
        } else {
            console.log('❌ NO RELATIONSHIPS - Using sequential connections');
            if (!this.relationships) {
                console.log('  Issue: this.relationships is null/undefined');
            } else if (this.relationships.length === 0) {
                console.log('  Issue: this.relationships array is empty');
            }
            this.setupBasicConnections(nodeData);
        }
        console.log('=== END SETUP CONNECTIONS ===');
    }

    // Reset all nodes to their proper baseline size
    resetAllNodeScaling() {
        this.visualNodes.forEach(node => {
            node.scaleShape(1); // Reset to baseline
        });
    }

    // Calculate edge-to-edge connection points for better arrow rendering
    calculateConnectionPoints(fromNode, toNode) {
        const fromCenter = { x: fromNode.position.x, y: fromNode.position.y };
        const toCenter = { x: toNode.position.x, y: toNode.position.y };

        // Calculate angle between nodes
        const dx = toCenter.x - fromCenter.x;
        const dy = toCenter.y - fromCenter.y;
        const angle = Math.atan2(dy, dx);

        // Calculate exit point from source node boundary
        const fromPoint = this.getNodeBoundaryPoint(fromNode, angle);

        // Calculate entry point to target node boundary (opposite direction)
        const toPoint = this.getNodeBoundaryPoint(toNode, angle + Math.PI);

        return { from: fromPoint, to: toPoint };
    }

    getNodeBoundaryPoint(node, angle) {
        const centerX = node.position.x;
        const centerY = node.position.y;
        const nodeRadius = 20; // Standard node radius

        // Determine if it's a circle or diamond node
        const isCircle = node.type === 'core' || node.type === 'support';

        if (isCircle) {
            // For circular nodes, calculate point on circle
            return {
                x: centerX + nodeRadius * Math.cos(angle),
                y: centerY + nodeRadius * Math.sin(angle)
            };
        } else {
            // For diamond nodes, calculate intersection with diamond boundary
            const size = nodeRadius;
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);

            // Diamond boundary intersection calculation
            const absX = Math.abs(cos);
            const absY = Math.abs(sin);

            let boundaryX, boundaryY;

            if (absX * size >= absY * size) {
                // Intersect with left/right sides
                boundaryX = centerX + (cos > 0 ? size : -size);
                boundaryY = centerY + sin * size / absX;
            } else {
                // Intersect with top/bottom sides
                boundaryX = centerX + cos * size / absY;
                boundaryY = centerY + (sin > 0 ? size : -size);
            }

            return { x: boundaryX, y: boundaryY };
        }
    }

    // Create smart path that avoids node collisions with simple perpendicular offset
    createSmartPath(fromPoint, toPoint, fromNodeId, toNodeId) {
        const x1 = fromPoint.x;
        const y1 = fromPoint.y;
        const x2 = toPoint.x;
        const y2 = toPoint.y;

        // Check if direct path passes near any other nodes
        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;

        const hasCollision = Array.from(this.visualNodes.values()).some(node => {
            // Skip the source and target nodes
            if (node.nodeId === fromNodeId || node.nodeId === toNodeId) return false;

            const dx = node.position.x - midX;
            const dy = node.position.y - midY;
            return Math.sqrt(dx * dx + dy * dy) < 35; // 35px collision threshold
        });

        if (!hasCollision) {
            // Straight line path
            return `M ${x1},${y1} L ${x2},${y2}`;
        }

        // Add gentle perpendicular offset to avoid collision
        const angle = Math.atan2(y2 - y1, x2 - x1);
        const offsetDistance = 50; // How far to bend the arrow
        const offsetX = midX + Math.sin(angle) * offsetDistance;
        const offsetY = midY - Math.cos(angle) * offsetDistance;

        // Create curved path using quadratic bezier
        return `M ${x1},${y1} Q ${offsetX},${offsetY} ${x2},${y2}`;
    }

    async setupRelationshipConnections() {
        console.log('=== RELATIONSHIP CONNECTION DEBUGGING ===');
        console.log(`Total relationships to process: ${this.relationships.length}`);
        console.log('Available visual nodes:', Array.from(this.visualNodes.keys()));

        const relationshipStyles = {
            'LEADS_TO': { stroke: '#007AFF', strokeWidth: 2, marker: 'arrow-leads-to' },
            'prerequisite': { stroke: '#FF6B6B', strokeWidth: 1.5, marker: 'arrow-prerequisite' },
            'PREREQUISITE_FOR': { stroke: '#FF6B6B', strokeWidth: 1.5, marker: 'arrow-prerequisite' },
            'enrichment': { stroke: '#51CF66', strokeWidth: 1, marker: 'arrow-enrichment' }
        };

        let successfulConnections = 0;
        let failedConnections = 0;

        // Process relationships in chunks to prevent browser hang
        const RELATIONSHIP_BATCH_SIZE = 5;

        for (let i = 0; i < this.relationships.length; i += RELATIONSHIP_BATCH_SIZE) {
            const batch = this.relationships.slice(i, i + RELATIONSHIP_BATCH_SIZE);

            // Process batch synchronously within single frame
            batch.forEach((rel, batchIndex) => {
                const globalIndex = i + batchIndex + 1;
                console.log(`Relationship ${globalIndex}: ${rel.from} --[${rel.type}]--> ${rel.to}`);

                const fromNode = this.visualNodes.get(rel.from);
                const toNode = this.visualNodes.get(rel.to);

                if (fromNode && toNode) {
                    const style = relationshipStyles[rel.type] || relationshipStyles['LEADS_TO'];
                    this.createStyledConnection(fromNode, toNode, style, rel.explanation);
                    successfulConnections++;
                    console.log(`  ✅ SUCCESS: Created ${rel.type} connection`);
                } else {
                    failedConnections++;
                    console.log(`  ❌ FAILED: Missing nodes - fromNode: ${!!fromNode}, toNode: ${!!toNode}`);
                    if (!fromNode) console.log(`    Missing fromNode for ID: "${rel.from}"`);
                    if (!toNode) console.log(`    Missing toNode for ID: "${rel.to}"`);
                }
            });

            // Yield control to browser between batches
            if (i + RELATIONSHIP_BATCH_SIZE < this.relationships.length) {
                await this.nextFrame();
                console.log(`📊 Processed ${Math.min(i + RELATIONSHIP_BATCH_SIZE, this.relationships.length)}/${this.relationships.length} relationships`);
            }
        }

        console.log(`=== CONNECTION SUMMARY ===`);
        console.log(`Successful connections: ${successfulConnections}`);
        console.log(`Failed connections: ${failedConnections}`);
        console.log('=== END RELATIONSHIP DEBUGGING ===');
    }

    createConnection(fromNode, toNode) {
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('class', 'node-connection');

        // Simple center-to-center path for reliable creation
        const x1 = fromNode.position.x;
        const y1 = fromNode.position.y;
        const x2 = toNode.position.x;
        const y2 = toNode.position.y;

        // Create simple straight path
        const pathData = `M ${x1},${y1} L ${x2},${y2}`;
        path.setAttribute('d', pathData);
        path.setAttribute('stroke', '#8E8E93');
        path.setAttribute('stroke-width', '2');
        path.setAttribute('opacity', '0.6');

        // Add data attributes for node tracking
        path.setAttribute('data-from', fromNode.nodeId);
        path.setAttribute('data-to', toNode.nodeId);

        // Insert before nodes so lines appear behind
        this.networkContent.insertBefore(path, this.networkContent.firstChild);
    }

    createStyledConnection(fromNode, toNode, style, explanation) {
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('class', 'node-connection styled-connection');

        // Calculate edge-to-edge connection points
        const connectionPoints = this.calculateConnectionPoints(fromNode, toNode);

        // Create smart path that avoids collisions
        const pathData = this.createSmartPath(
            connectionPoints.from,
            connectionPoints.to,
            fromNode.nodeId,
            toNode.nodeId
        );

        path.setAttribute('d', pathData);
        path.setAttribute('stroke', style.stroke);
        path.setAttribute('stroke-width', style.strokeWidth);
        path.setAttribute('fill', 'none');
        path.setAttribute('opacity', '0.7');

        // Add arrowhead marker
        if (style.marker) {
            path.setAttribute('marker-end', `url(#${style.marker})`);
        }

        // Add data attributes for node tracking
        path.setAttribute('data-from', fromNode.nodeId);
        path.setAttribute('data-to', toNode.nodeId);

        // Add hover tooltip if explanation exists
        if (explanation) {
            path.style.cursor = 'pointer';
            path.addEventListener('mouseenter', (e) => {
                this.showConnectionTooltip(e, explanation);
            });
            path.addEventListener('mouseleave', () => {
                this.hideConnectionTooltip();
            });
            path.addEventListener('mousemove', (e) => {
                this.updateConnectionTooltipPosition(e);
            });
        }

        // Insert before nodes so paths appear behind
        this.networkContent.insertBefore(path, this.networkContent.firstChild);
    }


    // Batch arrow updates for performance
    batchUpdateConnections(nodeId) {
        if (this.arrowUpdateTimeout) {
            clearTimeout(this.arrowUpdateTimeout);
        }

        this.arrowUpdateTimeout = setTimeout(() => {
            this.updateConnectionsForNode(nodeId);
        }, 16); // ~60fps
    }

    updateConnectionsForNode(nodeId) {
        // Find all connections involving this node and update their positions
        const connections = this.networkContent.querySelectorAll('.node-connection');
        const node = this.visualNodes.get(nodeId);

        if (!node) return;

        connections.forEach(pathElement => {
            const fromNodeId = pathElement.getAttribute('data-from');
            const toNodeId = pathElement.getAttribute('data-to');

            // Get both nodes for boundary calculations
            const fromNode = this.visualNodes.get(fromNodeId);
            const toNode = this.visualNodes.get(toNodeId);

            if (!fromNode || !toNode) return;

            // Update connection with edge-to-edge calculations and collision avoidance
            if (fromNodeId === nodeId || toNodeId === nodeId) {
                const connectionPoints = this.calculateConnectionPoints(fromNode, toNode);
                const pathData = this.createSmartPath(
                    connectionPoints.from,
                    connectionPoints.to,
                    fromNodeId,
                    toNodeId
                );
                pathElement.setAttribute('d', pathData);
            }
        });
    }


    showConnectionTooltip(e, explanation) {
        if (!this.connectionTooltip) {
            this.connectionTooltip = document.createElement('div');
            this.connectionTooltip.style.cssText = `
                position: fixed;
                background: rgba(0, 0, 0, 0.9);
                color: white;
                padding: 8px 12px;
                border-radius: 6px;
                font-size: 12px;
                z-index: 1000;
                pointer-events: none;
                max-width: 250px;
                line-height: 1.4;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            `;
            document.body.appendChild(this.connectionTooltip);
        }

        this.connectionTooltip.textContent = explanation;
        this.connectionTooltip.style.display = 'block';
        this.updateConnectionTooltipPosition(e);
    }

    updateConnectionTooltipPosition(e) {
        if (!this.connectionTooltip) return;

        let left = e.clientX + 10;
        let top = e.clientY - 10;

        // Prevent tooltip from going off screen
        const tooltipRect = this.connectionTooltip.getBoundingClientRect();
        if (left + tooltipRect.width > window.innerWidth) {
            left = e.clientX - tooltipRect.width - 10;
        }

        this.connectionTooltip.style.left = left + 'px';
        this.connectionTooltip.style.top = top + 'px';
    }

    hideConnectionTooltip() {
        if (this.connectionTooltip) {
            this.connectionTooltip.style.display = 'none';
        }
    }

    // Make VisualNode available as instance property
    VisualNode = class {
        constructor(nodeData, position, parent) {
            this.nodeId = nodeData.nodeId;
            this.title = nodeData.title || nodeData.nodeId;
            this.status = nodeData.status || 'empty';
            this.position = position;
            this.parent = parent;
            this.elements = {};

            // Store metadata
            this.type = nodeData.type || 'core';
            this.difficulty = nodeData.difficulty || null;
            this.timeMinutes = nodeData.timeMinutes || null;
            this.description = nodeData.description || '';
            this.textbookPages = nodeData.textbookPages || '';

            // Drag state
            this.isDragging = false;
            this.dragStartX = 0;
            this.dragStartY = 0;

            // Store original dimensions for consistent scaling
            this.originalRadius = this.type === 'enrichment' ? 28 : 20;

            this.createSVGElements();
        }

        createSVGElements() {
            // Create node group
            this.elements.group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            this.elements.group.setAttribute('class', 'visual-node');
            this.elements.group.setAttribute('data-node-id', this.nodeId);

            // Create shape (circle or diamond based on type)
            this.elements.shape = this.createNodeShape();

            // Create text
            this.elements.text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            this.elements.text.setAttribute('x', this.position.x);
            this.elements.text.setAttribute('y', this.position.y + 5);
            this.elements.text.setAttribute('text-anchor', 'middle');
            this.elements.text.setAttribute('class', 'node-text');
            this.elements.text.setAttribute('font-size', '12');
            this.elements.text.setAttribute('font-weight', '600');
            this.elements.text.textContent = this.nodeId;

            // Add to group
            this.elements.group.appendChild(this.elements.shape);
            this.elements.group.appendChild(this.elements.text);

            // Add click handler
            this.elements.group.addEventListener('click', (e) => {
                e.stopPropagation();
                this.parent.selectNode(this.nodeId);
            });

            // Add hover effects and tooltip
            this.elements.group.style.cursor = 'pointer';
            this.elements.group.addEventListener('mouseenter', (e) => {
                this.scaleShape(1.1);
                this.showTooltip(e);
            });
            this.elements.group.addEventListener('mouseleave', () => {
                this.scaleShape(1);
                this.hideTooltip();
            });
            this.elements.group.addEventListener('mousemove', (e) => {
                this.updateTooltipPosition(e);
            });

            // Add drag handlers
            this.elements.group.addEventListener('mousedown', (e) => this.startNodeDrag(e));

            this.updateStatus();
        }

        createNodeShape() {
            if (this.type === 'enrichment') {
                return this.createDiamond();
            } else if (this.type === 'support') {
                return this.createSupportCircle();
            } else {
                return this.createCircle();
            }
        }

        createCircle() {
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', this.position.x);
            circle.setAttribute('cy', this.position.y);
            circle.setAttribute('r', '20');
            circle.setAttribute('class', 'node-circle');
            return circle;
        }

        createSupportCircle() {
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', this.position.x);
            circle.setAttribute('cy', this.position.y);
            circle.setAttribute('r', '20');
            circle.setAttribute('class', 'node-circle node-support');
            return circle;
        }

        createDiamond() {
            const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
            const size = 20;
            const x = this.position.x;
            const y = this.position.y;

            const points = [
                `${x},${y-size}`,      // Top
                `${x+size},${y}`,      // Right
                `${x},${y+size}`,      // Bottom
                `${x-size},${y}`       // Left
            ].join(' ');

            polygon.setAttribute('points', points);
            polygon.setAttribute('class', 'node-diamond');
            return polygon;
        }

        getNodeColor(type, status) {
            const colorMatrix = {
                core: {
                    empty: '#C7C7CC',
                    draft: '#FF9500',
                    complete: '#34C759'
                },
                support: {
                    empty: '#A0C4FF',
                    draft: '#007AFF',
                    complete: '#0056CC'
                },
                enrichment: {
                    empty: '#A8E6A0',
                    draft: '#32D74B',
                    complete: '#2B8A3E'
                }
            };

            return colorMatrix[type]?.[status] || colorMatrix.core.empty;
        }

        updateStatus() {
            const color = this.getNodeColor(this.type, this.status);
            this.elements.shape.setAttribute('fill', color);
        }

        setSelected(selected) {
            if (selected) {
                this.elements.shape.setAttribute('stroke', '#007AFF');
                this.elements.shape.setAttribute('stroke-width', '3');
            } else {
                this.elements.shape.removeAttribute('stroke');
                this.elements.shape.removeAttribute('stroke-width');
            }
        }

        scaleShape(scaleFactor) {
            if (this.elements.shape.tagName === 'circle') {
                // For circles, always scale from original radius to prevent accumulation
                const newRadius = this.originalRadius * scaleFactor;
                this.elements.shape.setAttribute('r', newRadius);
            } else if (this.elements.shape.tagName === 'polygon') {
                // For polygons, use transform scale
                if (scaleFactor === 1) {
                    this.elements.shape.removeAttribute('transform');
                } else {
                    const x = this.position.x;
                    const y = this.position.y;
                    this.elements.shape.setAttribute('transform', `scale(${scaleFactor}) translate(${x * (1 - scaleFactor)}, ${y * (1 - scaleFactor)})`);
                }
            }
        }

        showTooltip(e) {
            // Create tooltip if it doesn't exist
            if (!this.tooltip) {
                this.tooltip = document.createElement('div');
                this.tooltip.className = 'node-tooltip';
                this.tooltip.style.cssText = `
                    position: fixed;
                    background: rgba(0, 0, 0, 0.9);
                    color: white;
                    padding: 8px 12px;
                    border-radius: 6px;
                    font-size: 12px;
                    font-weight: 500;
                    z-index: 1000;
                    pointer-events: none;
                    max-width: 300px;
                    line-height: 1.4;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                `;
                document.body.appendChild(this.tooltip);
            }

            // Build tooltip content
            const parts = [];
            parts.push(`<strong>${this.nodeId}</strong> (${this.type})`);

            if (this.difficulty !== null) {
                parts.push(`Difficulty: ${this.difficulty}`);
            }

            if (this.timeMinutes !== null && this.timeMinutes > 0) {
                parts.push(`Time: ${this.timeMinutes} min`);
            }

            if (this.textbookPages) {
                parts.push(`Pages: ${this.textbookPages}`);
            }

            if (this.description && this.description.length > 0) {
                const shortDesc = this.description.length > 120
                    ? this.description.substring(0, 120) + '...'
                    : this.description;
                parts.push(`<div style="margin-top: 4px; opacity: 0.9;">${shortDesc}</div>`);
            }

            this.tooltip.innerHTML = parts.join('<br>');
            this.tooltip.style.display = 'block';
            this.updateTooltipPosition(e);
        }

        updateTooltipPosition(e) {
            if (!this.tooltip) return;

            const tooltipRect = this.tooltip.getBoundingClientRect();
            let left = e.clientX + 10;
            let top = e.clientY - 10;

            // Prevent tooltip from going off screen
            if (left + tooltipRect.width > window.innerWidth) {
                left = e.clientX - tooltipRect.width - 10;
            }

            if (top < 0) {
                top = e.clientY + 20;
            }

            this.tooltip.style.left = left + 'px';
            this.tooltip.style.top = top + 'px';
        }

        hideTooltip() {
            if (this.tooltip) {
                this.tooltip.style.display = 'none';
            }
        }

        startNodeDrag(e) {
            // Allow dragging with: Alt+drag, middle click, or left click in positioning mode
            const isAltDrag = this.parent.isAltPressed && e.button === 0;
            const isMiddleClick = e.button === 1;
            const isLeftClickInPositioningMode = e.button === 0 && this.parent.positioningMode && !this.parent.isAltPressed;

            if (!isAltDrag && !isMiddleClick && !isLeftClickInPositioningMode) return;

            e.stopPropagation();
            e.preventDefault();

            this.isDragging = true;
            this.dragStartX = e.clientX;
            this.dragStartY = e.clientY;

            // Add global mouse event listeners
            document.addEventListener('mousemove', this.handleNodeDrag.bind(this));
            document.addEventListener('mouseup', this.endNodeDrag.bind(this));

            // Visual feedback - different styles for different drag modes
            if (isAltDrag) {
                this.elements.group.style.opacity = '0.7';
                this.elements.group.style.filter = 'brightness(1.2)';
            } else if (isMiddleClick) {
                this.elements.group.style.opacity = '0.6';
                this.elements.group.style.filter = 'hue-rotate(30deg)';
            } else {
                this.elements.group.style.opacity = '0.8';
            }
        }

        handleNodeDrag(e) {
            if (!this.isDragging) return;

            e.preventDefault();

            const deltaX = e.clientX - this.dragStartX;
            const deltaY = e.clientY - this.dragStartY;

            // Calculate new position with constraints
            const newX = this.position.x + deltaX / this.parent.visualScale;
            const newY = this.position.y + deltaY / this.parent.visualScale;

            // Apply position constraints
            const constrainedPos = this.constrainPosition(newX, newY);

            // Update position
            this.updatePosition(constrainedPos.x, constrainedPos.y);

            // Update drag start for next delta calculation
            this.dragStartX = e.clientX;
            this.dragStartY = e.clientY;

            // Update connections in real-time with batching
            this.parent.batchUpdateConnections(this.nodeId);
        }

        async endNodeDrag(e) {
            if (!this.isDragging) return;

            this.isDragging = false;

            // Remove global mouse event listeners
            document.removeEventListener('mousemove', this.handleNodeDrag.bind(this));
            document.removeEventListener('mouseup', this.endNodeDrag.bind(this));

            // Reset visual feedback
            this.elements.group.style.opacity = '1';
            this.elements.group.style.filter = 'none';

            // Ensure scaling is reset to baseline
            this.scaleShape(1);

            // Save node positions after drag ends
            await this.parent.saveNodePositions();
        }

        constrainPosition(x, y) {
            // Allow infinite canvas - no artificial boundaries
            return {
                x: x,
                y: y
            };
        }

        updatePosition(x, y) {
            this.position.x = x;
            this.position.y = y;

            // Update shape position
            if (this.elements.shape.tagName === 'circle') {
                this.elements.shape.setAttribute('cx', x);
                this.elements.shape.setAttribute('cy', y);
            } else if (this.elements.shape.tagName === 'polygon') {
                // Update diamond position by recalculating points
                const size = 20;
                const points = [
                    [x, y - size],      // top
                    [x + size, y],      // right
                    [x, y + size],      // bottom
                    [x - size, y]       // left
                ];
                this.elements.shape.setAttribute('points', points.map(p => p.join(',')).join(' '));
            }

            // Update text position
            this.elements.text.setAttribute('x', x);
            this.elements.text.setAttribute('y', y + 5);
        }

        remove() {
            // Clean up tooltip
            if (this.tooltip) {
                this.tooltip.remove();
                this.tooltip = null;
            }

            if (this.elements.group && this.elements.group.parentNode) {
                this.elements.group.parentNode.removeChild(this.elements.group);
            }
        }
    };

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
                    // Load session data independently (parallel loading)
                    await Promise.allSettled([
                        this.loadSessionNodes(),
                        this.loadSessionRelationships()
                    ]);
                    return;
                }
            } catch (e) {
                console.log('Session validation failed, creating new session');
            }
        }

        // Create new session
        await this.createNewSession();
        // Load session data independently after session creation
        if (this.sessionId) {
            await Promise.allSettled([
                this.loadSessionNodes(),
                this.loadSessionRelationships()
            ]);
        }
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

    // Session Readiness Methods
    async ensureSessionReady() {
        // Wait for the session initialization promise
        if (this.sessionReadyPromise) {
            try {
                await this.sessionReadyPromise;
            } catch (error) {
                console.error('Session initialization failed, attempting data recovery:', error);
                // Try to recover session data instead of creating new session
                if (this.sessionId) {
                    console.log('Attempting to recover session data for existing session:', this.sessionId);
                    await Promise.allSettled([
                        this.loadSessionNodes(),
                        this.loadSessionRelationships()
                    ]);
                    return; // Exit early if we have a session ID and attempted recovery
                }
            }
        }

        // If session is still not ready, try to create a new one
        if (!this.sessionId) {
            console.log('Session not ready, creating new session');
            await this.createNewSession();
            // Load data for new session
            if (this.sessionId) {
                await Promise.allSettled([
                    this.loadSessionNodes(),
                    this.loadSessionRelationships()
                ]);
            }
        }

        // Final check
        if (!this.sessionId) {
            throw new Error('Failed to establish session');
        }
    }

    // Session Node Loading Methods
    async loadSessionNodes() {
        if (!this.sessionId) {
            console.log('No session ID available for node loading');
            return;
        }

        try {
            console.log('Loading nodes from session:', this.sessionId);
            const response = await fetch(`${this.apiBaseUrl}/session/${this.sessionId}/nodes`);
            const result = await response.json();

            if (response.ok && result.nodes && result.nodes.length > 0) {
                console.log(`Found ${result.nodes.length} session nodes to load`);

                // Create DOM elements for each session node
                result.nodes.forEach((sessionNode, index) => {
                    this.createSessionNodeElement(sessionNode, index);
                });

                // Calculate nodeCounter from highest node number
                const nodeNumbers = result.nodes.map(node => {
                    const match = node.node_id.match(/N(\d+)/);
                    return match ? parseInt(match[1]) : 0;
                });
                this.nodeCounter = Math.max(...nodeNumbers);
                console.log(`Set nodeCounter to ${this.nodeCounter} based on loaded nodes`);

                // Set selectedNode to first node if none selected
                if (!this.selectedNode && result.nodes.length > 0) {
                    this.selectedNode = result.nodes[0].node_id;
                    console.log(`Set selectedNode to ${this.selectedNode}`);

                    // Make first node active in DOM
                    const firstNodeElement = document.querySelector(`[data-node-id="${this.selectedNode}"]`);
                    if (firstNodeElement) {
                        firstNodeElement.classList.add('active');
                    }
                }

                console.log('Session nodes loaded successfully');
            } else {
                console.log('No session nodes found or empty session');
            }
        } catch (error) {
            console.error('Error loading session nodes:', error);
            console.log('Session node loading failed, continuing with empty state but preserving session');
            // Don't throw - preserve session and continue with empty state
        }
    }

    async loadSessionRelationships() {
        if (!this.sessionId) {
            console.log('No session ID available for relationship loading');
            return;
        }

        try {
            console.log('Loading relationships from session:', this.sessionId);
            const response = await fetch(`${this.apiBaseUrl}/session/${this.sessionId}/relationships`);
            const result = await response.json();

            if (response.ok && result.relationships && result.relationships.length > 0) {
                console.log(`Found ${result.relationships.length} session relationships to load`);

                // Transform database format to frontend format
                this.relationships = result.relationships.map(dbRel => ({
                    from: dbRel.from_node_id,
                    to: dbRel.to_node_id,
                    type: dbRel.relationship_type,
                    explanation: dbRel.explanation || ''
                }));

                console.log(`✅ Loaded ${this.relationships.length} relationships from session`);
            } else {
                console.log('No session relationships found or empty session');
                this.relationships = []; // Initialize empty array
            }
        } catch (error) {
            console.error('Error loading session relationships:', error);
            this.relationships = []; // Initialize empty on error
            // Don't throw - relationships are optional for basic functionality
        }
    }

    createSessionNodeElement(sessionNode, index) {
        const nodeId = sessionNode.node_id;

        // Check if node already exists in DOM to avoid duplicates
        const existingNode = document.querySelector(`[data-node-id="${nodeId}"]`);
        if (existingNode) {
            console.log(`Node ${nodeId} already exists in DOM, skipping`);
            return;
        }

        // Determine node type from ID prefix
        const nodeType = this.determineNodeType(nodeId);

        // Use session node data or fallbacks
        const title = sessionNode.title || nodeId;
        const status = this.getSessionNodeStatus(sessionNode);
        const contentCount = sessionNode.content_count || 0;

        // Store node data for group organization
        if (!this.nodesByType) {
            this.nodesByType = { core: [], support: [], enrichment: [] };
        }

        this.nodesByType[nodeType].push({
            nodeId,
            title,
            status,
            contentCount,
            sessionNode
        });

        // Rebuild the entire node list with proper grouping
        this.rebuildNodeListWithGroups();

        console.log(`Added node ${nodeId} to ${nodeType} group`);
    }

    rebuildNodeListWithGroups() {
        // Clear existing content
        this.nodeList.innerHTML = '';

        // Create node type groups
        const nodeTypes = [
            { key: 'core', label: 'CORE NODES', icon: 'core' },
            { key: 'support', label: 'SUPPORT NODES', icon: 'support' },
            { key: 'enrichment', label: 'ENRICHMENT NODES', icon: 'enrichment' }
        ];

        nodeTypes.forEach(type => {
            const nodes = this.nodesByType[type.key] || [];
            if (nodes.length > 0) {
                this.nodeList.appendChild(this.createNodeTypeGroup(type, nodes));
            }
        });
    }

    createNodeTypeGroup(type, nodes) {
        const group = document.createElement('div');
        group.className = 'downloads-node-type-group';

        // Header
        const header = document.createElement('div');
        header.className = 'downloads-node-type-header';
        header.innerHTML = `
            <div class="downloads-node-type-label">
                <div class="downloads-node-type-icon ${type.icon}"></div>
                <span>${type.label}</span>
                <span class="downloads-node-type-count">(${nodes.length})</span>
            </div>
            <span class="downloads-collapse-icon">▼</span>
        `;
        header.addEventListener('click', () => this.toggleGroup(type.key));

        // Content
        const content = document.createElement('div');
        content.className = 'downloads-node-type-content';
        content.id = `group-content-${type.key}`;

        nodes.forEach(nodeData => {
            content.appendChild(this.createDownloadsNodeItem(nodeData, type.key));
        });

        group.appendChild(header);
        group.appendChild(content);
        return group;
    }

    createDownloadsNodeItem(nodeData, nodeType) {
        const { nodeId, title, status, contentCount } = nodeData;

        const item = document.createElement('div');
        item.className = `node-item downloads-node-item ${nodeType}`;
        item.setAttribute('data-node-id', nodeId);

        if (this.selectedNode === nodeId) {
            item.classList.add('active');
        }

        // Downloads-style node structure
        item.innerHTML = `
            <div class="downloads-node-collapsed">
                <div class="downloads-node-header-row">
                    <div class="downloads-node-main-info">
                        <div class="downloads-node-title-row">
                            <span class="downloads-node-id">${nodeId}</span>
                            <span class="downloads-node-title">${title}</span>
                        </div>
                        <div class="downloads-node-metadata">
                            <div class="downloads-metadata-item">
                                <div class="downloads-status-dot ${status}"></div>
                                <span>${contentCount} components</span>
                            </div>
                        </div>
                    </div>
                    <button class="downloads-node-edit-btn" onclick="event.stopPropagation(); window.cmsApp.toggleEdit('${nodeId}')">✏️</button>
                </div>
            </div>
            <div class="downloads-node-expanded">
                <div class="downloads-edit-row">
                    <div class="downloads-edit-section">
                        <label class="downloads-edit-label">Node ID</label>
                        <input type="text" class="downloads-edit-input node-id-input" value="${nodeId}" id="edit-id-${nodeId}">
                    </div>
                    <div class="downloads-edit-section" style="flex: 2;">
                        <label class="downloads-edit-label">Title</label>
                        <input type="text" class="downloads-edit-input" value="${title}" id="edit-title-${nodeId}">
                    </div>
                </div>
                <div class="downloads-edit-row">
                    <div class="downloads-edit-section">
                        <label class="downloads-edit-label">Type</label>
                        <select class="downloads-edit-select" id="edit-type-${nodeId}">
                            <option value="core" ${nodeType === 'core' ? 'selected' : ''}>Core</option>
                            <option value="support" ${nodeType === 'support' ? 'selected' : ''}>Support</option>
                            <option value="enrichment" ${nodeType === 'enrichment' ? 'selected' : ''}>Enrichment</option>
                        </select>
                    </div>
                    <div class="downloads-edit-section">
                        <label class="downloads-edit-label">Status</label>
                        <select class="downloads-edit-select" id="edit-status-${nodeId}">
                            <option value="empty" ${status === 'empty' ? 'selected' : ''}>Empty</option>
                            <option value="draft" ${status === 'draft' ? 'selected' : ''}>Draft</option>
                            <option value="complete" ${status === 'complete' ? 'selected' : ''}>Complete</option>
                        </select>
                    </div>
                </div>
                <div class="downloads-edit-actions">
                    <button class="downloads-btn downloads-btn-secondary" onclick="window.cmsApp.cancelEdit('${nodeId}')">Cancel</button>
                    <button class="downloads-btn downloads-btn-primary" onclick="window.cmsApp.saveEdit('${nodeId}')">Save Changes</button>
                </div>
            </div>

            <!-- Legacy structure for compatibility -->
            <div class="node-indicator" style="display: none;"></div>
            <div class="node-info" style="display: none;">
                <div class="node-id">${nodeId}</div>
                <div class="node-title">${title}</div>
            </div>
            <div class="node-status ${status}" style="display: none;"></div>
        `;

        // Add click handler for node selection (but not when editing)
        item.addEventListener('click', (e) => {
            // Prevent event bubbling to avoid double selectNode calls from delegated handler
            e.stopPropagation();

            console.log(`🖱️ Sophisticated UI node clicked: ${nodeId}`, {
                hasEditingClass: item.classList.contains('editing'),
                classList: item.classList.toString(),
                target: e.target,
                currentTarget: e.currentTarget
            });

            if (!item.classList.contains('editing')) {
                console.log(`✅ Calling selectNode(${nodeId})`);
                this.selectNode(nodeId);
            } else {
                console.log(`❌ Node ${nodeId} is in editing mode, skipping selection`);
            }
        });

        return item;
    }

    toggleGroup(groupKey) {
        const group = document.querySelector(`#group-content-${groupKey}`).parentElement;
        group.classList.toggle('collapsed');
    }

    getSessionNodeStatus(sessionNode) {
        // Determine status based on session node data
        if (sessionNode.content_count && sessionNode.content_count > 0) {
            return 'draft'; // Has content
        }
        return 'empty'; // No content yet
    }

    // Enhanced Node List Methods
    determineNodeType(nodeId) {
        // Determine node type from ID prefix with validation
        if (!this.isValidNodeId(nodeId)) {
            console.warn(`⚠️ Invalid node ID format: ${nodeId}, using core as fallback`);
            return 'core';
        }

        if (nodeId.startsWith('N')) return 'core';
        if (nodeId.startsWith('S')) return 'support';
        if (nodeId.startsWith('E')) return 'enrichment';
        return 'core'; // Default fallback
    }

    // Node ID validation to prevent future malformed IDs
    isValidNodeId(nodeId) {
        // Valid format: N001, S001, E001 (letter + 3 digits)
        const validPattern = /^[NSE]\d{3}$/;
        return validPattern.test(nodeId);
    }

    toggleEdit(nodeId) {
        const nodeElement = document.querySelector(`[data-node-id="${nodeId}"]`);
        if (!nodeElement) return;

        if (nodeElement.classList.contains('editing')) {
            this.cancelEdit(nodeId);
        } else {
            // Cancel any other editing nodes first
            document.querySelectorAll('.node-item.editing').forEach(el => {
                el.classList.remove('editing');
            });

            nodeElement.classList.add('editing');
            console.log(`Started editing node: ${nodeId}`);
        }
    }

    cancelEdit(nodeId) {
        const nodeElement = document.querySelector(`[data-node-id="${nodeId}"]`);
        if (!nodeElement) return;

        nodeElement.classList.remove('editing');
        console.log(`Cancelled editing node: ${nodeId}`);
    }

    async saveEdit(nodeId) {
        const nodeElement = document.querySelector(`[data-node-id="${nodeId}"]`);
        if (!nodeElement) return;

        try {
            // Get edited values
            const newTitle = document.getElementById(`edit-title-${nodeId}`).value;
            const newType = document.getElementById(`edit-type-${nodeId}`).value;
            const newStatus = document.getElementById(`edit-status-${nodeId}`).value;

            console.log(`Saving node ${nodeId}:`, { newTitle, newType, newStatus });

            // Update session node via API - preserving existing session-based architecture
            const updateData = {
                title: newTitle,
                // Note: Type changes would require more complex backend handling
                // Status is informational for now
            };

            const response = await fetch(`${this.apiBaseUrl}/session/${this.sessionId}/nodes/${nodeId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updateData)
            });

            if (response.ok) {
                // Update Downloads-style DOM elements to reflect changes
                const titleElement = nodeElement.querySelector('.downloads-node-title');
                if (titleElement) {
                    titleElement.textContent = newTitle;
                }

                // Update legacy elements for compatibility
                const legacyTitleElement = nodeElement.querySelector('.node-title');
                if (legacyTitleElement) {
                    legacyTitleElement.textContent = newTitle;
                }

                // Update node type class if changed
                nodeElement.classList.remove('core', 'support', 'enrichment');
                nodeElement.classList.add(newType);
                nodeElement.setAttribute('data-node-type', newType);

                // Update nodesByType data structure
                if (this.nodesByType) {
                    // Remove from old type
                    ['core', 'support', 'enrichment'].forEach(type => {
                        this.nodesByType[type] = this.nodesByType[type].filter(n => n.nodeId !== nodeId);
                    });

                    // Add to new type with updated data
                    const nodeData = this.nodesByType[newType].find(n => n.nodeId === nodeId) ||
                                    { nodeId, title: newTitle, status: newStatus, contentCount: 0 };
                    nodeData.title = newTitle;
                    this.nodesByType[newType].push(nodeData);

                    // Rebuild groups if type changed
                    if (nodeElement.getAttribute('data-node-type') !== newType) {
                        this.rebuildNodeListWithGroups();
                    }
                }

                nodeElement.classList.remove('editing');
                console.log(`Successfully saved changes to node: ${nodeId}`);

                // Schedule auto-save for session persistence
                this.scheduleAutoSave();
            } else {
                console.error('Failed to save node changes:', response.statusText);
                alert('Failed to save changes. Please try again.');
            }
        } catch (error) {
            console.error('Error saving node changes:', error);
            alert('Error saving changes. Please try again.');
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

    // CSV Import Methods
    openCsvFileDialog() {
        this.csvFileInput.click();
    }

    async handleCsvFileSelection(event) {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        // Show visual feedback
        this.importCsvBtn.disabled = true;
        this.importCsvBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

        try {
            await this.processCsvFiles(files);
        } catch (error) {
            console.error('CSV import failed:', error);
            alert('CSV import failed: ' + error.message);
        } finally {
            // Reset button
            this.importCsvBtn.disabled = false;
            this.importCsvBtn.innerHTML = '<i class="fas fa-file-csv"></i> Import CSV';
            // Clear file input
            this.csvFileInput.value = '';
        }
    }

    async processCsvFiles(files) {
        let nodeFile = null;
        let relationshipFile = null;

        // Find the node and relationship CSV files
        for (let file of files) {
            if (file.name.includes('node-export') || file.name.includes('nodes')) {
                nodeFile = file;
            } else if (file.name.includes('relationship-export') || file.name.includes('relationships')) {
                relationshipFile = file;
            }
        }

        if (!nodeFile) {
            throw new Error('Node CSV file not found. Please include a file with "node-export" or "nodes" in the name.');
        }

        // Parse CSV files
        const csvParser = new this.CSVParser();
        const nodeData = await csvParser.parseFile(nodeFile);
        let relationshipData = [];

        if (relationshipFile) {
            relationshipData = await csvParser.parseFile(relationshipFile);
        }

        // Process and import data
        await this.importCsvData(nodeData, relationshipData);
    }

    async importCsvData(nodeData, relationshipData) {
        console.log('🚀 === CSV IMPORT STARTED ===');
        console.log('Input data:', { nodes: nodeData.length, relationships: relationshipData.length });

        // Clear existing nodes and visual network
        console.log('🧹 Clearing existing visual network...');
        this.clearVisualNetwork();
        this.nodeList.innerHTML = '';
        this.nodeCounter = 1;

        // Create session nodes first (database persistence)
        console.log('💾 Creating session nodes in database...');
        await this.createSessionNodesFromCsv(nodeData);
        console.log(`✅ Created ${nodeData.length} session nodes in database`);

        // Then create DOM nodes using session node creation
        console.log('📝 Creating DOM nodes from session data...');
        await this.loadSessionNodes();
        console.log(`✅ Created ${nodeData.length} DOM nodes from session`);

        // Build relationship data
        console.log('🔗 Processing relationships...');
        this.processRelationships(nodeData, relationshipData);
        console.log(`✅ Processed relationships: ${this.relationships ? this.relationships.length : 0} final relationships`);

        // Persist relationships to database
        if (this.relationships && this.relationships.length > 0) {
            console.log('💾 Persisting relationships to database...');
            await this.createSessionRelationshipsFromCsv();
            console.log(`✅ Persisted ${this.relationships.length} relationships to database`);
        } else {
            console.log('ℹ️ No relationships to persist');
        }

        // Rebuild visual network with new data
        console.log('🎨 Rebuilding visual network...');
        if (this.viewMode === 'visual') {
            console.log('  Mode: VISUAL - Initializing visual network');
            await this.initializeVisualNetwork();
        } else {
            console.log('  Mode: LIST - Visual network not initialized');
        }

        // Select first node if available
        if (nodeData.length > 0) {
            const firstNodeId = nodeData[0].node_id || 'N001';
            console.log(`🎯 Selecting first node: ${firstNodeId}`);
            this.selectNode(firstNodeId);
        }

        console.log('🎉 CSV import completed successfully');
        console.log('📊 Final state:', {
            visualNodes: this.visualNodes.size,
            relationships: this.relationships ? this.relationships.length : 0,
            viewMode: this.viewMode
        });
        console.log('=== CSV IMPORT COMPLETE ===');
    }

    // Legacy createNodeFromCsv function removed - CSV import now uses sophisticated UI via loadSessionNodes()

    // Helper method to extract node type from CSV data
    extractNodeType(csvNode) {
        // Primary: use 'type' field
        if (csvNode.type) return csvNode.type;

        // Secondary: parse from '~labels' field
        if (csvNode['~labels']) {
            const labels = csvNode['~labels'];
            if (labels.includes('support')) return 'support';
            if (labels.includes('enrichment')) return 'enrichment';
            if (labels.includes('core')) return 'core';
        }

        // Default fallback
        return 'core';
    }

    // Create session nodes from CSV data in database
    async createSessionNodesFromCsv(nodeData) {
        if (!this.sessionId) {
            console.error('No session ID available for creating CSV nodes');
            throw new Error('Session must be initialized before importing CSV nodes');
        }

        const creationPromises = nodeData.map(async (csvNode, index) => {
            const nodeId = csvNode.node_id || `N${String(index + 1).padStart(3, '0')}`;
            const title = csvNode.name || csvNode.title || nodeId;

            // Extract metadata for database storage
            const nodeType = this.extractNodeType(csvNode);
            const difficulty = csvNode.difficulty ? parseInt(csvNode.difficulty) : null;
            const timeMinutes = csvNode.time_minutes ? parseInt(csvNode.time_minutes) : null;
            const description = csvNode.description || '';
            const textbookPages = csvNode.textbook_pages || '';

            const sessionNodeData = {
                node_id: nodeId,
                title: title,
                raw_content: JSON.stringify({
                    type: nodeType,
                    difficulty: difficulty,
                    time_minutes: timeMinutes,
                    description: description,
                    textbook_pages: textbookPages,
                    original_csv_data: csvNode
                }),
                chapter_id: 1
            };

            try {
                const response = await fetch(`${this.apiBaseUrl}/session/${this.sessionId}/nodes`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(sessionNodeData)
                });

                if (!response.ok) {
                    const errorData = await response.json();

                    // Handle duplicate node conflicts gracefully
                    if (response.status === 400 && errorData.detail && errorData.detail.includes('already exists')) {
                        console.warn(`⚠️ Node ${nodeId} already exists in session, skipping`);
                        return { success: true, skipped: true, message: `Node ${nodeId} already exists` };
                    }

                    console.error(`Failed to create session node ${nodeId}:`, errorData);
                    throw new Error(`Failed to create session node ${nodeId}: ${errorData.detail || 'Unknown error'}`);
                }

                const result = await response.json();
                console.log(`✅ Created session node ${nodeId}:`, result);
                return result;
            } catch (error) {
                console.error(`Error creating session node ${nodeId}:`, error);

                // Allow CSV import to continue even if some nodes fail
                console.warn(`⚠️ Continuing CSV import despite error with node ${nodeId}`);
                return { success: false, error: error.message, nodeId: nodeId };
            }
        });

        try {
            const results = await Promise.all(creationPromises);
            const successful = results.filter(r => r.success && !r.skipped).length;
            const skipped = results.filter(r => r.success && r.skipped).length;
            const failed = results.filter(r => !r.success).length;

            console.log(`📊 CSV Session Node Creation Summary:`);
            console.log(`   ✅ Successfully created: ${successful}`);
            if (skipped > 0) console.log(`   ⚠️ Skipped (already exist): ${skipped}`);
            if (failed > 0) console.log(`   ❌ Failed: ${failed}`);

            // Only throw if all nodes failed
            if (failed === results.length) {
                throw new Error('All CSV nodes failed to create in session');
            }
        } catch (error) {
            console.error('Failed to create CSV nodes in session:', error);
            throw error;
        }
    }

    // Create session relationships from processed CSV data
    async createSessionRelationshipsFromCsv() {
        if (!this.sessionId) {
            console.error('No session ID available for creating CSV relationships');
            throw new Error('Session must be initialized before importing CSV relationships');
        }

        if (!this.relationships || this.relationships.length === 0) {
            console.log('No relationships to persist');
            return;
        }

        try {
            const response = await fetch(`${this.apiBaseUrl}/session/${this.sessionId}/relationships/bulk`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    relationships: this.relationships
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Failed to create session relationships:', errorData);
                throw new Error(`Failed to create session relationships: ${errorData.detail || 'Unknown error'}`);
            }

            const result = await response.json();
            console.log(`✅ Created ${result.count} session relationships:`, result);
            return result;
        } catch (error) {
            console.error('Error creating session relationships:', error);
            throw error;
        }
    }

    // Process relationships from CSV data
    processRelationships(nodeData, relationshipData) {
        console.log('=== CSV RELATIONSHIP PROCESSING DEBUGGING ===');
        console.log(`Input: ${nodeData.length} nodes, ${relationshipData.length} relationships`);

        // Initialize relationship storage
        this.relationships = [];
        this.csvIdMap = new Map();

        // Build CSV ID to node ID mapping with detailed logging
        console.log('Building CSV ID mappings:');
        nodeData.forEach((node, index) => {
            if (node['~id'] && node.node_id) {
                this.csvIdMap.set(node['~id'], node.node_id);
                console.log(`  ${index + 1}. "${node['~id']}" --> "${node.node_id}"`);
            } else {
                console.log(`  ${index + 1}. SKIPPED - Missing ~id or node_id:`, {
                    '~id': node['~id'],
                    'node_id': node.node_id
                });
            }
        });

        console.log(`Built ID mapping for ${this.csvIdMap.size} nodes`);
        console.log('Complete mapping:', Object.fromEntries(this.csvIdMap));

        // Process relationships with validation
        if (relationshipData && relationshipData.length > 0) {
            let validRelationships = 0;
            let skippedRelationships = 0;

            console.log('Processing relationships:');
            relationshipData.forEach((rel, index) => {
                console.log(`  Relationship ${index + 1}:`);
                console.log(`    Raw: "${rel['~start_node_id']}" --[${rel['~relationship_type']}]--> "${rel['~end_node_id']}"`);

                const fromId = this.csvIdMap.get(rel['~start_node_id']);
                const toId = this.csvIdMap.get(rel['~end_node_id']);

                console.log(`    Mapped: "${fromId}" --[${rel['~relationship_type']}]--> "${toId}"`);

                if (fromId && toId && fromId !== toId) {
                    const relationship = {
                        from: fromId,
                        to: toId,
                        type: rel['~relationship_type'] || rel.type || 'LEADS_TO',
                        explanation: rel.explanation || ''
                    };
                    this.relationships.push(relationship);
                    validRelationships++;
                    console.log(`    ✅ VALID: Added relationship`);
                } else {
                    skippedRelationships++;
                    console.log(`    ❌ SKIPPED: fromId=${!!fromId}, toId=${!!toId}, same=${fromId === toId}`);
                    if (!fromId) console.log(`      Missing mapping for start_node_id: "${rel['~start_node_id']}"`);
                    if (!toId) console.log(`      Missing mapping for end_node_id: "${rel['~end_node_id']}"`);
                    if (fromId === toId) console.log(`      Self-referencing relationship: "${fromId}"`);
                }
            });

            console.log(`Processed relationships: ${validRelationships} valid, ${skippedRelationships} skipped`);
            console.log('Final relationships array:', this.relationships);
        } else {
            console.log('No relationship data found, will use sequential connections');
        }
        console.log('=== END CSV RELATIONSHIP PROCESSING ===');
    }

    // CSV Parser Class
    CSVParser = class {
        async parseFile(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const csv = e.target.result;
                        const parsed = this.parseCSV(csv);
                        resolve(parsed);
                    } catch (error) {
                        reject(error);
                    }
                };
                reader.onerror = () => reject(new Error('Failed to read file'));
                reader.readAsText(file);
            });
        }

        parseCSV(csvText) {
            const lines = csvText.split('\n');
            if (lines.length < 2) return [];

            const headers = this.parseCSVLine(lines[0]);
            const data = [];

            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;

                const values = this.parseCSVLine(line);
                if (values.length !== headers.length) continue;

                const row = {};
                headers.forEach((header, index) => {
                    row[header] = values[index] || '';
                });
                data.push(row);
            }

            return data;
        }

        parseCSVLine(line) {
            // Clean line endings and whitespace
            const cleanLine = line.replace(/\r?\n$/, '').trim();

            const result = [];
            let current = '';
            let inQuotes = false;

            console.log(`Parsing line: "${cleanLine}" (length: ${cleanLine.length})`);

            for (let i = 0; i < cleanLine.length; i++) {
                const char = cleanLine[i];
                const nextChar = cleanLine[i + 1];

                if (char === '"') {
                    if (inQuotes && nextChar === '"') {
                        current += '"';
                        i++; // Skip next quote
                    } else {
                        inQuotes = !inQuotes;
                    }
                } else if (char === ',' && !inQuotes) {
                    result.push(current.trim());
                    current = '';
                } else {
                    current += char;
                }
            }

            // Push the final field
            result.push(current.trim());

            console.log(`Parsed ${result.length} fields:`, result.map((field, i) => `${i}: "${field}"`));
            return result;
        }
    };
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

// Bridge function to add new node - redirects to sophisticated UI system
function addNewNode() {
    if (!cmsInstance) return;
    return cmsInstance.addNewNode();
}

// Bridge function to select node
function selectNode(nodeId) {
    if (!cmsInstance) return;
    cmsInstance.selectNode(nodeId);
}

// Bridge function to delete current node - rebuilds sophisticated UI after deletion
function deleteCurrentNode() {
    if (!cmsInstance || !cmsInstance.selectedNode) return;

    const nodeElement = document.querySelector(`[data-node-id="${cmsInstance.selectedNode}"]`);
    if (nodeElement) {
        nodeElement.remove();
        // Reload session nodes to rebuild sophisticated UI
        cmsInstance.loadSessionNodes();
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
    // Make globally accessible for enhanced node list editing
    window.cmsApp = cmsInstance;
    console.log('Enhanced node list functionality ready');
});