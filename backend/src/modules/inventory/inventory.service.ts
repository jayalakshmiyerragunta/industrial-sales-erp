import { prisma } from '../../config/db';

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