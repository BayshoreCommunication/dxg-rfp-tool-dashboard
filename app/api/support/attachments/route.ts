import { NextResponse, type NextRequest } from "next/server";
import { BACKEND_URL } from "@/lib/config";
import { authenticatedBackendFetch } from "@/lib/server/backendClient";
import { isAllowedAssistantOrigin } from "@/app/api/ai-assistant/threads/[threadId]/messages/route";

const MAX_FILES = 3;
const MAX_BYTES = 10 * 1024 * 1024;

/**
 * Same-origin multipart proxy for helpdesk uploads. Route handlers are not
 * bound by the server-action body limit, and the backend bearer token stays
 * on the server.
 */
export async function POST(request: NextRequest) {
  if (!isAllowedAssistantOrigin(request)) {
    return NextResponse.json({ success: false, message: "Cross-origin upload rejected." }, { status: 403 });
  }
  let incoming: FormData;
  try {
    incoming = await request.formData();
  } catch {
    return NextResponse.json({ success: false, message: "Expected multipart form data." }, { status: 400 });
  }
  const files = incoming.getAll("files").filter((item): item is File => item instanceof File);
  if (files.length === 0) {
    return NextResponse.json({ success: false, message: "Choose at least one file to upload." }, { status: 400 });
  }
  if (files.length > MAX_FILES) {
    return NextResponse.json({ success: false, message: `At most ${MAX_FILES} attachments per message.` }, { status: 400 });
  }
  if (files.some((file) => file.size > MAX_BYTES)) {
    return NextResponse.json({ success: false, message: "Each attachment must be 10 MB or smaller." }, { status: 400 });
  }
  const outgoing = new FormData();
  for (const file of files) outgoing.append("files", file, file.name);
  const response = await authenticatedBackendFetch(`${BACKEND_URL}/api/v1/support/attachments`, {
    method: "POST",
    body: outgoing,
    cache: "no-store",
  });
  const payload = await response.json().catch(() => null);
  return NextResponse.json(payload ?? { success: false, message: "The upload could not be completed." }, {
    status: response.status,
  });
}
