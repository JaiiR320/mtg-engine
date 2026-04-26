import { describe, expect, it } from "vitest";
import { gameCommandSchema } from "@mtg-engine/schemas";
import { applyCommand, createGame, toGameView } from "./index.js";

describe("virtual table engine", () => {
  it("creates a game with up to four players and named cards", () => {
    const game = createGame({
      players: [
        { name: "Jair", library: ["Lightning Bolt"] },
        { name: "Skyler" },
        { name: "Alex" },
        { name: "Bianca" },
      ],
    });

    expect(game.players).toHaveLength(4);
    expect(game.players[0]?.zones.library.objects[0]?.name).toBe("Lightning Bolt");
    expect(game.players[0]?.zones.library.objects[0]?.cardId).toBeDefined();
    expect(game.players[0]?.zones.library.objects[0]?.objectId).toBeDefined();
    expect(game.activePlayerId).toBe(game.players[0]?.id);
    expect(toGameView(game).viewMode).toBe("debug");
  });

  it("rejects incoherent initial player IDs", () => {
    expect(() =>
      createGame({
        players: [
          { id: "p1", name: "Jair" },
          { id: "p1", name: "Skyler" },
        ],
      }),
    ).toThrow("duplicate player id");
    expect(() =>
      createGame({ players: [{ id: "p1", name: "Jair" }], activePlayerId: "missing" }),
    ).toThrow("active player not found");
    expect(() =>
      createGame({ players: [{ id: "p1", name: "Jair" }], priorityPlayerId: "missing" }),
    ).toThrow("priority player not found");
  });

  it("moves cards from library to hand and records an event", () => {
    let game = createGame({ players: [{ id: "p1", name: "Jair", library: ["Opt", "Island"] }] });
    const objectIds = game.players[0]!.zones.library.objects.map((object) => object.objectId);

    const result = applyCommand(game, {
      type: "zone.moveMany",
      objectIds,
      to: { zone: "hand", playerId: "p1" },
    });
    game = result.state;

    expect(game.players[0]?.zones.library.objects).toHaveLength(0);
    expect(game.players[0]?.zones.hand.objects.map((card) => card.name)).toEqual(["Opt", "Island"]);
    expect(game.revision).toBe(1);
    expect(game.eventLog).toHaveLength(1);
    expect(result.event.type).toBe("zone.moveMany");
  });

  it("moves objects between zones and changes status", () => {
    let game = createGame({ players: [{ id: "p1", name: "Jair", hand: ["Mountain"] }] });
    const original = game.players[0]!.zones.hand.objects[0]!;

    game = applyCommand(game, {
      type: "object.move",
      objectId: original.objectId,
      to: { zone: "battlefield" },
      controllerPlayerId: "p1",
    }).state;
    const moved = game.zones.battlefield.objects[0]!;
    game = applyCommand(game, {
      type: "object.setStatus",
      objectId: moved.objectId,
      status: { tapped: true, faceDown: true, flipped: true },
    }).state;

    const permanent = game.zones.battlefield.objects[0];
    expect(permanent?.name).toBe("Mountain");
    expect(permanent?.cardId).toBe(original.cardId);
    expect(permanent?.objectId).not.toBe(original.objectId);
    expect(permanent?.status).toMatchObject({ tapped: true, faceDown: true, flipped: true });
  });

  it("sets object and player counters", () => {
    let game = createGame({ players: [{ id: "p1", name: "Jair", battlefield: ["Goblin Guide"] }] });
    const objectId = game.zones.battlefield.objects[0]!.objectId;

    game = applyCommand(game, {
      type: "object.setCounters",
      objectId,
      counters: [{ type: "+1/+1", amount: 2 }],
    }).state;
    game = applyCommand(game, {
      type: "player.setCounters",
      playerId: "p1",
      counters: [{ type: "poison", amount: 1 }],
    }).state;

    expect(game.zones.battlefield.objects[0]?.counters).toEqual([{ type: "+1/+1", amount: 2 }]);
    expect(game.players[0]?.counters).toEqual([{ type: "poison", amount: 1 }]);
  });

  it("clears counters and status on zone changes", () => {
    let game = createGame({ players: [{ id: "p1", name: "Jair", battlefield: ["Bear Cub"] }] });
    const battlefieldObjectId = game.zones.battlefield.objects[0]!.objectId;

    game = applyCommand(game, {
      type: "object.setStatus",
      objectId: battlefieldObjectId,
      status: { tapped: true },
    }).state;
    game = applyCommand(game, {
      type: "object.setCounters",
      objectId: battlefieldObjectId,
      counters: [{ type: "+1/+1", amount: 1 }],
    }).state;
    game = applyCommand(game, {
      type: "object.move",
      objectId: battlefieldObjectId,
      to: { zone: "graveyard", playerId: "p1" },
    }).state;

    const graveyardObject = game.players[0]!.zones.graveyard.objects[0]!;
    expect(graveyardObject.objectId).not.toBe(battlefieldObjectId);
    expect(graveyardObject.counters).toEqual([]);
    expect(graveyardObject.status.tapped).toBe(false);
  });

  it("adjusts life and updates turn and priority state", () => {
    let game = createGame({
      players: [
        { id: "p1", name: "Jair" },
        { id: "p2", name: "Skyler" },
      ],
    });

    game = applyCommand(game, { type: "player.adjustLife", playerId: "p1", delta: -3 }).state;
    game = applyCommand(game, { type: "player.setLife", playerId: "p1", life: 33 }).state;
    game = applyCommand(game, { type: "priority.pass", playerId: "p1" }).state;
    game = applyCommand(game, {
      type: "turn.set",
      activePlayerId: "p2",
      turnNumber: 3,
      phase: "combat",
      step: "declareAttackers",
    }).state;

    expect(game.players[0]?.life).toBe(33);
    expect(game.priorityPlayerId).toBe("p2");
    expect(game.activePlayerId).toBe("p2");
    expect(game.turnNumber).toBe(3);
    expect(game.phase).toBe("combat");
  });

  it("uses stack as an ordinary ordered zone with index 0 as top", () => {
    let game = createGame({ players: [{ id: "p1", name: "Jair" }] });

    game = applyCommand(game, {
      type: "object.create",
      object: { kind: "spell", controllerPlayerId: "p1", name: "Bottom" },
      to: { zone: "stack" },
    }).state;
    game = applyCommand(game, {
      type: "object.create",
      object: { kind: "spell", controllerPlayerId: "p1", name: "Top" },
      to: { zone: "stack" },
      insertIndex: 0,
    }).state;

    expect(game.zones.stack.objects.map((item) => item.name)).toEqual(["Top", "Bottom"]);

    const topObjectId = game.zones.stack.objects[0]!.objectId;
    game = applyCommand(game, { type: "object.delete", objectId: topObjectId }).state;
    expect(game.zones.stack.objects.map((item) => item.name)).toEqual(["Bottom"]);
  });

  it("reorders any zone by exact object IDs", () => {
    let game = createGame({
      players: [{ id: "p1", name: "Jair", library: ["One", "Two", "Three"] }],
    });
    const ids = game.players[0]!.zones.library.objects.map((object) => object.objectId);

    game = applyCommand(game, {
      type: "zone.reorder",
      zone: { zone: "library", playerId: "p1" },
      objectIds: [ids[2]!, ids[0]!, ids[1]!],
    }).state;

    expect(game.players[0]!.zones.library.objects.map((object) => object.name)).toEqual([
      "Three",
      "One",
      "Two",
    ]);
  });

  it("moves represented cards onto and off the shared stack zone", () => {
    let game = createGame({ players: [{ id: "p1", name: "Jair", hand: ["Lightning Bolt"] }] });
    const handObject = game.players[0]!.zones.hand.objects[0]!;

    game = applyCommand(game, {
      type: "object.move",
      objectId: handObject.objectId,
      to: { zone: "stack" },
      kind: "spell",
      controllerPlayerId: "p1",
      insertIndex: 0,
    }).state;

    const stackObject = game.zones.stack.objects[0]!;
    expect(game.players[0]!.zones.hand.objects).toHaveLength(0);
    expect(stackObject).toMatchObject({
      kind: "spell",
      name: "Lightning Bolt",
      ownerPlayerId: "p1",
      controllerPlayerId: "p1",
      cardId: handObject.cardId,
    });
    expect(stackObject.objectId).not.toBe(handObject.objectId);

    game = applyCommand(game, {
      type: "object.move",
      objectId: stackObject.objectId,
      to: { zone: "graveyard", playerId: "p1" },
      kind: "card",
      insertIndex: 0,
    }).state;
    expect(game.players[0]!.zones.graveyard.objects[0]?.name).toBe("Lightning Bolt");
  });

  it("creates tokens, copies objects, and sets metadata", () => {
    let game = createGame({
      players: [
        { id: "p1", name: "Jair", battlefield: ["Grizzly Bears"] },
        { id: "p2", name: "Skyler" },
      ],
    });
    const sourceObjectId = game.zones.battlefield.objects[0]!.objectId;

    game = applyCommand(game, {
      type: "object.create",
      object: { kind: "token", ownerPlayerId: "p1", controllerPlayerId: "p1", name: "Food" },
      to: { zone: "battlefield" },
    }).state;
    game = applyCommand(game, {
      type: "object.copy",
      sourceObjectId,
      to: { zone: "battlefield" },
      ownerPlayerId: "p2",
      controllerPlayerId: "p1",
    }).state;
    game = applyCommand(game, {
      type: "object.copy",
      sourceObjectId,
      to: { zone: "stack" },
      controllerPlayerId: "p1",
      insertIndex: 0,
    }).state;

    expect(game.zones.battlefield.objects.at(-2)?.kind).toBe("token");
    expect(game.zones.battlefield.objects.at(-2)?.cardId).toBeUndefined();
    expect(game.zones.battlefield.objects.at(-1)?.copySourceObjectId).toBe(sourceObjectId);
    expect(game.zones.battlefield.objects.at(-1)?.ownerPlayerId).toBe("p2");
    expect(game.zones.battlefield.objects.at(-1)?.controllerPlayerId).toBe("p1");
    expect(game.zones.stack.objects[0]?.kind).toBe("copy");
  });

  it("sets and clears visibility, controller, owner, and annotations", () => {
    let game = createGame({ players: [{ id: "p1", name: "Jair", hand: ["Island"] }] });
    const objectId = game.players[0]!.zones.hand.objects[0]!.objectId;

    game = applyCommand(game, {
      type: "object.setVisibility",
      objectId,
      visibility: { revealedTo: "all" },
    }).state;
    game = applyCommand(game, {
      type: "object.setAnnotations",
      objectId,
      annotations: ["chosen"],
    }).state;
    game = applyCommand(game, { type: "object.setOwner", objectId, ownerPlayerId: "p1" }).state;
    game = applyCommand(game, {
      type: "object.setController",
      objectId,
      controllerPlayerId: "p1",
    }).state;
    game = applyCommand(game, {
      type: "object.setController",
      objectId,
      controllerPlayerId: null,
    }).state;
    game = applyCommand(game, { type: "object.setVisibility", objectId, visibility: null }).state;

    expect(game.players[0]!.zones.hand.objects[0]?.visibility).toBeUndefined();
    expect(game.players[0]!.zones.hand.objects[0]?.annotations).toEqual(["chosen"]);
    expect(game.players[0]!.zones.hand.objects[0]?.controllerPlayerId).toBeUndefined();
  });

  it("requires explicit null to clear optional object fields", () => {
    expect(
      gameCommandSchema.safeParse({ type: "object.setController", objectId: "obj" }).success,
    ).toBe(false);
    expect(gameCommandSchema.safeParse({ type: "object.setOwner", objectId: "obj" }).success).toBe(
      false,
    );
    expect(
      gameCommandSchema.safeParse({ type: "object.setVisibility", objectId: "obj" }).success,
    ).toBe(false);
  });

  it("replaces the entire game state", () => {
    const game = createGame({ players: [{ id: "p1", name: "Jair" }] });
    const replacement = createGame({ players: [{ id: "p2", name: "Skyler", hand: ["Island"] }] });

    const result = applyCommand(game, { type: "state.replace", state: replacement });

    expect(result.state.players[0]?.id).toBe("p2");
    expect(result.state.players[0]?.zones.hand.objects[0]?.name).toBe("Island");
    expect(result.state.eventLog.at(-1)?.type).toBe("state.replace");
  });

  it("rejects structurally valid commands that reference missing IDs", () => {
    const game = createGame({ players: [{ id: "p1", name: "Jair" }] });

    expect(() =>
      applyCommand(game, {
        type: "object.setStatus",
        objectId: "missing",
        status: { tapped: true },
      }),
    ).toThrow("object not found");
  });

  it("rejects legacy card and stack command names", () => {
    expect(gameCommandSchema.safeParse({ type: "card.draw", playerId: "p1" }).success).toBe(false);
    expect(gameCommandSchema.safeParse({ type: "stack.resolveTop" }).success).toBe(false);
  });
});
