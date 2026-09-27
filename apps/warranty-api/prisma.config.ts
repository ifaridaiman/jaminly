import { loadEnvFile } from 'node:process';
import { defineConfig } from 'prisma/config';

try {
  loadEnvFile(); // .env is optional; real env vars win
} catch {}

export default defineConfig({
  schema: 'prisma/schema', // multi-file: one .prisma per owning module
  migrations: { path: 'prisma/migrations' },
  datasource: { url: process.env.DATABASE_URL },
});
