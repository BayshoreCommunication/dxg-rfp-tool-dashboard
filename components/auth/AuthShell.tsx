"use client";

import { ArrowRight } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from "react";

/* The split card used by the (auth) pages: brand panel on the left, form on
   the right. Shared by sign-in (and its two-factor step) and /invite/[token].

   `fit` (the setup wizard) sizes the card to the window on a laptop or desktop
   screen: the page itself never scrolls, the form gets the wider panel, and a
   form taller than the window scrolls inside its panel while `footer` (the
   step's buttons) stays in view under it. That applies under the `fit:` variant
   (globals.css): a window at least 1024 px wide (lg, where the two panels sit
   side by side) and at least 520 px tall. In a shorter window the card could
   not hold the brand panel's text or the buttons, and below lg there is one
   column: in both the page scrolls as usual and `footer` simply follows the
   form. The `lg:` classes here are spacing and widths only. The two `fit:`
   minimum heights are marked important because Tailwind emits a custom
   variant before `sm:`, so the plain card's `sm:min-h-[640px]` would win. */
export const AuthShell = ({
  aside,
  children,
  fit = false,
  footer,
}: {
  aside: ReactNode;
  children: ReactNode;
  fit?: boolean;
  footer?: ReactNode;
}) => (
  <div className={`relative flex min-h-screen items-center justify-center overflow-hidden bg-[#F0F2F5] p-4 text-[#000000] sm:p-8 ${fit ? "fit:h-dvh fit:min-h-0! lg:p-5" : ""}`}>
    <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 transform items-center justify-center">
      <div className="absolute h-[600px] w-[600px] rounded-full bg-primary/20 blur-[100px] mix-blend-multiply sm:blur-[120px]"></div>
      <div className="absolute ml-40 mt-40 h-[500px] w-[500px] rounded-full bg-blue-300/30 blur-[100px] mix-blend-multiply sm:blur-[120px]"></div>
      <div className="absolute -ml-40 -mt-20 h-[550px] w-[550px] rounded-full bg-cyan-200/20 blur-[100px] mix-blend-multiply sm:blur-[120px]"></div>
    </div>

    <div className={`relative z-10 flex w-full max-w-[1000px] overflow-hidden rounded-[2.5rem] bg-white/80 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08)] backdrop-blur-2xl ring-1 ring-black/5 sm:min-h-[640px] ${fit ? "fit:max-h-full fit:min-h-[min(640px,100%)]!" : ""}`}>
      <div className={`relative hidden flex-col justify-between overflow-hidden bg-primary p-12 text-white lg:flex ${fit ? "w-[44%]" : "w-1/2"}`}>
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
        <div className="relative z-10">
          <div className="inline-flex rounded-2xl bg-white p-2 shadow-lg shadow-black/10">
            <Image
              src="/assets/logo/rfpilot-primary-logo.png"
              alt="RFPilot"
              width={64}
              height={64}
              className="h-16 w-16 object-contain"
              priority
            />
          </div>
        </div>
        <div className="relative z-10 max-w-sm space-y-8">{aside}</div>
        <div className="relative z-10 text-sm font-medium text-white/50">
          © 2026 RFPilot.
        </div>
      </div>

      <div className={`flex w-full flex-col justify-center bg-white px-8 py-16 sm:px-16 ${fit ? "lg:min-h-0 lg:w-[56%] lg:px-10 lg:py-6" : "lg:w-1/2"}`}>
        <div className={`mx-auto w-full max-w-sm ${fit ? "lg:flex lg:min-h-0 lg:max-w-[480px] lg:flex-col" : ""}`}>
          <div className="mb-10 flex justify-center lg:hidden">
            <Image
              src="/assets/logo/rfpilot-primary-logo.png"
              alt="RFPilot"
              width={72}
              height={72}
              className="h-[72px] w-[72px] object-contain"
              priority
            />
          </div>
          {/* The padding leaves room for the fields' focus rings inside the scrolling box. */}
          {fit ? <div className="lg:-mx-2 lg:min-h-0 fit:overflow-y-auto lg:px-2 lg:pb-1">{children}</div> : children}
          {footer}
        </div>
      </div>
    </div>
  </div>
);

/* `compact`, on the heading, the error and the field, tightens the spacing on a laptop or
   desktop screen (lg and up) for a form that has to fit the window. Text sizes for labels and
   fields do not change, and nothing changes below lg. */
export const AuthHeading = ({
  title,
  subtitle,
  compact = false,
}: {
  title: string;
  subtitle?: ReactNode;
  compact?: boolean;
}) => (
  <>
    <h2 className={`mb-3 text-center text-[32px] font-extrabold leading-none tracking-tight text-gray-900 lg:text-left ${compact ? "lg:mb-2 lg:text-[28px]" : ""}`}>
      {title}
    </h2>
    {subtitle ? (
      <p className={`mb-10 text-center text-[14px] font-medium text-gray-400 lg:text-left ${compact ? "lg:mb-5" : ""}`}>
        {subtitle}
      </p>
    ) : null}
  </>
);

