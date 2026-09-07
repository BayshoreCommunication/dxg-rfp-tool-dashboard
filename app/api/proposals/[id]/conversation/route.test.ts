/** @jest-environment node */
jest.mock('@/app/actions/conversation', () => ({getConversationAction:jest.fn()}));
jest.mock('@/auth', () => ({auth:jest.fn()}));
import {auth} from '@/auth';
import {getConversationAction} from '@/app/actions/conversation';
import {GET} from './route';
const read = jest.mocked(getConversationAction);
beforeEach(() => {jest.clearAllMocks(); (auth as jest.Mock).mockResolvedValue({user:{id:'user-1'}});});
test.each([null,{user:{id:'user-1'},authError:'SessionExpired'}])('refuses absent or expired frontend sessions',async session => {
  (auth as jest.Mock).mockResolvedValue(session);
  const response=await GET(new Request('https://app.test'),{params:Promise.resolve({id:'aaaaaaaaaaaaaaaaaaaaaaaa'})});
  expect(response.status).toBe(401);
  expect(read).not.toHaveBeenCalled();
});
test('rejects invalid proposal ids before any backend access', async () => {
  const response=await GET(new Request('https://app.test'),{params:Promise.resolve({id:'../other'})});
  expect(response.status).toBe(400);
  expect(read).not.toHaveBeenCalled();
});
test.each([['AUTHENTICATION_REQUIRED',401],['AUTHORIZATION_DENIED',403],['PROPOSAL_NOT_FOUND',404]] as const)('preserves %s access protection',async (code,status) => {
  read.mockResolvedValue({success:false,code,message:'Denied',correlationId:'test'});
  const response=await GET(new Request('https://app.test'),{params:Promise.resolve({id:'aaaaaaaaaaaaaaaaaaaaaaaa'})});
  expect(response.status).toBe(status);
  expect(response.headers.get('cache-control')).toBe('private, no-store');
});
test('serves an authorized snapshot without cache sharing', async () => {
  read.mockResolvedValue({success:true,data:{conversation:null,messages:[],questions:[]},correlationId:'test'});
  const response=await GET(new Request('https://app.test'),{params:Promise.resolve({id:'aaaaaaaaaaaaaaaaaaaaaaaa'})});
  expect(response.status).toBe(200);
  expect(response.headers.get('cache-control')).toBe('private, no-store');
  expect(read).toHaveBeenCalledWith('aaaaaaaaaaaaaaaaaaaaaaaa');
});
