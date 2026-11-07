## REMOVED Requirements

### Requirement: Physical-host automation is isolated from the user's desktop
**Reason**: Physical-host automation existed to certify the transparent terminal and resident host, neither of which has a production owner since the single-agent pivot. No retained test launches, focuses, or drives a terminal window.

**Migration**: None.

### Requirement: Transparent validation is manual-first
**Reason**: The transparent terminal capability was retired with the single-agent pivot; there is no transparent candidate to validate manually. Owned-UI manual checkpoints remain governed by their own documents.

**Migration**: None.

### Requirement: Stable transparent acceptance uses independent physical evidence
**Reason**: There is no transparent rendering to compare against a physical terminal; the product renders one owned UI directly.

**Migration**: None.

### Requirement: Raw relay is not an implicit transparent fallback
**Reason**: With no transparent attachment path, there is nothing a raw PTY relay could fall back from. The live invariant it protected, that no module under `src/` imports a pseudoterminal or terminal emulator, is stated by `project-structure-governance` and enforced by the architecture gate.

**Migration**: None.
