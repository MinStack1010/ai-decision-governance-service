# AI Governance Hub Frontend

AI Governance Hub is a Next.js App Router frontend for managing AI systems, policies, assessments, evidence, human review, remediation, audit history, integrations, and live monitoring.

The current application is a local demonstration frontend. Its governance records are seeded in the browser and persisted with `localStorage`; it does not require a backend or database to start.

## Requirements

- Node.js 22 or newer
- npm

## Run locally

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000).

The development command binds to `127.0.0.1`. To expose a production preview on another interface, run:

```bash
npm run build
npx next start --hostname 0.0.0.0
```

## Run with Docker Compose

Docker Desktop and Docker Compose are required.

```bash
docker compose up --build -d
docker compose ps
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000). The Compose health check requests `/dashboard` and reports the container as healthy after the production server is ready.

If port `3000` is already in use, map the container to another host port:

```bash
FRONTEND_PORT=3001 docker compose up --build -d
```

Then open [http://127.0.0.1:3001](http://127.0.0.1:3001).

Stop the container with:

```bash
docker compose down
```

The image is a multi-stage production build. It runs the Next.js standalone server as a non-root user and does not include development dependencies.

## Build the Docker image directly

To create an image that appears under Docker Desktop **Images**:

```bash
cd /Users/ploggvn/Documents/ai-decision-governance-service/frontend
docker build -t ai-governance-hub-frontend:latest .
docker image ls ai-governance-hub-frontend
```

To run that image without Compose:

```bash
docker run -d \
  --name ai-governance-hub-frontend \
  -p 3001:3000 \
  ai-governance-hub-frontend:latest
```

Open [http://127.0.0.1:3001](http://127.0.0.1:3001).

## Available scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Next.js development server. |
| `npm run build` | Create a production build using webpack. |
| `npm run start` | Serve the production build locally. |
| `npm run typecheck` | Run TypeScript without emitting files. |
| `npm run test:domain` | Run governance domain and workflow tests. |
| `npm run test:monitoring` | Run monitoring service, transport, schema, and fixture tests. |
| `npm run test:contrast` | Validate the design-token contrast pairs. |
| `npm run test:e2e` | Run the Playwright browser suite. |
| `npm run contracts:monitoring` | Generate and validate the monitoring contract document. |
| `npm run format:check` | Check Prettier formatting. |

## Main routes

The shared application shell provides grouped navigation, workspace switching, breadcrumbs, global search, notifications, language switching, profile actions, and a collapsible sidebar.

- `/dashboard` — portfolio overview and attention items
- `/registry` — AI system registry and connection metadata
- `/monitoring` — live monitoring dashboard
- `/policies` — policies, requirements, controls, versions, and approval actions
- `/assessments` — compliance assessments and findings
- `/impact` — policy revision impact analysis
- `/evidence` — evidence records and expiry tracking
- `/traceability` — policy-to-decision lineage
- `/risks` — risk findings and threshold views
- `/reviews` — human review queue
- `/remediation` — remediation tasks
- `/reports` — report views
- `/audit` — audit log history
- `/integrations` — connector configuration demo
- `/settings` — workspace settings

## Architecture

```text
src/
├── app/                         Next.js routes and global styles
├── components/
│   ├── layout/                  Shared application shell
│   └── ui/                      Buttons, dialogs, inputs, tables, and statuses
├── features/governance/         Registry, policies, assessments, evidence, and workflows
├── features/monitoring/         Monitoring UI, schemas, services, SSE, and connectors
├── styles/                      Design tokens and Tailwind semantic mappings
└── lib/                         Shared utilities
```

`GovernanceProvider` owns the local workspace state and exposes bilingual labels, workspace switching, persistence, and toast messages. Domain schemas are defined with Zod. Monitoring has separate demo and HTTP/SSE adapters so connection health cannot silently alter compliance outcomes.

## Demonstration data and persistence

- The default workspace is `Public Services · Demo`.
- `Research Lab · Demo` is available as a separate local workspace fixture.
- Browser state is stored under the governance demo local-storage key.
- Clearing site storage resets the demonstration data.
- The footer explicitly identifies the application as a local demonstration.

## Policy document import

The Policies page accepts PDF, Word (`.doc`/`.docx`), and Excel (`.xls`/`.xlsx`) file metadata. The current dialog validates the extension and stores the file name, type, size, and timestamp in the local demo record. File bytes are not uploaded to a server and no document parser, malware scan, object store, or backend policy ingestion pipeline is included yet.

## Monitoring modes

Demo monitoring is enabled by default and uses deterministic synthetic events. The live adapter is designed for a same-origin monitoring API and SSE stream; it does not send provider credentials from the browser and it never falls back to demo fixtures when a live request fails.

The expected live endpoints are documented by the generated monitoring contract. A compatible backend, authentication layer, tenant enforcement, and provider connectors must be supplied before using live mode in production.

## AI-powered assessments

Assessments now run through the same-origin backend route `POST /api/assessments/run`. The request contains the selected workspace snapshot and system identifier; the server-side engine collects registry, policy, linked evidence and audit metadata, evaluates each control, and returns an assessment with provenance, stage events, findings, evidence-source IDs, confidence (or `null` when evidence is insufficient), risks, and recommended remediation.

The deterministic rules engine is the safe default. It uses the five displayed outcomes: Met, Partially Met, Not Met, Unable to Determine, and Not Applicable. It never creates evidence and never assigns confidence when no supporting source is linked. `ASSESSMENT_AI_PROVIDER=openai-compatible` plus a server-only `ASSESSMENT_AI_PROVIDER_URL` can enrich explanations with validated structured JSON; the rules outcome and evidence gate remain authoritative, and an invalid provider response is ignored.

The UI provides Run AI assessment and Reassess system actions, shows the completed execution stages, and exposes analysis, evidence sources, confidence, risks and recommended actions in the finding workspace. Approval remains a human action. This local implementation is not a substitute for a durable database, background-job scheduler, authentication/RBAC, signed provider requests, policy retrieval service, production telemetry gateway or tamper-evident audit store.

## Design and accessibility

The interface follows a Minimal Enterprise GovTech light theme:

- Neutral canvas and white surfaces
- Navy structural sidebar
- Teal contextual actions
- Semantic compliance and risk colours
- Compact, left-aligned data tables
- Visible keyboard focus and skip navigation
- Reduced-motion support
- Native dialogs and form controls
- Status meaning expressed with text, not colour alone

The sidebar remains keyboard-, wheel-, and trackpad-scrollable while its visible scrollbar is hidden to match the sidebar surface. The registry keeps each system name aligned with its system identifier, including wrapped names.

## Verification

Run the full local checks before handing off changes:

```bash
npm run typecheck
npm run test:domain
npm run test:monitoring
npm run test:contrast
npm run format:check
npm run build
```

The Playwright suite is available through `npm run test:e2e`. On systems with a low file-descriptor limit, Next.js file watching may fail with `EMFILE`; increase the limit or use a CI runner with sufficient descriptors before treating browser-suite results as complete.

## Current limitations

This frontend is a functional demonstration rather than a production governance service. It currently has no server-side authentication, RBAC, database persistence, policy parsing, malware scanning, real regulatory feed, durable audit store, or production provider telemetry gateway.

These boundaries are intentional and should be resolved before presenting the local demo as a production compliance platform.
