import { prisma } from '../../config/db';
import { AppError } from '../../middleware/errorHandler';

export async function availability() {
  const rows = await prisma.inventory.findMany({
    include: {
      product: { select: { code: true, name: true, unit: true, category: true } },
    },
    orderBy: { product: { code: 'asc' } },
  });

  return rows.map((row) => ({
    productId: row.productId,
    productCode: row.product.code,
    productName: row.product.name,
    unit: row.product.unit,
    category: row.product.category,
    physicalQty: row.physicalQty,
    reservedQty: row.reservedQty,
    availableQty: row.physicalQty - row.reservedQty,
  }));
}

/**
 * Admin-only stock adjustment (manage inventory).
 *
 * Locks the inventory row FOR UPDATE and refuses to set physical_qty below the
 * quantity currently reserved, so the invariant `reserved_qty <= physical_qty`
 * (i.e. available_qty >= 0) can never be violated.
 */
export async function adjust(productId: string, physicalQty: number) {
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<{ id: string; reserved_qty: number }[]>`
      SELECT id, reserved_qty FROM inventory WHERE product_id = ${productId} FOR UPDATE
    `;
    const inv = rows[0];
    if (!inv) throw new AppError(404, 'No inventory record exists for this product');

    const reserved = Number(inv.reserved_qty);
    if (physicalQty < reserved) {
      throw new AppError(
        409,
        `Physical stock cannot be set below the ${reserved} units already reserved`
      );
    }

    await tx.$executeRaw`
      UPDATE inventory SET physical_qty = ${physicalQty}, updated_at = now() WHERE id = ${inv.id}
    `;

    return {
      productId,
      physicalQty,
      reservedQty: reserved,
      availableQty: physicalQty - reserved,
    };
  });
}
