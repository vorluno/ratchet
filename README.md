# @vorluno/ratchet

> Per-capability autonomy for AI agents: caps in their own unit, and refusals you can act on.

[![npm](https://img.shields.io/npm/v/@vorluno/ratchet)](https://www.npmjs.com/package/@vorluno/ratchet)
[![license](https://img.shields.io/badge/license-Apache--2.0-blue)](./LICENSE)
[![types](https://img.shields.io/badge/types-included-blue)](#)
[![zero deps](https://img.shields.io/badge/dependencies-0-blue)](#)

## Install

```bash
npm i @vorluno/ratchet
```

## Example

```ts
import { isGuarded, hasApplicableLimit, type GuardedAction, type PolicyLimits } from "@vorluno/ratchet";

// A retention offer is capped in percent AND in days. Neither can be expressed in the other's unit,
// and neither can be expressed in dollars.
const retentionOffer: GuardedAction = {
  id: "support.retention_offer",
  guarded: true,
  limitKeys: ["max_discount_pct", "max_extension_days"],
};

const halfConfigured: PolicyLimits = {
  cap: null,
  named: { max_discount_pct: { enabled: true, value: 20 } },
};

isGuarded(retentionOffer);                              // true — it must not run unattended uncapped
hasApplicableLimit(retentionOffer, halfConfigured);     // false — a half-set cap is not a cap

const configured: PolicyLimits = {
  cap: null,
  named: {
    max_discount_pct: { enabled: true, value: 20 },
    max_extension_days: { enabled: true, value: 30 },
  },
};

hasApplicableLimit(retentionOffer, configured);         // true — now it can run on its own
```

## What it does

- Answers **two questions** about an action: does it require a cap, and is there an applicable one.
- Handles caps **in their own unit** — percent, days, posts per day — not only a scalar amount.
- Treats a **half-configured** cap as no cap. Fail closed: what is not understood does not cap.
- **Does not:** it does not execute anything, does not know about money, does not talk to a database,
  and does not decide *who* may act. It answers whether an action is capped, and nothing else.

---

## Why it exists

A single "agent autonomy" switch forces a choice between an agent that is useless and one that is
dangerous. Reading a balance can be automatic while issuing an invoice needs approval — in the same
agent, in the same turn. The unit that autonomy belongs to is the **capability**, not the agent.

The second problem shows up right after you accept the first. Once autonomy is per capability, each
one needs a cap — and **a cap in the wrong unit is not a weak cap, it is one you cannot compare.** A
retention offer measured in percent and days has no meaningful dollar ceiling; give it one and the
comparison never runs, so the action silently degrades to "ask a human" forever. Nobody reports that
as a bug, because asking a human is exactly what a cautious system is supposed to do.

## Design notes

**Zero dependencies is the feature.** This package started life inside a larger system, importing a
type from a business registry that imported a database client two hops away. Cutting that import is
what made it publishable — and cutting it revealed something better: the policy engine only ever
looked at two properties of an action. Everything else was ambient.

**`guarded`, not `movesMoney`.** The original name described the only capped thing that existed when
it was written. A bulk send, a publication, a cascading delete are all things that must not run
unattended without a limit, and none of them touch a dollar.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) — it says in the first line whether your pull request will
be considered.

## Security

See [SECURITY.md](./SECURITY.md).

## License

Apache-2.0. See [LICENSE](./LICENSE) and [AUTHORS](./AUTHORS).

---

Built by **[Vorluno](https://vorluno.dev)**, extracted from [niiko](https://niiko.org) — where it
runs in production.
