/**
 * SVG Generator Utilities for CMS
 * Functions for generating chart SVGs for hero-number components
 */

// Initialize global namespace (if not already created by text-utils.js)
window.CMSUtils = window.CMSUtils || {};

/**
 * Generate a pie/donut chart SVG
 * @param {number} numerator - The filled portion
 * @param {number} denominator - The total portions
 * @returns {string} SVG markup for a donut chart
 */
window.CMSUtils.generatePieChartSVG = function(numerator, denominator) {
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
};

/**
 * Generate a bar chart SVG
 * @param {number} current - The current value
 * @param {number} maximum - The maximum value
 * @returns {string} SVG markup for a vertical bar chart
 */
window.CMSUtils.generateBarChartSVG = function(current, maximum) {
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
};

/**
 * Generate a fraction circle SVG (multiple circles representing parts of a whole)
 * @param {number} numerator - The number of filled circles
 * @param {number} denominator - The total number of circles
 * @returns {string} SVG markup for fraction circles
 */
window.CMSUtils.generateFractionCircleSVG = function(numerator, denominator) {
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
};
