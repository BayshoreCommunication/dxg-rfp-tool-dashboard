# API Specification

## Conventions

- Base path: `/api/v1/proposals/:proposalId/intelligence`.
- Authentication, active organization membership, tenant resolution, proposal access, and resource assignment are mandatory.
- Mutation requests require `Idempotency-Key`; optimistic changes also require `If-Match` or an expected version.
- Long-running operations return `202` with `{jobId, runId, statusUrl, resultUrl}`.
- Errors use safe problem details with stable codes; no provider or source text appears in error messages.
- List endpoints use cursor pagination and bounded filters.
- Responses include `schemaVersion`, `generatedAt`, and staleness metadata where applicable.

## Requirement resources

| Method | Resource | Purpose |
|---|---|---|
| `POST` | `/requirement-sets` | Generate a draft from an explicit proposal version. |
| `GET` | `/requirement-sets` | List versions and status. |
| `GET` | `/requirement-sets/:setId` | Read requirements, origins, criteria, and validation. |
| `PATCH` | `/requirement-sets/:setId/requirements/:requirementId` | Edit a draft requirement with expected version. |
| `POST` | `/requirement-sets/:setId/approve` | Validate and freeze a requirement set. |
| `POST` | `/requirement-sets/:setId/supersede` | Create a new editable version from an approved set. |

Approval fails unless the proposal version still matches, mandatory items have sources, criteria exist, weights are valid, and unresolved blocking validation is zero.

## Submission resources

Public submission routes retain scoped public grants and become version aware:

| Method | Resource | Purpose |
|---|---|---|
| `POST` | `/api/vendor-responses` | Create an initial or revised immutable version. |
| `GET` | `/api/vendor-responses/check` | Return submission identity, latest version, and whether another version is allowed. |
| `GET` | `/api/vendor-responses/:id/receipt/:versionId` | Scoped receipt metadata, never private file URLs. |

Authenticated planner routes:

| Method | Resource | Purpose |
|---|---|---|
| `GET` | `/submissions` | List vendors, versions, scan/readiness state. |
| `GET` | `/submissions/:submissionId` | Read identity and version history. |
| `GET` | `/submissions/:submissionId/versions/:versionId` | Read immutable manifest and authorized source metadata. |
| `POST` | `/submissions/:submissionId/versions` | Planner-assisted revision/clarification intake. |
| `POST` | `/submissions/:submissionId/withdraw` | Record human/vendor withdrawal. |

## Comparison resources

### Create

`POST /comparisons`

Request contains approved `requirementSetId`, `evaluationMatrixVersionId`, selected `{submissionId, versionId}` entries, commercial policy, price visibility, and optional assignments. The backend resolves every version and checksum itself; client-supplied checksums are assertions only.

Response returns the frozen manifest summary before/with queued work.

### Read

| Method | Resource | View |
|---|---|---|
| `GET` | `/comparisons` | Runs, freshness, selected vendors, progress, permissions. |
| `GET` | `/comparisons/:runId` | Overview and manifest summary. |
| `GET` | `/comparisons/:runId/status` | Persisted stage/job progress and warnings. |
| `GET` | `/comparisons/:runId/requirements` | Paginated requirement-by-vendor matrix. |
| `GET` | `/comparisons/:runId/vendors/:participantId` | Vendor facts, assessments, risks, source coverage. |
| `GET` | `/comparisons/:runId/commercial` | Authorized commercial comparison and normalization. |
| `GET` | `/comparisons/:runId/risks` | Reviewed/unreviewed risks and gaps. |
| `GET` | `/comparisons/:runId/questions` | Suggested and approved clarification questions. |
| `GET` | `/comparisons/:runId/audit` | Authorized manifest/event summary. |

Views are projections of persisted run data. They do not invoke a model.

### Control

