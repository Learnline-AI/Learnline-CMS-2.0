/**
 * WebSocket Chat Integration for LearnLine CMS
 * Connects frontend chat UI to MCP server for AI-powered content editing
 */

class MCPWebSocketClient {
    constructor(url = 'ws://localhost:8001/mcp-sync') {
        this.url = url;
        this.ws = null;
        this.reconnectDelay = 1000;
        this.maxReconnectDelay = 30000;
        this.messageHandlers = new Map();
        this.messageQueue = [];
        this.maxQueueSize = 50;
        this.isConnected = false;
        this.connectionStatusCallback = null;
    }

    connect() {
        console.log('🔌 Attempting to connect to MCP server:', this.url);
        this.emitStatus('connecting');

        try {
            this.ws = new WebSocket(this.url);

            this.ws.onopen = () => {
                console.log('✅ Connected to MCP server');
                this.isConnected = true;
                this.reconnectDelay = 1000;
                this.emitStatus('connected');
                this.drainQueue();
            };

            this.ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    console.log('📨 Received message:', message);
                    this.handleMessage(message);
                } catch (error) {
                    console.error('❌ Error parsing message:', error);
                }
            };

            this.ws.onerror = (error) => {
                console.error('❌ WebSocket error:', error);
            };

            this.ws.onclose = () => {
                console.log('🔌 Disconnected from MCP server');
                this.isConnected = false;
                this.emitStatus('disconnected');
                this.scheduleReconnect();
            };
        } catch (error) {
            console.error('❌ Failed to create WebSocket:', error);
            this.emitStatus('disconnected');
            this.scheduleReconnect();
        }
    }

    scheduleReconnect() {
        setTimeout(() => {
            console.log('🔄 Reconnecting...');
            this.connect();
            this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay);
        }, this.reconnectDelay);
    }

    send(message) {
        if (this.ws?.readyState === WebSocket.OPEN) {
            const jsonMessage = JSON.stringify(message);
            this.ws.send(jsonMessage);
            console.log('📤 Sent message:', message);
        } else {
            console.warn('⚠️ WebSocket not connected, queueing message');
            this.queueMessage(message);
        }
    }

    queueMessage(message) {
        if (this.messageQueue.length >= this.maxQueueSize) {
            console.warn('⚠️ Message queue full, dropping oldest message');
            this.messageQueue.shift();
        }
        this.messageQueue.push(message);
        console.log(`📥 Queued message (${this.messageQueue.length} in queue)`);
    }

    drainQueue() {
        if (this.messageQueue.length === 0) return;

        console.log(`📤 Draining queue (${this.messageQueue.length} messages)`);
        while (this.messageQueue.length > 0) {
            const message = this.messageQueue.shift();
            this.send(message);
        }
    }

    handleMessage(message) {
        const handler = this.messageHandlers.get(message.type);
        if (handler) {
            handler(message);
        } else {
            console.warn('⚠️ No handler for message type:', message.type);
        }
    }

    on(messageType, handler) {
        this.messageHandlers.set(messageType, handler);
    }

    onConnectionStatus(callback) {
        this.connectionStatusCallback = callback;
    }

    emitStatus(status) {
        if (this.connectionStatusCallback) {
            this.connectionStatusCallback(status);
        }
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
        }
    }
}

// Global WebSocket client instance
let mcpClient = null;

// File attachment state
let attachedFile = null;
let attachedFileName = null;

/**
 * Initialize WebSocket connection and integrate with CMS
 * @param {Object} cmsInstance - Reference to TemplateEditorCMS instance
 */
function initializeWebSocketChat(cmsInstance) {
    console.log('🚀 Initializing WebSocket chat integration');

    // Create WebSocket client
    mcpClient = new MCPWebSocketClient();

    // Set up connection status indicator
    mcpClient.onConnectionStatus((status) => {
        updateConnectionStatus(status);

        // Send initial context when connected
        if (status === 'connected') {
            sendInitialContext(cmsInstance);
        }
    });

    // Set up message handlers
    setupMessageHandlers(cmsInstance);

    // Connect to MCP server
    mcpClient.connect();

    // Wire up send button to WebSocket
    setupSendButton(cmsInstance);

    // Set up file upload handlers
    setupFileUploadHandlers(cmsInstance);
}

/**
 * Send initial context to backend after connection
 * @param {Object} cmsInstance - Reference to TemplateEditorCMS instance
 */
function sendInitialContext(cmsInstance) {
    const contextData = {
        type: 'context_update',
        context: {
            session_id: cmsInstance.sessionId,
            node_id: cmsInstance.selectedNode || null,
            screen: cmsInstance.viewMode === 'visual' ? 'visual' : 'editor',
            action: 'session_initialized'
        }
    };

    mcpClient.send(contextData);
    console.log('📍 Initial context sent:', contextData);
}

