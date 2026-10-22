'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { communicationApi } from '@/lib/operationsApi';
import { useAuthStore } from '@/store/authStore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  MessageSquare, Bell, Mail, Send, Plus, CheckCheck,
} from 'lucide-react';
import { toast } from '@/hooks/useToast';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

export default function CommunicationPage() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');

  const { data: threadsData, isLoading: threadsLoading } = useQuery({
    queryKey: ['threads'], queryFn: communicationApi.listThreads,
  });
  const { data: messagesData } = useQuery({
    queryKey: ['messages', activeThreadId], queryFn: () => communicationApi.listMessages(activeThreadId!),
    enabled: !!activeThreadId, refetchInterval: 5000,
  });
  const { data: notifsData } = useQuery({
    queryKey: ['notifications'], queryFn: communicationApi.listNotifications, refetchInterval: 30000,
  });
  const { data: logsData } = useQuery({
    queryKey: ['comm-logs'], queryFn: () => communicationApi.listLogs(),
  });
  const { data: commStats } = useQuery({ queryKey: ['comm-stats'], queryFn: communicationApi.stats });

  const sendMutation = useMutation({
    mutationFn: () => communicationApi.sendMessage(activeThreadId!, newMessage),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['messages', activeThreadId] });
      setNewMessage('');
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: communicationApi.markAllRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      toast({ title: 'All notifications marked as read' });
    },
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => communicationApi.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const threads = (threadsData as any)?.data?.threads || [];
  const messages = (messagesData as any)?.data?.messages || [];
  const notifications = (notifsData as any)?.data?.notifications || [];
  const logs = (logsData as any)?.data?.logs || [];
  const stats = (commStats as any)?.data;
  const unreadCount = notifications.filter((n: any) => !n.is_read).length;

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() && activeThreadId) sendMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Communication Center</h1>
          <p className="text-sm text-muted-foreground mt-1">Internal messaging, notifications, and outbound communications</p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Badge className="bg-red-500 text-white">{unreadCount} unread</Badge>
          )}
          <Button size="sm" variant="outline"><Plus className="h-4 w-4 mr-2" />New Thread</Button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <Card><CardContent className="pt-6">
          <div className="flex items-start justify-between"><div><p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Unread Notifications</p><p className="text-2xl font-bold">{stats?.unreadNotifications ?? unreadCount}</p></div><div className="w-9 h-9 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center"><Bell className="h-4 w-4" /></div></div>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <div className="flex items-start justify-between"><div><p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Emails Today</p><p className="text-2xl font-bold">{stats?.emailsSentToday ?? 0}</p></div><div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center"><Mail className="h-4 w-4" /></div></div>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <div className="flex items-start justify-between"><div><p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Active Threads</p><p className="text-2xl font-bold">{threads.length}</p></div><div className="w-9 h-9 rounded-lg bg-violet-500/10 text-violet-500 flex items-center justify-center"><MessageSquare className="h-4 w-4" /></div></div>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="messages">
        <TabsList>
          <TabsTrigger value="messages"><MessageSquare className="h-3.5 w-3.5 mr-1.5" />Messages</TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="h-3.5 w-3.5 mr-1.5" />Notifications
            {unreadCount > 0 && <span className="ml-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5">{unreadCount}</span>}
          </TabsTrigger>
          <TabsTrigger value="logs"><Mail className="h-3.5 w-3.5 mr-1.5" />Outbox Log</TabsTrigger>
        </TabsList>

        {/* ── Internal Messaging ── */}
        <TabsContent value="messages" className="mt-4">
          <div className="grid lg:grid-cols-3 gap-0 border rounded-xl overflow-hidden h-[520px]">
            {/* Thread list */}
            <div className="border-r bg-card overflow-y-auto">
              <div className="p-3 border-b bg-muted/20">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Conversations</p>
              </div>
              {threadsLoading ? (
                Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-14 skeleton m-2 rounded-lg" />)
              ) : threads.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-muted-foreground text-sm">
                  <MessageSquare className="h-6 w-6 mb-2 opacity-30" />No conversations yet
                </div>
              ) : threads.map((t: any) => (
                <button
                  key={t.id}
                  onClick={() => setActiveThreadId(t.id)}
                  className={cn('w-full flex items-center gap-3 p-3 text-left hover:bg-accent transition-colors', activeThreadId === t.id && 'bg-accent')}
                >
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {t.name ? t.name.charAt(0).toUpperCase() : '#'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{t.name || (t.type === 'direct' ? 'Direct Message' : 'Group')}</p>
                    <p className="text-xs text-muted-foreground capitalize">{t.type}</p>
                  </div>
                </button>
              ))}
            </div>

            {/* Message area */}
            <div className="lg:col-span-2 flex flex-col bg-background">
              {!activeThreadId ? (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Select a conversation to start messaging</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {messages.map((msg: any) => {
                      const isMe = msg.sender_id === user?.id;
                      return (
                        <div key={msg.id} className={cn('flex items-end gap-2', isMe && 'flex-row-reverse')}>
                          <Avatar className="h-7 w-7 shrink-0">
                            <AvatarFallback className="text-[10px] bg-gradient-to-br from-blue-500 to-violet-600 text-white">
                              {msg.sender_name?.split(' ').map((n: string) => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div className={cn('max-w-[70%] px-3 py-2 rounded-2xl text-sm', isMe ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-muted rounded-bl-sm')}>
                            {!isMe && <p className="text-[10px] font-semibold mb-0.5 opacity-70">{msg.sender_name}</p>}
                            <p className="leading-snug">{msg.body}</p>
                            <p className={cn('text-[10px] mt-1 opacity-60', isMe ? 'text-right' : '')}>
                              {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    {messages.length === 0 && (
                      <p className="text-center text-sm text-muted-foreground py-8">No messages yet — say hello!</p>
                    )}
                  </div>
                  <form onSubmit={handleSend} className="p-3 border-t flex gap-2">
                    <Input
                      value={newMessage} onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type a message…" className="flex-1"
                    />
                    <Button type="submit" size="icon" disabled={!newMessage.trim() || sendMutation.isPending}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </form>
                </>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ── Notifications ── */}
        <TabsContent value="notifications" className="mt-4">
          <div className="flex justify-end mb-3">
            {unreadCount > 0 && (
              <Button size="sm" variant="outline" onClick={() => markAllReadMutation.mutate()} disabled={markAllReadMutation.isPending}>
                <CheckCheck className="h-4 w-4 mr-2" />Mark all read
              </Button>
            )}
          </div>
          <div className="space-y-2">
            {notifications.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-xl">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />No notifications
              </div>
            ) : notifications.map((n: any) => (
              <div
                key={n.id}
                className={cn('flex items-start gap-3 p-4 rounded-xl border transition-colors cursor-pointer', !n.is_read ? 'bg-primary/5 border-primary/20' : 'bg-card')}
                onClick={() => !n.is_read && markReadMutation.mutate(n.id)}
              >
                <div className={cn('w-2 h-2 rounded-full mt-1.5 shrink-0', n.is_read ? 'bg-muted-foreground/30' : 'bg-primary')} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{n.title}</p>
                  {n.message && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>}
                  <p className="text-[10px] text-muted-foreground mt-1">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</p>
                </div>
                {!n.is_read && <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />}
              </div>
            ))}
          </div>
        </TabsContent>

        {/* ── Outbox Log ── */}
        <TabsContent value="logs" className="mt-4">
          <div className="rounded-xl border bg-card divide-y">
            {logs.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground"><Mail className="h-8 w-8 mx-auto mb-2 opacity-30" />No outbound messages logged yet</div>
            ) : logs.map((log: any) => (
              <div key={log.id} className="flex items-start gap-3 p-4">
                <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                  log.channel === 'email' ? 'bg-blue-500/10 text-blue-500' :
                  log.channel === 'sms' ? 'bg-green-500/10 text-green-500' :
                  'bg-violet-500/10 text-violet-500'
                )}>
                  <Mail className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium truncate">{log.subject || log.recipient}</p>
                    <Badge variant="outline" className={cn('text-[10px] capitalize',
                      log.status === 'sent' || log.status === 'delivered' ? 'bg-green-500/10 text-green-600 border-green-500/20' :
                      log.status === 'failed' ? 'bg-red-500/10 text-red-600 border-red-500/20' : ''
                    )}>{log.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{log.channel.toUpperCase()} → {log.recipient}</p>
                  {log.contact_name && <p className="text-xs text-muted-foreground">{log.contact_name}</p>}
                </div>
                <p className="text-xs text-muted-foreground shrink-0">{formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}</p>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
