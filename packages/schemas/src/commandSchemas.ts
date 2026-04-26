import { z } from "zod";
import {
  gameStateSchema,
  objectIdSchema,
  phaseSchema,
  playerIdSchema,
  stackObjectKindSchema,
  stepSchema,
  zonePositionSchema,
  zoneSchema,
} from "./stateSchemas.js";

export const newGameRequestSchema = z.object({
  players: z
    .array(
      z.object({
        id: playerIdSchema.optional(),
        name: z.string().min(1),
        life: z.number().int().optional(),
        library: z.array(z.string().min(1)).optional(),
        hand: z.array(z.string().min(1)).optional(),
        battlefield: z.array(z.string().min(1)).optional(),
        graveyard: z.array(z.string().min(1)).optional(),
        exile: z.array(z.string().min(1)).optional(),
        command: z.array(z.string().min(1)).optional(),
      }),
    )
    .min(1)
    .max(4),
  activePlayerId: playerIdSchema.optional(),
  priorityPlayerId: playerIdSchema.optional(),
  turnNumber: z.number().int().nonnegative().optional(),
  phase: phaseSchema.optional(),
  step: stepSchema.optional(),
});

export const gameCommandSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("player.adjustLife"),
    playerId: playerIdSchema,
    delta: z.number().int(),
  }),
  z.object({
    type: z.literal("card.draw"),
    playerId: playerIdSchema,
    count: z.number().int().positive().optional(),
  }),
  z.object({
    type: z.literal("card.move"),
    objectId: objectIdSchema,
    toZone: zoneSchema,
    toPlayerId: playerIdSchema.optional(),
    position: zonePositionSchema.optional(),
    enterTapped: z.boolean().optional(),
    enterFaceDown: z.boolean().optional(),
    enterFlipped: z.boolean().optional(),
  }),
  z.object({ type: z.literal("card.tap"), objectId: objectIdSchema }),
  z.object({ type: z.literal("card.untap"), objectId: objectIdSchema }),
  z.object({ type: z.literal("card.setTapped"), objectId: objectIdSchema, tapped: z.boolean() }),
  z.object({
    type: z.literal("card.setFaceDown"),
    objectId: objectIdSchema,
    faceDown: z.boolean(),
  }),
  z.object({ type: z.literal("card.setFlipped"), objectId: objectIdSchema, flipped: z.boolean() }),
  z.object({
    type: z.literal("card.addCounter"),
    objectId: objectIdSchema,
    counterType: z.string().min(1),
    amount: z.number().int().positive().optional(),
  }),
  z.object({
    type: z.literal("card.removeCounter"),
    objectId: objectIdSchema,
    counterType: z.string().min(1),
    amount: z.number().int().positive().optional(),
  }),
  z.object({ type: z.literal("priority.set"), playerId: playerIdSchema.optional() }),
  z.object({ type: z.literal("priority.pass"), playerId: playerIdSchema.optional() }),
  z.object({
    type: z.literal("turn.set"),
    activePlayerId: playerIdSchema.optional(),
    turnNumber: z.number().int().nonnegative().optional(),
    phase: phaseSchema.optional(),
    step: stepSchema.optional(),
  }),
  z.object({ type: z.literal("turn.nextStep") }),
  z.object({
    type: z.literal("stack.add"),
    kind: stackObjectKindSchema.optional(),
    controllerPlayerId: playerIdSchema.optional(),
    ownerPlayerId: playerIdSchema.optional(),
    name: z.string().min(1),
    description: z.string().optional(),
    sourceObjectId: objectIdSchema.optional(),
    representedCardId: z.string().min(1).optional(),
  }),
  z.object({ type: z.literal("stack.remove"), objectId: objectIdSchema }),
  z.object({ type: z.literal("stack.resolveTop") }),
  z.object({
    type: z.literal("token.create"),
    name: z.string().min(1),
    ownerPlayerId: playerIdSchema,
    controllerPlayerId: playerIdSchema.optional(),
    zone: z.enum(["battlefield", "exile", "command"]).optional(),
    tapped: z.boolean().optional(),
    faceDown: z.boolean().optional(),
    flipped: z.boolean().optional(),
    counters: z.array(z.object({ type: z.string().min(1), amount: z.number().int() })).optional(),
  }),
  z.object({
    type: z.literal("object.copy"),
    sourceObjectId: objectIdSchema,
    controllerPlayerId: playerIdSchema.optional(),
    destination: z.enum(["battlefield", "stack"]),
    name: z.string().min(1).optional(),
    description: z.string().optional(),
  }),
  z.object({
    type: z.literal("note.add"),
    actorPlayerId: playerIdSchema.optional(),
    message: z.string().min(1),
  }),
  z.object({ type: z.literal("state.replace"), state: gameStateSchema }),
]);

export type NewGameRequest = z.infer<typeof newGameRequestSchema>;
export type GameCommand = z.infer<typeof gameCommandSchema>;
