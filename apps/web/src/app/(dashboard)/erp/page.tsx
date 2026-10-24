'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Boxes, Calculator, ClipboardList, FileText, Package, ShoppingCart, Truck, WalletCards } from 'lucide-react';
import { inventoryApi } from '@/lib/inventoryApi';
import { invoicesApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const modules = [
  { title: 'Sales & POS', description: 'Create a sale from available stock and issue its receipt.', href: '/sales', icon: ShoppingCart },
  { title: 'Purchasing & Receiving', description: 'Find suppliers and products, issue a purchase order, then receive stock.', href: '/inventory', icon: Truck },
  { title: 'Inventory & Warehouses', description: 'Manage products, stock levels, barcodes and reorder points.', href: '/inventory', icon: Package },
  { title: 'Financial Accounting', description: 'Issue, send and reconcile invoices and payments.', href: '/finance', icon: Calculator },
  { title: 'Invoice Templates', description: 'Select a business-ready invoice design for downloadable PDFs.', href: '/invoice-templates', icon: FileText },
  { title: 'Projects & Operations', description: 'Coordinate work, records and operational documents.', href: '/projects', icon: ClipboardList },
];

export default function ErpPage() {
  const { data: inventory } = useQuery({ queryKey: ['inventory-stats'], queryFn: inventoryApi.stats });
  const { data: invoices } = useQuery({ queryKey: ['invoice-stats'], queryFn: invoicesApi.stats });
  const stock = (inventory as any)?.data || {}; const finance = (invoices as any)?.data?.summary || {};
  const metric = (value: unknown) => Number(value || 0).toLocaleString();
  return <div className="space-y-6"><header className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="flex items-center gap-2 text-2xl font-bold"><Boxes className="text-indigo-600" />Enterprise Resource Planning</h1><p className="mt-1 text-sm text-muted-foreground">One operating layer for purchasing, stock, sales, finance and delivery. Every number below is calculated from this workspace’s saved records.</p></div><Button asChild><Link href="/inventory">Open supply chain</Link></Button></header><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Products" value={metric(stock.totalProducts)} /><Metric label="Stock units" value={metric(stock.totalUnits)} /><Metric label="Inventory value" value={`$${metric(stock.totalValue)}`} /><Metric label="Outstanding invoices" value={`$${metric(finance.outstanding_value)}`} /></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{modules.map((module) => { const Icon = module.icon; return <Card key={module.title} className="transition-shadow hover:shadow-md"><CardHeader className="pb-2"><Icon className="mb-3 h-6 w-6 text-indigo-600" /><CardTitle className="text-base">{module.title}</CardTitle></CardHeader><CardContent><p className="min-h-10 text-sm text-muted-foreground">{module.description}</p><Button asChild variant="link" className="mt-3 h-auto px-0"><Link href={module.href}>Open module →</Link></Button></CardContent></Card>; })}</div><Card><CardContent className="p-5 text-sm text-muted-foreground"><strong className="text-foreground">How the real workflow connects:</strong> create a product → create and receive a purchase order → stock becomes available → sell in POS → issue an invoice or receipt → reconcile payment. There are no sample orders, risks or scheduled jobs on this screen.</CardContent></Card></div>;
}

function Metric({ label, value }: { label: string; value: string }) { return <Card><CardContent className="pt-5"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p></CardContent></Card>; }
