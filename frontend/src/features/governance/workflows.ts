import { bi, assessmentOutcome, type Outcome, type Workspace } from './model';
import { requirements } from './fixtures';
import type { Assessment } from './model';

export function applyAutomatedAssessment(d: Workspace, result: Assessment) {
  d.assessments = [result, ...d.assessments.filter((assessment) => assessment.systemId !== result.systemId || assessment.state !== 'pending')];
  d.audit.unshift({
    id: `EVT-${crypto.randomUUID().slice(0, 8)}`,
    date: new Date().toISOString(),
    actor: 'AI Assessment Engine',
    action: bi('Automated assessment completed', 'Évaluation automatisée terminée'),
    resource: result.id,
    result: 'Success',
    correlationId: crypto.randomUUID(),
  });
}
export function addAssessment(d: Workspace, systemId: string) {
  if (!d.systems.some((s) => s.id === systemId)) throw new Error('Unknown system');
  if (d.assessments.some((a) => a.systemId === systemId && a.state === 'pending')) return;
  d.assessments.unshift({
    id: `ASM-${crypto.randomUUID().slice(0, 6).toUpperCase()}`,
    systemId,
    date: new Date().toISOString(),
    reviewer: 'Alex Morgan',
    state: 'pending',
    findings: requirements.map((r) => ({
      id: crypto.randomUUID(),
      requirementId: r.id,
      outcome: 'insufficient',
      reason: bi(
        'Awaiting supporting evidence and human assessment.',
        'En attente de preuves et d’une évaluation humaine.',
      ),
    })),
  });
}

export function reviewFinding(
  d: Workspace,
  assessmentId: string,
  findingId: string,
  outcome: Outcome,
  rationale: string,
) {
  const a = d.assessments.find((a) => a.id === assessmentId);
  if (!a || a.state !== 'pending') throw new Error('Assessment is not pending');
  const f = a.findings.find((f) => f.id === findingId);
  if (!f) throw new Error('Unknown finding');
  if (!rationale.trim()) throw new Error('Rationale required');
  f.outcome = outcome;
  f.reason = bi(rationale.trim());
}
export function recordDecision(
  d: Workspace,
  assessmentId: string,
  decision: 'approved' | 'rejected',
  rationale: string,
) {
  const a = d.assessments.find((a) => a.id === assessmentId);
  if (!a || a.state !== 'pending') throw new Error('Assessment is not pending');
  if (!rationale.trim()) throw new Error('Rationale required');
  a.state = decision;
  a.rationale = rationale.trim();
  a.reviewer = 'Alex Morgan';
  if (decision === 'approved') {
    const system = d.systems.find((s) => s.id === a.systemId);
    if (!system) throw new Error('Unknown system');
    system.status = assessmentOutcome(a);
    system.updated = new Date().toISOString().slice(0, 10);
  }
}
