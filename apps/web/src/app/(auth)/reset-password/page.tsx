'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, KeyRound } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ResetPasswordPage() {
  const router = useRouter(); const search = useSearchParams();
  const token = search.get('token') || '';
  const [password, setPassword] = useState(''); const [confirm, setConfirm] = useState('');
  const [error, setError] = useState(''); const [done, setDone] = useState(false); const [submitting, setSubmitting] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); setError('');
    if (!token) return setError('This password-reset link is incomplete. Request a new one.');
    if (password.length < 8) return setError('Use at least 8 characters.');
    if (password !== confirm) return setError('The passwords do not match.');
    setSubmitting(true);
    try { await api.post('/auth/reset-password', { token, password }); setDone(true); setTimeout(() => router.push('/login'), 1800); }
    catch (err: any) { setError(err?.message || 'That reset link is invalid or has expired.'); }
    finally { setSubmitting(false); }
  }
  return <main className="grid min-h-screen place-items-center bg-gradient-to-br from-slate-50 via-white to-indigo-50 p-5"><section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/60">{done ? <div className="space-y-5"><CheckCircle2 className="h-12 w-12 text-emerald-600" /><h1 className="text-2xl font-semibold">Password updated</h1><p className="text-sm text-slate-600">Your password is secure. Taking you back to sign in…</p><Button asChild className="w-full"><Link href="/login">Sign in now</Link></Button></div> : <form onSubmit={submit} className="space-y-5"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-indigo-50 text-indigo-600"><KeyRound /></div><div><h1 className="text-2xl font-semibold">Choose a new password</h1><p className="mt-2 text-sm text-slate-600">Use at least 8 characters and keep it private.</p></div><div className="space-y-2"><Label htmlFor="password">New password</Label><Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" required /></div><div className="space-y-2"><Label htmlFor="confirm">Confirm password</Label><Input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" required /></div>{error && <p className="text-sm text-red-600">{error}</p>}<Button className="h-12 w-full" disabled={submitting}>{submitting ? 'Updating…' : 'Update password'}</Button><Link href="/forgot-password" className="block text-center text-sm text-indigo-600">Request a new link</Link></form>}</section></main>;
}
