# RFPilot Dashboard Architecture Boundaries

This document is the Slice 1A baseline for evolving the dashboard toward the RFPilot AI Intelligence Layer. It records boundaries that new work must follow while the existing application is migrated incrementally.

## Layers

| Layer | Current location | Responsibility |
|---|---|---|
| Routes and layouts | `app/` | Navigation, server/client composition, route-level loading and errors |
| Feature UI | `components/` | User interaction and presentation; new AI work should be grouped by feature |
| Application access | `lib/`, `app/actions/` | Typed API clients, session-aware actions, orchestration |
| Configuration | `config/` | Validated public/runtime configuration without secrets in browser bundles |
| Shared contracts | `types/` initially | API view models; generated contracts may replace handwritten duplication later |

## Dependency rules

1. UI components do not call backend URLs directly; use a typed application/API boundary.
2. Client components never receive server secrets or unrestricted storage/provider credentials.
3. Authorization is enforced by the backend; frontend guards improve UX but are not security controls.
4. AI results are rendered from validated structured contracts and expose provenance, status, confidence, and required human actions.
5. Proposal edits remain user-controlled and support review/undo where AI suggestions apply patches.
6. Long-running extraction and analysis use asynchronous job status rather than holding a page request open.
7. New public routes use scoped, expiring tokens and must not depend on raw database identifiers alone.
8. Cross-feature shared code must have a stable domain purpose; avoid generic dumping-ground utilities.

## Quality gate

Every pull request must pass locked dependency installation, ESLint, strict TypeScript checking, Jest, and the production Next.js build through `.github/workflows/ci.yml`.

Architecture, API contracts, accessibility expectations, feature flags, error states, and operational behavior must be updated with each material change.

- [Async status and recovery UX](./ASYNC_STATUS_UX.md)

## Canonical proposal contract

`contracts/proposal/v1/` contains the synchronized JSON Schema 2020-12 resource, public projection, extraction-candidate patch, runtime validators, and legacy adapter. `contracts/generated/` is deterministic generated output and its manifest. New proposal UI/API code must consume these generated contracts or an explicit compatibility projection rather than adding another handwritten proposal shape.

## Room schedule compatibility

`roomByRoom[]` represents physical rooms with one shared AV specification per
room. A room may contain `functions[]`, where each entry retains its own
function name, date, start/end times, setup, and attendance. Spreadsheet import
groups rows by normalized physical room name. For compatibility with existing
proposals and room-recommendation rules, the first function is mirrored into
the legacy scalar schedule fields and peak function attendance is mirrored into
`estimatedAttendeesInRoom`. The canonical proposal projection exposes all
functions as `room.scheduleEntries`.

Assistant conversation messages can expose two allowlisted room-schedule
actions: download the sample workbook and open the existing proposal directly
on Room Specifications. The dashboard renders only recognized action ids; the
assistant cannot supply arbitrary URLs or execute an upload.

Spreadsheet import reads the first sheet carrying room and function columns
rather than the leftmost sheet, because the shipped workbook also holds pivot,
virtual-schedule and room tabs. That workbook ships with example rows, two of
which share a Room Name so the multi-function grouping is demonstrated rather
than only described.

## Schedule times are venue wall-clock

Schedule cells mean the time at the venue. Building a `Date` from those parts
anchors them to the browser's zone, so a schedule uploaded from outside the
venue's zone stored the wrong instant and the generated RFP quoted vendors the
wrong times. `ProposalsProcess.tsx/eventTimeZone.ts` converts wall clock to and
from the event's zone with DST resolved at the instant in question, the schedule
pickers render back in that zone, and an unknown zone keeps the previous
machine-local behaviour. Backend draft evidence performs the matching conversion
before the model sees a time.

## Draft persistence

Saved drafts autosave a debounced snapshot as the planner works, with a status
line and an unsaved-changes warning on unload; the previous model held every
step in memory behind a single save on page 9. Autosave is confined to
`status: "unsubmitted"` proposals so a background write can never alter what
vendors already see — a published proposal still requires an explicit
`Update RFP`. Explicit saves record the snapshot so the two paths cannot fight.

## Evaluation weightings

The weighting matrix ships pre-populated and vendors are scored against it, so
the defaults are a suggestion until accepted. `budget.evaluationMatrixConfirmed`
gates both the published RFP table and the backend's draft evidence; adjusting
any weight counts as accepting. Unconfirmed, the RFP states that scoring
criteria are not finalised rather than printing numbers nobody chose.
