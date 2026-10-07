## Context

The owned Settings app keeps an optimistic scalar value in `#pending` so a row responds immediately and subsequent steps start from the value the user just chose. The row renderer currently passes that optimistic value to `effectiveDisplay(entry, shown)`, but `entry.effectiveValue` still belongs to the pre-write snapshot until the asynchronous change completes. A live change can therefore paint text such as `fast (effective normal; live)` for an intermediate frame and then collapse to `fast`. This is presentation drift, not a real deferred-application state.

Settings changes already pass through `OwnedSettingsManager.change` or `changeStructured`, which own backend routing, persistence, effect application, refresh, and failure outcomes. Undo must use those same paths rather than mutating the manager, settings files, or engine state directly. The Settings shortcut registry already supplies dispatch, shortcut listings, and footer hints for the list and structured-dialog scopes.

## Goals / Non-Goals

**Goals:**

- Render an unresolved optimistic scalar as only the requested value until the source reports an authoritative stored/effective state.
- Let `Ctrl+Z` restore the value preceding the latest successful scalar or structured edit.
- Support repeated undo in reverse edit order for the lifetime of one Settings screen.
- Route restoration through the original entry's backend and preserve ordinary live/deferred/failure behavior.
- Keep dispatch, listings, and concise `<shortcut> <action>` footer guidance derived from active shortcut declarations without connective `to` wording.
- Give the structured-setting panel one upper boundary rule and a title/description/menu/hints hierarchy.
- Adapt Pi's per-model thinking selector hierarchy to A1's stable title, filtering, muted step context, concise guidance, and keyboard-only interaction.
- Remove the redundant Pi wheel-distance control from bare A1 and use concise owned-product wording for copy-on-select.

**Non-Goals:**

- Add redo, persistent/cross-session history, or undo outside the owned Settings surface.
- Change settings document formats, manager APIs, application boundaries, choices, or engine ownership.
- Hide legitimate stored-versus-effective text after a deferred save has completed.
- Change editor `Ctrl+Z`, the pinned comparison profile, or search text-editing behavior other than giving the Settings-level undo action precedence while the Settings surface is open.

## Decisions

### 1. Distinguish optimistic presentation from authoritative effective-state presentation

The Settings app will detect when a scalar row is reading from its own pending map. While pending, the value cell will render the requested scalar directly with the existing boolean/string/number formatting. It will not compare that value with the stale entry snapshot or append an effective/application suffix.

After the operation settles, the existing source refresh remains authoritative. A successful live save renders the refreshed value; a successful deferred save may render its legitimate stored/effective distinction and boundary; a failed save removes the optimistic value, restores the source value, and retains the existing failure notice. Delaying all display until persistence completes was rejected because it would make controls lag and would break repeated stepping from the latest visible value.

### 2. Keep a screen-local LIFO history of successful edits

`SettingsApp` will own transient undo records containing the entry identity/backend and an exact copy of the value that preceded the edit. Scalar records store the prior scalar; structured records store the prior whole normalized object. A record becomes undoable only when its forward change succeeds, so rejected writes never create history. Records retain their user-action sequence so asynchronous completion cannot reverse undo order.

Each `Ctrl+Z` pops the newest successful record and restores its prior value through `change` or `changeStructured`. Restoration does not create a redo/undo record. If restoration fails or is unavailable, the visible optimistic restoration is rolled back, the ordinary save failure is shown, and the record remains available for retry. Closing the Settings screen discards its history.

A single original-value slot was rejected because two accidental edits could not be unwound naturally. Persisting history was rejected because stale entries and changed availability/application contracts make cross-session restoration unsafe and exceed the request.

### 3. Make undo available throughout the Settings surface

Declare `ctrl+z` in the main Settings scope and the structured-dialog scope, with concise `Ctrl+Z undo` hint metadata. Decode terminal `SUB` (`\u001a`) through the existing key map. The list uses normal registry dispatch; the value menu and search state delegate this chord to the same Settings undo action; the structured dialog resolves its local declaration. An open value menu closes before restoration so its captured entry snapshot cannot remain interactive after the value changes. Search may stay open and immediately reflects the restored value. A structured dialog updates its working whole-object record when its current setting is restored.

The shared owned shortcut-hint boundary validates declaration and rendering inputs, rejects keyed actions beginning with connective `to`, and always applies dim-key/muted-action roles. Both ordinary spacing and the stepped selector's compact separator pass through that boundary. This gives future owned dialogs the same grammar without adding one-off consistency assertions for each dialog; pinned Pi surfaces retain their upstream wording through their separate adapter.

Hardcoding the chord only in modal handlers was rejected because it would let dispatch, `/hotkeys`, and footer guidance diverge. Per-dialog wording enforcement was rejected because heterogeneous dialog tests are easy to omit or encode inconsistently. Reusing the editor undo action was rejected because Settings history consists of persisted setting transactions, not text snapshots.

### 4. Cover intermediate frames and restoration outcomes at the app boundary

Focused Settings tests will hold a manager change unresolved and inspect the intermediate value cell, proving it contains only the optimistic value and no stale effective suffix. Other tests will complete scalar and structured edits, issue `Ctrl+Z`, and verify reverse-order restoration reaches the correct A1 or agent backend. Failure fixtures will verify failed forward writes add no history and failed restoration keeps the current authoritative value plus a retryable undo record. Hint assertions will cover both the ordinary footer and structured dialog.

