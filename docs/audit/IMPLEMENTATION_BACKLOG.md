# Implementation backlog

| ID | Priority | Task | Dependencies | Acceptance evidence |
|---|---|---|---|---|
| GOV-P0-001 | P0 | Build tenant-scoped FastAPI/PostgreSQL foundation with OIDC/RBAC/ABAC and migrations | Confirm identity/hosting requirements | API and RLS negative tests; audit log; deployment log |
| GOV-P0-002 | P0 | Implement policy/requirement/control version graph and impact-run job | GOV-P0-001; reviewed corpus | E1 fixture returns SYS-A only and preserves old snapshot |
| GOV-P0-003 | P0 | Implement evidence artifact service with hash/provenance/expiry/revocation and `UNKNOWN` semantics | GOV-P0-001 | Boundary, tamper, conflict and authorization tests |
| GOV-P0-004 | P0 | Produce TRL 5 evidence package and controlled integrated validation | GOV-P0-001–003 | Reproducible environment, logs, actors, dates and dataset |
| GOV-P1-001 | P1 | Add two connector sandboxes with canonical event ingestion, replay, DLQ and provenance | API schemas | Contract and idempotency tests |
| GOV-P1-002 | P1 | Add risk evaluator for data/model/output metrics and thresholds | Versioned evaluator datasets | Baseline/sample/threshold result and findings |
| GOV-P1-003 | P1 | Add durable reviewer revisions, optimistic locking, segregation and remediation closure | Evidence service | Original/new values and reason are auditable |
| GOV-P1-004 | P1 | Complete EN/FR reports, notifications and ticket/webhook adapter | Backend/report jobs | Rendered bilingual output and scoped delivery |
| GOV-P1-005 | P1 | Run browser/axe matrix on stable runtime and store screenshots | Runtime environment | 113 tests executed with pass/fail and artifacts |
| GOV-P2-001 | P2 | Add OCI/Compose and two deployment/residency demonstrations | Backend | Same image and regional configuration logs |
| GOV-P2-002 | P2 | Build competitive benchmark corpus and manual baseline | Governance specialist | Impact/citation/manual-time metrics with limitations |
| GOV-P2-003 | P2 | Add SBOM/licence/IP, staffing and commercialization evidence package | Applicant confirmation | Reviewed company documents |
