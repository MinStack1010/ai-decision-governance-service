# TASK-AUDIT-03 — Essential Outcomes audit

Status vocabulary: `UI_ONLY`, `MOCK_DATA_ONLY`, `MOCK_WORKFLOW_IMPLEMENTED`, `DESIGN_ONLY`, `NOT_IMPLEMENTED`, `BLOCKED`.

| Outcome | What the code actually demonstrates | Status | Evidence and gap |
|---|---|---|---|
| E1 Continuous alignment | Systems, policies, requirements, assessments and a queue action are displayed. The impact page queues pending synthetic assessments and deduplicates them. There is no policy version diff, requirement/control mapping graph, stale flag or policy publish event. | MOCK_WORKFLOW_IMPLEMENTED | `fixtures.ts:2-48`, `workflows.ts:1-57`, `policies-assessments.tsx`; E1 synthetic fixture is isolated under `evidence/synthetic/` but product execution is blocked. |
| E2 Interoperability | `HttpMonitoringService` and `FetchSSETransport` define a client-side contract with tenant header, same-origin cookies, schema checks, SSE cursor/retry and no provider credentials in browser. | DESIGN_ONLY / UI_ONLY | `http-service.ts`, `sse-transport.ts`, `monitoring-openapi.json`; no FastAPI, connector, webhook receiver, external system or provider call exists. |
| E3 Administrative/data controls | Workspace selector and demo organization filtering exist. Browser localStorage contains all demo records. No authentication, role authorization, ABAC, PostgreSQL RLS, residency, retention, deletion, legal hold or JIT support access. | UI_ONLY | `store.tsx`, `app-shell.tsx:336-337`; direct API security cannot be tested because no API exists. |
| E4 Assessment/reassessment | Five frontend outcome values are modelled (`compliant`, `partial`, `noncompliant`, `insufficient`, `na`). Findings have reason text and requirement IDs; reviewers can change pending findings with rationale. | MOCK_WORKFLOW_IMPLEMENTED | `model.ts:5-109`, `workflows.ts`, `domain.test.ts`; missing separate `UNKNOWN`, framework corpus, versioned controls, applicability rules, source anchors, certainty and artifact authorization. |
| E5 Human oversight | Review drawer supports finding review and approval rationale; audit events are appended to localStorage. The tests verify rationale and that approved findings cannot be silently edited. | MOCK_WORKFLOW_IMPLEMENTED | `workflows.ts`, `store.tsx`, 16 domain tests; no identity, role segregation, append-only audit store or server persistence. |
| E6 Data/model/output risk | Risk labels and a synthetic monitoring summary expose latency/error/request counts. Metric thresholds, baselines, data lineage, sample sizes, drift, fairness, robustness, safety and reproducible evaluator datasets are absent. | UI_ONLY / DESIGN_ONLY | `model.ts:18-22`, `monitoring/utils/data.ts`, monitoring types; no metric dataset or evaluator service. |

## Five-source requirement

The application names Service and Digital, Directive on Automated Decision-Making, AIA, Federal AI Strategy and AI ethics/guiding principles. The repository contains generic synthetic policy names and five generic requirements, not source documents, document versions, clause anchors or professionally reviewed mappings. A dropdown or label alone is not evidence of a framework implementation.

## Synthetic E1 oracle

The isolated fixture uses SYS-A/SYS-B/SYS-C, P-01 v1/v2, a 120-day evidence record and a 365-to-90-day interval change. Its oracle is `affected=[SYS-A]`, `unaffected=[SYS-B,SYS-C]`, `new=NOT_MET`, historical snapshot preserved. The standalone arithmetic oracle matched, but `executed_against_product_backend=false` because the product has no backend impact engine.
