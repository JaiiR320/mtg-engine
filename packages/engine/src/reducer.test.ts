import { beforeEach, describe, expect, it } from "vitest";
import { applyCommand, createGame, resetIdsForTests, toGameView } from "./index.js";

describe("virtual table engine", () => {
  beforeEach(() => resetIdsForTests());

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
    const cardId = game.players[0]!.zones.hand[0]!.id;

    game = applyCommand(game, {
      type: "card.move",
      cardId,
      toPlayerId: "p1",
      toZone: "battlefield",
    }).state;
    game = applyCommand(game, { type: "card.tap", cardId }).state;
    game = applyCommand(game, { type: "card.setFaceDown", cardId, faceDown: true }).state;
    game = applyCommand(game, { type: "card.setFlipped", cardId, flipped: true }).state;

    const permanent = game.players[0]?.zones.battlefield[0];
    expect(permanent?.name).toBe("Mountain");
    expect(permanent?.tapped).toBe(true);
    expect(permanent?.faceDown).toBe(true);
    expect(permanent?.flipped).toBe(true);
  });

  it("adds and removes counters", () => {
    let game = createGame({ players: [{ id: "p1", name: "Jair", battlefield: ["Goblin Guide"] }] });
    const cardId = game.players[0]!.zones.battlefield[0]!.id;

    game = applyCommand(game, {
      type: "card.addCounter",
      cardId,
      counterType: "+1/+1",
      amount: 3,
    }).state;
    game = applyCommand(game, {
      type: "card.removeCounter",
      cardId,
      counterType: "+1/+1",
      amount: 1,
    }).state;

    expect(game.players[0]?.zones.battlefield[0]?.counters).toEqual([{ type: "+1/+1", amount: 2 }]);
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

    const stackItemId = game.stack[0]!.id;
    game = applyCommand(game, { type: "stack.remove", stackItemId }).state;
    expect(game.stack).toHaveLength(0);
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

    expect(() => applyCommand(game, { type: "card.tap", cardId: "missing" })).toThrow(
      "card not found",
    );
  });
});
