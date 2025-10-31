/**
 * Health Dashboard Reporter
 * Generates comprehensive system health reports for LearnLine Educational CMS
 */

import { SystemHealthResult, ComponentHealthStatus, IntegrationHealthStatus } from '../validation/system-health-validator';

export class HealthDashboardReporter {

  generateHealthReport(healthResult: SystemHealthResult): string {
    let report = this.generateReportHeader(healthResult);
    report += this.generateOverallStatus(healthResult);
    report += this.generateComponentBreakdown(healthResult.components);
    report += this.generateIntegrationStatus(healthResult.integrations);
    report += this.generateCriticalIssues(healthResult.criticalIssues);
    report += this.generateRecommendations(healthResult.recommendations);
    report += this.generateReportFooter();

    return report;
  }

  private generateReportHeader(healthResult: SystemHealthResult): string {
    const statusEmoji = this.getStatusEmoji(healthResult.overall);
    const timestamp = new Date().toLocaleString();

    return `# 🏥 System Health Dashboard\n\n` +
           `**Overall Status**: ${statusEmoji} ${healthResult.overall.toUpperCase()}\n` +
           `**Health Score**: ${healthResult.score}/100\n` +
           `**Generated**: ${timestamp}\n\n` +
           `---\n\n`;
  }

  private generateOverallStatus(healthResult: SystemHealthResult): string {
    let status = `## 📊 Overall System Status\n\n`;

    // Status interpretation
    if (healthResult.overall === 'healthy') {
      status += `✅ **System is healthy** - All critical components functioning normally\n\n`;
    } else if (healthResult.overall === 'warning') {
      status += `⚠️ **System has warnings** - Some issues detected that should be addressed\n\n`;
    } else {
      status += `🚨 **System has critical issues** - Immediate attention required\n\n`;
    }

    // Score breakdown
    status += `**Health Score Breakdown**:\n`;
    status += `- 90-100: Healthy (all systems optimal)\n`;
    status += `- 70-89: Warning (minor issues present)\n`;
    status += `- Below 70: Critical (major issues requiring attention)\n\n`;

    // Quick summary
    const healthyComponents = healthResult.components.filter(c => c.status === 'healthy').length;
    const warningComponents = healthResult.components.filter(c => c.status === 'warning').length;
    const criticalComponents = healthResult.components.filter(c => c.status === 'critical').length;

    status += `**Component Summary**: ${healthyComponents} healthy, ${warningComponents} warnings, ${criticalComponents} critical\n\n`;

    return status;
  }

  private generateComponentBreakdown(components: ComponentHealthStatus[]): string {
    let breakdown = `## 🔧 Component Health Analysis\n\n`;

    components.forEach(component => {
      const statusEmoji = this.getStatusEmoji(component.status);
      const completenessBar = this.generateProgressBar(component.completeness);

      breakdown += `### ${statusEmoji} ${component.name}\n\n`;
      breakdown += `**Status**: ${component.status.toUpperCase()}\n`;
      breakdown += `**Completeness**: ${completenessBar} ${component.completeness}%\n`;
      breakdown += `**Last Validated**: ${new Date(component.lastValidated).toLocaleString()}\n\n`;

      if (component.issues.length > 0) {
        breakdown += `**Issues Detected**:\n`;
        component.issues.forEach(issue => {
          breakdown += `- ${issue}\n`;
        });
        breakdown += '\n';
      } else {
        breakdown += `✅ No issues detected\n\n`;
      }
    });

    return breakdown;
  }

  private generateIntegrationStatus(integrations: IntegrationHealthStatus[]): string {
    let status = `## 🔗 Cross-System Integration Status\n\n`;

    integrations.forEach(integration => {
      const statusEmoji = this.getStatusEmoji(integration.status);

      status += `### ${statusEmoji} ${integration.name}\n\n`;
      status += `**Status**: ${integration.status.toUpperCase()}\n`;
      status += `**Description**: ${integration.description}\n\n`;

      status += `**Dependencies**:\n`;
      integration.dependencies.forEach(dep => {
        status += `- ${dep}\n`;
      });
      status += '\n';

      if (integration.issues.length > 0) {
        status += `**Integration Issues**:\n`;
        integration.issues.forEach(issue => {
          status += `- ${issue}\n`;
        });
        status += '\n';
      } else {
        status += `✅ Integration functioning properly\n\n`;
      }
    });

    return status;
  }

  private generateCriticalIssues(criticalIssues: string[]): string {
    if (criticalIssues.length === 0) {
      return `## 🎉 Critical Issues\n\n✅ No critical issues detected!\n\n`;
    }

    let issues = `## 🚨 Critical Issues Requiring Immediate Attention\n\n`;
    issues += `⚠️ **${criticalIssues.length} critical issues detected**\n\n`;

    criticalIssues.forEach((issue, index) => {
      issues += `${index + 1}. **${issue}**\n`;
    });

    issues += '\n💡 **Recommendation**: Address critical issues before continuing development\n\n';

    return issues;
  }

  private generateRecommendations(recommendations: string[]): string {
    let recs = `## 💡 Recommendations\n\n`;

    if (recommendations.length === 0) {
      recs += `✅ System is operating optimally - no immediate recommendations\n\n`;
      return recs;
    }

    recs += `### Prioritized Action Items\n\n`;

    recommendations.forEach((recommendation, index) => {
      const priority = index < 3 ? '🔴 High' : index < 6 ? '🟡 Medium' : '🟢 Low';
      recs += `${index + 1}. ${priority}: ${recommendation}\n`;
    });

    recs += '\n### Implementation Guidance\n\n';
    recs += `- **High Priority**: Address within 24 hours\n`;
    recs += `- **Medium Priority**: Address within 1 week\n`;
    recs += `- **Low Priority**: Address in next sprint/iteration\n\n`;

    return recs;
  }

