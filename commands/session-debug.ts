import type { SlashCommand } from '@anthropic/claude-code';

/**
 * Debug session state and persistence issues in LearnLine CMS
 * Analyzes auto-save, transaction safety, and session management
 */
export const sessionDebug: SlashCommand = {
  name: 'session-debug',
  description: 'Analyze session state, persistence, and auto-save functionality',

  async run({ args, filesystem, responseStream }) {
    const sessionId = args[0]; // Optional: specific session ID to debug

    await responseStream.sendSystemMessage('🔍 Analyzing session state and persistence...');

    let report = `# Session Debug Report\n\n`;

    // Check database schema
    const schemaStatus = await checkDatabaseSchema(filesystem);
    report += schemaStatus;

    // Check session management code
    const sessionCodeStatus = await checkSessionManagement(filesystem);
    report += sessionCodeStatus;

    // Check auto-save implementation
    const autoSaveStatus = await checkAutoSaveImplementation(filesystem);
    report += autoSaveStatus;

    // Check transaction patterns
    const transactionStatus = await checkTransactionPatterns(filesystem);
    report += transactionStatus;

    // Check for session expiry issues
    const expiryStatus = await checkSessionExpiry(filesystem);
    report += expiryStatus;

    await responseStream.sendSystemMessage(report);
  }
};

async function checkDatabaseSchema(filesystem: any) {
  let report = `## Database Schema Analysis\n\n`;

  try {
    const schemaContent = await filesystem.readFile('database/sqlite_schema.sql', 'utf8');

    // Check sessions table structure
    const hasSessionsTable = schemaContent.includes('CREATE TABLE IF NOT EXISTS sessions');
    const hasSessionExpiry = schemaContent.includes('expires_at DATETIME NOT NULL');
    const hasSessionData = schemaContent.includes('session_data TEXT');

    report += `### Sessions Table\n`;
    report += `- ${hasSessionsTable ? '✅' : '❌'} Sessions table defined\n`;
    report += `- ${hasSessionExpiry ? '✅' : '❌'} Expiry field present\n`;
    report += `- ${hasSessionData ? '✅' : '❌'} Session data field present\n\n`;

    // Check session-scoped tables
    const sessionScopedTables = [
      { name: 'nodes', hasSessionId: schemaContent.includes('session_id TEXT REFERENCES sessions') },
      { name: 'session_relationships', hasSessionId: schemaContent.includes('session_id TEXT NOT NULL REFERENCES sessions') },
      { name: 'node_components', hasSessionId: schemaContent.includes('node_id INTEGER REFERENCES nodes') }
    ];

    report += `### Session-Scoped Tables\n`;
    for (const table of sessionScopedTables) {
      report += `- ${table.hasSessionId ? '✅' : '❌'} ${table.name} properly scoped\n`;
    }
    report += `\n`;

    // Check indexes
    const hasIndexes = schemaContent.includes('CREATE INDEX') &&
                      schemaContent.includes('idx_sessions') &&
                      schemaContent.includes('idx_nodes_session_id');

    report += `### Performance\n`;
    report += `- ${hasIndexes ? '✅' : '❌'} Session indexes defined\n\n`;

  } catch (error) {
    report += `❌ Could not read database schema: ${error.message}\n\n`;
  }

  return report;
}

