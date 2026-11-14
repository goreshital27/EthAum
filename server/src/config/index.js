import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';

// Load environment variables from .env
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const envSchema = z
  .object({
    PORT: z.string().default('5000').transform((val) => parseInt(val, 10)),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    CLIENT_URL: z.string().default('http://localhost:5173'),
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
    DIRECT_URL: z.string().optional().default(''),
    JWT_SECRET: z.string().min(1, 'JWT_SECRET must be set'),
    AI_PROVIDER: z.string().optional().default('openai'),
    AI_API_KEY: z.string().optional().default(''),
    STORAGE_PROVIDER: z.string().optional().default('local'),
    STORAGE_BUCKET: z.string().optional().default(''),
    STORAGE_REGION: z.string().optional().default(''),
    STORAGE_ACCESS_KEY_ID: z.string().optional().default(''),
    STORAGE_SECRET_ACCESS_KEY: z.string().optional().default(''),
    STORAGE_LOCAL_DIR: z.string().default('./uploads'),
  })
  .refine(
    (data) => {
      if (data.NODE_ENV === 'production') {
        return data.JWT_SECRET.length >= 32;
      }
      return true;
    },
    {
      message: 'JWT_SECRET must be at least 32 characters long in production mode',
      path: ['JWT_SECRET'],
    }
  );

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables configuration:', parsed.error.format());
  process.exit(1);
}

export const config = parsed.data;
export default config;
