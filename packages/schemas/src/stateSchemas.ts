import { z } from "zod";

export const playerIdSchema = z.string().min(1);
export const cardIdSchema = z.string().min(1);
export const objectIdSchema = z.string().min(1);

export const zoneSchema = z.enum([
  "library",
  "hand",
  "battlefield",
  "stack",
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

export const objectKindSchema = z.enum(["card", "token", "copy"]);

export const stackObjectKindSchema = z.enum([
  "spell",
  "activatedAbility",
  "triggeredAbility",
  "copy",
]);

export const counterSchema = z.object({
  type: z.string().min(1),
  amount: z.number().int(),
});

export const gameObjectSchema = z.object({
  objectId: objectIdSchema,
  cardId: cardIdSchema.optional(),
  kind: objectKindSchema,
  ownerPlayerId: playerIdSchema,
  controllerPlayerId: playerIdSchema.optional(),
  name: z.string().min(1),
  counters: z.array(counterSchema),
  tapped: z.boolean(),
  faceDown: z.boolean(),
  flipped: z.boolean(),
  phasedOut: z.boolean(),
  annotations: z.array(z.string()),
  copySourceObjectId: objectIdSchema.optional(),
});

export const playerZonesSchema = z.object({
  library: z.array(gameObjectSchema),
  hand: z.array(gameObjectSchema),
  graveyard: z.array(gameObjectSchema),
});

export const playerStateSchema = z.object({
  id: playerIdSchema,
  name: z.string().min(1),
  life: z.number().int(),
  counters: z.array(counterSchema),
  zones: playerZonesSchema,
});

export const stackObjectSchema = z.object({
  objectId: objectIdSchema,
  kind: stackObjectKindSchema,
  name: z.string().min(1),
  description: z.string().optional(),
  controllerPlayerId: playerIdSchema.optional(),
  ownerPlayerId: playerIdSchema.optional(),
  sourceObjectId: objectIdSchema.optional(),
  representedCardId: cardIdSchema.optional(),
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
  battlefield: z.array(gameObjectSchema),
  exile: z.array(gameObjectSchema),
  command: z.array(gameObjectSchema),
  stack: z.array(stackObjectSchema),
  eventLog: z.array(gameEventSchema),
});

export type PlayerId = z.infer<typeof playerIdSchema>;
export type CardId = z.infer<typeof cardIdSchema>;
export type ObjectId = z.infer<typeof objectIdSchema>;
export type Zone = z.infer<typeof zoneSchema>;
export type Phase = z.infer<typeof phaseSchema>;
export type Step = z.infer<typeof stepSchema>;
export type ZonePosition = z.infer<typeof zonePositionSchema>;
export type Counter = z.infer<typeof counterSchema>;
export type ObjectKind = z.infer<typeof objectKindSchema>;
export type StackObjectKind = z.infer<typeof stackObjectKindSchema>;
export type GameObject = z.infer<typeof gameObjectSchema>;
export type PlayerZones = z.infer<typeof playerZonesSchema>;
export type PlayerState = z.infer<typeof playerStateSchema>;
export type StackObject = z.infer<typeof stackObjectSchema>;
export type GameEvent = z.infer<typeof gameEventSchema>;
export type GameState = z.infer<typeof gameStateSchema>;
