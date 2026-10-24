import { Request, Response } from 'express';
import { db } from '../lib/database';
import { AppError, ValidationError } from '../lib/errors';

/** Tenant-owned CMS sites. These records are deliberately separate from
 * App Builder portals: a website is what a public hostname renders. */
export class WebsiteController {
  list = async (req: Request, res: Response) => {
    const sites = await db('websites').where({ tenant_id: req.tenant!.id }).orderBy('updated_at', 'desc');
    const ids = sites.map((site: any) => site.id);
    const pages = ids.length ? await db('pages').whereIn('website_id', ids).where({ tenant_id: req.tenant!.id }).orderBy('created_at', 'asc') : [];
    res.json({ success: true, data: { websites: sites.map((site: any) => ({ ...site, pages: pages.filter((page: any) => page.website_id === site.id) })) } });
  };

  createOrUpdate = async (req: Request, res: Response) => {
    const tenantId = req.tenant!.id;
    const { id, name, blocks, publish = false, pageTitle = 'Home', theme = {} } = req.body || {};
    if (!name || !String(name).trim()) throw new ValidationError([{ field: 'name', message: 'Website name is required' }]);
    if (!Array.isArray(blocks)) throw new ValidationError([{ field: 'blocks', message: 'Website blocks must be an array' }]);

    let site: any;
    await db.transaction(async (trx) => {
      if (id) {
        site = await trx('websites').where({ id, tenant_id: tenantId }).first();
        if (!site) throw new AppError('Website not found', 404, 'WEBSITE_NOT_FOUND');
        [site] = await trx('websites').where({ id: site.id }).update({ name: String(name).trim(), theme: JSON.stringify(theme), is_published: Boolean(publish), updated_at: new Date() }).returning('*');
      } else {
        [site] = await trx('websites').insert({ tenant_id: tenantId, name: String(name).trim(), theme: JSON.stringify(theme), seo: JSON.stringify({}), is_published: Boolean(publish) }).returning('*');
      }
      const existing = await trx('pages').where({ website_id: site.id, tenant_id: tenantId, is_homepage: true }).first();
      const page = { title: String(pageTitle).trim() || 'Home', slug: 'home', blocks: JSON.stringify(blocks), status: publish ? 'published' : 'draft', published_at: publish ? new Date() : null, updated_at: new Date() };
      if (existing) await trx('pages').where({ id: existing.id }).update(page);
      else await trx('pages').insert({ ...page, website_id: site.id, tenant_id: tenantId, is_homepage: true, seo: JSON.stringify({}) });
    });
    res.status(id ? 200 : 201).json({ success: true, data: { website: site } });
  };
}
