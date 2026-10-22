'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowRight, CheckCircle2, Eye, EyeOff, Loader2, LockKeyhole, Sparkles } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});
type LoginForm = z.infer<typeof loginSchema>;

const benefits = ['See the full picture in one workspace', 'Keep teams, customers, and operations aligned', 'Make faster decisions with live insights'];

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginSkeleton />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginSkeleton() {
  return (
    <main className="min-h-screen bg-slate-50 p-3 text-slate-900 lg:p-5">
      <div className="grid min-h-[calc(100vh-1.5rem)] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="hidden bg-gradient-to-br from-indigo-50 via-white to-cyan-50 lg:block" />
        <section className="flex min-h-[calc(100vh-1.5rem)] items-center justify-center bg-white px-5 py-12 sm:px-10">
          <div className="w-full max-w-md space-y-5">
            <div className="h-12 w-12 animate-pulse rounded-2xl bg-slate-200" />
            <div className="h-9 w-48 animate-pulse rounded-lg bg-slate-200" />
            <div className="h-12 w-full animate-pulse rounded-lg bg-slate-200" />
            <div className="h-12 w-full animate-pulse rounded-lg bg-slate-200" />
            <div className="h-12 w-full animate-pulse rounded-lg bg-slate-200" />
          </div>
        </section>
      </div>
    </main>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedRedirect = searchParams.get('redirect');
  const redirect = requestedRedirect && requestedRedirect.startsWith('/') && !requestedRedirect.startsWith('/login') && !requestedRedirect.startsWith('/register')
    ? requestedRedirect
    : '/dashboard';
  const { login } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const { register, control, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginForm) => {
    setError('');
    try {
      await login(data.email, data.password, data.rememberMe);
      // A workspace that never finished the wizard goes straight back into it,
      // so a user who signs out half-way through resumes where they stopped.
      const tenant = useAuthStore.getState().tenant;
      router.push(tenant && tenant.onboardingCompleted === false ? '/onboarding' : redirect);
    } catch (err: any) {
      setError(err.message || 'We could not sign you in. Please try again.');
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 p-3 text-slate-900 lg:p-5">
      <div className="grid min-h-[calc(100vh-1.5rem)] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative hidden overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-cyan-50 p-10 lg:flex lg:flex-col xl:p-14">
          <div className="absolute -right-20 top-20 h-72 w-72 rounded-full border border-indigo-200/60" />
          <div className="absolute -bottom-24 left-20 h-80 w-80 rounded-full border border-cyan-200/60" />
          <div className="relative flex items-center gap-3 text-lg font-semibold tracking-tight"><span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 text-sm font-black text-white">N</span>NexOS</div>
          <div className="relative my-auto max-w-xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white/70 px-3 py-1.5 text-xs font-medium text-indigo-700"><Sparkles className="h-3.5 w-3.5" />Your business, in sync</div>
            <h1 className="text-4xl font-semibold leading-tight tracking-tight text-slate-900 xl:text-5xl">Run the work that matters from one calm, capable place.</h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-slate-600">NexOS brings your people, operations, and customer data together—so every day has a clearer next step.</p>
            <ul className="mt-9 space-y-4">{benefits.map((benefit) => <li key={benefit} className="flex items-center gap-3 text-sm text-slate-700"><CheckCircle2 className="h-5 w-5 shrink-0 text-cyan-600" />{benefit}</li>)}</ul>
          </div>
          <p className="relative text-xs text-slate-500">Secure workspace access for modern teams.</p>
        </section>

        <section className="flex min-h-[calc(100vh-1.5rem)] items-center justify-center bg-white px-5 py-12 sm:px-10">
          <div className="w-full max-w-md">
            <div className="mb-10 flex items-center gap-3 lg:hidden"><span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 text-sm font-black text-white">N</span><span className="text-lg font-semibold">NexOS</span></div>
            <div className="mb-8"><div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl border border-indigo-200 bg-indigo-50 text-indigo-600"><LockKeyhole className="h-5 w-5" /></div><h2 className="text-3xl font-semibold tracking-tight text-slate-900">Welcome back</h2><p className="mt-2 text-sm leading-6 text-slate-500">Sign in to continue to your NexOS workspace.</p></div>
            {error && <Alert variant="destructive" className="mb-5 border-red-200 bg-red-50 text-red-700"><AlertDescription>{error}</AlertDescription></Alert>}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="space-y-2"><Label htmlFor="email">Email address</Label><Input id="email" type="email" autoComplete="email" placeholder="you@company.com" {...register('email')} className="h-12 border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus-visible:ring-indigo-500" />{errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}</div>
              <div className="space-y-2"><div className="flex items-center justify-between"><Label htmlFor="password">Password</Label><Link href="/forgot-password" className="text-xs font-medium text-indigo-600 hover:text-indigo-500">Forgot password?</Link></div><div className="relative"><Input id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Enter your password" {...register('password')} className="h-12 border-slate-300 bg-white pr-11 text-slate-900 placeholder:text-slate-400 focus-visible:ring-indigo-500" /><button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div>{errors.password && <p className="text-xs text-red-600">{errors.password.message}</p>}</div>
              <div className="flex items-center gap-2.5">
                {/* The Radix checkbox renders a <button role="checkbox">, not an
                    <input type="checkbox">. Registering it with react-hook-form
                    therefore captured the button's value (an empty string), which
                    failed `z.boolean().optional()` and made the whole form
                    silently refuse to submit. `Controller` hands the field a
                    real boolean. */}
                <Controller
                  name="rememberMe"
                  control={control}
                  render={({ field }) => (
                    <Checkbox
                      id="rememberMe"
                      checked={field.value === true}
                      onCheckedChange={(checked) => field.onChange(checked === true)}
                    />
                  )}
                />
                <Label htmlFor="rememberMe" className="cursor-pointer text-sm font-normal text-slate-600">Keep me signed in for 30 days</Label>
              </div>
              {errors.rememberMe && <p className="text-xs text-red-600">{errors.rememberMe.message}</p>}
              <Button type="submit" className="h-12 w-full bg-indigo-600 text-white hover:bg-indigo-500" disabled={isSubmitting}>{isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}{isSubmitting ? 'Signing in…' : 'Sign in to NexOS'}</Button>
            </form>
            <p className="mt-8 text-center text-sm text-slate-500">New to NexOS? <Link href="/register" className="font-medium text-indigo-600 hover:text-indigo-500">Create a workspace</Link></p>
          </div>
        </section>
      </div>
    </main>
  );
}
