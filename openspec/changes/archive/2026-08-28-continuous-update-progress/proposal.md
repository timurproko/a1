## Why

`a1 update` draws a progress bar, and the bar stops at 85% and stays there until
the update is finished. Two things put it there.

The bar moves between milestones by creeping asymptotically toward the next one
and settling half a point below it. Half a point below 85 renders as 85, so the
creep's resting place and the milestone are the same number, and reaching the
milestone changes nothing on screen.

Underneath that, the longest step in the whole update has no milestones inside it.
Copying the installed package into an immutable release reads and writes every
shipped file, and it runs entirely between "installed" and "materialized" with the
bar parked. The release store already reports the file it is on and how many there
are — the update simply never asked.

A bar that stops moving is worse than no bar: it says the update has hung.

## What Changes

- Copying the release drives the bar file by file across 78–92, so the longest
  step is the one that moves most rather than the one that appears frozen.
- The creep between milestones rests a whole point below the next milestone, so
  arriving at one is a visible change instead of a repaint of the same number.
- The remaining activation milestones move up to sit above the copy span.
- Nothing new is printed. The file count reaches the terminal only as the
  percentage of the existing single-line bar, never as a name or a running count,
  and launch keeps saying nothing about activation at all.

## Capabilities

### Modified Capabilities

- `cli-self-update`: the update's progress reporting has to reflect the work being
  done rather than only the milestones between the work.
