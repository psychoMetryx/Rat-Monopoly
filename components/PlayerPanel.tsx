import { GameState } from "@/lib/game";

interface PlayerPanelProps {
  state: GameState;
}

export function PlayerPanel({ state }: PlayerPanelProps) {
  return (
    <div style={{ display: "grid", gap: "0.5rem" }}>
      {state.players.map((player) => (
        <div
          key={player.id}
          style={{
            padding: "0.75rem",
            borderRadius: 8,
            background: player.alive ? "var(--muted)" : "#4b5563",
            border: `2px solid ${state.players[state.currentPlayer].id === player.id ? "var(--accent)" : "transparent"}`
          }}
        >
          <div style={{ fontWeight: 700 }}>{player.name}</div>
          <div>Rubbies: {player.rubbies}</div>
          <div>Indulgences: {player.indulgences}</div>
          <div>Status: {player.alive ? (player.inHell ? "In hell" : "Alive") : "Dead"}</div>
          <div>
            Position: {player.boardId} @ {player.spaceIndex}
          </div>
          {player.jobProtected && <div>Job protected</div>}
        </div>
      ))}
    </div>
  );
}
