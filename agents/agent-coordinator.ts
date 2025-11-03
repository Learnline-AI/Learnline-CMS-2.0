import type { UserPromptSubmitHook } from '@anthropic/claude-code';

/**
 * Agent Coordinator
 * Smart activation logic for specialized agents, context management, and multi-agent coordination
 */

interface AgentContext {
  prompt: string;
  activatedSkills: string[];
  recommendedTemplates: string[];
  hookValidationData: any[];
  educationalContext?: any;
  crossBoundaryOperation?: boolean;
  errorPatterns: string[];
  systemState: string;
}

interface AgentActivation {
  agentType: string;
  priority: number;
  reason: string;
  context: any;
}

// Agent activation rules and priority system
const AGENT_ACTIVATION_RULES = {
  'educational-content-specialist': {
    triggers: [
      'math', 'mathematics', 'student', 'curriculum', 'grade', 'NCERT',
      'learning', 'educational', 'pedagogy', 'age-appropriate', 'lesson',
      'class-6', 'class-7', 'class-8', 'class-9', 'class-10',
      'fractions', 'algebra', 'geometry', 'assessment'
    ],
    priority: 100, // Highest priority for educational domain
    activation_conditions: {
      educational_context: true,
      component_work: 'optional',
      multi_boundary: 'preferred'
    },
    coordination_role: 'primary' // Leads educational features
  },

  'component-integration-specialist': {
    triggers: [
      'component', 'add component', 'new component', 'create component',
      'integration', 'populateComponentInputs', 'createComponentElement',
      'extractComponentData', 'generatePreviewHTML', 'empty component',
      'AI component', 'vision AI', 'component extraction', '9-step'
    ],
    priority: 90,
    activation_conditions: {
      component_work: true,
      integration_file: 'preferred',
      error_pattern: 'component_related'
    },
    coordination_role: 'specialist' // Supports educational with technical expertise
  },

  'session-recovery-specialist': {
    triggers: [
      'session', 'auto-save', 'save', 'persistence', 'transaction',
      'database', 'SQLite', 'recovery', 'state', 'lost', 'corruption',
      'scheduleAutoSave', 'sessionId', 'validate_session', 'create_session',
      'transaction_context', 'atomic', 'rollback'
    ],
    priority: 95, // High priority for system stability
    activation_conditions: {
      session_work: true,
      error_pattern: 'session_related',
      multi_operation: 'preferred'
    },
    coordination_role: 'foundation' // Provides stability foundation
  },

  'csv-graph-specialist': {
    triggers: [
      'csv', 'CSV', 'import', 'knowledge graph', 'node', 'relationship',
      'LEADS_TO', 'PREREQUISITE', 'visual network', 'graph',
      'N001', 'N002', 'S001', 'E001', 'importCsv', 'processCsvFiles'
    ],
    priority: 85,
    activation_conditions: {
      csv_work: true,
      graph_operation: true
    },
    coordination_role: 'specialist'
  },

  'vision-ai-specialist': {
    triggers: [
      'vision', 'AI', 'PDF', 'upload', 'processing', 'OpenAI', 'GPT-4O',
      'vision_processor', 'analyze_pdf', 'component extraction',
      '590-line prompt', 'retry', 'timeout', 'quality degradation'
    ],
    priority: 80,
    activation_conditions: {
      ai_work: true,
      pdf_processing: true
    },
    coordination_role: 'specialist'
  },

  'architecture-compliance-specialist': {
    triggers: [
      'architecture', 'compliance', 'validation', 'performance',
      'optimization', 'bottleneck', 'system health', 'integration',
      'cross-boundary', 'pattern consistency', 'no breaking', 'do not break anything'
    ],
    priority: 70,
    activation_conditions: {
      architecture_work: true,
      performance_issue: true,
      multi_boundary: true
    },
    coordination_role: 'oversight' // Monitors overall system health
  }
};

// Error pattern recognition for agent activation
const ERROR_PATTERNS = {
  component_related: [
    'empty component', 'populateComponentInputs', 'component not working',
    'AI component empty', 'integration failure', 'CSS styling issue'
  ],
  session_related: [
    'session not found', 'auto-save failed', 'transaction error',
    'data corruption', 'state lost', 'persistence issue'
  ],
  csv_graph_related: [
    'CSV import failed', 'graph inconsistency', 'relationship error',
    'visual network broken', 'import corruption'
  ],
  vision_ai_related: [
    'PDF processing failed', 'extraction error', 'vision timeout',
    'prompt issue', 'quality degradation'
  ],
  architecture_related: [
    'performance degradation', 'system bottleneck', 'integration issue',
    'cross-boundary problem', 'architectural drift'
  ]
};

