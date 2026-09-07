/** @jest-environment node */
jest.mock('@/lib/server/backendClient', () => ({authenticatedBackendFetch: jest.fn()}));
import {authenticatedBackendFetch} from '@/lib/server/backendClient';
import {getConversationAction} from './conversation';

const backend = jest.mocked(authenticatedBackendFetch);
const item = {key:'/content/event/eventName',paths:['/content/event/eventName'],prompt:'What is this event called?',status:'open',questionId:'q1'};
const response = (intakeProgress?: unknown) => backend.mockResolvedValue(Response.json({data:{conversation:null,messages:[],questions:[],intakeProgress}}));

test('parses the stable catalog and derives counts from item statuses', async () => {
  response({total:999,completed:999,items:[item,{...item,key:'/content/event/startDate',status:'answered'},
    {...item,key:'/content/event/endDate',status:'not_applicable'}],extraQuestionIds:['conflict',null,2]});
  const result = await getConversationAction('qa');
  expect(result.success).toBe(true);
  if (result.success) expect(result.data.intakeProgress).toMatchObject({total:3,completed:2,extraQuestionIds:['conflict']});
});

test.each([undefined, null, {items:[]}, {items:[item,item]}, {items:[{...item,status:'anything'}]},
  {items:[{...item,paths:[23]}]}])('handles old or malformed progress without inventing a fixed count: %j', async progress => {
  response(progress);
  const result = await getConversationAction('qa');
  expect(result.success).toBe(true);
  if (result.success) expect(result.data.intakeProgress).toBeUndefined();
});
