# Terminal colour check

## What can go wrong

Every colour the interface draws is 24-bit: the pinned dark theme's accent is
`#8abeb7`, its border `#5f87ff`, its headings `#f0c674`. On Windows, Node decides
once at startup whether it may send those sequences to the terminal at all. It
asks the console to enable virtual terminal processing; when that fails it renders
ANSI itself, and its renderer knows only the sixteen SGR colours. Each 24-bit
colour is then replaced by the terminal's nearest palette entry, so the whole
interface shifts at once — accent to the terminal's cyan, headings to its yellow —
while the application still writes exactly the bytes it always wrote.

That decision is made per process, from the console handle the process was given,
and every process it launches inherits the result. It is a property of how the
session was started, not of what is drawn.

## Launching so colour survives

The installed command is an npm shim — a shell script that `exec`s Node — and that
shape keeps 24-bit colour. So does `pi`, for the same reason.

- Installed: `a1`, `a1 pi`
- From a checkout: `scripts/dev` and `scripts/dev pi`

`npm start` and `npm run start:pi` build first and then launch through the same
entry, but a package manager on Windows hands the script to `cmd.exe`, which can
leave the launch without a terminal on its input; the launcher says so and stops
rather than opening a session that closes as it starts. Running `scripts/dev`
from the shell is the direct path.

A directly launched `node scripts/development/start-local.mjs` under Git Bash does not, and
neither does a directly launched `node …/pi/dist/cli.js`: the collapse belongs to
the launch, not to either application.

## Checking a terminal

```
node scripts/check-terminal-colour.mjs
```

It prints the same colour as 24-bit, as a 256-colour index, and as the terminal's
own palette entry. When the first block is indistinguishable from the third, this
launch collapses colour and any comparison made in it is a comparison of two wrong
screens.

## What the gates hold

- `test/features/launch/terminal-colour-fidelity.test.ts` holds the emitted bytes:
  the pinned palette resolves to 24-bit sequences, a 256-colour terminal stays on
  indices, and the launch chain keeps inheriting the terminal it was started from
  rather than opening a console of its own.
- The reader compares `a1 pi` with pinned Pi in the same terminal. Run the colour
  check first: a launch that collapses colour makes both sessions equally wrong, so
  they would agree with each other and disagree with what a user sees.
