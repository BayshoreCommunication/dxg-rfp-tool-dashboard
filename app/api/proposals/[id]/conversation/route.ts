import { getConversationAction } from '@/app/actions/conversation';
import { isSafeProposalId } from '@/lib/aiAssistant/handoff';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { hasExpiredBackendSession } from '@/lib/authTokenState';

export const maxDuration = 60;
const privateHeaders = {'Cache-Control': 'private, no-store'};

// Read-only polling must not run through a Server Action/RSC navigation.
// The existing backend client still validates the signed-in owner and tenant.
export async function GET(_request: Request, {params}: {params: Promise<{id: string}>}) {
  const {id} = await params;
  if (!isSafeProposalId(id)) {
    return NextResponse.json({success: false, code: 'INVALID_PROPOSAL_ID', message: 'Invalid proposal id.'}, {status: 400, headers: privateHeaders});
  }
  const session = await auth();
  if (!session?.user || hasExpiredBackendSession(session as unknown as Record<string, unknown>)) {
    return NextResponse.json({
      success: false, code: 'AUTHENTICATION_REQUIRED',
      message: 'Your session has expired. Please sign in again.', correlationId: '',
    }, {status: 401, headers: privateHeaders});
  }
  const result = await getConversationAction(id);
  const failureStatuses: Record<string, number> = {
    AUTHENTICATION_REQUIRED: 401, AUTHORIZATION_DENIED: 403, PROPOSAL_NOT_FOUND: 404,
  };
  const status = result.success ? 200 : failureStatuses[result.code] ?? 502;
  return NextResponse.json(result, {status, headers: privateHeaders});
}
