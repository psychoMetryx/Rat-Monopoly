import React, { useMemo } from "react";
import { BoardSpaceType, GameState, PlayerState } from "@/lib/game";

const spaceLabels: Record<BoardSpaceType, string> = {
  go: "Go / Lotto",
  property: "Property",
  tax: "Tax",
  church: "Church",
  draw: "Draw",
  job: "Job",
  "hell-gate": "Hell Gate",
  teleport: "Teleport",
  blank: "Blank"
};

const palette = ["#f59e0b", "#22d3ee", "#a78bfa", "#34d399", "#f472b6", "#fb7185", "#93c5fd", "#f97316"];

interface BoardProps {
  state: GameState;
}

export function Board({ state }: BoardProps) {
  const activePlayerId = state.players[state.currentPlayer]?.id;
  const tokenColors = useMemo(
    () =>
      new Map(state.players.map((player, index) => [player.id, palette[index % palette.length]])),
    [state.players]
  );

  return (
    <div className="board-layout">
      {state.boards.map((board) => {
        const playersOnBoard = state.players.filter((player) => player.boardId === board.id);
        return (
          <div key={board.id} className="board-panel">
            <div className="board-heading">
              <div>
                <div className="board-name">{board.name}</div>
                <div className="board-subtitle">{playersOnBoard.length} rat(s) present</div>
              </div>
              <div className="board-badge">{board.kind.toUpperCase()}</div>
            </div>
            <div className="board-grid">
              {board.spaces.map((space, index) => {
                const occupyingPlayers = playersOnBoard.filter((player) => player.spaceIndex === index);
                const hasActive = occupyingPlayers.some((player) => player.id === activePlayerId);
                const isHellEscape = hasActive && state.phase === "hell-escape";
                const hellOccupant = occupyingPlayers.some((player) => player.inHell);
                const badge = spaceLabels[space.type];

                return (
                  <div
                    key={space.id}
                    className={`board-space${hasActive ? " board-space-active" : ""}${hellOccupant ? " board-space-hell" : ""}`}
                  >
                    <div className="space-header">
                      <div className="space-name">{space.name}</div>
                      <div className="space-type">{badge}</div>
                    </div>
                    <div className="space-meta">
                      {space.property && (
                        <div className="meta-pill">
                          <span>Price: {space.property.price}</span>
                          <span>Rent: {space.property.rent}</span>
                        </div>
                      )}
                      {space.rubbyDelta !== undefined && <div className="meta-pill">{space.rubbyDelta > 0 ? "+" : ""}{space.rubbyDelta} rubbies</div>}
                      {space.cardDraw && <div className="meta-pill">Draw a card</div>}
                      {space.mobThreat && <div className="meta-pill">Mob threat</div>}
                      {space.sendTo && <div className="meta-pill">Warp to {space.sendTo.boardId}</div>}
                      {space.indulgenceCost && <div className="meta-pill">Indulgence {space.indulgenceCost}</div>}
                    </div>
                    <div className="token-row">
                      {occupyingPlayers.length === 0 ? (
                        <div className="space-empty">No rats here</div>
                      ) : (
                        occupyingPlayers.map((player) => (
                          <PlayerToken
                            key={player.id}
                            player={player}
                            color={tokenColors.get(player.id) ?? "var(--accent)"}
                            isActive={player.id === activePlayerId}
                            isEscaping={isHellEscape && player.id === activePlayerId}
                          />
                        ))
                      )}
                    </div>
                    {isHellEscape && <div className="space-note">Attempting to escape hell...</div>}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface TokenProps {
  player: PlayerState;
  color: string;
  isActive: boolean;
  isEscaping: boolean;
}

function PlayerToken({ player, color, isActive, isEscaping }: TokenProps) {
  return (
    <div
      className="token-chip"
      style={{
        borderColor: color,
        boxShadow: isActive ? `0 0 0 2px ${color}` : undefined,
        opacity: player.alive ? 1 : 0.65
      }}
    >
      <span className="token-dot" style={{ background: color }} />
      <div className="token-labels">
        <div className="token-name">{player.name}</div>
        <div className="token-status">
          {!player.alive ? "Dead" : player.inHell ? "In hell" : "On board"}
          {isEscaping && " • Escaping"}
        </div>
      </div>
    </div>
  );
}
