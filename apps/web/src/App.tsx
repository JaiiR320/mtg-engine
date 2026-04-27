import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import {
  gameCommandSchema,
  type Counter,
  type GameEvent,
  type GameObject,
  type GameView,
  type PlayerState,
  type ZoneState,
} from "@mtg-engine/schemas";
import { applyGameCommand, createGame, getGame, type GameResponse } from "./api.js";
import { getDevIdentity, type DevIdentity } from "./devIdentity.js";

const defaultCommandText = JSON.stringify(
  {
    type: "note.add",
    message: "Testing the command console",
  },
  null,
  2,
);

const playerZones = ["library", "hand", "graveyard"] as const;
const sharedZones = ["battlefield", "stack", "exile", "command"] as const;

export function App({ children }: { children: ReactNode }) {
  return children;
}

export function HomePage() {
  const navigate = useNavigate();
  const [name, setName] = useState("New Game");
  const [error, setError] = useState<string>();
  const [creating, setCreating] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(undefined);
    setCreating(true);
    try {
      const response = await createGame(name);
      await navigate({ to: "/games/$gameId", params: { gameId: response.game.id } });
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Could not create game");
    } finally {
      setCreating(false);
    }
  }

  return (
    <main className="home-shell">
      <form className="hero-card create-game-form" onSubmit={submit}>
        <div>
          <p className="eyebrow">MTG Engine</p>
          <h1>Create Game</h1>
        </div>
        <label>
          Game name
          <input value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <button className="primary-button" type="submit" disabled={creating || name.trim() === ""}>
          {creating ? "Creating..." : "Create Game"}
        </button>
        {error ? <pre className="message-box error-box">{error}</pre> : null}
      </form>
    </main>
  );
}

