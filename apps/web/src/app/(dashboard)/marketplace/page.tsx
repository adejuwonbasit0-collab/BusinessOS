'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { marketplaceApi } from '@/lib/phase3Api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Search, Star, Download, CheckCircle, Loader2,
  Package, Puzzle, Palette, Zap, Bot, Globe,
} from 'lucide-react';
import { toast } from '@/hooks/useToast';
import { cn } from '@/lib/utils';

const TYPE_ICONS: Record<string, any> = {
  template: Package, theme: Palette, plugin: Puzzle,
  integration: Globe, ai_agent: Bot,
};

const TYPE_COLORS: Record<string, string> = {
  template: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  theme: 'bg-violet-500/10 text-violet-600 border-violet-500/20',
  plugin: 'bg-teal-500/10 text-teal-600 border-teal-500/20',
  integration: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  ai_agent: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
};

// Sample data shown when API returns empty (fresh install)
const SAMPLE_LISTINGS = [
  { id: '1', name: 'Hotel Management Template', type: 'template', category: 'Hospitality', description: 'Pre-configured workflows, dashboards, and SOPs for hotels and resorts.', price: 0, is_free: true, install_count: 1284, rating: 4.8, is_official: true, thumbnail_url: null, isInstalled: false },
  { id: '2', name: 'E-Commerce Starter Pack', type: 'template', category: 'Retail', description: 'Complete setup for online stores — inventory, orders, and customer management.', price: 0, is_free: true, install_count: 982, rating: 4.7, is_official: true, thumbnail_url: null, isInstalled: false },
  { id: '3', name: 'Dark Mode Pro Theme', type: 'theme', category: 'Themes', description: 'Sleek dark theme with customisable accent colors and high contrast UI.', price: 9.99, is_free: false, install_count: 645, rating: 4.9, is_official: false, thumbnail_url: null, isInstalled: false },
  { id: '4', name: 'AI Lead Scorer', type: 'ai_agent', category: 'Sales', description: 'Automatically score and prioritize leads using Claude AI and your CRM data.', price: 0, is_free: true, install_count: 2341, rating: 4.6, is_official: true, thumbnail_url: null, isInstalled: true },
  { id: '5', name: 'Paystack Checkout', type: 'integration', category: 'Payments', description: 'One-click Paystack payment integration with automatic invoice reconciliation.', price: 0, is_free: true, install_count: 1876, rating: 4.5, is_official: true, thumbnail_url: null, isInstalled: false },
  { id: '6', name: 'Construction Site Pack', type: 'template', category: 'Construction', description: 'Job sites, crews, equipment tracking, and safety documentation templates.', price: 19.99, is_free: false, install_count: 412, rating: 4.7, is_official: false, thumbnail_url: null, isInstalled: false },
  { id: '7', name: 'WhatsApp Bot Plugin', type: 'plugin', category: 'Communication', description: 'Auto-reply to WhatsApp messages, qualify leads, and book appointments.', price: 14.99, is_free: false, install_count: 887, rating: 4.4, is_official: false, thumbnail_url: null, isInstalled: false },
  { id: '8', name: 'School Management Template', type: 'template', category: 'Education', description: 'Student records, class scheduling, attendance, and fee management.', price: 0, is_free: true, install_count: 1103, rating: 4.8, is_official: true, thumbnail_url: null, isInstalled: false },
];

