/**
 * UploadManager - Handles all file upload functionality
 *
 * Responsibilities:
 * - PDF upload with streaming progress and AI vision processing
 * - CSV import (nodes and relationships) with database persistence
 * - File drag/drop interactions
 * - Progress feedback and error handling
 */

class UploadManager {
    /**
     * Constructor - Dependency Injection Pattern
     * @param {string} apiBaseUrl - Base URL for API calls
     * @param {ComponentManager} componentManager - For creating components from AI
     * @param {Object} cmsInstance - Full CMS instance for calling session/network methods
     * @param {Object} domElements - DOM element getters
     *   - domElements.getUploadZone() - PDF upload drag/drop zone
     *   - domElements.getUploadText() - Text inside upload zone
     *   - domElements.getEditorCanvas() - Editor canvas for CSS classes
     *   - domElements.getCsvBtn() - CSV import button
     *   - domElements.getCsvInput() - CSV file input
     *   - domElements.getNodeList() - Node list DOM element
     */
    constructor(apiBaseUrl, componentManager, cmsInstance, domElements) {
        this.apiBaseUrl = apiBaseUrl;
        this.componentManager = componentManager;
        this.cmsInstance = cmsInstance;
        this.domElements = domElements;
    }

    // ============================================================================
    // PDF UPLOAD METHODS
    // ============================================================================

    /**
     * Handle drag over event for PDF upload zone
     * @param {Event} e - Drag event
     */
    handlePDFDragOver(e) {
        e.preventDefault();
        const uploadZone = this.domElements.getUploadZone();
        uploadZone.classList.add('drag-over');
    }

    /**
     * Handle drag leave event for PDF upload zone
     * @param {Event} e - Drag event
     */
    handlePDFDragLeave(e) {
        e.preventDefault();
        const uploadZone = this.domElements.getUploadZone();
        uploadZone.classList.remove('drag-over');
    }

    /**
     * Handle drop event for PDF upload zone
     * @param {Event} e - Drop event
     */
    handlePDFDrop(e) {
        e.preventDefault();
        const uploadZone = this.domElements.getUploadZone();
        uploadZone.classList.remove('drag-over');
        const files = e.dataTransfer.files;
        if (files.length > 0 && files[0].type === 'application/pdf') {
            this.uploadPDF(files[0]);
        }
    }

