'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Database, Download, RotateCcw, Trash2, ShieldCheck, 
  Clock, Plus, HardDrive, CheckCircle2, AlertCircle, FileArchive
} from 'lucide-react';

interface BackupRecord {
  id: string;
  filename: string;
  createdAt: string;
  sizeMb: number;
  type: 'Automated (Cron)' | 'Manual Snapshot';
  status: 'verified' | 'in_progress';
  checksum: string;
}

export default function DatabaseBackupsPage() {
  const [backups, setBackups] = useState<BackupRecord[]>([
    {
      id: 'bkp-2026-10-22-0200',
      filename: 'nexos_prod_db_20261022_020000.sql.gz',
      createdAt: 'Today at 02:00 AM UTC',
      sizeMb: 142.8,
      type: 'Automated (Cron)',
      status: 'verified',
      checksum: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    },
    {
      id: 'bkp-2026-10-21-0200',
      filename: 'nexos_prod_db_20261021_020000.sql.gz',
      createdAt: 'Yesterday at 02:00 AM UTC',
      sizeMb: 139.4,
      type: 'Automated (Cron)',
      status: 'verified',
      checksum: '8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4',
    },
    {
      id: 'bkp-2026-10-20-1845',
      filename: 'nexos_pre_migration_20261020_184512.sql.gz',
      createdAt: 'Oct 20, 2026 06:45 PM UTC',
      sizeMb: 138.1,
      type: 'Manual Snapshot',
      status: 'verified',
      checksum: 'ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb',
    },
    {
      id: 'bkp-2026-10-19-0200',
      filename: 'nexos_prod_db_20261019_020000.sql.gz',
      createdAt: 'Oct 19, 2026 02:00 AM UTC',
      sizeMb: 134.7,
      type: 'Automated (Cron)',
      status: 'verified',
      checksum: '3e23e8160039594a33894f6564e1b1348bbd7a0088d42c4acb73eeaed59c009d',
    },
  ]);

  const [isCreatingSnapshot, setIsCreatingSnapshot] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [restoreConfirmId, setRestoreConfirmId] = useState<string | null>(null);

  const handleCreateSnapshot = () => {
    setIsCreatingSnapshot(true);
    setSuccessMessage(null);

    setTimeout(() => {
      const now = new Date();
      const timestamp = now.toISOString().replace(/[-:T]/g, '').slice(0, 14);
      const newBackup: BackupRecord = {
        id: `bkp-manual-${Date.now()}`,
        filename: `nexos_manual_snapshot_${timestamp}.sql.gz`,
        createdAt: 'Just now',
        sizeMb: +(144 + Math.random() * 2).toFixed(1),
        type: 'Manual Snapshot',
        status: 'verified',
        checksum: Math.random().toString(16).substring(2) + Math.random().toString(16).substring(2),
      };

      setBackups([newBackup, ...backups]);
      setIsCreatingSnapshot(false);
      setSuccessMessage(`Manual database snapshot ${newBackup.filename} created and encrypted successfully.`);
    }, 1500);
  };

  const handleDelete = (id: string) => {
    setBackups(backups.filter(b => b.id !== id));
  };

  const handleDownload = (filename: string) => {
    const blob = new Blob([`-- PostgreSQL database dump simulation for ${filename}\n-- Dumped by pg_dump version 16.2\nCREATE TABLE tenants (...);\n`], { type: 'application/gzip' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRestore = (id: string) => {
    setRestoreConfirmId(null);
    setSuccessMessage(`Point-in-time database restoration initiated for snapshot ${id}. Zero downtime replica staging active.`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Database className="h-6 w-6 text-primary" />
            Database Backups & Disaster Recovery
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Automated replication snapshots, point-in-time recovery, and multi-tenant cold storage archives
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            onClick={handleCreateSnapshot}
            disabled={isCreatingSnapshot}
            className="bg-primary text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            {isCreatingSnapshot ? 'Creating Snapshot...' : 'Take Manual Snapshot'}
          </Button>
        </div>
      </div>

      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-700 hover:text-emerald-900 font-bold ml-4">✕</button>
        </div>
      )}

      {/* Snapshot Strategy & Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <HardDrive className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase font-semibold">Total Backup Storage</p>
              <p className="text-xl font-bold font-mono">
                {(backups.reduce((sum, b) => sum + b.sizeMb, 0) / 1024).toFixed(2)} GB
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase font-semibold">Automated Cron Schedule</p>
              <p className="text-sm font-bold">Daily at 02:00 UTC</p>
              <p className="text-[11px] text-muted-foreground">30-day retention window</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase font-semibold">Encryption & Storage</p>
              <p className="text-sm font-bold">AES-256 GCM</p>
              <p className="text-[11px] text-muted-foreground">S3 Glacier + Local Mirror</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Backups List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileArchive className="h-4 w-4 text-primary" />
            Database Snapshots & Archives ({backups.length})
          </CardTitle>
          <CardDescription>
            All backups are cryptographically verified with SHA-256 checksums before archiving
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-border/60">
            {backups.map((bkp) => (
              <div key={bkp.id} className="py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono font-semibold">{bkp.filename}</span>
                    <Badge variant="outline" className={bkp.type.includes('Manual') ? 'border-amber-300 text-amber-700 bg-amber-50' : 'border-blue-300 text-blue-700 bg-blue-50'}>
                      {bkp.type}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{bkp.createdAt}</span>
                    <span>•</span>
                    <span className="font-mono">{bkp.sizeMb} MB</span>
                    <span>•</span>
                    <span className="font-mono truncate max-w-[200px]" title={bkp.checksum}>
                      SHA: {bkp.checksum.slice(0, 12)}...
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDownload(bkp.filename)}
                    title="Download .sql.gz archive"
                  >
                    <Download className="h-3.5 w-3.5 mr-1" />
                    Download
                  </Button>

                  {restoreConfirmId === bkp.id ? (
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleRestore(bkp.id)}
                      >
                        Confirm Restore
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setRestoreConfirmId(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-amber-700 border-amber-300 hover:bg-amber-50"
                      onClick={() => setRestoreConfirmId(bkp.id)}
                    >
                      <RotateCcw className="h-3.5 w-3.5 mr-1" />
                      Restore
                    </Button>
                  )}

                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() => handleDelete(bkp.id)}
                    title="Delete snapshot"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
