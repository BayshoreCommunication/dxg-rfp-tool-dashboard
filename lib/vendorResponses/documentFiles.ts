/** File helpers shared by the on-screen document list and the printable
 *  vendor response document (a server component). */
export type FileKind = "image" | "pdf" | "word" | "sheet" | "slides" | "other";

export const extensionOf = (name: string) => {
  const dot = name.lastIndexOf(".");
  return dot > 0 && dot < name.length - 1 ? name.slice(dot + 1).toLowerCase() : "";
};

export const documentKind = (mimeType: string, name: string): FileKind => {
  const mime = mimeType.toLowerCase();
  const extension = extensionOf(name);
  if (mime.startsWith("image/") || ["png", "jpg", "jpeg", "gif", "webp"].includes(extension)) return "image";
  if (mime.includes("pdf") || extension === "pdf") return "pdf";
  if (/wordprocessingml|msword/.test(mime) || ["doc", "docx"].includes(extension)) return "word";
  if (/spreadsheetml|ms-excel|csv/.test(mime) || ["xls", "xlsx", "csv"].includes(extension)) return "sheet";
  if (/presentationml|ms-powerpoint/.test(mime) || ["ppt", "pptx"].includes(extension)) return "slides";
  return "other";
};

/** Uploads are stored with a UUID prefix ("80ce8bb1-…-Screenshot.png"); the
 *  vendor's own file name is what a planner recognises. */
export const displayFileName = (name: string) =>
  name.replace(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[-_]/i, "") || name;

export const formatFileSize = (bytes: number | null | undefined) => {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0)} MB`;
};