// Multi-agent coordination patterns
const COORDINATION_PATTERNS = {
  'educational-feature-development': {
    primary: 'educational-content-specialist',
    supporting: ['component-integration-specialist', 'session-recovery-specialist'],
    triggers: ['educational context + component work + session operations'],
    coordination: 'Educational specialist leads, others provide technical support'
  },

  'component-integration-with-ai': {
    primary: 'component-integration-specialist',
    supporting: ['vision-ai-specialist', 'educational-content-specialist'],
    triggers: ['component work + AI extraction + educational validation'],
    coordination: 'Component specialist leads integration, AI specialist optimizes extraction'
  },

  'csv-knowledge-graph-import': {
    primary: 'csv-graph-specialist',
    supporting: ['session-recovery-specialist', 'educational-content-specialist'],
    triggers: ['CSV import + transaction safety + educational graph'],
    coordination: 'CSV specialist leads import, session specialist ensures atomicity'
  },

  'system-wide-optimization': {
    primary: 'architecture-compliance-specialist',
    supporting: ['all-specialists'],
    triggers: ['performance issues + cross-boundary operations'],
    coordination: 'Architecture specialist coordinates system-wide improvements'
  }
};

export const agentCoordinator: UserPromptSubmitHook = {
  name: 'Agent Coordinator',

  async run({ prompt, responseStream }) {
    // Build agent context from available information
    const agentContext = await buildAgentContext(prompt);

    // Determine which agents should activate
    const agentActivations = determineAgentActivations(agentContext);

    if (agentActivations.length === 0) {
      return { shouldContinue: true };
    }

    // Sort agents by priority and coordination role
    const sortedActivations = prioritizeAgentActivations(agentActivations);

    // Determine coordination pattern if multiple agents
    const coordinationPattern = determineCoordinationPattern(sortedActivations, agentContext);

    // Send agent coordination message
    let message = '🤖 **Agent Coordination System**\n\n';

    if (sortedActivations.length === 1) {
      const activation = sortedActivations[0];
      message += `🎯 **Single Agent Activation**: ${activation.agentType}\n`;
      message += `**Reason**: ${activation.reason}\n\n`;
    } else {
      message += `🔄 **Multi-Agent Coordination**: ${sortedActivations.length} agents\n\n`;

      if (coordinationPattern) {
        message += `**Pattern**: ${coordinationPattern.pattern}\n`;
        message += `**Primary Agent**: ${coordinationPattern.primary}\n`;
        message += `**Supporting Agents**: ${coordinationPattern.supporting.join(', ')}\n`;
        message += `**Coordination**: ${coordinationPattern.coordination}\n\n`;
      }

      message += '**Agent Priorities**:\n';
      sortedActivations.forEach((activation, index) => {
        const role = AGENT_ACTIVATION_RULES[activation.agentType]?.coordination_role || 'specialist';
        message += `${index + 1}. **${activation.agentType}** (${role}) - ${activation.reason}\n`;
      });
      message += '\n';
    }

    // Provide context sharing information
    message += '**Shared Context**:\n';
    if (agentContext.educationalContext) {
      message += '📚 Educational domain context available\n';
    }
    if (agentContext.crossBoundaryOperation) {
      message += '🔄 Cross-boundary operation detected\n';
    }
    if (agentContext.errorPatterns.length > 0) {
      message += `⚠️ Error patterns: ${agentContext.errorPatterns.join(', ')}\n`;
    }
    if (agentContext.activatedSkills.length > 0) {
      message += `🎯 Activated skills: ${agentContext.activatedSkills.join(', ')}\n`;
    }
    message += '\n';

    // Provide coordination guidance
    message += await provideCoordinationGuidance(coordinationPattern, sortedActivations);

    await responseStream.sendSystemMessage(message);

    return {
      shouldContinue: true,
      data: {
        agentActivations: sortedActivations,
        coordinationPattern,
        agentContext,
        activationType: 'agent-coordinator'
      }
    };
  }
};

async function buildAgentContext(prompt: string): Promise<AgentContext> {
  const context: AgentContext = {
    prompt,
    activatedSkills: [], // Would be populated from skill activation hook
    recommendedTemplates: [], // Would be populated from template recommendation
    hookValidationData: [], // Would be populated from validation hooks
    errorPatterns: [],
    systemState: 'normal'
  };

  // Detect error patterns
  for (const [category, patterns] of Object.entries(ERROR_PATTERNS)) {
    const hasPattern = patterns.some(pattern =>
      prompt.toLowerCase().includes(pattern.toLowerCase())
    );
    if (hasPattern) {
      context.errorPatterns.push(category);
    }
  }

  // Detect educational context
  const educationalTriggers = [
    'math', 'educational', 'student', 'curriculum', 'NCERT', 'grade'
  ];
  context.educationalContext = educationalTriggers.some(trigger =>
    prompt.toLowerCase().includes(trigger.toLowerCase())
  );

  // Detect cross-boundary operations
  const boundaryTriggers = [
    'frontend', 'backend', 'database', 'component', 'session', 'CSV'
  ];
  const mentionedBoundaries = boundaryTriggers.filter(boundary =>
    prompt.toLowerCase().includes(boundary.toLowerCase())
  );
  context.crossBoundaryOperation = mentionedBoundaries.length > 1;

  return context;
}

