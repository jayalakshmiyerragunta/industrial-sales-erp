import { Prisma } from '@prisma/client';
import { prisma } from '../../config/db';
import { AppError } from '../../middleware/errorHandler';
import { nextDocumentNumber } from '../../utils/numbering';
import type { DispatchInput } from './dispatches.schema';

export async function list() {
  return prisma.dispatch.findMany({
    include: {
      salesOrder: { include: { customer: true, quotation: true } },
      items: { include: { product: true } },
      creator: { select: { name: true } },
    },
    orderBy: { dispatchDate: 'desc' },
  });
}

export async function getById(id: string) {
  const dispatch = await prisma.dispatch.findUnique({
    where: { id },
    include: {
      salesOrder: { include: { customer: true, quotation: true, items: true } },
      items: { include: { product: true } },
      creator: { select: { name: true } },
    },
  });
  if (!dispatch) throw new AppError(404, 'Dispatch not found');
  return dispatch;
}

/**
 * Dispatch a CONFIRMED sales order.
 *  - Validates the order is CONFIRMED (not PENDING/CANCELLED/DISPATCHED).
 *  - Prevents any second dispatch for the same order (guarded by row lock + status check).
 *  - A driver is allocated to the order. The UNIQUE constraint on
 *    dispatches.driver_id guarantees the same driver can never serve a
 *    different order (second insert throws P2002 → 409).
 *  - Locks every relevant inventory row FOR UPDATE, then decrements BOTH
 *    physical_qty and reserved_qty — guarded so reserved can never go negative.
 *
 * Physical and reserved both decrease on dispatch:
 *   before: physical=100, reserved=60, available=40; dispatch 60
 *   after:  physical=40,  reserved=0,  available=40
 */
export async function dispatchOrder(salesOrderId: string, data: DispatchInput, userId: string) {
  const driver = await prisma.driver.findUnique({ where: { id: data.driverId } });
  if (!driver) throw new AppError(404, 'Driver not found');

  try {
    return await prisma.$transaction(async (tx) => {
      // Lock the sales order row so two concurrent dispatches serialize.
      await tx.$queryRaw`SELECT id FROM sales_orders WHERE id = ${salesOrderId} FOR UPDATE`;

      const order = await tx.salesOrder.findUnique({
        where: { id: salesOrderId },
        include: { items: true },
      });
      if (!order) throw new AppError(404, 'Sales order not found');

      if (order.status !== 'CONFIRMED') {
        throw new AppError(409, `Only CONFIRMED orders can be dispatched (current: ${order.status})`);
      }

      // A dispatch is a one-time event per order — refuse to create a second one.
      const existingDispatch = await tx.dispatch.findFirst({ where: { salesOrderId } });
      if (existingDispatch) {
        throw new AppError(409, 'This order has already been dispatched');
      }

      // Fail fast if the driver already served another order (DB unique also backstops races).
      const driverAlreadyUsed = await tx.dispatch.findFirst({ where: { driverId: driver.id } });
      if (driverAlreadyUsed) {
        throw new AppError(409, `Driver ${driver.name} is already allocated to dispatch ${driverAlreadyUsed.dispatchNo}`);
      }

      for (const item of order.items) {
        const [inv] = await tx.$queryRaw<{ id: string; reserved_qty: number }[]>`
          SELECT id, reserved_qty FROM inventory WHERE product_id = ${item.productId} FOR UPDATE
        `;
        if (!inv) throw new AppError(400, `No inventory record for product ${item.productId}`);
        if (inv.reserved_qty < item.quantity) {
          throw new AppError(409, `Cannot dispatch ${item.quantity} of a product with only ${inv.reserved_qty} reserved`);
        }
        await tx.$executeRaw`
          UPDATE inventory
          SET physical_qty = physical_qty - ${item.quantity},
              reserved_qty = reserved_qty - ${item.quantity},
              updated_at = now()
          WHERE id = ${inv.id}
        `;
      }

      await tx.salesOrder.update({ where: { id: salesOrderId }, data: { status: 'DISPATCHED' } });

      const dispatchNo = await nextDocumentNumber(tx, 'DSP');
      return tx.dispatch.create({
        data: {
          dispatchNo,
          salesOrderId,
          driverId: driver.id,
          vehicleNumber: driver.vehicleNumber,
          driverName: driver.name,
          createdBy: userId,
          items: {
            create: order.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
          },
        },
        include: { salesOrder: { include: { customer: true } }, items: { include: { product: true } } },
      });
    });
  } catch (e) {
    // Race: two dispatching of different orders picked the same driver.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      throw new AppError(409, `Driver ${driver.name} is already allocated to another order`);
    }
    throw e;
  }
}