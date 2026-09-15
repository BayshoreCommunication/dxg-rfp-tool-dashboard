# Structured vendor response production experience

The public vendor URL always requests and renders the structured vendor
workspace. The legacy upload-led form and its dashboard API proxies have been
removed. The backend remains authoritative for grant, proposal lifecycle,
questionnaire, draft, and submission validation.

If the backend capability is unavailable, the URL renders a safe unavailable
state and directs the vendor back to the planner. It does not restore the old
form. Existing emailed links keep the same route and access-grant behavior.