    /**
     * Upload and process PDF with AI vision
     * @param {File} file - PDF file to upload
     */
    async uploadPDF(file) {
        if (!file || file.type !== 'application/pdf') {
            alert('Please select a PDF file');
            return;
        }

        const editorCanvas = this.domElements.getEditorCanvas();
        const uploadText = this.domElements.getUploadText();
        const selectedNode = this.cmsInstance.selectedNode;

        // Show progress and start animation
        editorCanvas.classList.add('ai-processing');
        uploadText.textContent = 'Starting PDF analysis...';

        try {
            const formData = new FormData();
            formData.append('file', file);

            // Use streaming endpoint for real-time progress
            const response = await fetch(`${this.apiBaseUrl}/nodes/${selectedNode}/analyze-pdf-vision-stream`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('Failed to start PDF analysis');
            }

            // Create reader for streaming response
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
                            this.updatePDFProgress(data);
                        } catch (e) {
                            console.log('Error parsing progress data:', e);
                        }
                    }
                }
            }

        } catch (error) {
            console.error('Error analyzing PDF:', error);
            uploadText.textContent = 'Analysis failed - please try again';
            alert('Failed to analyze PDF. Please try again.');
            // Stop animation after delay
            setTimeout(() => {
                uploadText.textContent = 'Drop PDF here for AI suggestions';
                editorCanvas.classList.remove('ai-processing');
            }, 2000);
        }
    }

    /**
     * Handle PDF processing progress updates
     * @param {Object} data - Progress data from streaming API
     */
    updatePDFProgress(data) {
        const uploadText = this.domElements.getUploadText();
        const editorCanvas = this.domElements.getEditorCanvas();

        switch (data.status) {
            case 'started':
                uploadText.textContent = data.message || 'Starting analysis...';
                break;
            case 'processing':
                uploadText.textContent = data.message || `Processing page ${data.current_page}...`;
                break;
            case 'page_completed':
                uploadText.textContent = data.message || `Completed page ${data.current_page}`;
                break;
            case 'completed':
                uploadText.textContent = data.message || 'Analysis completed!';
                break;
            case 'completed_with_errors':
                uploadText.textContent = data.message || `Completed with some errors (${data.successful_pages}/${data.total_pages} successful)`;
                break;
            case 'page_error':
                uploadText.textContent = data.message || `Page ${data.current_page} failed - continuing...`;
                break;
            case 'batch_cleanup':
                if (data.memory_usage_mb) {
                    uploadText.textContent = data.message || `Memory cleanup - ${data.memory_usage_mb}MB used`;
                } else {
                    uploadText.textContent = data.message || 'Memory cleanup...';
                }
                break;
            case 'memory_warning':
                uploadText.textContent = data.message || 'High memory usage detected';
                break;
            case 'warning':
                uploadText.textContent = data.message || 'Processing warning';
                break;
            case 'finished':
                // Final result received
                uploadText.textContent = 'Processing complete - updating interface...';
                this.handlePDFComplete(data.result);
                // Stop animation - success
                setTimeout(() => {
                    uploadText.textContent = 'Drop PDF here for AI suggestions';
                    editorCanvas.classList.remove('ai-processing');
                }, 1000);
                break;
            case 'error':
                uploadText.textContent = `Error: ${data.error}`;
                console.error('Analysis error:', data.error);
                // Stop animation after delay
                setTimeout(() => {
                    uploadText.textContent = 'Drop PDF here for AI suggestions';
                    editorCanvas.classList.remove('ai-processing');
                }, 3000);
                break;
            default:
                if (data.message) {
                    uploadText.textContent = data.message;
                }
        }
    }

    /**
     * Handle PDF processing completion
     * @param {Object} response - Final AI response with component sequence
     */
    handlePDFComplete(response) {
        if (response.component_sequence && response.component_sequence.length > 0) {
            // Create components directly from AI response using ComponentManager
            this.componentManager.createComponentsFromSequence(response.component_sequence);

            console.log(`AI generated ${response.component_sequence.length} components`);
        } else {
            alert('No content could be extracted from the PDF');
        }
    }

    // ============================================================================
    // CSV IMPORT METHODS
    // ============================================================================

    /**
     * Open CSV file selection dialog
     */
    openCsvDialog() {
        const csvInput = this.domElements.getCsvInput();
        csvInput.click();
    }

    /**
     * Handle CSV file selection
     * @param {Event} event - Change event from file input
     */
    async handleCsvSelection(event) {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        const csvBtn = this.domElements.getCsvBtn();

        // Show visual feedback
        csvBtn.disabled = true;
        csvBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

        try {
            await this.processCsvFiles(files);
        } catch (error) {
            console.error('CSV import failed:', error);
            alert('CSV import failed: ' + error.message);
        } finally {
            // Reset button
            csvBtn.disabled = false;
            csvBtn.innerHTML = '<i class="fas fa-file-csv"></i> Import CSV';
            // Clear file input
            const csvInput = this.domElements.getCsvInput();
            csvInput.value = '';
        }
    }

    /**
     * Process CSV files (identify and parse node/relationship files)
     * @param {FileList} files - Selected CSV files
     */
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
        const csvParser = new CSVParser();
        const nodeData = await csvParser.parseFile(nodeFile);
        let relationshipData = [];

        if (relationshipFile) {
            relationshipData = await csvParser.parseFile(relationshipFile);
        }

        // Process and import data
        await this.importCsvData(nodeData, relationshipData);
    }

    /**
     * Import CSV data (orchestrates multi-step import process)
     * @param {Array} nodeData - Parsed node data
     * @param {Array} relationshipData - Parsed relationship data
     */
    async importCsvData(nodeData, relationshipData) {
        console.log('🚀 === CSV IMPORT STARTED ===');
        console.log('Input data:', { nodes: nodeData.length, relationships: relationshipData.length });

        // Clear existing nodes and visual network
        console.log('🧹 Clearing existing visual network...');
        this.cmsInstance.clearVisualNetwork();
        const nodeList = this.domElements.getNodeList();
        nodeList.innerHTML = '';
        this.cmsInstance.nodeCounter = 1;

        // Create session nodes first (database persistence)
        console.log('💾 Creating session nodes in database...');
        await this.createSessionNodes(nodeData);
        console.log(`✅ Created ${nodeData.length} session nodes in database`);

        // Then create DOM nodes using session node creation
        console.log('📝 Creating DOM nodes from session data...');
        await this.cmsInstance.loadSessionNodes();
        console.log(`✅ Created ${nodeData.length} DOM nodes from session`);

        // Build relationship data
        console.log('🔗 Processing relationships...');
        this.processRelationships(nodeData, relationshipData);
        console.log(`✅ Processed relationships: ${this.cmsInstance.relationships ? this.cmsInstance.relationships.length : 0} final relationships`);

        // Persist relationships to database
        if (this.cmsInstance.relationships && this.cmsInstance.relationships.length > 0) {
            console.log('💾 Persisting relationships to database...');
            await this.createSessionRelationships();
            console.log(`✅ Persisted ${this.cmsInstance.relationships.length} relationships to database`);
        } else {
            console.log('ℹ️ No relationships to persist');
        }

        // Rebuild visual network with new data
        console.log('🎨 Rebuilding visual network...');
        if (this.cmsInstance.viewMode === 'visual') {
            console.log('  Mode: VISUAL - Initializing visual network');
            await this.cmsInstance.initializeVisualNetwork();
        } else {
            console.log('  Mode: LIST - Visual network not initialized');
        }

        // Select first node if available
        if (nodeData.length > 0) {
            const firstNodeId = nodeData[0].node_id || 'N001';
            console.log(`🎯 Selecting first node: ${firstNodeId}`);
            this.cmsInstance.selectNode(firstNodeId);
        }

        console.log('🎉 CSV import completed successfully');
        console.log('📊 Final state:', {
            visualNodes: this.cmsInstance.visualNodes.size,
            relationships: this.cmsInstance.relationships ? this.cmsInstance.relationships.length : 0,
            viewMode: this.cmsInstance.viewMode
        });
        console.log('=== CSV IMPORT COMPLETE ===');
    }

    /**
     * Extract node type from CSV data
     * @param {Object} csvNode - CSV node data
     * @returns {string} - Node type (core, support, enrichment)
     */
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

    /**
     * Create session nodes from CSV data in database
     * @param {Array} nodeData - Parsed node data
     */
    async createSessionNodes(nodeData) {
        const sessionId = this.cmsInstance.sessionId;

        if (!sessionId) {
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
                const response = await fetch(`${this.apiBaseUrl}/session/${sessionId}/nodes`, {
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

    /**
     * Create session relationships from processed CSV data
     */
    async createSessionRelationships() {
        const sessionId = this.cmsInstance.sessionId;

        if (!sessionId) {
            console.error('No session ID available for creating CSV relationships');
            throw new Error('Session must be initialized before importing CSV relationships');
        }

        if (!this.cmsInstance.relationships || this.cmsInstance.relationships.length === 0) {
            console.log('No relationships to persist');
            return;
        }

        try {
            const response = await fetch(`${this.apiBaseUrl}/session/${sessionId}/relationships/bulk`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    relationships: this.cmsInstance.relationships
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

    /**
     * Process relationships from CSV data
     * @param {Array} nodeData - Parsed node data
     * @param {Array} relationshipData - Parsed relationship data
     */
    processRelationships(nodeData, relationshipData) {
        console.log('=== CSV RELATIONSHIP PROCESSING DEBUGGING ===');
        console.log(`Input: ${nodeData.length} nodes, ${relationshipData.length} relationships`);

        // Initialize relationship storage
        this.cmsInstance.relationships = [];
        this.cmsInstance.csvIdMap = new Map();

        // Build CSV ID to node ID mapping with detailed logging
        console.log('Building CSV ID mappings:');
        nodeData.forEach((node, index) => {
            if (node['~id'] && node.node_id) {
                this.cmsInstance.csvIdMap.set(node['~id'], node.node_id);
                console.log(`  ${index + 1}. "${node['~id']}" --> "${node.node_id}"`);
            } else {
                console.log(`  ${index + 1}. SKIPPED - Missing ~id or node_id:`, {
                    '~id': node['~id'],
                    'node_id': node.node_id
                });
            }
        });

        console.log(`Built ID mapping for ${this.cmsInstance.csvIdMap.size} nodes`);
        console.log('Complete mapping:', Object.fromEntries(this.cmsInstance.csvIdMap));

        // Process relationships with validation
        if (relationshipData && relationshipData.length > 0) {
            let validRelationships = 0;
            let skippedRelationships = 0;

            console.log('Processing relationships:');
            relationshipData.forEach((rel, index) => {
                console.log(`  Relationship ${index + 1}:`);
                console.log(`    Raw: "${rel['~start_node_id']}" --[${rel['~relationship_type']}]--> "${rel['~end_node_id']}"`);

                const fromId = this.cmsInstance.csvIdMap.get(rel['~start_node_id']);
                const toId = this.cmsInstance.csvIdMap.get(rel['~end_node_id']);

                console.log(`    Mapped: "${fromId}" --[${rel['~relationship_type']}]--> "${toId}"`);

                if (fromId && toId && fromId !== toId) {
                    const relationship = {
                        from: fromId,
                        to: toId,
                        type: rel['~relationship_type'] || rel.type || 'LEADS_TO',
                        explanation: rel.explanation || ''
                    };
                    this.cmsInstance.relationships.push(relationship);
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
            console.log('Final relationships array:', this.cmsInstance.relationships);
        } else {
            console.log('No relationship data found, will use sequential connections');
        }
        console.log('=== END CSV RELATIONSHIP PROCESSING ===');
    }
}

// Export to global namespace
if (typeof window !== 'undefined') {
    window.UploadManager = UploadManager;
}
