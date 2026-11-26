# Sidebar and AI monitoring enhancement

This enhancement extends the existing frontend. It does not implement a Python backend or verify an external AI provider connection. All original business routes and the original 16 domain tests remain present.

## Implemented routes

| Route                                     | Workspace                                                                                                |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `/monitoring`                             | Mode/stream controls, four derived metrics, decision activity, connections, events and governance alerts |
| `/monitoring/connections/[id]`            | Overview, metrics, decisions, compliance events, history and configuration tabs                          |
| `/monitoring/incidents/[id]`              | Alert source, linked assessment/evidence and remediation action                                          |
| `/integrations?setup=ai`                  | Six-step connector setup                                                                                 |
| `/traceability?decision={id}&system={id}` | The actual retained decision context alongside the existing control lineage                              |

The monitoring menu is immediately below the registry, with the French label **Surveillance en temps réel**. Existing registry, policy, assessment, evidence, risk and remediation pages support the related links used by monitoring.

## Sidebar

The navigation keeps a native scroll viewport across the remaining sidebar width. Its scrollbar is visually hidden while wheel, trackpad, touch, and keyboard scrolling remain available, so the navy surface stays continuous with no light gutter.

`flex: 1 1 auto`, `min-height: 0`, `overflow-y: auto`, `overflow-x: hidden`, `scrollbar-width: none`, and a zero-width WebKit scrollbar preserve native scrolling without displaying a scrollbar. Logo, workspace selector and footer do not shrink or scroll. The hidden scrollbar is implemented with CSS; no simulated scroll control is added.

## Domain and state

Types in `src/features/monitoring/types` define AIConnection, AIProvider, AIConnectionHealth, AIConnectionMetric, AIConnectionEvent, AIDecisionEvent, MonitoringAlert, MonitoringStreamState, capabilities, service and subscription contracts. Zod validates backend data and cross-field decision references. Exhaustive bilingual mappings cover six connection states, eleven providers, nine capabilities, four severities and thirteen event types.

Connection states are CONNECTED, CONNECTING, DEGRADED, DISCONNECTED, NOT_CONFIGURED and UNKNOWN. They do not replace compliance outcomes, risk levels or workflow states. Tests verify that simulated decisions, health tests and reconnects do not modify governance compliance outcomes.

The shared monitoring provider owns a workspace-scoped snapshot. Summaries, chart buckets, connection counters, activity lists and alerts derive from that snapshot's retained event records. Connection metrics are labeled as retained requests; summary/chart periods are 5 or 15 minutes. The display retains at most 240 events and 60 alerts, so these values are a bounded operational view, not a complete lifetime ledger.

The provider disposes the previous workspace/mode subscription, cancels outstanding fetches and guards against late responses before changing state or logging a local action. Old-tenant data is masked during switching. Activity feeds remount across mode/workspace boundaries so a paused demo feed cannot appear as live backend telemetry. Registry metadata, column visibility and filters preserve the original registry columns and operations.

## Demo mode

DemoMonitoringService uses a deterministic scenario with an injected clock and scheduler for tests. It starts with synthetic records and a fixed event pattern, then advances every four seconds. No prompt, response, citizen record or real personal payload is generated. Endpoint hosts under `example.invalid` are metadata and are never contacted.

- **Pause simulation** stops generation; **Pause display** freezes only the activity feed and counts pending retained updates.
- Pagination into historical events and opening event details freeze display, preserving the user's position.
- Events deduplicate by ID and sort by timestamp plus stable ID. Old connection events do not overwrite newer event state.
- New connector metadata is validated against the selected provider adapter's capabilities. Direct-provider decision metadata requires backend/gateway instrumentation; it is not an assertion that provider APIs expose business decisions or compliance findings.
- Tests and reconnects are explicitly labeled simulated. Tests require no API keys. One connector per system is replaced rather than duplicated by the demo wizard.
- Demo connection configuration, metrics and stream state live in memory and restart from fixtures on a full browser reload. Original governance records and audit/task changes continue using the existing localStorage mechanism.

A decision event references its exact system, connection, deployment, model version, trace, assessment and evidence IDs where available. Compliance violation signals refer to existing non-compliant assessment records. Evidence-expiry simulation marks the corresponding local reference expiry metadata. Alerts can create idempotent remediation tasks; follow-up notes and selected monitoring actions enter the existing local audit history. These are synthetic workflows, not automatic legal conclusions.

