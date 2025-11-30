# Rat Monopoly

Rat Monopoly is a chaotic Monopoly parody featuring three mini-boards, hellish punishments, indulgence-based salvation, and a rat-run economy of risky lotto bets. This repository will house a Next.js + TypeScript + Tailwind implementation that runs entirely on the client.

## Core Features
- Three interconnected boards (surface, subsurface sewer, and feces-adjacent) with distinct movement rules.
- Lightweight property set (about ten total), making ownership rare and rents swingy.
- Hell, indulgence cards, rat mob debt, drug dens, and lethal consequences.
- Rat Lotto jackpot tied to GO that can instantly end the game when the pot explodes.
- Jobs that protect you from rent until you pass GO, but vanish if you’re sent to hell.
- Multiple win conditions: three indulgences, 3000 rubbies cash, or being the last living rat.

## Planned Tech Stack
- Next.js (App Router)
- React + TypeScript
- Tailwind CSS
- Pure client-side state for game logic (no backend)

## High-Level Architecture
- `app/` — Next.js routes and layout.
- `components/` — UI building blocks: boards, event log, player panel, controls, dialogs.
- `lib/game/` — Pure game logic, state machines, and TypeScript types for rules, boards, and cards.

## Turn System (Planned)
1. **Pre-move:** optional ferry/fairy teleports; check card effects if not in hell.
2. **Roll:** typically 1d6 on the main board; subsewer may use 2d6 variants.
3. **Move:** advance on the current board or resolve hell escape rolls instead of moving.
4. **Resolve space:** buy/auction properties, pay rent/tax/church, draw cards, take jobs, or get sent to hell/subsewer/drug den.
5. **After-effects:** apply lingering states (job protection, rat mob debt, indulgences, ferry tickets).

## Game Design Overview
- **Properties & Rent:** Expensive, scarce deeds; rent behaves like classic Monopoly with punishing tax office multipliers.
- **Church & Indulgences:** Pay to the church; buy indulgences as hell escape cards. Holding three indulgences wins the game.
- **Hell:** Replaces jail with escalating escape rolls and a final firing-squad coin flip; death resets your assets into the lotto pot.
- **Jobs:** Landing on JOB grants 100 rubbies and temporary rent immunity until you pass GO; jobs are lost if you’re sent to hell.
- **Rat Mob & Drug Den:** Drawing or revisiting rat mob-linked spaces risks instant death unless you pay off a 500 rubby debt.
- **Rat Lotto & GO:** Landing on GO lets you take 200 rubbies or gamble it to call a die face for the jackpot pot (funded heavily by player deaths).
- **Subsurface Sewer Board:** A side track with unique moves and teleports; exiting counts as landing on GO, guaranteeing a lotto attempt.

## Deployment Flow (planned)
1. `npm install`
2. `npm run dev`
3. `npm run build`
4. Push to GitHub and deploy to Vercel.

## Contributing Notes
- Keep game logic pure in `lib/game/` and UI/rendering concerns in `components/`.
- Prefer deterministic, testable functions for state transitions to support simulated turns and debugging tools.
- Document rule interpretations in the rulebook and annotate edge cases in code comments for future contributors.
