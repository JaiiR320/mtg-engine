import type {
  CardInstance,
  GameCommand,
  GameEvent,
  GameState,
  PlayerState,
  Step,
  Zone,
} from "@mtg-engine/schemas";
import { gameStateSchema } from "@mtg-engine/schemas";
import { createEvent } from "./events.js";
import { createId } from "./ids.js";
import { allZones } from "./state.js";

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
      const drawn = player.zones.library.splice(0, count);
      player.zones.hand.push(...drawn);
      return `${player.name} drew ${drawn.length} card${drawn.length === 1 ? "" : "s"}`;
    }
    case "card.move": {
      const found = removeCard(state, command.cardId);
      const player = requirePlayer(state, command.toPlayerId);
      found.card.controllerPlayerId = command.toPlayerId;
      insertCard(player.zones[command.toZone], found.card, command.position);
      return `Moved ${found.card.name} to ${player.name}'s ${command.toZone}`;
    }
    case "card.tap":
      return setCardFlag(state, command.cardId, "tapped", true);
    case "card.untap":
      return setCardFlag(state, command.cardId, "tapped", false);
    case "card.setTapped":
      return setCardFlag(state, command.cardId, "tapped", command.tapped);
    case "card.setFaceDown":
      return setCardFlag(state, command.cardId, "faceDown", command.faceDown);
    case "card.setFlipped":
      return setCardFlag(state, command.cardId, "flipped", command.flipped);
    case "card.addCounter": {
      const { card } = findCard(state, command.cardId);
      addCounter(card.counters, command.counterType, command.amount ?? 1);
      return `Added ${command.amount ?? 1} ${command.counterType} counter${(command.amount ?? 1) === 1 ? "" : "s"} to ${card.name}`;
    }
    case "card.removeCounter": {
      const { card } = findCard(state, command.cardId);
      removeCounter(card.counters, command.counterType, command.amount ?? 1);
      return `Removed ${command.amount ?? 1} ${command.counterType} counter${(command.amount ?? 1) === 1 ? "" : "s"} from ${card.name}`;
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
      state.stack.push({
        id: createId("stack"),
        controllerPlayerId: command.controllerPlayerId,
        name: command.name,
        sourceCardId: command.sourceCardId,
        annotations: [],
      });
      return `Added ${command.name} to the stack`;
    }
    case "stack.remove": {
      const index = state.stack.findIndex((item) => item.id === command.stackItemId);
      if (index < 0) throw new GameCommandError(`stack item not found: ${command.stackItemId}`);
      const [removed] = state.stack.splice(index, 1);
      return `Removed ${removed.name} from the stack`;
    }
    case "stack.resolveTop": {
      const resolved = state.stack.pop();
      if (!resolved) throw new GameCommandError("stack is empty");
      return `Resolved ${resolved.name}`;
    }
    case "note.add":
      return command.message;
  }
}

function requirePlayer(state: GameState, playerId: string): PlayerState {
  const player = state.players.find((candidate) => candidate.id === playerId);
  if (!player) throw new GameCommandError(`player not found: ${playerId}`);
  return player;
}

function findCard(
  state: GameState,
  cardId: string,
): { card: CardInstance; player: PlayerState; zone: Zone; index: number } {
  for (const player of state.players) {
    for (const zone of allZones()) {
      const index = player.zones[zone].findIndex((card) => card.id === cardId);
      if (index >= 0) return { card: player.zones[zone][index]!, player, zone, index };
    }
  }
  throw new GameCommandError(`card not found: ${cardId}`);
}

function removeCard(
  state: GameState,
  cardId: string,
): { card: CardInstance; player: PlayerState; zone: Zone } {
  const found = findCard(state, cardId);
  const [card] = found.player.zones[found.zone].splice(found.index, 1);
  return { card: card!, player: found.player, zone: found.zone };
}

function insertCard(
  cards: CardInstance[],
  card: CardInstance,
  position: "top" | "bottom" = "bottom",
): void {
  if (position === "top") cards.unshift(card);
  else cards.push(card);
}

function setCardFlag(
  state: GameState,
  cardId: string,
  flag: "tapped" | "faceDown" | "flipped",
  value: boolean,
): string {
  const { card } = findCard(state, cardId);
  card[flag] = value;
  return `Set ${card.name} ${flag} to ${value}`;
}

function addCounter(
  counters: { type: string; amount: number }[],
  type: string,
  amount: number,
): void {
  const counter = counters.find((candidate) => candidate.type === type);
  if (counter) counter.amount += amount;
  else counters.push({ type, amount });
}

function removeCounter(
  counters: { type: string; amount: number }[],
  type: string,
  amount: number,
): void {
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
  return undefined;
}

function formatDelta(delta: number): string {
  return delta >= 0 ? `+${delta}` : `${delta}`;
}
