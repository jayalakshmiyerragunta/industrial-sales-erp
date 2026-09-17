import { prisma } from '../../config/db';
import { AppError } from '../../middleware/errorHandler';
import type { CreateProductInput, UpdateProductInput } from './products.schema';

const productInclude = {
  inventory: { select: { physicalQty: true, reservedQty: true } },
} as const;

function withAvailability(p: any) {
  const physical = p.inventory?.physicalQty ?? 0;
  const reserved = p.inventory?.reservedQty ?? 0;
  return { ...p, physicalQty: physical, reservedQty: reserved, availableQty: physical - reserved };
}

export async function list(search?: string, category?: string) {
  const where: any = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' as const } },
      { code: { contains: search, mode: 'insensitive' as const } },
    ];
  }
  if (category) where.category = category;

  const products = await prisma.product.findMany({
    where,
    include: productInclude,
    orderBy: { createdAt: 'desc' },
  });
  return products.map(withAvailability);
}

export async function getById(id: string) {
  const product = await prisma.product.findUnique({ where: { id }, include: productInclude });
  if (!product) throw new AppError(404, 'Product not found');
  return withAvailability(product);
}

export async function create(data: CreateProductInput) {
  const { physicalQty, ...productData } = data;
  const product = await prisma.product.create({
    data: {
      ...productData,
      inventory: { create: { physicalQty } },
    },
    include: productInclude,
  });
  return withAvailability(product);
}

export async function update(id: string, data: UpdateProductInput) {
  const existing = await prisma.product.findUnique({ where: { id }, include: productInclude });
  if (!existing) throw new AppError(404, 'Product not found');

  const { basePrice, ...rest } = data as UpdateProductInput & { physicalQty?: number };
  const { physicalQty, ...productData } = { ...rest, ...(basePrice !== undefined ? { basePrice } : {}) };

  if (physicalQty !== undefined) {
    const reserved = existing.inventory?.reservedQty ?? 0;
    if (physicalQty < reserved) {
      throw new AppError(
        409,
        `Physical stock cannot be set below the ${reserved} units already reserved`
      );
    }
  }

  const product = await prisma.product.update({
    where: { id },
    data: {
      ...productData,
      ...(physicalQty !== undefined
        ? { inventory: { update: { physicalQty } } }
        : {}),
    },
    include: productInclude,
  });
  return withAvailability(product);
}

export async function categories() {
  return prisma.product.findMany({
    select: { category: true },
    distinct: ['category'],
    orderBy: { category: 'asc' },
  });
}