'use client';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useMonitoring } from '../hooks/monitoring-provider';
import { useGovernance } from '../../governance/store';
import { Notice } from '../../governance/shared';
import { TelemetryTime } from './shared';
export function DecisionContext() {
  const params = useSearchParams();
  const id = params.get('decision');
  const { snapshot, mode, loading } = useMonitoring();
  const { t } = useGovernance();
  if (!id) return null;
  const event = snapshot.events.find((e) => e.decision?.id === id);
  const decision = event?.decision;
  if (loading)
    return (
      <p role="status">{t('Loading decision context…', 'Chargement du contexte de décision…')}</p>
    );
  if (!decision)
    return (
      <Notice>
        {t(
          'This decision is not in the retained event window for the selected workspace and mode.',
          'Cette décision n’est pas dans la fenêtre d’événements conservés de cet espace et de ce mode.',
        )}
      </Notice>
    );
  return (
    <section className="panel panel-content decision-context">
      <div className="section-header">
        <h2>{t('Decision event context', 'Contexte de l’événement de décision')}</h2>
        <span className="small muted">
          {mode === 'demo'
            ? t('Synthetic event', 'Événement synthétique')
            : t('Backend event', 'Événement backend')}
        </span>
      </div>
      <dl className="metadata-grid">
        <div>
          <dt>{t('Decision / trace', 'Décision / trace')}</dt>
          <dd>
            {decision.id}
            <br />
            {decision.traceId}
          </dd>
        </div>
        <div>
          <dt>{t('System / deployment', 'Système / déploiement')}</dt>
          <dd>
            {decision.systemId} / {decision.deploymentReference}
          </dd>
        </div>
        <div>
          <dt>{t('Model / version', 'Modèle / version')}</dt>
          <dd>
            {decision.modelReference.id} / {decision.modelReference.version}
          </dd>
        </div>
        <div>
          <dt>{t('Time / latency', 'Heure / latence')}</dt>
          <dd>
            <TelemetryTime value={decision.timestamp} /> · {decision.latencyMs} ms
          </dd>
        </div>
        <div>
          <dt>{t('Correlation ID', 'ID de corrélation')}</dt>
          <dd>{event.correlationId || '—'}</dd>
        </div>
        <div>
          <dt>{t('Processing outcome', 'Résultat du traitement')}</dt>
          <dd>{decision.success ? t('Processed', 'Traitée') : t('Failed', 'Échec')}</dd>
        </div>
      </dl>
      <div className="page-actions">
        <Link
          className="text-link"
          href={`/monitoring/connections/${encodeURIComponent(decision.connectionId)}`}
        >
          {t('View connection', 'Voir la connexion')}
        </Link>
        {decision.assessmentId && (
          <Link
            className="text-link"
            href={`/assessments?record=${encodeURIComponent(decision.assessmentId)}`}
          >
            {t('View assessment', 'Voir l’évaluation')}
          </Link>
        )}
        {decision.evidenceIds.map((id) => (
          <Link key={id} className="text-link" href={`/evidence?record=${encodeURIComponent(id)}`}>
            {id}
          </Link>
        ))}
      </div>
      <p className="small muted section-gap">
        {t(
          'Decision processing status is separate from the control assessment below. No prompt or response contents are retained.',
          'Le traitement de la décision est distinct de l’évaluation des contrôles ci-dessous. Aucun contenu de requête ou réponse conservé.',
        )}
      </p>
    </section>
  );
}
