"use client";

import { ChevronDown } from "lucide-react";
import Image from "next/image";
import { ChangeEvent, useEffect, useRef, useState } from "react";

const isHexColor = (value: string) => /^#([0-9A-Fa-f]{6})$/.test(value);

const labelClass = "mb-2 block text-sm font-semibold text-[#8f98bf]";
const inputClass =
  "h-10 w-full rounded-md border border-[#d7dce3] bg-white px-3 text-sm text-[#1f2d5d] outline-none focus:border-primary focus:ring-1 focus:ring-primary/20";

const BrandingSettings = () => {
  const [logoFile, setLogoFile] = useState<string | null>(null);
  const [signatureColor, setSignatureColor] = useState("#2DC6F5");
  const [buttonTextColor, setButtonTextColor] = useState("#FFFFFF");

  const logoInputRef = useRef<HTMLInputElement>(null);
  const signaturePickerRef = useRef<HTMLInputElement>(null);
  const textPickerRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (logoFile) {
        URL.revokeObjectURL(logoFile);
      }
    };
  }, [logoFile]);

  const handleLogoUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (logoFile) {
      URL.revokeObjectURL(logoFile);
    }
    setLogoFile(URL.createObjectURL(file));
  };

  const handleHexChange = (
    value: string,
    setter: (nextValue: string) => void,
    fallback: string,
  ) => {
    const upper = value.toUpperCase();
    if (isHexColor(upper)) {
      setter(upper);
      return;
    }
    if (upper.length === 7) {
      setter(fallback);
    }
  };

  return (
    <section className="rounded-md border border-[#d7dce3] bg-white px-5 py-6 md:px-8">
      <h2 className="md:text-[26px] font-semibold leading-none text-[#0f1b57]">
        Branding
      </h2>

      <div className="mt-8">
        <p className={labelClass}>Company Logo</p>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => logoInputRef.current?.click()}
            className="flex h-[104px] w-[104px] items-center justify-center overflow-hidden rounded-md border border-[#d7dce3] bg-[#e8ebf0] text-[#c7ccd6] hover:border-primary/50"
            aria-label="Upload company logo"
          >
            {logoFile ? (
              <Image
                src={logoFile}
                alt="Company logo preview"
                className="h-full w-full object-cover"
                width={104}
                height={104}
                priority
              />
            ) : (
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <circle cx="12" cy="8" r="3.2" fill="currentColor" />
                <path
                  d="M5 18.5C5 15.8 8.1 14 12 14C15.9 14 19 15.8 19 18.5V20H5V18.5Z"
                  fill="currentColor"
                />
              </svg>
            )}
          </button>

          <button
            type="button"
            onClick={() => logoInputRef.current?.click()}
            className="rounded-md border border-[#d7dce3] bg-white px-4 py-2 text-sm font-semibold text-[#0f1b57] hover:bg-[#f4f7ff]"
          >
            {logoFile ? "Change" : "Upload"}
          </button>

          <input
            ref={logoInputRef}
            type="file"
            accept="image/*"
            onChange={handleLogoUpload}
            className="hidden"
          />
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-x-7 gap-y-6 md:grid-cols-2">
        <div>
          <label htmlFor="brandName" className={labelClass}>
            Brand Name<span className="text-[#ef5f79]">*</span>
          </label>
          <input id="brandName" defaultValue="Abuco" className={inputClass} />
        </div>

        <div>
          <label htmlFor="linkPrefix" className={labelClass}>
            Proposal Link Prefix
          </label>
          <div className="flex h-10 overflow-hidden rounded-md border border-[#d7dce3] bg-white focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20">
            <input
              id="linkPrefix"
              defaultValue="abuco"
              className="w-full px-3 text-sm text-[#1f2d5d] outline-none"
            />
            <span className="flex items-center border-l border-[#d7dce3] bg-[#f9fafc] px-3 text-xs font-medium text-[#1f2d5d]">
              .goprospero.com
            </span>
          </div>
        </div>

        <div>
          <label htmlFor="defaultFont" className={labelClass}>
            Default Proposal Font
          </label>
          <div className="relative">
            <select
              id="defaultFont"
              defaultValue="Poppins"
              className={inputClass + " appearance-none pr-8"}
            >
              <option>Poppins</option>
              <option>Inter</option>
              <option>Roboto</option>
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-primary">
              <ChevronDown size={20} />
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="signatureColor" className={labelClass}>
              Signature Button Color
            </label>
            <div className="flex h-10 items-center gap-2 rounded-md border border-[#d7dce3] bg-white px-2 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20">
              <button
                type="button"
                onClick={() => signaturePickerRef.current?.click()}
                className="h-6 w-6 rounded-sm border border-[#ccd3df]"
                style={{ backgroundColor: signatureColor }}
                aria-label="Select signature button color"
              />
              <input
                id="signatureColor"
                value={signatureColor}
                onChange={(e) =>
                  handleHexChange(e.target.value, setSignatureColor, "#2DC6F5")
                }
                className="w-full text-sm font-medium text-[#1f2d5d] outline-none"
              />
            </div>
            <input
              ref={signaturePickerRef}
              type="color"
              value={signatureColor}
              onChange={(e) => setSignatureColor(e.target.value.toUpperCase())}
              className="sr-only"
              tabIndex={-1}
              aria-hidden="true"
            />
          </div>

          <div>
            <label htmlFor="buttonTextColor" className={labelClass}>
              Button Text Color
            </label>
            <div className="flex h-10 items-center gap-2 rounded-md border border-[#d7dce3] bg-white px-2 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20">
              <button
                type="button"
                onClick={() => textPickerRef.current?.click()}
                className="h-6 w-6 rounded-sm border border-[#ccd3df] bg-white"
                style={{ backgroundColor: buttonTextColor }}
                aria-label="Select button text color"
              />
              <input
                id="buttonTextColor"
                value={buttonTextColor}
                onChange={(e) =>
                  handleHexChange(e.target.value, setButtonTextColor, "#FFFFFF")
                }
                className="w-full text-sm font-medium text-[#1f2d5d] outline-none"
              />
            </div>
            <input
              ref={textPickerRef}
              type="color"
              value={buttonTextColor}
              onChange={(e) => setButtonTextColor(e.target.value.toUpperCase())}
              className="sr-only"
              tabIndex={-1}
              aria-hidden="true"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default BrandingSettings;
