# AI Assistant Popup Design QA

**Result:** Passed

**Reference:** User-supplied popup/control/composer screenshots and `Screen Recording 2026-07-27 at 12.16.16 PM.mov`

**Implementation:** Compact, non-modal sidebar helper

## Comparison setup

- Final responsive review used a 571 × 655 viewport, matching the latest
  user-supplied popup state.
- The reference and implementation composer were reviewed together at
  `/tmp/ai-assistant-popup-final-qa/composer-comparison.png`.
- The reference and implementation floating controls were reviewed together at
  `/tmp/ai-assistant-popup-final-qa/controls-comparison.png`.
- Final empty and completed-conversation captures are at
  `/tmp/ai-assistant-popup-final-qa/empty-popup.png` and
  `/tmp/ai-assistant-popup-final-qa/conversation-popup.png`.
- Opening and closing were inspected at multiple points in the transition.
  Local QA captures remain outside the repository.

## Final visual contract

- Popup: 384 × 460 CSS pixels at the current desktop viewport, following the
  later request to give the conversation slightly more room.
- Popup size is user-adjustable from subtle upper-right and lower-right
  hover/focus handles. It remains viewport-clamped and cannot exceed 768 × 920
  CSS pixels (twice the default).
- No title/header bar.
- Floating three-dot and close controls in the top-right corner.
- Three-dot menu exposes New conversation and Conversation history.
- Three-dot menu independently resets a moved position or resized popup; both
  actions are disabled until their respective geometry has changed.
- Empty state contains only the orb, a short help statement, and the composer.
- Composer is a dedicated bottom dock and remains aligned to the popup edge in
  empty, streaming, completed, and error states.
- Conversation content scrolls independently between the floating controls and
  the bottom composer.

## Resolved findings

- [P1] The earlier popup was too tall and information-dense.
  - Reduced the surface to 360 × 420.
  - Removed the duplicated header/title and compact quick-suggestion grid.
  - Kept errors in a compact recovery strip above the composer.
- [P1] The composer moved with empty-state content instead of behaving like a
  helper input.
  - Separated it from the empty state and docked it at the bottom.
  - Verified the dock bottom stays within one CSS pixel of the dialog bottom.
- [P1] Closing produced a scaled white rectangle over the launcher/dashboard.
  - Replaced the deep launcher-collapse scale with a short bottom-origin
    fade/slide and subtle scale.
  - Removed immediate pointer-triggered focus restoration that could expose a
    white focus-offset flash.
  - Initial closed render is hidden without playing the exit animation.
- [P2] The top controls competed with conversation content.
  - Added a subtle white-to-transparent control scrim with no visible header
    boundary.
  - Kept controls above messages with independent menu and Escape handling.
- [P2] Generated Next/Turbopack caches could be scanned as Tailwind sources
  during isolated QA builds.
  - Excluded `.next` and `.next-*` output from Tailwind source discovery.
  - Replaced the arbitrary safe-area utility with a stable custom class.

## Interaction and accessibility checks

- Launcher remains above the sidebar footer divider and Notifications.
- Open, menu, new conversation, history, close, composer, send, stop, retry,
  and dismiss controls retain accessible names.
- Escape closes the options menu before it closes the popup.
- Closed content is `aria-hidden`, inert, and non-interactive.
- Reduced-motion users receive immediate open/close states.
- A streamed response completed through the same-origin product SSE flow and
  persisted into history.
- The dialog, message list, and composer fit without horizontal page overflow.
- Dashboard verification passed: contracts, type-check, 45 Jest suites with
  328 tests, and the production Next.js build. The existing 23-warning lint
  baseline remains unchanged.

## Final assessment

No actionable P0, P1, or P2 visual or interaction findings remain. The
Assistant now reads as a small contextual helper, matches the supplied
floating-control and composer direction, and opens/closes without the reported
white artifact.

final result: passed

## 2026-07-29 — Popup text sharpness

### Evidence and finding

- User-supplied issue capture: popup text sharpness screenshot.
- Pre-fix browser capture: `.design-qa/assistant-blur-before.png`.
- Final settled browser capture:
  `.design-qa/assistant-blur-fixed-final.png`.
- [P2] The popup retained a transformed compositor layer after its opening
  animation. On Chrome/macOS, the persistent `scale(1)` plus
  `will-change: transform` could leave text and the orb soft-rasterized.

### Resolution and verification

- The opening animation now settles to a true `transform: none`.
- The popup no longer keeps a permanent transform/opacity `will-change` hint.
- Forward animation fill was removed from the open state, so the completed
  animation releases its compositor transform while preserving the existing
  open/close motion.
- Authenticated live open → close → open verification passed on both Proposals
  and the proposal editor.
- Focused popup tests passed 12/12; TypeScript, zero-error lint, and diff
  validation passed.