## Live mode

HttpMonitoringService calls only a configured same-origin backend path, default `/api/v1/monitoring`. Failed requests produce unavailable/unknown state. There is no fallback to fixtures. Stale connection states are presented as UNKNOWN when the live event transport is unavailable; old telemetry may remain visible with a stale-data notice.

FetchSSETransport uses authenticated fetch with `credentials: same-origin`, the tenant selection header and `Last-Event-ID`. It never places session tokens in a stream URL. The backend must authorize tenant membership independently of the header. A transport interface allows a future WebSocket implementation without changing UI components.

The implementation handles initial connection, stream establishment, reconnecting, errors, EOF/disconnection, a 30-second inactivity watchdog, bounded exponential retry with jitter, cleanup, deduplication and cursor resumption. HTTP 401/403 stops retries. HTTP 409/410 discards an expired cursor and requests a fresh snapshot. The REST events response should return `meta.lastEventId` from its append-log position; timestamp order is not a recovery cursor. Unknown live connection references request refreshed connection metadata.

The live adapter and SSE behavior are tested against in-memory HTTP/stream test doubles. No deployed FastAPI instance or actual provider telemetry was verified during this task. Live remediation writes remain disabled until that business backend integration exists.

## Connector setup

Six steps: provider, registered system, endpoint/model/deployment metadata, permitted capabilities, test, review/save. Demo tests do not contact endpoints. Live tests/save use backend endpoints. Unsupported capabilities are disabled with a reason. Endpoints reject embedded user/password, query strings, fragments, non-HTTP(S) schemes and insecure remote HTTP; HTTP localhost is permitted for a backend-accessed local model.

No real API keys, authorization headers or secret values are collected. Future credentials must be provisioned to a backend secret manager through an authenticated server-controlled workflow. The browser's credentialConfigured flag is display metadata, not proof that a secret exists or that a connection is authorized. Backend validation remains authoritative.

## API contracts and future infrastructure

`monitoring-openapi.json` is a generated OpenAPI 3.1 draft, based on the Zod contracts. Regenerate with `npm run contracts:monitoring`. It specifies the nine requested monitoring endpoints and two additional configuration endpoints. It is a proposed contract, not a deployed service. The frontend derives its displayed summary from the loaded event snapshot instead of mixing unrelated KPI responses.

The future FastAPI service needs:

| Component               | Responsibility                                                                               |
| ----------------------- | -------------------------------------------------------------------------------------------- |
| AI gateway              | Correlate instrumented application decisions with system, deployment and model IDs           |
| Provider connectors     | Backend-owned provider credentials, model metadata, supported health and usage APIs          |
| Health scheduler        | Actual probes and last-success timestamps, independent from compliance                       |
| Webhook ingestion       | Signature verification, replay protection and payload validation                             |
| OpenTelemetry ingestion | Normalize only explicitly instrumented, redacted spans/metrics                               |
| Normalization           | Validate event schemas, resource references and capability support                           |
| PostgreSQL              | Durable tenant-scoped events, connection config, alert and audit history                     |
| Redis                   | Ordered distribution/replay coordination and bounded stream buffers                          |
| SSE                     | Authenticated tenant-isolated event delivery, comments/heartbeats, recovery cursors          |
| Authentication          | Secure same-origin HttpOnly/Secure/SameSite sessions or an agreed authenticated fetch scheme |
| Authorization           | Tenant membership and role checks on every endpoint/action; never trust tenant headers alone |
| Audit                   | Server-authored immutable actions, correlation IDs and authorization decisions               |
| Data redaction          | Exclude raw prompts/responses and citizen data; retain approved reference IDs only           |

Mutating endpoints need origin/CSRF protection, authorization, request validation, concurrency/idempotency rules and audited outcomes. Use a same-origin proxy to FastAPI; do not place provider keys in NEXT_PUBLIC variables or browser storage.

## Validation state

See `FRONTEND_PROGRESS.md` for final executed results. Domain/transport tests and static contrast checks are distinct from browser acceptance. The browser suite covers sidebar scrolling, five viewport widths, monitoring details/incidents, event pause/resume, registry filters, connector wizard, governance links, live errors, organization switching and French accessibility. It has not been executed successfully because the environment denies local server/Chromium startup and UI automation timed out.

Actual screenshots are not available; none were fabricated. Do not mark browser, visual, focus, screen-reader or axe checks VERIFIED until they run against the real application.
