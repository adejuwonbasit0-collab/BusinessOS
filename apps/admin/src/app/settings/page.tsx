'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAdminAuthStore } from '@/store/authStore';

export default function AdminSettingsPage() {
  const { user } = useAdminAuthStore();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Console preferences and platform configuration</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your Admin Account</CardTitle>
          <CardDescription>Signed in as a platform Super Admin</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b">
            <span className="text-sm text-muted-foreground">Name</span>
            <span className="text-sm font-medium">{user?.firstName} {user?.lastName}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b">
            <span className="text-sm text-muted-foreground">Email</span>
            <span className="text-sm font-medium">{user?.email}</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-muted-foreground">Role</span>
            <Badge className="capitalize">{user?.role?.replace('_', ' ')}</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Platform Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { label: 'Environment', value: process.env.NODE_ENV || 'development' },
            { label: 'API URL', value: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000' },
            { label: 'Admin Console Version', value: 'v1.0.0' },
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between py-2 border-b last:border-0">
              <span className="text-sm text-muted-foreground">{row.label}</span>
              <span className="text-sm font-mono">{row.value}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
