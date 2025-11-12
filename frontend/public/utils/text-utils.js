/**
 * Text Utilities for CMS
 * Shared text formatting and processing functions
 */

// Initialize global namespace
window.CMSUtils = window.CMSUtils || {};

/**
 * Format text for preview rendering
 * Converts data attributes and markdown-style formatting to HTML
 * @param {string} text - The text to format
 * @returns {string} Formatted HTML text
 */
window.CMSUtils.formatTextForPreview = function(text) {
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
};
