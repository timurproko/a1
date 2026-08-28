# ui-apps Specification

## Purpose
Defines A1-owned applications and the host that runs them: registration by stable identity,
fullscreen presentation, the services a host provides, input and mouse dispatch, the close policy,
and app lifecycle.
## Requirements
### Requirement: An app is registered under a stable identity
An A1-owned application SHALL be registered under a stable identity, together with the route that
opens it. Registering the same identity again SHALL replace its definition rather than create a
second app. Opening an unregistered identity SHALL be reported as an error rather than opening an
empty surface.

#### Scenario: Register and open an app
- **WHEN** an app is registered and its route is invoked
- **THEN** the host SHALL open that app

#### Scenario: Re-register an identity
- **WHEN** an app is registered again under an identity that already exists
- **THEN** the later definition SHALL replace the earlier one and only one app SHALL exist for it

#### Scenario: Open an unregistered identity
- **WHEN** an identity with no registration is opened
- **THEN** the attempt SHALL fail with a reported reason and no surface SHALL be presented

### Requirement: A host presents one app at a time with declared services
A host SHALL present at most one app and SHALL provide it with the current size, the active theme, a
way to request a redraw, a way to close, and a way to return to the surface that opened it. An app
SHALL NOT reach around those services to the terminal, the pinned Pi shell, or another app.

#### Scenario: Provide size and theme
- **WHEN** an app renders
- **THEN** it SHALL receive the current width, height, and theme from its host

#### Scenario: Resize while open
- **WHEN** the terminal is resized while an app is open
- **THEN** the app SHALL be re-rendered against the new size

#### Scenario: Request a redraw
- **WHEN** an app requests a redraw after its own state changes
- **THEN** the host SHALL re-render it without the app writing to the terminal itself

#### Scenario: Open a second app
- **WHEN** an app is opened while another is already presented
- **THEN** the host SHALL present the newly opened app and the previous one SHALL no longer receive
  input or render

### Requirement: Every host chooses its close policy explicitly
A host SHALL declare whether an idle interrupt closes the presented app. An app SHALL be able to
consume an interrupt for its own cancellation before the host applies that policy, and SHALL be able
to leave the key unconsumed so the host's policy applies. A host SHALL NOT inherit an implicit policy.

#### Scenario: App consumes the interrupt
- **WHEN** an app has something to cancel and consumes the interrupt
- **THEN** the app's cancellation SHALL apply and the host SHALL NOT close it

#### Scenario: Host closes on an idle interrupt
- **WHEN** the app leaves an idle interrupt unconsumed and the host's policy is to close
- **THEN** the app SHALL close and the previous surface SHALL be restored

#### Scenario: Host keeps the app open
- **WHEN** the app leaves an idle interrupt unconsumed and the host's policy is to stay open
- **THEN** the app SHALL remain presented and the key SHALL continue to the host's own handling

### Requirement: Input and mouse reach the presented app in its own coordinates
While an app is presented it SHALL receive keyboard input before the surface that opened it, and
mouse events in coordinates local to its own rectangle. An app SHALL report whether it consumed an
event, and an unconsumed event SHALL continue to the host.

#### Scenario: Route a key to the app
- **WHEN** a key arrives while an app is presented
- **THEN** the app SHALL receive it before the underlying surface

#### Scenario: Report an unconsumed key
- **WHEN** the app does not consume a key
- **THEN** the key SHALL continue to the host rather than being discarded

#### Scenario: Route a mouse event
- **WHEN** a mouse event arrives inside the app's rectangle
- **THEN** the app SHALL receive it in coordinates relative to its own top-left corner

### Requirement: App lifecycle is explicit
An app SHALL be told when it is activated and when it is closed, and SHALL release what it owns on
close. Closing SHALL restore the surface that was presented before it. A failure while an app renders
or handles input SHALL be reported and SHALL close the app rather than leave a broken surface on
screen.

#### Scenario: Close an app
- **WHEN** an app is closed
- **THEN** it SHALL be told, it SHALL release its resources, and the previous surface SHALL be restored

#### Scenario: App fails while rendering
- **WHEN** an app throws while rendering or handling input
- **THEN** the failure SHALL be reported, the app SHALL be closed, and the previous surface SHALL be
  restored intact

### Requirement: A screen's hint line is rendered from its declared shortcuts
An app SHALL render the hint it shows the reader from the shortcut registry it declares, naming each
key as the registry names it. An app SHALL NOT hold a written copy of its hint beside its bindings.
Where an app shows only some of its shortcuts, which ones it shows SHALL be a property of the
declaration rather than a second list.

#### Scenario: Add a shortcut
- **WHEN** a shortcut is added to an app's declaration
- **THEN** the app's hint SHALL include it with no further edit

#### Scenario: Rebind a shortcut
- **WHEN** a declared binding changes
- **THEN** the hint SHALL name the new key

### Requirement: The application owner defines its route surface seam
The UI application owner SHALL define the vendor-neutral contract by which a host claims an application route, opens its surface, forwards keyboard and pointer input, receives render requests, and observes close or product-exit requests. A vendor integration MAY adapt that contract to its overlay/runtime API but SHALL NOT redefine the application route lifecycle as a vendor-owned contract.

#### Scenario: Open an app from a vendor-backed shell
- **WHEN** a declared application route is invoked through a vendor-backed shell
- **THEN** the shell SHALL receive a neutral application route surface
- **AND** the application registry and composition SHALL not import a vendor-owned route contract

#### Scenario: Preserve an existing integration import
- **WHEN** an existing consumer imports the route types from the Pi integration public entry during migration
- **THEN** that entry MAY re-export the neutral types without owning a second declaration

### Requirement: The app host applies declared frame caching
The app host SHALL render through the shared frame cache. It SHALL validate and finalize a frame before caching it. An app with a render revision contract SHALL reuse its finalized frame only while every declared revision and its rectangle remain unchanged; an app without that contract SHALL render on every request.

#### Scenario: Render an unchanged cache-aware app
- **WHEN** a cache-aware app renders again at the same size with unchanged revisions
- **THEN** the host SHALL reuse its previously finalized frame

#### Scenario: Render after app state or size changes
- **WHEN** a declared revision or the app rectangle changes
- **THEN** the host SHALL invoke the app renderer and cache the newly finalized frame

#### Scenario: Render an app without revisions
- **WHEN** an app declares no render-cache contract
- **THEN** the host SHALL invoke its renderer on every render request

#### Scenario: App emits a malformed frame
- **WHEN** an app renderer emits an invalid frame on a cache miss
- **THEN** validation SHALL fail and the malformed frame SHALL NOT enter the cache
