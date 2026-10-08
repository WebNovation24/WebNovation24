/**
 * Public technical reproduction for the Kadryn portfolio case study.
 *
 * This is NOT production source code. It is a small, independently written
 * model of the invariant described publicly in the case study:
 * exact retries should resolve as replays without distorting quota behavior,
 * while truly concurrent first submissions remain serialized around quota state.
 */

export type UsageCommand = Readonly<{
  tenantId: string;
  requestId: string;
  month: string;
  units: number;
}>;

export type UsageEvent = Readonly<{
  eventId: string;
  tenantId: string;
  requestId: string;
  month: string;
  units: number;
}>;

export type QuotaSnapshot = Readonly<{
  used: number;
  limit: number;
}>;

export type IngestResult =
  | Readonly<{ kind: "accepted"; eventId: string; usedAfter: number }>
  | Readonly<{ kind: "replay"; eventId: string; usedAfter: number }>
  | Readonly<{ kind: "quota-exceeded"; used: number; limit: number }>;

export interface UsageRepository {
  findExactReplay(command: UsageCommand): Promise<UsageEvent | null>;
  readQuota(tenantId: string, month: string): Promise<QuotaSnapshot>;
  insertUsage(command: UsageCommand): Promise<UsageEvent>;
  incrementQuota(
    tenantId: string,
    month: string,
    units: number,
  ): Promise<QuotaSnapshot>;
  withMonthlyQuotaLock<T>(
    tenantId: string,
    month: string,
    operation: () => Promise<T>,
  ): Promise<T>;
}

/**
 * Ordering matters:
 *
 * 1. Resolve a known exact retry before taking the monthly quota lock.
 * 2. If it is not already a replay, enter the quota critical section.
 * 3. Re-check replay state inside the lock to close the concurrent-first-submit race.
 * 4. Apply quota rules only to genuinely new usage.
 *
 * The second replay check is what keeps Promise.all([same, same]) correct:
 * one request inserts, the other observes that insertion after it acquires the lock.
 */
export async function ingestUsage(
  repo: UsageRepository,
  command: UsageCommand,
): Promise<IngestResult> {
  if (command.units <= 0) {
    throw new RangeError("units must be positive");
  }

  const knownReplay = await repo.findExactReplay(command);
  if (knownReplay) {
    const quota = await repo.readQuota(command.tenantId, command.month);
    return {
      kind: "replay",
      eventId: knownReplay.eventId,
      usedAfter: quota.used,
    };
  }

  return repo.withMonthlyQuotaLock(
    command.tenantId,
    command.month,
    async () => {
      const concurrentReplay = await repo.findExactReplay(command);
      if (concurrentReplay) {
        const quota = await repo.readQuota(command.tenantId, command.month);
        return {
          kind: "replay",
          eventId: concurrentReplay.eventId,
          usedAfter: quota.used,
        };
      }

      const quota = await repo.readQuota(command.tenantId, command.month);
      if (quota.used + command.units > quota.limit) {
        return {
          kind: "quota-exceeded",
          used: quota.used,
          limit: quota.limit,
        };
      }

      const event = await repo.insertUsage(command);
      const updatedQuota = await repo.incrementQuota(
        command.tenantId,
        command.month,
        command.units,
      );

      return {
        kind: "accepted",
        eventId: event.eventId,
        usedAfter: updatedQuota.used,
      };
    },
  );
}
