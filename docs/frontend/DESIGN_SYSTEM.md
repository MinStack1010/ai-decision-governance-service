# Design system

## Direction

Minimal Enterprise GovTech, light mode. Information structure takes precedence over decoration. The workspace uses a compact navy sidebar, a neutral canvas, white working surfaces, teal actions, fine borders, and a small magenta wordmark detail. There are no hero banners, gradients, decorative KPI icons, animated numbers, or scroll entrance effects.

References from the brief inform spacing, data presentation, policy history, and institutional restraint. Their branding, layouts, and logos are not copied.

## Tokens and mappings

`frontend/src/styles/tokens.css` is the single source for color, radius, focus, motion, shell geometry, and floating shadow tokens. `theme.css` maps these into Tailwind v4 semantic utility namespaces with `@theme inline`. `globals.css` applies shared layout/component rules. Feature components refer to CSS variables for chart and lineage colors.

| Purpose                               | Token                                                       | Value                           |
| ------------------------------------- | ----------------------------------------------------------- | ------------------------------- |
| Canvas                                | `--bg-canvas`                                               | `#F8FAFC`                       |
| Surface                               | `--bg-surface`                                              | `#FFFFFF`                       |
| Sidebar / hover / active              | `--bg-sidebar`, `--bg-sidebar-hover`, `--bg-sidebar-active` | `#26374A`, `#34485D`, `#405770` |
| Subtle border                         | `--border-subtle`                                           | `#E2E8F0`                       |
| Interactive boundary                  | `--border-control`                                          | `#7C8DA3`                       |
| Primary / secondary / inverse text    | `--text-primary`, `--text-secondary`, `--text-inverse`      | `#1E293B`, `#64748B`, `#F8FAFC` |
| Primary action / hover                | `--primary`, `--primary-hover`                              | `#167E96`, `#126C82`            |
| Magenta mark / accessible accent text | `--brand-accent`, `--brand-accent-text`                     | `#EB0A8C`, `#B00069`            |
| Secondary brand reserve               | `--brand-secondary`                                         | `#46002A`                       |
| Compliant                             | `--status-compliant`                                        | `#166534`                       |
| Partially compliant                   | `--status-partial`                                          | `#854D0E`                       |
| Non-compliant                         | `--status-noncompliant`                                     | `#B91C1C`                       |
| Insufficient evidence                 | `--status-insufficient`                                     | `#1D4ED8`                       |
| Not applicable                        | `--status-na`                                               | `#475569`                       |

Semantic colors are not replaced by brand colors. Background tints are defined separately. Magenta `#EB0A8C` is used as a tiny decorative mark, not normal text. Burgundy is reserved in tokens and absent from normal workspace backgrounds. These five outcomes and lineage colors were newly defined because no original source was available to preserve.

## Typography and geometry

System font stack with optional locally installed Inter; no network font request. Regular 400, medium 500, semibold 600. Page headings 26px (24px mobile), section headings 16px, body 14px, controls/tables 13px, metadata 12px. Quantitative text uses tabular numerals. Content is left aligned.

Sidebar 240px, collapsed 68px. Header 60px. Main horizontal padding 24px desktop/16px mobile. Sections use 24px spacing; controls use 4px/8px increments. Panels use 6px corners and 1px borders; controls use 5px corners. Shadows appear only on dialogs/toasts. Table rows are approximately 52px. Buttons are at least 36px tall.

At 1024px and below, navigation moves to a modal drawer. At 768px and below, summary panels reflow to two columns, content workspaces stack, toolbars wrap, and tables scroll inside their own focusable region. The document body should not scroll horizontally. These behaviors are implemented but await browser verification.

## Page patterns

| Task                              | Pattern                                                                            |
| --------------------------------- | ---------------------------------------------------------------------------------- |
| Overview                          | Four metrics in one panel, one outcome chart, actionable work list, recent table   |
| Registry                          | Table-first workspace with one primary registration action                         |
| Policies                          | Document list, selected requirements, version-history tab, approval with rationale |
| Assessments                       | Five-outcome distribution, findings drawer, linked evidence, human decision        |
| Impact                            | Side-by-side modified/added/removed requirements and affected-system table         |
| Traceability                      | Rectangular nodes, thin connectors, node details, explicit text alternative        |
| Risk                              | Derived distribution and configurable internal count threshold                     |
| Evidence / remediation / audit    | Searchable data tables; task-specific record forms                                 |
| Reports / integrations / settings | Compact forms and divided rows, without repetitive card grids                      |

## Interaction and accessibility

Every status includes text and an icon. Shared buttons have hover, focus and disabled states. Browser native validation plus a whitespace-required check prevent empty form submission. Native `<dialog>` supplies modal focus trapping, Escape dismissal and focus return. User-visible storage loading occurs only during saved-state initialization; there are no pretend network loaders. Local changes are synchronous and announced through a status toast.

Keyboard navigation, skip link, semantic headings, labeled form fields, table captions and sortable-column buttons are implemented. Wide tables expose a labeled keyboard-focusable scrolling region. The graph has a text alternative and labeled zoom/selection controls. Motion is limited to short color transitions and disabled under `prefers-reduced-motion`.

50 static foreground/background token pairs pass the configured text/control thresholds. This verifies only those declared pairs, not every rendered combination, target size, focus geometry, screen-reader experience, or WCAG 2.2 AA compliance. Axe-core and manual review remain blocked until a real browser can run.

## Dependencies and review gate

Next.js App Router, TypeScript, Tailwind v4 and Lucide are installed. `components.json` prepares shadcn/ui paths and tokens. Actual shadcn/Radix and React Flow packages could not be installed because the registry was unreachable and they were absent from cache. Current primitives are native components and the graph is SVG/CSS; migrating to the requested libraries remains open.

Actual route screenshots belong in `docs/frontend/screenshots/`, named `en-<route>-<width>.png` and `fr-<route>-1440.png`. Review all five requested widths before using VERIFIED. Do not replace that evidence with generated mockups.

## Monitoring extension

The navigation viewport remains scrollable while its scrollbar is visually hidden; `.nav-content` preserves one continuous navy navigation surface and padding. Logo, workspace selector and footer remain fixed.

Monitoring uses four compact metrics, one event-derived chart, white tables and plain text connection indicators with 6px dots. Connection status colors never alter the five compliance outcomes. Feed-display pause and simulation pause are separate actions. New activity does not trigger decorative animations or number tweening. Registry optional metadata columns remain inside its existing horizontal scroll region.

The static contrast suite now covers 60 pairs, including connection dots, scrollbar thumbs and chart bars. Rendered accessibility, keyboard focus and actual five-width inspection remain unverified because the browser runtime is blocked.
