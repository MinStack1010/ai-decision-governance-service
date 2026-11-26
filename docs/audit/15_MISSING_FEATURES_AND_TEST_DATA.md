# TASK-AUDIT-15 — Missing features and test data

## A. Missing frontend functionality

- Complete `UNKNOWN`/unable-to-determine status and explanation treatment.
- Show policy/control version history, changed requirements, stale assessments and impact reason paths.
- Provide artifact provenance, expiry/revocation/conflict states and an evidence package view.
- Add complete localized report/notification/PDF flows if those remain in scope.

## B. Missing mock business logic

- Versioned policy → requirement → control → assignment → system graph.
- Applicability rules by purpose/risk/framework.
- Age/threshold evaluation with boundary and conflicting evidence rules.
- Historical assessment snapshots that cannot be overwritten.
- Risk metric baseline, threshold and sample-size evaluation.

## C. Missing synthetic datasets

- Five Canadian source versions with clause anchors and review metadata.
- Policy changes covering add/modify/replace/retire.
- Three-system impact gold set and five-outcome assessment gold set.
- Evidence lifecycle (valid/expired/revoked/tampered/conflicting/missing).
- Model/deployment/data versions, risk metrics and output evaluation records.

## D. Missing tests

- E1 end-to-end policy change scenario using the isolated fixture.
- UNKNOWN versus NOT_MET decision boundaries.
- Backend API contract, authorization, RLS and object-scope negatives.
- Connector retry, conflict, DLQ, replay and idempotency.
- Evidence hash/signature, expiry and legal hold.
- Full French report/workflow and rendered axe checks.
- Performance and benchmark tests with published sample sizes.

## E. Missing backend functionality

FastAPI service, PostgreSQL/pgvector schema, migrations, worker/outbox, durable storage, policy ingestion, impact runs, assessments, findings, evidence, reviews, remediation, reports, audit events and tenant-scoped APIs.

## F. Missing real AI integration

No provider, local-model, enterprise-system, webhook receiver or OTLP/telemetry producer is present. The live browser adapter is a contract boundary only.

## G. Missing security controls

OIDC validation, MFA/IdP integration, RBAC/ABAC, default-deny authorization, RLS, JIT support access, secrets manager, egress controls, redaction, malware scanning, legal hold, purge receipts and immutable audit storage.

## H–J. Missing evidence

Benchmark results, deployment/residency logs, licences/SBOM/IP documentation, staffing/CV confirmation, funding controls, inclusivity strategy and commercialization evidence are outside the repository.
