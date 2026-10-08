# Kadryn replay / quota ordering — public technical reproduction

This folder is a **public, independently written reproduction** of one invariant described in the Kadryn portfolio case study.

It is **not production source code** and is not presented as a copy of the private Kadryn repository.

## Question being demonstrated

How can an ingestion path treat an exact retry as a replay without allowing concurrent first submissions to bypass monthly quota correctness?

The reproduction makes the ordering inspectable:

1. Check for a known exact replay before taking the monthly quota lock.
2. Enter the quota critical section only for a request that still appears new.
3. Re-check exact replay state inside the lock to close the concurrent-first-submit race.
4. Apply quota checks and insertion only to genuinely new usage.

## What the tests demonstrate

- A known retry returns before quota-lock contention.
- Two concurrent identical first submissions result in one accepted event and one replay.
- Quota rejection still applies to genuinely new usage.

## What this does **not** prove

This small model does not expose or reproduce:

- private schema names;
- production database code;
- tenant-specific data;
- the complete billing/retention pipeline;
- production scale or customer outcomes.

Its purpose is narrower: make the concurrency invariant described in the case study reviewable without exposing confidential implementation details.

## Run it

```bash
npm install
npm run typecheck
npm test
```

The implementation is intentionally small enough to review during a hiring screen.
