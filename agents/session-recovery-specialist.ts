import type { UserPromptSubmitHook } from '@anthropic/claude-code';

/**
 * Session Recovery Specialist Agent
 * Transaction safety expertise, persistence troubleshooting, state recovery guidance
 */

// Session Architecture Knowledge Base
const SESSION_ARCHITECTURE = {
  sessionLifecycle: {
    creation: {
      pattern: 'DatabaseManager.create_session()',
      expiry: '100 years (permanent)',
      defaultNodes: ['N001', 'N002'],
      atomicity: 'Transaction context required for session + nodes'
    },
    validation: {
      pattern: 'DatabaseManager.validate_session()',
      updates: 'last_accessed timestamp',
      atomicity: 'Validation + access update in single transaction'
    },
    persistence: {
      storage: 'SQLite with session_id scoping',
      cleanup: 'Disabled (WHERE 1=0)',
      recovery: 'Automatic on page reload'
    }
  },

  transactionPatterns: {
    'simple-operation': {
      pattern: 'Single database call',
      transaction: 'Not required',
      example: 'Single SELECT or simple INSERT'
    },
    'multi-operation': {
      pattern: 'Multiple related database operations',
      transaction: 'Required - use transaction_context()',
      examples: [
        'Session creation + default nodes',
        'CSV import (nodes + relationships)',
        'Component sequence update + save',
        'Bulk relationship creation'
      ]
    },
    'csv-import': {
      pattern: 'Nodes → Relationships → Visual network',
      transaction: 'Critical for data consistency',
      rollback: 'Complete import failure on any error'
    }
  }
};

// Auto-Save System Knowledge
const AUTOSAVE_PATTERNS = {
  triggering: {
    events: ['Component changes', 'Node updates', 'Content modifications'],
    debouncing: 'scheduleAutoSave() with delay',
    validation: 'Session validation before save',
    error_handling: 'Retry logic with exponential backoff'
  },

  implementation: {
    method: 'scheduleAutoSave()',
    location: 'app.js',
    session_check: 'Validates session before each save',
    state_preservation: 'Complete component sequences saved'
  },

  recovery: {
    page_reload: 'Automatic content restoration',
    browser_crash: 'Last-saved state recovery',
    network_interruption: 'Retry with error notification',
    session_validation: 'Session existence check on recovery'
  }
};

// Transaction Safety Patterns
const TRANSACTION_SAFETY = {
  'required-patterns': [
    {
      scenario: 'Session creation with default nodes',
      reason: 'Atomicity: session + nodes must both succeed',
      implementation: 'async with transaction_context()',
      failure_impact: 'Orphaned session or missing default nodes'
    },
    {
      scenario: 'CSV import (nodes + relationships)',
      reason: 'Graph consistency: all nodes before relationships',
      implementation: 'Bulk operations in single transaction',
      failure_impact: 'Partial graph with broken relationships'
    },
    {
      scenario: 'Component sequence updates',
      reason: 'Content consistency: all components or none',
      implementation: 'DELETE + INSERT in transaction',
      failure_impact: 'Lost components or corrupted sequences'
    },
    {
      scenario: 'Bulk relationship creation',
      reason: 'Knowledge graph integrity',
      implementation: 'Batch insert with transaction',
      failure_impact: 'Incomplete knowledge graph'
    }
  ],

  'not-required-patterns': [
    {
      scenario: 'Single node retrieval',
      reason: 'Read-only operation',
      implementation: 'Direct query'
    },
    {
      scenario: 'Session validation only',
      reason: 'Single atomic operation',
      implementation: 'Simple SELECT'
    },
    {
      scenario: 'Single component creation',
      reason: 'Single INSERT operation',
      implementation: 'Direct database call'
    }
  ]
};

