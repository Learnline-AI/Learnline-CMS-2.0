import type { UserPromptSubmitHook } from '@anthropic/claude-code';

/**
 * Auto-activates relevant skills based on user prompt content
 * Prevents context loss by ensuring domain expertise is available
 */
export const skillActivation: UserPromptSubmitHook = {
  name: 'LearnLine AI Skill Activation',

  async run({ prompt, responseStream }) {
    // Skill activation patterns based on LearnLine CMS codebase
    const skillTriggers = {
      'component-integration-patterns': [
        'component', 'add component', 'new component', 'drag', 'drop',
        'createComponentElement', 'extractComponentData', 'populateComponentInputs',
        'generatePreviewHTML', 'schema', 'validation', 'parameter',
        // 11 component types
        'heading', 'paragraph', 'definition', 'memory-trick',
        'four-pictures', 'three-pictures', 'two-pictures', 'three-svgs',
        'step-sequence', 'worked-example', 'callout-box', 'hero-number'
      ],

      'csv-knowledge-graph': [
        'csv', 'CSV', 'import', 'knowledge graph', 'node', 'relationship',
        'LEADS_TO', 'PREREQUISITE', 'visual network', 'graph', 'Neo4j',
        'N001', 'N002', 'N003', 'S001', 'E001', // Node ID patterns
        'importCsv', 'processCsvFiles', 'createSessionNodes',
        'node-export', 'relationship-export'
      ],

      'session-persistence': [
        'session', 'auto-save', 'save', 'persistence', 'transaction',
        'database', 'SQLite', '36-hour', 'expiry', 'expires', 'recovery',
        'scheduleAutoSave', 'sessionId', 'validate_session',
        'transaction_context', 'commit', 'rollback'
      ],

      'vision-ai-pipeline': [
        'vision', 'AI', 'PDF', 'upload', 'processing', 'OpenAI', 'GPT-4O',
        'vision_processor', 'analyze_pdf', 'component extraction',
        '590-line prompt', 'retry', 'timeout', 'quality degradation',
        'batch processing', 'memory management'
      ]
    };

    // Check for architectural boundary crossings
    const architecturalBoundaries = {
      frontend: ['app.js', 'student-view.js', 'index.html', 'styles.css'],
      backend: ['main.py', 'vision_processor.py', 'database.py', 'component_schemas.py'],
      database: ['SQLite', 'session_relationships', 'node_components'],
      csvData: ['node-export.csv', 'relationship-export.csv']
    };

    const activatedSkills: string[] = [];
    const warnings: string[] = [];

    // Detect skill activation triggers
    const lowerPrompt = prompt.toLowerCase();

    for (const [skillName, triggers] of Object.entries(skillTriggers)) {
      const matchedTriggers = triggers.filter(trigger =>
        lowerPrompt.includes(trigger.toLowerCase())
      );

      if (matchedTriggers.length > 0) {
        activatedSkills.push(skillName);
      }
    }

    // Check for cross-boundary operations
    const mentionedBoundaries = Object.keys(architecturalBoundaries).filter(boundary =>
      architecturalBoundaries[boundary].some(item =>
        lowerPrompt.includes(item.toLowerCase())
      )
    );

    if (mentionedBoundaries.length > 1) {
      warnings.push(`🔄 Multi-boundary operation detected: ${mentionedBoundaries.join(' + ')}`);
    }

    // Educational domain detection
    const educationalTriggers = [
      'math', 'mathematics', 'fractions', 'education', 'student', 'learning',
      'NCERT', 'curriculum', 'pedagogy', 'K-12'
    ];

    const hasEducationalContext = educationalTriggers.some(trigger =>
      lowerPrompt.includes(trigger.toLowerCase())
    );

    // Component integration completeness check
    if (activatedSkills.includes('component-integration-patterns')) {
      const integrationSteps = [
        'schema', 'AI training', 'editor UI', 'preview', 'extraction',
        'population', 'student view', 'CSS', 'UI button'
      ];

      const mentionedSteps = integrationSteps.filter(step =>
        lowerPrompt.includes(step.toLowerCase())
      );

      if (mentionedSteps.length > 0 && mentionedSteps.length < 9) {
        warnings.push(`📋 Component integration: Remember all 9 steps (mentioned: ${mentionedSteps.length}/9)`);
      }
    }

    // CSV import workflow check
    if (activatedSkills.includes('csv-knowledge-graph')) {
      const csvSteps = ['parse', 'session nodes', 'relationships', 'visual network'];
      const mentionedCsvSteps = csvSteps.filter(step =>
        lowerPrompt.includes(step.toLowerCase())
      );

      if (mentionedCsvSteps.length > 0 && mentionedCsvSteps.length < 4) {
        warnings.push(`📊 CSV import: Complete workflow is Parse → Session nodes → Relationships → Visual network`);
      }
    }

    // Transaction safety reminder
    if (activatedSkills.includes('session-persistence') &&
        (lowerPrompt.includes('multiple') || lowerPrompt.includes('batch') || lowerPrompt.includes('create'))) {
      warnings.push(`🔒 Multi-operation sequence detected: Use transaction_context() for atomicity`);
    }

    // Vision AI prompt consistency check
    if (activatedSkills.includes('vision-ai-pipeline') &&
        (lowerPrompt.includes('prompt') || lowerPrompt.includes('system') || lowerPrompt.includes('guideline'))) {
      warnings.push(`🎯 Vision AI: Maintain 590-line system prompt structure for consistency`);
    }

    // Template recommendation logic
    const recommendedTemplates: string[] = [];

    // Single skill template recommendations
    if (activatedSkills.includes('component-integration-patterns')) {
      recommendedTemplates.push('component-integration-template.md');
    }
    if (activatedSkills.includes('csv-knowledge-graph')) {
      recommendedTemplates.push('csv-import-feature-template.md');
    }
    if (activatedSkills.includes('vision-ai-pipeline')) {
      recommendedTemplates.push('vision-ai-improvement-template.md');
    }
    if (activatedSkills.includes('session-persistence') &&
        (lowerPrompt.includes('feature') || lowerPrompt.includes('endpoint'))) {
      recommendedTemplates.push('session-feature-template.md');
    }

    // Educational context + multi-skill = umbrella template
    if (hasEducationalContext && (activatedSkills.length > 1 || mentionedBoundaries.length > 1)) {
      recommendedTemplates.unshift('educational-feature-template.md'); // Add to front
    }

    // API endpoint detection
    if (lowerPrompt.includes('endpoint') || lowerPrompt.includes('api') || lowerPrompt.includes('route')) {
      recommendedTemplates.push('api-endpoint-template.md');
    }

    // Command recommendation logic
    const recommendedCommands: string[] = [];

    // Health check and validation commands
    if (lowerPrompt.includes('validate') || lowerPrompt.includes('health') ||
        lowerPrompt.includes('check') || lowerPrompt.includes('debug') ||
        lowerPrompt.includes('issue') || lowerPrompt.includes('problem')) {

      // Educational content validation
      if (hasEducationalContext ||
          lowerPrompt.includes('curriculum') || lowerPrompt.includes('ncert') ||
          lowerPrompt.includes('educational') || lowerPrompt.includes('math')) {
        recommendedCommands.push('/curriculum-align');
      }

      // Knowledge graph health
      if (activatedSkills.includes('csv-knowledge-graph') ||
          lowerPrompt.includes('graph') || lowerPrompt.includes('csv') ||
          lowerPrompt.includes('relationship') || lowerPrompt.includes('node')) {
        recommendedCommands.push('/graph-health');
      }

      // System-wide architecture validation
      if (mentionedBoundaries.length > 1 || activatedSkills.length > 1 ||
          lowerPrompt.includes('system') || lowerPrompt.includes('architecture') ||
          lowerPrompt.includes('integration')) {
        recommendedCommands.push('/architecture-validate');
      }
    }

    // Proactive command suggestions for specific scenarios
    if (activatedSkills.includes('component-integration-patterns') &&
        (lowerPrompt.includes('new component') || lowerPrompt.includes('add component'))) {
      recommendedCommands.push('/architecture-validate --component "Component Integration"');
    }

    if (activatedSkills.includes('csv-knowledge-graph') &&
        (lowerPrompt.includes('import') || lowerPrompt.includes('upload'))) {
      recommendedCommands.push('/graph-health --format summary');
    }

    // Agent recommendation logic
    const recommendedAgents: string[] = [];

    // Educational content expertise
    if (hasEducationalContext) {
      recommendedAgents.push('educational-content-specialist');
    }

    // Component integration debugging
    if (activatedSkills.includes('component-integration-patterns') &&
        (lowerPrompt.includes('empty') || lowerPrompt.includes('missing') ||
         lowerPrompt.includes('not working') || lowerPrompt.includes('broken'))) {
      recommendedAgents.push('component-integration-specialist');
    }

    // Session recovery scenarios
    if (activatedSkills.includes('session-persistence') &&
        (lowerPrompt.includes('lost') || lowerPrompt.includes('recover') ||
         lowerPrompt.includes('corrupt') || lowerPrompt.includes('failed'))) {
      recommendedAgents.push('session-recovery-specialist');
    }

    // Multi-agent coordination for complex tasks
    if (activatedSkills.length > 2 || mentionedBoundaries.length > 2) {
      recommendedAgents.push('agent-coordinator');
    }

    // Build activation message
    let message = '';

    if (activatedSkills.length > 0) {
      message += `🎯 **Auto-activated skills**: ${activatedSkills.join(', ')}\n\n`;

      if (hasEducationalContext) {
        message += `📚 Educational domain context detected\n\n`;
      }

      // Template recommendations
      if (recommendedTemplates.length > 0) {
        message += `📋 **Recommended templates**: \n`;
        recommendedTemplates.forEach(template => {
          message += `- \`dev-docs/templates/${template}\`\n`;
        });
        message += `\n`;
      }

      // Command recommendations
      if (recommendedCommands.length > 0) {
        message += `⚡ **Recommended commands**: \n`;
        recommendedCommands.forEach(command => {
          message += `- \`${command}\`\n`;
        });
        message += `\n`;
      }

      // Agent recommendations
      if (recommendedAgents.length > 0) {
        message += `🤖 **Available specialists**: \n`;
        recommendedAgents.forEach(agent => {
          message += `- \`agents/${agent}.ts\`\n`;
        });
        message += `\n`;
      }

      if (warnings.length > 0) {
        message += `⚠️ **Important reminders**:\n${warnings.map(w => `- ${w}`).join('\n')}\n\n`;
      }

      // Skill-specific guidance
      if (activatedSkills.includes('component-integration-patterns')) {
        message += `📋 **Component Integration**: Follow 9-step pattern exactly, validate each step\n`;
      }

      if (activatedSkills.includes('csv-knowledge-graph')) {
        message += `📊 **CSV Import**: CSV → Session nodes → Relationships → Visual network update\n`;
      }

      if (activatedSkills.includes('session-persistence')) {
        message += `💾 **Persistence**: Sessions are permanent (100yr expiry), use transaction_context()\n`;
      }

      if (activatedSkills.includes('vision-ai-pipeline')) {
        message += `🔍 **Vision AI**: OpenAI GPT-4O with 590-line prompt, 4 retry attempts, progressive quality degradation\n`;
      }

      message += `\n---\n\n`;
    }

    // Send skill activation info to Claude
    if (message) {
      await responseStream.sendSystemMessage(`${message}Processing your request with activated skills...`);
    }

    return {
      shouldContinue: true,
      data: {
        activatedSkills,
        warnings,
        hasEducationalContext,
        crossBoundaryOperation: mentionedBoundaries.length > 1,
        recommendedTemplates,
        recommendedCommands,
        recommendedAgents,
        mentionedBoundaries
      }
    };
  }
};