/**
 * Update connection status indicator in chat UI
 * @param {string} status - 'connected', 'disconnected', or 'connecting'
 */
function updateConnectionStatus(status) {
    const statusDot = document.getElementById('connection-status');
    if (!statusDot) return;

    // Remove all status classes
    statusDot.classList.remove('status-connected', 'status-disconnected', 'status-connecting');

    // Add appropriate class
    if (status === 'connected') {
        statusDot.classList.add('status-connected');
        statusDot.title = 'Connected to AI Assistant';
    } else if (status === 'disconnected') {
        statusDot.classList.add('status-disconnected');
        statusDot.title = 'Disconnected - Reconnecting...';
    } else if (status === 'connecting') {
        statusDot.classList.add('status-connecting');
        statusDot.title = 'Connecting...';
    }

    console.log(`🔵 Connection status: ${status}`);
}

/**
 * Set up handlers for different WebSocket message types
 * @param {Object} cmsInstance - Reference to TemplateEditorCMS instance
 */
function setupMessageHandlers(cmsInstance) {
    // Handle AI text responses
    let voiceAnimationTimeout = null;
    mcpClient.on('ai_response', (message) => {
        console.log('🤖 AI response received:', message.content);
        cmsInstance.addChatMessage('ai', message.content);
        
        // Trigger voice animation when streaming response
        if (window.animatedChatButton && window.animatedChatButton.showVoice) {
            window.animatedChatButton.showVoice();
        }
        
        // Clear any existing timeout
        if (voiceAnimationTimeout) {
            clearTimeout(voiceAnimationTimeout);
        }
        
        // Return to idle after 2 seconds of no new messages (response complete)
        voiceAnimationTimeout = setTimeout(() => {
            if (window.animatedChatButton && 
                window.animatedChatButton.currentState === 'voice' &&
                window.animatedChatButton.showIdle) {
                window.animatedChatButton.showIdle();
            }
        }, 2000);
    });

    // Handle tool execution start
    mcpClient.on('tool_start', (message) => {
        console.log('🔧 Tool execution started:', message.tool);
        const toolName = message.tool || 'action';
        cmsInstance.addChatMessage('ai', `🔧 Starting ${toolName}...`);
        
        // Trigger thinking animation
        if (window.animatedChatButton && window.animatedChatButton.showThinking) {
            window.animatedChatButton.showThinking();
        }
    });

    // Handle tool execution completion
    mcpClient.on('tool_complete', (message) => {
        console.log('✅ Tool execution completed:', message.tool);
        const toolName = message.tool || 'action';
        cmsInstance.addChatMessage('ai', `✓ Completed ${toolName}`);
        
        // If no ai_response is coming, return to idle after a short delay
        // Otherwise, voice animation will handle the transition
        setTimeout(() => {
            // Only return to idle if we're still in thinking state (no voice response came)
            if (window.animatedChatButton && 
                window.animatedChatButton.currentState === 'thinking' &&
                window.animatedChatButton.showIdle) {
                window.animatedChatButton.showIdle();
            }
        }, 500);
    });

    // Handle UI refresh commands
    mcpClient.on('refresh_ui', (message) => {
        console.log('🔄 UI refresh requested:', message.target);

        if (message.target === 'components' && message.node_id) {
            console.log('🔄 Refreshing components for node:', message.node_id);
            cmsInstance.loadNodeContent(message.node_id);
        } else if (message.target === 'nodes') {
            console.log('🔄 Refreshing node list');
            cmsInstance.loadSessionNodes();
        } else if (message.target === 'relationships') {
            console.log('🔄 Refreshing knowledge graph');
            cmsInstance.loadSessionRelationships();
        }
    });

    // Handle errors
    mcpClient.on('error', (message) => {
        console.error('❌ Error from MCP server:', message.error);
        const errorMessage = message.error || 'An error occurred';
        cmsInstance.addChatMessage('ai', `❌ Error: ${errorMessage}`);
    });

    // Handle tool execution events (alternative format)
    mcpClient.on('tool_executed', (message) => {
        console.log('🔧 Tool executed:', message.tool);

        // Show completion message
        const toolName = message.tool || 'action';
        cmsInstance.addChatMessage('ai', `✓ ${toolName} completed successfully`);

        // Refresh appropriate UI based on tool type
        if (message.tool === 'add_component' && message.arguments?.node_id) {
            cmsInstance.loadNodeContent(message.arguments.node_id);
        } else if (message.tool === 'create_node') {
            cmsInstance.loadSessionNodes();
        } else if (message.tool === 'create_relationship') {
            cmsInstance.loadSessionRelationships();
        }
    });
}

/**
 * Wire up the send button to use WebSocket
 * @param {Object} cmsInstance - Reference to TemplateEditorCMS instance
 */
