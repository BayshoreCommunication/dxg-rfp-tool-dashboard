import { NextRequest } from "next/server";
import { BACKEND_URL } from "@/lib/config";
import { authenticatedBackendFetch } from "@/lib/server/backendClient";
import {
  ASSISTANT_FEEDBACK_REASONS,
  ASSISTANT_FEEDBACK_VALUES,
  isRecord,
  parseAssistantFeedbackResult,
} from "@/lib/aiAssistant/types";
import { isAllowedAssistantOrigin } from "../../route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const idempotencyKeyPattern = /^[\x21-\x7e]{1,200}$/;

const problem = (
  status: number,
  code: string,
  title: string,
  retryable = false,
) =>
  Response.json(
    { status, code, title, retryable },
    {
      status,
      headers: {
        "Content-Type": "application/problem+json",
        "Cache-Control": "no-store",
      },
    },
  );

export async function PUT(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ threadId: string; messageId: string }>;
  },
) {
  const { threadId, messageId } = await params;
  if (!uuidPattern.test(threadId) || !uuidPattern.test(messageId)) {
    return problem(
      404,
      "ASSISTANT_MESSAGE_NOT_FOUND",
      "The completed assistant response was not found.",
    );
  }
  if (!isAllowedAssistantOrigin(request)) {
    return problem(
      403,
      "ASSISTANT_ORIGIN_DENIED",
      "The assistant request origin was not accepted.",
    );
  }
  const contentType = request.headers.get("content-type")?.toLowerCase() || "";
  if (!contentType.startsWith("application/json")) {
    return problem(
      415,
      "UNSUPPORTED_MEDIA_TYPE",
      "Assistant feedback must use application/json.",
    );
  }
  const payload: unknown = await request.json().catch(() => null);
  const value =
    isRecord(payload) && typeof payload.value === "string"
      ? payload.value
      : "";
  const reason =
    isRecord(payload) &&
    (typeof payload.reason === "string" || payload.reason === null)
      ? payload.reason
      : null;
  const idempotencyKey =
    isRecord(payload) && typeof payload.idempotencyKey === "string"
      ? payload.idempotencyKey.trim()
      : "";
  const analyticsSessionId =
    isRecord(payload) &&
    typeof payload.analyticsSessionId === "string" &&
    uuidPattern.test(payload.analyticsSessionId)
      ? payload.analyticsSessionId.toLowerCase()
      : null;
  if (
    !ASSISTANT_FEEDBACK_VALUES.includes(
      value as (typeof ASSISTANT_FEEDBACK_VALUES)[number],
    ) ||
    (reason !== null &&
      !ASSISTANT_FEEDBACK_REASONS.includes(
        reason as (typeof ASSISTANT_FEEDBACK_REASONS)[number],
      )) ||
    (value === "helpful" && reason !== null)
  ) {
    return problem(
      422,
      "INVALID_ASSISTANT_FEEDBACK",
      "Choose a valid feedback option.",
    );
  }
  if (!idempotencyKeyPattern.test(idempotencyKey)) {
    return problem(
      400,
      "ASSISTANT_IDEMPOTENCY_KEY_REQUIRED",
      "A valid feedback request key is required.",
    );
  }
  if (
    isRecord(payload) &&
    payload.analyticsSessionId !== undefined &&
    !analyticsSessionId
  ) {
    return problem(
      422,
      "INVALID_ASSISTANT_ANALYTICS_SESSION",
      "The assistant analytics session is invalid.",
    );
  }

  const correlationId = crypto.randomUUID();
  let upstream: Response;
  try {
    upstream = await authenticatedBackendFetch(
      `${BACKEND_URL}/api/v1/assistant/threads/${encodeURIComponent(threadId)}/messages/${encodeURIComponent(messageId)}/feedback`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
          ...(analyticsSessionId
            ? { "Assistant-Analytics-Session-ID": analyticsSessionId }
            : {}),
          "X-Correlation-ID": correlationId,
        },
        body: JSON.stringify({ value, reason }),
        cache: "no-store",
      },
    );
  } catch {
    return problem(
      502,
      "ASSISTANT_FEEDBACK_UNAVAILABLE",
      "Feedback could not be saved.",
      true,
    );
  }
  const responseCorrelation =
    upstream.headers.get("x-correlation-id") || correlationId;
  const retryAfter = upstream.headers.get("retry-after");
  const data: unknown = await upstream.json().catch(() => null);
  if (!upstream.ok) {
    const body = isRecord(data) ? data : {};
    return Response.json(
      {
        status: upstream.status,
        code:
          typeof body.code === "string"
            ? body.code
            : "ASSISTANT_FEEDBACK_UNAVAILABLE",
        title:
          typeof body.title === "string"
            ? body.title
            : "Feedback could not be saved.",
        retryable: body.retryable === true || upstream.status >= 500,
        correlationId: responseCorrelation,
      },
      {
        status: upstream.status,
        headers: {
          "Content-Type": "application/problem+json",
          "Cache-Control": "no-store",
          ...(retryAfter ? { "Retry-After": retryAfter } : {}),
        },
      },
    );
  }
  const body = isRecord(data) ? data : {};
  const parsed = parseAssistantFeedbackResult(body.data);
  if (!parsed) {
    return problem(
      502,
      "INVALID_ASSISTANT_FEEDBACK_RESPONSE",
      "Feedback could not be confirmed.",
      true,
    );
  }
  return Response.json(
    { data: parsed, correlationId: responseCorrelation },
    { headers: { "Cache-Control": "no-store" } },
  );
}
