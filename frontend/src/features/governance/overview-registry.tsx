'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Plus, Download, TriangleAlert, Clock3 } from 'lucide-react';
import { useGovernance } from './store';
import {
  bi,
  outcomes,
  outcomeLabels,
  assessmentOutcome,
  type AISystem,
  type Assessment,
} from './model';
import { PageHeader, RecordForm, useOutcomeFilter, DateText } from './shared';
import { Button } from '@/components/ui/button';
import { Status } from '@/components/ui/status';
import { DataTable } from '@/components/ui/data-table';
import { Dialog } from '@/components/ui/dialog';
import { downloadCsv } from '@/lib/utils';
import { useMonitoring } from '../monitoring/hooks/monitoring-provider';
import { ConnectionStatus, TelemetryTime } from '../monitoring/components/shared';
import { connectionStatuses, providerTypes } from '../monitoring/types';
import { statusLabels, providers } from '../monitoring/utils/labels';
import { Select } from '@/components/ui/input';
export function OutcomeChart({ assessments = false }: { assessments?: boolean }) {
  const { data, t, text } = useGovernance();
  const records = assessments
    ? data.assessments.map(assessmentOutcome)
    : data.systems.map((s) => s.status);
  return (
    <div className="panel-content">
      <div className="chart-total">
        <strong className="nums">{records.length}</strong>
        <span className="muted">
          {assessments
            ? t('assessments', 'évaluations')
            : t('registered systems', 'systèmes enregistrés')}
        </span>
      </div>
      <div
        role="group"
        aria-label={t(
          'Outcome distribution. Values are listed below.',
          'Répartition des résultats. Les valeurs figurent ci-dessous.',
        )}
      >
        {outcomes.map((status) => (
          <div className="chart-row" key={status}>
            <span>{text(outcomeLabels[status])}</span>
            <div className="bar-track">
              <div
                className="bar-fill"
                style={{
                  width: `${
                    records.length
                      ? (records.filter((s) => s === status).length / records.length) * 100
                      : 0
                  }%`,
                  background: `var(--status-${status})`,
                }}
              />
            </div>
            <span className="nums">{records.filter((s) => s === status).length}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
export function RecentAssessments({ limit }: { limit?: number }) {
  const { data, t, text } = useGovernance();
  return (
    <DataTable
      rows={limit ? data.assessments.slice(0, limit) : data.assessments}
      caption={t('Recent assessments', 'Évaluations récentes')}
      searchText={(a) =>
        `${a.id} ${text(data.systems.find((s) => s.id === a.systemId)?.name || '')} ${a.reviewer}`
      }
      columns={[
        {
          id: 'system',
          title: t('AI system', 'Système IA'),
          value: (a) => text(data.systems.find((s) => s.id === a.systemId)?.name || ''),
          render: (a) => (
            <Link className="table-primary text-link" href={`/assessments?record=${a.id}`}>
              {text(data.systems.find((s) => s.id === a.systemId)?.name || a.systemId)}
              <div className="table-meta">{a.id}</div>
            </Link>
          ),
        },
        {
          id: 'outcome',
          title: t('Outcome', 'Résultat'),
          render: (a) => <Status value={assessmentOutcome(a)} />,
        },
        {
          id: 'reviewer',
          title: t('Reviewer', 'Responsable'),
          value: (a) => a.reviewer,
          render: (a) => a.reviewer,
        },
        {
          id: 'date',
          title: t('Assessed', 'Évalué le'),
          value: (a) => a.date,
          render: (a) => <DateText value={a.date} />,
        },
        { id: 'review', title: t('Review', 'Examen'), render: (a) => <Status value={a.state} /> },
      ]}
    />
  );
}
export function Overview() {
  const { data, t } = useGovernance();
  const compliant = data.systems.filter((s) => s.status === 'compliant').length;
  const pending = data.assessments.filter((a) => a.state === 'pending').length;
  const open = data.tasks.filter((s) => s.state !== 'closed').length;
  return (
    <>
      <PageHeader
        title={t('Overview', 'Vue d’ensemble')}
        description={t(
          'Monitor your AI portfolio and work that needs attention.',
          'Suivez votre portefeuille IA et les actions à traiter.',
        )}
        action={
          <Link href="/registry?new=1" className="button button-primary">
            <Plus size={16} aria-hidden="true" />
            {t('Register AI system', 'Enregistrer un système IA')}
          </Link>
        }
      />
      <section
        className="panel metrics"
        aria-label={t('Portfolio summary', 'Résumé du portefeuille')}
      >
        {[
          {
            label: t('Registered systems', 'Systèmes enregistrés'),
            value: data.systems.length,
            note: t('Across this workspace', 'Dans cet espace'),
          },
          {
            label: t('Compliant systems', 'Systèmes conformes'),
            value: compliant,
            note: t('Current assessment outcome', 'Résultat actuel de l’évaluation'),
          },
          {
            label: t('Awaiting human review', 'En attente d’examen'),
            value: pending,
            note: t('Submitted assessments', 'Évaluations soumises'),
          },
          {
            label: t('Open remediation tasks', 'Correctifs ouverts'),
            value: open,
            note: t('Assigned to system owners', 'Attribués aux responsables'),
          },
        ].map((m) => (
          <div className="metric" key={m.label}>
            <p className="metric-label">{m.label}</p>
            <strong className="metric-value">{m.value}</strong>
            <p className="metric-note">{m.note}</p>
          </div>
        ))}
      </section>
      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-heading">
            <h2>{t('Compliance outcomes', 'Résultats de conformité')}</h2>
            <span className="small muted">{t('Current portfolio', 'Portefeuille actuel')}</span>
          </div>
          <OutcomeChart />
        </section>
        <section className="panel">
          <div className="panel-heading">
            <h2>{t('Needs attention', 'À traiter')}</h2>
          </div>
          <div className="alert-item">
            <TriangleAlert size={17} aria-hidden="true" />
            <div>
              <h3>{t('Policy revision available', 'Révision de politique disponible')}</h3>
              <p>
                {t(
                  'Review the proposed explanation and monitoring controls.',
                  'Examinez les contrôles d’explication et de surveillance proposés.',
                )}
              </p>
              <Link className="text-link small" href="/impact">
                {t('Review policy impact', 'Examiner l’impact')}
              </Link>
            </div>
          </div>
          <div className="alert-item">
            <Clock3 size={17} aria-hidden="true" />
            <div>
              <h3>
                {pending} {t('assessments awaiting review', 'évaluations en attente')}
              </h3>
              <p>
                {t(
                  'Confirm findings and supporting evidence before approval.',
                  'Confirmez les constats et les preuves avant approbation.',
                )}
              </p>
              <Link href="/reviews" className="text-link small">
                {t('Open review queue', 'Ouvrir la file d’examen')}
              </Link>
            </div>
          </div>
          <div className="alert-item">
            <TriangleAlert size={17} aria-hidden="true" />
            <div>
              <h3>
                {open} {t('remediation tasks in progress', 'mesures correctives à traiter')}
              </h3>
              <p>
                {t(
                  'Track accountable owners and target dates.',
                  'Suivez les responsables et les dates cibles.',
                )}
              </p>
              <Link className="text-link small" href="/remediation">
                {t('View tasks', 'Voir les tâches')}
              </Link>
            </div>
          </div>
        </section>
      </div>
      <div className="section-header">
        <h2>{t('Recent assessments', 'Évaluations récentes')}</h2>
        <Link href="/assessments" className="text-link small">
          {t('View all assessments', 'Voir toutes les évaluations')}
        </Link>
      </div>
      <RecentAssessments limit={5} />
      <p className="small muted section-gap">
        {t(
          'Demonstration data · Saved in your browser · No live regulatory monitoring',
          'Données de démonstration · Enregistrées dans le navigateur · Sans veille réglementaire en direct',
        )}
      </p>
    </>
  );
}
export function Registry() {
  const { data, t, text, mutate } = useGovernance();
  const [create, setCreate] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [edit, setEdit] = useState(false);
  const filter = useOutcomeFilter();
  const { snapshot, mode, error: monitoringError } = useMonitoring();
  const [connectionFilter, setConnectionFilter] = useState('all');
  const [providerFilter, setProviderFilter] = useState('all');
  const [columns, setColumns] = useState<Record<string, boolean>>({
    connection: true,
    provider: true,
    heartbeat: false,
    health: false,
    decision: false,
    latency: false,
  });
  const connectionFor = (id: string) => snapshot.connections.find((c) => c.systemId === id);
  const connectionState = (id: string) =>
    connectionFor(id)?.status || (mode === 'live' ? 'UNKNOWN' : 'NOT_CONFIGURED');
  const registryRows = data.systems.filter(
    (s) =>
      (connectionFilter === 'all' || connectionState(s.id) === connectionFilter) &&
      (providerFilter === 'all' || connectionFor(s.id)?.provider === providerFilter),
  );
  const query = useSearchParams().toString();
  useEffect(() => {
    const p = new URLSearchParams(query);
    if (p.get('new')) setCreate(true);
    if (p.get('record')) setSelected(p.get('record'));
  }, [query]);
  const system = data.systems.find((s) => s.id === selected);
  const fields = [
    {
      key: 'name',
      label: t('System name', 'Nom du système'),
      defaultValue: edit && system ? text(system.name) : '',
    },
    {
      key: 'owner',
      label: t('Accountable owner', 'Responsable'),
      defaultValue: edit ? system?.owner : undefined,
    },
    {
      key: 'department',
      label: t('Department', 'Service'),
      defaultValue: edit && system ? text(system.department) : '',
    },
    {
      key: 'risk',
      label: t('Risk level', 'Niveau de risque'),
      type: 'select' as const,
      options: [
        { value: 'low', label: t('Low', 'Faible') },
        { value: 'medium', label: t('Medium', 'Moyen') },
        { value: 'high', label: t('High', 'Élevé') },
      ],
      defaultValue: edit ? system?.risk : 'medium',
    },
    {
      key: 'purpose',
      label: t('Intended purpose', 'Finalité prévue'),
      type: 'textarea' as const,
      defaultValue: edit && system ? text(system.purpose) : undefined,
    },
  ];
  return (
    <>
      <PageHeader
        title={t('AI system registry', 'Registre des systèmes IA')}
        description={t(
          'Maintain ownership, purpose, risk, and compliance records for each system.',
          'Gérez les responsables, la finalité, les risques et la conformité de chaque système.',
        )}
        action={
          <>
            <Button
              onClick={() =>
                downloadCsv('ai-system-registry.csv', [
                  [
                    t('ID', 'ID'),
                    t('System', 'Système'),
                    t('Owner', 'Responsable'),
                    t('Risk', 'Risque'),
                    t('Outcome', 'Résultat'),
                  ],
                  ...data.systems.map((s) => [
                    s.id,
                    text(s.name),
                    s.owner,
                    s.risk,
                    text(outcomeLabels[s.status]),
                  ]),
                ])
              }
            >
              <Download size={15} aria-hidden="true" />
              {t('Export', 'Exporter')}
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setEdit(false);
                setCreate(true);
              }}
            >
              <Plus size={16} aria-hidden="true" />
              {t('Register AI system', 'Enregistrer un système IA')}
            </Button>
          </>
        }
      />
      <div className="registry-monitoring-toolbar">
        <span className="small muted">
          {mode === 'demo'
            ? t('Demo connection metadata', 'Métadonnées de connexion de démonstration')
            : t('Live backend metadata', 'Métadonnées backend en direct')}
        </span>
        <Select
          aria-label={t('Filter registry connection status', 'Filtrer l’état de connexion')}
          value={connectionFilter}
          onChange={(e) => setConnectionFilter(e.target.value)}
        >
          <option value="all">{t('All connection states', 'Tous les états de connexion')}</option>
          {connectionStatuses.map((value) => (
            <option key={value} value={value}>
              {text(statusLabels[value])}
            </option>
          ))}
        </Select>
        <Select
          aria-label={t('Filter registry provider', 'Filtrer le fournisseur du registre')}
          value={providerFilter}
          onChange={(e) => setProviderFilter(e.target.value)}
        >
          <option value="all">{t('All providers', 'Tous les fournisseurs')}</option>
          {providerTypes.map((value) => (
            <option key={value} value={value}>
              {text(providers[value].label)}
            </option>
          ))}
        </Select>
        <details className="column-visibility">
          <summary>{t('Connection columns', 'Colonnes de connexion')}</summary>
          <div>
            {[
              { key: 'connection', label: t('Connection status', 'État de connexion') },
              { key: 'provider', label: t('AI provider', 'Fournisseur IA') },
              { key: 'heartbeat', label: t('Last heartbeat', 'Dernier signal') },
              { key: 'health', label: t('Health check', 'Contrôle de l’état') },
              { key: 'decision', label: t('Latest decision', 'Dernière décision') },
              { key: 'latency', label: t('Latency', 'Latence') },
            ].map((c) => (
              <label key={c.key}>
                <input
                  type="checkbox"
                  checked={columns[c.key]}
                  onChange={(e) => setColumns((v) => ({ ...v, [c.key]: e.target.checked }))}
                />
                {c.label}
              </label>
            ))}
          </div>
        </details>
        <Link className="text-link small" href="/monitoring">
          {t('Open monitoring', 'Ouvrir la surveillance')}
        </Link>
      </div>
      {monitoringError && (
        <p className="small muted">
          {t(
            'Live connection metadata unavailable; compliance records remain separate.',
            'Métadonnées de connexion indisponibles ; les dossiers de conformité restent distincts.',
          )}
        </p>
      )}
      <DataTable
        rows={registryRows}
        caption={t('Registered AI systems', 'Systèmes IA enregistrés')}
        searchText={(s) => `${text(s.name)} ${s.id} ${s.owner} ${text(s.department)}`}
        filter={{ ...filter, getValue: (s) => s.status }}
        columns={[
          {
            id: 'name',
            title: t('System name', 'Nom du système'),
            value: (s) => text(s.name),
            render: (s) => (
              <>
                <button className="text-link table-primary" onClick={() => setSelected(s.id)}>
                  {text(s.name)}
                </button>
                <div className="table-meta">{s.id}</div>
              </>
            ),
          },
          {
            id: 'department',
            title: t('Department', 'Service'),
            value: (s) => text(s.department),
            render: (s) => text(s.department),
          },
          {
            id: 'owner',
            title: t('Owner', 'Responsable'),
            value: (s) => s.owner,
            render: (s) => s.owner,
          },
          ...[
            {
              id: 'connection',
              title: t('Connection', 'Connexion'),
              render: (s: AISystem) => <ConnectionStatus status={connectionState(s.id)} />,
            },
            {
              id: 'provider',
              title: t('AI provider', 'Fournisseur IA'),
              render: (s: AISystem) =>
                connectionFor(s.id) ? text(providers[connectionFor(s.id)!.provider].label) : '—',
            },
            {
              id: 'heartbeat',
              title: t('Last heartbeat', 'Dernier signal'),
              render: (s: AISystem) => (
                <TelemetryTime value={connectionFor(s.id)?.lastHeartbeat || null} relative />
              ),
            },
            {
              id: 'health',
              title: t('Last successful health check', 'Dernier contrôle réussi'),
              render: (s: AISystem) => (
                <TelemetryTime value={connectionFor(s.id)?.lastSuccessfulHealthCheck || null} />
              ),
            },
            {
              id: 'decision',
              title: t('Latest decision', 'Dernière décision'),
              render: (s: AISystem) => (
                <TelemetryTime
                  value={
                    snapshot.events.find((e) => e.systemId === s.id && e.decision)?.timestamp ||
                    null
                  }
                  relative
                />
              ),
            },
            {
              id: 'latency',
              title: t('Latency', 'Latence'),
              render: (s: AISystem) =>
                connectionFor(s.id)?.averageLatencyMs === null || !connectionFor(s.id)
                  ? '—'
                  : `${connectionFor(s.id)!.averageLatencyMs} ms`,
            },
          ].filter((c) => columns[c.id]),
          { id: 'risk', title: t('Risk', 'Risque'), render: (s) => <Status value={s.risk} /> },
          {
            id: 'status',
            title: t('Compliance', 'Conformité'),
            render: (s) => <Status value={s.status} />,
          },
          {
            id: 'updated',
            title: t('Updated', 'Mise à jour'),
            value: (s) => s.updated,
            render: (s) => <DateText value={s.updated} />,
          },
        ]}
      />
      {system && (
        <Dialog
          open={!!system}
          onClose={() => setSelected(null)}
          title={text(system.name)}
          description={system.id}
          drawer
        >
          <Status value={system.status} />
          <dl className="metadata-grid">
            <div>
              <dt>{t('Owner', 'Responsable')}</dt>
              <dd>{system.owner}</dd>
            </div>
            <div>
              <dt>{t('Department', 'Service')}</dt>
              <dd>{text(system.department)}</dd>
            </div>
            <div>
              <dt>{t('Risk', 'Risque')}</dt>
              <dd>
                <Status value={system.risk} />
              </dd>
            </div>
            <div>
              <dt>{t('Updated', 'Mise à jour')}</dt>
              <dd>
                <DateText value={system.updated} />
              </dd>
            </div>
          </dl>
          <h3>{t('Connectivity', 'Connectivité')}</h3>
          <dl className="metadata-grid">
            <div>
              <dt>{t('Connection status', 'État de connexion')}</dt>
              <dd>
                <ConnectionStatus status={connectionState(system.id)} />
              </dd>
            </div>
            <div>
              <dt>{t('AI provider', 'Fournisseur IA')}</dt>
              <dd>
                {connectionFor(system.id)
                  ? text(providers[connectionFor(system.id)!.provider].label)
                  : '—'}
              </dd>
            </div>
            <div>
              <dt>{t('Last heartbeat', 'Dernier signal')}</dt>
              <dd>
                <TelemetryTime value={connectionFor(system.id)?.lastHeartbeat || null} />
              </dd>
            </div>
            <div>
              <dt>{t('Last successful health check', 'Dernier contrôle réussi')}</dt>
              <dd>
                <TelemetryTime
                  value={connectionFor(system.id)?.lastSuccessfulHealthCheck || null}
                />
              </dd>
            </div>
            <div>
              <dt>{t('Latest decision', 'Dernière décision')}</dt>
              <dd>
                <TelemetryTime
                  value={
                    snapshot.events.find((e) => e.systemId === system.id && e.decision)
                      ?.timestamp || null
                  }
                />
              </dd>
            </div>
            <div>
              <dt>{t('Latency', 'Latence')}</dt>
              <dd>
                {connectionFor(system.id)?.averageLatencyMs === null || !connectionFor(system.id)
                  ? '—'
                  : `${connectionFor(system.id)!.averageLatencyMs} ms`}
              </dd>
            </div>
          </dl>
          <p className="small muted">
            {mode === 'demo'
              ? t(
                  'Simulated connectivity. Connection health is independent of compliance.',
                  'Connectivité simulée. L’état de connexion est indépendant de la conformité.',
                )
              : t(
                  'Backend connectivity. Connection health is independent of compliance.',
                  'Connectivité backend. L’état de connexion est indépendant de la conformité.',
                )}
          </p>
          <Link
            className="button button-outline section-gap"
            href={
              connectionFor(system.id)
                ? `/monitoring/connections/${encodeURIComponent(connectionFor(system.id)!.id)}`
                : `/integrations?setup=ai&system=${encodeURIComponent(system.id)}`
            }
          >
            {t('Monitoring information', 'Informations de surveillance')}
          </Link>
          <h3 className="section-gap">{t('Intended purpose', 'Finalité prévue')}</h3>
          <p className="muted section-gap">{text(system.purpose)}</p>
          <div className="page-actions section-gap">
            <Button
              onClick={() => {
                setEdit(true);
                setCreate(true);
              }}
            >
              {t('Edit record', 'Modifier la fiche')}
            </Button>
            <Link href={`/assessments?system=${system.id}`} className="button button-primary">
              {t('Start assessment', 'Lancer une évaluation')}
            </Link>
          </div>
        </Dialog>
      )}
      {create && (
        <RecordForm
          title={
            edit
              ? t('Edit AI system', 'Modifier le système IA')
              : t('Register AI system', 'Enregistrer un système IA')
          }
          description={t(
            'New systems start with insufficient evidence until assessed.',
            'Un nouveau système dispose de preuves insuffisantes avant son évaluation.',
          )}
          fields={fields}
          onClose={() => setCreate(false)}
          onSave={(v) => {
            const id =
              edit && system ? system.id : `SYS-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
            mutate(
              (d) => {
                if (edit && system) {
                  const s = d.systems.find((s) => s.id === id)!;
                  Object.assign(s, {
                    name: bi(v.name),
                    owner: v.owner,
                    department: bi(v.department),
                    risk: v.risk,
                    purpose: bi(v.purpose),
                    updated: new Date().toISOString().slice(0, 10),
                  });
                } else
                  d.systems.unshift({
                    id,
                    name: bi(v.name),
                    owner: v.owner,
                    department: bi(v.department),
                    risk: v.risk as AISystem['risk'],
                    purpose: bi(v.purpose),
                    status: 'insufficient',
                    updated: new Date().toISOString().slice(0, 10),
                  });
              },
              bi(
                edit ? 'System record updated' : 'AI system registered',
                edit ? 'Fiche du système mise à jour' : 'Système IA enregistré',
              ),
              id,
            );
          }}
        />
      )}
    </>
  );
}
