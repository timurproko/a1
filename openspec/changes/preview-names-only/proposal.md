## Why

`update:<name>` resolved a name by exact match against everything the registry
published — releases included. So `a1 update:0.1.7` installed a release through
the preview path, recording it as a preview update. Nobody asked for that; it fell
out of matching the whole version list.

The commit form cannot express a release, so this only ever appeared through the
fuller spelling. It should say no.

## What Changes

- A release named after the colon is refused, saying it is a release and pointing
  at `a1 update`.
- A preview's full version still works there, because that is the string
  `a1 --version` prints and pasting it back is the natural thing to do.
- The README shows only the commit form. The version form is documented as the
  forgiving spelling it is, not as a second way of doing the same thing.

## Capabilities

### Modified Capabilities

- `cli-self-update`: naming a build after the colon names a preview, and a release
  named there is refused rather than installed.