// Common Recovery Scenarios
const RECOVERY_SCENARIOS = {
  'session-lost': {
    symptoms: ['Session not found error', 'Redirect to home page'],
    causes: ['Invalid session ID', 'Database connection lost'],
    recovery: [
      'Create new session automatically',
      'Attempt to recover content from local storage',
      'Notify user of session recreation'
    ],
    prevention: 'Regular session validation'
  },

  'auto-save-failure': {
    symptoms: ['Save status shows error', 'Changes not persisting'],
    causes: ['Network interruption', 'Session expired', 'Database lock'],
    recovery: [
      'Retry save operation',
      'Validate session first',
      'Queue changes for retry',
      'Notify user of save status'
    ],
    prevention: 'Robust error handling with retry logic'
  },

  'data-corruption': {
    symptoms: ['Components missing data', 'Inconsistent state'],
    causes: ['Partial transaction commit', 'Concurrent modification'],
    recovery: [
      'Rollback to last known good state',
      'Validate data integrity',
      'Reconstruct from available data',
      'Manual recovery if needed'
    ],
    prevention: 'Transaction atomicity enforcement'
  },

  'csv-import-failure': {
    symptoms: ['Partial graph imported', 'Missing relationships'],
    causes: ['Invalid CSV data', 'Transaction not used'],
    recovery: [
      'Clear partial import',
      'Restart with validated data',
      'Use transaction for atomicity'
    ],
    prevention: 'Pre-validation and transaction usage'
  },

  'component-sequence-corruption': {
    symptoms: ['Components in wrong order', 'Missing components'],
    causes: ['Partial update', 'Race condition'],
    recovery: [
      'Reload from database',
      'Rebuild sequence from last save',
      'Manual reordering if needed'
    ],
    prevention: 'Atomic sequence updates'
  }
};

interface SessionContext {
  operation?: string;
  sessionId?: string;
  errorType?: string;
  recoveryNeeded?: boolean;
  transactionRequired?: boolean;
  autoSaveIssue?: boolean;
}

export const sessionRecoverySpecialist: UserPromptSubmitHook = {
  name: 'Session Recovery Specialist',

  async run({ prompt, responseStream }) {
    // Activation triggers for session and persistence work
    const sessionTriggers = [
      'session', 'auto-save', 'save', 'persistence', 'transaction',
      'database', 'SQLite', 'recovery', 'state', 'lost', 'corruption',
      'scheduleAutoSave', 'sessionId', 'validate_session', 'create_session'
    ];

    const transactionTriggers = [
      'transaction_context', 'atomic', 'rollback', 'commit',
      'multi-operation', 'bulk', 'CSV import', 'relationship creation'
    ];

    const errorTriggers = [
      'error', 'failed', 'corruption', 'lost data', 'not saving',
      'session not found', 'validation failed', 'auto-save error'
    ];

    const lowerPrompt = prompt.toLowerCase();

    // Check if session recovery specialist should activate
    const hasSessionTriggers = sessionTriggers.some(trigger =>
      lowerPrompt.includes(trigger.toLowerCase())
    );

    const hasTransactionTriggers = transactionTriggers.some(trigger =>
      lowerPrompt.includes(trigger.toLowerCase())
    );

    const hasErrorTriggers = errorTriggers.some(trigger =>
      lowerPrompt.includes(trigger.toLowerCase())
    );

    if (!hasSessionTriggers && !hasTransactionTriggers && !hasErrorTriggers) {
      return { shouldContinue: true };
    }

    // Extract session context from prompt
    const sessionContext = extractSessionContext(prompt);

    // Provide session recovery expertise
    let message = '🔒 **Session Recovery Specialist Activated**\n\n';

    if (sessionContext.errorType) {
      message += await provideErrorRecoveryGuidance(sessionContext);
    }

    if (sessionContext.transactionRequired) {
      message += await provideTransactionSafetyGuidance(sessionContext);
    }

    if (sessionContext.autoSaveIssue) {
      message += await provideAutoSaveGuidance(sessionContext);
    }

    message += await provideSessionArchitectureGuidance(sessionContext);
    message += await provideRecoveryPatternsGuidance(sessionContext);
    message += await providePreventionGuidance(sessionContext);

    message += '\n🛡️ **Session Safety Checklist**:\n';
    message += '- [ ] Multi-operations use transaction_context()\n';
    message += '- [ ] Session validation before operations\n';
    message += '- [ ] Auto-save error handling implemented\n';
    message += '- [ ] Recovery mechanisms tested\n';
    message += '- [ ] Permanent session architecture maintained\n\n';

    message += '💾 **Remember**: Sessions are permanent (100-year expiry), not 36-hour!\n';
    message += '🔄 **Pattern**: async with transaction_context() for multi-operations\n\n';

    await responseStream.sendSystemMessage(message);

    return {
      shouldContinue: true,
      data: {
        sessionContext,
        activationType: 'session-recovery-specialist',
        safetyRecommendations: await generateSafetyRecommendations(sessionContext),
        recoverySteps: await generateRecoverySteps(sessionContext)
      }
    };
  }
};

