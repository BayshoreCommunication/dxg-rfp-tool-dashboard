const PRODUCTION_BACKEND_URL = "http://localhost:8000";
const PRODUCTION_FRONTEND_URL = "http://localhost:3000";

/**
 * Externally reachable backend URL.
 * Set BACKEND_URL in your environment for local dev (eg. http://localhost:8000).
 * On Vercel, set BACKEND_URL=https://api.dxg-agency.com — or leave it
 * unset and the production URL is used as the safe default.
 */
export const BACKEND_URL = (
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.BACKEND_URL ||
  PRODUCTION_BACKEND_URL
)
  .trim()
  .replace(/\/+$/, "");

/**
 * Externally reachable dashboard frontend URL.
 * Set NEXT_PUBLIC_FRONTEND_URL in your environment for local dev.
 */
export const FRONTEND_URL = (
  process.env.NEXT_PUBLIC_FRONTEND_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  PRODUCTION_FRONTEND_URL
)
  .trim()
  .replace(/\/+$/, "");
