# UI Specification

## Information architecture

Replace the current inbox-only detail experience with proposal-centric routes while retaining `/vendor-responses` as the cross-proposal inbox.

```text
/vendor-responses
/proposals/{proposalId}/intelligence
  /requirements
  /submissions
  /comparisons/{runId}
    /overview
    /requirements
    /technical
    /commercial
    /risks
    /evaluation
    /reports
    /audit
```

The existing `/vendor-responses/{id}` redirect is replaced by a real authenticated submission detail route or a redirect to the owning proposal intelligence submission view.

## Proposal Intelligence landing page

Header:

- proposal title and status;
- evaluation-readiness state;
- selected/current comparison;
- freshness badge;
- primary action: Prepare requirements, Start comparison, Continue review, or Create updated comparison.

Summary cards: responses received, current submission versions, approved requirements, mandatory gaps, unresolved review items, evaluator completion. Cards are links with accessible labels and cannot imply a winner.

## Requirement editor

- grouped by submission, mandatory, technical, commercial, staffing, references, sustainability/DEI, legal/policy, and evaluation criteria;
- each row shows wording, origin, mandatory flag, criterion, importance, and verification method;
- filters for no source, unassigned criterion, duplicates, ambiguous, and blocking validation;
- generated items are labeled AI-assisted; planner edits are tracked;
- Approve displays the exact proposal version/checksum and freezes the set.

## Submission detail

- stable vendor identity and immutable version timeline;
- source cards with scan, parse/OCR, coverage, file metadata, and authorized preview/download;
- clear current/superseded/withdrawn state;
- comparison participation history;
- receipt and clarification/BAFO lineage;
- no delete/replace control that mutates an analyzed version.

## Comparison setup

A review-first wizard:

1. Select submission versions.
2. Confirm requirement set and evaluation matrix.
3. Confirm commercial normalization and price visibility.
4. Assign evaluators (optional initially).
5. Review frozen manifest and start.

The start button is blocked by unapproved requirements, unconfirmed weights, source scanning, duplicate vendor versions, or unauthorized commercial policy.

## Comparison shell

Persistent run selector and freshness banner. Tabs share one status resource and one run ID. The run selector shows version date, vendor versions, status, and historical/stale label.

### Overview

Vendor cards show submitted price (if permitted), comparable-price state, mandatory coverage, evidence coverage, review flags, and human evaluation completion. Sorts must be explicit and must not default to an AI-derived rank.

### Requirement matrix

- rows are requirements; columns are vendors;
- cells show semantic status plus review state;
- evidence opens in a side drawer with source, locator, excerpt, checksum indicator, facts, rationale, and review history;
- virtualize large matrices and preserve accessible table semantics/list alternative;
- export/filter respects current permissions.

### Commercial comparison

Show submitted and normalized values in separate columns. Each adjustment expands to formula, assumption, evidence, policy version, and approval. A not-comparable state replaces misleading blanks or zeros.

### Evaluation workspace

Evaluator sees assigned criteria, rubric, relevant requirements/evidence, draft score, rationale, citations, conflict acknowledgment, and Submit. Submitted scores are read-only; reopen creates a visible event.

### Decision workspace

Decision authority sees evaluation completeness, mandatory exceptions, unresolved conflicts, commercial comparability, staleness, and all human score aggregates. The shortlist/selection form requires explicit vendor selection and rationale. AI text may summarize evidence but cannot preselect a vendor.

## Component boundaries

```text
components/proposalIntelligence/
  IntelligenceShell
  ReadinessChecklist
  RequirementSetEditor
  SubmissionVersionTimeline
  ComparisonRunSelector
  ComparisonProgress
  VendorSummaryCard
  RequirementMatrix
  EvidenceDrawer
  CommercialComparison
  RiskAndGapList
  EvaluationScorecard
  DecisionRecordForm
  ReportCenter
```

Components consume generated/validated view contracts through server actions. They never call backend URLs directly, calculate authoritative scoring, infer permissions, or invoke models.

## State rules

- URL owns proposal, run, tab, filters, and selected matrix cell where practical.
- Server resources own run/evaluation state; local state owns only transient UI editing.
- Async status uses bounded polling with backoff and visibility pause, following the existing async UX contract.
- Completed views are restored from persisted data; reopening a page never re-runs AI.
- Permission changes and stale roles fail closed and refresh session authorization.

## Responsive behavior

- Desktop: fixed first requirement column, horizontally scrollable vendor columns, evidence drawer.
- Tablet: two-vendor comparison window with vendor selector.
- Mobile: requirement cards with vendor accordion; no compressed unreadable grid.
- Exports provide the full matrix for offline review.

## Availability and future release controls

The Task 3 requirement registry is available by default to authorized proposal owners and does not require backend or dashboard environment flags. Tenant membership, proposal ownership, scoped read/write authorization, idempotency, optimistic locking, audit, and PostgreSQL RLS remain authoritative.

Future tasks may introduce release controls for capabilities that perform model inference or change evaluator workflows:

- backend `COMMERCIAL_NORMALIZATION_ENABLED`
- backend `EVALUATOR_WORKFLOW_ENABLED`
