import { Request, Response } from 'express';
import { db } from '../lib/database';
import { AppError, NotFoundError } from '../lib/errors';
import { AuditService } from '../services/index';
import { toJsonb } from '../lib/validation';

export class BookingController {
  // ── Resources ──────────────────────────────────────────────────────────────
  listResources = async (req: Request, res: Response) => {
    const resources = await db('bookable_resources').where({ tenant_id: req.tenant!.id, is_active: true }).orderBy('name');
    res.json({ success: true, data: { resources } });
  };

  createResource = async (req: Request, res: Response) => {
    const { name, type, capacity, branchId, metadata } = req.body;
    const [resource] = await db('bookable_resources').insert({
      tenant_id: req.tenant!.id, name, type: type || 'other', capacity, branch_id: branchId || null, metadata: toJsonb(metadata),
    }).returning('*');
    res.status(201).json({ success: true, data: { resource } });
  };

  // ── Bookings ───────────────────────────────────────────────────────────────
  listBookings = async (req: Request, res: Response) => {
    const tenantId = req.tenant!.id;
    const { startDate, endDate, resourceId, status } = req.query as any;

    let query = db('bookings')
      .leftJoin('bookable_resources', 'bookings.resource_id', 'bookable_resources.id')
      .leftJoin('contacts', 'bookings.contact_id', 'contacts.id')
      .where({ 'bookings.tenant_id': tenantId });
    if (startDate) query = query.where('bookings.start_at', '>=', new Date(startDate));
    if (endDate) query = query.where('bookings.start_at', '<=', new Date(endDate));
    if (resourceId) query = query.where('bookings.resource_id', resourceId);
    if (status) query = query.where('bookings.status', status);

    const bookings = await query.select(
      'bookings.*', 'bookable_resources.name as resource_name',
      db.raw("CONCAT(contacts.first_name, ' ', contacts.last_name) as contact_name")
    ).orderBy('bookings.start_at');

    res.json({ success: true, data: { bookings } });
  };

  createBooking = async (req: Request, res: Response) => {
    const tenantId = req.tenant!.id;
    const { resourceId, contactId, title, startAt, endAt, partySize, price, notes, assignedTo } = req.body;

    // Conflict check: overlapping bookings on the same resource
    if (resourceId) {
      const conflict = await db('bookings')
        .where({ tenant_id: tenantId, resource_id: resourceId })
        .whereNot('status', 'cancelled')
        .where((q) => {
          q.whereBetween('start_at', [startAt, endAt]).orWhereBetween('end_at', [startAt, endAt])
            .orWhere((q2) => q2.where('start_at', '<=', startAt).andWhere('end_at', '>=', endAt));
        })
        .first();
      if (conflict) throw new AppError('This resource is already booked for the selected time slot', 409, 'BOOKING_CONFLICT');
    }

    const [booking] = await db('bookings').insert({
      tenant_id: tenantId, resource_id: resourceId || null, contact_id: contactId || null, assigned_to: assignedTo || null,
      created_by: req.user!.id, title, start_at: startAt, end_at: endAt, party_size: partySize || null, price: price || null, notes,
    }).returning('*');

    AuditService.log({ tenantId, userId: req.user!.id, action: 'booking.create', resourceType: 'booking', resourceId: booking.id, ip: req.ip });
    res.status(201).json({ success: true, data: { booking } });
  };

  updateBookingStatus = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;
    const booking = await db('bookings').where({ id, tenant_id: req.tenant!.id }).first();
    if (!booking) throw new NotFoundError('Booking');
    await db('bookings').where({ id }).update({ status, updated_at: new Date() });
    res.json({ success: true, message: 'Booking updated' });
  };

  cancelBooking = async (req: Request, res: Response) => {
    const { id } = req.params;
    const booking = await db('bookings').where({ id, tenant_id: req.tenant!.id }).first();
    if (!booking) throw new NotFoundError('Booking');
    await db('bookings').where({ id }).update({ status: 'cancelled', updated_at: new Date() });
    res.json({ success: true, message: 'Booking cancelled' });
  };

  // ── Availability check ────────────────────────────────────────────────────
  checkAvailability = async (req: Request, res: Response) => {
    const { resourceId, date } = req.query as any;

    // `date` is optional — default to today so the endpoint is usable without
    // parameters. An unparseable value is a client error (400), not a 500.
    let dayStart: Date;
    if (date) {
      dayStart = new Date(`${String(date).slice(0, 10)}T00:00:00`);
      if (Number.isNaN(dayStart.getTime())) {
        throw new AppError('Invalid date — expected YYYY-MM-DD', 400, 'INVALID_DATE');
      }
    } else {
      dayStart = new Date();
      dayStart.setHours(0, 0, 0, 0);
    }
    const dayEnd = new Date(dayStart.getTime() + 24 * 3600000 - 1);

    let query = db('bookings')
      .where({ tenant_id: req.tenant!.id })
      .whereNot('status', 'cancelled')
      .whereBetween('start_at', [dayStart, dayEnd]);
    if (resourceId) query = query.where('resource_id', resourceId);

    const bookings = await query.select('start_at', 'end_at', 'status', 'resource_id');

    res.json({ success: true, data: { bookedSlots: bookings } });
  };

  // ── Stats ──────────────────────────────────────────────────────────────────
  stats = async (req: Request, res: Response) => {
    const tenantId = req.tenant!.id;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

    const [todayCount, pendingCount, totalResources] = await Promise.all([
      db('bookings').where({ tenant_id: tenantId }).whereBetween('start_at', [today, tomorrow]).count('id as count').first(),
      db('bookings').where({ tenant_id: tenantId, status: 'pending' }).count('id as count').first(),
      db('bookable_resources').where({ tenant_id: tenantId, is_active: true }).count('id as count').first(),
    ]);

    res.json({
      success: true,
      data: {
        todayBookings: parseInt((todayCount as any)?.count || '0'),
        pendingBookings: parseInt((pendingCount as any)?.count || '0'),
        totalResources: parseInt((totalResources as any)?.count || '0'),
      },
    });
  };
}