  private generateReportFooter(): string {
    return `---\n\n` +
           `## 🔍 Next Steps\n\n` +
           `1. **Address Critical Issues**: Fix any critical issues immediately\n` +
           `2. **Monitor Warnings**: Plan resolution for warning-level issues\n` +
           `3. **Validate Fixes**: Re-run \`/architecture-validate\` after fixes\n` +
           `4. **Regular Monitoring**: Run health checks before major deployments\n\n` +
           `## 📚 Related Commands\n\n` +
           `- \`/curriculum-align\`: Validate educational standards compliance\n` +
           `- \`/graph-health\`: Check knowledge graph integrity\n` +
           `- \`/vision-ai-test\`: Validate PDF processing pipeline\n\n` +
           `---\n\n` +
           `*Generated by LearnLine CMS Architecture Validation System*\n` +
           `*For technical support, refer to system documentation or contact development team*`;
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

  // Generate focused reports for specific components
  generateComponentFocusReport(component: ComponentHealthStatus): string {
    let report = `# 🔧 ${component.name} - Detailed Analysis\n\n`;

    const statusEmoji = this.getStatusEmoji(component.status);
    const completenessBar = this.generateProgressBar(component.completeness);

    report += `**Status**: ${statusEmoji} ${component.status.toUpperCase()}\n`;
    report += `**Completeness**: ${completenessBar} ${component.completeness}%\n`;
    report += `**Last Validated**: ${new Date(component.lastValidated).toLocaleString()}\n\n`;

    if (component.issues.length > 0) {
      report += `## 🚨 Issues Detected (${component.issues.length})\n\n`;
      component.issues.forEach((issue, index) => {
        report += `${index + 1}. ${issue}\n`;
      });
      report += '\n';

      report += `## 🔧 Recommended Actions\n\n`;
      // Component-specific recommendations based on name
      if (component.name.includes('Component Integration')) {
        report += this.getComponentIntegrationRecommendations();
      } else if (component.name.includes('Session Management')) {
        report += this.getSessionManagementRecommendations();
      } else if (component.name.includes('Knowledge Graph')) {
        report += this.getKnowledgeGraphRecommendations();
      } else if (component.name.includes('Vision AI')) {
        report += this.getVisionAIRecommendations();
      }
    } else {
      report += `## ✅ No Issues Detected\n\n`;
      report += `This component is functioning optimally. Continue monitoring for any changes.\n\n`;
    }

    return report;
  }

  private getComponentIntegrationRecommendations(): string {
    return `1. Verify all 11 component types follow 9-step integration pattern\n` +
           `2. Check populateComponentInputs implementation (critical for AI components)\n` +
           `3. Validate CSS styling in both preview and student view\n` +
           `4. Test component creation and editing workflows\n` +
           `5. Ensure auto-save integration works properly\n\n`;
  }

  private getSessionManagementRecommendations(): string {
    return `1. Verify sessions use 100-year expiry (permanent sessions)\n` +
           `2. Ensure transaction_context() used for multi-operations\n` +
           `3. Check auto-save functionality and error handling\n` +
           `4. Validate session cleanup is disabled (WHERE 1=0)\n` +
           `5. Test session recovery and persistence\n\n`;
  }

  private getKnowledgeGraphRecommendations(): string {
    return `1. Validate CSV import workflow integrity\n` +
           `2. Check visual network consistency and positioning\n` +
           `3. Verify relationship integrity (no orphaned nodes)\n` +
           `4. Test transaction safety for bulk operations\n` +
           `5. Ensure session scoping works correctly\n\n`;
  }

  private getVisionAIRecommendations(): string {
    return `1. Verify 590-line system prompt structure\n` +
           `2. Test component extraction accuracy with sample PDFs\n` +
           `3. Check retry logic and quality degradation\n` +
           `4. Validate memory management for large PDFs\n` +
           `5. Ensure educational content recognition accuracy\n\n`;
  }

  // Generate summary report for quick overview
  generateQuickSummary(healthResult: SystemHealthResult): string {
    const statusEmoji = this.getStatusEmoji(healthResult.overall);

    let summary = `## 🏥 Quick Health Summary\n\n`;
    summary += `**Overall**: ${statusEmoji} ${healthResult.overall.toUpperCase()} (${healthResult.score}/100)\n\n`;

    if (healthResult.criticalIssues.length > 0) {
      summary += `🚨 **${healthResult.criticalIssues.length} critical issues** require immediate attention\n\n`;
    }

    if (healthResult.warnings.length > 0) {
      summary += `⚠️ **${healthResult.warnings.length} warnings** should be addressed\n\n`;
    }

    if (healthResult.criticalIssues.length === 0 && healthResult.warnings.length === 0) {
      summary += `✅ **All systems healthy** - no issues detected\n\n`;
    }

    summary += `**Next Action**: `;
    if (healthResult.criticalIssues.length > 0) {
      summary += `Address critical issues immediately`;
    } else if (healthResult.warnings.length > 0) {
      summary += `Review and plan resolution for warnings`;
    } else {
      summary += `Continue normal operations`;
    }

    return summary;
  }
}