async function checkSessionManagement(filesystem: any) {
  let report = `## Session Management Code\n\n`;

  try {
    const databaseContent = await filesystem.readFile('python-services/database.py', 'utf8');

    // Check session creation
    const hasCreateSession = databaseContent.includes('async def create_session');
    const hasPermanentExpiry = databaseContent.includes("datetime('now', '+100 years')");
    const hasDefaultNodes = databaseContent.includes('default_nodes') || databaseContent.includes('N001');

    report += `### Session Creation\n`;
    report += `- ${hasCreateSession ? '✅' : '❌'} create_session method exists\n`;
    report += `- ${hasPermanentExpiry ? '✅' : '❌'} 100-year expiry (permanent sessions)\n`;
    report += `- ${hasDefaultNodes ? '✅' : '❌'} Default starter nodes (N001, N002)\n\n`;

    // Check session validation
    const hasValidateSession = databaseContent.includes('async def validate_session');
    const hasAccessUpdate = databaseContent.includes('last_accessed = datetime');

    report += `### Session Validation\n`;
    report += `- ${hasValidateSession ? '✅' : '❌'} validate_session method exists\n`;
    report += `- ${hasAccessUpdate ? '✅' : '❌'} Access timestamp updates\n\n`;

    // Check transaction context
    const hasTransactionContext = databaseContent.includes('transaction_context');
    const hasAtomicOperations = databaseContent.includes('async with self.transaction_context()');

    report += `### Transaction Safety\n`;
    report += `- ${hasTransactionContext ? '✅' : '❌'} Transaction context manager\n`;
    report += `- ${hasAtomicOperations ? '✅' : '❌'} Atomic operation patterns\n\n`;

    // Check session cleanup (should be disabled)
    const hasCleanup = databaseContent.includes('cleanup_expired_sessions');
    const isCleanupDisabled = databaseContent.includes('WHERE 1=0') ||
                             databaseContent.includes('# Cleanup disabled');

    report += `### Session Cleanup\n`;
    report += `- ${hasCleanup ? '✅' : '❌'} Cleanup method exists\n`;
    report += `- ${isCleanupDisabled ? '✅' : '⚠️'} Cleanup disabled (sessions are permanent)\n\n`;

  } catch (error) {
    report += `❌ Could not read database.py: ${error.message}\n\n`;
  }

  return report;
}

async function checkAutoSaveImplementation(filesystem: any) {
  let report = `## Auto-Save Implementation\n\n`;

  try {
    const appJsContent = await filesystem.readFile('frontend/public/app.js', 'utf8');

    // Check auto-save method
    const hasAutoSave = appJsContent.includes('scheduleAutoSave') || appJsContent.includes('autoSaveContent');
    const hasTimeout = appJsContent.includes('autoSaveTimeout') && appJsContent.includes('setTimeout');
    const hasDebounce = appJsContent.includes('clearTimeout');

    report += `### Auto-Save Method\n`;
    report += `- ${hasAutoSave ? '✅' : '❌'} Auto-save method exists\n`;
    report += `- ${hasTimeout ? '✅' : '❌'} Timeout mechanism\n`;
    report += `- ${hasDebounce ? '✅' : '❌'} Debouncing (prevents spam)\n\n`;

    // Check auto-save triggers
    const triggers = [
      { name: 'Content changes', pattern: /addEventListener.*input|contenteditable/g },
      { name: 'Component reordering', pattern: /drag.*end|drop.*end/g },
      { name: 'Dropdown changes', pattern: /addEventListener.*change/g },
      { name: 'Component addition/removal', pattern: /addComponent|removeComponent/g }
    ];

    report += `### Auto-Save Triggers\n`;
    for (const trigger of triggers) {
      const hasTrigger = trigger.pattern.test(appJsContent);
      report += `- ${hasTrigger ? '✅' : '❌'} ${trigger.name}\n`;
    }
    report += `\n`;

    // Check save format and API
    const hasApiCall = appJsContent.includes('/session/') && appJsContent.includes('/content');
    const hasComponentExtraction = appJsContent.includes('extractAllComponents') ||
                                  appJsContent.includes('extractComponentData');

    report += `### Save Format\n`;
    report += `- ${hasApiCall ? '✅' : '❌'} Session-scoped API calls\n`;
    report += `- ${hasComponentExtraction ? '✅' : '❌'} Component data extraction\n\n`;

  } catch (error) {
    report += `❌ Could not read app.js: ${error.message}\n\n`;
  }

  return report;
}

