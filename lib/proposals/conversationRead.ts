import type { getConversationAction } from '@/app/actions/conversation';

type Result = Awaited<ReturnType<typeof getConversationAction>>;
export async function readConversationSnapshot(proposalId: string): Promise<Result> {
  try {
    const response = await fetch(`/api/proposals/${encodeURIComponent(proposalId)}/conversation`, {
      method:'GET', cache:'no-store', credentials:'same-origin', signal:AbortSignal.timeout(50_000),
    });
    const result = await response.json();
    if (result?.success === true && response.ok && Array.isArray(result.data?.messages) && Array.isArray(result.data?.questions)) return result as Result;
    if (result?.success === false && typeof result.message === 'string' && typeof result.code === 'string') return result as Result;
    throw new Error('Unexpected conversation response');
  } catch {
    return {success:false,code:'NETWORK_ERROR',message:'The conversation could not be refreshed. Please check your connection and try again.',correlationId:''};
  }
}
