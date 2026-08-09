import { notFound } from "next/navigation";

// The app has multiple root layouts (one per route group) and no app/layout,
// so a top-level app/not-found.tsx cannot exist. This catch-all matches every
// URL no real route claims and triggers the (auth) group's not-found page.
export default function CatchAllNotFound() {
  notFound();
}
