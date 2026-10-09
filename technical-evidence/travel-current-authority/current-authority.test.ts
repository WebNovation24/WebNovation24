import assert from "node:assert/strict";
import test from "node:test";

import {
  authorizeOrganization,
  type Membership,
  type SessionIdentity,
} from "./current-authority.js";

const identity: SessionIdentity = {
  userId: "user-a",
  sessionValid: true,
};

const activeMembership: Membership = {
  userId: "user-a",
  organizationId: "org-a",
  status: "active",
};

test("active membership allows current organization access", () => {
  assert.deepEqual(authorizeOrganization(identity, "org-a", activeMembership), {
    kind: "allowed",
    organizationId: "org-a",
  });
});

test("the same valid session loses business access after membership suspension", () => {
  assert.deepEqual(
    authorizeOrganization(identity, "org-a", {
      ...activeMembership,
      status: "suspended",
    }),
    {
      kind: "denied",
      reason: "membership-inactive",
    },
  );
});

test("membership for another organization does not grant cross-organization access", () => {
  assert.deepEqual(authorizeOrganization(identity, "org-b", activeMembership), {
    kind: "denied",
    reason: "membership-missing",
  });
});
