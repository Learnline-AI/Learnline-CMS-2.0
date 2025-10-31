import type { SlashCommandHandler } from '@anthropic/claude-code';
import { SystemHealthValidator } from '../validation/system-health-validator';
import { HealthDashboardReporter } from '../reporting/health-dashboard';

/**
 * /architecture-validate Command
 * Complete system health dashboard and architectural compliance checking
 */

interface ArchitectureValidateOptions {
  quick?: boolean;          // Quick validation vs comprehensive
  component?: string;       // Focus on specific component
  format?: 'full' | 'summary' | 'json';  // Output format
  fix?: boolean;           // Suggest fixes for detected issues
}

export const architectureValidate: SlashCommandHandler = {
  name: 'architecture-validate',
  description: 'Complete system health dashboard and architectural compliance checking',

  async run({ args, responseStream }) {
    // Parse command arguments
    const options = parseValidateOptions(args);

    // Initialize validators and reporters
    const healthValidator = new SystemHealthValidator();
    const dashboardReporter = new HealthDashboardReporter();

    try {
      // Send initial status
      await responseStream.sendSystemMessage('🏥 **Architecture Validation Started**\n\nAnalyzing system health across all components...');

      // Perform system health validation
      const healthResult = await healthValidator.validateSystemHealth();

      // Generate appropriate report based on options
      let report: string;

      if (options.component) {
        // Focus report on specific component
        const component = healthResult.components.find(c =>
          c.name.toLowerCase().includes(options.component!.toLowerCase())
        );

        if (!component) {
          report = `❌ **Component not found**: ${options.component}\n\n**Available components**:\n` +
                  healthResult.components.map(c => `- ${c.name}`).join('\n');
        } else {
          report = dashboardReporter.generateComponentFocusReport(component);
        }
      } else if (options.format === 'summary') {
        // Quick summary report
        report = dashboardReporter.generateQuickSummary(healthResult);
      } else if (options.format === 'json') {
        // JSON output for programmatic use
        report = `\`\`\`json\n${JSON.stringify(healthResult, null, 2)}\n\`\`\``;
      } else {
        // Full comprehensive report
        report = dashboardReporter.generateHealthReport(healthResult);
      }

      // Add fix suggestions if requested
      if (options.fix && healthResult.criticalIssues.length > 0) {
        report += await generateFixSuggestions(healthResult);
      }

      // Send the report
      await responseStream.sendSystemMessage(report);

      // Send follow-up recommendations based on health status
      await sendFollowUpRecommendations(healthResult, responseStream, options);

      return {
        success: true,
        healthScore: healthResult.score,
        overallStatus: healthResult.overall,
        criticalIssues: healthResult.criticalIssues.length,
        warnings: healthResult.warnings.length
      };

    } catch (error) {
      const errorMessage = `❌ **Architecture validation failed**\n\n` +
                          `Error: ${error instanceof Error ? error.message : 'Unknown error'}\n\n` +
                          `This may indicate a serious system issue. Please check:\n` +
                          `- Database connectivity\n` +
                          `- File system access\n` +
                          `- Component schema availability\n` +
                          `- API endpoint functionality`;

      await responseStream.sendSystemMessage(errorMessage);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
};

function parseValidateOptions(args: string[]): ArchitectureValidateOptions {
  const options: ArchitectureValidateOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--quick':
      case '-q':
        options.quick = true;
        break;

      case '--component':
      case '-c':
        if (i + 1 < args.length) {
          options.component = args[i + 1];
          i++; // Skip next argument
        }
        break;

      case '--format':
      case '-f':
        if (i + 1 < args.length) {
          const format = args[i + 1];
          if (['full', 'summary', 'json'].includes(format)) {
            options.format = format as 'full' | 'summary' | 'json';
          }
          i++; // Skip next argument
        }
        break;

      case '--fix':
        options.fix = true;
        break;
    }
  }

  // Set defaults
  if (!options.format) {
    options.format = options.quick ? 'summary' : 'full';
  }

  return options;
}

