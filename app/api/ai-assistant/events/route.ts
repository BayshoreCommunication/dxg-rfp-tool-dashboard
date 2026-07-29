import { NextRequest } from "next/server";
import { BACKEND_URL } from "@/lib/config";
import { authenticatedBackendFetch } from "@/lib/server/backendClient";
import {
  ASSISTANT_CLIENT_EVENT_TYPES,
} from "@/lib/aiAssistant/analytics";
import {
  ASSISTANT_ROUTE_CATEGORIES,
} from "@/lib/aiAssistant/uiContext";
import { isRecord } from "@/lib/aiAssistant/types";
import { isAllowedAssistantOrigin } from "../threads/[threadId]/messages/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const idempotencyKeyPattern = /^[\x21-\x7e]{1,200}$/;
const findingCategories = [
  "completeness",
  "schedule",
  "production",
  "budget",
  "risk",
  "scope",
  "room",
  "application",
  "other",
] as const;

const problem = (status: number, code: string, title: string) =>
  Response.json(
    { status, code, title, retryable: status >= 500 },
    {
      status,
      headers: {
        "Content-Type": "application/problem+json",
        "Cache-Control": "no-store",
      },
    },
  );

const optionalUuid = (value: unknown): string | null | false => {
  if (value === undefined || value === null || value === "") return null;
  return typeof value === "string" && uuidPattern.test(value)
    ? value.toLowerCase()
    : false;
};

export async function POST(request: NextRequest) {
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
      "Assistant analytics events must use application/json.",
    );
  }
  const payload: unknown = await request.json().catch(() => null);
  if (!isRecord(payload)) {
    return problem(
      422,
      "INVALID_ASSISTANT_ANALYTICS_EVENT",
      "The assistant analytics event is invalid.",
    );
  }
  const eventType = ASSISTANT_CLIENT_EVENT_TYPES.includes(
    payload.eventType as (typeof ASSISTANT_CLIENT_EVENT_TYPES)[number],
  )
    ? payload.eventType
    : null;
  const sessionId = optionalUuid(payload.sessionId);
  const threadId = optionalUuid(payload.threadId);
  const messageId = optionalUuid(payload.messageId);
  const routeCategory =
    payload.routeCategory === undefined || payload.routeCategory === null
      ? null
      : ASSISTANT_ROUTE_CATEGORIES.includes(
            payload.routeCategory as (typeof ASSISTANT_ROUTE_CATEGORIES)[number],
          )
        ? payload.routeCategory
        : false;
  const findingCategory =
    payload.findingCategory === undefined || payload.findingCategory === null
      ? null
      : findingCategories.includes(
            payload.findingCategory as (typeof findingCategories)[number],
          )
        ? payload.findingCategory
        : false;
  const idempotencyKey =
    typeof payload.idempotencyKey === "string"
      ? payload.idempotencyKey.trim()
      : "";
  if (
    !eventType ||
    !sessionId ||
    threadId === false ||
    messageId === false ||
    routeCategory === false ||
    findingCategory === false ||
    (messageId && !threadId) ||
    !idempotencyKeyPattern.test(idempotencyKey)
  ) {
    return problem(
      422,
      "INVALID_ASSISTANT_ANALYTICS_EVENT",
      "The assistant analytics event is invalid.",
    );
  }

  const correlationId = crypto.randomUUID();
  let upstream: Response;
  try {
    upstream = await authenticatedBackendFetch(
      `${BACKEND_URL}/api/v1/assistant/analytics/events`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
          "Assistant-Analytics-Session-ID": sessionId,
          "X-Correlation-ID": correlationId,
        },
        body: JSON.stringify({
          eventType,
          sessionId,
          threadId,
          messageId,
          routeCategory,
          findingCategory,
        }),
        cache: "no-store",
      },
    );
  } catch {
    return problem(
      502,
      "ASSISTANT_ANALYTICS_UNAVAILABLE",
      "The assistant analytics event could not be recorded.",
    );
  }
  const data: unknown = await upstream.json().catch(() => null);
  if (!upstream.ok) {
    const body = isRecord(data) ? data : {};
    return Response.json(
      {
        status: upstream.status,
        code:
          typeof body.code === "string"
            ? body.code
            : "ASSISTANT_ANALYTICS_UNAVAILABLE",
        title:
          typeof body.title === "string"
            ? body.title
            : "The assistant analytics event could not be recorded.",
        retryable: body.retryable === true || upstream.status >= 500,
      },
      {
        status: upstream.status,
        headers: {
          "Content-Type": "application/problem+json",
          "Cache-Control": "no-store",
        },
      },
    );
  }
  const body = isRecord(data) ? data : {};
  const result = isRecord(body.data) && typeof body.data.created === "boolean"
    ? { created: body.data.created }
    : null;
  if (!result) {
    return problem(
      502,
      "INVALID_ASSISTANT_ANALYTICS_RESPONSE",
      "The assistant analytics event could not be confirmed.",
    );
  }
  return Response.json(
    { data: result },
    { headers: { "Cache-Control": "no-store" } },
  );
}
