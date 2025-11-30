import {
  applyAfterEffects,
  applyMovement,
  beginPreMove,
  finishPreMove,
  recordRoll,
  resolveCurrentSpace,
  resolveGoLottoRoll,
  resolveHellEscape,
  takeGoPayout,
  placeGoWager
} from "../reducers";
import { BoardSpace, GameState, PlayerState } from "../types";

export type CpuActionKind =
  | "begin"
  | "finish-pre-move"
  | "hell-escape"
  | "roll"
  | "move"
  | "resolve"
  | "go-payout"
  | "go-wager"
  | "go-roll"
  | "after-effects";

export interface CpuDecision {
  kind: CpuActionKind;
  roll?: number;
  surviveFiringSquad?: boolean;
  lottoCall?: "aggressive" | "conservative";
  calledFace?: number;
  buyIndulgence?: boolean;
  debtRepayment?: number;
  auctionBid?: number;
  notes: string[];
}

function evaluateSpaceDanger(space: BoardSpace): number {
  let danger = 0;
  if (space.type === "hell-gate") {
    danger += 600;
  }
  if (space.rubbyDelta && space.rubbyDelta < 0) {
    danger += Math.abs(space.rubbyDelta);
  }
  if (space.type === "property" && space.property) {
    const multiplier = space.property.taxOfficeMultiplier ?? 1;
    danger += space.property.rent * multiplier;
  }
  if (space.type === "tax") {
    danger += 120;
  }
  if (space.indulgenceCost) {
    danger += space.indulgenceCost / 2;
  }
  return danger;
}

function predictLandingSpace(player: PlayerState, state: GameState, roll: number): BoardSpace {
  const board = state.boards.find((b) => b.id === player.boardId);
  if (!board) {
    throw new Error(`Board ${player.boardId} not found`);
  }
  const newIndex = (player.spaceIndex + roll) % board.spaces.length;
  return board.spaces[newIndex];
}

function chooseRiskAwareRoll(state: GameState, player: PlayerState): { roll: number; note: string } {
  const samples = Array.from({ length: 6 }, (_, index) => index + 1);
  const scored = samples.map((roll) => {
    const space = predictLandingSpace(player, state, roll);
    const danger = evaluateSpaceDanger(space);
    let desirability = 10 - danger * 0.05;
    if (space.type === "draw") {
      desirability += state.jackpot > 300 ? 4 : 2;
    }
    if (space.type === "go") {
      desirability += 3;
    }
    if (space.type === "job") {
      desirability += 1.5;
    }
    return { roll, space, desirability };
  });

  scored.sort((a, b) => b.desirability - a.desirability);
  const [best] = scored;
  return {
    roll: best.roll,
    note: `Chose roll ${best.roll} targeting ${best.space.name} with desirability ${best.desirability.toFixed(1)}`
  };
}

function shouldBuyIndulgence(player: PlayerState, space: BoardSpace): boolean {
  if (!space.indulgenceCost) return false;
  if (player.indulgences >= 2) return false;
  return player.rubbies - space.indulgenceCost >= 100;
}

function planDebtRepayment(player: PlayerState): number {
  if (player.rubbies < 150) return 0;
  return Math.floor(player.rubbies * 0.2);
}

function planLottoRisk(state: GameState): "aggressive" | "conservative" {
  if (state.jackpot >= 400) return "aggressive";
  return "conservative";
}

export function decideCpuAction(state: GameState): CpuDecision {
  const player = state.players[state.currentPlayer];
  const notes: string[] = [];
  if (state.phase === "pre-move") {
    notes.push("Clearing pre-move checks");
    return { kind: "finish-pre-move", notes };
  }
  if (state.phase === "hell-escape") {
    const roll = Math.max(1, Math.min(6, Math.round(Math.random() * 6)));
    const surviveFiringSquad = player.hellEscapes >= 2;
    notes.push("In hell - prioritizing survival");
    return { kind: "hell-escape", roll, surviveFiringSquad, notes };
  }
  if (state.phase === "roll") {
    const { roll, note } = chooseRiskAwareRoll(state, player);
    notes.push("Rent avoidance and lotto risk tuning", note);
    return { kind: "roll", roll, notes, lottoCall: planLottoRisk(state) };
  }
  if (state.phase === "move") {
    notes.push("Advance to landing space");
    return { kind: "move", notes };
  }
  if (state.phase === "resolve") {
    const board = state.boards.find((b) => b.id === player.boardId);
    const space = board?.spaces[player.spaceIndex];
    const buyIndulgence = space ? shouldBuyIndulgence(player, space) : false;
    notes.push("Resolve current space effects");
    if (buyIndulgence) {
      notes.push("Buying indulgence to hedge against penalties");
    }
    const plannedDebt = planDebtRepayment(player);
    if (plannedDebt > 0) {
      notes.push(`Repaying ${plannedDebt} rubbies if debt exists`);
    }
    return {
      kind: "resolve",
      notes,
      buyIndulgence,
      debtRepayment: plannedDebt,
      auctionBid: player.rubbies > 300 ? Math.min(200, Math.floor(player.rubbies * 0.25)) : 0
    };
  }
  if (state.phase === "go-lotto") {
    const risk = planLottoRisk(state);
    const calledFace = Math.floor(Math.random() * 6) + 1;
    if (risk === "aggressive" || state.jackpot >= 200) {
      notes.push("Gambling GO payout on lotto", `Calling ${calledFace}`);
      return { kind: "go-wager", notes, calledFace };
    }
    notes.push("Taking safe 200 rubbies from GO");
    return { kind: "go-payout", notes };
  }
  if (state.phase === "go-lotto-roll") {
    const roll = Math.floor(Math.random() * 6) + 1;
    notes.push("Rolling for GO lotto jackpot");
    return { kind: "go-roll", roll, notes };
  }
  if (state.phase === "after-effects") {
    notes.push("Wrapping up turn");
    return { kind: "after-effects", notes };
  }
  return { kind: "begin", notes };
}

export function applyCpuDecision(state: GameState, decision: CpuDecision): GameState {
  if (state.status.state === "over") return state;
  const player = state.players[state.currentPlayer];
  const logNote = decision.notes.length
    ? `${player.name} (CPU): ${decision.notes.join(" | ")}`
    : undefined;
  const baseState = logNote ? { ...state, log: [...state.log, logNote] } : state;

  switch (decision.kind) {
    case "finish-pre-move":
      return finishPreMove(baseState);
    case "hell-escape": {
      const roll = decision.roll ?? Math.floor(Math.random() * 6) + 1;
      return resolveHellEscape(baseState, roll, decision.surviveFiringSquad);
    }
    case "roll": {
      const roll = decision.roll ?? Math.floor(Math.random() * 6) + 1;
      return recordRoll(baseState, roll);
    }
    case "move":
      return applyMovement(baseState);
    case "resolve":
      return resolveCurrentSpace(baseState);
    case "go-payout":
      return takeGoPayout(baseState);
    case "go-wager":
      return placeGoWager(baseState, decision.calledFace ?? Math.floor(Math.random() * 6) + 1);
    case "go-roll":
      return resolveGoLottoRoll(baseState, decision.roll ?? Math.floor(Math.random() * 6) + 1);
    case "after-effects":
      return applyAfterEffects(baseState);
    default:
      return beginPreMove(baseState);
  }
}

export function describeCpuRole(state: GameState): string {
  const player = state.players[state.currentPlayer];
  if (player.inHell) return "Survival mode";
  if (player.rubbies < 150) return "Frugal rat";
  if (player.indulgences > 0) return "Indulgent raider";
  return "Balanced opportunist";
}
