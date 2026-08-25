## 1. Give the event loop its turns back

- [x] 1.1 Deliver queued engine events in bounded batches that yield to the event loop
  between them, instead of draining the queue inside one microtask
- [ ] 1.2 Handle each event for what it is: a transcript update SHALL touch the block it
  names, and only a view event SHALL resynchronize the view
- [x] 1.3 Stop building the view model twice per event in the session shell

## 2. Make per-event work independent of transcript length

- [x] 2.1 Index transcript blocks by identifier in the engine adapter so an update stops
  scanning for its block
- [x] 2.2 Hand out the transcript without copying every block on every read
- [x] 2.3 Index blocks by identifier in the shell root and place anchored components
  through a set, so neither the order rebuild nor the document render scans the transcript

## 3. Render like the pinned shell

- [ ] 3.1 Keep one live component for the streaming block and mutate it in place
- [x] 3.2 Cache a finalized block's rendered rows against its revision and width, so an
  unchanged block is not re-rendered to produce a frame
- [ ] 3.3 Rebuild the document only where the pinned shell rebuilds it

## 4. Separate the working states

- [x] 4.1 Key the status indicator by kind and clear by kind, so ending one kind of work
  leaves another standing
- [x] 4.2 Leave a turn's own state when the turn ends, as the recorded pinned baseline
  does, without clearing a compaction or retry state the turn never started
- [x] 4.3 End retry and compaction states by returning to working while the run is active,
  and to idle only when it is not
- [ ] 4.4 Rebuild the transcript only where the pinned shell rebuilds it, not on every turn
  that ends

## 5. Pair pointer reporting against every teardown

- [ ] 5.1 Disable reporting from session shutdown, session replacement, and surface disposal
- [ ] 5.2 Cover the teardown paths in the conformance check that already asserts terminal
  native selection

## 6. Validate and integrate

- [ ] 6.1 `npm run typecheck`, `npm run check:architecture`, and `openspec validate --strict` pass
- [ ] 6.2 Open the pull request and let CI validate
- [ ] 6.3 Record manual acceptance — a long streaming run stays typeable, the working
  indicator survives settlement and automatic compaction, and the wheel and selection work
  during and after the run — then archive
