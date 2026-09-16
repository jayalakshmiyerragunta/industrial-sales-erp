import { Prisma } from '@prisma/client';
import { prisma } from '../../config/db';
import { AppError } from '../../middleware/errorHandler';
import { nextDocumentNumber } from '../../utils/numbering';
import type { CreateQuotationInput, UpdateStatusInput } from './quotations.schema';

const round2 = (v: Prisma.Decimal) => v.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

/**
 * All monetary figures on a quotation are computed here on the backend.
 * The API never trusts a client-supplied line/grand total.
 */
function computeLineAmount(quantity: number, unitPrice: Prisma.Decimal, discountPct: number, gstPct: number): Prisma.Decimal {
  const base = new Prisma.Decimal(quantity).mul(unitPrice);
  const one = new Prisma.Decimal(1);
  const afterDiscount = base.mul(one.minus(new Prisma.Decimal(discountPct).div(100)));
  const afterGst = afterDiscount.mul(one.plus(new Prisma.Decimal(gstPct).div(100)));
  return round2(afterGst);
}

export async function list() {
  return prisma.quotation.findMany({
    include: {
      enquiry: { select: { id: true, enquiryNo: true } },
      customer: { select: { id: true, companyName: true, city: true } },
      items: {
        include: { product: { select: { id: true, code: true, name: true, unit: true } } },
      },
      salesOrder: { select: { id: true, orderNo: true, status: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getById(id: string) {
  const quotation = await prisma.quotation.findUnique({
    where: { id },
    include: {
      enquiry: { include: { customer: true } },
      customer: true,
      creator: { select: { name: true } },
      items: { include: { product: true } },
      salesOrder: true,
    },
  });
  if (!quotation) throw new AppError(404, 'Quotation not found');
  return quotation;
}

export async function create(data: CreateQuotationInput, userId: string) {
  // Products must exist.
  const productIds = await prisma.product.findMany({
    where: { id: { in: data.items.map((i) => i.productId) } },
    select: { id: true },
  });
  if (productIds.length !== data.items.length) {
    throw new AppError(400, 'One or more products do not exist');
  }

  const enquiry = await prisma.enquiry.findUnique({ where: { id: data.enquiryId } });
  if (!enquiry) throw new AppError(404, 'Enquiry not found');

  return prisma.$transaction(async (tx) => {
    const quotationNo = await nextDocumentNumber(tx, 'QTN');

    const computedItems = data.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: new Prisma.Decimal(item.unitPrice),
      discountPct: new Prisma.Decimal(item.discountPct),
      gstPct: new Prisma.Decimal(item.gstPct),
      lineAmount: computeLineAmount(item.quantity, new Prisma.Decimal(item.unitPrice), item.discountPct, item.gstPct),
    }));

    const totalAmount = computedItems.reduce(
      (sum, i) => sum.plus(i.lineAmount),
      new Prisma.Decimal(0)
    );

    const quotation = await tx.quotation.create({
      data: {
        quotationNo,
        enquiryId: data.enquiryId,
        customerId: enquiry.customerId,
        validUntil: data.validUntil,
        status: 'DRAFT',
        totalAmount,
        createdBy: userId,
        items: { create: computedItems },
      },
      include: { enquiry: true, customer: true, items: { include: { product: true } } },
    });

    // Creating a quotation marks the enquiry as quoted.
    await tx.enquiry.update({ where: { id: data.enquiryId }, data: { status: 'QUOTED' } });

    return quotation;
  });
}

// Allowed transitions: DRAFT→SENT, SENT→ACCEPTED, SENT→REJECTED. Terminal states never change.
const transitions: Record<string, string[]> = {
  DRAFT: ['SENT'],
  SENT: ['ACCEPTED', 'REJECTED'],
  ACCEPTED: [],
  REJECTED: [],
};

export async function updateStatus(id: string, data: UpdateStatusInput, userId: string) {
  return prisma.$transaction(async (tx) => {
    const quotation = await tx.quotation.findUnique({ where: { id }, include: { enquiry: true } });
    if (!quotation) throw new AppError(404, 'Quotation not found');

    const allowed = transitions[quotation.status] ?? [];
    if (!allowed.includes(data.status)) {
      throw new AppError(400, `Cannot transition quotation from ${quotation.status} to ${data.status}`);
    }

    const updated = await tx.quotation.update({ where: { id }, data: { status: data.status } });

    // Reflect accept/reject on the source enquiry.
    if (data.status === 'ACCEPTED') {
      await tx.enquiry.update({ where: { id: quotation.enquiryId }, data: { status: 'WON' } });
    }
    if (data.status === 'REJECTED') {
      await tx.enquiry.update({ where: { id: quotation.enquiryId }, data: { status: 'LOST' } });
    }

    return updated;
  });
}