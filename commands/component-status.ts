import type { SlashCommand } from '@anthropic/claude-code';

/**
 * Validates all 11 LearnLine components and their integration status
 * Checks 9-step integration pattern across 7 files
 */
export const componentStatus: SlashCommand = {
  name: 'component-status',
  description: 'Check integration status of all 11 educational components',

  async run({ args, filesystem, responseStream }) {
    const componentType = args[0]; // Optional: check specific component

    await responseStream.sendSystemMessage('🔍 Checking component integration status...');

    // 11 LearnLine educational components
    const expectedComponents = {
      // Text Components
      'heading': { category: 'Text', description: 'Single text input for titles/section headers' },
      'paragraph': { category: 'Text', description: 'Large text area for explanations and body content' },
      'definition': { category: 'Text', description: 'Term + definition fields for key concepts' },
      'memory-trick': { category: 'Text', description: 'Single text for mnemonics/memory aids' },

      // Visual Components
      'four-pictures': { category: 'Visual', description: '4 image slots with title/description each' },
      'three-pictures': { category: 'Visual', description: '3 image slots with title/description each' },
      'two-pictures': { category: 'Visual', description: '2 image slots with title/description each' },
      'three-svgs': { category: 'Visual', description: '3 AI-generated SVG illustrations' },

      // Interactive Components
      'step-sequence': { category: 'Interactive', description: 'Numbered list for procedures (array)' },
      'worked-example': { category: 'Interactive', description: 'Problem + solution + answer structure' },

      // Display Components
      'callout-box': { category: 'Display', description: 'Highlighted box for important information' },
      'hero-number': { category: 'Display', description: 'Large centered visual element with chart data' }
    };

    // 9-step integration files
    const integrationFiles = [
      'python-services/component_schemas.py',
      'python-services/vision_processor.py',
      'frontend/public/app.js',
      'frontend/public/student-view.js',
      'frontend/public/index.html',
      'frontend/public/styles.css',
      'frontend/public/student-view.css'
    ];

    let report = `# Component Integration Status Report\n\n`;

    // If specific component requested
    if (componentType) {
      if (!expectedComponents[componentType]) {
        await responseStream.sendSystemMessage(`❌ Unknown component type: ${componentType}`);
        return;
      }

      report += await checkSpecificComponent(componentType, expectedComponents[componentType], integrationFiles, filesystem);
    } else {
      // Check all components
      report += await checkAllComponents(expectedComponents, integrationFiles, filesystem);
    }

    await responseStream.sendSystemMessage(report);
  }
};

async function checkAllComponents(expectedComponents: any, integrationFiles: string[], filesystem: any) {
  let report = `## Overview\n`;
  report += `Expected components: **${Object.keys(expectedComponents).length}**\n`;
  report += `Integration files: **${integrationFiles.length}**\n\n`;

  // Check each file for component definitions
  const componentStatus = {};

  for (const [component, info] of Object.entries(expectedComponents)) {
    componentStatus[component] = {
      info,
      files: {},
      score: 0,
      issues: []
    };
  }

  // Check each integration file
  for (const filePath of integrationFiles) {
    try {
      const content = await filesystem.readFile(filePath, 'utf8');
      const fileName = filePath.split('/').pop();

      for (const component of Object.keys(expectedComponents)) {
        const hasComponent = checkComponentInFile(content, component, fileName);
        componentStatus[component].files[fileName] = hasComponent;
        if (hasComponent) componentStatus[component].score++;
      }
    } catch (error) {
      report += `⚠️ Could not read ${filePath}: ${error.message}\n`;
    }
  }

  // Generate summary by category
  const categories = ['Text', 'Visual', 'Interactive', 'Display'];

  for (const category of categories) {
    report += `## ${category} Components\n\n`;

    const categoryComponents = Object.entries(expectedComponents)
      .filter(([_, info]: any) => info.category === category);

    for (const [component, info] of categoryComponents) {
      const status = componentStatus[component];
      const completionRate = Math.round((status.score / integrationFiles.length) * 100);
      const statusIcon = completionRate === 100 ? '✅' : completionRate > 70 ? '🟡' : '❌';

      report += `### ${statusIcon} \`${component}\` (${completionRate}%)\n`;
      report += `${info.description}\n\n`;

      // File-by-file status
      report += `**Integration status:**\n`;
      for (const [fileName, hasComponent] of Object.entries(status.files)) {
        const icon = hasComponent ? '✅' : '❌';
        report += `- ${icon} ${fileName}\n`;
      }
      report += `\n`;
    }
  }

  // Overall statistics
  const totalIntegrations = Object.keys(expectedComponents).length * integrationFiles.length;
  const completedIntegrations = Object.values(componentStatus).reduce((sum: number, status: any) => sum + status.score, 0);
  const overallCompletion = Math.round((completedIntegrations / totalIntegrations) * 100);

  report += `## Summary\n\n`;
  report += `**Overall completion**: ${overallCompletion}% (${completedIntegrations}/${totalIntegrations})\n\n`;

  // Identify missing integrations
  const missingIntegrations = [];
  for (const [component, status] of Object.entries(componentStatus)) {
    for (const [fileName, hasComponent] of Object.entries(status.files)) {
      if (!hasComponent) {
        missingIntegrations.push(`${component} → ${fileName}`);
      }
    }
  }

  if (missingIntegrations.length > 0) {
    report += `**Missing integrations** (${missingIntegrations.length}):\n`;
    for (const missing of missingIntegrations.slice(0, 10)) { // Show first 10
      report += `- ${missing}\n`;
    }
    if (missingIntegrations.length > 10) {
      report += `- ... and ${missingIntegrations.length - 10} more\n`;
    }
    report += `\n`;
  }

  return report;
}

