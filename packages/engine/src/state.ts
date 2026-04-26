import type { GameState, GameObject, NewGameRequest, PlayerState, Zone } from "@mtg-engine/schemas";
import { createId } from "./ids.js";

const playerZones = ["library", "hand", "graveyard"] as const;
const sharedZones = ["battlefield", "exile", "command"] as const;

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
        graveyard: createCards(player.graveyard ?? [], playerId, playerId),
      },
    };
  });

  const battlefield = request.players.flatMap((player, index) =>
    createCards(player.battlefield ?? [], players[index]!.id, players[index]!.id),
  );
  const exile = request.players.flatMap((player, index) =>
    createCards(player.exile ?? [], players[index]!.id, players[index]!.id),
  );
  const command = request.players.flatMap((player, index) =>
    createCards(player.command ?? [], players[index]!.id, players[index]!.id),
  );

  return {
    id: "single",
    revision: 0,
    players,
    activePlayerId: request.activePlayerId ?? players[0]?.id,
    priorityPlayerId: request.priorityPlayerId ?? players[0]?.id,
    turnNumber: request.turnNumber ?? 1,
    phase: request.phase,
    step: request.step,
    battlefield,
    exile,
    command,
    stack: [],
    eventLog: [],
  };
}

export function emptyGame(): GameState {
  return createGame({ players: [{ name: "Player 1" }, { name: "Player 2" }] });
}

export function allZones(): readonly Zone[] {
  return [...playerZones, ...sharedZones];
}

export function allPlayerZones(): typeof playerZones {
  return playerZones;
}

export function allSharedZones(): typeof sharedZones {
  return sharedZones;
}

function createCards(
  names: string[],
  ownerPlayerId: string,
  controllerPlayerId: string,
): GameObject[] {
  return names.map((name) => ({
    objectId: createId("obj"),
    cardId: createId("card"),
    kind: "card",
    ownerPlayerId,
    controllerPlayerId,
    name,
    counters: [],
    tapped: false,
    faceDown: false,
    flipped: false,
    phasedOut: false,
    annotations: [],
  }));
}
