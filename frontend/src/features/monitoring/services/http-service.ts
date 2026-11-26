import { z } from 'zod';
import type { MonitoringService, ConnectorConfiguration, MonitoringObserver } from '../types';
import {
  connectionSchema,
  eventSchema,
  healthSchema,
  metricSchema,
  testResultSchema,
  configurationSchema,
} from '../schemas';
import { validateConfiguration } from '../utils/data';
import { FetchSSETransport } from './sse-transport';
export class HttpMonitoringService implements MonitoringService {
  readonly mode = 'live' as const;
  recoveryCursor: string | null = null;
  private transport: FetchSSETransport;
  constructor(
    private baseUrl = '/api/v1/monitoring',
    private fetcher: typeof fetch = (...args) => globalThis.fetch(...args),
  ) {
    if (!baseUrl.startsWith('/') || baseUrl.startsWith('//') || /[?#]/.test(baseUrl))
      throw new Error('Monitoring API must be a same-origin path without query parameters.');
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.transport = new FetchSSETransport(this.baseUrl, fetcher);
  }
  private async request<T>(
    org: string,
    path: string,
    schema: z.ZodType<T>,
    method = 'GET',
    body?: unknown,
    signal?: AbortSignal,
  ): Promise<T> {
    const controller = new AbortController();
    const abort = () => controller.abort();
    if (signal?.aborted) controller.abort();
    signal?.addEventListener('abort', abort, { once: true });
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await this.fetcher(this.baseUrl + path, {
        method,
        credentials: 'same-origin',
        cache: 'no-store',
        headers: {
          Accept: 'application/json',
          'X-Organization-ID': org,
          ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
      if (!response.ok) {
        const raw = await response.text();
        let detail = '';
        try {
          const parsed = JSON.parse(raw) as { error?: { code?: string; message?: string } | string };
          detail = typeof parsed.error === 'string' ? parsed.error : parsed.error?.code || parsed.error?.message || '';
        } catch {
          detail = '';
        }
        throw new Error(`Monitoring backend HTTP ${response.status}${detail ? `: ${detail}` : ''}`);
      }
      const envelope = z
        .object({
          data: schema,
          meta: z.object({ lastEventId: z.string().nullable().optional() }).optional(),
        })
        .parse(await response.json());
      if (path === '/events') this.recoveryCursor = envelope.meta?.lastEventId || null;
      return envelope.data;
    } catch (error) {
      if (error instanceof z.ZodError)
        throw new Error('Monitoring response did not match the expected contract.');
      throw error;
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener('abort', abort);
    }
  }
  async listConnections(org: string, signal?: AbortSignal) {
    const rows = await this.request(
      org,
      '/connections',
      z.array(connectionSchema),
      'GET',
      undefined,
      signal,
    );
    if (rows.some((c) => c.organizationId !== org))
      throw new Error('Monitoring workspace mismatch');
    return rows;
  }
  async getConnection(org: string, id: string, signal?: AbortSignal) {
    const c = await this.request(
      org,
      `/connections/${encodeURIComponent(id)}`,
      connectionSchema,
      'GET',
      undefined,
      signal,
    );
    if (c.organizationId !== org || c.id !== id) throw new Error('Monitoring workspace mismatch');
    return c;
  }
  async getConnectionHealth(org: string, id: string, signal?: AbortSignal) {
    const health = await this.request(
      org,
      `/connections/${encodeURIComponent(id)}/health`,
      healthSchema,
      'GET',
      undefined,
      signal,
    );
    if (health.organizationId !== org || health.connectionId !== id || health.simulated)
      throw new Error('Invalid live health response');
    return health;
  }
  async getConnectionMetrics(org: string, id: string, minutes: number, signal?: AbortSignal) {
    const metrics = await this.request(
      org,
      `/connections/${encodeURIComponent(id)}/metrics?minutes=${minutes === 5 ? 5 : 15}`,
      metricSchema,
      'GET',
      undefined,
      signal,
    );
    if (metrics.organizationId !== org || metrics.connectionId !== id)
      throw new Error('Monitoring workspace mismatch');
    return metrics;
  }
  async listMonitoringEvents(org: string, signal?: AbortSignal) {
    const rows = await this.request(org, '/events', z.array(eventSchema), 'GET', undefined, signal);
    if (rows.some((e) => e.organizationId !== org))
      throw new Error('Monitoring workspace mismatch');
    return rows;
  }
  async testConnection(org: string, id: string, signal?: AbortSignal) {
    const result = await this.request(
      org,
      `/connections/${encodeURIComponent(id)}/test`,
      testResultSchema,
      'POST',
      {},
      signal,
    );
    if (result.simulated || result.connection.organizationId !== org || result.connection.id !== id)
      throw new Error('Invalid live test response');
    return result;
  }
  async reconnect(org: string, id: string, signal?: AbortSignal) {
    const c = await this.request(
      org,
      `/connections/${encodeURIComponent(id)}/reconnect`,
      connectionSchema,
      'POST',
      {},
      signal,
    );
    if (c.organizationId !== org || c.id !== id) throw new Error('Monitoring workspace mismatch');
    return c;
  }
  async testConfiguration(config: ConnectorConfiguration, signal?: AbortSignal) {
    configurationSchema.parse(config);
    validateConfiguration(config);
    const result = await this.request(
      config.organizationId,
      '/connections/test-configuration',
      testResultSchema,
      'POST',
      config,
      signal,
    );
    if (
      result.simulated ||
      result.connection.organizationId !== config.organizationId ||
      result.connection.systemId !== config.systemId ||
      result.connection.provider !== config.provider
    )
      throw new Error('Invalid live test response');
    return result;
  }
  async saveConnection(config: ConnectorConfiguration, signal?: AbortSignal) {
    configurationSchema.parse(config);
    validateConfiguration(config);
    const c = await this.request(
      config.organizationId,
      '/connections',
      connectionSchema,
      'POST',
      config,
      signal,
    );
    if (
      c.organizationId !== config.organizationId ||
      c.systemId !== config.systemId ||
      c.provider !== config.provider
    )
      throw new Error('Monitoring workspace mismatch');
    return c;
  }
  subscribeToEvents(org: string, observer: MonitoringObserver, lastEventId?: string | null) {
    return this.transport.subscribe(org, observer, lastEventId);
  }
  unsubscribeFromEvents(id: string) {
    this.transport.unsubscribe(id);
  }
  dispose() {
    this.transport.dispose();
  }
}
