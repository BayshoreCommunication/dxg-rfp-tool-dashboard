import crypto from "node:crypto";
import http from "node:http";

const port = Number(process.env.ASSISTANT_E2E_BACKEND_PORT || 8011);
const threads = new Map();
const messages = new Map();

const now = () => new Date().toISOString();

const json = (response, status, body) => {
  response.writeHead(status, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    "X-Correlation-ID": crypto.randomUUID(),
  });
  response.end(JSON.stringify(body));
};

const readJson = async (request) => {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return {};
  }
};

const threadDetail = (thread) => ({
  thread,
  messages: messages.get(thread.id) || [],
});

const writeEvent = (response, event, data) => {
  response.write(`event: ${event}\n`);
  response.write(`data: ${JSON.stringify(data)}\n\n`);
};

const wait = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

const streamAssistantResponse = async (request, response, thread) => {
  const body = await readJson(request);
  const content =
    typeof body.content === "string" && body.content.trim()
      ? body.content.trim()
      : "How do I use RFPilot?";
  const stamp = now();
  const existing = messages.get(thread.id) || [];
  const userMessage = {
    id: crypto.randomUUID(),
    threadId: thread.id,
    ordinal: existing.length + 1,
    role: "user",
    content,
    status: "complete",
    providerResponseId: null,
    model: null,
    inputTokens: null,
    outputTokens: null,
    safeErrorCode: null,
    citations: [],
    createdAt: stamp,
    updatedAt: stamp,
    completedAt: stamp,
  };
  const assistantMessageId = crypto.randomUUID();
  const assistantContent =
    "Open [Proposals](/proposals) to create or review proposals. Publication and sending remain explicit actions that you control.";
  const assistantMessage = {
    id: assistantMessageId,
    threadId: thread.id,
    ordinal: userMessage.ordinal + 1,
    role: "assistant",
    content: assistantContent,
    status: "complete",
    providerResponseId: "resp_e2e_synthetic",
    model: "e2e-synthetic-model",
    inputTokens: 120,
    outputTokens: 28,
    safeErrorCode: null,
    citations: [
      {
        sourceId: "platform:navigation:proposals",
        title: "Proposals",
        href: "/proposals",
      },
    ],
    createdAt: stamp,
    updatedAt: stamp,
    completedAt: stamp,
  };

  response.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    "X-Accel-Buffering": "no",
    "X-Correlation-ID": "assistant-e2e-correlation",
  });
  writeEvent(response, "message.accepted", {
    type: "message.accepted",
    version: 1,
    userMessage,
    assistantMessageId,
    correlationId: "assistant-e2e-correlation",
  });
  writeEvent(response, "response.started", {
    type: "response.started",
    version: 1,
    assistantMessageId,
  });
  await wait(600);
  for (const delta of [
    "Open [Proposals](/proposals) to create or review proposals. ",
    "Publication and sending remain explicit actions that you control.",
  ]) {
    writeEvent(response, "response.delta", {
      type: "response.delta",
      version: 1,
      assistantMessageId,
      delta,
    });
    await wait(120);
  }

  messages.set(thread.id, [...existing, userMessage, assistantMessage]);
  const updated = {
    ...thread,
    messageCount: existing.length + 2,
    lastMessageAt: stamp,
    updatedAt: stamp,
  };
  threads.set(thread.id, updated);
  writeEvent(response, "response.completed", {
    type: "response.completed",
    version: 1,
    message: assistantMessage,
    correlationId: "assistant-e2e-correlation",
  });
  response.end();
};

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://${request.headers.host}`);
  const pathname = url.pathname;

  if (request.method === "GET" && pathname === "/health") {
    json(response, 200, { status: "ok" });
    return;
  }

  if (request.method === "POST" && pathname === "/__e2e/reset") {
    threads.clear();
    messages.clear();
    json(response, 200, { reset: true });
    return;
  }

  if (request.method === "POST" && pathname === "/api/auth/login") {
    const expiresAt = Date.now() + 60 * 60_000;
    json(response, 200, {
      user: {
        _id: "bbbbbbbbbbbbbbbbbbbbbbbb",
        email: "assistant-e2e@example.com",
        name: "Assistant E2E",
        avatar: "",
      },
      accessToken: "assistant-e2e-access-token",
      tokenExpiresAt: expiresAt,
      refreshToken: "assistant-e2e-refresh-token",
      refreshExpiresAt: expiresAt + 24 * 60 * 60_000,
      sessionId: crypto.randomUUID(),
    });
    return;
  }

  if (
    request.method === "GET" &&
    pathname === "/api/v1/assistant/access"
  ) {
    json(response, 200, { data: { enabled: true } });
    return;
  }

  if (
    request.method === "GET" &&
    pathname === "/api/v1/assistant/threads"
  ) {
    json(response, 200, { data: [...threads.values()] });
    return;
  }

  if (
    request.method === "POST" &&
    pathname === "/api/v1/assistant/threads"
  ) {
    const body = await readJson(request);
    const stamp = now();
    const thread = {
      id: crypto.randomUUID(),
      title:
        typeof body.title === "string" && body.title.trim()
          ? body.title.trim()
          : "New conversation",
      status: "active",
      messageCount: 0,
      lastMessageAt: null,
      createdAt: stamp,
      updatedAt: stamp,
    };
    threads.set(thread.id, thread);
    messages.set(thread.id, []);
    json(response, 201, { data: { created: true, thread } });
    return;
  }

  const match = /^\/api\/v1\/assistant\/threads\/([^/]+)(?:\/messages)?$/.exec(
    pathname,
  );
  if (match) {
    const thread = threads.get(match[1]);
    if (!thread) {
      json(response, 404, {
        code: "ASSISTANT_THREAD_NOT_FOUND",
        title: "The assistant conversation was not found.",
      });
      return;
    }
    if (request.method === "GET" && !pathname.endsWith("/messages")) {
      json(response, 200, { data: threadDetail(thread) });
      return;
    }
    if (request.method === "PATCH" && !pathname.endsWith("/messages")) {
      const archived = { ...thread, status: "archived", updatedAt: now() };
      threads.set(thread.id, archived);
      json(response, 200, { data: archived });
      return;
    }
    if (request.method === "POST" && pathname.endsWith("/messages")) {
      await streamAssistantResponse(request, response, thread);
      return;
    }
  }

  json(response, 404, {
    code: "E2E_STUB_NOT_FOUND",
    title: "No synthetic backend route matched.",
  });
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Assistant E2E backend stub listening on 127.0.0.1:${port}`);
});

const shutdown = () => {
  server.close(() => process.exit(0));
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
