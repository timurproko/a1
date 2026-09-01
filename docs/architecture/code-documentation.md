# Code documentation

A1 treats source documentation as a contract, not as a coverage target. Names, types, and decomposition explain ordinary behavior. Comments remain only where removing them would hide a public responsibility, invariant, rationale, security property, platform constraint, compatibility boundary, protocol rule, concurrency rule, performance decision, or provenance fact.

## Public class contracts

Every first-party TypeScript class exposed through a production owner's public entry has exactly one JSDoc description at its declaration. The description states what the class owns and includes its material lifecycle or safety boundary when one exists.

Do not add JSDoc solely because a function, type, constructor, property, or method is exported. Do not document a class by repeating its name or listing its methods. Private and protected members never use JSDoc.

```ts
/** Persists complete workspace views and recovery references through the control-store boundary. */
export class WorkspaceStore {
```

## Implementation comments

A retained implementation comment starts with the reason it exists:

| Intent | Use |
| --- | --- |
| `Invariant:` | State or ordering that every implementation path must preserve |
| `Rationale:` | A non-obvious choice among plausible alternatives |
| `Security:` | Trust, ownership, cleanup, disclosure, or failure-safety boundary |
| `Platform:` | Operating-system, terminal, filesystem, or toolchain behavior |
| `Compatibility:` | Behavior intentionally matching or accepting another version or surface |
| `Protocol:` | Wire, framing, input, encoding, or externally defined semantic rule |
| `Concurrency:` | Race, serialization, cancellation, or event-loop ordering |
| `Performance:` | Bounded work, caching, coalescing, or resource decision |
| `Provenance:` | Source, generated authority, or adaptation origin |

```ts
// Security: an uncertain process identity never authorizes termination.
// Platform: Windows Terminal encodes Ctrl+Backspace as a raw backspace byte.
// Performance: finalized blocks cache by revision and width; live blocks always render.
```

A continuation line does not repeat the label. If no intent applies, remove the comment and make the code explain itself.

## Forbidden forms

The repository gate rejects:

- missing or multiple contracts on owner-public first-party classes;
- `<summary>` and `@summary` tags;
- boilerplate class descriptions and method inventories;
- JSDoc on private or protected members;
- uncategorized implementation comments;
- obvious commented-out code or control-flow narration;
- `TODO` or `FIXME` without an issue number, issue URL, or tracker identifier;
- `@ts-ignore` and suppression directives without a reason;
- an unclassified tracked code path or synchronized source without provenance.

Follow-up and suppression forms include their authority inline:

```ts
// TODO(#321): remove the compatibility path after the pinned upgrade.
// @ts-expect-error -- the shipped JavaScript module has no declaration file
```

## Source roles

The full style policy applies to first-party production TypeScript and to applicable comments in first-party tests, tooling, and native source. Native source does not receive TypeScript declaration requirements.

Synchronized Pi source, native vendor trees, generated source, build output, and runtime artifacts are not rewritten to match first-party style. Their exclusion comes from the repository source-role classifier, not from a list of accepted violations. Synchronized source must remain covered by its source ledger or explicit provenance header.

## Validation

Run the focused check with:

```sh
npm run check:code-documentation
```

The check scans the complete tracked baseline and reports stable rule identifiers with path, line, column, and declaration symbol when available. It has no accepted-violation count or grandfather file. Fast pull-request validation runs the check, and full release validation inherits it through the fast tier.

Focused governance tests use valid and invalid virtual sources to preserve each rule independently from the clean repository-baseline assertion. The gate validates deterministic structure and high-confidence anti-patterns; review remains responsible for the factual accuracy of retained prose.
