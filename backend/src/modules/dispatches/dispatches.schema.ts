import { z } from 'zod';

export const dispatchSchema = z
  .object({
    vehicleNumber: z.string().min(1, 'Vehicle number is required'),
    driverName: z.string().min(1, 'Driver name is required'),
  })
  .strict();

export type DispatchInput = z.infer<typeof dispatchSchema>;