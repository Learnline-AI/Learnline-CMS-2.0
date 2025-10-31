import type { UserPromptSubmitHook } from '@anthropic/claude-code';

/**
 * Component Integration Specialist Agent
 * Master of 9-step component integration across 7 files, debugging integration failures
 */

// Complete 9-Step Integration Knowledge Base
const INTEGRATION_STEPS = {
  1: {
    step: 'Schema Definition',
    file: 'component_schemas.py',
    location: 'COMPONENT_SCHEMAS dictionary',
    requirements: [
      'Component description',
      'Parameters with types and requirements',
      'Example JSON structure',
      'Validation compatibility'
    ],
    critical_patterns: [
      'Never use "type" as parameter name',
      'Include "required" boolean for each parameter',
      'Provide clear parameter descriptions',
      'Example must match component type'
    ],
    validation: 'validate_component_parameters() function must pass'
  },
  2: {
    step: 'AI Training',
    file: 'vision_processor.py',
    location: 'Lines 70-591 system prompt',
    requirements: [
      'When-to-use guidelines',
      'Parameter examples',
      'Decision tree logic',
      'Educational context'
    ],
    critical_patterns: [
      'Maintain 590-line prompt structure',
      'Add to appropriate section',
      'Include JSON examples',
      'Follow educational guidelines'
    ],
    validation: 'AI extracts component correctly from PDFs'
  },
  3: {
    step: 'Editor UI',
    file: 'app.js',
    location: 'createComponentElement() function after line 524',
    requirements: [
      'Case statement for component type',
      'Form controls for all parameters',
      'Component header with remove button',
      'Event binding for auto-save'
    ],
    critical_patterns: [
      'Include remove button',
      'Bind change events to scheduleAutoSave()',
      'Use appropriate form controls',
      'Consistent HTML structure'
    ],
    validation: 'Component appears in editor with all controls'
  },
  4: {
    step: 'Preview Generation',
    file: 'app.js',
    location: 'generatePreviewHTML() function after line 1247',
    requirements: [
      'Case statement for component type',
      'Parameter extraction from DOM',
      'HTML template for preview',
      'Style class application'
    ],
    critical_patterns: [
      'Use formatTextForPreview() for text',
      'Extract parameters correctly',
      'Apply preview CSS classes',
      'Handle missing parameters gracefully'
    ],
    validation: 'Live preview updates when editing'
  },
  5: {
    step: 'Data Extraction',
    file: 'app.js',
    location: 'extractComponentData() function after line 1576',
    requirements: [
      'Case statement for component type',
      'Extract all parameters from form',
      'Data validation before storage',
      'Proper field mapping'
    ],
    critical_patterns: [
      'Extract ALL component parameters',
      'Handle contenteditable vs input fields',
      'Validate extracted data',
      'Map to schema parameter names'
    ],
    validation: 'Save operation captures all component data'
  },
  6: {
    step: 'Population Logic',
    file: 'app.js',
    location: 'populateComponentInputs() function after line 934',
    requirements: [
      'Case statement for component type',
      'Populate ALL parameters from data',
      'Handle missing data gracefully',
      'Set form control values correctly'
    ],
    critical_patterns: [
      'NEVER leave innerHTML empty',
      'Populate ALL parameters',
      'Handle null/undefined values',
      'Set dropdown selected values'
    ],
    validation: 'AI components have content, not empty fields',
    failure_symptom: 'AI components appear empty in editor'
  },
  7: {
    step: 'Student Rendering',
    file: 'student-view.js',
    location: 'Switch statement after line 99 + render method after line 181',
    requirements: [
      'Case in main switch statement',
      'Dedicated render method',
      'Parameter handling with defaults',
      'Student-appropriate styling'
    ],
    critical_patterns: [
      'Use camelCase for render method name',
      'Provide parameter defaults',
      'Apply student CSS classes',
      'Handle missing parameters'
    ],
    validation: 'Component displays correctly in student view'
  },
  8: {
    step: 'CSS Styling',
    files: ['styles.css', 'student-view.css'],
    location: 'styles.css after line 2028, student-view.css after line 340',
    requirements: [
      'Preview styles in styles.css',
      'Student styles in student-view.css',
      'Responsive design support',
      'Consistent visual hierarchy'
    ],
    critical_patterns: [
      'Both files need styles',
      'Consistent naming convention',
      'Responsive breakpoints',
      'Accessibility considerations'
    ],
    validation: 'Component looks good in both preview and student view'
  },
  9: {
    step: 'UI Button',
    file: 'index.html',
    location: 'Component panel after line 113 + hidden button after line 143',
    requirements: [
      'Draggable component item',
      'Hidden API button',
      'Appropriate icon',
      'Descriptive name'
    ],
    critical_patterns: [
      'data-component-type attribute',
      'onclick="insertComponent()" function',
      'FontAwesome icon',
      'User-friendly component name'
    ],
    validation: 'Component can be dragged into editor'
  }
};

