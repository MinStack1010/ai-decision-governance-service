'use client';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { ConnectorSetup } from '../monitoring/components/connector-wizard';
import Link from 'next/link';
import { Plus, Download, Plug, RefreshCw, Info } from 'lucide-react';
import { useGovernance } from './store';
import { bi, assessmentOutcome, outcomeLabels, type Task, type Evidence } from './model';
import { requirements } from './fixtures';
import { PageHeader, RecordForm, Notice, DateText } from './shared';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Dialog } from '@/components/ui/dialog';
import { Status } from '@/components/ui/status';
import { DataTable } from '@/components/ui/data-table';
import { downloadCsv } from '@/lib/utils';
export function EvidencePage() {
  const { data, t, text, mutate } = useGovernance();
  const [add, setAdd] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const recordQuery = useSearchParams().get('record');
  useEffect(() => {
    if (recordQuery) setSelected(recordQuery);
  }, [recordQuery]);
  const evidence = data.evidence.find((e) => e.id === selected);
  return (
    <>
      <PageHeader
        title={t('Evidence management', 'Gestion des preuves')}
        description={t(
          'Link supporting records to systems and specific control requirements.',
          'Liez les documents justificatifs aux systèmes et aux exigences de contrôle.',
        )}
        action={
          <Button variant="primary" disabled={!data.systems.length} onClick={() => setAdd(true)}>
            <Plus size={16} />
            {t('Add evidence reference', 'Ajouter une référence')}
          </Button>
        }
      />
      <Notice>
        {t(
          'This demo stores evidence references only. Document contents are not uploaded or retained.',
          'Cette démonstration conserve uniquement les références. Le contenu des documents n’est ni téléversé ni conservé.',
        )}
      </Notice>
      <DataTable
        rows={data.evidence}
        caption={t('Evidence references', 'Références de preuve')}
        searchText={(e) =>
          `${e.name} ${e.id} ${e.owner} ${text(
            data.systems.find((s) => s.id === e.systemId)?.name || '',
          )}`
        }
        filter={{
          label: t('All record types', 'Tous les types'),
          options: [
            { value: 'Document', label: t('Document', 'Document') },
            { value: 'Test report', label: t('Test report', 'Rapport de test') },
            { value: 'Record', label: t('Record', 'Dossier') },
          ],
          getValue: (e) => e.type,
        }}
        columns={[
          {
            id: 'name',
            title: t('Evidence record', 'Document de preuve'),
            value: (e) => e.name,
            render: (e) => (
              <>
                <button className="text-link table-primary" onClick={() => setSelected(e.id)}>
                  {e.name}
                </button>
                <div className="table-meta">{e.id}</div>
              </>
            ),
          },
          {
            id: 'system',
            title: t('AI system', 'Système IA'),
            render: (e) => text(data.systems.find((s) => s.id === e.systemId)?.name || e.systemId),
          },
          {
            id: 'control',
            title: t('Control', 'Contrôle'),
            value: (e) => e.requirementId,
            render: (e) => e.requirementId,
          },
          {
            id: 'owner',
            title: t('Added by', 'Ajouté par'),
            value: (e) => e.owner,
            render: (e) => e.owner,
          },
          {
            id: 'date',
            title: t('Added', 'Ajouté le'),
            value: (e) => e.date,
            render: (e) => <DateText value={e.date} />,
          },
        ]}
      />
      {evidence && (
        <Dialog
          open
          onClose={() => setSelected(null)}
          title={evidence.name}
          description={evidence.id}
          drawer
        >
          <dl className="metadata-grid">
            <div>
              <dt>{t('AI system', 'Système IA')}</dt>
              <dd>
                {text(
                  data.systems.find((s) => s.id === evidence.systemId)?.name || evidence.systemId,
                )}
              </dd>
            </div>
            <div>
              <dt>{t('Control requirement', 'Exigence de contrôle')}</dt>
              <dd>
                {evidence.requirementId} ·{' '}
                {text(requirements.find((r) => r.id === evidence.requirementId)!.title)}
              </dd>
            </div>
            <div>
              <dt>{t('Owner', 'Responsable')}</dt>
              <dd>{evidence.owner}</dd>
            </div>
            <div>
              <dt>{t('Added', 'Ajouté le')}</dt>
              <dd>
                <DateText value={evidence.date} />
              </dd>
            </div>
          </dl>
          <Notice>
            {t(
              'Reference metadata only. Retrieve the original document from your approved repository.',
              'Métadonnées de référence uniquement. Récupérez le document original dans votre dépôt approuvé.',
            )}
          </Notice>
          <Link href="/traceability" className="text-link">
            {t('View decision traceability', 'Voir la traçabilité des décisions')}
          </Link>
        </Dialog>
      )}
      {add && (
        <RecordForm
          title={t('Add evidence reference', 'Ajouter une référence de preuve')}
          fields={[
            { key: 'name', label: t('Document name or reference', 'Nom du document ou référence') },
            {
              key: 'system',
              label: t('AI system', 'Système IA'),
              type: 'select',
              options: data.systems.map((s) => ({ value: s.id, label: text(s.name) })),
            },
            {
              key: 'requirement',
              label: t('Control requirement', 'Exigence de contrôle'),
              type: 'select',
              options: requirements.map((r) => ({
                value: r.id,
                label: `${r.id} · ${text(r.title)}`,
              })),
            },
            {
              key: 'type',
              label: t('Record type', 'Type de document'),
              type: 'select',
              options: [
                { value: 'Document', label: t('Document', 'Document') },
                { value: 'Test report', label: t('Test report', 'Rapport de test') },
                { value: 'Record', label: t('Record', 'Dossier') },
              ],
            },
          ]}
          onClose={() => setAdd(false)}
          onSave={(v) => {
            const id = `EVD-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
            mutate(
              (d) =>
                d.evidence.unshift({
                  id,
                  name: v.name,
                  systemId: v.system,
                  requirementId: v.requirement,
                  type: v.type as Evidence['type'],
                  date: new Date().toISOString().slice(0, 10),
                  owner: 'Alex Morgan',
                }),
              bi('Evidence reference added', 'Référence de preuve ajoutée'),
              id,
            );
          }}
        />
      )}
    </>
  );
}
export function Remediation() {
  const { data, t, text, mutate } = useGovernance();
  const [add, setAdd] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const recordQuery = useSearchParams().get('record');
  useEffect(() => {
    if (recordQuery) setSelected(recordQuery);
  }, [recordQuery]);
  const task = data.tasks.find((task) => task.id === selected);
  return (
    <>
      <PageHeader
        title={t('Remediation', 'Mesures correctives')}
        description={t(
          'Assign follow-up work and track it through completion.',
          'Attribuez les actions de suivi et suivez-les jusqu’à leur achèvement.',
        )}
        action={
          <Button variant="primary" disabled={!data.systems.length} onClick={() => setAdd(true)}>
            <Plus size={16} />
            {t('Create task', 'Créer une tâche')}
          </Button>
        }
      />
      <DataTable
        rows={data.tasks}
        caption={t('Remediation tasks', 'Tâches correctives')}
        searchText={(r) => `${r.id} ${text(r.title)} ${r.owner}`}
        filter={{
          label: t('All task statuses', 'Tous les états'),
          options: [
            { value: 'open', label: t('Open', 'Ouvert') },
            { value: 'in-progress', label: t('In progress', 'En cours') },
            { value: 'closed', label: t('Closed', 'Fermé') },
          ],
          getValue: (r) => r.state,
        }}
        columns={[
          {
            id: 'title',
            title: t('Task', 'Tâche'),
            value: (r) => text(r.title),
            render: (r) => (
              <>
                <button className="text-link table-primary" onClick={() => setSelected(r.id)}>
                  {text(r.title)}
                </button>
                <div className="table-meta">{r.id}</div>
              </>
            ),
          },
          {
            id: 'system',
            title: t('System', 'Système'),
            render: (r) => text(data.systems.find((s) => s.id === r.systemId)?.name || r.systemId),
          },
          {
            id: 'owner',
            title: t('Owner', 'Responsable'),
            value: (r) => r.owner,
            render: (r) => r.owner,
          },
          {
            id: 'due',
            title: t('Due date', 'Échéance'),
            value: (r) => r.due,
            render: (r) => <DateText value={r.due} />,
          },
          { id: 'state', title: t('Status', 'État'), render: (r) => <Status value={r.state} /> },
        ]}
      />
      {add && (
        <RecordForm
          title={t('Create remediation task', 'Créer une tâche corrective')}
          fields={[
            { key: 'title', label: t('Task title', 'Titre de la tâche') },
            {
              key: 'system',
              label: t('System', 'Système'),
              type: 'select',
              options: data.systems.map((s) => ({ value: s.id, label: text(s.name) })),
            },
            { key: 'owner', label: t('Accountable owner', 'Responsable') },
            { key: 'due', label: t('Due date', 'Échéance'), type: 'date' },
          ]}
          onClose={() => setAdd(false)}
          onSave={(v) => {
            const id = `REM-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
            mutate(
              (d) =>
                d.tasks.unshift({
                  id,
                  title: bi(v.title),
                  systemId: v.system,
                  owner: v.owner,
                  due: v.due,
                  state: 'open',
                }),
              bi('Remediation task created', 'Tâche corrective créée'),
              id,
            );
          }}
        />
      )}
      {task && (
        <RecordForm
          title={text(task.title)}
          description={task.id}
          fields={[
            {
              key: 'state',
              label: t('Task status', 'État de la tâche'),
              type: 'select',
              defaultValue: task.state,
              options: [
                { value: 'open', label: t('Open', 'Ouvert') },
                { value: 'in-progress', label: t('In progress', 'En cours') },
                { value: 'closed', label: t('Closed', 'Fermé') },
              ],
            },
            {
              key: 'note',
              label: t('Progress or completion note', 'Note d’avancement ou de clôture'),
              type: 'textarea',
            },
          ]}
          onClose={() => setSelected(null)}
          onSave={(v) =>
            mutate(
              (d) => {
                d.tasks.find((r) => r.id === task.id)!.state = v.state as Task['state'];
              },
              bi(`Remediation updated: ${v.note}`, `Tâche corrective mise à jour : ${v.note}`),
              task.id,
            )
          }
        />
      )}
    </>
  );
}
export function Risks() {
  const riskSystem = useSearchParams().get('system') || '';
  const { data, t, text } = useGovernance();
  const [threshold, setThreshold] = useState(2);
  const [metric, setMetric] = useState('risk');
  const high = data.systems.filter((s) => s.risk === 'high').length;
  const exceptions = data.systems.filter((s) => s.status === 'noncompliant').length;
  const count = metric === 'risk' ? high : exceptions;
  const rows = data.systems.filter(
    (s) => s.risk === 'high' || s.status === 'noncompliant' || s.status === 'partial',
  );
  return (
    <>
      <PageHeader
        title={t('Risk management', 'Gestion des risques')}
        description={t(
          'Review risk exposure and compare portfolio counts with an internal threshold.',
          'Examinez l’exposition aux risques et comparez les volumes à un seuil interne.',
        )}
      />
      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-heading">
            <h2>{t('Risk distribution', 'Répartition des risques')}</h2>
            <span className="small muted">{t('Registered systems', 'Systèmes enregistrés')}</span>
          </div>
          <div className="panel-content">
            {(['high', 'medium', 'low'] as const).map((risk) => {
              const n = data.systems.filter((s) => s.risk === risk).length;
              return (
                <div className="chart-row" key={risk}>
                  <Status value={risk} />
                  <div className="bar-track">
                    <div
                      className="bar-fill"
                      style={{
                        width: `${data.systems.length ? (n / data.systems.length) * 100 : 0}%`,
                        background: `var(--status-${
                          risk === 'high'
                            ? 'noncompliant'
                            : risk === 'medium'
                            ? 'partial'
                            : 'compliant'
                        })`,
                      }}
                    />
                  </div>
                  <span className="nums">{n}</span>
                </div>
              );
            })}
          </div>
        </section>
        <section className="panel panel-content">
          <h2>{t('Internal threshold', 'Seuil interne')}</h2>
          <div className="field section-gap">
            <label htmlFor="risk-metric">{t('Metric', 'Indicateur')}</label>
            <Select id="risk-metric" value={metric} onChange={(e) => setMetric(e.target.value)}>
              <option value="risk">
                {t('High-risk system count', 'Nombre de systèmes à risque élevé')}
              </option>
              <option value="exceptions">
                {t('Non-compliant system count', 'Nombre de systèmes non conformes')}
              </option>
            </Select>
          </div>
          <div className="field">
            <label htmlFor="threshold">
              {t('Review threshold (systems)', 'Seuil d’examen (systèmes)')}
            </label>
            <Input
              id="threshold"
              type="number"
              min="0"
              max="10000"
              value={threshold}
              onChange={(e) => setThreshold(Math.min(10000, Math.max(0, Number(e.target.value))))}
            />
          </div>
          <p aria-live="polite">
            <strong className="nums">
              {count} / {threshold}
            </strong>{' '}
            ·{' '}
            {count > threshold
              ? t('Threshold exceeded', 'Seuil dépassé')
              : t('Within threshold', 'Dans les limites du seuil')}
          </p>
          <p className="small muted section-gap">
            {t(
              'A planning threshold for this view, not an automated compliance or risk decision.',
              'Un seuil de planification pour cette vue, sans décision automatique de conformité ou de risque.',
            )}
          </p>
        </section>
      </div>
      <div className="section-header">
        <h2>{t('Systems requiring attention', 'Systèmes à surveiller')}</h2>
        <Link className="text-link small" href="/remediation">
          {t('Manage remediation', 'Gérer les correctifs')}
        </Link>
      </div>
      <DataTable
        rows={rows}
        initialQuery={riskSystem}
        caption={t('Risk findings', 'Constats de risque')}
        searchText={(r) => `${r.id} ${text(r.name)} ${r.owner}`}
        columns={[
          {
            id: 'system',
            title: t('System', 'Système'),
            value: (r) => text(r.name),
            render: (r) => (
              <Link className="text-link" href={`/registry?record=${r.id}`}>
                {text(r.name)}
              </Link>
            ),
          },
          {
            id: 'risk',
            title: t('Risk level', 'Niveau de risque'),
            render: (r) => <Status value={r.risk} />,
          },
          {
            id: 'status',
            title: t('Compliance outcome', 'Résultat de conformité'),
            render: (r) => <Status value={r.status} />,
          },
          {
            id: 'reason',
            title: t('Review reason', 'Motif d’examen'),
            render: (r) =>
              r.status === 'noncompliant'
                ? t(
                    'Control exception requires remediation.',
                    'Une exception de contrôle exige une correction.',
                  )
                : r.status === 'partial'
                ? t(
                    'Partially satisfied control; review evidence gaps.',
                    'Contrôle partiellement satisfait : examiner les lacunes.',
                  )
                : t(
                    'High-risk system requires ongoing oversight.',
                    'Un système à risque élevé nécessite une supervision continue.',
                  ),
          },
        ]}
      />
    </>
  );
}
export function AuditLogs() {
  const { data, t, text, lang } = useGovernance();
  return (
    <>
      <PageHeader
        title={t('Audit logs', 'Journaux d’audit')}
        description={t(
          'Review recorded workspace actions and their correlation identifiers.',
          'Examinez les actions consignées et leurs identifiants de corrélation.',
        )}
        action={
          <Button
            onClick={() =>
              downloadCsv('audit-log.csv', [
                [
                  t('Timestamp UTC', 'Horodatage UTC'),
                  t('Actor', 'Acteur'),
                  t('Action', 'Action'),
                  t('Resource', 'Ressource'),
                  t('Result', 'Résultat'),
                  t('Correlation ID', 'ID de corrélation'),
                ],
                ...data.audit.map((e) => [
                  e.date,
                  e.actor,
                  text(e.action),
                  e.resource,
                  e.result,
                  e.correlationId,
                ]),
              ])
            }
          >
            <Download size={15} />
            {t('Export log', 'Exporter le journal')}
          </Button>
        }
      />
      <Notice>
        {t(
          'Local demonstration history. These browser records are editable and are not a tamper-resistant production audit trail.',
          'Historique de démonstration local. Ces données sont modifiables dans le navigateur et ne constituent pas un journal de production inviolable.',
        )}
      </Notice>
      <DataTable
        rows={data.audit}
        caption={t('Audit events', 'Événements d’audit')}
        searchText={(r) =>
          `${r.date} ${r.actor} ${text(r.action)} ${r.resource} ${r.correlationId}`
        }
        filter={{
          label: t('All results', 'Tous les résultats'),
          options: [
            { value: 'Success', label: t('Success', 'Réussite') },
            { value: 'Failed', label: t('Failed', 'Échec') },
          ],
          getValue: (r) => r.result,
        }}
        columns={[
          {
            id: 'date',
            title: t('Timestamp (UTC)', 'Horodatage (UTC)'),
            value: (r) => r.date,
            render: (r) => (
              <time className="small nums" dateTime={r.date}>
                {new Date(r.date).toLocaleString(lang === 'fr' ? 'fr-CA' : 'en-CA', {
                  timeZone: 'UTC',
                  hour12: false,
                })}
              </time>
            ),
          },
          {
            id: 'actor',
            title: t('Actor', 'Acteur'),
            value: (r) => r.actor,
            render: (r) => r.actor,
          },
          {
            id: 'action',
            title: t('Action / resource', 'Action / ressource'),
            render: (r) => (
              <>
                <p className="table-primary">{text(r.action)}</p>
                <div className="table-meta">{r.resource}</div>
              </>
            ),
          },
          {
            id: 'result',
            title: t('Result', 'Résultat'),
            render: (r) => <Status value={r.result === 'Success' ? 'success' : 'failed'} />,
          },
          {
            id: 'correlation',
            title: t('Correlation ID', 'ID de corrélation'),
            render: (r) => (
              <span className="small nums" style={{ overflowWrap: 'anywhere' }}>
                {r.correlationId}
              </span>
            ),
          },
        ]}
      />
    </>
  );
}
export function Integrations() {
  const { data, t, mutate } = useGovernance();
  const [configure, setConfigure] = useState<string | null>(null);
  const integration = data.integrations.find((i) => i.id === configure);
  return (
    <>
      <PageHeader
        title={t('Integrations', 'Intégrations')}
        description={t(
          'Configure workspace connections and inspect synchronization activity.',
          'Configurez les connexions et examinez l’activité de synchronisation.',
        )}
      />
      <Notice>
        {t(
          'Simulation mode. No external service is contacted and no credentials are collected.',
          'Mode simulation. Aucun service externe n’est contacté et aucun identifiant n’est collecté.',
        )}
      </Notice>
      <section className="panel">
        {data.integrations.map((i) => (
          <div key={i.id} className="integration-row">
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <Plug size={18} className="muted" aria-hidden="true" />
              <div>
                <h2>
                  {i.id === 'INT-01'
                    ? t('Document repository', 'Dépôt documentaire')
                    : i.id === 'INT-02'
                    ? t('Model registry', 'Registre des modèles')
                    : t('Issue tracker', 'Suivi des tickets')}
                </h2>
                <p className="small muted">
                  {i.synced ? (
                    <>
                      <span>{t('Last simulation', 'Dernière simulation')}: </span>
                      <DateText value={i.synced} />
                    </>
                  ) : (
                    t('No synchronization activity', 'Aucune activité de synchronisation')
                  )}
                </p>
              </div>
            </div>
            <div className="page-actions">
              <Status value={i.connected ? 'approved' : 'disconnected'} />
              {i.connected && (
                <Button
                  onClick={() =>
                    mutate(
                      (d) => {
                        const record = d.integrations.find((r) => r.id === i.id)!;
                        record.synced = new Date().toISOString();
                        if (i.id === 'INT-02' && !d.systems.some((s) => s.id === 'SYS-SYNC'))
                          d.systems.push({
                            id: 'SYS-SYNC',
                            name: bi('Imported model · sample', 'Modèle importé · exemple'),
                            owner: 'Alex Morgan',
                            department: bi('Research', 'Recherche'),
                            risk: 'medium',
                            status: 'insufficient',
                            purpose: bi(
                              'Sample record imported by a simulated synchronization.',
                              'Dossier exemple importé par une synchronisation simulée.',
                            ),
                            updated: new Date().toISOString().slice(0, 10),
                          });
                      },
                      bi(
                        'Integration synchronization simulated',
                        'Synchronisation d’intégration simulée',
                      ),
                      i.id,
                    )
                  }
                >
                  <RefreshCw size={14} />
                  {t('Simulate sync', 'Simuler la synchronisation')}
                </Button>
              )}
              <Button onClick={() => setConfigure(i.id)}>
                {i.connected
                  ? t('Configure', 'Configurer')
                  : t('Set up demo', 'Configurer la démo')}
              </Button>
            </div>
          </div>
        ))}
      </section>
      <ConnectorSetup />
      {integration && (
        <Dialog
          open
          onClose={() => setConfigure(null)}
          title={t('Demo integration settings', 'Paramètres d’intégration de démonstration')}
          description={integration.name}
          footer={
            <>
              <Button onClick={() => setConfigure(null)}>{t('Cancel', 'Annuler')}</Button>
              <Button
                variant={integration.connected ? 'outline' : 'primary'}
                onClick={() => {
                  mutate(
                    (d) => {
                      d.integrations.find((r) => r.id === integration.id)!.connected =
                        !integration.connected;
                    },
                    bi(
                      integration.connected
                        ? 'Demo integration disconnected'
                        : 'Demo integration connected',
                      integration.connected
                        ? 'Intégration de démonstration déconnectée'
                        : 'Intégration de démonstration connectée',
                    ),
                    integration.id,
                  );
                  setConfigure(null);
                }}
              >
                {integration.connected
                  ? t('Disconnect demo', 'Déconnecter la démo')
                  : t('Enable simulation', 'Activer la simulation')}
              </Button>
            </>
          }
        >
          <Notice>
            {t(
              'Enabling this connection changes local demo state. Model registry sync adds one sample AI system; other connectors record a simulated sync event.',
              'Cette connexion modifie l’état local. La synchronisation du registre ajoute un système IA exemple ; les autres connecteurs consignent un événement simulé.',
            )}
          </Notice>
        </Dialog>
      )}
    </>
  );
}
export function Reports() {
  const { data, t, text, mutate } = useGovernance();
  const [type, setType] = useState('portfolio');
  const [scope, setScope] = useState('all');
  function exportReport() {
    const systems = scope === 'all' ? data.systems : data.systems.filter((s) => s.risk === 'high');
    const ids = new Set(systems.map((s) => s.id));
    let rows: unknown[][] = [];
    if (type === 'portfolio')
      rows = [
        [
          t('System ID', 'ID du système'),
          t('System', 'Système'),
          t('Owner', 'Responsable'),
          t('Risk', 'Risque'),
          t('Compliance', 'Conformité'),
        ],
        ...systems.map((s) => [s.id, text(s.name), s.owner, s.risk, text(outcomeLabels[s.status])]),
      ];
    else if (type === 'findings')
      rows = [
        [
          t('Assessment', 'Évaluation'),
          t('System', 'Système'),
          t('Requirement', 'Exigence'),
          t('Outcome', 'Résultat'),
          t('Rationale', 'Motif'),
        ],
        ...data.assessments
          .filter((a) => ids.has(a.systemId))
          .flatMap((a) =>
            a.findings.map((f) => [
              a.id,
              a.systemId,
              f.requirementId,
              text(outcomeLabels[f.outcome]),
              text(f.reason),
            ]),
          ),
      ];
    else
      rows = [
        [
          t('Reference ID', 'ID de référence'),
          t('Name', 'Nom'),
          t('System', 'Système'),
          t('Requirement', 'Exigence'),
          t('Owner', 'Responsable'),
        ],
        ...data.evidence
          .filter((e) => ids.has(e.systemId))
          .map((e) => [e.id, e.name, e.systemId, e.requirementId, e.owner]),
      ];
    downloadCsv(`governance-${type}-${new Date().toISOString().slice(0, 10)}.csv`, rows);
    mutate(() => {}, bi('Report exported', 'Rapport exporté'), type);
  }
  return (
    <>
      <PageHeader
        title={t('Reports', 'Rapports')}
        description={t(
          'Export a reviewable snapshot of your current governance records.',
          'Exportez un instantané vérifiable des dossiers de gouvernance actuels.',
        )}
      />
      <div className="split-workspace">
        <section>
          <h2>{t('Create a report', 'Créer un rapport')}</h2>
          <p className="muted section-gap">
            {t(
              'CSV exports include the selected workspace only. All values come from the current records.',
              'Les exports CSV concernent uniquement l’espace sélectionné. Toutes les valeurs proviennent des dossiers actuels.',
            )}
          </p>
        </section>
        <section className="panel panel-content">
          <div className="field">
            <label htmlFor="report-type">{t('Report content', 'Contenu du rapport')}</label>
            <Select id="report-type" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="portfolio">
                {t('AI portfolio summary', 'Résumé du portefeuille IA')}
              </option>
              <option value="findings">{t('Assessment findings', 'Constats d’évaluation')}</option>
              <option value="evidence">
                {t('Evidence reference inventory', 'Inventaire des références de preuve')}
              </option>
            </Select>
          </div>
          <div className="field">
            <label htmlFor="report-scope">{t('Scope', 'Portée')}</label>
            <Select id="report-scope" value={scope} onChange={(e) => setScope(e.target.value)}>
              <option value="all">
                {t('All registered systems', 'Tous les systèmes enregistrés')}
              </option>
              <option value="high">{t('High-risk systems', 'Systèmes à risque élevé')}</option>
            </Select>
          </div>
          <p className="small muted">
            {t(
              'Format: CSV · Generated on demand · Demonstration records',
              'Format : CSV · Généré à la demande · Données de démonstration',
            )}
          </p>
          <Button variant="primary" className="section-gap" onClick={exportReport}>
            <Download size={16} />
            {t('Generate & download', 'Générer et télécharger')}
          </Button>
        </section>
      </div>
    </>
  );
}
export function SettingsPage() {
  const { t, lang, setLang, org, setOrg, reset } = useGovernance();
  const [confirm, setConfirm] = useState(false);
  return (
    <>
      <PageHeader
        title={t('Settings', 'Paramètres')}
        description={t(
          'Manage local workspace preferences.',
          'Gérez les préférences de l’espace local.',
        )}
      />
      <section className="settings-form">
        <h2>{t('Workspace preferences', 'Préférences de l’espace')}</h2>
        <div className="field section-gap">
          <label htmlFor="settings-language">
            {t('Interface language', 'Langue de l’interface')}
          </label>
          <Select
            id="settings-language"
            value={lang}
            onChange={(e) => setLang(e.target.value as 'en' | 'fr')}
          >
            <option value="en">English</option>
            <option value="fr">Français</option>
          </Select>
        </div>
        <div className="field">
          <label htmlFor="settings-workspace">{t('Workspace', 'Espace de travail')}</label>
          <Select id="settings-workspace" value={org} onChange={(e) => setOrg(e.target.value)}>
            <option value="services">
              {t('Public Services · Demo', 'Services publics · Démo')}
            </option>
            <option value="research">{t('Research Lab · Demo', 'Laboratoire · Démo')}</option>
          </Select>
        </div>
        <p className="small muted">
          {t(
            'Preferences are saved automatically in this browser.',
            'Les préférences sont enregistrées automatiquement dans ce navigateur.',
          )}
        </p>
        <div className="section-gap">
          <h2>{t('Demonstration data', 'Données de démonstration')}</h2>
          <p className="muted section-gap">
            {t(
              'Restore the selected workspace to its initial sample records.',
              'Restaurez les données initiales de l’espace sélectionné.',
            )}
          </p>
          <Button className="section-gap" onClick={() => setConfirm(true)}>
            {t('Reset demo workspace', 'Réinitialiser la démonstration')}
          </Button>
        </div>
      </section>
      <Dialog
        open={confirm}
        onClose={() => setConfirm(false)}
        title={t('Reset this workspace?', 'Réinitialiser cet espace ?')}
        description={t(
          'Local changes in the selected demo workspace will be replaced with the initial sample records.',
          'Les modifications locales de cet espace seront remplacées par les données initiales.',
        )}
        footer={
          <>
            <Button onClick={() => setConfirm(false)}>{t('Cancel', 'Annuler')}</Button>
            <Button
              variant="danger"
              onClick={() => {
                reset();
                setConfirm(false);
              }}
            >
              {t('Reset workspace', 'Réinitialiser l’espace')}
            </Button>
          </>
        }
      >
        <p>
          {t(
            'Other workspaces will keep their records.',
            'Les dossiers des autres espaces seront conservés.',
          )}
        </p>
      </Dialog>
    </>
  );
}
