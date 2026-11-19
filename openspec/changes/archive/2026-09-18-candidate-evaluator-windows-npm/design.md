# Design

## cross-spawn instead of a shell

`execFile` with `shell: true` also starts the shim, but Node deprecates passing an argument array through a shell (DEP0190) because the arguments are concatenated rather than escaped, and the runtime stage passes a JavaScript expression as an argument. `cross-spawn` rewrites a `.cmd` target into a `cmd.exe /d /s /c` invocation with escaped arguments on Windows and is a plain `spawn` elsewhere; the validation tier and the release scripts already run npm through it. The helper collects stdout and stderr (bounded at 1 MiB, keeping the tail) and rejects on a non-zero exit with the captured stderr, so the stage detail the report records is npm's own message rather than `spawn EINVAL`.
