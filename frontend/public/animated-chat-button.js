/**
 * Animated Chat Button Component
 * Floating, draggable button with 5 animated states for LLM interactions
 */

class AnimatedChatButton {
    constructor() {
        this.currentState = 'idle';
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.initialX = 0;
        this.initialY = 0;
        this.currentX = 0;
        this.currentY = 0;
        this.button = null;
        this.icons = {};
        this.animationTimers = new Map();
        this.handleMouseMove = null;
        this.handleMouseUp = null;
        this.handleTouchMove = null;
        this.handleTouchEnd = null;
        
        this.init();
    }

    init() {
        // Create button structure
        this.createButton();
        
        // Load saved position
        this.loadPosition();
        
        // Bind drag events
        this.setupDrag();
        
        // Start with idle animation
        this.showIdle();
    }

    createButton() {
        // Find or create container
        let container = document.getElementById('animated-chat-button-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'animated-chat-button-container';
            container.className = 'animated-chat-button-container';
            document.body.appendChild(container);
        }

        // Create button element
        this.button = document.createElement('div');
        this.button.id = 'animated-chat-button';
        this.button.className = 'animated-chat-button';
        
        // Create icon wrapper
        const iconWrapper = document.createElement('div');
        iconWrapper.className = 'animated-chat-icon-wrapper';

        // Create all 5 SVG icons
        const icons = [
            {
                id: 'icon-idle',
                viewBox: '0 0 30 41',
                content: '<rect width="9" height="41" rx="4.5" fill="#1BA1E2"/><rect y="34" width="30" height="7" rx="3.5" fill="#1BA1E2"/>'
            },
            {
                id: 'icon-smile',
                viewBox: '0 0 54 37',
                content: '<path d="M2.5 21C2.50001 38.5 51 38 51 21" stroke="#66BB6A" stroke-width="5" stroke-linecap="round"/><circle cx="17" cy="3.5" r="3.5" fill="#66BB6A"/><circle cx="35" cy="3.5" r="3.5" fill="#66BB6A"/>'
            },
            {
                id: 'icon-correct',
                viewBox: '0 0 51 41',
                content: '<path d="M2.50011 25.9756L17.0963 37.5L48.5001 2.50002" stroke="#66BB6A" stroke-width="5" stroke-linecap="round"/>'
            },
            {
                id: 'icon-thinking',
                viewBox: '0 0 43 7',
                content: '<circle cx="3.5" cy="3.5" r="3.5" fill="#1BA1E2"/><circle cx="21.5" cy="3.5" r="3.5" fill="#1BA1E2"/><circle cx="39.5" cy="3.5" r="3.5" fill="#1BA1E2"/>'
            },
            {
                id: 'icon-voice',
                viewBox: '0 0 34 34',
                content: '<circle cx="17" cy="17" r="3" fill="#1BA1E2"/><circle cx="17" cy="17" r="9.5" stroke="#1BA1E2"/><circle cx="17" cy="17" r="16.5" stroke="#1BA1E2"/>'
            }
        ];

        icons.forEach((icon, index) => {
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.id = icon.id;
            svg.setAttribute('viewBox', icon.viewBox);
            svg.setAttribute('fill', 'none');
            svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
            svg.innerHTML = icon.content;
            // SVG elements need setAttribute, not className property
            if (index === 0) {
                svg.setAttribute('class', 'active'); // First icon (idle) is active by default
            }
            iconWrapper.appendChild(svg);
            this.icons[icon.id.replace('icon-', '')] = svg;
        });

        this.button.appendChild(iconWrapper);
        container.appendChild(this.button);
    }

    setupDrag() {
        if (!this.button) return;

        // Only attach mousedown/touchstart - attach move/up listeners when dragging starts
        this.button.addEventListener('mousedown', (e) => this.startDrag(e));
        this.button.addEventListener('touchstart', (e) => this.startDrag(e.touches[0]));
        
        // Prevent text selection during drag
        this.button.addEventListener('selectstart', (e) => {
            e.preventDefault();
            return false;
        });

        // Track click timing for click vs drag detection
        this.clickStartTime = 0;
        this.button.addEventListener('mousedown', () => {
            this.clickStartTime = Date.now();
        });

        this.button.addEventListener('click', (e) => {
            const clickDuration = Date.now() - this.clickStartTime;
            if (clickDuration > 200 || this.isDragging) {
                e.preventDefault();
                e.stopPropagation();
                return;
            }
            // Normal click handler will be set externally
        });
    }

