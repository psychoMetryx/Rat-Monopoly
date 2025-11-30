export type BoardKind = "surface" | "subsurface" | "hell";

export type BoardSpaceType =
  | "go"
  | "property"
  | "tax"
  | "church"
  | "draw"
  | "job"
  | "hell-gate"
  | "teleport"
  | "blank";

export interface PropertyDetails {
  price: number;
  rent: number;
  taxOfficeMultiplier?: number;
}

export interface BoardSpace {
  id: string;
  name: string;
  type: BoardSpaceType;
  rubbyDelta?: number;
  cardDraw?: boolean;
  sendTo?: { boardId: string; index: number };
  indulgenceCost?: number;
  property?: PropertyDetails;
}

export interface BoardDefinition {
  id: string;
  name: string;
  kind: BoardKind;
  spaces: BoardSpace[];
}

export interface GoLottoState {
  status: "choose" | "awaiting-roll";
  calledFace?: number;
}

export type CardKind = "indulgence" | "cash" | "penalty" | "move" | "hell";

export interface CardDefinition {
  id: string;
  kind: CardKind;
  description: string;
  rubbyDelta?: number;
  moveTo?: { boardId: string; index: number };
  sendToHell?: boolean;
}

export interface PlayerState {
  id: string;
  name: string;
  rubbies: number;
  indulgences: number;
  alive: boolean;
  boardId: string;
  spaceIndex: number;
  jobProtected: boolean;
  hellEscapes: number;
  inHell: boolean;
  ownedProperties: string[];
  propertyMetadata?: Record<string, { purchasePrice: number }>;
}

export type TurnPhase =
  | "pre-move"
  | "hell-escape"
  | "roll"
  | "move"
  | "resolve"
  | "go-lotto"
  | "go-lotto-roll"
  | "after-effects"
  | "game-over";

export interface WinState {
  winnerId: string;
  reason: "indulgences" | "wealth" | "last-rat";
}

export interface GameStatus {
  state: "active" | "over";
  winState?: WinState;
}

export interface GameState {
  boards: BoardDefinition[];
  deck: CardDefinition[];
  discard: CardDefinition[];
  currentPlayer: number;
  phase: TurnPhase;
  lastRoll?: number;
  jackpot: number;
  goLotto?: GoLottoState;
  log: string[];
  status: GameStatus;
  pendingCard?: CardDefinition;
  players: PlayerState[];
}
