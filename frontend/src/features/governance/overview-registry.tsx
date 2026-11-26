'use client';
import { useState, useEffect, useId } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Plus, Download, TriangleAlert, Clock3, CheckCircle2, CircleAlert } from 'lucide-react';
import { useGovernance } from './store';
import {
  bi,
  outcomes,
  outcomeLabels,
  assessmentOutcome,
  type AISystem,
  type Assessment,
} from './model';
import { PageHeader, useOutcomeFilter, DateText } from './shared';
import { Button } from '@/components/ui/button';
import { Status } from '@/components/ui/status';
import { DataTable } from '@/components/ui/data-table';
import { Dialog } from '@/components/ui/dialog';
import { downloadCsv } from '@/lib/utils';
import { useMonitoring } from '../monitoring/hooks/monitoring-provider';
import { ConnectionStatus, TelemetryTime } from '../monitoring/components/shared';
import { connectionStatuses, providerTypes, type AIProvider } from '../monitoring/types';
import { statusLabels, providers } from '../monitoring/utils/labels';
import { Select } from '@/components/ui/input';
import { Input } from '@/components/ui/input';

function AIConnectorManager({
  onClose,
  onSave,
  initial,
}: {
  onClose: () => void;
  onSave: (values: Record<string, string>) => Promise<void> | void;
  initial?: AISystem;
}) {
  const { t, text, data, org } = useGovernance();
  const { snapshot, mode, testConfiguration, saveConnection } = useMonitoring();
  const id = useId();
  const [provider, setProvider] = useState('OPENAI');
  const [selectedSystemId, setSelectedSystemId] = useState(initial?.id || data.systems[0]?.id || '');
  const [tab, setTab] = useState('parameters');
  const [tested, setTested] = useState(false);
  const [systemId] = useState(initial?.id || `SYS-${crypto.randomUUID().slice(0, 6).toUpperCase()}`);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: initial ? text(initial.name) : '', owner: initial?.owner || '', department: initial ? text(initial.department) : '',
    purpose: initial ? text(initial.purpose) : '', endpoint: 'https://api.openai.com/v1', model: 'gpt-4o-mini', version: 'production',
    environment: 'Production', auth: 'API key', credential: '', organization: '', project: '', dataClass: 'Protected B', framework: 'Canadian AI governance',
    monitoring: 'Enabled', interval: '5 minutes', timeout: '30 seconds', retention: '30 days',
  });
  const selectedSystem = data.systems.find((s) => s.id === selectedSystemId);
  const selectedConnection = snapshot.connections.find((c) => c.systemId === selectedSystemId);
  const effectiveSystemId = selectedSystemId || systemId;
  const canSave = Boolean(effectiveSystemId && form.name.trim() && form.endpoint.trim() && form.model.trim());
  const set = (key: string, value: string) => { setForm((v) => ({ ...v, [key]: value })); setTested(false); setError(''); };
  async function test() {
    if (!form.name.trim() || !form.endpoint.trim() || !form.model.trim()) { setError(t('Complete connection name, endpoint and model before testing.', 'Remplissez le nom, le point de terminaison et le modèle avant le test.')); return; }
    setTesting(true); setError('');
    try {
      // Prototype mode does not contact a provider. Treat the optional test as a
      // local configuration check so an unavailable connector never blocks saving.
      if (mode === 'demo') {
        setTested(true);
        return;
      }
      const result = await testConfiguration({ organizationId: org, systemId: effectiveSystemId, provider: provider as AIProvider, modelReference: { id: form.model, version: form.version }, deploymentReference: form.model, endpoint: { url: form.endpoint, label: form.name, credentialConfigured: Boolean(form.credential) }, capabilities: ['HEALTH', 'LATENCY', 'MODEL_VERSION'] });
      if (!result.success) throw new Error('test_failed');
      setTested(true);
    } catch (error) { setError(connectorError(error, t)); }
    finally { setTesting(false); }
  }
  async function save() {
    if (!canSave) { setError(t('Complete the required connection fields before saving.', 'Remplissez les champs obligatoires avant l’enregistrement.')); return; }
    setError('');
    try {
      await saveConnection({ organizationId: org, systemId: effectiveSystemId, provider: provider as AIProvider, modelReference: { id: form.model, version: form.version }, deploymentReference: form.model, endpoint: { url: form.endpoint, label: form.name, credentialConfigured: Boolean(form.credential) }, capabilities: ['HEALTH', 'LATENCY', 'MODEL_VERSION'] });
      await onSave({ ...form, provider, systemId: effectiveSystemId });
    } catch (error) {
      setError(connectorError(error, t));
    }
  }
  return <Dialog open onClose={onClose} title={t('Setup AI connection', 'Configurer la connexion IA')} description={t('Configure a provider connector and register its governed AI system.', 'Configurez un connecteur fournisseur et enregistrez son système IA gouverné.')} footer={<><Button onClick={onClose} disabled={testing}>{t('Cancel', 'Annuler')}</Button><Button onClick={() => void test()} disabled={testing}>{testing ? t('Testing…', 'Test en cours…') : t('Test connection', 'Tester la connexion')}</Button><Button variant="primary" onClick={() => void save()} disabled={testing || !canSave}>{t('Save & Connect', 'Enregistrer et connecter')}</Button></>}>
    <form className="connector-manager" onSubmit={(e) => { e.preventDefault(); void test(); }}>
      <section className="connector-registered"><div className="connector-registered-heading"><div><h3>{t('Registered AI systems', 'Systèmes IA enregistrés')}</h3><p className="small muted">{t('Select a system registered in this governance workspace.', 'Sélectionnez un système enregistré dans cet espace de gouvernance.')}</p></div><span className="small muted">{data.systems.length} {t('systems', 'systèmes')}</span></div>{data.systems.length ? <div className="registered-system-list">{data.systems.map((s) => { const connection = snapshot.connections.find((c) => c.systemId === s.id); return <button type="button" key={s.id} className={`registered-system ${selectedSystemId === s.id ? 'selected' : ''}`} onClick={() => { setSelectedSystemId(s.id); setForm((v) => ({ ...v, name: connection?.endpoint.label || text(s.name), owner: s.owner, department: text(s.department), purpose: text(s.purpose) })); }}><strong>{text(s.name)}</strong><small>{s.id} · {connection ? text(providers[connection.provider].label) : t('Not configured', 'Non configuré')} · {connection ? text(statusLabels[connection.status]) : t('Not configured', 'Non configuré')}</small></button>; })}</div> : <div className="connector-empty"><p>{t('No AI systems are registered yet.', 'Aucun système IA n’est encore enregistré.')}</p><button type="button" className="text-link" onClick={() => setSelectedSystemId('')}>{t('Continue with a new system registration', 'Continuer avec l’enregistrement d’un nouveau système')}</button></div>}</section>
      <section className="connector-config"><div className="connector-config-title"><div><p className="small muted">{selectedSystem ? t('Registered AI system', 'Système IA enregistré') : t('New AI system registration', 'Nouvel enregistrement de système IA')}</p><h3>{selectedSystem ? text(selectedSystem.name) : t('Connection configuration', 'Configuration de la connexion')}</h3><p className="small muted">{t('Provider connection is separate from government registration or certification.', 'La connexion fournisseur est distincte de l’enregistrement ou de la certification gouvernementale.')}</p></div><span className={`connector-status ${tested ? 'verified' : ''}`}>{tested ? <><CheckCircle2 size={14} />{t('Verified', 'Vérifié')}</> : <><CircleAlert size={14} />{t('Not verified', 'Non vérifié')}</>}</span></div><div className="connector-tabs" role="tablist">{[['parameters', 'Parameters'], ['authentication', 'Authentication'], ['monitoring', 'Monitoring'], ['governance', 'Governance'], ['advanced', 'Advanced']].map(([key, label]) => <button type="button" role="tab" aria-selected={tab === key} className={tab === key ? 'active' : ''} key={key} onClick={() => setTab(key)}>{t(label, label)}</button>)}</div>
        {tab === 'parameters' && <div className="connector-fields"><Field id={`${id}-system`} label={t('Registered AI system', 'Système IA enregistré')} value={selectedSystem ? text(selectedSystem.name) : t('New system registration', 'Nouvel enregistrement')} onChange={() => undefined} /><Field id={`${id}-provider`} label={t('AI provider', 'Fournisseur IA')} value={provider} onChange={(v) => { setProvider(v); setTested(false); }} select options={[...providerTypes]} /><Field id={`${id}-name`} label={t('Connection name', 'Nom de la connexion')} value={form.name} onChange={(v) => set('name', v)} placeholder="Primary provider connection" /><Field id={`${id}-endpoint`} label={t('API base URL', 'URL de base API')} value={form.endpoint} onChange={(v) => set('endpoint', v)} /><Field id={`${id}-model`} label={t('Model / deployment name', 'Nom du modèle / déploiement')} value={form.model} onChange={(v) => set('model', v)} /><Field id={`${id}-environment`} label={t('Deployment environment', 'Environnement de déploiement')} value={form.environment} onChange={(v) => set('environment', v)} /><Field id={`${id}-organization`} label={t('Project / organization ID', 'ID du projet / organisation')} value={form.organization} onChange={(v) => set('organization', v)} optional /><Field id={`${id}-project`} label={t('Connection label', 'Libellé de connexion')} value={form.project} onChange={(v) => set('project', v)} optional /></div>}
        {tab === 'authentication' && <div className="connector-fields"><Field id={`${id}-auth`} label={t('Authentication type', 'Type d’authentification')} value={form.auth} onChange={(v) => set('auth', v)} select options={['API key', 'Access token', 'OAuth 2.0', 'Azure AD / IAM', 'None (local network)']} /><Field id={`${id}-credential`} label={t('API key / access token', 'Clé API / jeton d’accès')} value={form.credential} onChange={(v) => set('credential', v)} type="password" optional hint={t('Stored by the backend secret store; never written to browser storage or audit logs.', 'Stocké par le coffre backend ; jamais dans le stockage du navigateur ou les journaux.') } /><Field id={`${id}-reference`} label={t('Credential reference', 'Référence du credential')} value={form.project} onChange={(v) => set('project', v)} optional /><p className="small muted connector-help">{t('Only authentication methods supported by the selected provider should be enabled.', 'Seuls les modes pris en charge par le fournisseur sélectionné doivent être activés.')}</p></div>}
        {tab === 'monitoring' && <div className="connector-fields"><Field id={`${id}-monitoring`} label={t('Monitoring', 'Surveillance')} value={form.monitoring} onChange={(v) => set('monitoring', v)} select options={['Enabled', 'Disabled', 'Configuration required']} /><Field id={`${id}-interval`} label={t('Health-check interval', 'Intervalle de contrôle')} value={form.interval} onChange={(v) => set('interval', v)} select options={['1 minute', '5 minutes', '15 minutes', 'Hourly']} /><p className="connector-section-label">{t('Telemetry collection', 'Collecte de télémétrie')}</p>{['Collect request metrics', 'Collect error events', 'Collect model metadata', 'Collect decision trace references'].map((label) => <label className="connector-check" key={label}><input type="checkbox" defaultChecked />{t(label, label)}</label>)}<p className="small muted connector-help">{t('API access does not imply access to prompts, responses or conversation history.', 'L’accès API n’implique pas l’accès aux prompts, réponses ou historiques de conversation.')}</p></div>}
        {tab === 'governance' && <div className="connector-fields"><Field id={`${id}-owner`} label={t('Accountable owner', 'Responsable')} value={form.owner} onChange={(v) => set('owner', v)} /><Field id={`${id}-department`} label={t('Department', 'Service')} value={form.department} onChange={(v) => set('department', v)} /><Field id={`${id}-purpose`} label={t('Intended purpose', 'Finalité prévue')} value={form.purpose} onChange={(v) => set('purpose', v)} textarea /><Field id={`${id}-framework`} label={t('Applicable governance framework', 'Cadre de gouvernance applicable')} value={form.framework} onChange={(v) => set('framework', v)} /><Field id={`${id}-data`} label={t('Data classification', 'Classification des données')} value={form.dataClass} onChange={(v) => set('dataClass', v)} select options={['Protected A', 'Protected B', 'Protected C', 'Personal information', 'Public']} /><p className="small muted connector-help">{t('Risk and compliance remain evidence-based outputs of the Assessment Engine.', 'Le risque et la conformité restent des résultats fondés sur les preuves du moteur d’évaluation.')}</p></div>}
        {tab === 'advanced' && <div className="connector-fields"><Field id={`${id}-timeout`} label={t('Request timeout', 'Délai de requête')} value={form.timeout} onChange={(v) => set('timeout', v)} /><Field id={`${id}-retention`} label={t('Telemetry retention', 'Conservation de la télémétrie')} value={form.retention} onChange={(v) => set('retention', v)} /><p className="connector-section-label">{t('Security defaults', 'Paramètres de sécurité par défaut')}</p>{['TLS certificate validation', 'Sensitive-data redaction', 'Retry with bounded backoff'].map((label) => <label className="connector-check" key={label}><input type="checkbox" defaultChecked />{t(label, label)}</label>)}</div>}
        {error && <p className="field-error" role="alert">{error}</p>}
      </section>
    </form>
  </Dialog>;
}

