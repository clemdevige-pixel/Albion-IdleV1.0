# Albion Idle

Albion Idle is a PC-focused, 2D pixel-art idle RPG and side-scroller inspired by the mechanics and systems of Albion Online. Built as a TypeScript monorepo, the project combines a deterministic gameplay engine with a React interface and a Phaser 3 combat scene renderer.

---

## Project Overview

- **Genre / Pitch**: PC-focused idle RPG / incremental side-scroller based on Albion Online systems (item power, mastery curves, gathering, refining, crafting, equipment lineages, and worker automation).
- **Core Identity**: Visual 2D pixel-art combat scene with floating React HUDs and panels, mastery-driven progression with no player character level, data-driven crafting loops, and worker resource gathering.
- **Current Development Phase**: Active gameplay and content implementation phase. Core combat loops, zone navigation, gathering, refining, equipment crafting with predecessor requirements, masteries, workers, and local persistence are fully implemented and functional.

---

## Core Game Loop

```
  ┌─────────────────────────────────────────────────────────┐
  │                    Combat Loop                          │
  │  5 Zones × 10 Segments (Progression / Farm Mode)        │
  │  Earn Silver, Fame & Materials | Restore HP / Respawn   │
  └───────────────────────────┬─────────────────────────────┘
                              │
            ┌─────────────────┴─────────────────┐
            ▼                                   ▼
  ┌───────────────────┐               ┌───────────────────┐
  │  Gathering Loop   │               │   Worker System   │
  │ Hero Gathering    │               │ Wood, Ore, Hide,  │
  │ Wood, Ore, Hide,  │               │ Fiber Workers     │
  │ Fiber (T3 & T4)   │               │ Auto-Gathering    │
  └─────────┬─────────┘               └─────────┬─────────┘
            │                                   │
            └─────────────────┬─────────────────┘
                              ▼
                  ┌───────────────────────┐
                  │     Refining Loop     │
                  │ Planks, Bars, Leather,│
                  │ Cloth (T3 & T4)       │
                  └───────────┬───────────┘
                              ▼
                  ┌───────────────────────┐
                  │     Crafting Loop     │
                  │ Craft T3 & T4 Gear    │
                  │ (Requires Tn-1 Gear)  │
                  └───────────┬───────────┘
                              ▼
                  ┌───────────────────────┐
                  │ Equipment & Mastery   │
                  │ Equip Items, Boost IP,│
                  │ Advance Masteries 1-100│
                  └───────────────────────┘
```

- **Combat**: 5 world zones (Forest, Swamp, Highland, Steppe, Mountain), each containing 10 segments. Each segment features 5 encounters culminating in a boss or mini-boss encounter. Supports **Progression Mode** (advancing segments) and **Farm Mode** (repeat segment). Features auto-attacks, weapon abilities (Heroic Strike, Aimed Shot, Shockwave), health restoration, and manual revival on defeat.
- **Gathering**: T3 and T4 resources across 4 resource families: Wood (Birch/Pine), Ore (Copper/Iron), Hide (Sturdy/Thick), and Fiber (Linen/Cotton). Features continuous hero harvesting loops with tool modifiers and worker automation.
- **Refining**: Conversion of raw materials into refined products: Planks, Bars, Leather, and Cloth for T3 and T4 tiers.
- **Crafting**: Equipment crafting across Weapons (Broadsword, Longbow, Badon Bow, Fire Staff, Spiked Gauntlets), Offhands (Shields), and Armor (Head, Chest, Boots). Standard T4 crafting requires T4 refined materials plus **1 T3 predecessor item of the exact same lineage** (e.g., T4 Broadsword requires 6 Iron Bars, 2 Thick Leather, and 1 T3 Broadsword).
- **Equipment & IP**: Worn equipment slots (head, chest, boots, main hand, offhand). Two-handed weapons block the offhand slot. Equipment provides base stats and Item Power (IP). Durability decreases with usage and can be repaired at the Merchant.
- **Masteries**: Dual-layer mastery progression (Weapon Family + Weapon Specialization) and Gathering masteries scaling from Level 1 to 100 with a smooth, deterministic power curve.
- **Workers**: Automated gathering workers (Woodcutter, Miner, Tanner, Fiber Gatherer) earning worker-specific mastery while contributing XP to the hero's gathering mastery.

---

## Current Implemented Systems

