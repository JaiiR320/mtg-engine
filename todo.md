# TODO

## Core Model

- [ ] Add explicit supported player counter types.
  - Examples: `poison`, `energy`, `experience`, `rad`, `ticket`.
  - Decide whether this should be an enum in schemas or a more flexible typed registry.
  - Update `player.setCounters` validation once the shape is decided.
  - Consider adding helper commands like `player.adjustCounter`.

## Web Debug UI

- [ ] Move command errors directly under the Apply button.
- [ ] Add a strict JSON hint: positive numbers use `2`, not `+2`.
- [ ] Update command templates to use current default players: `Austin` and `Brendan`.
- [ ] Hide empty player counters in the UI, or label them more clearly as player counters.
