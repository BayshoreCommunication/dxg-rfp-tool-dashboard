import type { ReactNode } from "react";

export default function WorkspaceSection({
  number,
  title,
  helperText,
  children,
}: {
  number: number;
  title: string;
  helperText?: string;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-[#dce4eb] bg-white shadow-[0_1px_4px_rgba(15,42,67,0.04)]">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#dce4eb] px-5 py-4 sm:flex-nowrap sm:px-7">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="text-[13px] font-extrabold tracking-[0.12em] text-[#008ad2]">
            {String(number).padStart(2, "0")}
          </span>
          <div>
            <h1 className="text-xl font-extrabold tracking-[-0.015em] text-[#16283c] sm:text-[22px]">{title}</h1>
            {helperText ? <p className="mt-0.5 text-sm text-[#607487]">{helperText}</p> : null}
          </div>
        </div>
      </header>
      <div className="px-5 py-6 sm:px-7 sm:py-7">{children}</div>
    </section>
  );
}

export const fieldClass = "mt-1.5 h-10 w-full rounded-md border border-[#ccd8e2] bg-white px-3 text-sm text-[#16283c] outline-none transition placeholder:text-[#9aa9b6] hover:border-[#aebfcd] focus:border-[#008ad2] focus:ring-3 focus:ring-[#dff3fc] disabled:bg-[#f4f7f9]";
export const textAreaClass = "mt-1.5 min-h-28 w-full resize-y rounded-md border border-[#ccd8e2] bg-white px-3 py-2.5 text-sm leading-5 text-[#16283c] outline-none transition placeholder:text-[#9aa9b6] hover:border-[#aebfcd] focus:border-[#008ad2] focus:ring-3 focus:ring-[#dff3fc] disabled:bg-[#f4f7f9]";
export const labelClass = "block text-[12px] font-bold text-[#42576a]";