| System | Status | Verification & Notes |
|---|---|---|
| **Combat Engine** | **Implemented** | Fixed 5-encounter segment loop, auto-attacks, weapon skills, boss scaling, defeat & manual revive. |
| **Zone Navigation** | **Implemented** | 5 biomes / 10 segments per biome. Timeline navigation for Progression & Farm modes. |
| **Gathering System** | **Implemented** | Hero gathering for T3/T4 Wood, Ore, Hide, Fiber with tool timers and mastery bonuses. |
| **Refining System** | **Implemented** | T3 and T4 refining for Planks, Bars, Leather, Cloth. |
| **Crafting System** | **Implemented** | T3 base craft & T4 predecessor crafting rule (requires & consumes Tn-1 item). Badon is artifact exception. |
| **Equipment & IP** | **Implemented** | Worn equipment slots, 2H offhand blocking, average Item Power (IP), durability, equipment repair at Merchant. |
| **Mastery System** | **Implemented** | 1–100 levels for Weapon Families, Weapon Specializations, and Gathering Masteries with Variant B curve. |
| **Parallel Combat Fame** | **Implemented** | Combat kills grant 100% Fame to both Weapon Family and Weapon Specialization simultaneously. |
| **Worker Automation** | **Implemented** | Woodcutter, Miner, Tanner, and Fiber Gatherer workers with tier assignment and worker mastery. |
| **Merchant Store** | **Implemented** | Buying/selling consumable potions, selling inventory loot, and repairing equipment durability. |
| **Persistence (Save/Load)** | **Implemented** | Local browser persistence (`localStorage`) saving inventory, bank, equipment, wallets, masteries, durability. |
| **Monster Assignment** | **Partially Implemented** | Combat runtime functions with randomized normal enemy profiles and dedicated boss assets; zone-specific monster pools planned. |
| **Inventory & Bank** | **Partially Implemented** | Hero inventory and bank storage exist; drag-and-drop inter-inventory transfers are simplified. |
| **Cloud Save & Auth** | **Planned** | Backend (`apps/server`) currently operates as a health-check endpoint shell. No authentication or cloud save yet. |
| **Dungeons & PvP** | **Deferred** | Faction dungeons, PvP, guilds, and player marketplace are planned for future major phases. |

---

## Architecture

The repository is structured as a pnpm workspace monorepo enforcing strict boundaries between gameplay logic, data schemas, and UI rendering.

```
  ┌────────────────────────────────────────────────────────┐
  │                    React UI Shell                      │
  │     Panels (Character, Production, Masteries, Shop)    │
  └───────────────────────────┬────────────────────────────┘
                              │ ViewModels / Bridge Sync
  ┌───────────────────────────▼────────────────────────────┐
  │                     GameBridge                         │
  │             Application Adapter Layer                  │
  └───────┬────────────────────────────────────────┬───────┘
          │ State / Events                         │ Renders
  ┌───────▼────────────────┐               ┌───────▼───────┐
  │    @game/gameplay      │               │   Phaser 3    │
  │ Authoritative Runtime  │               │ Combat Scene  │
  │ (Combat, Gathering,    │               │  Pixel Art    │
  │  Crafting, Masteries)  │               └───────────────┘
  └───────┬────────────────┘
          │
  ┌───────▼────────────────┐
  │  @game/persistence     │
  │ Save / Load LocalStorage│
  └────────────────────────┘
```

### Workspace Packages

- **`apps/client`**: React 18 UI shell, HUD, floating panels, tooltips, and Phaser 3 combat scene renderer (`src/game/`).
- **`apps/server`**: Fastify backend server (currently hosting technical `/health` endpoints).
- **`packages/gameplay`** (`@game/gameplay`): Authoritative simulation logic for combat, gathering, refining, crafting, equipment, inventory, experience, fame, masteries, and worker execution.
- **`packages/core`** (`@game/core`): Fixed-timestep loop, clock, RNG, event bus, and Entity-Component-System (ECS) world.
- **`packages/data`** (`@game/data`): Zod content schemas, validating loaders, and item/recipe catalogs.
- **`packages/persistence`** (`@game/persistence`): Local storage repository, save providers (inventory, equipment, wallets, experience, masteries, durability), versioning, and migrations.
- **`packages/shared`** (`@game/shared`): Common types, DTOs, and transport-agnostic constants.
- **`packages/tooling`** (`@game/tooling`): CLI scripts for data and asset manifest validation (`validate:data`, `validate:assets`).

### Key Design Patterns

- **GameBridge & Presentation Separation**: Gameplay logic runs entirely inside `@game/gameplay` runtimes. `bridgeSync` converts internal domain models into immutable ViewModels consumed by React UI and Phaser.
- **Role of GameContext**: Serves as the client composition root and application adapter (`src/state/GameContext.tsx`). It initializes runtimes, manages event bus subscriptions, triggers `bridgeSync`, and exposes UI handlers.
- **No Gameplay in React / Phaser**: React components render UI views from ViewModels; Phaser renders combat animations. Neither React nor Phaser contains authoritative damage or crafting formulas.

---

## Current Progression Model

