# QA

## Findings

- **Medium:** `state.replace` can bypass new player-reference invariants. It only parses schema and does not validate `activePlayerId` / `priorityPlayerId` against `players`.
- **Low:** Owner null-clearing is not directly asserted. Current test clears controller and visibility, but not owner.
- **Low:** `object.copy` owner behavior needs a regression test where source owner differs from provided controller and `ownerPlayerId` is omitted.
- **Low:** Library-only visibility clearing is tested for `zone.reorder`, but not `zone.shuffle`.
- **Minor:** `createGame` has an unused `index` parameter in the first `map`.

## Open Questions

- Should same-zone `zone.moveMany.insertIndex` be documented as applying after removals?
- Should `state.replace` remain a raw escape hatch, or enforce the same player-reference invariants as `createGame`?

## Positive Notes

- Null-clearing API is cleaner and avoids accidental clears.
- Reducer remains simple and idiomatic overall.
- Object creation helper cleanup improved readability.
- Same-zone vs cross-zone `zone.moveMany` behavior is now coherent.
- Visibility changes align with the primitive-first tracker semantics.
- Existing check/test suite passes.
