# Design system and proposal-flow QA

How the dashboard's colours, shared components and quality checks fit together. The redesign of
the proposal flow (entry, AI workspace, builder) was done on top of this layer.

## Tokens

`app/styles/tokens.css` holds semantic tokens for light (`:root`) and dark (`.dark`), exposed to
Tailwind through `@theme inline`, so `bg-surface`, `text-heading`, `border-line` and the rest follow
the active theme. New components use these and **no hex values**.

| Group | Tokens |
|---|---|
| Surfaces | `page`, `surface`, `surface-muted` |
| Lines | `line` (decorative), `line-strong`, `control` (form outlines, 3:1) |
| Text | `heading`, `body`, `muted` (all 4.5:1 on every surface), `subtle` (decorative or disabled only) |
| Brand | `brand` `#218CCB` (fills, rings, icons, large elements), `action` `#1B73AA` (buttons, links, small blue text), `action-hover`, `on-action`, `brand-soft`, `focus` |
| Status | `success`, `danger`, `warning`, each with `-strong` (text) and `-soft` (tinted surface) |
| Shape | `rounded-control`, `rounded-card`, `shadow-card`, `shadow-pop` |

`lib/designTokens.test.ts` parses `tokens.css` and fails if any text token drops below WCAG AA
(4.5:1) or a control token below 3:1 in either theme, or if light and dark define different tokens.
Change a value there and that test says whether it still holds.

Typography is Proxima Nova, which ships only 400, 600 and 800. Use `font-normal`, `font-semibold`
and `font-extrabold`; `font-medium` and `font-bold` snap to a neighbouring weight.

### Dark mode

Two mechanisms coexist. Tokens switch with the `.dark` class natively. Older screens still use
hard-coded Tailwind classes that `app/globals.css` remaps for dark with attribute selectors keyed on
the literal class string (about 130 of them). So when you replace a class like
`border-slate-200/80` with a token, check that dark mode still looks right: the remap no longer
applies to the new class, and a token is the right replacement. Do not rename a hex class in only
one of the component and the selector.

The legacy `--color-brand` is `#218CCB`; new code should use `action` for text and filled buttons
(white on `#218CCB` is only 3.7:1).

## Components (`components/ui`)

`Button` (primary, secondary, ghost, danger; sizes; `loading`), `Field` (binds a label, hint and
error to its control through a render prop), `Input`, `Textarea`, `Card` (+ Header, Body, Footer),
`InlineAlert`, `Skeleton`, `Badge`, `SaveStatus` (autosave state in words, with Retry).

Open `/dev/design-system` while running the app in development to see every component and state in
both themes. It returns 404 in production.

## Proposal flow

| Piece | Where |
|---|---|
| Entry screen | `components/proposals/ProposalEntry.tsx` |
| AI workspace rail (summary, details, sources) | `components/proposals/AssistantRail.tsx` |
| Builder sections and which are applicable | `lib/proposals/proposalExperience.ts` (`proposalSections`, `adjacentApplicableStep`) |
| Draft autosave with recovery | `components/proposals/useProposalAutosave.ts` |

Advanced mode always lists nine sections. Hybrid & Virtual stays listed for in-person events,
marked Not applicable. `proposalStepOrder` is still the list of sections that need answers
(Continue/Back and the readiness count); `proposalSections` is everything the planner can open.

## Quality checks

- Unit: `npm test`. Contrast, token parity, source encoding, each primitive, each section form's
  accessibility wiring (`*.a11y.test.tsx`, helpers in `ProposalsProcess.tsx/a11yHelpers.ts`).
- E2E for the proposal flow runs under the **onboarding config** (conversations flag on):
  `npx playwright test -c playwright.onboarding.config.ts e2e/proposal-entry.spec.ts e2e/proposal-builder-save.spec.ts e2e/proposal-qa.spec.ts`
  - `proposal-entry`: axe on the entry screen, the AI workspace and the builder, light and dark.
  - `proposal-builder-save`: what a draft save sends, failed and overlapping saves, the unload warning.
  - `proposal-qa`: layout at 390, 768 and 1280 px, and axe on every builder section.
- The stub backend is `e2e/support/proposalOnboardingFixture.mjs`. `POST /__e2e/onboarding` accepts
  `reset`, `questions`, `intakeProgress`, `proposal` (extra proposal fields), `scan`, `delays`,
  `failPuts` (fail the next N draft saves) and `putDelay` (hold each save open, in ms).
- `e2e/fixtures/builderPayloadKeys.json` pins the shape (key paths and value types, never values)
  of the builder's save requests. It was recorded from `main` before the redesign. After an
  intentional contract change, re-record it with `WRITE_PAYLOAD_KEYS=1` on the spec.
- `e2e/proposal-onboarding.spec.ts` is older and its sign-in skips the Continue step; it already
  fails on a clean checkout.

`npm run ci` also lints `.next-stack/`, the build folder of the local Docker stack
(`deploy/local` in the backend repo), which is not in the lint ignore list. If it fails on files
under `.next-stack/`, that is why.

## Not covered by these checks

A real backend: the e2e stub returns blank or synthetic proposals. Filled forms, publish
validation and real extraction should be checked against the local stack
(`npm run stack:up && npm run stack:dev` in the backend repo, accounts in its `deploy/local/README.md`).
