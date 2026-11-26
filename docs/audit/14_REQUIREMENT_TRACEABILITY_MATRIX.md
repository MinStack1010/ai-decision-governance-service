# TASK-AUDIT-14 — Requirement traceability matrix

The three status dimensions are kept separate: implementation status, verification status and application-claim status.

| Section/claim | Government requirement | Source evidence | Backend/API/DB | Test evidence | Implementation | Verification | Claim status | Next task |
|---|---|---|---|---|---|---|---|---|
| Q1A-001 / E1 | Continuous alignment and affected-system identification | `fixtures.ts`, `workflows.ts`, impact UI | None | 16 domain tests cover queue dedup only | MOCK_WORKFLOW_IMPLEMENTED | UNIT_TEST_VERIFIED | PARTIALLY_SUPPORTED | Implement versioned policy/control graph and impact API |
| Q1A-002 / E1 | Reassessment when requirements change | `policies-assessments.tsx` queue | None | Queue UI authored, E2E blocked | UI_ONLY | TEST_EXISTS_NOT_EXECUTED | PROPOSED_FUTURE_CAPABILITY | Execute E1 fixture through backend |
| Q1A-003 / E2 | Standards-based API/connectors | `http-service.ts`, `sse-transport.ts`, OpenAPI | No producer service | 34 monitoring contract tests | DESIGN_ONLY | UNIT_TEST_VERIFIED | PROPOSED_FUTURE_CAPABILITY | Build FastAPI and two connector sandboxes |
| Q1A-004 / E3 | Restricted access, residency, retention/deletion | local UI org selector | None | Demo org filtering only | UI_ONLY | UNIT_TEST_VERIFIED | PROPOSED_FUTURE_CAPABILITY | Implement OIDC/RBAC/ABAC, RLS and lifecycle jobs |
| Q1A-005 / E4 | Five outcomes and explanations | `model.ts`, fixtures, review UI | None | Domain outcome tests pass | MOCK_WORKFLOW_IMPLEMENTED | UNIT_TEST_VERIFIED | PARTIALLY_SUPPORTED | Add UNKNOWN, certainty, anchors and framework data |
| Q1A-006 / E4/E5 | Evidence, approvals, remediation and audit | `fixtures.ts`, `store.tsx`, workflows | None | Evidence/review tests authored | MOCK_WORKFLOW_IMPLEMENTED | TEST_EXISTS_NOT_EXECUTED | PARTIALLY_SUPPORTED | Durable artifact/provenance and authorization service |
| Q1A-007 / E6 | Data/model/output risk and traceability | Monitoring types/demo events | None | Synthetic event tests pass | MOCK_DATA_ONLY | UNIT_TEST_VERIFIED | PROPOSED_FUTURE_CAPABILITY | Versioned evaluator datasets and real telemetry |
| Q1B-001 / A1 | Portable on-prem/private/Canadian hosting | None | None | None | NOT_IMPLEMENTED | NOT_TESTED | PROPOSED_FUTURE_CAPABILITY | Add OCI/Compose and two-environment evidence |
| Q1B-002 / A2 | EN/FR UI/docs/reports/workflows | bilingual model and shell | None | E2E authored, blocked | PARTIALLY_IMPLEMENTED | TEST_EXISTS_NOT_EXECUTED | PARTIALLY_SUPPORTED | Complete translation inventory and rendered tests |
| Q1B-003 / A3 | Independent tenant governance data | `store.tsx`, services/research fixture | None | domain tenant test | MOCK_DATA_ONLY | UNIT_TEST_VERIFIED | PARTIALLY_SUPPORTED | Server authorization and database isolation |
| Q1B-004 / A4 | Reports/alerts/notifications/ticket integration | CSV helpers, demo integrations, monitoring alerts | None | authored download/sync tests blocked | MOCK_WORKFLOW_IMPLEMENTED | TEST_EXISTS_NOT_EXECUTED | PARTIALLY_SUPPORTED | Report job/API and signed ticket/webhook adapters |
| Q2 / TRL | Feasibility evidence and TRL 5–9 | build/unit reports | None | static checks only | UI_ONLY | BLOCKED | HISTORICAL_RESULT_REQUIRES_CONFIRMATION | Establish controlled integrated environment |
| Q3A/Q3B | Innovation and state-of-art improvement | proposed workflow/docs | None | no benchmark | DESIGN_ONLY | NOT_TESTED | REQUIRES_EXTERNAL_CONFIRMATION | Label gold set and compare baseline |
| Q4/Q5 | S&T/project risk mitigation | application prose | None | no risk execution | DESIGN_ONLY | NOT_TESTED | PROPOSED_FUTURE_CAPABILITY | Add security, supply-chain and project evidence |
| Q6/Q7 | Plan/team feasibility | application tables | None | no schedule/team evidence | DESIGN_ONLY | NOT_TESTED | REQUIRES_EXTERNAL_CONFIRMATION | Confirm schedule, roles, CVs and funding |

See `requirement-traceability-matrix.csv` for machine-readable rows.
