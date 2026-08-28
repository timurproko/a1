## Why

Publication is required to bind evidence to the source commit, version, integrity,
*declared certification status*, and applicable gate results. The first three the
pipeline does and re-checks. The last two belong to a pipeline that no longer
exists: certification status was the vocabulary of the dispatch chain, where a
preview had to announce that physical and cross-platform certification were
deferred so nobody mistook it for a release candidate.

Nothing produces those records now, and nothing reads them — no workflow, no gate,
no person. What replaced them says the same thing more plainly: a preview goes to
the `next` tag and a release goes to `latest`, and the tag is what anyone actually
consults.

Leaving the requirement in place keeps an implementation alive that nothing calls
and a policy guarding a file that no longer exists — the appearance of a promise
being kept, with nothing keeping it.

## What Changes

- Publication binds the source commit, the version, and the package digest, and
  publishes exactly those bytes. The declared-certification-status record and the
  gate-result record are no longer required.
- What separates a preview from a release stays where it is observable: the npm tag
  it is published under, and the fact that a preview never moves `latest`.
- The evidence model for that retired vocabulary is removed, along with the
  architecture guards that policed a publisher script deleted with the old
  pipeline.

## Capabilities

### Modified Capabilities

- `isolated-regression-testing`: publication binds what identifies the bytes rather
  than also declaring a certification status nothing consumes.
