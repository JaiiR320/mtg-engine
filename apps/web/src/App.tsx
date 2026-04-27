import { useState } from "react";
import { applyCommand, createGame, GameCommandError, toGameView } from "@mtg-engine/core";
import {
  gameCommandSchema,
  type Counter,
  type GameEvent,
  type GameObject,
  type GameState,
  type PlayerState,
  type ZoneState,
} from "@mtg-engine/schemas";

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
const playerNames = ["Austin", "Brendan", "Brian", "Eric", "Jair", "Zach"] as const;

const commandReference = [
  {
    type: "player.adjustLife",
    params: "playerId, delta",
    template: { type: "player.adjustLife", playerId: "Jair", delta: -1 },
  },
  {
    type: "player.setLife",
    params: "playerId, life",
    template: { type: "player.setLife", playerId: "Jair", life: 40 },
  },
  {
    type: "player.setCounters",
    params: "playerId, counters[]",
    template: {
      type: "player.setCounters",
      playerId: "Jair",
      counters: [{ type: "poison", amount: 1 }],
    },
  },
  {
    type: "object.create",
    params: "object, to, insertIndex?",
    template: {
      type: "object.create",
      object: { kind: "token", ownerPlayerId: "Jair", controllerPlayerId: "Jair", name: "Food" },
      to: { zone: "battlefield" },
    },
  },
  {
    type: "object.move",
    params:
      "objectId, to, insertIndex?, kind?, ownerPlayerId?, controllerPlayerId?, status?, counters?, visibility?",
    template: { type: "object.move", objectId: "obj_...", to: { zone: "hand", playerId: "Jair" } },
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
    template: { type: "object.setController", objectId: "obj_...", controllerPlayerId: "Jair" },
  },
  {
    type: "object.setOwner",
    params: "objectId, ownerPlayerId|null",
    template: { type: "object.setOwner", objectId: "obj_...", ownerPlayerId: "Jair" },
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
    template: {
      type: "zone.reorder",
      zone: { zone: "hand", playerId: "Jair" },
      objectIds: ["obj_..."],
    },
  },
  {
    type: "zone.shuffle",
    params: "zone",
    template: { type: "zone.shuffle", zone: { zone: "library", playerId: "Jair" } },
  },
  {
    type: "zone.moveMany",
    params: "objectIds[], to, insertIndex?, kind?",
    template: {
      type: "zone.moveMany",
      objectIds: ["obj_..."],
      to: { zone: "graveyard", playerId: "Jair" },
    },
  },
  {
    type: "priority.set",
    params: "playerId?",
    template: { type: "priority.set", playerId: "Jair" },
  },
  {
    type: "priority.pass",
    params: "playerId?",
    template: { type: "priority.pass", playerId: "Jair" },
  },
  {
    type: "turn.set",
    params: "activePlayerId?, turnNumber?, phase?, step?",
    template: { type: "turn.set", activePlayerId: "Jair", turnNumber: 1, phase: "precombatMain" },
  },
  {
    type: "note.add",
    params: "actorPlayerId?, message",
    template: { type: "note.add", actorPlayerId: "Jair", message: "debug note" },
  },
  {
    type: "state.replace",
    params: "state",
    template: { type: "state.replace", state: "paste full GameState here" },
  },
];

function createDebugGame() {
  return createGame({ players: playerNames.slice(0, 2).map((name) => ({ id: name, name })) });
}

export function App() {
  const [game, setGame] = useState<GameState>(() => createDebugGame());
  const [commandText, setCommandText] = useState(defaultCommandText);
  const [error, setError] = useState<string>();
  const [latestEvent, setLatestEvent] = useState<GameEvent>();

  const view = toGameView(game);

  function applyJsonCommand() {
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
      const result = applyCommand(game, validated.data);
      setGame(result.state);
      setLatestEvent(result.event);
    } catch (commandError) {
      if (commandError instanceof GameCommandError || commandError instanceof Error) {
        setError(commandError.message);
        return;
      }
      setError("Unexpected command error");
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

  function resetGame() {
    setGame(createDebugGame());
    setError(undefined);
    setLatestEvent(undefined);
  }

  return (
    <main className="app-shell">
      <section className="table-pane" aria-label="Game state">
        <header className="hero-card">
          <div>
            <p className="eyebrow">MTG Engine</p>
            <h1>Core State Console</h1>
          </div>
          <dl className="state-grid">
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
          {view.players.map((player) => (
            <PlayerPanel key={player.id} player={player} />
          ))}
        </section>

        <section className="section-stack">
          <h2>Shared Zones</h2>
          <div className="zone-grid">
            {sharedZones.map((zoneName) => (
              <ZonePanel key={zoneName} label={zoneName} zone={view.zones[zoneName]} />
            ))}
          </div>
        </section>
      </section>

      <aside className="console-pane" aria-label="Command console">
        <div className="console-header">
          <div>
            <p className="eyebrow">Console</p>
            <h2>Raw Command JSON</h2>
          </div>
          <button className="ghost-button" type="button" onClick={resetGame}>
            Reset Game
          </button>
        </div>

        <textarea
          className="command-input"
          spellCheck={false}
          value={commandText}
          onChange={(event) => setCommandText(event.target.value)}
        />

        <div className="button-row">
          <button className="primary-button" type="button" onClick={applyJsonCommand}>
            Apply Command
          </button>
          <button className="ghost-button" type="button" onClick={formatJson}>
            Format JSON
          </button>
        </div>

        <CommandReference onUseTemplate={setCommandText} />

        {error ? <pre className="message-box error-box">{error}</pre> : null}

        <EventPanel title="Latest Event" event={latestEvent} />

        <section className="event-log">
          <h3>Event Log</h3>
          {view.eventLog.length === 0 ? (
            <p className="empty-text">No events yet.</p>
          ) : (
            <ol>
              {[...view.eventLog].reverse().map((event) => (
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

function CommandReference({ onUseTemplate }: { onUseTemplate: (template: string) => void }) {
  return (
    <details className="command-reference" open>
      <summary>Command Reference</summary>
      <div className="reference-list">
        {commandReference.map((command) => (
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
