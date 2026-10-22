'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Globe, Layout, Store, Sparkles, Puzzle, Database, Plus,
  ExternalLink, FileText, Eye, Settings, Image as ImageIcon, CheckCircle, Edit
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { TEMPLATES_DATA } from '@/lib/templatesData';
import { toast } from '@/hooks/useToast';

export default function CmsBuilderHubPage() {
  const router = useRouter();
  const { tenant } = useAuthStore();
  const [tab, setTab] = useState('pages');

  const [cmsPages, setCmsPages] = useState([
    { id: 'p-1', title: 'Home Landing Page', slug: '/', status: 'Published', lastEdited: 'Today, 2:15 PM', views: '4,120' },
    { id: 'p-2', title: 'Services & Accommodations', slug: '/services', status: 'Published', lastEdited: 'Yesterday', views: '1,840' },
    { id: 'p-3', title: 'Online Store & Products', slug: '/shop', status: 'Published', lastEdited: 'Oct 20', views: '2,950' },
    { id: 'p-4', title: 'Bookings & Reservations', slug: '/booking', status: 'Published', lastEdited: 'Oct 18', views: '3,210' },
    { id: 'p-5', title: 'Careers & Open Vacancies', slug: '/careers', status: 'Published', lastEdited: 'Oct 15', views: '840' },
  ]);

  return (
    <div className="space-y-6">
      {/* ── Top Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Layout className="h-6 w-6 text-indigo-600" />
            Content Management System (CMS) Builder
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Design, edit, and publish web pages, product catalogs, and media assets for <strong className="text-foreground">{tenant?.name}</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs gap-1.5"
            onClick={() => window.open(`/site/${tenant?.subdomain || 'demo'}`, '_blank')}
          >
            <ExternalLink className="h-3.5 w-3.5 text-indigo-600" />
            Live Preview Site
          </Button>

          <Button
            size="sm"
            className="h-8 text-xs gap-1.5 bg-indigo-600 text-white hover:bg-indigo-500"
            onClick={() => router.push('/website')}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Open 100+ Templates Library
          </Button>
        </div>
      </div>

      {/* ── Overview Metrics ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Published Pages</p>
            <p className="text-2xl font-bold font-mono">{cmsPages.length}</p>
            <p className="text-[11px] text-green-600 font-medium mt-1">100% Mobile Responsive</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Total Web Visits</p>
            <p className="text-2xl font-bold font-mono">12,960</p>
            <p className="text-[11px] text-muted-foreground mt-1">Last 30 days traffic</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Active Template</p>
            <p className="text-base font-bold truncate text-indigo-600">Tailored {tenant?.industry || 'Business'} Modern</p>
            <p className="text-[11px] text-muted-foreground mt-1">Custom domain mapped</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Template Bank</p>
            <p className="text-2xl font-bold font-mono text-foreground">{TEMPLATES_DATA.length}+ Built</p>
            <p className="text-[11px] text-muted-foreground mt-1">Covering 70+ industries</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Tabs Navigation ─────────────────────────────────────────────────── */}
      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList className="bg-muted/70 p-1">
          <TabsTrigger value="pages" className="text-xs gap-1.5">
            <Globe className="h-3.5 w-3.5" /> Managed Pages ({cmsPages.length})
          </TabsTrigger>
          <TabsTrigger value="blocks" className="text-xs gap-1.5">
            <Layout className="h-3.5 w-3.5" /> Reusable CMS Blocks
          </TabsTrigger>
          <TabsTrigger value="seo" className="text-xs gap-1.5">
            <Sparkles className="h-3.5 w-3.5" /> SEO & Domain Settings
          </TabsTrigger>
        </TabsList>

        {/* Managed Pages */}
        <TabsContent value="pages">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-semibold">Active Website Pages</CardTitle>
                <p className="text-xs text-muted-foreground">Manage page contents, navigation links, and publishing status</p>
              </div>
              <Button
                size="sm"
                className="h-8 text-xs bg-indigo-600 text-white"
                onClick={() => router.push('/website')}
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Add New Page
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/40 border-b text-muted-foreground">
                    <tr>
                      <th className="p-3 font-semibold">Page Title</th>
                      <th className="p-3 font-semibold">URL Path</th>
                      <th className="p-3 font-semibold">Status</th>
                      <th className="p-3 font-semibold">Monthly Traffic</th>
                      <th className="p-3 font-semibold">Last Edited</th>
                      <th className="p-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {cmsPages.map((pg) => (
                      <tr key={pg.id} className="hover:bg-muted/30">
                        <td className="p-3 font-semibold text-foreground flex items-center gap-2">
                          <FileText className="h-3.5 w-3.5 text-indigo-600" />
                          {pg.title}
                        </td>
                        <td className="p-3 font-mono text-muted-foreground">{pg.slug}</td>
                        <td className="p-3">
                          <Badge variant="outline" className="text-[10px] bg-green-500/10 text-green-600 border-green-500/20">
                            {pg.status}
                          </Badge>
                        </td>
                        <td className="p-3 font-mono text-muted-foreground">{pg.views} views</td>
                        <td className="p-3 text-muted-foreground">{pg.lastEdited}</td>
                        <td className="p-3 text-right">
                          <div className="flex justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => router.push('/website')}
                            >
                              <Edit className="h-3 w-3 mr-1" /> Visual Editor
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs text-indigo-600"
                              onClick={() => window.open(`/site/${tenant?.subdomain || 'demo'}`, '_blank')}
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reusable CMS Blocks */}
        <TabsContent value="blocks" className="space-y-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { title: 'Hero Banner Section', desc: 'High-impact headline, subheadline, call-to-action buttons, and background imagery.' },
              { title: 'E-Commerce Product Showcase', desc: 'Interactive grid with real-time inventory prices, Cart drawer, and WhatsApp checkout.' },
              { title: 'Online Calendar Booking Slot Picker', desc: 'Allows clients to choose services, pick staff, and reserve appointment times.' },
              { title: 'Careers & Vacancy Application Form', desc: 'Job postings board with resume upload and automated applicant tracking.' },
              { title: 'Interactive Customer Contact Form', desc: 'Direct lead capture storing inquiries in your CRM pipeline.' },
              { title: 'Client Testimonials & Ratings', desc: 'Star ratings, verified customer quotes, and trust badges.' },
            ].map((blk, i) => (
              <Card key={i} className="hover:border-primary/40 transition-colors">
                <CardContent className="pt-5 pb-4">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center font-bold text-xs mb-3">
                    <Layout className="h-4 w-4" />
                  </div>
                  <h4 className="font-semibold text-xs text-foreground">{blk.title}</h4>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{blk.desc}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full mt-3 h-7 text-xs"
                    onClick={() => router.push('/website')}
                  >
                    Insert Block into Page
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* SEO & Domains */}
        <TabsContent value="seo">
          <Card className="max-w-xl p-5 space-y-4">
            <h3 className="font-semibold text-sm">Search Engine Optimization (SEO)</h3>
            <div className="space-y-3 text-xs">
              <div>
                <Label>Meta Title</Label>
                <Input defaultValue={`${tenant?.name} — Official Website & Booking`} className="h-9 text-xs" />
              </div>
              <div>
                <Label>Meta Description</Label>
                <textarea rows={2} defaultValue="Welcome to our official platform. Browse services, shop products, and book online." className="w-full p-2.5 border rounded-lg bg-background text-xs" />
              </div>
              <div>
                <Label>Custom Domain Mapping</Label>
                <Input defaultValue={tenant?.customDomain || ''} placeholder="www.mybusiness.com" className="h-9 text-xs font-mono" />
              </div>
              <Button size="sm" className="bg-indigo-600 text-white" onClick={() => toast({ title: 'SEO preferences saved!' })}>
                Save SEO Settings
              </Button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
