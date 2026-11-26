import { eventSchema } from '../schemas';
import type { MonitoringObserver, MonitoringSubscription, MonitoringStreamState } from '../types';
import { backoff } from '../utils/data';
export type SSEFrame = { id: string | null; event: string; data: string; comment: boolean };
export class SSEDecoder {
  private pending = '';
  push(chunk: string): SSEFrame[] {
    this.pending += chunk;
    if (this.pending.length > 1024 * 1024) throw new Error('Oversized SSE frame');
    const frames: SSEFrame[] = [];
    let match: RegExpExecArray | null;
    while ((match = /\r\n\r\n|\n\n|\r\r/.exec(this.pending))) {
      const frame = this.pending.slice(0, match.index);
      this.pending = this.pending.slice(match.index + match[0].length);
      let id: string | null = null,
        event = 'message',
        comment = false;
      const data: string[] = [];
      for (const line of frame.split(/\r\n|\r|\n/)) {
        if (line.startsWith(':')) {
          comment = true;
          continue;
        }
        const colon = line.indexOf(':');
        const key = colon < 0 ? line : line.slice(0, colon);
        let value = colon < 0 ? '' : line.slice(colon + 1);
        if (value.startsWith(' ')) value = value.slice(1);
        if (key === 'id' && !value.includes('\0')) id = value;
        if (key === 'event') event = value;
        if (key === 'data') data.push(value);
      }
      frames.push({ id, event, data: data.join('\n'), comment });
    }
    return frames;
  }
}
export interface EventTransport {
  subscribe(
    org: string,
    observer: MonitoringObserver,
    lastEventId?: string | null,
  ): MonitoringSubscription;
  unsubscribe(id: string): void;
  dispose(): void;
}
export class FetchSSETransport implements EventTransport {
  private subscriptions = new Map<string, () => void>();
  private sequence = 0;
  constructor(
    private baseUrl: string,
    private fetcher: typeof fetch = (...args) => globalThis.fetch(...args),
    private options: {
      heartbeatMs?: number;
      random?: () => number;
      retryDelay?: (attempt: number) => number;
    } = {},
  ) {}
  subscribe(
    org: string,
    observer: MonitoringObserver,
    lastEventId: string | null = null,
  ): MonitoringSubscription {
    const id = `sse-${++this.sequence}`;
    let stopped = false;
    let controller: AbortController | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let watchdog: ReturnType<typeof setTimeout> | null = null;
    let attempt = 0;
    let cursor = lastEventId;
    let lastHeartbeat: string | null = null;
    const seen = new Set<string>();
    const state = (status: MonitoringStreamState['status'], error: string | null = null) => {
      if (!stopped)
        observer.onState({ status, attempt, lastEventId: cursor, lastHeartbeat, error });
    };
    const clearWatch = () => {
      if (watchdog !== null) clearTimeout(watchdog);
      watchdog = null;
    };
    const touch = () => {
      lastHeartbeat = new Date().toISOString();
      clearWatch();
      watchdog = setTimeout(
        () => controller?.abort(new Error('Heartbeat timeout')),
        this.options.heartbeatMs || 30000,
      );
    };
    const connect = async () => {
      if (stopped) return;
      state(attempt ? 'RECONNECTING' : 'CONNECTING');
      controller = new AbortController();
      let terminal = false;
      try {
        touch();
        const headers: Record<string, string> = {
          Accept: 'text/event-stream',
          'X-Organization-ID': org,
        };
        if (cursor && !/[\r\n]/.test(cursor)) headers['Last-Event-ID'] = cursor;
        const response = await this.fetcher(`${this.baseUrl}/stream`, {
          headers,
          credentials: 'same-origin',
          cache: 'no-store',
          signal: controller.signal,
        });
        if (response.status === 409 || response.status === 410) {
          cursor = null;
          seen.clear();
          observer.onReset?.();
          throw new Error('Monitoring cursor expired; requesting a fresh snapshot');
        }
        if (!response.ok) {
          terminal = response.status === 401 || response.status === 403;
          throw new Error(`Monitoring stream HTTP ${response.status}`);
        }
        if (!response.body || !response.headers.get('content-type')?.includes('text/event-stream'))
          throw new Error('Expected an SSE monitoring stream');
        state('CONNECTED');
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        const parser = new SSEDecoder();
        try {
          while (!stopped) {
            const { value, done } = await reader.read();
            if (done) throw new Error('Monitoring stream disconnected');
            touch();
            for (const frame of parser.push(decoder.decode(value, { stream: true }))) {
              if (frame.event === 'heartbeat' || (frame.comment && !frame.data)) {
                state('CONNECTED');
                continue;
              }
              if (!frame.data) continue;
              const event = eventSchema.parse(JSON.parse(frame.data));
              if (event.organizationId !== org) continue;
              if (frame.id && frame.id !== event.id) throw new Error('SSE event ID mismatch');
              cursor = frame.id || event.id;
              if (seen.has(event.id)) continue;
              seen.add(event.id);
              if (seen.size > 512) seen.delete(seen.values().next().value!);
              observer.onEvent(event);
              attempt = 0;
              state('CONNECTED');
            }
          }
        } finally {
          await reader.cancel().catch(() => {});
          reader.releaseLock();
        }
      } catch (error) {
        if (!stopped) {
          state(
            terminal ? 'ERROR' : 'RECONNECTING',
            error instanceof Error ? error.message : 'Monitoring stream error',
          );
        }
      } finally {
        clearWatch();
        if (!stopped && !terminal) {
          const delay = this.options.retryDelay?.(attempt) ?? backoff(attempt, this.options.random);
          attempt++;
          retryTimer = setTimeout(() => void connect(), delay);
        }
      }
    };
    const unsubscribe = () => {
      if (stopped) return;
      stopped = true;
      clearWatch();
      if (retryTimer !== null) clearTimeout(retryTimer);
      controller?.abort();
      this.subscriptions.delete(id);
      observer.onState({
        status: 'DISCONNECTED',
        attempt,
        lastEventId: cursor,
        lastHeartbeat,
        error: null,
      });
    };
    this.subscriptions.set(id, unsubscribe);
    void connect();
    return { id, unsubscribe };
  }
  unsubscribe(id: string) {
    this.subscriptions.get(id)?.();
  }
  dispose() {
    for (const unsubscribe of [...this.subscriptions.values()]) unsubscribe();
  }
}
