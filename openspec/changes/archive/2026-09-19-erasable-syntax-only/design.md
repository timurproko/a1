# Design

## Explicit fields instead of parameter properties

A parameter property is the one remaining construct in the codebase that the TypeScript emitter has to expand: it declares a class field and inserts the assignment after the `super` call. `erasableSyntaxOnly` rejects it together with `enum`, `namespace`, and `import x = require()`, none of which the repository uses. The rewrite is mechanical and was produced by a script over the compiler API: for each constructor with modified parameters, insert one field declaration per parameter before the constructor (with the same `private`, `protected`, `readonly`, and `override` keywords, and the parameter's declared type or the checker's inferred type when the parameter only had an initializer), strip the modifiers from the parameter list, and add `this.x = x;` statements after the `super(...)` statement or at the start of the body.

## Optional parameters become `T | undefined` fields

Under `exactOptionalPropertyTypes`, assigning an optional parameter to an optional field is an error because the parameter's type includes `undefined`. The emitter never produced an optional field for a parameter property; it declared a field of the parameter's full type. The three sites with optional parameter properties (`pending-delivery.ts`, the component bridge in `tui-runtime/adapter.ts`, and the rendering producer error in `test/support`) therefore declare `T | undefined` fields.

## Field initializer order

The emitter orders parameter property assignments before other field initializers so that an initializer may read a parameter property. The script checked every class it rewrote for an initializer that references a rewritten field; the single hit is an arrow function that reads the field lazily, so no order changes.
