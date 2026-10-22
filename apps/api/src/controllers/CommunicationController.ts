import { Request, Response } from 'express';
import { db } from '../lib/database';
import { EmailService } from '../services/EmailService';

export class CommunicationController {
  // ── Internal messaging / team chat ────────────────────────────────────────
  listThreads = async (req: Request, res: Response) => {
    const threads = await db('message_threads').join('message_thread_participants', 'message_threads.id', 'message_thread_participants.thread_id')
      .where({ 'message_threads.tenant_id': req.tenant!.id, 'message_thread_participants.user_id': req.user!.id })
      .select('message_threads.*').orderBy('message_threads.updated_at', 'desc');
    res.json({ success: true, data: { threads } });
  };

  createThread = async (req: Request, res: Response) => {
    const tenantId = req.tenant!.id;
    const { type = 'direct', name, participantIds = [] } = req.body;

    const [thread] = await db.transaction(async (trx) => {
      const [t] = await trx('message_threads').insert({ tenant_id: tenantId, type, name, created_by: req.user!.id }).returning('*');
      const allParticipants = Array.from(new Set([req.user!.id, ...participantIds]));
      await trx('message_thread_participants').insert(allParticipants.map((uid) => ({ thread_id: t.id, user_id: uid })));
      return [t];
    });

    res.status(201).json({ success: true, data: { thread } });
  };

  listMessages = async (req: Request, res: Response) => {
    const { threadId } = req.params;
    const messages = await db('messages').join('users', 'messages.sender_id', 'users.id')
      .where({ 'messages.thread_id': threadId, 'messages.tenant_id': req.tenant!.id }).whereNull('messages.deleted_at')
      .select('messages.*', db.raw("CONCAT(users.first_name, ' ', users.last_name) as sender_name"), 'users.avatar_url as sender_avatar')
      .orderBy('messages.created_at', 'asc');
    res.json({ success: true, data: { messages } });
  };

  sendMessage = async (req: Request, res: Response) => {
    const { threadId } = req.params;
    const { body } = req.body;
    const [message] = await db('messages').insert({
      thread_id: threadId, tenant_id: req.tenant!.id, sender_id: req.user!.id, body,
    }).returning('*');
    await db('message_threads').where({ id: threadId }).update({ updated_at: new Date() });
    res.status(201).json({ success: true, data: { message } });
  };

  // ── Outbound comms (email/SMS/WhatsApp) log ───────────────────────────────
  listCommunicationLogs = async (req: Request, res: Response) => {
    const { channel, contactId } = req.query as any;
    let query = db('communication_logs').leftJoin('contacts', 'communication_logs.contact_id', 'contacts.id')
      .where({ 'communication_logs.tenant_id': req.tenant!.id });
    if (channel) query = query.where('communication_logs.channel', channel);
    if (contactId) query = query.where('communication_logs.contact_id', contactId);

    const logs = await query.select('communication_logs.*', db.raw("CONCAT(contacts.first_name, ' ', contacts.last_name) as contact_name"))
      .orderBy('communication_logs.created_at', 'desc').limit(100);
    res.json({ success: true, data: { logs } });
  };

  sendEmail = async (req: Request, res: Response) => {
    const tenantId = req.tenant!.id;
    const { contactId, recipient, subject, body } = req.body;
    const tenant = await db('tenants').where({ id: tenantId }).first();

    const [log] = await db('communication_logs').insert({
      tenant_id: tenantId, contact_id: contactId || null, sent_by: req.user!.id,
      channel: 'email', recipient, subject, body, status: 'queued',
    }).returning('*');

    try {
      await EmailService.sendCustomEmail({ to: recipient, subject, body, fromName: tenant.name });
      await db('communication_logs').where({ id: log.id }).update({ status: 'sent', sent_at: new Date() });
    } catch (err: any) {
      await db('communication_logs').where({ id: log.id }).update({ status: 'failed', error_message: err.message });
    }

    res.status(201).json({ success: true, data: { log } });
  };

  // ── Notifications ──────────────────────────────────────────────────────────
  listNotifications = async (req: Request, res: Response) => {
    const notifications = await db('notifications').where({ tenant_id: req.tenant!.id, user_id: req.user!.id })
      .orderBy('created_at', 'desc').limit(50);
    res.json({ success: true, data: { notifications } });
  };

  markNotificationRead = async (req: Request, res: Response) => {
    const { id } = req.params;
    await db('notifications').where({ id, user_id: req.user!.id }).update({ is_read: true, read_at: new Date() });
    res.json({ success: true, message: 'Marked as read' });
  };

  markAllRead = async (req: Request, res: Response) => {
    await db('notifications').where({ user_id: req.user!.id, is_read: false }).update({ is_read: true, read_at: new Date() });
    res.json({ success: true, message: 'All notifications marked as read' });
  };

  stats = async (req: Request, res: Response) => {
    const [unreadNotifs, emailsSentToday] = await Promise.all([
      db('notifications').where({ tenant_id: req.tenant!.id, user_id: req.user!.id, is_read: false }).count('id as count').first(),
      db('communication_logs').where({ tenant_id: req.tenant!.id, channel: 'email' }).where('created_at', '>=', new Date().toISOString().slice(0, 10)).count('id as count').first(),
    ]);
    res.json({ success: true, data: { unreadNotifications: parseInt((unreadNotifs as any)?.count || '0'), emailsSentToday: parseInt((emailsSentToday as any)?.count || '0') } });
  };
}