function determineAgentActivations(context: AgentContext): AgentActivation[] {
  const activations: AgentActivation[] = [];

  for (const [agentType, rules] of Object.entries(AGENT_ACTIVATION_RULES)) {
    const shouldActivate = evaluateActivationConditions(agentType, rules, context);

    if (shouldActivate.activate) {
      activations.push({
        agentType,
        priority: rules.priority + shouldActivate.priorityBonus,
        reason: shouldActivate.reason,
        context: shouldActivate.context
      });
    }
  }

  return activations;
}

function evaluateActivationConditions(agentType: string, rules: any, context: AgentContext): any {
  const result = {
    activate: false,
    reason: '',
    priorityBonus: 0,
    context: {}
  };

  // Check trigger words
  const triggerMatch = rules.triggers.some((trigger: string) =>
    context.prompt.toLowerCase().includes(trigger.toLowerCase())
  );

  if (!triggerMatch) {
    return result;
  }

  result.activate = true;
  result.reason = `Triggered by relevant keywords`;

  // Apply specific activation conditions
  const conditions = rules.activation_conditions;

  if (conditions.educational_context && context.educationalContext) {
    result.priorityBonus += 10;
    result.reason += ', educational context detected';
  }

  if (conditions.error_pattern) {
    const hasRelevantError = context.errorPatterns.some(pattern =>
      pattern.includes(conditions.error_pattern.replace('_related', ''))
    );
    if (hasRelevantError) {
      result.priorityBonus += 15;
      result.reason += ', relevant error pattern detected';
    }
  }

  if (conditions.multi_boundary === 'preferred' && context.crossBoundaryOperation) {
    result.priorityBonus += 5;
    result.reason += ', cross-boundary operation';
  }

  return result;
}

function prioritizeAgentActivations(activations: AgentActivation[]): AgentActivation[] {
  return activations.sort((a, b) => {
    // Sort by priority (higher first)
    if (a.priority !== b.priority) {
      return b.priority - a.priority;
    }

    // If same priority, prioritize by coordination role
    const roleOrder = { 'primary': 4, 'foundation': 3, 'oversight': 2, 'specialist': 1 };
    const aRole = AGENT_ACTIVATION_RULES[a.agentType]?.coordination_role || 'specialist';
    const bRole = AGENT_ACTIVATION_RULES[b.agentType]?.coordination_role || 'specialist';

    return (roleOrder[bRole] || 1) - (roleOrder[aRole] || 1);
  });
}

function determineCoordinationPattern(activations: AgentActivation[], context: AgentContext): any {
  if (activations.length < 2) {
    return null;
  }

  // Find matching coordination pattern
  for (const [patternName, pattern] of Object.entries(COORDINATION_PATTERNS)) {
    const primaryAgent = activations.find(a => a.agentType === pattern.primary);
    const supportingAgents = activations.filter(a =>
      pattern.supporting.includes(a.agentType)
    );

    if (primaryAgent && supportingAgents.length > 0) {
      return {
        pattern: patternName,
        primary: pattern.primary,
        supporting: supportingAgents.map(a => a.agentType),
        coordination: pattern.coordination
      };
    }
  }

  // Default coordination for unmatched patterns
  return {
    pattern: 'custom-coordination',
    primary: activations[0].agentType,
    supporting: activations.slice(1).map(a => a.agentType),
    coordination: 'Highest priority agent leads, others provide supporting expertise'
  };
}

async function provideCoordinationGuidance(coordinationPattern: any, activations: AgentActivation[]): Promise<string> {
  let guidance = '🎭 **Agent Coordination Guidance**:\n\n';

  if (!coordinationPattern) {
    return '';
  }

  if (coordinationPattern.pattern === 'educational-feature-development') {
    guidance += '**Educational Feature Development Pattern**:\n';
    guidance += '1. Educational specialist provides domain expertise and requirements\n';
    guidance += '2. Component specialist handles technical integration\n';
    guidance += '3. Session specialist ensures data persistence and atomicity\n';
    guidance += '4. All agents coordinate on NCERT alignment and educational quality\n\n';
  }

  if (coordinationPattern.pattern === 'component-integration-with-ai') {
    guidance += '**Component + AI Integration Pattern**:\n';
    guidance += '1. Component specialist leads 9-step integration process\n';
    guidance += '2. Vision AI specialist optimizes PDF extraction accuracy\n';
    guidance += '3. Educational specialist validates educational appropriateness\n';
    guidance += '4. Focus on Step 6 (populateComponentInputs) to prevent empty components\n\n';
  }

  guidance += '**Coordination Best Practices**:\n';
  guidance += '- Primary agent provides initial assessment and guidance\n';
  guidance += '- Supporting agents contribute specialized expertise\n';
  guidance += '- Educational context always prioritized when present\n';
  guidance += '- Error patterns trigger immediate specialist response\n';
  guidance += '- System stability (session specialist) never compromised\n\n';

  return guidance;
}