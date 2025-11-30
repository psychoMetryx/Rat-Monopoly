"use client";

import { useEffect, useMemo, useState } from "react";
import {
  GameState,
  applyAfterEffects,
  applyMovement,
  beginPreMove,
  finishPreMove,
  recordRoll,
  resolveCurrentSpace,
  resolveHellEscape,
  resolveGoLottoRoll,
  startNewSession,
  applyCpuDecision,
  decideCpuAction,
  describeCpuRole,
  placeGoWager,
  takeGoPayout,
  buyPendingProperty,
  declinePendingProperty
} from "@/lib/game";
import { PhaseControls } from "./PhaseControls";
import { PlayerPanel } from "./PlayerPanel";

function rollDie() {
  return Math.floor(Math.random() * 6) + 1;
}

function coinFlip() {
  return Math.random() > 0.5;
}

type PlayerSlot = { name: string; isCPU: boolean };

const defaultPlayers: PlayerSlot[] = [
  { name: "Rizzo", isCPU: false },
  { name: "Scabbers", isCPU: false },
  { name: "Nibble", isCPU: true }
];

export function GameClient() {
  const [playerSlots, setPlayerSlots] = useState<PlayerSlot[]>(defaultPlayers);
  const [state, setState] = useState<GameState>(() => startNewSession(defaultPlayers.map((slot) => slot.name)));
  const [cpuPlayerIds, setCpuPlayerIds] = useState<Set<string>>(
    () => new Set(defaultPlayers.map((slot, index) => (slot.isCPU ? `player-${index + 1}` : null)).filter(Boolean) as string[])
  );

  const activePlayer = useMemo(() => state.players[state.currentPlayer], [state]);

  const updateState = (updater: (prev: GameState) => GameState) => {
    setState((prev) => updater(prev));
  };

  const handleStart = () => {
    const trimmed = playerSlots
      .map((slot) => ({ ...slot, name: slot.name.trim() }))
      .filter((slot) => slot.name.length > 0);
    const effectiveSlots = trimmed.length ? trimmed : defaultPlayers;
    const names = effectiveSlots.map((slot) => slot.name);
    const newState = startNewSession(names);
    const newCpuIds = new Set(
      newState.players
        .filter((_, index) => effectiveSlots[index]?.isCPU ?? false)
        .map((player) => player.id)
    );
    setCpuPlayerIds(newCpuIds);
    setState(newState);
  };

  useEffect(() => {
    if (state.status.state === "over") return;
    const activePlayer = state.players[state.currentPlayer];
    if (!cpuPlayerIds.has(activePlayer.id)) return;
    const timer = setTimeout(() => {
      setState((prev) => applyCpuDecision(prev, decideCpuAction(prev)));
    }, 450);
    return () => clearTimeout(timer);
  }, [cpuPlayerIds, state]);

  const updateSlot = (index: number, updater: (slot: PlayerSlot) => PlayerSlot) => {
    setPlayerSlots((prev) => prev.map((slot, i) => (i === index ? updater(slot) : slot)));
  };

  const addSlot = (isCPU: boolean) => {
    setPlayerSlots((prev) => [...prev, { name: isCPU ? `CPU ${prev.length + 1}` : `Player ${prev.length + 1}`, isCPU }]);
  };

  const removeSlot = (index: number) => {
    setPlayerSlots((prev) => prev.filter((_, i) => i !== index));
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
        <div style={{ display: "grid", gap: "0.5rem" }}>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button onClick={() => addSlot(false)} style={{ ...buttonStyle, background: "#a5b4fc" }}>
              Add Human
            </button>
            <button onClick={() => addSlot(true)} style={{ ...buttonStyle, background: "#86efac" }}>
              Add CPU
            </button>
            <button onClick={handleStart} style={{ ...buttonStyle, background: "#22d3ee" }}>
              Start Session
            </button>
          </div>
          <div style={{ display: "grid", gap: "0.5rem" }}>
            {playerSlots.map((slot, index) => (
              <div
                key={index}
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 1fr auto",
                  alignItems: "center",
                  gap: "0.5rem"
                }}
              >
                <input
                  aria-label={`Player ${index + 1} name`}
                  value={slot.name}
                  onChange={(event) => updateSlot(index, (prev) => ({ ...prev, name: event.target.value }))}
                  style={{ padding: "0.5rem", borderRadius: 8, border: "1px solid var(--muted)" }}
                />
                <label style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  <input
                    type="checkbox"
                    checked={slot.isCPU}
                    onChange={(event) => updateSlot(index, (prev) => ({ ...prev, isCPU: event.target.checked }))}
                  />
                  CPU
                </label>
                <button onClick={() => removeSlot(index)} style={{ ...buttonStyle, background: "#fca5a5" }}>
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      </header>

      <section style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1rem", alignItems: "start" }}>
        <div style={{ display: "grid", gap: "1rem" }}>
          <div style={{ padding: "1rem", borderRadius: 12, background: "var(--muted)" }}>
            <h2 style={{ marginTop: 0 }}>Turn controls</h2>
            <p style={{ marginTop: 0 }}>
              Current rat: {activePlayer.name} {cpuPlayerIds.has(activePlayer.id) ? "(CPU)" : "(Human)"}
            </p>
            {cpuPlayerIds.has(activePlayer.id) && (
              <p style={{ marginTop: 0, color: "#34d399" }}>CPU role: {describeCpuRole(state)}</p>
            )}
            <PhaseControls
              state={state}
              onBegin={() => updateState(beginPreMove)}
              onFinishPreMove={() => updateState(finishPreMove)}
              onHellEscape={() => updateState((prev) => resolveHellEscape(prev, rollDie(), coinFlip()))}
              onRoll={() => updateState((prev) => recordRoll(prev, rollDie()))}
              onMove={() => updateState(applyMovement)}
              onResolve={() => updateState(resolveCurrentSpace)}
              onAfter={() => updateState(applyAfterEffects)}
              onBuyProperty={() => updateState(buyPendingProperty)}
              onDeclineProperty={() => updateState(declinePendingProperty)}
              cpuActive={cpuPlayerIds.has(activePlayer.id)}
            />
            {(state.phase === "go-lotto" || state.phase === "go-lotto-roll") && (
              <div style={{ marginTop: "1rem", padding: "0.75rem", borderRadius: 8, background: "#0f172a" }}>
                <h3 style={{ marginTop: 0 }}>GO / Rat Lotto</h3>
                <p style={{ marginTop: 0 }}>Jackpot: {state.jackpot}</p>
                {state.phase === "go-lotto" && (
                  <div style={{ display: "grid", gap: "0.5rem" }}>
                    <button
                      onClick={() => updateState(takeGoPayout)}
                      disabled={cpuPlayerIds.has(activePlayer.id)}
                      style={{ ...buttonStyle, background: "#22d3ee" }}
                    >
                      Take 200 rubbies
                    </button>
                    <div>
                      Or wager the 200 on a die face:
                      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.5rem" }}>
                        {[1, 2, 3, 4, 5, 6].map((face) => (
                          <button
                            key={face}
                            onClick={() => updateState((prev) => placeGoWager(prev, face))}
                            disabled={cpuPlayerIds.has(activePlayer.id)}
                            style={{ ...buttonStyle, background: "#fef08a", color: "#0b0f1a" }}
                          >
                            Call {face}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                {state.phase === "go-lotto-roll" && state.goLotto?.calledFace && (
                  <div style={{ display: "grid", gap: "0.5rem" }}>
                    <div>Called face: {state.goLotto.calledFace}</div>
                    <button
                      onClick={() => updateState((prev) => resolveGoLottoRoll(prev, rollDie()))}
                      disabled={cpuPlayerIds.has(activePlayer.id)}
                      style={{ ...buttonStyle, background: "#a5b4fc" }}
                    >
                      Roll for jackpot
                    </button>
                  </div>
                )}
              </div>
            )}
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
          <PlayerPanel state={state} cpuPlayerIds={cpuPlayerIds} />
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
