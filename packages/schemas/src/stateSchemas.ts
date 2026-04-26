import { z } from "zod";

export const playerIdSchema = z.string().min(1);
export const cardIdSchema = z.string().min(1);
export const stackItemIdSchema = z.string().min(1);

export const zoneSchema = z.enum([
  "library",
  "hand",
  "battlefield",
  "graveyard",
  "exile",
  "command",
]);

export const phaseSchema = z.enum([
  "beginning",
  "precombatMain",
  "combat",
  "postcombatMain",
  "ending",
]);

export const stepSchema = z.enum([
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
]);

export const zonePositionSchema = z.enum(["top", "bottom"]);

export const counterSchema = z.object({
  type: z.string().min(1),
  amount: z.number().int(),
});

export const cardInstanceSchema = z.object({
  id: cardIdSchema,
  ownerPlayerId: playerIdSchema,
  controllerPlayerId: playerIdSchema,
  name: z.string().min(1),
  tapped: z.boolean(),
  faceDown: z.boolean(),
  flipped: z.boolean(),
  counters: z.array(counterSchema),
  annotations: z.array(z.string()),
});

export const playerZonesSchema = z.object({
  library: z.array(cardInstanceSchema),
  hand: z.array(cardInstanceSchema),
  battlefield: z.array(cardInstanceSchema),
  graveyard: z.array(cardInstanceSchema),
  exile: z.array(cardInstanceSchema),
  command: z.array(cardInstanceSchema),
});

export const playerStateSchema = z.object({
  id: playerIdSchema,
  name: z.string().min(1),
  life: z.number().int(),
  counters: z.array(counterSchema),
  zones: playerZonesSchema,
});

export const stackItemSchema = z.object({
  id: stackItemIdSchema,
  controllerPlayerId: playerIdSchema.optional(),
  name: z.string().min(1),
  sourceCardId: cardIdSchema.optional(),
  annotations: z.array(z.string()),
});

export const gameEventSchema = z.object({
  id: z.string().min(1),
  revision: z.number().int().nonnegative(),
  timestamp: z.string().min(1),
  type: z.string().min(1),
  actorPlayerId: playerIdSchema.optional(),
  message: z.string(),
  commandType: z.string().optional(),
});

export const gameStateSchema = z.object({
  id: z.literal("single"),
  revision: z.number().int().nonnegative(),
  players: z.array(playerStateSchema),
  activePlayerId: playerIdSchema.optional(),
  priorityPlayerId: playerIdSchema.optional(),
  turnNumber: z.number().int().nonnegative().optional(),
  phase: phaseSchema.optional(),
  step: stepSchema.optional(),
  stack: z.array(stackItemSchema),
  eventLog: z.array(gameEventSchema),
});

export type PlayerId = z.infer<typeof playerIdSchema>;
export type CardId = z.infer<typeof cardIdSchema>;
export type StackItemId = z.infer<typeof stackItemIdSchema>;
export type Zone = z.infer<typeof zoneSchema>;
export type Phase = z.infer<typeof phaseSchema>;
export type Step = z.infer<typeof stepSchema>;
export type ZonePosition = z.infer<typeof zonePositionSchema>;
export type Counter = z.infer<typeof counterSchema>;
export type CardInstance = z.infer<typeof cardInstanceSchema>;
export type PlayerZones = z.infer<typeof playerZonesSchema>;
export type PlayerState = z.infer<typeof playerStateSchema>;
export type StackItem = z.infer<typeof stackItemSchema>;
export type GameEvent = z.infer<typeof gameEventSchema>;
export type GameState = z.infer<typeof gameStateSchema>;