- Browser console errors during the final two-minute visual check: 0.

final result: passed

## 2026-07-29 — Progressive assistant response reveal

### Goal and evidence

- Goal: keep the existing product SSE and persistence flow while making each
  response visibly progress from a polished thinking state into live text,
  instead of painting a buffered answer all at once.
- Thinking-state capture:
  `.design-qa/assistant-streaming-thinking.png`.
- Partial-response capture:
  `.design-qa/assistant-streaming-partial.png`.
- Completed-response capture:
  `.design-qa/assistant-streaming-complete.png`.
- State: authenticated Proposals page, floating Assistant open, real backend
  requests, long checklist and workflow prompts.

### Interaction contract

- The user message appears immediately and the composer clears while retaining
  focus.
- Before the first response delta, one accessible `Thinking` indicator uses a
  compact Assistant avatar and three animated cyan dots.
- Buffered network chunks are divided at readable word or punctuation
  boundaries and revealed at a measured cadence; the same Assistant message
  grows in place and carries a subtle live cursor.
- Completion replaces the cursor with the existing sources, handoff, feedback,
  copy, and listen controls. No duplicate user or Assistant row is introduced.
- Reduced-motion users and background tabs bypass artificial pacing.
- Stop/retry, persistence, SSE event parsing, and backend API contracts remain
  unchanged.

### Stability findings and verification

- [P1] Several SSE events could arrive in one network read and React batched
  their state updates into a single final paint.
  - Added a bounded progressive-reveal adapter around existing
    `response.delta` events; no chat architecture was replaced.
- [P1] Repeated `isNearBottom=true` dispatches during long auto-scrolled
  responses triggered React's maximum passive-update-depth guard.
  - The reducer now returns the existing state for an unchanged near-bottom
    value. A post-fix long live stream produced no new browser error.
- Live verification observed `Thinking`, partial text with the live cursor, and
  the completed response in order.
- Final DOM verification found one user prompt, one completed Assistant
  response, a focused empty composer, and no unavailable/interrupted state.
- Dashboard regression passed 64/64 suites and 453/453 tests. The final pacing
  adjustment passed 15/15 focused tests, TypeScript, and diff validation.
- Lint completed with 0 errors and 22 unrelated existing warnings.

final result: passed

## 2026-07-29 — Direct new-conversation shortcut

### Comparison target and evidence

- Source visual truth: user-provided Assistant controls screenshot.
- Browser-rendered implementation:
  `.design-qa/assistant-direct-new-conversation-menu-final.png`
- Focused implementation crop:
  `.design-qa/assistant-direct-new-conversation-menu-controls.png`
- Combined focused comparison:
  `.design-qa/assistant-direct-new-conversation-menu-comparison.png`
- Browser capture: 460 × 2276 pixels at 1×.
- Source pixels: 416 × 136. Focused implementation pixels: 416 × 180.
- State: authenticated Proposals page, Assistant open, simplified options menu
  expanded, empty-state suggestions visible.

### Full-view and focused comparison evidence

- The full view confirms that the additional control fits inside the existing
  popup header without colliding with the move handle, close action, content,
  or composer.
- The focused comparison confirms the final requested order: black `+`,
  options, then close. The new control uses the same 40-pixel circular geometry as its
  neighbors and creates a clear primary action through contrast.
- The duplicate new-conversation row is removed from the options menu. The menu
  now contains only conversation history and popup reset actions.

### Fidelity surfaces

- Fonts and typography: no product typography changed; the direct action is
  icon-only with an accessible name.
- Spacing and layout rhythm: the existing 6-pixel control gap is preserved.
- Colors and visual tokens: the button uses the Assistant's established dark
  navy surface, white icon, cyan focus ring, and existing elevation language.
- Image quality and asset fidelity: the installed Lucide `Plus` icon is used;
  no raster asset or handcrafted icon was added.
- Copy and content: the redundant `Start new conversation` menu row is removed;
  the direct action retains that accessible name.

### Interaction, accessibility, and console checks

- Direct `Start new conversation` action was uniquely discoverable by its
  accessible button name.
- Activating it cleared the selected conversation immediately, rendered the
  empty state, and restored focus to the composer without opening the menu.
- Opening the options menu confirmed that no duplicate new-conversation
  menuitem remains and keyboard focus starts on Conversation history.
- Focused Assistant suites passed 17/17; TypeScript passed; lint completed with
  0 errors and 22 unrelated existing warnings.
- Browser console errors during the final visual check: 0.

### Findings and comparison history

- No actionable P0, P1, or P2 mismatch was found in the first post-change
  comparison.
- No residual P3 item is required for this scoped control shortcut.

final result: passed

## 2026-07-29 — Sidebar logout affordance

