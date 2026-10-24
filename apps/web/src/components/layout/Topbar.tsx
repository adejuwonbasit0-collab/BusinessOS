'use client';

import { useAuthStore } from '@/store/authStore';
import { useBranding } from '@/components/providers/TenantBrandingProvider';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Bell, Settings, LogOut, User, ChevronDown, Sparkles, Shield } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function Topbar() {
  const router = useRouter();
  const { user, tenant, logout } = useAuthStore();
  const { branding } = useBranding();

  const businessName = branding?.businessName || tenant?.name || 'NexOS';
  const setupPending = tenant?.onboardingCompleted === false;

  return (
    <header className="h-13 border-b bg-sidebar flex items-center px-4 gap-3 shrink-0">
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        {branding?.logoUrl && (
          <img
            src={branding.logoUrl}
            alt=""
            className="h-6 w-6 shrink-0 rounded object-contain"
          />
        )}
        <p className="truncate text-sm font-medium">{businessName}</p>
      </div>

      {setupPending && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => router.push('/onboarding')}
          className="h-8 border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
        >
          <Sparkles className="mr-1.5 h-3.5 w-3.5" />
          Finish setup
        </Button>
      )}

      <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Notifications">
        <Bell className="h-4 w-4" />
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 pl-2 pr-1.5 py-1.5 rounded-lg hover:bg-accent transition-colors">
            <Avatar className="h-7 w-7">
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-violet-600 text-white text-[11px] font-semibold">
                {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">{user?.email}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => router.push('/settings')}><Settings className="h-4 w-4 mr-2" />Settings</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => logout()}><LogOut className="h-4 w-4 mr-2" />Sign out</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
