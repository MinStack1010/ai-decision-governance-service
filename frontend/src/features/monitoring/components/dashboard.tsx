'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { useGovernance } from '../../governance/store';
import { useMonitoring } from '../hooks/monitoring-provider';
import { connectionStatuses, providerTypes, type AIConnection } from '../types';
import { statusLabels, providers, severityLabels } from '../utils/labels';
import { summarize, activityBuckets } from '../utils/data';
import { PageHeader } from '../../governance/shared';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/input';
import { DataTable } from '@/components/ui/data-table';
import { ConnectionStatus, TelemetryTime, ModeToolbar } from './shared';
import { LiveActivityFeed } from './live-activity-feed';
export function DecisionActivityChart({
  connectionId,
  minutes,
}: {
  connectionId?: string;
  minutes: number;
}) {
  const { t, lang } = useGovernance();
  const { snapshot, now } = useMonitoring();
  const buckets = activityBuckets(
    snapshot.events.filter((e) => !connectionId || e.connectionId === connectionId),
    minutes,
    now,
  );
  const max = Math.max(1, ...buckets.map((b) => b.processed + b.failed));
  return (
    <div className="panel-content">
      <div
        className="activity-chart"
        role="group"
        aria-label={t('Decision requests by time interval', 'Requêtes de décision par intervalle')}
      >
        {buckets.map((b) => (
          <div className="activity-column" key={b.time}>
            <div className="activity-bar-space">
              <div
                className="activity-bar"
                style={{ height: `${((b.processed + b.failed) / max) * 100}%` }}
              >
                <span
                  className="activity-failed"
                  style={{
                    height: `${
                      b.processed + b.failed ? (b.failed / (b.processed + b.failed)) * 100 : 0
                    }%`,
                  }}
                />
              </div>
            </div>
            <span className="small nums">{b.processed + b.failed}</span>
            <span className="chart-time small nums">
              {new Date(b.time).toLocaleTimeString(lang, {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
                timeZone: 'UTC',
              })}
            </span>
            <span className="sr-only">
              {b.processed} {t('successful', 'réussies')}, {b.failed} {t('failed', 'échouées')}
            </span>
          </div>
        ))}
      </div>
      <p className="small muted section-gap">
        {t(
          'UTC · Teal: processed · Red: failed · Counts use retained decision events only.',
          'UTC · Turquoise : traitées · Rouge : échouées · Comptages issus des événements de décision conservés.',
        )}
      </p>
    </div>
  );
}
export function ConnectionsTable() {
  const { data, t, text } = useGovernance();
  const { snapshot, loading, error } = useMonitoring();
  const [provider, setProvider] = useState('all');
  const rows = snapshot.connections.filter((c) => provider === 'all' || c.provider === provider);
  return (
    <>
      <div className="section-header">
        <h2>{t('AI connections', 'Connexions IA')}</h2>
        <Select
          aria-label={t('Filter connection provider', 'Filtrer le fournisseur')}
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
        >
          <option value="all">{t('All providers', 'Tous les fournisseurs')}</option>
          {providerTypes.map((p) => (
            <option key={p} value={p}>
              {text(providers[p].label)}
            </option>
          ))}
        </Select>
      </div>
      {loading ? (
        <p role="status" className="notice">
          {t('Loading connections…', 'Chargement des connexions…')}
        </p>
      ) : error ? (
        <p className="notice">
          {t('Connection information unavailable.', 'Informations de connexion indisponibles.')}
        </p>
      ) : (
        <DataTable
          rows={rows}
          caption={t('AI connections', 'Connexions IA')}
          searchText={(c) =>
            `${c.id} ${c.systemId} ${text(
              data.systems.find((s) => s.id === c.systemId)?.name || '',
            )} ${text(providers[c.provider].label)}`
          }
          filter={{
            label: t('All connection states', 'Tous les états de connexion'),
            options: connectionStatuses.map((value) => ({
              value,
              label: text(statusLabels[value]),
            })),
            getValue: (c) => c.status,
          }}
          columns={[
            {
              id: 'system',
              title: t('AI system', 'Système IA'),
              value: (c) => text(data.systems.find((s) => s.id === c.systemId)?.name || c.systemId),
              render: (c) => (
                <>
                  <Link
                    className="text-link"
                    href={`/monitoring/connections/${encodeURIComponent(c.id)}`}
                  >
                    {text(data.systems.find((s) => s.id === c.systemId)?.name || c.systemId)}
                  </Link>
                  <p className="table-meta">
                    {c.modelReference.id} · {c.modelReference.version}
                  </p>
                </>
              ),
            },
            {
              id: 'provider',
              title: t('Provider', 'Fournisseur'),
              value: (c) => c.provider,
              render: (c) => text(providers[c.provider].label),
            },
            {
              id: 'status',
              title: t('Connection', 'Connexion'),
              value: (c) => c.status,
              render: (c) => <ConnectionStatus status={c.status} />,
            },
            {
              id: 'heartbeat',
              title: t('Last heartbeat', 'Dernier signal'),
              value: (c) => c.lastHeartbeat || '',
              render: (c) => <TelemetryTime value={c.lastHeartbeat} relative />,
            },
            {
              id: 'latency',
              title: t('Latency', 'Latence'),
              value: (c) => String(c.averageLatencyMs || 0),
              render: (c) => (
                <span className="nums">
                  {c.averageLatencyMs === null ? '—' : `${c.averageLatencyMs} ms`}
                </span>
              ),
            },
            {
              id: 'requests',
              title: t('Requests', 'Requêtes'),
              value: (c) => String(c.requestsCount),
              render: (c) => <span className="nums">{c.requestsCount}</span>,
            },
          ]}
        />
      )}
    </>
  );
}
export function GovernanceAlerts({ connectionId }: { connectionId?: string }) {
  const { data, t, text } = useGovernance();
  const { snapshot, mode, createRemediation } = useMonitoring();
  const rows = snapshot.alerts.filter((a) => !connectionId || a.connectionId === connectionId);
  return (
    <section className="section-gap">
      <div className="section-header">
        <h2>{t('Governance alerts', 'Alertes de gouvernance')}</h2>
        <span className="small muted">{t('Requires human review', 'Examen humain requis')}</span>
      </div>
      <DataTable
        rows={rows}
        caption={t('Governance alerts', 'Alertes de gouvernance')}
        searchText={(a) => `${text(a.title)} ${a.systemId} ${a.id}`}
        columns={[
          {
            id: 'alert',
            title: t('Alert', 'Alerte'),
            render: (a) => (
              <>
                <Link
                  className="text-link"
                  href={`/monitoring/incidents/${encodeURIComponent(a.id)}`}
                >
                  {text(a.title)}
                </Link>
                <p className="table-meta">
                  {text(data.systems.find((s) => s.id === a.systemId)?.name || a.systemId)}
                </p>
              </>
            ),
          },
          {
            id: 'severity',
            title: t('Severity', 'Gravité'),
            render: (a) => (
              <span className={`severity severity-${a.severity.toLowerCase()}`}>
                {text(severityLabels[a.severity])}
              </span>
            ),
          },
          {
            id: 'date',
            title: t('Detected', 'Détecté'),
            value: (a) => a.timestamp,
            render: (a) => <TelemetryTime value={a.timestamp} relative />,
          },
          {
            id: 'action',
            title: t('Follow-up', 'Suivi'),
            render: (a) =>
              a.taskId ? (
                <Link
                  className="text-link"
                  href={`/remediation?record=${encodeURIComponent(a.taskId)}`}
                >
                  {t('View remediation', 'Voir le correctif')}
                </Link>
              ) : (
                <Button disabled={mode === 'live'} onClick={() => createRemediation(a)}>
                  {mode === 'demo'
                    ? t('Create remediation', 'Créer un correctif')
                    : t('Backend workflow required', 'Flux backend requis')}
                </Button>
              ),
          },
        ]}
      />
    </section>
  );
}
export function MonitoringDashboard() {
  const { t } = useGovernance();
  const { snapshot, now, loading, error, mode, stream } = useMonitoring();
  const [minutes, setMinutes] = useState(15);
  const summary = summarize(snapshot, minutes, now);
  return (
    <>
      <PageHeader
        title={t('Live monitoring', 'Surveillance en temps réel')}
        description={t(
          'Observe AI connectivity, decision activity and governance signals.',
          'Suivez la connectivité IA, les décisions et les signaux de gouvernance.',
        )}
        action={
          <Link className="button button-primary" href="/integrations?setup=ai">
            <Plus size={15} />
            {t('Set up AI connector', 'Configurer un connecteur IA')}
          </Link>
        }
      />
      <ModeToolbar />
      <section
        className="panel metrics"
        aria-label={t('Monitoring summary', 'Résumé de surveillance')}
      >
        {[
          {
            label: t('Connected AI systems', 'Systèmes IA connectés'),
            value: summary.connectedSystems,
          },
          {
            label: t('Decisions processed', 'Décisions traitées'),
            value: summary.decisionsProcessed,
          },
          {
            label: t('Average latency', 'Latence moyenne'),
            value: summary.averageLatencyMs === null ? '—' : `${summary.averageLatencyMs} ms`,
          },
          {
            label: t('Active governance alerts', 'Alertes de gouvernance actives'),
            value: summary.activeAlerts,
          },
        ].map((m) => (
          <div className="metric" key={m.label}>
            <p className="metric-label">{m.label}</p>
            <strong className="metric-value">
              {loading || error || (mode === 'live' && stream.status !== 'CONNECTED')
                ? '—'
                : m.value}
            </strong>
            <p className="metric-note">
              {t('From current monitoring records', 'Selon les dossiers de surveillance actuels')}
            </p>
          </div>
        ))}
      </section>
      <section className="panel section-gap">
        <div className="panel-heading">
          <h2>{t('Decision activity', 'Activité des décisions')}</h2>
          <Select
            aria-label={t('Monitoring period', 'Période de surveillance')}
            value={minutes}
            onChange={(e) => setMinutes(Number(e.target.value))}
          >
            <option value={5}>{t('Last 5 minutes', '5 dernières minutes')}</option>
            <option value={15}>{t('Last 15 minutes', '15 dernières minutes')}</option>
          </Select>
        </div>
        <DecisionActivityChart minutes={minutes} />
      </section>
      <section className="section-gap">
        <ConnectionsTable />
      </section>
      <div className="section-gap">
        <LiveActivityFeed />
      </div>
      <GovernanceAlerts />
    </>
  );
}
