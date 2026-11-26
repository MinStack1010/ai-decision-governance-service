const fs = require('node:fs');
const path = require('node:path');
const { z } = require('zod');
const schemas = require('../.test-build/src/features/monitoring/schemas/index.js');
const names = {
  AIConnection: schemas.connectionSchema,
  AIConnectionEvent: schemas.eventSchema,
  AIDecisionEvent: schemas.decisionSchema,
  AIConnectionHealth: schemas.healthSchema,
  AIConnectionMetric: schemas.metricSchema,
  ConnectionTestResult: schemas.testResultSchema,
  ConnectorConfiguration: schemas.configurationSchema,
};
const components = Object.fromEntries(
  Object.entries(names).map(([name, schema]) => [name, z.toJSONSchema(schema)]),
);
components.MonitoringSummary = {
  type: 'object',
  required: [
    'connectedSystems',
    'decisionsProcessed',
    'averageLatencyMs',
    'activeAlerts',
    'requestsCount',
    'errorRate',
  ],
  properties: {
    connectedSystems: { type: 'integer', minimum: 0 },
    decisionsProcessed: { type: 'integer', minimum: 0 },
    averageLatencyMs: { type: ['number', 'null'], minimum: 0 },
    activeAlerts: { type: 'integer', minimum: 0 },
    requestsCount: { type: 'integer', minimum: 0 },
    errorRate: { type: ['number', 'null'], minimum: 0, maximum: 1 },
  },
};
components.Error = {
  type: 'object',
  required: ['error'],
  properties: {
    error: {
      type: 'object',
      required: ['code', 'message', 'correlationId'],
      properties: {
        code: { type: 'string' },
        message: { type: 'string' },
        correlationId: { type: 'string' },
        fieldErrors: { type: 'object', additionalProperties: { type: 'string' } },
      },
    },
  },
};
const ref = (name) => ({ $ref: `#/components/schemas/${name}` });
const tenant = {
  in: 'header',
  name: 'X-Organization-ID',
  required: true,
  schema: { type: 'string', minLength: 1 },
  description: 'Workspace selection only. Backend must authorize membership independently.',
};
const identifier = { in: 'path', name: 'id', required: true, schema: { type: 'string' } };
const error = {
  description: 'Request rejected or service unavailable',
  content: { 'application/json': { schema: ref('Error') } },
};
function operation(summary, name, array = false, post = false, id = false) {
  return {
    summary,
    parameters: [tenant, ...(id ? [identifier] : [])],
    responses: {
      200: {
        description: 'Successful backend response',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['data'],
              properties: {
                data: array ? { type: 'array', items: ref(name) } : ref(name),
                meta: { type: 'object', properties: { lastEventId: { type: ['string', 'null'] } } },
              },
            },
          },
        },
      },
      400: error,
      401: error,
      403: error,
      404: error,
      409: error,
      503: error,
    },
    ...(post
      ? {
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object' } } },
          },
        }
      : {}),
  };
}
const base = '/api/v1/monitoring';
const paths = {};
paths[`${base}/connections`] = {
  get: operation('List authorized workspace connections', 'AIConnection', true),
  post: {
    ...operation('Create or replace system connector metadata', 'AIConnection', false, true),
    requestBody: {
      required: true,
      content: { 'application/json': { schema: ref('ConnectorConfiguration') } },
    },
  },
};
paths[`${base}/connections/{id}`] = {
  get: operation('Read connection metadata', 'AIConnection', false, false, true),
};
paths[`${base}/connections/{id}/health`] = {
  get: operation(
    'Read backend health result; simulated must be false in live mode',
    'AIConnectionHealth',
    false,
    false,
    true,
  ),
};
paths[`${base}/connections/{id}/metrics`] = {
  get: {
    ...operation('Read windowed normalized metrics', 'AIConnectionMetric', false, false, true),
    parameters: [
      tenant,
      identifier,
      { in: 'query', name: 'minutes', schema: { type: 'integer', enum: [5, 15], default: 15 } },
    ],
  },
};
paths[`${base}/connections/{id}/test`] = {
  post: operation(
    'Run an authorized backend-only provider connection test',
    'ConnectionTestResult',
    false,
    true,
    true,
  ),
};
paths[`${base}/connections/{id}/reconnect`] = {
  post: operation('Request a backend reconnection', 'AIConnection', false, true, true),
};
paths[`${base}/connections/test-configuration`] = {
  post: {
    ...operation(
      'Validate proposed metadata and test through backend',
      'ConnectionTestResult',
      false,
      true,
    ),
    requestBody: {
      required: true,
      content: { 'application/json': { schema: ref('ConnectorConfiguration') } },
    },
  },
};
paths[`${base}/events`] = {
  get: {
    ...operation(
      'Return up to 240 events and a durable recovery cursor',
      'AIConnectionEvent',
      true,
    ),
    description:
      'meta.lastEventId is the server append-log cursor, not a timestamp sort key. SSE resumes after this cursor. The frontend orders display by timestamp.',
  },
};
paths[`${base}/summary`] = {
  get: operation(
    'Derive summary from the same tenant event snapshot and window',
    'MonitoringSummary',
  ),
};
paths[`${base}/stream`] = {
  get: {
    summary: 'Authenticated one-way SSE monitoring stream',
    parameters: [
      tenant,
      {
        in: 'header',
        name: 'Last-Event-ID',
        required: false,
        schema: { type: 'string', maxLength: 512, pattern: '^[^\r\n]*$' },
      },
    ],
    responses: {
      200: {
        description:
          'UTF-8 event stream. id must equal event.id. Send comment or heartbeat frame at least every 10 seconds; events use the AIConnectionEvent schema. No raw prompts/responses.',
        content: { 'text/event-stream': { schema: { type: 'string' } } },
      },
      401: error,
      403: error,
      409: {
        description: 'Cursor unavailable; refresh REST snapshot and reconnect without old cursor',
      },
      410: {
        description: 'Cursor expired; refresh REST snapshot and reconnect without old cursor',
      },
      503: error,
    },
  },
};
const document = {
  openapi: '3.1.0',
  info: {
    title: 'AI Governance monitoring API — proposed frontend contract',
    version: '0.1.0',
    description:
      'Backend readiness contract, not a deployed FastAPI service. Runtime Zod validation also checks cross-field tenant/system/decision references not expressible by the generated schemas.',
  },
  servers: [{ url: '/' }],
  security: [{ sessionCookie: [] }],
  paths,
  components: {
    securitySchemes: {
      sessionCookie: {
        type: 'apiKey',
        in: 'cookie',
        name: 'session',
        description:
          'Proposed HttpOnly, Secure, SameSite session cookie. Final authentication architecture must be agreed with the backend.',
      },
    },
    schemas: components,
  },
};
fs.writeFileSync(
  path.resolve(__dirname, '../../docs/frontend/monitoring-openapi.json'),
  JSON.stringify(document, null, 2) + '\n',
);
console.log('Generated docs/frontend/monitoring-openapi.json');
