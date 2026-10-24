'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { brandingAssetUrl } from '@/lib/brandingApi';

type Block = {
  id?: string;
  type?: string;
  title?: string;
  subtitle?: string;
  content?: string;
  ctaText?: string;
  props?: { heading?: string; subheading?: string; label?: string };
  items?: Array<{ name?: string; desc?: string; description?: string }>;
  enabled?: boolean;
};

function blockText(block: Block, key: 'title' | 'subtitle' | 'ctaText') {
  if (block[key]) return block[key];
  if (key === 'title') return block.props?.heading || '';
  if (key === 'subtitle') return block.props?.subheading || '';
  return block.props?.label || '';
}

export default function TenantPublicPage() {
  const params = useParams<{ subdomain: string; path?: string[] }>();
  const slug = params?.path?.[0] || '';
  const host = typeof window === 'undefined' ? '' : window.location.hostname;
  const { data, isLoading, isError } = useQuery({
    queryKey: ['public-site', host, slug],
    queryFn: () => api.get('/branding/public-site', { params: { host, page: slug || undefined } }) as Promise<any>,
    enabled: Boolean(host),
    retry: false,
  });
  const site = data?.data;
  const branding = site?.branding;
  const page = site?.page;
  const pages = site?.pages || [];
  const blocks: Block[] = Array.isArray(page?.blocks) ? page.blocks : [];
  const primary = branding?.primaryColor || '#4f46e5';
  const logo = brandingAssetUrl(branding?.logoUrl);

  if (isLoading) return <main className="grid min-h-screen place-items-center text-sm text-slate-600">Loading this business website…</main>;
  if (isError || !branding) return <main className="grid min-h-screen place-items-center p-6 text-center"><div><h1 className="text-2xl font-bold">Business website unavailable</h1><p className="mt-2 text-slate-600">This address is not linked to an active business website.</p></div></main>;

  return <main className="min-h-screen bg-white text-slate-900">
    <header className="sticky top-0 z-10 border-b bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-5">
        <Link href="/" className="flex items-center gap-3 font-semibold">
          {logo ? <img src={logo} alt={`${branding.businessName} logo`} className="h-9 w-9 rounded object-contain" /> : <span className="grid h-9 w-9 place-items-center rounded text-white" style={{ backgroundColor: primary }}>{branding.businessName.charAt(0)}</span>}
          <span>{branding.businessName}</span>
        </Link>
        <nav className="hidden gap-5 text-sm md:flex">
          {pages.map((item: any) => <Link key={item.slug} href={item.isHomepage ? '/' : `/${item.slug}`} className="hover:opacity-70">{item.title}</Link>)}
        </nav>
        <Link href="/login" className="rounded px-4 py-2 text-sm font-medium text-white" style={{ backgroundColor: primary }}>Owner login</Link>
      </div>
    </header>

    {!page ? <section className="mx-auto max-w-2xl px-5 py-28 text-center"><h1 className="text-3xl font-bold">Website not published yet</h1><p className="mt-3 text-slate-600">{branding.businessName} has not published a public page at this address.</p></section> :
      <>
        {blocks.length === 0 ? <section className="mx-auto max-w-2xl px-5 py-28 text-center"><h1 className="text-4xl font-bold">{page.title}</h1><p className="mt-3 text-slate-600">This page has been published without content blocks.</p></section> :
          blocks.filter((block) => block.enabled !== false).map((block, index) => {
            const title = blockText(block, 'title');
            const subtitle = blockText(block, 'subtitle');
            const action = blockText(block, 'ctaText');
            const hero = block.type === 'hero';
            return <section key={block.id || index} className={hero ? 'py-24 text-white' : 'py-16'} style={hero ? { backgroundColor: primary } : undefined}>
              <div className="mx-auto max-w-5xl px-5">
                <h1 className={hero ? 'max-w-3xl text-4xl font-bold md:text-6xl' : 'text-3xl font-bold'}>{title}</h1>
                {(subtitle || block.content) && <p className={hero ? 'mt-5 max-w-2xl text-lg text-white/85' : 'mt-4 max-w-2xl text-slate-600'}>{subtitle || block.content}</p>}
                {block.items?.length ? <div className="mt-8 grid gap-4 md:grid-cols-3">{block.items.map((item, itemIndex) => <article key={itemIndex} className="rounded-lg border bg-white p-5 text-slate-900 shadow-sm"><h2 className="font-semibold">{item.name}</h2><p className="mt-2 text-sm text-slate-600">{item.desc || item.description}</p></article>)}</div> : null}
                {action && <a href="#contact" className={hero ? 'mt-7 inline-block rounded bg-white px-5 py-3 font-medium text-slate-900' : 'mt-7 inline-block rounded px-5 py-3 font-medium text-white'} style={hero ? undefined : { backgroundColor: primary }}>{action}</a>}
              </div>
            </section>;
          })}
      </>}
    <footer id="contact" className="border-t bg-slate-50 py-10"><div className="mx-auto max-w-6xl px-5 text-sm text-slate-600"><strong className="text-slate-900">{branding.businessName}</strong>{branding.supportEmail ? <span> · {branding.supportEmail}</span> : null}{branding.supportPhone ? <span> · {branding.supportPhone}</span> : null}</div></footer>
  </main>;
}
