import { Request, Response } from 'express';
import { db } from '../lib/database';
import { AppError, NotFoundError } from '../lib/errors';
import { AuditService } from '../services/index';

export class MarketplaceController {
  // ── Browse listings ────────────────────────────────────────────────────────
  listListings = async (req: Request, res: Response) => {
    const { type, category, search, page = 1, limit = 24 } = req.query as any;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = db('marketplace_listings').where({ status: 'approved' });
    if (type) query = query.where('type', type);
    if (category) query = query.where('category', category);
    if (search) query = query.where((q) => q.whereILike('name', `%${search}%`).orWhereILike('description', `%${search}%`));

    const [{ count }] = await query.clone().count('id as count');
    const listings = await query.clone()
      .orderBy('is_official', 'desc')
      .orderBy('install_count', 'desc')
      .limit(parseInt(limit)).offset(offset);

    // Mark what tenant has installed
    const installed = await db('tenant_installed_apps').where({ tenant_id: req.tenant!.id }).pluck('listing_id');

    res.json({
      success: true,
      data: {
        listings: listings.map((l) => ({ ...l, isInstalled: installed.includes(l.id) })),
        pagination: { page: parseInt(page), limit: parseInt(limit), total: parseInt(count as string) },
      },
    });
  };

  getListing = async (req: Request, res: Response) => {
    const { id } = req.params;
    const listing = await db('marketplace_listings').where({ id, status: 'approved' }).first();
    if (!listing) throw new NotFoundError('Listing');

    const installed = await db('tenant_installed_apps').where({ tenant_id: req.tenant!.id, listing_id: id }).first();
    res.json({ success: true, data: { listing: { ...listing, isInstalled: !!installed, installConfig: installed?.config } } });
  };

  installApp = async (req: Request, res: Response) => {
    const tenantId = req.tenant!.id;
    const { id } = req.params;
    const { config = {} } = req.body;

    const listing = await db('marketplace_listings').where({ id, status: 'approved' }).first();
    if (!listing) throw new NotFoundError('Listing');

    const existing = await db('tenant_installed_apps').where({ tenant_id: tenantId, listing_id: id }).first();
    if (existing) throw new AppError('Already installed', 409, 'ALREADY_INSTALLED');

    const [installed] = await db('tenant_installed_apps').insert({
      tenant_id: tenantId, listing_id: id, installed_by: req.user!.id,
      installed_version: listing.version, config: JSON.stringify(config),
    }).returning('*');

    await db('marketplace_listings').where({ id }).update({ install_count: db.raw('install_count + 1') });

    AuditService.log({ tenantId, userId: req.user!.id, action: 'marketplace.install', resourceId: id, description: `Installed: ${listing.name}`, ip: req.ip });
    res.status(201).json({ success: true, data: { installation: installed } });
  };

  uninstallApp = async (req: Request, res: Response) => {
    const tenantId = req.tenant!.id;
    const { id } = req.params;
    await db('tenant_installed_apps').where({ tenant_id: tenantId, listing_id: id }).delete();
    res.json({ success: true, message: 'App uninstalled' });
  };

  getInstalledApps = async (req: Request, res: Response) => {
    const installed = await db('tenant_installed_apps')
      .join('marketplace_listings', 'tenant_installed_apps.listing_id', 'marketplace_listings.id')
      .where({ 'tenant_installed_apps.tenant_id': req.tenant!.id, 'tenant_installed_apps.is_active': true })
      .select('tenant_installed_apps.*', 'marketplace_listings.name', 'marketplace_listings.description', 'marketplace_listings.type', 'marketplace_listings.thumbnail_url', 'marketplace_listings.version as latest_version');
    res.json({ success: true, data: { installed } });
  };

  // ── Submit a listing (for developers / 3rd party) ─────────────────────────
  submitListing = async (req: Request, res: Response) => {
    const { name, description, longDescription, type, category, authorName, authorEmail, price, thumbnailUrl, metadata } = req.body;
    if (!name || !type) throw new AppError('Name and type are required', 400, 'MISSING_FIELDS');

    const [listing] = await db('marketplace_listings').insert({
      name, description, long_description: longDescription, type, category,
      author_name: authorName, author_email: authorEmail,
      price: price || 0, is_free: !price || parseFloat(price) === 0,
      thumbnail_url: thumbnailUrl, metadata: JSON.stringify(metadata || {}),
      status: 'pending',
    }).returning('*');

    res.status(201).json({ success: true, data: { listing }, message: 'Listing submitted for review' });
  };

  // ── Admin: approve/reject listings ────────────────────────────────────────
  moderateListing = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status, rejectionReason } = req.body;
    if (!['approved', 'rejected', 'archived'].includes(status)) throw new AppError('Invalid status', 400, 'INVALID_STATUS');

    const update: Record<string, any> = { status, updated_at: new Date() };
    if (status === 'rejected') {
      update.rejection_reason = rejectionReason || null;
    }

    await db('marketplace_listings').where({ id }).update(update);
    res.json({ success: true, message: `Listing ${status}` });
  };

  // ── Featured / categories ─────────────────────────────────────────────────
  getFeatured = async (req: Request, res: Response) => {
    const featured = await db('marketplace_listings')
      .where({ status: 'approved' }).orderBy('is_official', 'desc').orderBy('install_count', 'desc').limit(8);
    res.json({ success: true, data: { featured } });
  };

  getCategories = async (req: Request, res: Response) => {
    const categories = await db('marketplace_listings').where({ status: 'approved' }).distinct('category').whereNotNull('category').orderBy('category');
    res.json({ success: true, data: { categories: categories.map((c) => c.category) } });
  };
}
