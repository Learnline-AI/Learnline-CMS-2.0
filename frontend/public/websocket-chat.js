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
    mcpClient.on('ai_response', (message) => {
        console.log('🤖 AI response received:', message.content);
        cmsInstance.addChatMessage('ai', message.content);
    });

    // Handle tool execution start
    mcpClient.on('tool_start', (message) => {
        console.log('🔧 Tool execution started:', message.tool);
        const toolName = message.tool || 'action';
        cmsInstance.addChatMessage('ai', `🔧 Starting ${toolName}...`);
    });

    // Handle tool execution completion
    mcpClient.on('tool_complete', (message) => {
        console.log('✅ Tool execution completed:', message.tool);
        const toolName = message.tool || 'action';
        cmsInstance.addChatMessage('ai', `✓ Completed ${toolName}`);
    });

    // Handle UI refresh commands
    mcpClient.on('refresh_ui', (message) => {
        console.log('🔄 UI refresh requested:', message.target);

        if (message.target === 'components' && message.node_id) {
            console.log('🔄 Refreshing components for node:', message.node_id);
            cmsInstance.loadNodeComponents(message.node_id);
        } else if (message.target === 'nodes') {
            console.log('🔄 Refreshing node list');
            cmsInstance.loadSessionNodes();
        } else if (message.target === 'relationships') {
            console.log('🔄 Refreshing knowledge graph');
            cmsInstance.loadRelationships();
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
            cmsInstance.loadNodeComponents(message.arguments.node_id);
        } else if (message.tool === 'create_node') {
            cmsInstance.loadSessionNodes();
        } else if (message.tool === 'create_relationship') {
            cmsInstance.loadRelationships();
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

    cmsInstance.sendChatMessage = function() {
        // Get message from input
        const message = this.chatInput.value.trim();
        if (!message) return;

        // Add user message to chat UI (existing behavior)
        this.addChatMessage('user', message);

        // Clear input (existing behavior)
        this.chatInput.value = '';
        this.chatInput.style.height = 'auto';

        // Send via WebSocket instead of placeholder
        const messageData = {
            type: 'chat_message',
            content: message,
            context: {
                node_id: this.selectedNode,
                session_id: this.sessionId,
                screen: 'editor'
            }
        };

        mcpClient.send(messageData);
        console.log('💬 Chat message sent via WebSocket:', messageData);
    };
}

// Export for global access
window.initializeWebSocketChat = initializeWebSocketChat;
window.mcpClient = mcpClient;
