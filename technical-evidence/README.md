# Public TypeScript technical evidence

Small, independently written reproductions of selected invariants described in Nicolas Gonfo's portfolio case studies.

These folders are **not production source code**. They make narrow engineering decisions inspectable without exposing private repositories, schemas, customer data or confidential implementation details.

## Reproductions

- [`kadryn-replay-quota`](./kadryn-replay-quota/) — exact replay ordering, concurrent first submissions and quota correctness.
- [`travel-current-authority`](./travel-current-authority/) — current organization membership remains the source of business capability even when an authentication session is still valid.

Each reproduction is intentionally small enough to review during a hiring screen.
