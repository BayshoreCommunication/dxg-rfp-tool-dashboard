export const SUPPORT_ATTACHMENT_MAX_FILES = 3;
export const SUPPORT_ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;
export const SUPPORT_ATTACHMENT_ACCEPT = "image/png,image/jpeg,image/gif,image/webp,application/pdf";
const ALLOWED = new Set(SUPPORT_ATTACHMENT_ACCEPT.split(","));

export type UploadedSupportAttachment = {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
};

/** Returns a user-facing problem for a file the backend would reject anyway. */
export const validateSupportFile = (file: File): string | null => {
  if (!ALLOWED.has(file.type)) return `${file.name}: only PNG, JPEG, GIF, WebP images and PDF files can be attached.`;
  if (file.size <= 0) return `${file.name}: the file is empty.`;
  if (file.size > SUPPORT_ATTACHMENT_MAX_BYTES) return `${file.name}: each attachment must be 10 MB or smaller.`;
  return null;
};

export const formatBytes = (bytes: number): string =>
  bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

/**
 * Uploads through the same-origin proxy so the backend token never reaches
 * the browser. Resolves to the pending upload ids a message can cite.
 */
export const uploadSupportAttachments = async (
  files: readonly File[],
): Promise<{ ok: true; attachments: UploadedSupportAttachment[] } | { ok: false; message: string }> => {
  if (files.length === 0) return { ok: true, attachments: [] };
  if (files.length > SUPPORT_ATTACHMENT_MAX_FILES) {
    return { ok: false, message: `At most ${SUPPORT_ATTACHMENT_MAX_FILES} attachments per message.` };
  }
  for (const file of files) {
    const problem = validateSupportFile(file);
    if (problem) return { ok: false, message: problem };
  }
  const body = new FormData();
  for (const file of files) body.append("files", file, file.name);
  let response: Response;
  let payload: { success?: boolean; message?: string; data?: { attachments?: UploadedSupportAttachment[] } } | null;
  try {
    response = await fetch("/api/support/attachments", { method: "POST", body, credentials: "same-origin" });
    payload = (await response.json().catch(() => null)) as typeof payload;
  } catch {
    return { ok: false, message: "The attachment upload failed. Check your connection and try again." };
  }
  if (!response.ok || !payload?.success || !Array.isArray(payload.data?.attachments)) {
    return { ok: false, message: payload?.message || "The attachment upload was rejected." };
  }
  return { ok: true, attachments: payload.data.attachments };
};

export const supportAttachmentHref = (ticketId: string, attachmentId: string): string =>
  `/api/support/attachments/${encodeURIComponent(ticketId)}/${encodeURIComponent(attachmentId)}`;
