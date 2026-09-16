# Implementation Validation Evidence

Recorded: 2026-09-16T12:42:50Z

## Regression reproduction

Before the lifecycle implementation, the focused session-shell regression produced three expected failures: `/quit` and double `Ctrl+C` both left `shell.runtime.active` true, and overlapping shutdown requests called the backend quit workflow twice.

## Passing evidence

- Focused session-shell lifecycle and restoration scope: 8 passed, including both exit routes, overlapping requests, configured post-restoration output, and bounded cleanup failures.
- Quit autocomplete component scope: 1 passed with the exact `Quit` description.
- Child-process graceful-quit scope: 2 passed; `/quit` and double `Ctrl+C` each exited zero with a deliberately retained extension-style listening server, stopped the runtime, restored alternate-screen and mouse modes, and emitted the parent-shell continuation marker.
- Independent command-outcome parity, truecolor scope: passed with the quit route inactive after completion and no message-output divergence.
- TypeScript project typecheck: passed.

## Live acceptance refinement

Manual validation after the first finalized candidate restored the owned presentation but left the interactive process alive with a blinking cursor and no parent-shell prompt. A production PTY reproduction confirmed that all shell, backend, presentation, and outer-runner cleanup completed; an extension-created listening server remained as an active Node handle, so assigning `process.exitCode = 0` did not terminate the executable. The original child fixture had no retained event-loop handle and therefore missed this boundary condition.

The strengthened fixture reproduced two expected pre-fix timeouts, one for each quit route. After executable-boundary completion was added, both retained-handle cases passed. A rebuilt supported development launch with the configured extension server also exited zero after `/quit` and after double `Ctrl+C`, returning control about 2.2 seconds after each request. Bootstrap-boundary wiring (9 tests), owned runner behavior (6 tests), focused shell shutdown (3 tests), build, strict OpenSpec validation, and typechecking passed; the independent command-outcome parity scope passed all 4 tests.

The first refined exact-head CI run failed only changed-file documentation governance (`DOC005`) because the retained-handle fixture's implementation comment used an unapproved `Regression:` prefix. The comment was relabeled with the required `Rationale:` prefix without changing behavior, and the full local code-documentation policy passed before refinalization.

## Prompt-return latency refinement

Live timing instrumentation on the supported repository-local launcher showed owned shutdown, terminal restoration, history cleanup, and output drain completing in approximately 70 ms. With Node's compile cache enabled in the freshly built development UI child, the launcher observed child close roughly 1.8–2.1 seconds after `process.exit()` began; setting `NODE_DISABLE_COMPILE_CACHE=1` for that child reduced this interval to roughly 20 ms. The remaining delay in the automated ConPTY harness is its own exit-notification overhead and occurs after the launched process has closed.

The repository-local launcher now disables Node compile-cache persistence only in direct interactive development children. The focused development-launch scope passed all 8 tests and asserts the opt-out for both owned A1 and Pi comparison profiles. After a fresh rebuild, production-composition PTY probes for `/quit` and double `Ctrl+C` both exited zero; the harness observed completion about 1.1–1.2 seconds after input versus roughly 2.2–3.3 seconds before, with approximately one second attributable to the outer ConPTY harness after launched-process close.

## Gap disposition

No known implementation or validation gaps remain after the prompt-return latency refinement. Full regression and native host gates remain CI-owned under repository policy.
