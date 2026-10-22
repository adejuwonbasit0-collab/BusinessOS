'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  Truck, Plus, Search, CheckCircle, Clock, AlertCircle, Trash2,
  FileText, Download, Printer, ArrowLeft, PackageCheck, ShoppingBag, DollarSign
} from 'lucide-react';
import { toast } from '@/hooks/useToast';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface PurchaseItem {
  productId: string;
  sku: string;
  name: string;
  quantity: number;
  unitCost: number;
  taxRate: number;
  lineTotal: number;
}

interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  supplierEmail: string;
  orderDate: string;
  expectedDate: string;
  referenceNo: string;
  status: 'Draft' | 'Ordered' | 'Partially Received' | 'Received' | 'Cancelled';
  paymentStatus: 'Unpaid' | 'Partially Paid' | 'Paid';
  items: PurchaseItem[];
  subtotal: number;
  taxTotal: number;
  shippingCost: number;
  discount: number;
  grandTotal: number;
  notes: string;
  createdAt: string;
}

const AVAILABLE_PRODUCTS = [
  { id: 'prod-1', sku: 'SKU-MAC-16', name: 'MacBook Pro 16" M3 Max', cost: 2899.00, stock: 8, category: 'Laptops' },
  { id: 'prod-2', sku: 'SKU-IPH-15P', name: 'iPhone 15 Pro Max 256GB', cost: 1049.00, stock: 14, category: 'Smartphones' },
  { id: 'prod-3', sku: 'SKU-AP-MAX', name: 'AirPods Max Wireless Headphones', cost: 449.00, stock: 22, category: 'Audio' },
  { id: 'prod-4', sku: 'SKU-DEL-U27', name: 'Dell UltraSharp 27" 4K Monitor', cost: 520.00, stock: 5, category: 'Displays' },
  { id: 'prod-5', sku: 'SKU-LOG-MX3', name: 'Logitech MX Master 3S Mouse', cost: 82.00, stock: 35, category: 'Accessories' },
  { id: 'prod-6', sku: 'SKU-KEY-MX', name: 'Logitech MX Mechanical Keyboard', cost: 120.00, stock: 19, category: 'Accessories' },
  { id: 'prod-7', sku: 'SKU-SAM-T7', name: 'Samsung T7 Shield 2TB Portable SSD', cost: 145.00, stock: 40, category: 'Storage' },
  { id: 'prod-8', sku: 'SKU-USB-HUB', name: 'Anker 10-in-1 USB-C Docking Station', cost: 65.00, stock: 12, category: 'Accessories' },
];

const SUPPLIERS = [
  { id: 'sup-1', name: 'Global Tech Distributors Inc.', email: 'orders@globaltech.com', phone: '+1 (555) 019-2831' },
  { id: 'sup-2', name: 'Prime Hardware Logistics', email: 'sales@primehardware.com', phone: '+1 (555) 448-9102' },
  { id: 'sup-3', name: 'Shenzhen Micro Electronics Co.', email: 'dispatch@shenzhenmicro.cn', phone: '+86 755 8321 9900' },
  { id: 'sup-4', name: 'Euro Supply Chain GmbH', email: 'verkauf@eurosupply.de', phone: '+49 89 2314 5500' },
];

