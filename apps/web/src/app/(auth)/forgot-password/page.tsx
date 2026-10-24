'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { ArrowLeft, MailCheck, Send } from 'lucide-react';
import { api } from '@/lib/api';
import { useBranding } from '@/components/providers/TenantBrandingProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ForgotPasswordPage() {
  const { branding } = useBranding();
  const businessName = branding?.businessName || 'NexOS';
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true); setError('');
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err: any) {
      setError(err?.message || 'We could not request a reset link. Please try again.');
    } finally { setSubmitting(false); }
  }

  return <main className="grid min-h-screen place-items-center bg-gradient-to-br from-slate-50 via-white to-indigo-50 p-5 text-slate-900">
    <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/60">
      <div className="mb-8 flex items-center gap-3">
        {branding?.logoUrl ? <img src={branding.logoUrl} className="h-11 w-11 rounded-xl object-contain" alt="" /> : <span className="grid h-11 w-11 place-items-center rounded-xl bg-indigo-600 font-bold text-white">{businessName[0]}</span>}
        <div><p className="font-semibold">{businessName}</p><p className="text-xs text-slate-500">Workspace account recovery</p></div>
      </div>
      {sent ? <div className="space-y-5"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-600"><MailCheck /></div><h1 className="text-2xl font-semibold">Check your inbox</h1><p className="text-sm leading-6 text-slate-600">If that email belongs to an account, we have sent a secure password-reset link. It expires in one hour.</p><Button asChild className="w-full"><Link href="/login">Return to sign in</Link></Button></div> : <form onSubmit={submit} className="space-y-5"><div><h1 className="text-2xl font-semibold">Reset your password</h1><p className="mt-2 text-sm leading-6 text-slate-600">Enter the email you use for {businessName}. We will send a secure reset link.</p></div><div className="space-y-2"><Label htmlFor="email">Email address</Label><Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" placeholder="you@company.com" className="h-12" /></div>{error && <p className="text-sm text-red-600">{error}</p>}<Button className="h-12 w-full" disabled={submitting}>{submitting ? 'Sending…' : <><Send className="mr-2 h-4 w-4" />Send reset link</>}</Button><Link href="/login" className="flex items-center justify-center gap-2 text-sm font-medium text-indigo-600"><ArrowLeft className="h-4 w-4" />Back to sign in</Link></form>}
    </section>
  </main>;
}
