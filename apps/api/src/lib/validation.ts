import { Request, Response, NextFunction } from 'express';
import { ValidationError } from './errors';

/**
 * Whether a body value counts as "provided".
 *
 * `undefined`, `null`, blank strings and empty arrays are all treated as
 * missing, because every one of them ends up as `NULL`/`''` in PostgreSQL and
 * therefore violates a `NOT NULL` constraint.
 */
function isPresent(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === 'string') return value.trim() !== '';
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'number') return !Number.isNaN(value);
  return true;
}

/**
 * Rejects a request whose body is missing one of the required fields.
 *
 * Without this, a missing field travels all the way into PostgreSQL and comes
 * back as a `NOT NULL` violation, which the error handler used to report as a
 * generic `500 INTERNAL_ERROR` — the client could not tell a validation
 * problem from a server fault. Expressing the requirement here turns it into a
 * `422 VALIDATION_ERROR` that names the offending fields.
 *
 * Usage: `router.post('/', requireFields('name'), ctrl.create);`
 */
export function requireFields(...fields: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const body = (req.body || {}) as Record<string, unknown>;
    const missing = fields.filter((field) => !isPresent(body[field]));

    if (missing.length > 0) {
      return next(new ValidationError(missing.map((field) => ({ field, message: `"${field}" is required` }))));
    }
    return next();
  };
}

/**
 * Resolves the display name of a line item.
 *
 * `invoice_items.name`, `sales_order_items.name` and `quotation_items.name`
 * are all `NOT NULL`, and clients send that label under different keys
 * (`name`, `description` or `title`). Accepting all three keeps the API
 * forgiving about naming without weakening the constraint.
 */
export function lineItemName(item: any): string {
  const raw = item?.name ?? item?.description ?? item?.title;
  if (typeof raw !== 'string' || raw.trim() === '') {
    throw new ValidationError([{ field: 'items[].name', message: 'Each line item requires a name' }]);
  }
  return raw.trim();
}

/**
 * Ensures the request carries a non-empty array of usable line items.
 *
 * Usage: `router.post('/', requireLineItems('items'), ctrl.create);`
 */
export function requireLineItems(field = 'items') {
  return (req: Request, _res: Response, next: NextFunction) => {
    const body = (req.body || {}) as Record<string, any>;
    const items = body[field];

    if (!Array.isArray(items) || items.length === 0) {
      return next(new ValidationError([{ field, message: `"${field}" must be a non-empty array` }]));
    }
    if (!items.every((item) => item && typeof item === 'object')) {
      return next(new ValidationError([{ field, message: `"${field}" must contain objects` }]));
    }
    try {
      items.forEach((item) => lineItemName(item));
    } catch (err) {
      return next(err);
    }
    return next();
  };
}

/**
 * Normalises a value that is about to be written to a `jsonb` column.
 *
 * Several tables store their address (and similar structured fields) as
 * `jsonb`. Passing a plain string to such a column makes PostgreSQL raise
 * `invalid input syntax for type json`, which surfaced as a 500. Accepting a
 * string and folding it into `{ line1: … }` keeps the natural "one line
 * address" input working while still allowing the structured form.
 */
export function toJsonb(value: unknown): Record<string, any> {
  if (value === undefined || value === null || value === '') return {};
  if (typeof value === 'string') return { line1: value };
  if (typeof value === 'object' && !Array.isArray(value)) return value as Record<string, any>;
  return { value };
}
