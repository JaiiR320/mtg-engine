# TODO

## Core Model

- [ ] Add explicit supported player counter types.
  - Examples: `poison`, `energy`, `experience`, `rad`, `ticket`.
  - Decide whether this should be an enum in schemas or a more flexible typed registry.
  - Update `player.setCounters` validation once the shape is decided.
  - Consider adding helper commands like `player.adjustCounter`.

## Web Debug UI

- [x] Move command errors directly under the Apply button.
- [x] Add a strict JSON hint: positive numbers use `2`, not `+2`.
- [x] Update command templates to use the current development player identity.
- [ ] Hide empty player counters in the UI, or label them more clearly as player counters.

## Product Flow

- [ ] Replace the temporary localStorage development identity with real authentication.
- [ ] Add deck/library setup after a player joins a game.
- [ ] Decide when and how setup UI seeds starting life, active player, priority, turn, phase, and step.
- [ ] Add persistence for API game records.