// Common Integration Failure Patterns
const FAILURE_PATTERNS = {
  'empty-ai-components': {
    cause: 'Missing or incorrect Step 6 (populateComponentInputs)',
    symptoms: ['AI-generated components appear empty', 'Form fields not populated'],
    solution: 'Add proper populateComponentInputs case with ALL parameter population',
    debug_steps: [
      'Check if case exists in populateComponentInputs',
      'Verify ALL parameters are populated',
      'Ensure no innerHTML = "" assignments',
      'Test with AI-generated component'
    ]
  },
  'css-styling-issues': {
    cause: 'Missing CSS in one or both required files',
    symptoms: ['Component looks broken', 'Inconsistent styling', 'Layout issues'],
    solution: 'Add styles to BOTH styles.css AND student-view.css',
    debug_steps: [
      'Check styles.css for .preview-component-name class',
      'Check student-view.css for .student-component-name class',
      'Verify responsive breakpoints',
      'Test in both preview and student view'
    ]
  },
  'parameter-validation-errors': {
    cause: 'Schema parameter mismatch with form implementation',
    symptoms: ['Validation errors on save', 'Component creation fails'],
    solution: 'Ensure parameter names match exactly between schema and form',
    debug_steps: [
      'Compare schema parameter names with form extraction',
      'Check required vs optional parameter handling',
      'Verify data types match schema',
      'Test validate_component_parameters() call'
    ]
  },
  'auto-save-not-triggering': {
    cause: 'Missing event binding in Step 3 (createComponentElement)',
    symptoms: ['Changes not saved automatically', 'Manual save required'],
    solution: 'Add event listeners that call scheduleAutoSave()',
    debug_steps: [
      'Check for addEventListener calls in createComponentElement',
      'Verify scheduleAutoSave() is called on change',
      'Test with various input types',
      'Check debouncing is working'
    ]
  },
  'ai-extraction-failures': {
    cause: 'Missing or incorrect Step 2 (vision AI training)',
    symptoms: ['AI never selects component', 'Wrong component extraction'],
    solution: 'Add component guidelines to 590-line system prompt',
    debug_steps: [
      'Check if component mentioned in system prompt',
      'Verify decision tree logic includes component',
      'Test with relevant PDF content',
      'Review extraction accuracy'
    ]
  }
};

// Component Type Analysis
const COMPONENT_COMPLEXITY = {
  'simple': {
    types: ['heading', 'paragraph', 'memory-trick'],
    integration_time: '30 minutes',
    common_issues: ['basic CSS styling'],
    testing_priority: 'low'
  },
  'moderate': {
    types: ['definition', 'callout-box', 'step-sequence'],
    integration_time: '45 minutes',
    common_issues: ['parameter validation', 'form controls'],
    testing_priority: 'medium'
  },
  'complex': {
    types: ['worked-example', 'hero-number', 'picture-components', 'three-svgs'],
    integration_time: '60+ minutes',
    common_issues: ['multiple parameters', 'complex UI', 'validation logic'],
    testing_priority: 'high'
  }
};

interface ComponentContext {
  componentType?: string;
  integrationStep?: number;
  failurePattern?: string;
  currentFile?: string;
  errorMessages?: string[];
}

