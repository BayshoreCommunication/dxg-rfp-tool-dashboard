"use client";

import { updateNotificationPreferencesAction } from "@/app/actions/notification";
import ToastMessage from "@/components/ui/ToastMessage";
import {
  normalizeNotificationPreferences,
  type NotificationDeliveryPreference,
  type NotificationFrequency,
  type NotificationPreferenceKey,
  type NotificationPreferences,
} from "@/lib/notifications/preferences";
import {
  ArrowLeft,
  BellOff,
  BellRing,
  CalendarClock,
  Check,
  Clock3,
  Eye,
  Mail,
  Megaphone,
  MessageSquareMore,
  Monitor,
  Save,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { toast } from "react-toastify";

type NotificationSettingsProps = {
  initialPreferences: NotificationPreferences;
  loadError?: string;
};

type Channel = "inApp" | "email";

type PreferenceDefinition = {
  key: NotificationPreferenceKey;
  title: string;
  description: string;
  icon: LucideIcon;
  channels: Channel[];
  frequencies: NotificationFrequency[];
};

type PreferenceGroup = {
  title: string;
  description: string;
  items: PreferenceDefinition[];
};

const FREQUENCY_LABELS: Record<NotificationFrequency, string> = {
  immediate: "Immediately",
  daily: "Daily digest",
  weekly: "Weekly summary",
};

const subscribeToHydration = () => () => undefined;

const PREFERENCE_GROUPS: PreferenceGroup[] = [
  {
    title: "Proposal activity",
    description: "Views and lifecycle updates for proposals you own.",
    items: [
      {
        key: "proposalViews",
        title: "Proposal views",
        description: "When a vendor or stakeholder opens a published proposal.",
        icon: Eye,
        channels: ["inApp"],
        frequencies: ["immediate", "daily", "weekly"],
      },
      {
        key: "proposalDeadlines",
        title: "Deadlines and expiry",
        description: "Reminders when a proposal approaches expiry or has expired.",
        icon: CalendarClock,
        channels: ["inApp", "email"],
        frequencies: ["immediate", "daily"],
      },
    ],
  },
  {
    title: "Vendor activity",
    description: "Updates that may require a timely response from your team.",
    items: [
      {
        key: "vendorResponses",
        title: "New vendor responses",
        description: "When a vendor submits or updates a proposal response.",
        icon: MessageSquareMore,
        channels: ["inApp", "email"],
        frequencies: ["immediate", "daily"],
      },
    ],
  },
  {
    title: "Account and product",
    description: "Important account notices and occasional product communication.",
    items: [
      {
        key: "securityAlerts",
        title: "Security alerts",
        description: "Important sign-in, account, and security-related activity.",
        icon: ShieldCheck,
        channels: ["email"],
        frequencies: ["immediate"],
      },
      {
        key: "productUpdates",
        title: "Product updates",
        description: "New features, workflow improvements, and service announcements.",
        icon: Megaphone,
        channels: ["inApp", "email"],
        frequencies: ["weekly"],
      },
    ],
  },
];

const constrainPreferencesToAvailableOptions = (
  value: NotificationPreferences,
): NotificationPreferences => {
  const constrained = normalizeNotificationPreferences(value);

  for (const group of PREFERENCE_GROUPS) {
    for (const item of group.items) {
      constrained[item.key] = {
        ...constrained[item.key],
        inApp: item.channels.includes("inApp") ? constrained[item.key].inApp : false,
        email: item.channels.includes("email") ? constrained[item.key].email : false,
        frequency: item.frequencies.includes(constrained[item.key].frequency)
          ? constrained[item.key].frequency
          : item.frequencies[0],
      };
    }
  }

  return constrained;
};

const ChannelSwitch = ({
  channel,
  title,
  checked,
  onChange,
}: {
  channel: Channel;
  title: string;
  checked: boolean;
  onChange: () => void;
}) => {
  const label = channel === "inApp" ? "In-app" : "Email";
  const Icon = channel === "inApp" ? Monitor : Mail;
  return (
    <div className="min-w-[116px]">
      <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">
        <Icon size={13} aria-hidden="true" /> {label}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={`${label} notifications for ${title}`}
        onClick={onChange}
        className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#008ad2] focus-visible:ring-offset-2 ${
          checked
            ? "border-[#008ad2] bg-[#008ad2]"
            : "border-slate-300 bg-slate-200"
        }`}
      >
        <span
          className={`grid h-5 w-5 place-items-center rounded-full bg-white text-[#008ad2] shadow-sm transition-transform ${
            checked ? "translate-x-[22px]" : "translate-x-[3px]"
          }`}
        >
          {checked ? <Check size={12} strokeWidth={3} aria-hidden="true" /> : null}
        </span>
      </button>
    </div>
  );
};

const muteUntilFor = (duration: "hour" | "tomorrow" | "week"): string => {
  const date = new Date();
  if (duration === "hour") date.setHours(date.getHours() + 1);
  if (duration === "tomorrow") {
    date.setDate(date.getDate() + 1);
    date.setHours(8, 0, 0, 0);
  }
  if (duration === "week") date.setDate(date.getDate() + 7);
  return date.toISOString();
};

export default function NotificationSettings({
  initialPreferences,
  loadError,
}: NotificationSettingsProps) {
  const normalizedInitial = useMemo(
    () => constrainPreferencesToAvailableOptions(initialPreferences),
    [initialPreferences],
  );
  const [preferences, setPreferences] = useState(normalizedInitial);
  const [savedPreferences, setSavedPreferences] = useState(normalizedInitial);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  );

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const isDirty = JSON.stringify(preferences) !== JSON.stringify(savedPreferences);
  const mutedUntilTime = preferences.mutedUntil ? Date.parse(preferences.mutedUntil) : Number.NaN;
  const isMuted = Number.isFinite(mutedUntilTime) && mutedUntilTime > now;

  const updatePreference = (
    key: NotificationPreferenceKey,
    update: Partial<NotificationDeliveryPreference>,
  ) => {
    setPreferences((current) => ({
      ...current,
      [key]: { ...current[key], ...update },
    }));
    setSavedAt(null);
  };

  const setMute = (mutedUntil: string | null) => {
    setPreferences((current) => ({ ...current, mutedUntil }));
    setSavedAt(null);
  };

  const savePreferences = async () => {
    if (!isDirty || saving) return;
    setSaving(true);
    const preferencesToSave = constrainPreferencesToAvailableOptions(preferences);
    const response = await updateNotificationPreferencesAction(preferencesToSave);
    if (response.success) {
      const saved = constrainPreferencesToAvailableOptions(
        normalizeNotificationPreferences(response.data ?? preferencesToSave),
      );
      setPreferences(saved);
      setSavedPreferences(saved);
      setSavedAt(new Date());
      toast.success(
        <ToastMessage
          title="Notification preferences saved"
          description="Your channel, frequency, and mute choices were saved to your account."
        />,
      );
    } else {
      toast.error(response.message || "Could not save notification preferences.");
    }
    setSaving(false);
  };

  return (
    <section className="space-y-6 px-6 pb-10">
      <div className="relative overflow-hidden rounded-3xl border border-sky-100 bg-gradient-to-br from-white via-sky-50/60 to-cyan-50/60 px-5 py-6 shadow-sm sm:px-7">
        <div className="absolute -right-16 -top-20 h-52 w-52 rounded-full bg-[#2fc6f5]/10 blur-3xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Link
              href="/notification"
              className="mb-4 inline-flex items-center gap-2 rounded-lg text-sm font-bold text-[#0069a0] transition hover:text-[#008ad2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#008ad2] focus-visible:ring-offset-2"
            >
              <ArrowLeft size={16} aria-hidden="true" /> Back to notifications
            </Link>
            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#008ad2]">
              <Sparkles size={11} aria-hidden="true" /> Preferences
            </span>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
              Notification settings
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Choose what reaches you, where it arrives, and how often. Save your choices to keep them across sessions.
            </p>
          </div>
          <div role="status" aria-live="polite" className={`inline-flex items-center gap-3 self-start rounded-2xl border px-4 py-3 ${
            isDirty ? "border-amber-200 bg-amber-50 text-amber-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}>
            {isDirty ? <Clock3 size={18} aria-hidden="true" /> : <Check size={18} aria-hidden="true" />}
            <div>
              <p className="text-sm font-extrabold">{isDirty ? "Unsaved changes" : savedAt ? "Preferences saved" : "Preferences up to date"}</p>
              <p className="text-xs opacity-80">{isDirty ? "Save to keep your choices" : savedAt ? "Saved just now" : "No pending changes"}</p>
            </div>
          </div>
        </div>
      </div>

      {loadError ? (
        <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Saved preferences could not be loaded. Defaults are shown; try saving again when the connection is restored.
        </div>
      ) : null}

      <section aria-labelledby="global-mute-heading" className={`rounded-3xl border p-5 shadow-sm sm:p-6 ${
        isMuted ? "border-violet-200 bg-violet-50/70" : "border-slate-200 bg-white"
      }`}>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${
              isMuted ? "bg-violet-100 text-violet-700" : "bg-sky-50 text-[#008ad2]"
            }`}>
              {isMuted ? <BellOff size={21} aria-hidden="true" /> : <BellRing size={21} aria-hidden="true" />}
            </span>
            <div>
              <h2 id="global-mute-heading" className="text-lg font-extrabold text-slate-950">
                {isMuted ? "Notifications are muted" : "Temporarily mute all notifications"}
              </h2>
              <p className="mt-1 max-w-xl text-sm leading-6 text-slate-600">
                {isMuted && preferences.mutedUntil
                  ? hydrated
                    ? `Delivery resumes automatically ${new Date(preferences.mutedUntil).toLocaleString()}.`
                    : "Delivery resumes automatically at the scheduled time."
                  : "Pause every notification channel without changing individual preferences."}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {isMuted ? (
              <button
                type="button"
                onClick={() => setMute(null)}
                className="rounded-xl border border-violet-300 bg-white px-4 py-2.5 text-sm font-bold text-violet-700 transition hover:bg-violet-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
              >
                Resume notifications
              </button>
            ) : (
              <>
                <button type="button" onClick={() => setMute(muteUntilFor("hour"))} className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-bold text-slate-700 transition hover:border-[#008ad2] hover:text-[#0069a0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#008ad2]">Mute 1 hour</button>
                <button type="button" onClick={() => setMute(muteUntilFor("tomorrow"))} className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-bold text-slate-700 transition hover:border-[#008ad2] hover:text-[#0069a0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#008ad2]">Until tomorrow</button>
                <button type="button" onClick={() => setMute(muteUntilFor("week"))} className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-bold text-slate-700 transition hover:border-[#008ad2] hover:text-[#0069a0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#008ad2]">Mute 1 week</button>
              </>
            )}
          </div>
        </div>
      </section>

      <div className="space-y-5">
        {PREFERENCE_GROUPS.map((group) => (
          <section key={group.title} aria-labelledby={`notification-group-${group.title.replaceAll(" ", "-").toLowerCase()}`} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-4 sm:px-6">
              <h2 id={`notification-group-${group.title.replaceAll(" ", "-").toLowerCase()}`} className="text-base font-extrabold text-slate-950">{group.title}</h2>
              <p className="mt-1 text-sm text-slate-500">{group.description}</p>
            </div>
            <div className="divide-y divide-slate-100">
              {group.items.map((item) => {
                const preference = preferences[item.key];
                const enabled = item.channels.some((channel) => preference[channel]);
                const ItemIcon = item.icon;
                return (
                  <div key={item.key} className="flex flex-col gap-5 px-5 py-5 sm:px-6 lg:flex-row lg:items-center">
                    <div className="flex min-w-0 flex-1 items-start gap-3.5">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sky-50 text-[#008ad2]">
                        <ItemIcon size={18} aria-hidden="true" />
                      </span>
                      <div>
                        <h3 className="text-sm font-extrabold text-slate-900">{item.title}</h3>
                        <p className="mt-1 max-w-xl text-sm leading-5 text-slate-500">{item.description}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-end gap-5 lg:justify-end">
                      {item.channels.map((channel) => (
                        <ChannelSwitch
                          key={channel}
                          channel={channel}
                          title={item.title}
                          checked={preference[channel]}
                          onChange={() => updatePreference(item.key, { [channel]: !preference[channel] })}
                        />
                      ))}
                      <div className="min-w-[160px]">
                        <label htmlFor={`${item.key}-frequency`} className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">Frequency</label>
                        {item.frequencies.length === 1 ? (
                          <div className={`flex h-10 items-center rounded-xl border px-3 text-sm font-semibold ${enabled ? "border-slate-200 bg-slate-50 text-slate-700" : "border-slate-200 bg-slate-100 text-slate-400"}`}>
                            {enabled ? FREQUENCY_LABELS[item.frequencies[0]] : "Off"}
                          </div>
                        ) : (
                          <select
                            id={`${item.key}-frequency`}
                            aria-label={`Frequency for ${item.title}`}
                            value={item.frequencies.includes(preference.frequency) ? preference.frequency : item.frequencies[0]}
                            disabled={!enabled}
                            onChange={(event) => updatePreference(item.key, { frequency: event.target.value as NotificationFrequency })}
                            className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-[#008ad2] focus:ring-2 focus:ring-[#008ad2]/15 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                          >
                            {item.frequencies.map((frequency) => <option key={frequency} value={frequency}>{FREQUENCY_LABELS[frequency]}</option>)}
                          </select>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <div className="sticky bottom-4 z-10 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-[0_16px_50px_rgba(15,23,42,0.14)] backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-extrabold text-slate-900">{isDirty ? "Your changes have not been saved yet." : "All notification preferences are saved."}</p>
          <p className="mt-0.5 text-xs text-slate-500">Channel and frequency choices are stored when you save.</p>
        </div>
        <button
          type="button"
          onClick={() => void savePreferences()}
          disabled={!isDirty || saving}
          className="inline-flex min-w-40 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#2fc6f5] to-[#008ad2] px-5 py-3 text-sm font-extrabold text-white shadow-[0_8px_24px_rgba(0,138,210,0.25)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(0,138,210,0.32)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#008ad2] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
        >
          <Save size={16} aria-hidden="true" /> {saving ? "Saving…" : "Save preferences"}
        </button>
      </div>
    </section>
  );
}
