// Local-only deterministic backend for attachment onboarding browser checks.
// It has no database, provider credentials, or network forwarding.
import crypto from 'node:crypto';
const proposalId = 'cccccccccccccccccccccccc';
const sourceId = '11111111-1111-4111-8111-111111111111';
const stamp = () => new Date().toISOString();
let state;
const reset = () => { state = { messages: [], scan: 'scanning', uploaded: false, name: 'brief.txt', requests: [], uploadCount: 0, eventName: 'Untitled proposal', delays: {} }; };
reset();
const json = (res, data, status = 200) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' }); res.end(JSON.stringify(data)); };
const body = async req => { const chunks = []; for await (const chunk of req) chunks.push(chunk); return JSON.parse(Buffer.concat(chunks).toString() || '{}'); };
const source = () => ({ id: sourceId, status: state.scan, confidentiality: 'non_confidential', originalFilename: state.name, createdAt: stamp(), origin: 'upload' });
const question = (path, prompt, type = 'text') => ({ id: `q-${path}`, code: `field:${path}`, severity: 'question', paths: [`/content/event/${path}`], prompt, status: 'open', impact: 'scope', answerType: type, options: [] });
const message = overrides => ({ id: crypto.randomUUID(), ordinal: state.messages.length + 1, role: 'assistant', kind: 'note', content: '', intent: null, runType: null, runId: null, jobId: null, status: 'complete', createdAt: stamp(), attachments: [], ...overrides });
const job = () => ({ id: sourceId, type: 'source_scan', status: state.scan === 'ready' ? 'succeeded' : state.scan === 'failed' ? 'failed' : 'running', progress: 0, createdAt: stamp(), updatedAt: stamp() });

export async function handleProposalOnboarding(req, res, url) {
  const path = url.pathname;
  if (path === '/__e2e/onboarding') {
    if (req.method === 'POST') {
      const input = await body(req);
      if (input.reset) reset();
      if (input.delays) state.delays = input.delays;
      if (input.scan) state.scan = input.scan;
      if (input.intakeProgress) state.intakeProgress = input.intakeProgress;
      if (Array.isArray(input.questions)) {
        state.questions = input.questions;
        state.messages = [message({ role: 'user', kind: 'instruction', content: 'Help me plan an event.' })];
      }
      if (input.outcome) {
        const run = [...state.messages].reverse().find(item => item.runType === 'proposal_context');
        if (run) {
          run.status = input.outcome;
          run.content = input.outcome === 'complete'
            ? 'I found Northstar Leadership Summit, September 14–16, 2027, and 450 attendees in your brief. Let’s fill in the missing venue next.'
            : 'Requirement extraction did not finish. Try again.';
          if (input.outcome === 'complete') state.eventName = 'Northstar Leadership Summit';
        }
      }
    }
    json(res, state); return true;
  }
  if (path === '/api/proposals' && req.method === 'POST') {
    await body(req);
    await new Promise(resolve => setTimeout(resolve, state.delays.create ?? 0));
    json(res, { data: { _id: proposalId, version: 1, isDraft: true, status: 'unsubmitted', event: { eventName: state.eventName } } }); return true;
  }
  if (path === `/api/proposals/${proposalId}` && req.method === 'GET') {
    json(res, { data: { _id: proposalId, version: 1, isDraft: true, status: 'unsubmitted', event: { eventName: state.eventName } } }); return true;
  }
  const base = `/api/v1/proposals/${proposalId}`;
  if (path === `${base}/sources/upload-session`) {
    const input = await body(req); state.name = input.filename;
    await new Promise(resolve => setTimeout(resolve, state.delays.upload ?? 0));
    json(res, { data: { source: { id: sourceId }, uploadUrl: `http://127.0.0.1:8011/__e2e/onboarding-upload`, requiredHeaders: {} } }); return true;
  }
  if (path === '/__e2e/onboarding-upload') {
    if (req.method === 'OPTIONS') {
      res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'PUT,OPTIONS', 'Access-Control-Allow-Headers': '*' }); res.end();
    } else {
      for await (const chunk of req) void chunk;
      state.uploadCount += 1; json(res, {});
    }
    return true;
  }
  if (path === `/api/v1/sources/${sourceId}/complete`) { state.uploaded = true; json(res, { data: { source: source() } }); return true; }
  if (path === `/api/v1/sources/${sourceId}/scan-jobs` || path === `/api/v1/jobs/${sourceId}`) { json(res, { data: job() }); return true; }
  if (path === `${base}/sources`) { json(res, { data: state.uploaded ? [source()] : [] }); return true; }
  if (path === `${base}/conversation`) {
    json(res, { data: {
      conversation: { id: 'synthetic-onboarding', title: 'Proposal assistant', status: 'active', messageCount: state.messages.length, updatedAt: `${state.eventName}:${state.messages.length}:${state.messages.at(-1)?.status}` },
      messages: state.messages,
      questions: state.questions ?? (state.eventName === 'Untitled proposal' ? [question('eventName', 'What is this event called?')] : [{ ...question('venueName', 'Which venue will host the event?'), paths: ['/content/venueSchedule/venueName'] }]),
      capabilities: { conversationExtraction: false },
      intakeProgress: state.intakeProgress,
    } }); return true;
  }
  if (path === `${base}/conversation/messages`) {
    const input = await body(req); state.requests.push(input);
    await new Promise(resolve => setTimeout(resolve, state.delays.chat ?? 0));
    const user = message({ role: 'user', kind: 'instruction', content: input.content, intent: input.intent, attachments: (input.sourceIds ?? []).map(id => ({ sourceId: id, filename: state.name, role: 'input', sourceStatus: state.scan })) });
    state.messages.push(user);
    const extract = input.intent === 'extract_requirements';
    const assistant = message(extract
      ? { kind: 'run_result', status: 'pending', runType: 'proposal_context', runId: crypto.randomUUID(), jobId: crypto.randomUUID() }
      : { content: 'I’ve received your brief. I’ll check the file and pull out the event details, then we’ll review what I found and work through anything missing together.' });
    state.messages.push(assistant);
    json(res, { data: { created: true, message: user, assistantMessageId: assistant.id, run: extract ? { runId: assistant.runId, runType: 'proposal_context', jobId: assistant.jobId } : null } }); return true;
  }
  if (path.startsWith(`${base}/context-runs/`) && !path.endsWith('/latest')) {
    json(res, { data: { run: { id: state.messages.at(-1)?.runId }, evidence: [{ source_version_id: `source:${sourceId}` }], operations: [{ path: '/content/event/eventName', value: state.eventName }] } }); return true;
  }
  return false;
}
