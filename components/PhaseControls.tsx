import { GameState } from "@/lib/game";

interface PhaseControlsProps {
  state: GameState;
  onBegin: () => void;
  onFinishPreMove: () => void;
  onHellEscape: () => void;
  onRoll: () => void;
  onMove: () => void;
  onResolve: () => void;
  onAfter: () => void;
  onBuyProperty: () => void;
  onDeclineProperty: () => void;
  cpuActive?: boolean;
}

export function PhaseControls({
  state,
  onBegin,
  onFinishPreMove,
  onHellEscape,
  onRoll,
  onMove,
  onResolve,
  onAfter,
  onBuyProperty,
  onDeclineProperty,
  cpuActive
}: PhaseControlsProps) {
  const disabled = state.status.state === "over" || cpuActive;
  const startTurnReady = state.phase === "after-effects" || state.phase === "pre-move";
  const canDecideProperty = state.phase === "property-decision" && Boolean(state.propertyDecision);
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
      <button onClick={onBegin} disabled={disabled || !startTurnReady} style={buttonStyle}>
        Start Turn
      </button>
      {!startTurnReady && !disabled && (
        <span style={{ fontSize: 12, color: "#fca5a5" }}>
          Finish the current phase to begin the next turn.
        </span>
      )}
      <button onClick={onFinishPreMove} disabled={disabled || state.phase !== "pre-move"} style={buttonStyle}>
        Finish Pre-move
      </button>
      <button onClick={onHellEscape} disabled={disabled || state.phase !== "hell-escape"} style={buttonStyle}>
        Attempt Hell Escape
      </button>
      <button onClick={onRoll} disabled={disabled || state.phase !== "roll"} style={buttonStyle}>
        Roll
      </button>
      <button onClick={onMove} disabled={disabled || state.phase !== "move"} style={buttonStyle}>
        Move
      </button>
      <button onClick={onResolve} disabled={disabled || state.phase !== "resolve"} style={buttonStyle}>
        Resolve Space
      </button>
      {canDecideProperty && state.propertyDecision && (
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
          <span>
            Buy {state.propertyDecision.spaceName} for {state.propertyDecision.price} rubbies?
          </span>
          <button onClick={onBuyProperty} disabled={disabled} style={{ ...buttonStyle, background: "#22d3ee" }}>
            Buy
          </button>
          <button
            onClick={onDeclineProperty}
            disabled={disabled}
            style={{ ...buttonStyle, background: "#fca5a5" }}
          >
            Decline / Auction
          </button>
        </div>
      )}
      <button onClick={onAfter} disabled={disabled || state.phase !== "after-effects"} style={buttonStyle}>
        After-effects
      </button>
    </div>
  );
}

const buttonStyle: React.CSSProperties = {
  padding: "0.5rem 0.75rem",
  borderRadius: 8,
  border: "1px solid var(--muted)",
  background: "var(--accent)",
  color: "#0b0f1a",
  fontWeight: 700
};
