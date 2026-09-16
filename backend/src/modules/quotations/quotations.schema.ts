import { z } from 'zod';

const quotationItemSchema = z
  .object({
    productId: z.string().min(1, 'Product is required'),
    quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1'),
    unitPrice: z.coerce.number().positive('Unit price must be positive'),
    discountPct: z.coerce.number().min(0).max(100).default(0),
    gstPct: z.coerce.number().min(0).default(18),
  })
  .strict();

export const createQuotationSchema = z
  .object({
    enquiryId: z.string().min(1, 'Enquiry is required'),
    validUntil: z.coerce.date().optional(),
    items: z.array(quotationItemSchema).min(1, 'At least one product required'),
  })
  .strict();

export const updateStatusSchema = z
  .object({
    status: z.enum(['SENT', 'ACCEPTED', 'REJECTED']),
  })
  .strict();

export type CreateQuotationInput = z.infer<typeof createQuotationSchema>;
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;