function extractSessionContext(prompt: string): SessionContext {
  const context: SessionContext = {};

  // Detect operation type
  if (prompt.toLowerCase().includes('csv import') || prompt.toLowerCase().includes('bulk')) {
    context.operation = 'csv-import';
    context.transactionRequired = true;
  } else if (prompt.toLowerCase().includes('component') && prompt.toLowerCase().includes('save')) {
    context.operation = 'component-sequence-update';
    context.transactionRequired = true;
  } else if (prompt.toLowerCase().includes('session') && prompt.toLowerCase().includes('create')) {
    context.operation = 'session-creation';
    context.transactionRequired = true;
  }

  // Detect error types
  const errorPatterns = [
    { pattern: /session.*not.*found|session.*lost/i, type: 'session-lost' },
    { pattern: /auto.*save.*fail|save.*error/i, type: 'auto-save-failure' },
    { pattern: /data.*corrupt|inconsistent.*state/i, type: 'data-corruption' },
    { pattern: /csv.*import.*fail|partial.*import/i, type: 'csv-import-failure' },
    { pattern: /component.*corrupt|sequence.*corrupt/i, type: 'component-sequence-corruption' }
  ];

  for (const { pattern, type } of errorPatterns) {
    if (pattern.test(prompt)) {
      context.errorType = type;
      context.recoveryNeeded = true;
      break;
    }
  }

  // Detect auto-save issues
  if (prompt.toLowerCase().includes('auto-save') || prompt.toLowerCase().includes('scheduleAutoSave')) {
    context.autoSaveIssue = true;
  }

  // Extract session ID if mentioned
  const sessionIdMatch = prompt.match(/session[_-]?id[:\s]*([a-f0-9-]{36})/i);
  if (sessionIdMatch) {
    context.sessionId = sessionIdMatch[1];
  }

  return context;
}

async function provideErrorRecoveryGuidance(context: SessionContext): Promise<string> {
  const scenario = RECOVERY_SCENARIOS[context.errorType!];
  if (!scenario) {
    return '';
  }

  let guidance = `🚨 **Recovery Scenario: ${context.errorType?.replace('-', ' ').toUpperCase()}**\n\n`;

  guidance += `**Symptoms**: ${scenario.symptoms.join(', ')}\n`;
  guidance += `**Common Causes**: ${scenario.causes.join(', ')}\n\n`;

  guidance += '**Recovery Steps**:\n';
  scenario.recovery.forEach((step, index) => {
    guidance += `${index + 1}. ${step}\n`;
  });
  guidance += '\n';

  guidance += `**Prevention**: ${scenario.prevention}\n\n`;

  // Specific code patterns for recovery
  if (context.errorType === 'session-lost') {
    guidance += '**Session Recovery Pattern**:\n';
    guidance += '```javascript\n';
    guidance += 'async function recoverSession() {\n';
    guidance += '    try {\n';
    guidance += '        const isValid = await validateSession(sessionId);\n';
    guidance += '        if (!isValid) {\n';
    guidance += '            const newSessionId = await createNewSession();\n';
    guidance += '            // Attempt to recover content from localStorage\n';
    guidance += '            notifyUser("Session recreated");\n';
    guidance += '        }\n';
    guidance += '    } catch (error) {\n';
    guidance += '        handleSessionError(error);\n';
    guidance += '    }\n';
    guidance += '}\n';
    guidance += '```\n\n';
  }

  return guidance;
}