    startDrag(e) {
        if (!this.button) return;
        
        // Prevent default behavior and text selection
        e.preventDefault();
        e.stopPropagation();
        
        this.isDragging = true;
        
        // Get current fixed position (this is our base position)
        const rect = this.button.getBoundingClientRect();
        this.initialX = rect.left;
        this.initialY = rect.top;
        this.currentX = this.initialX;
        this.currentY = this.initialY;
        
        // Store drag start mouse position for delta calculation
        this.dragStartX = e.clientX;
        this.dragStartY = e.clientY;
        
        // Disable CSS transition during drag for smooth movement
        this.button.style.transition = 'none';
        
        this.button.style.cursor = 'grabbing';
        
        // Attach move and up listeners only when dragging starts (like node drag)
        this.handleMouseMove = (e) => this.drag(e);
        this.handleMouseUp = () => this.stopDrag();
        this.handleTouchMove = (e) => {
            e.preventDefault();
            this.drag(e.touches[0]);
        };
        this.handleTouchEnd = () => this.stopDrag();
        
        document.addEventListener('mousemove', this.handleMouseMove);
        document.addEventListener('mouseup', this.handleMouseUp);
        document.addEventListener('touchmove', this.handleTouchMove, { passive: false });
        document.addEventListener('touchend', this.handleTouchEnd);
        
        // Prevent text selection globally during drag
        document.body.style.userSelect = 'none';
    }

    drag(e) {
        if (!this.isDragging || !this.button) return;
        
        e.preventDefault();
        
        // Calculate delta from last mouse position (like node drag does)
        const deltaX = e.clientX - this.dragStartX;
        const deltaY = e.clientY - this.dragStartY;
        
        // Update current position
        this.currentX += deltaX;
        this.currentY += deltaY;
        
        // Use transform: translate() for GPU acceleration (no layout recalculation)
        // Calculate offset from the initial drag start position
        const offsetX = this.currentX - this.initialX;
        const offsetY = this.currentY - this.initialY;
        this.button.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
        
        // Reset drag start for next delta calculation (smooth movement)
        this.dragStartX = e.clientX;
        this.dragStartY = e.clientY;
    }

    stopDrag() {
        if (!this.isDragging) return;
        
        this.isDragging = false;
        
        // Remove event listeners (like node drag does)
        if (this.handleMouseMove) {
            document.removeEventListener('mousemove', this.handleMouseMove);
        }
        if (this.handleMouseUp) {
            document.removeEventListener('mouseup', this.handleMouseUp);
        }
        if (this.handleTouchMove) {
            document.removeEventListener('touchmove', this.handleTouchMove);
        }
        if (this.handleTouchEnd) {
            document.removeEventListener('touchend', this.handleTouchEnd);
        }
        
        // Restore text selection
        document.body.style.userSelect = '';
        
        if (this.button) {
            this.button.style.cursor = 'pointer';
            
            // Restore CSS transition
            this.button.style.transition = '';
            
            // Convert transform back to left/top for final position
            const rect = this.button.getBoundingClientRect();
            this.button.style.left = rect.left + 'px';
            this.button.style.top = rect.top + 'px';
            this.button.style.transform = '';
            
            this.savePosition();
        }
    }

    savePosition() {
        if (!this.button) return;
        
        // Use current fixed position values
        const position = {
            left: this.currentX || this.button.getBoundingClientRect().left,
            top: this.currentY || this.button.getBoundingClientRect().top
        };
        
        localStorage.setItem('animatedChatButtonPosition', JSON.stringify(position));
    }

