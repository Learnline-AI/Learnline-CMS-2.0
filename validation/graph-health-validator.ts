/**
 * Knowledge Graph Health Validator
 * Validates CSV-driven knowledge graph integrity for LearnLine Educational CMS
 */

import { DatabaseManager } from '../python-services/database';

export interface GraphHealthResult {
  overall: 'healthy' | 'warning' | 'critical';
  score: number;
  components: GraphComponentStatus[];
  criticalIssues: string[];
  warnings: string[];
  recommendations: string[];
  sessionSummary: SessionGraphSummary;
  lastValidated: string;
}

export interface GraphComponentStatus {
  name: string;
  status: 'healthy' | 'warning' | 'critical';
  completeness: number;
  issues: string[];
  metrics: ComponentMetrics;
  lastValidated: string;
}

interface ComponentMetrics {
  nodeCount?: number;
  relationshipCount?: number;
  orphanedNodes?: number;
  cyclicRelationships?: number;
  missingCsvData?: number;
  integrityScore?: number;
}

interface SessionGraphSummary {
  totalSessions: number;
  activeGraphSessions: number;
  avgNodesPerSession: number;
  avgRelationshipsPerSession: number;
  csvImportFailures: number;
  visualNetworkErrors: number;
}

export class GraphHealthValidator {

