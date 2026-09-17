import { prisma } from '../../config/db';
import { AppError } from '../../middleware/errorHandler';
import { nextDocumentNumber } from '../../utils/numbering';

type InventoryRow = { id: string; physical_qty: bigint; reserved_qty: bigint };

export async function list() {
  return prisma.salesOrder.findMany({
    include: {
      customer: { select: { id: true, companyName: true, city: true } },
      quotation: { select: { id: true, quotationNo: true } },
      items: { include: { product: { select: { id: true, code: true, name: true, unit: true } } } },
      creator: { select: { name: true } },
      dispatches: { select: { id: true, dispatchNo: true, dispatchDate: true, vehicleNumber: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getById(id: string) {
  const order = await prisma.salesOrder.findUnique({
    where: { id },
    include: {
      customer: true,
      quotation: { include: { enquiry: true } },
      items: { include: { product: true } },
      creator: { select: { name: true } },
    },
  });
  if (!order) throw new AppError(404, 'Sales order not found');
  return order;
}

/**
 * Converts an ACCEPTED quotation into a PENDING sales order.
 *  - Rejects any quotation that is not ACCEPTED.
 *  - A quotation can be converted only once (unique quotationId enforced both
 *    here and by the database constraint — the DB is the backstop).
 */
export async function convertFromQuotation(quotationId: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    const quotation = await tx.quotation.findUnique({
      where: { id: quotationId },
      include: { items: true },
    });
    if (!quotation) throw new AppError(404, 'Quotation not found');

    if (quotation.status !== 'ACCEPTED') {
      throw new AppError(409, `Only ACCEPTED quotations can be converted (current: ${quotation.status})`);
    }

    const existing = await tx.salesOrder.findUnique({ where: { quotationId } });
    if (existing) {
      throw new AppError(409, 'This quotation has already been converted into a sales order');
    }

    const orderNo = await nextDocumentNumber(tx, 'SO');

    const order = await tx.salesOrder.create({
      data: {
        orderNo,
        quotationId: quotation.id,
        customerId: quotation.customerId,
        totalAmount: quotation.totalAmount,
        status: 'PENDING',
        createdBy: userId,
        items: {
          create: quotation.items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            lineAmount: i.lineAmount,
          })),
        },
      },
      include: { customer: true, quotation: true, items: { include: { product: true } } },
    });
    return order;
  });
}

/**
 * Confirms a PENDING sales order by RESERVING inventory (concurrency safe).
 *
 * Every inventory row needed by the order is locked with SELECT ... FOR UPDATE
 * inside the transaction. Two simultaneous confirms for overlapping stock
 * serialize on those locks, so the second one re-reads the (now reduced)
 * available quantity and fails with 409 if stock ran out — the available
 * check and the reserved_qty increment are atomic.
 *
 * Rule: available = physical_qty - reserved_qty; reserved_qty must stay <= physical_qty.
 */
export async function confirm(id: string) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM sales_orders WHERE id = ${id} FOR UPDATE`;
    const order = await tx.salesOrder.findUnique({
      where: { id },
      include: { items: { include: { product: true } } },
    });
    if (!order) throw new AppError(404, 'Sales order not found');

    if (order.status !== 'PENDING') {
      throw new AppError(409, `Only PENDING orders can be confirmed (current: ${order.status})`);
    }

    for (const item of order.items) {
      const label = `${item.product.code} (${item.product.name})`;
      const [inv] = await tx.$queryRaw<InventoryRow[]>`
        SELECT id, physical_qty, reserved_qty FROM inventory WHERE product_id = ${item.productId} FOR UPDATE
      `;
      if (!inv) throw new AppError(409, `No inventory record exists for ${label}`);

      const physical = Number(inv.physical_qty);
      const reserved = Number(inv.reserved_qty);
      const available = physical - reserved;

      if (available < item.quantity) {
        throw new AppError(
          409,
          `Insufficient stock for ${label}: required ${item.quantity}, available ${available}`
        );
      }

      await tx.$executeRaw`
        UPDATE inventory SET reserved_qty = reserved_qty + ${item.quantity}, updated_at = now()
        WHERE id = ${inv.id}
      `;
    }

    return tx.salesOrder.update({ where: { id }, data: { status: 'CONFIRMED' } });
  });
}

/**
 * Cancels a PENDING order (nothing reserved) or a CONFIRMED order, in which
 * case its reservations are released back to the pool under row locks.
 */
export async function cancel(id: string) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM sales_orders WHERE id = ${id} FOR UPDATE`;
    const order = await tx.salesOrder.findUnique({ where: { id }, include: { items: true } });
    if (!order) throw new AppError(404, 'Sales order not found');

    if (order.status !== 'PENDING' && order.status !== 'CONFIRMED') {
      throw new AppError(409, `Cannot cancel an order in status ${order.status}`);
    }

    if (order.status === 'CONFIRMED') {
      for (const item of order.items) {
        const [inv] = await tx.$queryRaw<InventoryRow[]>`
          SELECT id, reserved_qty FROM inventory WHERE product_id = ${item.productId} FOR UPDATE
        `;
        if (!inv) throw new AppError(409, `No inventory record exists for product ${item.productId}`);
        const reserved = Number(inv.reserved_qty);
        if (reserved < item.quantity) {
          throw new AppError(
            409,
            `Cannot release ${item.quantity} — only ${reserved} is reserved for product ${item.productId}`
          );
        }
        await tx.$executeRaw`
          UPDATE inventory SET reserved_qty = reserved_qty - ${item.quantity}, updated_at = now()
          WHERE id = ${inv.id}
        `;
      }
    }

    return tx.salesOrder.update({ where: { id }, data: { status: 'CANCELLED' } });
  });
}