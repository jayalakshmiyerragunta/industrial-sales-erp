import { z } from 'zod';

// Treat an empty string (blank form field) as "not provided".
const optionalEmail = z.preprocess(
  (v) => (v === '' || v === null ? undefined : v),
  z.string().email('Email must be a valid email').optional()
);

export const createCustomerSchema = z
  .object({
    companyName: z.string().min(1, 'Company name is required'),
    contactPerson: z.string().min(1, 'Contact person is required'),
    mobile: z.string().min(10, 'Mobile must be at least 10 digits'),
    email: optionalEmail,
    city: z.string().min(1, 'City is required'),
  })
  .strict();

export const updateCustomerSchema = createCustomerSchema.partial().strict();

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
