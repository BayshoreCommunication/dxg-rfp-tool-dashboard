import { createProposalUploadTicketAction } from "@/app/actions/proposals";

export type ProposalUploadResult = {
  success: boolean;
  message?: string;
  supportDocumentUrls: string[];
  avQuoteFileUrls: string[];
  scenicInspirationFileUrls: string[];
  venueCoiFileUrls: string[];
};

const failedUpload = (message: string): ProposalUploadResult => ({
  success: false, message, supportDocumentUrls: [], avQuoteFileUrls: [],
  scenicInspirationFileUrls: [], venueCoiFileUrls: [],
});

/** Only a small ticket request passes through Next.js. File bytes go directly
 * to the same authorized, size-limited, malware-scanned backend upload flow. */
export async function uploadProposalFiles(formData: FormData): Promise<ProposalUploadResult> {
  try {
    const authorization = await createProposalUploadTicketAction();
    if (!authorization.success) return failedUpload(authorization.message);
    const response = await fetch(authorization.uploadUrl, {
      method: "POST", headers: { Authorization: `Bearer ${authorization.ticket}` },
      body: formData, credentials: "omit", cache: "no-store",
    });
    const body = await response.json().catch(() => null);
    if (!response.ok || !body?.success || !Array.isArray(body.data)) {
      return failedUpload(body?.message || (response.status === 413
        ? "The file is too large. Maximum 50 MB per file."
        : response.status === 401 || response.status === 403
          ? "Your upload session expired or access changed. Please retry or sign in again."
          : "Could not upload this file. Please retry."));
    }
    const urls = (field: string): string[] => body.data
      .filter((file: { fieldname?: string; url?: unknown } | null) => file?.fieldname === field && typeof file.url === "string")
      .map((file: { url: string }) => file.url);
    return {
      success: true, message: body.message,
      supportDocumentUrls: urls("supportDocuments"), avQuoteFileUrls: urls("avQuoteFiles"),
      scenicInspirationFileUrls: urls("scenicInspirationFiles"), venueCoiFileUrls: urls("venueCoiFiles"),
    };
  } catch {
    return failedUpload("Could not reach the upload service. Check your connection and retry.");
  }
}
