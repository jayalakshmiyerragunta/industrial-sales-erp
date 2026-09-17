import { z } from 'zod';

export const dispatchSchema = z
  .object({
    driverId: z.string().min(1, 'Driver is required'),
  })
  .strict();

export type DispatchInput = z.infer<typeof dispatchSchema>;