# Requirement traceability matrix

Implementation presence and successful static/domain tests do not imply browser verification.

| ID    | Requirement                                              | Implementation                                                  | Validation state                                                    |
| ----- | -------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------- |
| FE-01 | Next App Router, TS, Tailwind v4                         | `frontend/src/app`, package/config files                        | Build and TypeScript PASS                                           |
| FE-02 | Shared restrained color/spacing/radius system            | `src/styles/{tokens,theme}.css`, `app/globals.css`              | 50 static contrast checks PASS; visual review BLOCKED               |
| FE-03 | Shell/navigation/workspace/search/language/user menu     | `components/layout/app-shell.tsx`                               | E2E authored; NOT RUN                                               |
| FE-04 | Four overview metrics and meaningful chart/table/alerts  | `features/governance/overview-registry.tsx`                     | Browser review BLOCKED                                              |
| FE-05 | Registry create/edit/search/filter/sort/paginate/export  | `overview-registry.tsx`, `components/ui/data-table.tsx`         | E2E authored; NOT RUN                                               |
| FE-06 | Policy requirements, version history and approval        | `policies-assessments.tsx`                                      | E2E/visual checks pending                                           |
| FE-07 | Five-outcome findings, evidence and human review         | `model.ts`, `workflows.ts`, `policies-assessments.tsx`          | Domain tests PASS; E2E NOT RUN                                      |
| FE-08 | Impact comparison and affected systems                   | `policies-assessments.tsx`                                      | Queue dedup domain test PASS; browser checks pending                |
| FE-09 | Evidence references linked to system/requirement         | `evidence-operations.tsx`, `model.ts`                           | No automatic compliance inference: domain PASS                      |
| FE-10 | Traceability graph and accessible alternative            | `traceability.tsx`                                              | Source implemented; React Flow migration and browser checks pending |
| FE-11 | Risk distribution and configurable threshold             | `evidence-operations.tsx`                                       | E2E route checks authored; NOT RUN                                  |
| FE-12 | Remediation ownership, due date, state and notes         | `evidence-operations.tsx`                                       | E2E/manual workflow execution pending                               |
| FE-13 | Audit timestamp/actor/action/resource/result/correlation | `store.tsx`, `evidence-operations.tsx`                          | Local-only; production integrity not implemented                    |
| FE-14 | Integration workflows                                    | `evidence-operations.tsx`                                       | Simulated only; E2E NOT RUN                                         |
| FE-15 | Reports                                                  | `evidence-operations.tsx`, `lib/utils.ts`                       | CSV generation implemented; download E2E NOT RUN                    |
| FE-16 | English/French                                           | `model.ts`, `fixtures.ts`, bilingual labels throughout features | French route tests authored; NOT RUN                                |
| FE-17 | Keyboard/focus/modals/reduced motion                     | UI primitives and global CSS                                    | Static implementation; axe and manual review BLOCKED                |
| FE-18 | Screenshots at 1440/1280/1024/768/390                    | `tests/workspace.spec.ts`                                       | BLOCKED by server/browser permission restrictions                   |
| FE-19 | Existing routes/contracts/colors preserved               | No prior files supplied                                         | Not verifiable; new route map/contracts are documented              |
| FE-20 | shadcn/ui and React Flow                                 | `components.json`, native fallback components                   | Exact dependency requirement remains OPEN                           |
| FE-21 | Backend integration plan                                 | `docs/frontend/API_PLAN.md`                                     | Proposed only; must agree with backend before implementation        |

## Enhancement request IDs (FE-20–FE-30)

These IDs follow the new sidebar/monitoring brief; they do not delete the earlier bootstrap rows.

| ID    | Capability                                             | Implementation                                                            | Evidence                                                             |
| ----- | ------------------------------------------------------ | ------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| FE-20 | External native sidebar scrollbar                      | `app-shell.tsx`, `globals.css`, scrollbar tokens                          | Browser test authored; blocked execution                             |
| FE-21 | Connection contracts and bilingual exhaustive mappings | `monitoring/types`, `schemas`, `utils/labels.ts`                          | Unit validation PASS                                                 |
| FE-22 | Demo/live service abstraction                          | `monitoring/services`, `hooks/monitoring-provider.tsx`                    | Mock/live separation and cleanup tests PASS                          |
| FE-23 | Monitoring dashboard                                   | `monitoring/components/dashboard.tsx`                                     | Event-derived summaries/charts PASS; visual checks pending           |
| FE-24 | Registry indicators and column visibility              | `governance/overview-registry.tsx`                                        | Existing functions retained; browser checks pending                  |
| FE-25 | Connection detail                                      | `monitoring/components/connection-detail.tsx`, nested routes              | Six tab implementations; service actions tested                      |
| FE-26 | Continuous activity feed                               | `live-activity-feed.tsx`, `utils/feed.ts`, `utils/data.ts`                | Ordering/dedup/filter/pause/bounds tests PASS                        |
| FE-27 | Connector wizard                                       | `connector-wizard.tsx`, schemas/provider mappings                         | Metadata/capability validation PASS; UI flow pending                 |
| FE-28 | Governance integration                                 | `decision-context.tsx`, monitoring provider, existing business deep links | Valid synthetic resource references PASS; browser acceptance pending |
| FE-29 | Backend readiness                                      | `http-service.ts`, `sse-transport.ts`, OpenAPI draft                      | Auth headers, cursor/backoff/error/heartbeat/cleanup tests PASS      |
| FE-30 | Validation and honest evidence                         | `tests/monitoring.test.ts`, `monitoring.spec.ts`, contrast script         | See progress report; no unexecuted browser pass claimed              |
