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
