import os
import re
import html
from typing import Optional, Dict, Any
import logging

logger = logging.getLogger(__name__)

class TemplateRenderer:
    def __init__(self):
        self.template_dir = "../templates"

    def _escape_html(self, text: str) -> str:
        """Safely escape HTML to prevent XSS attacks"""
        return html.escape(text, quote=True)

    def _parse_simple_formatting(self, text: str) -> str:
        """Convert simple markdown-like formatting to HTML"""
        if not text:
            return ""

        # Escape HTML first for safety
        text = self._escape_html(text)

        # Bold: **text** -> <strong>text</strong>
        text = re.sub(r'\*\*(.*?)\*\*', r'<strong>\1</strong>', text)

        # Italic: *text* -> <em>text</em>
        text = re.sub(r'\*(.*?)\*', r'<em>\1</em>', text)

        # Headers: # Text -> <h1>Text</h1>, ## Text -> <h2>Text</h2>, etc.
        text = re.sub(r'^### (.*?)$', r'<h3>\1</h3>', text, flags=re.MULTILINE)
        text = re.sub(r'^## (.*?)$', r'<h2>\1</h2>', text, flags=re.MULTILINE)
        text = re.sub(r'^# (.*?)$', r'<h1>\1</h1>', text, flags=re.MULTILINE)

        # Bullet points: - Item -> <ul><li>Item</li></ul>
        lines = text.split('\n')
        in_list = False
        formatted_lines = []

        for line in lines:
            stripped = line.strip()
            if stripped.startswith('- '):
                if not in_list:
                    formatted_lines.append('<ul>')
                    in_list = True
                formatted_lines.append(f'<li>{stripped[2:].strip()}</li>')
            else:
                if in_list:
                    formatted_lines.append('</ul>')
                    in_list = False
                if stripped:
                    formatted_lines.append(f'<p>{stripped}</p>')
                else:
                    formatted_lines.append('')

        if in_list:
            formatted_lines.append('</ul>')

        return '\n'.join(formatted_lines)

    def _resolve_image_path(self, image_url: Optional[str]) -> str:
        """Convert relative image paths to proper URLs and generate HTML"""
        if not image_url:
            return '<div class="image-placeholder">Drop an image here</div>'

        # If it's already a full URL, use as-is
        if image_url.startswith(('http://', 'https://', '/')):
            return f'<img src="{image_url}" alt="Highlight Box Image" class="highlight-image">'

        # Convert relative path to URL (assuming it's in uploads/images/)
        image_path = f"/uploads/images/{os.path.basename(image_url)}"
        return f'<img src="{image_path}" alt="Highlight Box Image" class="highlight-image">'

    def _load_template(self, template_name: str) -> str:
        """Load HTML template from file"""
        template_path = os.path.join(self.template_dir, f"{template_name}.html")

        try:
            with open(template_path, 'r', encoding='utf-8') as file:
                return file.read()
        except FileNotFoundError:
            logger.error(f"Template not found: {template_path}")
            raise FileNotFoundError(f"Template '{template_name}' not found")
        except Exception as e:
            logger.error(f"Error loading template {template_name}: {str(e)}")
            raise

    def render_highlight_box(self, content: str, title: str = "", image_url: Optional[str] = None) -> str:
        """
        Render a highlight box with the given content, title, and optional image

        Args:
            content: Text content with simple markdown formatting
            title: Title for the highlight box
            image_url: URL or path to image (optional)

        Returns:
            Rendered HTML string
        """
        try:
            # Load the template
            template = self._load_template("highlight-box")

            # Process the content with formatting
            formatted_content = self._parse_simple_formatting(content)

            # Process the image
            image_content = self._resolve_image_path(image_url)

            # Escape and process title
            safe_title = self._escape_html(title) if title else "Highlight Box"

            # Replace template variables
            rendered = template.replace('{title}', safe_title)
            rendered = rendered.replace('{content_text}', formatted_content)
            rendered = rendered.replace('{image_content}', image_content)

            return rendered

        except Exception as e:
            logger.error(f"Error rendering highlight box: {str(e)}")
            raise

    def render_image_vs(self, content: str, title: str = "", **kwargs) -> str:
        """
        Render a comparison template with structured data

        Args:
            content: Plain text content (fallback, not used for structured data)
            title: Title for the comparison
            **kwargs: Should contain 'comparison_data' with structured comparison info

        Returns:
            Rendered HTML string
        """
        try:
            # Load the template
            template = self._load_template("image-vs")

            # Get comparison data from kwargs
            comparison_data = kwargs.get('comparison_data', {})

            # Extract data with fallbacks
            left = comparison_data.get('left', {})
            right = comparison_data.get('right', {})
            conclusion = comparison_data.get('conclusion', '')

            left_title = left.get('title', 'Left Side')
            left_desc = left.get('description', 'Left description')
            left_image_url = left.get('imageUrl', '')

            right_title = right.get('title', 'Right Side')
            right_desc = right.get('description', 'Right description')
            right_image_url = right.get('imageUrl', '')

            # Build the comparison content HTML
            comparison_content = '<div class="comparison-section">'
            comparison_content += '<div class="comparison-grid">'

            # Left side
            comparison_content += '<div class="comparison-item">'
            comparison_content += '<div class="item-image">'
            if left_image_url:
                comparison_content += f'<img src="{left_image_url}" alt="{left_title}" style="width:100%;height:100%;object-fit:cover;">'
            else:
                comparison_content += '<div class="image-placeholder">No image</div>'
            comparison_content += '</div>'
            comparison_content += f'<h3 class="item-title">{self._escape_html(left_title)}</h3>'
            comparison_content += f'<div class="item-description">{self._parse_simple_formatting(left_desc)}</div>'
            comparison_content += '</div>'

            # VS divider
            comparison_content += '<div class="vs-divider">VS</div>'

            # Right side
            comparison_content += '<div class="comparison-item">'
            comparison_content += '<div class="item-image">'
            if right_image_url:
                comparison_content += f'<img src="{right_image_url}" alt="{right_title}" style="width:100%;height:100%;object-fit:cover;">'
            else:
                comparison_content += '<div class="image-placeholder">No image</div>'
            comparison_content += '</div>'
            comparison_content += f'<h3 class="item-title">{self._escape_html(right_title)}</h3>'
            comparison_content += f'<div class="item-description">{self._parse_simple_formatting(right_desc)}</div>'
            comparison_content += '</div>'

            comparison_content += '</div>' # end comparison-grid
            comparison_content += '</div>' # end comparison-section

            # Add conclusion if provided
            if conclusion:
                comparison_content += '<div class="conclusion-section">'
                comparison_content += '<div class="conclusion-content">'
                comparison_content += self._parse_simple_formatting(conclusion)
                comparison_content += '</div>'
                comparison_content += '</div>'

            # Replace template variables
            safe_title = self._escape_html(title) if title else "Comparison"
            rendered = template.replace('{title}', safe_title)
            rendered = rendered.replace('{content}', comparison_content)

            return rendered

        except Exception as e:
            logger.error(f"Error rendering image-vs template: {str(e)}")
            raise

    def render_template(self, template_name: str, variables: Dict[str, Any]) -> str:
        """
        Generic template renderer for any template

        Args:
            template_name: Name of the template (without .html extension)
            variables: Dictionary of variables to replace in template

        Returns:
            Rendered HTML string
        """
        try:
            template = self._load_template(template_name)

            # Replace all variables in the template
            for key, value in variables.items():
                placeholder = f"{{{key}}}"

                # Convert value to string and escape if it's user content
                if isinstance(value, str) and key not in ['image_content', 'content']:
                    safe_value = self._escape_html(value)
                else:
                    safe_value = str(value)

                template = template.replace(placeholder, safe_value)

            return template

        except Exception as e:
            logger.error(f"Error rendering template {template_name}: {str(e)}")
            raise

    def render_any_template(self, template_name: str, content: str, title: str = "", **kwargs) -> str:
        """
        Render any template with the given content and variables

        Args:
            template_name: Name of the template (text-heavy, visual-grid, etc.)
            content: Main content to render
            title: Title for the template
            **kwargs: Additional variables for the template

        Returns:
            Rendered HTML string
        """
        try:
            # Skip formatting for templates that receive pre-built HTML
            if template_name in ['visual-grid', 'image-vs']:
                formatted_content = content  # Use content as-is
            else:
                formatted_content = self._parse_simple_formatting(content)  # Process markdown

            # Prepare variables for template replacement
            variables = {
                'title': title or 'Untitled',
                'content': formatted_content,
                **kwargs
            }

            # Handle special cases for different templates
            if template_name == 'highlight-box':
                # Use the existing highlight box method
                return self.render_highlight_box(content, title, kwargs.get('image_url'))

            # Use generic template renderer for all other templates
            return self.render_template(template_name, variables)

        except Exception as e:
            logger.error(f"Error rendering template {template_name}: {str(e)}")
            raise

# Convenience functions for easy import
def render_highlight_box(content: str, title: str = "", image_url: Optional[str] = None) -> str:
    """Convenience function to render a highlight box"""
    renderer = TemplateRenderer()
    return renderer.render_highlight_box(content, title, image_url)

def render_any_template(template_name: str, content: str, title: str = "", **kwargs) -> str:
    """Convenience function to render any template"""
    renderer = TemplateRenderer()
    return renderer.render_any_template(template_name, content, title, **kwargs)