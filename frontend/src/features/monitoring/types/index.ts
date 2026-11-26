import type { Text } from '../../governance/model';
export const connectionStatuses = [
  'CONNECTED',
  'CONNECTING',
  'DEGRADED',
  'DISCONNECTED',
  'NOT_CONFIGURED',
  'UNKNOWN',
] as const;
export type AIConnectionStatus = (typeof connectionStatuses)[number];
export const providerTypes = [
  'OPENAI',
  'ANTHROPIC',
  'GOOGLE_GEMINI',
  'AZURE_OPENAI',
  'OLLAMA',
  'HUGGING_FACE',
  'CUSTOM_ML',
  'MLFLOW',
  'ENTERPRISE_REST',
  'OPENTELEMETRY',
  'WEBHOOK',
] as const;
export type AIProvider = (typeof providerTypes)[number];
export const capabilities = [
  'HEALTH',
  'LATENCY',
  'REQUEST_METRICS',
  'DECISION_METADATA',
  'IO_REFERENCES',
  'MODEL_VERSION',
  'RISK_EVENTS',
  'COMPLIANCE_EVENTS',
  'HUMAN_INTERVENTION',
] as const;
export type MonitoringCapability = (typeof capabilities)[number];
export const eventTypes = [
  'CONNECTION_ESTABLISHED',
  'CONNECTION_LOST',
  'HEARTBEAT_RECEIVED',
  'DECISION_PROCESSED',
  'DECISION_FAILED',
  'ASSESSMENT_COMPLETED',
  'COMPLIANCE_VIOLATION_DETECTED',
  'POLICY_CHANGED',
  'REASSESSMENT_REQUIRED',
  'RISK_THRESHOLD_EXCEEDED',
  'HUMAN_REVIEW_COMPLETED',
  'EVIDENCE_EXPIRED',
  'CONNECTOR_SYNC_FAILED',
] as const;
export type MonitoringEventType = (typeof eventTypes)[number];
export type MonitoringMode = 'demo' | 'live';
export type Severity = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
export type RelatedResourceType =
  | 'decision'
  | 'assessment'
  | 'policy'
  | 'impact'
  | 'risk'
  | 'review'
  | 'evidence'
  | 'connection'
  | 'system';
export interface AIConnection {
  id: string;
  organizationId: string;
  systemId: string;
  provider: AIProvider;
  modelReference: { id: string; version: string };
  deploymentReference: string;
  status: AIConnectionStatus;
  endpoint: { url: string; label: string; credentialConfigured: boolean };
  capabilities: MonitoringCapability[];
  lastSuccessfulHealthCheck: string | null;
  lastHeartbeat: string | null;
  lastEventReceived: string | null;
  averageLatencyMs: number | null;
  errorRate: number | null;
  requestsCount: number;
  createdAt: string;
  updatedAt: string;
}
export interface AIConnectionHealth {
  connectionId: string;
  organizationId: string;
  status: AIConnectionStatus;
  checkedAt: string;
  lastHeartbeat: string | null;
  message: Text;
  simulated: boolean;
}
export interface AIConnectionMetric {
  connectionId: string;
  organizationId: string;
  windowStart: string;
  windowEnd: string;
  averageLatencyMs: number | null;
  errorRate: number | null;
  requestsCount: number;
  decisionCount: number;
}
export interface AIDecisionEvent {
  id: string;
  organizationId: string;
  systemId: string;
  connectionId: string;
  timestamp: string;
  modelReference: { id: string; version: string };
  deploymentReference: string;
  latencyMs: number;
  success: boolean;
  traceId: string;
  assessmentId: string | null;
  evidenceIds: string[];
  inputReference?: string;
  outputReference?: string;
}
export interface AIConnectionEvent {
  id: string;
  type: MonitoringEventType;
  organizationId: string;
  systemId: string;
  connectionId: string;
  timestamp: string;
  severity: Severity;
  description: Text;
  relatedResourceId: string;
  relatedResourceType: RelatedResourceType;
  correlationId: string | null;
  decision?: AIDecisionEvent;
}
export interface MonitoringAlert {
  id: string;
  organizationId: string;
  systemId: string;
  connectionId: string;
  sourceEventId: string;
  severity: Severity;
  title: Text;
  timestamp: string;
  state: 'OPEN' | 'ACKNOWLEDGED';
  relatedResourceId: string;
  relatedResourceType: RelatedResourceType;
  taskId: string | null;
}
export interface MonitoringStreamState {
  status:
    | 'IDLE'
    | 'CONNECTING'
    | 'CONNECTED'
    | 'RECONNECTING'
    | 'ERROR'
    | 'DISCONNECTED'
    | 'PAUSED';
  attempt: number;
  lastEventId: string | null;
  lastHeartbeat: string | null;
  error: string | null;
}
export interface MonitoringSnapshot {
  connections: AIConnection[];
  events: AIConnectionEvent[];
  alerts: MonitoringAlert[];
  updatedAt: string | null;
}
export interface MonitoringSummary {
  connectedSystems: number;
  decisionsProcessed: number;
  averageLatencyMs: number | null;
  errorRate: number | null;
  activeAlerts: number;
  requestsCount: number;
}
export interface ConnectorConfiguration {
  organizationId: string;
  systemId: string;
  provider: AIProvider;
  modelReference: { id: string; version: string };
  deploymentReference: string;
  endpoint: { url: string; label: string; credentialConfigured: boolean };
  capabilities: MonitoringCapability[];
}
export interface ConnectionTestResult {
  success: boolean;
  simulated: boolean;
  checkedAt: string;
  message: Text;
  connection: AIConnection;
}
export interface MonitoringObserver {
  onReset?: () => void;
  onEvent: (event: AIConnectionEvent) => void;
  onState: (state: MonitoringStreamState) => void;
}
export interface MonitoringSubscription {
  id: string;
  unsubscribe: () => void;
}
export interface MonitoringService {
  readonly mode: MonitoringMode;
  readonly recoveryCursor?: string | null;
  listConnections(org: string, signal?: AbortSignal): Promise<AIConnection[]>;
  getConnection(org: string, id: string, signal?: AbortSignal): Promise<AIConnection>;
  getConnectionHealth(org: string, id: string, signal?: AbortSignal): Promise<AIConnectionHealth>;
  getConnectionMetrics(
    org: string,
    id: string,
    minutes: number,
    signal?: AbortSignal,
  ): Promise<AIConnectionMetric>;
  listMonitoringEvents(org: string, signal?: AbortSignal): Promise<AIConnectionEvent[]>;
  testConnection(org: string, id: string, signal?: AbortSignal): Promise<ConnectionTestResult>;
  reconnect(org: string, id: string, signal?: AbortSignal): Promise<AIConnection>;
  saveConnection(config: ConnectorConfiguration, signal?: AbortSignal): Promise<AIConnection>;
  testConfiguration(
    config: ConnectorConfiguration,
    signal?: AbortSignal,
  ): Promise<ConnectionTestResult>;
  subscribeToEvents(
    org: string,
    observer: MonitoringObserver,
    lastEventId?: string | null,
  ): MonitoringSubscription;
  unsubscribeFromEvents(id: string): void;
  dispose(): void;
}
