#!/usr/bin/env node
/* The first-run starter ("Try an example brief") stages a fixed .docx whose
   dates are written out in full — "September 14-16, 2026", "August 7, 2026".
   Once those dates pass, the very first thing a new planner sees is an RFP for
   an event that already happened, soliciting bids against a dead deadline.

   This shifts every year reference forward by whole years, which keeps the
   document's internal relationships intact (the brief is anchored to one
   September; the proposal deadline sits ~5 weeks before it and the file
   handover ~5 days before). Whole years also keep the prose honest: only the
   year digits change, never a weekday or a day-of-month.

   Idempotent, and run from `prebuild` so a deploy can never ship a stale
   brief. `npm run brief:refresh -- --check` reports staleness without
   writing, which is what the test uses. */

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import JSZip from "jszip";

const BRIEF = path.join(process.cwd(), "public", "files", "RFPilot example-event-brief.docx");
const DOCUMENT = "word/document.xml";
/* The earliest dated thing in the brief is the proposal deadline, five weeks
   before the event. Requiring the EVENT to be this far out keeps the deadline
   itself comfortably in the future too, so the demo never opens on an expired
   RFP. */
const MINIMUM_LEAD_DAYS = 90;
const EVENT_MONTH = 8; // September, zero-based — the month the brief is anchored to.
const EVENT_DAY = 14;

export const yearsToShift = (currentYear, now = new Date()) => {
  let shift = 0;
  for (;;) {
    const start = new Date(Date.UTC(currentYear + shift, EVENT_MONTH, EVENT_DAY));
    const leadDays = (start.getTime() - now.getTime()) / 86_400_000;
    if (leadDays >= MINIMUM_LEAD_DAYS) return shift;
    shift += 1;
    if (shift > 50) throw new Error("Could not find a future year for the example brief.");
  }
};

const run = async () => {
  const check = process.argv.includes("--check");
  const zip = await JSZip.loadAsync(await readFile(BRIEF));
  const xml = await zip.file(DOCUMENT).async("string");

  /* ONLY the visible text may be touched. The raw XML also contains 2006,
     2008 and 2010 inside OOXML namespace URLs
     (.../wordprocessingml/2006/main); rewriting those corrupts the document
     beyond repair, and Word reports no error until it fails to open. */
  const TEXT_NODE = /(<w:t\b[^>]*>)([^<]*)(<\/w:t>)/g;
  const textOf = (source) => [...source.matchAll(TEXT_NODE)].map((m) => m[2]).join(" ");
  const years = [
    ...new Set([...textOf(xml).matchAll(/\b(20\d\d)\b/g)].map((m) => Number(m[1]))),
  ];
  if (!years.length) throw new Error("No year found in the example brief; has the document changed?");
  /* Every date in the brief shares one year, so the oldest one anchors the
     shift and all references move together. */
  const anchor = Math.min(...years);
  const shift = yearsToShift(anchor);

  if (shift === 0) {
    console.log(`Example brief is current (anchored to ${anchor}).`);
    return;
  }
  if (check) {
    console.error(
      `Example brief is STALE: anchored to ${anchor}, needs +${shift} year(s). Run: npm run brief:refresh`,
    );
    process.exitCode = 1;
    return;
  }

  const updated = xml.replace(TEXT_NODE, (whole, open, text, close) =>
    `${open}${text.replace(/\b(20\d\d)\b/g, (year) => String(Number(year) + shift))}${close}`);
  /* Rebuilt entry by entry rather than re-serialising the loaded archive:
     JSZip synthesises directory entries ("word/", "_rels/") that a Word-written
     .docx does not contain, and the rewritten file should differ from the
     original in exactly one entry and nothing else. */
  const rebuilt = new JSZip();
  for (const name of Object.keys(zip.files)) {
    const entry = zip.files[name];
    if (entry.dir) continue;
    const content = name === DOCUMENT ? updated : await entry.async("nodebuffer");
    rebuilt.file(name, content, { createFolders: false, date: entry.date });
  }
  await writeFile(BRIEF, await rebuilt.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }));
  console.log(`Example brief shifted ${anchor} -> ${anchor + shift}.`);
};

/* Only act when invoked as a command; importing this module (a test checking
   the staleness threshold, say) must not rewrite the document as a side
   effect. */
const invokedAs = process.argv[1] ? pathToFileURL(process.argv[1]).href : null;
if (import.meta.url === invokedAs) await run();
