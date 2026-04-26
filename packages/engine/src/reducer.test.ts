import { describe, expect, it } from "vitest";
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
    expect(game.players[0]?.zones.library[0]?.name).toBe("Lightning Bolt");
    expect(game.players[0]?.zones.library[0]?.cardId).toBeDefined();
    expect(game.players[0]?.zones.library[0]?.objectId).toBeDefined();
    expect(game.activePlayerId).toBe(game.players[0]?.id);
    expect(toGameView(game).viewMode).toBe("debug");
  });

  it("draws cards from library to hand and records an event", () => {
    let game = createGame({ players: [{ id: "p1", name: "Jair", library: ["Opt", "Island"] }] });

    const result = applyCommand(game, { type: "card.draw", playerId: "p1", count: 2 });
    game = result.state;

    expect(game.players[0]?.zones.library).toHaveLength(0);
    expect(game.players[0]?.zones.hand.map((card) => card.name)).toEqual(["Opt", "Island"]);
    expect(game.revision).toBe(1);
    expect(game.eventLog).toHaveLength(1);
    expect(result.event.type).toBe("card.draw");
  });

  it("moves cards between zones and toggles card state", () => {
    let game = createGame({ players: [{ id: "p1", name: "Jair", hand: ["Mountain"] }] });
    const original = game.players[0]!.zones.hand[0]!;

    game = applyCommand(game, {
      type: "card.move",
      objectId: original.objectId,
      toPlayerId: "p1",
      toZone: "battlefield",
    }).state;
    const moved = game.battlefield[0]!;
    game = applyCommand(game, { type: "card.tap", objectId: moved.objectId }).state;
    game = applyCommand(game, {
      type: "card.setFaceDown",
      objectId: moved.objectId,
      faceDown: true,
    }).state;
    game = applyCommand(game, {
      type: "card.setFlipped",
      objectId: moved.objectId,
      flipped: true,
    }).state;

    const permanent = game.battlefield[0];
    expect(permanent?.name).toBe("Mountain");
    expect(permanent?.cardId).toBe(original.cardId);
    expect(permanent?.objectId).not.toBe(original.objectId);
    expect(permanent?.tapped).toBe(true);
    expect(permanent?.faceDown).toBe(true);
    expect(permanent?.flipped).toBe(true);
  });

  it("adds and removes counters", () => {
    let game = createGame({ players: [{ id: "p1", name: "Jair", battlefield: ["Goblin Guide"] }] });
    const objectId = game.battlefield[0]!.objectId;

    game = applyCommand(game, {
      type: "card.addCounter",
      objectId,
      counterType: "+1/+1",
      amount: 3,
    }).state;
    game = applyCommand(game, {
      type: "card.removeCounter",
      objectId,
      counterType: "+1/+1",
      amount: 1,
    }).state;

    expect(game.battlefield[0]?.counters).toEqual([{ type: "+1/+1", amount: 2 }]);
  });

  it("clears counters and status on zone changes", () => {
    let game = createGame({ players: [{ id: "p1", name: "Jair", battlefield: ["Bear Cub"] }] });
    const battlefieldObjectId = game.battlefield[0]!.objectId;

    game = applyCommand(game, { type: "card.tap", objectId: battlefieldObjectId }).state;
    game = applyCommand(game, {
      type: "card.addCounter",
      objectId: battlefieldObjectId,
      counterType: "+1/+1",
    }).state;
    game = applyCommand(game, {
      type: "card.move",
      objectId: battlefieldObjectId,
      toZone: "graveyard",
    }).state;

    const graveyardObject = game.players[0]!.zones.graveyard[0]!;
    expect(graveyardObject.objectId).not.toBe(battlefieldObjectId);
    expect(graveyardObject.counters).toEqual([]);
    expect(graveyardObject.tapped).toBe(false);
  });

  it("adjusts life and updates turn and priority state", () => {
    let game = createGame({
      players: [
        { id: "p1", name: "Jair" },
        { id: "p2", name: "Skyler" },
      ],
    });

    game = applyCommand(game, { type: "player.adjustLife", playerId: "p1", delta: -3 }).state;
    game = applyCommand(game, { type: "priority.pass", playerId: "p1" }).state;
    game = applyCommand(game, {
      type: "turn.set",
      activePlayerId: "p2",
      turnNumber: 3,
      phase: "combat",
      step: "declareAttackers",
    }).state;

    expect(game.players[0]?.life).toBe(37);
    expect(game.priorityPlayerId).toBe("p2");
    expect(game.activePlayerId).toBe("p2");
    expect(game.turnNumber).toBe(3);
    expect(game.phase).toBe("combat");
  });

  it("advances step as an explicit convenience helper", () => {
    let game = createGame({ players: [{ id: "p1", name: "Jair" }] });

    game = applyCommand(game, { type: "turn.nextStep" }).state;
    game = applyCommand(game, { type: "turn.nextStep" }).state;

    expect(game.step).toBe("upkeep");
    expect(game.phase).toBe("beginning");
  });

  it("adds, removes, and resolves stack items", () => {
    let game = createGame({ players: [{ id: "p1", name: "Jair" }] });

    game = applyCommand(game, {
      type: "stack.add",
      controllerPlayerId: "p1",
      name: "Lightning Bolt",
    }).state;
    game = applyCommand(game, {
      type: "stack.add",
      controllerPlayerId: "p1",
      name: "Counterspell",
    }).state;
    expect(game.stack.map((item) => item.name)).toEqual(["Lightning Bolt", "Counterspell"]);

    game = applyCommand(game, { type: "stack.resolveTop" }).state;
    expect(game.stack.map((item) => item.name)).toEqual(["Lightning Bolt"]);

    const stackObjectId = game.stack[0]!.objectId;
    game = applyCommand(game, { type: "stack.remove", objectId: stackObjectId }).state;
    expect(game.stack).toHaveLength(0);
  });

  it("keeps stack ordered bottom-to-top and resolves the top object", () => {
    let game = createGame({ players: [{ id: "p1", name: "Jair" }] });

    game = applyCommand(game, {
      type: "stack.add",
      controllerPlayerId: "p1",
      name: "Bottom",
    }).state;
    game = applyCommand(game, { type: "stack.add", controllerPlayerId: "p1", name: "Top" }).state;
    game = applyCommand(game, {
      type: "stack.add",
      controllerPlayerId: "p1",
      name: "New Bottom",
      position: "bottom",
    }).state;

    expect(game.stack.map((item) => item.name)).toEqual(["New Bottom", "Bottom", "Top"]);

    const reorderedIds = [
      game.stack[1]!.objectId,
      game.stack[2]!.objectId,
      game.stack[0]!.objectId,
    ];
    game = applyCommand(game, { type: "stack.reorder", objectIds: reorderedIds }).state;
    expect(game.stack.map((item) => item.name)).toEqual(["Bottom", "Top", "New Bottom"]);

    game = applyCommand(game, { type: "stack.resolveTop" }).state;
    expect(game.stack.map((item) => item.name)).toEqual(["Bottom", "Top"]);
  });

  it("moves represented cards onto the shared stack zone", () => {
    let game = createGame({ players: [{ id: "p1", name: "Jair", hand: ["Lightning Bolt"] }] });
    const handObject = game.players[0]!.zones.hand[0]!;

    game = applyCommand(game, {
      type: "card.move",
      objectId: handObject.objectId,
      toZone: "stack",
      toPlayerId: "p1",
    }).state;

    expect(game.players[0]!.zones.hand).toHaveLength(0);
    expect(game.stack).toHaveLength(1);
    expect(game.stack[0]).toMatchObject({
      kind: "spell",
      name: "Lightning Bolt",
      ownerPlayerId: "p1",
      controllerPlayerId: "p1",
      representedCardId: handObject.cardId,
    });
    expect(game.stack[0]!.objectId).not.toBe(handObject.objectId);
  });

  it("creates tokens and copies objects", () => {
    let game = createGame({
      players: [{ id: "p1", name: "Jair", battlefield: ["Grizzly Bears"] }],
    });
    const sourceObjectId = game.battlefield[0]!.objectId;

    game = applyCommand(game, { type: "token.create", ownerPlayerId: "p1", name: "Food" }).state;
    game = applyCommand(game, {
      type: "object.copy",
      sourceObjectId,
      destination: "battlefield",
      controllerPlayerId: "p1",
    }).state;
    game = applyCommand(game, {
      type: "object.copy",
      sourceObjectId,
      destination: "stack",
      controllerPlayerId: "p1",
    }).state;

    expect(game.battlefield.at(-2)?.kind).toBe("token");
    expect(game.battlefield.at(-2)?.cardId).toBeUndefined();
    expect(game.battlefield.at(-1)?.copySourceObjectId).toBe(sourceObjectId);
    expect(game.stack.at(-1)?.kind).toBe("copy");
  });

  it("replaces the entire game state", () => {
    const game = createGame({ players: [{ id: "p1", name: "Jair" }] });
    const replacement = createGame({ players: [{ id: "p2", name: "Skyler", hand: ["Island"] }] });

    const result = applyCommand(game, { type: "state.replace", state: replacement });

    expect(result.state.players[0]?.id).toBe("p2");
    expect(result.state.players[0]?.zones.hand[0]?.name).toBe("Island");
    expect(result.state.eventLog.at(-1)?.type).toBe("state.replace");
  });

  it("rejects structurally valid commands that reference missing IDs", () => {
    const game = createGame({ players: [{ id: "p1", name: "Jair" }] });

    expect(() => applyCommand(game, { type: "card.tap", objectId: "missing" })).toThrow(
      "object not found",
    );
  });
});
