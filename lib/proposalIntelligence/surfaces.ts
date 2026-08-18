export const intelligenceSurfaceClasses = {
  chip: "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold",
  block: "rounded-2xl border border-gray-border bg-white p-4",
  card: "rounded-3xl border border-gray-border bg-white p-5 shadow-sm sm:p-6",
} as const;

export type IntelligenceSurfaceShape = keyof typeof intelligenceSurfaceClasses;