### Comparison target and evidence

- Source visual truth: `/tmp/rfpilot-sidebar-logout-reference.png`
  (user-supplied sidebar screenshot).
- Browser-rendered implementation:
  `/tmp/rfpilot-sidebar-logout-final-90x875.png`.
- Combined comparison:
  `/tmp/rfpilot-sidebar-logout-reference-vs-implementation.png`.
- Browser viewport: 1250 × 875 CSS pixels at device scale 1.
- Source pixels: 253 × 875; the sidebar was normalized to a 90 × 875 crop.
- Implementation pixels: 90 × 875 at native 1× density.
- State: authenticated Proposals page with the Assistant closed, Notifications
  visible, and the new Sign out control idle.

### Full-view and focused comparison evidence

- The full sidebar remains 90 pixels wide with the existing logo, navigation,
  Assistant launcher, divider, and Notifications control unchanged.
- The focused 90 × 875 comparison confirms that the ambiguous avatar/status
  control is replaced by a visible logout icon and `Sign out` label.
- The source shows Dashboard active while the implementation shows Proposals
  active because the QA route is `/proposals`; this is an intentional
  navigation-state difference and does not affect the footer comparison.

### Findings and comparison history

- [P1] The original avatar and online dot did not communicate logout behavior.
  - Replaced the hover-only popover with an always-visible, directly actionable
    Sign out control based on the existing admin-dashboard pattern.
  - Added an explicit accessible name, hover/focus feedback, disabled state,
    spinner, and `Signing out` progress copy.
  - Post-fix browser evidence shows the action without requiring hover or
    discovery; no actionable P0, P1, or P2 issue remains.

### Fidelity surfaces

- Fonts and typography: the 9.5px bold label matches the existing sidebar
  navigation scale and remains legible without wrapping.
- Spacing and layout rhythm: the control uses the same centered icon/label
  rhythm and rounded geometry as the admin sidebar while preserving footer
  spacing.
- Colors and visual tokens: idle slate styling fits the sidebar; destructive
  rose feedback is reserved for hover/focus.
- Image quality and asset fidelity: no raster assets changed; the existing
  RFPilot logo remains untouched and the logout mark uses the installed icon
  library.
- Copy and content: `Sign out` is explicit and the progress state uses
  `Signing out`.

### Interaction, accessibility, and console checks

- Exactly one `Sign out of your account` button is exposed in the rendered DOM.
- The focused component test verifies the action call, disabled state, and
  progress copy.
- Browser console errors during the visual check: 0.
- The live logout action was not invoked during visual QA so the authenticated
  test session remained intact; its handler behavior is covered by the
  component test.

final result: passed

## 2026-07-27 — Message density refinement

### Comparison target and evidence

- Source visual truth: user-supplied message-density screenshot.
- Browser-rendered implementation:
  `/tmp/ai-assistant-density-qa/implementation-full.png`
- Focused implementation crop:
  `/tmp/ai-assistant-density-qa/implementation-popup-crop.png`
- Combined focused comparison:
  `/tmp/ai-assistant-density-qa/reference-vs-implementation.png`
- Browser viewport: 1107 × 734 CSS pixels at device scale 1.
- Source pixels: 428 × 329 at 1×.
- Full implementation pixels: 1107 × 734 at 1×.
- Focused implementation pixels: 384 × 460 at 1×.
- State: authenticated proposal page, Assistant open, final `thank you` /
  `You’re welcome!` exchange visible, preceding Settings citation visible,
  composer docked at the bottom.
- Density normalization: both focused regions were reviewed at native 1×
  density. The source is a partial popup crop, so it was not scaled or used to
  judge the popup frame height.

### Full-view comparison evidence

- The full browser capture confirms that the 384 × 460 helper remains within
  the viewport, does not cover the sidebar launcher, and preserves the
  independent composer dock after the density change.
- The source only shows the conversation region, so full-popup composition was
  checked against the established popup contract above rather than inferred
  from the cropped source.

### Focused comparison evidence

- The combined comparison places the supplied message/source region and the
  rendered region in one image.
- Conversation text is now 14px with a 20px line height and 12px horizontal /
  10px vertical bubble padding.
- The Sources label is 9px; source chips are 10px with 8px horizontal / 2px
  vertical padding.
- The smaller type and spacing preserve the existing hierarchy, border
  treatment, color tokens, avatar, and readable one-line replies.

### Fidelity surfaces

- Fonts and typography: existing Geist typography and weights are preserved;
  the requested bubble density is reduced without wrapping the short reply.
- Spacing and layout rhythm: bubbles and source metadata are visibly tighter;
  message alignment and the composer gap remain consistent.
- Colors and visual tokens: unchanged from the existing Assistant system.
- Image quality and asset fidelity: no image assets changed; the existing
  Assistant avatar/icon remains sharp.
