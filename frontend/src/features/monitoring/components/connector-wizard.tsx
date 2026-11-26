'use client';
import { useId, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useGovernance } from '../../governance/store';
import { useMonitoring } from '../hooks/monitoring-provider';
import {
  providerTypes,
  type AIProvider,
  type MonitoringCapability,
  type ConnectorConfiguration,
  type ConnectionTestResult,
} from '../types';
import { providers, capabilityLabels } from '../utils/labels';
import { safeEndpoint, validateConfiguration } from '../utils/data';
import { Dialog } from '@/components/ui/dialog';
import { Input, Select } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
export function ConnectorSetup() {
  const { t, data, text } = useGovernance();
  const { mode, snapshot } = useMonitoring();
  const query = useSearchParams().toString();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (new URLSearchParams(query).get('setup') === 'ai') setOpen(true);
  }, [query]);
  return (
    <section className="section-gap">
      <div className="section-header">
        <div>
          <h2>{t('AI connectors', 'Connecteurs IA')}</h2>
          <p className="small muted">
            {mode === 'demo'
              ? t(
                  'Local configuration; provider credentials are not collected.',
                  'Configuration locale ; aucun identifiant fournisseur n’est collecté.',
                )
              : t(
                  'Configuration is saved through the monitoring backend.',
                  'La configuration est enregistrée via le backend de surveillance.',
                )}
          </p>
        </div>
        <Button variant="primary" disabled={!data.systems.length} onClick={() => setOpen(true)}>
          {t('Set up AI connector', 'Configurer un connecteur IA')}
        </Button>
      </div>
      {snapshot.connections.length > 0 && (
        <div className="panel">
          {snapshot.connections.map((c) => (
            <div className="integration-row" key={c.id}>
              <div>
                <h3>{text(data.systems.find((s) => s.id === c.systemId)?.name || c.systemId)}</h3>
                <p className="small muted">
                  {text(providers[c.provider].label)} · {c.modelReference.version}
                </p>
              </div>
              <Link
                className="text-link"
                href={`/monitoring/connections/${encodeURIComponent(c.id)}`}
              >
                {t('Connection details', 'Détails de la connexion')}
              </Link>
            </div>
          ))}
        </div>
      )}
      {open && (
        <ConnectorWizard
          onClose={() => setOpen(false)}
          initialSystem={new URLSearchParams(query).get('system') || undefined}
        />
      )}
    </section>
  );
}
export function ConnectorWizard({
  onClose,
  initialSystem,
}: {
  onClose: () => void;
  initialSystem?: string;
}) {
  const { org, data, t, text } = useGovernance();
  const { mode, testConfiguration, saveConnection } = useMonitoring();
  const id = useId();
  const [provider, setProvider] = useState<AIProvider>('OPENAI');
  const [systemId, setSystem] = useState(initialSystem || data.systems[0]?.id || '');
  const [name, setName] = useState('');
  const [method, setMethod] = useState('Standard (HTTPS)');
  const [url, setUrl] = useState('https://api.openai.com/v1');
  const [port, setPort] = useState('443');
  const [label, setLabel] = useState('');
  const [model, setModel] = useState('gpt-4o-mini');
  const [version, setVersion] = useState('production');
  const [deployment, setDeployment] = useState('default');
  const [apiKey, setApiKey] = useState('');
  const [organization, setOrganization] = useState('');
  const [project, setProject] = useState('');
  const [tls, setTls] = useState(true);
  const [selected, setSelected] = useState<MonitoringCapability[]>(['HEALTH', 'LATENCY']);
  const [tab, setTab] = useState<'parameters' | 'security' | 'advanced'>('parameters');
  const [result, setResult] = useState<ConnectionTestResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState<string | null>(null);
  const config: ConnectorConfiguration = {
    organizationId: org,
    systemId,
    provider,
    modelReference: { id: model.trim(), version: version.trim() },
    deploymentReference: deployment.trim(),
    endpoint: { url: url.trim(), label: name.trim() || label.trim(), credentialConfigured: Boolean(apiKey) },
    capabilities: selected,
  };
  function invalidate() { setResult(null); setError(''); }
  function updateProvider(value: AIProvider) {
    setProvider(value);
    const defaults: Record<AIProvider, string> = {
      OPENAI: 'https://api.openai.com/v1', ANTHROPIC: 'https://api.anthropic.com/v1',
      GOOGLE_GEMINI: 'https://generativelanguage.googleapis.com/v1beta', AZURE_OPENAI: 'https://resource.openai.azure.com',
      OLLAMA: 'http://127.0.0.1:11434', HUGGING_FACE: 'https://api-inference.huggingface.co', CUSTOM_ML: 'https://ai.example.gov/api',
      MLFLOW: 'https://mlflow.example.gov', ENTERPRISE_REST: 'https://ai.example.gov/api', OPENTELEMETRY: 'https://otel.example.gov', WEBHOOK: 'https://hooks.example.gov/ai',
    };
    setUrl(defaults[value]); setPort(value === 'OLLAMA' ? '11434' : '443');
    setSelected(providers[value].capabilities.slice(0, 2)); invalidate();
  }
  async function test() {
    setError('');
    if (!name.trim() || !data.systems.some((s) => s.id === systemId) || !safeEndpoint(url) || !model.trim() || !version.trim() || !deployment.trim()) {
      setError(t('Complete the connection name, registered system, endpoint, model and deployment fields.', 'Remplissez le nom, le système enregistré, le point de terminaison, le modèle et le déploiement.'));
      return;
    }
    setBusy(true);
    try { validateConfiguration(config); setResult(await testConfiguration(config)); }
    catch { setError(t('Connection test unavailable. Verify the configuration and backend.', 'Test indisponible. Vérifiez la configuration et le backend.')); }
    finally { setBusy(false); }
  }
  async function save() {
    setBusy(true); setError('');
    try {
      // Saving configuration is intentionally independent from optional provider
      // verification in prototype mode. The saved record remains Not verified.
      validateConfiguration(config);
      const connection = await saveConnection(config);
      setSaved(connection.id);
    }
    catch { setError(t('Connection could not be saved. No fallback was used.', 'La connexion n’a pas pu être enregistrée. Aucun repli n’a été utilisé.')); }
    finally { setBusy(false); }
  }
  return (
    <Dialog
      open
      onClose={onClose}
      title={t('Set up AI connector', 'Configurer un connecteur IA')}
      description={saved ? t('Configuration saved', 'Configuration enregistrée') : t('Connect a governed AI provider or enterprise AI endpoint', 'Connecter un fournisseur IA gouverné ou un point de terminaison IA d’entreprise')}
      footer={
        saved ? (
          <Button onClick={onClose}>{t('Close', 'Fermer')}</Button>
        ) : (
          <>
            <Button onClick={onClose} disabled={busy}>
              {t('Cancel', 'Annuler')}
            </Button>
            <Button variant="outline" onClick={() => void test()} disabled={busy}>{busy ? t('Testing…', 'Test en cours…') : t('Test connection', 'Tester la connexion')}</Button>
            <Button variant="primary" onClick={() => void save()} disabled={busy || !name.trim() || !model.trim() || !version.trim() || !deployment.trim()}>{busy ? t('Saving…', 'Enregistrement…') : t('Save connection', 'Enregistrer la connexion')}</Button>
          </>
        )
      }
    >
      {saved ? (
        <>
          <p>
            {mode === 'demo'
              ? t(
                  'Configuration saved. External provider verification is not available in this environment.',
                  'Configuration enregistrée. La vérification du fournisseur externe n’est pas disponible dans cet environnement.',
                )
              : t(
                  'The backend accepted the connector configuration.',
                  'Le backend a accepté la configuration.',
                )}
          </p>
          <Link
            className="button button-primary section-gap"
            href={`/monitoring/connections/${encodeURIComponent(saved)}`}
            onClick={onClose}
          >
            {t('Open connection', 'Ouvrir la connexion')}
          </Link>
        </>
      ) : (
        <form
          id={id}
          onSubmit={(e) => {
            e.preventDefault();
            void test();
          }}
        >
          <p className="small muted" style={{ marginBottom: 16 }}>
            {mode === 'demo'
              ? t(
                  'Local mode · external credentials are not collected. Never enter production API keys.',
                  'Mode local · aucun identifiant externe n’est collecté. Ne saisissez jamais de clés API de production.',
                )
              : t(
                  'Credentials are managed by the backend secret store. This form accepts metadata only.',
                  'Les identifiants sont gérés par le coffre du backend. Ce formulaire accepte uniquement des métadonnées.',
                )}
          </p>
          <div className="connector-tabs" role="tablist">
            {(['parameters', 'security', 'advanced'] as const).map((item) => <button key={item} type="button" role="tab" aria-selected={tab === item} className={tab === item ? 'active' : ''} onClick={() => setTab(item)}>{item === 'parameters' ? t('Parameters', 'Paramètres') : item === 'security' ? t('Security', 'Sécurité') : t('Advanced', 'Avancé')}</button>)}
          </div>
          {tab === 'parameters' && <div className="connector-form-grid">
            <div className="field"><label htmlFor={`${id}-name`}>{t('Connection name', 'Nom de la connexion')}</label><Input id={`${id}-name`} value={name} placeholder="OpenAI production" required onChange={(e) => { setName(e.target.value); invalidate(); }} /></div>
            <div className="field"><label htmlFor={`${id}-provider`}>{t('AI provider', 'Fournisseur IA')}</label><Select id={`${id}-provider`} value={provider} onChange={(e) => updateProvider(e.target.value as AIProvider)}>{providerTypes.map((p) => <option key={p} value={p}>{text(providers[p].label)}</option>)}</Select></div>
            <div className="field connector-span-2"><label htmlFor={`${id}-method`}>{t('Connection method', 'Méthode de connexion')}</label><Select id={`${id}-method`} value={method} onChange={(e) => setMethod(e.target.value)}><option>Standard (HTTPS)</option><option>Azure deployment</option><option>Local HTTP</option><option>Enterprise REST adapter</option><option>Webhook (signed)</option></Select></div>
            <div className="field connector-span-2"><label htmlFor={`${id}-system`}>{t('Registered AI system', 'Système IA enregistré')}</label><Select id={`${id}-system`} value={systemId} onChange={(e) => { setSystem(e.target.value); invalidate(); }}>{data.systems.map((s) => <option key={s.id} value={s.id}>{text(s.name)}</option>)}</Select></div>
            <div className="field connector-span-2"><label htmlFor={`${id}-url`}>{t('Endpoint URL', 'URL du point de terminaison')}</label><Input id={`${id}-url`} value={url} onChange={(e) => { setUrl(e.target.value); invalidate(); }} /></div>
            <div className="field"><label htmlFor={`${id}-port`}>{t('Port', 'Port')}</label><Input id={`${id}-port`} value={port} onChange={(e) => setPort(e.target.value)} /></div>
            <div className="field"><label htmlFor={`${id}-label`}>{t('Endpoint label', 'Libellé du point de terminaison')}</label><Input id={`${id}-label`} value={label} placeholder="Primary inference API" onChange={(e) => setLabel(e.target.value)} /></div>
          </div>}
          {tab === 'security' && <div className="connector-form-grid">
            <div className="field connector-span-2"><label htmlFor={`${id}-key`}>{t('API key / access token', 'Clé API / jeton d’accès')}</label><Input id={`${id}-key`} type="password" value={apiKey} placeholder={mode === 'demo' ? 'Not collected in local mode' : 'Stored by the backend secret store'} disabled={mode === 'demo'} onChange={(e) => setApiKey(e.target.value)} /><p className="small muted">{t('Never displayed after saving. The browser does not send credentials in local mode.', 'Jamais affiché après l’enregistrement. Le navigateur n’envoie aucun identifiant en mode local.')}</p></div>
            <div className="field"><label htmlFor={`${id}-org`}>{t('Organisation ID', 'ID de l’organisation')}</label><Input id={`${id}-org`} value={organization} onChange={(e) => setOrganization(e.target.value)} /></div>
            <div className="field"><label htmlFor={`${id}-project`}>{t('Project / workspace', 'Projet / espace de travail')}</label><Input id={`${id}-project`} value={project} onChange={(e) => setProject(e.target.value)} /></div>
            <label className="connector-check"><input type="checkbox" checked={tls} onChange={(e) => setTls(e.target.checked)} />{t('Require TLS certificate validation', 'Exiger la validation du certificat TLS')}</label>
          </div>}
          {tab === 'advanced' && (
            <fieldset className="capability-list">
              <legend>{t('Permitted monitoring capabilities', 'Capacités de surveillance autorisées')}</legend>
              {Object.entries(capabilityLabels).map(([key, capabilityLabel]) => { const capability = key as MonitoringCapability; const supported = providers[provider].capabilities.includes(capability); return <label key={key}><input type="checkbox" checked={selected.includes(capability)} disabled={!supported} onChange={(e) => { setSelected((s) => e.target.checked ? [...s, capability] : s.filter((c) => c !== capability)); invalidate(); }} /><span>{text(capabilityLabel)}{!supported && <span className="small muted"> · {t('Not exposed by this connector', 'Non exposé par ce connecteur')}</span>}</span></label>; })}
            </fieldset>
          )}
          <div className="connector-model-grid"><div className="field"><label htmlFor={`${id}-model`}>{t('Model reference', 'Référence du modèle')}</label><Input id={`${id}-model`} value={model} onChange={(e) => { setModel(e.target.value); invalidate(); }} /></div><div className="field"><label htmlFor={`${id}-version`}>{t('Model version', 'Version du modèle')}</label><Input id={`${id}-version`} value={version} onChange={(e) => { setVersion(e.target.value); invalidate(); }} /></div><div className="field"><label htmlFor={`${id}-deployment`}>{t('Deployment reference', 'Référence du déploiement')}</label><Input id={`${id}-deployment`} value={deployment} onChange={(e) => { setDeployment(e.target.value); invalidate(); }} /></div></div>
          <p className="small muted connector-provider-note">{text(providers[provider].note)}</p>
          {result && <p className="section-gap" role="status">{text(result.message)}</p>}
          {error && (
            <p className="field-error section-gap" role="alert">
              {error}
            </p>
          )}
        </form>
      )}
    </Dialog>
  );
}
