/**
 * Knowledge Graph Dashboard Reporter
 * Generates comprehensive knowledge graph health reports for LearnLine Educational CMS
 */

import { GraphHealthResult, GraphComponentStatus } from '../validation/graph-health-validator';

export class GraphDashboardReporter {

  generateGraphHealthReport(healthResult: GraphHealthResult): string {
    let report = this.generateReportHeader(healthResult);
    report += this.generateOverallStatus(healthResult);
    report += this.generateComponentBreakdown(healthResult.components);
    report += this.generateSessionSummary(healthResult.sessionSummary);
    report += this.generateCriticalIssues(healthResult.criticalIssues);
    report += this.generateRecommendations(healthResult.recommendations);
    report += this.generateReportFooter();

    return report;
  }

  private generateReportHeader(healthResult: GraphHealthResult): string {
    const statusEmoji = this.getStatusEmoji(healthResult.overall);
    const timestamp = new Date().toLocaleString();

    return `# 🕸️ Knowledge Graph Health Dashboard\\n\\n` +
           `**Overall Graph Status**: ${statusEmoji} ${healthResult.overall.toUpperCase()}\\n` +
           `**Graph Health Score**: ${healthResult.score}/100\\n` +
           `**Generated**: ${timestamp}\\n\\n` +
           `---\\n\\n`;
  }

  private generateOverallStatus(healthResult: GraphHealthResult): string {
    let status = `## 📊 Knowledge Graph Status Overview\\n\\n`;

    // Status interpretation
    if (healthResult.overall === 'healthy') {
      status += `✅ **Knowledge graph is healthy** - CSV data, relationships, and visual network functioning optimally\\n\\n`;
    } else if (healthResult.overall === 'warning') {
      status += `⚠️ **Knowledge graph has warnings** - Some integrity issues detected requiring attention\\n\\n`;
    } else {
      status += `🚨 **Knowledge graph has critical issues** - Major problems affecting functionality\\n\\n`;
    }

    // Score interpretation for knowledge graphs
    status += `**Graph Health Score Breakdown**:\\n`;
    status += `- 90-100: Healthy (optimal CSV data integrity and visual consistency)\\n`;
    status += `- 70-89: Warning (minor data issues or orphaned nodes)\\n`;
    status += `- Below 70: Critical (major integrity problems or cyclic relationships)\\n\\n`;

    // Component summary
    const healthyComponents = healthResult.components.filter(c => c.status === 'healthy').length;
    const warningComponents = healthResult.components.filter(c => c.status === 'warning').length;
    const criticalComponents = healthResult.components.filter(c => c.status === 'critical').length;

    status += `**Graph Component Summary**: ${healthyComponents} healthy, ${warningComponents} warnings, ${criticalComponents} critical\\n\\n`;

    return status;
  }

  private generateComponentBreakdown(components: GraphComponentStatus[]): string {
    let breakdown = `## 🔗 Graph Component Health Analysis\\n\\n`;

    components.forEach(component => {
      const statusEmoji = this.getStatusEmoji(component.status);
      const completenessBar = this.generateProgressBar(component.completeness);

      breakdown += `### ${statusEmoji} ${component.name}\\n\\n`;
      breakdown += `**Status**: ${component.status.toUpperCase()}\\n`;
      breakdown += `**Integrity**: ${completenessBar} ${component.completeness}%\\n`;
      breakdown += `**Last Validated**: ${new Date(component.lastValidated).toLocaleString()}\\n\\n`;

      // Add component-specific metrics
      if (component.metrics) {
        breakdown += this.generateComponentMetrics(component.name, component.metrics);
      }

      if (component.issues.length > 0) {
        breakdown += `**Issues Detected**:\\n`;
        component.issues.forEach(issue => {
          breakdown += `- ${issue}\\n`;
        });
        breakdown += '\\n';
      } else {
        breakdown += `✅ No issues detected\\n\\n`;
      }
    });

    return breakdown;
  }

  private generateComponentMetrics(componentName: string, metrics: any): string {
    let metricsText = `**Metrics**: `;

    switch (componentName) {
      case 'CSV Import Integrity':
        if (metrics.missingCsvData !== undefined) {
          metricsText += `${metrics.missingCsvData} missing CSV data entries`;
        }
        break;

      case 'Node Data Consistency':
        const nodeParts = [];
        if (metrics.nodeCount !== undefined) nodeParts.push(`${metrics.nodeCount} total nodes`);
        if (metrics.orphanedNodes !== undefined) nodeParts.push(`${metrics.orphanedNodes} orphaned`);
        metricsText += nodeParts.join(', ');
        break;

      case 'Relationship Integrity':
        const relParts = [];
        if (metrics.relationshipCount !== undefined) relParts.push(`${metrics.relationshipCount} relationships`);
        if (metrics.cyclicRelationships !== undefined) relParts.push(`${metrics.cyclicRelationships} cycles`);
        metricsText += relParts.join(', ');
        break;

      default:
        metricsText += 'N/A';
    }

    return metricsText + '\\n\\n';
  }