export const componentIntegrationSpecialist: UserPromptSubmitHook = {
  name: 'Component Integration Specialist',

  async run({ prompt, responseStream }) {
    // Activation triggers for component integration work
    const componentTriggers = [
      'component', 'add component', 'new component', 'create component',
      'integration', 'populateComponentInputs', 'createComponentElement',
      'extractComponentData', 'generatePreviewHTML', 'empty component',
      'AI component', 'vision AI', 'component extraction'
    ];

    const integrationFiles = [
      'component_schemas.py', 'vision_processor.py', 'app.js',
      'student-view.js', 'styles.css', 'student-view.css', 'index.html'
    ];

    const errorPatterns = [
      'empty', 'not working', 'broken', 'failed', 'error', 'issue',
      'populateComponentInputs', 'validation', 'CSS', 'styling'
    ];

    const lowerPrompt = prompt.toLowerCase();

    // Check if component integration specialist should activate
    const hasComponentTriggers = componentTriggers.some(trigger =>
      lowerPrompt.includes(trigger.toLowerCase())
    );

    const hasIntegrationFile = integrationFiles.some(file =>
      lowerPrompt.includes(file.toLowerCase())
    );

    const hasErrorPattern = errorPatterns.some(pattern =>
      lowerPrompt.includes(pattern.toLowerCase())
    );

    if (!hasComponentTriggers && !hasIntegrationFile && !hasErrorPattern) {
      return { shouldContinue: true };
    }

    // Extract component context from prompt
    const componentContext = extractComponentContext(prompt);

    // Provide component integration expertise
    let message = '🔧 **Component Integration Specialist Activated**\n\n';

    if (componentContext.componentType) {
      message += await provideComponentSpecificGuidance(componentContext);
    }

    if (componentContext.failurePattern) {
      message += await provideFailurePatternGuidance(componentContext);
    }

    if (componentContext.integrationStep) {
      message += await provideStepSpecificGuidance(componentContext);
    }

    message += await provide9StepChecklist(componentContext);
    message += await provideTestingGuidance(componentContext);
    message += await provideDebuggingGuidance(componentContext);

    message += '\n🎯 **Integration Success Criteria**:\n';
    message += '✅ All 9 steps completed across 7 files\n';
    message += '✅ Manual testing: Click → Type → Preview → Save → Reload → Verify\n';
    message += '✅ AI testing: PDF → Component extraction → Non-empty → Preview\n';
    message += '✅ Validation: validate_component_parameters() passes\n\n';

    await responseStream.sendSystemMessage(message);

    return {
      shouldContinue: true,
      data: {
        componentContext,
        activationType: 'component-integration-specialist',
        integrationProgress: calculateIntegrationProgress(componentContext),
        recommendations: await generateIntegrationRecommendations(componentContext)
      }
    };
  }
};

function extractComponentContext(prompt: string): ComponentContext {
  const context: ComponentContext = {};

  // Extract component type
  const componentTypes = [
    'heading', 'paragraph', 'definition', 'memory-trick',
    'four-pictures', 'three-pictures', 'two-pictures', 'three-svgs',
    'step-sequence', 'worked-example', 'callout-box', 'hero-number'
  ];

  for (const type of componentTypes) {
    if (prompt.toLowerCase().includes(type)) {
      context.componentType = type;
      break;
    }
  }

  // Extract integration step
  const stepPatterns = [
    { pattern: /schema|component_schemas\.py/i, step: 1 },
    { pattern: /vision|prompt|vision_processor\.py/i, step: 2 },
    { pattern: /createComponentElement|editor UI/i, step: 3 },
    { pattern: /generatePreviewHTML|preview/i, step: 4 },
    { pattern: /extractComponentData|data extraction/i, step: 5 },
    { pattern: /populateComponentInputs|population/i, step: 6 },
    { pattern: /student-view\.js|student rendering/i, step: 7 },
    { pattern: /CSS|styling|styles\.css/i, step: 8 },
    { pattern: /index\.html|UI button|drag/i, step: 9 }
  ];

  for (const { pattern, step } of stepPatterns) {
    if (pattern.test(prompt)) {
      context.integrationStep = step;
      break;
    }
  }

  // Detect failure patterns
  if (prompt.toLowerCase().includes('empty')) {
    context.failurePattern = 'empty-ai-components';
  } else if (prompt.toLowerCase().includes('css') || prompt.toLowerCase().includes('styling')) {
    context.failurePattern = 'css-styling-issues';
  } else if (prompt.toLowerCase().includes('validation')) {
    context.failurePattern = 'parameter-validation-errors';
  } else if (prompt.toLowerCase().includes('auto-save')) {
    context.failurePattern = 'auto-save-not-triggering';
  } else if (prompt.toLowerCase().includes('ai') || prompt.toLowerCase().includes('extraction')) {
    context.failurePattern = 'ai-extraction-failures';
  }

  // Extract current file
  const fileNames = Object.keys(INTEGRATION_STEPS).map(step => INTEGRATION_STEPS[step].file);
  for (const fileName of fileNames) {
    if (prompt.toLowerCase().includes(fileName.toLowerCase())) {
      context.currentFile = fileName;
      break;
    }
  }

  return context;
}