async function checkSpecificComponent(componentType: string, info: any, integrationFiles: string[], filesystem: any) {
  let report = `## Component: \`${componentType}\`\n`;
  report += `**Category**: ${info.category}\n`;
  report += `**Description**: ${info.description}\n\n`;

  report += `### Integration Steps (9-Step Pattern)\n\n`;

  const stepDetails = [
    { step: 1, file: 'component_schemas.py', requirement: 'Schema definition with parameters and validation' },
    { step: 2, file: 'vision_processor.py', requirement: 'AI training guidelines in 590-line system prompt' },
    { step: 3, file: 'app.js', requirement: 'Editor UI in createComponentElement method' },
    { step: 4, file: 'app.js', requirement: 'Preview generation in generatePreviewHTML method' },
    { step: 5, file: 'app.js', requirement: 'Data extraction in extractComponentData method' },
    { step: 6, file: 'app.js', requirement: 'Population logic in populateComponentInputs method' },
    { step: 7, file: 'student-view.js', requirement: 'Student rendering with render method' },
    { step: 8, file: 'styles.css + student-view.css', requirement: 'CSS styling for both editor and student views' },
    { step: 9, file: 'index.html', requirement: 'UI button for drag-and-drop component panel' }
  ];

  let completedSteps = 0;

  for (const { step, file, requirement } of stepDetails) {
    try {
      let hasImplementation = false;

      if (file.includes('+')) {
        // Check multiple files for CSS
        const files = file.split(' + ');
        let cssCount = 0;
        for (const cssFile of files) {
          try {
            const content = await filesystem.readFile(`frontend/public/${cssFile}`, 'utf8');
            if (checkComponentInFile(content, componentType, cssFile)) {
              cssCount++;
            }
          } catch (error) {
            // File might not exist
          }
        }
        hasImplementation = cssCount === files.length;
      } else {
        // Check single file
        const filePath = file.includes('/') ? file :
                        file.endsWith('.py') ? `python-services/${file}` : `frontend/public/${file}`;

        try {
          const content = await filesystem.readFile(filePath, 'utf8');
          hasImplementation = checkComponentInFile(content, componentType, file);
        } catch (error) {
          // File might not exist
        }
      }

      const status = hasImplementation ? '✅' : '❌';
      if (hasImplementation) completedSteps++;

      report += `**Step ${step}** ${status} ${file}\n`;
      report += `${requirement}\n\n`;

    } catch (error) {
      report += `**Step ${step}** ❌ ${file}\n`;
      report += `${requirement}\n`;
      report += `Error: ${error.message}\n\n`;
    }
  }

  const completionRate = Math.round((completedSteps / stepDetails.length) * 100);
  report += `### Status: ${completionRate}% Complete (${completedSteps}/${stepDetails.length} steps)\n\n`;

  if (completionRate < 100) {
    report += `### Next Steps\n`;
    report += `To complete \`${componentType}\` integration, implement the missing steps above.\n`;
    report += `Follow the 9-step pattern exactly as documented in the component-integration-patterns skill.\n\n`;
  }

  return report;
}

function checkComponentInFile(content: string, componentType: string, fileName: string): boolean {
  const normalizedComponent = componentType.toLowerCase();

  switch (fileName) {
    case 'component_schemas.py':
      return content.includes(`"${componentType}"`);

    case 'vision_processor.py':
      return content.toLowerCase().includes(componentType.toLowerCase()) ||
             content.toLowerCase().includes(componentType.replace('-', ' '));

    case 'app.js':
      return content.includes(`case '${componentType}'`) ||
             content.includes(`'${componentType}'`);

    case 'student-view.js':
      return content.includes(`case '${componentType}'`) ||
             content.includes(`render${componentType.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('')}`);

    case 'index.html':
      return content.includes(`data-component-type="${componentType}"`) ||
             content.includes(`'${componentType}'`);

    case 'styles.css':
      return content.includes(`.preview-${componentType}`) ||
             content.includes(`.${componentType}`);

    case 'student-view.css':
      return content.includes(`.student-${componentType}`) ||
             content.includes(`.${componentType}`);

    default:
      return content.toLowerCase().includes(normalizedComponent);
  }
}