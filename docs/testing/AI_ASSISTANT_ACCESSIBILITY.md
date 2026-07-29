# AI Assistant accessibility and responsive verification

Last reviewed: 2026-07-29

## Interaction contract

- The sidebar launcher exposes an accessible name, `aria-haspopup="dialog"`,
  and its current `aria-expanded` state.
- The popup remains a non-modal dialog. Opening places focus in the composer;
  closing with the close button or Escape restores focus to the launcher.
- Escape closes the top-most assistant surface first: options menu, conversation
  history, then the popup.
- Menu items support Arrow Up, Arrow Down, Home, End, and Escape. Conversation
  history moves focus to its close control when opened and restores the invoking
  control when closed.
- Message streaming uses one polite live region. The visual typing indicator is
  hidden from assistive technology, streamed additions are announced in bounded
  updates, and completion is not repeated in full after the same text streamed.
- Drag and resize handles expose names, keyboard shortcuts, instructions, visible
  focus, and completion announcements. Arrow keys move or resize by 12 px;
  Shift+Arrow uses 48 px; Home resets the associated property.
- Motion-only effects are disabled when `prefers-reduced-motion: reduce` is set.

## Responsive contract

- The default popup is usable without moving or resizing it.
- Position and size are clamped to the visible viewport, including
  `window.visualViewport` offsets used when a mobile virtual keyboard is open.
- At 320 CSS pixels the popup keeps 12 px side margins and remains fully inside
  the visible viewport.
- Resizing is bounded between the usable minimum and twice the default size.
- Primary close, menu, drag, resize, retry, and dismiss controls have at least a
  40 px interactive target.
- A 320 CSS pixel viewport is the reflow proxy for 200% zoom on a 640 pixel
  desktop viewport.

## Automated coverage

- `AssistantPopup.test.tsx`: dialog semantics, lazy loading, Escape and focus
  restoration, 320 px/virtual-keyboard clamping, keyboard drag/resize,
  persistence, and reset.
- `AssistantFloatingControls.test.tsx`: focus entry, roving keyboard navigation,
  Escape, and focus restoration.
- `AiAssistantWorkspace.test.tsx`: optimistic sending, composer focus, progressive
  streaming, no message duplication, history focus, retry, and safe navigation.
- `MessageList.test.tsx`: one live region, bounded streaming announcements,
  typing state, auto-scroll, and jump-to-latest.

## Manual release checks

Run these against the authenticated dashboard before pilot promotion:

1. Open and close the assistant with keyboard only and confirm focus returns to
   the launcher.
2. Navigate the options menu and conversation history without a pointer.
3. Send a response long enough to stream and listen with VoiceOver or NVDA for
   non-duplicated announcements.
4. Test at 200% browser zoom and at 320 px width with no horizontal page scroll.
5. Open a mobile software keyboard and confirm the composer and send/stop control
   remain visible.
6. Enable reduced motion and confirm popup/message transitions do not animate.
7. Verify error, retry, citations, feedback, proposal analysis, and change-preview
   controls retain a visible focus indicator.
