// ──────────────────────────────────────────────────────────────────────────────
// The policy contract — the least this engine needs to know about the world
// ──────────────────────────────────────────────────────────────────────────────
// ZERO IMPORTS, and that is this file's entire property. It is not a style preference; it is what makes it
// publishable. Before, the policy engine imported the `Capability` type from the business registry, and that
// registry imports the database package on its second line. Two hops were enough for anyone publishing the
// limits engine to publish a tree that does not compile outside the monorepo it came from — even though the
// engine never calls a single database function. The dependency was on TYPES, which is the kind you cannot
// see by reading the code that runs.
//
// WHAT CAME OUT OF CUTTING IT, and what nobody would have found by sitting down to design a generic library:
// the policy looks at exactly TWO things about an action — whether it requires a cap, and in what unit that
// cap is declared — and never at what the action does or what it moves. `movesMoney` was the name of the only
// capped thing that existed when this was written, not the concept. The concept is `guarded`: something that
// must not run unattended without a limit in place. A bulk send, a publication, a cascading delete are all
// guarded without a dollar in sight.
//
// NAMES IN TRANSITION (deliberate, not an oversight). `guarded` and `limitKeys` are canonical; `movesMoney`
// and `capLimitKeys` are their historical aliases and remain valid because the whole registry and the control
// surface still spell them that way. Renaming them in the same batch that cuts the dependency would mix two
// changes with very different risk: this one alters no behaviour at all, and the rename touches every declared
// capability. They are retired separately. Until then, `isGuarded` and `limitKeysOf` are the ONLY way to read
// them, so that the day of the retirement there is one place to change and not thirty.

/** How autonomously an action may run. `auto` runs unattended; `approve` needs a human to sign off before it
 *  executes; `consult` asks before it even proposes. */
export type Autonomy = "auto" | "approve" | "consult";

/**
 * An action as the policy sees it: an id, whether it requires a cap, and in what unit that cap is declared.
 *
 * Nothing else. It cannot execute, it knows nothing about money, and it knows nothing about the product it was
 * extracted from.
 */
export interface GuardedAction {
  id: string;
  /** Does this require a cap in place before it can run unattended? The canonical name. */
  guarded?: boolean;
  /** Historical alias of `guarded`, from when the only capped thing was money.
   *  In transition: read it through `isGuarded`, never directly. */
  movesMoney?: boolean;
  /** The keys whose set IS this action's cap, EACH IN ITS OWN UNIT. Present means the cap is not a single scalar
   *  magnitude: a retention offer is measured in percent and in days at the same time, and neither can be
   *  expressed in the other's unit. Absent means it is capped by the scalar cap. */
  limitKeys?: readonly string[];
  /** Historical alias of `limitKeys`. In transition: read it through `limitKeysOf`, never directly. */
  capLimitKeys?: readonly string[];
}

/**
 * The caps the owner configured for an action, in the two shapes that exist.
 *
 * `cap` is the scalar magnitude — dollars, where this came from — and it travels as a string on purpose: the
 * comparison that decides whether something runs unattended must not lose precision to floating point. `named`
 * holds the caps in their own units, exactly as they were persisted. The policy only asks whether they are
 * DECLARED; comparing a concrete value against them is the job of whoever owns the action, because that is who
 * knows the unit.
 */
export interface PolicyLimits {
  cap: string | null;
  named?: Record<string, unknown> | null;
}

/** Does this action require a cap? The only valid way to read `guarded`/`movesMoney` while the alias lives. */
export const isGuarded = (action: GuardedAction): boolean => action.guarded ?? action.movesMoney === true;

/** In which keys is this action's cap declared? `undefined` means it is capped by the scalar cap.
 *  The only valid way to read `limitKeys`/`capLimitKeys` while the alias lives. */
export const limitKeysOf = (action: GuardedAction): readonly string[] | undefined =>
  action.limitKeys ?? action.capLimitKeys;

/** Does this declared limit count? Enabled AND carrying a number: an `enabled: true` on its own caps nothing,
 *  because the value is optional in the contract that persists it. Fail closed — what is not understood does
 *  not cap.
 *
 *  The same rule is written out in two other places in the system this was extracted from: where the limits are
 *  saved, and where they are shown. It is repeated on purpose and not imported, because this file cannot import
 *  anything without losing the only property it has. If the rule changes, it changes in all three. */
export const limitDeclared = (value: unknown): boolean => {
  const v = value as { enabled?: boolean; value?: number } | undefined;
  return v?.enabled === true && typeof v.value === "number" && Number.isFinite(v.value);
};

/**
 * Does this action have an APPLICABLE cap, given the limits handed to it?
 *
 * Two ways to cap, and an action uses exactly one:
 *  - with `limitKeys`, it is capped when ALL of them are declared — a half-set cap is not a cap;
 *  - without them, when it has the scalar cap.
 *
 * The question this replaced was "does it have a scalar cap?", and that answered wrongly for every action
 * whose unit was not that one: its scalar is `null` by construction, so its `auto` was silently unreachable.
 * What does NOT change: nothing guarded runs unattended without a cap. What changes is what counts as a cap,
 * not whether one is needed.
 */
export function hasApplicableLimit(action: GuardedAction, limits: PolicyLimits): boolean {
  const keys = limitKeysOf(action);
  if (keys?.length) {
    const named = (limits.named ?? {}) as Record<string, unknown>;
    return keys.every((k) => limitDeclared(named[k]));
  }
  return limits.cap !== null;
}
