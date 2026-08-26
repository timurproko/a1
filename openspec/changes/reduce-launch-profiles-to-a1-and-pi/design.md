## Context

Launch routing currently carries descriptive contract fields beyond the only decisions production needs: profile identity, configuration-root selection, and whether product surfaces are enabled. The removed profile is also accepted by lifecycle persistence and declared in centralized identity.

## Decisions

1. `LaunchProfileId` becomes `"a1" | "pi"` and the interactive intent carries that ID directly.
2. The unused profile-contract metadata layer is deleted. Preparation selects A1's root for `a1` and clears Pi's root override for `pi`.
3. Dead launch-argument transport is deleted because neither retained profile overrides Pi trust policy.
4. The command parser contains no compatibility branch or dedicated rejection. Ordinary unknown-command handling remains generic.
5. Control storage advances to schema version 6 and rebuilds launch-instance storage while copying only the supported profile IDs.
6. Current docs, specifications, and active plans describe two profiles. Archived records remain historical.
7. Existing third-profile files are deleted once as an explicitly approved local cutover, not through permanent product cleanup code.

## Migration

The control-store migration preserves supported launch records and drops unsupported profile rows. It never reads or modifies Pi profile files. The separately approved local profile-directory deletion is performed outside production runtime code.