export default function PurchasesPage() {
  const [activeTab, setActiveTab] = useState<'list' | 'create'>('list');

  // Existing POs
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([
    {
      id: 'po-001',
      poNumber: 'PO-2026-0041',
      supplierId: 'sup-1',
      supplierName: 'Global Tech Distributors Inc.',
      supplierEmail: 'orders@globaltech.com',
      orderDate: '2026-10-18',
      expectedDate: '2026-10-25',
      referenceNo: 'REF-GT-9912',
      status: 'Ordered',
      paymentStatus: 'Unpaid',
      items: [
        { productId: 'prod-1', sku: 'SKU-MAC-16', name: 'MacBook Pro 16" M3 Max', quantity: 5, unitCost: 2899.00, taxRate: 0, lineTotal: 14495.00 },
        { productId: 'prod-2', sku: 'SKU-IPH-15P', name: 'iPhone 15 Pro Max 256GB', quantity: 10, unitCost: 1049.00, taxRate: 0, lineTotal: 10490.00 },
      ],
      subtotal: 24985.00,
      taxTotal: 0,
      shippingCost: 150.00,
      discount: 250.00,
      grandTotal: 24885.00,
      notes: 'Please ship via DHL Express with insurance.',
      createdAt: '2026-10-18 10:14 AM',
    },
    {
      id: 'po-002',
      poNumber: 'PO-2026-0040',
      supplierId: 'sup-2',
      supplierName: 'Prime Hardware Logistics',
      supplierEmail: 'sales@primehardware.com',
      orderDate: '2026-10-10',
      expectedDate: '2026-10-14',
      referenceNo: 'PRIME-8812',
      status: 'Received',
      paymentStatus: 'Paid',
      items: [
        { productId: 'prod-5', sku: 'SKU-LOG-MX3', name: 'Logitech MX Master 3S Mouse', quantity: 30, unitCost: 82.00, taxRate: 0, lineTotal: 2460.00 },
        { productId: 'prod-6', sku: 'SKU-KEY-MX', name: 'Logitech MX Mechanical Keyboard', quantity: 20, unitCost: 120.00, taxRate: 0, lineTotal: 2400.00 },
      ],
      subtotal: 4860.00,
      taxTotal: 0,
      shippingCost: 80.00,
      discount: 0,
      grandTotal: 4940.00,
      notes: 'Standard ground freight received at Bay 4.',
      createdAt: '2026-10-10 02:45 PM',
    },
  ]);

  // Create PO Form State
  const [supplierId, setSupplierId] = useState('sup-1');
  const [orderDate, setOrderDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [expectedDate, setExpectedDate] = useState(format(new Date(Date.now() + 7 * 86400000), 'yyyy-MM-dd'));
  const [referenceNo, setReferenceNo] = useState('');
  const [poStatus, setPoStatus] = useState<PurchaseOrder['status']>('Ordered');
  const [paymentStatus, setPaymentStatus] = useState<PurchaseOrder['paymentStatus']>('Unpaid');
  const [shippingCost, setShippingCost] = useState(50);
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState('');

  // Items in new PO
  const [items, setItems] = useState<PurchaseItem[]>([
    {
      productId: 'prod-1',
      sku: 'SKU-MAC-16',
      name: 'MacBook Pro 16" M3 Max',
      quantity: 3,
      unitCost: 2899.00,
      taxRate: 0,
      lineTotal: 8697.00,
    },
  ]);

  // Typeahead search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // View Details Modal
  const [viewPo, setViewPo] = useState<PurchaseOrder | null>(null);

  // Filtered products matching typed letters
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return AVAILABLE_PRODUCTS.filter(
      (p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  // Calculations for current form
  const subtotal = useMemo(() => items.reduce((acc, it) => acc + it.lineTotal, 0), [items]);
  const taxTotal = useMemo(() => items.reduce((acc, it) => acc + (it.lineTotal * it.taxRate) / 100, 0), [items]);
  const grandTotal = useMemo(() => Math.max(0, subtotal + taxTotal + Number(shippingCost || 0) - Number(discount || 0)), [subtotal, taxTotal, shippingCost, discount]);

  // Add Item to PO
  const handleSelectProduct = (product: typeof AVAILABLE_PRODUCTS[0]) => {
    const existingIndex = items.findIndex((it) => it.productId === product.id);
    if (existingIndex > -1) {
      const updated = [...items];
      updated[existingIndex].quantity += 1;
      updated[existingIndex].lineTotal = updated[existingIndex].quantity * updated[existingIndex].unitCost;
      setItems(updated);
    } else {
      setItems([
        ...items,
        {
          productId: product.id,
          sku: product.sku,
          name: product.name,
          quantity: 1,
          unitCost: product.cost,
          taxRate: 0,
          lineTotal: product.cost,
        },
      ]);
    }
    setSearchQuery('');
    setIsDropdownOpen(false);
  };

  // Update item field
  const handleUpdateItem = (index: number, field: keyof PurchaseItem, val: any) => {
    const updated = [...items];
    const item = { ...updated[index], [field]: val };
    item.lineTotal = (Number(item.quantity) || 0) * (Number(item.unitCost) || 0);
    updated[index] = item;
    setItems(updated);
  };

  // Remove item
  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // Submit PO
  const handleSavePurchaseOrder = (statusToSet: PurchaseOrder['status']) => {
    if (items.length === 0) {
      toast({ title: 'Please add at least one line item to the purchase order', variant: 'destructive' });
      return;
    }
    const sup = SUPPLIERS.find((s) => s.id === supplierId) || SUPPLIERS[0];
    const newPo: PurchaseOrder = {
      id: `po-${Date.now()}`,
      poNumber: `PO-2026-${String(purchaseOrders.length + 42).padStart(4, '0')}`,
      supplierId: sup.id,
      supplierName: sup.name,
      supplierEmail: sup.email,
      orderDate,
      expectedDate,
      referenceNo: referenceNo || `REF-${Math.floor(1000 + Math.random() * 9000)}`,
      status: statusToSet,
      paymentStatus,
      items: [...items],
      subtotal,
      taxTotal,
      shippingCost: Number(shippingCost || 0),
      discount: Number(discount || 0),
      grandTotal,
      notes,
      createdAt: format(new Date(), 'yyyy-MM-dd hh:mm a'),
    };

    setPurchaseOrders([newPo, ...purchaseOrders]);
    setActiveTab('list');
    toast({
      title: `Purchase Order ${newPo.poNumber} saved successfully!`,
      description: statusToSet === 'Received' ? 'Inventory stock has been replenished automatically.' : `Status marked as ${statusToSet}.`,
    });

    // Reset Form
    setItems([]);
    setReferenceNo('');
    setNotes('');
  };

  // Mark Existing PO as Received
  const handleMarkReceived = (poId: string) => {
    setPurchaseOrders(
      purchaseOrders.map((po) => {
        if (po.id === poId) {
          toast({ title: `${po.poNumber} received! Added ${po.items.reduce((s, i) => s + i.quantity, 0)} units to live inventory.` });
          return { ...po, status: 'Received', paymentStatus: 'Paid' };
        }
        return po;
      })
    );
  };

  return (
    <div className="space-y-6">
      {/* ── Top Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Truck className="h-6 w-6 text-indigo-600" />
            Purchases & Supplier Restocking
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Full procurement ledger, multi-line purchase orders, automatic inventory intake, and vendor payments
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'create' ? (
            <Button variant="outline" size="sm" onClick={() => setActiveTab('list')}>
              <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Orders List
            </Button>
          ) : (
            <Button size="sm" className="bg-indigo-600 text-white hover:bg-indigo-700" onClick={() => setActiveTab('create')}>
              <Plus className="h-4 w-4 mr-1.5" /> Create Purchase Order
            </Button>
          )}
        </div>
      </div>

      {/* ── View 1: Create Purchase Order Full Page ────────────────────────────── */}
      {activeTab === 'create' ? (
        <div className="space-y-6">
          <Card>
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <FileText className="h-5 w-5 text-indigo-600" />
                New Purchase Order Details
              </CardTitle>
              <CardDescription>
                Configure vendor details, order terms, and line items. Real-time product search allows instant item appending by typing letters.
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-5 space-y-6">
              {/* Top Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Select Supplier / Vendor *</Label>
                  <Select value={supplierId} onValueChange={setSupplierId}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Choose supplier..." />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPPLIERS.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">{SUPPLIERS.find((s) => s.id === supplierId)?.email}</p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Order Date</Label>
                  <Input type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} className="h-9 text-xs" />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Expected Delivery Date</Label>
                  <Input type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} className="h-9 text-xs" />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Vendor Ref / Invoice No</Label>
                  <Input value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} placeholder="e.g. VEN-98214" className="h-9 text-xs" />
                </div>
              </div>

              {/* Status and Payment Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Purchase Order Status</Label>
                  <Select value={poStatus} onValueChange={(v: any) => setPoStatus(v)}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Draft">Draft</SelectItem>
                      <SelectItem value="Ordered">Ordered (Sent to Supplier)</SelectItem>
                      <SelectItem value="Partially Received">Partially Received</SelectItem>
                      <SelectItem value="Received">Received (Restock Live Inventory Now)</SelectItem>
                      <SelectItem value="Cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Payment Status</Label>
                  <Select value={paymentStatus} onValueChange={(v: any) => setPaymentStatus(v)}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Unpaid">Unpaid (Net 30/60)</SelectItem>
                      <SelectItem value="Partially Paid">Partially Paid (Deposit Sent)</SelectItem>
                      <SelectItem value="Paid">Paid in Full</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* ── Typeahead Live Product Search (Press Letters to find) ──────────── */}
              <div className="pt-4 border-t space-y-2 relative">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Search className="h-3.5 w-3.5 text-indigo-600" />
                  Add Products to Purchase Order (Type letters to search)
                </Label>
                <div className="relative">
                  <Input
                    placeholder="Type product name, SKU or category (e.g. 'mac', 'headphone', 'mouse', 'dell')..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setIsDropdownOpen(true);
                    }}
                    onFocus={() => setIsDropdownOpen(true)}
                    className="h-10 text-xs pl-9 pr-4"
                  />
                  <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
                </div>

                {/* Floating Autocomplete Dropdown */}
                {isDropdownOpen && searchQuery.trim().length > 0 && (
                  <div className="absolute z-20 left-0 right-0 top-18 bg-card border rounded-lg shadow-xl max-h-64 overflow-y-auto divide-y divide-border">
                    {filteredProducts.length === 0 ? (
                      <div className="p-3 text-xs text-muted-foreground text-center">
                        No products found matching "{searchQuery}".
                      </div>
                    ) : (
                      filteredProducts.map((p) => (
                        <div
                          key={p.id}
                          onClick={() => handleSelectProduct(p)}
                          className="p-3 flex items-center justify-between hover:bg-accent/60 cursor-pointer transition-colors"
                        >
                          <div>
                            <p className="text-xs font-semibold text-foreground">{p.name}</p>
                            <p className="text-[11px] text-muted-foreground">SKU: {p.sku} · Category: {p.category}</p>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-mono font-bold">${p.cost.toFixed(2)}</span>
                            <span className="text-[10px] block text-muted-foreground">In Stock: {p.stock} units</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* ── Multi-Line Item Purchase Table ───────────────────────────────── */}
              <div className="space-y-3">
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted text-muted-foreground border-b">
                      <tr>
                        <th className="py-2.5 px-3 font-semibold">Product Description & SKU</th>
                        <th className="py-2.5 px-3 font-semibold w-24">Qty</th>
                        <th className="py-2.5 px-3 font-semibold w-32">Unit Cost ($)</th>
                        <th className="py-2.5 px-3 font-semibold w-24">Tax %</th>
                        <th className="py-2.5 px-3 font-semibold w-32 text-right">Line Total ($)</th>
                        <th className="py-2.5 px-3 text-center w-12">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {items.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-6 text-center text-muted-foreground">
                            No items added yet. Use the search bar above to type letters and add products.
                          </td>
                        </tr>
                      ) : (
                        items.map((item, idx) => (
                          <tr key={idx} className="hover:bg-muted/30">
                            <td className="py-3 px-3">
                              <p className="font-semibold text-foreground">{item.name}</p>
                              <p className="text-[11px] font-mono text-muted-foreground">{item.sku}</p>
                            </td>
                            <td className="py-3 px-3">
                              <Input
                                type="number"
                                min={1}
                                value={item.quantity}
                                onChange={(e) => handleUpdateItem(idx, 'quantity', parseInt(e.target.value) || 1)}
                                className="h-8 text-xs font-mono text-center w-20"
                              />
                            </td>
                            <td className="py-3 px-3">
                              <Input
                                type="number"
                                step="0.01"
                                min={0}
                                value={item.unitCost}
                                onChange={(e) => handleUpdateItem(idx, 'unitCost', parseFloat(e.target.value) || 0)}
                                className="h-8 text-xs font-mono w-28"
                              />
                            </td>
                            <td className="py-3 px-3">
                              <Input
                                type="number"
                                min={0}
                                max={100}
                                value={item.taxRate}
                                onChange={(e) => handleUpdateItem(idx, 'taxRate', parseFloat(e.target.value) || 0)}
                                className="h-8 text-xs font-mono text-center w-16"
                              />
                            </td>
                            <td className="py-3 px-3 text-right font-mono font-bold text-foreground">
                              ${item.lineTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 px-3 text-center">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                                onClick={() => handleRemoveItem(idx)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Additional Costs & Grand Total Summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Vendor Instructions / PO Notes</Label>
                    <textarea
                      rows={4}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="e.g. Deliver to Dock Door #2. Palletize and wrap. Send COA alongside shipment."
                      className="w-full p-2.5 border rounded-lg text-xs bg-background"
                    />
                  </div>

                  <div className="p-4 bg-muted/40 rounded-xl space-y-2.5 text-xs">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Items Subtotal:</span>
                      <span className="font-mono font-semibold text-foreground">${subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Estimated Tax:</span>
                      <span className="font-mono font-semibold text-foreground">${taxTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-muted-foreground">
                      <span>Freight & Shipping:</span>
                      <div className="flex items-center gap-1">
                        <span>$</span>
                        <Input
                          type="number"
                          value={shippingCost}
                          onChange={(e) => setShippingCost(parseFloat(e.target.value) || 0)}
                          className="h-7 w-24 text-xs font-mono text-right"
                        />
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-muted-foreground">
                      <span>Vendor Discount:</span>
                      <div className="flex items-center gap-1">
                        <span>-$</span>
                        <Input
                          type="number"
                          value={discount}
                          onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                          className="h-7 w-24 text-xs font-mono text-right text-emerald-600"
                        />
                      </div>
                    </div>
                    <div className="pt-2 border-t flex justify-between text-sm font-bold">
                      <span className="text-foreground">Grand Total:</span>
                      <span className="font-mono text-indigo-600">${grandTotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Action Footer */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t">
                <Button variant="outline" size="sm" onClick={() => setActiveTab('list')}>
                  Cancel
                </Button>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleSavePurchaseOrder('Draft')}>
                    Save as Draft
                  </Button>
                  <Button
                    size="sm"
                    className="bg-indigo-600 text-white hover:bg-indigo-700"
                    onClick={() => handleSavePurchaseOrder('Ordered')}
                  >
                    Submit & Send Order to Supplier
                  </Button>
                  <Button
                    size="sm"
                    className="bg-emerald-600 text-white hover:bg-emerald-700"
                    onClick={() => handleSavePurchaseOrder('Received')}
                  >
                    <PackageCheck className="h-4 w-4 mr-1.5" />
                    Receive Stock Now
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        /* ── View 2: All Purchase Orders Ledger ───────────────────────────────── */
        <div className="space-y-4">
          {/* Quick Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-5 pb-4 flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
                  <DollarSign className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-semibold">Total Purchases Spend</p>
                  <p className="text-xl font-bold font-mono">
                    ${purchaseOrders.reduce((s, p) => s + p.grandTotal, 0).toLocaleString()}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-5 pb-4 flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-semibold">Pending Deliveries</p>
                  <p className="text-xl font-bold font-mono">
                    {purchaseOrders.filter((p) => p.status === 'Ordered').length} Orders
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-5 pb-4 flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
                  <CheckCircle className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-semibold">Received & Restocked</p>
                  <p className="text-xl font-bold font-mono">
                    {purchaseOrders.filter((p) => p.status === 'Received').length} Orders
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Orders Table */}
          <Card>
            <CardHeader className="py-3.5 px-4 flex flex-row items-center justify-between border-b">
              <div>
                <CardTitle className="text-base font-semibold">Purchase Orders Ledger ({purchaseOrders.length})</CardTitle>
                <p className="text-xs text-muted-foreground">Track purchase status, supplier receipts, and fulfillment intake</p>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted text-muted-foreground border-b">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold">PO Number</th>
                      <th className="py-2.5 px-3 font-semibold">Supplier</th>
                      <th className="py-2.5 px-3 font-semibold">Order Date</th>
                      <th className="py-2.5 px-3 font-semibold">Expected</th>
                      <th className="py-2.5 px-3 font-semibold">Items</th>
                      <th className="py-2.5 px-3 font-semibold">Grand Total</th>
                      <th className="py-2.5 px-3 font-semibold">Status</th>
                      <th className="py-2.5 px-3 font-semibold">Payment</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {purchaseOrders.map((po) => (
                      <tr key={po.id} className="hover:bg-muted/30">
                        <td className="py-3 px-3 font-mono font-semibold text-indigo-600">{po.poNumber}</td>
                        <td className="py-3 px-3 font-medium text-foreground">{po.supplierName}</td>
                        <td className="py-3 px-3 text-muted-foreground">{po.orderDate}</td>
                        <td className="py-3 px-3 text-muted-foreground">{po.expectedDate}</td>
                        <td className="py-3 px-3 font-semibold">{po.items.length} Lines</td>
                        <td className="py-3 px-3 font-mono font-bold text-foreground">
                          ${po.grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-3">
                          <Badge
                            className={
                              po.status === 'Received'
                                ? 'bg-emerald-100 text-emerald-800 text-[10px]'
                                : po.status === 'Ordered'
                                ? 'bg-blue-100 text-blue-800 text-[10px]'
                                : 'bg-slate-100 text-slate-800 text-[10px]'
                            }
                          >
                            {po.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={cn(
                              'text-[10px] font-semibold px-2 py-0.5 rounded-full',
                              po.paymentStatus === 'Paid'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-amber-50 text-amber-700'
                            )}
                          >
                            {po.paymentStatus}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex justify-end items-center gap-1.5">
                            {po.status !== 'Received' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                                onClick={() => handleMarkReceived(po.id)}
                              >
                                Mark Received
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs text-indigo-600"
                              onClick={() => setViewPo(po)}
                            >
                              View PO
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
        </div>
      )}

      {/* ── Modal: View & Print Purchase Order ─────────────────────────────────── */}
      {viewPo && (
        <Dialog open={!!viewPo} onOpenChange={() => setViewPo(null)}>
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>Purchase Order {viewPo.poNumber}</span>
                <Badge>{viewPo.status}</Badge>
              </DialogTitle>
              <DialogDescription>Supplier: {viewPo.supplierName} ({viewPo.supplierEmail})</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              <div className="grid grid-cols-2 gap-2 p-3 bg-muted/40 rounded-lg">
                <div>
                  <span className="text-muted-foreground block">Order Date:</span>
                  <span className="font-semibold">{viewPo.orderDate}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Expected Delivery:</span>
                  <span className="font-semibold">{viewPo.expectedDate}</span>
                </div>
              </div>

              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted border-b">
                    <tr>
                      <th className="py-2 px-3">Item</th>
                      <th className="py-2 px-3 text-center">Qty</th>
                      <th className="py-2 px-3 text-right">Unit Cost</th>
                      <th className="py-2 px-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {viewPo.items.map((it, i) => (
                      <tr key={i}>
                        <td className="py-2 px-3">
                          <span className="font-medium">{it.name}</span>
                          <span className="text-[10px] block font-mono text-muted-foreground">{it.sku}</span>
                        </td>
                        <td className="py-2 px-3 text-center">{it.quantity}</td>
                        <td className="py-2 px-3 text-right font-mono">${it.unitCost.toFixed(2)}</td>
                        <td className="py-2 px-3 text-right font-mono font-semibold">${it.lineTotal.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-center pt-2 font-bold text-sm">
                <span>Grand Total:</span>
                <span className="font-mono text-indigo-600">${viewPo.grandTotal.toFixed(2)}</span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    toast({ title: `Printing Purchase Order ${viewPo.poNumber}...` });
                    window.print();
                  }}
                >
                  <Printer className="h-4 w-4 mr-1.5" /> Print PO
                </Button>
                <Button size="sm" onClick={() => setViewPo(null)}>
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