async function checkTransactionPatterns(filesystem: any) {
  let report = `## Transaction Pattern Analysis\n\n`;

  try {
    const databaseContent = await filesystem.readFile('python-services/database.py', 'utf8');

    // Find all transaction context usages
    const transactionUsages = databaseContent.match(/async with.*transaction_context.*:/g) || [];

    report += `### Transaction Usage Count: ${transactionUsages.length}\n\n`;

    // Check specific critical operations
    const criticalOperations = [
      { name: 'Session creation with nodes', pattern: /create_session.*transaction_context/s },
      { name: 'CSV import operations', pattern: /csv.*transaction_context|bulk.*transaction_context/s },
      { name: 'Component sequence updates', pattern: /save_node_components.*transaction_context/s },
      { name: 'Relationship management', pattern: /relationship.*transaction_context/s }
    ];

    report += `### Critical Operation Safety\n`;
    for (const operation of criticalOperations) {
      const isTransactional = operation.pattern.test(databaseContent);
      report += `- ${isTransactional ? '✅' : '⚠️'} ${operation.name}\n`;
    }
    report += `\n`;

    // Check for manual commit/rollback (anti-pattern)
    const hasManualCommit = databaseContent.includes('session.commit()') &&
                           !databaseContent.includes('# Manual commit required');
    const hasManualRollback = databaseContent.includes('session.rollback()') &&
                             !databaseContent.includes('# Manual rollback required');

    report += `### Transaction Anti-Patterns\n`;
    report += `- ${hasManualCommit ? '⚠️' : '✅'} Manual commits (should use context manager)\n`;
    report += `- ${hasManualRollback ? '⚠️' : '✅'} Manual rollbacks (should use context manager)\n\n`;

    // Check error handling in transactions
    const hasErrorHandling = databaseContent.includes('except') &&
                            databaseContent.includes('transaction_context');

    report += `### Error Handling\n`;
    report += `- ${hasErrorHandling ? '✅' : '⚠️'} Exception handling in transactions\n\n`;

  } catch (error) {
    report += `❌ Could not read database.py: ${error.message}\n\n`;
  }

  return report;
}

async function checkSessionExpiry(filesystem: any) {
  let report = `## Session Expiry Analysis\n\n`;

  try {
    // Check database code for expiry handling
    const databaseContent = await filesystem.readFile('python-services/database.py', 'utf8');

    // Check for 36-hour expiry (should NOT exist)
    const has36HourExpiry = databaseContent.includes('36') ||
                           databaseContent.includes('hours') ||
                           databaseContent.includes('+1 day');

    const hasPermanentExpiry = databaseContent.includes('+100 years');

    report += `### Expiry Configuration\n`;
    report += `- ${!has36HourExpiry ? '✅' : '❌'} No 36-hour expiry (problem resolved)\n`;
    report += `- ${hasPermanentExpiry ? '✅' : '❌'} 100-year expiry (permanent sessions)\n\n`;

    // Check frontend session recovery
    const appJsContent = await filesystem.readFile('frontend/public/app.js', 'utf8');

    const hasSessionRecovery = appJsContent.includes('validateSession') ||
                              appJsContent.includes('initializeSession');
    const hasLocalStorage = appJsContent.includes('localStorage') &&
                           appJsContent.includes('session');

    report += `### Frontend Recovery\n`;
    report += `- ${hasSessionRecovery ? '✅' : '❌'} Session validation/recovery\n`;
    report += `- ${hasLocalStorage ? '✅' : '❌'} localStorage session persistence\n\n`;

    // Check for session cleanup patterns
    const hasDisabledCleanup = databaseContent.includes('WHERE 1=0') ||
                              databaseContent.includes('cleanup disabled');

    report += `### Cleanup Prevention\n`;
    report += `- ${hasDisabledCleanup ? '✅' : '⚠️'} Session cleanup disabled\n\n`;

    if (!has36HourExpiry && hasPermanentExpiry && hasDisabledCleanup) {
      report += `### 🎉 Session Expiry Status: RESOLVED\n`;
      report += `The 36-hour expiry issue has been resolved. Sessions are now permanent.\n\n`;
    } else {
      report += `### ⚠️ Session Expiry Status: NEEDS ATTENTION\n`;
      report += `Some session expiry issues may still exist. Check the items marked with ❌ above.\n\n`;
    }

  } catch (error) {
    report += `❌ Could not analyze session expiry: ${error.message}\n\n`;
  }

  return report;
}