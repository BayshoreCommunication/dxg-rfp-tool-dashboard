import { DEMO_URL } from "@/lib/config";
import { glossary, glossaryTermCount } from "@/lib/proposalIntelligence/glossary";
import {
  ArrowRight,
  BookOpen,
  ExternalLink,
  FilePlus2,
  PlayCircle,
} from "lucide-react";
import Link from "next/link";

// The one place a planner can read what RFPilot is and how a proposal moves
// from a description to a vendor decision. It does not depend on the AI
// Assistant rollout flag, so every signed-in user can reach it from the
// sidebar. Server component: nothing here is interactive.

const FLOW: ReadonlyArray<{
  title: string;
  body: string;
  where: string;
}> = [
  {
    title: "Describe your event",
    body: "Type what you're planning in plain language, or attach a brief, agenda or old RFP. RFPilot reads the document and fills in what it can find, and every filled value stays editable.",
    where: "Proposals → New Proposal",
  },
  {
    title: "Answer what's missing",
    body: "The assistant asks short guided questions only for details it doesn't have yet, up to 19 of them, fewer when a document already covered them. Skip any you're unsure of and come back later.",
    where: "Same page, in the conversation",
  },
  {
    title: "Review the draft",
    body: "Ask for a draft and you get a cited RFP, a readiness check that lists what is still thin, and an investment range based on national baseline pricing. Open the full editor to change anything.",
    where: "Same page, or Edit all details",
  },
  {
    title: "Publish",
    body: "Publishing turns the draft into the shareable RFP vendors will read. It does not email anyone. You can keep editing and republish.",
    where: "Proposal editor → Publish",
  },
  {
    title: "Email vendors",
    body: "Choose which vendors receive the RFP and send it from the Email page. Each vendor gets a private link to respond. If a vendor replies by email or courier instead, add their response manually.",
    where: "Email → Send email",
  },
  {
    title: "Compare responses and decide",
    body: "Vendor Responses collects every submission. Proposal Intelligence checks each one against your approved requirements and shows them side by side, with every claim linked to the vendor's own words. The ranking is advisory; the decision you record is the official outcome.",
    where: "Vendor Responses → Proposal Intelligence",
  },
];

const PLACES: ReadonlyArray<{ title: string; href: string; body: string }> = [
  {
    title: "Dashboard",
    href: "/dashboard",
    body: "Totals and your most recent proposals.",
  },
  {
    title: "Proposals",
    href: "/proposals",
    body: "Every RFP you've started: drafts, live, favourites, expired and archived. Start a new one here.",
  },
  {
    title: "Email",
    href: "/email",
    body: "Send a published RFP to vendors and see what was sent and opened.",
  },
  {
    title: "Vendor Responses",
    href: "/vendor-responses",
    body: "What vendors sent back, grouped by proposal, and the way into Proposal Intelligence.",
  },
  {
    title: "Settings",
    href: "/settings",
    body: "Your profile, organization and preferences.",
  },
];

