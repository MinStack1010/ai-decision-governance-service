# TASK-AUDIT-06 — Existing test coverage

## Test inventory

| Class | Files | Count/status | What is actually asserted |
|---|---|---:|---|
| Domain unit | `frontend/tests/domain.test.ts` | 16 passed | Outcome aggregation, reassessment deduplication, unknown system rejection, reviewer rationale, evidence non-inference, workspace fixture isolation and Zod persistence. |
| Monitoring unit/contract | `frontend/tests/monitoring.test.ts` | 34 passed | Synthetic service, six states/providers, event ordering/dedup/bounds, summary/chart derivation, tenant filtering, safe configuration, REST/SSE adapters, cursor recovery, schema invariants and cleanup. |
| Static contrast | `frontend/tests/contrast.mjs` | 60/60 passed | Token-level colour pair calculations; not rendered accessibility. |
| Playwright authored | `frontend/tests/workspace.spec.ts`, `monitoring.spec.ts` | 113 listed, execution blocked | Route rendering, French labels, registry/evidence/review/impact workflows, monitoring pause/wizard/alerts/live error and accessibility hooks. |
| Build/type/format/contract | npm scripts | Passed | Compilation, TypeScript, formatting and generated monitoring OpenAPI JSON. |
| API/database/security integration | none | 0 | No backend/database exists to test. |
| Performance/AI evaluation | none | 0 | No input datasets, benchmark runner or model evaluator exists. |

## Claim-to-test limitations

- Passing domain tests prove local pure functions and synthetic workflow invariants; they do not prove server authorization, persistence or compliance correctness.
- Monitoring tests deliberately prove that demo data is synthetic and that live errors do not fall back to demo data. They do not prove a real SSE producer or provider connector.
- Contrast tests calculate design token contrast; they do not replace axe or human keyboard inspection.
- The Playwright files contain meaningful assertions but were not executed in this environment, so they remain `TEST_EXISTS_NOT_EXECUTED`.

## Missing negative and boundary coverage

No executable tests cover OIDC token validation, RBAC/ABAC, RLS, deletion/legal hold, evidence tampering, policy version diff, stale assessment persistence, requirement applicability, connector DLQ/replay, real API rate limits, report localization, PDF output, fairness/quality metrics, or external notification delivery.
