# @game/core

Deterministic simulation engine for Albion Idle. Environment-agnostic (browser,
Node, tests) and free of any gameplay, rendering, network or persistence code. It
must never import React, Phaser, Fastify, Prisma, the DOM, or Node-only APIs.

Built across two phases:

- **Phase 02.1 — Runtime Core** (`src/runtime/`)
- **Phase 02.2 — Entity Framework** (`src/entity`, `src/component`, `src/query`, `src/system`, `src/world`)

## Runtime Core (02.1)

| Module              | Role                                                                                                             |
| ------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `ids`               | Branded types + deterministic monotonic id factory (shared id strategy).                                         |
| `config`            | Validated runtime config (`tickRate`, `debug`, `seed`, `simulationSpeed`).                                       |
| `tick-engine`       | Discrete tick counter, independent of the loop.                                                                  |
| `clock`             | Read model of simulation time. The only source of time in the engine.                                            |
| `rng`               | Seeded, reproducible PRNG (mulberry32). The only source of randomness.                                           |
| `event-bus`         | Generic typed pub/sub (`publish`/`subscribe`/`once`/`unsubscribe`/`clear`).                                      |
| `scheduler`         | Tick-based scheduling (no `setTimeout`/`setInterval`).                                                           |
| `service-container` | Bundles the services; replaceable per-service for tests. No global singleton.                                    |
| `game-loop`         | Fixed-timestep, framerate-independent loop (`start/stop/pause/resume/tick/advance`). No `requestAnimationFrame`. |

Time flows in one direction: the **loop** advances the **tick engine**, updates the
**clock**, runs due **scheduler** tasks, then publishes `TickAdvanced`. Nothing reads
`Date.now()`/`performance.now()`/`Math.random()` directly.

## Entity Framework (02.2)

A lightweight, project-specific **Entity–Component–System** model (no archetypes,
no external ECS library, no code generation).

- **Entity** — an opaque `EntityId` (branded number). Just an identity.
- **Component** — a plain data container, identified by a typed `ComponentType<T>` token.
- **System** — a `SimulationSystem` with a single responsibility and an `update(context)`.
- **World** — the single owner of entities, components and systems.

| Module      | Role                                                                    |
| ----------- | ----------------------------------------------------------------------- |
| `entity`    | `EntityId`, `EntityRegistry` (existence + id allocation), typed errors. |
| `component` | `ComponentType`/`defineComponent`, sparse `ComponentStore`.             |
| `query`     | `runQuery` — conjunctive, strongly-typed, stable-ordered matching.      |
| `system`    | `SimulationSystem`, `SystemContext`, `SystemRegistry`.                  |
| `world`     | `World` façade + `connectWorldToLoop` (Runtime Core integration).       |

### Entity lifecycle

`world.createEntity()` → attach components → `world.destroyEntity(id)`. Destroying an
entity removes **all** its components; a destroyed entity never appears in a query.
Destroying an unknown/already-destroyed id throws `EntityNotFoundError`.

### Component operations (explicit semantics)

- `addComponent` — throws `ComponentAlreadyExistsError` if already present.
- `setComponent` — adds or replaces (upsert).
- `getComponent` — throws `ComponentNotFoundError` if absent.
- `tryGetComponent` — returns `undefined` if absent.
- `removeComponent` — throws `ComponentNotFoundError` if absent.

All operations throw `EntityNotFoundError` for an unknown entity (except
`tryGet`/`has`, which return `undefined`/`false`).

### System ordering

Deterministic: ascending `priority` (default `0`), ties broken by registration order.
Never by module import order.

### Mutation during iteration

Immediate mutation with **snapshot queries**: `world.query(...)` returns a freshly
materialised array, so creating/destroying entities or adding/removing components
while iterating results is safe and well-defined. No `CommandBuffer` is needed at
this stage.

### Determinism

Guaranteed by: monotonic id order, stable system order, stable query order
(ascending id), injected seed/RNG, and time read only from the clock. Two worlds
built with the same config/seed and given the same operations for the same number
of ticks produce identical `world.snapshot()` output.

### Runtime integration

`connectWorldToLoop(world, services.eventBus)` subscribes `world.update()` to the
loop's `TickAdvanced` event — the single bridge between time (owned by the Runtime
Core) and execution (owned by the world). No second loop/clock/scheduler/bus/RNG is
created. Pausing the loop stops ticks, so the world halts naturally.

## Extending later

- **New component:** `export const FooComponent = defineComponent<Foo>("foo");`
  (data only — no behaviour). Gameplay components are out of scope until later phases.
- **New system:** implement `SimulationSystem`, read state/time/RNG from
  `context`/`context.services`, register with `world.registerSystem(...)`.

## Phase 02.2 limits

- No gameplay components or systems (fixtures live only in `*.test.ts` /
  `test-fixtures.ts`, never exported).
- No deferred command buffer, no lifecycle events on the bus (added only if a future
  phase needs them), no persistence/network/rendering.
