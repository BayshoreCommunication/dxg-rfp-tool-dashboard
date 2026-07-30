# AI Assistant Design QA

## Result

final result: passed

## Visual truth

- Empty state reference: user-approved proposal helper layout.
- Active chat references: user-approved threaded conversation layouts.
- Final resize grip reference: user-approved three-line diagonal grip.
- Implementation viewport: 1280 × 720
- Default popup size: 420 × 540 CSS pixels

The references and implementation differ in source image size and crop. Comparisons were normalized around the complete popup, its hierarchy, and the active conversation state instead of raw screenshot dimensions.

## States reviewed

### Empty

- The selected control layout is present: move, new conversation, options, and close.
- The assistant orb, online state, proposal-focused greeting, three starter actions, context note, and bottom composer match the selected hierarchy.
- The default popup is slightly larger than the previous version without dominating the host page.

### Sending

- The user message appears immediately.
- The optimistic user bubble is shown at full opacity without a “Sending…” label.
- The composer clears and remains focused.
- The threaded assistant identity and thinking state are visible while the response is in progress.

### Active conversation

- User and RFPilot identities, timestamps, the conversation rail, message cards, sources, feedback, copy, and listen actions use the selected chat treatment.
- Streaming text updates inside the existing assistant message instead of creating duplicate messages.
- The conversation follows the newest response inside the compact viewport.
- The conversation scrollbar starts below the fixed RFPilot header and never shows through its scrim or shadow.
- The lower-right resize affordance uses the selected three-line diagonal grip while preserving a larger invisible hit area.

## Interaction checks

- Starter prompts: passed
- Starter prompts send immediately on click or keyboard activation: passed
- New conversation: passed
- Enter to send and Shift+Enter for a new line: passed
- Optimistic user message: passed
- Loading/thinking state: passed
- Streaming response: passed
- History persistence after close/reopen and reload: passed
- Drag within viewport: passed
- Resize and reset to 420 × 540: passed
- Composer focus after sending: passed
- Auto-scroll: passed
- Automated serious/critical accessibility scan: passed
- Assistant console/runtime errors: none observed

## Iteration history

1. The first active-chat pass placed the RFPilot identity inside the scroll area, allowing it to disappear. It was moved to a fixed strip beneath the floating controls.
2. The first empty-state pass reused two dynamic suggestions. It was aligned with the selected reference by providing three proposal-focused starter actions.
3. The context note initially used a low-contrast color. It was changed to an accessible slate tone after automated accessibility testing.
4. The compact scroll container originally extended behind the fixed header. Its scroll boundary now begins below the controls and identity strip.
5. The initial resize affordance used a bordered square, followed by a two-line grip. It was refined to the selected unboxed three-line diagonal grip.
6. The final pass replaced the approximate icon-library grip with a transparent asset derived from the approved reference. At rendered size, both grips occupy a 12 × 13 pixel visible footprint with matching line order, angle, and corner spacing.
7. The source-derived asset contrast was normalized at 2× display density so the shortest third stroke remains visible instead of disappearing during browser anti-aliasing.
8. The final asset uses a cache-safe URL and sits six pixels inside the rounded clip boundary, preventing the shortest third stroke from being clipped by the popup radius.
9. A custom persistent scrollbar exploration was removed after review. The popup retains the original single native content scrollbar and its existing auto-scroll behavior.
10. The `RFPilot` identity moved into the top control row without a separate background, divider, or header section. Its status dot uses a subtle scale-and-opacity pulse.
11. The identity now starts 16 pixels after the drag control, giving the two controls a clearer visual separation without disconnecting them.
12. The redundant `Active` label was removed; the animated teal status dot remains as the compact availability signal.
13. The default empty state was vertically compacted—64-pixel orb, tighter section gaps, 38-pixel starter rows, and a shorter context-note line height—so its complete content fits above the fixed composer at the 420 × 540 default size without producing a content scrollbar.
14. Conversation content now starts with scrollable top padding and travels underneath the floating controls while a borderless 64-pixel translucent blur scrim softens the passing content, producing the requested glassy depth without introducing a header section.
15. The compact conversation keeps one native scroll area but restores the earlier understated scrollbar treatment: a five-pixel rounded thumb on a transparent track that begins beneath the 60-pixel control zone and finishes eight pixels above the composer.
16. The composer dock keeps its fine top divider but uses a much tighter, low-opacity four-pixel lift shadow instead of the previous broad grey haze.
17. The conversation's initial top breathing room is 72 pixels—eight pixels beyond the glass scrim—so the first `You` identity and timestamp are fully visible at rest while still travelling underneath the glass layer during upward scrolling.
18. The proposal handoff replaced the operating-system `<select>` menu with a compact in-product picker. It keeps the existing account-scoped handoff logic while adding a searchable white menu, clear selected state, truncated long names, keyboard navigation, outside-click dismissal, and an internally bounded scrollbar.

## Intentional differences

- The selected reference contains a “Learn more” link. It was omitted because there is no verified destination and a nonfunctional link would reduce trust.
- At the 420 × 540 default size, completed conversations prioritize the newest response. Earlier messages remain available by scrolling.

## Verification

- `npm run ci` — contracts, zero-error lint (22 unrelated existing warnings),
  TypeScript, **67 suites / 472 tests**, and the production build passed
- `npm run test:e2e -- e2e/ai-assistant.spec.ts --reporter=line` — **8/8**
  signed-in desktop/mobile tests passed
- Live service health — Mongo connected, PostgreSQL ready at migration `036`,
  queue ready, and `/health` returned `200`
- Protected proposal and Assistant routes redirect unauthenticated requests to
  sign-in instead of exposing data
- `git diff --check`
