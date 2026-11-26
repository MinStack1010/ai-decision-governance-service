import { z } from 'zod';
export const textSchema = z.object({ en: z.string(), fr: z.string() });
export type Text = z.infer<typeof textSchema>;
export const bi = (en: string, fr = en): Text => ({ en, fr });
export const outcomes = ['compliant', 'partial', 'noncompliant', 'insufficient', 'na'] as const;
export type Outcome = (typeof outcomes)[number];
export const outcomeLabels: Record<Outcome, Text> = {
  compliant: bi('Compliant', 'Conforme'),
  partial: bi('Partially compliant', 'Partiellement conforme'),
  noncompliant: bi('Non-compliant', 'Non conforme'),
  insufficient: bi('Insufficient evidence', 'Preuves insuffisantes'),
  na: bi('Not applicable', 'Sans objet'),
};
export const systemSchema = z.object({
  id: z.string(),
  name: textSchema,
  owner: z.string(),
  department: textSchema,
  risk: z.enum(['low', 'medium', 'high']),
  status: z.enum(outcomes),
  purpose: textSchema,
  updated: z.string(),
});
export type AISystem = z.infer<typeof systemSchema>;
export const policySchema = z.object({
  id: z.string(),
  name: textSchema,
  version: z.string(),
  state: z.enum(['approved', 'pending']),
  owner: z.string(),
  sourceFile: z
    .object({
      name: z.string(),
      type: z.enum(['PDF', 'Word', 'Excel']),
      size: z.number().nonnegative(),
      lastModified: z.string().optional(),
    })
    .optional(),
});
export type Policy = z.infer<typeof policySchema>;
export const requirementSchema = z.object({
  id: z.string(),
  policyId: z.string(),
  title: textSchema,
  description: textSchema,
});
export type Requirement = z.infer<typeof requirementSchema>;
export const findingSchema = z.object({
  id: z.string(),
  requirementId: z.string(),
  outcome: z.enum(outcomes),
  reason: textSchema,
});
export type Finding = z.infer<typeof findingSchema>;
export const assessmentSchema = z.object({
  id: z.string(),
  systemId: z.string(),
  date: z.string(),
  reviewer: z.string(),
  state: z.enum(['pending', 'approved', 'rejected']),
  findings: z.array(findingSchema).min(1),
  rationale: z.string().optional(),
});
export type Assessment = z.infer<typeof assessmentSchema>;
export const evidenceSchema = z.object({
  id: z.string(),
  name: z.string(),
  systemId: z.string(),
  requirementId: z.string(),
  type: z.enum(['Document', 'Test report', 'Record']),
  date: z.string(),
  owner: z.string(),
  size: z.number().optional(),
  expiresAt: z.string().datetime({ offset: true }).optional(),
});
export type Evidence = z.infer<typeof evidenceSchema>;
export const taskSchema = z.object({
  id: z.string(),
  systemId: z.string(),
  title: textSchema,
  owner: z.string(),
  due: z.string(),
  state: z.enum(['open', 'in-progress', 'closed']),
});
export type Task = z.infer<typeof taskSchema>;
export const auditSchema = z.object({
  id: z.string(),
  date: z.string(),
  actor: z.string(),
  action: textSchema,
  resource: z.string(),
  result: z.enum(['Success', 'Failed']),
  correlationId: z.string(),
});
export type Audit = z.infer<typeof auditSchema>;
export const workspaceSchema = z.object({
  systems: z.array(systemSchema),
  policies: z.array(policySchema),
  assessments: z.array(assessmentSchema),
  evidence: z.array(evidenceSchema),
  tasks: z.array(taskSchema),
  audit: z.array(auditSchema),
  integrations: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      connected: z.boolean(),
      synced: z.string().nullable(),
    }),
  ),
});
export type Workspace = z.infer<typeof workspaceSchema>;
export function assessmentOutcome(a: Assessment): Outcome {
  if (!a.findings.length) return 'insufficient';
  for (const status of ['noncompliant', 'partial', 'insufficient'] as const)
    if (a.findings.some((f) => f.outcome === status)) return status;
  return a.findings.every((f) => f.outcome === 'na') ? 'na' : 'compliant';
}
export const routes = [
  { path: 'dashboard', name: bi('Overview', 'Vue d’ensemble'), group: 0 },
  { path: 'registry', name: bi('AI system registry', 'Registre des systèmes IA'), group: 0 },
  { path: 'monitoring', name: bi('Live monitoring', 'Surveillance en temps réel'), group: 0 },
  { path: 'policies', name: bi('Policies & controls', 'Politiques et contrôles'), group: 0 },
  { path: 'assessments', name: bi('Assessments', 'Évaluations'), group: 1 },
  { path: 'impact', name: bi('Policy impact', 'Impact des politiques'), group: 1 },
  { path: 'evidence', name: bi('Evidence', 'Éléments probants'), group: 1 },
  {
    path: 'traceability',
    name: bi('Decision traceability', 'Traçabilité des décisions'),
    group: 1,
  },
  { path: 'risks', name: bi('Risk management', 'Gestion des risques'), group: 1 },
  { path: 'reviews', name: bi('Human review', 'Examen humain'), group: 2 },
  { path: 'remediation', name: bi('Remediation', 'Mesures correctives'), group: 2 },
  { path: 'reports', name: bi('Reports', 'Rapports'), group: 2 },
  { path: 'audit', name: bi('Audit logs', 'Journaux d’audit'), group: 2 },
  { path: 'integrations', name: bi('Integrations', 'Intégrations'), group: 3 },
  { path: 'settings', name: bi('Settings', 'Paramètres'), group: 3 },
];
