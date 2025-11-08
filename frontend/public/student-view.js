// Student View JavaScript - Renders CMS Components with Learnline Styling

class StudentView {
    constructor() {
        this.apiBaseUrl = 'http://localhost:8000';
        this.nodeId = null;
        this.contentContainer = document.getElementById('student-content');
        this.nodeTitleElement = document.getElementById('node-title');
        this.nodeSubtitleElement = document.getElementById('node-subtitle');

        this.init();
    }

    async init() {
        // Get node ID from URL
        this.nodeId = this.getNodeIdFromURL();

        if (!this.nodeId) {
            this.showError('No node ID provided', 'Please provide a node ID in the URL (e.g., ?nodeId=N001)');
            return;
        }

        // Update subtitle
        this.nodeSubtitleElement.textContent = `Node ${this.nodeId}`;

        // Fetch and render components
        await this.loadAndRenderNode();
    }

    getNodeIdFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('nodeId');
    }

    async loadAndRenderNode() {
        try {
            // Fetch component data from API
            const response = await fetch(`${this.apiBaseUrl}/nodes/${this.nodeId}/components`);

            if (!response.ok) {
                throw new Error(`Failed to load node: ${response.status}`);
            }

            const data = await response.json();

            // Update title
            this.nodeTitleElement.textContent = data.node_id || this.nodeId;

            // Render components
            if (data.components && data.components.length > 0) {
                this.renderComponents(data.components);
            } else {
                this.showError('No Content', 'This node has no content yet.');
            }

        } catch (error) {
            console.error('Error loading node:', error);
            this.showError('Error Loading Content', error.message);
        }
    }

    renderComponents(components) {
        // Clear loading state
        this.contentContainer.innerHTML = '';

        // Render each component
        components.forEach((component, index) => {
            const componentHTML = this.renderComponent(component, index);
            if (componentHTML) {
                this.contentContainer.innerHTML += componentHTML;
            }
        });
    }

    renderComponent(component, index) {
        const type = component.type;
        const params = component.parameters || {};

        switch (type) {
            case 'heading':
                return this.renderHeading(params);

            case 'paragraph':
                return this.renderParagraph(params);

            case 'definition':
                return this.renderDefinition(params);

            case 'step-sequence':
                return this.renderStepSequence(params);

            case 'worked-example':
                return this.renderWorkedExample(params);

            case 'memory-trick':
                return this.renderMemoryTrick(params);

            case 'callout-box':
                return this.renderCalloutBox(params);

            case 'hero-number':
                return this.renderHeroNumber(params);

            case 'four-pictures':
                return this.renderPictures(params, 4);

            case 'three-pictures':
                return this.renderPictures(params, 3);

            case 'three-svgs':
                return this.renderThreeSVGs(params);

            case 'two-pictures':
                return this.renderPictures(params, 2);

            default:
                console.warn(`Unknown component type: ${type}`);
                return '';
        }
    }

    renderHeading(params) {
        const text = params.text || 'Heading';
        return `<h2 class="student-heading">${text}</h2>`;
    }

    renderParagraph(params) {
        const text = params.text || '';
        if (!text) return '';
        return `<p class="student-paragraph">${text}</p>`;
    }

    renderDefinition(params) {
        const term = params.term || 'Term';
        const definition = params.definition || 'Definition';
        return `
            <div class="student-definition">
                <span class="student-definition-term">${term}:</span> ${definition}
            </div>
        `;
    }

    renderStepSequence(params) {
        const steps = params.steps || [];
        if (steps.length === 0) return '';

        const stepsHTML = steps.map(step => `<li>${step}</li>`).join('');
        return `<ol class="student-steps">${stepsHTML}</ol>`;
    }

    renderWorkedExample(params) {
        const problem = params.problem || '';
        const solution = params.solution || '';
        const answer = params.answer || '';

        return `
            <div class="student-example">
                ${problem ? `<div class="student-example-problem"><strong>Problem:</strong> ${problem}</div>` : ''}
                ${solution ? `<div class="student-example-solution"><strong>Solution:</strong> ${solution}</div>` : ''}
                ${answer ? `<div class="student-example-answer"><strong>Answer:</strong> ${answer}</div>` : ''}
            </div>
        `;
    }

    renderMemoryTrick(params) {
        const text = params.text || 'Memory trick';
        return `<div class="student-memory-trick">${text}</div>`;
    }

    renderCalloutBox(params) {
        const text = params.text || 'Callout';
        const style = params.style || 'info';
        const iconMap = {
            'info': 'ℹ️',
            'tip': '💡',
            'warning': '⚠️',
            'important': '❗'
        };
        const icon = iconMap[style] || 'ℹ️';

        return `
            <div class="student-callout-box student-callout-${style}">
                <span class="student-callout-icon">${icon}</span>
                <div class="student-callout-text">${text}</div>
            </div>
        `;
    }

    renderHeroNumber(params) {
        const visualContent = params.visual_content || '0';
        const caption = params.caption || '';
        const visualType = params.visual_type || 'text';
        const backgroundStyle = params.background_style || 'purple';

        let heroVisualHTML = '';
        if (visualType === 'text') {
            heroVisualHTML = `<div class="student-hero-large">${visualContent}</div>`;
        } else if (visualType === 'image') {
            if (visualContent) {
                heroVisualHTML = `<img src="${this.apiBaseUrl}${visualContent}" alt="Hero visual" class="student-hero-image" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">`;
                heroVisualHTML += `<div class="student-hero-placeholder" style="display:none;">Image unavailable</div>`;
            } else {
                heroVisualHTML = `<div class="student-hero-placeholder">Image content</div>`;
            }
        } else if (visualType === 'pie-chart' || visualType === 'bar-chart' || visualType === 'fraction-circle' || visualType === 'svg') {
            // All generator types and custom SVG render the same way - visual_content contains the SVG
            if (visualContent) {
                heroVisualHTML = visualContent;
            } else {
                heroVisualHTML = `<div class="student-hero-placeholder">Chart content</div>`;
            }
        }

        return `
            <div class="student-hero-number student-hero-bg-${backgroundStyle}">
                ${heroVisualHTML}
                ${caption ? `<p class="student-hero-caption">${caption}</p>` : ''}
            </div>
        `;
    }

    renderPictures(params, count) {
        const pictures = params.pictures || {};
        const gridClass = `student-picture-grid-${count}`;

        let picturesHTML = '';

        for (let i = 1; i <= count; i++) {
            // Support both old image keys and new svg keys
            const svgKey = `svg${i}`;
            const imageKey = `image${i}`;
            const svgData = pictures[svgKey] || pictures[imageKey] || {};

            const title = svgData.title || `SVG ${i}`;
            const body = svgData.body || '';
            const svgCode = svgData.svgCode || '';

            const svgHTML = svgCode.trim()
                ? svgCode
                : `<div class="student-picture-image-placeholder"><i class="fas fa-image"></i></div>`;

            picturesHTML += `
                <div class="student-picture-item">
                    <div class="student-svg-container">
                        ${svgHTML}
                    </div>
                    <h3 class="student-picture-title">${title}</h3>
                    ${body ? `<p class="student-picture-body">${body}</p>` : ''}
                </div>
            `;
        }

        return `<div class="${gridClass}">${picturesHTML}</div>`;
    }

    showError(title, message) {
        this.contentContainer.innerHTML = `
            <div class="error-container">
                <h2>${title}</h2>
                <p>${message}</p>
            </div>
        `;
    }

    renderThreeSVGs(params) {
        let svgsHTML = '';

        for (let i = 1; i <= 3; i++) {
            const title = params[`title${i}`] || `SVG ${i}`;
            const description = params[`description${i}`] || '';
            const svgCode = params[`svg${i}`] || '';

            const svgHTML = svgCode
                ? svgCode
                : `<div class="student-svg-placeholder"><i class="fas fa-shapes"></i></div>`;

            svgsHTML += `
                <div class="student-svg-item">
                    <div class="student-svg-container">
                        ${svgHTML}
                    </div>
                    <h3 class="student-svg-title">${title}</h3>
                    <p class="student-svg-description">${description}</p>
                </div>
            `;
        }

        return `<div class="student-three-svgs">${svgsHTML}</div>`;
    }
}

// Chatbot functionality (placeholder)
function sendMessage() {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();

    if (message) {
        console.log('Message:', message);
        // TODO: Integrate with chatbot API
        alert('Chatbot integration coming soon!');
        input.value = '';
    }
}

// Handle Enter key in chat input
document.addEventListener('DOMContentLoaded', () => {
    const chatInput = document.getElementById('chat-input');
    if (chatInput) {
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
    }

    // Microphone button (placeholder)
    const micButton = document.querySelector('.input-mode-toggle');
    if (micButton) {
        micButton.addEventListener('click', () => {
            console.log('Microphone clicked');
            alert('Voice input coming soon!');
        });
    }
});

// Initialize Student View
const studentView = new StudentView();