async function generateFixSuggestions(healthResult: any): Promise<string> {
  let suggestions = `\n## 🛠️ Automated Fix Suggestions\n\n`;

  // Component Integration Fixes
  const componentIssues = healthResult.components.find(c =>
    c.name.includes('Component Integration') && c.status !== 'healthy'
  );

  if (componentIssues) {
    suggestions += `### Component Integration Fixes\n\n`;

    if (componentIssues.issues.some(issue => issue.includes('populateComponentInputs'))) {
      suggestions += `**Fix Empty AI Components**:\n`;
      suggestions += `\`\`\`javascript\n`;
      suggestions += `// In app.js populateComponentInputs function\n`;
      suggestions += `case 'your-component':\n`;
      suggestions += `    if (data.text) {\n`;
      suggestions += `        const input = componentElement.querySelector('.component-input');\n`;
      suggestions += `        if (input) input.innerHTML = data.text; // CRITICAL: Don't leave empty\n`;
      suggestions += `    }\n`;
      suggestions += `    break;\n`;
      suggestions += `\`\`\`\n\n`;
    }

    if (componentIssues.issues.some(issue => issue.includes('CSS'))) {
      suggestions += `**Fix CSS Styling Issues**:\n`;
      suggestions += `- Add styles to both \`styles.css\` and \`student-view.css\`\n`;
      suggestions += `- Use consistent class naming: \`.preview-component\` and \`.student-component\`\n`;
      suggestions += `- Include responsive breakpoints\n\n`;
    }
  }

  // Session Management Fixes
  const sessionIssues = healthResult.components.find(c =>
    c.name.includes('Session Management') && c.status !== 'healthy'
  );

  if (sessionIssues) {
    suggestions += `### Session Management Fixes\n\n`;

    if (sessionIssues.issues.some(issue => issue.includes('transaction'))) {
      suggestions += `**Fix Transaction Safety**:\n`;
      suggestions += `\`\`\`python\n`;
      suggestions += `async def multi_operation_function(self):\n`;
      suggestions += `    async with self.transaction_context() as session:\n`;
      suggestions += `        # All operations here are atomic\n`;
      suggestions += `        await session.execute(first_operation)\n`;
      suggestions += `        await session.execute(second_operation)\n`;
      suggestions += `        # Auto-commit on success, auto-rollback on error\n`;
      suggestions += `\`\`\`\n\n`;
    }

    if (sessionIssues.issues.some(issue => issue.includes('permanent'))) {
      suggestions += `**Fix Session Expiry**:\n`;
      suggestions += `- Update session creation to use 100-year expiry\n`;
      suggestions += `- Disable session cleanup with WHERE 1=0 condition\n`;
      suggestions += `- Ensure sessions are truly permanent\n\n`;
    }
  }

  // Knowledge Graph Fixes
  const graphIssues = healthResult.components.find(c =>
    c.name.includes('Knowledge Graph') && c.status !== 'healthy'
  );

  if (graphIssues) {
    suggestions += `### Knowledge Graph Fixes\n\n`;

    if (graphIssues.issues.some(issue => issue.includes('CSV'))) {
      suggestions += `**Fix CSV Import Issues**:\n`;
      suggestions += `- Validate CSV file structure before import\n`;
      suggestions += `- Use transaction context for bulk operations\n`;
      suggestions += `- Implement proper error handling and rollback\n\n`;
    }

    if (graphIssues.issues.some(issue => issue.includes('orphaned'))) {
      suggestions += `**Fix Orphaned Nodes**:\n`;
      suggestions += `- Run relationship integrity check\n`;
      suggestions += `- Rebuild missing relationships from CSV data\n`;
      suggestions += `- Validate visual network consistency\n\n`;
    }
  }

  // Vision AI Fixes
  const aiIssues = healthResult.components.find(c =>
    c.name.includes('Vision AI') && c.status !== 'healthy'
  );

  if (aiIssues) {
    suggestions += `### Vision AI Fixes\n\n`;

    if (aiIssues.issues.some(issue => issue.includes('prompt'))) {
      suggestions += `**Fix System Prompt Issues**:\n`;
      suggestions += `- Verify 590-line prompt structure in vision_processor.py\n`;
      suggestions += `- Ensure all component types are covered\n`;
      suggestions += `- Validate educational guidelines section\n\n`;
    }

    if (aiIssues.issues.some(issue => issue.includes('extraction'))) {
      suggestions += `**Fix Component Extraction**:\n`;
      suggestions += `- Test with sample PDFs for each component type\n`;
      suggestions += `- Verify parameter extraction accuracy\n`;
      suggestions += `- Check retry logic functionality\n\n`;
    }
  }

  suggestions += `### General Recommendations\n\n`;
  suggestions += `1. **Run targeted validation**: Use \`/architecture-validate --component <name>\` for specific issues\n`;
  suggestions += `2. **Test after fixes**: Re-run validation to confirm fixes work\n`;
  suggestions += `3. **Monitor regularly**: Include validation in deployment pipeline\n`;
  suggestions += `4. **Document changes**: Update system documentation for any architectural changes\n\n`;

  return suggestions;
}

