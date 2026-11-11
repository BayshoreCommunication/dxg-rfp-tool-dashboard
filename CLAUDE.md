# CLAUDE.md — dxg-rfp-tool-dashboard

Planner-facing web app for RFPilot (Next.js 16 App Router, React 19, NextAuth v5,
Tailwind CSS 4). This repo is one of three (with `dxg-rfp-tool-backend` and
`dxg-rfp-tool-admin`). The backend owns the API, the AI layer and the shared project docs.

## Read first

1. `../dxg-rfp-tool-backend/docs/PROJECT_STATE.md` and `docs/ARCHITECTURE.md` there
2. `docs/architecture/README.md` in this repo
3. The workspace `CONTEXT-MAP.md`, if this repo sits in the shared workspace folder

## Commands

```bash
npm run dev               # Next.js dev server (:3000; expects the backend on :8000)
npm test                  # Jest
npm run test:e2e          # Playwright
npm run lint              # ESLint, --max-warnings=0
npm run type-check
npm run ci                # contracts:check -> brief:check -> lint -> type-check -> test -> build
npm run contracts:generate  # after a backend contract change
```

## Layout and gotchas

- Routes live under `app/` route groups: `(auth)`, `(page)`, `(proposals-user)`, `(proposals-public)`.
- `contracts/generated/` is generated from the backend. Never hand-edit it; regenerate it.
- AI surfaces are gated by `NEXT_PUBLIC_*_ENABLED` mirrors of the backend flags. Both sides must agree.
- Unit tests have missed integration bugs before. For UI workflow changes, drive the
  running app against a real backend, not only Jest.
- `.agents/skills/` holds generic third-party Vercel skills, not project rules.

## Project skills

`/verify-ui <route>`: Playwright at desktop and mobile against the e2e stub, with console, axe
and screenshot evidence. Contract and ticket skills live in the backend repo.

## Rules

- User-facing copy calls the document a planner writes and sends to vendors a **proposal**, never
  an "RFP" ("New Proposal", "Untitled proposal", "Proposal intelligence"). **RFPilot** is the
  product name and stays. "RFP" is kept only where the term is being defined ("requests for
  proposal (RFPs)" on the Proposals page, "Request for Proposal" on the document cover and
  sign-in metadata); `lib/wording.test.ts` lists the exceptions and fails on a new one, and
  e2e specs use `expectProposalWording` from `e2e/support/wording.ts`. Identifiers, routes,
  test ids and backend fields keep `rfp`.

- Never commit `.env*` files or real proposal content.
- Publication is always a human action. Never add a path where AI output publishes on its own.
