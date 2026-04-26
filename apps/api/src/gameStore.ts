import { applyCommand, createGame, emptyGame, toGameView } from "@mtg-engine/core";
import type {
  CommandResponse,
  GameCommand,
  GameEvent,
  GameState,
  GameView,
  NewGameRequest,
} from "@mtg-engine/schemas";

export class GameStore {
  private state: GameState = emptyGame();

  getState(): GameState {
    return this.state;
  }

  getView(): GameView {
    return toGameView(this.state);
  }

  getEvents(): GameEvent[] {
    return this.state.eventLog;
  }

  newGame(request: NewGameRequest): GameView {
    this.state = createGame(request);
    return this.getView();
  }

  apply(command: GameCommand): CommandResponse {
    const result = applyCommand(this.state, command);
    this.state = result.state;
    return {
      view: this.getView(),
      event: result.event,
    };
  }
}
