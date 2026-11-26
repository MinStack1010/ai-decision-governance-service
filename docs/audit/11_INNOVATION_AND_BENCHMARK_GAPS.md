# TASK-AUDIT-11 — Innovation and benchmark gaps

## Proposed differentiators

The application proposes a Canada-focused policy-change-to-reassessment workflow, evidence-pinned snapshots, reviewer-controlled revisions, traceability and portable deployment. The current frontend demonstrates the vocabulary and a few local interactions. It does not demonstrate a measured improvement over a competitor or spreadsheet workflow.

| Proposed differentiator | Current classification | Missing proof |
|---|---|---|
| Policy → control → system dependency graph | DESIGN_ONLY | Versioned backend graph, mappings, reason paths and changed/retired requirement corpus |
| Automatic impact detection | DESIGN_ONLY | Expert-labelled gold set, precision/recall, false-negative analysis |
| Evidence-pinned assessment snapshot | MOCK_DATA_ONLY | Immutable artifact IDs/hashes, source anchors, reproducible backend snapshot |
| Reviewer-controlled finding revision | MOCK_WORKFLOW_IMPLEMENTED | Authorized actor/role, revision history, optimistic locking and audit persistence |
| Reduced manual reconciliation | PROPOSED | Controlled comparison with baseline spreadsheet/manual process and median time |
| Portable deployment | DESIGN_ONLY | Same image in two environments, deployment logs, residency and configuration tests |

## Benchmark data missing

- labelled policy-change pairs with affected-system ground truth;
- clause/citation gold set;
- five-outcome assessment gold set;
- human review time and error baseline;
- connector latency, replay and deduplication load set;
- API p95/p99 and job throughput measurements;
- report generation and notification delivery measurements.

Product names in the application (IBM watsonx.governance, Langfuse and spreadsheets) are comparison subjects, not benchmark results. No superiority claim should be made until the same corpus, metrics, environment and limitations are published.
