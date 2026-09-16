import { prisma } from '../../config/db';
import { AppError } from '../../middleware/errorHandler';
import type { CreateCustomerInput, UpdateCustomerInput } from './customers.schema';

export async function list(search?: string) {
  const where = search
    ? { OR: [{ companyName: { contains: search, mode: 'insensitive' as const } }, { contactPerson: { contains: search, mode: 'insensitive' as const } }] }
    : {};
  return prisma.customer.findMany({ where, orderBy: { createdAt: 'desc' } });
}

export async function getById(id: string) {
  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer) throw new AppError(404, 'Customer not found');
  return customer;
}

export async function create(data: CreateCustomerInput) {
  return prisma.customer.create({ data });
}

export async function update(id: string, data: UpdateCustomerInput) {
  const existing = await prisma.customer.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, 'Customer not found');
  return prisma.customer.update({ where: { id }, data });
}