# A1

## Install

```sh
npm install --global @timurproko/a1@latest
```

## Commands

```sh
a1              # A1-owned UI and profile: ~/.a1/agent
a1 pi           # untouched vanilla Pi oracle: ~/.pi/agent
a1 sandbox      # unchanged isolated vanilla Pi profile: ~/.a1/sandbox
a1 version      # show Installed, Release (latest), and Next versions
a1 update       # update to npm latest
a1 update:next  # update to npm next
```

## Develop

```sh
npm ci                  # install exact locked dependencies
npm run build           # compile TypeScript and the process guardian into dist
npm start               # build and launch an isolated development `a1`
npm run start:pi        # build and launch an isolated development `a1 pi`
npm run start:sandbox   # build and launch an isolated development `a1 sandbox`
npm run test:fast       # typecheck + fast suite, no build needed
npm test                # same as test:fast
npm run test:full       # complete non-physical suite
```

## Release

```sh
npm run release:next   # publish current develop tip to npm next via trusted CI workflows
```