export default function HelpCenter() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 pb-16 pt-6 sm:px-6">
      <header className="max-w-2xl">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Help
        </p>
        <h1 className="mt-1 text-balance text-3xl font-bold tracking-tight text-slate-900">
          How RFPilot works
        </h1>
        <p className="mt-3 text-base leading-7 text-slate-600">
          RFPilot turns your event details into an AV production RFP, the
          request you send to vendors so they can quote, then helps you compare
          what they send back. A two-minute read from first message to vendor
          decision.
        </p>
        <nav
          aria-label="On this page"
          className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm font-medium text-[#0b6e6a]"
        >
          <a href="#flow" className="hover:underline">From event to decision</a>
          <a href="#try" className="hover:underline">Try it first</a>
          <a href="#places" className="hover:underline">Where things live</a>
          <a href="#glossary" className="hover:underline">What the words mean</a>
        </nav>
      </header>

      <section id="flow" aria-labelledby="flow-title" className="mt-10">
        <h2 id="flow-title" className="text-xl font-bold text-slate-900">
          From event to decision
        </h2>
        <ol className="mt-4 grid gap-4">
          {FLOW.map((step, index) => (
            <li
              key={step.title}
              className="grid grid-cols-[2rem_1fr] gap-3 border-t border-slate-200 pt-4"
            >
              <span
                aria-hidden
                className="flex h-7 w-7 items-center justify-center rounded-full bg-[#00c2c9] text-xs font-bold text-white"
              >
                {index + 1}
              </span>
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-slate-900">
                  <span className="sr-only">{`Step ${index + 1}: `}</span>
                  {step.title}
                </h3>
                <p className="mt-1 max-w-prose text-sm leading-6 text-slate-600">
                  {step.body}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  <span className="font-semibold text-slate-600">Where:</span>{" "}
                  {step.where}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section id="try" aria-labelledby="try-title" className="mt-12">
        <h2 id="try-title" className="text-xl font-bold text-slate-900">
          Try it first
        </h2>
        <p className="mt-2 max-w-prose text-sm leading-6 text-slate-600">
          Two ways to see the whole flow before you use your own files.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <a
            href={DEMO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition-colors hover:border-cyan-300 hover:bg-cyan-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00c2c9] focus-visible:ring-offset-2"
          >
            <PlayCircle size={20} aria-hidden className="mt-0.5 shrink-0 text-[#00aeb5]" />
            <span className="min-w-0">
              <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                Watch the interactive demo
                <ExternalLink size={13} aria-hidden className="text-slate-400" />
              </span>
              <span className="mt-1 block text-xs leading-5 text-slate-500">
                A nine-step click-through of a fictional summit, from event
                brief to vendor recommendation. No sign-in, nothing saved.
              </span>
            </span>
          </a>
          <Link
            href="/proposals/add-new-proposal"
            className="group flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition-colors hover:border-cyan-300 hover:bg-cyan-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00c2c9] focus-visible:ring-offset-2"
          >
            <FilePlus2 size={20} aria-hidden className="mt-0.5 shrink-0 text-[#00aeb5]" />
            <span className="min-w-0">
              <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                Start with the example brief
                <ArrowRight size={13} aria-hidden className="text-slate-400" />
              </span>
              <span className="mt-1 block text-xs leading-5 text-slate-500">
                Open a new proposal and choose “Try an example brief” to watch
                RFPilot read a document in your own account.
              </span>
            </span>
          </Link>
        </div>
      </section>

      <section id="places" aria-labelledby="places-title" className="mt-12">
        <h2 id="places-title" className="text-xl font-bold text-slate-900">
          Where things live
        </h2>
        <ul className="mt-4 divide-y divide-slate-200 border-y border-slate-200">
          {PLACES.map((place) => (
            <li key={place.href} className="grid gap-1 py-3 sm:grid-cols-[10rem_1fr] sm:gap-4">
              <Link
                href={place.href}
                className="text-sm font-semibold text-[#0b6e6a] hover:underline"
              >
                {place.title}
              </Link>
              <p className="text-sm leading-6 text-slate-600">{place.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section id="glossary" aria-labelledby="glossary-title" className="mt-12">
        <div className="flex items-center gap-2">
          <BookOpen size={18} aria-hidden className="text-[#00aeb5]" />
          <h2 id="glossary-title" className="text-xl font-bold text-slate-900">
            What the words mean
          </h2>
        </div>
        <p className="mt-2 max-w-prose text-sm leading-6 text-slate-600">
          Plain definitions for the {glossaryTermCount} terms used across vendor
          responses and Proposal Intelligence. The same list opens from inside
          Proposal Intelligence.
        </p>
        <div className="mt-4 grid gap-8">
          {glossary.map((group) => (
            <div key={group.heading}>
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                {group.heading}
              </h3>
              <dl className="mt-2 divide-y divide-slate-100">
                {group.entries.map((entry) => (
                  <div key={entry.term} className="grid gap-1 py-2.5 sm:grid-cols-[12rem_1fr] sm:gap-4">
                    <dt className="text-sm font-semibold text-slate-900">
                      {entry.term}
                    </dt>
                    <dd className="m-0 text-sm leading-6 text-slate-600">
                      {entry.definition}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
