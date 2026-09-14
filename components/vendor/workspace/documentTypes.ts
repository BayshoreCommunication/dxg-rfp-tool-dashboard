import type { VendorDraftDocumentDto } from "@/lib/vendorResponses/workspaceModel";

export type DocumentScopeType = "proposal" | "room" | "crew_member" | "reference";

export type DocumentMutationResult =
  | { ok: true; documents: VendorDraftDocumentDto[] }
  | { ok: false; message: string };

export type UploadDocuments = (input: {
  purposeId: string;
  scopeType: DocumentScopeType;
  scopeId?: string;
  files: File[];
}) => Promise<DocumentMutationResult>;

export type RetireDocument = (document: VendorDraftDocumentDto, replacement?: boolean) => Promise<boolean>;
