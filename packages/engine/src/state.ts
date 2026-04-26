import type {
  CardInstance,
  GameState,
  NewGameRequest,
  PlayerState,
  Zone,
} from "@mtg-engine/schemas";
import { createId } from "./ids.js";

const zones: Zone[] = ["library", "hand", "battlefield", "graveyard", "exile", "command"];

export function createGame(request: NewGameRequest): GameState {
  const players = request.players.map((player, index): PlayerState => {
    const playerId = player.id ?? createId("player");

    return {
      id: playerId,
      name: player.name,
      life: player.life ?? 40,
      counters: [],
      zones: {
        library: createCards(player.library ?? [], playerId, playerId),
        hand: createCards(player.hand ?? [], playerId, playerId),
        battlefield: createCards(player.battlefield ?? [], playerId, playerId),
        graveyard: createCards(player.graveyard ?? [], playerId, playerId),
        exile: createCards(player.exile ?? [], playerId, playerId),
        command: createCards(player.command ?? [], playerId, playerId),
      },
    };
  });

  return {
    id: "single",
    revision: 0,
    players,
    activePlayerId: request.activePlayerId ?? players[0]?.id,
    priorityPlayerId: request.priorityPlayerId ?? players[0]?.id,
    turnNumber: request.turnNumber ?? 1,
    phase: request.phase,
    step: request.step,
    stack: [],
    eventLog: [],
  };
}

export function emptyGame(): GameState {
  return createGame({ players: [{ name: "Player 1" }, { name: "Player 2" }] });
}

export function allZones(): Zone[] {
  return zones;
}

function createCards(
  names: string[],
  ownerPlayerId: string,
  controllerPlayerId: string,
): CardInstance[] {
  return names.map((name) => ({
    id: createId("card"),
    ownerPlayerId,
    controllerPlayerId,
    name,
    tapped: false,
    faceDown: false,
    flipped: false,
    counters: [],
    annotations: [],
  }));
}
