import { z } from 'zod';
import { textSchema } from '../../governance/model';
import { connectionStatuses, providerTypes, capabilities, eventTypes } from '../types';
const timestamp = z.string().datetime({ offset: true });
const model = z.object({ id: z.string().min(1), version: z.string().min(1) });
const endpoint = z.object({
  url: z.string(),
  label: z.string(),
  credentialConfigured: z.boolean(),
});
export const connectionSchema = z.object({
  id: z.string().min(1),
  organizationId: z.string().min(1),
  systemId: z.string().min(1),
  provider: z.enum(providerTypes),
  modelReference: model,
  deploymentReference: z.string().min(1),
  status: z.enum(connectionStatuses),
  endpoint,
  capabilities: z.array(z.enum(capabilities)),
  lastSuccessfulHealthCheck: timestamp.nullable(),
  lastHeartbeat: timestamp.nullable(),
  lastEventReceived: timestamp.nullable(),
  averageLatencyMs: z.number().nonnegative().nullable(),
  errorRate: z.number().min(0).max(1).nullable(),
  requestsCount: z.number().int().nonnegative(),
  createdAt: timestamp,
  updatedAt: timestamp,
});
export const decisionSchema = z.object({
  id: z.string().min(1),
  organizationId: z.string(),
  systemId: z.string(),
  connectionId: z.string(),
  timestamp,
  modelReference: model,
  deploymentReference: z.string(),
  latencyMs: z.number().nonnegative(),
  success: z.boolean(),
  traceId: z.string(),
  assessmentId: z.string().nullable(),
  evidenceIds: z.array(z.string()),
  inputReference: z.string().optional(),
  outputReference: z.string().optional(),
});
export const eventSchema = z
  .object({
    id: z.string().min(1),
    type: z.enum(eventTypes),
    organizationId: z.string().min(1),
    systemId: z.string().min(1),
    connectionId: z.string().min(1),
    timestamp,
    severity: z.enum(['INFO', 'WARNING', 'ERROR', 'CRITICAL']),
    description: textSchema,
    relatedResourceId: z.string().min(1),
    relatedResourceType: z.enum([
      'decision',
      'assessment',
      'policy',
      'impact',
      'risk',
      'review',
      'evidence',
      'connection',
      'system',
    ]),
    correlationId: z.string().nullable(),
    decision: decisionSchema.optional(),
  })
  .superRefine((e, ctx) => {
    if (['DECISION_PROCESSED', 'DECISION_FAILED'].includes(e.type) && !e.decision)
      ctx.addIssue({ code: 'custom', message: 'Decision metadata required' });
    if (
      e.decision &&
      (e.relatedResourceType !== 'decision' ||
        e.timestamp !== e.decision.timestamp ||
        (e.type === 'DECISION_PROCESSED' && !e.decision.success) ||
        (e.type === 'DECISION_FAILED' && e.decision.success))
    )
      ctx.addIssue({ code: 'custom', message: 'Decision event mismatch' });
    if (
      e.decision &&
      (e.organizationId !== e.decision.organizationId ||
        e.systemId !== e.decision.systemId ||
        e.connectionId !== e.decision.connectionId ||
        e.relatedResourceId !== e.decision.id)
    )
      ctx.addIssue({ code: 'custom', message: 'Decision references mismatch' });
  });
export const healthSchema = z.object({
  connectionId: z.string(),
  organizationId: z.string(),
  status: z.enum(connectionStatuses),
  checkedAt: timestamp,
  lastHeartbeat: timestamp.nullable(),
  message: textSchema,
  simulated: z.boolean(),
});
export const metricSchema = z.object({
  connectionId: z.string(),
  organizationId: z.string(),
  windowStart: timestamp,
  windowEnd: timestamp,
  averageLatencyMs: z.number().nonnegative().nullable(),
  errorRate: z.number().min(0).max(1).nullable(),
  requestsCount: z.number().int().nonnegative(),
  decisionCount: z.number().int().nonnegative(),
});
export const testResultSchema = z.object({
  success: z.boolean(),
  simulated: z.boolean(),
  checkedAt: timestamp,
  message: textSchema,
  connection: connectionSchema,
});
export const configurationSchema = z.object({
  organizationId: z.string().min(1),
  systemId: z.string().min(1),
  provider: z.enum(providerTypes),
  modelReference: model,
  deploymentReference: z.string().trim().min(1).max(150),
  endpoint,
  capabilities: z.array(z.enum(capabilities)).min(1),
});
