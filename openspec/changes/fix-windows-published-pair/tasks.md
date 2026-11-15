## 1. Settled Windows published-predecessor replacement

- [x] 1.1 Investigate the unchanged Windows predecessor update, isolate its timeout/cleanup boundary, and explicitly disposition any unreproduced inner stall.
- [x] 1.2 Repair the demonstrated process-execution or settlement cause and stop only fixture-owned descendants before cleanup.
- [x] 1.3 Add focused native Windows regression cases for replacement completion and timeout descendant settlement while retaining real predecessor semantics.

## 2. Actionable primary and cleanup failure reporting

- [ ] 2.1 Keep the primary smoke failure authoritative when cleanup also fails, and record cleanup-only failures as unsuccessful outcomes.
- [ ] 2.2 Emit bounded sanitized Actions annotations for smoke stage, primary child outcome, and secondary cleanup failure.
- [ ] 2.3 Add focused failure-precedence, redaction, annotation, and cleanup-only regression cases.
