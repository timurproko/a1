## ADDED Requirements

### Requirement: Browser authentication callbacks use the active product identity
Local browser pages that report the result of provider authentication initiated by bare A1 SHALL identify A1 with its authoritative display identity and owned mark, SHALL NOT present Pi as the active product, and SHALL retain the provider-specific outcome needed to understand whether authentication succeeded or failed. Dynamic callback presentation text SHALL be safely encoded, and the page SHALL NOT expose authorization codes, state values, tokens, callback query parameters, or credentials. The explicit `a1 pi` comparison profile SHALL retain the selected Pi dependency's unmodified callback presentation.

#### Scenario: Complete browser authentication in bare A1
- **WHEN** a browser OAuth flow initiated by bare `a1` completes successfully through a local callback
- **THEN** the browser SHALL show an A1-branded success page that retains the provider outcome and tells the user the page may be closed
- **AND** the page SHALL NOT display Pi's logo or identify Pi as the active product

#### Scenario: Reject browser authentication in bare A1
- **WHEN** a local callback for a browser OAuth flow initiated by bare `a1` reports an error or cannot complete
- **THEN** the browser SHALL show an A1-branded failure page with safely encoded provider-safe diagnostic text
- **AND** the response SHALL preserve non-cacheable handling without exposing callback parameters or authentication material

#### Scenario: Render untrusted callback presentation text
- **WHEN** provider outcome text contains HTML-significant characters or markup-like content
- **THEN** the browser page SHALL present that content as text rather than executable or interpreted markup

#### Scenario: Authenticate through the comparison profile
- **WHEN** provider authentication is initiated by `a1 pi`
- **THEN** the callback page SHALL remain the unmodified presentation of the selected Pi dependency
