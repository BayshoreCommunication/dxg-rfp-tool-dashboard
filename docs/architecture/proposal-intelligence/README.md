# Proposal Intelligence Architecture Decision Pack

> Status: Tasks 1–3 completed; Task 4 requires confirmation
> Date: 2026-08-12
> Owner: RFPilot product and engineering
> Scope: planner dashboard and backend AI domain

## Outcome

RFPilot will evolve its existing vendor-response analysis into a proposal-centric intelligence workspace. The implementation will preserve the current modular-monolith, private-storage, durable-job, tenant-isolation, citation, and human-control boundaries. It will not introduce a separate microservice or make AI output the source of truth.

The central product object is a versioned comparison snapshot. Analyze, Compare, Commercial, Risks, Gaps, Evaluation, and Reports are different views of the same frozen inputs and persisted evidence, not separate uncoordinated model calls.

## Decision summary

| ID | Decision | Rationale |
|---|---|---|
| PI-001 | Extend the existing backend modular monolith and durable job/outbox system. | It already provides tenancy, idempotency, retries, dead letters, usage tracking, and operational controls. |
| PI-002 | Keep proposals and vendor-submission identity/version metadata authoritative in MongoDB; keep private bytes in object storage; keep requirements, evidence, AI runs, reviews, scores, audit, and comparison snapshots in PostgreSQL. | This follows the current store-ownership boundary and avoids competing authorities. |
| PI-003 | Replace mutable vendor-response updates with immutable submission versions. | A comparison must be reproducible after clarification, BAFO, or revised pricing. |
| PI-004 | Preserve uploaded documents as source truth. Store extraction, mappings, facts, assessments, scores, and decisions as separate derived records. | Reviewers must be able to distinguish vendor statements from system interpretation. |
| PI-005 | Persist a versioned requirement registry derived from the complete published RFP, not only populated canonical proposal fields. | Submission instructions, mandatory items, DEI, references, commercial terms, and narrative requirements otherwise disappear. |
| PI-006 | Use one frozen input manifest per comparison run. | Results remain reproducible and can be marked stale when an input changes. |
| PI-007 | Use AI confidence only as an extraction/review reliability signal. Never use confidence as a procurement criterion weight. | Business importance comes from the confirmed evaluation matrix; confidence describes uncertainty. |
| PI-008 | Separate deterministic calculations from semantic AI work. | Currency, arithmetic, totals, eligibility rules, weighting, and staleness must be testable without a model. |
| PI-009 | Require evidence citations for extracted facts and assessments; unsupported claims are invalid output. | Every material conclusion must be traceable to a vendor document, cover note, or RFP requirement. |
| PI-010 | Treat evaluator input and award decisions as append-only events and snapshots. | AI can assist evaluation but cannot silently replace human judgment. |
| PI-011 | Add procurement-scoped evaluator assignments on top of existing organization roles. | Technical, commercial, observer, and decision-authority access should not require global role proliferation. |
| PI-012 | Keep price visibility configurable and support sealed commercial review. | Technical evaluators may need to work without price influence. |

## Documents in this pack

1. [Current system analysis](./01-current-system-analysis.md)
2. [Product and UX flow](./02-product-ux-flow.md)
3. [Technical architecture](./03-technical-architecture.md)
4. [Data model and ERD](./04-data-model.md)
5. [API specification](./05-api-specification.md)
6. [AI and evaluation architecture](./06-ai-architecture.md)
7. [UI specification](./07-ui-specification.md)
8. [Implementation tasks and confirmation gates](./08-implementation-plan.md)

## Non-negotiable invariants

- AI never publishes an RFP, rejects a vendor, shortlists a vendor, or selects an award winner.
- A document is analyzed only after private upload, malware scanning, ownership checks, and tenant resolution.
- Redis carries references only. PostgreSQL remains authoritative for work state and dependency completion.
- Every run records proposal, requirement-set, evaluation-matrix, submission, extraction, prompt, schema, model, and scoring versions.
- A revised submission creates a new immutable version. It never rewrites evidence used by an earlier comparison.
- Requirement compliance, commercial normalization, evaluator scoring, and the final decision remain distinct records.
- Results derived from changed inputs are visibly stale and cannot be represented as current.
- Unsupported, invalid, or uncited model output is rejected or routed to human review, not softened into a confident conclusion.
- Tenant RLS, proposal ownership, scoped authorization, audit events, and private storage remain mandatory. Task 3 is available by default without environment flags; future inference/evaluator releases still require explicit release controls.

## Delivery status

Task 1 delivered this architecture pack. Task 2 delivered immutable vendor-submission versioning. Task 3 delivered the tenant-isolated requirement registry, approval/versioning API, and planner review workspace. Task 4 evidence extraction and Tasks 5–10 remain unstarted and require separate user approval.

## Research basis

The design was reviewed against the supplied *Vendor Responses & Proposal Intelligence — Research and Architecture* document and the current RFPilot source, migrations, and canonical architecture documents. External standards and product references informed the design but do not make RFPilot a certified procurement system:

- [FAR 15.305 proposal evaluation](https://www.acquisition.gov/far/15.305) for documented, solicitation-linked evaluation principles.
- [NIST AI RMF Core](https://airc.nist.gov/airmf-resources/airmf/5-sec-core/) for govern, map, measure, and manage controls.
- [Amazon Textract document analysis](https://docs.aws.amazon.com/textract/latest/dg/how-it-works-analyzing.html) for OCR/table fallback capabilities.
- [OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs) for schema-constrained model responses.
- [BullMQ flows](https://docs.bullmq.io/guide/flows) as a fan-out/fan-in reference; RFPilot will still persist dependency truth in PostgreSQL.