- Copy and content: unchanged.

### Interaction and console checks

- Popup close and reopen passed.
- Options menu open/close passed.
- Composer focus passed.
- Assistant-related browser warnings/errors: 0.
- Existing unrelated development warning remains: Notification WebSocket
  connection error.

### Findings and comparison history

- No actionable P0, P1, or P2 mismatch was found in the first post-change
  comparison, so no additional visual fix iteration was required.
- No residual P3 item is required for this scoped density refinement.

final result: passed

## 2026-07-29 — Resize affordance refinement

### Comparison target and evidence

- Source visual truth: user-provided resize affordance screenshot.
- Browser-rendered implementation:
  `.design-qa/assistant-resize-final-default.png`
- Focused implementation crop:
  `.design-qa/assistant-resize-final-crop.png`
- Combined focused comparison:
  `.design-qa/assistant-resize-comparison.png`
- Browser viewport: 475 × 810 CSS pixels.
- Source pixels: 109 × 109. Implementation capture: 460 × 784 pixels.
- Density normalization: the final implementation was cropped to 109 × 109
  so the resize corner could be compared with the source at equal pixel
  dimensions.
- State: authenticated Proposals page, Assistant open at its default
  384 × 460 CSS size, composer focused, resize handle idle.

### Full-view and focused comparison evidence

- The full view confirms the handle stays inside the rounded popup corner,
  remains clear of the send control, and does not add another floating panel.
- The focused comparison confirms that the previous maximize-style square is
  replaced by a standard diagonal scaling mark integrated into the corner.
- The resize target is 32 × 32 CSS pixels while the visible control is only
  20 × 20, keeping the affordance compact without making pointer interaction
  fragile.

### Fidelity surfaces

- Fonts and typography: no product typography changed; the resize affordance
  contains no visible text.
- Spacing and layout rhythm: the control is aligned four pixels from the lower
  and right edges and does not disturb composer padding.
- Colors and visual tokens: idle slate, white surface, and the existing cyan
  hover/focus token are preserved.
- Image quality and asset fidelity: the resize mark uses the installed Lucide
  `Scaling` icon at 12 pixels; no raster asset or handcrafted icon was added.
- Copy and content: the black visible/native tooltip was removed. The control
  retains the accessible name `Resize AI Assistant from lower right` and the
  existing screen-reader keyboard instructions.

### Interaction, accessibility, and console checks

- Keyboard resize changed width from 384 to 400 CSS pixels.
- `Home` restored the default 384 × 460 size.
- Pointer resize, size persistence, viewport clamping, and the two-times
  maximum remain covered by the component suite.
- Focused component suite passed 12/12; TypeScript passed.
- Browser console errors during the final visual check: 0.

### Findings and comparison history

- [P2] The first refinement exposed a black `Resize` hover tooltip that was
  visually heavier than the requested compact control.
- Fix: removed both the custom black tooltip and native `title` tooltip while
  retaining the always-visible diagonal icon, resize cursor, accessible name,
  keyboard instructions, and focus ring.
- Post-fix evidence shows no black overlay and no remaining actionable P0, P1,
  or P2 mismatch.

final result: passed

## 2026-07-29 — Exact proposal portfolio counts

### Architecture and behavior

- The existing chat state, optimistic send, SSE reader, response reveal,
  persistence, retry, and selected-proposal matching remain unchanged.
- Proposal count questions now receive a bounded, authenticated
  owner-and-organization portfolio snapshot from the existing proposal read
  model.
- The answer distinguishes the dashboard's total-created count from the main
  Proposals list and its draft, live, expired, archived, favorite, and saved
  copy counts.
- Exact numeric answers use the deterministic provider path, preserving the
  normal SSE lifecycle and citations while preventing model estimation or
  fabrication.

### Authenticated browser checks

- `how many proposal i have created?` returned 83 total, 68 in the current
  list, 48 draft, 4 live, 16 expired, 14 archived, and 1 saved copy.
- `How many draft proposals do I have?` returned 48 draft proposals.
- Both answers linked to Proposals and cited the account-scoped count source.
- The initial user message appeared immediately, the composer cleared and
  retained focus, Thinking/Stop appeared, and each response completed without
  duplication.
- A pre-existing concurrent-stream lease surfaced the intended retry countdown;
  Retry succeeded after expiry, and the following sequential request completed
  without another limit.

### Verification

- Backend focused assistant suite: 34/34 passed.
- Backend full suite: 618/618 passed.
- Backend contracts, migration checks, lint, TypeScript, and production build
  passed.
- Dashboard full suite: 454/454 passed.
- Dashboard contracts, TypeScript, production build, and zero-error lint
  passed; 22 unrelated existing warnings remain.

final result: passed
