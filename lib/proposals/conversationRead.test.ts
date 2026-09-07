/** @jest-environment node */
import { readConversationSnapshot } from './conversationRead';
const originalFetch = global.fetch;
afterEach(() => {global.fetch=originalFetch;});
test('polls a private no-store GET endpoint, not an assistant Server Action', async () => {
  const result = {success:true,data:{conversation:null,messages:[],questions:[]},correlationId:'test'};
  global.fetch=jest.fn(async () => Response.json(result));
  await expect(readConversationSnapshot('aaaaaaaaaaaaaaaaaaaaaaaa')).resolves.toEqual(result);
  expect(global.fetch).toHaveBeenCalledWith('/api/proposals/aaaaaaaaaaaaaaaaaaaaaaaa/conversation', expect.objectContaining({method:'GET',cache:'no-store',credentials:'same-origin'}));
});
test('retains authentication errors without converting them into an AI retry', async () => {
  const result={success:false,code:'AUTHENTICATION_REQUIRED',message:'Please sign in.',correlationId:'test'};
  global.fetch=jest.fn(async () => Response.json(result,{status:401}));
  await expect(readConversationSnapshot('a')).resolves.toEqual(result);
});
test.each(['network','html','invalid'])('handles %s responses with a recoverable connection error', async kind => {
  global.fetch=jest.fn(async () => {
    if(kind==='network') throw new Error('offline');
    return kind==='html' ? new Response('<html>Sign in</html>') : Response.json({success:true,data:{}});
  });
  await expect(readConversationSnapshot('a')).resolves.toMatchObject({success:false,code:'NETWORK_ERROR'});
});