  async validateGraphHealth(sessionId?: string): Promise<GraphHealthResult> {
    const components: GraphComponentStatus[] = [];
    const criticalIssues: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    try {
      // Validate CSV Import Integrity
      components.push(await this.validateCsvImportIntegrity(sessionId));

      // Validate Node Data Consistency
      components.push(await this.validateNodeDataConsistency(sessionId));

      // Validate Relationship Integrity
      components.push(await this.validateRelationshipIntegrity(sessionId));

      // Validate Session Scoping
      components.push(await this.validateSessionScoping(sessionId));

      // Validate Visual Network Consistency
      components.push(await this.validateVisualNetworkConsistency(sessionId));

      // Generate session summary
      const sessionSummary = await this.generateSessionSummary();

      // Aggregate results
      components.forEach(component => {
        if (component.status === 'critical') {
          criticalIssues.push(...component.issues);
        } else if (component.status === 'warning') {
          warnings.push(...component.issues);
        }
      });

      // Generate recommendations
      recommendations.push(...this.generateRecommendations(components));

      // Calculate overall health
      const { overall, score } = this.calculateOverallHealth(components);

      return {
        overall,
        score,
        components,
        criticalIssues,
        warnings,
        recommendations,
        sessionSummary,
        lastValidated: new Date().toISOString()
      };

    } catch (error) {
      return {
        overall: 'critical',
        score: 0,
        components: [],
        criticalIssues: [`Graph validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: [],
        recommendations: ['Check database connectivity', 'Verify schema integrity', 'Review CSV file accessibility'],
        sessionSummary: {
          totalSessions: 0,
          activeGraphSessions: 0,
          avgNodesPerSession: 0,
          avgRelationshipsPerSession: 0,
          csvImportFailures: 0,
          visualNetworkErrors: 0
        },
        lastValidated: new Date().toISOString()
      };
    }
  }

  private async validateCsvImportIntegrity(sessionId?: string): Promise<GraphComponentStatus> {
    const issues: string[] = [];
    let completeness = 100;
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';

    try {
      // Check for expected CSV structure in database
      const hasRequiredTables = await this.checkRequiredTables();
      if (!hasRequiredTables) {
        issues.push('Missing required graph tables (nodes, session_relationships)');
        completeness -= 30;
        status = 'critical';
      }

      // Validate CSV import patterns
      const csvDataIntegrity = await this.validateCsvDataIntegrity(sessionId);
      if (csvDataIntegrity.missingNodeTypes > 0) {
        issues.push(`${csvDataIntegrity.missingNodeTypes} node types missing standard CSV structure`);
        completeness -= 15;
        status = status === 'critical' ? 'critical' : 'warning';
      }

      if (csvDataIntegrity.incompleteRelationships > 0) {
        issues.push(`${csvDataIntegrity.incompleteRelationships} relationships missing required fields`);
        completeness -= 20;
        status = 'warning';
      }

      // Check for bulk import transaction safety
      const transactionSafety = await this.validateTransactionSafety();
      if (!transactionSafety) {
        issues.push('CSV bulk import lacks transaction safety patterns');
        completeness -= 25;
        status = 'critical';
      }

      return {
        name: 'CSV Import Integrity',
        status,
        completeness: Math.max(0, completeness),
        issues,
        metrics: {
          missingCsvData: csvDataIntegrity.missingNodeTypes + csvDataIntegrity.incompleteRelationships
        },
        lastValidated: new Date().toISOString()
      };

    } catch (error) {
      return {
        name: 'CSV Import Integrity',
        status: 'critical',
        completeness: 0,
        issues: [`CSV validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        metrics: {},
        lastValidated: new Date().toISOString()
      };
    }
  }

  private async validateNodeDataConsistency(sessionId?: string): Promise<GraphComponentStatus> {
    const issues: string[] = [];
    let completeness = 100;
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';

    try {
      // Get node statistics
      const nodeStats = await this.getNodeStatistics(sessionId);

      // Check for orphaned nodes (nodes without relationships)
      if (nodeStats.orphanedNodes > 0) {
        issues.push(`${nodeStats.orphanedNodes} orphaned nodes detected (no relationships)`);
        completeness -= Math.min(30, nodeStats.orphanedNodes * 5);
        status = nodeStats.orphanedNodes > 5 ? 'critical' : 'warning';
      }

      // Validate node ID patterns (N001, N002, etc.)
      if (nodeStats.invalidNodeIds > 0) {
        issues.push(`${nodeStats.invalidNodeIds} nodes with invalid ID format (expected: N###, S###, E###)`);
        completeness -= 15;
        status = status === 'critical' ? 'critical' : 'warning';
      }

      // Check for required starter nodes (N001, N002)
      const hasStarterNodes = await this.validateStarterNodes(sessionId);
      if (!hasStarterNodes) {
        issues.push('Missing required starter nodes (N001, N002) in session');
        completeness -= 20;
        status = 'warning';
      }

      // Validate node type distribution
      const typeDistribution = await this.validateNodeTypeDistribution(sessionId);
      if (!typeDistribution.balanced) {
        issues.push(`Unbalanced node types: ${typeDistribution.description}`);
        completeness -= 10;
        status = status === 'critical' ? 'critical' : 'warning';
      }

      return {
        name: 'Node Data Consistency',
        status,
        completeness: Math.max(0, completeness),
        issues,
        metrics: {
          nodeCount: nodeStats.totalNodes,
          orphanedNodes: nodeStats.orphanedNodes
        },
        lastValidated: new Date().toISOString()
      };

    } catch (error) {
      return {
        name: 'Node Data Consistency',
        status: 'critical',
        completeness: 0,
        issues: [`Node validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        metrics: {},
        lastValidated: new Date().toISOString()
      };
    }
  }

  private async validateRelationshipIntegrity(sessionId?: string): Promise<GraphComponentStatus> {
    const issues: string[] = [];
    let completeness = 100;
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';

    try {
      // Get relationship statistics
      const relationshipStats = await this.getRelationshipStatistics(sessionId);

      // Check for cyclic relationships (PREREQUISITE loops)
      if (relationshipStats.cyclicRelationships > 0) {
        issues.push(`${relationshipStats.cyclicRelationships} cyclic relationships detected (prerequisite loops)`);
        completeness -= 25;
        status = 'critical';
      }

      // Validate relationship types (LEADS_TO, PREREQUISITE_FOR, PREREQUISITE)
      if (relationshipStats.invalidTypes > 0) {
        issues.push(`${relationshipStats.invalidTypes} relationships with invalid types`);
        completeness -= 15;
        status = status === 'critical' ? 'critical' : 'warning';
      }

      // Check for bidirectional consistency
      const bidirectionalIssues = await this.validateBidirectionalConsistency(sessionId);
      if (bidirectionalIssues > 0) {
        issues.push(`${bidirectionalIssues} bidirectional relationship inconsistencies`);
        completeness -= 20;
        status = 'warning';
      }

      // Validate relationship explanations
      if (relationshipStats.missingExplanations > 0) {
        issues.push(`${relationshipStats.missingExplanations} relationships missing explanations`);
        completeness -= 10;
        status = status === 'critical' ? 'critical' : 'warning';
      }

      return {
        name: 'Relationship Integrity',
        status,
        completeness: Math.max(0, completeness),
        issues,
        metrics: {
          relationshipCount: relationshipStats.totalRelationships,
          cyclicRelationships: relationshipStats.cyclicRelationships
        },
        lastValidated: new Date().toISOString()
      };

    } catch (error) {
      return {
        name: 'Relationship Integrity',
        status: 'critical',
        completeness: 0,
        issues: [`Relationship validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        metrics: {},
        lastValidated: new Date().toISOString()
      };
    }
  }

  private async validateSessionScoping(sessionId?: string): Promise<GraphComponentStatus> {
    const issues: string[] = [];
    let completeness = 100;
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';

    try {
      // Validate session isolation
      const crossSessionLeaks = await this.detectCrossSessionLeaks();
      if (crossSessionLeaks > 0) {
        issues.push(`${crossSessionLeaks} nodes/relationships incorrectly shared across sessions`);
        completeness -= 30;
        status = 'critical';
      }

      // Check session expiry patterns (should be 100-year permanent)
      const sessionExpiryIssues = await this.validateSessionExpiry();
      if (sessionExpiryIssues.shortLivedSessions > 0) {
        issues.push(`${sessionExpiryIssues.shortLivedSessions} sessions with incorrect expiry (should be 100 years)`);
        completeness -= 15;
        status = 'warning';
      }

      // Validate graph data session scoping
      const scopingIntegrity = await this.validateGraphScoping(sessionId);
      if (!scopingIntegrity.consistent) {
        issues.push(`Session scoping inconsistent: ${scopingIntegrity.description}`);
        completeness -= 25;
        status = 'critical';
      }

      return {
        name: 'Session Scoping',
        status,
        completeness: Math.max(0, completeness),
        issues,
        metrics: {},
        lastValidated: new Date().toISOString()
      };

    } catch (error) {
      return {
        name: 'Session Scoping',
        status: 'critical',
        completeness: 0,
        issues: [`Session scoping validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        metrics: {},
        lastValidated: new Date().toISOString()
      };
    }
  }

  private async validateVisualNetworkConsistency(sessionId?: string): Promise<GraphComponentStatus> {
    const issues: string[] = [];
    let completeness = 100;
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';

    try {
      // Check for visual positioning data
      const visualData = await this.validateVisualPositioning(sessionId);
      if (visualData.missingPositions > 0) {
        issues.push(`${visualData.missingPositions} nodes missing visual positioning data`);
        completeness -= 20;
        status = 'warning';
      }

      // Validate canvas rendering consistency
      const renderingIssues = await this.validateCanvasRendering();
      if (renderingIssues > 0) {
        issues.push(`${renderingIssues} canvas rendering inconsistencies detected`);
        completeness -= 15;
        status = 'warning';
      }

      // Check zoom/pan state persistence
      const interactionConsistency = await this.validateInteractionConsistency();
      if (!interactionConsistency) {
        issues.push('Visual network interaction state not properly persisted');
        completeness -= 10;
        status = 'warning';
      }

      return {
        name: 'Visual Network Consistency',
        status,
        completeness: Math.max(0, completeness),
        issues,
        metrics: {},
        lastValidated: new Date().toISOString()
      };

    } catch (error) {
      return {
        name: 'Visual Network Consistency',
        status: 'critical',
        completeness: 0,
        issues: [`Visual network validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        metrics: {},
        lastValidated: new Date().toISOString()
      };
    }
  }

  // Helper methods for validation logic
  private async checkRequiredTables(): Promise<boolean> {
    // Implementation would check for nodes, session_relationships tables
    return true; // Placeholder
  }

  private async validateCsvDataIntegrity(sessionId?: string): Promise<{
    missingNodeTypes: number;
    incompleteRelationships: number;
  }> {
    // Implementation would validate CSV import data structure
    return { missingNodeTypes: 0, incompleteRelationships: 0 }; // Placeholder
  }

  private async validateTransactionSafety(): Promise<boolean> {
    // Implementation would check for transaction context usage in bulk operations
    return true; // Placeholder
  }

  private async getNodeStatistics(sessionId?: string): Promise<{
    totalNodes: number;
    orphanedNodes: number;
    invalidNodeIds: number;
  }> {
    // Implementation would query database for node statistics
    return { totalNodes: 0, orphanedNodes: 0, invalidNodeIds: 0 }; // Placeholder
  }

  private async validateStarterNodes(sessionId?: string): Promise<boolean> {
    // Implementation would check for N001, N002 nodes
    return true; // Placeholder
  }

  private async validateNodeTypeDistribution(sessionId?: string): Promise<{
    balanced: boolean;
    description: string;
  }> {
    // Implementation would analyze node type distribution
    return { balanced: true, description: 'Balanced distribution' }; // Placeholder
  }

  private async getRelationshipStatistics(sessionId?: string): Promise<{
    totalRelationships: number;
    cyclicRelationships: number;
    invalidTypes: number;
    missingExplanations: number;
  }> {
    // Implementation would analyze relationship data
    return {
      totalRelationships: 0,
      cyclicRelationships: 0,
      invalidTypes: 0,
      missingExplanations: 0
    }; // Placeholder
  }

  private async validateBidirectionalConsistency(sessionId?: string): Promise<number> {
    // Implementation would check bidirectional relationship consistency
    return 0; // Placeholder
  }

  private async detectCrossSessionLeaks(): Promise<number> {
    // Implementation would detect session isolation issues
    return 0; // Placeholder
  }

  private async validateSessionExpiry(): Promise<{
    shortLivedSessions: number;
  }> {
    // Implementation would check session expiry patterns
    return { shortLivedSessions: 0 }; // Placeholder
  }

  private async validateGraphScoping(sessionId?: string): Promise<{
    consistent: boolean;
    description: string;
  }> {
    // Implementation would validate session scoping consistency
    return { consistent: true, description: 'Consistent scoping' }; // Placeholder
  }

  private async validateVisualPositioning(sessionId?: string): Promise<{
    missingPositions: number;
  }> {
    // Implementation would check visual positioning data
    return { missingPositions: 0 }; // Placeholder
  }

  private async validateCanvasRendering(): Promise<number> {
    // Implementation would validate canvas rendering consistency
    return 0; // Placeholder
  }

  private async validateInteractionConsistency(): Promise<boolean> {
    // Implementation would check interaction state persistence
    return true; // Placeholder
  }

  private async generateSessionSummary(): Promise<SessionGraphSummary> {
    // Implementation would generate comprehensive session summary
    return {
      totalSessions: 0,
      activeGraphSessions: 0,
      avgNodesPerSession: 0,
      avgRelationshipsPerSession: 0,
      csvImportFailures: 0,
      visualNetworkErrors: 0
    }; // Placeholder
  }

  private generateRecommendations(components: GraphComponentStatus[]): string[] {
    const recommendations: string[] = [];

    // CSV Import recommendations
    const csvComponent = components.find(c => c.name === 'CSV Import Integrity');
    if (csvComponent && csvComponent.status !== 'healthy') {
      recommendations.push('Review CSV import transaction safety and data validation');
      recommendations.push('Implement comprehensive error handling for bulk operations');
    }

    // Node data recommendations
    const nodeComponent = components.find(c => c.name === 'Node Data Consistency');
    if (nodeComponent && nodeComponent.status !== 'healthy') {
      recommendations.push('Clean up orphaned nodes and rebuild relationships');
      recommendations.push('Validate node ID format consistency');
    }

    // Relationship recommendations
    const relationshipComponent = components.find(c => c.name === 'Relationship Integrity');
    if (relationshipComponent && relationshipComponent.status !== 'healthy') {
      recommendations.push('Resolve cyclic relationships in prerequisite chains');
      recommendations.push('Add missing relationship explanations');
    }

    // Session scoping recommendations
    const sessionComponent = components.find(c => c.name === 'Session Scoping');
    if (sessionComponent && sessionComponent.status !== 'healthy') {
      recommendations.push('Audit session isolation and fix data leaks');
      recommendations.push('Update session expiry to 100-year permanent standard');
    }

    // Visual network recommendations
    const visualComponent = components.find(c => c.name === 'Visual Network Consistency');
    if (visualComponent && visualComponent.status !== 'healthy') {
      recommendations.push('Rebuild visual positioning data for affected nodes');
      recommendations.push('Test canvas rendering with different graph sizes');
    }

    return recommendations;
  }

  private calculateOverallHealth(components: GraphComponentStatus[]): {
    overall: 'healthy' | 'warning' | 'critical';
    score: number;
  } {
    const criticalComponents = components.filter(c => c.status === 'critical').length;
    const warningComponents = components.filter(c => c.status === 'warning').length;

    if (criticalComponents > 0) {
      return { overall: 'critical', score: Math.max(0, 70 - (criticalComponents * 20)) };
    }

    if (warningComponents > 0) {
      return { overall: 'warning', score: Math.max(70, 90 - (warningComponents * 5)) };
    }

    const avgCompleteness = components.reduce((sum, c) => sum + c.completeness, 0) / components.length;
    return { overall: 'healthy', score: Math.round(avgCompleteness) };
  }
}