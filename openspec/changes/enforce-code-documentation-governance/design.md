## Context

See `proposal.md` for motivation and `specs/project-structure-governance/spec.md` for the normative contract. A1 already centralizes production ownership in `PROJECT_OWNERS`, emits TypeScript declarations, and composes deterministic validation from `config/validation-suites.json`. It does not have a general linter, and its synchronized Pi and native vendor trees must not be reformatted as though they were first-party source.

The current prose rule mixes two concerns: declaration contracts that help a consumer understand an owner boundary, and implementation rationale that helps a maintainer preserve a non-obvious decision. Treating every exported declaration as an API-documentation target would add boilerplate to more than a thousand symbols and conflict with the sparse-comment requirement. The implementation therefore needs role-aware reachability and comment classification rather than a comment-count target.

## Goals / Non-Goals

**Goals:**

- Derive the TypeScript classes that form owner-public boundaries from the existing owner map and actual re-export graph.
- Enforce objective documentation shape and high-confidence hygiene rules with stable diagnostics.
- Apply one explicit source-role model across first-party production, test, tooling, and native source while preserving synchronized/vendor/generated provenance.
- Make the complete current baseline pass before the check becomes required in fast and full validation.
- Test the policy implementation independently from the repository scan so future rule changes cannot silently weaken it.

**Non-Goals:**

- Requiring documentation for every export, interface property, method, constructor, or private helper.
- Generating an API website or introducing TypeDoc.
- Adding a general formatter or lint stack.
- Using an LLM, readability score, comment quota, or other nondeterministic prose judge in CI.
- Rewriting synchronized Pi source, vendored native source, generated output, or historical OpenSpec artifacts.
- Proving that technically valid prose is factually correct; normal review remains responsible for factual accuracy.

## Decisions

### 1. Implement a repository-native policy inspector

Create a pure governance module that accepts a tracked-file inventory, source text, owner metadata, and explicit source classifications and returns sorted diagnostics. A thin command-line runner loads the repository and exits non-zero when diagnostics exist. The implementation will use the already-pinned TypeScript compiler API for TypeScript/JavaScript syntax rather than add ESLint and documentation plugins.

The inspector will expose stable rule identifiers, initially covering:

- missing or multiple owner-public class contracts;
- forbidden summary tags and consecutive JSDoc blocks;
- JSDoc attached to private or protected members;
- uncategorized implementation comments and representative control-flow/code narration patterns;
- commented-out code patterns;
- TODO/FIXME markers without a tracked issue;
- forbidden or unexplained suppression directives;
- invalid source-role exclusions or missing synchronized-source provenance.

Diagnostics will be ordered by normalized path, line, column, and rule identifier and will include the declaration symbol when available. The command will print remediation-oriented text rather than a raw count.

**Alternative considered:** adopt ESLint plus `eslint-plugin-jsdoc`. This provides generic JSDoc rules but does not understand A1 owner public entries, synchronized-source provenance, or the repository validation model, and would introduce a dependency stack for a narrow policy. A repository-native inspector reuses existing authorities and can still be replaced later without changing the specification.

### 2. Resolve public class contracts from owner entry reachability

Build a TypeScript program for tracked first-party production modules. For each `PROJECT_OWNERS.publicEntry`, obtain the module exports through the type checker, resolve aliases and `export *` chains to originating declarations, deduplicate symbols, and select class declarations. A class in a synchronized, vendored, or generated classification is not rewritten by this rule even when an owner entry re-exports it; its classification and provenance are validated instead.

A qualifying class must have one attached JSDoc block with a nonempty, complete responsibility description. The inspector will reject known boilerplate forms such as a summary tag, `Class for ...`, a bare repetition of the symbol name, or a method inventory. It will not require tags for parameters or returns and will not require member-level JSDoc merely because a member is public.

**Alternative considered:** require JSDoc on every syntactically exported class. That misses classes exposed through barrels, treats private implementation exports as architecture-public, and incorrectly rewrites synchronized source. Owner-entry reachability matches the repository's actual dependency contract.

### 3. Separate declaration JSDoc from implementation intent

Declaration JSDoc is allowed where it communicates a contract and is mandatory only for owner-public first-party classes. Public interfaces, fields, functions, and other declarations may retain JSDoc when it adds non-obvious semantics, but receive no coverage quota. Private and protected members may not use JSDoc because that makes internal state resemble published API documentation.

Ordinary implementation comments must begin with one policy intent label: `Invariant`, `Rationale`, `Security`, `Platform`, `Compatibility`, `Protocol`, `Concurrency`, `Performance`, or `Provenance`. A multiline comment uses one label at its first content line. Tool directives and tracked TODO/FIXME markers use their own validated forms and must include a reason or issue reference.