    loadPosition() {
        if (!this.button) return;
        
        const saved = localStorage.getItem('animatedChatButtonPosition');
        if (saved) {
            try {
                const position = JSON.parse(saved);
                this.currentX = position.left;
                this.currentY = position.top;
                this.button.style.position = 'fixed';
                this.button.style.left = position.left + 'px';
                this.button.style.top = position.top + 'px';
                // Remove transform that was centering it
                this.button.style.transform = 'none';
            } catch (e) {
                console.warn('Failed to load button position:', e);
            }
        } else {
            // Default position - initialize currentX/Y
            const rect = this.button.getBoundingClientRect();
            this.currentX = rect.left;
            this.currentY = rect.top;
        }
    }

    switchIcon(iconName) {
        // Kill all GSAP animations
        if (typeof gsap !== 'undefined') {
            gsap.killTweensOf(Object.values(this.icons));
            gsap.killTweensOf('#icon-thinking circle');
            gsap.killTweensOf('#icon-voice circle');
        }

        // Reset all icons
        Object.values(this.icons).forEach(icon => {
            if (typeof gsap !== 'undefined') {
                gsap.set(icon, {
                    scale: 1,
                    rotation: 0,
                    opacity: 1,
                    transformOrigin: 'center center'
                });
            }
            // SVG elements need setAttribute for class manipulation
            const currentClass = icon.getAttribute('class') || '';
            icon.setAttribute('class', currentClass.replace(/\bactive\b/g, '').trim());
        });

        // Show target icon
        setTimeout(() => {
            if (this.icons[iconName]) {
                const currentClass = this.icons[iconName].getAttribute('class') || '';
                this.icons[iconName].setAttribute('class', (currentClass + ' active').trim());
            }
        }, 50);
    }

    showIdle() {
        this.currentState = 'idle';
        
        if (typeof gsap === 'undefined') {
            console.warn('GSAP not loaded, animations disabled');
            return;
        }

        // Kill all animations
        gsap.killTweensOf([this.icons.idle, this.icons.thinking, this.icons.voice, '#icon-thinking circle', '#icon-voice circle']);
        
        // Switch to idle icon
        this.switchIcon('idle');
        
        // Pulsating animation
        gsap.to(this.icons.idle, {
            scale: 1.15,
            duration: 1.2,
            repeat: -1,
            yoyo: true,
            ease: 'power1.inOut'
        });

        // Subtle rotation wiggle
        gsap.to(this.icons.idle, {
            rotation: 3,
            duration: 1.5,
            repeat: -1,
            yoyo: true,
            ease: 'sine.inOut'
        });
    }

    showThinking() {
        this.currentState = 'thinking';
        
        if (typeof gsap === 'undefined') return;

        // Kill all animations
        gsap.killTweensOf([this.icons.idle, this.icons.thinking, this.icons.voice, '#icon-thinking circle', '#icon-voice circle']);
        
        // Switch to thinking icon
        this.switchIcon('thinking');
        
        // Animate dots sequentially
        const dots = this.icons.thinking.querySelectorAll('circle');
        
        dots.forEach((dot, index) => {
            gsap.to(dot, {
                y: -8,
                duration: 0.5,
                delay: index * 0.15,
                repeat: -1,
                yoyo: true,
                ease: 'power1.inOut'
            });
        });
    }

    showVoice() {
        this.currentState = 'voice';
        
        if (typeof gsap === 'undefined') return;

        // Kill all animations
        gsap.killTweensOf([this.icons.idle, this.icons.thinking, this.icons.voice, '#icon-thinking circle', '#icon-voice circle']);
        
        // Switch to voice icon
        this.switchIcon('voice');
        
        // Animate the rings
        const circles = this.icons.voice.querySelectorAll('circle');
        
        // Center dot pulses
        gsap.to(circles[0], {
            scale: 1.3,
            duration: 0.8,
            repeat: -1,
            yoyo: true,
            ease: 'power1.inOut',
            transformOrigin: 'center center'
        });

        // Middle ring pulses
        gsap.to(circles[1], {
            scale: 1.15,
            opacity: 0.6,
            duration: 1.2,
            repeat: -1,
            yoyo: true,
            ease: 'power1.inOut',
            transformOrigin: 'center center'
        });

        // Outer ring pulses
        gsap.to(circles[2], {
            scale: 1.1,
            opacity: 0.3,
            duration: 1.5,
            repeat: -1,
            yoyo: true,
            ease: 'power1.inOut',
            transformOrigin: 'center center'
        });
    }

