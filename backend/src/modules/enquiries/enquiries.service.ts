import { prisma } from '../../config/db';
import { AppError } from '../../middleware/errorHandler';
import { nextDocumentNumber } from '../../utils/numbering';
import type { CreateEnquiryInput } from './enquiries.schema';

export async function list() {
  return prisma.enquiry.findMany({
    include: {
      customer: { select: { id: true, companyName: true, contactPerson: true, city: true } },
      items: {
        include: { product: { select: { id: true, code: true, name: true, unit: true } } },
      },
      quotations: { select: { id: true, quotationNo: true, status: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getById(id: string) {
  const enquiry = await prisma.enquiry.findUnique({
    where: { id },
    include: {
      customer: true,
      items: { include: { product: true } },
      quotations: { include: { items: true } },
    },
  });
  if (!enquiry) throw new AppError(404, 'Enquiry not found');
  return enquiry;
}

export async function create(data: CreateEnquiryInput, userId: string) {
  // Validate products exist and quantities are not negative (enforced by schema too).
  const productIds = await prisma.product.findMany({
    where: { id: { in: data.items.map((i) => i.productId) } },
    select: { id: true },
  });
  if (productIds.length !== data.items.length) {
    throw new AppError(400, 'One or more products do not exist');
  }

  return prisma.$transaction(async (tx) => {
    const enquiryNo = await nextDocumentNumber(tx, 'ENQ');
    return tx.enquiry.create({
      data: {
        enquiryNo,
        customerId: data.customerId,
        requiredDate: data.requiredDate,
        notes: data.notes,
        createdBy: userId,
        items: { create: data.items.map((i) => ({ productId: i.productId, quantity: i.quantity })) },
      },
      include: {
        customer: true,
        items: { include: { product: true } },
      },
    });
  });
}

export async function setStatus(id: string, status: 'NEW' | 'QUOTED' | 'WON' | 'LOST') {
  const existing = await prisma.enquiry.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, 'Enquiry not found');
  return prisma.enquiry.update({ where: { id }, data: { status } });
}