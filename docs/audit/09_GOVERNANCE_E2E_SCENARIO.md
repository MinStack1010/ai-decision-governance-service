# TASK-AUDIT-09 — Critical governance end-to-end scenario

## Requested scenario

The application instructions require a 365-day policy review interval to change to 90 days, with a 120-day valid evidence record. The expected result is one affected system, unaffected systems unchanged, historical assessment retained, a new NOT_MET assessment, reviewer action, remediation and audit export.

## Execution result

`BLOCKED at product execution`. The frontend does not expose a policy-version API, control mapping engine, impact-run job, stale assessment field, evidence artifact store or backend reassessment endpoint. The existing Impact screen can queue local pending assessments, but it does not calculate the requested age rule or policy-version dependency graph.

## Isolated sample data

`evidence/synthetic/policy-change-365-to-90-fixture.json` contains:

- SYS-A in scope, SYS-B outside scope and SYS-C in a different policy scope;
- P-01 v1 (365 days) and v2 (90 days);
- R-01 → CTRL-RISK → SYS-A mapping;
- EV-01 observed 120 days before publication;
- expected affected/unaffected sets, NOT_MET rule and historical preservation.

A standalone arithmetic oracle matched the expected output. `policy-change-365-to-90-expected.json` explicitly states `executed_against_product_backend=false`; the fixture is audit data, not application evidence.

## Last available step

The current UI can select seeded systems, display seeded assessments/evidence, review a pending finding with rationale and create a browser-local remediation task. It cannot execute policy publication, impact analysis, stale marking, evidence-age evaluation or backend audit export.

## Recommended implementation before claiming E1

Add a versioned policy/requirement/control data model, mapping and applicability rules; implement an authenticated impact-run API and durable assessment snapshots; execute the fixture against that service; add boundary tests for 89/90/91 and 364/365/366 days; preserve the old snapshot and emit a reason path for each affected system.
