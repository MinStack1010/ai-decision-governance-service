# Backend integration plan

No backend files, live API, or existing contracts were present in the selected directory. The following is a proposed boundary for future implementation, not a claim of compatibility with an existing API.

## Current data flow

Client features read a workspace-scoped state store. Mutations clone the selected workspace, apply a workflow change, append a local audit event and persist state in the browser. Zod validates stored record shapes on load. There are no requests to a governance backend. Only references to evidence documents are stored; files and credentials are not collected.

## Proposed API boundary

| Domain             | Proposed endpoint                                         | Purpose                                                      |
| ------------------ | --------------------------------------------------------- | ------------------------------------------------------------ |
| Identity/workspace | `GET /api/v1/me`, `GET /api/v1/workspaces`                | Authenticated identity, roles and permitted workspaces       |
| Registry           | `GET/POST /api/v1/workspaces/{workspaceId}/systems`       | Paginated records and validated registration                 |
| Registry record    | `GET/PATCH .../systems/{systemId}`                        | Typed detail and allowlisted edit; optimistic version check  |
| Policies           | `GET .../policies`, `GET .../policies/{id}/versions`      | Immutable source revisions and requirement records           |
| Policy approval    | `POST .../policies/{id}/approvals`                        | Authorized approval, rationale and version precondition      |
| Assessment         | `GET/POST .../assessments`                                | Versioned assessment snapshot and reassessment creation      |
| Findings           | `PATCH .../assessments/{id}/findings/{findingId}`         | Pending-only review with outcome, rationale and evidence IDs |
| Review decision    | `POST .../assessments/{id}/decisions`                     | Explicit approve/request-changes/reopen transition           |
| Impact             | `GET .../policy-versions/{id}/impact`                     | Diff, affected-system IDs and traceable matching reasons     |
| Reassessment       | `POST .../policy-versions/{id}/reassessments`             | Idempotent queue creation; reuse pending work                |
| Evidence           | `GET/POST .../evidence`                                   | Reference metadata and authorized upload initiation          |
| Remediation        | `GET/POST .../remediation`, `PATCH .../remediation/{id}`  | Task ownership, due dates and progress notes                 |
| Lineage            | `GET .../systems/{id}/lineage`                            | Versioned nodes/edges and source references                  |
| Audit              | `GET .../audit-events`                                    | Server-authored immutable history with correlation IDs       |
| Reports            | `POST .../reports`, `GET .../reports/{id}`                | Authorized scoped export and job progress                    |
| Integrations       | `GET .../integrations`, `POST .../integrations/{id}/sync` | Server-owned secrets, connection state and sync jobs         |

These endpoint paths are design proposals. Do not send production traffic until a backend contract and authentication scheme are agreed.

## Contract requirements

Preserve the five explicit outcome values: `compliant`, `partial`, `noncompliant`, `insufficient`, `na`. Findings need requirement-version IDs, source excerpts/references, evidence version IDs, rationale, assessor and review timestamps. Assessment snapshots must pin policy versions rather than reading a moving “current policy”. A human decision is distinct from the compliance outcome.

List responses should return records plus cursor/page metadata, applied filters and stable sort. Mutations should return the updated versioned record and a server correlation ID. Errors should expose a stable code, localized safe message, field errors where relevant and the correlation ID. Use server-side workspace authorization and role/ownership checks on every read and write. Require idempotency for bulk reassessment/export/sync commands and concurrency protection for decisions and edits.

Evidence storage requires authorized upload handling, size/type/signature validation, scanning, object ownership, retention rules, access-checked retrieval and immutable version hashes. The local reference form does not implement this storage layer.

The backend must own aggregation, workflow transitions, audit integrity, regulatory applicability, file validation and permissions. Browser state and disabled buttons are presentation controls, not authorization. Replace the local store with a typed repository adapter and add contract/integration tests before enabling live mode. Keep fixtures in an explicit demo mode.

## Monitoring extension

The dedicated monitoring adapter now implements the proposed same-origin REST/SSE boundary in frontend code. See `MONITORING.md` for exact mode separation, recovery/authentication/tenant rules and infrastructure requirements. `monitoring-openapi.json` is the generated OpenAPI 3.1 draft. Existing business endpoints above remain proposals and were not replaced or deployed. No Python service, PostgreSQL/Redis service, provider credential store or actual external provider telemetry has been implemented or verified in this frontend task.
