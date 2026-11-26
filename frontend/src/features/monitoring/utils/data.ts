import { bi } from '../../governance/model';
import type {
  AIConnectionEvent,
  MonitoringSnapshot,
  MonitoringSummary,
  MonitoringAlert,
  AIConnection,
  MonitoringCapability,
  ConnectorConfiguration,
  Severity,
} from '../types';
import { providers } from './labels';
export const EVENT_LIMIT = 240;
export const ALERT_LIMIT = 60;
export function mergeEvents(
  current: AIConnectionEvent[],
  incoming: AIConnectionEvent[],
  org: string,
  limit = EVENT_LIMIT,
) {
  const map = new Map(current.filter((e) => e.organizationId === org).map((e) => [e.id, e]));
  for (const event of incoming)
    if (event.organizationId === org && !map.has(event.id)) map.set(event.id, event);
  return [...map.values()]
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp) || b.id.localeCompare(a.id))
    .slice(0, limit);
}
export function filterEvents(
  events: AIConnectionEvent[],
  filters: {
    systemId?: string;
    severity?: string;
    type?: string;
    connectionId?: string;
    since?: number;
  },
) {
  return events.filter(
    (e) =>
      (!filters.systemId || filters.systemId === 'all' || e.systemId === filters.systemId) &&
      (!filters.severity || filters.severity === 'all' || e.severity === filters.severity) &&
      (!filters.type || filters.type === 'all' || e.type === filters.type) &&
      (!filters.connectionId || e.connectionId === filters.connectionId) &&
      (!filters.since || Date.parse(e.timestamp) >= filters.since),
  );
}
export function summarize(
  snapshot: MonitoringSnapshot,
  minutes: number,
  now: number,
): MonitoringSummary {
  const decisions = snapshot.events
    .filter(
      (e) =>
        e.decision &&
        Date.parse(e.timestamp) >= now - minutes * 60000 &&
        Date.parse(e.timestamp) <= now,
    )
    .map((e) => e.decision!);
  return {
    connectedSystems: new Set(
      snapshot.connections.filter((c) => c.status === 'CONNECTED').map((c) => c.systemId),
    ).size,
    decisionsProcessed: decisions.filter((d) => d.success).length,
    requestsCount: decisions.length,
    averageLatencyMs: decisions.length
      ? Math.round(decisions.reduce((n, d) => n + d.latencyMs, 0) / decisions.length)
      : null,
    errorRate: decisions.length
      ? decisions.filter((d) => !d.success).length / decisions.length
      : null,
    activeAlerts: snapshot.alerts.filter((a) => a.state === 'OPEN').length,
  };
}
export function activityBuckets(events: AIConnectionEvent[], minutes: number, now: number) {
  const count = 10,
    size = (minutes * 60000) / count,
    start = now - minutes * 60000;
  return Array.from({ length: count }, (_, i) => {
    const time = start + i * size;
    const rows = events.filter(
      (e) =>
        e.decision &&
        Date.parse(e.timestamp) >= time &&
        (i === count - 1 ? Date.parse(e.timestamp) <= now : Date.parse(e.timestamp) < time + size),
    );
    return {
      time: new Date(time).toISOString(),
      processed: rows.filter((e) => e.decision!.success).length,
      failed: rows.filter((e) => !e.decision!.success).length,
    };
  });
}
export function alertsFromEvents(events: AIConnectionEvent[]): MonitoringAlert[] {
  return events
    .filter((e) =>
      [
        'COMPLIANCE_VIOLATION_DETECTED',
        'RISK_THRESHOLD_EXCEEDED',
        'EVIDENCE_EXPIRED',
        'CONNECTOR_SYNC_FAILED',
      ].includes(e.type),
    )
    .slice(0, ALERT_LIMIT)
    .map((e) => ({
      id: `ALT-${e.id}`,
      organizationId: e.organizationId,
      systemId: e.systemId,
      connectionId: e.connectionId,
      sourceEventId: e.id,
      severity: e.severity,
      title: e.description,
      timestamp: e.timestamp,
      state: 'OPEN',
      relatedResourceId: e.relatedResourceId,
      relatedResourceType: e.relatedResourceType,
      taskId: null,
    }));
}
export function applyEvent(
  snapshot: MonitoringSnapshot,
  event: AIConnectionEvent,
  org: string,
): MonitoringSnapshot {
  if (
    event.organizationId !== org ||
    snapshot.events.some((e) => e.id === event.id) ||
    !snapshot.connections.some((c) => c.id === event.connectionId && c.systemId === event.systemId)
  )
    return snapshot;
  const events = mergeEvents(snapshot.events, [event], org);
  const connections = snapshot.connections.map((c) => {
    if (c.id !== event.connectionId) return c;
    const latest = !c.lastEventReceived || event.timestamp >= c.lastEventReceived;
    const decisions = events
      .filter((e) => e.connectionId === c.id && e.decision)
      .map((e) => e.decision!);
    const next: AIConnection = {
      ...c,
      lastEventReceived: latest ? event.timestamp : c.lastEventReceived,
      updatedAt: event.timestamp > c.updatedAt ? event.timestamp : c.updatedAt,
      requestsCount: decisions.length,
      averageLatencyMs: decisions.length
        ? Math.round(decisions.reduce((n, d) => n + d.latencyMs, 0) / decisions.length)
        : null,
      errorRate: decisions.length
        ? decisions.filter((d) => !d.success).length / decisions.length
        : null,
    };
    if (latest) {
      if (event.type === 'CONNECTION_LOST') next.status = 'DISCONNECTED';
      if (event.type === 'CONNECTION_ESTABLISHED') next.status = 'CONNECTED';
      if (event.type === 'HEARTBEAT_RECEIVED') {
        next.lastHeartbeat = event.timestamp;
      }
      if (event.type === 'CONNECTOR_SYNC_FAILED') next.status = 'DEGRADED';
    }
    return next;
  });
  const newAlerts = alertsFromEvents([event]);
  const alerts = [...newAlerts, ...snapshot.alerts]
    .filter((a, i, all) => all.findIndex((b) => a.id === b.id) === i)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, ALERT_LIMIT);
  return {
    connections,
    events,
    alerts,
    updatedAt:
      !snapshot.updatedAt || event.timestamp > snapshot.updatedAt
        ? event.timestamp
        : snapshot.updatedAt,
  };
}
export function eventHref(
  e: Pick<
    AIConnectionEvent,
    'relatedResourceId' | 'relatedResourceType' | 'systemId' | 'connectionId'
  >,
) {
  const id = encodeURIComponent(e.relatedResourceId),
    system = encodeURIComponent(e.systemId);
  switch (e.relatedResourceType) {
    case 'decision':
      return `/traceability?decision=${id}&system=${system}`;
    case 'assessment':
      return `/assessments?record=${id}`;
    case 'review':
      return `/assessments?record=${id}`;
    case 'policy':
      return `/policies?record=${id}&tab=history`;
    case 'impact':
      return '/impact';
    case 'risk':
      return `/risks?system=${system}`;
    case 'evidence':
      return `/evidence?record=${id}`;
    case 'connection':
      return `/monitoring/connections/${encodeURIComponent(e.connectionId)}`;
    case 'system':
      return `/registry?record=${system}`;
  }
}
export function safeEndpoint(value: string) {
  try {
    const url = new URL(value);
    if (
      !['https:', 'http:'].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    )
      return false;
    if (url.protocol === 'http:' && !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))
      return false;
    return true;
  } catch {
    return false;
  }
}
export function validateConfiguration(config: ConnectorConfiguration) {
  if (!safeEndpoint(config.endpoint.url))
    throw new Error(
      'Use HTTPS (or local HTTP), without credentials, query parameters or fragments.',
    );
  if (config.capabilities.some((c) => !providers[config.provider].capabilities.includes(c)))
    throw new Error('Unsupported monitoring capability.');
  if (
    !config.modelReference.id.trim() ||
    !config.modelReference.version.trim() ||
    !config.deploymentReference.trim()
  )
    throw new Error('Model, version and deployment are required.');
}
export function backoff(attempt: number, random = Math.random) {
  return Math.min(
    30000,
    Math.round(Math.min(30000, 1000 * 2 ** Math.min(attempt, 5)) * (0.8 + 0.4 * random())),
  );
}
export function relativeTime(timestamp: string, now: number, lang: 'en' | 'fr') {
  const seconds = Math.max(0, Math.round((now - Date.parse(timestamp)) / 1000));
  const r = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' });
  return seconds < 60
    ? r.format(-seconds, 'second')
    : seconds < 3600
    ? r.format(-Math.floor(seconds / 60), 'minute')
    : r.format(-Math.floor(seconds / 3600), 'hour');
}
