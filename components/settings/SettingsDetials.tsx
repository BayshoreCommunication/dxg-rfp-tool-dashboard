"use client";
import {
  getSettingsAction,
  updateSettingsAction,
} from "@/app/actions/settings";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import BrandingSettings from "./BrandingSettings";
import ProposalsSettings from "./ProposalsSettings";
import SignaturesSettings from "./SignaturesSettings";
import TopHeader from "./TopHeaser";

export type BrandingSettingsForm = {
  brandName: string;
  linkPrefix: string;
  defaultFont: string;
  signatureColor: string;
  logoFile: string | null;
};

export type ProposalsSettingsForm = {
  proposalLanguage: string;
  defaultCurrency: string;
  expiryDate: string;
  priceSeparator: string;
  dateFormat: string;
  decimalPrecision: string;
  contacts: {
    email: { enabled: boolean; value: string };
    call: { enabled: boolean; value: string };
  };
  downloadPreview: string;
  teammateEmail: string;
};

export type SignaturesSettingsForm = {
  signatureType: string;       // "Upload" | "Draw"
  signatureImageUrl: string;   // used when type = "Upload" (base64 or remote URL)
  signatureText: string;       // used when type = "Draw" (typed name)
  signatureStyle: string;      // used when type = "Draw" (font family)
};

export type SettingsForm = {
  branding: BrandingSettingsForm;
  proposals: ProposalsSettingsForm;
  signatures: SignaturesSettingsForm;
};

const SettingsDetials = () => {
  const defaultSettings = useMemo<SettingsForm>(
    () => ({
      branding: {
        brandName: "",
        linkPrefix: "",
        defaultFont: "Poppins",
        signatureColor: "#2DC6F5",
        logoFile: null,
      },
      proposals: {
        proposalLanguage: "English",
        defaultCurrency: "$",
        expiryDate: "None",
        priceSeparator: "NONE",
        dateFormat: "MM/DD/YYYY",
        decimalPrecision: "2",
        contacts: {
          email: { enabled: true, value: "" },
          call: { enabled: false, value: "" },
        },
        downloadPreview: "Yes",
        teammateEmail: "",
      },
      signatures: {
        signatureType: "Upload",
        signatureImageUrl: "",
        signatureText: "",
        signatureStyle: "",
      },
    }),
    [],
  );

  const [settingForms, setSettingForms] =
    useState<SettingsForm>(defaultSettings);
  const [logoUploadFile, setLogoUploadFile] = useState<File | null>(null);
  const [persistedLogoUrl, setPersistedLogoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      const res = await getSettingsAction();
      if (!mounted) return;
      if (res.success && res.data) {
        const data = res.data as Partial<SettingsForm>;
        setPersistedLogoUrl(data.branding?.logoFile || null);
        setSettingForms({
          branding: { ...defaultSettings.branding, ...data.branding },
          proposals: {
            ...defaultSettings.proposals,
            ...data.proposals,
            contacts: {
              ...defaultSettings.proposals.contacts,
              ...(data.proposals?.contacts || {}),
            },
          },
          signatures: { ...defaultSettings.signatures, ...data.signatures },
        });
      }
      setLoading(false);
    };
    load();
    return () => {
      mounted = false;
    };
  }, [defaultSettings]);

  const handleUpdate = async () => {
    setSaving(true);
    const payload: SettingsForm = {
      ...settingForms,
      branding: {
        ...settingForms.branding,
      },
    };

    // Never persist local preview URLs from browser into DB.
    if (
      typeof payload.branding.logoFile === "string" &&
      payload.branding.logoFile.startsWith("blob:")
    ) {
      payload.branding.logoFile = persistedLogoUrl;
    }

    const res = await updateSettingsAction(payload, logoUploadFile);
    if (res.success && res.data) {
      const data = res.data as SettingsForm;
      setSettingForms(data);
      setPersistedLogoUrl(data.branding?.logoFile || null);
      setLogoUploadFile(null);
      toast.success("Settings updated successfully.");
    } else {
      toast.error(res.message || "Update failed.");
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6 px-6">
      <TopHeader />

      {loading ? (
        <SettingsSectionSkeleton />
      ) : (
        <>
          <BrandingSettings
            value={settingForms.branding}
            onChange={(next) =>
              setSettingForms((prev) => ({ ...prev, branding: next }))
            }
            onLogoFileSelected={setLogoUploadFile}
          />
          <ProposalsSettings
            value={settingForms.proposals}
            onChange={(next) =>
              setSettingForms((prev) => ({ ...prev, proposals: next }))
            }
          />
          <SignaturesSettings
            value={settingForms.signatures}
            onChange={(next) =>
              setSettingForms((prev) => ({ ...prev, signatures: next }))
            }
          />
        </>
      )}

      <div className="mb-8 flex items-center gap-3">
        <button
          onClick={handleUpdate}
          disabled={saving || loading}
          className="group relative flex items-center gap-2 overflow-hidden rounded-md bg-gradient-to-br from-[#2dc6f5] to-[#0ea5e9] px-5 py-2.5 text-[13px] font-bold uppercase tracking-widest text-white shadow-[0_4px_20px_rgba(45,198,245,0.40)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_28px_rgba(45,198,245,0.50)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-70"
        >
          <span className="pointer-events-none absolute inset-0 -translate-x-full bg-white/15 skew-x-[-20deg] transition-transform duration-500 group-hover:translate-x-full" />
          {saving ? "Updating..." : "Update Settings"}
        </button>
      </div>
    </div>
  );
};

const SettingsSectionSkeleton = () => {
  return (
    <div className="space-y-6">
      <div className="rounded-md border border-[#d7dce3] bg-white px-5 py-6 md:px-8">
        <div className="h-7 w-52 animate-pulse rounded bg-slate-100" />
        <div className="mt-3 h-4 w-80 max-w-full animate-pulse rounded bg-slate-100" />
        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={`branding-skeleton-${idx}`}>
              <div className="h-3 w-36 animate-pulse rounded bg-slate-100" />
              <div className="mt-2 h-10 w-full animate-pulse rounded-md bg-slate-100" />
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-md border border-[#d7dce3] bg-white px-5 py-6 md:px-8">
        <div className="h-7 w-52 animate-pulse rounded bg-slate-100" />
        <div className="mt-3 h-4 w-[28rem] max-w-full animate-pulse rounded bg-slate-100" />
        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
          {Array.from({ length: 10 }).map((_, idx) => (
            <div key={`proposal-skeleton-${idx}`}>
              <div className="h-3 w-40 animate-pulse rounded bg-slate-100" />
              <div className="mt-2 h-10 w-full animate-pulse rounded-md bg-slate-100" />
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-md border border-[#d7dce3] bg-white px-5 py-6 md:px-8">
        <div className="h-7 w-40 animate-pulse rounded bg-slate-100" />
        <div className="mt-3 h-4 w-96 max-w-full animate-pulse rounded bg-slate-100" />
        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <div className="h-3 w-44 animate-pulse rounded bg-slate-100" />
            <div className="mt-2 h-10 w-full animate-pulse rounded-md bg-slate-100" />
          </div>
          <div>
            <div className="h-3 w-52 animate-pulse rounded bg-slate-100" />
            <div className="mt-2 h-10 w-full animate-pulse rounded-md bg-slate-100" />
          </div>
          <div>
            <div className="h-[160px] w-full animate-pulse rounded-md bg-slate-100" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsDetials;
