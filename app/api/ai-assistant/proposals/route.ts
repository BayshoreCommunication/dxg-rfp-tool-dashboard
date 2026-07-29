import { BACKEND_URL } from "@/lib/config";
import { authenticatedBackendFetch } from "@/lib/server/backendClient";
import { NextResponse } from "next/server";

type ProposalOption = {
  id: string;
  label: string;
  canEmail: boolean;
};

const proposalOptions = (value: unknown): ProposalOption[] => {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const proposal = item as Record<string, unknown>;
    const id = typeof proposal._id === "string" ? proposal._id : "";
    if (!/^[0-9a-f]{24}$/i.test(id)) return [];
    const event =
      proposal.event && typeof proposal.event === "object"
        ? (proposal.event as Record<string, unknown>)
        : {};
    return [
      {
        id,
        label:
          typeof event.eventName === "string" && event.eventName.trim()
            ? event.eventName.trim().slice(0, 200)
            : "Untitled proposal",
        canEmail:
          proposal.status === "submitted" && proposal.isActive !== false,
      },
    ];
  });
};

export async function GET() {
  const correlationId = crypto.randomUUID();
  try {
    const query = new URLSearchParams({
      archived: "false",
      isCopy: "false",
      page: "1",
      limit: "50",
      sortBy: "updatedAt",
      sortOrder: "desc",
    });
    const response = await authenticatedBackendFetch(
      `${BACKEND_URL}/api/proposals?${query}`,
      {
        method: "GET",
        cache: "no-store",
        headers: { "X-Correlation-ID": correlationId },
      },
    );
    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      return NextResponse.json(
        {
          code:
            response.status === 401
              ? "AUTHENTICATION_REQUIRED"
              : "PROPOSAL_HANDOFF_UNAVAILABLE",
          message: "Available proposals could not be loaded.",
          correlationId,
        },
        {
          status: response.status === 401 ? 401 : response.status === 403 ? 403 : 502,
          headers: { "Cache-Control": "no-store" },
        },
      );
    }
    const body =
      payload && typeof payload === "object"
        ? (payload as Record<string, unknown>)
        : {};
    return NextResponse.json(
      { data: proposalOptions(body.data), correlationId },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      {
        code: "PROPOSAL_HANDOFF_UNAVAILABLE",
        message: "Available proposals could not be loaded.",
        correlationId,
      },
      {
        status: 502,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
