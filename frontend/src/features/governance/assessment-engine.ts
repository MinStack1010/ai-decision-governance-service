import { requirements } from './fixtures';
import { bi, type Assessment, type Finding, type Workspace } from './model';

export type AssessmentTrigger = 'on_demand' | 'scheduled' | 'change_detected';

export function runAutomatedAssessment(
  workspace: Workspace,
  systemId: string,
  trigger: AssessmentTrigger = 'on_demand',
  now = new Date(),
): Assessment {
  const system = workspace.systems.find((item) => item.id === systemId);
  if (!system) throw new Error(`Unknown AI system: ${systemId}`);

  const collectedAt = now.toISOString();
  const linkedEvidence = workspace.evidence.filter((item) => item.systemId === systemId);
  const sourceSnapshot = [
    {
      id: system.id,
      sourceType: 'ai_system_registry',
      label: `Registry record ${system.id}`,
      collectedAt,
      version: system.updated,
    },
    {
      id: `${system.id}:risk`,
      sourceType: 'risk_management',
      label: `Recorded risk level: ${system.risk}`,
      collectedAt,
      version: system.updated,
    },
    {
      id: `${system.id}:traceability`,
      sourceType: 'decision_traceability',
      label: 'Policy, control and decision lineage metadata available in workspace',
      collectedAt,
      version: system.updated,
    },
    ...workspace.policies.map((policy) => ({
      id: policy.id,
      sourceType: 'policies_controls',
      label: `${policy.name.en} v${policy.version}`,
      collectedAt,
      version: policy.version,
    })),
    ...linkedEvidence.map((evidence) => ({
      id: evidence.id,
      sourceType: `evidence_reference:${evidence.type.toLowerCase().replace(' ', '_')}`,
      label: evidence.name,
      collectedAt: `${evidence.date}T00:00:00.000Z`,
      version: evidence.date,
    })),
    ...workspace.audit
      .filter((event) => event.resource === systemId)
      .slice(0, 20)
      .map((event) => ({
        id: event.id,
        sourceType: 'application_audit_log',
        label: event.action.en,
        collectedAt: event.date,
        version: event.correlationId,
      })),
  ];

  const findings: Finding[] = requirements.map((requirement) => {
    const evidence = linkedEvidence.filter((item) => item.requirementId === requirement.id);
    const hasEvidence = evidence.length > 0;
    const highRiskGap = system.risk === 'high' && evidence.length < 2;
    const outcome = !hasEvidence ? 'insufficient' : highRiskGap ? 'partial' : 'compliant';
    const confidence = !hasEvidence ? null : highRiskGap ? 0.7 : 0.95;
    const analysis = hasEvidence
      ? `The engine matched ${evidence.length} linked evidence reference${evidence.length === 1 ? '' : 's'} to ${requirement.id}. The result is based on recorded registry, policy and evidence metadata; no unsupported legal conclusion is made.`
      : `No evidence reference is linked to ${requirement.id} for ${system.name.en}. The engine cannot determine compliance from the available sources.`;
    const reason = !hasEvidence
      ? bi('Unable to determine: no linked evidence was collected for this control.', 'Impossible à déterminer : aucune preuve liée n’a été recueillie pour ce contrôle.')
      : highRiskGap
        ? bi('Partially met: evidence exists, but the high-risk system requires additional corroboration.', 'Partiellement satisfait : des preuves existent, mais le système à risque élevé nécessite une corroboration supplémentaire.')
        : bi('Met based on the linked evidence reference and available governance metadata.', 'Satisfait selon la référence de preuve liée et les métadonnées de gouvernance disponibles.');
    return {
      id: `F-${systemId}-${requirement.id}-${now.getTime()}`,
      requirementId: requirement.id,
      outcome,
      reason,
      applicableRequirement: requirement.title,
      analysis: bi(analysis),
      evidenceSourceIds: evidence.map((item) => item.id),
      confidence,
      risks: outcome === 'insufficient' || outcome === 'partial' ? [bi('Evidence coverage gap may delay a defensible compliance decision.', 'Une lacune de couverture des preuves peut retarder une décision de conformité défendable.')] : [],
      recommendedActions: outcome === 'insufficient' || outcome === 'partial' ? [bi(`Collect and link evidence for ${requirement.id}, then request reassessment.`, `Recueillir et lier des preuves pour ${requirement.id}, puis demander une réévaluation.`)] : [],
      assessedAt: collectedAt,
      humanReviewStatus: outcome === 'compliant' ? 'pending' : 'pending',
    };
  });

  const stages = [
    'collecting_data',
    'identifying_requirements',
    'retrieving_evidence',
    'evaluating_controls',
    'generating_findings',
    'preparing_results',
  ] as const;
  const stageEvents = stages.map((stage) => ({
    stage,
    startedAt: collectedAt,
    completedAt: collectedAt,
    sourceCount: sourceSnapshot.length,
  }));

  return {
    id: `ASM-AI-${systemId}-${now.getTime()}`,
    systemId,
    date: collectedAt,
    reviewer: system.owner,
    state: 'pending',
    findings,
    rationale: 'Generated by the evidence-based assessment engine. Human review is required before approval.',
    trigger,
    engineVersion: 'rules-1.0',
    executionStatus: 'completed',
    stageEvents,
    sourceSnapshot,
  };
}