function ListingCard({ listing, onInstall, onUninstall, loading }: {
  listing: any; onInstall: () => void; onUninstall: () => void; loading: boolean;
}) {
  const Icon = TYPE_ICONS[listing.type] || Package;
  return (
    <Card className="hover:border-primary/30 transition-colors flex flex-col">
      <CardContent className="pt-5 flex flex-col flex-1">
        <div className="h-28 rounded-lg bg-gradient-to-br from-muted to-muted/40 flex items-center justify-center mb-4 text-4xl overflow-hidden">
          {listing.thumbnail_url ? <img src={listing.thumbnail_url} alt={listing.name} className="w-full h-full object-cover" /> : <Icon className="h-10 w-10 text-muted-foreground/40" />}
        </div>
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-sm leading-snug">{listing.name}</h3>
          {listing.is_official && <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-[9px] shrink-0">Official</Badge>}
        </div>
        <Badge variant="outline" className={cn('text-[10px] w-fit mb-2 capitalize', TYPE_COLORS[listing.type])}>{listing.type.replace('_', ' ')}</Badge>
        <p className="text-xs text-muted-foreground line-clamp-2 flex-1 mb-3">{listing.description}</p>
        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
          <span className="flex items-center gap-1"><Star className="h-3 w-3 fill-amber-400 text-amber-400" />{Number(listing.rating || 0).toFixed(1)}</span>
          <span className="flex items-center gap-1"><Download className="h-3 w-3" />{Number(listing.install_count || 0).toLocaleString()}</span>
          <span className="ml-auto font-semibold text-foreground">{listing.is_free ? 'Free' : `$${Number(listing.price).toFixed(2)}`}</span>
        </div>
        {listing.isInstalled ? (
          <Button size="sm" variant="outline" className="w-full h-8 text-xs text-green-600 border-green-500/30" onClick={onUninstall} disabled={loading}>
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><CheckCircle className="h-3.5 w-3.5 mr-1" />Installed</>}
          </Button>
        ) : (
          <Button size="sm" className="w-full h-8 text-xs" onClick={onInstall} disabled={loading}>
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Download className="h-3.5 w-3.5 mr-1" />{listing.is_free ? 'Install' : 'Purchase & Install'}</>}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default function MarketplacePage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishForm, setPublishForm] = useState({ name: '', type: 'template', description: '', price: '0', category: '' });

  const publishMutation = useMutation({
    mutationFn: (data: any) => marketplaceApi.submit(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['marketplace'] }); qc.invalidateQueries({ queryKey: ['marketplace-installed'] }); setPublishOpen(false); setPublishForm({ name: '', type: 'template', description: '', price: '0', category: '' }); toast({ title: 'App submitted for review' }); },
    onError: (e: any) => toast({ title: e.message || 'Failed to submit listing', variant: 'destructive' }),
  });

  const { data: listingsData, isLoading } = useQuery({
    queryKey: ['marketplace', { search, type: typeFilter }],
    queryFn: () => marketplaceApi.list({ search: search || undefined, type: typeFilter === 'all' ? undefined : typeFilter }),
  });

  const { data: installedData } = useQuery({ queryKey: ['marketplace-installed'], queryFn: marketplaceApi.installed });

  const installMutation = useMutation({
    mutationFn: (id: string) => marketplaceApi.install(id),
    onSuccess: (_, id) => { qc.invalidateQueries({ queryKey: ['marketplace'] }); qc.invalidateQueries({ queryKey: ['marketplace-installed'] }); toast({ title: 'App installed!' }); setLoadingId(null); },
    onError: (e: any) => { toast({ title: e.message, variant: 'destructive' }); setLoadingId(null); },
  });

  const uninstallMutation = useMutation({
    mutationFn: (id: string) => marketplaceApi.uninstall(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['marketplace'] }); qc.invalidateQueries({ queryKey: ['marketplace-installed'] }); toast({ title: 'App uninstalled' }); setLoadingId(null); },
    onError: (e: any) => { toast({ title: e.message, variant: 'destructive' }); setLoadingId(null); },
  });

  const rawListings = (listingsData as any)?.data?.listings || SAMPLE_LISTINGS;
  const installed = (installedData as any)?.data?.installed || [];

  const listings = rawListings.filter((l: any) => {
    if (search && !l.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (typeFilter !== 'all' && l.type !== typeFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><Package className="h-6 w-6 text-teal-500" />Marketplace</h1>
          <p className="text-sm text-muted-foreground mt-1">Templates, themes, plugins, integrations, and AI agents</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setPublishOpen(true)}>Publish App</Button>
      </div>

      <Tabs defaultValue="browse">
        <TabsList>
          <TabsTrigger value="browse">Browse</TabsTrigger>
          <TabsTrigger value="installed">
            Installed {installed.length > 0 && <span className="ml-1.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full px-1.5 py-0.5">{installed.length}</span>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search apps…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="template">Templates</SelectItem>
                <SelectItem value="theme">Themes</SelectItem>
                <SelectItem value="plugin">Plugins</SelectItem>
                <SelectItem value="integration">Integrations</SelectItem>
                <SelectItem value="ai_agent">AI Agents</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-64 skeleton rounded-xl" />)}</div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {listings.map((listing: any) => (
                <ListingCard key={listing.id} listing={listing}
                  onInstall={() => { setLoadingId(listing.id); installMutation.mutate(listing.id); }}
                  onUninstall={() => { setLoadingId(listing.id); uninstallMutation.mutate(listing.id); }}
                  loading={loadingId === listing.id}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="installed" className="mt-4">
          {installed.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-xl">
              <Package className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="font-medium">No apps installed yet</p>
              <p className="text-sm mt-1">Browse the marketplace to find templates, themes, and plugins</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {installed.map((app: any) => (
                <Card key={app.id}>
                  <CardContent className="pt-5 flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                      {(TYPE_ICONS[app.type] || Package)({ className: 'h-5 w-5 text-muted-foreground' })}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{app.name}</p>
                      <p className="text-xs text-muted-foreground">v{app.installed_version}</p>
                    </div>
                    <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive"
                      onClick={() => { setLoadingId(app.listing_id); uninstallMutation.mutate(app.listing_id); }}>
                      {loadingId === app.listing_id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Remove'}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={publishOpen} onOpenChange={setPublishOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Publish App</DialogTitle></DialogHeader>
          <div className="space-y-4 py-1">
            <div className="space-y-1.5"><Label>Name</Label><Input value={publishForm.name} onChange={(e) => setPublishForm((p) => ({ ...p, name: e.target.value }))} placeholder="Acme Shipping Plugin" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={publishForm.type} onValueChange={(v) => setPublishForm((p) => ({ ...p, type: v }))}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="template">Template</SelectItem>
                    <SelectItem value="theme">Theme</SelectItem>
                    <SelectItem value="plugin">Plugin</SelectItem>
                    <SelectItem value="integration">Integration</SelectItem>
                    <SelectItem value="ai_agent">AI Agent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Price (0 = free)</Label><Input type="number" min="0" step="0.01" value={publishForm.price} onChange={(e) => setPublishForm((p) => ({ ...p, price: e.target.value }))} /></div>
            </div>
            <div className="space-y-1.5"><Label>Description</Label><Textarea value={publishForm.description} onChange={(e) => setPublishForm((p) => ({ ...p, description: e.target.value }))} /></div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setPublishOpen(false)}>Cancel</Button>
              <Button onClick={() => publishMutation.mutate(publishForm)} disabled={!publishForm.name || publishMutation.isPending}>{publishMutation.isPending ? 'Submitting…' : 'Submit for Review'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
