import { z } from "zod";
import {
  gameStateSchema,
  phaseSchema,
  playerIdSchema,
  stackItemIdSchema,
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
    cardId: z.string().min(1),
    toPlayerId: playerIdSchema,
    toZone: zoneSchema,
    position: zonePositionSchema.optional(),
  }),
  z.object({ type: z.literal("card.tap"), cardId: z.string().min(1) }),
  z.object({ type: z.literal("card.untap"), cardId: z.string().min(1) }),
  z.object({ type: z.literal("card.setTapped"), cardId: z.string().min(1), tapped: z.boolean() }),
  z.object({
    type: z.literal("card.setFaceDown"),
    cardId: z.string().min(1),
    faceDown: z.boolean(),
  }),
  z.object({ type: z.literal("card.setFlipped"), cardId: z.string().min(1), flipped: z.boolean() }),
  z.object({
    type: z.literal("card.addCounter"),
    cardId: z.string().min(1),
    counterType: z.string().min(1),
    amount: z.number().int().positive().optional(),
  }),
  z.object({
    type: z.literal("card.removeCounter"),
    cardId: z.string().min(1),
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
    controllerPlayerId: playerIdSchema.optional(),
    name: z.string().min(1),
    sourceCardId: z.string().min(1).optional(),
  }),
  z.object({ type: z.literal("stack.remove"), stackItemId: stackItemIdSchema }),
  z.object({ type: z.literal("stack.resolveTop") }),
  z.object({
    type: z.literal("note.add"),
    actorPlayerId: playerIdSchema.optional(),
    message: z.string().min(1),
  }),
  z.object({ type: z.literal("state.replace"), state: gameStateSchema }),
]);

export type NewGameRequest = z.infer<typeof newGameRequestSchema>;
export type GameCommand = z.infer<typeof gameCommandSchema>;
