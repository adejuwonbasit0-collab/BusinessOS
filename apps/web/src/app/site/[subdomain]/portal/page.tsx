'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  User, ShoppingCart, Calendar, FileText, ArrowLeft,
  Clock, CheckCircle, Download, CreditCard, Bell, LogOut, Package
} from 'lucide-react';
import { toast } from '@/hooks/useToast';

export default function CustomerPortalPage() {
  const params = useParams();
  const subdomain = (params.subdomain as string) || 'demo';

  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [activeTab, setActiveTab] = useState('orders');

  const [customer, setCustomer] = useState({
    name: 'Emily Watson',
    email: 'emily.watson@example.com',
    phone: '+1 (555) 789-0123',
    memberSince: 'March 2026',
  });

  const orders = [
    {
      id: 'ORD-9021',
      date: 'Oct 20, 2026',
      items: 'Executive Suite Reservation (1 Night)',
      amount: '$180.00',
      status: 'Confirmed & Paid',
      delivery: 'Service Scheduled',
    },
    {
      id: 'ORD-8840',
      date: 'Sep 14, 2026',
      items: 'Signature Care Kit & Branded Amenity',
      amount: '$65.00',
      status: 'Delivered',
      delivery: 'Fulfilled',
    },
  ];

  const bookings = [
    {
      id: 'BKG-401',
      service: 'Specialist Consultation & Assessment',
      date: 'Monday, Oct 27, 2026',
      time: '14:30 PM',
      staff: 'Dr. Gregory House',
      status: 'Upcoming Confirmed',
    },
  ];

  const invoices = [
    {
      id: 'INV-2026-041',
      date: 'Oct 20, 2026',
      dueDate: 'Paid upon checkout',
      amount: '$180.00',
      status: 'Paid',
    },
    {
      id: 'INV-2026-022',
      date: 'Sep 14, 2026',
      dueDate: 'Sep 21, 2026',
      amount: '$65.00',
      status: 'Paid',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-foreground flex flex-col font-sans">
      {/* ── Top Portal Navbar ─────────────────────────────────────────────────── */}
      <header className="border-b bg-background sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href={`/site/${subdomain}`} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to {subdomain.toUpperCase()} Public Site
          </Link>

          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
                {customer.name.charAt(0)}
              </div>
              <span className="text-xs font-semibold hidden sm:inline">{customer.name}</span>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-xs text-muted-foreground hover:text-destructive"
              onClick={() => {
                toast({ title: 'Signed out of Customer Portal' });
              }}
            >
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </header>

      {/* ── Main Portal Body ─────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Customer Account Portal</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage your orders, scheduled appointments, payment receipts, and profile with <strong className="text-foreground">{subdomain.toUpperCase()}</strong>.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-muted p-1">
            <TabsTrigger value="orders" className="text-xs gap-1.5">
              <ShoppingCart className="h-3.5 w-3.5" /> My Orders ({orders.length})
            </TabsTrigger>
            <TabsTrigger value="bookings" className="text-xs gap-1.5">
              <Calendar className="h-3.5 w-3.5" /> My Appointments ({bookings.length})
            </TabsTrigger>
            <TabsTrigger value="invoices" className="text-xs gap-1.5">
              <FileText className="h-3.5 w-3.5" /> Invoices & Receipts
            </TabsTrigger>
            <TabsTrigger value="profile" className="text-xs gap-1.5">
              <User className="h-3.5 w-3.5" /> Profile & Details
            </TabsTrigger>
          </TabsList>

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-3">
            {orders.map((ord) => (
              <Card key={ord.id} className="shadow-2xs">
                <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-indigo-600 font-mono">{ord.id}</span>
                      <span className="text-xs text-muted-foreground">• {ord.date}</span>
                      <Badge variant="outline" className="text-[10px] bg-green-500/10 text-green-600 border-green-500/20">
                        {ord.status}
                      </Badge>
                    </div>
                    <p className="font-medium text-sm text-foreground">{ord.items}</p>
                    <p className="text-xs text-muted-foreground">Fulfillment: {ord.delivery}</p>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center">
                    <span className="font-bold text-sm text-foreground">{ord.amount}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs gap-1"
                      onClick={() => toast({ title: 'Downloading invoice PDF...' })}
                    >
                      <Download className="h-3 w-3" /> Receipt
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Bookings Tab */}
          <TabsContent value="bookings" className="space-y-3">
            {bookings.map((bkg) => (
              <Card key={bkg.id} className="shadow-2xs">
                <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-indigo-600 text-white text-[10px]">{bkg.status}</Badge>
                      <span className="text-xs text-muted-foreground font-mono">{bkg.id}</span>
                    </div>
                    <h3 className="font-semibold text-sm text-foreground">{bkg.service}</h3>
                    <p className="text-xs text-muted-foreground flex items-center gap-3">
                      <span><Calendar className="h-3.5 w-3.5 inline mr-1 text-indigo-600" />{bkg.date}</span>
                      <span><Clock className="h-3.5 w-3.5 inline mr-1 text-indigo-600" />{bkg.time}</span>
                      <span>Assigned: <strong>{bkg.staff}</strong></span>
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs"
                      onClick={() => toast({ title: 'Reschedule request sent to front desk' })}
                    >
                      Reschedule
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 text-xs text-red-600 hover:bg-red-50"
                      onClick={() => toast({ title: 'Appointment cancelled' })}
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Invoices Tab */}
          <TabsContent value="invoices" className="space-y-3">
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/40 border-b text-muted-foreground">
                      <tr>
                        <th className="p-3 font-semibold">Invoice #</th>
                        <th className="p-3 font-semibold">Issue Date</th>
                        <th className="p-3 font-semibold">Due Date</th>
                        <th className="p-3 font-semibold">Amount</th>
                        <th className="p-3 font-semibold">Status</th>
                        <th className="p-3 font-semibold text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {invoices.map((inv) => (
                        <tr key={inv.id}>
                          <td className="p-3 font-mono font-medium">{inv.id}</td>
                          <td className="p-3 text-muted-foreground">{inv.date}</td>
                          <td className="p-3 text-muted-foreground">{inv.dueDate}</td>
                          <td className="p-3 font-bold">{inv.amount}</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded text-[10px] bg-green-500/10 text-green-600 font-semibold">
                              {inv.status}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <Button size="sm" variant="ghost" className="h-7 text-xs text-indigo-600" onClick={() => toast({ title: 'Downloading invoice PDF...' })}>
                              <Download className="h-3 w-3 mr-1" /> PDF
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-4">
            <Card className="max-w-xl p-5">
              <h3 className="font-semibold text-sm mb-4">Your Contact Details</h3>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  toast({ title: 'Profile updated!' });
                }}
                className="space-y-3 text-xs"
              >
                <div>
                  <Label>Full Name</Label>
                  <Input value={customer.name} onChange={(e) => setCustomer((p) => ({ ...p, name: e.target.value }))} className="h-9 text-xs" />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={customer.email} onChange={(e) => setCustomer((p) => ({ ...p, email: e.target.value }))} className="h-9 text-xs" />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input type="tel" value={customer.phone} onChange={(e) => setCustomer((p) => ({ ...p, phone: e.target.value }))} className="h-9 text-xs" />
                </div>
                <Button type="submit" size="sm" className="bg-indigo-600 text-white">Save Changes</Button>
              </form>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
