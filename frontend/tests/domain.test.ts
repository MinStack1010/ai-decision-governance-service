import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seedWorkspace } from '../src/features/governance/fixtures';
import {
  assessmentOutcome,
  workspaceSchema,
  bi,
  type Outcome,
} from '../src/features/governance/model';
import { addAssessment, recordDecision, reviewFinding } from '../src/features/governance/workflows';
import {
  isSupportedPolicyDocument,
  policyDocumentType,
} from '../src/features/governance/policy-documents';
for (const expected of ['compliant', 'partial', 'noncompliant', 'insufficient', 'na'] as const) {
  test(`All controls ${expected} produce ${expected}`, () => {
    const a = seedWorkspace().assessments[0];
    a.findings.forEach((f) => (f.outcome = expected));
    assert.equal(assessmentOutcome(a), expected);
  });
}
test('Worst finding takes precedence, and empty assessments cannot imply compliance', () => {
  const a = seedWorkspace().assessments[0];
  a.findings[0].outcome = 'noncompliant';
  a.findings[1].outcome = 'insufficient';
  assert.equal(assessmentOutcome(a), 'noncompliant');
  a.findings = [];
  assert.equal(assessmentOutcome(a), 'insufficient');
});
test('Reassessment queue does not duplicate pending work', () => {
  const d = seedWorkspace();
  const n = d.assessments.length;
  addAssessment(d, 'SYS-001');
  assert.equal(d.assessments.length, n);
  addAssessment(d, 'SYS-002');
  assert.equal(d.assessments.length, n + 1);
  addAssessment(d, 'SYS-002');
  assert.equal(d.assessments.length, n + 1);
  assert.ok(d.assessments[0].findings.every((f) => f.outcome === 'insufficient'));
});
test('Unknown systems cannot create orphan assessments', () => {
  const d = seedWorkspace();
  const n = d.assessments.length;
  assert.throws(() => addAssessment(d, 'MISSING'));
  assert.equal(d.assessments.length, n);
});
test('Approval records human rationale while retaining non-compliant outcomes', () => {
  const d = seedWorkspace();
  const a = d.assessments.find((a) => a.systemId === 'SYS-003')!;
  recordDecision(d, a.id, 'approved', 'Reviewed the unresolved exception.');
  assert.equal(a.state, 'approved');
  assert.equal(a.reviewer, 'Alex Morgan');
  assert.equal(a.rationale, 'Reviewed the unresolved exception.');
  assert.equal(d.systems.find((s) => s.id === 'SYS-003')!.status, 'noncompliant');
});
test('Rejection does not publish a different system compliance outcome', () => {
  const d = seedWorkspace();
  const a = d.assessments[0];
  a.findings.forEach((f) => (f.outcome = 'compliant'));
  recordDecision(d, a.id, 'rejected', 'Need supporting references.');
  assert.equal(d.systems[0].status, 'partial');
  assert.equal(a.state, 'rejected');
});
test('Approved findings cannot be silently edited or reviewed twice', () => {
  const d = seedWorkspace();
  const a = d.assessments[1];
  assert.throws(() => reviewFinding(d, a.id, a.findings[0].id, 'compliant', 'New conclusion'));
  assert.throws(() => recordDecision(d, a.id, 'approved', 'Repeated'));
});
test('Reviewing a pending finding updates its rationale but awaits final approval', () => {
  const d = seedWorkspace();
  const a = d.assessments[0];
  reviewFinding(d, a.id, a.findings[1].id, 'compliant', '  Evidence checked.  ');
  assert.equal(a.findings[1].reason.en, 'Evidence checked.');
  assert.equal(d.systems[0].status, 'partial');
  recordDecision(d, a.id, 'approved', 'Reviewed all findings.');
  assert.equal(d.systems[0].status, 'compliant');
});
test('Missing rationale blocks finding edits and decisions', () => {
  const d = seedWorkspace();
  const a = d.assessments[0];
  assert.throws(() => reviewFinding(d, a.id, a.findings[0].id, 'compliant', '  '));
  assert.throws(() => recordDecision(d, a.id, 'approved', ''));
});
test('Linking evidence does not automatically infer compliance', () => {
  const d = seedWorkspace();
  const before = d.systems[0].status;
  d.evidence.push({
    id: 'EVD-test',
    name: 'test.pdf',
    systemId: d.systems[0].id,
    requirementId: 'REQ-02',
    type: 'Document',
    date: '2026-11-24',
    owner: 'Alex Morgan',
  });
  assert.equal(d.systems[0].status, before);
});
test('Workspace seeds are independent, and empty research retains policies only', () => {
  const a = seedWorkspace(),
    b = seedWorkspace(),
    research = seedWorkspace(true);
  a.systems[0].owner = 'Changed';
  assert.notEqual(a.systems[0].owner, b.systems[0].owner);
  assert.equal(research.systems.length, 0);
  assert.equal(research.assessments.length, 0);
  assert.equal(research.policies.length, 3);
});
test('Persistence schema accepts valid data and rejects invalid outcomes or empty findings', () => {
  const d = seedWorkspace();
  assert.ok(workspaceSchema.safeParse(d).success);
  const invalid = structuredClone(d);
  invalid.systems[0].status = 'unknown' as Outcome;
  assert.equal(workspaceSchema.safeParse(invalid).success, false);
  d.assessments[0].findings = [];
  assert.equal(workspaceSchema.safeParse(d).success, false);
});
test('Policy document import accepts PDF, Word and Excel extensions only', () => {
  assert.equal(policyDocumentType('automated-decision-policy.pdf'), 'PDF');
  assert.equal(policyDocumentType('automated-decision-policy.docx'), 'Word');
  assert.equal(policyDocumentType('controls.xlsx'), 'Excel');
  assert.equal(isSupportedPolicyDocument('controls.xls'), true);
  assert.equal(isSupportedPolicyDocument('policy.exe'), false);
  assert.equal(policyDocumentType('policy'), null);
});
