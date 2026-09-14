# Structured vendor response dashboard rollout

`NEXT_PUBLIC_VENDOR_STRUCTURED_RESPONSES_ENABLED=true` allows the dashboard to
request and render the structured vendor workspace. The backend remains
authoritative: its global flag and the proposal capability marker must also
resolve to `structured_v1`.

If the dashboard flag is off, or the workspace capability resolves to
`legacy_unstructured`, the existing public vendor form is rendered at the same
emailed URL. Email, tracking ID, and access-grant context are preserved.

Rollback therefore consists of either turning off the dashboard switch, turning
off the backend switch, or setting one proposal back to `legacy_unstructured`.
None of these operations deletes a draft, questionnaire, response version, or
document.
