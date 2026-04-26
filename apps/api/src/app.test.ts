import { describe, expect, it } from "vitest";
import { createApp } from "./app.js";

describe("api", () => {
  it("returns health", async () => {
    const app = createApp();

    const response = await app.request("/health");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });

  it("creates a game and returns a debug view", async () => {
    const app = createApp();

    const created = await app.request("/game/new", {
      method: "POST",
      body: JSON.stringify({ players: [{ id: "p1", name: "Jair", library: ["Opt"] }] }),
      headers: { "content-type": "application/json" },
    });

    expect(created.status).toBe(200);
    const body = await created.json();
    expect(body.view.viewMode).toBe("debug");
    expect(body.view.players[0].zones.library.objects[0].name).toBe("Opt");
    expect(body.view.players[0].zones.library.objects[0].objectId).toBeDefined();
    expect(body.view.players[0].zones.library.objects[0].cardId).toBeDefined();
    expect(body.view.zones.battlefield.objects).toEqual([]);
  });

  it("validates and applies commands", async () => {
    const app = createApp();

    await app.request("/game/new", {
      method: "POST",
      body: JSON.stringify({ players: [{ id: "p1", name: "Jair", library: ["Opt"] }] }),
      headers: { "content-type": "application/json" },
    });

    const game = await (await app.request("/game")).json();
    const objectId = game.players[0].zones.library.objects[0].objectId;

    const response = await app.request("/game/commands", {
      method: "POST",
      body: JSON.stringify({
        type: "object.move",
        objectId,
        to: { zone: "hand", playerId: "p1" },
      }),
      headers: { "content-type": "application/json" },
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.view.players[0].zones.hand.objects[0].name).toBe("Opt");
    expect(body.view.players[0].zones.hand.objects[0].objectId).toBeDefined();
    expect(body.event.type).toBe("object.move");
  });

  it("returns 400 for malformed commands", async () => {
    const app = createApp();

    const response = await app.request("/game/commands", {
      method: "POST",
      body: JSON.stringify({ type: "card.draw" }),
      headers: { "content-type": "application/json" },
    });

    expect(response.status).toBe(400);
  });

  it("returns the event log", async () => {
    const app = createApp();

    await app.request("/game/new", {
      method: "POST",
      body: JSON.stringify({ players: [{ id: "p1", name: "Jair", library: ["Opt"] }] }),
      headers: { "content-type": "application/json" },
    });
    await app.request("/game/commands", {
      method: "POST",
      body: JSON.stringify({ type: "note.add", actorPlayerId: "p1", message: "keep priority" }),
      headers: { "content-type": "application/json" },
    });

    const response = await app.request("/game/events");
    const body = await response.json();

    expect(body.events).toHaveLength(1);
    expect(body.events[0].message).toBe("keep priority");
  });
});
