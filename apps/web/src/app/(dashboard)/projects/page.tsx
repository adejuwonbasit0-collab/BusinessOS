'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsApi } from '@/lib/projectsApi';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Kanban, Plus, Clock, AlertCircle, FolderKanban } from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUS_COLUMNS = [
  { key: 'todo', label: 'To Do', color: 'bg-muted text-muted-foreground' },
  { key: 'in_progress', label: 'In Progress', color: 'bg-blue-500/15 text-blue-600' },
  { key: 'in_review', label: 'In Review', color: 'bg-amber-500/15 text-amber-600' },
  { key: 'done', label: 'Done', color: 'bg-green-500/15 text-green-600' },
];

const PRIORITY_COLORS: Record<string, string> = {
  low: 'border-l-muted-foreground', medium: 'border-l-blue-500', high: 'border-l-amber-500', urgent: 'border-l-red-500',
};

export default function ProjectsPage() {
  const qc = useQueryClient();
  const { data: statsData } = useQuery({ queryKey: ['projects-stats'], queryFn: projectsApi.stats });
  const { data: projectsData, isLoading: projectsLoading } = useQuery({ queryKey: ['projects'], queryFn: () => projectsApi.list() });
  const { data: tasksData } = useQuery({ queryKey: ['all-tasks'], queryFn: () => projectsApi.listTasks() });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => projectsApi.updateTaskStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['all-tasks'] }),
  });

  const stats = (statsData as any)?.data;
  const projects = (projectsData as any)?.data?.projects || [];
  const tasks = (tasksData as any)?.data?.tasks || [];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div><h1 className="text-2xl font-bold tracking-tight">Project Management</h1><p className="text-sm text-muted-foreground mt-1">Projects, tasks, and team timelines</p></div>
        <Button size="sm"><Plus className="h-4 w-4 mr-2" />New Project</Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <Card><CardContent className="pt-6"><div className="flex items-start justify-between"><div><p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Active Projects</p><p className="text-2xl font-bold">{stats?.activeProjects ?? 0}</p></div><div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center"><FolderKanban className="h-4 w-4" /></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-start justify-between"><div><p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">My Open Tasks</p><p className="text-2xl font-bold">{stats?.myOpenTasks ?? 0}</p></div><div className="w-9 h-9 rounded-lg bg-violet-500/10 text-violet-500 flex items-center justify-center"><Clock className="h-4 w-4" /></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-start justify-between"><div><p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Overdue Tasks</p><p className="text-2xl font-bold text-red-600">{stats?.overdueTasks ?? 0}</p></div><div className="w-9 h-9 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center"><AlertCircle className="h-4 w-4" /></div></div></CardContent></Card>
      </div>

      {/* Projects grid */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Projects</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projectsLoading ? (
            Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-32 skeleton rounded-xl" />)
          ) : projects.length === 0 ? (
            <div className="col-span-full text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl"><FolderKanban className="h-8 w-8 mx-auto mb-2 opacity-30" />No projects yet</div>
          ) : projects.map((p: any) => {
            const pct = p.taskCount > 0 ? Math.round((p.completedTaskCount / p.taskCount) * 100) : 0;
            return (
              <Card key={p.id} className="hover:border-primary/30 transition-colors">
                <CardContent className="pt-5">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-sm">{p.name}</h3>
                    <Badge variant="outline" className="capitalize text-[10px]">{p.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{p.description}</p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                    <span>{p.completedTaskCount}/{p.taskCount} tasks</span><span>{pct}%</span>
                  </div>
                  <Progress value={pct} className="h-1.5" />
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Kanban board */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Task Board</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {STATUS_COLUMNS.map((col) => {
            const colTasks = tasks.filter((t: any) => t.status === col.key);
            return (
              <div key={col.key} className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', col.color)}>{col.label}</span>
                  <span className="text-xs text-muted-foreground">{colTasks.length}</span>
                </div>
                <div className="space-y-2 min-h-[100px]">
                  {colTasks.map((task: any) => (
                    <Card key={task.id} className={cn('border-l-4 cursor-pointer hover:shadow-card-hover transition-all', PRIORITY_COLORS[task.priority])}>
                      <CardContent className="p-3">
                        <p className="text-sm font-medium leading-snug">{task.title}</p>
                        {task.assignee_name && <p className="text-xs text-muted-foreground mt-1.5">{task.assignee_name}</p>}
                        <div className="flex gap-1 mt-2">
                          {STATUS_COLUMNS.filter(c => c.key !== task.status).map((c) => (
                            <button key={c.key} onClick={() => updateTaskMutation.mutate({ id: task.id, status: c.key })} className="text-[10px] px-1.5 py-0.5 rounded bg-muted hover:bg-accent text-muted-foreground">
                              → {c.label}
                            </button>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
