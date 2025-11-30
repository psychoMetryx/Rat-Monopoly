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

function updatePlayerById(
  state: GameState,
  playerId: string,
  updater: (player: PlayerState) => PlayerState
): GameState {
  const index = state.players.findIndex((p) => p.id === playerId);
  if (index === -1) return state;
  const next = cloneState(state);
  next.players[index] = updater(next.players[index]);
  return next;
}

function resetDeeds(player: PlayerState): PlayerState {
  return { ...player, ownedProperties: [], propertyMetadata: undefined };
}

function resetHoldings(player: PlayerState): PlayerState {
  return { ...resetDeeds(player), indulgences: 0, rubbies: 0 };
}

function findPropertyOwner(state: GameState, propertyId: string): PlayerState | undefined {
  return state.players.find((player) => player.ownedProperties.includes(propertyId));
}

function enforceBankruptcy(state: GameState, message?: string): GameState {
  const player = currentPlayer(state);
  if (player.rubbies > 0) return state;
  const indulgencesLost = player.indulgences;
  const forfeiture = player.rubbies;
  const bankrupt = updatePlayer(state, (p) => resetHoldings(p));
  const withPot = collectJackpot(bankrupt, forfeiture);
  const withIndulgenceLog = appendLog(
    withPot,
    `${player.name} discarded ${indulgencesLost} indulgence${indulgencesLost === 1 ? "" : "s"}.`
  );
  const withMessage = appendLog(
    withIndulgenceLog,
    message ?? `${player.name} is bankrupt and returned all deeds to the bank. ${forfeiture} rubbies moved to the jackpot.`
  );
  const checked = checkWinConditions(withMessage);
  return { ...checked, phase: checked.status.state === "over" ? "game-over" : state.phase };
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

function spendIndulgence(state: GameState, message: string): GameState {
  const player = currentPlayer(state);
  const next = updatePlayer(state, (p) => ({ ...p, indulgences: Math.max(0, p.indulgences - 1) }));
  return appendLog(next, message.replace("{player}", player.name));
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

function startGoLotto(state: GameState): GameState {
  const next: GameState = { ...state, goLotto: { status: "choose" }, phase: "go-lotto" };
  return appendLog(next, `${currentPlayer(next).name} reached GO and must choose a payout or lotto call.`);
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
    next = enforceBankruptcy(next);
  }
  if (card.kind === "indulgence") {
    next = updatePlayer(next, (player) => ({ ...player, indulgences: player.indulgences + 1 }));
  }
  if (card.moveTo) {
    next = updatePlayer(next, (player) => ({ ...player, boardId: card.moveTo!.boardId, spaceIndex: card.moveTo!.index }));
  }
  if (card.sendToHell) {
    const player = currentPlayer(next);
    if (player.indulgences > 0) {
      next = spendIndulgence(next, `${player.name} spent an indulgence to avoid being dragged to hell.`);
    } else {
      next = updatePlayer(next, (p) => ({
        ...p,
        boardId: "hell",
        spaceIndex: 0,
        inHell: true,
        hellEscapes: 0,
        jobProtected: false
      }));
    }
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

function resolvePropertyLanding(state: GameState, space: BoardSpace): GameState {
  if (!space.property) return state;
  const player = currentPlayer(state);
  const owner = findPropertyOwner(state, space.id);

  if (owner && owner.id === player.id) {
    return appendLog(state, `${player.name} already owns ${space.name}.`);
  }

  if (owner && owner.id !== player.id) {
    if (player.jobProtected) {
      return appendLog(state, `${player.name} is employed and skips rent on ${space.name}.`);
    }
    const multiplier = space.property.taxOfficeMultiplier ?? 1;
    const rentDue = space.property.rent * multiplier;
    const payment = Math.min(player.rubbies, rentDue);
    let next = updatePlayer(state, (p) => ({ ...p, rubbies: p.rubbies - payment }));
    next = updatePlayerById(next, owner.id, (p) => ({ ...p, rubbies: p.rubbies + payment }));
    const rentNote = multiplier > 1 ? ` (x${multiplier} tax office rate)` : "";
    next = appendLog(next, `${player.name} paid ${payment} rubbies to ${owner.name} for ${space.name}${rentNote}.`);
    if (payment < rentDue) {
      const indulgencesLost = currentPlayer(next).indulgences;
      const forfeiture = currentPlayer(next).rubbies;
      next = updatePlayer(next, (p) => resetHoldings(p));
      next = collectJackpot(next, forfeiture);
      next = appendLog(
        next,
        `${player.name} discarded ${indulgencesLost} indulgence${indulgencesLost === 1 ? "" : "s"}.`
      );
      next = appendLog(next, `${player.name} moved ${forfeiture} rubbies to the jackpot upon bankruptcy.`);
      next = appendLog(next, `${player.name} went bankrupt on ${space.name} and returned all deeds to the bank.`);
      next = checkWinConditions(next);
      return { ...next, phase: next.status.state === "over" ? "game-over" : "after-effects" };
    }
    return next;
  }

  if (player.jobProtected) {
    return appendLog(state, `${player.name} cannot buy ${space.name} while employed.`);
  }

  if (player.rubbies < space.property.price) {
    return appendLog(state, `${player.name} cannot afford ${space.name} (cost ${space.property.price}).`);
  }

  let purchased = updatePlayer(state, (p) => ({
    ...p,
    rubbies: p.rubbies - space.property!.price,
    ownedProperties: Array.from(new Set([...(p.ownedProperties ?? []), space.id])),
    propertyMetadata: {
      ...(p.propertyMetadata ?? {}),
      [space.id]: { purchasePrice: space.property!.price }
    }
  }));
  purchased = appendLog(purchased, `${player.name} bought ${space.name} for ${space.property.price} rubbies.`);
  return purchased;
}

function resolveSpaceEffect(state: GameState, space: BoardSpace): GameState {
  let next = state;
  if (space.type === "go") {
    return startGoLotto(state);
  }
  if (space.type === "property") {
    return resolvePropertyLanding(state, space);
  }
  if (space.rubbyDelta) {
    next = updatePlayer(next, (player) => ({ ...player, rubbies: Math.max(0, player.rubbies + space.rubbyDelta!) }));
    if (space.rubbyDelta < 0) {
      next = collectJackpot(next, Math.abs(space.rubbyDelta));
    }
    next = enforceBankruptcy(next);
  }
  if (space.indulgenceCost) {
    next = updatePlayer(next, (player) => ({
      ...player,
      rubbies: Math.max(0, player.rubbies - space.indulgenceCost!),
      indulgences: player.indulgences + 1
    }));
    next = enforceBankruptcy(next);
  }
  if (space.cardDraw) {
    next = drawCard(next);
  }
  if (space.type === "job") {
    next = updatePlayer(next, (player) => ({ ...player, jobProtected: true }));
  }
  if (space.type === "hell-gate") {
    const player = currentPlayer(next);
    if (player.indulgences > 0) {
      next = spendIndulgence(next, `${player.name} spent an indulgence to avoid hell entry.`);
    } else {
      next = updatePlayer(next, (p) => ({
        ...p,
        boardId: "hell",
        spaceIndex: 0,
        inHell: true,
        hellEscapes: 0,
        jobProtected: false
      }));
      next = appendLog(next, `${currentPlayer(next).name} was dragged to hell.`);
    }
  }
  if (space.sendTo) {
    const destinationBoard = getBoard(next, space.sendTo.boardId);
    const destinationSpace = destinationBoard.spaces[space.sendTo.index];
    next = updatePlayer(next, (player) => ({ ...player, boardId: space.sendTo!.boardId, spaceIndex: space.sendTo!.index }));
    next = appendLog(next, `${currentPlayer(next).name} warped to ${space.sendTo.boardId}.`);
    if (destinationSpace?.type === "go") {
      return startGoLotto(next);
    }
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
  const player = currentPlayer(state);

  if (player.indulgences > 0) {
    let next = spendIndulgence(state, `${player.name} spent an indulgence to escape hell immediately.`);
    next = updatePlayer(next, (p) => ({ ...p, inHell: false, hellEscapes: 0 }));
    return { ...next, phase: "roll" };
  }

  const priorAttempts = currentPlayer(state).hellEscapes;
  const attempt = priorAttempts + 1;
  let next = updatePlayer(state, (player) => ({ ...player, hellEscapes: attempt }));
  const playerAfterAttempt = currentPlayer(next);

  const requiredRoll = attempt === 1 ? 6 : attempt === 2 ? 5 : 4;
  const escapeSucceeded = roll >= requiredRoll;

  if (escapeSucceeded) {
    next = updatePlayer(next, (p) => ({ ...p, inHell: false, hellEscapes: 0 }));
    next = appendLog(
      next,
      `${playerAfterAttempt.name} escaped hell on attempt ${attempt} with a roll of ${roll} (needed ${requiredRoll}+).`
    );
    return { ...next, phase: "roll" };
  }

  if (attempt >= 4) {
    next = appendLog(next, `${playerAfterAttempt.name} failed a fourth hell escape (roll ${roll}) and faces the firing squad.`);
    const survives = firingSquadHeads ?? false;
    if (!survives) {
      const playerRubbies = currentPlayer(next).rubbies;
      const indulgencesLost = currentPlayer(next).indulgences;
      const forfeiture = playerRubbies + 1000;
      next = updatePlayer(next, (p) => ({ ...resetHoldings(p), alive: false }));
      next = collectJackpot(next, forfeiture);
      next = appendLog(
        next,
        `${player.name} forfeited ${forfeiture} rubbies to the jackpot and discarded ${indulgencesLost} indulgence${
          indulgencesLost === 1 ? "" : "s"
        }.`
      );
      next = appendLog(next, `${playerAfterAttempt.name} was executed in hell.`);
      next = checkWinConditions(next);
      return { ...next, phase: next.status.state === "over" ? "game-over" : "after-effects" };
    }
    next = appendLog(next, `${playerAfterAttempt.name} survived the firing squad coin flip and returns to GO.`);
    next = updatePlayer(next, (p) => ({ ...p, boardId: "surface", spaceIndex: 0, inHell: false, hellEscapes: 0 }));
    return { ...next, phase: "after-effects" };
  }

  next = appendLog(
    next,
    `${playerAfterAttempt.name} failed hell escape attempt ${attempt} with a roll of ${roll} (needed ${requiredRoll}+).`
  );
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
  const withLog =
    resolved.phase === "go-lotto"
      ? resolved
      : appendLog(resolved, `${player.name} resolved ${space.name}.`);
  if (withLog.phase === "go-lotto") {
    return withLog;
  }
  const checked = checkWinConditions(withLog);
  return { ...checked, phase: checked.status.state === "over" ? "game-over" : "after-effects" };
}

export function takeGoPayout(state: GameState): GameState {
  if (state.status.state === "over") return state;
  if (state.phase !== "go-lotto" || state.goLotto?.status !== "choose") return state;
  let next = updatePlayer(state, (player) => ({ ...player, rubbies: player.rubbies + 200 }));
  next = appendLog(next, `${currentPlayer(next).name} took 200 rubbies from GO.`);
  next = { ...next, goLotto: undefined };
  next = checkWinConditions(next);
  return { ...next, phase: next.status.state === "over" ? "game-over" : "after-effects" };
}

export function placeGoWager(state: GameState, calledFace: number): GameState {
  if (state.status.state === "over") return state;
  if (state.phase !== "go-lotto" || state.goLotto?.status !== "choose") return state;
  const face = Math.max(1, Math.min(6, Math.round(calledFace)));
  let next = collectJackpot(state, 200);
  next = appendLog(next, `${currentPlayer(next).name} wagered GO payout on rolling a ${face}.`);
  return { ...next, goLotto: { status: "awaiting-roll", calledFace: face }, phase: "go-lotto-roll" };
}

export function resolveGoLottoRoll(state: GameState, roll: number): GameState {
  if (state.status.state === "over") return state;
  if (state.phase !== "go-lotto-roll" || state.goLotto?.status !== "awaiting-roll") return state;
  const calledFace = state.goLotto.calledFace ?? 0;
  let next = appendLog(state, `${currentPlayer(state).name} rolled a ${roll} for the GO lotto (called ${calledFace}).`);
  if (roll === calledFace) {
    const payout = state.jackpot;
    next = updatePlayer(next, (player) => ({ ...player, rubbies: player.rubbies + payout }));
    next = collectJackpot(next, -payout);
    next = appendLog(next, `${currentPlayer(next).name} hit the jackpot for ${payout} rubbies!`);
  } else {
    next = appendLog(next, `${currentPlayer(next).name} missed the jackpot.`);
  }
  next = { ...next, goLotto: undefined };
  next = checkWinConditions(next);
  return { ...next, phase: next.status.state === "over" ? "game-over" : "after-effects" };
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
