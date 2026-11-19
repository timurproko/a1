## Decision

Messages say what is not supported and nothing about plans:

| Today | New |
| --- | --- |
| `<command> is not available yet; resource/maintenance delivery is pending.` | `<command> is not supported.` |
| `<option> is not available yet in this partial delivery of default Pi compatibility.` | `<option> is not supported.` |
| `File/image inputs are not available yet; the shared input transport is pending.` | `File and image inputs (@path) are not supported.` |
| help: `Default Pi parity is being delivered in stages; ...` | `Pi options not listed here are not supported and fail with an error.` |
| help: `...; larger input transport is pending.` | `...; larger input is not supported.` |

Behaviour (which inputs fail, exit codes) is unchanged.
