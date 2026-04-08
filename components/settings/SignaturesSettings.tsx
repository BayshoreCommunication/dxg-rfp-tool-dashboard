"use client";

import { ChevronDown, Trash2, Upload } from "lucide-react";
import { Dancing_Script, Great_Vibes, Pacifico } from "next/font/google";
import { useCallback, useEffect, useRef, useState } from "react";
import type { SignaturesSettingsForm } from "./SettingsDetials";

const labelClass =
  "mb-2 flex items-center justify-between text-sm font-semibold text-[#8f98bf]";
const inputClass =
  "h-10 w-full rounded-md border border-[#d7dce3] bg-white px-3 text-sm text-[#1f2d5d] outline-none focus:border-primary focus:ring-1 focus:ring-primary/20";

const dancingScript = Dancing_Script({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

const pacifico = Pacifico({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

const greatVibes = Great_Vibes({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

/* Signature cursive fonts */
const SIGN_FONTS = [
  {
    label: "Brush Script",
    family: '"Brush Script MT", "Segoe Script", cursive',
    className: "",
  },
  {
    label: "Dancing Script",
    family: '"Dancing Script", cursive',
    className: dancingScript.className,
  },
  {
    label: "Pacifico",
    family: '"Pacifico", cursive',
    className: pacifico.className,
  },
  {
    label: "Great Vibes",
    family: '"Great Vibes", cursive',
    className: greatVibes.className,
  },
];

const InfoDot = () => (
  <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#7b7ec8] text-[10px] font-bold text-white">
    i
  </span>
);

const SelectCaret = () => (
  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-primary">
    <ChevronDown size={18} />
  </span>
);

type SignaturesSettingsProps = {
  value: SignaturesSettingsForm;
  onChange: (next: SignaturesSettingsForm) => void;
};

const SignaturesSettings = ({ value, onChange }: SignaturesSettingsProps) => {
  const mode = value.signatureType; // "Upload" | "Draw"

  /* ── Upload ────────────────────────────────────────────────── */
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      onChange({ ...value, signatureImageUrl: e.target?.result as string });
    };
    reader.readAsDataURL(file);
  };

  /* ── Draw (typed name → cursive) ──────────────────────────── */
  // Resolve chosen font index from saved signatureStyle
  const resolveFont = (style: string) => {
    const idx = SIGN_FONTS.findIndex((f) => f.family === style);
    return idx >= 0 ? idx : 0;
  };
  const [chosenFontIdx, setChosenFontIdx] = useState(() => resolveFont(value.signatureStyle));

  const generateSignature = useCallback(
    (name: string, fontIdx: number) => {
      const fontFamily = SIGN_FONTS[fontIdx].family;
      onChange({ ...value, signatureText: name, signatureStyle: fontFamily });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [value],
  );

  const handleTypedNameChange = (name: string) => {
    generateSignature(name, chosenFontIdx);
  };

  const handleFontChange = (idx: number) => {
    setChosenFontIdx(idx);
    generateSignature(value.signatureText, idx);
  };

  // Keep font index in sync if style changes externally
  useEffect(() => {
    setChosenFontIdx(resolveFont(value.signatureStyle));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.signatureStyle]);

  /* ── Render ───────────────────────────────────────────────── */
  return (
    <section className="rounded-md border border-[#d7dce3] bg-white px-5 py-6 md:px-8">
      <h2 className="text-xl font-semibold leading-none text-[#0f1b57] md:text-[26px]">
        Signatures
      </h2>
      <p className="mt-2 text-base leading-tight text-[#1f2d5d] md:text-[16px]">
        Define your default signature style and select signing options for
        prospects.
      </p>

      <div className="mt-8 grid grid-cols-1 items-start gap-x-9 gap-y-6 md:grid-cols-2">
        {/* ── Type selector ─────────────────────────────────────── */}
        <div>
          <label htmlFor="signatureType" className={labelClass}>
            <span>Your Signature Type</span>
            <InfoDot />
          </label>
          <div className="relative">
            <select
              id="signatureType"
              value={value.signatureType}
              onChange={(e) =>
                onChange({
                  ...value,
                  signatureType: e.target.value,
                  signatureImageUrl: "",
                  signatureText: "",
                  signatureStyle: "",
                })
              }
              className={inputClass + " appearance-none pr-8"}
            >
              <option>Upload</option>
              <option>Draw</option>
            </select>
            <SelectCaret />
          </div>
        </div>

        {/* ── Mode-specific panel (right column, 50%) ────────────── */}
        <div>
          {/* ───── UPLOAD ──────────────────────────────────────── */}
          {mode === "Upload" && (
            <div className="space-y-4">
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  const file = e.dataTransfer.files[0];
                  if (file) handleFileSelect(file);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 transition-all ${
                  dragOver
                    ? "border-primary bg-primary/5"
                    : "border-[#d7dce3] bg-[#fafbfc] hover:border-primary/60 hover:bg-primary/[0.03]"
                }`}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Upload size={22} />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-[#1f2d5d]">
                    Click to upload or drag &amp; drop
                  </p>
                  <p className="mt-1 text-xs text-[#8f98bf]">
                    PNG, JPG, SVG — transparent background recommended
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file);
                  }}
                />
              </div>

              {/* Preview */}
              {value.signatureImageUrl && (
                <div className="relative flex items-center justify-center rounded-xl border border-[#d7dce3] bg-[#f7f8fa] p-6">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={value.signatureImageUrl}
                    alt="Uploaded signature"
                    className="max-h-[120px] object-contain"
                  />
                  <button
                    type="button"
                    onClick={() => onChange({ ...value, signatureImageUrl: "" })}
                    className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-red-50 text-red-400 transition hover:bg-red-100 hover:text-red-600"
                    aria-label="Remove signature"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ───── DRAW (type → auto cursive) ──────────────────── */}
          {mode === "Draw" && (
            <div className="space-y-4 rounded-xl border border-[#d7dce3] bg-[#fafbfc] p-5">
              <div>
                <label className="mb-2 block text-sm font-semibold text-[#8f98bf]">
                  Type your name to generate a digital signature
                </label>
                <input
                  type="text"
                  placeholder="e.g. John Smith"
                  value={value.signatureText}
                  onChange={(e) => handleTypedNameChange(e.target.value)}
                  className={inputClass + " bg-white"}
                />
              </div>

              {/* Font picker — saves chosen family as signatureStyle */}
              <div className="flex flex-wrap gap-2">
                {SIGN_FONTS.map((font, idx) => (
                  <button
                    key={font.label}
                    type="button"
                    onClick={() => handleFontChange(idx)}
                    className={`${font.className} rounded-full border px-3 py-1 text-xs font-semibold transition ${
                      chosenFontIdx === idx
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-[#d7dce3] text-[#8f98bf] hover:border-primary/50 hover:text-primary"
                    }`}
                    style={{ fontFamily: font.family }}
                  >
                    {font.label}
                  </button>
                ))}
              </div>

              {/* Live preview */}
              <div className="flex min-h-[140px] items-center justify-center rounded-xl border border-dashed border-[#d7dce3] bg-white px-6 py-4">
                {value.signatureText.trim() ? (
                  <span
                    className={`${SIGN_FONTS[chosenFontIdx]?.className || ""} select-none text-[52px] leading-none text-[#1f2d5d]`}
                    style={{
                      fontFamily: value.signatureStyle || SIGN_FONTS[chosenFontIdx].family,
                    }}
                  >
                    {value.signatureText}
                  </span>
                ) : (
                  <span className="text-sm text-[#c3c9d8]">
                    Your signature preview will appear here as you type
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default SignaturesSettings;
