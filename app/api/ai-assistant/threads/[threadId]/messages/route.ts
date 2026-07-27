import { NextRequest } from "next/server";
import { BACKEND_URL, FRONTEND_URL } from "@/lib/config";
import { authenticatedBackendFetch } from "@/lib/server/backendClient";
import {
  ASSISTANT_MESSAGE_MAX_LENGTH,
  isRecord,
} from "@/lib/aiAssistant/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const threadIdPattern =
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

const normalizedOrigin = (value: string): string | null => {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
};

export const isAllowedAssistantOrigin = (request: NextRequest): boolean => {
  const supplied = normalizedOrigin(request.headers.get("origin") || "");
  if (!supplied) return false;
  const allowed = new Set(
    [request.nextUrl.origin, FRONTEND_URL]
      .map(normalizedOrigin)
      .filter((value): value is string => Boolean(value)),
  );
  return allowed.has(supplied);
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> },
) {
  const { threadId } = await params;
  if (!threadIdPattern.test(threadId)) {
    return problem(
      404,
      "ASSISTANT_THREAD_NOT_FOUND",
      "The assistant conversation was not found.",
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
      "Assistant requests must use application/json.",
    );
  }
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > 12_000) {
    return problem(
      413,
      "ASSISTANT_MESSAGE_TOO_LARGE",
      "The assistant message is too large.",
    );
  }

  const payload: unknown = await request.json().catch(() => null);
  const content =
    isRecord(payload) && typeof payload.content === "string"
      ? payload.content.trim()
      : "";
  const idempotencyKey =
    isRecord(payload) && typeof payload.idempotencyKey === "string"
      ? payload.idempotencyKey.trim()
      : "";
  const responseIdempotencyKey =
    isRecord(payload) && typeof payload.responseIdempotencyKey === "string"
      ? payload.responseIdempotencyKey.trim()
      : "";
  if (!content) {
    return problem(
      422,
      "INVALID_ASSISTANT_MESSAGE",
      "Enter a message before sending.",
    );
  }
  if (content.length > ASSISTANT_MESSAGE_MAX_LENGTH) {
    return problem(
      413,
      "ASSISTANT_MESSAGE_TOO_LARGE",
      `Messages must be ${ASSISTANT_MESSAGE_MAX_LENGTH.toLocaleString("en-US")} characters or fewer.`,
    );
  }
  if (
    !idempotencyKeyPattern.test(idempotencyKey) ||
    !idempotencyKeyPattern.test(responseIdempotencyKey)
  ) {
    return problem(
      400,
      "ASSISTANT_IDEMPOTENCY_KEY_REQUIRED",
      "A valid assistant request key is required.",
    );
  }

  const correlationId = crypto.randomUUID();
  let upstream: Response;
  try {
    upstream = await authenticatedBackendFetch(
      `${BACKEND_URL}/api/v1/assistant/threads/${encodeURIComponent(threadId)}/messages`,
      {
        method: "POST",
        headers: {
          Accept: "text/event-stream",
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
          "Assistant-Response-Idempotency-Key": responseIdempotencyKey,
          "X-Correlation-ID": correlationId,
        },
        body: JSON.stringify({ content }),
        cache: "no-store",
        signal: request.signal,
      },
    );
  } catch {
    return problem(
      502,
      "ASSISTANT_UPSTREAM_UNAVAILABLE",
      "The assistant service could not be reached.",
      true,
    );
  }

  const responseHeaders = new Headers({
    "Cache-Control": "no-cache, no-transform",
    "X-Accel-Buffering": "no",
    "X-Correlation-ID":
      upstream.headers.get("x-correlation-id") || correlationId,
  });
  const retryAfter = upstream.headers.get("retry-after");
  if (retryAfter) responseHeaders.set("Retry-After", retryAfter);

  if (!upstream.ok) {
    responseHeaders.set(
      "Content-Type",
      upstream.headers.get("content-type") || "application/problem+json",
    );
    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  }
  if (
    !upstream.body ||
    !upstream.headers
      .get("content-type")
      ?.toLowerCase()
      .startsWith("text/event-stream")
  ) {
    await upstream.body?.cancel().catch(() => undefined);
    return problem(
      502,
      "INVALID_ASSISTANT_STREAM",
      "The assistant service returned an invalid stream.",
      true,
    );
  }
  responseHeaders.set(
    "Content-Type",
    "text/event-stream; charset=utf-8",
  );
  responseHeaders.set("Connection", "keep-alive");
  return new Response(upstream.body, {
    status: 200,
    headers: responseHeaders,
  });
}