function setupSendButton(cmsInstance) {
    // Override the sendChatMessage method to use WebSocket
    const originalSendChatMessage = cmsInstance.sendChatMessage.bind(cmsInstance);

    cmsInstance.sendChatMessage = async function() {
        // Get message from input
        const message = this.chatInput.value.trim();
        if (!message && !attachedFile) return;

        // Add user message to chat UI (existing behavior)
        const displayMessage = attachedFile ? `${message} [📎 ${attachedFileName}]` : message;
        this.addChatMessage('user', displayMessage);

        // Clear input (existing behavior)
        this.chatInput.value = '';
        this.chatInput.style.height = 'auto';

        // Prepare message data
        const messageData = {
            type: 'chat_message',
            content: message || 'Process this file',
            context: {
                node_id: this.selectedNode,
                session_id: this.sessionId,
                screen: 'editor'
            }
        };

        // Include file if attached
        if (attachedFile) {
            try {
                // Convert file to base64
                const base64Data = await fileToBase64(attachedFile);
                messageData.file = base64Data;
                messageData.fileName = attachedFileName;
                console.log('📎 Sending message with file:', attachedFileName);
            } catch (error) {
                console.error('Error encoding file:', error);
                this.addChatMessage('ai', '❌ Error: Could not read file');
                return;
            }
        }

        // Send via WebSocket
        mcpClient.send(messageData);
        console.log('💬 Chat message sent via WebSocket:', messageData);

        // Clear attachment after sending
        clearAttachment();
    };
}

/**
 * Set up file upload handlers (drag-drop, click, preview)
 * @param {Object} cmsInstance - Reference to TemplateEditorCMS instance
 */
function setupFileUploadHandlers(cmsInstance) {
    const chatInputWrapper = document.querySelector('.chat-input-wrapper');
    const chatInput = document.getElementById('chat-input');
    const attachFileBtn = document.getElementById('attach-file-btn');
    const fileInput = document.getElementById('chat-file-input');
    const removeFileBtn = document.getElementById('remove-file-btn');

    // Drag-over handler
    chatInputWrapper.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        chatInputWrapper.classList.add('drag-over');
    });

    // Drag-leave handler
    chatInputWrapper.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        chatInputWrapper.classList.remove('drag-over');
    });

    // Drop handler
    chatInputWrapper.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        chatInputWrapper.classList.remove('drag-over');

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileSelection(files[0]);
        }
    });

    // Paperclip button click
    attachFileBtn.addEventListener('click', () => {
        fileInput.click();
    });

    // File input change
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileSelection(e.target.files[0]);
        }
    });

    // Remove file button click
    removeFileBtn.addEventListener('click', () => {
        clearAttachment();
    });
}

/**
 * Handle file selection (from drag-drop or click)
 * @param {File} file - Selected file
 */
function handleFileSelection(file) {
    // Validate file type
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
        alert('Please select a PDF or image file (JPEG, PNG, GIF, WebP)');
        return;
    }

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
        alert('File size exceeds 5MB limit. Please choose a smaller file.');
        return;
    }

    // Store file
    attachedFile = file;
    attachedFileName = file.name;

    // Show preview badge
    showFilePreview(file.name, file.type);

    console.log('📎 File attached:', file.name, `(${(file.size / 1024).toFixed(1)}KB)`);
}

/**
 * Show file preview badge
 * @param {string} fileName - Name of the file
 * @param {string} fileType - MIME type of the file
 */
function showFilePreview(fileName, fileType) {
    const previewBadge = document.getElementById('file-preview-badge');
    const fileNameSpan = document.getElementById('file-preview-name');
    const fileIcon = previewBadge.querySelector('.file-icon');

    // Set icon based on file type
    if (fileType.startsWith('image/')) {
        fileIcon.textContent = '🖼️';
    } else if (fileType === 'application/pdf') {
        fileIcon.textContent = '📄';
    } else {
        fileIcon.textContent = '📎';
    }

    // Set filename
    fileNameSpan.textContent = fileName;

    // Show badge
    previewBadge.classList.remove('hidden');
}

/**
 * Clear file attachment
 */
function clearAttachment() {
    attachedFile = null;
    attachedFileName = null;

    // Hide preview badge
    const previewBadge = document.getElementById('file-preview-badge');
    previewBadge.classList.add('hidden');

    // Clear file input
    const fileInput = document.getElementById('chat-file-input');
    fileInput.value = '';

    console.log('📎 Attachment cleared');
}

/**
 * Convert file to base64 string
 * @param {File} file - File to convert
 * @returns {Promise<string>} Base64 encoded file data
 */
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            // Extract base64 data (remove data:mime;base64, prefix)
            const base64 = reader.result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Export for global access
window.initializeWebSocketChat = initializeWebSocketChat;
window.mcpClient = mcpClient;
