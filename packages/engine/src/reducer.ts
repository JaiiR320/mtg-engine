import type {
  Counter,
  GameCommand,
  GameEvent,
  GameObject,
  GameState,
  PlayerState,
  Step,
  Zone,
} from "@mtg-engine/schemas";
import { gameStateSchema } from "@mtg-engine/schemas";
import { createEvent } from "./events.js";
import { createId } from "./ids.js";
import { allPlayerZones, allSharedZones } from "./state.js";

export class GameCommandError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GameCommandError";
  }
}

export type ApplyCommandResult = {
  state: GameState;
  event: GameEvent;
};

const stepOrder: Step[] = [
  "untap",
  "upkeep",
  "draw",
  "beginningOfCombat",
  "declareAttackers",
  "declareBlockers",
  "combatDamage",
  "endOfCombat",
  "end",
  "cleanup",
];

export function applyCommand(current: GameState, command: GameCommand): ApplyCommandResult {
  if (command.type === "state.replace") {
    const nextState = gameStateSchema.parse(structuredClone(command.state));
    const event = createEvent(nextState.revision + 1, command, "Replaced the full game state");
    nextState.revision = event.revision;
    nextState.eventLog = [...nextState.eventLog, event];
    return { state: nextState, event };
  }

  const state = structuredClone(current);
  const message = mutate(state, command);
  const actorPlayerId = actorFor(command);
  const event = createEvent(state.revision + 1, command, message, actorPlayerId);
  state.revision = event.revision;
  state.eventLog.push(event);
  return { state, event };
}

