# Proposal authoring experience

The proposal builder has two intentionally different authoring paths:

- **Basic mode** asks for event essentials, venue, room schedule, budget and procurement dates, and a primary contact. Technical production, recording, creative, NDA, and legal-contact details remain explicit assumptions that must be approved before publishing.
- **Advanced production** exposes the complete production, content, recording, venue infrastructure, evaluation, upload, and co-vendor workflow.

Both modes use the same proposal data contract. Switching modes never discards values.

## Completion and review

- `ProposalExperienceBar` is the single readiness indicator and owns the clickable remaining-items checklist.
- Timeline contradictions are rejected by `procurementTimelineIssues`; messages are shown beside the affected date and in the section summary.
- `ProposalFinalReview` summarizes scope, venue and dates, rooms, budget, contact, and recipients.
- User-provided, extracted/generated, and assumed values carry visible provenance. The latest 50 provenance events are retained in versioned browser storage for continuity during authoring.
- Basic-mode assumptions require explicit approval before **Publish Proposal** is enabled.

## AI-assisted surfaces

- Uploaded briefs continue through the existing extraction workflow and mark populated sections as AI-generated with review confidence.
- Room templates create an editable schedule plus a vendor-recommended AV and staffing starting point.
- The final review includes an explainable planning-budget range and a vendor-ready statement-of-work draft.
- The email composer creates proposal-specific invitation copy and requires recipient/message approval before sending.
- Vendor responses retain evidence-backed per-response analysis. `VendorComparisonPanel` adds a confidence-weighted readiness comparison; it is decision support, not an automatic award decision.

Saved-draft room recommendations and vendor response comparison depend on their existing feature flags and backend services. The deterministic authoring helpers remain available without a model call so the core workflow does not fail when an AI provider is unavailable.
