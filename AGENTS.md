# Project Direction

## Vision

This project is building a Magic-style rules engine in Go.

The goal is to create an engine with a stable gameplay core that can grow in rules complexity without repeatedly redesigning its fundamental flow.

The engine should be:

- rules-driven
- easy to reason about
- easy to debug from state and logs
- expandable in lower layers
- independent from any single UI, client, or controller

## Core Goal

The engine should model gameplay through a small number of explicit concepts:

- authoritative game state
- active player
- priority player
- explicit turn structure
- legal actions
- stack-based resolution

These are the core abstractions the project should continue to reinforce.

## Guiding Principles

### Stable gameplay loop

The most important design goal is a stable gameplay loop.

At a high level, the engine should always be understandable as:

- determine who has priority
- generate legal actions
- receive a chosen action
- apply it
- track passes
- resolve the top of the stack or advance the game when all players pass

That loop should remain simple even as the rules grow.

### Complexity belongs below the loop

New features should primarily expand lower-level helpers, not the gameplay loop itself.

If a feature is added, it should usually belong to one of these layers:

- legality and timing
- action application
- stack behavior
- effect resolution
- phase and step progression
- game object/state modeling

The event loop should not absorb card-specific or mechanic-specific edge cases.

### The engine owns the rules

The engine is the source of truth for:

- what actions are legal
- who has priority
- what happens when an action is taken
- how the stack resolves
- when the game advances
- when players win or lose

Clients should never be responsible for enforcing game rules. They should only choose from legal actions produced by the engine.

### External systems choose actions

The engine should work equally well with:

- terminal input
- AI players
- scripted replay
- future networked or graphical clients

Those systems are action selectors, not rules engines.

## Architectural Direction

### One authoritative state

The engine should maintain one authoritative mutable game state.

That state should hold the real game truth, including:

- players and life totals
- zones
- active player
- priority player
- current phase and, later, step
- mana state
- stack contents
- win/loss state

State should be mutated only through engine-controlled rules logic.

### Priority-first timing model

Timing should be expressed through priority, not through ad hoc action windows.

The engine should preserve these rules:

- only the player with priority may act
- casting a spell or activating an ability gives priority back to that player
- passing priority gives priority to the next player
- if all players pass and the stack is non-empty, the top object resolves
- after resolution, priority returns to the active player
- if all players pass and the stack is empty, the game advances

This is the correct foundation for instants, responses, and later interactions.

### Stack-based resolution

Spells and abilities should resolve through explicit stack objects rather than through immediate bespoke execution.

The stack is a core engine abstraction and should remain explicit.

### Explicit turn structure

Turn structure should be explicit.

The long-term model should be grounded in turn, phase, and step based sequencing, even if the engine only models the parts it currently needs.

### Reusable rule pieces

Card behavior should trend toward reusable rule and effect pieces rather than one-off custom control flow.

The project should prefer reusable legality, resolution, and effect primitives whenever that improves clarity without overengineering.

## Go Direction

This engine should stay Go-idiomatic.

Prefer:

- plain structs for state
- explicit transitions
- small focused helpers
- composition over inheritance
- simple public APIs

Avoid forcing Java-style abstraction trees into the project.

## Separation Of Concerns

The project should preserve clear boundaries between:

- rules engine
- card and content definitions
- action coordination and input handling
- presentation and logging
- future clients

This separation is required so the engine remains reusable and trustworthy as the surrounding tooling evolves.

## Decision Standard

When making implementation decisions, prefer the option that best preserves these qualities:

- stable core loop
- engine-owned legality and timing
- explicit state transitions
- reusable rule logic
- strong separation between rules and clients

## Guiding Principle

**Keep the gameplay loop simple. Push complexity into well-named rule helpers and explicit state transitions.**
