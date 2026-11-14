## MODIFIED Requirements

### Requirement: Sole public command exposes self-update

The globally registered a1 command SHALL retain noninteractive product self-update. Bare update SHALL select the running stable/development channel; release SHALL select stable; develop MAY select the current preview, one positive preview number or exact numbered preview version. Model refresh and package reconciliation SHALL remain separate operations and SHALL not independently replace the pinned Pi engine.

The optional pi naming entry MAY route its documented self-update/default/self aliases to the verified A1 product updater under the approved grammar migration. It SHALL not invoke standalone Pi's installer or target another installation. Ordinary a1 update pi and existing a1 pi independent-engine update forms SHALL retain their pinned-runtime rejection. Removed ordinary update-self positional notation SHALL fail as unsupported syntax rather than silently succeed. The full documented maintenance inventory SHALL explicitly record these command-word differences.

An approved all-update selector SHALL coordinate product and package work through their existing owners, with verified installation/prefix/recovery checks and explicit partial-failure reporting. It SHALL not run package work after an unverifiable self-update transition or ignore a component failure. Incompatible custom updater overrides SHALL fail explicitly rather than bypass existing update authority. No maintenance alias grants independent dependency-upgrade or global Pi-replacement permission.

#### Scenario: Update through a1

- **WHEN** a stable A1 invokes bare update
- **THEN** the existing verified stable product-update workflow SHALL run

#### Scenario: Update a development build

- **WHEN** a development A1 invokes bare update
- **THEN** the development-channel workflow SHALL run without implicitly switching to stable

#### Scenario: Move to the stable release explicitly

- **WHEN** release is selected
- **THEN** the stable product-update workflow SHALL run from either channel

#### Scenario: Update in Pi's spelling

- **WHEN** ordinary A1 receives removed positional update-self notation
- **THEN** it SHALL return focused nonzero unsupported-syntax guidance without registry or update work

#### Scenario: Update installed packages

- **WHEN** an accepted extensions-only update is selected
- **THEN** only selected A1 package reconciliation SHALL execute

#### Scenario: Update one package

- **WHEN** an accepted scoped package-source update is selected
- **THEN** only that package SHALL update

#### Scenario: Refresh model catalogs

- **WHEN** model-only update is selected
- **THEN** catalog refresh SHALL not self-update the product, packages or engine

#### Scenario: Pinned Pi is targeted

- **WHEN** ordinary a1 update pi targets embedded Pi independently
- **THEN** A1 SHALL fail before update work with pinned-runtime guidance

#### Scenario: Update current development A1

- **WHEN** develop without a preview value is selected
- **THEN** the current development preview SHALL be resolved by the existing updater

#### Scenario: Update one numbered development preview

- **WHEN** develop carries a positive preview number
- **THEN** the unique published matching preview SHALL be verified before installation

#### Scenario: Update one exact development preview

- **WHEN** develop carries an exact numbered preview version
- **THEN** the existing updater SHALL validate and install only that target

#### Scenario: Refresh models in top-level notation

- **WHEN** ordinary A1 model refresh is selected
- **THEN** only the selected A1 profile's catalogs SHALL refresh

#### Scenario: Refresh models in Pi-compatible notation

- **WHEN** the existing a1 pi model-refresh alias is selected
- **THEN** the same catalog operation SHALL execute

#### Scenario: Update selectors conflict

- **WHEN** selectors combine outside their declared product/package/model grammar
- **THEN** A1 SHALL fail before registry, package, release or runtime mutation

#### Scenario: Pi-named product update

- **WHEN** the optional pi-named entry receives a documented self-update alias under its approved migration
- **THEN** it SHALL use the same verified A1 updater and actual A1 identity rather than independently install upstream Pi

#### Scenario: Coordinated update fails

- **WHEN** one component of an approved all-update operation fails or loses verified transition authority
- **THEN** the operation SHALL report that component and actual partial result nonzero without claiming complete success or bypassing recovery fences
