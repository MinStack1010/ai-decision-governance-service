# TASK-AUDIT-05 — Test data inventory

## Available datasets

| Dataset | Path | Format/records | Module | Synthetic/real | Coverage and limitation |
|---|---|---:|---|---|---|
| Governance services workspace | `frontend/src/features/governance/fixtures.ts:49-301` | TypeScript: 8 systems, 3 policies, 5 requirements, 6 assessments, 3 evidence, 3 tasks, 3 audit events, 3 integrations | Registry, policy, assessment, evidence, remediation, audit | Synthetic | Covers compliant/partial/noncompliant/insufficient/NA at system/finding level; no separate UNKNOWN; no version history or requirement-control mapping. |
| Research workspace | `fixtures.ts:49-301` via `seedWorkspace(true)` | 0 systems, 3 policies, 0 assessments/evidence/tasks/audit | Multitenancy | Synthetic | Verifies an empty tenant shell only; no independent policy/control/assessment dataset. |
| Monitoring demo connections | `frontend/src/features/monitoring/services/demo-service.ts:54-155` | Up to 7 registered system connections, six connection states, seven provider types | Monitoring/registry | Synthetic | No external endpoint contacted; endpoint URLs use `.example.invalid`; credentials are false. |
| Monitoring demo events | `demo-service.ts:159-318` | 24 seeded decisions plus generated timer events | Monitoring/traceability | Synthetic | Decision metadata excludes raw prompts/responses; resources link to current fixtures. No real telemetry. |
| Monitoring alerts | `frontend/src/features/monitoring/utils/data.ts:94-119` and demo seed | Derived from event types; seeded compliance alert | Monitoring/governance | Synthetic | Alert derivation and links are tested; no backend notification delivery. |
| UI-created records | `store.tsx`, feature components | Runtime browser localStorage | Registry/evidence/remediation/audit | Synthetic user-entered | Persistence is browser-local and Zod-validated. No database durability or concurrent-user semantics. |
| Monitoring contract schemas | `frontend/src/features/monitoring/schemas/index.ts` | Zod schemas for connection, health, metrics, events, tests and configuration | API contract | Synthetic schema | Validates expected payload shapes; does not prove a server produces them. |
| E1 policy-change fixture | `docs/audit/evidence/synthetic/policy-change-365-to-90-fixture.json` | 3 systems, 2 policy versions, 1 mapping, 1 evidence | E1 impact scenario | Synthetic audit-only | Contains expected oracle; not loaded by the product and not a backend execution. |

## Referential integrity findings

The seeded frontend workspace is internally coherent for its simplified model: assessments point to seeded systems, findings point to the five requirement IDs, evidence points to seeded systems/requirements, and tasks point to seeded systems. Monitoring tests additionally verify event resource IDs against current governance records. The model does not contain policy versions, controls, framework clauses, system assignments, assessment snapshots or evidence hashes, so those relationships cannot be audited.

## Required but missing datasets

- Two policy versions with added, modified, retired and replaced requirements.
- Requirement-to-control-to-system mappings with reason paths.
- A gold set for impact precision/recall.
- Separate `UNKNOWN` findings caused by missing and conflicting evidence.
- Valid, expired, revoked, tampered and unauthorized evidence artifacts.
- Evidence age boundary cases at 89/90/91 and 364/365/366 days.
- Multiple model/deployment versions and reproducible decision traces.
- Data/model/output risk metrics with baseline, threshold and sample size.
- Cross-tenant negative records and authorization identities.
- Connector replay, duplicate, conflict, retry and dead-letter records.
- Five authentic Canadian source versions with clause anchors and review provenance.
- EN/FR report and notification fixtures.

The isolated E1 sample requested by the user is included only as a clearly marked audit fixture. It must not be confused with live application evidence.
