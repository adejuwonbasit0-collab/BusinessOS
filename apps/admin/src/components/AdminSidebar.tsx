'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAdminAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Building2, Users, DollarSign,
  ShieldAlert, Settings, LogOut, Shield,
  Activity, Database, Cable
} from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Overview', href: '/', icon: LayoutDashboard },
  { label: 'Tenants', href: '/tenants', icon: Building2 },
  { label: 'Users', href: '/users', icon: Users },
  { label: 'Revenue', href: '/revenue', icon: DollarSign },
  { label: 'System Health', href: '/health', icon: Activity },
  { label: 'DB Backups', href: '/backups', icon: Database },
  { label: 'Integrations', href: '/integrations', icon: Cable },
  { label: 'Audit Log', href: '/audit-log', icon: ShieldAlert },
  { label: 'Settings', href: '/settings', icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAdminAuthStore();

  return (
    <aside className="w-60 shrink-0 bg-sidebar border-r border-sidebar-border flex flex-col h-screen sticky top-0">
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-sidebar-border">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center">
          <Shield className="h-4 w-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold leading-none">NexOS</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Super Admin</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
                active
                  ? 'bg-primary/15 text-primary font-medium'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-sidebar-border space-y-2">
        {user && (
          <div className="flex items-center gap-2.5 px-2 py-1.5">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center text-white text-[11px] font-semibold shrink-0">
              {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium truncate">{user.firstName} {user.lastName}</p>
              <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
            </div>
          </div>
        )}
        <button
          onClick={() => logout()}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-sidebar-foreground/60 hover:bg-destructive/10 hover:text-destructive transition-colors"
        >
          <LogOut className="h-3.5 w-3.5" /> Sign out
        </button>
      </div>
    </aside>
  );
}
