# Component Schema Definitions
# Extracted from frontend app.js extractComponentData() method (lines 1020-1099)

COMPONENT_SCHEMAS = {
    "heading": {
        "description": "Single text input for titles/section headers",
        "parameters": {
            "text": {
                "type": "string",
                "required": True,
                "description": "The heading text content"
            }
        },
        "example": {
            "type": "heading",
            "parameters": {"text": "Understanding Fractions"}
        }
    },

    "paragraph": {
        "description": "Large text area for explanations and body content",
        "parameters": {
            "text": {
                "type": "string",
                "required": True,
                "description": "The paragraph content"
            }
        },
        "example": {
            "type": "paragraph",
            "parameters": {"text": "Fractions represent parts of a whole number..."}
        }
    },

    "definition": {
        "description": "Term + definition fields for key concepts",
        "parameters": {
            "term": {
                "type": "string",
                "required": True,
                "description": "The term being defined"
            },
            "definition": {
                "type": "string",
                "required": True,
                "description": "The definition of the term"
            }
        },
        "example": {
            "type": "definition",
            "parameters": {
                "term": "Fraction",
                "definition": "A numerical expression representing part of a whole"
            }
        }
    },

    "step-sequence": {
        "description": "Numbered list for procedures/processes",
        "parameters": {
            "steps": {
                "type": "array",
                "required": True,
                "description": "Array of step descriptions (strings)"
            }
        },
        "example": {
            "type": "step-sequence",
            "parameters": {
                "steps": [
                    "Look at the numerator (top number)",
                    "Look at the denominator (bottom number)",
                    "Understand the relationship between them"
                ]
            }
        }
    },

    "worked-example": {
        "description": "Problem + solution + answer structure for examples",
        "parameters": {
            "problem": {
                "type": "string",
                "required": True,
                "description": "The problem statement"
            },
            "solution": {
                "type": "string",
                "required": True,
                "description": "Step-by-step solution"
            },
            "answer": {
                "type": "string",
                "required": True,
                "description": "The final answer"
            }
        },
        "example": {
            "type": "worked-example",
            "parameters": {
                "problem": "Add 1/4 + 1/4",
                "solution": "Since denominators are the same, add numerators: 1 + 1 = 2",
                "answer": "2/4 = 1/2"
            }
        }
    },

    "memory-trick": {
        "description": "Single text for mnemonics/memory aids",
        "parameters": {
            "text": {
                "type": "string",
                "required": True,
                "description": "The memory trick or mnemonic content"
            }
        },
        "example": {
            "type": "memory-trick",
            "parameters": {"text": "Remember: Bigger denominator = smaller pieces!"}
        }
    },

    "four-pictures": {
        "description": "4 image slots with title/description each",
        "parameters": {
            "pictures": {
                "type": "object",
                "required": True,
                "description": "Object with image1, image2, image3, image4 properties",
                "structure": {
                    "image1": {"title": "string", "body": "string", "imagePath": "string (optional)", "imageUrl": "string (optional)"},
                    "image2": {"title": "string", "body": "string", "imagePath": "string (optional)", "imageUrl": "string (optional)"},
                    "image3": {"title": "string", "body": "string", "imagePath": "string (optional)", "imageUrl": "string (optional)"},
                    "image4": {"title": "string", "body": "string", "imagePath": "string (optional)", "imageUrl": "string (optional)"}
                }
            }
        },
        "example": {
            "type": "four-pictures",
            "parameters": {
                "pictures": {
                    "image1": {"title": "Pizza Slices", "body": "3 out of 4 slices eaten", "imagePath": "", "imageUrl": ""},
                    "image2": {"title": "Pie Chart", "body": "Visual fraction representation", "imagePath": "", "imageUrl": ""},
                    "image3": {"title": "Number Line", "body": "Fractions on a number line", "imagePath": "", "imageUrl": ""},
                    "image4": {"title": "Real Objects", "body": "Everyday fraction examples", "imagePath": "", "imageUrl": ""}
                }
            }
        }
    },

    "three-pictures": {
        "description": "3 image slots with title/description each",
        "parameters": {
            "pictures": {
                "type": "object",
                "required": True,
                "description": "Object with image1, image2, image3 properties",
                "structure": {
                    "image1": {"title": "string", "body": "string", "imagePath": "string (optional)", "imageUrl": "string (optional)"},
                    "image2": {"title": "string", "body": "string", "imagePath": "string (optional)", "imageUrl": "string (optional)"},
                    "image3": {"title": "string", "body": "string", "imagePath": "string (optional)", "imageUrl": "string (optional)"}
                }
            }
        },
        "example": {
            "type": "three-pictures",
            "parameters": {
                "pictures": {
                    "image1": {"title": "Example 1", "body": "First visual example", "imagePath": "", "imageUrl": ""},
                    "image2": {"title": "Example 2", "body": "Second visual example", "imagePath": "", "imageUrl": ""},
                    "image3": {"title": "Example 3", "body": "Third visual example", "imagePath": "", "imageUrl": ""}
                }
            }
        }
    },

    "two-pictures": {
        "description": "2 image slots with title/description each",
        "parameters": {
            "pictures": {
                "type": "object",
                "required": True,
                "description": "Object with image1, image2 properties",
                "structure": {
                    "image1": {"title": "string", "body": "string", "imagePath": "string (optional)", "imageUrl": "string (optional)"},
                    "image2": {"title": "string", "body": "string", "imagePath": "string (optional)", "imageUrl": "string (optional)"}
                }
            }
        },
        "example": {
            "type": "two-pictures",
            "parameters": {
                "pictures": {
                    "image1": {"title": "Before", "body": "Situation before applying concept", "imagePath": "", "imageUrl": ""},
                    "image2": {"title": "After", "body": "Situation after applying concept", "imagePath": "", "imageUrl": ""}
                }
            }
        }
    },

    "callout-box": {
        "description": "Highlighted box for important information, tips, warnings, or notes",
        "parameters": {
            "text": {
                "type": "string",
                "required": True,
                "description": "The callout content text"
            },
            "style": {
                "type": "string",
                "required": False,
                "description": "Callout style: info|tip|warning|important (default: info)"
            }
        },
        "example": {
            "type": "callout-box",
            "parameters": {
                "text": "Remember: Bigger denominator = smaller pieces!",
                "style": "tip"
            }
        }
    },

    "hero-number": {
        "description": "Large centered visual element (text/number/image/SVG/chart) with caption for statistics, percentages, or focal numbers",
        "parameters": {
            "visual_type": {
                "type": "string",
                "required": True,
                "description": "Type of visual content: text|image|pie-chart|bar-chart|fraction-circle|svg (default: text)"
            },
            "visual_content": {
                "type": "string",
                "required": True,
                "description": "The visual content - text/number OR image URL OR generated SVG code"
            },
            "caption": {
                "type": "string",
                "required": False,
                "description": "Small descriptive text displayed below the visual element"
            },
            "background_style": {
                "type": "string",
                "required": False,
                "description": "Background gradient style: purple|blue|green|orange|red|dark|light (default: purple)"
            },
            "chart_data": {
                "type": "object",
                "required": False,
                "description": "Chart metadata for auto-generators. For pie-chart/fraction-circle: {numerator: int, denominator: int}. For bar-chart: {current: int, maximum: int}. Frontend will auto-generate SVG from this data."
            }
        },
        "example": {
            "type": "hero-number",
            "parameters": {
                "visual_type": "text",
                "visual_content": "3/4",
                "caption": "of students improved their test scores",
                "background_style": "purple"
            }
        }
    },

    "three-svgs": {
        "description": "3 AI-generated SVG illustrations with titles and descriptions, displayed in a grid layout",
        "parameters": {
            "title1": {
                "type": "string",
                "required": True,
                "description": "Title for first SVG"
            },
            "description1": {
                "type": "string",
                "required": True,
                "description": "Description for first SVG"
            },
            "svg1": {
                "type": "string",
                "required": False,
                "description": "SVG code for first illustration (generated by AI)"
            },
            "title2": {
                "type": "string",
                "required": True,
                "description": "Title for second SVG"
            },
            "description2": {
                "type": "string",
                "required": True,
                "description": "Description for second SVG"
            },
            "svg2": {
                "type": "string",
                "required": False,
                "description": "SVG code for second illustration (generated by AI)"
            },
            "title3": {
                "type": "string",
                "required": True,
                "description": "Title for third SVG"
            },
            "description3": {
                "type": "string",
                "required": True,
                "description": "Description for third SVG"
            },
            "svg3": {
                "type": "string",
                "required": False,
                "description": "SVG code for third illustration (generated by AI)"
            }
        },
        "example": {
            "type": "three-svgs",
            "parameters": {
                "title1": "Quarter Past",
                "description1": "15 minutes = 15/60. The minute hand moved from 12 to 3",
                "svg1": "<svg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'>...</svg>",
                "title2": "Half Past",
                "description2": "30 minutes = 30/60. The minute hand is pointing at 6 now",
                "svg2": "<svg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'>...</svg>",
                "title3": "Three-Quarters Past",
                "description3": "45 minutes = 45/60. The minute hand is now at 9",
                "svg3": "<svg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'>...</svg>"
            }
        }
    }
}

