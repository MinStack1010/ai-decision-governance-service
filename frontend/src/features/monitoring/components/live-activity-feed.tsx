'use client';
import { useEffect, useState } from 'react';
import { useGovernance } from '../../governance/store';
import { useMonitoring } from '../hooks/monitoring-provider';
import { eventTypes, type AIConnectionEvent, type MonitoringEventType } from '../types';
import { eventLabels, severityLabels } from '../utils/labels';
import { filterEvents } from '../utils/data';
import { updateFeed, pauseFeed, resumeFeed, type FeedState } from '../utils/feed';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/input';
import { Dialog } from '@/components/ui/dialog';
import { TelemetryTime, EventResourceLink } from './shared';
type FeedProps = {
  connectionId?: string;
  decisionsOnly?: boolean;
  title?: string;
  kinds?: MonitoringEventType[];
};
export function LiveActivityFeed(props: FeedProps) {
  const { org } = useGovernance();
  const { mode } = useMonitoring();
  return (
    <ActivityFeed
      key={`${org}:${mode}:${props.connectionId || 'all'}:${
        props.decisionsOnly ? 'decisions' : 'all'
      }`}
      {...props}
    />
  );
}
function ActivityFeed({
  connectionId,
  decisionsOnly = false,
  title,
  kinds,
}: {
  connectionId?: string;
  decisionsOnly?: boolean;
  title?: string;
  kinds?: MonitoringEventType[];
}) {
  const { org, data, t, text } = useGovernance();
  const { snapshot, mode, simulationRunning } = useMonitoring();
  const [state, setState] = useState<FeedState>({ paused: false, visible: [], pending: 0 });
  const [severity, setSeverity] = useState('all');
  const [system, setSystem] = useState('all');
  const [type, setType] = useState('all');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<AIConnectionEvent | null>(null);
  useEffect(() => {
    setState((s) => updateFeed(s, snapshot.events, org));
  }, [snapshot.events, org]);
  const events = filterEvents(state.visible, {
    severity,
    systemId: system,
    type,
    connectionId,
  }).filter((e) => (!decisionsOnly || !!e.decision) && (!kinds || kinds.includes(e.type)));
  const pages = Math.max(1, Math.ceil(events.length / 6));
  const current = Math.min(page, pages);
  const visible = events.slice((current - 1) * 6, current * 6);
  function pause() {
    setState(pauseFeed(snapshot.events, org));
  }
  return (
    <section
      className="panel"
      aria-label={title || t('Recent monitoring events', 'Événements de surveillance récents')}
    >
      <div className="panel-heading">
        <h2>{title || t('Recent monitoring events', 'Événements de surveillance récents')}</h2>
        <Button
          onClick={() => {
            if (state.paused) {
              setState(resumeFeed(snapshot.events, org));
              setPage(1);
            } else pause();
          }}
        >
          {state.paused
            ? t('Resume display', 'Reprendre l’affichage')
            : t('Pause display', 'Suspendre l’affichage')}
        </Button>
      </div>
      <div className="table-toolbar">
        <Select
          aria-label={t('Filter event severity', 'Filtrer la gravité')}
          value={severity}
          onChange={(e) => {
            setSeverity(e.target.value);
            setPage(1);
          }}
        >
          <option value="all">{t('All severities', 'Toutes les gravités')}</option>
          {Object.entries(severityLabels).map(([value, label]) => (
            <option value={value} key={value}>
              {text(label)}
            </option>
          ))}
        </Select>
        <Select
          aria-label={t('Filter event system', 'Filtrer le système')}
          value={system}
          onChange={(e) => {
            setSystem(e.target.value);
            setPage(1);
          }}
        >
          <option value="all">{t('All AI systems', 'Tous les systèmes IA')}</option>
          {data.systems.map((s) => (
            <option value={s.id} key={s.id}>
              {text(s.name)}
            </option>
          ))}
        </Select>
        <Select
          aria-label={t('Filter event type', 'Filtrer le type')}
          value={type}
          onChange={(e) => {
            setType(e.target.value);
            setPage(1);
          }}
        >
          <option value="all">{t('All event types', 'Tous les types')}</option>
          {eventTypes.map((value) => (
            <option value={value} key={value}>
              {text(eventLabels[value])}
            </option>
          ))}
        </Select>
      </div>
      {state.paused && (
        <p className="feed-paused" role="status">
          {state.pending}{' '}
          {mode === 'demo' && !simulationRunning
            ? t(
                'pending retained updates. Display and synthetic generation are paused.',
                'mises à jour conservées en attente. Affichage et génération synthétique suspendus.',
              )
            : t(
                'pending retained updates. Only this display is paused; monitoring continues.',
                'mises à jour conservées en attente. Seul cet affichage est suspendu ; la surveillance continue.',
              )}
        </p>
      )}
      <div
        className="table-scroll"
        role="region"
        tabIndex={0}
        aria-label={t('Monitoring activity table', 'Tableau d’activité de surveillance')}
      >
        <table>
          <caption className="sr-only">
            {title || t('Monitoring activity', 'Activité de surveillance')}
          </caption>
          <thead>
            <tr>
              <th scope="col">{t('Time', 'Heure')}</th>
              <th scope="col">{t('Event', 'Événement')}</th>
              <th scope="col">{t('AI system', 'Système IA')}</th>
              <th scope="col">{t('Severity', 'Gravité')}</th>
              <th scope="col">{t('Resource', 'Ressource')}</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((e) => (
              <tr key={e.id}>
                <td>
                  <TelemetryTime value={e.timestamp} relative />
                </td>
                <td>
                  <button
                    className="text-link"
                    onClick={() => {
                      pause();
                      setSelected(e);
                    }}
                  >
                    {text(eventLabels[e.type])}
                  </button>
                  <p className="table-meta">{text(e.description)}</p>
                </td>
                <td>{text(data.systems.find((s) => s.id === e.systemId)?.name || e.systemId)}</td>
                <td>
                  <span className={`severity severity-${e.severity.toLowerCase()}`}>
                    {text(severityLabels[e.severity])}
                  </span>
                </td>
                <td>
                  <EventResourceLink event={e} />
                </td>
              </tr>
            ))}
            {!visible.length && (
              <tr>
                <td colSpan={5}>
                  <p className="empty">
                    {t(
                      'No monitoring events match these filters.',
                      'Aucun événement ne correspond à ces filtres.',
                    )}
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="table-footer">
        <span className="nums">
          {events.length} {t('retained events', 'événements conservés')} ·{' '}
          {mode === 'demo' ? t('Simulated', 'Simulés') : t('Backend events', 'Événements backend')}
        </span>
        <div className="page-actions">
          <Button disabled={current <= 1} onClick={() => setPage(current - 1)}>
            {t('Previous', 'Précédent')}
          </Button>
          <span className="nums">
            {current} / {pages}
          </span>
          <Button
            disabled={current >= pages}
            onClick={() => {
              pause();
              setPage(current + 1);
            }}
          >
            {t('Next', 'Suivant')}
          </Button>
        </div>
      </div>
      {selected && (
        <Dialog
          open
          onClose={() => setSelected(null)}
          title={text(eventLabels[selected.type])}
          description={selected.id}
          drawer
        >
          <p>{text(selected.description)}</p>
          <dl className="metadata-grid">
            <div>
              <dt>{t('Timestamp', 'Horodatage')}</dt>
              <dd>
                <TelemetryTime value={selected.timestamp} />
              </dd>
            </div>
            <div>
              <dt>{t('System', 'Système')}</dt>
              <dd>{selected.systemId}</dd>
            </div>
            <div>
              <dt>{t('Correlation ID', 'ID de corrélation')}</dt>
              <dd>{selected.correlationId || '—'}</dd>
            </div>
            <div>
              <dt>{t('Resource', 'Ressource')}</dt>
              <dd>{selected.relatedResourceId}</dd>
            </div>
            {selected.decision && (
              <>
                <div>
                  <dt>{t('Model / version', 'Modèle / version')}</dt>
                  <dd>
                    {selected.decision.modelReference.id} /{' '}
                    {selected.decision.modelReference.version}
                  </dd>
                </div>
                <div>
                  <dt>{t('Deployment', 'Déploiement')}</dt>
                  <dd>{selected.decision.deploymentReference}</dd>
                </div>
              </>
            )}
          </dl>
          <EventResourceLink event={selected} />
        </Dialog>
      )}
    </section>
  );
}
