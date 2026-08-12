# Implementation Tasks and Confirmation Gates

## Delivery policy

Task 1 is this architecture pack and contains no production code. Tasks 2 through 10 are independently confirmable delivery slices. Do not begin a task until the user explicitly approves it. Each task requires focused tests, affected-repository CI, security/tenant verification, documentation updates, atomic commits, pushed branch SHAs, and task-tracker evidence.

## Task 1 — Architecture Decision Pack

Status: in progress on `agent/proposal-intelligence-architecture` when authored.

Deliverables: current analysis, product flow, target architecture, ERD, API, AI/scoring, authorization, versioning/staleness, UI, migration, risks, and delivery tasks. No runtime change.

Acceptance:

- Decisions preserve current canonical store/security boundaries.
- Reuse-versus-replace choices are explicit.
- Submission, requirement, evidence, assessment, evaluation, and decision versions are separable.
- API/resources and UI flows are implementable.
- Open product decisions are named rather than guessed.

## Task 2 — Submission Versioning

Status: completed on `agent/proposal-intelligence-submission-versioning` on 2026-08-12.

Repositories: backend, then dashboard vendor form/inbox compatibility.

Scope:

- Mongo `VendorSubmission` and immutable `VendorSubmissionVersion` models.
- Idempotent legacy backfill from `VendorResponse`.
- Version-aware public submit/check/receipt behavior.
- Governed source registration and stable checksums.
- Compatibility reads so existing responses remain visible.

Acceptance:

- Initial and revised submissions create v1/v2 without overwriting v1.
- Duplicate idempotency key returns the original version.
- Tenant/public-grant, malware, MIME/size, and private-storage controls remain intact.
- Existing responses migrate idempotently with journal/checksum evidence.
- No production analysis behavior changes yet.

Confirmation required before starting.

## Task 3 — Requirement Registry

Repositories: backend and dashboard.

Scope: requirement/evaluation schema and migrations, draft generation from canonical proposal plus rendered RFP, review editor, approval/versioning, validation, criterion mapping.

Acceptance: complete narrative and structured requirements; source locator; mandatory/criterion review; confirmed weights; approved sets immutable; proposal changes make sets supersedable/stale.

Confirmation required before starting.

## Task 4 — Evidence Extraction

Repository: backend, with minimal dashboard status/preview.

Scope: source-version extraction runs, reusable fragments/tables, native parser adapter, OCR/layout provider port and configured fallback, coverage/warnings, checksum reuse.

Acceptance: native and scanned PDFs, DOCX/XLSX/CSV/TXT; page/sheet/table locators; prompt-injection-safe data boundary; idempotent reuse; partial/unreadable state; no raw content in logs.

Confirmation required before starting.

## Task 5 — Requirement Mapping and Facts

Repository: backend, then evidence-review UI.

Scope: strict mapping/fact schemas, provider calls, validation, citations, contradictions, human-review events, gold fixtures.

Acceptance: cited typed facts; unsupported claims rejected; vendors isolated during extraction; corrections append-only; schema/citation/tenant failures fail closed; provider attempts ledgered.

Confirmation required before starting.

## Task 6 — Evaluation Engine

Repositories: backend and dashboard.

Scope: cited assessments, risks/gaps/questions, commercial extraction, deterministic normalization, confirmed-rubric calculations, evaluator assignments/score events, sealed price authorization.

Acceptance: confidence never weights criteria; submitted and normalized price separate; non-comparable refusals; append-only evaluator workflow; AI cannot decide eligibility/shortlist/award.

Confirmation required before starting.

## Task 7 — Comparison Orchestration

Repository: backend, with dashboard progress surface.

Scope: comparison manifest/run/participants, job dependencies, fan-out/fan-in handlers, retries/cancellation, aggregation, staleness detector, resource projections.

Acceptance: all vendors share frozen versions; Redis loss recoverable; child retries idempotent; one run feeds all views; results restore without re-run; precise stale reasons.

Confirmation required before starting.

## Task 8 — Vendor Response UX

Repository: dashboard.

Scope: real response detail, immutable version timeline, source readiness, receipt/clarification lineage, proposal intelligence entry points, responsive/accessibility coverage.

