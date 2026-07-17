# AGENTS.md

This repository contains a Next.js + Drizzle + SQLite monolith.
Use this document as a baseline for agentic work; update it as the codebase
evolves.

-------------------------------------------------------------------------------
Build / Lint / Test Commands
-------------------------------------------------------------------------------

Build/lint commands are defined in `package.json`:
- Dev server: `npm run dev`
- Build: `npm run build`
- Start: `npm run start`
- Lint: `npm run lint`
- DB migration generate: `npm run db:generate`
- DB migrate: `npm run db:migrate`
- DB seed: `npm run db:seed`
- DB backup: `npm run db:backup`
- Tests: `npm test`

Expected locations to look for commands once the project exists:
- `package.json` scripts (React app)
- `Makefile` or `justfile`
- `scripts/` directory
- `README.md`

Single-test guidance:
- File-scoped: `npx tsx --test src/lib/overlap.test.ts`

-------------------------------------------------------------------------------
Code Style Guidelines
-------------------------------------------------------------------------------

General principles
- Prefer clarity over cleverness; optimize for maintainability.
- Keep functions small and focused; avoid long multi-responsibility methods.
- Keep side effects explicit and localized.
- Use descriptive naming; avoid abbreviations unless obvious and standard.

Imports and module structure
- Group imports by origin: standard libs, third-party, then local modules.
- Order groups alphabetically; keep each group sorted by module path.
- Avoid deep relative imports where possible; introduce path aliases if needed.
- Do not add unused imports; remove unused when editing a file.

Formatting
- Follow existing formatter config once it exists (Prettier, ESLint, etc.).
- Avoid trailing whitespace and mixed tabs/spaces.
- Keep line length reasonable (target 100–120 chars unless tool enforces).
- Use a single blank line to separate logical sections.

Types
- Prefer explicit types for public APIs and shared utilities.
- Use type aliases for complex unions and reusable shapes.
- Avoid `any`/`unknown` unless required; document the reasoning.
- Keep type exports consistent with file purpose (no grab-bag types).

Naming conventions
- Use `camelCase` for variables and functions.
- Use `PascalCase` for components, classes, and types.
- Use `SCREAMING_SNAKE_CASE` for constants only when truly constant.
- Use names that encode units or domain specifics (e.g., `startAt`, `cutoffAt`).

Error handling
- Prefer explicit error handling over silent failures.
- Use error types that convey intent (e.g., `NotFoundError`, `ValidationError`).
- Include actionable error messages; avoid vague "something went wrong".
- Propagate errors with context; do not swallow exceptions.

Validation and defaults
- Validate inputs at boundaries (API handlers, form submit, DB writes).
- Apply defaults in a single place; avoid duplicating default logic.
- Ensure time-based logic is timezone-aware and documented.

State and data flow (frontend)
- Keep UI state local when possible; lift state only when shared.
- Prefer derived state over duplicated state.
- Avoid implicit side effects in render paths.

Database and persistence (backend)
- Keep migrations deterministic and idempotent.
- Encapsulate SQL in modules with clear input/output contracts.
- Use transactions for multi-step writes.
- Avoid N+1 query patterns; batch or prefetch where feasible.

Testing
- Write tests for non-trivial business logic and date/time edge cases.
- Prefer deterministic tests with fixed clocks and fixtures.
- Keep test data minimal and purpose-driven.
- Name tests for behavior, not implementation details.

Documentation
- Update `krav2.md` or add new docs when behavior changes.
- Document non-obvious defaults and constraints.
- Keep README current once created.

-------------------------------------------------------------------------------
Product-Specific Notes (from krav2.md)
-------------------------------------------------------------------------------

The requirements document outlines a React + SQLite app with:
- Events, meals, guests, timeline, chat, export, and guest links
- Default durations, deadlines, and overlap calculations
- Mobile-first UI with dark mode and red accent

When implementing, keep these constraints explicit in code and tests.

-------------------------------------------------------------------------------
Cursor / Copilot Rules
-------------------------------------------------------------------------------

No Cursor rules found.
- Expected locations: `.cursor/rules/`, `.cursorrules`

No Copilot instructions found.
- Expected location: `.github/copilot-instructions.md`

If any of the above files are added later, summarize them here verbatim.

-------------------------------------------------------------------------------
Agent Workflow Expectations
-------------------------------------------------------------------------------

- Confirm the repo state before making assumptions.
- Avoid adding tooling configs without discussion.
- When in doubt, add a brief note to the PR or in docs.
- Prefer small, reviewable changes with clear commit messages.
- Keep this file updated as soon as new tooling or rules appear.

-------------------------------------------------------------------------------
Checklist for New Tooling (fill in when added)
-------------------------------------------------------------------------------

- Build command:
- Lint command:
- Test command:
- Single test command:
- Dev server command:
- Format command:

-------------------------------------------------------------------------------
End
-------------------------------------------------------------------------------
