import { config } from 'dotenv';

// Point the app at the TEST database so tests never touch dev data.
config({ path: '.env' });
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
process.env.NODE_ENV = 'test';