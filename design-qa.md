# AI Assistant Phase 4 Design QA

**Evidence:** Supplied source reference plus local desktop, mobile, error-state, full-view, and focused comparison captures. Local review captures are intentionally not committed.

## Comparison setup

- Source pixels: 1918 × 965, including 87px of browser chrome.
- Source content crop: 1918 × 878.
- Desktop implementation: 1664 × 762 CSS pixels at device pixel ratio 1.
- Density normalization: the source content crop was downsampled to 1664 × 762 before comparison. The implementation was not resampled.
- Mobile implementation: 390 × 844 CSS pixels at device pixel ratio 1.
- State: new/empty conversation. The mobile error capture additionally verifies a safe expired-session failure while preserving the draft.
- The supplied reference establishes the empty-state visual direction. The approved plan intentionally replaces the time-dependent greeting with hydration-safe copy, omits the inactive attachment affordance, and adds `New chat` plus four platform-focused prompts.

## Findings

No actionable P0, P1, or P2 findings remain.

- Fonts and typography: the implementation uses the application's existing Proxima Nova stack, strong navy display weight, readable slate body copy, and mobile sizes that do not clip or wrap awkwardly.
- Spacing and layout rhythm: the card, centered orb/content stack, composer, and restrained shadow follow the reference composition. The final 1152px card maximum preserves a readable conversation width and supports the planned history rail.
- Colors and visual tokens: the existing pale-slate background, white surface, navy type, and cyan/teal actions match the source and dashboard design system.
- Image quality and asset fidelity: `orb-soft-v2.png` is a real 384 × 384 raster asset with a clean white edge, soft cyan halo, matte radial shading, and no visible square boundary. It replaces the earlier overly glossy asset.
- Copy and content: scope copy is concise and independently understandable. The guidance disclaimer accurately states that v1 is read-only.
- Icons: existing Lucide icons use consistent stroke weight, alignment, and accessible names.
- Accessibility: heading hierarchy, labelled workspace/composer, visible focus treatments, disabled send state, polite status semantics, alert semantics, and reduced-motion rules are present.
- Responsiveness: the 390px view retains the fixed product sidebar, readable heading, complete placeholder, usable 44px+ actions, single-column prompts, and vertical scrolling without horizontal overflow.

## Comparison history

### Iteration 1

- [P2] The 390px layout clipped the empty-state heading and crowded the composer.
  - Fix: reclaimed 12px per side inside the assistant feature only, reduced mobile empty-state typography/padding, and used a smaller mobile radius.
  - Post-fix evidence: local mobile comparison capture.
- [P2] The desktop card was wider than the reference composition.
  - Fix: changed the workspace maximum from 1320px to 1152px.
  - Post-fix evidence: local normalized desktop comparison capture.

### Iteration 2

- [P2] The first generated orb was a dark glossy jewel rather than the reference's soft translucent sphere.
  - Fix: generated a softer matte cyan asset from the source art direction, normalized its white edge, and moved it to the cache-safe versioned path `public/assets/ai-assistant/orb-soft-v2.png`.
  - Post-fix evidence: local focused comparison capture.
- [P2] The required mobile placeholder wrapped to three lines inside a one-line empty textarea and was clipped.
  - Fix: added an 80px minimum only while the mobile textarea is placeholder-shown and reduced the mobile orb container from 160px to 144px to preserve vertical balance.
  - Post-fix evidence: local final mobile capture.

## Interaction and runtime checks

- Prompt suggestion click populated and focused the composer.
- Message submission exercised the safe unauthenticated/session-expired path.
- The error appeared as an alert with a sign-in recovery action and correlation reference.
- The failed submission preserved the user's draft.
- Desktop, mobile, empty, and error states were captured in the browser.
- Browser console warnings/errors checked after the final render: none.
- The populated history sheet, streaming, retry, keyboard, and smart-scroll behaviors are covered by component tests because the visual QA route deliberately used non-persistent mock initial state.

## Open questions

- None blocking. Conversation quality, real provider latency, and authenticated staging behavior belong to Phase 5.

## Implementation checklist

- [x] Match the reference's centered empty-state composition.
- [x] Preserve approved Phase 4 header, suggestions, and read-only guidance.
- [x] Verify desktop and 390px responsive layouts.
- [x] Verify suggestion, submission-error, and draft-preservation behavior.
- [x] Check browser console output.
- [x] Resolve all P0/P1/P2 findings.

## Follow-up polish

- P3: a future design-system pass could promote assistant-specific cyan/navy values to named tokens once other assistant surfaces adopt them.

final result: passed