    showCheckmark() {
        this.currentState = 'checkmark';
        
        if (typeof gsap === 'undefined') return;

        // Kill all animations
        gsap.killTweensOf([this.icons.idle, this.icons.correct, this.icons.thinking, this.icons.voice, '#icon-thinking circle', '#icon-voice circle']);
        
        // Switch to checkmark icon
        this.switchIcon('correct');
        
        // Success bounce animation
        gsap.fromTo(this.icons.correct,
            { scale: 0.5, rotation: -20, opacity: 0 },
            {
                scale: 1.3,
                rotation: 5,
                opacity: 1,
                duration: 0.4,
                ease: 'back.out(2)',
                onComplete: () => {
                    gsap.to(this.icons.correct, {
                        scale: 1,
                        rotation: 0,
                        duration: 0.3,
                        ease: 'elastic.out(1, 0.5)',
                        onComplete: () => {
                            // After settling, add oscillation
                            gsap.to(this.icons.correct, {
                                rotation: -3,
                                scale: 1.05,
                                duration: 0.5,
                                repeat: -1,
                                yoyo: true,
                                ease: 'sine.inOut'
                            });
                        }
                    });
                }
            }
        );

        // Clear any existing timer
        if (this.animationTimers.has('checkmark')) {
            clearTimeout(this.animationTimers.get('checkmark'));
        }

        // Return to idle after 5 seconds
        const timer = setTimeout(() => {
            if (this.currentState === 'checkmark') {
                this.showIdle();
            }
            this.animationTimers.delete('checkmark');
        }, 5000);
        
        this.animationTimers.set('checkmark', timer);
    }

    showSmile() {
        this.currentState = 'smile';
        
        if (typeof gsap === 'undefined') return;

        // Kill all animations
        gsap.killTweensOf([this.icons.idle, this.icons.smile, this.icons.thinking, this.icons.voice, '#icon-thinking circle', '#icon-voice circle']);
        
        // Switch to smile icon
        this.switchIcon('smile');
        
        // Bounce animation on entry
        gsap.fromTo(this.icons.smile,
            { scale: 0.8, rotation: -10 },
            {
                scale: 1.2,
                rotation: 0,
                duration: 0.5,
                ease: 'back.out(2)',
                onComplete: () => {
                    gsap.to(this.icons.smile, {
                        scale: 1,
                        duration: 0.3,
                        ease: 'power2.inOut',
                        onComplete: () => {
                            // After settling, add oscillation
                            gsap.to(this.icons.smile, {
                                rotation: 5,
                                duration: 0.4,
                                repeat: -1,
                                yoyo: true,
                                ease: 'sine.inOut'
                            });
                        }
                    });
                }
            }
        );

        // Clear any existing timer
        if (this.animationTimers.has('smile')) {
            clearTimeout(this.animationTimers.get('smile'));
        }

        // Return to idle after 5 seconds
        const timer = setTimeout(() => {
            if (this.currentState === 'smile') {
                this.showIdle();
            }
            this.animationTimers.delete('smile');
        }, 5000);
        
        this.animationTimers.set('smile', timer);
    }

    // Public method to get button element for click handling
    getButton() {
        return this.button;
    }
}

// Initialize button when DOM is ready
let animatedChatButton = null;

function initializeAnimatedButton() {
    // Wait for GSAP to be loaded
    if (typeof gsap === 'undefined') {
        console.warn('GSAP not loaded yet, waiting...');
        setTimeout(initializeAnimatedButton, 100);
        return;
    }
    
    animatedChatButton = new AnimatedChatButton();
    window.animatedChatButton = animatedChatButton;
    console.log('Animated chat button initialized');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAnimatedButton);
} else {
    initializeAnimatedButton();
}

