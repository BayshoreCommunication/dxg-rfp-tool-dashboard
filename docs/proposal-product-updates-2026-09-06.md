# Proposal Product Updates — implementation and QA

Date: 2026-09-06

Scope: the seven tasks in the Asana **Proposal Product Updates** section, including Ace's task comments. No Proposal Intelligence tasks were included.

## Task-by-task result

1. [Guided Question 5](https://app.asana.com/1/1135051559793066/project/1217093934177074/task/1218097504065997)
   - Annual Meeting and Shareholder Event are separate choices in the editor, guided-intake backend, shared UI contract, and extraction prompt.
   - Previously saved combined values remain visible as a previous selection; no existing event is silently reclassified.
2. [Room Specifications — Recording Format](https://app.asana.com/1/1135051559793066/project/1217093934177074/task/1218097504066005)
   - Added Vendor recommendation to room recording format, normalization, generated types and canonical/public schemas.
   - The dormant standalone recording step accepts the same value if restored later; its current disabled workflow flag is unchanged.
3. [In-house AV company examples](https://app.asana.com/1/1135051559793066/project/1217093934177074/task/1218097504066013)
   - Examples now read Encore, Pinnacle Live, Inspire across venue technical, co-vendor and upload-help surfaces.
4. [Brand Guide PDF upload](https://app.asana.com/1/1135051559793066/project/1217093934177074/task/1218097404003845)
   - Root cause: the UI advertised 50 MB, but uploaded through a Next.js Server Action whose default request-body limit was 1 MB.
   - Only a small authorization request now goes through the Server Action. File bytes go directly to the backend with a 120-second, upload-only ticket.
   - The ticket cannot authorize ordinary API calls. Membership, organization, blocked-user, session revocation, authorization version, 50 MiB file limit, malware scan and private storage checks remain in force.
   - The legacy upload endpoint remains available. Nginx's older 50M configuration is aligned to 60M for the multipart envelope around a 50 MiB file.
   - Private-file key parsing now handles a configured storage URL path prefix; integration testing exposed this with local S3 storage.
5. [Vendor-ready Statement of Work](https://app.asana.com/1/1135051559793066/project/1217093934177074/task/1218097404003853)
   - Generated text appears immediately inside Final review.
   - Regenerate draft is explicit; Edit statement of work opens and focuses Event Overview's actual field, enabling Advanced mode if necessary.
   - Help and toast explain the destination. Generated text remains editable before publishing.
6. [Vendor Invites](https://app.asana.com/1/1135051559793066/project/1217093934177074/task/1218097404003861)
   - Publishing an edited proposal now reaches the success screen rather than silently returning to the proposal list.
   - The success screen makes Share with vendors the primary next action and explains that publishing does not send email.
   - It opens the email composer with that proposal selected; recipients and final sending remain the planner's choice.
7. [New Proposal Landing Page](https://app.asana.com/1/1135051559793066/project/1217093934177074/task/1218145864774378)
   - This task had no description, comments, or design attachment.
   - Based on the previously supplied Ace walkthrough, onboarding now explains typing event details, attaching an existing brief/RFP, guided follow-up, and reviewing before publish/send.
   - The existing editor entry is labeled Open RFP questions. Intro content can scroll on small-height screens without displacing the composer.
   - This is a bounded copy/discoverability improvement, not an assumed full redesign. Any different intended design still needs clarification.

## Verification

- Frontend: full Jest suite — 144 suites / 981 tests passed.
- Backend: 76 targeted tests passed, including contracts, conversations, authorization, credentials, session management, private uploads and scoped upload tickets.
- Frontend/backend production builds, contract generation checks, type checks and configured lint checks passed.
- A new local-only integration script is in the backend at `scripts/verifyProposalProductUploads.ts`.
- Real local integration: 13,316,915-byte (12.7 MiB) synthetic PDF → authenticated upload → private storage → authorized download with matching SHA-256.
- Anonymous file reads, use of an upload ticket on a normal API, malformed/expired tickets, stale membership, revoked session, and the standard EICAR antivirus-test signature are rejected.
- Room-level Vendor recommendation survives API save/read. Brand-guide reference survives proposal persistence.
- Connected in-app browser: separate event choices, 12.7 MB Brand Guide upload and autosave, company examples, generated SOW preview and focused Edit navigation, Basic-mode publish, and Share with vendors → correctly selected email composer verified.
- No real invitation was sent. No live proposal/vendor response was changed.

The original 12.7 MB brand-guide file was not attached to Asana; size/transport regression was verified with a synthetic PDF, not claimed as a test of the original document's contents.

## Local environment and handoff

- Changes are in `dxg-rfp-tool-dashboard` and `dxg-rfp-tool-backend`, not the separate demo repository.
- The pre-existing dashboard `design-qa.md` changes were preserved untouched.
- Local frontend: http://localhost:3000 ; backend: http://localhost:8000.
- Tests use isolated MongoDB database `rfpilot_product_updates_test` and local MinIO bucket `rfpilot-product-updates`, with ClamAV required. SMTP is pointed at localhost; live database/storage/email credentials are not used for these tests.
- The isolated QA organization is not backfilled into the optional PostgreSQL AI foundation. Its assistant-guidance panel reports that foundation unavailable; external AI generation was not part of this UI/upload regression run. Guided choice mapping is covered by backend tests.
- Runtime overrides were supplied in a temporary bootstrap, not written over either project's environment files.
- No commits, pushes, merges, deployments, or Asana completion-state changes were performed.
- Deployment order: backend first (new upload-ticket/direct-upload routes), then frontend. Apply/reload the Nginx body-limit change if using the older proxy config. Verify production CORS allows the frontend origin and repeat the large-PDF upload check after deployment.

Local QA publishing fixture: http://localhost:3000/proposals/proposal-edit?proposalId=6a9d020c385efd49f66ce751&step=10
