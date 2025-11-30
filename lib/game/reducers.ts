import { createInitialGameState } from "./setup";
import {
  BoardDefinition,
  BoardSpace,
  CardDefinition,
  GameState,
  PlayerState,
  TurnPhase,
  WinState
} from "./types";

function cloneState(state: GameState): GameState {
  return JSON.parse(JSON.stringify(state));
}

function getBoard(state: GameState, boardId: string): BoardDefinition {
  const board = state.boards.find((b) => b.id === boardId);
  if (!board) {
    throw new Error(`Board ${boardId} not found`);
  }
  return board;
}

function currentPlayer(state: GameState): PlayerState {
  return state.players[state.currentPlayer];
}

function updatePlayer(state: GameState, updater: (player: PlayerState) => PlayerState): GameState {
  const next = cloneState(state);
  next.players[next.currentPlayer] = updater(next.players[next.currentPlayer]);
  return next;
}

function appendLog(state: GameState, message: string): GameState {
  return { ...state, log: [...state.log, message] };
}

function pushCardToDiscard(state: GameState, card: CardDefinition): GameState {
  return { ...state, discard: [...state.discard, card] };
}

function markGameOver(state: GameState, winState: WinState): GameState {
  return {
    ...state,
    phase: "game-over",
    status: { state: "over", winState },
    log: [...state.log, `Game over: ${winState.winnerId} wins by ${winState.reason}.`]
  };
}

function collectJackpot(state: GameState, amount: number): GameState {
  return appendLog({ ...state, jackpot: Math.max(0, state.jackpot + amount) }, `Jackpot changed by ${amount}.`);
}

function advanceToNextPlayer(state: GameState): GameState {
  const living = state.players.filter((p) => p.alive);
  if (living.length === 0) {
    return state;
  }
  let nextIndex = state.currentPlayer;
  do {
    nextIndex = (nextIndex + 1) % state.players.length;
  } while (!state.players[nextIndex].alive);
  return { ...state, currentPlayer: nextIndex, phase: "pre-move", lastRoll: undefined };
}

function checkWinConditions(state: GameState): GameState {
  if (state.status.state === "over") return state;
  const livingPlayers = state.players.filter((p) => p.alive);
  if (livingPlayers.length === 1) {
    return markGameOver(state, { winnerId: livingPlayers[0].id, reason: "last-rat" });
  }

  const indulgenceWinner = state.players.find((p) => p.indulgences >= 3 && p.alive);
  if (indulgenceWinner) {
    return markGameOver(state, { winnerId: indulgenceWinner.id, reason: "indulgences" });
  }

  const richWinner = state.players.find((p) => p.rubbies >= 3000 && p.alive);
  if (richWinner) {
    return markGameOver(state, { winnerId: richWinner.id, reason: "wealth" });
  }

  return state;
}

function resolveCardEffect(state: GameState, card: CardDefinition): GameState {
  let next = state;
  if (card.rubbyDelta) {
    next = updatePlayer(next, (player) => ({ ...player, rubbies: Math.max(0, player.rubbies + card.rubbyDelta) }));
  }
  if (card.kind === "indulgence") {
    next = updatePlayer(next, (player) => ({ ...player, indulgences: player.indulgences + 1 }));
  }
  if (card.moveTo) {
    next = updatePlayer(next, (player) => ({ ...player, boardId: card.moveTo!.boardId, spaceIndex: card.moveTo!.index }));
  }
  if (card.sendToHell) {
    next = updatePlayer(next, (player) => ({
      ...player,
      boardId: "hell",
      spaceIndex: 0,
      inHell: true,
      hellEscapes: 0,
      jobProtected: false
    }));
  }
  next = pushCardToDiscard(next, card);
  return appendLog(next, `Card resolved: ${card.description}`);
}

function drawCard(state: GameState): GameState {
  if (state.deck.length === 0) {
    return appendLog(state, "Deck is empty; no card drawn.");
  }
  const [card, ...rest] = state.deck;
  const next: GameState = { ...state, deck: rest, pendingCard: card };
  return resolveCardEffect(next, card);
}

function resolveSpaceEffect(state: GameState, space: BoardSpace): GameState {
  let next = state;
  if (space.rubbyDelta) {
    next = updatePlayer(next, (player) => ({ ...player, rubbies: Math.max(0, player.rubbies + space.rubbyDelta!) }));
    if (space.rubbyDelta < 0) {
      next = collectJackpot(next, Math.abs(space.rubbyDelta));
    }
  }
  if (space.indulgenceCost) {
    next = updatePlayer(next, (player) => ({
      ...player,
      rubbies: Math.max(0, player.rubbies - space.indulgenceCost!),
      indulgences: player.indulgences + 1
    }));
  }
  if (space.cardDraw) {
    next = drawCard(next);
  }
  if (space.type === "job") {
    next = updatePlayer(next, (player) => ({ ...player, jobProtected: true }));
  }
  if (space.type === "hell-gate") {
    next = updatePlayer(next, (player) => ({
      ...player,
      boardId: "hell",
      spaceIndex: 0,
      inHell: true,
      hellEscapes: 0,
      jobProtected: false
    }));
    next = appendLog(next, `${currentPlayer(next).name} was dragged to hell.`);
  }
  if (space.sendTo) {
    next = updatePlayer(next, (player) => ({ ...player, boardId: space.sendTo!.boardId, spaceIndex: space.sendTo!.index }));
    next = appendLog(next, `${currentPlayer(next).name} warped to ${space.sendTo.boardId}.`);
  }
  return next;
}

