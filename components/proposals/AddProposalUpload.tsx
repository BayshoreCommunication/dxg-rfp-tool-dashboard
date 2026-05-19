"use client";

import { CheckCircle, Download, FileText, HelpCircle, X } from "lucide-react";
import React, { useState } from "react";

type AddProposalUploadProps = {
  selectedFile: File | null;
  setSelectedFile: (file: File | null) => void;
  isExtracting?: boolean;
  onContinueWithUpload: () => void;
  onContinueWithoutUpload: () => void;
};

const ACCEPTED_TYPES = [
  { ext: "PDF", color: "bg-rose-100 text-rose-700 border-rose-200" },
  { ext: "DOC", color: "bg-blue-100 text-blue-700 border-blue-200" },
  { ext: "DOCX", color: "bg-blue-100 text-blue-700 border-blue-200" },
  { ext: "CSV", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
];

const FIELD_GROUPS = [
  {
    label: "1 · Event Overview",
    color: "border-[#00c2c9] bg-[#00c2c9]/5 text-[#009198]",
    fields: [
      "Event name, theme & edition year",
      "Start / end dates & venue city",
      "Format: In-Person / Hybrid / Virtual",
      "Attendee count & event type",
      "Objectives, tone & sacred constraints",
    ],
  },
  {
    label: "2 · Venue Schedule",
    color: "border-teal-400 bg-teal-50 text-teal-700",
    fields: [
      "Venue name, address, city & state",
      "Union venue & union jurisdictions",
      "Load-in, rehearsal & strike dates/times",
      "Number of event rooms & time zone",
    ],
  },
  {
    label: "3 · AV & Production Crew",
    color: "border-sky-400 bg-sky-50 text-sky-700",
    fields: [
      "Podium mic, wireless mics (qty & type)",
      "Screens, LED wall (width × height, pixel pitch)",
      "Cameras, video recording type & playback",
      "Stage lighting, confidence monitors & speaker timer",
      "Teleprompter (bilingual, languages)",
      "Crew roles, scenic design & union labor",
    ],
  },
  {
    label: "4 · Hybrid & Virtual",
    color: "border-[#2563eb] bg-[#2563eb]/5 text-[#1d4ed8]",
    fields: [
      "Virtual attendee estimate",
      "Streaming platform & AV integration",
      "Remote speakers (count, platform, tech rehearsal owner)",
      "Live virtual Q&A, breakouts & virtual producer",
      "Closed captions: languages & type",
      "On-demand recording, sponsor overlays & networking",
    ],
  },
  {
    label: "5 · Content & Creative",
    color: "border-rose-400 bg-rose-50 text-rose-700",
    fields: [
      "Content services needed (Yes / No)",
      "Presentation template, motion graphics & lower thirds",
      "Sizzle/recap video, sponsor & social content",
      "Live data feeds ownership",
      "Creative direction notes & brand standards",
    ],
  },
  {
    label: "6 · Video Recording",
    color: "border-orange-400 bg-orange-50 text-orange-700",
    fields: [
      "Video recording required (Yes / No)",
      "Number of cameras, positions & IMAG",
      "ISO recordings & camera operators",
      "Recording resolution & media",
      "Edited deliverable type, turnaround & reel length",
      "Raw footage turnover, format & delivery method",
    ],
  },
  {
    label: "7 · Venue Technical",
    color: "border-violet-400 bg-violet-50 text-violet-700",
    fields: [
      "Rigging: required, weight per point & number of points",
      "Power drops: amperage & quantity",
      "Wireless internet & use cases",
      "COI requirements & venue access notes",
    ],
  },
  {
    label: "8 · Budget & Preferences",
    color: "border-amber-400 bg-amber-50 text-amber-700",
    fields: [
      "Estimated AV budget tier",
      "Preferred proposal format(s)",
      "Timeline for proposal & decision date",
      "Evaluation matrix weights (must total 100%)",
      "Competitive bid, number of proposals & how you heard of us",
    ],
  },
  {
    label: "9 · Contact Information",
    color: "border-pink-400 bg-pink-50 text-pink-700",
    fields: [
      "First name, last name, title & organization",
      "Organization legal name",
      "Email, phone, extension & phone type",
      "Preferred contact method & best time to reach",
      "Additional contacts & any other notes",
    ],
  },
];

async function downloadSamplePdf() {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const ml = 18;
  const mr = pageW - ml;
  const cw = mr - ml;
  let y = 0;

  const checkBreak = (need = 12) => {
    if (y + need > pageH - 18) {
      doc.addPage();
      y = 18;
    }
  };

  // Header
  doc.setFillColor(14, 165, 233);
  doc.rect(0, 0, pageW / 2, 42, "F");
  doc.setFillColor(99, 102, 241);
  doc.rect(pageW / 2, 0, pageW / 2, 42, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("DXG RFP — Sample Proposal Template", ml, 16);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(
    "Fill in the fields below and upload this file when creating a proposal.",
    ml,
    25,
  );
  doc.text(
    "Our AI will read these fields and pre-fill your form automatically.",
    ml,
    32,
  );
  y = 52;

  // Tip box
  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(134, 239, 172);
  doc.roundedRect(ml, y, cw, 14, 2, 2, "FD");
  doc.setTextColor(22, 101, 52);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("How to use:", ml + 4, y + 6);
  doc.setFont("helvetica", "normal");
  doc.text(
    "Fill in your event details, save this file, then upload on the proposal creation screen.",
    ml + 27,
    y + 6,
  );
  doc.text(
    "The more detail you provide, the more fields our AI can pre-fill for you.",
    ml + 4,
    y + 11,
  );
  y += 22;

  type Field = { label: string; hint: string };

  const renderSection = (
    title: string,
    bg: [number, number, number],
    fg: [number, number, number],
    fields: Field[],
  ) => {
    checkBreak(fields.length * 9 + 18);
    doc.setFillColor(...bg);
    doc.rect(ml, y, cw, 10, "F");
    doc.setTextColor(...fg);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(title, ml + 4, y + 7);
    y += 10;
    fields.forEach((f) => {
      checkBreak(9);
      doc.setDrawColor(226, 232, 240);
      doc.line(ml, y + 8, mr, y + 8);
      doc.setTextColor(51, 65, 85);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.text(f.label, ml + 3, y + 5.5);
      if (f.hint) {
        doc.setTextColor(148, 163, 184);
        doc.setFont("helvetica", "italic");
        doc.text(f.hint, ml + 72, y + 5.5);
      }
      y += 9;
    });
    y += 6;
  };

  renderSection(
    "1 — EVENT OVERVIEW",
    [238, 242, 255],
    [67, 56, 202],
    [
      { label: "Event Name", hint: "e.g. Annual Sales Conference 2026" },
      { label: "Edition / Year & Theme", hint: "e.g. 14th Annual / Accelerating the Future" },
      { label: "Start Date & End Date", hint: "MM/DD/YYYY" },
      { label: "Venue / Location & City", hint: "e.g. Marriott Marquis, New York, NY" },
      { label: "Expected Attendees", hint: "<100 / 100-150 / 200-500 / 500-1000 / 1000+" },
      { label: "Event Format", hint: "In-Person / Hybrid / Virtual" },
      { label: "Event Type", hint: "Conference / Meeting / Gala / Trade Show / Awards Show / Other" },
      { label: "Objectives, Tone & Constraints", hint: "e.g. brand colours, no-go items, audience profile" },
    ],
  );

  renderSection(
    "2 — VENUE SCHEDULE",
    [236, 253, 245],
    [4, 120, 87],
    [
      { label: "Venue Name & Full Address", hint: "e.g. Las Vegas Convention Center, 3150 Paradise Rd" },
      { label: "Venue City & State", hint: "e.g. Las Vegas, NV" },
      { label: "Union Venue", hint: "Yes / No / Not Sure — Union body: e.g. IATSE, Teamsters" },
      { label: "Load-In Date & Time", hint: "MM/DD/YYYY — e.g. 07:00 AM" },
      { label: "Rehearsal Date & Time", hint: "MM/DD/YYYY — e.g. 02:00 PM" },
      { label: "Strike Date & Time", hint: "MM/DD/YYYY — e.g. 08:00 AM" },
      { label: "Number of Event Rooms", hint: "e.g. 3" },
      { label: "Time Zone", hint: "e.g. Pacific Time (PT)" },
    ],
  );

  renderSection(
    "3 — AV REQUIREMENTS & PRODUCTION CREW",
    [224, 242, 254],
    [3, 105, 161],
    [
      { label: "Podium Microphone", hint: "Yes / No — Qty: [#]" },
      { label: "Wireless Microphones", hint: "Yes / No — Qty: [#] — Type: Handheld / Lavalier / Headset" },
      { label: "Large Monitors / Screens", hint: "Yes / No — Qty: [#]" },
      { label: "LED Wall", hint: "Yes / No — Width: [ft] × Height: [ft] — Pixel Pitch: [mm]" },
      { label: "Presentation Laptops", hint: "Yes / No — Qty: [#]" },
      { label: "Video Playback & Cameras", hint: "Yes / No — Camera Qty: [#]" },
      { label: "Stage Lighting", hint: "Stage Wash / Uplighting / Audience / Follow Spots" },
      { label: "Confidence Monitors & Speaker Timer", hint: "Yes / No — Qty: [#]" },
      { label: "Teleprompter", hint: "Yes / No — Bilingual: Yes / No — Languages: [e.g. English, Spanish]" },
      { label: "Audience Q&A Method", hint: "Via an App / Passing a Microphone / Both" },
      { label: "Scenic / Stage Design", hint: "Yes / No — any notes on style or brand" },
      { label: "Union Labor", hint: "Yes / No / Not Sure" },
      { label: "Crew Roles Needed", hint: "A1 / A2 / V1 / V2 / TD / L1 / Graphics Op / Camera Op / Showcaller / Producer / etc." },
    ],
  );

  renderSection(
    "4 — HYBRID & VIRTUAL  (Hybrid / Virtual events only)",
    [245, 243, 255],
    [91, 33, 182],
    [
      { label: "Virtual Attendee Estimate", hint: "e.g. 2500" },
      { label: "Streaming Platform", hint: "Zoom / Teams / Hopin / vMix / StreamYard / Webex / Other" },
      { label: "Platform Integration with AV", hint: "Yes / No" },
      { label: "Stream Ownership", hint: "Client / AV Vendor / TBD" },
      { label: "Remote Speakers", hint: "Yes / No — How Many: [#] — Platform: [e.g. Zoom Webinar]" },
      { label: "Tech Rehearsal Owner", hint: "Client / AV Vendor" },
      { label: "Live Virtual Q&A & Breakouts", hint: "Yes / No" },
      { label: "Dedicated Virtual Producer", hint: "Yes / No" },
      { label: "Closed Captions", hint: "Yes / No — Languages: [e.g. English, French] — Type: AI / Human" },
      { label: "On-Demand Recording", hint: "Yes / No" },
      { label: "Sponsor Overlays & Virtual Networking", hint: "Yes / No" },
    ],
  );

  renderSection(
    "5 — CONTENT & CREATIVE",
    [255, 241, 242],
    [159, 18, 57],
    [
      { label: "Content Services Needed", hint: "Yes / No" },
      { label: "Presentation Template Design", hint: "Client / AV Vendor / TBD / N/A" },
      { label: "Speaker Slide Collection", hint: "Client / AV Vendor / TBD / N/A" },
      { label: "Motion Graphics / Opener Video", hint: "Client / AV Vendor / TBD / N/A" },
      { label: "Lower Thirds & Name Supers", hint: "Client / AV Vendor / TBD / N/A" },
      { label: "Sizzle / Recap Video", hint: "Client / AV Vendor / TBD / N/A" },
      { label: "Sponsor Recognition & Social Content", hint: "Client / AV Vendor / TBD / N/A" },
      { label: "Live Data Feeds", hint: "Yes / No — Ownership: Client / AV Vendor / TBD" },
      { label: "Creative Direction Notes", hint: "Theme, colour palette, style references, brand constraints" },
    ],
  );

  renderSection(
    "6 — VIDEO RECORDING",
    [255, 247, 237],
    [154, 52, 18],
    [
      { label: "Video Recording Required", hint: "Yes / No" },
      { label: "Number of Cameras", hint: "e.g. 4" },
      { label: "Camera Positions", hint: "Stage Wide / Speaker Close-Up / Audience Reaction / Roaming / etc." },
      { label: "IMAG Required", hint: "Yes / No" },
      { label: "Camera Operators & ISO Recordings", hint: "e.g. 4 operators — All cameras ISO" },
      { label: "Recording Resolution & Media", hint: "e.g. 4K — SSD / NVMe" },
      { label: "Edited Deliverable", hint: "Yes / No — Type: Highlight Reel / Full Edit / Speaker Cuts" },
      { label: "Turnaround Time & Reel Length", hint: "e.g. 5 Business Days — 2-3 min highlight" },
      { label: "Raw Footage Turnover", hint: "Yes / No" },
      { label: "Deliverable Format & Delivery Method", hint: "e.g. H.264 MP4 — WeTransfer / Hard Drive" },
    ],
  );

  renderSection(
    "7 — VENUE TECHNICAL",
    [255, 251, 235],
    [194, 65, 12],
    [
      { label: "Venue AV Contact Name, Phone & Email", hint: "In-house AV contact at the venue" },
      { label: "In-House AV Company", hint: "e.g. PSAV / Encore" },
      { label: "Rigging Required", hint: "Yes / No — Max weight/point: [lbs] — Points: [#]" },
      { label: "Power Drops Required", hint: "Yes / No — Amperage: 100A / 200A / 400A — Qty: [#]" },
      { label: "Wireless Internet & Use Cases", hint: "Yes / No — e.g. Livestream, Remote Speakers, Signage" },
      { label: "COI / Insurance Requirements", hint: "e.g. $2M general liability, certificate 30 days prior" },
      { label: "Venue Access Requirements", hint: "e.g. Union dock, check-in procedure, access hours" },
    ],
  );

  renderSection(
    "8 — BUDGET & PREFERENCES",
    [254, 252, 232],
    [161, 98, 7],
    [
      { label: "Estimated AV Budget", hint: "Essential / Standard / Production / Premium / Enterprise / Signature" },
      { label: "Preferred Proposal Format", hint: "Gear Itemization / Labor Breakdown / Package Pricing / Summary Only" },
      { label: "Timeline for Proposal", hint: "Within 24 Hours / Within 3 Business Days / 1 Week / 2 Weeks / Flexible" },
      { label: "Decision Date", hint: "MM/DD/YYYY" },
      { label: "Competitive Bid & Number of Proposals", hint: "Yes / No — e.g. 3 vendors" },
      { label: "Evaluation Matrix Weights", hint: "Technical / Crew / Hybrid / Pricing / Creative / Responsiveness / DEI — must total 100%" },
      { label: "Call with DXG Producer", hint: "Yes / No" },
      { label: "How Did You Hear About Us", hint: "Referral / Venue / Google / Social Media / LinkedIn / Other" },
    ],
  );

  renderSection(
    "9 — CONTACT INFORMATION",
    [253, 242, 248],
    [157, 23, 77],
    [
      { label: "First Name & Last Name", hint: "" },
      { label: "Job Title", hint: "" },
      { label: "Organization (Display Name)", hint: "e.g. Apex Dynamics" },
      { label: "Organization Legal Name", hint: "e.g. Apex Dynamics International LLC" },
      { label: "Email Address", hint: "" },
      { label: "Phone & Extension", hint: "Type: Mobile / Direct / Office Main" },
      { label: "Preferred Contact Method & Best Time", hint: "Email / Phone / Either — e.g. Weekdays 9-5 PT" },
      { label: "Additional Notes", hint: "Anything else the vendor should know" },
    ],
  );

  // Footer on every page
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFillColor(248, 250, 252);
    doc.rect(0, pageH - 12, pageW, 12, "F");
    doc.setTextColor(148, 163, 184);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text("DXG RFP Sample Template — goprospero.com", ml, pageH - 4);
    doc.text(`Page ${i} of ${total}`, mr, pageH - 4, { align: "right" });
  }

  doc.save("DXG-RFP-Sample-Template.pdf");
}

function GuideModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
    >
      <div
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.5)",
          backdropFilter: "blur(4px)",
        }}
      />
      <div
        style={{
          position: "relative",
          zIndex: 10,
          width: "100%",
          maxWidth: "720px",
          borderRadius: "16px",
          background: "white",
          boxShadow: "0 25px 60px rgba(0,0,0,0.25)",
          overflow: "hidden",
        }}
      >
        {/* Gradient header */}
        <div
          className="px-6 py-5"
          style={{ background: "linear-gradient(135deg, #00c2c9 0%, #06b6d4 30%, #0ea5e9 60%, #2563eb 100%)" }}
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <HelpCircle className="h-5 w-5 text-white/90" />
                <h2 className="text-base font-bold text-white">
                  How to prepare your document
                </h2>
              </div>
              <p className="text-sm text-white/70">
                Our AI reads your file and pre-fills all 9 form steps — the more detail you include, the more fields get filled.
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-full p-1.5 text-white/60 transition-colors hover:bg-white/20 hover:text-white"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div
          style={{ maxHeight: "60vh", overflowY: "auto" }}
          className="px-6 py-5 space-y-5"
        >
          {/* Accepted types */}
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-slate-400">
              Accepted file types
            </p>
            <div className="flex flex-wrap gap-2">
              {ACCEPTED_TYPES.map(({ ext, color }) => (
                <span
                  key={ext}
                  className={`rounded-lg border px-3 py-1 text-xs font-bold ${color}`}
                >
                  {ext}
                </span>
              ))}
            </div>
          </div>

          {/* Field groups */}
          <div>
            <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-slate-400">
              Include these fields for best results
            </p>
            <div className="space-y-2">
              {FIELD_GROUPS.map(({ label, color, fields }) => (
                <div
                  key={label}
                  className={`rounded-xl border-l-4 px-4 py-3 ${color}`}
                >
                  <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide opacity-70">
                    {label}
                  </p>
                  <ul className="space-y-1">
                    {fields.map((f) => (
                      <li
                        key={f}
                        className="flex items-center gap-2 text-sm opacity-90"
                      >
                        <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Tip */}
          <div
            className="rounded-xl border border-amber-200 px-4 py-3"
            style={{
              background: "linear-gradient(to right, #fffbeb, #fff7ed)",
            }}
          >
            <p className="text-sm text-amber-800">
              <span className="font-bold">💡 Tip:</span> The more detail your
              document contains, the more fields we can pre-fill — saving your
              time on the form.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-6 py-4">
          <button
            onClick={downloadSamplePdf}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-100"
          >
            <Download size={15} className="text-[#00c2c9]" />
            Download Sample (PDF)
          </button>
          <button
            onClick={onClose}
            className="rounded-xl px-5 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #00c2c9 0%, #06b6d4 30%, #0ea5e9 60%, #2563eb 100%)" }}
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AddProposalUpload({
  selectedFile,
  setSelectedFile,
  isExtracting = false,
  onContinueWithUpload,
  onContinueWithoutUpload,
}: AddProposalUploadProps) {
  const [showGuide, setShowGuide] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleRemoveFile = () => setSelectedFile(null);

  return (
    <>
      {showGuide && <GuideModal onClose={() => setShowGuide(false)} />}

      <div className="mt-10 flex justify-center pb-16">
        <div className="w-full">
          <div
            className="mb-5 flex w-full items-center justify-between gap-4 rounded-xl px-5 py-4"
            style={{
              background: "linear-gradient(135deg, #00c2c9 0%, #06b6d4 30%, #0ea5e9 60%, #2563eb 100%)",
              boxShadow: "0 4px 20px rgba(14,165,233,0.25)",
            }}
          >
            <div className="flex items-start gap-3">
              <div
                className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                style={{ background: "rgba(255,255,255,0.2)" }}
              >
                <HelpCircle size={16} className="text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Quick guide</h3>
                <p className="mt-0.5 text-xs leading-5 text-white/80">
                  Upload any file and our AI pre-fills all 9 steps — event, venue
                  schedule, AV, hybrid/virtual, content, video recording,
                  technical, budget &amp; contact.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowGuide(true)}
              className="flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-[#00c2c9] shadow-sm transition-all hover:scale-105"
              style={{ background: "rgba(255,255,255,0.92)" }}
            >
              <HelpCircle size={12} />
              What to include?
            </button>
          </div>

          <div className="w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-slate-900">
                Upload a file to start
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Upload is optional. You can also continue without a file.
              </p>
            </div>

            <div className="mt-8 rounded-2xl border-2 border-dashed border-sky-300 bg-sky-50/40 px-6 py-24 text-center">
              <p className="text-sm font-semibold text-slate-700">
                PDF, DOC, DOCX, CSV
              </p>
              <label className="mt-5 inline-flex cursor-pointer rounded-xl bg-[#00c2c9] px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-[#009198]">
                Browse File
                <input
                  type="file"
                  className="hidden"
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx,.csv"
                />
              </label>
            </div>

            {selectedFile && (
              <div className="mx-auto mt-6 flex w-full max-w-xl items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-600">
                    <FileText size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  className="rounded-full p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-500"
                >
                  <X size={16} />
                </button>
              </div>
            )}

            <div className="mx-auto mt-8 flex w-full max-w-xl flex-col gap-3">
              {selectedFile ? (
                <button
                  type="button"
                  onClick={onContinueWithUpload}
                  disabled={isExtracting}
                  className="mx-auto w-full max-w-[200px] rounded-xl bg-[#00c2c9] px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-[#009198] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isExtracting ? "Reading document..." : "Continue"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onContinueWithoutUpload}
                  className="mx-auto w-full max-w-[200px] rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
                >
                  Continue without upload
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
