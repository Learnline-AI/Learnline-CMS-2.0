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

        // Content/Question mode state
        this.currentMode = 'content'; // 'content' or 'question'

        // Chat panel state (managed by StateManager)
        this.chatPanel = null;
        this.openChatBtn = null;
        this.closeChatBtn = null;
        this.minimizeChatBtn = null;

        // Visual network zoom/pan state (managed by StateManager)
        this.positioningMode = false;

        // Keyboard state tracking (managed by StateManager)
        this.arrowUpdateTimeout = null;

        // Visual network nodes
        this.visualNodes = new Map(); // nodeId -> VisualNode instance
        this.nodeConnections = new Map(); // nodeId -> array of connected nodeIds

        // Relationship data - Initialize as empty array to prevent race conditions
        this.relationships = []; // Will be populated from database during session loading
        this.selectedNodesForRelationship = new Set(); // Multi-select for relationship creation

        // Relationship preview state
        this.previewArrow = null; // Reference to preview arrow path element
        this.previewButtons = null; // Reference to floating button container
        this.previewFromNodeId = null; // Track preview arrow direction
        this.previewToNodeId = null;

        // Session state
        this.sessionId = null;
        this.sessionReadyPromise = null; // Track session readiness
        // autoSaveTimeout, lastSaved, saveStatus - MOVED TO AutoSaveManager (Phase 14b)

        // Context update debouncing
        this.contextUpdateTimeout = null;
        this.contextUpdateDelay = 500; // 500ms debounce for context updates

        this.initializeElements();
        this.initializeStateManager();
        this.initializeComponentManager();
        this.initializePreviewManager();
        this.initializeAutoSaveManager();
        this.initializeUploadManager();
        this.bindEvents();
        this.initializeTextFormatting();
        this.updatePreview();
        this.initializeDefaultMode();

        // Initialize session asynchronously and store promise
        this.sessionReadyPromise = this.initializeSession().then(async () => {
            console.log('Session initialization completed');
            // Restore view mode state AFTER session loading completes
            await this.restoreViewModeState();
            // Initialize WebSocket chat after session is ready
            if (typeof initializeWebSocketChat === 'function') {
                initializeWebSocketChat(this);
            }
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

        // Mode toggle elements
        this.modeToggleButtons = document.querySelectorAll('.mode-toggle-btn');
        this.contentModeBtn = document.getElementById('content-mode-btn');
        this.questionModeBtn = document.getElementById('question-mode-btn');
        this.questionInterface = document.getElementById('question-mode-interface');
        this.editorLayout = document.querySelector('.editor-layout');
        this.templateEditorPanel = document.getElementById('template-editor-panel');
        this.livePreviewPanel = document.getElementById('live-preview-panel');
        this.positionModeBtn = document.getElementById('position-mode-btn');
        this.savePositionsBtn = document.getElementById('save-positions-btn');
        this.deleteNodeBtn = document.getElementById('delete-node-btn');
        this.createRelationshipBtn = document.getElementById('create-relationship-btn');

        // Chat slide-out drawer elements
        this.chatSlideContainer = document.getElementById('chat-slide-container');
        this.chatTab = document.getElementById('chat-tab'); // Legacy - may not exist if using animated button
        this.chatPanelOverlay = document.getElementById('chat-panel-overlay');
        this.closeChatDrawer = document.getElementById('close-chat-drawer');
        this.chatInput = document.getElementById('chat-input');
        this.sendChatBtn = document.getElementById('send-chat-btn');
        this.chatMessages = document.getElementById('chat-messages');
        this.chatContextIndicator = document.getElementById('current-node-name');

        // Selection tracking
        this.selectedComponent = null;
        this.hasTextSelection = false;
    }

    initializeStateManager() {
        // Initialize StateManager with callbacks
        this.state = new StateManager({
            callbacks: {
                onTransformChange: () => this.updateVisualTransform(),
                onChatPanelChange: (isOpen) => {
                    // Update DOM class for chat panel
                    if (this.chatSlideContainer) {
                        if (isOpen) {
                            this.chatSlideContainer.classList.add('open');
                        } else {
                            this.chatSlideContainer.classList.remove('open');
                        }
                    }
                }
            }
        });
    }

    initializeComponentManager() {
        // Initialize ComponentManager with dependency injection
        this.componentManager = new ComponentManager(
            this.editorCanvas,
            this.dropZone,
            ComponentRegistry,
            {
                onComponentChange: () => {
                    this.updatePreview();
                    this.scheduleAutoSave();
                }
            },
            {
                getSelectedColor: () => this.selectedComponentColor,
                getColorValue: (color) => this.getColorValue(color)
            },
            this.componentItems,
            this // Pass full CMS instance to components
        );
    }

    initializePreviewManager() {
        // Initialize PreviewManager with dependency injection
        this.previewManager = new PreviewManager(
            this.previewContent,
            this.dropZone,
            ComponentRegistry,
            this, // Pass full CMS instance for component creation
            {
                getSelectedNode: () => this.selectedNode,
                triggerSmileAnimation: () => this.triggerSmileAnimation(),
                extractComponentData: (component) => this.componentManager.extractData(component)
            }
        );
    }

    initializeAutoSaveManager() {
        // Initialize AutoSaveManager with dependency injection
        this.autoSaveManager = new AutoSaveManager(
            this.apiBaseUrl,
            this.componentManager,
            {
                getSessionId: () => this.sessionId,
                getSelectedNode: () => this.selectedNode,
                getDropZone: () => this.dropZone
            }
        );
    }

    initializeUploadManager() {
        // Initialize UploadManager with dependency injection
        this.uploadManager = new UploadManager(
            this.apiBaseUrl,
            this.componentManager,
            this, // Pass full CMS instance for calling clearVisualNetwork(), loadSessionNodes(), etc.
            {
                getUploadZone: () => this.aiUploadZone,
                getUploadText: () => this.aiUploadText,
                getEditorCanvas: () => this.editorCanvas,
                getCsvBtn: () => this.importCsvBtn,
                getCsvInput: () => this.csvFileInput,
                getNodeList: () => this.nodeList
            }
        );
    }

    bindEvents() {
        // Node navigation events
        this.addNodeBtn.addEventListener('click', async () => await this.addNewNode());
        this.nodeList.addEventListener('click', (e) => this.handleNodeClick(e));

        // CSV import events - Delegate to UploadManager
        this.importCsvBtn.addEventListener('click', () => this.uploadManager.openCsvDialog());
        this.csvFileInput.addEventListener('change', (e) => this.uploadManager.handleCsvSelection(e));

        // Component drag and drop events - Delegate to ComponentManager
        this.componentItems.forEach(item => {
            item.addEventListener('dragstart', (e) => this.componentManager.handleComponentDragStart(e));
        });

        // Drop zone events - Delegate to ComponentManager
        this.dropZone.addEventListener('dragover', (e) => this.componentManager.handleDragOver(e));
        this.dropZone.addEventListener('dragleave', (e) => this.componentManager.handleDragLeave(e));
        this.dropZone.addEventListener('drop', (e) => this.componentManager.handleDrop(e));

        // Save button
        this.saveBtn.addEventListener('click', () => this.saveNode());

        // Device selector - Delegate to PreviewManager
        this.deviceSelector.addEventListener('change', (e) => this.previewManager.changePreviewDevice(e));

        // Preview as Student - Delegate to PreviewManager
        if (this.previewStudentBtn) {
            this.previewStudentBtn.addEventListener('click', () => this.previewManager.openStudentView());
        }

        // Export - Delegate to PreviewManager
        this.exportBtn.addEventListener('click', () => this.previewManager.showExportOptions());

        // Color picker
        this.componentColorPicker.addEventListener('change', (e) => this.handleColorChange(e));

        // Selection detection events
        document.addEventListener('selectionchange', () => this.handleSelectionChange());
        this.editorCanvas.addEventListener('click', (e) => this.handleEditorClick(e));

        // AI upload events - Delegate to UploadManager
        this.aiUploadZone.addEventListener('click', () => this.pdfUploadInput.click());
        this.aiUploadZone.addEventListener('dragover', (e) => this.uploadManager.handlePDFDragOver(e));
        this.aiUploadZone.addEventListener('dragleave', (e) => this.uploadManager.handlePDFDragLeave(e));
        this.aiUploadZone.addEventListener('drop', (e) => this.uploadManager.handlePDFDrop(e));
        this.pdfUploadInput.addEventListener('change', (e) => this.uploadManager.uploadPDF(e.target.files[0]));

        // Toggle panel events
        if (this.toggleNodePanelBtn) {
            this.toggleNodePanelBtn.addEventListener('click', () => this.toggleNodePanel());
        }

        // Chat slide-out drawer events
        // Wire up animated chat button click handler
        this.setupAnimatedChatButton();
        
        // Legacy chat tab (if exists)
        if (this.chatTab) {
            this.chatTab.addEventListener('click', () => this.toggleChatDrawer());
        }
        if (this.closeChatDrawer) {
            this.closeChatDrawer.addEventListener('click', () => this.toggleChatDrawer());
        }
        if (this.sendChatBtn) {
            this.sendChatBtn.addEventListener('click', () => this.sendChatMessage());
        }
        if (this.chatInput) {
            this.chatInput.addEventListener('keydown', (e) => this.handleChatKeydown(e));
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
        if (this.deleteNodeBtn) {
            this.deleteNodeBtn.addEventListener('click', async () => await this.deleteNode());
        }
        if (this.createRelationshipBtn) {
            this.createRelationshipBtn.addEventListener('click', () => this.showRelationshipDialog());
        }

        // Mode toggle events
        this.modeToggleButtons.forEach(btn => {
            btn.addEventListener('click', (e) => this.handleModeToggle(e));
        });

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

        // Restore chat panel state from localStorage
        this.restoreChatPanelState();

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

    async deleteNode() {
        await this.ensureSessionReady();

        // Guard: Check if a node is selected
        if (!this.selectedNode) {
            alert('Please select a node to delete.');
            return;
        }

        const nodeId = this.selectedNode;

        // Count relationships that will be deleted
        const relationshipCount = this.relationships.filter(rel =>
            rel.from === nodeId || rel.to === nodeId
        ).length;

        // Confirmation dialog with relationship count
        const message = `Delete node ${nodeId}?\n\n` +
            `This will permanently delete:\n` +
            `• The node and all its content\n` +
            `• ${relationshipCount} relationship(s) connected to this node\n\n` +
            `This action cannot be undone.`;

        if (!confirm(message)) {
            return;
        }

        // Disable button during operation (prevent double-click)
        if (this.deleteNodeBtn) {
            this.deleteNodeBtn.disabled = true;
        }

        try {
            // Call API to delete node and relationships
            const response = await fetch(`${this.apiBaseUrl}/session/${this.sessionId}/nodes/${nodeId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Failed to delete node: ${errorData.detail || 'Unknown error'}`);
            }

            console.log(`✅ Successfully deleted node ${nodeId} from database`);

            // Update frontend state
            // 1. Filter relationships array
            this.relationships = this.relationships.filter(rel =>
                rel.from !== nodeId && rel.to !== nodeId
            );

            // 2. Remove SVG elements and delete from visualNodes Map
            const visualNode = this.visualNodes.get(nodeId);
            if (visualNode) {
                visualNode.remove();  // Removes SVG elements from DOM
            }
            this.visualNodes.delete(nodeId);

            // 3. Clear selection if deleted node was selected
            if (this.selectedNode === nodeId) {
                this.selectedNode = null;
                // Clear editor canvas
                if (this.editorCanvas) {
                    this.editorCanvas.innerHTML = '';
                }
            }

            // 4. Refresh UI based on view mode
            if (this.viewMode === 'visual') {
                await this.initializeVisualNetwork();
            } else {
                await this.loadSessionNodes();
            }

            console.log(`✅ Node ${nodeId} deleted successfully`);

        } catch (error) {
            console.error('Failed to delete node:', error);
            alert(`Failed to delete node: ${error.message}`);
            // Re-enable button on error so user can retry
            if (this.deleteNodeBtn) {
                this.deleteNodeBtn.disabled = false;
            }
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

            // Enable delete button when a node is selected
            if (this.deleteNodeBtn) {
                this.deleteNodeBtn.disabled = false;
            }

            // Send context update to backend (debounced)
            this.sendContextUpdate();

            // Update chat context indicator if chat is open
            if (this.state.isChatOpen()) {
                this.updateChatContext();
            }

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

    updateMultiSelectVisuals() {
        // Update visual appearance for multi-selected nodes (relationship creation)
        this.visualNodes.forEach((visualNode, nodeId) => {
            const isInMultiSelect = this.selectedNodesForRelationship.has(nodeId);
            const shape = visualNode.elements.shape;

            if (isInMultiSelect) {
                // Apply blue border for multi-selected nodes (use style for CSS specificity)
                shape.style.stroke = '#007AFF'; // Same blue as regular selection
                shape.style.strokeWidth = '3';
            } else {
                // Clear multi-select styling (preserve regular selection if applicable)
                const isRegularSelection = this.selectedNode === nodeId;
                if (!isRegularSelection) {
                    shape.style.stroke = '';
                    shape.style.strokeWidth = '';
                }
            }
        });

        console.log(`Multi-select updated: ${this.selectedNodesForRelationship.size} nodes selected`,
                    Array.from(this.selectedNodesForRelationship));

        // Update create relationship button state
        if (this.createRelationshipBtn) {
            this.createRelationshipBtn.disabled = this.selectedNodesForRelationship.size < 2;
        }
    }

    showRelationshipDialog() {
        // Convert Set to Array and extract node IDs
        const selectedNodes = Array.from(this.selectedNodesForRelationship);

        // Validate that we have exactly 2 nodes
        if (selectedNodes.length !== 2) {
            console.error('Must select exactly 2 nodes to create relationship');
            return;
        }

        // First selected = from, second selected = to
        const fromNodeId = selectedNodes[0];
        const toNodeId = selectedNodes[1];

        // Store in state for flip functionality
        this.previewFromNodeId = fromNodeId;
        this.previewToNodeId = toNodeId;

        console.log(`Creating relationship preview: ${fromNodeId} → ${toNodeId}`);

        // Draw preview arrow
        this.drawPreviewArrow(fromNodeId, toNodeId);

        // Show floating buttons
        this.showPreviewButtons();

        // Add click-outside listener with 50ms delay to prevent immediate trigger
        setTimeout(() => {
            this.clickOutsideHandler = (event) => {
                // Check if click is outside the preview buttons
                if (this.previewButtons && !this.previewButtons.contains(event.target)) {
                    console.log('Click outside detected - canceling preview');
                    this.clearPreviewState();
                }
            };
            document.addEventListener('click', this.clickOutsideHandler);
        }, 50);
    }

    drawPreviewArrow(fromNodeId, toNodeId) {
        // Get VisualNode instances
        const fromNode = this.visualNodes.get(fromNodeId);
        const toNode = this.visualNodes.get(toNodeId);

        // Validate nodes exist
        if (!fromNode || !toNode) {
            console.error('Cannot draw preview arrow: nodes not found', { fromNodeId, toNodeId });
            return;
        }

        // Define preview style (grey, semi-transparent, dotted)
        const previewStyle = {
            stroke: '#8E8E93',      // Grey color
            strokeWidth: 2,
            marker: 'arrowhead',    // Generic grey arrow marker
            opacity: 0.5            // Semi-transparent
        };

        // Reuse existing sophisticated arrow drawing logic
        const path = this.createStyledConnection(fromNode, toNode, previewStyle, null);

        // Make it dotted (5px dash, 5px gap)
        path.setAttribute('stroke-dasharray', '5,5');

        // Add preview-specific class for easy identification
        path.classList.add('preview-arrow');

        // Store reference for later removal
        this.previewArrow = path;

        console.log('Preview arrow created:', { fromNodeId, toNodeId });
    }

    showPreviewButtons() {
        // Get node instances for position calculation
        const fromNode = this.visualNodes.get(this.previewFromNodeId);
        const toNode = this.visualNodes.get(this.previewToNodeId);

        if (!fromNode || !toNode) {
            console.error('Cannot show preview buttons: nodes not found');
            return;
        }

        // Calculate midpoint in SVG coordinate space
        const svgMidX = (fromNode.position.x + toNode.position.x) / 2;
        const svgMidY = (fromNode.position.y + toNode.position.y) / 2;

        // Get SVG element and network content group
        const svg = document.getElementById('visual-network-svg');
        const networkContent = document.getElementById('network-content');

        // Create SVG point for coordinate transformation
        const point = svg.createSVGPoint();
        point.x = svgMidX;
        point.y = svgMidY;

        // Transform SVG coordinates to screen coordinates using CTM (Current Transformation Matrix)
        const screenPoint = point.matrixTransform(networkContent.getCTM());

        // Get SVG bounding rectangle for screen offset
        const svgRect = svg.getBoundingClientRect();

        // Calculate final screen position
        const finalX = screenPoint.x + svgRect.left;
        const finalY = screenPoint.y + svgRect.top;

        // Create button container
        const container = document.createElement('div');
        container.className = 'relationship-preview-buttons';
        container.style.position = 'fixed';
        container.style.left = `${finalX}px`;
        container.style.top = `${finalY}px`;
        container.style.transform = 'translate(-50%, -170%)'; // Position above midpoint
        container.style.zIndex = '10000';

        // Create flip button
        const flipBtn = document.createElement('button');
        flipBtn.className = 'preview-btn flip-btn';
        flipBtn.innerHTML = '<i class="fas fa-exchange-alt"></i>';
        flipBtn.title = 'Flip arrow direction';
        flipBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent click-outside handler
            this.flipPreviewDirection();
        });

        // Create accept button
        const acceptBtn = document.createElement('button');
        acceptBtn.className = 'preview-btn accept-btn';
        acceptBtn.innerHTML = '<i class="fas fa-check"></i>';
        acceptBtn.title = 'Accept relationship';
        acceptBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent click-outside handler
            this.acceptPreview();
        });

        // Assemble container
        container.appendChild(flipBtn);
        container.appendChild(acceptBtn);

        // Append to body
        document.body.appendChild(container);

        // Store reference
        this.previewButtons = container;

        console.log('Preview buttons created at:', { finalX, finalY });
    }

    flipPreviewDirection() {
        console.log('Flipping arrow direction');

        // Remove current preview arrow
        if (this.previewArrow) {
            this.previewArrow.remove();
            this.previewArrow = null;
        }

        // Swap from and to node IDs
        [this.previewFromNodeId, this.previewToNodeId] = [this.previewToNodeId, this.previewFromNodeId];

        // Redraw arrow in opposite direction
        this.drawPreviewArrow(this.previewFromNodeId, this.previewToNodeId);

        console.log(`Arrow flipped: ${this.previewFromNodeId} → ${this.previewToNodeId}`);
    }

    acceptPreview() {
        console.log('Accept button clicked - showing metadata panel');

        // CRITICAL FIX: Remove click-outside listener FIRST before hiding buttons
        if (this.clickOutsideHandler) {
            document.removeEventListener('click', this.clickOutsideHandler);
            this.clickOutsideHandler = null;
            console.log('Removed click-outside handler in acceptPreview');
        }

        // Hide flip/accept buttons (keep preview arrow visible)
        if (this.previewButtons) {
            this.previewButtons.style.display = 'none';
        }

        // Show metadata collection panel
        this.showMetadataPanel();
    }

    showMetadataPanel() {
        console.log('Opening relationship metadata panel');

        // Get panel and overlay elements
        const panel = document.getElementById('relationship-metadata-panel');
        const overlay = document.getElementById('panel-overlay');
        const fromDisplay = document.getElementById('from-node-display');
        const toDisplay = document.getElementById('to-node-display');
        const typeSelect = document.getElementById('relationship-type-select');
        const explanationTextarea = document.getElementById('relationship-explanation');
        const errorMessage = document.getElementById('panel-error-message');

        if (!panel || !overlay) {
            console.error('Panel elements not found');
            return;
        }

        // Populate from/to node display
        fromDisplay.textContent = this.previewFromNodeId;
        toDisplay.textContent = this.previewToNodeId;

        // Reset form
        typeSelect.value = 'LEADS_TO'; // Default to LEADS_TO
        explanationTextarea.value = '';
        errorMessage.style.display = 'none';

        // Show panel with slide-in animation
        overlay.classList.add('visible');
        panel.classList.add('panel-visible');

        // Set up event listeners
        const closeBtn = document.getElementById('panel-close-btn');
        const cancelBtn = document.getElementById('panel-cancel-btn');
        const saveBtn = document.getElementById('panel-save-btn');

        // Close button handler
        closeBtn.onclick = () => this.hideMetadataPanel();

        // Cancel button handler
        cancelBtn.onclick = () => this.hideMetadataPanel();

        // Save button handler
        saveBtn.onclick = () => {
            const selectedType = typeSelect.value;
            const explanation = explanationTextarea.value.trim();
            this.saveRelationship(selectedType, explanation);
        };

        // Type dropdown change handler - update preview arrow color
        typeSelect.onchange = (e) => {
            this.updatePreviewArrowColor(e.target.value);
        };

        // FIX: Escape key handler scoped to panel, not document (prevents space key blocking)
        this.panelEscapeHandler = (e) => {
            if (e.key === 'Escape') {
                this.hideMetadataPanel();
            }
        };
        panel.addEventListener('keydown', this.panelEscapeHandler);

        // Focus on dropdown for keyboard accessibility
        setTimeout(() => typeSelect.focus(), 300);

        console.log('Metadata panel opened');
    }

    hideMetadataPanel() {
        console.log('Closing relationship metadata panel');

        const panel = document.getElementById('relationship-metadata-panel');
        const overlay = document.getElementById('panel-overlay');

        if (!panel || !overlay) return;

        // Trigger slide-out animation
        panel.classList.remove('panel-visible');
        overlay.classList.remove('visible');

        // Wait for animation to complete, then cleanup
        setTimeout(() => {
            // Clear form values
            const typeSelect = document.getElementById('relationship-type-select');
            const explanationTextarea = document.getElementById('relationship-explanation');
            const errorMessage = document.getElementById('panel-error-message');

            if (typeSelect) typeSelect.value = 'LEADS_TO';
            if (explanationTextarea) explanationTextarea.value = '';
            if (errorMessage) errorMessage.style.display = 'none';

            // Remove event listeners to prevent memory leaks
            if (this.panelEscapeHandler && panel) {
                panel.removeEventListener('keydown', this.panelEscapeHandler);
                this.panelEscapeHandler = null;
            }

            // Clear preview state (removes arrow, buttons, resets selection)
            this.clearPreviewState();

            console.log('Metadata panel closed');
        }, 300); // Match CSS transition duration
    }

    async saveRelationship(type, explanation) {
        console.log('Saving relationship:', { type, explanation });

        // Get UI elements
        const saveBtn = document.getElementById('panel-save-btn');
        const errorMessage = document.getElementById('panel-error-message');

        // Validate type (explanation is optional)
        if (!type) {
            errorMessage.textContent = 'Please select a relationship type';
            errorMessage.style.display = 'block';
            return;
        }

        // Show loading state
        saveBtn.disabled = true;
        saveBtn.classList.add('loading');
        errorMessage.style.display = 'none';

        try {
            // Ensure session is ready
            await this.ensureSessionReady();

            // Build request body with API field name format
            const requestBody = {
                from_node_id: this.previewFromNodeId,    // Transform: from → from_node_id
                to_node_id: this.previewToNodeId,        // Transform: to → to_node_id
                relationship_type: type,                  // Transform: type → relationship_type
                explanation: explanation || '',
                created_by: 'USER',
                confidence_score: 1.0
            };

            console.log('Calling API with:', requestBody);

            // Call API to persist relationship
            const response = await fetch(
                `${this.apiBaseUrl}/session/${this.sessionId}/relationships`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestBody)
                }
            );

            if (!response.ok) {
                throw new Error(`API error: ${response.status} ${response.statusText}`);
            }

            const result = await response.json();
            
            // Trigger checkmark animation on success
            if (result.success) {
                this.triggerCheckmarkAnimation();
            }
            console.log('Relationship saved successfully:', result);

            // Add to local relationships array (frontend format!)
            this.relationships.push({
                from: this.previewFromNodeId,    // Frontend uses 'from'
                to: this.previewToNodeId,        // Frontend uses 'to'
                type: type,                      // Frontend uses 'type'
                explanation: explanation || ''
            });

            console.log(`Relationship added to local array. Total: ${this.relationships.length}`);

            // Hide panel (triggers slide-out animation and cleanup)
            this.hideMetadataPanel();

            // Wait for panel animation, then redraw permanent arrow
            setTimeout(async () => {
                // Redraw all connections to show new permanent arrow
                await this.setupRelationshipConnections();
                console.log('Permanent arrow rendered');
            }, 350); // Slightly longer than panel animation

        } catch (error) {
            console.error('Failed to save relationship:', error);

            // Show error in panel (keep panel open for retry)
            errorMessage.textContent = `Error: ${error.message}`;
            errorMessage.style.display = 'block';

            // Re-enable save button
            saveBtn.disabled = false;
            saveBtn.classList.remove('loading');
        }
    }

    updatePreviewArrowColor(relationshipType) {
        console.log('Updating preview arrow color to:', relationshipType);

        // Get current preview arrow
        if (!this.previewArrow) {
            console.warn('No preview arrow to update');
            return;
        }

        // Relationship type styles (must match setupRelationshipConnections)
        const relationshipStyles = {
            'LEADS_TO': { stroke: '#007AFF', strokeWidth: 2, marker: 'arrow-leads-to' },
            'prerequisite': { stroke: '#FF6B6B', strokeWidth: 1.5, marker: 'arrow-prerequisite' },
            'PREREQUISITE_FOR': { stroke: '#FF6B6B', strokeWidth: 1.5, marker: 'arrow-prerequisite' },
            'enrichment': { stroke: '#51CF66', strokeWidth: 1, marker: 'arrow-enrichment' }
        };

        // Get style for selected type (default to LEADS_TO)
        const style = relationshipStyles[relationshipType] || relationshipStyles['LEADS_TO'];

        // Update arrow styling
        this.previewArrow.setAttribute('stroke', style.stroke);
        this.previewArrow.setAttribute('stroke-width', style.strokeWidth);
        this.previewArrow.setAttribute('marker-end', `url(#${style.marker})`);
        // Keep dotted effect (don't remove stroke-dasharray)

        console.log(`Preview arrow updated to ${relationshipType} style`);
    }

    clearPreviewState() {
        console.log('Clearing preview state');

        // Remove preview arrow from DOM
        if (this.previewArrow) {
            this.previewArrow.remove();
            this.previewArrow = null;
        }

        // Remove button container from DOM
        if (this.previewButtons) {
            this.previewButtons.remove();
            this.previewButtons = null;
        }

        // Reset preview state variables
        this.previewFromNodeId = null;
        this.previewToNodeId = null;

        // Clear multi-select Set
        this.selectedNodesForRelationship.clear();

        // Remove visual indicators (green borders) from all nodes
        this.visualNodes.forEach((visualNode, nodeId) => {
            const element = visualNode.element;
            if (element) {
                element.classList.remove('selected-for-relationship');
            }
        });

        // Disable "Create Relationship" button
        if (this.createRelationshipBtn) {
            this.createRelationshipBtn.disabled = true;
        }

        // Remove click-outside event listener
        if (this.clickOutsideHandler) {
            document.removeEventListener('click', this.clickOutsideHandler);
            this.clickOutsideHandler = null;
        }

        console.log('Preview state cleared');
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
                // Recreate each component in the editor using ComponentManager
                this.componentManager.createComponentsFromSequence(data.components);
            } else {
                console.log(`📭 No components found for node ${nodeId}`);
            }

            // Note: updateDropZonePlaceholders is now handled by ComponentManager
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

    // Component Drag and Drop Methods - MOVED TO ComponentManager (Phase 13)

    // Component lifecycle methods - MOVED TO ComponentManager (Phase 13)

    // Mode Toggle Methods
    handleModeToggle(event) {
        const clickedButton = event.target.closest('.mode-toggle-btn');
        const targetMode = clickedButton.dataset.mode;

        if (targetMode !== this.currentMode) {
            this.currentMode = targetMode;

            if (targetMode === 'content') {
                this.switchToContentMode();
            } else if (targetMode === 'question') {
                this.switchToQuestionMode();
            }

            this.updateModeButtons();
        }
    }

    switchToContentMode() {
        // Add content-mode class to body/main container
        document.body.classList.remove('question-mode');
        document.body.classList.add('content-mode');

        // Hide question interface
        if (this.questionInterface) {
            this.questionInterface.style.display = 'none';
        }
    }

    switchToQuestionMode() {
        // Add question-mode class to body/main container
        document.body.classList.remove('content-mode');
        document.body.classList.add('question-mode');

        // Show question interface
        if (this.questionInterface) {
            this.questionInterface.style.display = 'flex';

            // Load React Question Builder if not already loaded
            if (!window.questionBuilderLoaded) {
                this.loadQuestionBuilder();
                window.questionBuilderLoaded = true;
            }

            // Update data attributes with current context
            this.questionInterface.setAttribute('data-session-id', this.sessionId || '');
            this.questionInterface.setAttribute('data-node-id', this.selectedNode || '');
        }
    }

    loadQuestionBuilder() {
        // Load CSS
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = '/questions/frontend/build/assets/index-DgNbtHZl.css';
        document.head.appendChild(link);

        // Load JS module
        const script = document.createElement('script');
        script.type = 'module';
        script.src = '/questions/frontend/build/assets/index-BlJCU0sk.js';
        document.body.appendChild(script);

        console.log('Question Builder loaded');
    }

    updateModeButtons() {
        this.modeToggleButtons.forEach(btn => {
            const buttonMode = btn.dataset.mode;
            if (buttonMode === this.currentMode) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    initializeDefaultMode() {
        // Initialize to content mode by default
        this.switchToContentMode();
        this.updateModeButtons();
    }

    // AI Upload Handlers
    // handleUploadDragOver - MOVED TO UploadManager (Phase 17)
    // handleUploadDragLeave - MOVED TO UploadManager (Phase 17)
    // handleUploadDrop - MOVED TO UploadManager (Phase 17)
    // handlePDFUpload - MOVED TO UploadManager (Phase 17)
    // handleProgressUpdate - MOVED TO UploadManager (Phase 17)
    // handleAIResponse - MOVED TO UploadManager (Phase 17)
    // handleImageUpload - DELETED (dead code, never called)

    // Component methods - MOVED TO ComponentManager (Phase 13)

    clearEditor() {
        const components = this.dropZone.querySelectorAll('.editor-component');
        components.forEach(component => component.remove());

        // Update placeholder visibility - delegate to ComponentManager
        this.componentManager.updateDropZonePlaceholders();
    }

    // Bridge method for components to remove themselves
    removeComponent(element) {
        this.componentManager.removeComponent(element);
    }

    // Preview Methods
    // Bridge method - maintains component interface contract
    updatePreview() {
        this.previewManager.updatePreview();
    }

    // extractComponentStyle - MOVED TO ComponentManager (Phase 13)
    // generatePreviewHTML - MOVED TO PreviewManager (Phase 14a)
    // generateContentForTemplate - MOVED TO PreviewManager (Phase 14a)
    // openStudentView - MOVED TO PreviewManager (Phase 14a)
    // showExportOptions - MOVED TO PreviewManager (Phase 14a)
    // exportNodeContent - MOVED TO PreviewManager (Phase 14a)
    // getNodeTitle - MOVED TO PreviewManager (Phase 14a)
    // generateLegacyPreview - MOVED TO PreviewManager (Phase 14a)
    // changePreviewDevice - MOVED TO PreviewManager (Phase 14a)

// Save Methods
    saveNode() {
        // Delegate to AutoSaveManager for immediate save
        this.autoSaveManager.saveNow();
    }

    // extractComponentData - MOVED TO ComponentManager (Phase 13)

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

    // Animated Chat Button Setup
    setupAnimatedChatButton() {
        // Wait for animated button to be initialized
        const checkButton = () => {
            if (window.animatedChatButton && window.animatedChatButton.getButton) {
                const button = window.animatedChatButton.getButton();
                if (button) {
                    // Track if button was dragged
                    let wasDragged = false;
                    let dragStartTime = 0;
                    
                    button.addEventListener('mousedown', () => {
                        wasDragged = false;
                        dragStartTime = Date.now();
                    });
                    
                    button.addEventListener('mousemove', () => {
                        if (Date.now() - dragStartTime > 100) {
                            wasDragged = true;
                        }
                    });
                    
                    button.addEventListener('click', (e) => {
                        // Only trigger if it wasn't a drag (quick click)
                        if (!wasDragged && Date.now() - dragStartTime < 200) {
                            this.toggleChatDrawer();
                        }
                    });
                    console.log('Animated chat button wired up');
                }
            } else {
                // Retry after a short delay
                setTimeout(checkButton, 100);
            }
        };
        checkButton();
    }

    // Trigger checkmark animation (for save operations)
    // Bridge method - maintains component interface contract
    triggerCheckmarkAnimation() {
        this.autoSaveManager.triggerCheckmark();
    }

    // Bridge method - maintains component interface contract (for export/milestone operations)
    triggerSmileAnimation() {
        this.autoSaveManager.triggerSmile();
    }

    // Chat Slide-Out Drawer Management
    toggleChatDrawer() {
        // Toggle state via StateManager (handles localStorage and DOM class via callback)
        const isOpen = this.state.toggleChatPanel();

        // Update context indicator when opening
        if (isOpen && this.selectedNode) {
            this.updateChatContext();
            // Send context update to sync backend with current state
            this.sendContextUpdate();
        }

        console.log(`Chat drawer ${isOpen ? 'opened' : 'closed'}`);
    }

    updateChatContext() {
        // Update the context indicator to show current node
        if (this.chatContextIndicator && this.selectedNode) {
            const selectedNodeElement = this.nodeList.querySelector(`[data-node-id="${this.selectedNode}"]`);
            if (selectedNodeElement) {
                const nodeName = selectedNodeElement.querySelector('.node-name')?.textContent || this.selectedNode;
                this.chatContextIndicator.textContent = nodeName;
            }
        }
    }

    sendContextUpdate() {
        // Debounced context update to backend via WebSocket
        // Clear any pending context update
        if (this.contextUpdateTimeout) {
            clearTimeout(this.contextUpdateTimeout);
        }

        // Set new timeout
        this.contextUpdateTimeout = setTimeout(() => {
            // Check if WebSocket is available and connected
            if (typeof window.mcpClient !== 'undefined' && window.mcpClient) {
                const contextData = {
                    type: 'context_update',
                    context: {
                        node_id: this.selectedNode,
                        session_id: this.sessionId,
                        screen: this.viewMode === 'visual' ? 'visual' : 'editor',
                        action: 'node_selected'
                    }
                };

                window.mcpClient.send(contextData);
                console.log('📍 Context update sent:', contextData);
            } else {
                console.log('⚠️ WebSocket not available for context update');
            }
        }, this.contextUpdateDelay);
    }

    sendChatMessage() {
        // Get message from input
        const message = this.chatInput.value.trim();
        if (!message) return;

        // Add user message to chat
        this.addChatMessage('user', message);

        // Clear input
        this.chatInput.value = '';
        this.chatInput.style.height = 'auto';

        // TODO: Send to backend WebSocket/API
        console.log('Chat message:', message, 'Node:', this.currentNodeId);

        // Placeholder response
        setTimeout(() => {
            this.addChatMessage('ai', 'Chat functionality connected! Backend integration coming soon...');
        }, 500);
    }

    handleChatKeydown(e) {
        // Send on Enter (but allow Shift+Enter for new line)
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            this.sendChatMessage();
        }
    }

    addChatMessage(type, content) {
        // Create message element
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message chat-message-${type}`;

        const messageContent = document.createElement('div');
        messageContent.className = 'chat-message-content';
        messageContent.textContent = content;

        messageDiv.appendChild(messageContent);

        // Add timestamp
        const timestamp = document.createElement('div');
        timestamp.className = 'chat-message-timestamp';
        timestamp.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        messageDiv.appendChild(timestamp);

        // Append to messages container
        this.chatMessages.appendChild(messageDiv);

        // Scroll to bottom
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    restoreChatPanelState() {
        // StateManager already restored state from localStorage
        // Just need to sync DOM with current state
        if (this.state.isChatOpen() && this.chatSlideContainer) {
            this.chatSlideContainer.classList.add('open');
        }
    }

    // View Mode Management Methods
    async toggleViewMode() {
        // Toggle state
        this.viewMode = this.viewMode === 'list' ? 'visual' : 'list';

        // Clear multi-select when switching modes to prevent confusion
        this.selectedNodesForRelationship.clear();
        if (this.createRelationshipBtn) {
            this.createRelationshipBtn.disabled = true;
        }

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
                // Trigger checkmark animation
                this.triggerCheckmarkAnimation();
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
        // StateManager handles bounds checking and transform update callback
        this.state.zoomIn();
    }

    zoomOut() {
        // StateManager handles bounds checking and transform update callback
        this.state.zoomOut();
    }

    resetView() {
        // StateManager handles transform reset and update callback
        this.state.resetTransform();
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
        const isSpacePan = this.state.isKeyPressed('space') && e.button === 0;
        const isMiddleClick = e.button === 1;
        const isLeftClickInNormalMode = e.button === 0 && !this.positioningMode && !this.state.isKeyPressed('space');

        if (!isSpacePan && !isMiddleClick && !isLeftClickInNormalMode) return;

        // StateManager handles pan state
        this.state.startPan(e.clientX, e.clientY);

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
        if (!this.state.isPanning()) return;

        // StateManager handles pan updates and transform callback
        this.state.updatePan(e.clientX, e.clientY);
        e.preventDefault();
    }

    endPan() {
        this.state.endPan();

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
            const transform = this.state.getTransform();
            this.networkContent.setAttribute(
                'transform',
                `translate(${transform.panX}, ${transform.panY}) scale(${transform.scale})`
            );
        }
    }

    handleWheelZoom(e) {
        // Only zoom when Ctrl key is pressed
        if (!e.ctrlKey) return;

        // Prevent default browser zoom
        e.preventDefault();

        // StateManager handles wheel zoom with bounds checking
        const direction = e.deltaY < 0 ? 1 : -1; // Negative deltaY = zoom in
        this.state.zoomWheel(direction);
    }

    // Keyboard event handlers
    handleKeyDown(e) {
        if (e.code === 'Space') {
            this.state.setKeyState('space', true);
            // Only prevent page scroll if not typing in input/textarea
            if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                e.preventDefault();
            }
        }
        if (e.code === 'AltLeft' || e.code === 'AltRight') {
            this.state.setKeyState('alt', true);
        }
    }

    handleKeyUp(e) {
        if (e.code === 'Space') {
            this.state.setKeyState('space', false);
        }
        if (e.code === 'AltLeft' || e.code === 'AltRight') {
            this.state.setKeyState('alt', false);
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

        return path; // Return path reference for preview functionality
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

                // Multi-select mode for relationship creation (Shift+Click in visual mode only)
                if (e.shiftKey && this.parent.viewMode === 'visual') {
                    // Toggle node in relationship selection set
                    if (this.parent.selectedNodesForRelationship.has(this.nodeId)) {
                        this.parent.selectedNodesForRelationship.delete(this.nodeId);
                    } else {
                        // Add the originally selected node first (if not already in the set)
                        if (this.parent.selectedNode && !this.parent.selectedNodesForRelationship.has(this.parent.selectedNode)) {
                            this.parent.selectedNodesForRelationship.add(this.parent.selectedNode);
                        }
                        this.parent.selectedNodesForRelationship.add(this.nodeId);
                    }
                    this.parent.updateMultiSelectVisuals();
                } else {
                    // Normal single-select mode (loads content, clears multi-select)
                    this.parent.selectedNodesForRelationship.clear();
                    // Disable create relationship button when clearing multi-select
                    if (this.parent.createRelationshipBtn) {
                        this.parent.createRelationshipBtn.disabled = true;
                    }
                    this.parent.selectNode(this.nodeId);
                }
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
                this.elements.shape.style.stroke = '#007AFF';
                this.elements.shape.style.strokeWidth = '3';
            } else {
                this.elements.shape.style.stroke = '';
                this.elements.shape.style.strokeWidth = '';
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
            const isAltDrag = this.parent.state.isKeyPressed('alt') && e.button === 0;
            const isMiddleClick = e.button === 1;
            const isLeftClickInPositioningMode = e.button === 0 && this.parent.positioningMode && !this.parent.state.isKeyPressed('alt');

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

            // Calculate new position with constraints (compensate for zoom)
            const scale = this.parent.state.getVisualScale();
            const newX = this.position.x + deltaX / scale;
            const newY = this.position.y + deltaY / scale;

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

    // Component reordering and insertion indicator methods - MOVED TO ComponentManager (Phase 13)

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
    // Bridge method - maintains component interface contract
    scheduleAutoSave() {
        this.autoSaveManager.scheduleSave();
    }

    // performAutoSave - MOVED TO AutoSaveManager (Phase 14b)
    // gatherCurrentContent - MOVED TO AutoSaveManager (Phase 14b)
    // updateSaveStatusUI - MOVED TO AutoSaveManager (Phase 14b)

// applyColorToComponent - MOVED TO ComponentManager (Phase 13)

    // CSV Import Methods - MOVED TO UploadManager (Phase 17)
    // openCsvFileDialog - MOVED TO UploadManager (Phase 17)
    // handleCsvFileSelection - MOVED TO UploadManager (Phase 17)
    // processCsvFiles - MOVED TO UploadManager (Phase 17)
    // importCsvData - MOVED TO UploadManager (Phase 17)
    // extractNodeType - MOVED TO UploadManager (Phase 17)
    // createSessionNodesFromCsv - MOVED TO UploadManager (Phase 17)
    // createSessionRelationshipsFromCsv - MOVED TO UploadManager (Phase 17)
    // processRelationships - MOVED TO UploadManager (Phase 17)

// CSV Parser Class - MOVED TO utils/CSVParser.js (Phase 17)
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
    cmsInstance.componentManager.createComponentsFromSequence(mockAISequence);
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
    cmsInstance.componentManager.createComponentsFromSequence(mockAISuggestions);
    console.log('AI component creation test completed!');
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    cmsInstance = new TemplateEditorCMS();
    // Make globally accessible for enhanced node list editing
    window.cmsApp = cmsInstance;
    console.log('Enhanced node list functionality ready');
});