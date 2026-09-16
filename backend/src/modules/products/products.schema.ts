import { z } from 'zod';

export const createProductSchema = z.object({
  code: z.string().min(1, 'Product code is required'),
  name: z.string().min(1, 'Product name is required'),
  category: z.string().min(1, 'Category is required'),
  unit: z.string().min(1, 'Unit is required'),
  basePrice: z.coerce.number().positive('Base price must be positive'),
  physicalQty: z.coerce.number().int().min(0, 'Physical quantity cannot be negative').default(0),
});

export const updateProductSchema = createProductSchema.partial();

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;