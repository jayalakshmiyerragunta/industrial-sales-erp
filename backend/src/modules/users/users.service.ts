import { prisma } from '../../config/db';
import { AppError } from '../../middleware/errorHandler';

export async function listUsers() {
  return prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
}