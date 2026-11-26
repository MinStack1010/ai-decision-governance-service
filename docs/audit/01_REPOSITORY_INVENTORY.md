# TASK-AUDIT-01 — Repository inventory

## Scope and source identification

- Project root: `/Users/ploggvn/Documents/ai-decision-governance-service`
- Frontend: `/Users/ploggvn/Documents/ai-decision-governance-service/frontend`
- Primary application used: ChatGPT Library `Phase_2_Application_Governance_Hub_Revised.docx` (`libfile_3ad26b9be7888191b4c8a0e00cdba846`)
- A local Downloads copy with the non-Revised filename was also inspected; its extracted application content matched the Revised Library copy for the audited sections.
- Secondary design used: `/Users/ploggvn/Downloads/Thiet_ke_Backend_AI_Governance_Canada.docx`
- The library attachment `Pasted text(2).txt` was used as the audit instruction set.
- No Git repository metadata was present at the project root (`git status` returned “not a git repository”).

## Actual implementation

| Area | Finding | Evidence |
|---|---|---|
| Framework | Next.js 16.3.8, React 19.2.8, TypeScript 5.9.3 | `frontend/package.json` |
| Package manager | npm with `package-lock.json` | `frontend/package-lock.json` |
| Application routes | 15 business routes from the `routes` constant; one dynamic `[module]` page plus two monitoring dynamic pages | `frontend/src/features/governance/model.ts:111-131`, `frontend/src/app/monitoring/**/page.tsx` |
| Shared shell | Fixed sidebar/header, workspace selector, language switch, search and notifications | `frontend/src/components/layout/app-shell.tsx:54` |
| Governance model | Zod schemas for systems, policies, requirements, assessments, findings, evidence, tasks, audit and integrations | `frontend/src/features/governance/model.ts:1-103` |
| Governance data | In-memory fixtures for 8 systems, 3 policies, 5 requirements, 6 assessments, 3 evidence records, 3 remediation tasks and 3 audit events | `frontend/src/features/governance/fixtures.ts:1-302` |
| Policy source import | Policies UI accepts PDF, DOC/DOCX and XLS/XLSX and stores file metadata in the browser demo | `frontend/src/features/governance/policy-documents.ts`, `policies-assessments.tsx` |
| Persistence | Browser `localStorage` only, validated by Zod; separate preference storage | `frontend/src/features/governance/store.tsx:34-147` |
| Governance workflows | Reassessment queue, finding review and decision rationale; no backend transaction | `frontend/src/features/governance/workflows.ts:1-57` |
| Monitoring demo | Synthetic connections, decisions, alerts and timer-driven events | `frontend/src/features/monitoring/services/demo-service.ts:32-514` |
| Monitoring live adapter | Same-origin REST adapter and SSE transport; no server implementation in repository | `frontend/src/features/monitoring/services/http-service.ts:13-200`, `sse-transport.ts:46-190` |
| OpenAPI | Generated monitoring contract only; it describes an expected backend, not an implemented backend | `docs/frontend/monitoring-openapi.json`, `frontend/scripts/monitoring-contract.cjs` |
| Export | Browser CSV downloads for registry, audit and reports | `frontend/src/lib/utils.ts:5-24`, `evidence-operations.tsx` |
| Authentication/RBAC | Not implemented; UI explicitly describes local demonstration and no authentication | `app-shell.tsx:336-337` |
| Backend/database | None found: no Python/Java source, Docker/Compose, SQL migration or server package | repository-wide file inventory |
| CI/CD | No CI configuration found | repository-wide file inventory |
| Internationalisation | Bilingual `{en, fr}` labels in model/fixtures and runtime language switch; not external translation catalogs | `model.ts:1-12`, `app-shell.tsx:220-229` |

## Dependency and implementation notes

The exact shadcn/ui, Radix and React Flow packages are not installed. Native React controls and a graph/text alternative are used. This is a frontend implementation choice, not evidence of a backend governance platform.

The monitoring default is `demo`; live mode requires an external `/api/v1/monitoring` service and SSE endpoint. The demo service intentionally labels all values as synthetic and does not contact provider endpoints.

## Inventory totals

- Frontend source files: 41.
- Node test cases: 50 (16 domain + 34 monitoring).
- Playwright tests listed: 113 in two files; listing is not execution.
- Generated production routes: 18 static pages plus two dynamic monitoring route patterns in the last successful build.
- Backend source files: 0 found.
- Database migrations: 0 found.
- Container/deployment files: 0 found.
