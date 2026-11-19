import { PencilLine, Sparkles, Upload } from "lucide-react";
import Link from "next/link";
import { STARTER_CHIP_CLASS, STARTER_ICON_CLASS } from "./starterChip";

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
    label: "Upload my brief or old proposal",
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
      {label ? <span className="mr-1 text-xs text-muted">{label}</span> : null}
      {STARTER_LINKS.map(({ id, label: text, title, href, icon: Icon }) => (
        <Link
          key={id}
          href={href}
          title={title}
          className={STARTER_CHIP_CLASS}
        >
          <Icon size={15} aria-hidden className={STARTER_ICON_CLASS} />
          {text}
        </Link>
      ))}
    </div>
  );
}
