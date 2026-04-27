import type { GameCommand, GameEvent, GameView } from "@mtg-engine/schemas";

const apiBaseUrl = normalizeApiBaseUrl(import.meta.env.VITE_API_URL);

export type GameMetadata = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type GameResponse = {
  game: GameMetadata;
  view: GameView;
};

export type GameCommandResponse = GameResponse & {
  event: GameEvent;
};

export async function createGame(name: string): Promise<GameResponse> {
  return request("/games", {
    method: "POST",
    body: JSON.stringify({ name }),
    headers: { "content-type": "application/json" },
  });
}

export async function getGame(gameId: string): Promise<GameResponse> {
  return request(`/games/${gameId}`);
}

export async function applyGameCommand(
  gameId: string,
  command: GameCommand,
): Promise<GameCommandResponse> {
  return request(`/games/${gameId}/commands`, {
    method: "POST",
    body: JSON.stringify(command),
    headers: { "content-type": "application/json" },
  });
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, init);
  const body = await response.json().catch(() => undefined);
  if (!response.ok) {
    const message = body?.message ?? body?.error ?? `request failed: ${response.status}`;
    throw new Error(message);
  }
  return body as T;
}

function normalizeApiBaseUrl(value: string | undefined): string {
  const baseUrl = (value ?? "http://localhost:3000").trim().replace(/\/$/, "");
  if (baseUrl.startsWith("http://") || baseUrl.startsWith("https://")) return baseUrl;
  if (baseUrl.startsWith("localhost") || baseUrl.startsWith("127.0.0.1")) {
    return `http://${baseUrl}`;
  }
  return `https://${baseUrl}`;
}