- **No Player Level**: Progression is driven entirely by worn equipment Item Power (IP), unlocked weapon abilities, and mastery levels.
- **Mastery Curve (Levels 1–100)**:
  - **Levels 1–10**: Preserved exact early values (Weapon: `[100, 200, 300, 450, 650, 900, 1200, 1600, 2100, 2700]`; Gathering: `[50, 100, 175, 275, 400, 550, 750, 1000, 1300, 1700]`).
  - **Levels 11–100**: Deterministic Variant B power curve ($\text{raw}(L) = \text{Base}_{10} + \text{round}(A \times (L-10)^p)$) with player-friendly readability rounding (<10k $\rightarrow$ 10, 10k..99k $\rightarrow$ 100, $\ge$100k $\rightarrow$ 1,000) and strict monotonic growth.
- **Tier Scope**: T3 and T4 equipment, resources, and recipes currently active.
- **Crafting Predecessor Requirement**: Standard T4 equipment crafting consumes T4 refined materials and **1 T3 equipment item of the exact same lineage**.
- **Weapon Balance Philosophy**: Broadsword T4 + Shield T4 serves as the 100% practical benchmark. Standard 2-Handed weapons (Longbow, Badon Bow, Spiked Gauntlets, Fire Staff) target ~105–108% theoretical offensive DPS to compensate for losing the offhand slot.

---

## Persistence

- **Save Storage**: Browser `localStorage` using `LocalStorageSaveRepository` under save key `albion_idle_save_v1`.
- **Persisted State**: Hero inventory, bank storage, worn equipment, silver balance, experience & mastery progress, unlocked destiny board nodes, and item durability.
- **Unimplemented**: Cloud save synchronization, user accounts, server-side database persistence.

---

## Installation & Local Development

### Prerequisites

- **Node.js**: `>=22` (pinned in [`.nvmrc`](./.nvmrc))
- **pnpm**: `>=9.15.0` (enabled via Corepack: `corepack enable`)

### Installation

```bash
pnpm install
```

### Running Locally

```bash
pnpm dev
```
Launches the client development server (Vite, `http://localhost:5173`) and Fastify server in parallel.

### Available Commands

| Command | Description |
|---|---|
| `pnpm dev` | Run client and server in parallel watch mode. |
| `pnpm build` | Typecheck monorepo and build client production bundle (`vite build`). |
| `pnpm typecheck` | Run TypeScript build check across all workspace packages (`tsc -b`). |
| `pnpm test` | Run full Vitest test suite across all workspace packages. |
| `pnpm lint` | Run ESLint check across all packages. |
| `pnpm lint:fix` | Fix ESLint issues automatically. |
| `pnpm format` | Format repository files using Prettier. |
| `pnpm format:check` | Verify formatting without modifying files. |
| `pnpm validate:data` | Validate content JSON files against Zod schemas. |
| `pnpm validate:assets` | Validate asset manifests against Zod schemas. |

---

## Testing

Run tests for specific workspace packages or across the whole repository:

```bash
# Run all tests in monorepo
pnpm test

# Run gameplay engine tests only
pnpm --filter @game/gameplay test

# Run client runtime tests only
pnpm --filter @game/client test
```

---

## Repository Structure

```text
apps/
  client/       React 18 + Vite + Phaser 3 client (UI panels, GameBridge, Phaser scene)
  server/       Fastify backend (health check endpoint shell)
packages/
  core/         Deterministic simulation engine (Fixed clock, ECS, Scheduler, EventBus)
  data/         Zod schemas, validating loaders, content definitions
  gameplay/     Authoritative gameplay runtimes (Combat, Gathering, Crafting, Masteries, Workers)
  persistence/  Local storage save/load manager, providers, versioning, migrations
  shared/       Transport-agnostic types, DTOs, and constants
  tooling/      Validation CLI scripts for data and asset manifests
content/        Data-driven JSON content (recipes, loot tables, items)
assets/         Asset manifests
AI_BIBLE/       Design & technical specifications (game vision reference)
CODEX_HANDOFF.md Architectural decision log & handoff state
```

---

## Current Priorities & Roadmap

### Current Focus (Gameplay & Content First)
1. **Content Tier Expansion**: Preparing data-driven architecture for future tiers (T5–T8).
2. **Visual & Biome Polish**: Biome-specific combat backgrounds and monster assignment per biome.
3. **UI/UX Refinements**: Responsive layout polish, tooltips, merchant UI, worker assignment views.
4. **Gameplay Content**: Adding rare boss drops and expanding consumable potion types.

### Deferred / Future Features
- Faction Dungeons & Expedition Maps
- Artifact Crafting Lineages (beyond Badon Bow prototype)
- User Authentication & Cloud Save Synchronization
- Multiplayer, Guilds, and Player Marketplace / Auction House

---

## Development Principles

- **Data-Driven Architecture**: All items, recipes, monsters, and masteries are defined in structured data schemas rather than hardcoded in UI scripts.
- **Single Source of Truth**: Authoritative logic resides exclusively in `@game/gameplay`. React renders ViewModels; Phaser renders visual scene nodes.
- **Minimal Scoped Changes**: Every code edit should address a specific functional goal and be validated via `pnpm typecheck`, `pnpm test`, and `pnpm build`.