async function sendFollowUpRecommendations(healthResult: any, responseStream: any, options: ArchitectureValidateOptions): Promise<void> {
  let followUp = '';

  // Critical issues follow-up
  if (healthResult.criticalIssues.length > 0) {
    followUp += `🚨 **Immediate Action Required**\n\n`;
    followUp += `${healthResult.criticalIssues.length} critical issues detected. System may be unstable.\n\n`;
    followUp += `**Recommended next steps**:\n`;
    followUp += `1. Stop non-essential development work\n`;
    followUp += `2. Address critical issues immediately\n`;
    followUp += `3. Run \`/architecture-validate --fix\` for automated suggestions\n`;
    followUp += `4. Re-validate after fixes\n\n`;
  }

  // Warning-level follow-up
  else if (healthResult.warnings.length > 0) {
    followUp += `⚠️ **Attention Recommended**\n\n`;
    followUp += `${healthResult.warnings.length} warnings detected. Plan resolution soon.\n\n`;
    followUp += `**Recommended next steps**:\n`;
    followUp += `1. Review warning details\n`;
    followUp += `2. Plan fixes in next development cycle\n`;
    followUp += `3. Monitor for any degradation\n\n`;
  }

  // Healthy system follow-up
  else {
    followUp += `✅ **System Healthy**\n\n`;
    followUp += `All components functioning optimally!\n\n`;
    followUp += `**Recommended maintenance**:\n`;
    followUp += `1. Continue regular validation\n`;
    followUp += `2. Monitor performance metrics\n`;
    followUp += `3. Update validation baselines as system evolves\n\n`;
  }

  // Related commands
  followUp += `**Related commands**:\n`;
  followUp += `- \`/curriculum-align\`: Validate educational standards\n`;
  followUp += `- \`/graph-health\`: Check knowledge graph integrity\n`;
  followUp += `- \`/vision-ai-test\`: Test PDF processing pipeline\n`;

  if (followUp) {
    await responseStream.sendSystemMessage(followUp);
  }
}

// Command usage examples and help
export const architectureValidateHelp = {
  usage: '/architecture-validate [options]',
  description: 'Comprehensive system health dashboard and architectural compliance checking',
  examples: [
    {
      command: '/architecture-validate',
      description: 'Full system health analysis with comprehensive report'
    },
    {
      command: '/architecture-validate --quick',
      description: 'Quick health check with summary report'
    },
    {
      command: '/architecture-validate --component "Component Integration"',
      description: 'Focus analysis on specific component'
    },
    {
      command: '/architecture-validate --format summary',
      description: 'Generate summary report only'
    },
    {
      command: '/architecture-validate --fix',
      description: 'Include automated fix suggestions for detected issues'
    },
    {
      command: '/architecture-validate --format json',
      description: 'Output results in JSON format for programmatic use'
    }
  ],
  options: [
    { flag: '--quick, -q', description: 'Perform quick validation instead of comprehensive analysis' },
    { flag: '--component, -c <name>', description: 'Focus validation on specific component (e.g., "Session Management")' },
    { flag: '--format, -f <type>', description: 'Output format: full, summary, or json (default: full)' },
    { flag: '--fix', description: 'Include automated fix suggestions for detected issues' }
  ]
};