function Field({ id, label, value, onChange, placeholder, optional, textarea, type, select, options, hint }: { id: string; label: string; value: string; onChange: (value: string) => void; placeholder?: string; optional?: boolean; textarea?: boolean; type?: string; select?: boolean; options?: string[]; hint?: string }) {
  const { t } = useGovernance();
  return <div className="field"><label htmlFor={id}>{label}{optional ? ` (${t('optional', 'facultatif')})` : ''}</label>{textarea ? <textarea className="textarea" id={id} value={value} onChange={(e) => onChange(e.target.value)} /> : select ? <Select id={id} value={value} onChange={(e) => onChange(e.target.value)}>{options?.map((option) => <option key={option}>{option}</option>)}</Select> : <Input id={id} type={type || 'text'} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />}{hint && <p className="small muted">{hint}</p>}</div>;
}
function connectorError(error: unknown, t: (en: string, fr: string) => string) {
  const message = error instanceof Error ? error.message : '';
  if (/Unknown registered system/i.test(message)) return t('The selected AI system is not registered in this workspace.', 'Le système IA sélectionné n’est pas enregistré dans cet espace.');
  if (/401|invalid api key|authentication/i.test(message)) return t('Authentication failed. Check the API key or access token.', 'Échec de l’authentification. Vérifiez la clé API ou le jeton d’accès.');
  if (/403|permission/i.test(message)) return t('Permission denied by the provider.', 'Accès refusé par le fournisseur.');
  if (/404|not found|model/i.test(message)) return t('The endpoint or requested model was not found.', 'Le point de terminaison ou le modèle demandé est introuvable.');
  if (/408|timeout|abort/i.test(message)) return t('Connection timeout. Verify network access and endpoint latency.', 'Délai de connexion dépassé. Vérifiez le réseau et la latence du point de terminaison.');
  if (/429|rate limit/i.test(message)) return t('Provider rate limit exceeded. Try again later.', 'La limite de débit du fournisseur est dépassée. Réessayez plus tard.');
  if (/HTTP 5|backend/i.test(message)) return t('Backend service unavailable. Check the monitoring connector service.', 'Service backend indisponible. Vérifiez le service du connecteur de surveillance.');
  return t('Connection verification failed. Check the endpoint and connector configuration.', 'Échec de la vérification. Vérifiez le point de terminaison et la configuration du connecteur.');
}
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
          'Workspace data · Saved in your browser · No live regulatory monitoring',
          'Données de l’espace · Enregistrées dans le navigateur · Sans veille réglementaire en direct',
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
              {t('Setup AI connection', 'Configurer une connexion IA')}
            </Button>
          </>
        }
      />
      <div className="registry-monitoring-toolbar">
        <span className="small muted">
          {mode === 'demo'
            ? t('Connection metadata', 'Métadonnées de connexion')
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
          {
            id: 'actions',
            title: t('Actions', 'Actions'),
            render: (s: AISystem) => (
              <div className="table-actions">
                <button className="text-link small" onClick={() => { setEdit(true); setSelected(s.id); setCreate(true); }}>
                  {t('Edit connection', 'Modifier la connexion')}
                </button>
                <Link className="text-link small" href={`/assessments?system=${encodeURIComponent(s.id)}`}>
                  {t('Run assessment', 'Lancer l’évaluation')}
                </Link>
              </div>
            ),
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
                  'Connection data is local to this workspace. Connection health is independent of compliance.',
                  'Les données de connexion sont locales à cet espace. L’état de connexion est indépendant de la conformité.',
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
        <AIConnectorManager
          initial={edit && system ? system : undefined}
          onClose={() => setCreate(false)}
          onSave={async (v) => {
            const existingIds = new Set(data.systems.map((item) => item.id));
            let id = (v.systemId as string) || (edit && system ? system.id : `SYS-${crypto.randomUUID().slice(0, 6).toUpperCase()}`);
            while (!edit && existingIds.has(id))
              id = `SYS-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
            mutate(
              (d) => {
                if (edit && system) {
                  const s = d.systems.find((s) => s.id === id)!;
                  Object.assign(s, { name: bi(v.name), owner: v.owner, department: bi(v.department), purpose: bi(v.purpose), updated: new Date().toISOString().slice(0, 10) });
                } else d.systems.unshift({ id, name: bi(v.name), owner: v.owner, department: bi(v.department), risk: 'medium', purpose: bi(v.purpose), status: 'insufficient', updated: new Date().toISOString().slice(0, 10) });
              },
              bi('Connection configuration saved successfully.', 'Configuration de connexion enregistrée avec succès.'),
              id,
            );
            setCreate(false);
          }}
        />
      )}
    </>
  );
}