async function provideComponentSpecificGuidance(context: ComponentContext): Promise<string> {
  let guidance = `🎯 **${context.componentType?.toUpperCase()} Component Integration**:\n\n`;

  // Determine complexity level
  let complexity = 'simple';
  for (const [level, info] of Object.entries(COMPONENT_COMPLEXITY)) {
    if (info.types.includes(context.componentType!)) {
      complexity = level;
      break;
    }
  }

  const complexityInfo = COMPONENT_COMPLEXITY[complexity];
  guidance += `**Complexity**: ${complexity} (${complexityInfo.integration_time})\n`;
  guidance += `**Common Issues**: ${complexityInfo.common_issues.join(', ')}\n`;
  guidance += `**Testing Priority**: ${complexityInfo.testing_priority}\n\n`;

  // Component-specific patterns
  if (context.componentType === 'worked-example') {
    guidance += '**Worked-Example Specific**:\n';
    guidance += '- Parameters: problem, solution, answer (all required)\n';
    guidance += '- UI: Three text areas for problem/solution/answer\n';
    guidance += '- Preview: Structured display with clear sections\n';
    guidance += '- Student View: Step-by-step layout\n\n';
  }

  if (context.componentType?.includes('pictures')) {
    guidance += '**Picture Component Specific**:\n';
    guidance += '- Parameters: pictures object with imageN properties\n';
    guidance += '- UI: Image upload + title/body for each image\n';
    guidance += '- Preview: Grid layout with placeholder images\n';
    guidance += '- Student View: Responsive image grid\n\n';
  }

  if (context.componentType === 'hero-number') {
    guidance += '**Hero-Number Specific**:\n';
    guidance += '- Parameters: visual_type, visual_content, caption, background_style, chart_data\n';
    guidance += '- UI: Dropdown for visual_type, conditional inputs\n';
    guidance += '- Preview: Large centered visual with background\n';
    guidance += '- Student View: Responsive hero section\n\n';
  }

  return guidance;
}

async function provideFailurePatternGuidance(context: ComponentContext): Promise<string> {
  const pattern = FAILURE_PATTERNS[context.failurePattern!];
  if (!pattern) {
    return '';
  }

  let guidance = `🚨 **Failure Pattern: ${context.failurePattern?.replace('-', ' ').toUpperCase()}**\n\n`;
  guidance += `**Cause**: ${pattern.cause}\n`;
  guidance += `**Symptoms**: ${pattern.symptoms.join(', ')}\n`;
  guidance += `**Solution**: ${pattern.solution}\n\n`;

  guidance += '**Debug Steps**:\n';
  pattern.debug_steps.forEach((step, index) => {
    guidance += `${index + 1}. ${step}\n`;
  });
  guidance += '\n';

  // Special handling for Step 6 failure (most critical)
  if (context.failurePattern === 'empty-ai-components') {
    guidance += '⚠️ **CRITICAL**: Step 6 is the most commonly missed step!\n';
    guidance += '```javascript\n';
    guidance += 'case "your-component":\n';
    guidance += '    if (data.text) {\n';
    guidance += '        const input = componentElement.querySelector(".component-input");\n';
    guidance += '        if (input) input.innerHTML = data.text; // NOT empty!\n';
    guidance += '    }\n';
    guidance += '    break;\n';
    guidance += '```\n\n';
  }

  return guidance;
}

