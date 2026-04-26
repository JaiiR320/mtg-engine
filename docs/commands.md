# Commands

Commands are JSON objects with a `type` field. The API validates command shape with Zod, then the engine validates references such as player IDs, object IDs, and zone ownership.

## Zones

Player zones require `playerId`:

- `library`
- `hand`
- `graveyard`

Shared zones must not include `playerId`:

- `battlefield`
- `stack`
- `exile`
- `command`

Example zone refs:

```json
{ "zone": "hand", "playerId": "p1" }
```

```json
{ "zone": "battlefield" }
```

## Player Commands

- `player.adjustLife`: add a signed integer delta to a player's life.
- `player.setLife`: set a player's life total.
- `player.setCounters`: replace all counters on a player.

```json
{ "type": "player.adjustLife", "playerId": "p1", "delta": -3 }
```

## Object Commands

- `object.create`: create a new object in a zone.
- `object.move`: move one object to another zone.
- `object.delete`: remove an object.
- `object.copy`: copy an existing object to a zone.
- `object.setStatus`: update tapped, face-down, flipped, or phased-out status.
- `object.setCounters`: replace all counters on an object.
- `object.setController`: set or clear controller.
- `object.setOwner`: set or clear owner.
- `object.setVisibility`: set or clear visibility.
- `object.setAnnotations`: replace free-form annotations.

Move a card from library to hand:

```json
{
  "type": "object.move",
  "objectId": "obj_...",
  "to": { "zone": "hand", "playerId": "p1" }
}
```

Create a token:

```json
{
  "type": "object.create",
  "object": {
    "kind": "token",
    "ownerPlayerId": "p1",
    "controllerPlayerId": "p1",
    "name": "Food"
  },
  "to": { "zone": "battlefield" }
}
```

Clear optional object fields with explicit `null`:

```json
{ "type": "object.setController", "objectId": "obj_...", "controllerPlayerId": null }
```

## Zone Commands

- `zone.reorder`: replace a zone order with the exact full list of object IDs.
- `zone.shuffle`: shuffle a zone.
- `zone.moveMany`: move one or more objects to a destination zone.

```json
{
  "type": "zone.moveMany",
  "objectIds": ["obj_1", "obj_2"],
  "to": { "zone": "hand", "playerId": "p1" }
}
```

## Turn and Priority Commands

- `priority.set`: set or clear the player with priority.
- `priority.pass`: pass priority to the next player in player order.
- `turn.set`: update active player, turn number, phase, or step.

```json
{
  "type": "turn.set",
  "activePlayerId": "p2",
  "turnNumber": 3,
  "phase": "combat",
  "step": "declareAttackers"
}
```

## Utility Commands

- `note.add`: add an event-log note without changing state.
- `state.replace`: replace the entire validated game state.

Use `state.replace` carefully. It validates structure, then records a replacement event and increments the replacement state's revision.
