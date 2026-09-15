import { PencilLine, Sparkles, Upload } from "lucide-react";
import Link from "next/link";

// The same three ways in that the new-proposal workspace offers, as links,
// so a first-run dashboard or an empty proposals list can hand a planner
// straight into the workspace with that starter already chosen. The
// workspace reads ?start= once on arrival and strips it from the URL.
// Upload has no param: a browser will not open a file picker without a
// click on the page itself, so that starter lands on the workspace where
// the picker and the drop target are.

export const STARTER_LINKS = [
  {
    id: "example",
    label: "Try an example brief",
    title: "A fictional summit brief, so you can watch RFPilot read a document",
    href: "/proposals/add-new-proposal?start=example",
    icon: Sparkles,
  },
  {
    id: "upload",
    label: "Upload my brief or old RFP",
    title: "PDF, DOCX, XLSX, CSV or TXT",
    href: "/proposals/add-new-proposal",
    icon: Upload,
  },
  {
    id: "scratch",
    label: "Describe it from scratch",
    title: "Starts you off with a sample description you can edit",
    href: "/proposals/add-new-proposal?start=scratch",
    icon: PencilLine,
  },
] as const;

export default function StarterLinks({
  label = "Start with",
  className = "",
}: {
  /** Short lead-in shown before the chips; pass an empty string to omit. */
  label?: string;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label="Ways to start"
      className={`flex flex-wrap items-center justify-center gap-2 ${className}`}
    >
      {label ? <span className="mr-1 text-xs text-slate-500">{label}</span> : null}
      {STARTER_LINKS.map(({ id, label: text, title, href, icon: Icon }) => (
        <Link
          key={id}
          href={href}
          title={title}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-cyan-300 hover:bg-cyan-50/60 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00c2c9] focus-visible:ring-offset-2"
        >
          <Icon size={15} aria-hidden className="shrink-0 text-[#00aeb5]" />
          {text}
        </Link>
      ))}
    </div>
  );
}
