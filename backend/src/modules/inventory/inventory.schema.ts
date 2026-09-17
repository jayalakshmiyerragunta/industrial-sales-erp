import { z } from 'zod';

export const adjustInventorySchema = z
  .object({
    physicalQty: z.coerce.number().int().min(0, 'Physical quantity cannot be negative'),
  })
  .strict();

export type AdjustInventoryInput = z.infer<typeof adjustInventorySchema>;
