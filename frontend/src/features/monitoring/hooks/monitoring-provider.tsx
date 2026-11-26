'use client';
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { useGovernance } from '../../governance/store';
import { bi } from '../../governance/model';
import { DemoMonitoringService } from '../services/demo-service';
import { HttpMonitoringService } from '../services/http-service';
import type {
  MonitoringService,
  MonitoringMode,
  MonitoringSnapshot,
  MonitoringStreamState,
  AIConnection,
  ConnectorConfiguration,
  ConnectionTestResult,
  MonitoringAlert,
} from '../types';
import { applyEvent, mergeEvents, alertsFromEvents } from '../utils/data';
const empty = (): MonitoringSnapshot => ({
  connections: [],
  events: [],
  alerts: [],
  updatedAt: null,
});
const initialStream: MonitoringStreamState = {
  status: 'IDLE',
  attempt: 0,
  lastEventId: null,
  lastHeartbeat: null,
  error: null,
};
interface MonitoringContextValue {
  mode: MonitoringMode;
  setMode: (mode: MonitoringMode) => void;
  snapshot: MonitoringSnapshot;
  loading: boolean;
  error: string | null;
  stream: MonitoringStreamState;
  simulationRunning: boolean;
  setSimulationRunning: (running: boolean) => void;
  now: number;
  reload: () => Promise<void>;
  testConnection: (id: string) => Promise<ConnectionTestResult>;
  reconnect: (id: string) => Promise<AIConnection>;
  testConfiguration: (config: ConnectorConfiguration) => Promise<ConnectionTestResult>;
  saveConnection: (config: ConnectorConfiguration) => Promise<AIConnection>;
  service: MonitoringService | null;
  createRemediation: (alert: MonitoringAlert) => void;
}
const Context = createContext<MonitoringContextValue | null>(null);
export function MonitoringProvider({ children }: { children: ReactNode }) {
  const { org, ready, data, mutate } = useGovernance();
  const [mode, setMode] = useState<MonitoringMode>(
    process.env.NEXT_PUBLIC_MONITORING_MODE === 'live' ? 'live' : 'demo',
  );
  const [snapshot, setSnapshot] = useState<MonitoringSnapshot>(empty);
  const snapshotRef = useRef(snapshot);
  const [stream, setStream] = useState(initialStream);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [service, setService] = useState<MonitoringService | null>(null);
  const [simulationRunning, setSimulationState] = useState(true);
  const [now, setNow] = useState(Date.now);
  const [loadedFor, setLoadedFor] = useState('');
  const demos = useRef(new Map<string, DemoMonitoringService>());
  const generation = useRef(0);
  const active = useRef({ org, mode });
  active.current = { org, mode };
  const currentData = useRef(data);
  currentData.current = data;
  const mutateRef = useRef(mutate);
  mutateRef.current = mutate;
  const abortRef = useRef<AbortController | null>(null);
  const loadRef = useRef<() => Promise<void>>(async () => {});
  const audited = useRef(new Set<string>());
  const commit = useCallback((next: MonitoringSnapshot) => {
    snapshotRef.current = next;
    setSnapshot(next);
  }, []);
  useEffect(() => {
    if (!ready) return;
    const epoch = ++generation.current;
    let alive = true;
    const controller = new AbortController();
    abortRef.current = controller;
    let subscription: { unsubscribe: () => void } | null = null;
    let refreshing = false;
    let selected: MonitoringService;
    setLoadedFor(`${org}:${mode}`);
    commit(empty());
    setLoading(true);
    setError(null);
    setStream(initialStream);
    setSimulationState(true);
    audited.current.clear();
    try {
      if (mode === 'demo') {
        let demo = demos.current.get(org);
        if (!demo) {
          demo = new DemoMonitoringService(org, currentData.current);
          demos.current.set(org, demo);
        }
        demo.updateWorkspace(currentData.current);
        demo.setSimulationRunning(true);
        selected = demo;
      } else
        selected = new HttpMonitoringService(
          process.env.NEXT_PUBLIC_MONITORING_API_BASE_URL || '/api/v1/monitoring',
        );
      setService(selected);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Monitoring configuration error');
      setLoading(false);
      setService(null);
      return;
    }
    const valid = () =>
      alive &&
      generation.current === epoch &&
      active.current.org === org &&
      active.current.mode === mode;
    const load = async () => {
      if (!valid()) return;
      setLoading(true);
      setError(null);
      try {
        const [connections, events] = await Promise.all([
          selected.listConnections(org, controller.signal),
          selected.listMonitoringEvents(org, controller.signal),
        ]);
        if (!valid()) return;
        const accepted = mergeEvents(
          [],
          [...snapshotRef.current.events, ...events].filter((e) =>
            connections.some((c) => c.id === e.connectionId && c.systemId === e.systemId),
          ),
          org,
        );
        let next: MonitoringSnapshot = {
          connections,
          events: [],
          alerts: [],
          updatedAt: connections.reduce<string | null>(
            (latest, c) => (!latest || c.updatedAt > latest ? c.updatedAt : latest),
            null,
          ),
        };
        for (const event of [...accepted].reverse()) next = applyEvent(next, event, org);
        commit({
          ...next,
          alerts: alertsFromEvents(accepted).map((alert) => {
            const taskId = `REM-${alert.id}`;
            return currentData.current.tasks.some((task) => task.id === taskId)
              ? { ...alert, state: 'ACKNOWLEDGED' as const, taskId }
              : alert;
          }),
        });
        setNow(Date.now());
        if (!subscription)
          subscription = selected.subscribeToEvents(
            org,
            {
              onReset: () => {
                if (!refreshing) {
                  refreshing = true;
                  void load().finally(() => {
                    refreshing = false;
                  });
                }
              },
              onState: (state) => {
                if (valid()) setStream(state);
              },
              onEvent: (event) => {
                if (!valid()) return;
                const before = snapshotRef.current;
                if (
                  mode === 'live' &&
                  event.organizationId === org &&
                  !before.connections.some((c) => c.id === event.connectionId)
                ) {
                  if (!refreshing) {
                    refreshing = true;
                    void load().finally(() => {
                      refreshing = false;
                    });
                  }
                  return;
                }
                const next = applyEvent(before, event, org);
                if (next === before) return;
                commit(next);
                setNow(Date.now());
                if (
                  mode === 'demo' &&
                  [
                    'COMPLIANCE_VIOLATION_DETECTED',
                    'RISK_THRESHOLD_EXCEEDED',
                    'REASSESSMENT_REQUIRED',
                    'HUMAN_REVIEW_COMPLETED',
                    'EVIDENCE_EXPIRED',
                  ].includes(event.type) &&
                  !audited.current.has(event.id)
                ) {
                  audited.current.add(event.id);
                  if (audited.current.size > 512)
                    audited.current.delete(audited.current.values().next().value!);
                  mutateRef.current(
                    (d) => {
                      if (event.type === 'EVIDENCE_EXPIRED') {
                        const reference = d.evidence.find((e) => e.id === event.relatedResourceId);
                        if (reference) reference.expiresAt = event.timestamp;
                      }
                    },
                    bi(
                      `Simulated monitoring: ${event.description.en}`,
                      `Surveillance simulée : ${event.description.fr}`,
                    ),
                    event.relatedResourceId,
                    { silent: true },
                  );
                }
              },
            },
            mode === 'live' ? selected.recoveryCursor || null : accepted[0]?.id || null,
          );
      } catch (e) {
        if (valid()) {
          setError(e instanceof Error ? e.message : 'Monitoring unavailable');
          setStream({ ...initialStream, status: 'ERROR', error: 'Monitoring backend unavailable' });
          commit(empty());
        }
      } finally {
        if (valid()) setLoading(false);
      }
    };
    loadRef.current = load;
    void load();
    return () => {
      alive = false;
      generation.current++;
      controller.abort();
      subscription?.unsubscribe();
      selected.dispose();
    };
  }, [org, mode, ready, commit]);
  useEffect(() => {
    if (service instanceof DemoMonitoringService) {
      service.updateWorkspace(data);
      const ids = new Set(data.systems.map((system) => system.id));
      const current = snapshotRef.current;
      const connections = current.connections.filter((c) => ids.has(c.systemId));
      const events = current.events.filter((e) => ids.has(e.systemId));
      const alerts = current.alerts
        .filter((a) => ids.has(a.systemId))
        .map((a) => {
          const taskId = `REM-${a.id}`;
          const exists = data.tasks.some((task) => task.id === taskId);
          return exists
            ? { ...a, state: 'ACKNOWLEDGED' as const, taskId }
            : { ...a, state: 'OPEN' as const, taskId: null };
        });
      if (
        connections.length !== current.connections.length ||
        events.length !== current.events.length ||
        JSON.stringify(alerts) !== JSON.stringify(current.alerts)
      )
        commit({ ...current, connections, events, alerts });
    }
  }, [data, service]);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(timer);
  }, []);
  async function operation<T>(run: (s: MonitoringService, signal?: AbortSignal) => Promise<T>) {
    const epoch = generation.current;
    if (!service || service.mode !== mode) throw new Error('Monitoring service unavailable');
    const result = await run(service, abortRef.current?.signal);
    if (generation.current !== epoch || active.current.org !== org || active.current.mode !== mode)
      throw new Error('Workspace changed');
    const connections = await service.listConnections(org, abortRef.current?.signal);
    if (generation.current !== epoch || active.current.org !== org || active.current.mode !== mode)
      throw new Error('Workspace changed');
    commit({ ...snapshotRef.current, connections });
    return result;
  }
  function createRemediation(alert: MonitoringAlert) {
    if (mode !== 'demo' || alert.organizationId !== org) return;
    const taskId = `REM-${alert.id}`;
    mutate(
      (d) => {
        if (!d.systems.some((s) => s.id === alert.systemId)) return;
        if (!d.tasks.some((t) => t.id === taskId))
          d.tasks.unshift({
            id: taskId,
            systemId: alert.systemId,
            title: bi(
              `Review monitoring alert: ${alert.title.en}`,
              `Examiner l’alerte : ${alert.title.fr}`,
            ),
            owner: 'Demo reviewer',
            due: new Date(now + 7 * 86400000).toISOString().slice(0, 10),
            state: 'open',
          });
      },
      bi('Monitoring alert assigned for remediation', 'Alerte attribuée à une mesure corrective'),
      alert.sourceEventId,
    );
    commit({
      ...snapshotRef.current,
      alerts: snapshotRef.current.alerts.map((a) =>
        a.id === alert.id ? { ...a, state: 'ACKNOWLEDGED', taskId } : a,
      ),
    });
  }
  const current = loadedFor === `${org}:${mode}`;
  const shown = current ? snapshot : empty();
  const presented =
    mode === 'live' && stream.status !== 'CONNECTED'
      ? {
          ...shown,
          connections: shown.connections.map((c) => ({
            ...c,
            status:
              c.status === 'NOT_CONFIGURED' ? ('NOT_CONFIGURED' as const) : ('UNKNOWN' as const),
          })),
        }
      : shown;
  return (
    <Context.Provider
      value={{
        mode,
        setMode,
        snapshot: presented,
        loading: !current || loading,
        error: current ? error : null,
        stream: current ? stream : initialStream,
        simulationRunning,
        setSimulationRunning: (running) => {
          if (service instanceof DemoMonitoringService) {
            service.setSimulationRunning(running);
            setSimulationState(running);
          }
        },
        now,
        reload: () => loadRef.current(),
        service,
        testConnection: async (id) => {
          const result = await operation((s, signal) => s.testConnection(org, id, signal));
          if (mode === 'demo')
            mutateRef.current(
              () => {},
              bi(
                'Simulated connection health test completed',
                'Test simulé de l’état de connexion terminé',
              ),
              id,
              { silent: true },
            );
          return result;
        },
        reconnect: async (id) => {
          const connection = await operation((s, signal) => s.reconnect(org, id, signal));
          if (mode === 'demo')
            mutateRef.current(
              () => {},
              bi('Simulated reconnection requested', 'Reconnexion simulée demandée'),
              id,
              { silent: true },
            );
          return connection;
        },
        testConfiguration: (config) =>
          operation((s, signal) => s.testConfiguration(config, signal)),
        saveConnection: async (config) => {
          const connection = await operation((s, signal) => s.saveConnection(config, signal));
          if (mode === 'demo')
            mutateRef.current(
              () => {},
              bi('Simulated AI connector configured', 'Connecteur IA simulé configuré'),
              connection.id,
              { silent: true },
            );
          return connection;
        },
        createRemediation,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useMonitoring() {
  const context = useContext(Context);
  if (!context) throw new Error('MonitoringProvider missing');
  return context;
}
