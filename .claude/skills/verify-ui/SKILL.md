---
name: verify-ui
description: Prove a dashboard screen change works in a real browser - drive it with Playwright against the stub backend at desktop and mobile size, check console errors and accessibility, and leave screenshots as evidence. Use after changing a page, component, form or layout in dxg-rfp-tool-dashboard, or when asked to check a screen visually.
argument-hint: <route or screen, e.g. /settings/users>
---

# /verify-ui $ARGUMENTS

Unit tests and type-checks do not show a broken layout. This skill ends with screenshots and a
Playwright result, not "it should work".

## 1. Scope

- `git diff --name-only origin/main...` to list the changed screens and components.
- Name the states that matter for $ARGUMENTS: loading, empty, populated, error, and each role
  that sees it differently (Owner, Admin, Team Manager, Planner, Viewer).

## 2. Stub data

`npm run test:e2e` starts its own servers: `e2e/support/assistantBackendStub.mjs` on :8011 and
`next dev` on :3011 with test-only secrets from `playwright.config.ts`. Nothing reads `.env.local`.

- If the screen calls a backend route the stub does not serve, add a handler to the stub with
  realistic data (shape copied from the backend controller or `docs/API.md` in the backend repo).
  Never use real customer or proposal content.
- Sign in the way `e2e/dark-theme-visual.spec.ts` does (`assistant-e2e@example.com`).

## 3. Write or extend a spec

Add `e2e/<area>.spec.ts` (or extend the existing one) that:

- visits $ARGUMENTS, asserts the key headings, controls and data by role or label
  (`getByRole`, `getByLabel`), and exercises the main action (submit, toggle, open dialog);
- collects `page.on("console")` errors and `pageerror` and asserts there are none;
- runs `new AxeBuilder({ page }).analyze()` and asserts no serious or critical violations;
- saves screenshots with `testInfo.outputPath("<state>.png")` for each state.

The config runs two projects, `desktop-chromium` (1440x900) and `mobile-chromium` (Pixel 5).
Both must pass: check that nothing overflows horizontally on mobile
(`document.documentElement.scrollWidth <= window.innerWidth`).

## 4. Run

```bash
npx playwright test e2e/<area>.spec.ts            # both projects
npx playwright show-report                         # only if the user wants to browse it
```

Onboarding specs use `npm run test:e2e:onboarding` (separate config). If Chromium is missing,
run `npx playwright install chromium` (ask first; it downloads a browser).

## 5. Look at the result

Open the saved screenshots with the Read tool and check them yourself: spacing, truncation,
dark theme (the app defaults to dark), empty and error states, and copy ("RFP", not "proposal").
Fix and re-run until they are right.

## 6. Real backend, for workflow changes

The stub proves layout and wiring, not the backend contract. When the change is a workflow that
writes data (invitations, sharing, publishing, vendor responses), also check it against the real
API: if the backend is already running on :8000 and the dashboard on :3000 (`../run-all.sh`),
drive the same click path there with Playwright and the user's test account. Do not start or
reconfigure those servers yourself, and do not read `.env*` files; if they are not running, say
the real-backend check was not done.

## 7. Report

List each state checked with its screenshot path, the Playwright pass/fail per project, console
and axe results, and anything not verifiable with the stub (say so plainly; do not claim it).
Then run `npm run lint` and `npm run type-check` for the spec and stub changes.
