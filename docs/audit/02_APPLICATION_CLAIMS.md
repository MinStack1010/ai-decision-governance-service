# TASK-AUDIT-02 — Application claims

The claims below are extracted from the supplied Phase 2 application. The document itself already uses careful wording in several places, such as “proposed”, “planned”, “unverified” and “provisional”. This audit preserves that distinction.

| Claim ID | Section | Claim classification | Current evidence status |
|---|---|---|---|
| Q1A-001 | 1a | PROPOSED_CAPABILITY | Versioned policy/requirement/control registry is represented only by a simplified frontend fixture; no backend registry or version graph exists. |
| Q1A-002 | 1a | PROPOSED_CAPABILITY | Automatic impact detection and reassessment are not implemented; the UI queues synthetic pending assessments. |
| Q1A-003 | 1a | PROPOSED_CAPABILITY | FastAPI REST/OpenAPI, JSON schemas, webhook and telemetry adapters are design targets. A frontend live adapter exists, but no server or connectors exist. |
| Q1A-004 | 1a | PROPOSED_CAPABILITY | OIDC, RBAC/ABAC, PostgreSQL, residency, retention, deletion and legal holds are not implemented. |
| Q1A-005 | 1a | PROPOSED_CAPABILITY | Five-outcome assessment UI/domain supports compliant, partial, noncompliant, insufficient and NA. It does not yet implement the application wording “unable to determine” as a separate `UNKNOWN` value. |
| Q1A-006 | 1a | PROPOSED_CAPABILITY | Evidence references and reviewer workflow are synthetic browser state; no authorized artifact service or immutable history exists. |
| Q1A-007 | 1a | PROPOSED_CAPABILITY | Monitoring types and synthetic decision lineage exist; no real AI decision trace integration exists. |
| Q1B-001 | 1b | PROPOSED_CAPABILITY | OCI/on-prem/private-cloud/Canadian-hosted deployment is not verified; no container manifests exist. |
| Q1B-002 | 1b | HISTORICAL_REPORTED_RESULT | EN/FR navigation and many business labels exist in source and authored tests; rendered browser execution is blocked. |
| Q1B-003 | 1b | PROPOSED_CAPABILITY | Workspace switching is browser-side demo isolation, not server-enforced multitenancy. |
| Q1B-004 | 1b | PROPOSED_CAPABILITY | CSV report/export and simulated integration exist; ticket/webhook and real notification adapters do not. |
| Q2-001 | 2a/2b | HISTORICAL_REPORTED_RESULT | Application says TRL 3 provisional and TRL 5 not established. Current source evidence supports a frontend proof of concept, not TRL 5. |
| Q3A-001 | 3a | EXTERNAL_COMPARISON_CLAIM | Policy-change-to-reassessment is a proposed innovation; no precision/recall or usability benchmark exists. |
| Q3B-001 | 3b | EXTERNAL_COMPARISON_CLAIM | IBM watsonx.governance/Langfuse/spreadsheet comparison is unverified in this repository; no competitive benchmark dataset exists. |
| Q4-001 | 4 | RISK_MITIGATION_PLAN | Risk mitigations are documented proposals, not verified controls. |
| Q5-001 | 5 | RISK_MITIGATION_PLAN | Project risk mitigations are prose only; staffing, funding, IP and supplier evidence are absent. |
| Q6-001 | 6 | FUTURE_DEVELOPMENT_TARGET | Six-milestone, 80-week plan and exit TRL 7 are proposed; no approved schedule or delivery evidence exists. |
| Q7-001 | 7 | ORGANISATIONAL_INFORMATION | Team members are TBD placeholders; no CVs or verified role evidence are in the repository. |

## Interpretation

The application is not contradicted by the repository where it explicitly calls capabilities “planned” or “unverified”. It would become misleading if those future-tense statements were rewritten as current production functionality. The current code supports a UI/synthetic workflow demonstration and a typed monitoring adapter contract; it does not support the proposed backend, security, residency, connector or field-validation claims.
