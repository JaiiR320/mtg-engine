# MTG Engine Docs

MTG Engine is a TypeScript workspace for tracking a Magic: The Gathering table state.
It provides:

- A runtime-agnostic core package for creating game state and applying table commands in any TypeScript host.
- Zod schemas for validating state, commands, API responses, and stream messages.
- A Hono API app that stores multiple in-memory games and exposes HTTP endpoints as an optional host around core.
- A Vite React debug UI for creating games, viewing zones, and applying raw commands.
- Local Markdown copies of Magic rules under `rules/` for rules research and reference.

## Docs

- [Usage](usage.md): run the app and call the HTTP API.
- [Commands](commands.md): supported command types and common examples.
- [Internals](internals.md): how state, zones, objects, events, and views work.
- [Development](development.md): repo layout, scripts, and conventions.

## What It Does

- Tracks players, life totals, counters, turns, priority, zones, objects, and event history.
- Supports common table operations such as moving objects, shuffling zones, creating tokens, copying objects, setting visibility, and replacing state.
- Supports adding players to a table as a primitive command.
- Creates and transforms plain state objects with `createGame` and `applyCommand`.
- Validates request and command shape with Zod when callers use the shared schemas.
- Returns a debug view of the full game state.

## What It Does Not Do Yet

- It does not implement full Magic rules automation.
- It does not know card Oracle text, costs, legal targets, triggered abilities, replacement effects, or turn-based actions.
- It does not persist games to a database.
- It does not authenticate users yet; the web app uses a local development identity.
- It does not hide private zones in API views; current views are `debug` views.