export function GamePage() {
  const { gameId } = useParams({ from: "/games/$gameId" });
  const [identity] = useState<DevIdentity>(() => getDevIdentity());
  const [response, setResponse] = useState<GameResponse>();
  const [commandText, setCommandText] = useState(defaultCommandText);
  const [error, setError] = useState<string>();
  const [latestEvent, setLatestEvent] = useState<GameEvent>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(undefined);
      try {
        const loaded = await getGame(gameId);
        if (cancelled) return;
        const currentPlayer = loaded.view.players.find((player) => player.id === identity.id);
        if (currentPlayer) {
          setResponse(loaded);
          return;
        }

        const joined = await applyGameCommand(gameId, {
          type: "player.add",
          player: identity,
        });
        if (!cancelled) {
          setResponse(joined);
          setLatestEvent(joined.event);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Could not load game");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [gameId, identity]);

  async function refreshGame() {
    setError(undefined);
    try {
      setResponse(await getGame(gameId));
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : "Could not refresh game");
    }
  }

  async function applyJsonCommand() {
    setError(undefined);

    let parsed: unknown;
    try {
      parsed = JSON.parse(commandText);
    } catch (parseError) {
      setError(parseError instanceof Error ? parseError.message : "Invalid JSON");
      return;
    }

    const validated = gameCommandSchema.safeParse(parsed);
    if (!validated.success) {
      setError(validated.error.issues.map((issue) => issue.message).join("\n"));
      return;
    }

    try {
      const result = await applyGameCommand(gameId, validated.data);
      setResponse(result);
      setLatestEvent(result.event);
    } catch (commandError) {
      setError(commandError instanceof Error ? commandError.message : "Unexpected command error");
    }
  }

  function formatJson() {
    setError(undefined);
    try {
      setCommandText(JSON.stringify(JSON.parse(commandText), null, 2));
    } catch (parseError) {
      setError(parseError instanceof Error ? parseError.message : "Invalid JSON");
    }
  }

  if (loading) {
    return (
      <main className="app-shell single-pane">
        <section className="table-pane">Loading game...</section>
      </main>
    );
  }

  if (!response) {
    return (
      <main className="app-shell single-pane">
        <section className="table-pane">
          <div className="hero-card">
            <h1>Game unavailable</h1>
            {error ? <pre className="message-box error-box">{error}</pre> : null}
            <Link to="/">Create a game</Link>
          </div>
        </section>
      </main>
    );
  }

  const commandReference = buildCommandReference(identity.id);

  return (
    <main className="app-shell">
      <section className="table-pane" aria-label="Game state">
        <GameStateView response={response} identity={identity} />
      </section>

      <aside className="console-pane" aria-label="Command console">
        <div className="console-header">
          <div>
            <p className="eyebrow">Console</p>
            <h2>Raw Command JSON</h2>
          </div>
          <button className="ghost-button" type="button" onClick={() => void refreshGame()}>
            Refresh
          </button>
        </div>

        <p className="empty-text">Strict JSON only: use 2, not +2.</p>
        <textarea
          className="command-input"
          spellCheck={false}
          value={commandText}
          onChange={(event) => setCommandText(event.target.value)}
        />

        <div className="button-row">
          <button className="primary-button" type="button" onClick={() => void applyJsonCommand()}>
            Apply Command
          </button>
          <button className="ghost-button" type="button" onClick={formatJson}>
            Format JSON
          </button>
        </div>

        {error ? <pre className="message-box error-box">{error}</pre> : null}

        <CommandReference commands={commandReference} onUseTemplate={setCommandText} />

        <EventPanel title="Latest Event" event={latestEvent} />

        <section className="event-log">
          <h3>Event Log</h3>
          {response.view.eventLog.length === 0 ? (
            <p className="empty-text">No events yet.</p>
          ) : (
            <ol>
              {[...response.view.eventLog].reverse().map((event) => (
                <li key={event.id}>
                  <span className="event-revision">#{event.revision}</span>
                  <span>{event.message}</span>
                  <code>{event.commandType ?? event.type}</code>
                </li>
              ))}
            </ol>
          )}
        </section>
      </aside>
    </main>
  );
}

function GameStateView({ response, identity }: { response: GameResponse; identity: DevIdentity }) {
  const view = response.view;
  return (
    <>
      <header className="hero-card">
        <div>
          <p className="eyebrow">{response.game.name}</p>
          <h1>Core State Console</h1>
          <p className="empty-text">You are {identity.name}</p>
        </div>
        <dl className="state-grid">
          <Stat label="Game ID" value={response.game.id} />
          <Stat label="Revision" value={view.revision} />
          <Stat label="Turn" value={view.turnNumber ?? "-"} />
          <Stat label="Phase" value={view.phase ?? "-"} />
          <Stat label="Step" value={view.step ?? "-"} />
          <Stat label="Active" value={view.activePlayerId ?? "-"} />
          <Stat label="Priority" value={view.priorityPlayerId ?? "-"} />
        </dl>
      </header>

      <section className="section-stack">
        <h2>Players</h2>
        {view.players.length === 0 ? (
          <p className="empty-text">No players yet.</p>
        ) : (
          view.players.map((player) => <PlayerPanel key={player.id} player={player} />)
        )}
      </section>

      <section className="section-stack">
        <h2>Shared Zones</h2>
        <div className="zone-grid">
          {sharedZones.map((zoneName) => (
            <ZonePanel key={zoneName} label={zoneName} zone={view.zones[zoneName]} />
          ))}
        </div>
      </section>
    </>
  );
}

type CommandReferenceItem = {
  type: string;
  params: string;
  template: unknown;
};

function buildCommandReference(playerId: string): CommandReferenceItem[] {
  return [
    {
      type: "player.add",
      params: "player.id, player.name",
      template: { type: "player.add", player: { id: "player_...", name: "Player Name" } },
    },
    {
      type: "player.adjustLife",
      params: "playerId, delta",
      template: { type: "player.adjustLife", playerId, delta: -1 },
    },
    {
      type: "player.setLife",
      params: "playerId, life",
      template: { type: "player.setLife", playerId, life: 40 },
    },
    {
      type: "player.setCounters",
      params: "playerId, counters[]",
      template: { type: "player.setCounters", playerId, counters: [{ type: "poison", amount: 1 }] },
    },
    {
      type: "object.create",
      params: "object, to, insertIndex?",
      template: {
        type: "object.create",
        object: {
          kind: "token",
          ownerPlayerId: playerId,
          controllerPlayerId: playerId,
          name: "Food",
        },
        to: { zone: "battlefield" },
      },
    },
    {
      type: "object.move",
      params:
        "objectId, to, insertIndex?, kind?, ownerPlayerId?, controllerPlayerId?, status?, counters?, visibility?",
      template: { type: "object.move", objectId: "obj_...", to: { zone: "hand", playerId } },
    },
    {
      type: "object.delete",
      params: "objectId",
      template: { type: "object.delete", objectId: "obj_..." },
    },
    {
      type: "object.copy",
      params:
        "sourceObjectId, to, insertIndex?, kind?, name?, description?, ownerPlayerId?, controllerPlayerId?",
      template: { type: "object.copy", sourceObjectId: "obj_...", to: { zone: "battlefield" } },
    },
    {
      type: "object.setStatus",
      params: "objectId, status",
      template: { type: "object.setStatus", objectId: "obj_...", status: { tapped: true } },
    },
    {
      type: "object.setCounters",
      params: "objectId, counters[]",
      template: {
        type: "object.setCounters",
        objectId: "obj_...",
        counters: [{ type: "+1/+1", amount: 1 }],
      },
    },
    {
      type: "object.setController",
      params: "objectId, controllerPlayerId|null",
      template: { type: "object.setController", objectId: "obj_...", controllerPlayerId: playerId },
    },
    {
      type: "object.setOwner",
      params: "objectId, ownerPlayerId|null",
      template: { type: "object.setOwner", objectId: "obj_...", ownerPlayerId: playerId },
    },
    {
      type: "object.setVisibility",
      params: "objectId, visibility|null",
      template: {
        type: "object.setVisibility",
        objectId: "obj_...",
        visibility: { revealedTo: "all" },
      },
    },
    {
      type: "object.setAnnotations",
      params: "objectId, annotations[]",
      template: { type: "object.setAnnotations", objectId: "obj_...", annotations: ["debug note"] },
    },
    {
      type: "zone.reorder",
      params: "zone, objectIds[]",
      template: { type: "zone.reorder", zone: { zone: "hand", playerId }, objectIds: ["obj_..."] },
    },
    {
      type: "zone.shuffle",
      params: "zone",
      template: { type: "zone.shuffle", zone: { zone: "library", playerId } },
    },
    {
      type: "zone.moveMany",
      params: "objectIds[], to, insertIndex?, kind?",
      template: {
        type: "zone.moveMany",
        objectIds: ["obj_..."],
        to: { zone: "graveyard", playerId },
      },
    },
    { type: "priority.set", params: "playerId?", template: { type: "priority.set", playerId } },
    { type: "priority.pass", params: "playerId?", template: { type: "priority.pass", playerId } },
    {
      type: "turn.set",
      params: "activePlayerId?, turnNumber?, phase?, step?",
      template: {
        type: "turn.set",
        activePlayerId: playerId,
        turnNumber: 1,
        phase: "precombatMain",
      },
    },
    {
      type: "note.add",
      params: "actorPlayerId?, message",
      template: { type: "note.add", actorPlayerId: playerId, message: "debug note" },
    },
    {
      type: "state.replace",
      params: "state",
      template: { type: "state.replace", state: "paste full GameState here" },
    },
  ];
}

function CommandReference({
  commands,
  onUseTemplate,
}: {
  commands: CommandReferenceItem[];
  onUseTemplate: (template: string) => void;
}) {
  return (
    <details className="command-reference" open>
      <summary>Command Reference</summary>
      <div className="reference-list">
        {commands.map((command) => (
          <div className="reference-row" key={command.type}>
            <div>
              <code>{command.type}</code>
              <p>{command.params}</p>
            </div>
            <button
              className="ghost-button"
              type="button"
              onClick={() => onUseTemplate(JSON.stringify(command.template, null, 2))}
            >
              Use
            </button>
          </div>
        ))}
      </div>
    </details>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function PlayerPanel({ player }: { player: PlayerState }) {
  return (
    <article className="player-card">
      <header>
        <div>
          <h3>{player.name}</h3>
          {player.id !== player.name ? <code>{player.id}</code> : null}
        </div>
        <div className="life-total">{player.life}</div>
      </header>
      <CounterList counters={player.counters} />
      <div className="zone-grid">
        {playerZones.map((zoneName) => (
          <ZonePanel key={zoneName} label={zoneName} zone={player.zones[zoneName]} />
        ))}
      </div>
    </article>
  );
}

function ZonePanel({ label, zone }: { label: string; zone: ZoneState }) {
  return (
    <section className="zone-card">
      <header>
        <h4>{label}</h4>
        <span>{zone.objects.length}</span>
      </header>
      {zone.objects.length === 0 ? (
        <p className="empty-text">Empty</p>
      ) : (
        <ul className="object-list">
          {zone.objects.map((object) => (
            <ObjectRow key={object.objectId} object={object} />
          ))}
        </ul>
      )}
    </section>
  );
}

function ObjectRow({ object }: { object: GameObject }) {
  const statuses = Object.entries(object.status)
    .filter(([, enabled]) => enabled)
    .map(([name]) => name);

  return (
    <li className="object-row">
      <div className="object-title">
        <strong>{object.name}</strong>
        <span>{object.kind}</span>
      </div>
      <KeyValue label="Object" value={object.objectId} />
      <KeyValue label="Card" value={object.cardId} />
      <KeyValue label="Owner" value={object.ownerPlayerId} />
      <KeyValue label="Controller" value={object.controllerPlayerId} />
      <KeyValue
        label="Status"
        value={statuses.length > 0 ? statuses.join(", ") : "untapped/default"}
      />
      <KeyValue label="Visibility" value={formatValue(object.visibility)} />
      <KeyValue label="Copy Source" value={object.copySourceObjectId} />
      <CounterList counters={object.counters} compact />
      {object.annotations.length > 0 ? (
        <KeyValue label="Notes" value={object.annotations.join("; ")} />
      ) : null}
    </li>
  );
}

function CounterList({ counters, compact = false }: { counters: Counter[]; compact?: boolean }) {
  if (counters.length === 0) {
    return compact ? null : <p className="empty-text">No counters</p>;
  }

  return (
    <div className="counter-list">
      {counters.map((counter) => (
        <span key={`${counter.type}:${counter.amount}`}>
          {counter.type}: {counter.amount}
        </span>
      ))}
    </div>
  );
}

function KeyValue({ label, value }: { label: string; value: string | undefined }) {
  if (!value) return null;
  return (
    <div className="key-value">
      <span>{label}</span>
      <code>{value}</code>
    </div>
  );
}

function EventPanel({ title, event }: { title: string; event: GameEvent | undefined }) {
  return (
    <section className="latest-event">
      <h3>{title}</h3>
      {event ? (
        <div className="event-card">
          <span className="event-revision">#{event.revision}</span>
          <p>{event.message}</p>
          <code>{event.commandType ?? event.type}</code>
        </div>
      ) : (
        <p className="empty-text">Apply a command to see the latest event.</p>
      )}
    </section>
  );
}

function formatValue(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}