Acceptance: history is understandable; inaccessible files never look analyzed; route deep links work; inbox remains cross-proposal; mobile/keyboard/screen-reader states tested.

Confirmation required before starting.

## Task 9 — Proposal Intelligence UX

Repository: dashboard, plus backend projection adjustments discovered through integration.

Scope: intelligence shell, requirement matrix, evidence drawer, technical/commercial/risk/evaluation views, decision record, stale/history flows.

Acceptance: all tabs use one run; authoritative calculations stay backend-owned; permission-filtered pricing; no AI winner UI; responsive large-matrix behavior; persisted async recovery.

Confirmation required before starting.

## Task 10 — Reports, Evaluation Rollout, and Operations

Repositories: backend, dashboard, and admin if operational controls are approved.

Scope: comparison/evaluator/decision/clarification/audit reports, retention/legal hold, operational metrics, gold evaluation, real-asset acceptance, cohort rollout, rollback/runbook.

Acceptance: report manifest/provenance/staleness; permission-safe exports; real supplied RFP/vendor responses reviewed against expected results; release thresholds met; canary/kill switch/rollback and audit verified.

Confirmation required before starting.

## Cross-task migration sequence

1. Add new records and dual-read compatibility.
2. Backfill legacy responses as version 1 with migration journal.
3. Enable new submission writes for an internal cohort.
4. Build requirements/evidence/facts without changing current comparison UI.
5. Enable shadow comparison runs and compare against existing vendor analysis.
6. Enable proposal-intelligence reads for cohort users.
7. Enable evaluator writes and decision snapshots after authorization review.
8. Retire mutable response updates and confidence-weighted scoring only after usage/data checks.
9. Keep historical legacy exports labeled and readable for the chosen retention period.

Rollback before step 8 switches feature flags and reads to legacy behavior; new immutable records remain dormant and auditable. After step 8, rollback requires the compatibility adapter but must never collapse new versions into one mutable record.

## Open decisions requiring product/legal approval

These are not blockers for Task 1 but must be decided before the named implementation boundary:

| Decision | Needed by | Recommended default |
|---|---|---|
| Procurement record retention and legal hold | Task 2 schema finalization | Configurable organization policy; no 30-day hard delete. |
| Vendor identity/deduplication policy | Task 2 | Stable submission identity with normalized vendor name/contact and manual merge, not email-only. |
| OCR provider and data-processing region | Task 4 | Provider adapter selected by deployment/security review. |
| Mandatory-item consequence | Task 6 | Flag and require human disposition; do not auto-disqualify. |
| Price score formula | Task 6 | Human-scored until a deterministic policy is explicitly approved. |
| Multi-evaluator aggregation | Task 6 | Mean plus visible spread, with decision authority able to record consensus rationale. |
| Sealed-price default | Task 6 | Off by default for existing customers; configurable per comparison. |
| Clarification email integration | Task 10 | Review/approve question pack first; sending remains separately authorized. |
| Report formats | Task 10 | HTML/PDF executive report plus XLSX comparison schedule, subject to export library review. |

## Principal risks and mitigations

| Risk | Mitigation |
|---|---|
| Incomplete/poor scans | Coverage metrics, OCR fallback, explicit not-assessable state, source replacement. |
| False compliance conclusions | Mandatory citations, validation, conservative verdicts, human review. |
| Commercial apples-to-oranges comparison | Typed periods/categories, deterministic assumptions/refusals, separate submitted total. |
| Cross-vendor contamination | Per-vendor extraction calls and persisted validated facts before synthesis. |
| Bias or overreliance | No AI winner, sealed price option, transparent rubric, evaluator rationale and audit. |
| Cost/latency growth | Checksummed extraction reuse, bounded section fan-out, validated aggregation, rate/cost monitoring. |
| Job graph inconsistency | PostgreSQL dependency authority, transactional outbox, idempotency, leases, dead letters. |
| Authorization leakage | Organization membership plus scoped assignment, backend field projection, RLS, tests. |
| Historical results becoming misleading | Frozen manifests, explicit staleness, no silent refresh, version-labeled exports. |
| Migration loss | Additive schema, dry-run journal, checksums, compatibility reads, cohort rollout. |