/* `revealKey` is for a form that scrolls inside its card (the setup wizard): the alert sits at
   the top of the scrolling box, so a submit that fails while the form is scrolled down would
   change nothing on screen. With a key, the alert is scrolled into view when the message appears
   and again each time the key changes (the same message, refused again). Keyboard focus is not
   moved. */
export const AuthError = ({ message, compact = false, revealKey }: { message: string; compact?: boolean; revealKey?: number }) => {
  const alert = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (revealKey === undefined || !message) return;
    const reduced = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    alert.current?.scrollIntoView?.({ block: "nearest", behavior: reduced ? "auto" : "smooth" });
  }, [message, revealKey]);
  return message ? (
    <div
      ref={alert}
      role="alert"
      className={`mb-6 rounded-xl border border-red-100/50 bg-red-50 p-4 text-center text-sm font-medium text-red-600 ${compact ? "lg:mb-4 lg:p-3" : ""}`}
    >
      {message}
    </div>
  ) : null;
};

export const AuthField = ({
  label,
  icon,
  trailing,
  id,
  compact = false,
  ...input
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  icon: ReactNode;
  trailing?: ReactNode;
  id: string;
  compact?: boolean;
}) => (
  <div className="group">
    <label htmlFor={id} className={`mb-2 block text-[13px] font-bold text-gray-700 ${compact ? "lg:mb-1.5" : ""}`}>
      {label}
    </label>
    <div className="relative flex items-center overflow-hidden rounded-2xl border border-gray-200 bg-gray-50/50 transition-all duration-300 focus-within:border-primary focus-within:bg-white focus-within:ring-4 focus-within:ring-primary/10 hover:border-gray-300 has-[:disabled]:opacity-80">
      <div className="pl-4 pr-3 text-gray-400 transition-colors group-focus-within:text-primary">
        {icon}
      </div>
      <input
        id={id}
        {...input}
        className={`w-full bg-transparent py-4 pr-4 text-[15px] font-semibold text-gray-900 outline-none placeholder:font-medium placeholder:text-gray-400 disabled:cursor-not-allowed ${compact ? "min-w-0 lg:py-3" : ""}`}
      />
      {trailing}
    </div>
  </div>
);

export const AuthPrimaryButton = ({
  children,
  className = "",
  ...button
}: ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button
    {...button}
    className={`group relative flex w-full cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-2xl py-4 text-[15px] font-bold text-white shadow-[0_4px_20px_rgba(34,38,40,0.4)] transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(34,38,40,0.55)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-70 ${className}`}
    style={{ background: "#222628" }}
  >
    <span>{children}</span>
    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
    <span className="pointer-events-none absolute inset-0 -translate-x-full skew-x-[-20deg] bg-white/20 transition-transform duration-700 group-hover:translate-x-full" />
  </button>
);

export const AuthDivider = () => (
  <div className="mb-6 flex items-center gap-4">
    <div className="h-px flex-1 bg-gray-200" />
    <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
      or
    </span>
    <div className="h-px flex-1 bg-gray-200" />
  </div>
);

export const GoogleButton = ({
  onClick,
  disabled,
  label = "Continue with Google",
  spacing = "mb-8",
}: {
  onClick: () => void;
  disabled?: boolean;
  label?: string;
  spacing?: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`${spacing} flex w-full cursor-pointer items-center justify-center gap-3 rounded-2xl border border-gray-200 bg-white py-4 text-[15px] font-bold text-gray-700 transition-all hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] active:translate-y-0 disabled:opacity-70`}
  >
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.63h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.58-5.17 3.58-8.8Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.88-3c-1.07.72-2.45 1.14-4.06 1.14-3.13 0-5.78-2.11-6.72-4.95H1.27v3.09A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.28a7.21 7.21 0 0 1 0-4.56V6.63H1.27a12 12 0 0 0 0 10.74l4.01-3.09Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.34.61 4.59 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.27 6.63l4.01 3.09C6.22 6.88 8.87 4.77 12 4.77Z"
      />
    </svg>
    <span>{label}</span>
  </button>
);

const providerButtonClass =
  "mb-4 flex w-full cursor-pointer items-center justify-center gap-3 rounded-2xl border border-gray-200 bg-white py-4 text-[15px] font-bold text-gray-700 transition-all hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] active:translate-y-0 aria-disabled:pointer-events-none aria-disabled:opacity-70";

const MicrosoftLogo = () => (
  <svg className="h-5 w-5" viewBox="0 0 21 21" aria-hidden="true">
    <rect x="1" y="1" width="9" height="9" fill="#F25022" />
    <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
    <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
    <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
  </svg>
);

/* "Continue with Microsoft" is a plain link to /api/sso/start?kind=microsoft
   (not a NextAuth provider): that route sets the bind cookie and leaves for
   the backend, which talks to Microsoft. */
export const MicrosoftButton = ({
  href,
  disabled,
  label = "Continue with Microsoft",
}: {
  href: string;
  disabled?: boolean;
  label?: string;
}) => (
  <a
    href={disabled ? undefined : href}
    aria-disabled={disabled || undefined}
    role={disabled ? "link" : undefined}
    className={providerButtonClass}
  >
    <MicrosoftLogo />
    <span>{label}</span>
  </a>
);
