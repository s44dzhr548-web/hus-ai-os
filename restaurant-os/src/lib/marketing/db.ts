import prisma from "@/lib/prisma";

/** Safe Prisma access — falls back when client not generated (OneDrive EPERM) */
export function marketingDb() {
  return prisma as typeof prisma & {
    marketingBudget?: {
      count: (args: unknown) => Promise<number>;
      findFirst: (args: unknown) => Promise<Record<string, unknown> | null>;
      findMany: (args: unknown) => Promise<Record<string, unknown>[]>;
      create: (args: unknown) => Promise<Record<string, unknown>>;
    };
    mcPlatformConfig?: {
      count: (args: unknown) => Promise<number>;
      findMany: (args: unknown) => Promise<Record<string, unknown>[]>;
      createMany: (args: unknown) => Promise<unknown>;
    };
    marketingDecision?: {
      count: (args: unknown) => Promise<number>;
      findMany: (args: unknown) => Promise<Record<string, unknown>[]>;
      create: (args: unknown) => Promise<unknown>;
    };
    marketingGoal?: {
      count: (args: unknown) => Promise<number>;
      findMany: (args: unknown) => Promise<Record<string, unknown>[]>;
      upsert: (args: unknown) => Promise<unknown>;
      create: (args: unknown) => Promise<unknown>;
    };
    marketingSimulation?: {
      create: (args: unknown) => Promise<unknown>;
    };
    marketingCampaign?: {
      findMany: (args: unknown) => Promise<Record<string, unknown>[]>;
    };
    order?: typeof prisma.order;
    customer?: typeof prisma.customer;
    reservation?: typeof prisma.reservation;
  };
}

export async function withMarketingDb<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}