async function provideStepSpecificGuidance(context: ComponentContext): Promise<string> {
  const step = INTEGRATION_STEPS[context.integrationStep!];
  if (!step) {
    return '';
  }

  let guidance = `📋 **Step ${context.integrationStep}: ${step.step}**\n\n`;
  guidance += `**File**: ${step.file}\n`;
  guidance += `**Location**: ${step.location}\n\n`;

  guidance += '**Requirements**:\n';
  step.requirements.forEach(req => {
    guidance += `- ${req}\n`;
  });
  guidance += '\n';

  guidance += '**Critical Patterns**:\n';
  step.critical_patterns.forEach(pattern => {
    guidance += `- ${pattern}\n`;
  });
  guidance += '\n';

  guidance += `**Validation**: ${step.validation}\n`;

  if (step.failure_symptom) {
    guidance += `⚠️ **Failure Symptom**: ${step.failure_symptom}\n`;
  }

  guidance += '\n';

  return guidance;
}

async function provide9StepChecklist(context: ComponentContext): Promise<string> {
  let checklist = '📝 **9-Step Integration Checklist**:\n\n';

  for (const [stepNum, step] of Object.entries(INTEGRATION_STEPS)) {
    const isCurrentStep = context.integrationStep?.toString() === stepNum;
    const checkmark = isCurrentStep ? '🔄' : '⬜';

    checklist += `${checkmark} **Step ${stepNum}**: ${step.step} (${step.file})\n`;

    if (isCurrentStep) {
      checklist += `   👉 **Current Focus**: ${step.location}\n`;
    }
  }

  checklist += '\n';
  return checklist;
}

async function provideTestingGuidance(context: ComponentContext): Promise<string> {
  let guidance = '🧪 **Testing Requirements**:\n\n';

  guidance += '**Manual Testing Flow**:\n';
  guidance += '1. Click component button → Component appears\n';
  guidance += '2. Type in form fields → Preview updates\n';
  guidance += '3. Save node → Data persists\n';
  guidance += '4. Reload page → Content remains\n';
  guidance += '5. Student view → Displays correctly\n\n';

  guidance += '**AI Integration Testing**:\n';
  guidance += '1. Upload relevant PDF\n';
  guidance += '2. AI extracts component correctly\n';
  guidance += '3. Component has actual content (not empty!)\n';
  guidance += '4. Preview renders properly\n\n';

  guidance += '**Validation Testing**:\n';
  guidance += '1. validate_component_parameters() passes\n';
  guidance += '2. Save operation successful\n';
  guidance += '3. Component data in database\n';
  guidance += '4. Auto-save triggers on changes\n\n';

  return guidance;
}

async function provideDebuggingGuidance(context: ComponentContext): Promise<string> {
  let guidance = '🔍 **Debugging Guide**:\n\n';

  guidance += '**Common Debug Commands**:\n';
  guidance += '- `console.log("Step 6 data:", data)` in populateComponentInputs\n';
  guidance += '- `console.log("Extracted:", componentData)` in extractComponentData\n';
  guidance += '- Check Network tab for API call responses\n';
  guidance += '- Inspect component DOM structure\n\n';

  guidance += '**Step 6 Debug Pattern**:\n';
  guidance += '```javascript\n';
  guidance += 'case "your-component":\n';
  guidance += '    console.log("Populating with data:", data);\n';
  guidance += '    if (data.text) {\n';
  guidance += '        console.log("Setting text:", data.text);\n';
  guidance += '        // Population logic here\n';
  guidance += '    }\n';
  guidance += '    break;\n';
  guidance += '```\n\n';

  return guidance;
}

function calculateIntegrationProgress(context: ComponentContext): number {
  // This would integrate with actual file analysis to determine completion
  return context.integrationStep ? (context.integrationStep / 9) * 100 : 0;
}

async function generateIntegrationRecommendations(context: ComponentContext): Promise<string[]> {
  const recommendations: string[] = [];

  if (context.componentType) {
    const complexity = Object.entries(COMPONENT_COMPLEXITY).find(([_, info]) =>
      info.types.includes(context.componentType!)
    );

    if (complexity) {
      recommendations.push(`Plan ${complexity[1].integration_time} for integration`);
      recommendations.push(`Focus on ${complexity[1].common_issues.join(' and ')}`);
    }
  }

  if (context.failurePattern === 'empty-ai-components') {
    recommendations.push('Priority fix: Implement Step 6 populateComponentInputs');
    recommendations.push('Test with AI-generated component immediately');
  }

  if (context.integrationStep === 6) {
    recommendations.push('CRITICAL: Ensure ALL parameters are populated');
    recommendations.push('Never leave innerHTML empty');
    recommendations.push('Test AI component generation after implementation');
  }

  return recommendations;
}