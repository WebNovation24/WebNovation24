/**
 * Public technical reproduction for the Travel case study.
 *
 * This is NOT production source code. It independently models one public
 * invariant: a valid authentication session is not proof of current
 * organization membership or business capability.
 */

export type SessionIdentity = Readonly<{
  userId: string;
  sessionValid: boolean;
}>;

export type Membership = Readonly<{
  userId: string;
  organizationId: string;
  status: "active" | "suspended";
}>;

export type AccessDecision =
  | Readonly<{ kind: "allowed"; organizationId: string }>
  | Readonly<{
      kind: "denied";
      reason:
        | "invalid-session"
        | "membership-missing"
        | "membership-inactive";
    }>;

const deny = (
  reason: Extract<AccessDecision, { kind: "denied" }>["reason"],
): AccessDecision => ({
  kind: "denied",
  reason,
});

export function authorizeOrganization(
  identity: SessionIdentity,
  requestedOrganizationId: string,
  membership: Membership | null,
): AccessDecision {
  if (!identity.sessionValid) {
    return deny("invalid-session");
  }

  if (
    !membership ||
    membership.organizationId !== requestedOrganizationId ||
    membership.userId !== identity.userId
  ) {
    return deny("membership-missing");
  }

  if (membership.status !== "active") {
    return deny("membership-inactive");
  }

  return {
    kind: "allowed",
    organizationId: requestedOrganizationId,
  };
}
