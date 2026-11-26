'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useGovernance } from '../../governance/store';
import { useMonitoring } from '../hooks/monitoring-provider';
import { PageHeader, Notice } from '../../governance/shared';
import { Button } from '@/components/ui/button';
import { ConnectionStatus, ModeToolbar, TelemetryTime, EventResourceLink } from './shared';
import { providers, capabilityLabels } from '../utils/labels';
import type { AIConnectionHealth, AIConnectionMetric } from '../types';
import { DecisionActivityChart, GovernanceAlerts } from './dashboard';
import { LiveActivityFeed } from './live-activity-feed';
export function ConnectionDetail({ id }: { id: string }) {
  const { data, org, t, text } = useGovernance();
  const { snapshot, mode, loading, service, testConnection, reconnect } = useMonitoring();
  const [tab, setTab] = useState('overview');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [health, setHealth] = useState<AIConnectionHealth | null>(null);
  const [metric, setMetric] = useState<AIConnectionMetric | null>(null);
  const connection = snapshot.connections.find((c) => c.id === id);
  const system = data.systems.find((s) => s.id === connection?.systemId);
  const recent = snapshot.events.find((e) => e.connectionId === id && e.decision);
  const assessment = data.assessments.find((a) => a.systemId === connection?.systemId);
  const incident = snapshot.alerts.find((a) => a.connectionId === id);
  useEffect(() => {
    setMessage('');
    setHealth(null);
    setMetric(null);
    if (!service || !connection) return;
    const controller = new AbortController();
    Promise.all([
      service.getConnectionHealth(org, id, controller.signal),
      service.getConnectionMetrics(org, id, 15, controller.signal),
    ])
      .then(([h, m]) => {
        if (!controller.signal.aborted) {
          setHealth(h);
          setMetric(m);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setMessage(
            t(
              'Detailed health or metrics are unavailable.',
              'L’état détaillé ou les mesures sont indisponibles.',
            ),
          );
      });
    return () => controller.abort();
  }, [id, service, org, connection?.id]);
  async function run(action: 'test' | 'reconnect') {
    setBusy(true);
    setMessage('');
    try {
      if (action === 'test') {
        const result = await testConnection(id);
        setMessage(text(result.message));
      } else {
        await reconnect(id);
        setMessage(
          mode === 'demo'
            ? t('Simulated reconnection started.', 'Reconnexion simulée démarrée.')
            : t('Backend reconnection requested.', 'Reconnexion demandée au backend.'),
        );
      }
    } catch {
      setMessage(
        t(
          'Operation unavailable. Check configuration and backend access.',
          'Opération indisponible. Vérifiez la configuration et l’accès au backend.',
        ),
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeader
        title={system ? text(system.name) : t('Connection details', 'Détails de connexion')}
        description={id}
        action={
          <Link className="button button-outline" href="/monitoring">
            {t('All connections', 'Toutes les connexions')}
          </Link>
        }
      />
      <ModeToolbar />
      {loading ? (
        <p role="status">{t('Loading connection…', 'Chargement de la connexion…')}</p>
      ) : !connection ? (
        <Notice>
          {t(
            'This connection is unavailable in the selected workspace and mode.',
            'Cette connexion est indisponible dans cet espace et ce mode.',
          )}
        </Notice>
      ) : (
        <>
          <div className="connection-detail-heading">
            <ConnectionStatus status={connection.status} />
            <span className="muted">
              {text(providers[connection.provider].label)} · {connection.modelReference.id} /{' '}
              {connection.modelReference.version}
            </span>
            <div className="page-actions">
              <Button disabled={busy} onClick={() => void run('test')}>
                {t('Test connection', 'Tester la connexion')}
              </Button>
              <Button
                disabled={busy || connection.status === 'NOT_CONFIGURED'}
                onClick={() => void run('reconnect')}
              >
                {t('Reconnect', 'Reconnecter')}
              </Button>
            </div>
          </div>
          {message && (
            <p className="notice section-gap" role="status">
              {message}
            </p>
          )}
          <div
            className="tabs section-gap"
            aria-label={t('Connection sections', 'Sections de connexion')}
          >
            {[
              { id: 'overview', label: t('Overview', 'Vue d’ensemble') },
              { id: 'metrics', label: t('Metrics', 'Mesures') },
              { id: 'decisions', label: t('Decision activity', 'Activité des décisions') },
              { id: 'compliance', label: t('Compliance events', 'Événements de conformité') },
              { id: 'history', label: t('Connection history', 'Historique de connexion') },
              { id: 'configuration', label: t('Configuration', 'Configuration') },
            ].map((item) => (
              <button
                className="tab"
                key={item.id}
                aria-pressed={tab === item.id}
                onClick={() => setTab(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
          {tab === 'overview' && (
            <>
              <section className="panel panel-content">
                <h2>{t('Connection overview', 'Vue de la connexion')}</h2>
                <dl className="metadata-grid">
                  {[
                    {
                      label: t('Model / version', 'Modèle / version'),
                      value: `${connection.modelReference.id} / ${connection.modelReference.version}`,
                    },
                    {
                      label: t('Deployment', 'Déploiement'),
                      value: connection.deploymentReference,
                    },
                    {
                      label: t('Last heartbeat', 'Dernier signal'),
                      value: <TelemetryTime value={connection.lastHeartbeat} relative />,
                    },
                    {
                      label: t('Last event received', 'Dernier événement reçu'),
                      value: <TelemetryTime value={connection.lastEventReceived} relative />,
                    },
                    {
                      label: t('Last successful health check', 'Dernier contrôle réussi'),
                      value: <TelemetryTime value={connection.lastSuccessfulHealthCheck} />,
                    },
                    {
                      label: t(
                        'Average latency (retained requests)',
                        'Latence moyenne (requêtes conservées)',
                      ),
                      value:
                        connection.averageLatencyMs === null
                          ? '—'
                          : `${connection.averageLatencyMs} ms`,
                    },
                    {
                      label: t(
                        'Error rate (retained requests)',
                        'Taux d’erreur (requêtes conservées)',
                      ),
                      value:
                        connection.errorRate === null
                          ? '—'
                          : `${(connection.errorRate * 100).toFixed(1)}%`,
                    },
                    {
                      label: t('Health source', 'Source de l’état'),
                      value: health ? text(health.message) : t('Unavailable', 'Indisponible'),
                    },
                  ].map((row) => (
                    <div key={row.label}>
                      <dt>{row.label}</dt>
                      <dd>{row.value}</dd>
                    </div>
                  ))}
                </dl>
                <div className="page-actions">
                  <Link
                    className="button button-outline"
                    href={`/registry?record=${encodeURIComponent(connection.systemId)}`}
                  >
                    {t('View AI system', 'Voir le système IA')}
                  </Link>
                  {recent && (
                    <EventResourceLink
                      event={recent}
                      label={t('View decision trace', 'Voir la trace de décision')}
                    />
                  )}
                  {assessment && (
                    <Link
                      className="button button-outline"
                      href={`/assessments?record=${encodeURIComponent(assessment.id)}`}
                    >
                      {t('View assessment', 'Voir l’évaluation')}
                    </Link>
                  )}
                  {incident && (
                    <Link
                      className="button button-outline"
                      href={`/monitoring/incidents/${encodeURIComponent(incident.id)}`}
                    >
                      {t('Open related incident', 'Ouvrir l’incident lié')}
                    </Link>
                  )}
                </div>
              </section>
              <GovernanceAlerts connectionId={id} />
            </>
          )}
          {tab === 'metrics' && (
            <section className="panel">
              <div className="panel-heading">
                <h2>
                  {t(
                    'Decision requests · last 15 minutes',
                    'Requêtes de décision · 15 dernières minutes',
                  )}
                </h2>
              </div>
              <DecisionActivityChart connectionId={id} minutes={15} />
              <div className="panel-content">
                <p className="small muted">
                  {metric
                    ? `${t('Backend/service metric window', 'Fenêtre des mesures du service')}: ${
                        metric.requestsCount
                      } ${t('requests', 'requêtes')} · ${
                        metric.averageLatencyMs === null ? '—' : `${metric.averageLatencyMs} ms`
                      }`
                    : t('Detailed metrics unavailable.', 'Mesures détaillées indisponibles.')}
                </p>
              </div>
            </section>
          )}
          {tab === 'decisions' && (
            <LiveActivityFeed
              key={`${id}-decisions`}
              connectionId={id}
              decisionsOnly
              title={t('Decision activity', 'Activité des décisions')}
            />
          )}
          {tab === 'compliance' && (
            <>
              <LiveActivityFeed
                key={`${id}-compliance`}
                connectionId={id}
                kinds={[
                  'ASSESSMENT_COMPLETED',
                  'COMPLIANCE_VIOLATION_DETECTED',
                  'POLICY_CHANGED',
                  'REASSESSMENT_REQUIRED',
                  'RISK_THRESHOLD_EXCEEDED',
                  'HUMAN_REVIEW_COMPLETED',
                  'EVIDENCE_EXPIRED',
                ]}
                title={t('Compliance events', 'Événements de conformité')}
              />
              <GovernanceAlerts connectionId={id} />
            </>
          )}
          {tab === 'history' && (
            <LiveActivityFeed
              key={`${id}-history`}
              connectionId={id}
              kinds={[
                'CONNECTION_ESTABLISHED',
                'CONNECTION_LOST',
                'HEARTBEAT_RECEIVED',
                'CONNECTOR_SYNC_FAILED',
              ]}
              title={t('Connection history', 'Historique de connexion')}
            />
          )}
          {tab === 'configuration' && (
            <section className="panel panel-content">
              <h2>{t('Configuration summary', 'Résumé de configuration')}</h2>
              <dl className="metadata-grid">
                <div>
                  <dt>{t('Endpoint metadata', 'Métadonnées du point de terminaison')}</dt>
                  <dd>{connection.endpoint.url}</dd>
                </div>
                <div>
                  <dt>{t('Endpoint label', 'Libellé du point de terminaison')}</dt>
                  <dd>{connection.endpoint.label || '—'}</dd>
                </div>
                <div>
                  <dt>{t('Credentials', 'Identifiants')}</dt>
                  <dd>
                    {mode === 'demo'
                      ? t('Not collected in demo mode', 'Non collectés en mode démo')
                      : connection.endpoint.credentialConfigured
                      ? t('Managed by backend', 'Gérés par le backend')
                      : t('Not configured on backend', 'Non configurés côté backend')}
                  </dd>
                </div>
                <div>
                  <dt>{t('Capabilities', 'Capacités')}</dt>
                  <dd>
                    {connection.capabilities.map((c) => text(capabilityLabels[c])).join(' · ')}
                  </dd>
                </div>
              </dl>
              <p className="muted small">{text(providers[connection.provider].note)}</p>
              <Link
                className="button button-outline section-gap"
                href={`/integrations?setup=ai&system=${encodeURIComponent(connection.systemId)}`}
              >
                {t('Configure connector', 'Configurer le connecteur')}
              </Link>
            </section>
          )}
        </>
      )}
    </>
  );
}
export function IncidentDetail({ id }: { id: string }) {
  const { data, t, text } = useGovernance();
  const { snapshot, loading, mode, createRemediation } = useMonitoring();
  const alert = snapshot.alerts.find((a) => a.id === id);
  const event = snapshot.events.find((e) => e.id === alert?.sourceEventId);
  const references = data.evidence.filter((e) => e.systemId === alert?.systemId);
  return (
    <>
      <PageHeader
        title={t('Monitoring incident', 'Incident de surveillance')}
        description={id}
        action={
          <Link className="button button-outline" href="/monitoring">
            {t('Back to monitoring', 'Retour à la surveillance')}
          </Link>
        }
      />
      {loading ? (
        <p role="status">{t('Loading incident…', 'Chargement de l’incident…')}</p>
      ) : !alert ? (
        <Notice>
          {t(
            'This incident is outside the retained monitoring window or unavailable in this workspace.',
            'Cet incident dépasse la fenêtre de conservation ou est indisponible dans cet espace.',
          )}
        </Notice>
      ) : (
        <section className="panel panel-content">
          <h2>{text(alert.title)}</h2>
          <dl className="metadata-grid">
            <div>
              <dt>{t('AI system', 'Système IA')}</dt>
              <dd>
                {text(data.systems.find((s) => s.id === alert.systemId)?.name || alert.systemId)}
              </dd>
            </div>
            <div>
              <dt>{t('Detected', 'Détecté')}</dt>
              <dd>
                <TelemetryTime value={alert.timestamp} />
              </dd>
            </div>
            <div>
              <dt>{t('Source event', 'Événement source')}</dt>
              <dd>{alert.sourceEventId}</dd>
            </div>
          </dl>
          {event && <EventResourceLink event={event} />}
          <h3 className="section-gap">{t('Supporting evidence', 'Preuves justificatives')}</h3>
          <ul className="evidence-links">
            {references.map((e) => (
              <li key={e.id}>
                <Link className="text-link" href={`/evidence?record=${encodeURIComponent(e.id)}`}>
                  {e.name}
                </Link>
              </li>
            ))}
            {!references.length && (
              <li className="muted">{t('No references linked.', 'Aucune référence liée.')}</li>
            )}
          </ul>
          {alert.taskId ? (
            <Link
              className="button button-outline section-gap"
              href={`/remediation?record=${encodeURIComponent(alert.taskId)}`}
            >
              {t('View remediation', 'Voir le correctif')}
            </Link>
          ) : (
            <Button
              className="section-gap"
              disabled={mode === 'live'}
              onClick={() => createRemediation(alert)}
            >
              {t('Create remediation', 'Créer un correctif')}
            </Button>
          )}
        </section>
      )}
    </>
  );
}
