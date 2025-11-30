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
}

export function PhaseControls({
  state,
  onBegin,
  onFinishPreMove,
  onHellEscape,
  onRoll,
  onMove,
  onResolve,
  onAfter
}: PhaseControlsProps) {
  const disabled = state.status.state === "over";
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
      <button onClick={onBegin} disabled={disabled} style={buttonStyle}>
        Start Turn
      </button>
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
