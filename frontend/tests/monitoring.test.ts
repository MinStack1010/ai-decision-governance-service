import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seedWorkspace } from '../src/features/governance/fixtures';
import {
  DemoMonitoringService,
  demoConnectionId,
} from '../src/features/monitoring/services/demo-service';
import { HttpMonitoringService } from '../src/features/monitoring/services/http-service';
import { FetchSSETransport, SSEDecoder } from '../src/features/monitoring/services/sse-transport';
import { connectionSchema, eventSchema } from '../src/features/monitoring/schemas';
import { statusLabels, providers, eventLabels } from '../src/features/monitoring/utils/labels';
import {
  summarize,
  mergeEvents,
  filterEvents,
  applyEvent,
  activityBuckets,
  eventHref,
  safeEndpoint,
  validateConfiguration,
  backoff,
  EVENT_LIMIT,
} from '../src/features/monitoring/utils/data';
import { pauseFeed, updateFeed, resumeFeed } from '../src/features/monitoring/utils/feed';
import {
  connectionStatuses,
  providerTypes,
  eventTypes,
  type AIConnectionEvent,
  type MonitoringStreamState,
  type ConnectorConfiguration,
} from '../src/features/monitoring/types';
const clock = () => Date.parse('2026-11-24T22:00:00Z');
function demo(org = 'services') {
  return new DemoMonitoringService(org, seedWorkspace(org === 'research'), clock);
}
async function snapshot(service = demo()) {
  const connections = await service.listConnections('services'),
    events = await service.listMonitoringEvents('services');
  return { connections, events, alerts: [], updatedAt: null };
}
function scheduler() {
  let id = 0;
  const intervals = new Map<ReturnType<typeof setInterval>, () => void>(),
    timeouts = new Map<ReturnType<typeof setTimeout>, () => void>();
  return {
    intervals,
    timeouts,
    setInterval: (fn: () => void) => {
      const key = ++id as unknown as ReturnType<typeof setInterval>;
      intervals.set(key, fn);
      return key;
    },
    clearInterval: (key: ReturnType<typeof setInterval>) => {
      intervals.delete(key);
    },
    setTimeout: (fn: () => void) => {
      const key = ++id as unknown as ReturnType<typeof setTimeout>;
      timeouts.set(key, fn);
      return key;
    },
    clearTimeout: (key: ReturnType<typeof setTimeout>) => {
      timeouts.delete(key);
    },
  };
}
const observer = {
  onEvent: (_: AIConnectionEvent) => {},
  onState: (_: MonitoringStreamState) => {},
};
test('Default browser timer adapter preserves receivers through pause, unsubscribe and disposal', async (t) => {
  const timers = scheduler();
  for (const name of ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout'] as const) {
    t.mock.method(globalThis, name, function (this: unknown, ...args: unknown[]) {
      assert.equal(this, globalThis, `${name} must receive the browser global`);
      return Reflect.apply(timers[name], timers, args);
    });
  }
  const service = demo();
  const first = service.subscribeToEvents('services', observer);
  assert.equal(timers.intervals.size, 1);
  first.unsubscribe();
  first.unsubscribe();
  assert.equal(timers.intervals.size, 0);
  service.subscribeToEvents('services', observer);
  service.setSimulationRunning(false);
  assert.equal(timers.intervals.size, 0);
  service.setSimulationRunning(true);
  await service.reconnect('services', demoConnectionId('services', 'SYS-001'));
  assert.equal(timers.timeouts.size, 1);
  service.dispose();
  service.dispose();
  assert.equal(timers.intervals.size, 0);
  assert.equal(timers.timeouts.size, 0);
});
test('Default REST and SSE adapters preserve the native fetch receiver', async (t) => {
  const calls: string[] = [];
  t.mock.method(globalThis, 'fetch', function (this: unknown, input: string) {
    assert.equal(this, globalThis, 'fetch must receive the browser global');
    calls.push(input);
    return Promise.resolve(new Response(null, { status: 401 }));
  });
  const service = new HttpMonitoringService();
  await assert.rejects(service.listConnections('services'), /HTTP 401/);
  const transport = new FetchSSETransport('/api/v1/monitoring');
  let terminal = false;
  transport.subscribe('services', {
    ...observer,
    onState: (state) => {
      terminal = state.status === 'ERROR';
    },
  });
  await until(() => terminal);
  transport.dispose();
  service.dispose();
  assert.deepEqual(calls, ['/api/v1/monitoring/connections', '/api/v1/monitoring/stream']);
});
async function until(condition: () => boolean) {
  const deadline = Date.now() + 1500;
  while (!condition()) {
    if (Date.now() > deadline) throw new Error('Condition timed out');
    await new Promise((r) => setTimeout(r, 2));
  }
}
function streamingFetch(body: string, close = false) {
  const calls: { url: string; init: RequestInit | undefined }[] = [];
  const fetcher = (async (url, init) => {
    calls.push({ url: String(url), init });
    let controller: ReadableStreamDefaultController<Uint8Array>;
    const stream = new ReadableStream<Uint8Array>({
      start(c) {
        controller = c;
        if (body) c.enqueue(new TextEncoder().encode(body));
        if (close) c.close();
      },
    });
    init?.signal?.addEventListener(
      'abort',
      () => {
        try {
          controller.error(new DOMException('Aborted', 'AbortError'));
        } catch {}
      },
      { once: true },
    );
    return new Response(stream, { headers: { 'Content-Type': 'text/event-stream' } });
  }) as typeof fetch;
  return { fetcher, calls };
}

