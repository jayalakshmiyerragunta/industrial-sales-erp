import { z } from 'zod';

export const createCustomerSchema = z.object({
  companyName: z.string().min(1, 'Company name is required'),
  contactPerson: z.string().min(1, 'Contact person is required'),
  mobile: z.string().min(10, 'Mobile must be at least 10 digits'),
  email: z.string().email().optional(),
  city: z.string().min(1, 'City is required'),
});

export const updateCustomerSchema = createCustomerSchema.partial();

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;