  private generateSessionSummary(sessionSummary: any): string {
    let summary = `## 📈 Session Graph Analytics\\n\\n`;

    summary += `**Session Statistics**:\\n`;
    summary += `- **Total Sessions**: ${sessionSummary.totalSessions}\\n`;
    summary += `- **Active Graph Sessions**: ${sessionSummary.activeGraphSessions}\\n`;
    summary += `- **Avg Nodes per Session**: ${sessionSummary.avgNodesPerSession.toFixed(1)}\\n`;
    summary += `- **Avg Relationships per Session**: ${sessionSummary.avgRelationshipsPerSession.toFixed(1)}\\n\\n`;

    summary += `**Error Tracking**:\\n`;
    summary += `- **CSV Import Failures**: ${sessionSummary.csvImportFailures}\\n`;
    summary += `- **Visual Network Errors**: ${sessionSummary.visualNetworkErrors}\\n\\n`;

    // Health indicators
    if (sessionSummary.csvImportFailures > 0) {
      summary += `⚠️ Recent CSV import failures detected - review import process\\n`;
    }
    if (sessionSummary.visualNetworkErrors > 0) {
      summary += `⚠️ Visual network rendering issues detected - check canvas consistency\\n`;
    }
    if (sessionSummary.csvImportFailures === 0 && sessionSummary.visualNetworkErrors === 0) {
      summary += `✅ No recent errors in graph operations\\n`;
    }

    summary += '\\n';
    return summary;
  }

  private generateCriticalIssues(criticalIssues: string[]): string {
    if (criticalIssues.length === 0) {
      return `## 🎉 Critical Graph Issues\\n\\n✅ No critical knowledge graph issues detected!\\n\\n`;
    }

    let issues = `## 🚨 Critical Graph Issues Requiring Immediate Attention\\n\\n`;
    issues += `⚠️ **${criticalIssues.length} critical graph issues detected**\\n\\n`;

    criticalIssues.forEach((issue, index) => {
      issues += `${index + 1}. **${issue}**\\n`;
    });

    issues += '\\n💡 **Recommendation**: Fix critical graph issues before importing new CSV data or creating relationships\\n\\n';

    return issues;
  }

  private generateRecommendations(recommendations: string[]): string {
    let recs = `## 💡 Graph Maintenance Recommendations\\n\\n`;

    if (recommendations.length === 0) {
      recs += `✅ Knowledge graph is operating optimally - no immediate recommendations\\n\\n`;
      return recs;
    }

    recs += `### Prioritized Graph Actions\\n\\n`;

    recommendations.forEach((recommendation, index) => {
      const priority = index < 2 ? '🔴 High' : index < 4 ? '🟡 Medium' : '🟢 Low';
      recs += `${index + 1}. ${priority}: ${recommendation}\\n`;
    });

    recs += '\\n### Graph Maintenance Guidance\\n\\n';
    recs += `- **High Priority**: Fix immediately to prevent data corruption\\n`;
    recs += `- **Medium Priority**: Address within next graph operations\\n`;
    recs += `- **Low Priority**: Include in next maintenance cycle\\n\\n`;

    return recs;
  }

  private generateReportFooter(): string {
    return `---\\n\\n` +
           `## 🔍 Next Graph Actions\\n\\n` +
           `1. **Fix Critical Issues**: Address any critical graph problems immediately\\n` +
           `2. **Validate CSV Data**: Ensure CSV import integrity before bulk operations\\n` +
           `3. **Test Relationships**: Verify relationship chains don't create cycles\\n` +
           `4. **Monitor Sessions**: Check session scoping and data isolation\\n` +
           `5. **Re-validate**: Run \\`/graph-health\\` after making graph changes\\n\\n` +
           `## 📚 Related Graph Commands\\n\\n` +
           `- \\`/architecture-validate\\`: Overall system health including graph components\\n` +
           `- \\`/curriculum-align\\`: Validate educational content alignment in nodes\\n` +
           `- \\`/vision-ai-test\\`: Test PDF processing that creates graph nodes\\n\\n` +
           `---\\n\\n` +
           `*Generated by LearnLine CMS Knowledge Graph Health System*\\n` +
           `*For graph-specific support, refer to CSV import documentation or development team*`;
  }

  private getStatusEmoji(status: string): string {
    switch (status) {
      case 'healthy': return '✅';
      case 'warning': return '⚠️';
      case 'critical': return '🚨';
      default: return '❓';
    }
  }

  private generateProgressBar(percentage: number): string {
    const totalBars = 10;
    const filledBars = Math.round((percentage / 100) * totalBars);
    const emptyBars = totalBars - filledBars;

    const filled = '█'.repeat(filledBars);
    const empty = '░'.repeat(emptyBars);

    return `[${filled}${empty}]`;
  }

