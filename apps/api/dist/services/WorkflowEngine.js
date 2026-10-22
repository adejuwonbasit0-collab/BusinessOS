"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowEngine = void 0;
const database_1 = require("../lib/database");
const logger_1 = require("../lib/logger");
const AIService_1 = require("./AIService");
const EmailService_1 = require("./EmailService");
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000;
class WorkflowEngine {
    // ── Main entry point: trigger a workflow by type and data ─────────────────
    static async trigger(tenantId, triggerType, triggerData) {
        // Find all active workflows for this tenant + trigger type
        const workflows = await (0, database_1.db)('workflows')
            .where({ tenant_id: tenantId, status: 'active', trigger_type: triggerType })
            .whereNull('deleted_at');
        for (const workflow of workflows) {
            // Check trigger conditions if any
            if (workflow.trigger_config) {
                const config = typeof workflow.trigger_config === 'string'
                    ? JSON.parse(workflow.trigger_config)
                    : workflow.trigger_config;
                if (!this.evaluateTriggerConditions(config, triggerData))
                    continue;
            }
            // Fire-and-forget execution with error capture
            this.executeWorkflow(workflow, triggerData, tenantId).catch((err) => {
                logger_1.logger.error(`Workflow execution failed: ${workflow.id}`, err);
            });
        }
    }
    // ── Check trigger filter conditions ────────────────────────────────────────
    static evaluateTriggerConditions(config, data) {
        if (!config.filters?.length)
            return true;
        for (const filter of config.filters) {
            const value = this.getNestedValue(data, filter.field);
            switch (filter.operator) {
                case 'equals':
                    if (value !== filter.value)
                        return false;
                    break;
                case 'not_equals':
                    if (value === filter.value)
                        return false;
                    break;
                case 'contains':
                    if (!String(value).includes(filter.value))
                        return false;
                    break;
                case 'greater_than':
                    if (Number(value) <= Number(filter.value))
                        return false;
                    break;
                case 'less_than':
                    if (Number(value) >= Number(filter.value))
                        return false;
                    break;
            }
        }
        return true;
    }
    // ── Execute a single workflow run ──────────────────────────────────────────
    static async executeWorkflow(workflow, triggerData, tenantId) {
        const steps = typeof workflow.steps === 'string' ? JSON.parse(workflow.steps) : (workflow.steps || []);
        // Create a run record
        const [run] = await (0, database_1.db)('workflow_runs').insert({
            workflow_id: workflow.id, tenant_id: tenantId, status: 'running',
            trigger_data: JSON.stringify(triggerData), started_at: new Date(),
        }).returning('*');
        const ctx = {
            tenantId, workflowId: workflow.id, runId: run.id,
            triggerData, variables: { ...triggerData },
        };
        const stepResults = [];
        const startTime = Date.now();
        let overallStatus = 'completed';
        let errorMessage;
        try {
            for (let i = 0; i < steps.length; i++) {
                const step = steps[i];
                const stepStart = Date.now();
                // Handle conditions — may skip remaining steps
                if (step.type === 'condition') {
                    const shouldContinue = this.evaluateCondition(step.config, ctx.variables);
                    stepResults.push({
                        stepIndex: i, stepType: step.type, stepName: step.name,
                        status: 'completed', output: { conditionMet: shouldContinue },
                        durationMs: Date.now() - stepStart,
                    });
                    if (!shouldContinue && step.config.stopOnFalse)
                        break;
                    continue;
                }
                // Handle wait/delay step
                if (step.type === 'wait') {
                    const delayMs = (step.config.delayMinutes || 1) * 60000;
                    await new Promise((r) => setTimeout(r, Math.min(delayMs, 5000))); // cap at 5s in dev
                    stepResults.push({
                        stepIndex: i, stepType: step.type, stepName: step.name,
                        status: 'completed', output: { waited: step.config.delayMinutes + ' minutes' },
                        durationMs: Date.now() - stepStart,
                    });
                    continue;
                }
                // Execute the step with retry logic
                let result = null;
                for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
                    try {
                        const output = await this.executeStep(step, ctx);
                        result = {
                            stepIndex: i, stepType: step.type, stepName: step.name,
                            status: 'completed', output, durationMs: Date.now() - stepStart,
                        };
                        // Merge step output into context variables for downstream steps
                        if (output && typeof output === 'object') {
                            ctx.variables = { ...ctx.variables, [`step_${i}_output`]: output, ...output };
                        }
                        break;
                    }
                    catch (stepErr) {
                        if (attempt === MAX_RETRIES) {
                            result = {
                                stepIndex: i, stepType: step.type, stepName: step.name,
                                status: 'failed', error: stepErr.message, durationMs: Date.now() - stepStart,
                            };
                            if (!step.config.continueOnError) {
                                overallStatus = 'failed';
                                errorMessage = `Step "${step.name}" failed: ${stepErr.message}`;
                            }
                        }
                        else {
                            await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * attempt));
                        }
                    }
                }
                if (result)
                    stepResults.push(result);
                if (overallStatus === 'failed' && !steps[i]?.config?.continueOnError)
                    break;
            }
        }
        catch (err) {
            overallStatus = 'failed';
            errorMessage = err.message;
        }
        finally {
            const duration = Date.now() - startTime;
            await (0, database_1.db)('workflow_runs').where({ id: run.id }).update({
                status: overallStatus, step_results: JSON.stringify(stepResults),
                error_message: errorMessage || null, duration_ms: duration, completed_at: new Date(),
            });
            // Update workflow stats
            await (0, database_1.db)('workflows').where({ id: workflow.id }).update({
                run_count: database_1.db.raw('run_count + 1'),
                success_count: overallStatus === 'completed' ? database_1.db.raw('success_count + 1') : database_1.db.raw('success_count'),
                error_count: overallStatus === 'failed' ? database_1.db.raw('error_count + 1') : database_1.db.raw('error_count'),
                last_run_at: new Date(),
            });
            logger_1.logger.info(`Workflow run ${run.id} ${overallStatus} in ${duration}ms`);
        }
    }
    // ── Execute a single step ──────────────────────────────────────────────────
    static async executeStep(step, ctx) {
        const config = this.interpolateConfig(step.config || {}, ctx.variables);
        switch (step.type) {
            case 'send_email':
                return this.stepSendEmail(config, ctx);
            case 'send_sms':
                return this.stepSendSMS(config, ctx);
            case 'send_whatsapp':
                return this.stepSendWhatsApp(config, ctx);
            case 'create_contact':
                return this.stepCreateContact(config, ctx);
            case 'update_contact':
                return this.stepUpdateContact(config, ctx);
            case 'create_deal':
                return this.stepCreateDeal(config, ctx);
            case 'update_deal':
                return this.stepUpdateDeal(config, ctx);
            case 'create_task':
                return this.stepCreateTask(config, ctx);
            case 'create_invoice':
                return this.stepCreateInvoice(config, ctx);
            case 'create_booking':
                return this.stepCreateBooking(config, ctx);
            case 'score_lead':
                return this.stepScoreLead(config, ctx);
            case 'notify_user':
                return this.stepNotifyUser(config, ctx);
            case 'http_request':
                return this.stepHttpRequest(config, ctx);
            case 'ai_action':
                return this.stepAIAction(config, ctx);
            case 'set_variable':
                return this.stepSetVariable(config, ctx);
            case 'slack_message':
                return this.stepSlackMessage(config, ctx);
            default:
                throw new Error(`Unknown step type: ${step.type}`);
        }
    }
    // ── Step implementations ───────────────────────────────────────────────────
    static async stepSendEmail(config, ctx) {
        const tenant = await (0, database_1.db)('tenants').where({ id: ctx.tenantId }).first();
        const recipient = config.to || ctx.variables.email || ctx.variables.contact_email;
        if (!recipient)
            throw new Error('No recipient email found');
        await EmailService_1.EmailService.sendCustomEmail({
            to: recipient, subject: config.subject || 'Message from ' + tenant.name,
            body: config.body || config.template || '', fromName: tenant.name,
        });
        await (0, database_1.db)('communication_logs').insert({
            tenant_id: ctx.tenantId, channel: 'email', recipient, subject: config.subject,
            body: config.body, status: 'sent', sent_at: new Date(),
        }).catch(() => { });
        return { sent: true, to: recipient };
    }
    static async stepSendSMS(config, ctx) {
        // Twilio integration placeholder - logs to communication_logs
        const recipient = config.to || ctx.variables.phone;
        await (0, database_1.db)('communication_logs').insert({
            tenant_id: ctx.tenantId, channel: 'sms', recipient,
            body: config.message, status: 'queued',
        }).catch(() => { });
        return { queued: true, to: recipient };
    }
    static async stepSendWhatsApp(config, ctx) {
        const recipient = config.to || ctx.variables.phone;
        await (0, database_1.db)('communication_logs').insert({
            tenant_id: ctx.tenantId, channel: 'whatsapp', recipient,
            body: config.message, status: 'queued',
        }).catch(() => { });
        return { queued: true, to: recipient };
    }
    static async stepCreateContact(config, ctx) {
        const [contact] = await (0, database_1.db)('contacts').insert({
            tenant_id: ctx.tenantId, first_name: config.firstName || ctx.variables.firstName || 'Unknown',
            last_name: config.lastName || ctx.variables.lastName || '',
            email: config.email || ctx.variables.email, phone: config.phone || ctx.variables.phone,
            type: config.type || 'lead', company_name: config.companyName,
        }).returning('*');
        return { contactId: contact.id };
    }
    static async stepUpdateContact(config, ctx) {
        const contactId = config.contactId || ctx.variables.contactId || ctx.variables.id;
        if (!contactId)
            throw new Error('No contactId to update');
        await (0, database_1.db)('contacts').where({ id: contactId, tenant_id: ctx.tenantId }).update({ ...config.fields, updated_at: new Date() });
        return { updated: true, contactId };
    }
    static async stepCreateDeal(config, ctx) {
        const [pipeline] = await (0, database_1.db)('pipelines').where({ tenant_id: ctx.tenantId }).limit(1);
        const [stage] = pipeline ? await (0, database_1.db)('pipeline_stages').where({ pipeline_id: pipeline.id }).orderBy('sort_order').limit(1) : [null];
        const [deal] = await (0, database_1.db)('deals').insert({
            tenant_id: ctx.tenantId, name: config.name || 'New Deal', amount: config.amount || 0,
            contact_id: config.contactId || ctx.variables.contactId,
            pipeline_id: pipeline?.id, stage_id: stage?.id,
        }).returning('*');
        return { dealId: deal.id };
    }
    static async stepUpdateDeal(config, ctx) {
        const dealId = config.dealId || ctx.variables.dealId;
        await (0, database_1.db)('deals').where({ id: dealId, tenant_id: ctx.tenantId }).update({ ...config.fields, updated_at: new Date() });
        return { updated: true, dealId };
    }
    static async stepCreateTask(config, ctx) {
        const [task] = await (0, database_1.db)('tasks').insert({
            tenant_id: ctx.tenantId, title: config.title || 'New Task',
            assignee_id: config.assigneeId, project_id: config.projectId,
            priority: config.priority || 'medium', due_date: config.dueDate,
        }).returning('*');
        return { taskId: task.id };
    }
    static async stepCreateInvoice(config, ctx) {
        const [{ count }] = await (0, database_1.db)('invoices').where({ tenant_id: ctx.tenantId }).count('id as count');
        const invoiceNumber = `INV-${new Date().getFullYear()}-${String(parseInt(count) + 1).padStart(4, '0')}`;
        const [invoice] = await (0, database_1.db)('invoices').insert({
            tenant_id: ctx.tenantId, contact_id: config.contactId || ctx.variables.contactId,
            invoice_number: invoiceNumber, total: config.amount || 0, subtotal: config.amount || 0,
            amount_due: config.amount || 0, issue_date: new Date(),
            due_date: new Date(Date.now() + 30 * 86400000),
        }).returning('*');
        return { invoiceId: invoice.id, invoiceNumber };
    }
    static async stepCreateBooking(config, ctx) {
        const [booking] = await (0, database_1.db)('bookings').insert({
            tenant_id: ctx.tenantId, title: config.title || 'New Booking',
            contact_id: config.contactId || ctx.variables.contactId,
            start_at: config.startAt, end_at: config.endAt, status: 'pending',
        }).returning('*');
        return { bookingId: booking.id };
    }
    static async stepScoreLead(config, ctx) {
        const contactId = config.contactId || ctx.variables.contactId;
        if (!contactId)
            return { skipped: true, reason: 'No contactId' };
        const contact = await (0, database_1.db)('contacts').where({ id: contactId }).first();
        if (!contact)
            return { skipped: true, reason: 'Contact not found' };
        const result = await AIService_1.AIService.scoreLeadWithReasoning({
            type: contact.type, leadSource: contact.lead_source, companyName: contact.company_name,
        });
        await (0, database_1.db)('contacts').where({ id: contactId }).update({ lead_score: result.score });
        return { score: result.score, grade: result.grade };
    }
    static async stepNotifyUser(config, ctx) {
        const userId = config.userId || ctx.variables.ownerId;
        if (!userId)
            return { skipped: true };
        await (0, database_1.db)('notifications').insert({
            tenant_id: ctx.tenantId, user_id: userId, title: config.title || 'Workflow Notification',
            message: config.message, type: config.type || 'info',
        });
        return { notified: true, userId };
    }
    static async stepHttpRequest(config, ctx) {
        const response = await fetch(config.url, {
            method: config.method || 'POST',
            headers: { 'Content-Type': 'application/json', ...(config.headers || {}) },
            body: config.body ? JSON.stringify(this.interpolateConfig(config.body, ctx.variables)) : undefined,
        });
        if (!response.ok)
            throw new Error(`HTTP request failed: ${response.status} ${response.statusText}`);
        const data = await response.json().catch(() => null);
        return { statusCode: response.status, data };
    }
    static async stepAIAction(config, ctx) {
        const tenant = await (0, database_1.db)('tenants').where({ id: ctx.tenantId }).first();
        const prompt = this.interpolateTemplate(config.prompt || '', ctx.variables);
        const reply = await AIService_1.AIService.chat([{ role: 'user', content: prompt }], { name: tenant.name, industry: tenant.industry || 'business', enabledModules: tenant.enabled_modules || [] });
        // Optionally store the result in variables
        if (config.outputVariable) {
            ctx.variables[config.outputVariable] = reply;
        }
        return { reply };
    }
    static async stepSlackMessage(config, ctx) {
        const integration = await (0, database_1.db)('integrations').where({ tenant_id: ctx.tenantId, provider: 'slack', status: 'active' }).first();
        if (!integration)
            return { skipped: true, reason: 'Slack not connected' };
        // Placeholder — real impl decrypts token and calls Slack API
        return { sent: true, channel: config.channel };
    }
    static stepSetVariable(config, ctx) {
        ctx.variables[config.name] = config.value;
        return { set: config.name, value: config.value };
    }
    // ── Condition evaluator ────────────────────────────────────────────────────
    static evaluateCondition(config, variables) {
        if (!config?.field)
            return true;
        const value = this.getNestedValue(variables, config.field);
        switch (config.operator) {
            case 'equals': return value === config.value;
            case 'not_equals': return value !== config.value;
            case 'contains': return String(value).includes(config.value);
            case 'greater_than': return Number(value) > Number(config.value);
            case 'less_than': return Number(value) < Number(config.value);
            case 'is_empty': return !value;
            case 'is_not_empty': return !!value;
            default: return true;
        }
    }
    // ── Template interpolation — replace {{variable}} placeholders ─────────────
    static interpolateTemplate(template, variables) {
        return template.replace(/\{\{([^}]+)\}\}/g, (_, key) => {
            const trimmed = key.trim();
            return this.getNestedValue(variables, trimmed) ?? `{{${trimmed}}}`;
        });
    }
    static interpolateConfig(config, variables) {
        if (typeof config === 'string')
            return this.interpolateTemplate(config, variables);
        if (Array.isArray(config))
            return config.map((item) => this.interpolateConfig(item, variables));
        if (config && typeof config === 'object') {
            const result = {};
            for (const [k, v] of Object.entries(config))
                result[k] = this.interpolateConfig(v, variables);
            return result;
        }
        return config;
    }
    static getNestedValue(obj, path) {
        return path.split('.').reduce((acc, key) => acc?.[key], obj);
    }
    // ── Manual test run ───────────────────────────────────────────────────────
    static async testRun(workflowId, tenantId, _userId) {
        const workflow = await (0, database_1.db)('workflows').where({ id: workflowId, tenant_id: tenantId }).first();
        if (!workflow)
            throw new Error('Workflow not found');
        const sampleData = { test: true, contactId: null, email: 'test@example.com', name: 'Test User' };
        await this.executeWorkflow(workflow, sampleData, tenantId);
        return (0, database_1.db)('workflow_runs').where({ workflow_id: workflowId }).orderBy('started_at', 'desc').first();
    }
}
exports.WorkflowEngine = WorkflowEngine;
//# sourceMappingURL=WorkflowEngine.js.map