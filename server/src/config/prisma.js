import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis;

let prismaClient;

try {
  prismaClient =
    globalForPrisma.prisma ||
    new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });

  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prismaClient;
  }
} catch (error) {
  // If PrismaClient is not yet generated (e.g., initial setup where schema.prisma has no models yet),
  // provide a placeholder that throws on query so server starts and health check reports status cleanly.
  prismaClient = {
    $queryRaw: async () => {
      throw new Error(
        'Prisma client is not yet generated. Add database models to server/prisma/schema.prisma and run prisma generate.'
      );
    },
  };
}

export const prisma = prismaClient;
export default prisma;