function movePlayerOnBoard(state: GameState): GameState {
  const player = currentPlayer(state);
  const board = getBoard(state, player.boardId);
  if (typeof state.lastRoll !== "number") {
    throw new Error("Cannot move without a recorded roll.");
  }
  const newIndex = (player.spaceIndex + state.lastRoll) % board.spaces.length;
  const updated = updatePlayer(state, (p) => ({ ...p, spaceIndex: newIndex }));
  return appendLog(updated, `${player.name} moved ${state.lastRoll} spaces to ${board.spaces[newIndex].name}.`);
}

export function beginPreMove(state: GameState): GameState {
  if (state.status.state === "over") return state;
  return { ...state, phase: "pre-move", lastRoll: undefined };
}

export function finishPreMove(state: GameState): GameState {
  if (state.status.state === "over") return state;
  const player = currentPlayer(state);
  if (player.inHell) {
    return { ...state, phase: "hell-escape" };
  }
  return { ...state, phase: "roll" };
}

export function resolveHellEscape(state: GameState, roll: number, firingSquadHeads?: boolean): GameState {
  if (state.status.state === "over") return state;
  const priorAttempts = currentPlayer(state).hellEscapes;
  const attempt = priorAttempts + 1;
  let next = updatePlayer(state, (player) => ({ ...player, hellEscapes: attempt }));
  const player = currentPlayer(next);

  const requiredRoll = attempt === 1 ? 6 : attempt === 2 ? 5 : 4;
  const escapeSucceeded = roll >= requiredRoll;

  if (escapeSucceeded) {
    next = updatePlayer(next, (p) => ({ ...p, inHell: false, hellEscapes: 0 }));
    next = appendLog(next, `${player.name} escaped hell on attempt ${attempt} with a roll of ${roll} (needed ${requiredRoll}+).`);
    return { ...next, phase: "roll" };
  }

  if (attempt >= 4) {
    next = appendLog(next, `${player.name} failed a fourth hell escape (roll ${roll}) and faces the firing squad.`);
    const survives = firingSquadHeads ?? false;
    if (!survives) {
      next = updatePlayer(next, (p) => ({ ...p, alive: false }));
      next = collectJackpot(next, player.rubbies + 1000);
      next = appendLog(next, `${player.name} was executed in hell.`);
      next = checkWinConditions(next);
      return { ...next, phase: next.status.state === "over" ? "game-over" : "after-effects" };
    }
    next = appendLog(next, `${player.name} survived the firing squad coin flip and returns to GO.`);
    next = updatePlayer(next, (p) => ({ ...p, boardId: "surface", spaceIndex: 0, inHell: false, hellEscapes: 0 }));
    return { ...next, phase: "after-effects" };
  }

  next = appendLog(next, `${player.name} failed hell escape attempt ${attempt} with a roll of ${roll} (needed ${requiredRoll}+).`);
  return { ...next, phase: "after-effects" };
}

export function recordRoll(state: GameState, roll: number): GameState {
  if (state.status.state === "over") return state;
  return appendLog({ ...state, lastRoll: roll, phase: "move" }, `${currentPlayer(state).name} rolled a ${roll}.`);
}

export function applyMovement(state: GameState): GameState {
  if (state.status.state === "over") return state;
  const moved = movePlayerOnBoard(state);
  return { ...moved, phase: "resolve" };
}

export function resolveCurrentSpace(state: GameState): GameState {
  if (state.status.state === "over") return state;
  const player = currentPlayer(state);
  const board = getBoard(state, player.boardId);
  const space = board.spaces[player.spaceIndex];
  const resolved = resolveSpaceEffect(state, space);
  const withLog = appendLog(resolved, `${player.name} resolved ${space.name}.`);
  const checked = checkWinConditions(withLog);
  return { ...checked, phase: checked.status.state === "over" ? "game-over" : "after-effects" };
}

export function applyAfterEffects(state: GameState): GameState {
  if (state.status.state === "over") return state;
  let next = state;
  const player = currentPlayer(next);
  if (player.jobProtected && player.boardId === "surface" && player.spaceIndex === 0) {
    next = updatePlayer(next, (p) => ({ ...p, jobProtected: false }));
    next = appendLog(next, `${player.name}'s job protection expired after passing GO.`);
  }
  next = checkWinConditions(next);
  if (next.status.state === "over") {
    return { ...next, phase: "game-over" };
  }
  const advanced = advanceToNextPlayer(next);
  return appendLog(advanced, `Turn passes to ${currentPlayer(advanced).name}.`);
}

export function startNewSession(names: string[]): GameState {
  return createInitialGameState(names);
}
