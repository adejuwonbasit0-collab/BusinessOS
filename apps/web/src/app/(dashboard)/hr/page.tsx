'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { hrApi } from '@/lib/hrApi';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, Clock, Calendar, Briefcase, CheckCircle, XCircle } from 'lucide-react';
import { toast } from '@/hooks/useToast';
import { format } from 'date-fns';

function StatCard({ label, value, icon: Icon }: { label: string; value: string | number; icon: any }) {
  return (
    <Card><CardContent className="pt-6">
      <div className="flex items-start justify-between">
        <div><p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{label}</p><p className="text-2xl font-bold">{value}</p></div>
        <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center"><Icon className="h-4 w-4" /></div>
      </div>
    </CardContent></Card>
  );
}

export default function HRPage() {
  const qc = useQueryClient();
  const { data: statsData } = useQuery({ queryKey: ['hr-stats'], queryFn: hrApi.stats });
  const { data: staffData, isLoading: staffLoading } = useQuery({ queryKey: ['hr-staff'], queryFn: hrApi.listStaff });
  const { data: leaveData } = useQuery({ queryKey: ['hr-leave'], queryFn: () => hrApi.listLeaveRequests() });
  const { data: openingsData } = useQuery({ queryKey: ['hr-openings'], queryFn: hrApi.listJobOpenings });

  const checkInMutation = useMutation({
    mutationFn: () => hrApi.checkIn(),
    onSuccess: () => { toast({ title: 'Checked in successfully' }); },
    onError: (err: any) => toast({ title: err.message, variant: 'destructive' }),
  });

  const decideMutation = useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: string }) => hrApi.decideLeaveRequest(id, decision),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['hr-leave'] }); toast({ title: 'Request updated' }); },
  });

  const stats = (statsData as any)?.data;
  const staff = (staffData as any)?.data?.staff || [];
  const leaveRequests = (leaveData as any)?.data?.requests || [];
  const openings = (openingsData as any)?.data?.openings || [];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div><h1 className="text-2xl font-bold tracking-tight">Human Resources</h1><p className="text-sm text-muted-foreground mt-1">Staff, attendance, leave, and recruitment</p></div>
        <Button size="sm" onClick={() => checkInMutation.mutate()}><Clock className="h-4 w-4 mr-2" />Check In</Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Headcount" value={stats?.headcount ?? 0} icon={Users} />
        <StatCard label="Present Today" value={stats?.presentToday ?? 0} icon={CheckCircle} />
        <StatCard label="Pending Leave" value={stats?.pendingLeaveRequests ?? 0} icon={Calendar} />
        <StatCard label="Open Roles" value={stats?.openJobOpenings ?? 0} icon={Briefcase} />
      </div>

      <Tabs defaultValue="staff">
        <TabsList>
          <TabsTrigger value="staff">Staff</TabsTrigger>
          <TabsTrigger value="leave">Leave Requests</TabsTrigger>
          <TabsTrigger value="recruitment">Recruitment</TabsTrigger>
        </TabsList>

        <TabsContent value="staff" className="mt-4">
          <div className="rounded-xl border bg-card overflow-hidden">
            <Table>
              <TableHeader><TableRow className="bg-muted/30"><TableHead>Employee</TableHead><TableHead>Role</TableHead><TableHead>Department</TableHead><TableHead>Branch</TableHead></TableRow></TableHeader>
              <TableBody>
                {staffLoading ? (
                  Array.from({ length: 4 }).map((_, i) => <TableRow key={i}>{Array.from({ length: 4 }).map((_, j) => <TableCell key={j}><div className="h-4 skeleton rounded" /></TableCell>)}</TableRow>)
                ) : staff.map((s: any) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8"><AvatarFallback className="text-xs bg-gradient-to-br from-blue-500 to-violet-600 text-white">{s.first_name?.charAt(0)}{s.last_name?.charAt(0)}</AvatarFallback></Avatar>
                        <div><p className="text-sm font-medium">{s.first_name} {s.last_name}</p><p className="text-xs text-muted-foreground">{s.email}</p></div>
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="outline" className="capitalize">{s.role}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{s.department_name || '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{s.branch_name || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="leave" className="mt-4">
          <div className="space-y-3">
            {leaveRequests.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl"><Calendar className="h-8 w-8 mx-auto mb-2 opacity-30" />No leave requests</div>
            ) : leaveRequests.map((req: any) => (
              <Card key={req.id}><CardContent className="pt-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{req.user_name} — {req.leave_type_name}</p>
                  <p className="text-xs text-muted-foreground">{format(new Date(req.start_date), 'MMM d')} – {format(new Date(req.end_date), 'MMM d, yyyy')} ({req.total_days} days)</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="capitalize">{req.status}</Badge>
                  {req.status === 'pending' && (
                    <>
                      <Button size="sm" variant="outline" className="h-7 text-xs text-green-600" onClick={() => decideMutation.mutate({ id: req.id, decision: 'approved' })}><CheckCircle className="h-3.5 w-3.5 mr-1" />Approve</Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs text-red-600" onClick={() => decideMutation.mutate({ id: req.id, decision: 'rejected' })}><XCircle className="h-3.5 w-3.5 mr-1" />Reject</Button>
                    </>
                  )}
                </div>
              </CardContent></Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="recruitment" className="mt-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {openings.length === 0 ? (
              <div className="col-span-full text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl"><Briefcase className="h-8 w-8 mx-auto mb-2 opacity-30" />No open positions</div>
            ) : openings.map((o: any) => (
              <Card key={o.id}><CardContent className="pt-5">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-sm">{o.title}</h3>
                  <Badge variant="outline" className="capitalize text-[10px]">{o.status}</Badge>
                </div>
                <p className="text-xs text-muted-foreground capitalize">{o.employment_type?.replace('_', ' ')}</p>
                <p className="text-xs text-muted-foreground mt-2">{o.candidateCount} candidates</p>
              </CardContent></Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