function mutate(
  state: GameState,
  command: Exclude<GameCommand, { type: "state.replace" }>,
): string {
  switch (command.type) {
    case "player.adjustLife": {
      const player = requirePlayer(state, command.playerId);
      player.life += command.delta;
      return `${player.name} life ${formatDelta(command.delta)} to ${player.life}`;
    }
    case "card.draw": {
      const player = requirePlayer(state, command.playerId);
      const count = command.count ?? 1;
      const drawn = player.zones.library
        .splice(0, count)
        .map((object) => resetForZoneChange(object));
      player.zones.hand.push(...drawn);
      return `${player.name} drew ${drawn.length} card${drawn.length === 1 ? "" : "s"}`;
    }
    case "card.move": {
      const found = removeObject(state, command.objectId);
      const destinationPlayerId = command.toPlayerId ?? found.object.ownerPlayerId;
      const moved = resetForZoneChange(found.object, {
        controllerPlayerId: command.toZone === "battlefield" ? destinationPlayerId : undefined,
        faceDown: command.enterFaceDown,
        flipped: command.enterFlipped,
        tapped: command.enterTapped,
      });
      insertObject(state, moved, command.toZone, destinationPlayerId, command.position);
      return `Moved ${moved.name} to ${zoneLabel(state, command.toZone, destinationPlayerId)}`;
    }
    case "card.tap":
      return setObjectFlag(state, command.objectId, "tapped", true);
    case "card.untap":
      return setObjectFlag(state, command.objectId, "tapped", false);
    case "card.setTapped":
      return setObjectFlag(state, command.objectId, "tapped", command.tapped);
    case "card.setFaceDown":
      return setObjectFlag(state, command.objectId, "faceDown", command.faceDown);
    case "card.setFlipped":
      return setObjectFlag(state, command.objectId, "flipped", command.flipped);
    case "card.addCounter": {
      const { object } = findObject(state, command.objectId);
      addCounter(object.counters, command.counterType, command.amount ?? 1);
      return `Added ${command.amount ?? 1} ${command.counterType} counter${(command.amount ?? 1) === 1 ? "" : "s"} to ${object.name}`;
    }
    case "card.removeCounter": {
      const { object } = findObject(state, command.objectId);
      removeCounter(object.counters, command.counterType, command.amount ?? 1);
      return `Removed ${command.amount ?? 1} ${command.counterType} counter${(command.amount ?? 1) === 1 ? "" : "s"} from ${object.name}`;
    }
    case "priority.set": {
      if (command.playerId !== undefined) requirePlayer(state, command.playerId);
      state.priorityPlayerId = command.playerId;
      return command.playerId
        ? `Priority set to ${requirePlayer(state, command.playerId).name}`
        : "Priority cleared";
    }
    case "priority.pass": {
      const from = command.playerId ?? state.priorityPlayerId;
      if (from !== undefined) requirePlayer(state, from);
      state.priorityPlayerId = nextPlayerId(state, from);
      return state.priorityPlayerId
        ? `Priority passed to ${requirePlayer(state, state.priorityPlayerId).name}`
        : "Priority pass had no next player";
    }
    case "turn.set": {
      if (command.activePlayerId !== undefined) requirePlayer(state, command.activePlayerId);
      state.activePlayerId = command.activePlayerId ?? state.activePlayerId;
      state.turnNumber = command.turnNumber ?? state.turnNumber;
      state.phase = command.phase ?? state.phase;
      state.step = command.step ?? state.step;
      return "Updated turn state";
    }
    case "turn.nextStep": {
      const currentIndex = state.step ? stepOrder.indexOf(state.step) : -1;
      const nextIndex = currentIndex + 1;
      if (nextIndex >= stepOrder.length) {
        state.step = "untap";
        state.turnNumber = (state.turnNumber ?? 0) + 1;
        state.activePlayerId = nextPlayerId(state, state.activePlayerId);
      } else {
        state.step = stepOrder[nextIndex];
      }
      state.phase = phaseForStep(state.step);
      return `Advanced to ${state.step}`;
    }
    case "stack.add": {
      if (command.controllerPlayerId !== undefined)
        requirePlayer(state, command.controllerPlayerId);
      if (command.ownerPlayerId !== undefined) requirePlayer(state, command.ownerPlayerId);
      if (command.sourceObjectId !== undefined) findObject(state, command.sourceObjectId);
      state.stack.push({
        objectId: createId("obj"),
        kind: command.kind ?? "spell",
        controllerPlayerId: command.controllerPlayerId,
        ownerPlayerId: command.ownerPlayerId,
        name: command.name,
        description: command.description,
        sourceObjectId: command.sourceObjectId,
        representedCardId: command.representedCardId,
        annotations: [],
      });
      return `Added ${command.name} to the stack`;
    }
    case "stack.remove": {
      const index = state.stack.findIndex((item) => item.objectId === command.objectId);
      if (index < 0) throw new GameCommandError(`stack object not found: ${command.objectId}`);
      const [removed] = state.stack.splice(index, 1);
      return `Removed ${removed!.name} from the stack`;
    }
    case "stack.resolveTop": {
      const resolved = state.stack.pop();
      if (!resolved) throw new GameCommandError("stack is empty");
      return `Resolved ${resolved.name}`;
    }
    case "token.create": {
      const owner = requirePlayer(state, command.ownerPlayerId);
      const controllerPlayerId = command.controllerPlayerId ?? owner.id;
      requirePlayer(state, controllerPlayerId);
      const token: GameObject = {
        objectId: createId("obj"),
        kind: "token",
        ownerPlayerId: owner.id,
        controllerPlayerId,
        name: command.name,
        counters: structuredClone(command.counters ?? []),
        tapped: command.tapped ?? false,
        faceDown: command.faceDown ?? false,
        flipped: command.flipped ?? false,
        phasedOut: false,
        annotations: [],
      };
      insertObject(state, token, command.zone ?? "battlefield", controllerPlayerId);
      return `Created ${token.name} token`;
    }
    case "object.copy": {
      const source = findAnyObject(state, command.sourceObjectId);
      const controllerPlayerId =
        command.controllerPlayerId ?? source.controllerPlayerId ?? source.ownerPlayerId;
      requirePlayer(state, controllerPlayerId);
      if (command.destination === "stack") {
        state.stack.push({
          objectId: createId("obj"),
          kind: "copy",
          name: command.name ?? source.name,
          description: command.description,
          controllerPlayerId,
          ownerPlayerId: controllerPlayerId,
          sourceObjectId: source.objectId,
          annotations: [],
        });
      } else {
        state.battlefield.push({
          objectId: createId("obj"),
          kind: "token",
          ownerPlayerId: controllerPlayerId,
          controllerPlayerId,
          name: command.name ?? source.name,
          counters: [],
          tapped: false,
          faceDown: source.faceDown,
          flipped: source.flipped,
          phasedOut: false,
          annotations: [],
          copySourceObjectId: source.objectId,
        });
      }
      return `Copied ${source.name} to ${command.destination}`;
    }
    case "note.add":
      return command.message;
  }
}

type ObjectLocation =
  | {
      object: GameObject;
      zone: "library" | "hand" | "graveyard";
      player: PlayerState;
      index: number;
    }
  | { object: GameObject; zone: "battlefield" | "exile" | "command"; index: number };

function requirePlayer(state: GameState, playerId: string): PlayerState {
  const player = state.players.find((candidate) => candidate.id === playerId);
  if (!player) throw new GameCommandError(`player not found: ${playerId}`);
  return player;
}

function findObject(state: GameState, objectId: string): ObjectLocation {
  for (const player of state.players) {
    for (const zone of allPlayerZones()) {
      const index = player.zones[zone].findIndex((object) => object.objectId === objectId);
      if (index >= 0) return { object: player.zones[zone][index]!, player, zone, index };
    }
  }

  for (const zone of allSharedZones()) {
    const index = state[zone].findIndex((object) => object.objectId === objectId);
    if (index >= 0) return { object: state[zone][index]!, zone, index };
  }

  throw new GameCommandError(`object not found: ${objectId}`);
}

