import { notFound } from "next/navigation";
import {
  getAssistantThreadAction,
  listAssistantThreadsAction,
} from "@/app/actions/aiAssistant";
import AiAssistantWorkspace from "@/components/ai-assistant/AiAssistantWorkspace";
import type { AssistantUiError } from "@/lib/aiAssistant/types";

const assistantVisible =
  process.env.NEXT_PUBLIC_AI_ASSISTANT_ENABLED === "true";

export const dynamic = "force-dynamic";

export default async function AiAssistantPage() {
  if (!assistantVisible) notFound();

  const threadsResult = await listAssistantThreadsAction();
  if (!threadsResult.success) {
    const initialError: AssistantUiError = {
      code: threadsResult.code,
      message: threadsResult.message,
      correlationId: threadsResult.correlationId,
      retryable: threadsResult.retryable,
      ...(threadsResult.retryAfterSeconds
        ? { retryAfterSeconds: threadsResult.retryAfterSeconds }
        : {}),
    };
    return (
      <AiAssistantWorkspace
        initialThreads={[]}
        initialDetail={null}
        initialError={initialError}
      />
    );
  }

  const active = threadsResult.data.find(
    (thread) => thread.status === "active",
  );
  if (!active) {
    return (
      <AiAssistantWorkspace
        initialThreads={threadsResult.data}
        initialDetail={null}
      />
    );
  }

  const detailResult = await getAssistantThreadAction(active.id);
  const initialError: AssistantUiError | null = detailResult.success
    ? null
    : {
        code: detailResult.code,
        message: detailResult.message,
        correlationId: detailResult.correlationId,
        retryable: detailResult.retryable,
        ...(detailResult.retryAfterSeconds
          ? { retryAfterSeconds: detailResult.retryAfterSeconds }
          : {}),
      };
  return (
    <AiAssistantWorkspace
      initialThreads={threadsResult.data}
      initialDetail={detailResult.success ? detailResult.data : null}
      initialError={initialError}
    />
  );
}
