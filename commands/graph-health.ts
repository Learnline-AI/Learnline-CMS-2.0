import type { SlashCommandHandler } from '@anthropic/claude-code';
import { GraphHealthValidator } from '../validation/graph-health-validator';
import { GraphDashboardReporter } from '../reporting/graph-dashboard';

/**
 * /graph-health Command
 * Complete knowledge graph health monitoring and CSV data integrity checking
 */

interface GraphHealthOptions {
  quick?: boolean;          // Quick validation vs comprehensive
  session?: string;         // Focus on specific session ID
  format?: 'full' | 'summary' | 'json';  // Output format
  fix?: boolean;           // Suggest fixes for detected issues
}

export const graphHealth: SlashCommandHandler = {
  name: 'graph-health',
  description: 'Complete knowledge graph health monitoring and CSV data integrity checking',

  async run({ args, responseStream }) {
    // Parse command arguments
    const options = parseHealthOptions(args);

    // Initialize validators and reporters
    const graphValidator = new GraphHealthValidator();
    const dashboardReporter = new GraphDashboardReporter();

    try {
      // Send initial status
      await responseStream.sendSystemMessage('🕸️ **Knowledge Graph Health Check Started**\\n\\nAnalyzing CSV data integrity, relationships, and visual network...');

      // Perform graph health validation
      const healthResult = await graphValidator.validateGraphHealth(options.session);

      // Generate appropriate report based on options
      let report: string;

      if (options.session) {
        // Focus report on specific session
        report = `# 🕸️ Session ${options.session} - Graph Health Analysis\\n\\n`;
        report += dashboardReporter.generateGraphHealthReport(healthResult);
      } else if (options.format === 'summary') {
        // Quick summary report
        report = dashboardReporter.generateQuickSummary(healthResult);
      } else if (options.format === 'json') {
        // JSON output for programmatic use
        report = `\\`\\`\\`json\\n${JSON.stringify(healthResult, null, 2)}\\n\\`\\`\\``;
      } else {
        // Full comprehensive report
        report = dashboardReporter.generateGraphHealthReport(healthResult);
      }

      // Add fix suggestions if requested
      if (options.fix && healthResult.criticalIssues.length > 0) {
        report += await generateGraphFixSuggestions(healthResult);
      }

      // Send the report
      await responseStream.sendSystemMessage(report);

      // Send follow-up recommendations based on graph health status
      await sendGraphFollowUpRecommendations(healthResult, responseStream, options);

      return {
        success: true,
        graphHealthScore: healthResult.score,
        overallStatus: healthResult.overall,
        criticalIssues: healthResult.criticalIssues.length,
        warnings: healthResult.warnings.length,
        sessionSummary: healthResult.sessionSummary
      };

    } catch (error) {
      const errorMessage = `❌ **Knowledge Graph health check failed**\\n\\n` +
                          `Error: ${error instanceof Error ? error.message : 'Unknown error'}\\n\\n` +
                          `This may indicate a serious graph integrity issue. Please check:\\n` +
                          `- Database connectivity and schema\\n` +
                          `- CSV file accessibility and format\\n` +
                          `- Session table integrity\\n` +
                          `- Relationship data consistency\\n` +
                          `- Visual network rendering components`;

      await responseStream.sendSystemMessage(errorMessage);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
};

function parseHealthOptions(args: string[]): GraphHealthOptions {
  const options: GraphHealthOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--quick':
      case '-q':
        options.quick = true;
        break;

      case '--session':
      case '-s':
        if (i + 1 < args.length) {
          options.session = args[i + 1];
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

async function generateGraphFixSuggestions(healthResult: any): Promise<string> {
  let suggestions = `\\n## 🛠️ Knowledge Graph Fix Suggestions\\n\\n`;

  // CSV Import Fixes
  const csvIssues = healthResult.components.find(c =>
    c.name.includes('CSV Import') && c.status !== 'healthy'
  );

  if (csvIssues) {
    suggestions += `### CSV Import Integrity Fixes\\n\\n`;

    if (csvIssues.issues.some(issue => issue.includes('transaction'))) {
      suggestions += `**Fix Transaction Safety**:\\n`;
      suggestions += `\\`\\`\\`python\\n`;
      suggestions += `# In database.py - CSV bulk import\\n`;
      suggestions += `async def import_csv_data(self, session_id: str, csv_data: list):\\n`;
      suggestions += `    async with self.transaction_context() as session:\\n`;
      suggestions += `        try:\\n`;
      suggestions += `            # Import all CSV data atomically\\n`;
      suggestions += `            for row in csv_data:\\n`;
      suggestions += `                await session.execute(import_query, row)\\n`;
      suggestions += `            await session.commit()  # All or nothing\\n`;
      suggestions += `        except Exception as e:\\n`;
      suggestions += `            await session.rollback()\\n`;
      suggestions += `            raise e\\n`;
      suggestions += `\\`\\`\\`\\n\\n`;
    }

    if (csvIssues.issues.some(issue => issue.includes('structure'))) {
      suggestions += `**Fix CSV Structure Validation**:\\n`;
      suggestions += `- Validate CSV headers match expected format before import\\n`;
      suggestions += `- Check for required columns: node_id, node_type, relationships\\n`;
      suggestions += `- Implement CSV format validation in frontend before upload\\n\\n`;
    }
  }

  // Node Data Fixes
  const nodeIssues = healthResult.components.find(c =>
    c.name.includes('Node Data') && c.status !== 'healthy'
  );

  if (nodeIssues) {
    suggestions += `### Node Data Consistency Fixes\\n\\n`;

    if (nodeIssues.issues.some(issue => issue.includes('orphaned'))) {
      suggestions += `**Fix Orphaned Nodes**:\\n`;
      suggestions += `\\`\\`\\`sql\\n`;
      suggestions += `-- Find orphaned nodes (nodes without relationships)\\n`;
      suggestions += `SELECT n.node_id, n.session_id \\n`;
      suggestions += `FROM nodes n \\n`;
      suggestions += `LEFT JOIN session_relationships sr ON (n.node_id = sr.source_node OR n.node_id = sr.target_node)\\n`;
      suggestions += `WHERE sr.source_node IS NULL AND sr.target_node IS NULL;\\n`;
      suggestions += `\\`\\`\\`\\n`;
      suggestions += `- Review orphaned nodes and create appropriate relationships\\n`;
      suggestions += `- Consider connecting to nearest educational progression nodes\\n\\n`;
    }

    if (nodeIssues.issues.some(issue => issue.includes('starter'))) {
      suggestions += `**Fix Missing Starter Nodes**:\\n`;
      suggestions += `\\`\\`\\`python\\n`;
      suggestions += `# In database.py - ensure starter nodes\\n`;
      suggestions += `async def ensure_starter_nodes(self, session_id: str):\\n`;
      suggestions += `    starter_nodes = ['N001', 'N002']\\n`;
      suggestions += `    for node_id in starter_nodes:\\n`;
      suggestions += `        existing = await self.get_node(session_id, node_id)\\n`;
      suggestions += `        if not existing:\\n`;
      suggestions += `            await self.create_node(session_id, node_id, {\\n`;
      suggestions += `                'title': f'Foundation Node {node_id}',\\n`;
      suggestions += `                'node_type': 'core'\\n`;
      suggestions += `            })\\n`;
      suggestions += `\\`\\`\\`\\n\\n`;
    }
  }

  // Relationship Fixes
  const relationshipIssues = healthResult.components.find(c =>
    c.name.includes('Relationship') && c.status !== 'healthy'
  );

  if (relationshipIssues) {
    suggestions += `### Relationship Integrity Fixes\\n\\n`;

    if (relationshipIssues.issues.some(issue => issue.includes('cyclic'))) {
      suggestions += `**Fix Cyclic Relationships (CRITICAL)**:\\n`;
      suggestions += `\\`\\`\\`python\\n`;
      suggestions += `# Detect prerequisite cycles\\n`;
      suggestions += `def detect_cycles(relationships):\\n`;
      suggestions += `    # Build prerequisite graph\\n`;
      suggestions += `    graph = defaultdict(list)\\n`;
      suggestions += `    for rel in relationships:\\n`;
      suggestions += `        if rel.relationship_type in ['PREREQUISITE', 'PREREQUISITE_FOR']:\\n`;
      suggestions += `            graph[rel.source_node].append(rel.target_node)\\n`;
      suggestions += `    \\n`;
      suggestions += `    # DFS cycle detection\\n`;
      suggestions += `    visited, path = set(), set()\\n`;
      suggestions += `    for node in graph:\\n`;
      suggestions += `        if node not in visited:\\n`;
      suggestions += `            if dfs_cycle_check(graph, node, visited, path):\\n`;
      suggestions += `                return True  # Cycle found\\n`;
      suggestions += `\\`\\`\\`\\n`;
      suggestions += `- **IMMEDIATE ACTION**: Break prerequisite cycles by removing specific relationships\\n`;
      suggestions += `- Review educational logic - prerequisites should form DAG (Directed Acyclic Graph)\\n\\n`;
    }

    if (relationshipIssues.issues.some(issue => issue.includes('explanations'))) {
      suggestions += `**Fix Missing Relationship Explanations**:\\n`;
      suggestions += `- Add educational context to relationship explanations\\n`;
      suggestions += `- Use NCERT progression logic for relationship descriptions\\n`;
      suggestions += `- Include \\"why\\" this relationship exists educationally\\n\\n`;
    }
  }

  // Session Scoping Fixes
  const sessionIssues = healthResult.components.find(c =>
    c.name.includes('Session Scoping') && c.status !== 'healthy'
  );

  if (sessionIssues) {
    suggestions += `### Session Scoping Fixes\\n\\n`;

    if (sessionIssues.issues.some(issue => issue.includes('cross-session'))) {
      suggestions += `**Fix Cross-Session Data Leaks**:\\n`;
      suggestions += `\\`\\`\\`sql\\n`;
      suggestions += `-- Audit for cross-session leaks\\n`;
      suggestions += `SELECT 'nodes' as table_name, n1.session_id, n2.session_id\\n`;
      suggestions += `FROM nodes n1, nodes n2 \\n`;
      suggestions += `WHERE n1.node_id = n2.node_id AND n1.session_id != n2.session_id;\\n`;
      suggestions += `\\`\\`\\`\\n`;
      suggestions += `- Ensure all graph operations include session_id filtering\\n`;
      suggestions += `- Add session isolation validation to all database queries\\n\\n`;
    }

    if (sessionIssues.issues.some(issue => issue.includes('expiry'))) {
      suggestions += `**Fix Session Expiry Issues**:\\n`;
      suggestions += `- Update session creation to use 100-year expiry\\n`;
      suggestions += `- Disable session cleanup: WHERE 1=0 in cleanup queries\\n`;
      suggestions += `- Ensure permanent session architecture is maintained\\n\\n`;
    }
  }

  // Visual Network Fixes
  const visualIssues = healthResult.components.find(c =>
    c.name.includes('Visual Network') && c.status !== 'healthy'
  );

  if (visualIssues) {
    suggestions += `### Visual Network Fixes\\n\\n`;

    if (visualIssues.issues.some(issue => issue.includes('positioning'))) {
      suggestions += `**Fix Visual Positioning Data**:\\n`;
      suggestions += `\\`\\`\\`javascript\\n`;
      suggestions += `// In app.js - rebuild positioning\\n`;
      suggestions += `function rebuildNodePositions(nodes, relationships) {\\n`;
      suggestions += `    // Auto-layout algorithm for missing positions\\n`;
      suggestions += `    const positioned = new Set();\\n`;
      suggestions += `    nodes.forEach(node => {\\n`;
      suggestions += `        if (!node.x || !node.y) {\\n`;
      suggestions += `            // Calculate position based on relationships\\n`;
      suggestions += `            node.x = calculateOptimalX(node, relationships);\\n`;
      suggestions += `            node.y = calculateOptimalY(node, relationships);\\n`;
      suggestions += `        }\\n`;
      suggestions += `    });\\n`;
      suggestions += `}\\n`;
      suggestions += `\\`\\`\\`\\n\\n`;
    }

    if (visualIssues.issues.some(issue => issue.includes('canvas'))) {
      suggestions += `**Fix Canvas Rendering Issues**:\\n`;
      suggestions += `- Test canvas with different graph sizes (10, 50, 100+ nodes)\\n`;
      suggestions += `- Implement canvas performance optimization for large graphs\\n`;
      suggestions += `- Add error handling for canvas rendering failures\\n\\n`;
    }
  }

  suggestions += `### General Graph Recommendations\\n\\n`;
  suggestions += `1. **Backup before fixes**: Export current graph state before making changes\\n`;
  suggestions += `2. **Test incrementally**: Fix one component at a time and re-validate\\n`;
  suggestions += `3. **Monitor performance**: Large relationship sets may impact visual rendering\\n`;
  suggestions += `4. **Educational validation**: Ensure fixes maintain educational logic integrity\\n`;
  suggestions += `5. **Document changes**: Update graph documentation for any structural changes\\n\\n`;

  return suggestions;
}

async function sendGraphFollowUpRecommendations(healthResult: any, responseStream: any, options: GraphHealthOptions): Promise<void> {
  let followUp = '';

  // Critical graph issues follow-up
  if (healthResult.criticalIssues.length > 0) {
    followUp += `🚨 **Critical Graph Issues Detected**\\n\\n`;
    followUp += `${healthResult.criticalIssues.length} critical knowledge graph issues require immediate attention.\\n\\n`;
    followUp += `**Immediate graph actions**:\\n`;
    followUp += `1. **Stop CSV imports** until integrity issues are resolved\\n`;
    followUp += `2. **Fix relationship cycles** - these break educational progression\\n`;
    followUp += `3. **Address session data leaks** - these compromise user isolation\\n`;
    followUp += `4. **Run \\`/graph-health --fix\\`** for automated fix suggestions\\n`;
    followUp += `5. **Re-validate** after each fix with \\`/graph-health\\`\\n\\n`;
  }

  // Warning-level follow-up for graphs
  else if (healthResult.warnings.length > 0) {
    followUp += `⚠️ **Graph Warnings Detected**\\n\\n`;
    followUp += `${healthResult.warnings.length} knowledge graph warnings should be addressed soon.\\n\\n`;
    followUp += `**Recommended graph maintenance**:\\n`;
    followUp += `1. **Review orphaned nodes** and restore missing relationships\\n`;
    followUp += `2. **Validate CSV import** procedures for data consistency\\n`;
    followUp += `3. **Check visual network** positioning and rendering\\n`;
    followUp += `4. **Plan fixes** in next development cycle\\n\\n`;
  }

  // Healthy graph follow-up
  else {
    followUp += `✅ **Knowledge Graph Healthy**\\n\\n`;
    followUp += `All graph components functioning optimally!\\n\\n`;
    followUp += `**Recommended graph maintenance**:\\n`;
    followUp += `1. **Regular validation**: Run \\`/graph-health\\` before major CSV imports\\n`;
    followUp += `2. **Monitor relationships**: Check for educational logic consistency\\n`;
    followUp += `3. **Session monitoring**: Ensure session isolation remains intact\\n`;
    followUp += `4. **Performance monitoring**: Watch visual network rendering with growth\\n\\n`;
  }

  // Session-specific follow-up
  if (options.session) {
    followUp += `**Session ${options.session} Specific Actions**:\\n`;
    followUp += `- Nodes: ${healthResult.sessionSummary.avgNodesPerSession} avg per session\\n`;
    followUp += `- Relationships: ${healthResult.sessionSummary.avgRelationshipsPerSession} avg per session\\n`;
    if (healthResult.sessionSummary.csvImportFailures > 0) {
      followUp += `- ⚠️ Recent CSV import failures in this session - investigate\\n`;
    }
    followUp += '\\n';
  }

  // Related commands
  followUp += `**Related graph commands**:\\n`;
  followUp += `- \\`/architecture-validate\\`: Overall system health including graph integration\\n`;
  followUp += `- \\`/curriculum-align\\`: Validate educational content in graph nodes\\n`;
  followUp += `- \\`/vision-ai-test\\`: Test PDF processing that creates graph nodes\\n`;

  if (followUp) {
    await responseStream.sendSystemMessage(followUp);
  }
}

// Command usage examples and help
export const graphHealthHelp = {
  usage: '/graph-health [options]',
  description: 'Complete knowledge graph health monitoring and CSV data integrity checking',
  examples: [
    {
      command: '/graph-health',
      description: 'Full knowledge graph analysis with comprehensive report'
    },
    {
      command: '/graph-health --quick',
      description: 'Quick graph health check with summary report'
    },
    {
      command: '/graph-health --session abc123',
      description: 'Focus analysis on specific session graph data'
    },
    {
      command: '/graph-health --format summary',
      description: 'Generate summary report only'
    },
    {
      command: '/graph-health --fix',
      description: 'Include automated fix suggestions for detected graph issues'
    },
    {
      command: '/graph-health --format json',
      description: 'Output results in JSON format for programmatic use'
    }
  ],
  options: [
    { flag: '--quick, -q', description: 'Perform quick validation instead of comprehensive graph analysis' },
    { flag: '--session, -s <id>', description: 'Focus validation on specific session ID' },
    { flag: '--format, -f <type>', description: 'Output format: full, summary, or json (default: full)' },
    { flag: '--fix', description: 'Include automated fix suggestions for detected graph issues' }
  ]
};