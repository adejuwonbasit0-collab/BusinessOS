'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';

const PLANS = [
  {
    name: 'Starter',
    price: 'Free',
    period: 'forever',
    tagline: 'For solo operators finding their footing.',
    features: ['1 workspace', 'Core modules (sales, CRM, finance)', 'Up to 3 users', 'Community support'],
    cta: 'Start free',
    featured: false,
  },
  {
    name: 'Growth',
    price: '$49',
    period: 'per month',
    tagline: 'For small teams that need real operations.',
    features: ['Unlimited workspaces per account', 'All modules incl. inventory, POS, HR, projects', 'Up to 15 users', 'AI insights + forecasts', 'Email support'],
    cta: 'Start 14-day trial',
    featured: true,
  },
  {
    name: 'Scale',
    price: 'Custom',
    period: '',
    tagline: 'For companies with complex needs.',
    features: ['Everything in Growth', 'Multi-branch & multi-warehouse', 'SSO / audit logs / API access', 'Dedicated infrastructure'],
    cta: 'Talk to sales',
    featured: false,
  },
];

export default function PricingPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="font-bold text-lg">Nex<span className="text-blue-500">OS</span></Link>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => router.push('/login')}>Sign in</Button>
            <Button onClick={() => router.push('/register')}>Get started</Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight">Simple pricing</h1>
          <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
            Start free. Upgrade when your business outgrows the modules you need.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mt-12">
          {PLANS.map((p) => (
            <Card key={p.name} className={p.featured ? 'border-primary' : ''}>
              <CardHeader>
                <CardTitle>{p.name}</CardTitle>
                <CardDescription>{p.tagline}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold">{p.price}<span className="text-sm font-normal text-muted-foreground">{p.period ? ` / ${p.period}` : ''}</span></div>
                <ul className="mt-4 space-y-2">
                  {p.features.map((f) => (
                    <li key={f} className="text-sm text-muted-foreground flex items-center gap-2">
                      <span className="text-green-600">✓</span> {f}
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button className="w-full" variant={p.featured ? 'default' : 'outline'} onClick={() => router.push('/register')}>
                  {p.cta}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        <p className="mt-10 text-center text-sm text-muted-foreground">
          All plans include the core module set. Additional modules (HR, projects, bookings, documents, …) can be
          toggled per workspace under Settings → Industry & Modules.
        </p>
      </main>
    </div>
  );
}
