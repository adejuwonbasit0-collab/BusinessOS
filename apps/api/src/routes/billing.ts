import { Router } from 'express';
import { db } from '../lib/database';

const router = Router();

// Public: list available plans (no auth required)
router.get('/plans', async (_req, res) => {
  const plans = await db('plans')
    .where({ is_active: true, is_public: true })
    .orderBy('sort_order')
    .select('id', 'name', 'slug', 'description', 'price_monthly', 'price_yearly', 'max_users', 'max_storage_gb', 'max_workflows', 'max_branches', 'feature_ai', 'feature_custom_domain', 'feature_white_label', 'feature_sso', 'feature_audit_logs', 'feature_api_access', 'feature_advanced_analytics', 'sort_order');

  res.json({ success: true, data: plans });
});

export default router;