App-boundary tests are preferred over renderer-only tests because the defect and undo state are both introduced by Settings orchestration. Manager-format or migration tests are unnecessary because no persistence schema changes.

### 5. Let the structured panel supply the shared boundary rule

The Settings frame ordinarily inserts one fixed divider between list content and footer guidance. A structured setting replaces that footer with `renderDialogPanel`, which already starts with its own full-width top rule and ends with a bottom rule. Retaining the ordinary divider therefore paints two upper bars for one dialog. While the structured panel is open, Settings will reserve no separate footer-divider row and will use the panel's first rule as the sole content/dialog boundary, just as active search already lets the shared input's top rule replace the ordinary divider.

Removing the panel's own rule was rejected because `renderDialogPanel` is the shared standard-dialog composition. The panel places its setting title directly below that rule, then the selected part's muted description, menu rows, concise hints, and bottom rule. Suppressing only the redundant Settings divider preserves this shared hierarchy without stacked boundaries.

### 6. Adapt the per-model thinking workflow to A1's modal hierarchy

The `modelThinkingLevels` descriptor already supplies one flag per available model, each model's display label, fallback, and supported levels. Settings will recognize that stable engine key and open a shared stepped dialog presentation rather than treating models as ordinary object flags. Both steps use the stable `Thinking Level` title followed by a muted `(step N/2)` marker. Step 1 puts muted `Select a model to configure` on the next line, followed by a continuously focused one-line search, filtered model rows with Models-dialog-muted bracketed provider suffixes, and declaration-derived `Type search · Enter select · Esc back` guidance. Step 2 keeps that title and moves the selected model into the muted next-line `Select default thinking level for {model label}` description. Enter advances to a level-selection step for that model; an existing override adds pinned Pi's clear-override choice, selecting that choice removes the model key, selecting a supported level writes the whole object through the existing structured backend, and completion loops to the filtered model step as pinned Pi does.

The specialized state remains inside `SettingsApp`, while title/step/search/list/footer rendering is added to the shared dialog component layer. This preserves the owned-UI boundary without instantiating pinned private submenu classes. Generic object settings such as `Warnings` retain their declared part rows and undo support.

While any structured dialog is open, pointer reports are consumed without changing selection or values. This matches the requested keyboard-only dialog ownership and prevents pointer motion over the underlying Settings list from affecting dialog state. Keyboard dispatch remains explicit: model search accepts text and editing keys, Up/Down navigate filtered rows, Enter advances/selects, and Escape returns one step or closes from step 1. The specialized footer replaces generic Settings/undo hints because those actions are not active in this stepped selector.

Applying one generic searchable workflow to every JSON setting was rejected because pinned warnings are a simple settings list rather than a model/level wizard. Reusing pinned concrete submenu constructors was rejected because the owned Settings surface must remain behind public engine descriptors and shared owned components.

### 7. Let the owned viewport own scrolling presentation

Bare A1's custom viewport already resolves wheel distance and acceleration from the profile-local global `scrollbarSpeed` setting. It will no longer bind Pi's `fullscreenWheelScrollLines` shell effect or pass that Pi value into its enclosing runtime, and bare composition filters that descriptor so it cannot appear as a second Agent-specific scrolling control. The comparison profile keeps the pinned binding, runtime option, storage, and selector unchanged.

Pi's `fullscreenCopyOnSelect` remains the authoritative persisted backend value because the owned selection controller applies it live. Bare A1 will override only its Settings presentation label to `Copy on select`; the key, storage, effect, and comparison wording stay unchanged. The label override and hidden wheel key are composition-owned presentation policy rather than mutations of generated Pi metadata.

Deleting Pi's setting or renaming its persistence key was rejected because comparison mode and pinned runtime compatibility still own that contract. Keeping the row disabled or explaining it as unused was rejected because the user requested one global scrolling authority without a redundant no-op control.

## Risks / Trade-offs

- **[A deferred setting loses useful application information]** → Suppress decoration only while the app's optimistic value is unresolved; use the refreshed authoritative entry after completion.
- **[Asynchronous saves reorder history]** → Assign edit sequence at admission and order successful records by that sequence rather than callback timing.
- **[Undo bypasses effects or writes the wrong store]** → Retain backend/id in each record and invoke the same manager change method used by the original edit.
- **[A failed restoration loses the only recovery step]** → Reinsert the record and restore the authoritative forward value while reporting the failure.
- **[A stale value menu applies against restored state]** → Close the menu before undo; keep search open because it derives rows afresh.
- **[Removing the divider or adding hierarchy rows breaks the frame]** → Derive footer height from rendered panel lines and assert the sole panel rule, title/description order, and bottom rule at the Settings app boundary.
- **[Filtering hides the active model]** → Clamp model selection whenever the query changes and test narrowing, empty results, and Escape without mutating settings.
- **[Specialized rendering drifts from the descriptor]** → Derive model rows and level choices only from the entry's flags and write through the existing whole-object route.
- **[Removing the Pi wheel owner changes comparison behavior]** → Gate the omission on the custom owned viewport and retain the existing binding/runtime value in comparison mode.
- **[Renamed copy wording changes storage identity]** → Apply a bare-composition label override only; keep `fullscreenCopyOnSelect` as the backend id and write route.

## Migration Plan

No data migration is required. Implement the pending-value presentation distinction, add declared undo dispatch and transient history, then add focused Settings tests and validate the changed scopes. Rollback removes only transient app behavior; values already restored through normal settings APIs remain valid stored settings.