test('Six connection states and eleven providers have exhaustive bilingual labels', () => {
  assert.equal(connectionStatuses.length, 6);
  assert.equal(providerTypes.length, 11);
  for (const s of connectionStatuses) {
    assert.ok(statusLabels[s].en);
    assert.ok(statusLabels[s].fr);
  }
  for (const p of providerTypes) {
    assert.ok(providers[p].label.en);
    assert.ok(providers[p].note.fr);
    assert.ok(providers[p].capabilities.length);
  }
  for (const e of eventTypes) assert.ok(eventLabels[e].fr);
});
test('Demo fixtures are deterministic and schema-valid', async () => {
  assert.deepEqual(await snapshot(demo()), await snapshot(demo()));
  const s = await snapshot();
  s.connections.forEach((c) => assert.ok(connectionSchema.safeParse(c).success));
  s.events.forEach((e) => assert.ok(eventSchema.safeParse(e).success));
});
test('No personal payloads, prompts or provider secrets are part of decision contracts', async () => {
  const { events } = await snapshot();
  for (const e of events) {
    assert.equal('prompt' in e, false);
    assert.equal('response' in e, false);
    if (e.decision) {
      assert.equal('input' in e.decision, false);
      assert.equal('output' in e.decision, false);
      assert.ok(e.decision.modelReference.version);
    }
  }
});
test('Monitoring summary derives counts, latency and errors from the same decision events', async () => {
  const s = await snapshot();
  const summary = summarize(s, 15, clock());
  const decisions = s.events.flatMap((e) => (e.decision ? [e.decision] : []));
  assert.equal(summary.requestsCount, 24);
  assert.equal(summary.decisionsProcessed, 21);
  assert.equal(
    summary.averageLatencyMs,
    Math.round(decisions.reduce((n, d) => n + d.latencyMs, 0) / 24),
  );
  assert.equal(summary.errorRate, 3 / 24);
  assert.equal(summary.connectedSystems, 2);
});
test('Supported periods and chart buckets reconcile with the event-derived summary', async () => {
  const s = await snapshot();
  for (const period of [5, 15]) {
    const summary = summarize(s, period, clock());
    const buckets = activityBuckets(s.events, period, clock());
    assert.equal(
      buckets.reduce((n, b) => n + b.processed + b.failed, 0),
      summary.requestsCount,
    );
  }
  assert.ok(summarize(s, 5, clock()).requestsCount < summarize(s, 15, clock()).requestsCount);
});
test('Event filters combine system, severity, type and connection', async () => {
  const s = await snapshot();
  const event = s.events.find((e) => e.type === 'DECISION_FAILED')!;
  const result = filterEvents(s.events, {
    systemId: event.systemId,
    severity: 'ERROR',
    type: 'DECISION_FAILED',
    connectionId: event.connectionId,
  });
  assert.ok(result.length);
  assert.ok(
    result.every(
      (e) =>
        e.systemId === event.systemId && e.severity === 'ERROR' && e.type === 'DECISION_FAILED',
    ),
  );
  assert.equal(filterEvents(s.events, { systemId: 'MISSING' }).length, 0);
});
test('Event merge deduplicates, orders out-of-order input and rejects cross-tenant data', async () => {
  const s = await snapshot();
  const event = s.events[0];
  const older = { ...event, id: 'older', timestamp: '2026-11-24T00:00:00Z' },
    other = { ...event, id: 'foreign', organizationId: 'research' };
  const rows = mergeEvents([event], [older, event, other], 'services');
  assert.equal(rows.length, 2);
  assert.equal(rows[0].id, event.id);
  assert.equal(rows[1].id, 'older');
});
test('Retained event lists remain bounded', async () => {
  const event = (await snapshot()).events[0];
  const rows = mergeEvents(
    [],
    Array.from({ length: 500 }, (_, i) => ({
      ...event,
      id: `ev-${i}`,
      timestamp: new Date(clock() - i * 1000).toISOString(),
    })),
    'services',
  );
  assert.equal(rows.length, EVENT_LIMIT);
  assert.equal(rows[0].id, 'ev-0');
});
test('Older connection-lost events do not overwrite newer health state', async () => {
  const s = await snapshot();
  const c = s.connections[0];
  const recent = {
    ...s.events[0],
    id: 'connected-late',
    connectionId: c.id,
    systemId: c.systemId,
    timestamp: '2026-11-24T22:01:00Z',
    type: 'CONNECTION_ESTABLISHED' as const,
    decision: undefined,
  };
  const next = applyEvent(s, recent, 'services');
  const old = {
    ...recent,
    id: 'old-loss',
    timestamp: '2026-11-24T21:59:00Z',
    type: 'CONNECTION_LOST' as const,
  };
  assert.equal(applyEvent(next, old, 'services').connections[0].status, 'CONNECTED');
  assert.equal(applyEvent(next, recent, 'services'), next);
});
test('Pause buffers pending display updates without stopping or losing the source', async () => {
  const s = await snapshot();
  const frozen = pauseFeed(s.events, 'services');
  const event = {
    ...s.events[0],
    id: 'new-event',
    timestamp: new Date(clock() + 4000).toISOString(),
  };
  const incoming = mergeEvents(s.events, [event], 'services');
  const paused = updateFeed(frozen, incoming, 'services');
  assert.equal(paused.pending, 1);
  assert.deepEqual(paused.visible, frozen.visible);
  assert.equal(incoming[0].id, 'new-event');
  assert.equal(resumeFeed(incoming, 'services').visible[0].id, 'new-event');
});
test('Demo subscriptions share one timer and clean up on unsubscribe and dispose', () => {
  const timers = scheduler();
  const service = new DemoMonitoringService('services', seedWorkspace(), clock, timers);
  const one = service.subscribeToEvents('services', observer),
    two = service.subscribeToEvents('services', observer);
  assert.equal(timers.intervals.size, 1);
  one.unsubscribe();
  assert.equal(timers.intervals.size, 1);
  service.unsubscribeFromEvents(two.id);
  assert.equal(timers.intervals.size, 0);
  service.subscribeToEvents('services', observer);
  service.dispose();
  assert.equal(timers.intervals.size, 0);
});
test('Pausing synthetic generation differs from pausing display and resumes without duplicate timers', () => {
  const timers = scheduler();
  const service = new DemoMonitoringService('services', seedWorkspace(), clock, timers);
  service.subscribeToEvents('services', observer);
  service.setSimulationRunning(false);
  assert.equal(timers.intervals.size, 0);
  service.setSimulationRunning(true);
  service.setSimulationRunning(true);
  assert.equal(timers.intervals.size, 1);
  service.dispose();
});
test('Workspace switching has no cross-tenant telemetry and old subscriptions can be disposed', async () => {
  const timers = scheduler();
  const a = new DemoMonitoringService('services', seedWorkspace(), clock, timers);
  a.subscribeToEvents('services', observer);
  a.dispose();
  const b = new DemoMonitoringService('research', seedWorkspace(true), clock, timers);
  assert.equal((await b.listConnections('research')).length, 0);
  assert.equal((await b.listMonitoringEvents('research')).length, 0);
  await assert.rejects(() => a.listConnections('research'));
  assert.equal(timers.intervals.size, 0);
});
test('Connection health and simulated decisions never modify compliance outcomes', async () => {
  const governance = seedWorkspace();
  const before = structuredClone(governance);
  const service = new DemoMonitoringService('services', governance, clock);
  for (let i = 0; i < 20; i++) service.tick();
  await service.testConnection('services', demoConnectionId('services', 'SYS-001'));
  assert.deepEqual(governance, before);
});
test('All simulated event resources refer to existing records, deployment and model versions', async () => {
  const governance = seedWorkspace();
  let now = clock();
  const service = new DemoMonitoringService('services', governance, () => now);
  for (let i = 0; i < 120; i++) {
    now += 4000;
    service.tick();
  }
  const events = await service.listMonitoringEvents('services');
  for (const e of events) {
    assert.ok(governance.systems.some((s) => s.id === e.systemId));
    if (e.relatedResourceType === 'assessment' || e.relatedResourceType === 'review')
      assert.ok(governance.assessments.some((a) => a.id === e.relatedResourceId));
    if (e.relatedResourceType === 'evidence')
      assert.ok(governance.evidence.some((r) => r.id === e.relatedResourceId));
    if (e.relatedResourceType === 'policy')
      assert.ok(governance.policies.some((p) => p.id === e.relatedResourceId));
    if (e.decision) {
      assert.equal(e.decision.id, e.relatedResourceId);
      assert.ok(e.decision.deploymentReference);
      for (const id of e.decision.evidenceIds)
        assert.ok(governance.evidence.some((r) => r.id === id && r.systemId === e.systemId));
    }
  }
});
test('Event-to-resource navigation uses typed valid local destinations', async () => {
  const e = (await snapshot()).events.find((e) => e.decision)!;
  assert.match(eventHref(e), /^\/traceability\?decision=/);
  for (const type of [
    'assessment',
    'review',
    'policy',
    'impact',
    'risk',
    'evidence',
    'connection',
    'system',
  ] as const)
    assert.ok(eventHref({ ...e, relatedResourceType: type }).startsWith('/'));
});
test('Demo health tests are explicitly simulated; unconfigured connections fail', async () => {
  const service = demo();
  const good = await service.testConnection('services', demoConnectionId('services', 'SYS-001'));
  const missing = await service.testConnection('services', demoConnectionId('services', 'SYS-005'));
  assert.equal(good.simulated, true);
  assert.equal(good.success, true);
  assert.equal(missing.success, false);
});
test('Simulated reconnect transitions through CONNECTING and cleanup cancels pending completion', async () => {
  const timers = scheduler();
  const service = new DemoMonitoringService('services', seedWorkspace(), clock, timers);
  const c = await service.reconnect('services', demoConnectionId('services', 'SYS-004'));
  assert.equal(c.status, 'CONNECTING');
  assert.equal(timers.timeouts.size, 1);
  service.dispose();
  assert.equal(timers.timeouts.size, 0);
});
test('Simulated reconnect emits the actual connection resource when its scheduled task completes', async () => {
  const timers = scheduler();
  const service = new DemoMonitoringService('services', seedWorkspace(), clock, timers);
  const events: AIConnectionEvent[] = [];
  service.subscribeToEvents('services', { ...observer, onEvent: (e) => events.push(e) });
  const id = demoConnectionId('services', 'SYS-004');
  await service.reconnect('services', id);
  for (const fn of [...timers.timeouts.values()]) fn();
  assert.equal(events[0].type, 'CONNECTION_ESTABLISHED');
  assert.equal(events[0].relatedResourceId, id);
  assert.equal((await service.getConnection('services', id)).status, 'CONNECTED');
  service.dispose();
});
function configuration(): ConnectorConfiguration {
  return {
    organizationId: 'services',
    systemId: 'SYS-001',
    provider: 'OPENAI',
    modelReference: { id: 'synthetic', version: 'v2' },
    deploymentReference: 'demo-deployment',
    endpoint: {
      url: 'https://example.invalid/telemetry',
      label: 'Demo',
      credentialConfigured: false,
    },
    capabilities: ['HEALTH', 'LATENCY'],
  };
}
test('Connector metadata rejects embedded credentials, tokens, unsafe schemes and unsupported capabilities', () => {
  assert.ok(safeEndpoint('https://example.invalid/path'));
  assert.ok(safeEndpoint('http://localhost:11434'));
  for (const value of [
    'https://user:password@example.com',
    'https://example.com?api_key=secret',
    'http://example.com',
    'javascript:alert(1)',
  ])
    assert.equal(safeEndpoint(value), false);
  assert.throws(() =>
    validateConfiguration({
      ...configuration(),
      provider: 'MLFLOW',
      capabilities: ['IO_REFERENCES'],
    }),
  );
});
test('Wizard service test/save validates registered system and updates rather than duplicates a system connector', async () => {
  const service = demo();
  const config = configuration();
  assert.equal((await service.testConfiguration(config)).simulated, true);
  const before = (await service.listConnections('services')).length;
  const saved = await service.saveConnection(config);
  assert.equal(saved.modelReference.version, 'v2');
  assert.equal((await service.listConnections('services')).length, before);
  await assert.rejects(() => service.saveConnection({ ...config, systemId: 'MISSING' }));
});
test('Live mode rejects provider URLs and never returns fixtures on backend errors', async () => {
  assert.throws(() => new HttpMonitoringService('https://api.openai.com'));
  assert.throws(() => new HttpMonitoringService('/api/monitoring?token=secret'));
  const live = new HttpMonitoringService(
    '/api/v1/monitoring',
    async () => new Response('', { status: 503 }),
  );
  assert.equal(live.mode, 'live');
  await assert.rejects(() => live.listConnections('services'), /503/);
});
test('Live requests use same-origin cookies and tenant headers, without browser provider credentials', async () => {
  const s = await snapshot();
  let request: RequestInit | undefined;
  let path = '';
  const live = new HttpMonitoringService('/api/v1/monitoring', (async (url, init) => {
    request = init;
    path = String(url);
    return new Response(JSON.stringify({ data: s.connections }), {
      headers: { 'content-type': 'application/json' },
    });
  }) as typeof fetch);
  assert.equal((await live.listConnections('services')).length, 7);
  assert.equal(path, '/api/v1/monitoring/connections');
  assert.equal(request!.credentials, 'same-origin');
  assert.equal((request!.headers as Record<string, string>)['X-Organization-ID'], 'services');
  assert.equal('Authorization' in (request!.headers as Record<string, string>), false);
});
test('Live service rejects tenant mismatch and simulated test results', async () => {
  const s = await snapshot();
  const foreign = { ...s.connections[0], organizationId: 'research' };
  const live = new HttpMonitoringService(
    '/api/v1/monitoring',
    async () => new Response(JSON.stringify({ data: [foreign] })),
  );
  await assert.rejects(() => live.listConnections('services'), /mismatch/);
  const result = await demo().testConnection('services', s.connections[0].id);
  const fake = new HttpMonitoringService(
    '/api/v1/monitoring',
    async () => new Response(JSON.stringify({ data: result })),
  );
  await assert.rejects(() => fake.testConnection('services', s.connections[0].id), /Invalid live/);
});
test('Runtime schemas reject inconsistent decision/system and success metadata', async () => {
  const event = (await snapshot()).events.find((e) => e.decision)!;
  assert.equal(
    eventSchema.safeParse({ ...event, decision: { ...event.decision!, systemId: 'WRONG' } })
      .success,
    false,
  );
  assert.equal(
    eventSchema.safeParse({
      ...event,
      type: 'DECISION_PROCESSED',
      decision: { ...event.decision!, success: false },
    }).success,
    false,
  );
});
test('SSE decoder supports fragmented CRLF, multiline data, comments and bounded frames', () => {
  const decoder = new SSEDecoder();
  assert.deepEqual(decoder.push('id: event-1\r\nevent: message\r\ndata: {\r\n'), []);
  const rows = decoder.push('data: "a": 1}\r\n\r\n: heartbeat\n\n');
  assert.equal(rows[0].id, 'event-1');
  assert.equal(rows[0].data, '{\n"a": 1}');
  assert.equal(rows[1].comment, true);
  assert.throws(() => decoder.push('x'.repeat(1024 * 1024 + 1)), /Oversized/);
});
test('Exponential backoff uses bounded jitter', () => {
  assert.equal(
    backoff(0, () => 0),
    800,
  );
  assert.equal(
    backoff(1, () => 0.5),
    2000,
  );
  assert.ok(backoff(20, () => 1) <= 30000);
});
test('Fetch SSE deduplicates events and aborts the transport on unsubscribe', async () => {
  const event = (await snapshot()).events[0];
  const frame = `id: ${event.id}\ndata: ${JSON.stringify(event)}\n\n`;
  const mock = streamingFetch(frame + frame);
  const events: AIConnectionEvent[] = [];
  const transport = new FetchSSETransport('/api/v1/monitoring', mock.fetcher);
  const subscription = transport.subscribe('services', {
    ...observer,
    onEvent: (e) => events.push(e),
  });
  await until(() => events.length === 1);
  subscription.unsubscribe();
  assert.equal(events.length, 1);
  assert.equal(mock.calls[0].init?.signal?.aborted, true);
});
test('SSE reconnect resumes from Last-Event-ID without putting credentials in the URL', async () => {
  const event = (await snapshot()).events[0];
  let calls = 0;
  const requests: RequestInit[] = [];
  const transport = new FetchSSETransport(
    '/api/v1/monitoring',
    (async (url, init) => {
      requests.push(init!);
      calls++;
      assert.equal(String(url), '/api/v1/monitoring/stream');
      if (calls === 1)
        return new Response(`id: ${event.id}\ndata: ${JSON.stringify(event)}\n\n`, {
          headers: { 'content-type': 'text/event-stream' },
        });
      return streamingFetch('').fetcher(url, init);
    }) as typeof fetch,
    { retryDelay: () => 1 },
  );
  const subscription = transport.subscribe('services', observer);
  await until(() => calls >= 2);
  assert.equal((requests[1].headers as Record<string, string>)['Last-Event-ID'], event.id);
  assert.equal(requests[1].credentials, 'same-origin');
  subscription.unsubscribe();
});
test('Heartbeat timeout causes reconnection and dispose aborts active subscriptions', async () => {
  const mock = streamingFetch('');
  const states: MonitoringStreamState[] = [];
  const transport = new FetchSSETransport('/api/v1/monitoring', mock.fetcher, {
    heartbeatMs: 8,
    retryDelay: () => 1,
  });
  transport.subscribe('services', { ...observer, onState: (s) => states.push(s) });
  await until(() => mock.calls.length >= 2);
  assert.ok(states.some((s) => s.status === 'RECONNECTING'));
  transport.dispose();
  assert.ok(mock.calls.every((c) => c.init?.signal?.aborted));
});
test('Authentication errors stop retries and do not switch to mock telemetry', async () => {
  let calls = 0;
  const states: MonitoringStreamState[] = [];
  const transport = new FetchSSETransport(
    '/api/v1/monitoring',
    async () => {
      calls++;
      return new Response('', { status: 401 });
    },
    { retryDelay: () => 1 },
  );
  const subscription = transport.subscribe('services', {
    ...observer,
    onState: (s) => states.push(s),
  });
  await until(() => states.some((s) => s.status === 'ERROR'));
  await new Promise((r) => setTimeout(r, 12));
  assert.equal(calls, 1);
  assert.equal(states.at(-1)!.status, 'ERROR');
  subscription.unsubscribe();
});

test('Expired SSE cursors trigger snapshot recovery and clear Last-Event-ID', async () => {
  let calls = 0,
    resets = 0;
  const requests: RequestInit[] = [];
  const transport = new FetchSSETransport(
    '/api/v1/monitoring',
    (async (url, init) => {
      calls++;
      requests.push(init!);
      if (calls === 1) return new Response('', { status: 410 });
      return streamingFetch('').fetcher(url, init);
    }) as typeof fetch,
    { retryDelay: () => 1 },
  );
  const sub = transport.subscribe(
    'services',
    {
      ...observer,
      onReset: () => {
        resets++;
      },
    },
    'expired-id',
  );
  await until(() => calls >= 2);
  assert.equal(resets, 1);
  assert.equal((requests[1].headers as Record<string, string>)['Last-Event-ID'], undefined);
  sub.unsubscribe();
});
