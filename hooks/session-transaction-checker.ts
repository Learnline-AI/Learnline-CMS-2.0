import type { PostEditHook } from '@anthropic/claude-code';

/**
 * Ensures session operations use proper transaction safety patterns
 * Prevents data corruption from incomplete multi-operation sequences
 */
export const sessionTransactionChecker: PostEditHook = {
  name: 'Session Transaction Safety Checker',

  async run({ edit, responseStream }) {
    const filePath = edit.filePath;
    const fileName = filePath.split('/').pop() || '';
    const newContent = edit.newContent;

    // Only check Python database files
    if (!fileName.endsWith('.py') || !fileName.includes('database')) {
      return { shouldContinue: true };
    }

    const warnings: string[] = [];
    const errors: string[] = [];

    // Detect multi-operation sequences that need transactions
    const multiOperationPatterns = [
      {
        pattern: /await.*execute.*INSERT.*\n.*await.*execute.*INSERT/gm,
        message: 'Multiple INSERT operations detected - consider using transaction_context()'
      },
      {
        pattern: /await.*execute.*DELETE.*\n.*await.*execute.*INSERT/gm,
        message: 'DELETE followed by INSERT - should be atomic in transaction_context()'
      },
      {
        pattern: /await.*execute.*UPDATE.*\n.*await.*execute.*UPDATE/gm,
        message: 'Multiple UPDATE operations - consider transaction safety'
      },
      {
        pattern: /create.*session.*\n.*create.*node/gm,
        message: 'Session creation with nodes should be atomic'
      },
      {
        pattern: /bulk.*create.*relationship/gm,
        message: 'Bulk operations should use transaction_context() for atomicity'
      }
    ];

    // Check for transaction context usage
    const hasTransactionContext = newContent.includes('transaction_context()') ||
                                 newContent.includes('async with self.transaction_context()');

    // Check each multi-operation pattern
    for (const { pattern, message } of multiOperationPatterns) {
      if (pattern.test(newContent) && !hasTransactionContext) {
        warnings.push(message);
      }
    }

    // Session-specific validations
    await validateSessionPatterns(newContent, warnings, errors);

    // CSV import safety checks
    await validateCsvImportSafety(newContent, warnings, errors);

    // Component sequence safety checks
    await validateComponentSequenceSafety(newContent, warnings, errors);

    // Database connection patterns
    await validateDatabasePatterns(newContent, warnings, errors);

    // Send feedback if issues found
    if (errors.length > 0 || warnings.length > 0) {
      let message = `🔒 **Session Transaction Safety Check** (${fileName}):\n\n`;

      if (errors.length > 0) {
        message += `❌ **Critical Issues** (fix required):\n${errors.map(e => `- ${e}`).join('\n')}\n\n`;
      }

      if (warnings.length > 0) {
        message += `⚠️ **Safety Recommendations**:\n${warnings.map(w => `- ${w}`).join('\n')}\n\n`;
      }

      message += `💡 **Transaction Context Pattern**:\n`;
      message += `\`\`\`python\n`;
      message += `async with self.transaction_context() as session:\n`;
      message += `    # Multiple operations here\n`;
      message += `    # Auto-commit on success, auto-rollback on error\n`;
      message += `\`\`\`\n\n`;

      await responseStream.sendSystemMessage(message);
    }

    return {
      shouldContinue: errors.length === 0,
      data: {
        hasTransactionContext,
        multiOperationCount: multiOperationPatterns.filter(p => p.pattern.test(newContent)).length,
        warnings,
        errors
      }
    };
  }
};

async function validateSessionPatterns(content: string, warnings: string[], errors: string[]) {
  // Session creation with default nodes
  if (content.includes('create_session') && content.includes('default_nodes')) {
    if (!content.includes('transaction_context')) {
      errors.push('Session creation with default nodes must be atomic - use transaction_context()');
    }
  }

  // Session validation with access update
  if (content.includes('validate_session') && content.includes('last_accessed')) {
    if (!content.includes('transaction_context')) {
      warnings.push('Session validation + access update should be atomic');
    }
  }

  // Session expiry handling (should not exist - sessions are permanent)
  if (content.includes('expires_at') && !content.includes('+100 years')) {
    if (content.includes('datetime(') && !content.includes("datetime('now', '+100 years')")) {
      errors.push('Sessions should have 100-year expiry, not short-term expiry');
    }
  }

  // Session cleanup (should be disabled)
  if (content.includes('cleanup_expired_sessions') && !content.includes('1=0')) {
    errors.push('Session cleanup should be disabled (WHERE 1=0) - sessions are permanent');
  }
}

async function validateCsvImportSafety(content: string, warnings: string[], errors: string[]) {
  // CSV import operations
  if (content.includes('csv') || content.includes('bulk') || content.includes('import')) {

    // Multiple node creation
    if (content.includes('nodes') && content.includes('relationships')) {
      if (!content.includes('transaction_context')) {
        errors.push('CSV import (nodes + relationships) must be atomic - use transaction_context()');
      }
    }

    // Bulk relationship creation
    if (content.includes('bulk_create_relationships') || content.includes('relationships.*bulk')) {
      if (!content.includes('transaction_context')) {
        errors.push('Bulk relationship creation must be atomic');
      }
    }

    // Session node creation from CSV
    if (content.includes('createSessionNodesFromCsv') || content.includes('session.*nodes.*csv')) {
      if (!content.includes('transaction_context') && content.includes('Promise.all')) {
        warnings.push('Parallel session node creation should consider transaction safety');
      }
    }
  }
}

async function validateComponentSequenceSafety(content: string, warnings: string[], errors: string[]) {
  // Component sequence operations
  if (content.includes('node_components') || content.includes('component.*sequence')) {

    // Delete + Insert pattern for component updates
    if (content.includes('DELETE.*node_components') && content.includes('INSERT.*node_components')) {
      if (!content.includes('transaction_context')) {
        errors.push('Component sequence replacement (DELETE + INSERT) must be atomic');
      }
    }

    // Component reordering
    if (content.includes('reorder.*components') || content.includes('component.*order')) {
      if (!content.includes('transaction_context')) {
        warnings.push('Component reordering should be atomic to prevent inconsistent state');
      }
    }

    // Save with template selection
    if (content.includes('save.*node.*content') && content.includes('template')) {
      if (!content.includes('transaction_context')) {
        warnings.push('Saving node content + template should be atomic');
      }
    }
  }
}

async function validateDatabasePatterns(content: string, warnings: string[], errors: string[]) {
  // Connection management
  if (content.includes('get_session()') && !content.includes('async with')) {
    warnings.push('Database sessions should be used with async context managers');
  }

  // Error handling patterns
  if (content.includes('execute(') && !content.includes('try:') && !content.includes('except')) {
    warnings.push('Database operations should include error handling');
  }

  // Commit/rollback patterns
  if (content.includes('session.commit()') && !content.includes('session.rollback()')) {
    warnings.push('Manual commits should include rollback handling');
  }

  // Foreign key validation
  if (content.includes('session_id') && content.includes('INSERT')) {
    if (!content.includes('validate_session') && !content.includes('session.*exists')) {
      warnings.push('Operations with session_id should validate session exists');
    }
  }

  // Concurrent operation safety
  if (content.includes('Promise.all') || content.includes('concurrent') || content.includes('parallel')) {
    if (!content.includes('transaction_context')) {
      warnings.push('Concurrent database operations may need transaction coordination');
    }
  }

  // Schema validation
  if (content.includes('component.*parameters') && !content.includes('validate_component_parameters')) {
    warnings.push('Component storage should validate parameters against schema');
  }
}