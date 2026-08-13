# Proposal Intelligence Release and Operations Runbook

> Status: Task 10 implementation
> Date: 2026-08-13
> Owner: RFPilot product, engineering, security, and procurement operations

## Release outcome

Proposal Intelligence is available by default. It does not depend on a feature flag or a new environment variable. Release control is provided through normal deployment cohorts, existing proposal authorization, immutable comparison manifests, operational monitoring, and a tested application rollback procedure.

The release adds report exports, clarification approval records, audit views, operational metrics, retention-policy records, and legal-hold events. It does not automatically email vendors and does not delete procurement records.

## Acceptance gates

All gates are blocking. A failed gate stops advancement to the next cohort.

| Gate | Required threshold |
|---|---:|
| Supplied document checksum match | 100% |
| Approved requirement source coverage | at least 95% |
| Mandatory assessments with citations | 100% |
| Cross-vendor evidence contamination | 0 |
| Sealed-price leakage | 0 |
| Unsupported winner or award language | 0 |
| Clarification approval before dispatch record | 100% |
| Report manifest and provenance present | 100% |
| PostgreSQL migration up, down, and re-up | pass |
| Backend and dashboard type-check, lint, tests, and build | pass |
| PDF render and visual inspection | pass |

The checksum-bound acceptance fixture is `tests/fixtures/proposal-intelligence/gih-real-assets.json` in the backend repository. It records only file identities and expected review signals. The supplied procurement documents and extracted text are not committed.

## Cohort rollout

1. Engineering acceptance: run the complete test suite and migration cycle against an isolated PostgreSQL database. Generate PDF and XLSX fixtures, inspect PDF pages, and verify sealed-price omission.
2. Internal procurement cohort: use a non-production proposal with at least two vendor versions. Confirm the immutable run, citation drawer, evaluator state, reports, audit history, and clarification approval flow.
3. Pilot organization: enable access through existing organization membership and proposal permissions. Monitor the metrics below for one normal procurement review cycle.
4. General availability: deploy the same build to all organizations. No flag or environment-file change is required.

Each cohort records the deployed backend and dashboard commit, migration version, reviewer, date, and acceptance result in the release ticket. A cohort is a deployment and user-access decision, not an application feature flag.

## Operational signals

Monitor these values by comparison run and aggregate them by organization without exposing document content:

- terminal status, progress, duration, failed jobs, and participant warnings;
- unresolved human-review flags and evaluator completion;
- report-export count, media type, checksum, byte size, freshness, and permission snapshot;
- clarification-set count, approval state, and dispatch-record state;
- decision-event count and stale-input acknowledgements;
- active legal holds and retention-policy version.

Never log vendor document text, commercial values, uploaded bytes, access tokens, or email bodies. Report audit records contain checksum and permission provenance only.

## Kill procedure

Use this procedure when there is suspected tenant leakage, sealed-price leakage, corrupted provenance, or an authorization bypass:

1. Stop rollout and remove affected users through existing organization/proposal access controls.
2. Roll back the dashboard deployment to the last verified commit so new report and governance actions are unavailable.
3. Roll back the backend application deployment to the last verified commit. Do not run the Task 10 down migration after production writes; immutable audit, export, clarification, hold, and policy records must remain preserved.
4. Pause proposal-intelligence workers only if the incident also affects comparison processing. Existing proposal workflows remain separate.
5. Preserve logs, run IDs, manifest checksums, export checksums, correlation IDs, and legal-hold state for investigation.
6. Verify tenant RLS, report permission snapshots, affected exports, and access history before restoring service.

This is the operational kill switch. It uses access revocation and application rollback, so no runtime flag or environment value is required.

## Rollback verification

Before general availability, verify both application rollback directions in a non-production environment:

- the previous dashboard can load proposals while Task 10 tables remain present;
- the previous backend ignores the additive Task 10 tables;
- the new backend and dashboard can be redeployed without replaying or mutating prior events;
- migration 051 can roll down only in an empty isolated test database, then roll up again;
- no production rollback step deletes procurement records.

## Report and clarification controls

- HTML, PDF, XLSX, and JSON reports are generated from the selected immutable run.
- Every report includes run, manifest, freshness, policy, and permission provenance.
- Commercial sheets and values are omitted when `viewCommercial` is false.
- Reports do not rank vendors or generate an award recommendation.
- Clarification questions must be reviewed and frozen before a dispatch can be recorded.
- Recording a dispatch documents an external manual or campaign action. RFPilot does not send the message in this workflow.

## Retention and legal hold

Task 10 records a versioned retention period between 365 and 3,650 days. It does not implement a purge job. Legal-hold placement and release are separate append-only events. Any future cleanup implementation requires a separate approved task, must check active holds, and must preserve required procurement and audit records.

Retention-policy and legal-hold changes require the existing `organization:manage` authorization. Report and clarification operations continue to use proposal-scoped read/write permissions.

## Recovery completion criteria

Service can advance or recover only after authorization tests, sealed-price tests, report provenance tests, migration verification, and the real-asset acceptance fixture all pass. The incident or release record must identify the exact backend and dashboard commits used.
