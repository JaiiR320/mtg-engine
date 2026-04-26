# Development

## Repo Layout

```text
apps/api/            Hono HTTP API and in-memory game store
packages/core/       Game creation, reducer, events, IDs, and views
packages/schemas/    Zod schemas and exported TypeScript types
rules/               Markdown Magic rules reference
docs/                Project usage and maintainer documentation
```

## Scripts

Run from the repo root:

```sh
pnpm build
pnpm check
pnpm test
pnpm format
pnpm format:check
pnpm dev:api
```

Package scripts are wired through the workspace. `build` and `check` run recursively across packages and apps.

## Conventions

- Source is TypeScript ESM using `NodeNext` module resolution.
- Shared imports use workspace package names such as `@mtg-engine/core` and `@mtg-engine/schemas`.
- Runtime validation belongs in `packages/schemas`.
- State transitions belong in `packages/core/src/reducer.ts`.
- API request handling belongs in `apps/api/src/app.ts`.
- Keep commands generic table operations instead of adding card-specific rules automation.

## Adding a Command

1. Add the command shape to `packages/schemas/src/commandSchemas.ts`.
2. Handle the command in `packages/core/src/reducer.ts`.
3. Add tests for valid behavior and invalid references.
4. Document the command in `docs/commands.md`.

## Tests

The current tests cover:

- API health, game creation, command validation, command application, and event log access.
- Engine state creation, player validation, movement, counters, status, priority, turns, stack ordering, visibility, copies, tokens, annotations, state replacement, and rejected legacy commands.
