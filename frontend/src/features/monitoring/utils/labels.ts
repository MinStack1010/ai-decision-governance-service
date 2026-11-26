import { bi, type Text } from '../../governance/model';
import type {
  AIProvider,
  AIConnectionStatus,
  MonitoringEventType,
  MonitoringCapability,
  Severity,
} from '../types';
export const statusLabels: Record<AIConnectionStatus, Text> = {
  CONNECTED: bi('Connected', 'Connecté'),
  CONNECTING: bi('Connecting', 'Connexion en cours'),
  DEGRADED: bi('Degraded', 'Dégradé'),
  DISCONNECTED: bi('Disconnected', 'Déconnecté'),
  NOT_CONFIGURED: bi('Not configured', 'Non configuré'),
  UNKNOWN: bi('Unknown', 'Inconnu'),
};
export const capabilityLabels: Record<MonitoringCapability, Text> = {
  HEALTH: bi('Health monitoring', 'Surveillance de l’état'),
  LATENCY: bi('Latency monitoring', 'Surveillance de la latence'),
  REQUEST_METRICS: bi('Request metrics', 'Mesures des requêtes'),
  DECISION_METADATA: bi('Decision metadata', 'Métadonnées des décisions'),
  IO_REFERENCES: bi('Input/output references only', 'Références d’entrée/sortie uniquement'),
  MODEL_VERSION: bi('Model version tracking', 'Suivi des versions du modèle'),
  RISK_EVENTS: bi('Risk events', 'Événements de risque'),
  COMPLIANCE_EVENTS: bi('Compliance events', 'Événements de conformité'),
  HUMAN_INTERVENTION: bi('Human intervention events', 'Événements d’intervention humaine'),
};
const gateway: MonitoringCapability[] = [
  'HEALTH',
  'LATENCY',
  'REQUEST_METRICS',
  'MODEL_VERSION',
  'DECISION_METADATA',
];
export const providers: Record<
  AIProvider,
  { label: Text; capabilities: MonitoringCapability[]; note: Text }
> = {
  OPENAI: {
    label: bi('OpenAI'),
    capabilities: gateway,
    note: bi(
      'Provider usage and health require a backend connector. Decision traces require application instrumentation.',
      'L’usage et l’état nécessitent un connecteur backend. Les traces exigent l’instrumentation de l’application.',
    ),
  },
  ANTHROPIC: {
    label: bi('Anthropic Claude'),
    capabilities: gateway,
    note: bi(
      'Application decisions and compliance are not inferred from provider responses.',
      'Les décisions et la conformité ne sont pas déduites des réponses du fournisseur.',
    ),
  },
  GOOGLE_GEMINI: {
    label: bi('Google Gemini'),
    capabilities: gateway,
    note: bi(
      'Metrics depend on backend deployment instrumentation.',
      'Les mesures dépendent de l’instrumentation du déploiement backend.',
    ),
  },
  AZURE_OPENAI: {
    label: bi('Azure OpenAI'),
    capabilities: gateway,
    note: bi(
      'Use an approved Azure deployment connector on the backend.',
      'Utilisez un connecteur de déploiement Azure approuvé côté backend.',
    ),
  },
  OLLAMA: {
    label: bi('Ollama'),
    capabilities: ['HEALTH', 'LATENCY', 'REQUEST_METRICS', 'MODEL_VERSION'],
    note: bi(
      'Local model health is checked by the backend, never by this browser.',
      'L’état du modèle local est vérifié par le backend, jamais par ce navigateur.',
    ),
  },
  HUGGING_FACE: {
    label: bi('Hugging Face'),
    capabilities: gateway,
    note: bi(
      'Endpoint capabilities depend on the inference deployment.',
      'Les capacités dépendent du déploiement d’inférence.',
    ),
  },
  CUSTOM_ML: {
    label: bi('Custom ML', 'ML personnalisé'),
    capabilities: ['HEALTH', 'LATENCY', 'REQUEST_METRICS', 'DECISION_METADATA', 'MODEL_VERSION'],
    note: bi(
      'A custom adapter must normalize application decision metadata.',
      'Un adaptateur doit normaliser les métadonnées des décisions.',
    ),
  },
  MLFLOW: {
    label: bi('MLflow'),
    capabilities: ['HEALTH', 'MODEL_VERSION'],
    note: bi(
      'Registry metadata does not by itself provide live decision telemetry.',
      'Les métadonnées du registre ne fournissent pas à elles seules les décisions en direct.',
    ),
  },
  ENTERPRISE_REST: {
    label: bi('Custom REST API', 'API REST personnalisée'),
    capabilities: [
      'HEALTH',
      'LATENCY',
      'REQUEST_METRICS',
      'DECISION_METADATA',
      'IO_REFERENCES',
      'MODEL_VERSION',
      'RISK_EVENTS',
      'COMPLIANCE_EVENTS',
      'HUMAN_INTERVENTION',
    ],
    note: bi(
      'Capabilities must be implemented by the enterprise adapter; payload contents are excluded.',
      'Les capacités doivent être implémentées par l’adaptateur ; le contenu des données est exclu.',
    ),
  },
  OPENTELEMETRY: {
    label: bi('OpenTelemetry'),
    capabilities: [
      'LATENCY',
      'REQUEST_METRICS',
      'DECISION_METADATA',
      'MODEL_VERSION',
      'RISK_EVENTS',
    ],
    note: bi(
      'Only explicitly instrumented and redacted attributes are supported.',
      'Seuls les attributs explicitement instrumentés et expurgés sont pris en charge.',
    ),
  },
  WEBHOOK: {
    label: bi('Webhook'),
    capabilities: [
      'DECISION_METADATA',
      'IO_REFERENCES',
      'MODEL_VERSION',
      'RISK_EVENTS',
      'COMPLIANCE_EVENTS',
      'HUMAN_INTERVENTION',
    ],
    note: bi(
      'The backend verifies webhook signatures and validates event payloads.',
      'Le backend vérifie les signatures et valide les événements webhook.',
    ),
  },
};
export const eventLabels: Record<MonitoringEventType, Text> = {
  CONNECTION_ESTABLISHED: bi('Connection established', 'Connexion établie'),
  CONNECTION_LOST: bi('Connection lost', 'Connexion perdue'),
  HEARTBEAT_RECEIVED: bi('Heartbeat received', 'Signal de présence reçu'),
  DECISION_PROCESSED: bi('Decision processed', 'Décision traitée'),
  DECISION_FAILED: bi('Decision failed', 'Échec de la décision'),
  ASSESSMENT_COMPLETED: bi('Assessment completed', 'Évaluation terminée'),
  COMPLIANCE_VIOLATION_DETECTED: bi(
    'Compliance violation detected',
    'Violation de conformité détectée',
  ),
  POLICY_CHANGED: bi('Policy changed', 'Politique modifiée'),
  REASSESSMENT_REQUIRED: bi('Reassessment required', 'Réévaluation requise'),
  RISK_THRESHOLD_EXCEEDED: bi('Risk threshold exceeded', 'Seuil de risque dépassé'),
  HUMAN_REVIEW_COMPLETED: bi('Human review completed', 'Examen humain terminé'),
  EVIDENCE_EXPIRED: bi('Evidence expired', 'Preuve expirée'),
  CONNECTOR_SYNC_FAILED: bi('Connector sync failed', 'Échec de synchronisation'),
};
export const severityLabels: Record<Severity, Text> = {
  INFO: bi('Info', 'Info'),
  WARNING: bi('Warning', 'Avertissement'),
  ERROR: bi('Error', 'Erreur'),
  CRITICAL: bi('Critical', 'Critique'),
};
