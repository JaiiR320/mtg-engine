import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { ZodError } from "zod";
import { GameCommandError } from "@mtg-engine/core";
import { gameCommandSchema, newGameRequestSchema } from "@mtg-engine/schemas";
import { EventBus } from "./eventBus.js";
import { GameStore } from "./gameStore.js";

export function createApp(store = new GameStore(), bus = new EventBus()): Hono {
  const app = new Hono();

  app.get("/health", (c) => c.json({ ok: true }));

  app.get("/game", (c) => c.json(store.getView()));

  app.post("/game/new", async (c) => {
    const request = newGameRequestSchema.parse(await c.req.json());
    const view = store.newGame(request);
    return c.json({ view });
  });

  app.post("/game/commands", async (c) => {
    const command = gameCommandSchema.parse(await c.req.json());
    const response = store.apply(command);
    bus.publish({
      type: "game.event",
      revision: response.view.revision,
      event: response.event,
      view: response.view,
    });
    return c.json(response);
  });

  app.get("/game/events", (c) => c.json({ events: store.getEvents() }));

  app.get("/game/events/stream", (c) => {
    return streamSSE(c, async (stream) => {
      const queue: string[] = [];
      let notify: (() => void) | undefined;
      const unsubscribe = bus.subscribe((message) => {
        queue.push(JSON.stringify(message));
        notify?.();
      });

      stream.onAbort(unsubscribe);

      while (true) {
        if (queue.length === 0) {
          await new Promise<void>((resolve) => {
            notify = resolve;
          });
          notify = undefined;
        }

        const next = queue.shift();
        if (next) {
          await stream.writeSSE({ event: "game.event", data: next });
        }
      }
    });
  });

  app.onError((err, c) => {
    if (err instanceof ZodError) {
      return c.json({ error: "invalid_request", issues: err.issues }, 400);
    }
    if (err instanceof GameCommandError) {
      return c.json({ error: "command_error", message: err.message }, 400);
    }
    console.error(err);
    return c.json({ error: "internal_server_error" }, 500);
  });

  return app;
}
