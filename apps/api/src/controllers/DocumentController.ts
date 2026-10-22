import { Request, Response } from 'express';
import { db } from '../lib/database';
import { NotFoundError } from '../lib/errors';
import { AuditService } from '../services/index';

export class DocumentController {
  list = async (req: Request, res: Response) => {
    const tenantId = req.tenant!.id;
    const { type, status } = req.query as any;
    let query = db('documents').where({ tenant_id: tenantId }).whereNull('deleted_at');
    if (type) query = query.where('type', type);
    if (status) query = query.where('status', status);
    const documents = await query.orderBy('created_at', 'desc');
    res.json({ success: true, data: { documents } });
  };

  create = async (req: Request, res: Response) => {
    const tenantId = req.tenant!.id;
    const { title, type, relatedContactId, effectiveDate, expiryDate, mediaFileId } = req.body;
    const [document] = await db('documents').insert({
      tenant_id: tenantId, created_by: req.user!.id, title, type: type || 'other',
      related_contact_id: relatedContactId || null, effective_date: effectiveDate || null,
      expiry_date: expiryDate || null, media_file_id: mediaFileId || null,
    }).returning('*');

    AuditService.log({ tenantId, userId: req.user!.id, action: 'document.create', resourceType: 'document', resourceId: document.id, ip: req.ip });
    res.status(201).json({ success: true, data: { document } });
  };

  getOne = async (req: Request, res: Response) => {
    const { id } = req.params;
    const document = await db('documents').where({ id, tenant_id: req.tenant!.id }).whereNull('deleted_at').first();
    if (!document) throw new NotFoundError('Document');
    const signatures = await db('document_signatures').where({ document_id: id });
    res.json({ success: true, data: { document, signatures } });
  };

  // ── Approvals ──────────────────────────────────────────────────────────────
  requestApproval = async (req: Request, res: Response) => {
    const { resourceType, resourceId, approverId } = req.body;
    const [approval] = await db('approval_requests').insert({
      tenant_id: req.tenant!.id, resource_type: resourceType, resource_id: resourceId,
      requested_by: req.user!.id, approver_id: approverId || null,
    }).returning('*');
    res.status(201).json({ success: true, data: { approval } });
  };

  listApprovals = async (req: Request, res: Response) => {
    const { status, approverId } = req.query as any;
    let query = db('approval_requests').leftJoin('users as requester', 'approval_requests.requested_by', 'requester.id')
      .where({ 'approval_requests.tenant_id': req.tenant!.id });
    if (status) query = query.where('approval_requests.status', status);
    if (approverId) query = query.where('approval_requests.approver_id', approverId);

    const approvals = await query.select('approval_requests.*', db.raw("CONCAT(requester.first_name, ' ', requester.last_name) as requester_name")).orderBy('approval_requests.created_at', 'desc');
    res.json({ success: true, data: { approvals } });
  };

  decideApproval = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { decision, comments } = req.body;
    const approval = await db('approval_requests').where({ id, tenant_id: req.tenant!.id }).first();
    if (!approval) throw new NotFoundError('Approval request');

    await db('approval_requests').where({ id }).update({ status: decision, comments, decided_at: new Date() });
    res.json({ success: true, message: `Request ${decision}` });
  };

  // ── E-signatures ───────────────────────────────────────────────────────────
  requestSignature = async (req: Request, res: Response) => {
    const { id } = req.params; // document id
    const { signerName, signerEmail } = req.body;
    const document = await db('documents').where({ id, tenant_id: req.tenant!.id }).first();
    if (!document) throw new NotFoundError('Document');

    const [signature] = await db('document_signatures').insert({
      document_id: id, tenant_id: req.tenant!.id, signer_name: signerName, signer_email: signerEmail,
    }).returning('*');

    await db('documents').where({ id }).update({ status: 'pending_signature' });
    res.status(201).json({ success: true, data: { signature } });
  };

  submitSignature = async (req: Request, res: Response) => {
    const { signatureId } = req.params;
    const { signatureImageUrl } = req.body;
    const signature = await db('document_signatures').where({ id: signatureId, tenant_id: req.tenant!.id }).first();
    if (!signature) throw new NotFoundError('Signature request');

    await db('document_signatures').where({ id: signatureId }).update({
      status: 'signed', signature_image_url: signatureImageUrl, ip_address: req.ip, signed_at: new Date(),
    });

    const remaining = await db('document_signatures').where({ document_id: signature.document_id, status: 'pending' }).count('id as count').first();
    if (parseInt((remaining as any).count) === 0) {
      await db('documents').where({ id: signature.document_id }).update({ status: 'signed' });
    }

    res.json({ success: true, message: 'Document signed' });
  };

  stats = async (req: Request, res: Response) => {
    const tenantId = req.tenant!.id;
    const [pendingSignature, pendingApproval, expiringSoon] = await Promise.all([
      db('documents').where({ tenant_id: tenantId, status: 'pending_signature' }).count('id as count').first(),
      db('approval_requests').where({ tenant_id: tenantId, status: 'pending' }).count('id as count').first(),
      db('documents').where({ tenant_id: tenantId }).whereNotNull('expiry_date').where('expiry_date', '<=', new Date(Date.now() + 30 * 86400000)).count('id as count').first(),
    ]);
    res.json({
      success: true,
      data: {
        pendingSignature: parseInt((pendingSignature as any)?.count || '0'),
        pendingApproval: parseInt((pendingApproval as any)?.count || '0'),
        expiringSoon: parseInt((expiringSoon as any)?.count || '0'),
      },
    });
  };
}
