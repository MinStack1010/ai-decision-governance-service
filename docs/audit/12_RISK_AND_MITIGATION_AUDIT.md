# TASK-AUDIT-12 — Risk and mitigation audit

## Science and technology risks

The application and TDD identify mapping errors, LLM hallucination, missing evidence, connector failure, leakage/prompt injection and metric errors. The proposed mitigations (expert review, schema validation, provenance, redaction, replay/deduplication, thresholds and gold sets) are documented design intentions. The repository has only partial supporting evidence:

| Risk | Existing control/evidence | Gap |
|---|---|---|
| Incorrect policy mapping | Generic requirements and UI review | No source corpus, clause anchors, mapping engine or gold set |
| Unsupported LLM output | No LLM call in repository | No production gateway, schema validation around LLM, prompt-injection test |
| Missing/conflicting evidence | `insufficient` outcome and rationale tests | No evidence provenance, conflict model, `UNKNOWN` result or artifact verification |
| Connector replay/duplicates | Demo event dedup/order tests and SSE cursor tests | No ingestion endpoint, queue, DLQ or external connector |
| Cross-tenant leakage | Demo org filtering tests | No identity, API authorization, database/RLS or storage isolation |
| Data egress/secrets | Safe endpoint validation and no browser provider keys | No gateway, secret manager, network policy or runtime logs |
| Metric/evaluation error | Synthetic latency/error summary tests | No versioned datasets, baselines, sample-size gates or calibrated evaluator |

## Project risks

Human resources, funding, project management, IP, material/test infrastructure and supplier risks are only prose in the application. The repository contains no approved budget, staffing evidence, CVs, IP register, SBOM, licence report, milestone approval or supplier plan. These must be confirmed by the applicant rather than inferred from source code.

## Priority risk gaps

P0: no backend authorization/persistence for a claim requiring restricted governance data. P0: current TRL evidence does not meet the official Phase 2 5–9 requirement. P1: no vertical slice or labelled impact benchmark. P1: no two real protocol connectors. P2: documentation, report localization and deployment polish.