def build_component_prompt_section() -> str:
    """Build detailed component specifications for vision AI prompt"""
    prompt_sections = []

    prompt_sections.append("Available Components with EXACT Parameter Specifications:")
    prompt_sections.append("")

    for i, (component_type, schema) in enumerate(COMPONENT_SCHEMAS.items(), 1):
        prompt_sections.append(f"{i}. {component_type.upper()} - {schema['description']}")

        # Add parameter details
        prompt_sections.append("   Parameters:")
        for param_name, param_info in schema['parameters'].items():
            required_text = "REQUIRED" if param_info['required'] else "optional"
            prompt_sections.append(f"   - {param_name}: {param_info['type']} ({required_text}) - {param_info['description']}")

        # Add example
        prompt_sections.append("   Example JSON:")
        import json
        example_json = json.dumps(schema['example'], indent=6)
        prompt_sections.append(f"   {example_json}")
        prompt_sections.append("")

    return "\n".join(prompt_sections)

def validate_component_parameters(component_type: str, parameters: dict) -> tuple[bool, str]:
    """Validate component parameters against schema"""
    if component_type not in COMPONENT_SCHEMAS:
        return False, f"Unknown component type: {component_type}"

    schema = COMPONENT_SCHEMAS[component_type]

    # Check required parameters
    for param_name, param_info in schema['parameters'].items():
        if param_info['required'] and param_name not in parameters:
            return False, f"Missing required parameter '{param_name}' for {component_type}"

    return True, "Valid"