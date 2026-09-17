import { z } from 'zod';

const enquiryItemSchema = z
  .object({
    productId: z.string().min(1, 'Product is required'),
    quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1'),
  })
  .strict();

export const createEnquirySchema = z
  .object({
    customerId: z.string().min(1, 'Customer is required'),
    requiredDate: z.coerce.date().optional(),
    notes: z.string().optional(),
    items: z.array(enquiryItemSchema).min(1, 'At least one product required'),
  })
  .strict();

export type CreateEnquiryInput = z.infer<typeof createEnquirySchema>;

export const setEnquiryStatusSchema = z
  .object({
    status: z.enum(['NEW', 'QUOTED', 'WON', 'LOST'], {
      errorMap: () => ({ message: 'Status must be NEW, QUOTED, WON or LOST' }),
    }),
  })
  .strict();

export type SetEnquiryStatusInput = z.infer<typeof setEnquiryStatusSchema>;