  // Generate focused reports for specific graph components
  generateComponentFocusReport(component: GraphComponentStatus): string {
    let report = `# 🔗 ${component.name} - Detailed Graph Analysis\\n\\n`;

    const statusEmoji = this.getStatusEmoji(component.status);
    const completenessBar = this.generateProgressBar(component.completeness);

    report += `**Status**: ${statusEmoji} ${component.status.toUpperCase()}\\n`;
    report += `**Integrity**: ${completenessBar} ${component.completeness}%\\n`;
    report += `**Last Validated**: ${new Date(component.lastValidated).toLocaleString()}\\n\\n`;

    if (component.issues.length > 0) {
      report += `## 🚨 Graph Issues Detected (${component.issues.length})\\n\\n`;
      component.issues.forEach((issue, index) => {
        report += `${index + 1}. ${issue}\\n`;
      });
      report += '\\n';

      report += `## 🔧 Recommended Graph Actions\\n\\n`;
      // Component-specific graph recommendations
      if (component.name.includes('CSV Import')) {
        report += this.getCsvImportRecommendations();
      } else if (component.name.includes('Node Data')) {
        report += this.getNodeDataRecommendations();
      } else if (component.name.includes('Relationship')) {
        report += this.getRelationshipRecommendations();
      } else if (component.name.includes('Session Scoping')) {
        report += this.getSessionScopingRecommendations();
      } else if (component.name.includes('Visual Network')) {
        report += this.getVisualNetworkRecommendations();
      }
    } else {
      report += `## ✅ No Graph Issues Detected\\n\\n`;
      report += `This graph component is functioning optimally. Continue monitoring for data integrity.\\n\\n`;
    }

    return report;
  }

  private getCsvImportRecommendations(): string {
    return `1. Validate CSV file structure matches expected format (node-export.csv, relationship-export.csv, graph-export.csv)\\n` +
           `2. Use transaction context for all bulk import operations\\n` +
           `3. Implement rollback mechanisms for failed imports\\n` +
           `4. Test CSV import with small batches before full data import\\n` +
           `5. Verify session scoping during import process\\n\\n`;
  }

  private getNodeDataRecommendations(): string {
    return `1. Identify and reconnect orphaned nodes to relationship chains\\n` +
           `2. Validate node ID format consistency (N### for core, S### for support, E### for enrichment)\\n` +
           `3. Ensure starter nodes (N001, N002) exist in all active sessions\\n` +
           `4. Balance node type distribution across sessions\\n` +
           `5. Clean up invalid or duplicate node data\\n\\n`;
  }

  private getRelationshipRecommendations(): string {
    return `1. Detect and resolve cyclic prerequisite chains immediately\\n` +
           `2. Validate relationship type consistency (LEADS_TO, PREREQUISITE_FOR, PREREQUISITE)\\n` +
           `3. Check bidirectional relationship integrity\\n` +
           `4. Add missing relationship explanations for educational context\\n` +
           `5. Test relationship chains for logical educational progression\\n\\n`;
  }

  private getSessionScopingRecommendations(): string {
    return `1. Audit for cross-session data leaks and fix isolation issues\\n` +
           `2. Verify all sessions use 100-year permanent expiry\\n` +
           `3. Ensure graph data is properly scoped to sessions\\n` +
           `4. Test session cleanup procedures (should be disabled: WHERE 1=0)\\n` +
           `5. Validate session-based node and relationship creation\\n\\n`;
  }

  private getVisualNetworkRecommendations(): string {
    return `1. Rebuild missing visual positioning data for affected nodes\\n` +
           `2. Test canvas rendering with different graph sizes and complexities\\n` +
           `3. Verify zoom/pan state persistence across sessions\\n` +
           `4. Check network layout algorithms for optimal positioning\\n` +
           `5. Test visual network performance with large relationship sets\\n\\n`;
  }

  // Generate summary report for quick graph overview
  generateQuickSummary(healthResult: GraphHealthResult): string {
    const statusEmoji = this.getStatusEmoji(healthResult.overall);

    let summary = `## 🕸️ Quick Graph Health Summary\\n\\n`;
    summary += `**Overall Graph Health**: ${statusEmoji} ${healthResult.overall.toUpperCase()} (${healthResult.score}/100)\\n\\n`;

    // Session metrics
    summary += `**Graph Scale**: ${healthResult.sessionSummary.totalSessions} sessions, `;
    summary += `${healthResult.sessionSummary.avgNodesPerSession.toFixed(1)} avg nodes/session\\n\\n`;

    if (healthResult.criticalIssues.length > 0) {
      summary += `🚨 **${healthResult.criticalIssues.length} critical graph issues** require immediate attention\\n\\n`;
    }

    if (healthResult.warnings.length > 0) {
      summary += `⚠️ **${healthResult.warnings.length} graph warnings** should be addressed\\n\\n`;
    }

    if (healthResult.criticalIssues.length === 0 && healthResult.warnings.length === 0) {
      summary += `✅ **Knowledge graph healthy** - all components functioning optimally\\n\\n`;
    }

    summary += `**Next Graph Action**: `;
    if (healthResult.criticalIssues.length > 0) {
      summary += `Fix critical graph integrity issues before continuing`;
    } else if (healthResult.warnings.length > 0) {
      summary += `Review and resolve graph warnings`;
    } else {
      summary += `Continue normal graph operations`;
    }

    return summary;
  }
}