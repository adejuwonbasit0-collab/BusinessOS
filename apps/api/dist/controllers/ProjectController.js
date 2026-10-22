"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectController = void 0;
const database_1 = require("../lib/database");
const errors_1 = require("../lib/errors");
const index_1 = require("../services/index");
class ProjectController {
    // ── Projects ───────────────────────────────────────────────────────────────
    listProjects = async (req, res) => {
        const tenantId = req.tenant.id;
        const { status } = req.query;
        let query = (0, database_1.db)('projects').leftJoin('contacts', 'projects.client_contact_id', 'contacts.id')
            .where({ 'projects.tenant_id': tenantId }).whereNull('projects.deleted_at');
        if (status)
            query = query.where('projects.status', status);
        const projects = await query.select('projects.*', database_1.db.raw("CONCAT(contacts.first_name, ' ', contacts.last_name) as client_name")).orderBy('projects.created_at', 'desc');
        const withTaskCounts = await Promise.all(projects.map(async (p) => {
            const [total, done] = await Promise.all([
                (0, database_1.db)('tasks').where({ project_id: p.id }).whereNull('deleted_at').count('id as count').first(),
                (0, database_1.db)('tasks').where({ project_id: p.id, status: 'done' }).whereNull('deleted_at').count('id as count').first(),
            ]);
            return { ...p, taskCount: parseInt(total.count), completedTaskCount: parseInt(done.count) };
        }));
        res.json({ success: true, data: { projects: withTaskCounts } });
    };
    createProject = async (req, res) => {
        const tenantId = req.tenant.id;
        const { name, description, clientContactId, startDate, endDate, budget } = req.body;
        const [project] = await (0, database_1.db)('projects').insert({
            tenant_id: tenantId, name, description, client_contact_id: clientContactId || null, owner_id: req.user.id,
            start_date: startDate || null, end_date: endDate || null, budget: budget || null,
        }).returning('*');
        await (0, database_1.db)('project_members').insert({ project_id: project.id, user_id: req.user.id, role_on_project: 'owner' });
        index_1.AuditService.log({ tenantId, userId: req.user.id, action: 'project.create', resourceType: 'project', resourceId: project.id, ip: req.ip });
        res.status(201).json({ success: true, data: { project } });
    };
    getProject = async (req, res) => {
        const { id } = req.params;
        const project = await (0, database_1.db)('projects').where({ id, tenant_id: req.tenant.id }).whereNull('deleted_at').first();
        if (!project)
            throw new errors_1.NotFoundError('Project');
        const [tasks, milestones, members] = await Promise.all([
            (0, database_1.db)('tasks').where({ project_id: id }).whereNull('deleted_at').orderBy('sort_order'),
            (0, database_1.db)('milestones').where({ project_id: id }).orderBy('sort_order'),
            (0, database_1.db)('project_members').join('users', 'project_members.user_id', 'users.id').where({ project_id: id })
                .select('users.id', 'users.first_name', 'users.last_name', 'users.avatar_url', 'project_members.role_on_project'),
        ]);
        res.json({ success: true, data: { project, tasks, milestones, members } });
    };
    updateProjectStatus = async (req, res) => {
        const { id } = req.params;
        const { status, progressPercent } = req.body;
        const project = await (0, database_1.db)('projects').where({ id, tenant_id: req.tenant.id }).whereNull('deleted_at').first();
        if (!project)
            throw new errors_1.NotFoundError('Project');
        const update = { updated_at: new Date() };
        if (status)
            update.status = status;
        if (progressPercent !== undefined)
            update.progress_percent = progressPercent;
        await (0, database_1.db)('projects').where({ id }).update(update);
        res.json({ success: true, message: 'Project updated' });
    };
    // ── Milestones ─────────────────────────────────────────────────────────────
    createMilestone = async (req, res) => {
        const { projectId, name, dueDate } = req.body;
        const [milestone] = await (0, database_1.db)('milestones').insert({ tenant_id: req.tenant.id, project_id: projectId, name, due_date: dueDate || null }).returning('*');
        res.status(201).json({ success: true, data: { milestone } });
    };
    // ── Tasks ──────────────────────────────────────────────────────────────────
    listTasks = async (req, res) => {
        const tenantId = req.tenant.id;
        const { projectId, assigneeId, status } = req.query;
        let query = (0, database_1.db)('tasks').leftJoin('users', 'tasks.assignee_id', 'users.id').where({ 'tasks.tenant_id': tenantId }).whereNull('tasks.deleted_at');
        if (projectId)
            query = query.where('tasks.project_id', projectId);
        if (assigneeId)
            query = query.where('tasks.assignee_id', assigneeId);
        if (status)
            query = query.where('tasks.status', status);
        const tasks = await query.select('tasks.*', database_1.db.raw("CONCAT(users.first_name, ' ', users.last_name) as assignee_name")).orderBy('tasks.sort_order');
        res.json({ success: true, data: { tasks } });
    };
    createTask = async (req, res) => {
        const tenantId = req.tenant.id;
        const { projectId, milestoneId, title, description, assigneeId, priority, dueDate, estimatedHours } = req.body;
        const [task] = await (0, database_1.db)('tasks').insert({
            tenant_id: tenantId, project_id: projectId || null, milestone_id: milestoneId || null, title, description,
            assignee_id: assigneeId || null, created_by: req.user.id, priority: priority || 'medium',
            due_date: dueDate || null, estimated_hours: estimatedHours || null,
        }).returning('*');
        res.status(201).json({ success: true, data: { task } });
    };
    updateTaskStatus = async (req, res) => {
        const { id } = req.params;
        const { status } = req.body;
        const task = await (0, database_1.db)('tasks').where({ id, tenant_id: req.tenant.id }).whereNull('deleted_at').first();
        if (!task)
            throw new errors_1.NotFoundError('Task');
        const update = { status, updated_at: new Date() };
        if (status === 'done')
            update.completed_at = new Date();
        await (0, database_1.db)('tasks').where({ id }).update(update);
        res.json({ success: true, message: 'Task status updated' });
    };
    addComment = async (req, res) => {
        const { id } = req.params;
        const { body } = req.body;
        const [comment] = await (0, database_1.db)('task_comments').insert({ task_id: id, user_id: req.user.id, body }).returning('*');
        res.status(201).json({ success: true, data: { comment } });
    };
    // ── Stats ──────────────────────────────────────────────────────────────────
    stats = async (req, res) => {
        const tenantId = req.tenant.id;
        const [activeProjects, myTasks, overdueTasks] = await Promise.all([
            (0, database_1.db)('projects').where({ tenant_id: tenantId, status: 'active' }).whereNull('deleted_at').count('id as count').first(),
            (0, database_1.db)('tasks').where({ tenant_id: tenantId, assignee_id: req.user.id }).whereNot('status', 'done').whereNull('deleted_at').count('id as count').first(),
            (0, database_1.db)('tasks').where({ tenant_id: tenantId }).whereNot('status', 'done').whereNull('deleted_at').where('due_date', '<', new Date()).count('id as count').first(),
        ]);
        res.json({
            success: true,
            data: {
                activeProjects: parseInt(activeProjects?.count || '0'),
                myOpenTasks: parseInt(myTasks?.count || '0'),
                overdueTasks: parseInt(overdueTasks?.count || '0'),
            },
        });
    };
}
exports.ProjectController = ProjectController;
//# sourceMappingURL=ProjectController.js.map