import assert from "node:assert/strict";
import test from "node:test";

import {
  ingestUsage,
  type QuotaSnapshot,
  type UsageCommand,
  type UsageEvent,
  type UsageRepository,
} from "./replay-quota.js";

class Mutex {
  private tail: Promise<void> = Promise.resolve();

  async run<T>(operation: () => Promise<T>): Promise<T> {
    const previous = this.tail;
    let release!: () => void;
    this.tail = new Promise<void>((resolve) => {
      release = resolve;
    });

    await previous;
    try {
      return await operation();
    } finally {
      release();
    }
  }
}

class InMemoryUsageRepository implements UsageRepository {
  readonly events: UsageEvent[] = [];
  readonly quotaLocks = new Map<string, Mutex>();
  quotaLockCount = 0;

  constructor(
    private readonly quotas = new Map<string, QuotaSnapshot>(),
  ) {}

  private quotaKey(tenantId: string, month: string): string {
    return `${tenantId}:${month}`;
  }

  async findExactReplay(command: UsageCommand): Promise<UsageEvent | null> {
    return (
      this.events.find(
        (event) =>
          event.tenantId === command.tenantId &&
          event.requestId === command.requestId &&
          event.month === command.month &&
          event.units === command.units,
      ) ?? null
    );
  }

  async readQuota(
    tenantId: string,
    month: string,
  ): Promise<QuotaSnapshot> {
    return (
      this.quotas.get(this.quotaKey(tenantId, month)) ?? {
        used: 0,
        limit: 100,
      }
    );
  }

  async insertUsage(command: UsageCommand): Promise<UsageEvent> {
    const event: UsageEvent = {
      eventId: `evt-${this.events.length + 1}`,
      ...command,
    };
    this.events.push(event);
    return event;
  }

  async incrementQuota(
    tenantId: string,
    month: string,
    units: number,
  ): Promise<QuotaSnapshot> {
    const key = this.quotaKey(tenantId, month);
    const current = await this.readQuota(tenantId, month);
    const next = { ...current, used: current.used + units };
    this.quotas.set(key, next);
    return next;
  }

  async withMonthlyQuotaLock<T>(
    tenantId: string,
    month: string,
    operation: () => Promise<T>,
  ): Promise<T> {
    this.quotaLockCount += 1;
    const key = this.quotaKey(tenantId, month);
    let mutex = this.quotaLocks.get(key);
    if (!mutex) {
      mutex = new Mutex();
      this.quotaLocks.set(key, mutex);
    }
    return mutex.run(operation);
  }
}

const command: UsageCommand = {
  tenantId: "tenant-a",
  requestId: "request-42",
  month: "2026-10",
  units: 40,
};

test("a known exact retry resolves before quota-lock contention", async () => {
  const repo = new InMemoryUsageRepository();
  repo.events.push({
    eventId: "evt-existing",
    ...command,
  });
  await repo.incrementQuota(command.tenantId, command.month, command.units);

  const result = await ingestUsage(repo, command);

  assert.deepEqual(result, {
    kind: "replay",
    eventId: "evt-existing",
    usedAfter: 40,
  });
  assert.equal(repo.quotaLockCount, 0);
  assert.equal(repo.events.length, 1);
});

test("two concurrent identical first submissions insert once", async () => {
  const repo = new InMemoryUsageRepository();

  const results = await Promise.all([
    ingestUsage(repo, command),
    ingestUsage(repo, command),
  ]);

  assert.equal(results.filter((result) => result.kind === "accepted").length, 1);
  assert.equal(results.filter((result) => result.kind === "replay").length, 1);
  assert.equal(repo.events.length, 1);
  assert.equal(
    (await repo.readQuota(command.tenantId, command.month)).used,
    command.units,
  );
});

test("quota rules still apply to genuinely new usage", async () => {
  const repo = new InMemoryUsageRepository(
    new Map([
      ["tenant-a:2026-10", { used: 90, limit: 100 }],
    ]),
  );

  const result = await ingestUsage(repo, {
    ...command,
    requestId: "request-new",
    units: 20,
  });

  assert.deepEqual(result, {
    kind: "quota-exceeded",
    used: 90,
    limit: 100,
  });
  assert.equal(repo.events.length, 0);
});
