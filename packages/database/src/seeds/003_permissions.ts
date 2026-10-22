import type { Knex } from 'knex';
import { v4 as uuidv4 } from 'uuid';

const MODULES_ACTIONS: Record<string, string[]> = {
  crm: ['view', 'create', 'edit', 'delete', 'export'],
  finance: ['view', 'create', 'edit', 'delete', 'approve'],
  inventory: ['view', 'create', 'edit', 'delete', 'transfer'],
  hr: ['view', 'create', 'edit', 'delete', 'approve'],
  payroll: ['view', 'process', 'approve'],
  projects: ['view', 'create', 'edit', 'delete'],
  booking: ['view', 'create', 'edit', 'cancel'],
  documents: ['view', 'create', 'edit', 'delete', 'sign'],
  sales: ['view', 'create', 'edit', 'refund'],
  analytics: ['view', 'export'],
  settings: ['view', 'edit'],
  roles: ['view', 'create', 'edit', 'delete'],
  branches: ['view', 'create', 'edit', 'delete'],
};

export async function seed(knex: Knex): Promise<void> {
  await knex('permissions').del();

  const rows = [];
  for (const [module, actions] of Object.entries(MODULES_ACTIONS)) {
    for (const action of actions) {
      rows.push({
        id: uuidv4(),
        module,
        action,
        key: `${module}.${action}`,
        description: `Can ${action} ${module}`,
      });
    }
  }
  await knex('permissions').insert(rows);

  console.log(`✅ Seeded ${rows.length} permissions across ${Object.keys(MODULES_ACTIONS).length} modules.`);
}
