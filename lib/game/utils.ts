import { CardDefinition } from "./types";

export function shuffleCards(cards: CardDefinition[], rng: () => number = Math.random): CardDefinition[] {
  const shuffled = [...cards];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
