/**
 * A friendly support-agent face: rounded head under a big headset, two
 * eyes, a smile, and a mic boom. Drawn inline so it stays crisp at any size
 * and takes the current text colour (two-tone through fill opacity).
 */
export default function SupportAgentIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
      {/* shoulders */}
      <path d="M7 45c1.5-5.5 8-8.5 17-8.5s15.5 3 17 8.5" fill="currentColor" fillOpacity={0.16} stroke="none" />
      {/* head */}
      <rect x="12" y="16" width="24" height="23" rx="9" fill="#ffffff" />
      {/* hair line under the band */}
      <path d="M13.5 22h21" strokeOpacity={0.35} />
      {/* headset band */}
      <path d="M9.5 25a14.5 14.5 0 0 1 29 0" />
      {/* ear cups */}
      <rect x="5.5" y="22" width="6.5" height="11" rx="3.2" fill="currentColor" />
      <rect x="36" y="22" width="6.5" height="11" rx="3.2" fill="currentColor" />
      {/* eyes */}
      <circle cx="19.5" cy="28" r="1.7" fill="currentColor" stroke="none" />
      <circle cx="28.5" cy="28" r="1.7" fill="currentColor" stroke="none" />
      {/* smile */}
      <path d="M19.5 33c2.6 2.6 6.4 2.6 9 0" />
      {/* mic boom and mic */}
      <path d="M39 33c0 5.5-3.5 8.5-8.5 8.5" />
      <circle cx="29.5" cy="41.5" r="2.1" fill="currentColor" stroke="none" />
    </svg>
  );
}
