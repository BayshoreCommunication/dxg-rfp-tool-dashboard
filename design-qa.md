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
