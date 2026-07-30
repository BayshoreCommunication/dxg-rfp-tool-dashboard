# Using the AI Assistant

> User help. Last updated: 2026-07-29.

The AI Assistant is a small helper available from the robot icon near the
bottom of the RFPilot sidebar, above Notifications. The icon appears only for
organizations included in the current Assistant rollout.

## What it can help with

- finding your way around RFPilot;
- understanding proposal creation and review, including the guided intake
  sections and what the main form fields mean;
- explaining event-planning information and workflows;
- onboarding and general platform questions.

The Assistant is read-only. It cannot edit, publish, send, archive, delete,
book, reserve, schedule, or contact someone for you. When you ask it to
perform one of those actions, it explains the boundary and gives you the
relevant RFPilot page and user-operated steps. Use a proposal's dedicated
assistant when you want to work with that proposal's information and sources.

When a general question turns into work on a specific proposal, expand
**Continue with one of your proposals**. The selector contains only proposals
available to your account. You can continue in that proposal's assistant,
open its editor, or prepare an email after the proposal is submitted. RFPilot
checks access again at the destination. You can carry the question to the
proposal assistant as an unsent draft; it is stored only for the current
browser session and is never sent automatically.

Useful examples:

- “List the guided proposal intake sections.”
- “What should I enter in Event Overview?”
- “What should I check before sending this proposal?”
- “Update my event checklist for a three-day hybrid conference.”
- “Where can I see vendor responses?”

The empty helper shows a small set of suggestions for the page you are on.
Inside the guided proposal form, it can also recognize the current section and
supported focused fields. It sends only a category and field identifier—not
the value you entered. Ask “What should I enter in this field?”, “Show me a
good example,” or “Can I leave this blank?” for focused guidance.

## Review an opened proposal

The dedicated assistant can answer questions about the proposal you explicitly
opened. On each chat turn, RFPilot rechecks access and supplies a fresh,
bounded snapshot of the proposal's saved event, venue and schedule,
room-by-room, production, hybrid/virtual, content/creative, recording,
technical venue, and budget fields. Ask for a summary, a list of saved
requirements, or which supported details are still missing.

Contact details, uploads and attachment contents, private or internal notes,
and storage/source identifiers are excluded from this snapshot. The assistant
does not train on, permanently learn, or automatically reuse the proposal in
other conversations. Use the explicit selected-proposal comparison described
below when you want governed guidance from other proposals.

Open a proposal’s dedicated assistant and run **Proposal readiness check** to
see a concise event summary, section completeness, and deterministic findings.
Each finding identifies the affected fields and a suggested next step. If the
proposal changes after a check, RFPilot marks the report as out of date and
asks you to refresh it. The check never changes proposal fields automatically.

The same report can label equipment and production-scope findings such as a
missing dependency, quantity mismatch, possible duplicate rental, or a venue
confirmation. A confirmation question means RFPilot does not have enough
authoritative information; confirm it with the venue or production owner
instead of treating the suggestion as a fact.

The **Room & schedule** summary shows how many room specifications were
analyzed, conflicts or missing inputs found, and conditional equipment-reuse
opportunities. A reuse opportunity is a prompt to request and validate an
alternative—not permission to share equipment. Transport, reset, testing,
venue rules, and non-overlap must all be confirmed. Room and shared-service
prices are not calculated by this schedule check.

Use **Investment guidance** for the separately governed deterministic budget
range. It shows whether the result is complete, what is included or missing,
which items need confirmation, category/room/labor/shared-service breakdowns,
and supported budget-ceiling warnings. Missing approved rates remain blank;
RFPilot does not guess them. The displayed calculation, pricing-release, and
rule-release versions preserve the basis of a historical estimate.

## Start a conversation

1. Select the robot icon in the sidebar.
2. Type a question in the box at the bottom.
3. Press Enter or select the arrow button.
4. Use the three-dot menu to start a new conversation or open recent chats.
5. Select the close button to return to the dashboard. Your completed history
   remains available when you reopen the helper.

Shift+Enter adds a new line. While a response is streaming, the stop button
ends that response.

## Archive, delete, or restore a conversation

Open recent chats, then use the archive button to move a conversation to
**Archived**. An archived conversation remains recoverable for 30 days. The
displayed date shows when automatic deletion is scheduled; select **Restore**
before that date to return it to active history.

Use the trash button when you want to delete a conversation immediately.
RFPilot asks for explicit confirmation because permanent deletion cannot be
undone. An active legal hold can block permanent deletion or delay an archived
conversation's scheduled purge.

## Rate a response

Use **Helpful** or **Not helpful** below a completed assistant response.
Not-helpful feedback can include one short reason such as incorrect, outdated,
missing steps, or irrelevant. You can update the rating later. If saving
fails, **Retry** safely repeats the same request without creating a duplicate.

Feedback is reviewed as a quality signal. It never changes the Assistant's
rules, knowledge, or answers automatically, and RFPilot does not store a
second copy of your question or the response in the feedback record.

RFPilot may record privacy-safe product events such as opening the helper,
selecting a suggestion, completing a response, opening an approved link, or
starting a proposal handoff. These events contain bounded categories,
versions, outcomes, and timing—not your question, the response, proposal
content, contact details, or client identifiers.

## Move the helper

Drag the move control at the popup's upper-left to place the helper anywhere
inside the browser window. RFPilot remembers the position on this device and
keeps the popup inside the visible screen after a resize.

Keyboard users can focus the move control and use Arrow keys to nudge the
popup, Shift+Arrow for a larger step, or Home to restore the default position.
The three-dot menu also includes **Reset popup position** after the helper has
been moved.

## If something goes wrong

- Use **Try again** for a retryable error.
- Wait for the displayed cooldown when the rate limit is reached.
- Refresh your session if RFPilot asks you to sign in again.
- If the Assistant is unavailable, continue using normal RFPilot workflows and
  contact support with the time of the error. Do not send API keys, passwords,
  or confidential proposal content in a support message.

The Assistant may ask for clarification or explain that a request is outside
its supported knowledge. That is safer than guessing.

## Learn from selected proposals

In **See Guidance**, explicitly select up to five of your other active
proposals to compare their planning structure with the current proposal. Every
idea is labelled with selected-reference provenance and remains a suggestion.
Client details, private notes, exact values, and exact historical pricing are
excluded, and no field is copied automatically. A report becomes unavailable
if any selected reference is archived, deleted, or no longer accessible.

## Review extracted field changes

Extracted suggestions never change the proposal automatically. Open the
proposal editor, review each suggestion's current value, proposed value,
reason, and citation provenance, then choose Accept, Edit, Reject, or leave it
Pending. **Review selected changes** opens a second confirmation summary.
Only **Confirm and apply** queues the version-checked change. Existing values
also require an explicit overwrite checkbox. Applied changes keep an audit
record and before/after checksums; restore a prior value through the editor or
contact an administrator with the application time.
