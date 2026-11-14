## MODIFIED Requirements

### Requirement: Maintenance commands remain unambiguous

Ordinary A1 SHALL retain existing control namespaces and their handlers, including update, packages, uninstall, worktree, session, help/version and comparison routing. A leading recognized control word SHALL remain a command; malformed recognized controls SHALL never become prompts. Both normal-product names SHALL accept Pi-style positional prompts and `--` to end option parsing. After execution-option parsing begins, control routing SHALL not resume; after the boundary all words are input rather than maintenance. Reserved removed launch/control forms SHALL fail explicitly instead of guessing work.

Public normal-product launch options SHALL use one authoritative implementation for model/provider/thinking, repeatable extensions, exclusions, guarded session selection/storage and invocation color, plus delivered session/model/trust additions. Unknown long flags SHALL require loaded extension registrations; unknown short flags, missing/duplicate/invalid options and internal `--runtime-options` SHALL fail clearly and nonzero. Documented contracts assigned to later approved deliveries SHALL fail explicitly rather than be accepted and ignored or silently treated as prompt text.

Invocation color SHALL remain exactly blue, green, orange, pink, purple, cyan or grey, singleton and nonpersistent. Instructions SHALL preserve the declared ordered-message semantics without shell evaluation and reach the existing normal owned prompt path once after successful startup. Interactive initial submission SHALL wait for extension startup and first presentation. P1 SHALL preserve bounded transport and report input limits explicitly pending the later input/large-payload transport, never truncate or claim full compatibility.

#### Scenario: Query help
- **WHEN** standalone help is requested
- **THEN** truthful delivered options, prompt boundaries and pending-delivery limits SHALL be printed without session/factory/model startup

#### Scenario: Query version
- **WHEN** standalone version is requested
- **THEN** truthful product/version information SHALL be returned without interactive startup

#### Scenario: Manage packages
- **WHEN** a currently supported package spelling is supplied
- **THEN** its existing handler SHALL run instead of prompting

#### Scenario: Launch form is given an argument
- **WHEN** a supported execution invocation carries positional instructions
- **THEN** they SHALL remain ordered input without switching into maintenance

#### Scenario: Unknown subcommand
- **WHEN** an unrecognized operation follows a recognized control namespace
- **THEN** it SHALL not become a model prompt; outside command namespaces, bare words SHALL have the approved Pi prompt semantics

#### Scenario: Comparison launch is absent from a release
- **WHEN** a stable build receives the unsupported bare comparison form
- **THEN** its existing comparison exclusion SHALL remain, never selecting normal-product execution

#### Scenario: Removed update command is provided
- **WHEN** a reserved removed update-colon form is supplied
- **THEN** no update or model work SHALL execute

#### Scenario: Resume from either release channel
- **WHEN** either channel receives a supported normal session selection
- **THEN** it SHALL use the shared normal profile and writer guard

#### Scenario: Session arguments are supplied to the comparison
- **WHEN** session arguments are unsupported by the comparison namespace
- **THEN** they SHALL not fall through to a normal launch

#### Scenario: Launch with an invocation color
- **WHEN** valid invocation color combines with supported options
- **THEN** normal A1 SHALL receive that nonpersistent color without Pi option passthrough

#### Scenario: Reject malformed color before rendering
- **WHEN** color is invalid, missing or repeated
- **THEN** launch SHALL fail before rendering

#### Scenario: Preserve a color-looking literal prompt
- **WHEN** a green invocation override precedes the boundary and color-looking prompt tokens follow it
- **THEN** green SHALL remain the override and the later tokens SHALL be literal instructions submitted once after startup

#### Scenario: Boundary launch without override
- **WHEN** a prompt has no invocation color
- **THEN** saved Default initialization SHALL remain in effect

#### Scenario: Leave unrelated commands alone
- **WHEN** an invalid launch option is supplied to a control/comparison operation
- **THEN** it SHALL not activate normal interactive behavior or alter maintenance presentation

## ADDED Requirements

### Requirement: Shared default CLI preserves public and internal trust boundaries

Both public entries SHALL share delivered option normalization/help/catalog and concrete normal-product launch services, not duplicate a compatible runtime. Public input SHALL not inject internal child payloads. Original-cwd paths and explicit package source syntax SHALL remain intact. New invocation payloads SHALL survive supported development and immutable launch boundaries; the ultimately selected authenticated release SHALL support them or fail explicitly without option loss.

#### Scenario: Equivalent launches
- **WHEN** either entry receives equivalent delivered launch options/instructions
- **THEN** equivalent normal-product intents and runtime behavior SHALL result

#### Scenario: Safe catalog
- **WHEN** model listing is requested
- **THEN** the existing effective-profile implementation SHALL run without an interactive session/model call and preserve Firstmate pre-factory refusal

#### Scenario: Positional instruction and reserved word
- **WHEN** ordinary A1 receives a bare instruction or either entry receives update after the boundary
- **THEN** the input SHALL reach the normal prompt path, and the post-boundary update word SHALL not run maintenance
