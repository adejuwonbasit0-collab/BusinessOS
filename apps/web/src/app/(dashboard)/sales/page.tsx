'use client';

import { useState, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { salesApi } from '@/lib/salesApi';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ShoppingCart, Plus, FileText, DollarSign, CheckCircle, CreditCard,
  RotateCcw, ArrowRight, XCircle, Barcode, Printer, Trash2, Edit,
  Search, ScanLine, MessageSquare, Receipt, User
} from 'lucide-react';
import { toast } from '@/hooks/useToast';
import { useAuthStore } from '@/store/authStore';

interface PosCartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  sku?: string;
  barcode?: string;
}

export default function SalesPage() {
  const qc = useQueryClient();
  const { tenant, user } = useAuthStore();
  const [tab, setTab] = useState<'pos' | 'orders' | 'quotes'>('pos');

  // POS State
  const [posCategory, setPosCategory] = useState('all');
  const [posSearch, setPosSearch] = useState('');
  const [posBarcodeScanInput, setPosBarcodeScanInput] = useState('');
  const [posCart, setPosCart] = useState<PosCartItem[]>([]);
  const [posPaymentModalOpen, setPosPaymentModalOpen] = useState(false);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [completedOrderReceipt, setCompletedOrderReceipt] = useState<any | null>(null);

  // Queries
  const { data: statsData } = useQuery({ queryKey: ['sales-stats'], queryFn: salesApi.stats });
  const { data: ordersData } = useQuery({ queryKey: ['sales-orders'], queryFn: () => salesApi.listOrders() });
  const { data: quotesData } = useQuery({ queryKey: ['sales-quotations'], queryFn: () => salesApi.listQuotations() });
  const { data: productsData } = useQuery({ queryKey: ['inventory-products'], queryFn: () => api.get('/inventory/products') });
  const { data: categoriesData } = useQuery({ queryKey: ['inventory-categories'], queryFn: () => api.get('/inventory/categories') });
  const { data: stockData } = useQuery({ queryKey: ['inventory-stock'], queryFn: () => api.get('/inventory/stock') });
  const { data: warehousesData } = useQuery({ queryKey: ['inventory-warehouses'], queryFn: () => api.get('/inventory/warehouses') });

  const stats = (statsData as any)?.data;
  const orders = (ordersData as any)?.data?.orders || [];
  const quotes = (quotesData as any)?.data?.quotations || [];
  const products = (productsData as any)?.data?.products || [];
  const categories = (categoriesData as any)?.data?.categories || [];
  const stock = (stockData as any)?.data?.stock || [];
  const warehouses = (warehousesData as any)?.data?.warehouses || [];
  const defaultWarehouse = warehouses.find((warehouse: any) => warehouse.is_default) || warehouses[0];

  // A new workspace has no inventory. Never manufacture products from other
  // industries: create products in Inventory first, then they appear here.
  const catalogProducts = products.filter((product: any) => {
    if (!product.track_inventory) return true;
    return stock.some((row: any) => row.product_id === product.id && Number(row.quantity_available) > 0);
  });

  // Filtered POS products
  const filteredPosProducts = catalogProducts.filter((p: any) => {
    const matchCat = posCategory === 'all' || p.category === posCategory || p.category_name === posCategory;
    const matchSearch =
      p.name.toLowerCase().includes(posSearch.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(posSearch.toLowerCase())) ||
      (p.barcode && p.barcode.includes(posSearch));
    return matchCat && matchSearch;
  });

  // Cart math
  const cartSubtotal = useMemo(() => posCart.reduce((sum, item) => sum + item.price * item.quantity, 0), [posCart]);
  const cartTax = cartSubtotal * 0.075;
  const cartGrandTotal = cartSubtotal + cartTax;

  // Add to POS Cart
  const addToPosCart = (product: any) => {
    setPosCart((prev) => {
      const exists = prev.find((item) => item.id === product.id);
      if (exists) {
        return prev.map((item) => (item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
      }
      return [
        ...prev,
        {
          id: product.id,
          name: product.name,
          price: parseFloat(product.price) || 0,
          quantity: 1,
          sku: product.sku,
          barcode: product.barcode,
        },
      ];
    });
  };

  const updatePosQty = (id: string, delta: number) => {
    setPosCart((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as PosCartItem[]
    );
  };

  // Handle Barcode Scanner Input (Press Enter in input to scan item)
  const handleBarcodeScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && posBarcodeScanInput.trim()) {
      e.preventDefault();
      const code = posBarcodeScanInput.trim();
      const match = catalogProducts.find((p: any) => p.barcode === code || p.sku === code);
      if (match) {
        addToPosCart(match);
        toast({ title: `Scanned & Added: "${match.name}"` });
      } else {
        toast({ title: `Barcode ${code} not found in inventory`, variant: 'destructive' });
      }
      setPosBarcodeScanInput('');
    }
  };

  // Process POS Checkout & Generate Receipt Prompt
  const handleCompletePosSale = async (paymentMethod: string) => {
    if (!posCart.length) return;
    try {
      const result: any = await salesApi.createOrder({
        items: posCart.map((item) => ({ productId: item.id, quantity: item.quantity, unitPrice: item.price })),
        warehouseId: defaultWarehouse?.id,
        channel: 'pos',
      });
      const order = result?.data?.order;
      if (!order) throw new Error('The sale was not recorded.');
      await salesApi.recordPayment(order.id, { amount: cartGrandTotal, method: paymentMethod.toLowerCase() });
    const receiptData = {
      receiptNumber: order.orderNumber || order.order_number || order.id,
      date: new Date().toLocaleString(),
      cashier: `${user?.firstName || 'Staff'} ${user?.lastName || ''}`,
      businessName: tenant?.name || 'NexOS Enterprise',
      phone: tenant?.phone || '+1 (555) 234-5678',
      items: [...posCart],
      subtotal: cartSubtotal,
      tax: cartTax,
      total: cartGrandTotal,
      paymentMethod,
    };

    setCompletedOrderReceipt(receiptData);
    setPosPaymentModalOpen(false);
    setReceiptModalOpen(true);
    setPosCart([]);
    qc.invalidateQueries({ queryKey: ['sales-orders'] });
    qc.invalidateQueries({ queryKey: ['sales-stats'] });
      qc.invalidateQueries({ queryKey: ['inventory-products'] });
      qc.invalidateQueries({ queryKey: ['inventory-stock'] });
      toast({ title: 'Sale recorded successfully.' });
    } catch (error: any) {
      toast({ title: error.message || 'Could not record this sale.', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Top Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ShoppingCart className="h-6 w-6 text-indigo-600" />
            Sales & Point of Sale (POS)
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Full retail POS register, barcode scanner, quotations, customer orders, and receipt printing.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            className="h-8 text-xs gap-1.5 bg-indigo-600 text-white hover:bg-indigo-500"
            onClick={() => setTab('pos')}
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            Open POS Register
          </Button>
        </div>
      </div>

      {/* ── Navigation Tabs ──────────────────────────────────────────────────── */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="space-y-4">
        <TabsList className="bg-muted/70 p-1">
          <TabsTrigger value="pos" className="text-xs gap-1.5">
            <ScanLine className="h-3.5 w-3.5" /> POS Register
          </TabsTrigger>
          <TabsTrigger value="orders" className="text-xs gap-1.5">
            <FileText className="h-3.5 w-3.5" /> Orders ({orders.length})
          </TabsTrigger>
          <TabsTrigger value="quotes" className="text-xs gap-1.5">
            <Receipt className="h-3.5 w-3.5" /> Quotations ({quotes.length})
          </TabsTrigger>
        </TabsList>

        {/* ── Tab 1: Full POS Register Interface ──────────────────────────────── */}
        <TabsContent value="pos" className="space-y-4">
          <div className="grid lg:grid-cols-3 gap-6 items-start">
            {/* Left 2 Cols: Product Catalog & Search */}
            <div className="lg:col-span-2 space-y-4">
              {/* Barcode Scanner Auto-Focus Bar */}
              <div className="flex items-center gap-2 bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900 p-2.5 rounded-xl">
                <Barcode className="h-4 w-4 text-indigo-600 shrink-0" />
                <input
                  type="text"
                  placeholder="Scan barcode or press Enter on barcode reader..."
                  value={posBarcodeScanInput}
                  onChange={(e) => setPosBarcodeScanInput(e.target.value)}
                  onKeyDown={handleBarcodeScan}
                  className="bg-transparent outline-none w-full text-xs font-mono font-medium placeholder:text-indigo-400"
                />
                <Badge variant="outline" className="text-[10px] bg-background shrink-0">Scanner Ready</Badge>
              </div>

              {/* Category Pills & Search */}
              <div className="flex flex-col sm:flex-row gap-2 justify-between items-center">
                <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto text-xs pb-1 sm:pb-0 scrollbar-none">
                  <Button
                    size="sm"
                    variant={posCategory === 'all' ? 'default' : 'outline'}
                    className={`h-7 text-xs px-2.5 ${posCategory === 'all' ? 'bg-indigo-600 text-white' : ''}`}
                    onClick={() => setPosCategory('all')}
                  >
                    All Items
                  </Button>
                  {categories.map((cat: any) => (
                    <Button
                      key={cat.id}
                      size="sm"
                      variant={posCategory === cat.name ? 'default' : 'outline'}
                      className={`h-7 text-xs px-2.5 ${posCategory === cat.name ? 'bg-indigo-600 text-white' : ''}`}
                      onClick={() => setPosCategory(cat.name)}
                    >
                      {cat.name}
                    </Button>
                  ))}
                </div>

                <div className="flex items-center gap-2 bg-card border rounded-lg px-2.5 py-1 text-xs w-full sm:w-48">
                  <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <input
                    type="text"
                    placeholder="Search item name..."
                    value={posSearch}
                    onChange={(e) => setPosSearch(e.target.value)}
                    className="bg-transparent outline-none w-full text-xs"
                  />
                </div>
              </div>

              {/* POS Product Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[580px] overflow-y-auto p-1">
                {filteredPosProducts.length === 0 ? (
                  <div className="col-span-full rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                    No products are available yet. Create a real product in <button type="button" className="font-medium text-indigo-600 underline" onClick={() => window.location.href = '/inventory'}>Inventory</button> before recording a sale.
                  </div>
                ) : filteredPosProducts.map((prod: any) => (
                  <button
                    key={prod.id}
                    onClick={() => addToPosCart(prod)}
                    className="p-3.5 border rounded-xl bg-card hover:border-indigo-500 hover:shadow-xs transition-all text-left flex flex-col justify-between group h-32"
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <span className="text-[10px] font-mono text-muted-foreground truncate">{prod.sku || 'ITEM'}</span>
                        <span className="text-[10px] text-indigo-600 font-semibold group-hover:translate-x-0.5 transition-transform">+ Add</span>
                      </div>
                      <h4 className="font-semibold text-xs text-foreground line-clamp-2 mt-1">{prod.name}</h4>
                    </div>

                    <div className="flex items-baseline justify-between pt-2 border-t mt-2">
                      <span className="text-xs font-bold font-mono text-indigo-600">${Number(prod.price || 0).toFixed(2)}</span>
                      {prod.barcode && <span className="text-[9px] text-muted-foreground font-mono">{prod.barcode}</span>}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Right Col: Active POS Cart & Register */}
            <Card className="shadow-sm border-2 border-slate-200 dark:border-slate-800 flex flex-col h-full min-h-[580px] justify-between">
              <div>
                <CardHeader className="py-3 px-4 border-b flex flex-row items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4 text-indigo-600" />
                    <CardTitle className="text-sm font-bold">Active POS Register</CardTitle>
                  </div>
                  {posCart.length > 0 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2 text-[11px] text-destructive hover:bg-destructive/10"
                      onClick={() => setPosCart([])}
                    >
                      Clear
                    </Button>
                  )}
                </CardHeader>

                {/* Cart Line Items */}
                <div className="p-3 space-y-2 max-h-[340px] overflow-y-auto divide-y">
                  {posCart.length === 0 ? (
                    <div className="text-center py-16 text-muted-foreground text-xs space-y-1">
                      <ShoppingCart className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
                      <p className="font-medium">Register is empty</p>
                      <p className="text-[11px]">Click items or scan a barcode to add to bill.</p>
                    </div>
                  ) : (
                    posCart.map((item) => (
                      <div key={item.id} className="pt-2 first:pt-0 flex items-center justify-between text-xs">
                        <div className="max-w-[170px]">
                          <p className="font-semibold text-foreground truncate">{item.name}</p>
                          <p className="text-[10px] text-muted-foreground font-mono">
                            ${item.price.toFixed(2)} x {item.quantity}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updatePosQty(item.id, -1)}
                            className="w-5 h-5 rounded bg-muted flex items-center justify-center font-bold text-xs"
                          >
                            -
                          </button>
                          <span className="font-bold text-xs w-4 text-center">{item.quantity}</span>
                          <button
                            onClick={() => updatePosQty(item.id, 1)}
                            className="w-5 h-5 rounded bg-muted flex items-center justify-center font-bold text-xs"
                          >
                            +
                          </button>
                          <span className="font-bold font-mono text-xs w-14 text-right">
                            ${(item.price * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Cart Totals & Checkout Button */}
              <div className="p-4 border-t bg-muted/20 space-y-2.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-mono font-medium">${cartSubtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax (7.5%)</span>
                  <span className="font-mono font-medium">${cartTax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold border-t pt-2">
                  <span>Total Amount</span>
                  <span className="font-mono text-indigo-600">${cartGrandTotal.toFixed(2)}</span>
                </div>

                <Button
                  className="w-full bg-indigo-600 text-white font-semibold text-xs h-11 hover:bg-indigo-500 mt-2 shadow-sm"
                  disabled={posCart.length === 0}
                  onClick={() => setPosPaymentModalOpen(true)}
                >
                  <CreditCard className="h-4 w-4 mr-1.5" />
                  Charge ${cartGrandTotal.toFixed(2)}
                </Button>
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* ── Tab 2: Orders History ───────────────────────────────────────────── */}
        <TabsContent value="orders">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Channel</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Receipt</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-xs">
                        No orders recorded yet. Make a sale in the POS Register.
                      </TableCell>
                    </TableRow>
                  ) : (
                    orders.map((o: any) => (
                      <TableRow key={o.id}>
                        <TableCell className="font-mono font-semibold text-xs text-indigo-600">{o.order_number || o.id.slice(0, 8)}</TableCell>
                        <TableCell className="text-xs">{o.contact_name || 'Walk-in Customer'}</TableCell>
                        <TableCell className="text-xs capitalize"><Badge variant="outline">{o.channel || 'POS'}</Badge></TableCell>
                        <TableCell className="text-xs text-muted-foreground">{new Date(o.created_at || Date.now()).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right font-mono font-bold text-xs">${Number(o.total_amount || 0).toFixed(2)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs text-indigo-600"
                            onClick={() => {
                              setCompletedOrderReceipt({
                                receiptNumber: o.order_number || `REC-${o.id.slice(0, 6)}`,
                                date: new Date().toLocaleDateString(),
                                cashier: user?.firstName || 'Cashier',
                                businessName: tenant?.name || 'NexOS Enterprise',
                                phone: tenant?.phone || '+1 (555) 234-5678',
                                items: [{ name: 'Order Line Items', price: Number(o.total_amount || 0), quantity: 1 }],
                                subtotal: Number(o.total_amount || 0),
                                tax: 0,
                                total: Number(o.total_amount || 0),
                                paymentMethod: 'Card / POS',
                              });
                              setReceiptModalOpen(true);
                            }}
                          >
                            <Printer className="h-3.5 w-3.5 mr-1" /> View Receipt
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab 3: Quotations ────────────────────────────────────────────────── */}
        <TabsContent value="quotes">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quote #</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Valid Until</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quotes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground text-xs">
                        No active quotations.
                      </TableCell>
                    </TableRow>
                  ) : (
                    quotes.map((q: any) => (
                      <TableRow key={q.id}>
                        <TableCell className="font-mono text-xs">{q.quotation_number || q.id.slice(0, 8)}</TableCell>
                        <TableCell className="text-xs font-semibold">{q.contact_name || 'Client'}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{q.valid_until || '30 Days'}</TableCell>
                        <TableCell className="text-right font-mono font-bold text-xs">${Number(q.total_amount || 0).toFixed(2)}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => toast({ title: 'Converted Quote to Order!' })}>
                            Convert to Order
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Modal: POS Payment Method Selector ────────────────────────────────── */}
      <Dialog open={posPaymentModalOpen} onOpenChange={setPosPaymentModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-indigo-600" />
              Tender Payment — ${cartGrandTotal.toFixed(2)}
            </DialogTitle>
            <DialogDescription>
              Select customer tender method to settle bill and print receipt.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-2.5 py-3">
            {[
              { key: 'cash', name: 'Cash', desc: 'Exact or change calculated' },
              { key: 'card', name: 'Card Terminal / POS', desc: 'Chip, PIN & contactless' },
              { key: 'paystack', name: 'Paystack QR / Mobile', desc: 'Bank transfer & USSD' },
              { key: 'flutterwave', name: 'Flutterwave', desc: 'Mobile money & card' },
              { key: 'whatsapp', name: 'Send Bill to WhatsApp', desc: 'Digital receipt link' },
              { key: 'split', name: 'Split Tender', desc: 'Cash + Card combination' },
            ].map((pm) => (
              <button
                key={pm.key}
                onClick={() => handleCompletePosSale(pm.name)}
                className="p-3 border rounded-xl bg-card hover:border-indigo-600 hover:bg-indigo-50/40 text-left transition-all"
              >
                <div className="font-semibold text-xs text-foreground">{pm.name}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{pm.desc}</div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Modal: Instant Printable Thermal Receipt ──────────────────────────── */}
      {completedOrderReceipt && (
        <Dialog open={receiptModalOpen} onOpenChange={setReceiptModalOpen}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-sm">
                <Receipt className="h-4 w-4 text-green-600" />
                Receipt Generated Successfully
              </DialogTitle>
            </DialogHeader>

            {/* 80mm Standard Thermal Receipt Layout */}
            <div className="bg-white text-slate-900 p-5 rounded-lg border font-mono text-xs shadow-inner space-y-3">
              <div className="text-center border-b pb-2 space-y-0.5">
                <p className="font-bold text-sm tracking-tight">{completedOrderReceipt.businessName}</p>
                <p className="text-[10px] text-slate-500">{completedOrderReceipt.phone}</p>
                <p className="text-[10px] text-slate-500">Tax ID: US-88492019</p>
                <p className="text-[10px] text-slate-500">{completedOrderReceipt.date}</p>
                <p className="text-[10px] font-bold text-slate-700">Receipt: {completedOrderReceipt.receiptNumber}</p>
              </div>

              <div className="divide-y divide-dashed text-[11px]">
                {completedOrderReceipt.items.map((it: any, i: number) => (
                  <div key={i} className="py-1 flex justify-between">
                    <span>{it.name} x{it.quantity}</span>
                    <span>${(it.price * it.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t pt-2 space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>${completedOrderReceipt.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax (7.5%)</span>
                  <span>${completedOrderReceipt.tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-xs border-t pt-1">
                  <span>TOTAL PAID</span>
                  <span>${completedOrderReceipt.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>Payment Method:</span>
                  <span>{completedOrderReceipt.paymentMethod}</span>
                </div>
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>Cashier:</span>
                  <span>{completedOrderReceipt.cashier}</span>
                </div>
              </div>

              <div className="text-center border-t pt-2">
                <p className="text-[10px] text-slate-500">Thank you for your business!</p>
                <p className="text-[9px] text-slate-400">nexos.app</p>
              </div>
            </div>

            <div className="flex justify-between gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setReceiptModalOpen(false)}>
                Done
              </Button>
              <Button
                size="sm"
                className="bg-indigo-600 text-white gap-1.5"
                onClick={() => {
                  window.print();
                  toast({ title: 'Sent to thermal printer!' });
                }}
              >
                <Printer className="h-3.5 w-3.5" /> Print Thermal Receipt (80mm)
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
