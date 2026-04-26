import type { GameState, GameView } from "@mtg-engine/schemas";

export function toGameView(state: GameState): GameView {
  return {
    ...structuredClone(state),
    viewMode: "debug",
  };
}
