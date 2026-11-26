'use client';
import Link from 'next/link';
import { useGovernance } from '../../governance/store';
import { useMonitoring } from '../hooks/monitoring-provider';
import { statusLabels, providers } from '../utils/labels';
import { relativeTime } from '../utils/data';
import type { AIConnectionStatus, AIConnectionEvent } from '../types';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/input';
import { Notice } from '../../governance/shared';
export function ConnectionStatus({ status }: { status: AIConnectionStatus }) {
  const { text } = useGovernance();
  return (
    <span className={`connection-state connection-${status.toLowerCase()}`}>
      <span className="connection-dot" aria-hidden="true" />
      {text(statusLabels[status])}
    </span>
  );
}
export function TelemetryTime({
  value,
  relative = false,
}: {
  value: string | null;
  relative?: boolean;
}) {
  const { t, lang } = useGovernance();
  const { now } = useMonitoring();
  return value ? (
    <time
      className="nums small"
      dateTime={value}
      title={new Date(value).toLocaleString(lang, { timeZone: 'UTC' }) + ' UTC'}
    >
      {relative
        ? relativeTime(value, now, lang)
        : new Date(value).toLocaleTimeString(lang, { hour12: false, timeZone: 'UTC' }) + ' UTC'}
    </time>
  ) : (
    <span className="muted">{t('Not received', 'Non reçu')}</span>
  );
}
export function ModeToolbar() {
  const { t } = useGovernance();
  const {
    mode,
    setMode,
    snapshot,
    stream,
    simulationRunning,
    setSimulationRunning,
    loading,
    reload,
    error,
  } = useMonitoring();
  return (
    <>
      <div className="monitoring-toolbar">
        <Select
          aria-label={t('Monitoring mode', 'Mode de surveillance')}
          value={mode}
          onChange={(e) => setMode(e.target.value as 'demo' | 'live')}
        >
          <option value="demo">
            {t('Demo · synthetic telemetry', 'Démo · télémétrie synthétique')}
          </option>
          <option value="live">{t('Live backend', 'Backend en direct')}</option>
        </Select>
        {mode === 'demo' && (
          <Button onClick={() => setSimulationRunning(!simulationRunning)}>
            {simulationRunning
              ? t('Pause simulation', 'Suspendre la simulation')
              : t('Resume simulation', 'Reprendre la simulation')}
          </Button>
        )}
        <span className="small muted">
          {mode === 'demo'
            ? simulationRunning
              ? t('Simulation running', 'Simulation en cours')
              : t('Simulation paused', 'Simulation suspendue')
            : stream.status === 'CONNECTED'
            ? t('Stream connected', 'Flux connecté')
            : stream.status === 'RECONNECTING'
            ? t('Reconnecting stream', 'Reconnexion du flux')
            : t('No verified live stream', 'Aucun flux en direct vérifié')}
        </span>
        <span className="small muted monitoring-updated">
          {t('Last update', 'Dernière mise à jour')}: <TelemetryTime value={snapshot.updatedAt} />
        </span>
        <Button disabled={loading} onClick={() => void reload()}>
          {t('Refresh', 'Actualiser')}
        </Button>
      </div>
      {mode === 'demo' ? (
        <Notice>
          {t(
            'Synthetic monitoring data. No external provider connection is verified. No prompts, responses or personal records are captured.',
            'Données de surveillance synthétiques. Aucune connexion externe vérifiée. Aucun contenu de requête, réponse ou dossier personnel capturé.',
          )}
        </Notice>
      ) : (
        <Notice>
          {t(
            'Live mode reads your configured monitoring backend only. Missing telemetry is shown as unavailable.',
            'Le mode direct lit uniquement le backend configuré. La télémétrie manquante est indiquée comme indisponible.',
          )}
        </Notice>
      )}
      {error && (
        <div className="notice field-error" role="alert">
          {t(
            'Monitoring is unavailable. Check the backend connection and try again.',
            'La surveillance est indisponible. Vérifiez la connexion backend et réessayez.',
          )}{' '}
          <span className="small">{error}</span>
        </div>
      )}
      {stream.error && !error && (
        <p className="notice" role="status">
          {t(
            'The event stream is reconnecting. Displayed telemetry may be stale.',
            'Le flux se reconnecte. La télémétrie affichée peut être périmée.',
          )}
        </p>
      )}
    </>
  );
}
export function EventResourceLink({ event, label }: { event: AIConnectionEvent; label?: string }) {
  const { t } = useGovernance();
  const href =
    event.relatedResourceType === 'decision'
      ? `/traceability?decision=${encodeURIComponent(
          event.relatedResourceId,
        )}&system=${encodeURIComponent(event.systemId)}`
      : undefined;
  return (
    <Link className="text-link small" href={href || eventResourceHref(event)}>
      {label || t('Open related record', 'Ouvrir le dossier lié')}
    </Link>
  );
}
import { eventHref as eventResourceHref } from '../utils/data';
export function ProviderName({ provider }: { provider: keyof typeof providers }) {
  const { text } = useGovernance();
  return <>{text(providers[provider].label)}</>;
}