| Method | Resource | Rule |
|---|---|---|
| `POST` | `/comparisons/:runId/cancel` | Procurement owner/initiator with permission. |
| `POST` | `/comparisons/:runId/retry` | Retry failed branches with the same manifest and stable idempotency. |
| `POST` | `/comparisons/:runId/clone` | Create a new run with explicitly selected current inputs. |
| `POST` | `/comparisons/:runId/acknowledge-warnings` | Append human acknowledgment; does not alter findings. |

## Evidence and review

| Method | Resource | Purpose |
|---|---|---|
| `GET` | `/comparisons/:runId/evidence/:fragmentId` | Authorized bounded excerpt, source label, locator, checksum, nearby context. |
| `POST` | `/comparisons/:runId/reviews` | Accept/reject/correct/escalate a fact, mapping, assessment, or risk. |
| `GET` | `/comparisons/:runId/reviews` | Append-only review history. |

Corrections store the reviewer value and rationale as a new event; they do not mutate model output.

## Evaluations and decisions

| Method | Resource | Purpose |
|---|---|---|
| `POST` | `/comparisons/:runId/assignments` | Assign user/role/criteria/price visibility. |
| `PATCH` | `/comparisons/:runId/assignments/:id` | Change an open assignment with version check. |
| `POST` | `/comparisons/:runId/evaluations/events` | Save draft, submit, reopen, or supersede criterion score event. |
| `GET` | `/comparisons/:runId/evaluations` | Permission-filtered evaluation state and aggregation. |
| `POST` | `/comparisons/:runId/decisions` | Create shortlist/selection/no-award snapshot. |
| `GET` | `/comparisons/:runId/decisions` | Decision history and supersession chain. |

The decision endpoint validates authority, evaluator state, conflict declarations, manifest freshness/acknowledgment, and rationale. It never accepts an `aiRecommendedWinner` field.

## Clarifications and reports

- `POST /comparisons/:runId/clarification-sets`
- `PATCH /comparisons/:runId/clarification-sets/:id/questions/:questionId`
- `POST /comparisons/:runId/clarification-sets/:id/approve`
- `POST /comparisons/:runId/clarification-sets/:id/record-dispatch`
- `GET /comparisons/:runId/reports/:reportType`
- `POST /comparisons/:runId/report-jobs` for expensive PDF/DOCX generation

No clarification is emailed by the intelligence module in the first release. Dispatch is a separately authorized integration step; Task 9/10 will define whether it reuses the campaign-email module.

## Resource envelope example

```json
{
  "data": {
    "schemaVersion": "proposal-intelligence-comparison.v1",
    "runId": "uuid",
    "status": "succeeded_with_warnings",
    "freshness": {
      "state": "stale",
      "reasons": ["submission_version_available"]
    },
    "manifest": {
      "proposalVersion": 12,
      "requirementSetVersion": 2,
      "evaluationMatrixVersion": 3,
      "participantCount": 3
    },
    "permissions": {
      "viewCommercial": false,
      "submitEvaluation": true,
      "finalizeDecision": false
    }
  }
}
```

## Safe error codes

Minimum vocabulary: `PROPOSAL_NOT_FOUND`, `REQUIREMENT_SET_NOT_APPROVED`, `EVALUATION_MATRIX_NOT_CONFIRMED`, `SUBMISSION_VERSION_NOT_FOUND`, `SOURCE_NOT_READY`, `INPUT_VERSION_CONFLICT`, `COMPARISON_ALREADY_EXISTS`, `COMPARISON_NOT_READY`, `COMPARISON_STALE`, `COMMERCIAL_NOT_COMPARABLE`, `EVIDENCE_NOT_FOUND`, `ASSIGNMENT_REQUIRED`, `COMMERCIAL_ACCESS_DENIED`, `DECISION_AUTHORITY_REQUIRED`, `SCHEMA_VALIDATION_FAILED`, `CITATION_VALIDATION_FAILED`, and `FEATURE_DISABLED`.