async function provideTransactionSafetyGuidance(context: SessionContext): Promise<string> {
  let guidance = '🔐 **Transaction Safety Guidance**\n\n';

  // Find relevant transaction pattern
  const requiredPattern = TRANSACTION_SAFETY['required-patterns'].find(pattern =>
    pattern.scenario.toLowerCase().includes(context.operation?.replace('-', ' ') || '')
  );

  if (requiredPattern) {
    guidance += `**Current Operation**: ${requiredPattern.scenario}\n`;
    guidance += `**Why Transaction Needed**: ${requiredPattern.reason}\n`;
    guidance += `**Implementation**: ${requiredPattern.implementation}\n`;
    guidance += `**Failure Impact**: ${requiredPattern.failure_impact}\n\n`;
  }

  guidance += '**Transaction Context Pattern**:\n';
  guidance += '```python\n';
  guidance += 'async def multi_operation_example(self):\n';
  guidance += '    async with self.transaction_context() as session:\n';
  guidance += '        # All operations here are atomic\n';
  guidance += '        await session.execute(first_operation)\n';
  guidance += '        await session.execute(second_operation)\n';
  guidance += '        # Auto-commit on success, auto-rollback on error\n';
  guidance += '```\n\n';

  guidance += '**When NOT to Use Transactions**:\n';
  TRANSACTION_SAFETY['not-required-patterns'].forEach(pattern => {
    guidance += `- ${pattern.scenario}: ${pattern.reason}\n`;
  });
  guidance += '\n';

  return guidance;
}

async function provideAutoSaveGuidance(context: SessionContext): Promise<string> {
  let guidance = '💾 **Auto-Save System Guidance**\n\n';

  const autoSave = AUTOSAVE_PATTERNS;

  guidance += '**Auto-Save Architecture**:\n';
  guidance += `- **Triggering**: ${autoSave.triggering.events.join(', ')}\n`;
  guidance += `- **Debouncing**: ${autoSave.triggering.debouncing}\n`;
  guidance += `- **Validation**: ${autoSave.triggering.validation}\n`;
  guidance += `- **Error Handling**: ${autoSave.triggering.error_handling}\n\n`;

  guidance += '**Implementation Details**:\n';
  guidance += `- **Method**: ${autoSave.implementation.method}\n`;
  guidance += `- **Location**: ${autoSave.implementation.location}\n`;
  guidance += `- **Session Check**: ${autoSave.implementation.session_check}\n`;
  guidance += `- **State Preservation**: ${autoSave.implementation.state_preservation}\n\n`;

  guidance += '**Recovery Capabilities**:\n';
  Object.entries(autoSave.recovery).forEach(([scenario, description]) => {
    guidance += `- **${scenario.replace('_', ' ')}**: ${description}\n`;
  });
  guidance += '\n';

  guidance += '**Auto-Save Debug Pattern**:\n';
  guidance += '```javascript\n';
  guidance += 'function scheduleAutoSave() {\n';
  guidance += '    console.log("Auto-save triggered");\n';
  guidance += '    if (this.autoSaveTimeout) {\n';
  guidance += '        clearTimeout(this.autoSaveTimeout);\n';
  guidance += '    }\n';
  guidance += '    this.autoSaveTimeout = setTimeout(async () => {\n';
  guidance += '        try {\n';
  guidance += '            await this.saveNode();\n';
  guidance += '            console.log("Auto-save successful");\n';
  guidance += '        } catch (error) {\n';
  guidance += '            console.error("Auto-save failed:", error);\n';
  guidance += '            // Retry logic here\n';
  guidance += '        }\n';
  guidance += '    }, 2000);\n';
  guidance += '}\n';
  guidance += '```\n\n';

  return guidance;
}

async function provideSessionArchitectureGuidance(context: SessionContext): Promise<string> {
  let guidance = '🏗️ **Session Architecture**\n\n';

  const arch = SESSION_ARCHITECTURE.sessionLifecycle;

  guidance += '**Session Creation**:\n';
  guidance += `- **Pattern**: ${arch.creation.pattern}\n`;
  guidance += `- **Expiry**: ${arch.creation.expiry}\n`;
  guidance += `- **Default Nodes**: ${arch.creation.defaultNodes.join(', ')}\n`;
  guidance += `- **Atomicity**: ${arch.creation.atomicity}\n\n`;

  guidance += '**Session Validation**:\n';
  guidance += `- **Pattern**: ${arch.validation.pattern}\n`;
  guidance += `- **Updates**: ${arch.validation.updates}\n`;
  guidance += `- **Atomicity**: ${arch.validation.atomicity}\n\n`;

  guidance += '**Session Persistence**:\n';
  guidance += `- **Storage**: ${arch.persistence.storage}\n`;
  guidance += `- **Cleanup**: ${arch.persistence.cleanup}\n`;
  guidance += `- **Recovery**: ${arch.persistence.recovery}\n\n`;

  guidance += '⚠️ **Critical**: Sessions are PERMANENT (100-year expiry), not 36-hour!\n';
  guidance += '🚫 **Cleanup Disabled**: WHERE 1=0 prevents automatic cleanup\n\n';

  return guidance;
}

