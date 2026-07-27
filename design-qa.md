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

- Popup: 360 × 420 CSS pixels at the matched viewport.
- No title/header bar.
- Floating three-dot and close controls in the top-right corner.
- Three-dot menu exposes New conversation and Conversation history.
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
