'use client';

import { useQuery } from '@tanstack/react-query';
import { accountingApi } from '@/lib/operationsApi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, DollarSign, BookOpen } from 'lucide-react';

export default function AccountingPage() {
  const { data: plData } = useQuery({ queryKey: ['profit-and-loss'], queryFn: () => accountingApi.profitAndLoss() });
  const { data: cashFlowData } = useQuery({ queryKey: ['cash-flow'], queryFn: accountingApi.cashFlow });
  const { data: accountsData } = useQuery({ queryKey: ['chart-of-accounts'], queryFn: accountingApi.listAccounts });

  const pl = (plData as any)?.data;
  const cashFlow = (cashFlowData as any)?.data;
  const accounts = (accountsData as any)?.data?.accounts || [];

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold tracking-tight">Accounting</h1><p className="text-sm text-muted-foreground mt-1">General ledger, budgets, tax, and financial statements</p></div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Revenue (30d)</p><p className="text-2xl font-bold text-green-600">${Number(pl?.revenue || 0).toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Expenses (30d)</p><p className="text-2xl font-bold text-red-600">${Number(pl?.expenses || 0).toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Net Income</p><p className="text-2xl font-bold">${Number(pl?.netIncome || 0).toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Net Cash Flow (90d)</p><p className="text-2xl font-bold">${Number(cashFlow?.netCashFlow || 0).toLocaleString()}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><BookOpen className="h-4 w-4" />Chart of Accounts</CardTitle></CardHeader>
        <CardContent>
          {accounts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No accounts set up yet. Create accounts to start tracking journal entries.</p>
          ) : (
            <div className="divide-y">
              {accounts.map((a: any) => (
                <div key={a.id} className="flex items-center justify-between py-2.5">
                  <div><span className="font-mono text-xs text-muted-foreground mr-2">{a.code}</span><span className="text-sm font-medium">{a.name}</span></div>
                  <span className="text-xs text-muted-foreground capitalize">{a.type}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
