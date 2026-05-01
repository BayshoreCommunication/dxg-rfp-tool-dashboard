const PRODUCTION_BACKEND_URL = "https://dxg-rfp-tool-backend.vercel.app";
const PRODUCTION_FRONTEND_URL = "https://dxg-rfp-tool-dashboard.vercel.app";

/**
 * Externally reachable backend URL.
 * Set BACKEND_URL in your environment for local dev (e.g. http://localhost:8000).
 * On Vercel, set BACKEND_URL=https://dxg-rfp-tool-backend.vercel.app — or leave it
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
