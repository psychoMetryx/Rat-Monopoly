"use client";

import { useMemo, useState } from "react";
import {
  GameState,
  applyAfterEffects,
  applyMovement,
  beginPreMove,
  finishPreMove,
  recordRoll,
  resolveCurrentSpace,
  resolveHellEscape,
  startNewSession
} from "@/lib/game";
import { PhaseControls } from "./PhaseControls";
import { PlayerPanel } from "./PlayerPanel";

function rollDie() {
  return Math.floor(Math.random() * 6) + 1;
}

function coinFlip() {
  return Math.random() > 0.5;
}

const defaultPlayers = ["Rizzo", "Scabbers", "Nibble"];

export function GameClient() {
  const [playerNames, setPlayerNames] = useState(defaultPlayers.join(", "));
  const [state, setState] = useState<GameState>(() => startNewSession(defaultPlayers));

  const activePlayer = useMemo(() => state.players[state.currentPlayer], [state]);

  const updateState = (updater: (prev: GameState) => GameState) => {
    setState((prev) => updater(prev));
  };

  const handleStart = () => {
    const names = playerNames
      .split(",")
      .map((name) => name.trim())
      .filter(Boolean);
    setState(startNewSession(names.length ? names : defaultPlayers));
  };

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "2rem", display: "grid", gap: "1rem" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ margin: 0 }}>Rat Monopoly</h1>
          <p style={{ margin: 0 }}>Phase: {state.phase}</p>
          {state.status.state === "over" && state.status.winState && (
            <p style={{ margin: 0, color: "#fca5a5" }}>
              Winner: {state.status.winState.winnerId} ({state.status.winState.reason})
            </p>
          )}
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <input
            aria-label="Player names"
            value={playerNames}
            onChange={(event) => setPlayerNames(event.target.value)}
            style={{ padding: "0.5rem", borderRadius: 8, border: "1px solid var(--muted)", minWidth: 260 }}
          />
          <button onClick={handleStart} style={{ ...buttonStyle, background: "#22d3ee" }}>
            Start Session
          </button>
        </div>
      </header>

      <section style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1rem", alignItems: "start" }}>
        <div style={{ display: "grid", gap: "1rem" }}>
          <div style={{ padding: "1rem", borderRadius: 12, background: "var(--muted)" }}>
            <h2 style={{ marginTop: 0 }}>Turn controls</h2>
            <p style={{ marginTop: 0 }}>Current rat: {activePlayer.name}</p>
            <PhaseControls
              state={state}
              onBegin={() => updateState(beginPreMove)}
              onFinishPreMove={() => updateState(finishPreMove)}
              onHellEscape={() => updateState((prev) => resolveHellEscape(prev, rollDie(), coinFlip()))}
              onRoll={() => updateState((prev) => recordRoll(prev, rollDie()))}
              onMove={() => updateState(applyMovement)}
              onResolve={() => updateState(resolveCurrentSpace)}
              onAfter={() => updateState(applyAfterEffects)}
            />
            <div style={{ marginTop: "0.5rem" }}>
              <span style={{ fontWeight: 700 }}>Last roll:</span> {state.lastRoll ?? "n/a"}
            </div>
          </div>

          <div style={{ padding: "1rem", borderRadius: 12, background: "var(--muted)" }}>
            <h2 style={{ marginTop: 0 }}>Log</h2>
            <div style={{ display: "grid", gap: "0.25rem" }}>
              {state.log.map((entry, index) => (
                <div key={index} style={{ fontSize: "0.95rem" }}>
                  {index + 1}. {entry}
                </div>
              ))}
            </div>
          </div>
        </div>
        <aside style={{ padding: "1rem", borderRadius: 12, background: "var(--muted)" }}>
          <h2 style={{ marginTop: 0 }}>Players</h2>
          <PlayerPanel state={state} />
          <div style={{ marginTop: "1rem" }}>
            <div>Jackpot: {state.jackpot}</div>
            <div>Deck remaining: {state.deck.length}</div>
          </div>
        </aside>
      </section>
    </div>
  );
}

const buttonStyle: React.CSSProperties = {
  padding: "0.5rem 0.75rem",
  borderRadius: 8,
  border: "1px solid transparent",
  background: "var(--accent)",
  color: "#0b0f1a",
  fontWeight: 700
};
