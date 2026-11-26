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
                  'Synthetic configuration; no provider credentials are collected.',
                  'Configuration synthétique ; aucun identifiant fournisseur collecté.',
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
  const [step, setStep] = useState(1);
  const [provider, setProvider] = useState<AIProvider>('OPENAI');
  const [systemId, setSystem] = useState(initialSystem || data.systems[0]?.id || '');
  const [url, setUrl] = useState('https://connector.example.invalid');
  const [label, setLabel] = useState('');
  const [model, setModel] = useState('synthetic-model');
  const [version, setVersion] = useState('demo-1');
  const [deployment, setDeployment] = useState('demo-deployment');
  const [selected, setSelected] = useState<MonitoringCapability[]>(['HEALTH', 'LATENCY']);
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
    endpoint: { url: url.trim(), label: label.trim(), credentialConfigured: false },
    capabilities: selected,
  };
  const steps = [
    t('Select provider', 'Choisir un fournisseur'),
    t('Select AI system', 'Choisir un système IA'),
    t('Connection metadata', 'Métadonnées de connexion'),
    t('Monitoring capabilities', 'Capacités de surveillance'),
    t('Test connection', 'Tester la connexion'),
    t('Review and save', 'Vérifier et enregistrer'),
  ];
  function invalidate() {
    setResult(null);
    setError('');
  }
  async function test() {
    setBusy(true);
    setError('');
    try {
      validateConfiguration(config);
      setResult(await testConfiguration(config));
    } catch (e) {
      setError(
        t(
          'Connection test unavailable. Verify the configuration and backend.',
          'Test indisponible. Vérifiez la configuration et le backend.',
        ),
      );
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    if (!result?.success) return;
    setBusy(true);
    setError('');
    try {
      const connection = await saveConnection(config);
      setSaved(connection.id);
    } catch {
      setError(
        t(
          'Connection could not be saved. No demo fallback was used.',
          'La connexion n’a pas pu être enregistrée. Aucun repli vers la démo.',
        ),
      );
    } finally {
      setBusy(false);
    }
  }
  function next() {
    setError('');
    if (step === 2 && !data.systems.some((s) => s.id === systemId)) {
      setError(t('Select a registered AI system.', 'Choisissez un système IA enregistré.'));
      return;
    }
    if (
      step === 3 &&
      (!safeEndpoint(url) || !model.trim() || !version.trim() || !deployment.trim())
    ) {
      setError(
        t(
          'Enter model, version, deployment and an HTTPS endpoint without credentials or query parameters. Local HTTP is allowed.',
          'Indiquez modèle, version, déploiement et une URL HTTPS sans identifiants ni paramètres. HTTP local est autorisé.',
        ),
      );
      return;
    }
    if (step === 4 && !selected.length) {
      setError(
        t(
          'Select at least one supported capability.',
          'Choisissez au moins une capacité prise en charge.',
        ),
      );
      return;
    }
    setStep((s) => Math.min(6, s + 1));
  }
  return (
    <Dialog
      open
      onClose={onClose}
      title={t('Set up AI connector', 'Configurer un connecteur IA')}
      description={
        saved
          ? t('Configuration saved', 'Configuration enregistrée')
          : `${t('Step', 'Étape')} ${step} / 6 · ${steps[step - 1]}`
      }
      footer={
        saved ? (
          <Button onClick={onClose}>{t('Close', 'Fermer')}</Button>
        ) : (
          <>
            <Button onClick={onClose} disabled={busy}>
              {t('Cancel', 'Annuler')}
            </Button>
            {step > 1 && (
              <Button disabled={busy} onClick={() => setStep((s) => s - 1)}>
                {t('Back', 'Retour')}
              </Button>
            )}
            {step < 6 ? (
              <Button
                variant="primary"
                type="submit"
                form={id}
                disabled={busy || (step === 5 && !result?.success)}
              >
                {t('Next', 'Suivant')}
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={() => void save()}
                disabled={busy || !result?.success}
              >
                {busy
                  ? t('Saving…', 'Enregistrement…')
                  : t('Save connector', 'Enregistrer le connecteur')}
              </Button>
            )}
          </>
        )
      }
    >
      {saved ? (
        <>
          <p>
            {mode === 'demo'
              ? t(
                  'Demo connector saved. This does not verify an external provider connection.',
                  'Connecteur de démonstration enregistré. Aucune connexion externe vérifiée.',
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
            next();
          }}
        >
          <p className="small muted" style={{ marginBottom: 16 }}>
            {mode === 'demo'
              ? t(
                  'Demo mode · tests and connections are simulated. Never enter API keys.',
                  'Mode démo · tests et connexions simulés. Ne saisissez jamais de clés API.',
                )
              : t(
                  'Credentials are managed by the backend secret store. This form accepts metadata only.',
                  'Les identifiants sont gérés par le coffre du backend. Ce formulaire accepte uniquement des métadonnées.',
                )}
          </p>
          {step === 1 && (
            <div className="field">
              <label htmlFor={`${id}-provider`}>{t('AI provider', 'Fournisseur IA')}</label>
              <Select
                id={`${id}-provider`}
                value={provider}
                onChange={(e) => {
                  const p = e.target.value as AIProvider;
                  setProvider(p);
                  setSelected(providers[p].capabilities.slice(0, 2));
                  invalidate();
                }}
              >
                {providerTypes.map((p) => (
                  <option key={p} value={p}>
                    {text(providers[p].label)}
                  </option>
                ))}
              </Select>
              <p className="small muted">{text(providers[provider].note)}</p>
            </div>
          )}
          {step === 2 && (
            <div className="field">
              <label htmlFor={`${id}-system`}>
                {t('Registered AI system', 'Système IA enregistré')}
              </label>
              <Select
                id={`${id}-system`}
                value={systemId}
                onChange={(e) => {
                  setSystem(e.target.value);
                  invalidate();
                }}
              >
                {data.systems.map((s) => (
                  <option key={s.id} value={s.id}>
                    {text(s.name)}
                  </option>
                ))}
              </Select>
            </div>
          )}
          {step === 3 && (
            <>
              {[
                {
                  key: 'endpoint',
                  label: t('Endpoint URL', 'URL du point de terminaison'),
                  value: url,
                  set: setUrl,
                },
                {
                  key: 'label',
                  label: t('Endpoint label', 'Libellé du point de terminaison'),
                  value: label,
                  set: setLabel,
                },
                {
                  key: 'model',
                  label: t('Model reference', 'Référence du modèle'),
                  value: model,
                  set: setModel,
                },
                {
                  key: 'version',
                  label: t('Model version', 'Version du modèle'),
                  value: version,
                  set: setVersion,
                },
                {
                  key: 'deployment',
                  label: t('Deployment reference', 'Référence du déploiement'),
                  value: deployment,
                  set: setDeployment,
                },
              ].map((f) => (
                <div className="field" key={f.key}>
                  <label htmlFor={`${id}-${f.key}`}>{f.label}</label>
                  <Input
                    id={`${id}-${f.key}`}
                    value={f.value}
                    required={f.key !== 'label'}
                    maxLength={500}
                    onChange={(e) => {
                      f.set(e.target.value);
                      invalidate();
                    }}
                  />
                </div>
              ))}
              <p className="small muted">
                {t(
                  'Metadata only. No keys, tokens, authorization headers, prompts or responses.',
                  'Métadonnées uniquement. Aucune clé, jeton, en-tête d’autorisation, requête ou réponse.',
                )}
              </p>
            </>
          )}
          {step === 4 && (
            <fieldset className="capability-list">
              <legend>
                {t('Permitted monitoring capabilities', 'Capacités de surveillance autorisées')}
              </legend>
              {Object.entries(capabilityLabels).map(([key, label]) => {
                const capability = key as MonitoringCapability,
                  supported = providers[provider].capabilities.includes(capability);
                return (
                  <label key={key}>
                    <input
                      type="checkbox"
                      checked={selected.includes(capability)}
                      disabled={!supported}
                      onChange={(e) => {
                        setSelected((s) =>
                          e.target.checked ? [...s, capability] : s.filter((c) => c !== capability),
                        );
                        invalidate();
                      }}
                    />
                    <span>
                      {text(label)}
                      {!supported && (
                        <span className="small muted">
                          {' '}
                          · {t('Not exposed by this connector', 'Non exposé par ce connecteur')}
                        </span>
                      )}
                    </span>
                  </label>
                );
              })}
            </fieldset>
          )}
          {step === 5 && (
            <>
              <p>{text(providers[provider].note)}</p>
              <Button className="section-gap" onClick={() => void test()} disabled={busy}>
                {busy
                  ? t('Testing…', 'Test en cours…')
                  : mode === 'demo'
                  ? t('Run simulated test', 'Lancer le test simulé')
                  : t('Run backend test', 'Lancer le test backend')}
              </Button>
              {result && (
                <p className="section-gap" role="status">
                  {text(result.message)}
                </p>
              )}
            </>
          )}
          {step === 6 && (
            <>
              <dl className="metadata-grid">
                <div>
                  <dt>{t('Provider', 'Fournisseur')}</dt>
                  <dd>{text(providers[provider].label)}</dd>
                </div>
                <div>
                  <dt>{t('System', 'Système')}</dt>
                  <dd>{text(data.systems.find((s) => s.id === systemId)?.name || systemId)}</dd>
                </div>
                <div>
                  <dt>{t('Model version', 'Version du modèle')}</dt>
                  <dd>
                    {model} · {version}
                  </dd>
                </div>
                <div>
                  <dt>{t('Deployment', 'Déploiement')}</dt>
                  <dd>{deployment}</dd>
                </div>
                <div>
                  <dt>{t('Endpoint', 'Point de terminaison')}</dt>
                  <dd>{url}</dd>
                </div>
              </dl>
              <p className="small muted">
                {selected.map((c) => text(capabilityLabels[c])).join(' · ')}
              </p>
              <p className="section-gap">
                {mode === 'demo'
                  ? t(
                      'Saving updates the synthetic workspace only. Connection health does not determine compliance.',
                      'L’enregistrement modifie uniquement l’espace synthétique. La connexion ne détermine pas la conformité.',
                    )
                  : t(
                      'The backend must validate tenant access and manage provider credentials.',
                      'Le backend doit valider l’accès et gérer les identifiants du fournisseur.',
                    )}
              </p>
            </>
          )}
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
