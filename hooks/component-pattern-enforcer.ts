import type { PostEditHook } from '@anthropic/claude-code';

/**
 * Enforces LearnLine CMS component integration patterns
 * Validates the 9-step component integration process
 */
export const componentPatternEnforcer: PostEditHook = {
  name: 'Component Pattern Enforcer',

  async run({ edit, responseStream }) {
    const filePath = edit.filePath;
    const fileName = filePath.split('/').pop() || '';
    const newContent = edit.newContent;

    // Component integration files and their requirements
    const componentFiles = {
      'component_schemas.py': {
        step: 1,
        requirements: [
          'description', 'parameters', 'required', 'example'
        ],
        antiPatterns: [
          '"type".*:.*{.*"type".*:.*"string"', // Using "type" as parameter name
        ]
      },

      'vision_processor.py': {
        step: 2,
        requirements: [
          'Use.*for:', // Guidelines in system prompt
          'Example.*Usage:', // Example JSON in system prompt
        ],
        antiPatterns: []
      },

      'app.js': {
        step: 3456, // Steps 3, 4, 5, 6 all in app.js
        requirements: [
          'createComponentElement', 'generatePreviewHTML',
          'extractComponentData', 'populateComponentInputs'
        ],
        antiPatterns: [
          'innerHTML.*=.*""', // Empty innerHTML in populateComponentInputs
        ]
      },

      'student-view.js': {
        step: 7,
        requirements: [
          'case.*:.*return.*render', // Component case in switch
          'render.*Component.*params' // Render method
        ],
        antiPatterns: []
      },

      'styles.css': {
        step: 8,
        requirements: [
          '.preview-.*{', // Preview styling
        ],
        antiPatterns: []
      },

      'student-view.css': {
        step: 8,
        requirements: [
          '.student-.*{', // Student view styling
        ],
        antiPatterns: []
      },

      'index.html': {
        step: 9,
        requirements: [
          'data-component-type=', // Draggable component item
          'onclick.*insertComponent' // Hidden API button
        ],
        antiPatterns: []
      }
    };

    const warnings: string[] = [];
    const errors: string[] = [];

    // Check if this is a component-related file
    const componentFile = componentFiles[fileName];
    if (!componentFile) {
      return { shouldContinue: true };
    }

    // Extract component type from new content
    const componentTypeMatch = newContent.match(/"([a-z-]+)":\s*{.*"description"/);
    const componentType = componentTypeMatch ? componentTypeMatch[1] : null;

    if (!componentType && fileName === 'component_schemas.py') {
      // Might be modifying existing component
      return { shouldContinue: true };
    }

    // Validate requirements for this file
    for (const requirement of componentFile.requirements) {
      const regex = new RegExp(requirement, 'i');
      if (!regex.test(newContent)) {
        warnings.push(`Missing requirement: ${requirement}`);
      }
    }

    // Check for anti-patterns
    for (const antiPattern of componentFile.antiPatterns) {
      const regex = new RegExp(antiPattern, 'i');
      if (regex.test(newContent)) {
        errors.push(`Anti-pattern detected: ${antiPattern}`);
      }
    }

    // Component-specific validations
    if (fileName === 'component_schemas.py' && componentType) {
      await validateComponentSchema(newContent, componentType, warnings, errors);
    }

    if (fileName === 'app.js' && componentType) {
      await validateAppJsIntegration(newContent, componentType, warnings, errors);
    }

    if (fileName === 'student-view.js' && componentType) {
      await validateStudentViewIntegration(newContent, componentType, warnings, errors);
    }

    // Educational domain validations
    if (componentType) {
      await validateEducationalPatterns(newContent, componentType, warnings);
    }

    // Send feedback to user
    if (errors.length > 0 || warnings.length > 0) {
      let message = `🔧 **Component Integration Check** (${fileName}):\n\n`;

      if (errors.length > 0) {
        message += `❌ **Errors** (fix required):\n${errors.map(e => `- ${e}`).join('\n')}\n\n`;
      }

      if (warnings.length > 0) {
        message += `⚠️ **Warnings** (check recommended):\n${warnings.map(w => `- ${w}`).join('\n')}\n\n`;
      }

      if (componentType) {
        message += `📋 **Component**: ${componentType} (Step ${componentFile.step} of 9)\n`;
        message += `📝 **Remaining steps**: Check other files for complete integration\n\n`;
      }

      await responseStream.sendSystemMessage(message);
    }

    return {
      shouldContinue: errors.length === 0, // Block if errors found
      data: {
        componentType,
        step: componentFile.step,
        errors,
        warnings
      }
    };
  }
};

async function validateComponentSchema(content: string, componentType: string, warnings: string[], errors: string[]) {
  // Check for required schema fields
  const requiredFields = ['description', 'parameters', 'example'];
  for (const field of requiredFields) {
    if (!content.includes(`"${field}"`)) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Check parameter structure
  const parameterMatch = content.match(/"parameters":\s*{([^}]+)}/);
  if (parameterMatch) {
    const parameters = parameterMatch[1];
    if (!parameters.includes('"required"') || !parameters.includes('"description"')) {
      warnings.push('Parameters should include "required" and "description" fields');
    }
  }

  // Validate example structure
  if (content.includes('"example"')) {
    if (!content.includes(`"type": "${componentType}"`)) {
      errors.push('Example must include correct component type');
    }
  }

  // Check for "type" parameter anti-pattern
  if (content.match(/"type":\s*{.*"type".*:.*"string"/)) {
    errors.push('Never use "type" as a parameter name - it conflicts with component type');
  }
}

async function validateAppJsIntegration(content: string, componentType: string, warnings: string[], errors: string[]) {
  const methods = ['createComponentElement', 'generatePreviewHTML', 'extractComponentData', 'populateComponentInputs'];
  const missingMethods = methods.filter(method => {
    const casePattern = new RegExp(`case\\s+['"\`]${componentType}['"\`]:`);
    const methodPattern = new RegExp(`${method}.*case\\s+['"\`]${componentType}['"\`]:`, 's');
    return !methodPattern.test(content) && casePattern.test(content);
  });

  if (missingMethods.length > 0) {
    warnings.push(`Missing cases in methods: ${missingMethods.join(', ')}`);
  }

  // Check for critical populateComponentInputs implementation
  const populatePattern = new RegExp(`populateComponentInputs.*case\\s+['"\`]${componentType}['"\`]:.*?break`, 's');
  const populateMatch = content.match(populatePattern);

  if (populateMatch && populateMatch[0].includes('innerHTML = ""')) {
    errors.push('populateComponentInputs has empty innerHTML - AI components will appear empty');
  }

  // Check for proper event binding
  if (content.includes('addEventListener') && content.includes(componentType)) {
    if (!content.includes('scheduleAutoSave')) {
      warnings.push('Component events should trigger scheduleAutoSave()');
    }
  }
}

async function validateStudentViewIntegration(content: string, componentType: string, warnings: string[], errors: string[]) {
  // Check for case in main switch
  const casePattern = new RegExp(`case\\s+['"\`]${componentType}['"\`]:`);
  if (!casePattern.test(content)) {
    warnings.push('Missing case in student view switch statement');
  }

  // Check for render method
  const renderMethodName = `render${componentType.split('-').map(word =>
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join('')}`;

  if (!content.includes(renderMethodName)) {
    warnings.push(`Missing render method: ${renderMethodName}`);
  }

  // Check for proper parameter handling
  if (content.includes(`render${componentType}`)) {
    if (!content.includes('params.') && !content.includes('|| ')) {
      warnings.push('Render method should handle missing parameters with fallbacks');
    }
  }
}

async function validateEducationalPatterns(content: string, componentType: string, warnings: string[]) {
  // Educational component best practices
  const educationalGuidelines = {
    'definition': ['term', 'definition'],
    'worked-example': ['problem', 'solution', 'answer'],
    'step-sequence': ['steps', 'array'],
    'memory-trick': ['mnemonic', 'memory'],
    'hero-number': ['chart_data', 'visual_type'],
    'callout-box': ['style', 'tip', 'warning', 'important']
  };

  const guidelines = educationalGuidelines[componentType];
  if (guidelines) {
    const missingGuidelines = guidelines.filter(guideline =>
      !content.toLowerCase().includes(guideline.toLowerCase())
    );

    if (missingGuidelines.length > 0) {
      warnings.push(`Educational pattern check: Consider including ${missingGuidelines.join(', ')}`);
    }
  }

  // Math notation support
  if (content.includes('math') || content.includes('fraction') || content.includes('equation')) {
    if (!content.includes('MathJax') && !content.includes('KaTeX')) {
      warnings.push('Mathematical content detected - consider math notation support');
    }
  }
}