async function provideRecoveryPatternsGuidance(context: SessionContext): Promise<string> {
  let guidance = '🔄 **Recovery Patterns**\n\n';

  guidance += '**State Recovery Priority**:\n';
  guidance += '1. Validate session existence\n';
  guidance += '2. Check data integrity\n';
  guidance += '3. Attempt automatic recovery\n';
  guidance += '4. Fall back to manual recovery\n';
  guidance += '5. Notify user of recovery status\n\n';

  guidance += '**Component Sequence Recovery**:\n';
  guidance += '```javascript\n';
  guidance += 'async function recoverComponentSequence(nodeId) {\n';
  guidance += '    try {\n';
  guidance += '        // Get last known good state\n';
  guidance += '        const components = await loadComponentSequence(nodeId);\n';
  guidance += '        if (validateSequenceIntegrity(components)) {\n';
  guidance += '            populateComponentsFromData(components);\n';
  guidance += '        } else {\n';
  guidance += '            // Attempt reconstruction\n';
  guidance += '            await reconstructSequence(nodeId);\n';
  guidance += '        }\n';
  guidance += '    } catch (error) {\n';
  guidance += '        notifyUser("Manual recovery needed");\n';
  guidance += '    }\n';
  guidance += '}\n';
  guidance += '```\n\n';

  return guidance;
}

async function providePreventionGuidance(context: SessionContext): Promise<string> {
  let guidance = '🛡️ **Prevention Best Practices**\n\n';

  guidance += '**Transaction Safety**:\n';
  guidance += '- Use transaction_context() for multi-operations\n';
  guidance += '- Validate session before database operations\n';
  guidance += '- Include error handling with rollback\n';
  guidance += '- Test transaction boundaries thoroughly\n\n';

  guidance += '**Auto-Save Reliability**:\n';
  guidance += '- Implement debouncing to prevent excessive saves\n';
  guidance += '- Add retry logic with exponential backoff\n';
  guidance += '- Validate session before each save attempt\n';
  guidance += '- Provide user feedback on save status\n\n';

  guidance += '**Data Integrity**:\n';
  guidance += '- Validate data before storage\n';
  guidance += '- Use atomic operations for related changes\n';
  guidance += '- Implement consistency checks\n';
  guidance += '- Regular backup and recovery testing\n\n';

  return guidance;
}

async function generateSafetyRecommendations(context: SessionContext): Promise<string[]> {
  const recommendations: string[] = [];

  if (context.transactionRequired) {
    recommendations.push('Use transaction_context() for atomic operations');
    recommendations.push('Test rollback scenarios thoroughly');
  }

  if (context.autoSaveIssue) {
    recommendations.push('Implement retry logic with exponential backoff');
    recommendations.push('Add user notification for save status');
  }

  if (context.errorType) {
    recommendations.push('Add preventive validation for detected error pattern');
    recommendations.push('Implement monitoring for early error detection');
  }

  recommendations.push('Regular session validation and cleanup monitoring');
  recommendations.push('Test recovery procedures with realistic failure scenarios');

  return recommendations;
}

async function generateRecoverySteps(context: SessionContext): Promise<string[]> {
  const steps: string[] = [];

  if (context.errorType) {
    const scenario = RECOVERY_SCENARIOS[context.errorType];
    if (scenario) {
      steps.push(...scenario.recovery);
    }
  }

  steps.push('Validate system state after recovery');
  steps.push('Document incident for pattern analysis');
  steps.push('Update prevention measures if needed');

  return steps;
}