The inspector will parse comments as syntax trivia rather than search raw text, avoiding false matches in strings and regular expressions. Native-source handling will use a conservative lexical pass for supported line/block comment forms and will enforce only rules that can be identified without interpreting the language's behavior. Representative obvious-code patterns will be rejected, but the policy will not claim semantic understanding of arbitrary prose.

**Alternative considered:** allow free-form implementation comments and detect whether each is useful. That cannot be made deterministic. Intent labels make the retained reason reviewable and automatically distinguish implementation rationale from narration.

### 4. Centralize source roles; do not create violation exceptions

Define a small source-classification authority with directory or generated-artifact rules for:

- first-party production;
- first-party tests and tooling;
- first-party native code;
- synchronized source;
- vendored source;
- generated source;
- ignored build/runtime output.

Classifications are based on tracked repository structure and provenance contracts, not a list of accepted documentation violations. Synchronized paths must satisfy their existing source-ledger or header requirement. Vendored/generated/build/runtime paths are excluded from style checks according to role. No diagnostic baseline, accepted count, per-declaration suppression list, or broad catch-all glob is permitted.

**Alternative considered:** enable the check only for changed files or record the current violations. Both approaches allow old noncompliance to survive indefinitely and make refactors produce unrelated failures later. A one-time full migration gives every future change the same clean baseline.

### 5. Test policy semantics and validation integration separately

Add table-driven governance tests around the pure inspector with virtual file maps and minimal owner entries. Each rule receives at least one accepted and rejected fixture, including alias/barrel exports, duplicate JSDoc, private fields, comment text inside strings, categorized multiline rationale, tracked follow-ups, explained suppressions, native comments, and synchronized/vendor/generated classifications. Tests will assert rule identifiers and locations rather than snapshot full prose.

A repository-level test will prove that the tracked baseline yields no diagnostics. Validation-plan tests will prove that the code-documentation command is selected by fast validation and, through composition, full release validation. The package script remains directly runnable for focused remediation.

**Alternative considered:** test only the current repository scan. Such a test can pass after accidentally deleting a rule. Fixture tests preserve policy behavior; the clean-baseline test preserves coverage.

### 6. Wire one command into both validation paths

Add a focused `check:code-documentation` package command. Select it directly in the fast tier; full release already includes fast, so command deduplication runs it once. Keep it separate from `check:architecture` so maintainers can run and diagnose documentation governance independently, while repository validation still treats both as required gates.

The initial implementation enables the validation command only after all first-party diagnostics are resolved. CI, not an optional local full suite, is the acceptance authority.

## Risks / Trade-offs

- **Intent labels can become performative prefixes** → Require comments to survive the existing non-obviousness rule, reject high-confidence narration patterns, and avoid requiring comments where names and types suffice.
- **Prose quality cannot be fully automated** → Enforce objective structure and representative anti-patterns deterministically; reserve human review only for factual correctness rather than recurring coverage analysis.
- **Compiler API export resolution can be subtle** → Cover direct exports, named re-exports, aliases, `export *`, duplicate exports, and synchronized-origin symbols with focused fixtures.
- **Comment scanning can misread strings or language syntax** → Use TypeScript trivia for TS/JS and conservative language-specific lexical checks; do not use raw repository-wide regular expressions as the primary parser.
- **A full migration may conflict with active feature work** → Implement only after this specification merges, from a fresh `origin/develop` worktree, and keep mechanical documentation cleanup within the single dedicated implementation stream.
- **Source exclusions can hide first-party code** → Centralize classifications, test every exclusion category, require provenance for synchronized paths, and reject unmatched tracked source rather than silently skipping it.
- **Broad documentation requirements could increase noise** → Limit mandatory coverage to owner-public first-party classes and explicitly forbid export/member coverage quotas.

## Migration Plan

1. Implement the source-role inventory and pure inspector with fixture tests while the repository command is not yet selected by required validation.
2. Run the focused inspector to inventory the current baseline; resolve every finding by removing narration, improving names or decomposition, converting retained rationale to an accepted intent, consolidating malformed JSDoc, and adding concise owner-public class contracts.
3. Add the maintained architecture policy and repository-clean-baseline test.
4. Add the package command and select it in fast validation; prove full release inherits it exactly once.
5. Run strict OpenSpec validation for planning and rely on CI fast/full gates for implementation acceptance.

If the checker itself causes an unresolvable false positive, revert the validation wiring and checker together rather than committing a violation baseline. Source cleanup and accurate class contracts are safe to retain. No runtime or data rollback is required.
