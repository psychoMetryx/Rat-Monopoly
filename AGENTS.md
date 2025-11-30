# Agents

This repository assumes a multi-agent workflow. Each agent should work in parallel but coordinate through small, testable increments. Keep game rules canonical by referencing the rulebook and updating documentation when interpretations change.

## Agents and Responsibilities

### game-architect
- **Role:** Interpret the rulebook and design deterministic state transitions.
- **Responsibilities:**
  - Model boards, spaces, cards, and player state in `lib/game/`.
  - Define TypeScript types and pure reducers for turns, movement, and effects.
  - Provide test fixtures or sample scenarios to validate rules edge cases.
- **Typical Files:** `lib/game/**`, type definition files, simulation helpers.

### frontend-dev
- **Role:** Build the interactive UI in Next.js with React and Tailwind.
- **Responsibilities:**
  - Implement board renders, player dashboards, logs, and action controls in `app/` and `components/`.
  - Keep UI stateless where possible, delegating state changes to game logic utilities.
  - Add accessibility-friendly controls for rolling, buying, lotto calls, and card interactions.
- **Typical Files:** `app/**`, `components/**`, styling utilities.

### rules-tester
- **Role:** Validate rules implementation and discover regressions.
- **Responsibilities:**
  - Create lightweight test harnesses or debug pages to simulate turns, hell escapes, lotto rolls, and job/rent scenarios.
  - Maintain deterministic test cases for high-risk mechanics (hell firing squad, rat mob deaths, subsewer exits).
  - Report discrepancies between observed behavior and the rulebook.
- **Typical Files:** `lib/game/**`, `app/debug/**`, test fixtures or playground scripts.

### docs-keeper
- **Role:** Keep documentation aligned with the implemented rules.
- **Responsibilities:**
  - Maintain `README.md`, `RAT_MONOPOLY_RULEBOOK.md`, and in-code documentation.
  - Capture rule clarifications made during development and reflect them in docs.
  - Coordinate with other agents to ensure docs match current mechanics and UI.
- **Typical Files:** `README.md`, `RAT_MONOPOLY_RULEBOOK.md`, additional developer guides.

## Collaboration Notes
- Align on data models first: the `game-architect` proposes types; others review before heavy UI work.
- Prefer small PRs: `frontend-dev` and `rules-tester` should branch from the latest game logic to avoid merge conflicts.
- Treat the rulebook as the single source of truth; when behavior diverges, update both code and docs together.
- Use shared fixtures for dice rolls and card decks so UI demos and tests run against the same deterministic cores.
