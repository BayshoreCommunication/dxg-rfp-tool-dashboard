'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

export default function ProposalLoadRecovery({ denied = false }: { denied?: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return <section role="alert" className="mx-auto my-10 max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
    <h1 className="text-lg font-semibold text-slate-900">{denied ? 'Access needs checking' : 'We couldn’t load this proposal right now'}</h1>
    <p className="mt-2 text-sm leading-6 text-slate-600">{denied ? 'Your account does not currently have access. Check that you are signed in with the right account, or contact your workspace owner.' : 'The service may be temporarily unavailable. This does not mean your proposal was deleted. Please try again.'}</p>
    <div className="mt-5 flex flex-wrap items-center gap-4">
      <button type="button" disabled={pending} onClick={() => startTransition(() => router.refresh())} className="rounded-xl bg-cyan-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{pending ? 'Checking…' : 'Try again'}</button>
      <Link href="/proposals" className="text-sm font-semibold text-cyan-700">All proposals</Link>
    </div>
  </section>;
}
