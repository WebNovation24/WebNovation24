# Travel current-authority — public TypeScript reproduction

This folder is an **independently written public reproduction**, not production source code.

It models one invariant from the Travel orchestration case study:

> A valid authentication session identifies a user, but current organization membership determines whether that user still has business capability in the requested organization.

## What the tests demonstrate

- Active membership allows access to the current organization.
- Suspending membership removes business access while the same session remains valid.
- Membership in one organization does not grant access to another organization.

## What this does not expose

- private schema names;
- production authentication/session code;
- tenant/customer data;
- production RLS policies;
- provider credentials or integrations.

## Run

```bash
npm install
npm run typecheck
npm test
```