function findAnyObject(state: GameState, objectId: string): GameObject {
  try {
    return findObject(state, objectId).object;
  } catch (error) {
    const stackObject = state.stack.find((object) => object.objectId === objectId);
    if (stackObject) {
      return {
        objectId: stackObject.objectId,
        kind: "copy",
        ownerPlayerId:
          stackObject.ownerPlayerId ??
          stackObject.controllerPlayerId ??
          state.players[0]?.id ??
          "unknown",
        controllerPlayerId: stackObject.controllerPlayerId,
        name: stackObject.name,
        counters: [],
        tapped: false,
        faceDown: false,
        flipped: false,
        phasedOut: false,
        annotations: stackObject.annotations,
      };
    }
    throw error;
  }
}

function removeObject(state: GameState, objectId: string): ObjectLocation {
  const found = findObject(state, objectId);
  if ("player" in found) {
    const [object] = found.player.zones[found.zone].splice(found.index, 1);
    return { ...found, object: object! };
  }
  const [object] = state[found.zone].splice(found.index, 1);
  return { ...found, object: object! };
}

function insertObject(
  state: GameState,
  object: GameObject,
  zone: Zone,
  playerId?: string,
  position: "top" | "bottom" = "bottom",
): void {
  if (zone === "battlefield" || zone === "exile" || zone === "command") {
    insert(state[zone], object, position);
    return;
  }

  const destinationPlayerId =
    zone === "library" || zone === "hand" || zone === "graveyard" ? object.ownerPlayerId : playerId;
  const player = requirePlayer(state, destinationPlayerId ?? object.ownerPlayerId);
  insert(player.zones[zone], { ...object, controllerPlayerId: undefined }, position);
}

function insert(objects: GameObject[], object: GameObject, position: "top" | "bottom"): void {
  if (position === "top") objects.unshift(object);
  else objects.push(object);
}

function resetForZoneChange(
  object: GameObject,
  options: {
    controllerPlayerId?: string;
    tapped?: boolean;
    faceDown?: boolean;
    flipped?: boolean;
  } = {},
): GameObject {
  return {
    ...object,
    objectId: createId("obj"),
    controllerPlayerId: options.controllerPlayerId,
    counters: [],
    tapped: options.tapped ?? false,
    faceDown: options.faceDown ?? false,
    flipped: options.flipped ?? false,
    phasedOut: false,
  };
}

function setObjectFlag(
  state: GameState,
  objectId: string,
  flag: "tapped" | "faceDown" | "flipped",
  value: boolean,
): string {
  const { object } = findObject(state, objectId);
  object[flag] = value;
  return `Set ${object.name} ${flag} to ${value}`;
}

function addCounter(counters: Counter[], type: string, amount: number): void {
  const counter = counters.find((candidate) => candidate.type === type);
  if (counter) counter.amount += amount;
  else counters.push({ type, amount });
}

function removeCounter(counters: Counter[], type: string, amount: number): void {
  const counter = counters.find((candidate) => candidate.type === type);
  if (!counter) return;
  counter.amount -= amount;
  if (counter.amount <= 0) counters.splice(counters.indexOf(counter), 1);
}

function nextPlayerId(state: GameState, from?: string): string | undefined {
  if (state.players.length === 0) return undefined;
  const index = from ? state.players.findIndex((player) => player.id === from) : -1;
  return state.players[(index + 1) % state.players.length]?.id;
}

function phaseForStep(step: Step | undefined): GameState["phase"] {
  if (!step) return undefined;
  if (["untap", "upkeep", "draw"].includes(step)) return "beginning";
  if (
    [
      "beginningOfCombat",
      "declareAttackers",
      "declareBlockers",
      "combatDamage",
      "endOfCombat",
    ].includes(step)
  )
    return "combat";
  if (["end", "cleanup"].includes(step)) return "ending";
  return undefined;
}

function actorFor(command: Exclude<GameCommand, { type: "state.replace" }>): string | undefined {
  if ("actorPlayerId" in command) return command.actorPlayerId;
  if ("playerId" in command) return command.playerId;
  if ("controllerPlayerId" in command) return command.controllerPlayerId;
  if ("ownerPlayerId" in command) return command.ownerPlayerId;
  return undefined;
}

function zoneLabel(state: GameState, zone: Zone, playerId?: string): string {
  if (zone === "battlefield" || zone === "exile" || zone === "command") return zone;
  const player = playerId ? requirePlayer(state, playerId) : undefined;
  return player ? `${player.name}'s ${zone}` : zone;
}

function formatDelta(delta: number): string {
  return delta >= 0 ? `+${delta}` : `${delta}`;
}
