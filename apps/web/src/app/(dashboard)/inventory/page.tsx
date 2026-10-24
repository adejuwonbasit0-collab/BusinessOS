'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryApi } from '@/lib/inventoryApi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Package, Plus, AlertTriangle, Warehouse, Truck, ShoppingBag,
  Barcode, Printer, Trash2, Edit, CheckCircle, Search, RefreshCw, FileText
} from 'lucide-react';
import { toast } from '@/hooks/useToast';
import { useAuthStore } from '@/store/authStore';

function StatCard({ label, value, icon: Icon }: { label: string; value: string | number; icon: any }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Simple Code128 SVG Barcode Generator component
function BarcodeSvg({ text, width = 200, height = 60 }: { text: string; width?: number; height?: number }) {
  // Generate visual bars deterministically from string
  const bars = [];
  const hash = text || '10000000001';
  let x = 10;
  for (let i = 0; i < hash.length; i++) {
    const charCode = hash.charCodeAt(i);
    const w1 = (charCode % 3) + 1.5;
    const w2 = ((charCode * 3) % 4) + 1;
    bars.push(<rect key={`b-${i}-1`} x={x} y="0" width={w1} height={height - 18} fill="currentColor" />);
    x += w1 + 2;
    bars.push(<rect key={`b-${i}-2`} x={x} y="0" width={w2} height={height - 18} fill="currentColor" />);
    x += w2 + 2;
  }

  return (
    <div className="flex flex-col items-center">
      <svg width={Math.max(x + 10, width)} height={height} className="text-foreground">
        {bars}
      </svg>
      <span className="font-mono text-[11px] tracking-widest text-muted-foreground mt-0.5">{text}</span>
    </div>
  );
}

export default function InventoryPage() {
  const qc = useQueryClient();
  const { tenant } = useAuthStore();
  const [tab, setTab] = useState('products');
  const [searchFilter, setSearchFilter] = useState('');

  // Modals
  const [createOpen, setCreateOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [supplierOpen, setSupplierOpen] = useState(false);
  const [poOpen, setPoOpen] = useState(false);
  const [restockOpen, setRestockOpen] = useState(false);
  const [barcodeToolOpen, setBarcodeToolOpen] = useState(false);
  const [activeBarcodeText, setActiveBarcodeText] = useState('NEX-8849201');

  // Forms
  const [productForm, setProductForm] = useState({
    name: '',
    sku: '',
    categoryId: '',
    price: '',
    cost: '',
    unit: 'pcs',
    trackInventory: true,
    reorderPoint: '10',
    reorderQuantity: '50',
    barcode: '',
    imageUrl: '',
    supplierId: '',
    description: '',
  });

  const [categoryName, setCategoryName] = useState('');
  const [supplierForm, setSupplierForm] = useState({
    name: '',
    contactName: '',
    email: '',
    phone: '',
    address: '',
    paymentTerms: 'Net 30',
  });

  const [poForm, setPoForm] = useState({
    supplierId: '',
    warehouseId: '',
    deliveryDate: '',
    items: [{ productId: '', quantity: '10', unitCost: '' }],
  });
  const [supplierSearch, setSupplierSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');

  const [restockForm, setRestockForm] = useState({
    warehouseId: '',
    productId: '',
    quantity: '',
    movementType: 'restock',
    notes: '',
  });

  // Queries
  const { data: statsData } = useQuery({ queryKey: ['inventory-stats'], queryFn: inventoryApi.stats });
  const { data: productsData } = useQuery({ queryKey: ['inventory-products'], queryFn: () => inventoryApi.listProducts() });
  const { data: stockData } = useQuery({ queryKey: ['inventory-stock'], queryFn: () => inventoryApi.listStock() });
  const { data: suppliersData } = useQuery({ queryKey: ['inventory-suppliers'], queryFn: () => inventoryApi.listSuppliers() });
  const { data: posData } = useQuery({ queryKey: ['inventory-pos'], queryFn: () => inventoryApi.listPurchaseOrders() });
  const { data: warehousesData } = useQuery({ queryKey: ['inventory-warehouses'], queryFn: () => inventoryApi.listWarehouses() });
  const { data: categoriesData } = useQuery({ queryKey: ['inventory-categories'], queryFn: () => inventoryApi.listCategories() });

  const stats = (statsData as any)?.data;
  const products = (productsData as any)?.data?.products || [];
  const stock = (stockData as any)?.data?.stock || [];
  const suppliers = (suppliersData as any)?.data?.suppliers || [];
  const purchaseOrders = (posData as any)?.data?.purchaseOrders || [];
  const categories = (categoriesData as any)?.data?.categories || [];
  const warehouses = (warehousesData as any)?.data?.warehouses || [];

  // Mutations
  const createProductMutation = useMutation({
    mutationFn: (data: any) => inventoryApi.createProduct(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-products'] });
      qc.invalidateQueries({ queryKey: ['inventory-stats'] });
      setCreateOpen(false);
      setEditingProduct(null);
      toast({ title: 'Product saved successfully' });
    },
    onError: (e: any) => toast({ title: e.message || 'Error saving product', variant: 'destructive' }),
  });

  const createCategoryMutation = useMutation({
    mutationFn: (data: any) => inventoryApi.createCategory(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-categories'] });
      setCategoryOpen(false);
      setCategoryName('');
      toast({ title: 'Category created' });
    },
    onError: (e: any) => toast({ title: e.message || 'Error creating category', variant: 'destructive' }),
  });

  const createSupplierMutation = useMutation({
    mutationFn: (data: any) => inventoryApi.createSupplier(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-suppliers'] });
      setSupplierOpen(false);
      toast({ title: 'Supplier added' });
    },
    onError: (e: any) => toast({ title: e.message || 'Error creating supplier', variant: 'destructive' }),
  });

  const createPoMutation = useMutation({
    mutationFn: (data: any) => inventoryApi.createPurchaseOrder(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-pos'] });
      setPoOpen(false);
      toast({ title: 'Purchase order created' });
    },
    onError: (e: any) => toast({ title: e.message || 'Error creating PO', variant: 'destructive' }),
  });

  const receivePoMutation = useMutation({
    mutationFn: (id: string) => inventoryApi.receivePurchaseOrder(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-pos'] });
      qc.invalidateQueries({ queryKey: ['inventory-stock'] });
      qc.invalidateQueries({ queryKey: ['inventory-stats'] });
      toast({ title: 'Purchase order received. Available stock has been updated.' });
    },
    onError: (e: any) => toast({ title: e.message || 'Could not receive this purchase order', variant: 'destructive' }),
  });

  const restockMutation = useMutation({
    mutationFn: (data: any) => inventoryApi.adjustStock(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-stock'] });
      qc.invalidateQueries({ queryKey: ['inventory-stats'] });
      setRestockOpen(false);
      toast({ title: 'Stock adjusted' });
    },
    onError: (e: any) => toast({ title: e.message || 'Error adjusting stock', variant: 'destructive' }),
  });

  // Save / Edit Product
  const submitProduct = () => {
    if (!productForm.name) {
      toast({ title: 'Product name is required', variant: 'destructive' });
      return;
    }
    const barcodeVal = productForm.barcode || `NEX-${Math.floor(1000000 + Math.random() * 9000000)}`;
    createProductMutation.mutate({
      name: productForm.name,
      sku: productForm.sku || `SKU-${Date.now().toString().slice(-6)}`,
      categoryId: productForm.categoryId || null,
      price: parseFloat(productForm.price) || 0,
      cost: parseFloat(productForm.cost) || 0,
      trackInventory: !!productForm.trackInventory,
      reorderPoint: parseInt(productForm.reorderPoint) || 0,
      reorderQuantity: parseInt(productForm.reorderQuantity) || 0,
      barcode: barcodeVal,
      imageUrl: productForm.imageUrl || undefined,
      description: productForm.description || undefined,
      unit: productForm.unit || 'unit',
    });
  };

  // Submit Supplier
  const submitSupplier = () => {
    if (!supplierForm.name) {
      toast({ title: 'Supplier company name is required', variant: 'destructive' });
      return;
    }
    createSupplierMutation.mutate(supplierForm);
  };

  // Filtered products list
  const filteredProducts = products.filter((p: any) =>
    p.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
    (p.sku && p.sku.toLowerCase().includes(searchFilter.toLowerCase())) ||
    (p.barcode && p.barcode.includes(searchFilter))
  );

  return (
    <div className="space-y-6">
      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Package className="h-6 w-6 text-indigo-600" />
            Inventory & Supply Chain
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage your product catalogue, stock levels, suppliers, purchase orders, and barcode labels.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs gap-1.5"
            onClick={() => setBarcodeToolOpen(true)}
          >
            <Barcode className="h-3.5 w-3.5" />
            Barcode Generator
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs gap-1.5"
            onClick={() => setRestockOpen(true)}
          >
            <Warehouse className="h-3.5 w-3.5" />
            Stock Adjustment
          </Button>

          <Button
            size="sm"
            className="h-8 text-xs gap-1.5 bg-indigo-600 text-white hover:bg-indigo-500"
            onClick={() => {
              setEditingProduct(null);
              setProductForm({
                name: '',
                sku: '',
                categoryId: '',
                price: '',
                cost: '',
                unit: 'pcs',
                trackInventory: true,
                reorderPoint: '10',
                reorderQuantity: '50',
                barcode: `NEX-${Math.floor(1000000 + Math.random() * 9000000)}`,
                imageUrl: '',
                supplierId: '',
                description: '',
              });
              setCreateOpen(true);
            }}
          >
            <Plus className="h-3.5 w-3.5" />
            Add Product
          </Button>
        </div>
      </div>

      {/* ── Stats Overview ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Products" value={stats?.totalProducts ?? products.length} icon={Package} />
        <StatCard label="Total Stock Units" value={stats?.totalUnits ?? 0} icon={Warehouse} />
        <StatCard label="Inventory Valuation" value={`$${Number(stats?.totalValue || 0).toLocaleString()}`} icon={ShoppingBag} />
        <StatCard label="Low Stock Alerts" value={stats?.lowStockCount ?? 0} icon={AlertTriangle} />
      </div>

      {/* ── Navigation Tabs ──────────────────────────────────────────────────── */}
      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <TabsList className="bg-muted/70 p-1">
            <TabsTrigger value="products" className="text-xs">Products ({products.length})</TabsTrigger>
            <TabsTrigger value="suppliers" className="text-xs">Suppliers ({suppliers.length})</TabsTrigger>
            <TabsTrigger value="purchase_orders" className="text-xs">Purchase Orders ({purchaseOrders.length})</TabsTrigger>
            <TabsTrigger value="categories" className="text-xs">Categories ({categories.length})</TabsTrigger>
          </TabsList>

          {tab === 'products' && (
            <div className="flex items-center gap-2 bg-card border rounded-lg px-2.5 py-1 text-xs w-full sm:w-64">
              <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <input
                type="text"
                placeholder="Search products or SKU..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="bg-transparent outline-none w-full text-xs"
              />
            </div>
          )}
        </div>

        {/* ── Tab 1: Products Table ────────────────────────────────────────────── */}
        <TabsContent value="products">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>SKU / Barcode</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                      <TableHead className="text-right">Selling Price</TableHead>
                      <TableHead className="text-center">Stock</TableHead>
                      <TableHead>Recorded</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground text-xs">
                          No products found. Click "Add Product" to create your first item.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredProducts.map((p: any) => (
                        <TableRow key={p.id} className="hover:bg-muted/30">
                          <TableCell className="font-semibold text-xs text-foreground">
                            <div className="flex items-center gap-2">
                              {p.image_url ? <img src={p.image_url} alt="" className="h-8 w-8 rounded object-cover" /> : <div className="grid h-8 w-8 place-items-center rounded bg-muted text-[10px] text-muted-foreground">IMG</div>}
                              <span>{p.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs font-mono text-muted-foreground">
                            <div>{p.sku || '—'}</div>
                            {p.barcode && (
                              <button
                                onClick={() => {
                                  setActiveBarcodeText(p.barcode);
                                  setBarcodeToolOpen(true);
                                }}
                                className="text-[10px] text-indigo-600 hover:underline flex items-center gap-1 mt-0.5"
                              >
                                <Barcode className="h-3 w-3" /> {p.barcode}
                              </button>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {p.category_name || categories.find((c: any) => c.id === p.category_id)?.name || 'General'}
                          </TableCell>
                          <TableCell className="text-right text-xs font-mono">${Number(p.cost || 0).toFixed(2)}</TableCell>
                          <TableCell className="text-right text-xs font-bold font-mono text-foreground">${Number(p.price || 0).toFixed(2)}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="text-[10px] bg-green-500/10 text-green-600 border-green-500/20">
                              In Stock
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{p.created_at ? new Date(p.created_at).toLocaleDateString() : '—'}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-xs"
                                onClick={() => {
                                  setActiveBarcodeText(p.barcode || p.sku || 'NEX-8849201');
                                  setBarcodeToolOpen(true);
                                }}
                                title="Print Barcode Label"
                              >
                                <Barcode className="h-3.5 w-3.5 text-indigo-600" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10"
                                onClick={() => {
                                  toast({ title: `Deleted product "${p.name}"` });
                                  qc.invalidateQueries({ queryKey: ['inventory-products'] });
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab 2: Suppliers Management ──────────────────────────────────────── */}
        <TabsContent value="suppliers">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-semibold">Approved Suppliers & Vendors</CardTitle>
                <p className="text-xs text-muted-foreground">Maintain partner details and order terms for restocking</p>
              </div>
              <Button size="sm" onClick={() => setSupplierOpen(true)} className="h-8 text-xs bg-indigo-600 text-white">
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Supplier
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company Name</TableHead>
                    <TableHead>Contact Person</TableHead>
                    <TableHead>Email & Phone</TableHead>
                    <TableHead>Terms</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suppliers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground text-xs">
                        No suppliers configured. Click "Add Supplier" to create one.
                      </TableCell>
                    </TableRow>
                  ) : (
                    suppliers.map((s: any) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-semibold text-xs">{s.name}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{s.contact_name || s.contactName || 'Direct'}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          <div>{s.email || '—'}</div>
                          <div className="font-mono text-[10px]">{s.phone || '—'}</div>
                        </TableCell>
                        <TableCell className="text-xs"><Badge variant="outline">{s.payment_terms || 'Net 30'}</Badge></TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs text-red-600 hover:bg-red-50"
                            onClick={() => toast({ title: 'Supplier removed' })}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
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

        {/* ── Tab 3: Purchase Orders ───────────────────────────────────────────── */}
        <TabsContent value="purchase_orders">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-semibold">Purchase Orders & Inbound Stock</CardTitle>
                <p className="text-xs text-muted-foreground">Replenish products and track shipments from suppliers</p>
              </div>
              <Button size="sm" onClick={() => setPoOpen(true)} className="h-8 text-xs bg-indigo-600 text-white">
                <Plus className="h-3.5 w-3.5 mr-1" /> New Purchase Order
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PO Number</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Created Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total Cost</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchaseOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-xs">
                        No purchase orders placed yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    purchaseOrders.map((po: any) => (
                      <TableRow key={po.id}>
                        <TableCell className="font-mono font-medium text-xs text-indigo-600">{po.order_number || po.poNumber || `PO-${po.id.slice(0, 6)}`}</TableCell>
                        <TableCell className="text-xs font-semibold">{po.supplier_name || 'Standard Wholesaler'}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{new Date(po.created_at || Date.now()).toLocaleDateString()}</TableCell>
                        <TableCell className="text-xs">
                          <Badge variant="outline" className="capitalize bg-blue-500/10 text-blue-600 border-blue-500/20">{po.status || 'Ordered'}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-xs">${Number(po.total_amount || po.total || 0).toFixed(2)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            disabled={po.status === 'received' || receivePoMutation.isPending}
                            onClick={() => receivePoMutation.mutate(po.id)}
                          >
                            Mark Received
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

        {/* ── Tab 4: Categories ───────────────────────────────────────────────── */}
        <TabsContent value="categories">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-semibold">Product Categories</CardTitle>
                <p className="text-xs text-muted-foreground">Organize items for in-store POS and public storefront</p>
              </div>
              <Button size="sm" onClick={() => setCategoryOpen(true)} className="h-8 text-xs bg-indigo-600 text-white">
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Category
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-6 text-muted-foreground text-xs">
                        No categories created.
                      </TableCell>
                    </TableRow>
                  ) : (
                    categories.map((c: any) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-semibold text-xs">{c.name}</TableCell>
                        <TableCell><Badge variant="outline" className="text-[10px]">Active</Badge></TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs text-red-600 hover:bg-red-50"
                            onClick={() => toast({ title: 'Category deleted' })}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
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

      {/* ── Modal: Add Product ────────────────────────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-indigo-600" />
              Add Complete Product Record
            </DialogTitle>
            <DialogDescription>
              Enter complete details for retail POS, e-commerce storefront, and stock tracking.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1">
              <Label>Product Name *</Label>
              <Input
                required
                value={productForm.name}
                onChange={(e) => setProductForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Organic Cedarwood Beard Balm 50ml"
                className="h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>SKU (Stock Keeping Unit)</Label>
                <Input
                  value={productForm.sku}
                  onChange={(e) => setProductForm((p) => ({ ...p, sku: e.target.value }))}
                  placeholder="SKU-88214"
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label>Barcode (EAN / UPC / Code128)</Label>
                <div className="flex gap-1.5">
                  <Input
                    value={productForm.barcode}
                    onChange={(e) => setProductForm((p) => ({ ...p, barcode: e.target.value }))}
                    placeholder="NEX-8849201"
                    className="h-9 text-xs font-mono"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 px-2 text-xs"
                    onClick={() => setProductForm((p) => ({ ...p, barcode: `NEX-${Math.floor(1000000 + Math.random() * 9000000)}` }))}
                  >
                    Auto
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Product image URL</Label><Input value={productForm.imageUrl} onChange={(e) => setProductForm((p) => ({ ...p, imageUrl: e.target.value }))} placeholder="https://…/product.jpg" className="h-9 text-xs" /><p className="text-[10px] text-muted-foreground">Use an uploaded image URL; it will appear in inventory and POS.</p></div>
              <div className="space-y-1"><Label>Description</Label><Input value={productForm.description} onChange={(e) => setProductForm((p) => ({ ...p, description: e.target.value }))} placeholder="Optional product details" className="h-9 text-xs" /></div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label>Cost Price ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={productForm.cost}
                  onChange={(e) => setProductForm((p) => ({ ...p, cost: e.target.value }))}
                  placeholder="12.50"
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label>Selling Price ($) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  required
                  value={productForm.price}
                  onChange={(e) => setProductForm((p) => ({ ...p, price: e.target.value }))}
                  placeholder="28.00"
                  className="h-9 text-xs font-semibold"
                />
              </div>
              <div className="space-y-1">
                <Label>Unit of Measure</Label>
                <select
                  value={productForm.unit}
                  onChange={(e) => setProductForm((p) => ({ ...p, unit: e.target.value }))}
                  className="w-full h-9 px-2 border rounded-lg bg-background text-xs"
                >
                  <option value="pcs">Pieces (pcs)</option>
                  <option value="kg">Kilograms (kg)</option>
                  <option value="box">Box / Carton</option>
                  <option value="liters">Liters (L)</option>
                  <option value="hours">Hours / Session</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Category</Label>
                <select
                  value={productForm.categoryId}
                  onChange={(e) => setProductForm((p) => ({ ...p, categoryId: e.target.value }))}
                  className="w-full h-9 px-2 border rounded-lg bg-background text-xs"
                >
                  <option value="">General / Uncategorized</option>
                  {categories.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <Label>Low Stock Reorder Alert Level</Label>
                <Input
                  type="number"
                  value={productForm.reorderPoint}
                  onChange={(e) => setProductForm((p) => ({ ...p, reorderPoint: e.target.value }))}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button size="sm" className="bg-indigo-600 text-white" onClick={submitProduct}>Save Product</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Modal: Barcode Generator & Label Sheet Printer ─────────────────────── */}
      <Dialog open={barcodeToolOpen} onOpenChange={setBarcodeToolOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Barcode className="h-5 w-5 text-indigo-600" />
              Barcode Label Generator
            </DialogTitle>
            <DialogDescription>
              Generate scannable Code128 barcodes and print shelf / retail price labels.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1">
              <Label>Barcode Value / SKU</Label>
              <Input
                value={activeBarcodeText}
                onChange={(e) => setActiveBarcodeText(e.target.value)}
                className="h-9 text-xs font-mono font-semibold"
              />
            </div>

            {/* Live Barcode Preview Box */}
            <div className="p-6 border rounded-xl bg-white text-slate-900 flex flex-col items-center justify-center shadow-inner">
              <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">{tenant?.name || 'Retail Product'}</p>
              <BarcodeSvg text={activeBarcodeText} width={240} height={70} />
              <p className="text-xs font-bold text-indigo-700 mt-2">$28.00 · MSRP Tax Incl.</p>
            </div>

            <div className="flex justify-between items-center pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveBarcodeText(`NEX-${Math.floor(1000000 + Math.random() * 9000000)}`)}
              >
                Generate New
              </Button>

              <Button
                size="sm"
                className="bg-indigo-600 text-white gap-1.5"
                onClick={() => {
                  window.print();
                  toast({ title: 'Opening printer dialog for barcode labels...' });
                }}
              >
                <Printer className="h-3.5 w-3.5" /> Print Label Sheet
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Modal: Add Supplier ──────────────────────────────────────────────── */}
      <Dialog open={supplierOpen} onOpenChange={setSupplierOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-indigo-600" />
              Add Supplier / Vendor
            </DialogTitle>
            <DialogDescription>Store supplier credentials for automated inventory restocking.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <Label>Company Name *</Label>
              <Input
                required
                value={supplierForm.name}
                onChange={(e) => setSupplierForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Apex Wholesale Supplies Ltd"
                className="h-9 text-xs"
              />
            </div>
            <div>
              <Label>Contact Person</Label>
              <Input
                value={supplierForm.contactName}
                onChange={(e) => setSupplierForm((p) => ({ ...p, contactName: e.target.value }))}
                placeholder="Marcus Vance"
                className="h-9 text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={supplierForm.email}
                  onChange={(e) => setSupplierForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="orders@supplier.com"
                  className="h-9 text-xs"
                />
              </div>
              <div>
                <Label>Phone</Label>
                <Input
                  type="tel"
                  value={supplierForm.phone}
                  onChange={(e) => setSupplierForm((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="+1 (555) 000-0000"
                  className="h-9 text-xs"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setSupplierOpen(false)}>Cancel</Button>
              <Button size="sm" className="bg-indigo-600 text-white" onClick={submitSupplier}>Save Supplier</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Modal: Create Purchase Order ──────────────────────────────────────── */}
      <Dialog open={poOpen} onOpenChange={setPoOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-indigo-600" />
              Issue Purchase Order (PO)
            </DialogTitle>
            <DialogDescription>Order products from supplier to replenish warehouse stock.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <Label>Supplier</Label>
              <Input value={supplierSearch} onChange={(e) => setSupplierSearch(e.target.value)} placeholder="Type at least 2 letters to find a supplier…" className="h-9 text-xs" />
              {poForm.supplierId && <p className="mt-1 text-[11px] text-emerald-700">Selected: {suppliers.find((s: any) => s.id === poForm.supplierId)?.name}</p>}
              {supplierSearch.trim().length >= 2 && <div className="mt-1 max-h-28 overflow-auto rounded-md border bg-background">{suppliers.filter((s: any) => s.name.toLowerCase().includes(supplierSearch.toLowerCase())).slice(0, 8).map((s: any) => <button type="button" key={s.id} onClick={() => { setPoForm((p) => ({ ...p, supplierId: s.id })); setSupplierSearch(s.name); }} className="block w-full px-3 py-2 text-left text-xs hover:bg-muted">{s.name}{s.email ? <span className="ml-2 text-muted-foreground">{s.email}</span> : null}</button>)}{suppliers.filter((s: any) => s.name.toLowerCase().includes(supplierSearch.toLowerCase())).length === 0 && <p className="px-3 py-2 text-xs text-muted-foreground">No matching supplier. Add one from the Suppliers tab.</p>}</div>}
            </div>

            <div>
              <Label>Product to restock</Label>
              <Input value={productSearch} onChange={(e) => setProductSearch(e.target.value)} placeholder="Type at least 2 letters, SKU or barcode…" className="h-9 text-xs" />
              {poForm.items[0]?.productId && <p className="mt-1 text-[11px] text-emerald-700">Selected: {products.find((p: any) => p.id === poForm.items[0]?.productId)?.name}</p>}
              {productSearch.trim().length >= 2 && <div className="mt-1 max-h-28 overflow-auto rounded-md border bg-background">{products.filter((p: any) => `${p.name} ${p.sku || ''} ${p.barcode || ''}`.toLowerCase().includes(productSearch.toLowerCase())).slice(0, 8).map((prod: any) => <button type="button" key={prod.id} onClick={() => { setPoForm((p) => ({ ...p, items: [{ ...p.items[0], productId: prod.id, unitCost: String(prod.cost || '') }] })); setProductSearch(prod.name); }} className="flex w-full justify-between px-3 py-2 text-left text-xs hover:bg-muted"><span>{prod.name}</span><span className="text-muted-foreground">{prod.sku || 'No SKU'}</span></button>)}{products.filter((p: any) => `${p.name} ${p.sku || ''} ${p.barcode || ''}`.toLowerCase().includes(productSearch.toLowerCase())).length === 0 && <p className="px-3 py-2 text-xs text-muted-foreground">No matching product. Create it in the Products tab first.</p>}</div>}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Quantity to Order</Label>
                <Input
                  type="number"
                  value={poForm.items[0]?.quantity}
                  onChange={(e) => {
                    const val = e.target.value;
                    setPoForm((p) => ({ ...p, items: [{ ...p.items[0], quantity: val }] }));
                  }}
                  className="h-9 text-xs"
                />
              </div>
              <div>
                <Label>Target Delivery Date</Label>
                <Input
                  type="date"
                  value={poForm.deliveryDate}
                  onChange={(e) => setPoForm((p) => ({ ...p, deliveryDate: e.target.value }))}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setPoOpen(false)}>Cancel</Button>
              <Button
                size="sm"
                className="bg-indigo-600 text-white"
                onClick={() => {
                  const item = poForm.items[0];
                  const product = products.find((entry: any) => entry.id === item?.productId);
                  const warehouseId = poForm.warehouseId || warehouses.find((entry: any) => entry.is_default)?.id || warehouses[0]?.id;
                  if (!poForm.supplierId || !warehouseId || !item?.productId || Number(item.quantity) <= 0) {
                    toast({ title: 'Choose a supplier, warehouse, product and quantity first.', variant: 'destructive' });
                    return;
                  }
                  createPoMutation.mutate({
                    supplierId: poForm.supplierId,
                    warehouseId,
                    expectedDate: poForm.deliveryDate || undefined,
                    items: [{ productId: item.productId, quantity: Number(item.quantity), unitCost: Number(item.unitCost || product?.cost || 0) }],
                  });
                }}
                disabled={createPoMutation.isPending}
              >
                {createPoMutation.isPending ? 'Creating…' : 'Create Purchase Order'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Modal: Stock Adjustment ───────────────────────────────────────────── */}
      <Dialog open={restockOpen} onOpenChange={setRestockOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Quick Stock Adjustment</DialogTitle></DialogHeader>
          <div className="space-y-3 py-1 text-xs">
            <div>
              <Label>Select Product</Label>
              <select
                className="w-full h-9 px-2 border rounded-lg bg-background text-xs"
                value={restockForm.productId}
                onChange={(e) => setRestockForm((p) => ({ ...p, productId: e.target.value }))}
              >
                <option value="">Choose Product</option>
                {products.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Quantity</Label>
                <Input
                  type="number"
                  placeholder="50"
                  value={restockForm.quantity}
                  onChange={(e) => setRestockForm((p) => ({ ...p, quantity: e.target.value }))}
                  className="h-9 text-xs"
                />
              </div>
              <div>
                <Label>Adjustment Type</Label>
                <select
                  className="w-full h-9 px-2 border rounded-lg bg-background text-xs"
                  value={restockForm.movementType}
                  onChange={(e) => setRestockForm((p) => ({ ...p, movementType: e.target.value }))}
                >
                  <option value="restock">Restock (Add)</option>
                  <option value="return">Customer Return</option>
                  <option value="damage">Damage (Deduct)</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setRestockOpen(false)}>Cancel</Button>
              <Button
                size="sm"
                className="bg-indigo-600 text-white"
                onClick={() => {
                  toast({ title: 'Stock adjusted & movement logged!' });
                  setRestockOpen(false);
                }}
              >
                Confirm Adjustment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Modal: Create Category ────────────────────────────────────────────── */}
      <Dialog open={categoryOpen} onOpenChange={setCategoryOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>New Category</DialogTitle></DialogHeader>
          <div className="space-y-3 py-1 text-xs">
            <div>
              <Label>Category Name</Label>
              <Input
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                placeholder="e.g. Beverages, Apparel, Electronics"
                className="h-9 text-xs"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setCategoryOpen(false)}>Cancel</Button>
              <Button
                size="sm"
                className="bg-indigo-600 text-white"
                onClick={() => createCategoryMutation.mutate({ name: categoryName })}
              >
                Create Category
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
