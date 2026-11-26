import { bi, type Workspace } from '../../governance/model';
import type {
  AIConnection,
  AIConnectionEvent,
  MonitoringSnapshot,
  MonitoringService,
  MonitoringObserver,
  MonitoringSubscription,
  ConnectorConfiguration,
  AIConnectionStatus,
  AIProvider,
  ConnectionTestResult,
} from '../types';
import { applyEvent, alertsFromEvents, summarize, validateConfiguration } from '../utils/data';
import { eventLabels, providers } from '../utils/labels';
type Scheduler = {
  setInterval: (fn: () => void, ms: number) => ReturnType<typeof setInterval>;
  clearInterval: (id: ReturnType<typeof setInterval>) => void;
  setTimeout: (fn: () => void, ms: number) => ReturnType<typeof setTimeout>;
  clearTimeout: (id: ReturnType<typeof setTimeout>) => void;
};
const nativeScheduler: Scheduler = {
  // Browser APIs must retain the global receiver when called through this adapter.
  setInterval: (fn, ms) => globalThis.setInterval(fn, ms),
  clearInterval: (id) => globalThis.clearInterval(id),
  setTimeout: (fn, ms) => globalThis.setTimeout(fn, ms),
  clearTimeout: (id) => globalThis.clearTimeout(id),
};
export function demoConnectionId(org: string, systemId: string) {
  return `CONN-${org}-${systemId}`;
}
export class DemoMonitoringService implements MonitoringService {
  readonly mode = 'demo' as const;
  private snapshot: MonitoringSnapshot;
  private workspace: Workspace;
  private sequence = 0;
  private listeners = new Map<string, MonitoringObserver>();
  private interval: ReturnType<typeof setInterval> | null = null;
  private pending = new Set<ReturnType<typeof setTimeout>>();
  private running = true;
  private nextSubscriber = 0;
  constructor(
    private org: string,
    workspace: Workspace,
    private clock = () => Date.now(),
    private scheduler: Scheduler = nativeScheduler,
  ) {
    this.workspace = workspace;
    this.snapshot = this.seed();
  }
  private assertOrg(org: string) {
    if (org !== this.org) throw new Error('Workspace mismatch');
  }
  updateWorkspace(workspace: Workspace) {
    this.workspace = workspace;
    const valid = new Set(workspace.systems.map((s) => s.id));
    const filtered = {
      ...this.snapshot,
      connections: this.snapshot.connections.filter((c) => valid.has(c.systemId)),
      events: this.snapshot.events.filter((e) => valid.has(e.systemId)),
      alerts: this.snapshot.alerts.filter((a) => valid.has(a.systemId)),
    };
    // A workspace can be restored or changed while this long-lived service instance
    // is still cached. Re-seed the local monitoring view when its registered systems
    // no longer have any connection records; otherwise all dashboard sections appear
    // empty even though the registry contains systems.
    this.snapshot = filtered.connections.length || !workspace.systems.length ? filtered : this.seed();
  }
  private seed(): MonitoringSnapshot {
    const now = this.clock(),
      iso = new Date(now).toISOString();
    const states: AIConnectionStatus[] = [
      'CONNECTED',
      'CONNECTED',
      'DEGRADED',
      'DISCONNECTED',
      'NOT_CONFIGURED',
      'CONNECTING',
      'UNKNOWN',
    ];
    const provider: AIProvider[] = [
      'OPENAI',
      'ANTHROPIC',
      'ENTERPRISE_REST',
      'AZURE_OPENAI',
      'OLLAMA',
      'MLFLOW',
      'HUGGING_FACE',
    ];
    const connections: AIConnection[] = this.workspace.systems.slice(0, 7).map((s, i) => ({
      id: demoConnectionId(this.org, s.id),
      organizationId: this.org,
      systemId: s.id,
      provider: provider[i],
      modelReference: { id: `synthetic-model-${i + 1}`, version: 'demo-1' },
      deploymentReference: `demo-deployment-${i + 1}`,
      status: states[i],
      endpoint: {
        url: `https://connector-${i + 1}.example.invalid`,
        label: 'Synthetic endpoint · no external requests',
        credentialConfigured: false,
      },
      capabilities: providers[provider[i]].capabilities.filter((capability) =>
        [
          'HEALTH',
          'LATENCY',
          'REQUEST_METRICS',
          'MODEL_VERSION',
          'DECISION_METADATA',
          'COMPLIANCE_EVENTS',
          'RISK_EVENTS',
        ].includes(capability),
      ),
      lastSuccessfulHealthCheck: i < 3 ? iso : null,
      lastHeartbeat: i < 3 ? iso : null,
      lastEventReceived: null,
      averageLatencyMs: null,
      errorRate: null,
      requestsCount: 0,
      createdAt: new Date(now - 86400000).toISOString(),
      updatedAt: iso,
    }));
    let snapshot: MonitoringSnapshot = { connections, events: [], alerts: [], updatedAt: iso };

    // Keep the local workspace useful even when no provider is connected. The monitoring
    // screens are intentionally populated with clearly-labelled synthetic telemetry so
    // every KPI, filter, detail tab and alert state can be exercised end-to-end.
    const activeConnections = connections.slice(0, Math.min(4, connections.length));
    for (let i = 0; i < 36; i++) {
      const c = activeConnections[i % activeConnections.length];
      if (!c) break;
      snapshot = applyEvent(
        snapshot,
        this.decisionEvent(
          c,
          `seed-${i}`,
          new Date(now - 14 * 60000 + i * 23000).toISOString(),
          i % 9 !== 0,
          118 + (i % 8) * 21,
        ),
        this.org,
      );
    }

    const exception = this.workspace.assessments.find((a) =>
      a.findings.some((f) => f.outcome === 'noncompliant'),
    );
    const evidence = this.workspace.evidence[0];
    const policy = this.workspace.policies[0];
    const approved = this.workspace.assessments.find((a) => a.state === 'approved');
    const eventPlan: Array<{
      type: AIConnectionEvent['type'];
      connection: AIConnection | undefined;
      severity?: AIConnectionEvent['severity'];
      relatedResourceId?: string;
      relatedResourceType?: AIConnectionEvent['relatedResourceType'];
    }> = [
      {
        type: 'CONNECTION_ESTABLISHED',
        connection: activeConnections[0],
        relatedResourceType: 'connection',
      },
      {
        type: 'CONNECTION_LOST',
        connection: activeConnections[3],
        severity: 'ERROR',
        relatedResourceType: 'connection',
      },
      { type: 'HEARTBEAT_RECEIVED', connection: activeConnections[0] },
      { type: 'HEARTBEAT_RECEIVED', connection: activeConnections[1] },
      { type: 'CONNECTOR_SYNC_FAILED', connection: activeConnections[2], severity: 'ERROR' },
      {
        type: 'COMPLIANCE_VIOLATION_DETECTED',
        connection: connections.find((c) => c.systemId === exception?.systemId) || activeConnections[0],
        severity: 'ERROR',
        relatedResourceId: exception?.id,
        relatedResourceType: 'assessment',
      },
      {
        type: 'RISK_THRESHOLD_EXCEEDED',
        connection: activeConnections[0],
        severity: 'WARNING',
        relatedResourceId: activeConnections[0]?.systemId,
        relatedResourceType: 'risk',
      },
      {
        type: 'EVIDENCE_EXPIRED',
        connection: activeConnections[1],
        severity: 'WARNING',
        relatedResourceId: evidence?.id,
        relatedResourceType: 'evidence',
      },
      {
        type: 'POLICY_CHANGED',
        connection: activeConnections[0],
        relatedResourceId: policy?.id,
        relatedResourceType: 'policy',
      },
      {
        type: 'REASSESSMENT_REQUIRED',
        connection: activeConnections[2],
        severity: 'WARNING',
        relatedResourceId: activeConnections[2]?.systemId,
        relatedResourceType: 'impact',
      },
      {
        type: 'HUMAN_REVIEW_COMPLETED',
        connection: activeConnections[1],
        relatedResourceId: approved?.id,
        relatedResourceType: 'review',
      },
      {
        type: 'ASSESSMENT_COMPLETED',
        connection: activeConnections[0],
        relatedResourceId: approved?.id || exception?.id,
        relatedResourceType: 'assessment',
      },
    ];
    eventPlan.forEach((plan, i) => {
      const c = plan.connection;
      if (!c) return;
      const relatedResourceId = plan.relatedResourceId || c.id;
      const type = plan.type;
      snapshot = applyEvent(
        snapshot,
        {
          id: `${this.org}-seed-${type.toLowerCase()}-${i}`,
          type,
          organizationId: this.org,
          systemId: c.systemId,
          connectionId: c.id,
          timestamp: new Date(now - (eventPlan.length - i) * 30000).toISOString(),
          severity: plan.severity || 'INFO',
          description: bi(
            `Synthetic: ${eventLabels[type].en}.`,
            `Simulation : ${eventLabels[type].fr}.`,
          ),
          relatedResourceType: plan.relatedResourceType || 'connection',
          relatedResourceId,
          correlationId: `demo-${this.org}-${type.toLowerCase()}-${i}`,
        },
        this.org,
      );
    });
    return snapshot;
  }
  private decisionEvent(
    c: AIConnection,
    key: string,
    timestamp: string,
    success: boolean,
    latencyMs: number,
  ): AIConnectionEvent {
    const id = `DEC-${this.org}-${key}`;
    const a = this.workspace.assessments.find((a) => a.systemId === c.systemId);
    return {
      id: `EVENT-${id}`,
      type: success ? 'DECISION_PROCESSED' : 'DECISION_FAILED',
      organizationId: this.org,
      systemId: c.systemId,
      connectionId: c.id,
      timestamp,
      severity: success ? 'INFO' : 'ERROR',
      description: success
        ? bi(
            'Synthetic decision metadata recorded.',
            'Métadonnées d’une décision synthétique consignées.',
          )
        : bi(
            'Synthetic decision processing failed.',
            'Échec du traitement d’une décision synthétique.',
          ),
      relatedResourceId: id,
      relatedResourceType: 'decision',
      correlationId: `corr-${id}`,
      decision: {
        id,
        organizationId: this.org,
        systemId: c.systemId,
        connectionId: c.id,
        timestamp,
        modelReference: c.modelReference,
        deploymentReference: c.deploymentReference,
        latencyMs,
        success,
        traceId: `TRACE-${id}`,
        assessmentId: a?.id || null,
        evidenceIds: this.workspace.evidence
          .filter((e) => e.systemId === c.systemId)
          .map((e) => e.id),
      },
    };
  }
  private emit(event: AIConnectionEvent) {
    this.snapshot = applyEvent(this.snapshot, event, this.org);
    for (const observer of this.listeners.values()) observer.onEvent(event);
  }
  tick() {
    const available = this.snapshot.connections.filter((c) =>
      ['CONNECTED', 'DEGRADED'].includes(c.status),
    );
    if (!available.length) return;
    const index = this.sequence++,
      c = available[index % available.length],
      timestamp = new Date(this.clock()).toISOString();
    if (index % 3 === 0 && c.capabilities.includes('DECISION_METADATA')) {
      this.emit(
        this.decisionEvent(c, `tick-${index}`, timestamp, index % 15 !== 0, 140 + (index % 6) * 20),
      );
      return;
    }
    const a = this.workspace.assessments.find((a) => a.systemId === c.systemId),
      approved = this.workspace.assessments.find(
        (a) => a.systemId === c.systemId && a.state === 'approved',
      ),
      evidence = this.workspace.evidence.find((e) => e.systemId === c.systemId),
      policy = this.workspace.policies[0];
    const type = index % 13;
    let event: AIConnectionEvent = {
      id: `${this.org}-stream-${index}`,
      type: 'HEARTBEAT_RECEIVED',
      organizationId: this.org,
      systemId: c.systemId,
      connectionId: c.id,
      timestamp,
      severity: 'INFO',
      description: bi('Synthetic heartbeat received.', 'Signal de présence synthétique reçu.'),
      relatedResourceId: c.id,
      relatedResourceType: 'connection',
      correlationId: `demo-${this.org}-${index}`,
    };
    if (type === 1 && a) {
      event = {
        ...event,
        type: 'REASSESSMENT_REQUIRED',
        severity: 'WARNING',
        relatedResourceId: c.systemId,
        relatedResourceType: 'impact',
      };
    }
    if (type === 2 && a?.findings.some((f) => f.outcome === 'noncompliant')) {
      event = {
        ...event,
        type: 'COMPLIANCE_VIOLATION_DETECTED',
        severity: 'ERROR',
        relatedResourceId: a.id,
        relatedResourceType: 'assessment',
      };
    }
    if (type === 4 && policy) {
      event = {
        ...event,
        type: 'POLICY_CHANGED',
        relatedResourceId: policy.id,
        relatedResourceType: 'policy',
      };
    }
    if (
      type === 5 &&
      this.workspace.systems.find((s) => s.id === c.systemId)?.risk === 'high' &&
      this.workspace.systems.filter((s) => s.risk === 'high').length > 2
    ) {
      event = {
        ...event,
        type: 'RISK_THRESHOLD_EXCEEDED',
        severity: 'WARNING',
        relatedResourceId: c.systemId,
        relatedResourceType: 'risk',
      };
    }
    if (type === 7 && approved) {
      event = {
        ...event,
        type: 'HUMAN_REVIEW_COMPLETED',
        relatedResourceId: approved.id,
        relatedResourceType: 'review',
      };
    }
    if (type === 8 && evidence) {
      event = {
        ...event,
        type: 'EVIDENCE_EXPIRED',
        severity: 'WARNING',
        relatedResourceId: evidence.id,
        relatedResourceType: 'evidence',
      };
    }
    if (type === 10) {
      event = { ...event, type: 'CONNECTOR_SYNC_FAILED', severity: 'ERROR' };
    }
    if (type === 11 && approved) {
      event = {
        ...event,
        type: 'ASSESSMENT_COMPLETED',
        relatedResourceId: approved.id,
        relatedResourceType: 'assessment',
      };
    }
    if (event.type !== 'HEARTBEAT_RECEIVED')
      event.description = bi(
        `Simulated: ${eventLabels[event.type].en}.`,
        `Simulation : ${eventLabels[event.type].fr}.`,
      );
    this.emit(event);
  }
  private schedule() {
    if (this.interval !== null || !this.running || !this.listeners.size) return;
    this.interval = this.scheduler.setInterval(() => this.tick(), 4000);
  }
  setSimulationRunning(running: boolean) {
    this.running = running;
    if (!running && this.interval !== null) {
      this.scheduler.clearInterval(this.interval);
      this.interval = null;
    }
    this.schedule();
    for (const o of this.listeners.values())
      o.onState({
        status: running ? 'CONNECTED' : 'PAUSED',
        attempt: 0,
        lastEventId: this.snapshot.events[0]?.id || null,
        lastHeartbeat: new Date(this.clock()).toISOString(),
        error: null,
      });
  }
  async listConnections(org: string) {
    this.assertOrg(org);
    return structuredClone(this.snapshot.connections);
  }
  async getConnection(org: string, id: string) {
    this.assertOrg(org);
    const c = this.snapshot.connections.find((c) => c.id === id);
    if (!c) throw new Error('Connection not found');
    return structuredClone(c);
  }
  async getConnectionHealth(org: string, id: string) {
    const c = await this.getConnection(org, id);
    return {
      connectionId: id,
      organizationId: org,
      status: c.status,
      checkedAt: new Date(this.clock()).toISOString(),
      lastHeartbeat: c.lastHeartbeat,
      message: bi(
        'Simulated health metadata; no provider request.',
        'État simulé ; aucune requête au fournisseur.',
      ),
      simulated: true,
    };
  }
  async getConnectionMetrics(org: string, id: string, minutes: number) {
    await this.getConnection(org, id);
    const now = this.clock(),
      s = summarize(
        { ...this.snapshot, events: this.snapshot.events.filter((e) => e.connectionId === id) },
        minutes,
        now,
      );
    return {
      connectionId: id,
      organizationId: org,
      windowStart: new Date(now - minutes * 60000).toISOString(),
      windowEnd: new Date(now).toISOString(),
      averageLatencyMs: s.averageLatencyMs,
      errorRate: s.errorRate,
      requestsCount: s.requestsCount,
      decisionCount: s.decisionsProcessed,
    };
  }
  async listMonitoringEvents(org: string) {
    this.assertOrg(org);
    return structuredClone(this.snapshot.events);
  }
  async testConnection(org: string, id: string) {
    const c = await this.getConnection(org, id);
    const success = c.status !== 'NOT_CONFIGURED';
    const checkedAt = new Date(this.clock()).toISOString();
    if (success) {
      this.snapshot.connections = this.snapshot.connections.map((row) =>
        row.id === id ? { ...row, lastSuccessfulHealthCheck: checkedAt } : row,
      );
    }
    return {
      success,
      simulated: true,
      checkedAt,
      message: success
        ? bi(
            'Simulated test passed. No external provider was contacted.',
            'Test simulé réussi. Aucun fournisseur externe contacté.',
          )
        : bi(
            'Simulated test: configure this connector first.',
            'Test simulé : configurez d’abord ce connecteur.',
          ),
      connection: {
        ...c,
        lastSuccessfulHealthCheck: success ? checkedAt : c.lastSuccessfulHealthCheck,
      },
    };
  }
  async reconnect(org: string, id: string) {
    const c = await this.getConnection(org, id);
    if (c.status === 'NOT_CONFIGURED') throw new Error('Configure the connector first.');
    const connecting = {
      ...c,
      status: 'CONNECTING' as const,
      updatedAt: new Date(this.clock()).toISOString(),
    };
    this.snapshot.connections = this.snapshot.connections.map((c) =>
      c.id === id ? connecting : c,
    );
    const timer = this.scheduler.setTimeout(() => {
      this.pending.delete(timer);
      this.emit({
        id: `${org}-reconnect-${++this.sequence}`,
        type: 'CONNECTION_ESTABLISHED',
        organizationId: org,
        systemId: c.systemId,
        connectionId: id,
        timestamp: new Date(this.clock()).toISOString(),
        severity: 'INFO',
        description: bi('Simulated reconnection completed.', 'Reconnexion simulée terminée.'),
        relatedResourceType: 'connection',
        relatedResourceId: id,
        correlationId: `demo-reconnect-${this.sequence}`,
      });
    }, 700);
    this.pending.add(timer);
    return connecting;
  }
  private fromConfiguration(config: ConnectorConfiguration): AIConnection {
    this.assertOrg(config.organizationId);
    validateConfiguration(config);
    if (!this.workspace.systems.some((s) => s.id === config.systemId))
      throw new Error('Unknown registered system');
    const now = new Date(this.clock()).toISOString();
    return {
      ...structuredClone(config),
      id: demoConnectionId(this.org, config.systemId),
      status: 'NOT_CONFIGURED',
      lastSuccessfulHealthCheck: null,
      lastHeartbeat: null,
      lastEventReceived: null,
      requestsCount: 0,
      averageLatencyMs: null,
      errorRate: null,
      createdAt: now,
      updatedAt: now,
    };
  }
  async testConfiguration(config: ConnectorConfiguration): Promise<ConnectionTestResult> {
    const connection = this.fromConfiguration(config);
    return {
      success: true,
      simulated: true,
      connection,
      checkedAt: new Date(this.clock()).toISOString(),
      message: bi(
        'Prototype validation completed; no external endpoint was contacted.',
        'Validation du prototype terminée ; aucun point de terminaison externe contacté.',
      ),
    };
  }
  async saveConnection(config: ConnectorConfiguration) {
    const c = this.fromConfiguration(config);
    this.snapshot.connections = [...this.snapshot.connections.filter((row) => row.id !== c.id), c];
    return c;
  }
  subscribeToEvents(
    org: string,
    observer: MonitoringObserver,
    lastEventId?: string | null,
  ): MonitoringSubscription {
    this.assertOrg(org);
    const id = `sub-${++this.nextSubscriber}`;
    this.listeners.set(id, observer);
    observer.onState({
      status: this.running ? 'CONNECTED' : 'PAUSED',
      attempt: 0,
      lastEventId: lastEventId || null,
      lastHeartbeat: new Date(this.clock()).toISOString(),
      error: null,
    });
    this.schedule();
    return { id, unsubscribe: () => this.unsubscribeFromEvents(id) };
  }
  unsubscribeFromEvents(id: string) {
    this.listeners.delete(id);
    if (!this.listeners.size && this.interval !== null) {
      this.scheduler.clearInterval(this.interval);
      this.interval = null;
    }
  }
  dispose() {
    if (this.interval !== null) this.scheduler.clearInterval(this.interval);
    this.interval = null;
    for (const timer of this.pending) this.scheduler.clearTimeout(timer);
    this.pending.clear();
    this.listeners.clear();
  }
}
