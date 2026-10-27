"use server";

import { revalidatePath } from "next/cache";
import { authenticatedBackendFetch } from "@/lib/server/backendClient";
import { BACKEND_URL } from "@/lib/config";

export type SupportTicketStatus = "open" | "waiting_on_customer" | "resolved" | "closed";
export type SupportTicketPriority = "low" | "normal" | "high" | "urgent";
export type SupportTicketCategory = "how_to" | "bug" | "billing" | "feature_request" | "vendor_email" | "other";

export type SupportTicket = {
  id: string;
  ticketNumber: number;
  subject: string;
  category: SupportTicketCategory;
  priority: SupportTicketPriority;
  status: SupportTicketStatus;
  messageCount: number;
  unreadForRequester: number;
  lastMessageAt: string;
  lastAgentMessageAt: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  createdAt: string;
};

export type SupportMessage = {
  id: string;
  authorRole: "customer" | "agent" | "system";
  kind: "message" | "system";
  body: string;
  attachments: Array<{ id: string; fileName: string; mimeType: string; sizeBytes: number }>;
  createdAt: string;
};

export type SupportPagination = { page: number; perPage: number; total: number; totalPages: number };

export type SupportResult<T> =
  | { success: true; data: T }
  | { success: false; message: string; code?: string };

const base = `${BACKEND_URL}/api/v1/support`;

const call = async <T,>(path: string, init?: RequestInit): Promise<SupportResult<T>> => {
  try {
    const response = await authenticatedBackendFetch(`${base}${path}`, {
      ...init,
      cache: "no-store",
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });
    const body = (await response.json().catch(() => null)) as
      | { success?: boolean; data?: T; message?: string; code?: string }
      | null;
    if (!response.ok || !body?.success) {
      return {
        success: false,
        message: body?.message || "We couldn't reach RFPilot support right now. Please try again.",
        code: body?.code,
      };
    }
    return { success: true, data: body.data as T };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Network error" };
  }
};

export async function listSupportTicketsAction(params?: {
  status?: "active" | SupportTicketStatus;
  page?: number;
}): Promise<SupportResult<{ tickets: SupportTicket[]; pagination: SupportPagination }>> {
  const query = new URLSearchParams();
  if (params?.status) query.set("status", params.status);
  if (params?.page) query.set("page", String(params.page));
  const suffix = query.toString();
  return call(`/tickets${suffix ? `?${suffix}` : ""}`);
}

export async function getSupportUnreadCountAction(): Promise<number> {
  const result = await call<{ unreadTickets: number }>("/tickets/unread-count");
  return result.success && typeof result.data.unreadTickets === "number" ? result.data.unreadTickets : 0;
}

export async function getSupportTicketAction(
  ticketId: string,
): Promise<
  SupportResult<{
    ticket: SupportTicket;
    messages: SupportMessage[];
    assignee: { id: string; name: string } | null;
  }>
> {
  return call(`/tickets/${encodeURIComponent(ticketId)}`);
}

export async function createSupportTicketAction(input: {
  subject: string;
  category: SupportTicketCategory;
  body: string;
  attachments?: string[];
}): Promise<SupportResult<{ ticket: SupportTicket; message: SupportMessage }>> {
  const result = await call<{ ticket: SupportTicket; message: SupportMessage }>("/tickets", {
    method: "POST",
    body: JSON.stringify(input),
  });
  if (result.success) revalidatePath("/support");
  return result;
}

export async function replySupportTicketAction(
  ticketId: string,
  body: string,
  attachments: string[] = [],
): Promise<SupportResult<{ ticket: SupportTicket; message: SupportMessage }>> {
  const result = await call<{ ticket: SupportTicket; message: SupportMessage }>(
    `/tickets/${encodeURIComponent(ticketId)}/messages`,
    { method: "POST", body: JSON.stringify({ body, attachments }) },
  );
  if (result.success) {
    revalidatePath("/support");
    revalidatePath(`/support/${ticketId}`);
  }
  return result;
}

export async function resolveSupportTicketAction(ticketId: string): Promise<SupportResult<SupportTicket>> {
  const result = await call<SupportTicket>(`/tickets/${encodeURIComponent(ticketId)}/resolve`, {
    method: "POST",
    body: "{}",
  });
  if (result.success) {
    revalidatePath("/support");
    revalidatePath(`/support/${ticketId}`);
  }
  return result;
}
