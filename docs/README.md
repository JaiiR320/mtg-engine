# MTG Engine Docs

MTG Engine is a TypeScript workspace for tracking a Magic: The Gathering table state.
It provides:

- A small engine package for creating game state and applying table commands.
- Zod schemas for validating state, commands, API responses, and stream messages.
- A Hono API app that stores one in-memory game and exposes HTTP endpoints.
- Local Markdown copies of Magic rules under `rules/` for rules research and reference.

## Docs

- [Usage](usage.md): run the app and call the HTTP API.
- [Commands](commands.md): supported command types and common examples.
- [Internals](internals.md): how state, zones, objects, events, and views work.
- [Development](development.md): repo layout, scripts, and conventions.

## What It Does

- Tracks players, life totals, counters, turns, priority, zones, objects, and event history.
- Supports common table operations such as moving objects, shuffling zones, creating tokens, copying objects, setting visibility, and replacing state.
- Validates request and command shape with Zod before API commands reach the engine.
- Returns a debug view of the full game state.

## What It Does Not Do Yet

- It does not implement full Magic rules automation.
- It does not know card Oracle text, costs, legal targets, triggered abilities, replacement effects, or turn-based actions.
- It does not persist games to a database.
- It does not manage multiple simultaneous games; the current API store holds one game named `single`.
- It does not hide private zones in API views; current views are `debug` views.
