import { BoardDefinition, CardDefinition, GameState, PlayerState } from "./types";

const surfaceBoard: BoardDefinition = {
  id: "surface",
  name: "Surface Streets",
  kind: "surface",
  spaces: [
    { id: "go", name: "GO / Lotto", type: "go", rubbyDelta: 200 },
    { id: "church", name: "Church", type: "church", indulgenceCost: 300 },
    { id: "tax", name: "Tax Office", type: "tax", rubbyDelta: -150 },
    { id: "property-a", name: "Trash Palace", type: "property", rubbyDelta: -220 },
    { id: "draw-1", name: "Sniff a Card", type: "draw", cardDraw: true },
    { id: "job", name: "Job Board", type: "job", rubbyDelta: 100 },
    { id: "hell-gate", name: "Hell Gate", type: "hell-gate", sendTo: { boardId: "hell", index: 0 } },
    { id: "property-b", name: "Roach District", type: "property", rubbyDelta: -180 },
    { id: "draw-2", name: "Rat Lotto", type: "draw", cardDraw: true },
    { id: "teleport", name: "Subsewer Exit", type: "teleport", sendTo: { boardId: "subsurface", index: 0 } }
  ]
};

const subsewerBoard: BoardDefinition = {
  id: "subsurface",
  name: "Subsurface Sewer",
  kind: "subsurface",
  spaces: [
    { id: "entry", name: "Subsewer Gate", type: "blank" },
    { id: "property-c", name: "Pipe Palace", type: "property", rubbyDelta: -120 },
    { id: "tax-2", name: "Flooded Toll", type: "tax", rubbyDelta: -100 },
    { id: "draw-3", name: "Scrap Stash", type: "draw", cardDraw: true },
    { id: "exit", name: "Exit to GO", type: "teleport", sendTo: { boardId: "surface", index: 0 } }
  ]
};

const hellBoard: BoardDefinition = {
  id: "hell",
  name: "Hell Pit",
  kind: "hell",
  spaces: [
    { id: "cell", name: "Cell Block", type: "blank" },
    { id: "firing", name: "Firing Squad", type: "blank" }
  ]
};

const defaultDeck: CardDefinition[] = [
  {
    id: "indulgence-1",
    kind: "indulgence",
    description: "Receive an indulgence from the church."
  },
  {
    id: "cash-1",
    kind: "cash",
    description: "Found a ruby stash. Gain 200 rubbies.",
    rubbyDelta: 200
  },
  {
    id: "penalty-1",
    kind: "penalty",
    description: "Rat mob shakedown. Pay 150 rubbies.",
    rubbyDelta: -150
  },
  {
    id: "move-1",
    kind: "move",
    description: "Shortcut to sewer entrance.",
    moveTo: { boardId: "surface", index: 6 }
  },
  {
    id: "hell-1",
    kind: "hell",
    description: "Dragged to hell for your sins.",
    sendToHell: true
  }
];

function buildPlayers(names: string[], startingBoard: BoardDefinition): PlayerState[] {
  return names.map((name, index) => ({
    id: `player-${index + 1}`,
    name,
    rubbies: 300,
    indulgences: 0,
    alive: true,
    boardId: startingBoard.id,
    spaceIndex: 0,
    jobProtected: false,
    hellEscapes: 0,
    inHell: false
  }));
}

export function createInitialGameState(names: string[]): GameState {
  const boards = [surfaceBoard, subsewerBoard, hellBoard];
  return {
    boards,
    deck: defaultDeck,
    discard: [],
    currentPlayer: 0,
    phase: "pre-move",
    lastRoll: undefined,
    jackpot: 0,
    log: ["Game session created."],
    status: { state: "active" },
    pendingCard: undefined,
    players: buildPlayers(names, surfaceBoard)
  };
}
